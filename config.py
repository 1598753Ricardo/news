"""Collector V0 configuration. All paths are relative to this project, not the shell."""
from datetime import timedelta, timezone
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
DATA_DIR = PROJECT_DIR / "data"
LOG_DIR = PROJECT_DIR / "logs"
TIMEZONE = timezone(timedelta(hours=8), name="Asia/Shanghai")
USER_AGENT = "XueYouYuLiCollector/0.1 (public news; once daily)"
REQUEST_TIMEOUT = (10, 25)
REQUEST_INTERVAL_SECONDS = 2.0
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_ITEMS_PER_SOURCE = 30
MAX_ITEMS_PER_SECTION = 10
MAX_NEWS_AGE_DAYS = 30
FIELDS = ("title", "source", "category", "published_at", "url", "summary", "collected_at")

# Verified against the publishers' own pages on 2026-10-03.
GOV_POLICY_URL = "https://www.gov.cn/zhengce/index.htm"
GOV_NEWS_URL = "https://www.gov.cn/yaowen/liebiao/YAOWENLIEBIAO.json"
XINHUA_RSS_URL = "https://www.xinhuanet.com/politics/news_politics.xml"
XINHUA_PAGE_URL = "https://www.news.cn/politics/szlb/index.html"
PEOPLE_RSS_URL = "https://www.people.com.cn/rss/politics.xml"
PEOPLE_PAGE_URL = "https://www.people.com.cn/"
STCN_SECTIONS = (
    ("财经", "https://www.stcn.com/article/list/yw.html"),
    ("产业", "https://www.stcn.com/article/list/cj.html"),
    ("公司", "https://www.stcn.com/article/list/gsxw.html"),
)
KR36_RSS_URL = "https://36kr.com/feed"
