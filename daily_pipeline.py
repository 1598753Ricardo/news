"""Daily shadow pipeline: Collector V0 followed by Summary V0.4 Context Guard."""

from datetime import datetime
import json
import logging
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

import requests

import config
from main import BeijingFormatter, run as run_collector
from storage import write_json_atomic
from summary import MODEL, OLLAMA_GENERATE_URL, load_json_list, select_items
from summary_context_guard import PROCESSED_CONTEXT_DIR, run_context_guard


PIPELINE_REPORT = "last_pipeline_run.json"
OLLAMA_TAGS_URL = OLLAMA_GENERATE_URL.rsplit("/", 1)[0] + "/tags"


class OllamaLifecycleError(RuntimeError):
    def __init__(self, message, details):
        super().__init__(message)
        self.details = details


def make_logger(log_dir, today):
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("xueyouyuli.daily_pipeline")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for handler in logger.handlers[:]:
        handler.close()
        logger.removeHandler(handler)
    handlers = [logging.FileHandler(log_dir / f"{today}.log", encoding="utf-8")]
    if sys.stdout is not None:
        handlers.append(logging.StreamHandler(sys.stdout))
    formatter = BeijingFormatter("%(asctime)s %(levelname)s %(message)s")
    for handler in handlers:
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


def ollama_models(url=OLLAMA_TAGS_URL):
    session = requests.Session()
    session.trust_env = False
    try:
        response = session.get(url, timeout=(3, 10))
        response.raise_for_status()
        payload = response.json()
        names = {
            value
            for row in payload.get("models", []) if isinstance(row, dict)
            for value in (row.get("name"), row.get("model")) if value
        }
        return names
    finally:
        session.close()


def find_ollama_executable():
    executable = shutil.which("ollama")
    if executable:
        return executable
    candidates = []
    if os.environ.get("LOCALAPPDATA"):
        candidates.extend([
            Path(os.environ["LOCALAPPDATA"]) / "Programs" / "Ollama" / "ollama.exe",
            Path(os.environ["LOCALAPPDATA"]) / "Ollama" / "ollama.exe",
        ])
    if os.environ.get("ProgramFiles"):
        candidates.append(Path(os.environ["ProgramFiles"]) / "Ollama" / "ollama.exe")
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    raise FileNotFoundError("未找到 ollama 可执行程序（PATH 或标准安装目录）")


def start_ollama_server(executable):
    kwargs = {
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "close_fds": True,
    }
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen([executable, "serve"], **kwargs)


def check_ollama(model=MODEL, url=OLLAMA_TAGS_URL, startup_timeout=30):
    online = {
        "initial_status": "online", "start_attempted": False,
        "model_available": False,
    }
    try:
        names = ollama_models(url)
    except requests.RequestException:
        names = None
    if names is not None:
        if model not in names:
            online["failure_reason"] = "model_missing"
            raise OllamaLifecycleError(f"model_missing: Ollama 未安装模型 {model}", online)
        online["model_available"] = True
        return online

    details = {
        "initial_status": "offline", "start_attempted": False,
        "start_succeeded": False, "startup_seconds": 0.0,
        "model_available": False,
    }
    try:
        executable = find_ollama_executable()
        # Close the small race between the initial probe and process launch.
        try:
            names = ollama_models(url)
        except requests.RequestException:
            names = None
        if names is not None:
            details.pop("start_succeeded")
            details.pop("startup_seconds")
            if model not in names:
                details["failure_reason"] = "model_missing"
                raise OllamaLifecycleError(
                    f"model_missing: Ollama 未安装模型 {model}", details
                )
            details["model_available"] = True
            return details

        details["start_attempted"] = True
        started = time.perf_counter()
        process = start_ollama_server(executable)
    except OllamaLifecycleError:
        raise
    except Exception as exc:
        details["start_attempted"] = True
        details["failure_reason"] = "start_process_failure"
        raise OllamaLifecycleError(f"Ollama 启动进程失败：{exc}", details) from exc

    for _ in range(startup_timeout):
        time.sleep(1)
        try:
            names = ollama_models(url)
        except requests.RequestException:
            if process.poll() is not None:
                details["startup_seconds"] = round(time.perf_counter() - started, 3)
                details["failure_reason"] = "start_process_exited"
                raise OllamaLifecycleError(
                    f"Ollama 启动进程提前退出，返回码 {process.returncode}", details
                )
            continue
        details["start_succeeded"] = True
        details["startup_seconds"] = round(time.perf_counter() - started, 3)
        if model not in names:
            details["failure_reason"] = "model_missing"
            raise OllamaLifecycleError(f"model_missing: Ollama 未安装模型 {model}", details)
        details["model_available"] = True
        return details

    details["startup_seconds"] = round(time.perf_counter() - started, 3)
    details["failure_reason"] = "startup_timeout"
    process.terminate()
    raise OllamaLifecycleError(
        f"Ollama 启动后 {startup_timeout} 秒内 API 未就绪", details
    )


def load_collector_report(log_dir):
    path = Path(log_dir) / "last_run.json"
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Collector 汇总不是 JSON 对象：{path}")
    return value


def daily_result_counts(processed_path, supported_urls):
    rows = load_json_list(processed_path)
    relevant = [row for row in rows if row.get("url") in supported_urls]
    succeeded = [row for row in relevant if row.get("status") == "ok"
                 and row.get("extractive_summary")]
    return {
        "summaries_available": len(succeeded),
        "needs_review": sum(bool(row.get("needs_review")) for row in succeeded),
    }


