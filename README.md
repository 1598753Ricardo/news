# 学有渔力 Collector V0

每天从指定公开来源采集最新新闻，进行 URL 去重，并在影子运行阶段生成本地抽取式事实摘要。没有数据库、网页或用户推送系统。

## 运行

需要 Python 3.10 或更新版本。本机已经在 `.venv` 配置好 Python 3.14 和依赖。

在此文件夹打开 PowerShell：

```powershell
# 让本次终端使用项目虚拟环境，避开 Windows 商店的 python 占位命令。
$env:Path = "$PWD\.venv\Scripts;$env:Path"
python main.py
```

也可以直接运行：

```powershell
.\.venv\Scripts\python.exe main.py
```

在其他机器首次安装：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

若未安装 Windows Python Launcher，可使用已安装 Python 的完整路径代替 `py -3`。

## 输出和去重规则

- `data/YYYY-MM-DD.json`：北京时间当天**新发现**的新闻数组，UTF-8、保留中文、两空格缩进。
- `logs/YYYY-MM-DD.log`：每次运行追加日志，包含北京时间、来源、请求地址、数量、错误原因及异常堆栈。
- `logs/last_run.json`：最近一次完成的运行汇总，逐源记录抓取、新增、重复、警告和失败。
- `logs/first_run_2026-10-03.json`：这次交付的首次联网运行记录。

按 URL 在本次运行、当天已有文件及其他日期文件之间去重。同一天重复运行会合并新增记录，保留当天已保存内容。昨天保存过的 URL 今天不会再次保存，因此当天没有新内容时文件可能为 `[]`；`fetched` 和 `new` 分别表示抓取数与实际新增数。

URL 只统一协议/主机大小写并移除 `#fragment`，保留路径、查询参数和 HTTP/HTTPS 差别。不进行标题相似度去重。同一新闻被不同站点转载、有不同 URL 时会保留。

文件先完整写入同目录临时文件，再原子替换。运行期间使用系统文件锁，避免计划任务与手动运行同时修改数据；进程退出后自动释放锁。发现历史 JSON 损坏会记录错误并停止写入，避免覆盖原文件或破坏跨日去重。

固定字段：

```json
{
  "title": "来源提供的新闻标题",
  "source": "中国政府网",
  "category": "政策",
  "published_at": "2026-09-30",
  "url": "https://www.gov.cn/zhengce/content/202609/content_7082492.htm",
  "summary": "",
  "collected_at": "2026-10-03T20:34:40+08:00"
}
```

`source` 表示采集网站，`url` 保留可追溯的原始新闻链接；转载新闻的原作者不额外推断。`category` 是源栏目映射，不使用 AI 分类。`summary` 仅取 RSS description 或栏目自身提供的摘要，清除 HTML 标签；没有摘要则留空。不会请求全文来生成摘要。

日期精度忠于来源：只有日期时保留 `YYYY-MM-DD`，有时间时保存带 `+08:00` 的 ISO 时间。人民网首页没有单独日期字段，从新闻 URL 明确包含的年月日读取；证券时报的 `HH:mm` 按采集当天解释，`MM-DD HH:mm` 补足当年（跨年时回退一年）。不虚构缺失的时分秒，无法确定的日期留空。`collected_at` 使用本次运行开始时间，表示采集批次。

## 五个来源的实际接入

验证日期：2026-10-03。详细入口与结构证据见 [SOURCES.md](SOURCES.md)。

| 来源 | 当前采集方式 | 验证结论 |
| --- | --- | --- |
| 中国政府网 | 政策 HTML 列表 + 要闻栏目直接加载的公开 JSON | 可用；要闻覆盖政府网重要动态，不限于国务院单一机构 |
| 新华网 | 先检查官方 RSS，停更时使用时政联播第一页 | 旧 RSS 最新日期 2022-12-14；栏目可用 |
| 人民网 | 先检查官方 RSS，停更时使用首页国内要闻区块 | RSS 最新日期 2025-06-05；首页可用 |
| 证券时报 | 财经要闻、产经、公司新闻三个公开栏目第一页 | 可用，摘要来自栏目卡片 |
| 36氪 | 官方 RSS `https://36kr.com/feed` | 返回 HTTP 200 安全检测页，记录来源失败 |

RSS 是每次运行优先检查的来源。如果恢复更新会自动使用；旧 RSS 不会被误算成新新闻。RSS 停更、格式问题或普通连接错误时可以切换已核实的公开栏目。如果响应明确要求验证，或返回 401/403/407/429/451，则停止该来源，不切换路径尝试绕过限制。

没有登录、Cookie 复制、验证码处理、浏览器自动验证、代理轮换或关闭 TLS 验证。36氪目前没有新闻进入数据文件；可等待官方 RSS 恢复，或向网站取得明确允许自动访问的 RSS/API 后再替换入口。也可由项目方另行指定可公开访问的科技新闻来源。当前未擅自替换第五个来源。

## 抓取范围

配置集中在 `config.py`：

