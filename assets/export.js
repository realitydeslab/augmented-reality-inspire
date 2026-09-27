/* Reality Design Inspire — language-aware field access and Markdown export (SKILL.md / README.md). */
(() => {
  "use strict";
  const SITE = "https://inspire.reality.design";

  /* Pick the field for the current language; content is fully translated at build time. */
  const text = {
    work(w, lang) {
      const zh = lang === "zh";
      return {
        description: zh ? w.description_zh : w.description,
        idea: zh ? w.idea_zh : w.idea_en,
        technique: zh ? w.technique_zh : w.technique,
        exercise: zh ? w.exercise_zh : w.exercise_en,
      };
    },
    creator(c, lang) {
      const zh = lang === "zh";
      return {
        role: zh ? c.role_zh : c.role, bio: zh ? c.bio_zh : c.bio,
        why: zh ? c.why_zh : c.why, based: zh ? c.based_zh : c.based,
      };
    },
    key(k, lang) {
      const zh = lang === "zh";
      return { tagline: zh ? k.tagline_zh : k.tagline_en, intro: zh ? k.intro_zh : k.intro_en, learn: zh ? k.learn_zh : k.learn_en };
    },
    note(h, lang) { return lang === "zh" ? h.note_zh : h.note_en; },
    group(g, lang) { return { name: lang === "zh" ? g.zh : g.en, desc: lang === "zh" ? g.desc_zh : g.desc_en }; },
  };

  const L = {
    en: {
      skillDesc: (n) => `${n} AR works I starred in Reality Design Inspire (${SITE}): what each piece does, its core idea, the key technique behind it and a classroom exercise. Use when brainstorming AR or mixed-reality interactions, planning AR lessons, or prototyping with AR Foundation, WebXR, Lens Studio or HoloKit.`,
      skillTitle: "AR inspiration: my starred works",
      source: (d, n) => `Source: ${SITE} · exported ${d} · ${n} works.`,
      howTitle: "How to use this skill",
      how: [
        "When asked for AR ideas, start from these works and name the work and creator you are building on.",
        "Propose new ideas by combining the interaction patterns of two or more works.",
        "For teaching, reuse the “Try it” exercises and adapt them to the students' tools and time.",
        "Treat the video links as the primary reference; do not invent details that are not described here.",
      ],
      works: "Works", video: "Video", interaction: "Interaction", platform: "Platform & tech",
      idea: "Idea", what: "What it is", technique: "Technique", tryit: "Try it",
      readmeTitle: "My AR picks from Reality Design Inspire",
      readmeIntro: (n) => `${n} augmented-reality works I starred on ${SITE}. For an AI assistant, load the companion SKILL.md.`,
    },
    zh: {
      skillDesc: (n) => `我在 Reality Design Inspire（${SITE}）收藏的 ${n} 件 AR 作品：每件作品做了什么、核心点子、背后的关键技术，以及一个课堂练习。在构思 AR 或混合现实交互、准备 AR 课程，或用 AR Foundation、WebXR、Lens Studio、HoloKit 做原型时使用。`,
      skillTitle: "AR 灵感：我的收藏",
      source: (d, n) => `来源：${SITE} · 导出于 ${d} · 共 ${n} 件作品。`,
      howTitle: "如何使用这个 skill",
      how: [
        "被问到 AR 点子时，从这些作品出发，并说明你借鉴的是哪件作品、哪位创作者。",
        "把两件或更多作品的交互模式组合起来，提出新的点子。",
        "用于教学时，复用其中的“课堂练习”，并根据学生的工具和时间调整。",
        "以视频链接为准，不要编造这里没有描述的细节。",
      ],
      works: "作品", video: "视频", interaction: "交互类型", platform: "平台与技术",
      idea: "创意点子", what: "作品内容", technique: "关键技术", tryit: "课堂练习",
      readmeTitle: "我在 Reality Design Inspire 的 AR 收藏",
      readmeIntro: (n) => `我在 ${SITE} 收藏的 ${n} 件增强现实作品。如果要给 AI 助手使用，请加载配套的 SKILL.md。`,
    },
  };

  function ctx(D, lang) {
    const creators = Object.fromEntries(D.creators.map((c) => [c.id, c.name]));
    const ix = Object.fromEntries(window.INSPIRE_I18N.interactions.map(([k, en, zh]) => [k, lang === "zh" ? zh : en]));
    const plat = window.INSPIRE_I18N[lang].platforms;
    return { creators, ix, plat };
  }
  const who = (w, c) => w.creator_ids.map((id) => c.creators[id] || id).join(", ");

  function workBlock(w, lang, c) {
    const t = text.work(w, lang), s = L[lang];
    const tech = [...(w.platform || []).map((p) => c.plat[p] || p), ...(w.tech || [])].join(", ");
    return [
      `### ${w.title} — ${who(w, c)}${w.year ? ` (${w.year})` : ""}`,
      `- ${s.video}: ${w.video.url}`,
      `- ${s.interaction}: ${(w.interaction || []).map((i) => c.ix[i] || i).join(", ")}`,
      tech ? `- ${s.platform}: ${tech}` : "",
      t.idea ? `- ${s.idea}: ${t.idea}` : "",
      t.description ? `- ${s.what}: ${t.description}` : "",
      t.technique ? `- ${s.technique}: ${t.technique}` : "",
      t.exercise ? `- ${s.tryit}: ${t.exercise}` : "",
    ].filter(Boolean).join("\n");
  }

  function skillMd(works, D, lang) {
    const s = L[lang], c = ctx(D, lang), d = new Date().toISOString().slice(0, 10);
    return [
      "---",
      "name: ar-inspiration-picks",
      `description: ${s.skillDesc(works.length).replace(/\n/g, " ")}`,
      "---",
      "",
      `# ${s.skillTitle}`,
      "",
      s.source(d, works.length),
      "",
      `## ${s.howTitle}`,
      "",
      ...s.how.map((h) => `- ${h}`),
      "",
      `## ${s.works}`,
      "",
      works.map((w) => workBlock(w, lang, c)).join("\n\n"),
      "",
    ].join("\n");
  }

  function readmeMd(works, D, lang) {
    const s = L[lang], c = ctx(D, lang), d = new Date().toISOString().slice(0, 10);
    const rows = works.map((w, i) => {
      const t = text.work(w, lang);
      return `${i + 1}. **[${w.title}](${w.video.url})** — ${who(w, c)}${w.year ? `, ${w.year}` : ""}  \n   ${t.idea || ""}`;
    });
    return [`# ${s.readmeTitle}`, "", s.readmeIntro(works.length), "", s.source(d, works.length), "", ...rows, ""].join("\n");
  }

  window.InspireText = text;
  window.InspireExport = { skillMd, readmeMd };
})();
