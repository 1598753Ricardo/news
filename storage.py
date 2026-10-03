"""UTF-8 daily JSON, URL deduplication across days, and crash-safe replacement."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import tempfile

import config
from collectors.common import canonical_url


def validate_item(item):
    if not isinstance(item, dict) or set(item) != set(config.FIELDS):
        raise ValueError("新闻记录字段不符合统一结构")
    if any(not isinstance(item[key], str) for key in config.FIELDS):
        raise ValueError("新闻记录的所有字段必须是字符串")
    if any(not item[key].strip() for key in ("title", "source", "category", "url", "collected_at")):
        raise ValueError("新闻记录缺少标题、来源、分类、URL 或采集时间")
    canonical_url(item["url"])


def load_history(data_dir, today):
    """Fail closed on corrupt history: silently ignoring it could save duplicates."""
    seen, existing_today = set(), []
    for path in sorted(data_dir.glob("????-??-??.json")):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.json", path.name):
            continue
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(rows, list):
                raise ValueError("预期 JSON 数组")
            for row in rows:
                validate_item(row)
                url = canonical_url(row["url"])
                if url in seen:
                    raise ValueError(f"已有文件含重复 URL: {url}")
                seen.add(url)
            if path.name == f"{today}.json":
                existing_today = rows
        except (ValueError, OSError) as exc:
            raise ValueError(f"历史数据不可读取，保留原文件并停止写入: {path}: {exc}") from exc
    return seen, existing_today


def write_json_atomic(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                         suffix=".tmp", dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


@contextmanager
def run_lock(data_dir):
    """OS lock is released on exit/crash; the empty lock file may safely remain."""
    data_dir.mkdir(parents=True, exist_ok=True)
    with (data_dir / ".collector.lock").open("a+b") as handle:
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise RuntimeError("已有采集任务正在运行，本次未执行") from exc
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)
