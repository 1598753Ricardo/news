"""Independent extractive-summary experiment for already collected news."""

from datetime import datetime
import argparse
import json
from pathlib import Path
import re
import time

import requests

import config
from storage import write_json_atomic
from summary import (ArticleClient, MODEL, OLLAMA_GENERATE_URL, load_json_list,
                     select_items)


PROCESSED_EXTRACTIVE_DIR = config.PROJECT_DIR / "processed_extractive"
END_PUNCTUATION = "。！？；"
OPEN_TO_CLOSE = {
    "“": "”", "‘": "’", "「": "」", "『": "』", "《": "》",
    "（": "）", "(": ")", "【": "】", "[": "]",
}
ATTRIBUTION_WORD_RE = re.compile(
    r"认为|表示|指出|强调|提醒|要求|宣布|提到|预计|有望|倡议|称|说"
)
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "selected_sentences": {
            "type": "array",
            "items": {"type": "integer"},
            "minItems": 2,
            "maxItems": 4,
            "uniqueItems": True,
        },
    },
    "required": ["selected_sentences"],
    "additionalProperties": False,
}
PROMPT = """你是新闻抽取式摘要的选句器。你只能选择句子编号，绝不能生成、复述、改写或润色新闻文字。

只输出符合 JSON schema 的对象，例如：{{"selected_sentences":[2,3]}}

规则：
1. 选择 2—4 个最能帮助读者快速理解新闻的句子，不要求选满 4 句。
2. 优先选择新闻发生了什么、最关键数字或事实、核心主体的行动、决定或表态。
3. 只能输出合法句子编号，不输出新闻文本、解释或选择原因。
4. 不加入背景知识，不预测影响，不评价，不输出“为什么重要”。
5. 涉及“某人称”“市场认为”“专家表示”等观点时，必须选择包含完整消息来源或观点归属的原句。
6. 按原文出现顺序返回编号。
7. 每个入选句子应能独立理解；不要选择“该片”“其”“这”等缺少明确指代对象的句子。
8. 避免重复表达同一事实，尽量覆盖不同核心事实。
9. 不选择记者、摄影、编辑等署名，不选择孤立日期、栏目标题或无事实信息的口号。
10. 宁可只选 2—3 句，也不要为了凑数选择次要信息。
11. 不输出 Markdown、代码围栏或思考过程。

标题：{title}
来源：{source}
句子列表：
{numbered_sentences}
"""


class SentenceSelectionError(ValueError):
    pass


def split_sentences(body):
    """Split Chinese prose while keeping punctuation and quoted attribution intact."""
    sentences = []
    for paragraph in body.splitlines():
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        buffer = []
        stack = []
        for char in paragraph:
            buffer.append(char)
            if char in OPEN_TO_CLOSE:
                stack.append((OPEN_TO_CLOSE[char], len(buffer) - 1))
                continue
            if stack and char == stack[-1][0]:
                _, opening_index = stack.pop()
                if (not stack and len(buffer) >= 2 and buffer[-2] in END_PUNCTUATION
                        and ATTRIBUTION_WORD_RE.search("".join(buffer[:opening_index]))):
                    sentences.append("".join(buffer).strip())
                    buffer = []
                continue
            if char in END_PUNCTUATION and not stack:
                sentences.append("".join(buffer).strip())
                buffer = []
        if buffer:
            sentences.append("".join(buffer).strip())
    return [sentence for sentence in sentences if sentence]


def validate_selected_sentences(result, sentence_count):
    if not isinstance(result, dict) or set(result) != {"selected_sentences"}:
        raise SentenceSelectionError("模型输出字段不符合选句结构")
    selected = result["selected_sentences"]
    if not isinstance(selected, list) or not 2 <= len(selected) <= 4:
        raise SentenceSelectionError("selected_sentences 必须包含 2—4 个编号")
    if any(type(value) is not int for value in selected):
        raise SentenceSelectionError("句子编号必须全部是整数")
    if len(selected) != len(set(selected)):
        raise SentenceSelectionError("句子编号不得重复")
    if any(value < 1 or value > sentence_count for value in selected):
        raise SentenceSelectionError("句子编号超出正文范围")
    return sorted(selected)


class ExtractiveOllamaClient:
    def __init__(self, url=OLLAMA_GENERATE_URL, model=MODEL):
        self.url = url
        self.model = model
        self.session = requests.Session()
        self.session.trust_env = False

    def close(self):
        self.session.close()

    def select(self, item, sentences):
        numbered = "\n".join(f"[{index}] {sentence}" for index, sentence in enumerate(sentences, 1))
        request_body = {
            "model": self.model,
            "prompt": PROMPT.format(
                title=item["title"], source=item["source"], numbered_sentences=numbered
            ),
            "stream": False,
            "think": False,
            "format": OUTPUT_SCHEMA,
            "keep_alive": "10m",
            "options": {"temperature": 0, "num_predict": 64},
        }
        started = time.perf_counter()
        response = self.session.post(self.url, json=request_body, timeout=300)
        response.raise_for_status()
        payload = response.json()
        elapsed = time.perf_counter() - started
        if payload.get("thinking"):
            raise SentenceSelectionError("模型在 think=false 时仍返回 thinking 内容")
        raw = payload.get("response", "")
        if "<think>" in raw or "</think>" in raw:
            raise SentenceSelectionError("模型响应混入 thinking 内容")
        try:
            result = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SentenceSelectionError("模型未返回纯 JSON 编号对象") from exc
        selected = validate_selected_sentences(result, len(sentences))
        eval_duration = payload.get("eval_duration", 0)
        eval_count = payload.get("eval_count", 0)
        metrics = {
            "ai_seconds": round(elapsed, 3),
            "output_tokens": eval_count,
            "tokens_per_second": round(eval_count / (eval_duration / 1e9), 2)
            if eval_duration else None,
        }
        return selected, metrics


