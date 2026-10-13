# 学有渔力 News · Web UI

简洁的本地新闻阅读界面，使用 Next.js App Router、TypeScript 和 Tailwind CSS。无需数据库或第三方 API。

## 运行

需要 Node.js 20.9 或更新版本。进入 `frontend` 后运行：

```powershell
npm install
npm run dev
```

访问 <http://localhost:3000>。发布前可运行 `npm run lint`、`npm run typecheck` 和 `npm run build`。

## 数据来源

页面在服务端读取项目根目录的 `data/YYYY-MM-DD.json`，并按 `url` 合并对应日期的 `processed_context_guard/YYYY-MM-DD.json`。优先展示北京时间当天的数据；当天文件不存在时展示最近一日的数据，并把“今日新闻”显示为 0。没有可读取的数据文件时，使用 `src/data/mock-news.json` 中的本地示例数据。

仅将 `status: "ok"`、`needs_review: false` 且有 `extractive_summary` 的记录标记为 AI 原文摘录。其他新闻显示来源摘要，或明确提示暂无摘要。原始数据与摘要文件只读，不修改 Python 采集或摘要流程。

## 页面

- `/`：今日情报、数据概览、搜索与来源筛选。新闻卡片可展开查看完整摘要和关键事实；手机端一次展开一张，桌面端可同时展开多张。
- `/history`：自动列出 `processed_context_guard` 中已有的日期，默认显示最新一期；选择日期后以 `/history?date=YYYY-MM-DD` 浏览对应简报。
- `/news/[id]`：新闻详情、摘要、关键事实和原文链接。历史简报的详情链接附带 `?date=YYYY-MM-DD`，保留选中日期的摘要内容。
- `/favorites`：当前浏览器收藏的新闻。点击卡片星标可收藏或取消收藏，点击标题可进入详情。

## 历史简报数据

服务端扫描 `processed_context_guard/YYYY-MM-DD.json` 的文件名获取可用日期，不需要手工维护日期列表。选中日期后读取对应摘要文件，并按 URL 合并同日的 `data/YYYY-MM-DD.json` 以补全分类等展示字段；原始文件缺失时，仍会从摘要文件构建可阅读的新闻列表。缺少摘要文件或日期无效时返回 404。文件在每次请求时读取，新生成的日期会自动出现。

JSON 接口：

- `GET /api/history/dates` 返回 `{ "dates": ["YYYY-MM-DD", ...] }`，按日期降序。
- `GET /api/history/YYYY-MM-DD` 返回 `{ "date": "YYYY-MM-DD", "items": [...] }`。`items` 使用与首页一致的新闻字段和摘要状态。

当前使用本地文件即可满足按日期浏览；只有在数据量明显增长、需要跨日期复杂查询或多用户写入时再考虑数据库。

收藏保存在浏览器 `localStorage` 的 `xueyouyuli-news:favorites:v1` 键下，以原文 `url` 作为唯一标识，同时保存用于展示的新闻信息。收藏状态会在刷新后保留，且只属于当前浏览器。新闻 ID 根据原文 URL 生成；详情页会查找现存的历史数据文件，以及缺少同日原始文件时的历史摘要文件。若对应文件均已删除，详情链接会返回 404。

测试收藏：在首页点击任意新闻卡片的空心星标，确认高亮；打开 `/favorites` 查看该新闻及摘要，点击标题查看详情。刷新页面后确认仍在收藏列表，再点击星标取消收藏。
