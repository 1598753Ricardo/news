"""Independent factual-summary layer for already collected news."""

from collections import defaultdict, deque
from datetime import datetime
from decimal import Decimal, InvalidOperation
import argparse
import json
from pathlib import Path
import re
import time

from bs4 import BeautifulSoup
import requests

import config
from collectors.common import check_access
from storage import write_json_atomic


MODEL = "qwen3:4b"
OLLAMA_GENERATE_URL = "http://127.0.0.1:11434/api/generate"
PROCESSED_DIR = config.PROJECT_DIR / "processed"
SUPPORTED_SOURCES = ("中国政府网", "新华网", "人民网", "证券时报")
ARTICLE_SELECTORS = {
    "中国政府网": ("#UCAP-CONTENT", ".pages_content"),
    "新华网": ("#detailContent", "#detail", ".main-aticle", ".article"),
    "人民网": ("#rm_txt_zw", ".rm_txt_con"),
    "证券时报": (".detail-content",),
}
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "key_points": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 3,
        },
    },
    "required": ["summary", "key_points"],
    "additionalProperties": False,
}
PROMPT = """你是新闻事实压缩器。阅读完整正文后，只输出符合 JSON schema 的对象：
{{"summary":"1—2句话","key_points":["核心事实1","核心事实2"]}}

规则：
1. summary 只能用 1—2 句话概括正文明确说明的核心事实。
2. key_points 只能列 2—3 个正文明确存在的核心事实；不能为了凑 3 点编造。
3. 禁止加入背景知识、预测、影响分析、价值评价或“为什么重要”。
4. 禁止自行举例、扩大概念范围或强化语气。
5. 原文的“可能、预计、认为、表示、指出、称、有望”等不确定性和观点归属必须保留。
6. “市场认为、专家表示、分析人士认为、业内人士表示、公司表示、官方表示、记者了解到、消息人士称”等来源表达不得省略。
7. 人名、公司名、政策名、作品名和机构名必须照抄正文，不得改字。
8. 不输出解释、Markdown、代码围栏或思考过程，只输出 JSON。
9. 数字、专名和固定短语直接从正文复制，不在词语中插入标点或额外字符。
10. 输出前检查数字是否有重复小数点、专名是否被标点拆开。

标题：{title}
来源：{source}
正文：
{body}
"""

BOILERPLATE_RE = re.compile(
    r"^(责编|责任编辑|校对|声明：|下载[\"“]证券时报|证券时报各平台|转载与合作|"
    r"人民网版权所有|Copyright\b|[\u4e00-\u9fff]{2,8}/摄$)",
    re.IGNORECASE,
)
NUMBER_RE = re.compile(
    r"(?<![A-Za-z0-9])(?P<number>\d+(?:\.\d+)?)\s*"
    r"(?P<scale>万亿|亿|万)?\s*"
    r"(?P<unit>人次|场次|公里|平方米|%|％|元|人|件|台|辆|家|场|次|个|名|年|月|日)?"
)
WORK_NAME_RE = re.compile(r"《[^》\n]{1,50}》|“[^”\n]{2,50}”|「[^」\n]{1,50}」")
LATIN_NAME_RE = re.compile(r"(?<![A-Za-z0-9])[A-Z][A-Za-z0-9.-]{1,20}(?![A-Za-z0-9])")
KNOWN_INSTITUTIONS = (
    "国务院", "司法部", "财政部", "公安部", "教育部", "商务部", "国家统计局",
    "中国人民银行", "证监会", "国家发展改革委", "新华社",
)
ATTRIBUTION_RE = re.compile(
    r"市场认为|专家表示|分析人士认为|业内人士表示|公司表示|官方表示|"
    r"记者了解到|消息人士称|当地居民称|多方消息称|伊朗方面消息称|"
    r"认为|表示|指出|强调|提醒|要求|宣布|提到|预计|有望|倡议|称"
)
QUOTED_CLAIM_RE = re.compile(r"[“\"‘']([^”\"’'\n]{8,})[”\"’']")
MALFORMED_NUMBER_RE = re.compile(r"\d+(?:\.\.|，，|,,)\d+")
SUSPICIOUS_NAME_SEPARATOR_RE = re.compile(
    r"[\u4e00-\u9fff]{1,8}\s*[:：]\s*[\u4e00-\u9fff]{1,8}"
)
ALLOWED_SEPARATOR_PREFIXES = (
    "表示", "指出", "认为", "称", "强调", "提醒", "要求", "倡议", "如下", "包括", "为", "是",
)


