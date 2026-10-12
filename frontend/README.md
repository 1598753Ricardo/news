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

- `/`：每日 AI 新闻简报、今日统计、搜索与来源筛选。新闻卡片可在列表内展开，查看完整摘要、精选关键事实、发布时间和原文链接；手机端一次展开一张，桌面端可同时展开多张。
- `/news/[id]`：新闻详情、AI 摘要、关键内容和原文链接。
- `/favorites`：当前浏览器收藏的新闻。点击卡片星标可收藏或取消收藏，点击标题可进入详情。

收藏保存在浏览器 `localStorage` 的 `xueyouyuli-news:favorites:v1` 键下，以原文 `url` 作为唯一标识，同时保存用于展示的新闻信息。收藏状态会在刷新后保留，且只属于当前浏览器。新闻 ID 根据原文 URL 生成；详情页会查找现存的历史 `data/YYYY-MM-DD.json` 文件，因此跨日期的收藏仍可打开详情。若对应原始文件已删除，详情链接会返回 404。

测试收藏：在首页点击任意新闻卡片的空心星标，确认高亮；打开 `/favorites` 查看该新闻及摘要，点击标题查看详情。刷新页面后确认仍在收藏列表，再点击星标取消收藏。
