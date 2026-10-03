from contextlib import redirect_stdout
from datetime import datetime, timedelta
import io
import json
import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import config
from collectors import gov_cn, people, stcn, xinhua
from collectors.common import (AccessRestricted, CollectionResult, SourceError, article,
                               canonical_url, check_access, date_from_url, latest_items,
                               normalize_date, parse_rss, rss_or_page)
from main import run
from storage import load_history, run_lock, write_json_atomic

NOW = datetime(2026, 10, 3, 20, 0, tzinfo=config.TIMEZONE)
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def sample(source="测试来源", path="one", now=NOW):
    return article("真实字段测试", source, "国内", f"https://example.com/{path}", now, "2026-10-03")


class ParsingTests(unittest.TestCase):
    def test_official_page_fragments(self):
        policies = gov_cn.parse_policies(fixture("gov_policy.html"), NOW)
        news = gov_cn.parse_news(json.loads(fixture("gov_news.json")), NOW)
        xh = xinhua.parse_page(fixture("xinhua.html"), NOW)
        pe = people.parse_page(fixture("people.html"), NOW)
        st = stcn.parse_page(fixture("stcn.html"), NOW, "产业", "https://www.stcn.com/")
        self.assertEqual(policies[0]["published_at"], "2026-09-30")
        self.assertEqual(news[0]["published_at"], "2026-10-03")
        self.assertEqual(xh[0]["published_at"], "2026-10-03")
        self.assertEqual(pe[0]["published_at"], "2026-10-03")
        self.assertEqual(st[0]["published_at"], "2026-10-03T15:03:00+08:00")
        self.assertTrue(st[0]["summary"].startswith("“如果中国想来这里开工厂"))
        for item in policies + news + xh + pe + st:
            self.assertEqual(set(item), set(config.FIELDS))
            self.assertTrue(item["url"].startswith(("http://", "https://")))
        self.assertEqual(xh[0]["summary"], "")
        self.assertEqual(pe[0]["summary"], "")

    def test_stale_feed_is_not_todays_news(self):
        rss = b'<rss version="2.0"><channel><item><title>Old</title><link>https://www.news.cn/politics/2022-12/14/c_1.htm</link></item></channel></rss>'
        with self.assertRaisesRegex(SourceError, "2022-12-14"):
            parse_rss(rss, "新华网", "时政", NOW, config.XINHUA_RSS_URL)

    def test_current_feed_keeps_publisher_description(self):
        rss = '''<rss version="2.0"><channel><item><title>科技新闻</title>
        <link>https://36kr.com/p/123</link><pubDate>Sat, 03 Oct 2026 08:30:00 GMT</pubDate>
        <description><![CDATA[<p>来源提供的摘要</p>]]></description></item></channel></rss>'''
        rows = parse_rss(rss.encode(), "36氪", "科技", NOW, config.KR36_RSS_URL)
        self.assertEqual(rows[0]["summary"], "来源提供的摘要")
        self.assertEqual(rows[0]["published_at"], "2026-10-03T16:30:00+08:00")

    def test_empty_or_changed_page_is_failure(self):
        with self.assertRaises(SourceError):
            latest_items(xinhua.parse_page("<html>changed</html>", NOW), NOW)

    def test_url_dedup_keeps_meaningful_query(self):
        self.assertEqual(canonical_url("HTTPS://EXAMPLE.COM/a?id=1#x"), "https://example.com/a?id=1")
        self.assertNotEqual(canonical_url("https://example.com/a?id=1"), canonical_url("https://example.com/a?id=2"))
        with self.assertRaises(ValueError):
            canonical_url("javascript:alert(1)")

    def test_relative_dates_and_precision(self):
        new_year = NOW.replace(year=2027, month=1, day=1)
        self.assertEqual(normalize_date("12-31 23:55", new_year, relative=True), "2026-12-31T23:55:00+08:00")
        self.assertEqual(normalize_date("2026-10-03", NOW), "2026-10-03")
        self.assertEqual(normalize_date("unknown", NOW), "")
        self.assertEqual(date_from_url("https://www.gov.cn/zhengce/202610/content_1.htm"), "")

    def test_age_limit_and_in_response_dedup(self):
        item = sample()
        old = dict(sample(path="old"), published_at="2022-01-01")
        future = dict(sample(path="future"), published_at="2099-01-01")
        self.assertEqual(latest_items([item, item, old, future], NOW), [item])


