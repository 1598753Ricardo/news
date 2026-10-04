"""Summary V0.4: deterministic context guard over extractive sentence IDs."""

from datetime import datetime
from difflib import SequenceMatcher
import argparse
import json
from pathlib import Path
import re

import config
from storage import write_json_atomic
from summary import ArticleClient, MODEL, load_json_list, select_items
from summary_extractive import ExtractiveOllamaClient, SentenceSelectionError, split_sentences


PROCESSED_CONTEXT_DIR = config.PROJECT_DIR / "processed_context_guard"
EXPLICIT_REFERENCE_RE = re.compile(
    r"该(?:影片|片|公司|企业|政策|项目|机构|活动|赛事|地区|负责人|单位|部门|"
    r"产品|计划|方案|措施|县|市|省|国|校|院|村|馆|团队|组织|集团|平台|品牌|作品)"
    r"|上述|前述|此举|对此"
)
GENERIC_REFERENCE_RE = re.compile(
    r"(^|[，,；;。！？])\s*(其中|其(?!中|他|实|余)|它们?|他们|她们|他|她|"
    r"这(?:一|项|次|种|个|些|份|部|条|场|座|家|名|位|套|批|起|本|枚|让|使|"
    r"意味着|表明|说明))"
)
ATTRIBUTION_RE = re.compile(
    r"认为|表示|指出|强调|提醒|要求|宣布|提到|预计|有望|倡议|称|说|据.+?消息|"
    r"记者了解到|声明"
)
WORK_RE = re.compile(r"《[^》\n]{1,60}》")
DATE_ONLY_RE = re.compile(
    r"^(?:当地时间)?\s*(?:\d{4}年)?\d{1,2}月(?:\d{1,2}日)?"
    r"(?:上午|下午|晚间|傍晚|凌晨)?[，,。；;：:\s]*$"
)
TRANSITION_ONLY_RE = re.compile(r"^(?:同日|随后|与此同时|对此|据悉|记者了解到)[，,。；;：:\s]*$")
CREDIT_RE = re.compile(r"^[（(](?:记者|摄影|编辑|责编|校对|参与采写|作者).{0,30}[）)]$")
FACT_CUE_RE = re.compile(
    r"是|为|有|达|超|增|降|占|称|说|表示|指出|认为|发布|举行|完成|实现|"
    r"位居|包括|启动|建成|通航|袭击|交付|销售|投入|获得|成为|记录|讲述"
)


def compact(value):
    return re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", value)


def ngrams(value, size=4):
    value = compact(value)
    if len(value) < size:
        return set()
    return {value[index:index + size] for index in range(len(value) - size + 1)}


def sentence_similarity(left, right):
    left_compact, right_compact = compact(left), compact(right)
    if min(len(left_compact), len(right_compact)) < 12:
        return 0.0
    matcher = SequenceMatcher(None, left_compact, right_compact)
    ratio = matcher.ratio()
    left_grams, right_grams = ngrams(left), ngrams(right)
    containment = len(left_grams & right_grams) / min(len(left_grams), len(right_grams))
    # News wires often repeat one event with a different lead-in/source. A long exact
    # shared event phrase plus high whole-sentence overlap is a conservative duplicate.
    if ratio >= 0.55 and matcher.find_longest_match().size >= 12:
        return max(0.72, ratio, containment)
    return max(ratio, containment)


def sentence_score(sentence):
    return (bool(ATTRIBUTION_RE.search(sentence)), len(compact(sentence)))


def deduplicate_ids(sentences, selected_ids):
    kept = []
    removed = []
    for sentence_id in selected_ids:
        duplicate_index = next((index for index, kept_id in enumerate(kept)
                                if sentence_similarity(sentences[kept_id - 1],
                                                       sentences[sentence_id - 1]) >= 0.72), None)
        if duplicate_index is None:
            kept.append(sentence_id)
            continue
        kept_id = kept[duplicate_index]
        if sentence_score(sentences[sentence_id - 1]) > sentence_score(sentences[kept_id - 1]):
            kept[duplicate_index] = sentence_id
            removed.append(kept_id)
        else:
            removed.append(sentence_id)
    if len(kept) < 2:
        for sentence_id in selected_ids:
            if sentence_id not in kept:
                kept.append(sentence_id)
            if len(kept) == 2:
                break
        removed = [sentence_id for sentence_id in removed if sentence_id not in kept]
    return sorted(kept), sorted(removed)


