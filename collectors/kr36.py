"""36Kr's own RSS. A verification page is a failure, never a reason to bypass it."""
import config
from .common import CollectionResult, parse_rss

SOURCE = "36氪"


def collect(client, now):
    response = client.get(config.KR36_RSS_URL)
    return CollectionResult(parse_rss(response.content, SOURCE, "科技·AI·新经济", now,
                                      config.KR36_RSS_URL))
