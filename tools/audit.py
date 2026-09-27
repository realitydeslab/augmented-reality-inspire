#!/usr/bin/env python3
"""Audit the built gallery for duplicates and gaps. Read-only: it never edits data.

Reports
- possible duplicate creators (similar names, shared name parts, or the same profile link)
- possible duplicate works (same creator(s) and a similar title, or the same title across creators)
- works / creators missing bilingual or teaching fields
- videos that failed the last check (data/dropped.json)
- Key Creator highlights that point to missing works
- lead status counts

Fixes go into data/overrides.json (merge_creators, drop_works, patch_works, lead_status;
audit_ignore: ["id-a|id-b"] for pairs confirmed NOT to be duplicates),
then `python3 tools/build_data.py`.

Usage:
  python3 tools/audit.py            # uses cached video checks
  python3 tools/audit.py --recheck  # rebuild with every video re-checked first (slow)
  python3 tools/audit.py --json     # machine-readable output
"""
import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CJK = re.compile(r"[㐀-鿿]")
WORK_FIELDS = ("description", "description_zh", "idea_en", "idea_zh", "technique", "technique_zh", "exercise_en", "exercise_zh")
CREATOR_FIELDS = ("role", "role_zh", "bio", "bio_zh")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _tokens(name: str) -> set[str]:
    return {t for t in (_norm(p) for p in re.split(r"[—–\-/(),&@|]| and ", name or "")) if len(t) >= 5}


def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def dup_creators(creators: list) -> list:
    out = []
    for a, b in combinations(creators, 2):
        why = []
        if _sim(a["name"], b["name"]) >= 0.82:
            why.append("similar names")
        shared = _tokens(a["name"]) & _tokens(b["name"])
        if shared:
            why.append("shared name part: " + ", ".join(sorted(shared)))
        la = {_norm(u) for u in (a.get("links") or {}).values() if u}
        lb = {_norm(u) for u in (b.get("links") or {}).values() if u}
        if la & lb:
            why.append("same profile link")
        if why:
            out.append({"a": a["id"], "a_name": a["name"], "a_works": a.get("work_count", 0),
                        "b": b["id"], "b_name": b["name"], "b_works": b.get("work_count", 0), "why": why})
    return out


def dup_works(works: list) -> list:
    out = []
    for a, b in combinations(works, 2):
        if re.findall(r"\d+", a["title"]) != re.findall(r"\d+", b["title"]):
            continue  # numbered series ("… 01" vs "… 02") are distinct works
        s = _sim(a["title"], b["title"])
        same_people = set(a["creator_ids"]) & set(b["creator_ids"])
        close_year = abs((a.get("year") or 0) - (b.get("year") or 0)) <= 2
        if (same_people and s >= 0.8 and close_year) or s >= 0.95:
            out.append({"a": a["id"], "a_title": a["title"], "a_video": a["video"]["url"],
                        "b": b["id"], "b_title": b["title"], "b_video": b["video"]["url"],
                        "similarity": round(s, 2), "same_creator": bool(same_people)})
    return out


def gaps(works: list, creators: list) -> dict:
    zh_fields = {f for f in WORK_FIELDS if f.endswith("_zh")}
    w_missing = [{"id": w["id"], "missing": [f for f in WORK_FIELDS if not w.get(f)
                                               or (f in zh_fields and not CJK.search(w[f]))
                                               or (f not in zh_fields and CJK.search(w[f]))]}
                 for w in works]
    c_missing = [{"id": c["id"], "missing": [f for f in CREATOR_FIELDS if not c.get(f)]} for c in creators]
    return {"works": [x for x in w_missing if x["missing"]], "creators": [x for x in c_missing if x["missing"]]}


def main() -> int:
    if "--recheck" in sys.argv:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_data.py"), "--recheck"], check=True)
    data = json.loads((DATA / "entries.json").read_text())
    works, creators = data["works"], data["creators"]
    work_ids = {w["id"] for w in works}
    dropped = json.loads((DATA / "dropped.json").read_text()) if (DATA / "dropped.json").exists() else []
    leads_open = json.loads((DATA / "leads.json").read_text()) if (DATA / "leads.json").exists() else []
    leads_checked = json.loads((DATA / "leads_checked.json").read_text()) if (DATA / "leads_checked.json").exists() else []
    bad_highlights = [{"key": k["id"], "work": h["work"]} for k in data.get("keys", {}).get("creators", [])
                      for h in k["highlights"] if h["work"] not in work_ids]
    status_counts: dict[str, int] = {}
    for lead in leads_checked:
        status_counts[lead["status"]] = status_counts.get(lead["status"], 0) + 1

    ov = json.loads((DATA / "overrides.json").read_text()) if (DATA / "overrides.json").exists() else {}
    ignore = {tuple(sorted(pair.split("|"))) for pair in ov.get("audit_ignore", [])}
    keep = lambda d: tuple(sorted((d["a"], d["b"]))) not in ignore  # noqa: E731

    report = {
        "totals": {"creators": len(creators), "works": len(works)},
        "duplicate_creators": [d for d in dup_creators(creators) if keep(d)],
        "duplicate_works": [d for d in dup_works(works) if keep(d)],
        "gaps": gaps(works, creators),
        "dead_videos": dropped,
        "bad_key_highlights": bad_highlights,
        "leads": {"open": len(leads_open), **status_counts},
    }
    if "--json" in sys.argv:
        print(json.dumps(report, indent=1, ensure_ascii=False))
        return 0

    r = report
    print(f"# Audit — {r['totals']['creators']} creators, {r['totals']['works']} works\n")
    print(f"## Possible duplicate creators ({len(r['duplicate_creators'])})")
    for d in r["duplicate_creators"]:
        print(f"- {d['a']} ({d['a_name']}, {d['a_works']} works)  <->  {d['b']} ({d['b_name']}, {d['b_works']} works): {'; '.join(d['why'])}")
    print(f"\n## Possible duplicate works ({len(r['duplicate_works'])})")
    for d in r["duplicate_works"]:
        print(f"- {d['a']} “{d['a_title']}”  <->  {d['b']} “{d['b_title']}”  sim={d['similarity']}"
              f"{' same-creator' if d['same_creator'] else ''}\n    {d['a_video']}\n    {d['b_video']}")
    g = r["gaps"]
    print(f"\n## Missing fields: {len(g['works'])} works, {len(g['creators'])} creators")
    for x in g["works"][:30] + g["creators"][:30]:
        print(f"- {x['id']}: {', '.join(x['missing'])}")
    print(f"\n## Dead videos ({len(r['dead_videos'])})")
    for x in r["dead_videos"]:
        print(f"- {x.get('id')}: {x.get('url')} ({x.get('error')})")
    print(f"\n## Broken Key Creator highlights ({len(r['bad_key_highlights'])})")
    for x in r["bad_key_highlights"]:
        print(f"- {x['key']}: {x['work']}")
    print(f"\n## Leads: {r['leads']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
