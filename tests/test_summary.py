from datetime import datetime
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock

import config
from summary import (select_items, validate_attribution, validate_names, validate_numbers,
                     validate_summary, run_summary)


NOW = datetime(2026, 10, 4, 12, 0, tzinfo=config.TIMEZONE)


def item(source, index):
    return {
        "title": f"标题{index}", "source": source, "category": "测试",
        "published_at": "2026-10-04", "url": f"https://example.com/{index}",
        "summary": "", "collected_at": NOW.isoformat(),
    }


class ValidationTests(unittest.TestCase):
    def test_money_unit_conversion_is_equivalent(self):
        ok, warnings = validate_numbers("采购规模为3.321296万亿元", "采购规模为33212.96亿元。")
        self.assertTrue(ok)
        self.assertEqual(warnings, [])

    def test_number_mismatch_requires_review(self):
        ok, warnings = validate_numbers("增长29.3%", "同比增长29.2%。")
        self.assertFalse(ok)
        self.assertIn("29.3%", warnings[0])

    def test_malformed_number_requires_review(self):
        ok, warnings = validate_numbers("服务采购占比36..77%", "服务采购占比36.77%。")
        self.assertFalse(ok)
        self.assertIn("36..7", warnings[0])

    def test_work_name_typo_requires_review(self):
        ok, warnings = validate_names("《神探之：痕迹》票房第一", "《神探之痕迹》票房第一。")
        self.assertFalse(ok)
        self.assertIn("《神探之：痕迹》", warnings[0])

    def test_name_split_by_separator_requires_review(self):
        ok, warnings = validate_names("保护区内有藏野：驴约5万头", "保护区内有藏野驴约5万头。")
        self.assertFalse(ok)
        self.assertIn("异常标点", warnings[0])

    def test_attribution_colon_is_not_name_warning(self):
        ok, warnings = validate_names("公司表示：销量为5万台", "公司表示：销量为5万台。")
        self.assertTrue(ok)
        self.assertEqual(warnings, [])

    def test_attribution_drop_requires_review(self):
        body = "市场认为，鸿蒙智行下滑主要源于业务模式调整，客户预期出现波动。"
        ok, warnings = validate_attribution("鸿蒙智行下滑主要源于业务模式调整。", body)
        self.assertFalse(ok)
        self.assertIn("市场认为", warnings[0])

    def test_preserved_attribution_passes(self):
        body = "分析人士认为，全年电影票房仍具备修复空间。"
        ok, warnings = validate_attribution("分析人士认为，全年电影票房仍具备修复空间。", body)
        self.assertTrue(ok)
        self.assertEqual(warnings, [])

    def test_later_ascii_semicolon_attribution_does_not_cover_earlier_claim(self):
        body = "当地居民称，至少一架飞行器在格什姆岛上空被击中。"
        output = "至少一架飞行器在格什姆岛上空被击中;胡塞武装称行动成功。"
        ok, warnings = validate_attribution(output, body)
        self.assertFalse(ok)
        self.assertIn("当地居民称", warnings[0])

    def test_direct_quote_without_speaker_requires_review(self):
        body = "‘农业生产布局关乎发展与安全。’这是习近平总书记的原话。"
        ok, warnings = validate_attribution("农业生产布局关乎发展与安全", body)
        self.assertFalse(ok)
        self.assertIn("直接引语", warnings[0])

    def test_combined_validation_shape(self):
        result = {"summary": "司法部表示，2025年调解100万件。", "key_points": ["成功率96%", "司法部表示数据来自统计"]}
        validation = validate_summary(result, "司法部表示，2025年调解100万件，成功率96%。")
        self.assertEqual(set(validation), {"numbers_ok", "names_ok", "attribution_ok", "warnings"})
        self.assertTrue(all(validation[key] for key in ("numbers_ok", "names_ok", "attribution_ok")))


class SelectionAndCacheTests(unittest.TestCase):
    def test_limited_selection_round_robins_sources(self):
        rows = []
        index = 0
        for source, count in (("中国政府网", 2), ("新华网", 8), ("人民网", 8), ("证券时报", 5), ("36氪", 4)):
            for _ in range(count):
                rows.append(item(source, index))
                index += 1
        selected = select_items(rows, 15)
        counts = {source: sum(row["source"] == source for row in selected) for source in config_source_order()}
        self.assertEqual(counts, {"中国政府网": 2, "新华网": 5, "人民网": 4, "证券时报": 4})
        self.assertNotIn("36氪", [row["source"] for row in selected])

    def test_successful_url_is_cached_without_clients(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data_dir, processed_dir = root / "data", root / "processed"
            data_dir.mkdir()
            processed_dir.mkdir()
            source = item("新华网", 1)
            (data_dir / "2026-10-04.json").write_text(json.dumps([source], ensure_ascii=False), encoding="utf-8")
            cached = {
                "title": source["title"], "source": source["source"], "published_at": source["published_at"],
                "url": source["url"], "summary": "已有摘要", "key_points": ["事实一", "事实二"],
                "article_chars": 200, "validation": {"numbers_ok": True, "names_ok": True,
                "attribution_ok": True, "warnings": []}, "needs_review": False,
                "processed_at": NOW.isoformat(), "status": "ok",
            }
            (processed_dir / "2026-10-04.json").write_text(json.dumps([cached], ensure_ascii=False), encoding="utf-8")
            article_client, ollama_client = Mock(), Mock()
            stats = run_summary("2026-10-04", data_dir=data_dir, processed_dir=processed_dir,
                                article_client=article_client, ollama_client=ollama_client, now=NOW)
            self.assertEqual(stats["cached"], 1)
            article_client.extract.assert_not_called()
            ollama_client.summarize.assert_not_called()
            article_client.close.assert_called_once()
            ollama_client.close.assert_called_once()


def config_source_order():
    return ("中国政府网", "新华网", "人民网", "证券时报")


if __name__ == "__main__":
    unittest.main()
