#!/usr/bin/env python3
"""Helper for the Salient column (criteria: data/SALIENT.md).

Usage:
  python3 tools/salient.py stats
      counts: salient picks, reviewed works, works not yet reviewed
  python3 tools/salient.py candidates [--creator ID] [--all] [--limit N] [--json]
      works to review (default: not yet reviewed), one compact line each
  python3 tools/salient.py reviewed ID [ID ...] | --all-current
      record works as reviewed (whether or not they were picked)
  python3 tools/salient.py list [--json]
      current salient picks with their reasons

Picks are written by the AI into data/salient/manual.json (or a batch file in data/salient/);
run `python3 tools/build_data.py` afterwards.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAL = ROOT / "data" / "salient"
REVIEWED = SAL / "reviewed.json"


def _entries() -> dict:
    return json.loads((ROOT / "data" / "entries.json").read_text())


def _reviewed() -> set:
    return set(json.loads(REVIEWED.read_text())) if REVIEWED.exists() else set()


def _picks() -> dict:
    out: dict = {}
    files = sorted(f for f in SAL.glob("*.json") if f.name not in ("manual.json", "reviewed.json"))
    if (SAL / "manual.json").exists():
        files.append(SAL / "manual.json")
    for f in files:
        for k, v in json.loads(f.read_text()).items():
            if k.startswith("_"):
                continue
            if v is None:
                out.pop(k, None)
            else:
                out[k] = v
    return out


def _arg(flag: str, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    d = _entries()
    names = {c["id"]: c["name"] for c in d["creators"]}
    works = d["works"]
    reviewed, picks = _reviewed(), _picks()

    if cmd == "stats":
        todo = [w for w in works if w["id"] not in reviewed and w["id"] not in picks]
        print(f"works {len(works)} · salient {len(picks)} ({len(picks) / max(len(works), 1):.0%}) · "
              f"reviewed {len(reviewed)} · to review {len(todo)}")
        return 0

    if cmd == "candidates":
        pool = works
        if "--creator" in sys.argv:
            cid = _arg("--creator")
            pool = [w for w in pool if cid in w["creator_ids"]]
        elif "--all" not in sys.argv:
            pool = [w for w in pool if w["id"] not in reviewed and w["id"] not in picks]
        pool = pool[: int(_arg("--limit", len(pool)))]
        rows = [{"id": w["id"], "title": w["title"], "by": ", ".join(names.get(c, c) for c in w["creator_ids"]),
                 "year": w.get("year"), "idea": w.get("idea_en", ""), "video": w["video"]["url"],
                 "salient": w["id"] in picks} for w in pool]
        if "--json" in sys.argv:
            print(json.dumps(rows, ensure_ascii=False, indent=1))
        else:
            for r in rows:
                mark = "✦ " if r["salient"] else ""
                print(f"{mark}{r['id']} | {r['title']} | {r['by']} | {r['year']} | {r['idea']}")
            print(f"— {len(rows)} works")
        return 0

    if cmd == "reviewed":
        ids = {w["id"] for w in works} if "--all-current" in sys.argv else set(sys.argv[2:])
        unknown = ids - {w["id"] for w in works}
        if unknown:
            print(f"unknown ids: {sorted(unknown)}")
            return 1
        REVIEWED.write_text(json.dumps(sorted(reviewed | ids), indent=1))
        print(f"reviewed: {len(reviewed | ids)} works")
        return 0

    if cmd == "list":
        rows = [{"id": k, **v} for k, v in picks.items()]
        if "--json" in sys.argv:
            print(json.dumps(rows, ensure_ascii=False, indent=1))
        else:
            for r in rows:
                print(f"✦ {r['id']}: {r.get('why_en', '')}")
            print(f"— {len(rows)} salient works")
        return 0

    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
