"""Official RSS, with a fallback to the public home page's current headline blocks."""
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

import config
from .common import article, date_from_url, rss_or_page

SOURCE = "人民网"


def parse_page(html, now):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    # Avoid old, hidden headline banners, navigation, international and ad blocks.
    for link in soup.select("#rm_aq h2 a[href], #aq_two > li a[href], #rm_bq .list2 a[href]"):
        url = link["href"]
        host = urlsplit(url).hostname or ""
        if not (host.endswith(".people.com.cn") or host.endswith(".people.cn")):
            continue
        if host.startswith("world."):
            continue
        published = date_from_url(url)
        title = link.get_text(strip=True)
        # In aq_two, an article can be followed by a paired commentary shortcut.
        # Its label "评" is not a title; keep other short and full comment titles.
        if title == "评" and link.find_parent(id="aq_two") is not None:
            previous = link.find_previous_sibling("a", href=True)
            if previous is not None and date_from_url(previous["href"]):
                continue
        if published and title:
            items.append(article(title, SOURCE, "国内要闻", url, now, published))
    return items


def collect(client, now):
    return rss_or_page(client, now, SOURCE, "国内要闻", config.PEOPLE_RSS_URL,
                       config.PEOPLE_PAGE_URL, parse_page)
