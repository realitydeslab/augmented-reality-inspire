---
description: Research one or more AR creators, add all their works (bilingual + teaching notes) to the gallery, rebuild the site and Markdown catalogs, and publish.
argument-hint: <name, X/Instagram/site/video URL> [, another creator …] [--no-push]
---

# Add a creator to Reality Design Inspire

Input: `$ARGUMENTS` — one or more creators (a name, an X / Instagram / personal-site URL, or a video URL of one of their works), comma-separated. `--no-push` means build and preview locally but do not commit or publish.

The gallery collects the most creative AR creators and **all** of their AR works as idea material for teaching. Curation rule: **inspiration beats strict AR purity** — projection, camera-interactive, mixed-reality and even mostly-VR pieces are welcome if they are inspiring for spatial / AR design.

Read `data/SCHEMA.md` first. It defines the JSON format, the interaction vocabulary, the language rule and lead statuses.

## Steps

1. **Sync.** `git pull --ff-only`.

2. **Identify each creator.** Resolve the input to a real person or studio. Check whether they already exist:
   `grep -i "<name part>" data/creators_index.txt` (and search `data/entries.json` for their works).
   - Already in the gallery → **extend mode**: only add works that are missing; reuse the existing creator id; do not add a new creator record.
   - Not in the gallery → **new mode**.
   If more than one creator is given, handle each one in its own subagent in parallel, each writing its own file.

3. **Research all of their AR works.** Go through their site, Vimeo, YouTube, X, festival/lab pages and press. If the Claude-in-Chrome browser is available and the user is logged in to X, search `from:<handle> filter:videos` (keep the X tab in the foreground; one tab only). Do **not** scrape Instagram through the user's account (it rate-limits and risks the account). For each work find a playable video and verify it:
   `python3 tools/check_video.py <url> [<url> …]` — keep only `"ok": true`. Prefer the creator's own upload.

4. **Write the batch file** `data/raw/add-<creator-id>.json` (`"batch": "add-<creator-id>"`) with:
   - `creators`: the new creator record (new mode only) with `role/bio/why/based` **and** `role_zh/bio_zh/why_zh/based_zh`, `links`, `connected_to` (existing ids of collaborators), `discovered_via` (the creator id that led here, or `"seed"`).
   - `works`: every work with `title, year, description, description_zh, idea_en, idea_zh, technique, technique_zh, exercise_en, exercise_zh, interaction (1–3), platform, tech, video.url, source_url`.
     - `technique`: one sentence naming the key technique and how it works; mark guesses with "likely".
     - `exercise_*`: a 1–3 hour classroom exercise that re-creates the core idea with accessible tools (phone, WebXR, Lens Studio, AR Foundation, HoloKit, a cheap projector), starting with a verb, ending with a twist ("Twist: …" / "变体：……").
     - English fields contain no Chinese; Chinese fields are natural Simplified Chinese. Keep proper nouns in the original.
   - `leads`: new people discovered through this creator (`status: "open"`), so the snowball can continue.

5. **Validate.** `python3 tools/validate.py data/raw/add-<creator-id>.json` — fix every problem until it prints ✓.

6. **Build.** `python3 tools/build_data.py` — this re-checks new videos and regenerates `data/entries.*`, `inspire.md`, `inspire.zh.md` and `llms.txt`. Confirm the new works appear and nothing was dropped (`data/dropped.json`).

7. **Check for duplicates.** `python3 tools/audit.py` — if the new creator or works show up as possible duplicates, resolve them (see `/tidy`).

8. **Key Creator (optional).** Only if the user asked, or the creator is clearly of Key-Creator stature, propose adding them to `data/key_creators.json` with a 4–5 stop tour (`tagline/intro/learn` and highlight notes in both `_en` and `_zh`) and ask before adding.

9. **Preview.** Serve locally if helpful: `python3 -m http.server 8931 --bind 127.0.0.1`, open `http://localhost:8931/#view=works&q=<name>`.

10. **Publish** (skip with `--no-push`).
    `git add data/raw data/overrides.json data/key_creators.json data/entries.* data/leads*.json data/dropped.json data/video_cache.json inspire.md inspire.zh.md llms.txt index.html`
    `git commit -m "feat(data): add <Creator Name> (<n> works)"` then `git push`. GitHub Pages redeploys https://inspire.reality.design in about a minute.

11. **Report** in the user's language: creator(s) added, number of works, notable pieces, new leads found, anything left out and why, and the live URL.
