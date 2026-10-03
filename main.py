"""Run once; Windows Task Scheduler (or cron) invokes this once per day."""
from datetime import datetime
import logging
from pathlib import Path
import sys

import config
from collectors import gov_cn, kr36, people, stcn, xinhua
from collectors.common import HttpClient, canonical_url
from storage import load_history, run_lock, validate_item, write_json_atomic

COLLECTORS = (gov_cn, xinhua, people, stcn, kr36)


class BeijingFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        return datetime.fromtimestamp(record.created, config.TIMEZONE).isoformat(timespec="seconds")


def make_logger(log_dir, today):
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("xueyouyuli.collector")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for handler in logger.handlers[:]:
        handler.close()
        logger.removeHandler(handler)
    formatter = BeijingFormatter("%(asctime)s %(levelname)s %(message)s")
    handlers = [logging.FileHandler(log_dir / f"{today}.log", encoding="utf-8")]
    # pythonw.exe is used by the Windows task to avoid opening a console window.
    if sys.stdout is not None:
        handlers.append(logging.StreamHandler(sys.stdout))
    for handler in handlers:
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


def run(data_dir=config.DATA_DIR, log_dir=config.LOG_DIR, collectors=COLLECTORS,
        client_factory=HttpClient, now=None):
    now = now or datetime.now(config.TIMEZONE)
    now = now.astimezone(config.TIMEZONE)
    today = now.date().isoformat()
    data_dir, log_dir = Path(data_dir), Path(log_dir)
    output = data_dir / f"{today}.json"
    logger = make_logger(log_dir, today)
    logger.info("学有渔力 Collector V0 开始；日期=%s 时区=Asia/Shanghai", today)
    try:
        with run_lock(data_dir):
            seen, existing = load_history(data_dir, today)
            client = client_factory(logger)
            new_items, reports = [], []
            try:
                for collector in collectors:
                    source = collector.SOURCE
                    report = {"source": source, "status": "ok", "fetched": 0,
                              "new": 0, "duplicates": 0, "warnings": [], "errors": []}
                    logger.info("[%s] 开始采集", source)
                    try:
                        result = collector.collect(client, now)
                        for item in result.items:
                            validate_item(item)
                            if item["source"] != source:
                                raise ValueError("collector 返回的来源名称不匹配")
                        report["fetched"] = len(result.items)
                        report["warnings"] = result.warnings
                        report["errors"] = result.errors
                        if not result.items and not report["errors"]:
                            report["errors"].append("未返回有效新闻")
                        for item in result.items:
                            url = canonical_url(item["url"])
                            if url in seen:
                                report["duplicates"] += 1
                                continue
                            seen.add(url)
                            new_items.append(item)
                            report["new"] += 1
                    except Exception as exc:
                        report["errors"].append(f"{type(exc).__name__}: {exc}")
                        logger.exception("[%s] 采集失败，继续其他来源", source)
                    if report["errors"]:
                        report["status"] = "partial" if report["fetched"] else "failed"
                        for error in report["errors"]:
                            logger.error("[%s] %s", source, error)
                    for warning in report["warnings"]:
                        logger.warning("[%s] %s", source, warning)
                    logger.info("[%s] 状态=%s 抓取=%d 新增=%d 重复=%d", source,
                                report["status"], report["fetched"], report["new"], report["duplicates"])
                    reports.append(report)
            finally:
                client.close()

            # Keep all earlier runs from today, even when this run has failures.
            all_today = existing + new_items
            write_json_atomic(output, all_today)
            failures = sum(report["status"] != "ok" for report in reports)
            exit_code = 2 if all(report["status"] == "failed" for report in reports) else (1 if failures else 0)
            summary = {
                "started_at": now.isoformat(timespec="seconds"),
                "finished_at": datetime.now(config.TIMEZONE).isoformat(timespec="seconds"),
                "sources": reports,
                "total_fetched": sum(report["fetched"] for report in reports),
                "total_new": len(new_items), "daily_total": len(all_today),
                "sources_with_errors": failures,
                "output_file": str(output.resolve()),
                "log_file": str((log_dir / f"{today}.log").resolve()),
                "exit_code": exit_code,
            }
            write_json_atomic(log_dir / "last_run.json", summary)
            logger.info("完成：抓取=%d 新增=%d 当日文件=%d 异常来源=%d JSON=%s",
                        summary["total_fetched"], len(new_items), len(all_today), failures, output)
            return exit_code
    except Exception:
        logger.exception("运行失败，未覆盖已有新闻文件")
        return 2
    finally:
        for handler in logger.handlers[:]:
            handler.close()
            logger.removeHandler(handler)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(run())
