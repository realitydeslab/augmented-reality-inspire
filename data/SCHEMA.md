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
  "idea_zh": "一句话中文：核心创意点子是什么",
  "interaction": ["voice-sound", "spatial-mapping"],  // 1-3 from the vocabulary below
  "platform": ["phone"],                               // phone | headset | projection | web | wearable | desktop
  "tech": ["ARKit", "openFrameworks"],
  "video": { "platform": "vimeo", "id": "290238447", "url": "https://vimeo.com/290238447" },  // youtube | vimeo | x
  "source_url": "https://…"   // project page / article / tweet, optional
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
{ "name": "…", "why": "…", "link": "…", "found_via": "creator id" }
```

## Video rules
- Verify every video with `python3 tools/check_video.py <url>`; include only `"ok": true`.
- Prefer the creator's own upload. X/Twitter tweet URLs with a native video are allowed (`platform: "x"`).
