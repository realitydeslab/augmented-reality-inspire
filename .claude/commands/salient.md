---
description: Quickly identify "salient" works (simple works where the concept jumps out) and update the Salient column, then rebuild and publish.
argument-hint: [new | all | <creator-id or name> | <work-id or video URL> …] [--no-push]
---

# Identify salient works

Input: `$ARGUMENTS`
- empty or `new` — review every work not reviewed yet (the usual case, e.g. after `/add-creator`)
- `all` — re-review the whole gallery
- a creator id or name — review that creator's works
- one or more work ids or video URLs — review just those (if a URL is not in the gallery yet, tell the user to run `/add-creator` first)
- `--no-push` — update and build locally without publishing

**Read `data/SALIENT.md` first.** It holds the criteria, the four anchor works and the data format. Apply it strictly: a work is salient only if it has one idea you can say in a sentence, minimal means, concept over technology, and is readable in about five seconds. Aim for roughly one in ten works.

## Steps

1. **Sync.** `git pull --ff-only`, then `python3 tools/salient.py stats`.

2. **Get the works to review.**
   - `new`: `python3 tools/salient.py candidates --json`
   - `all`: `python3 tools/salient.py candidates --all --json`
   - creator: `python3 tools/salient.py candidates --creator <creator-id> --json` (find the id in `data/creators_index.txt`)
   - specific works: look them up in `data/entries.json` (match a video URL against `video.url`).
   Each row has id, title, creators, year, one-line idea and video URL. Read `description` in `data/entries.json` when the idea line is not enough. For more than ~150 works, split the list across parallel subagents; each writes its own file `data/salient/<name>.json` (never the same file).

3. **Judge each work** against the four criteria. Compare with the anchors: would it sit comfortably next to *Ultrasound VR*, *Super You*, *Audio in AR space* and *EchoVision*? When unsure, leave it out.

4. **Write the picks** into `data/salient/manual.json` (or the subagent's own file):
   `"work-id": { "why_en": "One short sentence naming the single idea.", "why_zh": "同一句话的自然中文。" }`
   To take a work out of the column, set `"work-id": null` in `manual.json`.

5. **Record what you reviewed** (picked or not), so the next `/salient` skips them:
   `python3 tools/salient.py reviewed <id> <id> …` (or `--all-current` after an `all` pass).

6. **Build and check.** `python3 tools/build_data.py` (the log shows `salient=N`), then `python3 tools/salient.py stats`. Check that `why_en` has no Chinese and `why_zh` is natural Chinese.

7. **Publish** (skip with `--no-push`).
   `git add data/salient data/entries.* inspire.md inspire.zh.md llms.txt index.html && git commit -m "feat(salient): <n> added, <m> removed" && git push`

8. **Report** in the user's language: which works were added (title, creator, the one-line reason), which were removed and why, and the new total. Link: https://inspire.reality.design/#view=salient
