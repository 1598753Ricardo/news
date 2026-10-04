from datetime import datetime
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock

import config
from summary_context_guard import (apply_context_guard, dangling_references,
                                   deduplicate_ids, is_obvious_fragment,
                                   run_context_guard)


NOW = datetime(2026, 10, 4, 12, 0, tzinfo=config.TIMEZONE)


def item():
    return {
        "title": "票房新闻", "source": "证券时报", "category": "财经",
        "published_at": "2026-10-04", "url": "https://example.com/movie",
        "summary": "", "collected_at": NOW.isoformat(),
    }


class ContextGuardTests(unittest.TestCase):
    def test_dangling_film_reference_adds_previous_sentence(self):
        sentences = [
            "国庆档票房突破5亿元。",
            "《什么意思夫妇》由沈春阳执导并出演。",
            "该影片票房超过1.2亿元，排名第二。",
        ]
        selected, validation = apply_context_guard(sentences, [1, 3])
        self.assertEqual(selected, [1, 2, 3])
        self.assertEqual(validation["added_sentence_ids"], [2])
        self.assertTrue(validation["context_ok"])

    def test_generic_it_reference_adds_previous_sentence(self):
        sentences = [
            "展览中一个红色封皮的笔记本引人注目。",
            "它记录的是牛玉华的学习笔记。",
            "纪念馆面向公众开放。",
        ]
        selected, validation = apply_context_guard(sentences, [2, 3])
        self.assertEqual(selected, [1, 2, 3])
        self.assertEqual(validation["added_sentence_ids"], [1])
        self.assertTrue(validation["context_ok"])

    def test_existing_previous_sentence_is_not_added_twice(self):
        sentences = ["《甲》上映。", "该影片票房突破2亿元。", "另一事实。"]
        selected, validation = apply_context_guard(sentences, [1, 2, 3])
        self.assertEqual(selected, [1, 2, 3])
        self.assertEqual(validation["added_sentence_ids"], [])

    def test_unresolvable_reference_requires_review(self):
        sentences = ["天气晴朗。", "该公司宣布新计划。", "另一事实。"]
        selected, validation = apply_context_guard(sentences, [2, 3])
        self.assertEqual(selected, [2, 3])
        self.assertFalse(validation["context_ok"])
        self.assertIn("无法可靠", validation["warnings"][0])

    def test_complete_fact_after_qizhong_is_allowed(self):
        sentence = "其中，《神探之痕迹》票房超过2亿元，排名第一。"
        self.assertEqual(dangling_references(sentence), [])

    def test_other_does_not_trigger_generic_qi(self):
        self.assertEqual(dangling_references("其他影片票房保持稳定。"), [])

    def test_isolated_date_is_dropped_when_two_facts_remain(self):
        sentences = ["2025年3月。", "政策正式发布。", "企业开始执行。"]
        selected, validation = apply_context_guard(sentences, [1, 2, 3])
        self.assertEqual(selected, [2, 3])
        self.assertEqual(validation["dropped_fragment_sentence_ids"], [1])

    def test_credit_fragment_is_dropped(self):
        sentences = ["工程正式通航。", "每年节约运输费用超50亿元。", "（周璇参与采写）"]
        selected, validation = apply_context_guard(sentences, [1, 2, 3])
        self.assertEqual(selected, [1, 2])
        self.assertEqual(validation["dropped_fragment_sentence_ids"], [3])
        self.assertTrue(validation["context_ok"])

    def test_nominal_fragments_require_review_if_two_facts_cannot_remain(self):
        sentences = ["新石器时代玉猪龙、C形龙", "良渚玉琮 藏礼于器", "展览今日开幕。"]
        selected, validation = apply_context_guard(sentences, [1, 2, 3])
        self.assertEqual(selected, [1, 2, 3])
        self.assertFalse(validation["context_ok"])
        self.assertEqual(len(validation["warnings"]), 2)

    def test_transition_with_full_fact_is_retained(self):
        self.assertFalse(is_obvious_fragment("同日，该公司发布年度报告。"))

    def test_duplicate_keeps_sentence_with_attribution(self):
        sentences = [
            "胡塞武装使用导弹袭击沙特石油设施。",
            "据新华社消息，胡塞武装称使用导弹袭击沙特石油设施。",
            "另一项独立事实。",
        ]
        selected, removed = deduplicate_ids(sentences, [1, 2, 3])
        self.assertEqual(selected, [2, 3])
        self.assertEqual(removed, [1])

    def test_duplicate_event_with_different_source_lead_is_removed(self):
        sentences = [
            "据最新消息，也门胡塞武装3日称，使用弹道导弹和无人机袭击沙特石油设施。",
            "据新华社消息，当地时间10月3日，也门胡塞武装称，该组织使用弹道导弹和无人机袭击沙特石油设施，以回应近期空袭。",
            "发言人称过去24小时内当地遭到60次空袭。",
        ]
        selected, removed = deduplicate_ids(sentences, [1, 2, 3])
        self.assertEqual(selected, [2, 3])
        self.assertEqual(removed, [1])


class PipelineTests(unittest.TestCase):
    def test_successful_url_is_cached_without_refetch_or_model(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data_dir, output_dir = root / "data", root / "processed_context_guard"
            data_dir.mkdir()
            output_dir.mkdir()
            source = item()
            (data_dir / "2026-10-04.json").write_text(
                json.dumps([source], ensure_ascii=False), encoding="utf-8"
            )
            cached = {
                **source, "extractive_summary": ["原文句子一。", "原文句子二。"],
                "selected_sentence_ids": [1, 2], "status": "ok",
            }
            (output_dir / "2026-10-04.json").write_text(
                json.dumps([cached], ensure_ascii=False), encoding="utf-8"
            )
            article_client, ollama_client = Mock(), Mock()
            article_client.extract.side_effect = AssertionError("不得重新抓取")
            ollama_client.select.side_effect = AssertionError("不得重新调用模型")
            stats = run_context_guard(
                "2026-10-04", data_dir=data_dir, processed_dir=output_dir,
                article_client=article_client, ollama_client=ollama_client, now=NOW,
            )
            self.assertEqual(stats["cached"], 1)
            article_client.extract.assert_not_called()
            ollama_client.select.assert_not_called()

    def test_pipeline_repairs_context_and_copies_exact_text(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            data_dir, output_dir = root / "data", root / "processed_context_guard"
            data_dir.mkdir()
            source = item()
            (data_dir / "2026-10-04.json").write_text(
                json.dumps([source], ensure_ascii=False), encoding="utf-8"
            )
            body = "国庆档票房突破5亿元。《什么意思夫妇》由沈春阳执导。该影片票房超过1.2亿元。"
            article_client, ollama_client = Mock(), Mock()
            article_client.extract.return_value = body
            ollama_client.select.return_value = ([1, 3], {"ai_seconds": 1.0})
            stats = run_context_guard(
                "2026-10-04", data_dir=data_dir, processed_dir=output_dir,
                article_client=article_client, ollama_client=ollama_client, now=NOW,
            )
            rows = json.loads((output_dir / "2026-10-04.json").read_text(encoding="utf-8"))
            self.assertEqual(stats["context_repairs"], 1)
            self.assertEqual(rows[0]["selected_sentence_ids"], [1, 2, 3])
            self.assertEqual(rows[0]["extractive_summary"], [
                "国庆档票房突破5亿元。", "《什么意思夫妇》由沈春阳执导。",
                "该影片票房超过1.2亿元。",
            ])
            self.assertTrue(rows[0]["context_validation"]["context_ok"])
            self.assertFalse(rows[0]["needs_review"])


if __name__ == "__main__":
    unittest.main()