- 所有请求串行，每次请求启动间隔至少 2 秒；不自动重试。
- 连接超时 10 秒、读取超时 25 秒，单响应不超过 5 MiB。
- 每来源最多 30 条；证券时报每栏目最多 10 条。
- 政府网政策取栏目当前列表，要闻公开 JSON 仅处理网页第一页对应的前 20 条。
- 不翻页，不遍历历史目录，不下载图片和新闻全文。
- 排除发布日期超过 30 天或晚于采集日的内容；政策更新较慢，仍只使用当前列表。

一次完整运行目前请求约 10 个公开资源。每日运行会漏掉在两次采集之间已滚出第一页的新闻，V0 不保证全天新闻全量覆盖。

## 每天 12:00 自动运行

当前机器使用 Windows 任务计划程序，任务名为 `XueYouYuLi-Collector-V0`。每天北京时间 12:00，普通用户权限运行本项目 `.venv\Scripts\pythonw.exe daily_pipeline.py`，不弹出控制台。流程按顺序执行 Collector V0 和 Summary V0.4；可在任务计划程序中查看、禁用或删除。

注册或修改时间：

```powershell
.\schedule_daily.ps1 -Time '12:00'
```

该脚本要求系统时区为 `China Standard Time`，不会修改系统时区。不覆盖与此项目无关的同名任务，不保存账户密码，不要求管理员运行 Python。当前采用“用户已登录时运行”；电脑需要开机、联网、该用户保持登录（锁屏可以）。设置了错过时间后尽快运行，不会在关机期间采集，不会主动唤醒电脑。

检查任务：

```powershell
Get-ScheduledTask -TaskName 'XueYouYuLi-Collector-V0'
Get-ScheduledTaskInfo -TaskName 'XueYouYuLi-Collector-V0'
```

退出码：`0` 全部来源成功，`1` 部分来源/栏目失败但已保存其他结果，`2` 全部来源失败或运行/存储错误。36氪受限期间，任务结果 `1` 是预期的部分成功状态；详情看 `logs/last_run.json`，不应误读为所有新闻未保存。

## 测试与扩展

```powershell
.\.venv\Scripts\python.exe -m unittest discover -v
```

测试包含真实公开页面的最小片段解析、旧 RSS 识别、访问限制停止、跨日/同日去重、单源失败隔离、原子写入保护、损坏历史数据保护和运行锁，不联网。

新增来源时增加独立 `collectors/xxx.py`，实现 `SOURCE` 与 `collect(client, now)`，返回 `CollectionResult`，再加入 `main.py` 的 `COLLECTORS`。公共请求、字段规范、存储与调度相互独立；以后需要分析或数据库时可以在采集结果之后接入，本版没有预先实现这些功能。

`tools/inspect_sources.py` 仅用于人工开发检查，不参与定时运行；`research/` 保存本次结构核实的原始响应，已加入 `.gitignore`。请勿频繁重复运行检查脚本。

## Summary V0.2 独立事实摘要

Summary V0.2 只读取已有的 `data/YYYY-MM-DD.json`，访问原文并串行调用本机
Ollama `qwen3:4b`（`think: false`），结果写入 `processed/YYYY-MM-DD.json`。
它不由每日采集任务调用，也不会覆盖原始 data 文件。

先按来源轮询选 15 条进行验证：

```powershell
.\.venv\Scripts\python.exe summary.py 2026-10-04 --limit 15
```

省略 `--limit` 才会处理当天全部受支持来源。成功 URL 会直接使用 processed
缓存；失败记录允许下次重试。正文无法可靠提取时不会仅凭标题生成摘要。

## Summary V0.3 Extractive 实验

V0.3 与 V0.2 并存。它把正文切分成带编号的句子，只让 `qwen3:4b`
（`think: false`、`temperature: 0`）返回 2—4 个句子编号，再由程序从原文逐字复制；
结果单独写入 `processed_extractive/YYYY-MM-DD.json`，不接入每日采集任务。

```powershell
.\.venv\Scripts\python.exe summary_extractive.py 2026-10-04 --limit 20
```

## Summary V0.4 Context Guard 实验

V0.4 保持 V0.3 的纯编号选句和原文复制架构，在程序端增加悬空指代补前句、
明显残片过滤和保守去重。结果独立写入 `processed_context_guard/YYYY-MM-DD.json`；
无法可靠补全时只标记 `needs_review`，不改写正文。当前每日任务在 Collector 完成后调用该版本。

```powershell
.\.venv\Scripts\python.exe summary_context_guard.py 2026-10-04 --limit 30
```

## 每日影子流程

`daily_pipeline.py` 使用北京时间当天日期，先运行现有 Collector，再对当天全部受支持新闻运行
Summary V0.4。Collector 返回 `1` 时仍继续摘要；返回 `2`、当天数据文件缺失或发生严重
存储错误时停止摘要。Ollama 或模型不可用只会令摘要阶段失败，不删除原始数据或已有成功摘要。

```powershell
.\.venv\Scripts\python.exe daily_pipeline.py
```

运行汇总写入 `logs/last_pipeline_run.json`，`pipeline_status` 区分 `success`、
`partial_source_failure`、`summary_failure` 和 `fatal_failure`。当前为三天影子运行阶段，
不包含网页、推送、评级或趋势分析。计划任务允许单次运行最多 30 分钟。
