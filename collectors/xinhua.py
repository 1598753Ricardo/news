"""Prefer the official RSS; its stale 2022 feed currently falls back to 时政联播."""
from bs4 import BeautifulSoup

import config
from .common import article, normalize_date, rss_or_page

SOURCE = "新华网"


def parse_page(html, now):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for row in soup.select("#content-list .item"):
        link, stamp = row.select_one(".tit a[href]"), row.select_one(".time")
        if link:
            items.append(article(link.get_text(), SOURCE, "国内·时政", link["href"], now,
                                 normalize_date(stamp.get_text() if stamp else "", now),
                                 base=config.XINHUA_PAGE_URL))
    return items


def collect(client, now):
    return rss_or_page(client, now, SOURCE, "国内·时政", config.XINHUA_RSS_URL,
                       config.XINHUA_PAGE_URL, parse_page)