def is_obvious_fragment(sentence):
    stripped = sentence.strip()
    value = compact(stripped)
    if not value:
        return True
    if (DATE_ONLY_RE.fullmatch(stripped) or TRANSITION_ONLY_RE.fullmatch(stripped)
            or CREDIT_RE.fullmatch(stripped)):
        return True
    if (stripped[-1:] not in "。！？；" and len(value) <= 30
            and not FACT_CUE_RE.search(stripped)):
        return True
    return len(value) < 6 and stripped[-1:] not in "。！？"


def complete_fact_after_marker(sentence, marker_end):
    tail = sentence[marker_end:].lstrip("，,：: ")
    return len(compact(tail)) >= 12 and bool(
        re.search(r"\d|为|达|增长|下降|包括|位居|超过|发布|举行|实现|交付|销售|占", tail)
    )


def reference_kind(marker):
    if marker in {"该影片", "该片"}:
        return "film"
    if marker in {"该公司", "该企业"}:
        return "company"
    if marker == "该政策":
        return "policy"
    if marker in {"该项目", "该计划", "该方案"}:
        return "project"
    if marker in {"该机构", "该单位", "该部门"}:
        return "institution"
    if marker in {"该活动", "该赛事"}:
        return "activity"
    if marker == "该地区":
        return "region"
    if marker == "该负责人":
        return "person"
    return "general"


def provides_antecedent(sentence, marker):
    if is_obvious_fragment(sentence):
        return False
    kind = reference_kind(marker)
    checks = {
        "film": r"《[^》]+》|影片|电影",
        "company": r"公司|集团|银行|股份|企业",
        "policy": r"政策|办法|条例|意见|通知|规定",
        "project": r"项目|工程|计划|方案",
        "institution": r"机构|委员会|协会|中心|研究院|公司|集团|部|局",
        "activity": r"活动|赛事|比赛|展会|仪式|会议",
        "region": r"省|市|县|区|地区|当地",
        "person": r"负责人|董事长|总裁|主任|经理|发言人",
    }
    if kind == "general":
        return len(compact(sentence)) >= 8
    return bool(re.search(checks[kind], sentence))


def dangling_references(sentence):
    references = []
    for match in EXPLICIT_REFERENCE_RE.finditer(sentence):
        marker = match.group(0)
        if not provides_antecedent(sentence[:match.start()], marker):
            references.append(marker)
    for match in GENERIC_REFERENCE_RE.finditer(sentence):
        marker = match.group(2)
        if marker == "其中" and complete_fact_after_marker(sentence, match.end()):
            continue
        if not provides_antecedent(sentence[:match.start()], marker):
            references.append(marker)
    return list(dict.fromkeys(references))


def apply_context_guard(sentences, selected_ids):
    guarded_ids, removed_duplicates = deduplicate_ids(sentences, sorted(selected_ids))
    fragment_ids = [sentence_id for sentence_id in guarded_ids
                    if is_obvious_fragment(sentences[sentence_id - 1])]
    substantive_ids = [sentence_id for sentence_id in guarded_ids
                       if sentence_id not in fragment_ids]
    dropped_fragments = []
    warnings = []
    if len(substantive_ids) >= 2:
        guarded_ids = substantive_ids
        dropped_fragments = fragment_ids
    else:
        for sentence_id in fragment_ids:
            warnings.append(f"句子[{sentence_id}]是明显非独立片段，无法在保留至少2句时安全删除")

    added_ids = []
    checked = set()
    while True:
        added_this_round = False
        for sentence_id in list(sorted(guarded_ids)):
            sentence = sentences[sentence_id - 1]
            for marker in dangling_references(sentence):
                key = (sentence_id, marker)
                if key in checked:
                    continue
                previous_id = sentence_id - 1
                if (previous_id >= 1
                        and provides_antecedent(sentences[previous_id - 1], marker)):
                    if previous_id in guarded_ids:
                        checked.add(key)
                    elif len(guarded_ids) < 5:
                        guarded_ids.append(previous_id)
                        added_ids.append(previous_id)
                        checked.add(key)
                        added_this_round = True
                    else:
                        warnings.append(
                            f"句子[{sentence_id}]含悬空指代“{marker}”，补前句将超过5句"
                        )
                        checked.add(key)
                else:
                    warnings.append(
                        f"句子[{sentence_id}]含悬空指代“{marker}”，前一句无法可靠提供指代对象"
                    )
                    checked.add(key)
        if not added_this_round:
            break

    guarded_ids = sorted(set(guarded_ids))
    if not 2 <= len(guarded_ids) <= 5:
        raise SentenceSelectionError("上下文修复后句子数量必须为2—5句")
    validation = {
        "context_ok": not warnings,
        "warnings": list(dict.fromkeys(warnings)),
        "added_sentence_ids": sorted(set(added_ids)),
        "removed_duplicate_sentence_ids": sorted(set(removed_duplicates)),
        "dropped_fragment_sentence_ids": sorted(set(dropped_fragments)),
    }
    return guarded_ids, validation