class AccessTests(unittest.TestCase):
    def test_http_200_challenge_and_403_are_failures(self):
        for status, body in [(200, "<p>正在进行安全检测...</p>"), (200, "_wafchallengeid"), (403, ""), (429, "")]:
            with self.subTest(status=status, body=body), self.assertRaises(AccessRestricted):
                check_access(status, body, "https://example.com")

    def test_restriction_does_not_trigger_alternate_route(self):
        client = Mock()
        client.get.side_effect = AccessRestricted("403")
        parser = Mock()
        with self.assertRaises(AccessRestricted):
            rss_or_page(client, NOW, "来源", "新闻", "rss", "page", parser)
        client.get.assert_called_once_with("rss")
        parser.assert_not_called()

    def test_stale_rss_can_use_public_page(self):
        client = Mock()
        client.logger = logging.getLogger("test")
        client.get.side_effect = [SimpleNamespace(content=b"<rss><channel/></rss>"), SimpleNamespace(text="page")]
        result = rss_or_page(client, NOW, "来源", "新闻", "rss", "page", lambda html, now: [sample()])
        self.assertEqual(len(result.items), 1)
        self.assertEqual(len(result.warnings), 1)
        self.assertEqual(client.get.call_count, 2)


class PersistenceTests(unittest.TestCase):
    def test_failure_isolation_same_day_and_cross_day_dedup(self):
        def broken(client, now):
            raise RuntimeError("模拟单源网络失败")
        collectors = (
            SimpleNamespace(SOURCE="来源甲", collect=lambda client, now: CollectionResult([sample("来源甲", "a", now)])),
            SimpleNamespace(SOURCE="失败来源", collect=broken),
            SimpleNamespace(SOURCE="来源乙", collect=lambda client, now: CollectionResult([sample("来源乙", "b", now)])),
        )
        with TemporaryDirectory() as directory, redirect_stdout(io.StringIO()):
            data, logs = Path(directory) / "data", Path(directory) / "logs"
            for now in [NOW, NOW, NOW + timedelta(days=1)]:
                self.assertEqual(run(data, logs, collectors, lambda logger: Mock(), now), 1)
            first = json.loads((data / "2026-10-03.json").read_text(encoding="utf-8"))
            self.assertEqual(len(first), 2)
            self.assertEqual(json.loads((data / "2026-10-04.json").read_text(encoding="utf-8")), [])
            report = json.loads((logs / "last_run.json").read_text(encoding="utf-8"))
            self.assertEqual(report["total_new"], 0)
            self.assertEqual(report["sources"][2]["fetched"], 1)
            self.assertEqual(report["sources"][1]["status"], "failed")
            self.assertIn("模拟单源网络失败", (logs / "2026-10-03.log").read_text(encoding="utf-8"))
            self.assertIn("真实字段测试", (data / "2026-10-03.json").read_text(encoding="utf-8"))

    def test_bad_history_is_preserved_and_stops_network(self):
        with TemporaryDirectory() as directory, redirect_stdout(io.StringIO()):
            root = Path(directory)
            target = root / "2026-10-03.json"
            target.write_text("{broken", encoding="utf-8")
            factory = Mock()
            self.assertEqual(run(root, root / "logs", client_factory=factory, now=NOW), 2)
            factory.assert_not_called()
            self.assertEqual(target.read_text(encoding="utf-8"), "{broken")

    def test_failed_replace_does_not_truncate_existing_file(self):
        with TemporaryDirectory() as directory:
            target = Path(directory) / "news.json"
            write_json_atomic(target, [sample()])
            before = target.read_bytes()
            with patch("storage.os.replace", side_effect=OSError("disk failure")):
                with self.assertRaises(OSError):
                    write_json_atomic(target, [])
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual(list(Path(directory).glob("*.tmp")), [])

    def test_duplicate_runs_cannot_hold_lock_at_once(self):
        with TemporaryDirectory() as directory:
            with run_lock(Path(directory)):
                with self.assertRaises(RuntimeError):
                    with run_lock(Path(directory)):
                        pass
            with run_lock(Path(directory)):
                pass

    def test_all_failed_run_preserves_already_saved_items(self):
        failure = SimpleNamespace(SOURCE="失败来源", collect=lambda client, now: CollectionResult(errors=["失败"]))
        with TemporaryDirectory() as directory, redirect_stdout(io.StringIO()):
            root = Path(directory)
            write_json_atomic(root / "2026-10-03.json", [sample()])
            self.assertEqual(run(root, root / "logs", (failure,), lambda logger: Mock(), NOW), 2)
            self.assertEqual(len(load_history(root, "2026-10-03")[1]), 1)


if __name__ == "__main__":
    unittest.main()