class ArticleExtractionError(ValueError):
    def __init__(self, message, article_chars=0):
        super().__init__(message)
        self.article_chars = article_chars


def compact_text(value):
    return re.sub(r"\s+", "", str(value or ""))


def normalize_paragraph(value):
    return " ".join(str(value or "").replace("\u3000", " ").split())


def select_items(items, limit=None):
    supported = [item for item in items if item.get("source") in SUPPORTED_SOURCES]
    if limit is None or limit >= len(supported):
        return supported
    queues = defaultdict(deque)
    for item in supported:
        queues[item["source"]].append(item)
    selected = []
    while len(selected) < limit:
        added = False
        for source in SUPPORTED_SOURCES:
            if queues[source] and len(selected) < limit:
                selected.append(queues[source].popleft())
                added = True
        if not added:
            break
    return selected


class ArticleClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "XueYouYuLiSummary/0.2 (public news; sequential)"})
        self.last_request = 0.0

    def close(self):
        self.session.close()

    def extract(self, item):
        remaining = config.REQUEST_INTERVAL_SECONDS - (time.monotonic() - self.last_request)
        if remaining > 0:
            time.sleep(remaining)
        self.last_request = time.monotonic()
        response = self.session.get(item["url"], timeout=config.REQUEST_TIMEOUT)
        check_access(response.status_code, response.text[:10000], item["url"])
        response.raise_for_status()
        if len(response.content) > config.MAX_RESPONSE_BYTES:
            raise ValueError("新闻页面超过响应大小限制")
        if (response.encoding or "").lower() in {"iso-8859-1", "ascii", ""}:
            response.encoding = response.apparent_encoding or "utf-8"
        soup = BeautifulSoup(response.text, "html.parser")
        container = None
        for selector in ARTICLE_SELECTORS[item["source"]]:
            container = soup.select_one(selector)
            if container is not None:
                break
        if container is None:
            raise ValueError("未找到可靠正文容器")
        for tag in container.select("script, style, noscript, iframe, form"):
            tag.decompose()
        paragraphs = []
        for node in container.find_all(["p", "h2", "h3"]):
            text = normalize_paragraph(node.get_text(" ", strip=True))
            if text and not BOILERPLATE_RE.search(text) and text not in paragraphs:
                paragraphs.append(text)
        if not paragraphs:
            text = normalize_paragraph(container.get_text(" ", strip=True))
            paragraphs = [text] if text else []
        body = "\n".join(paragraphs)
        if len(body) < 120:
            raise ArticleExtractionError(
                f"可靠正文不足 120 字，实际 {len(body)} 字", article_chars=len(body)
            )
        return body


class OllamaClient:
    def __init__(self, url=OLLAMA_GENERATE_URL, model=MODEL):
        self.url = url
        self.model = model
        self.session = requests.Session()
        self.session.trust_env = False

    def close(self):
        self.session.close()

    def summarize(self, item, body):
        request_body = {
            "model": self.model,
            "prompt": PROMPT.format(title=item["title"], source=item["source"], body=body),
            "stream": False,
            "think": False,
            "format": OUTPUT_SCHEMA,
            "keep_alive": "10m",
            "options": {"temperature": 0, "num_predict": 512},
        }
        started = time.perf_counter()
        response = self.session.post(self.url, json=request_body, timeout=300)
        response.raise_for_status()
        payload = response.json()
        elapsed = time.perf_counter() - started
        if payload.get("thinking"):
            raise ValueError("模型在 think=false 时仍返回 thinking 内容")
        raw = payload.get("response", "")
        if "<think>" in raw or "</think>" in raw:
            raise ValueError("模型响应混入 thinking 内容")
        result = json.loads(raw)
        if set(result) != {"summary", "key_points"}:
            raise ValueError("模型输出字段不符合摘要结构")
        if not isinstance(result["summary"], str) or not isinstance(result["key_points"], list):
            raise ValueError("模型输出类型不符合摘要结构")
        if not 2 <= len(result["key_points"]) <= 3 or not all(
                isinstance(point, str) and point.strip() for point in result["key_points"]):
            raise ValueError("key_points 必须包含 2—3 个非空字符串")
        eval_duration = payload.get("eval_duration", 0)
        eval_count = payload.get("eval_count", 0)
        metrics = {
            "model": self.model,
            "think": False,
            "ai_seconds": round(elapsed, 3),
            "output_tokens": eval_count,
            "tokens_per_second": round(eval_count / (eval_duration / 1e9), 2)
            if eval_duration else None,
        }
        return result, metrics


