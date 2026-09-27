"""Markdown catalog of the gallery for AI assistants (llms.txt convention).

catalog_md(data, lang) -> full catalog: key creator tours, then every creator with all works.
llms_txt(data)         -> short index pointing to the full files.
"""
from collections import defaultdict

SITE = "https://inspire.reality.design"

IX = {
    "hand-body": ("Hands & Body", "手势与身体"), "face": ("Face", "面部"), "voice-sound": ("Voice & Sound", "声音"),
    "drawing-creation": ("Drawing & Making", "空间绘画与创作"), "spatial-mapping": ("Spatial Mapping", "空间理解"),
    "location-geo": ("Location & City", "地点与城市"), "tangible-object": ("Tangible Objects", "实体物件"),
    "projection": ("Projection", "投影增强"), "portal-world": ("Portals & Worlds", "传送门与世界替换"),
    "multiplayer-social": ("Shared & Social", "多人与社交"), "gaze-attention": ("Gaze & Attention", "注视"),
    "data-information": ("Information & UI", "信息与界面"), "game-play": ("Play", "游戏与玩法"),
    "performance-stage": ("Performance", "表演与舞台"), "perception-art": ("Perception & Effects", "感知与视觉艺术"),
}
PLAT = {"phone": ("Phone", "手机"), "headset": ("Headset", "头显"), "projection": ("Projection", "投影"),
        "web": ("Web", "网页"), "wearable": ("Wearable", "可穿戴"), "desktop": ("Desktop", "桌面")}

T = {
    "en": {
        "title": "Reality Design Inspire — AR catalog",
        "intro": ("A catalog of the most creative augmented-reality creators since 2005 and their AR works, compiled by "
                  "Reality Design Lab as idea material for teaching. Each work lists its video, core idea, key technique "
                  "and a classroom exercise."),
        "how": "How an AI assistant should use this file",
        "how_items": [
            "Ground AR ideas in specific works below and name the work and creator you are drawing on.",
            "Combine interaction patterns from different works to propose new ideas.",
            "Reuse and adapt the “Try it” exercises for lessons and workshops.",
            "Do not invent details that are not stated here; the video link is the reference.",
        ],
        "keys": "Key creators and guided tours", "all": "All creators and works",
        "learn": "What to learn", "why": "Why it matters", "video": "Video", "ix": "Interaction",
        "plat": "Platform & tech", "idea": "Idea", "what": "What it is", "tech": "Technique", "try": "Try it",
        "role": "Role", "works_n": "works",
    },
    "zh": {
        "title": "Reality Design Inspire — AR 作品目录",
        "intro": ("2005 年以来最有创意的增强现实创作者及其 AR 作品目录，由 Reality Design Lab 整理，作为教学的点子库。"
                  "每件作品都列出视频、核心点子、关键技术和一个课堂练习。"),
        "how": "AI 助手应如何使用这个文件",
        "how_items": [
            "提出 AR 点子时，以下面的具体作品为依据，并说明借鉴的是哪件作品、哪位创作者。",
            "把不同作品的交互模式组合起来，提出新的点子。",
            "在课程和工作坊中复用并改编其中的“课堂练习”。",
            "不要编造这里没有写到的细节，以视频链接为准。",
        ],
        "keys": "关键创作者与导览", "all": "全部创作者与作品",
        "learn": "向他学什么", "why": "策展说明", "video": "视频", "ix": "交互类型",
        "plat": "平台与技术", "idea": "创意点子", "what": "作品内容", "tech": "关键技术", "try": "课堂练习",
        "role": "身份", "works_n": "件作品",
    },
}


def _w(w: dict, lang: str) -> dict:
    zh = lang == "zh"
    return {
        "description": w.get("description_zh") if zh else w.get("description"),
        "idea": w.get("idea_zh") if zh else w.get("idea_en"),
        "technique": w.get("technique_zh") if zh else w.get("technique"),
        "exercise": w.get("exercise_zh") if zh else w.get("exercise_en"),
    }


