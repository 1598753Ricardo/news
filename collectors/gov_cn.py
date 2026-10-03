"""Policy list plus the public JSON directly referenced by the government news page."""
from bs4 import BeautifulSoup

import config
from .common import AccessRestricted, CollectionResult, SourceError, article, latest_items, normalize_date

SOURCE = "中国政府网"


def parse_policies(html, now):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select(".item03 .list li")[:config.MAX_ITEMS_PER_SECTION]:
        link, stamp = row.select_one("a[href]"), row.select_one("span")
        if link:
            items.append(article(link.get_text(), SOURCE, "政策", link["href"], now,
                                 normalize_date(stamp.get_text() if stamp else "", now),
                                 base=config.GOV_POLICY_URL))
    return items


def parse_news(payload, now):
    if not isinstance(payload, list):
        raise SourceError("政府网公开 JSON 结构变化：预期数组")
    # The website's first page contains 20 rows. Do not paginate or scan its archive.
    return [article(row["TITLE"], SOURCE, "要闻·国务院动态", row["URL"], now,
                    normalize_date(row.get("DOCRELPUBTIME"), now), base=config.GOV_NEWS_URL)
            for row in payload[:20] if row.get("TITLE") and row.get("URL")]


def collect(client, now):
    result = CollectionResult()
    for name, url, parser, json_response in (
        ("政策", config.GOV_POLICY_URL, parse_policies, False),
        ("要闻", config.GOV_NEWS_URL, parse_news, True),
    ):
        try:
            response = client.get(url)
            items = parser(response.json() if json_response else response.text, now)
            result.items.extend(latest_items(items, now))
        except Exception as exc:
            result.errors.append(f"{name}: {type(exc).__name__}: {exc}")
            if isinstance(exc, AccessRestricted):
                break
    if result.items:
        result.items = latest_items(result.items, now)
    return result