def run(data_dir=config.DATA_DIR, processed_dir=PROCESSED_CONTEXT_DIR,
        log_dir=config.LOG_DIR, now=None, collector_runner=run_collector,
        summary_runner=run_context_guard, ollama_checker=check_ollama):
    now = (now or datetime.now(config.TIMEZONE)).astimezone(config.TIMEZONE)
    today = now.date().isoformat()
    data_dir, processed_dir, log_dir = Path(data_dir), Path(processed_dir), Path(log_dir)
    logger = make_logger(log_dir, today)
    started = time.perf_counter()
    report = {
        "mode": "shadow_run", "date": today,
        "started_at": now.isoformat(timespec="seconds"),
        "collector_exit_code": None, "collector": None, "summary": None,
        "ollama": {
            "initial_status": "not_checked", "start_attempted": False,
            "model_available": None,
        },
        "pipeline_status": "fatal_failure",
    }

    def finish(status, exit_code):
        report["pipeline_status"] = status
        report["finished_at"] = datetime.now(config.TIMEZONE).isoformat(timespec="seconds")
        report["total_seconds"] = round(time.perf_counter() - started, 3)
        write_json_atomic(log_dir / PIPELINE_REPORT, report)
        logger.info("pipeline_status=%s 总流程耗时=%.3fs", status, report["total_seconds"])
        return exit_code

    try:
        logger.info("学有渔力每日影子流程开始；日期=%s", today)
        collector_code = collector_runner(data_dir=data_dir, log_dir=log_dir, now=now)
        report["collector_exit_code"] = collector_code
        try:
            report["collector"] = load_collector_report(log_dir)
        except Exception as exc:
            logger.error("Collector 汇总读取失败：%s: %s", type(exc).__name__, exc)
        if report["collector"]:
            for source in report["collector"].get("sources", []):
                logger.info("Collector 来源=%s 状态=%s 抓取=%s 新增=%s 重复=%s",
                            source.get("source"), source.get("status"), source.get("fetched"),
                            source.get("new"), source.get("duplicates"))

        data_path = data_dir / f"{today}.json"
        if collector_code not in (0, 1):
            logger.error("Collector 返回严重错误码 %s，本轮不运行摘要", collector_code)
            return finish("fatal_failure", 2)
        if not data_path.exists():
            logger.error("Collector 返回 %s，但当天数据文件不存在：%s", collector_code, data_path)
            return finish("fatal_failure", 2)

        source_rows = load_json_list(data_path)
        supported = select_items(source_rows)
        output_path = processed_dir / f"{today}.json"
        existing = load_json_list(output_path)
        cached_urls = {
            row.get("url") for row in existing
            if row.get("status") == "ok" and row.get("extractive_summary")
        }
        pending = [item for item in supported if item["url"] not in cached_urls]
        logger.info("Summary V0.4 待处理=%d 已有成功缓存=%d 支持新闻总数=%d",
                    len(pending), len(supported) - len(pending), len(supported))

        if pending:
            try:
                ollama = ollama_checker()
                if isinstance(ollama, dict):
                    report["ollama"] = ollama
                else:
                    report["ollama"] = {
                        "initial_status": "online", "start_attempted": False,
                        "model_available": True,
                    }
                if report["ollama"].get("start_attempted"):
                    logger.info("Ollama 自动启动成功；启动耗时=%.3fs 模型=%s",
                                report["ollama"].get("startup_seconds", 0.0), MODEL)
                else:
                    logger.info("Ollama 已在线；未启动第二实例；模型=%s", MODEL)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                details = getattr(exc, "details", None)
                if isinstance(details, dict):
                    report["ollama"] = details
                else:
                    report["ollama"]["error"] = error
                report["summary"] = {
                    "status": "failed", "error": error,
                    "total_news": len(supported), "pending": len(pending),
                    "cached": len(supported) - len(pending),
                    "ai_seconds": 0.0,
                }
                logger.error("Summary V0.4 预检失败；Collector 数据保持不变：%s", error)
                return finish("summary_failure", 3)

        try:
            stats = summary_runner(
                today, limit=None, data_dir=data_dir, processed_dir=processed_dir, now=now
            )
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
            report["summary"] = {
                "status": "failed", "error": error,
                "total_news": len(supported), "pending": len(pending),
                "cached": len(supported) - len(pending), "ai_seconds": 0.0,
            }
            logger.exception("Summary V0.4 运行失败；Collector 数据保持不变")
            return finish("summary_failure", 3)

        totals = daily_result_counts(output_path, {item["url"] for item in supported})
        report["summary"] = {
            "status": "failed" if stats["selection_failed"] else "ok",
            "total_news": len(supported), "pending": len(pending),
            "cached": stats["cached"],
            "article_succeeded": stats["succeeded"] + stats["selection_failed"],
            "article_failed": stats["extraction_failed"],
            "summaries_created": stats["succeeded"],
            **totals,
            "selection_failed": stats["selection_failed"],
            "ai_seconds": stats["ai_seconds"],
            "output_file": stats["output_file"],
        }
        logger.info(
            "Summary V0.4 正文成功=%d 正文失败=%d 新摘要=%d 可用摘要=%d "
            "needs_review=%d 缓存=%d AI耗时=%.3fs",
            report["summary"]["article_succeeded"], report["summary"]["article_failed"],
            report["summary"]["summaries_created"], report["summary"]["summaries_available"],
            report["summary"]["needs_review"], report["summary"]["cached"],
            report["summary"]["ai_seconds"],
        )
        if stats["selection_failed"]:
            return finish("summary_failure", 3)
        if collector_code == 1:
            return finish("partial_source_failure", 1)
        return finish("success", 0)
    except Exception:
        logger.exception("每日流程发生严重错误；已有 data 和 processed 文件不删除")
        return finish("fatal_failure", 2)
    finally:
        for handler in logger.handlers[:]:
            handler.close()
            logger.removeHandler(handler)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(run())
