from datetime import datetime
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock

import config
from summary_extractive import (SentenceSelectionError, run_extractive, split_sentences,
                                validate_selected_sentences)


NOW = datetime(2026, 10, 4, 12, 0, tzinfo=config.TIMEZONE)


def item(index=1):
    return {
        "title": f"标题{index}", "source": "新华网", "category": "测试",
        "published_at": "2026-10-04", "url": f"https://example.com/{index}",
        "summary": "", "collected_at": NOW.isoformat(),
    }


class SentenceSplittingTests(unittest.TestCase):
    def test_chinese_boundaries_keep_punctuation(self):
        body = "第一句话。第二句话！第三句话？第四句话；第五句话"
        self.assertEqual(split_sentences(body), [
            "第一句话。", "第二句话！", "第三句话？", "第四句话；", "第五句话",
        ])

    def test_punctuation_inside_quote_does_not_split_claim(self):
        body = "“市场认为，鸿蒙智行下滑主要源于问界业务模式调整。”\n下一事实。"
        self.assertEqual(split_sentences(body), [
            "“市场认为，鸿蒙智行下滑主要源于问界业务模式调整。”", "下一事实。",
        ])

    def test_postposed_attribution_stays_with_quote(self):
        body = "“至少一架飞行器被击中。”当地居民称。下一事实。"
        self.assertEqual(split_sentences(body), [
            "“至少一架飞行器被击中。”当地居民称。", "下一事实。",
        ])

    def test_preposed_attribution_closes_at_quote(self):
        body = "市场人士表示：“销量出现波动。”下一事实。"
        self.assertEqual(split_sentences(body), [
            "市场人士表示：“销量出现波动。”", "下一事实。",
        ])


class SelectionValidationTests(unittest.TestCase):
    def test_valid_ids_are_sorted_for_article_order(self):
        self.assertEqual(validate_selected_sentences({"selected_sentences": [3, 1]}, 3), [1, 3])

    def test_rejects_text_or_extra_fields(self):
        with self.assertRaises(SentenceSelectionError):
            validate_selected_sentences({"selected_sentences": [1, 2], "summary": "新闻文本"}, 3)

    def test_rejects_non_integer_duplicate_out_of_range_and_wrong_count(self):
        bad_values = (["1", 2], [1, 1], [1, 4], [1])
        for selected in bad_values:
            with self.subTest(selected=selected), self.assertRaises(SentenceSelectionError):
                validate_selected_sentences({"selected_sentences": selected}, 3)


class PipelineTests(unittest.TestCase):
    def test_program_copies_selected_sentences_exactly(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data_dir, processed_dir = root / "data", root / "processed_extractive"
            data_dir.mkdir()
            source = item()
            (data_dir / "2026-10-04.json").write_text(
                json.dumps([source], ensure_ascii=False), encoding="utf-8"
            )
            body = "财政部公布数据。全国政府采购规模为33212.96亿元。市场认为，数据值得关注。"
            article_client, ollama_client = Mock(), Mock()
            article_client.extract.return_value = body
            ollama_client.select.return_value = ([2, 3], {"ai_seconds": 1.25})
            stats = run_extractive(
                "2026-10-04", data_dir=data_dir, processed_dir=processed_dir,
                article_client=article_client, ollama_client=ollama_client, now=NOW,
            )
            rows = json.loads((processed_dir / "2026-10-04.json").read_text(encoding="utf-8"))
            self.assertEqual(stats["succeeded"], 1)
            self.assertEqual(rows[0]["extractive_summary"], [
                "全国政府采购规模为33212.96亿元。", "市场认为，数据值得关注。",
            ])
            self.assertEqual(rows[0]["selected_sentence_ids"], [2, 3])
            article_client.close.assert_called_once()
            ollama_client.close.assert_called_once()

    def test_successful_url_is_cached(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data_dir, processed_dir = root / "data", root / "processed_extractive"
            data_dir.mkdir()
            processed_dir.mkdir()
            source = item()
            (data_dir / "2026-10-04.json").write_text(
                json.dumps([source], ensure_ascii=False), encoding="utf-8"
            )
            cached = {
                "title": source["title"], "source": source["source"],
                "published_at": source["published_at"], "url": source["url"],
                "extractive_summary": ["原句一。", "原句二。"],
                "selected_sentence_ids": [1, 2], "article_chars": 20,
                "sentence_count": 2, "model": "qwen3:4b", "think": False,
                "processed_at": NOW.isoformat(), "status": "ok",
            }
            (processed_dir / "2026-10-04.json").write_text(
                json.dumps([cached], ensure_ascii=False), encoding="utf-8"
            )
            article_client, ollama_client = Mock(), Mock()
            stats = run_extractive(
                "2026-10-04", data_dir=data_dir, processed_dir=processed_dir,
                article_client=article_client, ollama_client=ollama_client, now=NOW,
            )
            self.assertEqual(stats["cached"], 1)
            article_client.extract.assert_not_called()
            ollama_client.select.assert_not_called()


if __name__ == "__main__":
    unittest.main()
