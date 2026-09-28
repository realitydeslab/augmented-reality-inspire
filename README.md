# Reality Design Inspire

**https://augmented.reality.design**

Thirty years of augmented-reality ideas. A gallery of the most inventive AR creators, from the first pioneers to today, and their AR work: 1826 works by 399 creators, each with a playable video, its core idea, the key technique behind it and a classroom exercise. Built by [Reality Design Lab](https://reality.design) as idea material for teaching.

## What's inside

- **Salient**: simple works where the concept jumps out — one idea, minimal means, understood in seconds (`data/salient/`).
- **AI × AR**: AR where AI is central to the idea — models that see and explain the world, agents in space, generated worlds, reality restyled live — in 6 categories (`data/ai_categories.json`, `data/ai/`).
- **Related Art**: works that are not AR but inspire AR — land art, light, projection, fireworks, illusions, installations, stage and VR — in 10 categories (`data/related_categories.json`, `data/related/`).
- **Visual Effects**: real-time effects from the Unity VFX community (Keijiro Takahashi and others), grouped into 10 categories, most with open source code — building blocks that are easy to bring into AR (`data/vfx_categories.json`).
- **Key Creators**: 15 creators in four groups, each with a guided tour of 4–5 highlight works and a curator's note.
- **Works**: filter by 15 interaction types, platform and era; full-text search.
- **Creators**: every creator with bio, links, who led to them, and all their works.
- **Modules**: works grouped by interaction pattern, one module per teaching topic.
- **Starred**: star works in your browser, then export them as `SKILL.md` or `README.md` for your AI assistant.
- **English / 中文** switch and light / dark theme.

## For AI assistants

- [`llms.txt`](llms.txt): index
- [`inspire.md`](inspire.md): full catalog in English
- [`inspire.zh.md`](inspire.zh.md): full catalog in Chinese
- [`data/entries.json`](data/entries.json): raw data

## How it was made

Starting from two seed creators (Zach Lieberman and Ian Curtis), researchers followed collaborators, students and admirers from one creator to the next across X, Vimeo, YouTube, lab pages and festival archives. Every video is checked automatically before each build (`tools/check_video.py`).

## Maintain the database with AI

Three AI commands live in [`.claude/commands/`](.claude/commands/). Open this folder in [Claude Code](https://claude.com/claude-code) and type:

| Command | What it does |
|---|---|
| `/add-creator <name or URL>` | Researches the creator (site, Vimeo, YouTube, X, press), collects **all** their AR works with verified videos, writes English + Chinese text and a technique note + classroom exercise for each, validates, rebuilds the site and the Markdown catalogs, and publishes. If the creator already exists it only adds the missing works. Several creators can be given, comma-separated. Add `--no-push` to preview locally first. |
| `/salient [new \| all \| creator \| work]` | Quickly identifies **salient** works — simple works where the concept jumps out (criteria in [`data/SALIENT.md`](data/SALIENT.md)) — writes a one-line English + Chinese reason for each pick, rebuilds and publishes. By default it only looks at works not reviewed yet, so run it after `/add-creator`. |
| `/tidy [recheck] [leads]` | Audits the database: duplicate creators and works, dead videos, missing translations or teaching notes, stale leads. Resolves them through `data/overrides.json` (merge, drop, patch, ignore), rebuilds and publishes. `recheck` re-verifies every video; `leads` also reviews the open leads and proposes who to add next. |

Examples:

```text
/add-creator https://x.com/XRarchitect
/add-creator Jun Rekimoto, Myron Krueger
/add-creator https://www.pinterest.com/pin/1036531670494386477/
/salient new
/tidy recheck leads
```

Other AI coding tools can follow the same steps: give them the content of `.claude/commands/add-creator.md` or `tidy.md` as the instruction.

The scripts the commands rely on can also be run by hand:

| Script | Purpose |
|---|---|
| `python3 tools/check_video.py <url>…` | Check that a YouTube / Vimeo / X / mp4 video is live and embeddable |
| `python3 tools/validate.py data/raw/<file>.json` | Check a new batch file: required fields, both languages, vocabulary, duplicates |
| `python3 tools/build_data.py` | Merge everything, verify videos, write `data/entries.*`, `inspire.md`, `inspire.zh.md`, `llms.txt` |
| `python3 tools/audit.py [--recheck]` | Read-only report of duplicates and gaps |
| `python3 tools/salient.py stats\|candidates\|reviewed\|list` | Salient helper: counts, works still to review, mark reviewed, list picks |

## Run locally

```bash
./serve.sh   # rebuilds data/ and serves http://localhost:8931
```

YouTube embeds need `http://`; they do not play from `file://`.

## Data layout

| Path | Contents |
|---|---|
| `data/raw/*.json` | Research batches: creators, works, leads (schema: `data/SCHEMA.md`) |
| `data/teach/*.json` | Technique + classroom exercise per work |
| `data/i18n/out/*.json` | English / Chinese translations |
| `data/salient/*.json` | Salient picks with a one-line reason; `manual.json` adds or removes (`null`) by hand |
| `data/vfx_categories.json` | The 10 Visual Effects categories; a work joins the column with `vfx_cat`, and `code_url` links its source code |
| `data/related_categories.json`, `data/related/*.json` | The 10 Related Art categories; a work joins with `related_cat` in its batch or via a mapping file (`{ "work-id": "cat" }`, `null` removes) |
| `data/key_creators.json` | Key Creators, groups and guided tours |
| `data/overrides.json` | Manual curation: merge creators, hide or patch works, lead status, confirmed non-duplicates |
| `data/entries.json`, `data/entries.js` | Built dataset used by the site |
| `data/sources/pinterest.json` | Pinterest pins used as discovery leads, each marked traced / untraced / not_ar / duplicate (only traced pins become works, with `found_via`) |
| `data/leads.json` | People found but not yet researched |
| `data/leads_checked.json` | Leads already covered or checked (no video, not AR, duplicate) |

## Credits

All videos belong to their creators and are embedded from YouTube, Vimeo, X and the creators' own sites. To suggest a correction or an addition, please open an issue.

---

# Reality Design Inspire（中文）

**https://augmented.reality.design**

三十年的增强现实点子。这里收录了从早期先驱到今天最有创意的 AR 创作者和他们的 AR 作品：399 位创作者的 1826 件作品。每件作品都附有可播放的视频、核心点子、背后的关键技术和一个课堂练习。由 [Reality Design Lab](https://reality.design) 整理，作为教学的点子库。

## 内容

- **一眼即懂**：做法简单、但概念非常突出的作品——一个想法、极简的手段，几秒就能看懂（`data/salient/`）。
- **AI × AR**：AI 本身就是点子的 AR——看懂世界的模型、空间里的智能体、生成的世界、被实时重绘的现实——分为 6 类（`data/ai_categories.json`、`data/ai/`）。
- **相关艺术**：不是 AR、却能启发 AR 的作品——大地艺术、光、投影、烟火、错觉、装置、舞台和 VR——分为 10 类（`data/related_categories.json`、`data/related/`）。
- **视觉特效**：来自 Unity 视觉特效社区（Keijiro Takahashi 等人）的实时特效，分为 10 类，大多附有开源代码，是很容易搬进 AR 的积木（`data/vfx_categories.json`）。
- **关键创作者导览**：分成四组的 15 位创作者，每位都有 4–5 件代表作的导览和策展说明。
- **作品**：按 15 种交互类型、平台和年代筛选，支持全文搜索。
- **创作者**：每位创作者的简介、链接、发现路径，以及全部作品。
- **教学模块**：按交互模式分组，一个模块对应一个教学主题。
- **收藏**：在浏览器里收藏作品，导出成 `SKILL.md` 或 `README.md` 交给你的 AI 助手。
- 支持中英文切换和深浅色主题。

## 给 AI 读取

- [`llms.txt`](llms.txt)：索引
- [`inspire.zh.md`](inspire.zh.md)：中文完整目录
- [`inspire.md`](inspire.md)：英文完整目录

## 用 AI 维护数据库

仓库里有三个 AI 命令，放在 [`.claude/commands/`](.claude/commands/)。在这个文件夹里打开 [Claude Code](https://claude.com/claude-code)，输入：

| 命令 | 作用 |
|---|---|
| `/add-creator <名字或链接>` | 调研这位创作者（个人网站、Vimeo、YouTube、X、媒体报道），收集他的**全部** AR 作品并验证视频，为每件作品写好中英文介绍、关键技术和课堂练习，校验后重建网页和 Markdown 目录并发布上线。已收录的创作者只补缺失的作品。可以一次输入多位，用逗号分隔。加 `--no-push` 先在本地预览。 |
| `/salient [new \| all \| 创作者 \| 作品]` | 快速识别**一眼即懂**的作品：做法简单、但概念非常突出（标准见 [`data/SALIENT.md`](data/SALIENT.md)）。为每件入选作品写一句中英文理由，然后重建并发布。默认只看还没评估过的作品，适合在 `/add-creator` 之后运行。 |
| `/tidy [recheck] [leads]` | 整理和去重：检查重复的创作者和作品、失效视频、缺失的翻译或教学字段、过期的 lead，通过 `data/overrides.json` 合并、隐藏、修正或忽略，然后重建并发布。`recheck` 会重新检查所有视频；`leads` 会顺便审阅待查名单，推荐下一批要录入的人。 |

示例：

```text
/add-creator https://x.com/XRarchitect
/add-creator Jun Rekimoto, Myron Krueger
/salient new
/tidy recheck leads
```

其他 AI 编程工具也能用：把 `.claude/commands/add-creator.md` 或 `tidy.md` 的内容作为指令交给它即可。

## 本地运行

```bash
./serve.sh   # 重新构建数据并在 http://localhost:8931 提供服务
```

视频版权归原创作者所有。如需更正或补充，欢迎提交 issue。
