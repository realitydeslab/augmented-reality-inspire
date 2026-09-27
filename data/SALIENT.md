# Salient — criteria

**Salient** works (中文：**一眼即懂**) are simple works where the concept jumps out. They get their own column on the site.

## Anchors (the owner's own examples)

| Work | Why |
|---|---|
| Universal Everything — *Ultrasound VR* | Draw in the air and each stroke becomes a sound sculpture that plays from where you drew it. |
| Universal Everything — *Super You* | Phone AR turns your body into a giant, flowing digital being. |
| Zach Lieberman — *Audio in AR space* | Every sound stays where it was made; walk back through it to replay it. |
| Botao 'Amber' Hu — *EchoVision* | A mask that lets you see like a bat, through echolocation. |

## A work is salient only if ALL four hold

1. **One idea.** It can be said in one short sentence, without background knowledge.
2. **Minimal means.** One or two techniques or interactions; nothing superfluous.
3. **Concept over technology.** What you remember is the idea, not the tech.
4. **Readable in seconds.** About five seconds of the video is enough to get it.

## Usually NOT salient

Platforms, SDKs and tools; products or games with many features; research systems with complex pipelines; compilations, reels and talks; incremental tech demos ("plane detection test", "occlusion test"); pieces whose point only becomes clear after an explanation.

## Size

Be selective: roughly **one in ten** works. When unsure, leave it out.

## Data

- Picks: `data/salient/*.json` — `{ "work-id": { "why_en": "…", "why_zh": "…" } }`
  - `why_en`: one short sentence naming the single idea and why it lands. No marketing words.
  - `why_zh`: the same in natural Simplified Chinese.
- Owner's manual additions/removals: `data/salient/manual.json` (`null` removes a work). Applied last.
- Reviewed works (salient or not): `data/salient/reviewed.json`, so `/salient` only looks at new works.