def number_values(text):
    values = []
    for match in NUMBER_RE.finditer(compact_text(text)):
        raw = match.group(0)
        try:
            value = Decimal(match.group("number"))
        except InvalidOperation:
            continue
        scale = match.group("scale") or ""
        unit = match.group("unit") or ""
        if unit == "％":
            unit = "%"
        factor = {"": Decimal(1), "万": Decimal(10_000), "亿": Decimal(100_000_000),
                  "万亿": Decimal(1_000_000_000_000)}[scale]
        values.append((raw, value * factor, unit))
    return values


def validate_numbers(output_text, body):
    malformed = MALFORMED_NUMBER_RE.findall(output_text)
    if malformed:
        return False, [f"数字格式异常：{value}" for value in dict.fromkeys(malformed)]
    body_compact = compact_text(body)
    body_values = number_values(body)
    missing = []
    for raw, value, unit in number_values(output_text):
        if raw in body_compact:
            continue
        if any(value == body_value and unit == body_unit for _, body_value, body_unit in body_values):
            continue
        missing.append(raw)
    return not missing, [f"数字或单位无法在正文核实：{value}" for value in dict.fromkeys(missing)]


def proper_names(text):
    names = set(WORK_NAME_RE.findall(text))
    names.update(LATIN_NAME_RE.findall(text))
    names.update(name for name in KNOWN_INSTITUTIONS if name in text)
    return names


def validate_names(output_text, body):
    missing = sorted(name for name in proper_names(output_text) if name not in body)
    suspicious = []
    for match in SUSPICIOUS_NAME_SEPARATOR_RE.finditer(output_text):
        left = match.group(0).split(":", 1)[0].split("：", 1)[0].strip()
        if not any(left.endswith(prefix) for prefix in ALLOWED_SEPARATOR_PREFIXES):
            suspicious.append(match.group(0))
    warnings = [f"专名无法与正文原文匹配：{name}" for name in missing]
    warnings.extend(f"疑似专名被异常标点拆分：{name}" for name in dict.fromkeys(suspicious))
    return not warnings, warnings


def normalized_chars(value):
    return re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", value)


def ngrams(value, size=4):
    value = normalized_chars(value)
    return {value[index:index + size] for index in range(max(0, len(value) - size + 1))}


def validate_attribution(output_text, body):
    body_sentences = [part.strip() for part in re.split(r"[。！？；\n]+", body) if part.strip()]
    # One output line is one logical summary/key-point unit. Attribution at its start
    # covers later sentences in that same unit, but not a new semicolon-delimited claim.
    output_sentences = [part.strip() for part in re.split(r"[；;\n]+", output_text) if part.strip()]
    warnings = []
    for body_sentence in body_sentences:
        marker = ATTRIBUTION_RE.search(body_sentence)
        if not marker:
            continue
        claim = body_sentence[marker.end():].lstrip("，,:： ")
        claim_grams = ngrams(claim)
        if len(claim_grams) < 3:
            continue
        for output_sentence in output_sentences:
            if ATTRIBUTION_RE.search(output_sentence):
                continue
            output_grams = ngrams(output_sentence)
            overlap = len(claim_grams & output_grams)
            if overlap >= 3 and overlap / min(len(claim_grams), len(output_grams)) >= 0.35:
                warnings.append(f"疑似丢失观点归属或不确定性：{marker.group(0)}")
                break
    for claim in QUOTED_CLAIM_RE.findall(body):
        claim_grams = ngrams(claim)
        if len(claim_grams) < 5:
            continue
        for output_sentence in output_sentences:
            if ATTRIBUTION_RE.search(output_sentence):
                continue
            output_grams = ngrams(output_sentence)
            overlap = len(claim_grams & output_grams)
            if overlap >= 5 and overlap / min(len(claim_grams), len(output_grams)) >= 0.5:
                warnings.append("疑似复述直接引语但未保留说话者归属")
                break
    return not warnings, list(dict.fromkeys(warnings))


