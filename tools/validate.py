#!/usr/bin/env python3
"""Validate research batch files before they enter the gallery.

Checks each data/raw/<batch>.json against data/SCHEMA.md:
- required fields present and non-empty (bilingual + teaching fields)
- English fields contain no CJK; Chinese fields do contain CJK
- interaction / platform values come from the vocabulary
- creator_ids resolve (in this file or in the existing gallery)
- no work id or video already used by another batch

Usage:
  python3 tools/validate.py data/raw/add-some-creator.json [more.json ...]
  python3 tools/validate.py --all            # every file in data/raw/
Exit code 1 if any error is found.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_data import INTERACTIONS, PLATFORMS, _normalize_video, _video_key  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
CJK = re.compile(r"[㐀-鿿]")

WORK_EN = ("title", "description", "idea_en", "technique", "exercise_en")
WORK_ZH = ("description_zh", "idea_zh", "technique_zh", "exercise_zh")
CREATOR_EN = ("name", "role", "bio", "why")
CREATOR_ZH = ("role_zh", "bio_zh", "why_zh")
LEAD_STATUS = {"open", "no_video", "not_ar", "duplicate"}
VFX_CATS = {c["id"] for c in json.loads((ROOT / "data" / "vfx_categories.json").read_text())["categories"]}
RELATED_CATS = {c["id"] for c in json.loads((ROOT / "data" / "related_categories.json").read_text())["categories"]}


def _load(path: Path) -> dict:
    return json.loads(path.read_text())


def _others(exclude: Path) -> tuple[set, set, set]:
    """Creator ids, work ids and video keys used by every other batch file."""
    cids, wids, vkeys = set(), set(), set()
    for f in RAW.glob("*.json"):
        if f.resolve() == exclude.resolve():
            continue
        try:
            d = _load(f)
        except json.JSONDecodeError:
            continue
        cids |= {c["id"] for c in d.get("creators", []) if c.get("id")}
        for w in d.get("works", []):
            wids.add(w.get("id"))
            v = _normalize_video(w.get("video"))
            if v.get("platform") and v.get("id"):
                vkeys.add(_video_key(v))
    return cids, wids, vkeys


def validate(path: Path) -> list[str]:
    errs: list[str] = []
    try:
        d = _load(path)
    except json.JSONDecodeError as e:
        return [f"invalid JSON: {e}"]
    other_cids, other_wids, other_vkeys = _others(path)
    own_cids = {c.get("id") for c in d.get("creators", [])}
    known = own_cids | other_cids

    for c in d.get("creators", []):
        cid = c.get("id", "?")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", cid):
            errs.append(f"creator {cid}: id must be kebab-case")
        for f in CREATOR_EN:
            if not c.get(f):
                errs.append(f"creator {cid}: missing {f}")
            elif f != "name" and CJK.search(c[f]):
                errs.append(f"creator {cid}: {f} must be English (found Chinese)")
        for f in CREATOR_ZH:
            if not c.get(f):
                errs.append(f"creator {cid}: missing {f}")
            elif not CJK.search(c[f]):
                errs.append(f"creator {cid}: {f} must be Chinese")
        if cid in other_cids:
            errs.append(f"creator {cid}: already exists in another batch — add works with this id but drop the creator record")

    seen_w, seen_v = set(), set()
    for w in d.get("works", []):
        wid = w.get("id", "?")
        for f in WORK_EN:
            if not w.get(f):
                errs.append(f"work {wid}: missing {f}")
            elif f != "title" and CJK.search(w[f]):
                errs.append(f"work {wid}: {f} must be English (found Chinese)")
        for f in WORK_ZH:
            if not w.get(f):
                errs.append(f"work {wid}: missing {f}")
            elif not CJK.search(w[f]):
                errs.append(f"work {wid}: {f} must be Chinese")
        if not isinstance(w.get("year"), int):
            errs.append(f"work {wid}: year must be an integer")
        ix = w.get("interaction") or []
        if not 1 <= len(ix) <= 3 or any(i not in INTERACTIONS for i in ix):
            errs.append(f"work {wid}: interaction must be 1–3 values from the vocabulary, got {ix}")
        if any(p not in PLATFORMS for p in w.get("platform") or []):
            errs.append(f"work {wid}: unknown platform {w.get('platform')}")
        for cid in w.get("creator_ids") or ["<none>"]:
            if cid not in known:
                errs.append(f"work {wid}: creator id {cid} not found")
        v = _normalize_video(w.get("video"))
        key = _video_key(v) if v.get("platform") and v.get("id") else None
        if not key:
            errs.append(f"work {wid}: video url not recognised (YouTube, Vimeo, X or mp4)")
        elif key in other_vkeys or key in seen_v:
            errs.append(f"work {wid}: video {key} already used")
        if w.get("code_url") and not re.match(r"https://(github\.com|gitlab\.com|codeberg\.org|bitbucket\.org)/[^/]+/[^/]+", w["code_url"]):
            errs.append(f"work {wid}: code_url must be a repository URL (GitHub/GitLab/Codeberg/Bitbucket)")
        if w.get("vfx_cat") and w["vfx_cat"] not in VFX_CATS:
            errs.append(f"work {wid}: vfx_cat must be one of {sorted(VFX_CATS)}")
        if w.get("related_cat") and w["related_cat"] not in RELATED_CATS:
            errs.append(f"work {wid}: related_cat must be one of {sorted(RELATED_CATS)}")
        if wid in other_wids or wid in seen_w:
            errs.append(f"work {wid}: duplicate work id")
        seen_w.add(wid)
        if key:
            seen_v.add(key)

    for lead in d.get("leads", []):
        if lead.get("status", "open") not in LEAD_STATUS:
            errs.append(f"lead {lead.get('name')}: status must be one of {sorted(LEAD_STATUS)}")
    return errs


def main() -> int:
    args = sys.argv[1:]
    files = sorted(RAW.glob("*.json")) if args == ["--all"] else [Path(a) for a in args]
    if not files:
        print(__doc__)
        return 2
    bad = 0
    for f in files:
        errs = validate(f)
        d = _load(f) if not errs or not errs[0].startswith("invalid") else {}
        summary = f"{len(d.get('creators', []))} creators, {len(d.get('works', []))} works"
        if errs:
            bad += 1
            print(f"✗ {f.name} ({summary}) — {len(errs)} problem(s):")
            for e in errs[:40]:
                print(f"   - {e}")
            if len(errs) > 40:
                print(f"   … and {len(errs) - 40} more")
        else:
            print(f"✓ {f.name} ({summary})")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
