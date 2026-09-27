# Data schema — holokit-inspire

Each research batch writes one file: `data/raw/<batch>.json`

```json
{
  "batch": "zach-circle",
  "creators": [ Creator, ... ],
  "works":    [ Work, ... ],
  "leads":    [ Lead, ... ]
}
```

## Creator
```json
{
  "id": "zach-lieberman",                 // kebab-case, unique
  "name": "Zach Lieberman",
  "role": "Artist; co-founder of SFPC and openFrameworks",
  "based": "New York, US",
  "bio": "1-2 sentences, English.",
  "why": "Why they are among the most creative AR people (1 sentence).",
  "links": { "site": "", "x": "", "instagram": "", "vimeo": "", "youtube": "", "github": "" },
  "role_zh": "…", "bio_zh": "…", "why_zh": "…", "based_zh": "纽约，美国",   // REQUIRED Chinese versions (natural Simplified Chinese)
  "connected_to": ["molmol-kuo", "golan-levin"],   // other creator ids (collaborators, mutual follows, shared lab/studio)
  "discovered_via": "zach-lieberman"               // creator id that led to this person ("seed" for seeds)
}
```

## Work  (one AR piece / experiment / project, must have a playable video)
```json
{
  "id": "zach-lieberman--audio-in-ar-space",
  "creator_ids": ["zach-lieberman"],
  "title": "Audio in AR space",
  "year": 2018,
  "description": "1-2 sentences, English: what you see and what the interaction is.",
  "description_zh": "中文描述（自然流畅，不逐字翻译）",
  "idea_en": "One-line core idea in English.",
  "idea_zh": "一句话中文：核心创意点子是什么",
  "technique": "One English sentence: the key technique and how it works (mark guesses with 'likely').",
  "technique_zh": "关键技术的中文说明。",
  "exercise_en": "Imperative 1–3 hour classroom exercise. Twist: …",
  "exercise_zh": "以动词开头的 1–3 小时课堂练习；变体：……",
  "interaction": ["voice-sound", "spatial-mapping"],  // 1-3 from the vocabulary below
  "platform": ["phone"],                               // phone | headset | projection | web | wearable | desktop
  "tech": ["ARKit", "openFrameworks"],
  "video": { "platform": "vimeo", "id": "290238447", "url": "https://vimeo.com/290238447" },  // youtube | vimeo | x
  "source_url": "https://…",  // project page / article / tweet, optional
  "found_via": { "source": "pinterest", "url": "https://www.pinterest.com/pin/…" }  // optional: where we discovered it (pinterest, article, x, …)
  "code_url": "https://github.com/<owner>/<repo>",  // optional: public source code of this work (shown as "Source code")
  "vfx_cat": "particles",  // optional: puts the work in the Visual Effects column; one id from data/vfx_categories.json
  "related_cat": "land"  // optional: puts the work in the Related Art column (not AR, but inspires AR); one id from data/related_categories.json
}
```

## Interaction vocabulary (use only these)
| key | meaning |
|---|---|
| hand-body | hand gesture, full-body tracking, touch on the body |
| face | face tracking, masks, face filters |
| voice-sound | voice, audio, music as input or output in space |
| drawing-creation | drawing / painting / sculpting / typing in 3D space |
| spatial-mapping | room understanding, occlusion, physics with real surfaces, LiDAR |
| location-geo | outdoor, city-scale, geolocated, site-specific |
| tangible-object | physical objects, toys, markers, tools, food |
| projection | projector-based / spatial AR on surfaces |
| portal-world | portals, world replacement, diminished reality, shifting reality |
| multiplayer-social | shared AR, telepresence, co-located multi-user |
| gaze-attention | eye gaze, head direction, attention |
| data-information | UI overlays, info viz, productivity, education |
| game-play | games, toys, playful mechanics |
| performance-stage | concerts, dance, theater, live shows |
| perception-art | visual effects, perceptual experiments, reality filters, time/space distortion |

## Lead  (person found but not researched in this batch — next snowball round)
```json
{ "name": "…", "why": "…", "link": "…", "found_via": "creator id",
  "status": "open" }   // open | no_video | not_ar | duplicate  (anything but "open" = checked, won't be re-researched)
```

## Language rule
Every user-facing text exists in BOTH languages, never mixed inside one field
(proper nouns — work titles, people, studios, products like ARKit — stay in the original).
English fields: description, idea_en, technique, exercise_en, role, bio, why, based.
Chinese fields: description_zh, idea_zh, technique_zh, exercise_zh, role_zh, bio_zh, why_zh, based_zh.
Run `python3 tools/validate.py <file>` before building.

## Video rules
- Verify every video with `python3 tools/check_video.py <url>`; include only `"ok": true`.
- Prefer the creator's own upload. X/Twitter tweet URLs with a native video are allowed (`platform: "x"`).

## Discovery sources (`data/sources/`)
Places where we *discover* works but that are not the works themselves (Pinterest pins, articles).
`data/sources/pinterest.json` — one entry per pin looked at:
`{ "pin": "https://www.pinterest.com/pin/…", "image": "…", "note": "…", "status": "traced" | "untraced" | "not_ar" | "duplicate", "work_id": "…" (when traced), "creator_id": "…", "original_url": "…" }`
Rule: a work only enters the gallery once it is traced to its original creator and a playable original video; untraced pins stay here only.

## Visual Effects column

Real-time visual effects (mostly Unity VFX Graph, compute shaders and shader work) that translate easily to AR.
A work joins the column when it has `vfx_cat` (one id from `data/vfx_categories.json`:
particles, pointcloud, body, audio, procedural, surface, sdf, sim, screen, ml).
Strongly prefer works with public source code in `code_url` (the repository itself, not a profile).
The video must still be playable (YouTube, Vimeo, X or mp4); a README GIF alone is not enough.

## Related Art column

Works that are **not AR** but inspire AR: land and environment art, light and space, projection mapping, fireworks and drones,
anamorphic illusions, sculpture placed in landscapes, responsive installations, stage work, immersive rooms and VR.
A work joins the column with `related_cat` (one id from `data/related_categories.json`:
land, sculpture, light, projection, sky, illusion, trace, responsive, stage, immersive), either in its batch file
or in a mapping file `data/related/*.json` (`{ "work-id": "cat" }`, `null` removes; applied at build, like data/salient/).
Museum, gallery or documentary uploads are acceptable videos for artists who do not publish their own; say so in the report.