def validate_summary(result, body):
    output_text = "\n".join([result["summary"], *result["key_points"]])
    numbers_ok, number_warnings = validate_numbers(output_text, body)
    names_ok, name_warnings = validate_names(output_text, body)
    attribution_ok, attribution_warnings = validate_attribution(output_text, body)
    warnings = number_warnings + name_warnings + attribution_warnings
    return {
        "numbers_ok": numbers_ok,
        "names_ok": names_ok,
        "attribution_ok": attribution_ok,
        "warnings": warnings,
    }


def failure_record(item, article_chars, error, now):
    return {
        "title": item["title"], "source": item["source"],
        "published_at": item.get("published_at", ""), "url": item["url"],
        "summary": "", "key_points": [], "article_chars": article_chars,
        "validation": {
            "numbers_ok": False, "names_ok": False, "attribution_ok": False,
            "warnings": [error],
        },
        "needs_review": True, "processed_at": now.isoformat(timespec="seconds"),
        "status": "failed", "error": error,
    }


def load_json_list(path):
    if not path.exists():
        return []
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"预期 JSON 数组：{path}")
    return value


def run_summary(day, limit=None, data_dir=config.DATA_DIR, processed_dir=PROCESSED_DIR,
                article_client=None, ollama_client=None, now=None):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise ValueError("日期必须为 YYYY-MM-DD")
    input_path = Path(data_dir) / f"{day}.json"
    output_path = Path(processed_dir) / f"{day}.json"
    source_items = load_json_list(input_path)
    selected = select_items(source_items, limit)
    existing = load_json_list(output_path)
    records = {record["url"]: record for record in existing if isinstance(record, dict) and record.get("url")}
    article_client = article_client or ArticleClient()
    ollama_client = ollama_client or OllamaClient()
    now = (now or datetime.now(config.TIMEZONE)).astimezone(config.TIMEZONE)
    stats = {"selected": len(selected), "cached": 0, "succeeded": 0, "failed": 0,
             "needs_review": 0, "ai_seconds": 0.0}
    try:
        for index, item in enumerate(selected, 1):
            cached = records.get(item["url"])
            if cached and cached.get("status") == "ok" and cached.get("summary"):
                stats["cached"] += 1
                print(f"[{index}/{len(selected)}] cached {item['source']} {item['title']}")
                continue
            article_chars = 0
            try:
                body = article_client.extract(item)
                article_chars = len(body)
                result, metrics = ollama_client.summarize(item, body)
                validation = validate_summary(result, body)
                record = {
                    "title": item["title"], "source": item["source"],
                    "published_at": item.get("published_at", ""), "url": item["url"],
                    "summary": result["summary"], "key_points": result["key_points"],
                    "article_chars": article_chars, "validation": validation,
                    "needs_review": bool(validation["warnings"]),
                    "processed_at": now.isoformat(timespec="seconds"),
                    "status": "ok", "processing": metrics,
                }
                stats["succeeded"] += 1
                stats["ai_seconds"] += metrics["ai_seconds"]
                if record["needs_review"]:
                    stats["needs_review"] += 1
                records[item["url"]] = record
                print(f"[{index}/{len(selected)}] ok {item['source']} chars={article_chars} "
                      f"ai={metrics['ai_seconds']:.3f}s review={record['needs_review']}")
            except Exception as exc:
                article_chars = getattr(exc, "article_chars", article_chars)
                error = f"{type(exc).__name__}: {exc}"
                records[item["url"]] = failure_record(item, article_chars, error, now)
                stats["failed"] += 1
                print(f"[{index}/{len(selected)}] failed {item['source']} {item['title']}: {error}")
    finally:
        article_client.close()
        ollama_client.close()

    ordered_urls = [item["url"] for item in source_items if item["url"] in records]
    extras = [url for url in records if url not in set(ordered_urls)]
    write_json_atomic(output_path, [records[url] for url in ordered_urls + extras])
    stats["ai_seconds"] = round(stats["ai_seconds"], 3)
    stats["output_file"] = str(output_path.resolve())
    return stats


def main():
    parser = argparse.ArgumentParser(description="学有渔力 Summary V0.2 独立事实摘要")
    parser.add_argument("day", help="输入日期 YYYY-MM-DD")
    parser.add_argument("--limit", type=int, help="按来源轮询选择最多 N 条；省略则处理全部支持来源")
    args = parser.parse_args()
    try:
        stats = run_summary(args.day, args.limit)
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        return 1 if stats["failed"] else 0
    except Exception as exc:
        print(f"Summary V0.2 失败：{type(exc).__name__}: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
