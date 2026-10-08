from datetime import datetime
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

import requests

import config
from daily_pipeline import MODEL, OllamaLifecycleError, check_ollama, run


NOW = datetime(2026, 10, 4, 12, 0, tzinfo=config.TIMEZONE)


def item(path="one"):
    return {
        "title": "测试新闻", "source": "新华网", "category": "时政",
        "published_at": "2026-10-04", "url": f"https://example.com/{path}",
        "summary": "", "collected_at": NOW.isoformat(),
    }


def collector_report(exit_code):
    return {
        "sources": [{
            "source": "新华网", "status": "ok", "fetched": 1,
            "new": 1, "duplicates": 0, "warnings": [], "errors": [],
        }, {
            "source": "36氪", "status": "failed", "fetched": 0,
            "new": 0, "duplicates": 0, "warnings": [], "errors": ["AccessRestricted"],
        }],
        "exit_code": exit_code,
    }


class DailyPipelineTests(unittest.TestCase):
    def paths(self, root):
        return root / "data", root / "processed_context_guard", root / "logs"

    def collector(self, code, rows):
        def execute(data_dir, log_dir, now):
            Path(data_dir).mkdir(parents=True, exist_ok=True)
            Path(log_dir).mkdir(parents=True, exist_ok=True)
            (Path(data_dir) / "2026-10-04.json").write_text(
                json.dumps(rows, ensure_ascii=False), encoding="utf-8"
            )
            (Path(log_dir) / "last_run.json").write_text(
                json.dumps(collector_report(code), ensure_ascii=False), encoding="utf-8"
            )
            return code
        return execute

    def summary(self, rows, stats=None):
        def execute(day, limit, data_dir, processed_dir, now):
            Path(processed_dir).mkdir(parents=True, exist_ok=True)
            (Path(processed_dir) / f"{day}.json").write_text(
                json.dumps(rows, ensure_ascii=False), encoding="utf-8"
            )
            return stats or {
                "selected": 1, "cached": 0, "succeeded": 1,
                "extraction_failed": 0, "selection_failed": 0,
                "needs_review": 0, "ai_seconds": 1.25,
                "output_file": str(Path(processed_dir) / f"{day}.json"),
            }
        return execute

    def test_partial_collector_continues_to_summary(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data, processed, logs = self.paths(root)
            source = item()
            result = {**source, "extractive_summary": ["事实一。", "事实二。"],
                      "status": "ok", "needs_review": False}
            checker = Mock(return_value={
                "initial_status": "online", "start_attempted": False,
                "model_available": True,
            })
            code = run(
                data, processed, logs, NOW, self.collector(1, [source]),
                self.summary([result]), checker,
            )
            self.assertEqual(code, 1)
            checker.assert_called_once_with()
            report = json.loads((logs / "last_pipeline_run.json").read_text(encoding="utf-8"))
            self.assertEqual(report["pipeline_status"], "partial_source_failure")
            self.assertEqual(report["summary"]["summaries_available"], 1)
            self.assertEqual(report["ollama"], checker.return_value)

    def test_fatal_collector_stops_summary(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data, processed, logs = self.paths(root)
            summary = Mock()
            code = run(
                data, processed, logs, NOW, self.collector(2, []), summary, Mock()
            )
            self.assertEqual(code, 2)
            summary.assert_not_called()
            report = json.loads((logs / "last_pipeline_run.json").read_text(encoding="utf-8"))
            self.assertEqual(report["pipeline_status"], "fatal_failure")

    def test_partial_collector_without_daily_file_stops_summary(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data, processed, logs = self.paths(root)
            logs.mkdir()

            def collector(data_dir, log_dir, now):
                (Path(log_dir) / "last_run.json").write_text(
                    json.dumps(collector_report(1), ensure_ascii=False), encoding="utf-8"
                )
                return 1

            summary = Mock()
            code = run(data, processed, logs, NOW, collector, summary, Mock())
            self.assertEqual(code, 2)
            summary.assert_not_called()
            report = json.loads((logs / "last_pipeline_run.json").read_text(encoding="utf-8"))
            self.assertEqual(report["pipeline_status"], "fatal_failure")

    def test_ollama_failure_preserves_collector_and_processed_data(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data, processed, logs = self.paths(root)
            data.mkdir()
            processed.mkdir()
            previous = [{"url": "https://example.com/old", "status": "ok",
                         "extractive_summary": ["旧摘要一。", "旧摘要二。"]}]
            target = processed / "2026-10-04.json"
            target.write_text(json.dumps(previous, ensure_ascii=False), encoding="utf-8")
            before = target.read_bytes()
            summary = Mock()
            details = {
                "initial_status": "offline", "start_attempted": True,
                "start_succeeded": False, "startup_seconds": 30.0,
                "model_available": False, "failure_reason": "startup_timeout",
            }
            checker = Mock(side_effect=OllamaLifecycleError("Ollama 未启动", details))
            source = item()
            code = run(
                data, processed, logs, NOW, self.collector(0, [source]), summary, checker
            )
            self.assertEqual(code, 3)
            summary.assert_not_called()
            self.assertEqual(target.read_bytes(), before)
            saved = json.loads((data / "2026-10-04.json").read_text(encoding="utf-8"))
            self.assertEqual(saved, [source])
            report = json.loads((logs / "last_pipeline_run.json").read_text(encoding="utf-8"))
            self.assertEqual(report["pipeline_status"], "summary_failure")
            self.assertEqual(report["ollama"], details)

    def test_all_cached_skips_ollama_preflight(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data, processed, logs = self.paths(root)
            source = item()
            cached = {**source, "extractive_summary": ["事实一。", "事实二。"],
                      "status": "ok", "needs_review": False}
            processed.mkdir()
            (processed / "2026-10-04.json").write_text(
                json.dumps([cached], ensure_ascii=False), encoding="utf-8"
            )
            checker = Mock(side_effect=AssertionError("缓存命中时不应要求 Ollama"))
            stats = {
                "selected": 1, "cached": 1, "succeeded": 0,
                "extraction_failed": 0, "selection_failed": 0,
                "needs_review": 0, "ai_seconds": 0.0,
                "output_file": str(processed / "2026-10-04.json"),
            }
            code = run(
                data, processed, logs, NOW, self.collector(0, [source]),
                self.summary([cached], stats), checker,
            )
            self.assertEqual(code, 0)
            checker.assert_not_called()


class OllamaLifecycleTests(unittest.TestCase):
    @patch("daily_pipeline.start_ollama_server")
    @patch("daily_pipeline.ollama_models", return_value={MODEL})
    def test_already_online(self, models, starter):
        result = check_ollama()
        self.assertEqual(result, {
            "initial_status": "online", "start_attempted": False,
            "model_available": True,
        })
        starter.assert_not_called()

    @patch("daily_pipeline.time.sleep", return_value=None)
    @patch("daily_pipeline.time.perf_counter", side_effect=[10.0, 13.2])
    @patch("daily_pipeline.start_ollama_server")
    @patch("daily_pipeline.find_ollama_executable", return_value="ollama.exe")
    @patch("daily_pipeline.ollama_models")
    def test_offline_then_start_success(self, models, finder, starter, clock, sleep):
        models.side_effect = [
            requests.ConnectionError("offline"),
            requests.ConnectionError("offline"),
            requests.ConnectionError("starting"),
            {MODEL},
        ]
        starter.return_value.poll.return_value = None
        result = check_ollama(startup_timeout=3)
        self.assertEqual(result["initial_status"], "offline")
        self.assertTrue(result["start_attempted"])
        self.assertTrue(result["start_succeeded"])
        self.assertEqual(result["startup_seconds"], 3.2)
        self.assertTrue(result["model_available"])
        starter.assert_called_once_with("ollama.exe")

    @patch("daily_pipeline.time.sleep", return_value=None)
    @patch("daily_pipeline.time.perf_counter", side_effect=[10.0, 13.0])
    @patch("daily_pipeline.start_ollama_server")
    @patch("daily_pipeline.find_ollama_executable", return_value="ollama.exe")
    @patch("daily_pipeline.ollama_models", side_effect=requests.ConnectionError("offline"))
    def test_start_timeout(self, models, finder, starter, clock, sleep):
        starter.return_value.poll.return_value = None
        with self.assertRaises(OllamaLifecycleError) as raised:
            check_ollama(startup_timeout=3)
        self.assertEqual(raised.exception.details["failure_reason"], "startup_timeout")
        self.assertEqual(sleep.call_count, 3)
        starter.return_value.terminate.assert_called_once_with()

    @patch("daily_pipeline.start_ollama_server")
    @patch("daily_pipeline.ollama_models", return_value={"another-model:latest"})
    def test_model_missing(self, models, starter):
        with self.assertRaises(OllamaLifecycleError) as raised:
            check_ollama()
        self.assertEqual(raised.exception.details["failure_reason"], "model_missing")
        self.assertFalse(raised.exception.details["start_attempted"])
        starter.assert_not_called()

    @patch("daily_pipeline.start_ollama_server", side_effect=OSError("denied"))
    @patch("daily_pipeline.find_ollama_executable", return_value="ollama.exe")
    @patch("daily_pipeline.ollama_models", side_effect=requests.ConnectionError("offline"))
    def test_start_process_failure(self, models, finder, starter):
        with self.assertRaises(OllamaLifecycleError) as raised:
            check_ollama()
        self.assertEqual(raised.exception.details["failure_reason"], "start_process_failure")
        self.assertTrue(raised.exception.details["start_attempted"])


if __name__ == "__main__":
    unittest.main()