def _work_block(w: dict, lang: str, names: dict, level: str = "####") -> str:
    t, s, i = _w(w, lang), T[lang], 1 if lang == "zh" else 0
    who = ", ".join(names.get(c, c) for c in w["creator_ids"])
    tech = ", ".join([PLAT.get(p, (p, p))[i] for p in w.get("platform", [])] + list(w.get("tech", [])))
    lines = [
        f"{level} {w['title']} — {who}" + (f" ({w['year']})" if w.get("year") else ""),
        f"- {s['video']}: {w['video']['url']}",
        f"- {s['ix']}: " + ", ".join(IX.get(x, (x, x))[i] for x in w.get("interaction", [])),
        f"- {s['plat']}: {tech}" if tech else "",
        f"- {s['idea']}: {t['idea']}" if t["idea"] else "",
        f"- {s['what']}: {t['description']}" if t["description"] else "",
        f"- {s['tech']}: {t['technique']}" if t["technique"] else "",
        f"- {s['try']}: {t['exercise']}" if t["exercise"] else "",
    ]
    return "\n".join(x for x in lines if x)


def catalog_md(data: dict, lang: str) -> str:
    s, zh = T[lang], lang == "zh"
    names = {c["id"]: c["name"] for c in data["creators"]}
    works_by = {w["id"]: w for w in data["works"]}
    counts = (f"{len(data['creators'])} 位创作者 · {len(data['works'])} 件作品" if zh
              else f"{len(data['creators'])} creators · {len(data['works'])} works")
    out = [f"# {s['title']}", "", s["intro"], "", f"{SITE} · {data['generated']} · {counts}", "", f"## {s['how']}", ""]
    out += [f"- {x}" for x in s["how_items"]] + ["", f"## {s['keys']}", ""]
    keys = data.get("keys", {})
    for g in keys.get("groups", []):
        out += [f"### {g['zh'] if zh else g['en']}", "", g.get("desc_zh" if zh else "desc_en", ""), ""]
        for k in [k for k in keys.get("creators", []) if k["group"] == g["id"]]:
            name = k.get("name") or names.get(k["creator_ids"][0], k["id"])
            out += [f"#### {name}", "", k["tagline_zh" if zh else "tagline_en"], "", k["intro_zh" if zh else "intro_en"], "",
                    f"**{s['learn']}:** {k['learn_zh' if zh else 'learn_en']}", ""]
            for n, h in enumerate(k["highlights"], 1):
                w = works_by.get(h["work"])
                if w:
                    out.append(f"{n}. **{w['title']}** ({w.get('year', '')}) — {h['note_zh' if zh else 'note_en']} {w['video']['url']}")
            out.append("")
    out += [f"## {s['all']}", ""]
    by_creator = defaultdict(list)
    for w in data["works"]:
        by_creator[w["creator_ids"][0]].append(w)
    for c in sorted(data["creators"], key=lambda c: (-c.get("work_count", 0), c["name"])):
        ws = sorted(by_creator.get(c["id"], []), key=lambda w: w.get("year") or 0)
        if not ws:
            continue
        role = c.get("role_zh") if zh else c.get("role")
        bio = c.get("bio_zh") if zh else c.get("bio")
        out += [f"### {c['name']}", ""]
        if role:
            out.append(f"*{role}*")
        if bio:
            out += ["", bio]
        out += ["", "\n\n".join(_work_block(w, lang, names) for w in ws), ""]
    return "\n".join(out).rstrip() + "\n"


def llms_txt(data: dict) -> str:
    return "\n".join([
        "# Reality Design Inspire",
        "",
        f"> {T['en']['intro']}",
        "",
        f"{len(data['creators'])} creators, {len(data['works'])} works, updated {data['generated']}. "
        "Bilingual (English / Simplified Chinese).",
        "",
        "## Full catalog",
        "",
        f"- [English catalog]({SITE}/inspire.md): key creator tours, then every creator with all works",
        f"- [Chinese catalog]({SITE}/inspire.zh.md): 中文版完整目录",
        f"- [Raw data (JSON)]({SITE}/data/entries.json)",
        "",
        "## Website",
        "",
        f"- [{SITE}]({SITE}): playable videos, guided tours, starring and SKILL.md export",
        "",
    ])