def failure_record(item, article_chars, sentence_count, stage, error, now):
    return {
        "title": item["title"], "source": item["source"],
        "published_at": item.get("published_at", ""), "url": item["url"],
        "extractive_summary": [], "selected_sentence_ids": [],
        "article_chars": article_chars, "sentence_count": sentence_count,
        "model": MODEL, "think": False,
        "context_validation": {"context_ok": False, "warnings": [error]},
        "needs_review": True, "processed_at": now.isoformat(timespec="seconds"),
        "status": "failed", "failure_stage": stage, "error": error,
    }


def run_context_guard(day, limit=None, data_dir=config.DATA_DIR,
                      processed_dir=PROCESSED_CONTEXT_DIR,
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
        "extraction_failed": 0, "selection_failed": 0, "needs_review": 0,
        "context_repairs": 0, "duplicates_removed": 0, "fragments_dropped": 0,
        "ai_seconds": 0.0,
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
                    raise SentenceSelectionError("可靠正文不足2个完整句子")
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
                model_ids, metrics = ollama_client.select(item, sentences)
                selected_ids, validation = apply_context_guard(sentences, model_ids)
                extracted = [sentences[value - 1] for value in selected_ids]
                if any(sentence not in body for sentence in extracted):
                    raise SentenceSelectionError("程序复制结果无法逐字对应正文")
                needs_review = not validation["context_ok"]
                records[item["url"]] = {
                    "title": item["title"], "source": item["source"],
                    "published_at": item.get("published_at", ""), "url": item["url"],
                    "extractive_summary": extracted,
                    "selected_sentence_ids": selected_ids,
                    "model_selected_sentence_ids": model_ids,
                    "article_chars": article_chars, "sentence_count": sentence_count,
                    "model": MODEL, "think": False,
                    "context_validation": validation, "needs_review": needs_review,
                    "processed_at": now.isoformat(timespec="seconds"),
                    "status": "ok", "processing": metrics,
                }
                stats["succeeded"] += 1
                stats["ai_seconds"] += metrics["ai_seconds"]
                stats["context_repairs"] += len(validation["added_sentence_ids"])
                stats["duplicates_removed"] += len(validation["removed_duplicate_sentence_ids"])
                stats["fragments_dropped"] += len(validation["dropped_fragment_sentence_ids"])
                if needs_review:
                    stats["needs_review"] += 1
                print(f"[{index}/{len(selected_items)}] ok {item['source']} chars={article_chars} "
                      f"model_ids={model_ids} final_ids={selected_ids} "
                      f"review={needs_review} ai={metrics['ai_seconds']:.3f}s")
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
    parser = argparse.ArgumentParser(description="学有渔力 Summary V0.4 Context Guard 实验")
    parser.add_argument("day", help="输入日期 YYYY-MM-DD")
    parser.add_argument("--limit", type=int, help="按来源轮询选择最多 N 条")
    args = parser.parse_args()
    try:
        stats = run_context_guard(args.day, args.limit)
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        return 1 if stats["extraction_failed"] or stats["selection_failed"] else 0
    except Exception as exc:
        print(f"Summary V0.4 Context Guard 失败：{type(exc).__name__}: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
