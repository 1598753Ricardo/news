from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from email.utils import parsedate_to_datetime
import re
import time
from urllib.parse import urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup
import feedparser
import requests

import config


class SourceError(RuntimeError):
    """Unavailable, malformed or stale public source."""


class AccessRestricted(SourceError):
    """Stop this source; never solve challenges or switch routes to evade a block."""


@dataclass
class CollectionResult:
    items: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def plain_text(value):
    soup = BeautifulSoup(str(value or ""), "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return " ".join(soup.get_text(" ", strip=True).split())


def canonical_url(value, base=""):
    parts = urlsplit(urljoin(base, str(value).strip()))
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError(f"无效新闻 URL: {value!r}")
    if parts.username or parts.password:
        raise ValueError("新闻 URL 不应包含登录凭据")
    # Keep path, query and HTTP/HTTPS: they may identify different resources.
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", parts.query, ""))


def date_from_url(url):
    """Use only full calendar dates actually present in a publisher URL."""
    patterns = (
        r"/(20\d{2})-(\d{2})/(\d{2})/",  # old Xinhua
        r"/(20\d{2})(\d{2})(\d{2})/",    # new Xinhua
        r"/n\d/(20\d{2})/(\d{2})(\d{2})/",  # People's Daily
    )
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            try:
                return date(*map(int, match.groups())).isoformat()
            except ValueError:
                pass
    return ""


def normalize_date(value, now, relative=False):
    value = str(value or "").strip()
    if not value:
        return ""
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return date.fromisoformat(value).isoformat()
        if relative and re.fullmatch(r"\d{2}:\d{2}", value):
            value = f"{now.date().isoformat()} {value}"
        elif relative and re.fullmatch(r"\d{2}-\d{2} \d{2}:\d{2}", value):
            candidate = datetime.strptime(f"{now.year}-{value}", "%Y-%m-%d %H:%M")
            if candidate.date() > now.date():
                candidate = candidate.replace(year=now.year - 1)
            value = candidate.isoformat()
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=config.TIMEZONE)
        return parsed.astimezone(config.TIMEZONE).isoformat(timespec="seconds")
    except (ValueError, TypeError, OverflowError):
        return ""


def article(title, source, category, url, now, published_at="", summary="", base=""):
    return {
        "title": plain_text(title),
        "source": source,
        "category": category,
        "published_at": published_at,
        "url": canonical_url(url, base),
        "summary": plain_text(summary),
        "collected_at": now.isoformat(timespec="seconds"),
    }


def latest_items(items, now, limit=config.MAX_ITEMS_PER_SOURCE):
    result, seen = [], set()
    cutoff = now.date() - timedelta(days=config.MAX_NEWS_AGE_DAYS)
    for item in items:
        if not item["title"] or item["url"] in seen:
            continue
        if item["published_at"]:
            published = date.fromisoformat(item["published_at"][:10])
            if not cutoff <= published <= now.date():
                continue
        seen.add(item["url"])
        result.append(item)
    result.sort(key=lambda item: item["published_at"], reverse=True)
    if not result:
        raise SourceError("未解析到近期有效新闻（可能已停更、页面结构变化或全部超出日期范围）")
    return result[:limit]


def check_access(status_code, body, url):
    if status_code in {401, 403, 407, 429, 451}:
        raise AccessRestricted(f"HTTP {status_code}，停止访问此来源: {url}")
    lower = body.lower()
    markers = ("_wafchallengeid", "cf-chl-", "正在进行安全检测", "访问验证", "人机验证", "captcha-container")
    if any(marker in lower for marker in markers):
        raise AccessRestricted(f"返回安全检测/人机验证页面（HTTP {status_code}），未尝试绕过: {url}")


class HttpClient:
    """One sequential session, bounded responses, verified TLS, no automatic retries."""

    def __init__(self, logger):
        self.logger = logger
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.USER_AGENT})
        self.session.max_redirects = 3
        self.last_request = 0.0

    def close(self):
        self.session.close()

    def get(self, url):
        remaining = config.REQUEST_INTERVAL_SECONDS - (time.monotonic() - self.last_request)
        if remaining > 0:
            time.sleep(remaining)
        self.last_request = time.monotonic()
        self.logger.info("GET %s", url)
        with self.session.get(url, timeout=config.REQUEST_TIMEOUT, stream=True) as response:
            check_access(response.status_code, "", url)
            response.raise_for_status()
            chunks, size = [], 0
            for chunk in response.iter_content(chunk_size=65536):
                size += len(chunk)
                if size > config.MAX_RESPONSE_BYTES:
                    raise SourceError(f"响应超过 {config.MAX_RESPONSE_BYTES} 字节限制: {url}")
                chunks.append(chunk)
            response._content = b"".join(chunks)
            response._content_consumed = True
            # All verified sources declare UTF-8 in XML or HTML, sometimes not in HTTP.
            response.encoding = "utf-8"
            check_access(response.status_code, response.text, url)
            self.logger.info("HTTP %s bytes=%s url=%s", response.status_code, size, response.url)
            return response


def parse_rss(content, source, category, now, base):
    feed = feedparser.parse(content)
    if not feed.entries:
        raise SourceError("RSS 未包含新闻条目，可能不是有效 RSS")
    items = []
    for entry in feed.entries:
        url = entry.get("link", "")
        if not url or not entry.get("title"):
            continue
        published = normalize_date(entry.get("published") or entry.get("updated"), now)
        published = published or date_from_url(url)
        items.append(article(entry.title, source, category, url, now, published,
                             entry.get("summary", ""), base))
    dates = [item["published_at"][:10] for item in items if item["published_at"]]
    if not dates:
        raise SourceError("RSS 缺少可核实日期，不能确认内容是否最新")
    newest = max(dates)
    if date.fromisoformat(newest) < now.date() - timedelta(days=config.MAX_NEWS_AGE_DAYS):
        raise SourceError(f"RSS 已停更或过旧：最新条目日期 {newest}")
    return latest_items(items, now)


def rss_or_page(client, now, source, category, rss_url, page_url, parser):
    try:
        items = parse_rss(client.get(rss_url).content, source, category, now, rss_url)
        return CollectionResult(items)
    except AccessRestricted:
        raise
    except (SourceError, requests.RequestException, ValueError) as exc:
        warning = f"RSS 不可用：{exc}；使用公开栏目 {page_url}"
        client.logger.warning("[%s] %s", source, warning)
    items = parser(client.get(page_url).text, now)
    return CollectionResult(latest_items(items, now), warnings=[warning])
