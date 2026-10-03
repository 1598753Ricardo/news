"""The current first page of three official STCN columns (no load-more calls)."""
from bs4 import BeautifulSoup

import config
from .common import AccessRestricted, CollectionResult, article, latest_items, normalize_date

SOURCE = "证券时报"


def parse_page(html, now, category, url):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select("ul.infinite-list > li")[:config.MAX_ITEMS_PER_SECTION]:
        link = row.select_one(".content .tt a[href]")
        stamps = row.select(".content .info span")
        summary = row.select_one(".content .text")
        if link:
            items.append(article(link.get_text(), SOURCE, category, link["href"], now,
                                 normalize_date(stamps[-1].get_text() if stamps else "", now, relative=True),
                                 summary.get_text() if summary else "", base=url))
    return items


def collect(client, now):
    result = CollectionResult()
    for category, url in config.STCN_SECTIONS:
        try:
            items = parse_page(client.get(url).text, now, category, url)
            result.items.extend(latest_items(items, now))
        except Exception as exc:
            result.errors.append(f"{category}: {type(exc).__name__}: {exc}")
            if isinstance(exc, AccessRestricted):
                break
    if result.items:
        result.items = latest_items(result.items, now)
    return result