def failure_record(item, article_chars, sentence_count, stage, error, now):
    return {
        "title": item["title"], "source": item["source"],
        "published_at": item.get("published_at", ""), "url": item["url"],
        "extractive_summary": [], "selected_sentence_ids": [],
        "article_chars": article_chars, "sentence_count": sentence_count,
        "model": MODEL, "think": False,
        "processed_at": now.isoformat(timespec="seconds"),
        "status": "failed", "failure_stage": stage, "error": error,
    }


def run_extractive(day, limit=None, data_dir=config.DATA_DIR,
                   processed_dir=PROCESSED_EXTRACTIVE_DIR,
                   article_client=None, ollama_client=None, now=None):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise ValueError("日期必须为 YYYY-MM-DD")
    source_items = load_json_list(Path(data_dir) / f"{day}.json")
    selected_items = select_items(source_items, limit)
    output_path = Path(processed_dir) / f"{day}.json"
    existing = load_json_list(output_path)
    records = {row["url"]: row for row in existing if isinstance(row, dict) and row.get("url")}
    article_client = article_client or ArticleClient()
    ollama_client = ollama_client or ExtractiveOllamaClient()
    now = (now or datetime.now(config.TIMEZONE)).astimezone(config.TIMEZONE)
    stats = {
        "selected": len(selected_items), "cached": 0, "succeeded": 0,
        "extraction_failed": 0, "selection_failed": 0, "ai_seconds": 0.0,
    }
    try:
        for index, item in enumerate(selected_items, 1):
            cached = records.get(item["url"])
            if cached and cached.get("status") == "ok" and cached.get("extractive_summary"):
                stats["cached"] += 1
                print(f"[{index}/{len(selected_items)}] cached {item['source']} {item['title']}")
                continue
            article_chars = 0
            sentence_count = 0
            try:
                body = article_client.extract(item)
                article_chars = len(body)
                sentences = split_sentences(body)
                sentence_count = len(sentences)
                if sentence_count < 2:
                    raise SentenceSelectionError("可靠正文不足 2 个完整句子")
            except Exception as exc:
                article_chars = getattr(exc, "article_chars", article_chars)
                error = f"{type(exc).__name__}: {exc}"
                records[item["url"]] = failure_record(
                    item, article_chars, sentence_count, "extraction", error, now
                )
                stats["extraction_failed"] += 1
                print(f"[{index}/{len(selected_items)}] extraction failed {item['source']} "
                      f"{item['title']}: {error}")
                continue
            try:
                selected_ids, metrics = ollama_client.select(item, sentences)
                extracted = [sentences[value - 1] for value in selected_ids]
                if any(sentence not in body for sentence in extracted):
                    raise SentenceSelectionError("程序复制结果无法逐字对应正文")
                records[item["url"]] = {
                    "title": item["title"], "source": item["source"],
                    "published_at": item.get("published_at", ""), "url": item["url"],
                    "extractive_summary": extracted,
                    "selected_sentence_ids": selected_ids,
                    "article_chars": article_chars, "sentence_count": sentence_count,
                    "model": MODEL, "think": False,
                    "processed_at": now.isoformat(timespec="seconds"),
                    "status": "ok", "processing": metrics,
                }
                stats["succeeded"] += 1
                stats["ai_seconds"] += metrics["ai_seconds"]
                print(f"[{index}/{len(selected_items)}] ok {item['source']} chars={article_chars} "
                      f"sentences={sentence_count} ids={selected_ids} "
                      f"ai={metrics['ai_seconds']:.3f}s")
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                records[item["url"]] = failure_record(
                    item, article_chars, sentence_count, "selection", error, now
                )
                stats["selection_failed"] += 1
                print(f"[{index}/{len(selected_items)}] selection failed {item['source']} "
                      f"{item['title']}: {error}")
    finally:
        article_client.close()
        ollama_client.close()

    ordered_urls = [item["url"] for item in source_items if item["url"] in records]
    ordered_set = set(ordered_urls)
    extras = [url for url in records if url not in ordered_set]
    write_json_atomic(output_path, [records[url] for url in ordered_urls + extras])
    stats["ai_seconds"] = round(stats["ai_seconds"], 3)
    stats["output_file"] = str(output_path.resolve())
    return stats


def main():
    parser = argparse.ArgumentParser(description="学有渔力 Summary V0.3 Extractive 实验")
    parser.add_argument("day", help="输入日期 YYYY-MM-DD")
    parser.add_argument("--limit", type=int, help="按来源轮询选择最多 N 条")
    args = parser.parse_args()
    try:
        stats = run_extractive(args.day, args.limit)
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        return 1 if stats["extraction_failed"] or stats["selection_failed"] else 0
    except Exception as exc:
        print(f"Summary V0.3 Extractive 失败：{type(exc).__name__}: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
