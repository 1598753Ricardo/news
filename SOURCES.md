# 公开来源核实记录

于 2026-10-03 在当前机器低频请求官方页面，检查真实返回内容后确定以下入口。没有使用搜索引擎缓存作为采集数据。

## 中国政府网

- [政策栏目](https://www.gov.cn/zhengce/index.htm)：HTTP 200，`.item03 .list li` 提供标题、链接和 `span` 日期。当前列表 8 条。
- [要闻栏目](https://www.gov.cn/yaowen/liebiao/)：HTML 内 `$.ajax` 明确读取 `./YAOWENLIEBIAO.json`，`sPageSize = 20`。
- [栏目公开 JSON](https://www.gov.cn/yaowen/liebiao/YAOWENLIEBIAO.json)：HTTP 200，数组字段 `TITLE`、`URL`、`DOCRELPUBTIME`。仅处理前 20 条，`SUB_TITLE` 不被当作摘要。
- 没有找到适用且已验证的最新公开 RSS。未使用搜索后台接口或猜测的 API。

## 新华网

- [官方链接/RSS 说明](https://www.xinhuanet.com/linktous.htm) 列出时政 RSS；实际 HTTPS 地址为 [news_politics.xml](https://www.xinhuanet.com/politics/news_politics.xml)。
- RSS HTTP 200，有 300 条，但条目缺少 pubDate；URL 日期显示最新仍为 **2022-12-14**。不把这批旧闻保存为新内容。
- 当前[时政首页](https://www.news.cn/politics/)明确链接[时政联播](https://www.news.cn/politics/szlb/index.html)，后者 HTTP 200，`#content-list .item` 内 `.tit a` 和 `.time` 提供标题、链接、日期，首页当前 15 条。

## 人民网

- [官方 RSS 说明](https://politics.people.com.cn/ywkx/GB/368825/index.html) 列出 `www.people.com.cn/rss/politics.xml`。
- [HTTPS RSS](https://www.people.com.cn/rss/politics.xml) HTTP 200，100 条，最新 **2025-06-05**，不满足最新新闻要求。
- 时政子域 HTTPS 出现证书域名不匹配；其 HTTP 地址返回 403。未关闭证书验证，也未继续访问受限子域。
- [官方首页](https://www.people.com.cn/)可公开获取，HTTP 200。只解析当前国内要闻区块 `#rm_aq h2`、`#aq_two`、`#rm_bq .list2`，排除国际频道和不带新闻日期的栏目/专题链接。
- 日期来自链接明确的 `/n1/YYYY/MMDD/` 或 `/n2/YYYY/MMDD/`；不跟进访问文章详情。

## 证券时报

- [当前首页](https://www.stcn.com/)明确链接[财经要闻](https://www.stcn.com/article/list/yw.html)、[产经](https://www.stcn.com/article/list/cj.html)、[公司新闻](https://www.stcn.com/article/list/gsxw.html)。三者均 HTTP 200。
- 实际结构为 `ul.infinite-list > li`；标题 `.content .tt a`，摘要 `.content .text`，日期 `.content .info span` 的最后一个。
- 同一天文章显示 `HH:mm`，以前日期显示 `MM-DD HH:mm`。仅从这些列出的公开页面取前 10 条，不请求“加载更多”。
- 搜索结果仍能找到内容停在 2022 年的旧 `news.stcn.com`，本项目未采用该入口。未发现适用且经验证的官方 RSS。

## 36氪

- [官方 RSS 中心](https://www.36kr.com/rss-center)明确发布综合 RSS `https://36kr.com/feed`，并列出其他专题订阅入口。
- 对综合 RSS 的普通 GET 返回 HTTP 200，内容却是 HTML“正在进行安全检测”页面，含 `_wafchallengeid` 验证脚本；不是 RSS。
- 不运行该脚本、不构造验证 Cookie、不轮换请求身份、不因被限制改探其他接口。collector 记录 `AccessRestricted` 并由主程序继续其他来源。
- 替代方案：等待官方恢复可直接访问的 RSS，或取得明确授权的公开 API/RSS；如需临时更换媒体，由项目方指定新的公开科技新闻来源。本次未加入第三方 RSS 代理或其他新闻源。

以上页面结构可能随网站更新改变。若再次运行出现零条、RSS 过期或 HTTP/验证错误，程序会写入日志；届时应重新检查官方页面，不能把空结果当成功。
