#!/usr/bin/env python3
"""Merge data/raw/*.json into the gallery dataset.

- Merges creators by id (unions links / connections).
- Dedupes works by video (platform + id), unioning creator_ids.
- Verifies every video (cached in data/video_cache.json) and drops dead ones.
- Writes data/entries.json, data/entries.js (window.INSPIRE) and data/leads.json.

Usage: python3 tools/build_data.py [--recheck]
"""
import json
import logging
import re
import time
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_video import UA, check, parse  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
TEACH = ROOT / "data" / "teach"
OVERRIDES = ROOT / "data" / "overrides.json"
KEYS = ROOT / "data" / "key_creators.json"
I18N = ROOT / "data" / "i18n" / "out"
SALIENT = ROOT / "data" / "salient"
SALIENT_CATS = ROOT / "data" / "salient_categories.json"
CACHE = ROOT / "data" / "video_cache.json"

INTERACTIONS = {
    "hand-body", "face", "voice-sound", "drawing-creation", "spatial-mapping", "location-geo",
    "tangible-object", "projection", "portal-world", "multiplayer-social", "gaze-attention",
    "data-information", "game-play", "performance-stage", "perception-art",
}
PLATFORMS = {"phone", "headset", "projection", "web", "wearable", "desktop"}


def _check_mp4(url: str) -> dict:
    try:
        req = urllib.request.Request(url, headers={**UA, "Range": "bytes=0-1"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return {"url": url, "ok": r.status in (200, 206), "platform": "mp4", "id": url}
    except Exception as e:  # noqa: BLE001 - any failure means the file is not playable
        return {"url": url, "ok": False, "platform": "mp4", "id": url, "error": str(e)}


def _video_key(v: dict) -> str:
    return f"{v.get('platform')}:{v.get('id')}"


def _normalize_video(v: dict) -> dict:
    v = dict(v or {})
    if v.get("platform") == "mp4":
        v["id"] = v.get("id") or v.get("url")
        return v
    plat, vid = parse(v.get("url", "")) if v.get("url") else ("", "")
    if plat:
        v["platform"], v["id"] = plat, vid
    if not v.get("url") and v.get("platform") and v.get("id"):
        v["url"] = {
            "youtube": f"https://www.youtube.com/watch?v={v['id']}",
            "vimeo": f"https://vimeo.com/{v['id']}",
            "x": f"https://x.com/i/status/{v['id']}",
        }.get(v["platform"], "")
    return v


def load_raw() -> tuple[dict, dict, list]:
    creators: dict[str, dict] = {}
    works: dict[str, dict] = {}
    leads: list[dict] = []
    for f in sorted(RAW.glob("*.json")):
        try:
            d = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            logger.error("SKIP %s: invalid JSON (%s)", f.name, e)
            continue
        batch = d.get("batch", f.stem)
        for c in d.get("creators", []):
            cid = c.get("id")
            if not cid:
                continue
            cur = creators.setdefault(cid, {"id": cid, "links": {}, "connected_to": [], "batches": []})
            for k, val in c.items():
                if k == "links":
                    cur["links"].update({lk: lv for lk, lv in (val or {}).items() if lv})
                elif k == "connected_to":
                    cur["connected_to"] = sorted(set(cur["connected_to"]) | set(val or []))
                elif val and not cur.get(k):
                    cur[k] = val
            cur["batches"] = sorted(set(cur["batches"]) | {batch})
        for w in d.get("works", []):
            v = _normalize_video(w.get("video"))
            if not v.get("platform") or not v.get("id"):
                logger.warning("no video: %s", w.get("id"))
                continue
            w = {**w, "video": v, "batch": batch}
            key = _video_key(v)
            if key in works:
                cur = works[key]
                cur["creator_ids"] = list(dict.fromkeys(cur["creator_ids"] + w.get("creator_ids", [])))
                for k, val in w.items():
                    if val and not cur.get(k):
                        cur[k] = val
            else:
                w["creator_ids"] = list(dict.fromkeys(w.get("creator_ids", [])))
                works[key] = w
        for lead in d.get("leads", []):
            leads.append({**lead, "batch": batch})
    return creators, works, leads


def load_teach() -> dict:
    """work_id -> {technique, exercise_zh} from data/teach/*.json."""
    out: dict[str, dict] = {}
    for f in sorted(TEACH.glob("*.json")):
        try:
            out.update(json.loads(f.read_text()))
        except json.JSONDecodeError as e:
            logger.error("SKIP %s: invalid JSON (%s)", f.name, e)
    return out


def _name_tokens(name: str) -> set[str]:
    """Distinctive name parts: 'Zach Lieberman & Molmol Kuo — Weird Cuts' -> {'zachlieberman', 'molmolkuo', ...}."""
    parts = re.split(r"[—–\-/(),&@|]| and ", name or "")
    return {t for t in (re.sub(r"[^a-z0-9]", "", p.lower()) for p in parts) if len(t) >= 5}


def merge_creators(creators: dict, works: dict, mapping: dict) -> None:
    """Apply overrides.merge_creators {duplicate_id: canonical_id} in place."""
    for src, dst in mapping.items():
        if src not in creators or dst not in creators or src == dst:
            logger.warning("merge_creators: skip %s -> %s (unknown id)", src, dst)
            continue
        a, b = creators.pop(src), creators[dst]
        for k, v in a.items():
            if k == "links":
                b["links"] = {**v, **b.get("links", {})}
            elif k == "connected_to":
                b["connected_to"] = sorted(set(b.get("connected_to", [])) | set(v))
            elif v and not b.get(k):
                b[k] = v
        for w in works.values():
            w["creator_ids"] = list(dict.fromkeys(dst if c == src else c for c in w["creator_ids"]))
        for c in creators.values():
            c["connected_to"] = [dst if x == src else x for x in c.get("connected_to", [])]
            if c.get("discovered_via") == src:
                c["discovered_via"] = dst


def classify_leads(leads: list, creators: dict, manual: dict) -> tuple[list, list]:
    """Split leads into open (to research) and checked (covered / no_video / not_ar / duplicate)."""
    tokens = set()
    for c in creators.values():
        tokens |= _name_tokens(c.get("name", "")) | {c["id"].replace("-", "")}
    open_, checked, seen = [], [], set()
    for lead in leads:
        name = (lead.get("name") or "").strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        status = manual.get(key) or lead.get("status") or "open"
        lt = _name_tokens(name)
        if status == "open" and (lt & tokens or any(len(a) >= 6 and (a in b or b in a) for a in lt for b in tokens)):
            status = "covered"
        (open_ if status == "open" else checked).append({**lead, "status": status})
    # a person checked in one batch stays checked even if another batch lists them as open
    done = {x["name"].lower() for x in checked}
    return [x for x in open_ if x["name"].lower() not in done], checked


def load_i18n() -> tuple[dict, dict]:
    """Translations: works-*.json -> work fields, creators.json -> creator fields."""
    works: dict[str, dict] = {}
    creators: dict[str, dict] = {}
    for f in sorted(I18N.glob("*.json")):
        d = json.loads(f.read_text())
        (creators if f.stem == "creators" else works).update(d)
    return works, creators


def load_salient() -> dict:
    """work_id -> {why_en, why_zh}. manual.json is applied last; a null value removes a work."""
    out: dict = {}
    files = sorted(f for f in SALIENT.glob("*.json") if f.name not in ("manual.json", "reviewed.json"))
    if (SALIENT / "manual.json").exists():
        files.append(SALIENT / "manual.json")
    for f in files:
        for k, v in json.loads(f.read_text()).items():
            if k.startswith("_"):
                continue
            if v is None:
                out.pop(k, None)
            else:
                out[k] = v
    return out


def load_keys(work_ids: set, creator_ids: set) -> dict:
    """Curated Key Creators + tour highlights; drops highlights whose work is missing."""
    if not KEYS.exists():
        return {}
    keys = json.loads(KEYS.read_text())
    for k in keys.get("creators", []):
        bad = [c for c in k["creator_ids"] if c not in creator_ids]
        if bad:
            logger.warning("key %s: unknown creator ids %s", k["id"], bad)
        missing = [h["work"] for h in k["highlights"] if h["work"] not in work_ids]
        if missing:
            logger.warning("key %s: dropping missing highlights %s", k["id"], missing)
        k["highlights"] = [h for h in k["highlights"] if h["work"] in work_ids]
    return keys


def verify(works: dict, recheck: bool) -> dict:
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = [w["video"] for k, w in works.items() if recheck or not cache.get(k, {}).get("ok")]
    logger.info("verifying %d videos (%d cached)", len(todo), len(works) - len(todo))

    def run(v: dict) -> tuple[str, dict]:
        res = _check_mp4(v["url"]) if v["platform"] == "mp4" else check(v["url"])
        return _video_key(v), res

    with ThreadPoolExecutor(max_workers=12) as ex:
        for i, (k, res) in enumerate(ex.map(run, todo), 1):
            cache[k] = res
            if i % 25 == 0:
                logger.info("  checked %d/%d", i, len(todo))
    CACHE.write_text(json.dumps(cache, indent=1, ensure_ascii=False))
    return cache


def write_markdown(data: dict) -> None:
    """Plain-Markdown catalog for AI assistants: llms.txt, inspire.md (EN), inspire.zh.md (ZH)."""
    sys.path.insert(0, str(Path(__file__).parent))
    from markdown_export import catalog_md, llms_txt  # noqa: E402
    (ROOT / "inspire.md").write_text(catalog_md(data, "en"))
    (ROOT / "inspire.zh.md").write_text(catalog_md(data, "zh"))
    (ROOT / "llms.txt").write_text(llms_txt(data))


def main() -> None:
    recheck = "--recheck" in sys.argv
    creators, works, leads = load_raw()
    ov = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    merge_creators(creators, works, ov.get("merge_creators", {}))
    cache = verify(works, recheck)

    teach = load_teach()
    drop_ids = set(ov.get("drop_works", []))
    patches = ov.get("patch_works", {})
    seen_ids: set[str] = set()
    kept, dropped = [], []
    for key, w in works.items():
        res = cache.get(key, {})
        if not res.get("ok"):
            dropped.append({"id": w.get("id"), "url": w["video"].get("url"), "error": res.get("error")})
            continue
        if w.get("id") in drop_ids or w.get("id") in seen_ids:
            continue
        seen_ids.add(w.get("id"))
        w.update(patches.get(w.get("id"), {}))
        v = w["video"]
        v["thumbnail"] = v.get("thumbnail") or res.get("thumbnail") or ""
        v["video_title"] = res.get("title") or ""
        v["embeddable"] = res.get("embeddable", True)
        for k, val in teach.get(w.get("id"), {}).items():
            if k in ("technique", "exercise_zh") and val:
                w[k] = val
        w["interaction"] = [i for i in w.get("interaction", []) if i in INTERACTIONS]
        w["platform"] = [p for p in w.get("platform", []) if p in PLATFORMS]
        w["creator_ids"] = [c for c in w["creator_ids"] if c in creators] or w["creator_ids"]
        kept.append(w)

    used = {c for w in kept for c in w["creator_ids"]}
    for cid in used - creators.keys():
        logger.warning("work references unknown creator %s", cid)
        creators[cid] = {"id": cid, "name": cid.replace("-", " ").title(), "links": {}, "connected_to": []}
    out_creators = [c for c in creators.values() if c["id"] in used]
    for c in out_creators:
        c["connected_to"] = [x for x in c["connected_to"] if x in creators and x != c["id"]]
        c["work_count"] = sum(c["id"] in w["creator_ids"] for w in kept)

    kept.sort(key=lambda w: (-(w.get("year") or 0), w.get("title", "")))
    open_leads, checked_leads = classify_leads(leads, creators, {k.lower(): v for k, v in ov.get("lead_status", {}).items()})

    tw, tc = load_i18n()
    for w in kept:
        w.update({k: v for k, v in tw.get(w["id"], {}).items() if v})
    for c in out_creators:
        c.update({k: v for k, v in tc.get(c["id"], {}).items() if v})
    for w in kept:  # manual patches win over teach/i18n files
        w.update(patches.get(w["id"], {}))
    salient = load_salient()
    for w in kept:
        if w["id"] in salient:
            w["salient"] = salient[w["id"]]
    missing_tr = [w["id"] for w in kept if not all(w.get(f) for f in ("description_zh", "idea_en", "technique_zh", "exercise_en"))]
    if missing_tr:
        logger.warning("works missing translations: %d (e.g. %s)", len(missing_tr), missing_tr[:5])
    keys = load_keys({w["id"] for w in kept}, {c["id"] for c in out_creators})
    key_of = {cid: k["id"] for k in keys.get("creators", []) for cid in k["creator_ids"]}
    for c in out_creators:
        if c["id"] in key_of:
            c["key"] = key_of[c["id"]]
    cats = json.loads(SALIENT_CATS.read_text()).get("categories", []) if SALIENT_CATS.exists() else []
    cat_ids = {c["id"] for c in cats}
    uncategorized = [w["id"] for w in kept if w.get("salient") and w["salient"].get("cat") not in cat_ids]
    if uncategorized:
        logger.warning("salient works without a valid category: %d (e.g. %s)", len(uncategorized), uncategorized[:5])
    data = {"generated": date.today().isoformat(), "creators": out_creators, "works": kept, "keys": keys,
            "salient_categories": cats}
    (ROOT / "data" / "entries.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    (ROOT / "data" / "entries.js").write_text("window.INSPIRE = " + json.dumps(data, ensure_ascii=False) + ";\n")
    (ROOT / "data" / "leads.json").write_text(json.dumps(open_leads, indent=1, ensure_ascii=False))
    (ROOT / "data" / "leads_checked.json").write_text(json.dumps(checked_leads, indent=1, ensure_ascii=False))
    (ROOT / "data" / "dropped.json").write_text(json.dumps(dropped, indent=1, ensure_ascii=False))
    (ROOT / "data" / "creators_index.txt").write_text("".join(
        f"{c['id']} | {c['name']} | {c.get('work_count', 0)} works\n" for c in sorted(out_creators, key=lambda c: c["id"])))
    write_markdown(data)
    index = ROOT / "index.html"
    stamp = str(int(time.time()))
    index.write_text(re.sub(r'(assets/(?:app|i18n|export)\.(?:js|css)|data/entries\.js)(\?v=\d+)?"', rf'\1?v={stamp}"', index.read_text()))
    logger.info("creators=%d works=%d dropped=%d open_leads=%d with_teaching=%d salient=%d",
                len(out_creators), len(kept), len(dropped), len(open_leads),
                sum(bool(w.get("exercise_zh")) for w in kept), sum(bool(w.get("salient")) for w in kept))


if __name__ == "__main__":
    main()
