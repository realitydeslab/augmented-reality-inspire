---
description: Tidy the gallery — find and resolve duplicate creators/works, dead videos, missing translations or teaching notes, and stale leads; then rebuild and publish.
argument-hint: [recheck] [leads] [--no-push]
---

# Tidy and de-duplicate Reality Design Inspire

Options in `$ARGUMENTS`:
- `recheck` — re-verify every video first (slow; do it every month or two).
- `leads` — also review the open leads list and research the most promising ones with `/add-creator`.
- `--no-push` — fix and build locally without publishing.

All fixes go through `data/overrides.json` (or the batch file in `data/raw/` that owns the data), never by hand-editing the built files `data/entries.*`, `inspire*.md` or `llms.txt`.

| Override | Use |
|---|---|
| `merge_creators` | `{ "duplicate-id": "canonical-id" }` — the same person/studio under two ids |
| `drop_works` | `[ "work-id" ]` — a true duplicate or a work that should not be shown |
| `patch_works` | `{ "work-id": { "field": value } }` — fix a year, title, video URL, text |
| `lead_status` | `{ "Lead Name": "no_video" \| "not_ar" \| "duplicate" \| "covered" }` |
| `audit_ignore` | `[ "id-a\|id-b" ]` — a pair confirmed NOT to be duplicates, so the audit stops reporting it |

## Steps

1. **Sync.** `git pull --ff-only`.

2. **Audit.** `python3 tools/audit.py` (add `--recheck` if requested). Read the whole report.

3. **Duplicate creators.** For each pair, decide:
   - Same person or studio → add to `merge_creators` (keep the id with more works or the better-known name). If the duplicate id is used in `data/key_creators.json`, update it there too.
   - Different (e.g. a lab and one of its members, or two studios sharing a parent site) → add to `audit_ignore`.

4. **Duplicate works.** Open both videos' titles/descriptions and decide:
   - Same work → `drop_works` the weaker entry (keep the creator's own upload, the longer/better video, the entry with the richer description). If the dropped one was a Key Creator highlight, point the highlight to the kept id.
   - Different works (series parts, versions, same title by different artists) → `audit_ignore`.

5. **Dead videos.** Search for a replacement upload of the same work (creator's own channel first). Found → `patch_works` with the new `video: { "url": … }` and run `python3 tools/check_video.py <url>`. Not found → leave it dropped (the build already hides it) and note it in the report.

6. **Missing fields.** Fill any missing `description_zh / idea_en / technique_zh / exercise_en / …` in the batch file that owns the work (or via `patch_works`), following the language rule in `data/SCHEMA.md`.

7. **Salient.** Skim the Salient column (`data/salient/*.json`): remove works that are not simple or whose idea is not clear in seconds (`{ "work-id": null }` in `data/salient/manual.json`), and add obvious missing ones. Keep it selective, around one in ten works.

8. **Leads** (only with `leads`). Review `data/leads.json`: mark people who are already covered, have no usable video, or are not relevant with `lead_status`. Suggest the 5–10 most promising open leads to the user and, if they agree, run `/add-creator` on them.

9. **Rebuild and verify.** `python3 tools/build_data.py` then `python3 tools/audit.py` again — the report should be clean or contain only items you explained.

10. **Publish** (skip with `--no-push`).
   `git add data/ inspire.md inspire.zh.md llms.txt index.html && git commit -m "chore(data): tidy — <what changed>" && git push`

11. **Report** in the user's language: what was merged, dropped, patched, ignored and why; dead videos replaced or removed; lead changes; before/after counts.
