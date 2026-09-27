/* Reality Design Inspire — gallery app. Data: data/entries.js (window.INSPIRE). Strings: assets/i18n.js. */
(() => {
  "use strict";

  const DATA = window.INSPIRE || { creators: [], works: [], keys: { groups: [], creators: [] }, generated: "" };
  const I18N = window.INSPIRE_I18N;
  const TX = window.InspireText;
  const INTERACTIONS = I18N.interactions;
  const PLATFORMS = ["phone", "headset", "projection", "web", "wearable", "desktop"];
  const ERAS = [["2005", 1990, 2009, "≤2009"], ["2010", 2010, 2014, "2010–14"], ["2015", 2015, 2019, "2015–19"], ["2020", 2020, 2030, "2020–26"]];
  const VIEWS = ["keys", "salient", "ai", "vfx", "related", "works", "creators", "modules", "starred"];

  const creatorsById = Object.fromEntries(DATA.creators.map((c) => [c.id, c]));
  const worksById = Object.fromEntries(DATA.works.map((w) => [w.id, w]));
  const KEYS = DATA.keys || { groups: [], creators: [] };
  const keysById = Object.fromEntries(KEYS.creators.map((k) => [k.id, k]));
  const isKeyCreator = (cid) => !!creatorsById[cid]?.key;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- per-viewer storage (never required for the page to work) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  let lang = store.get("inspire-lang", (navigator.language || "").startsWith("zh") ? "zh" : "en");
  let stars = new Set(store.get("inspire-stars", []).filter((id) => worksById[id]));
  const S = () => I18N[lang];
  const ixName = (k) => { const r = INTERACTIONS.find((x) => x[0] === k); return r ? (lang === "zh" ? r[2] : r[1]) : k; };
  const src = (p) => S().sources[p] || p;

  const state = { view: "keys", q: "", ix: new Set(), plat: new Set(), era: "", sort: "new", creator: "", keyOnly: false, salientOnly: false, salientCat: "", vfxCat: "", relCat: "", aiCat: "", codeOnly: false };
  let currentList = [];
  let openIndex = -1;
  let tour = null;
  let tourMode = false;

  /* ---------- state <-> URL hash ---------- */
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.view = VIEWS.includes(p.get("view")) ? p.get("view") : "keys";
    state.q = p.get("q") || "";
    state.ix = new Set((p.get("ix") || "").split(",").filter(Boolean));
    state.plat = new Set((p.get("p") || "").split(",").filter(Boolean));
    state.era = p.get("era") || "";
    state.sort = p.get("sort") || "new";
    state.creator = p.get("c") || "";
    state.keyOnly = p.get("key") === "1";
    state.salientOnly = p.get("s") === "1";
    state.salientCat = p.get("sc") || "";
    state.vfxCat = p.get("vc") || "";
    state.relCat = p.get("rc") || "";
    state.aiCat = p.get("ac") || "";
    state.codeOnly = p.get("code") === "1";
    return { work: p.get("w"), tour: p.get("t") };
  }
  function writeHash(workId) {
    const p = new URLSearchParams();
    if (state.view !== "keys") p.set("view", state.view);
    if (state.keyOnly) p.set("key", "1");
    if (state.salientOnly) p.set("s", "1");
    if (state.salientCat && state.view === "salient") p.set("sc", state.salientCat);
    if (state.vfxCat && state.view === "vfx") p.set("vc", state.vfxCat);
    if (state.relCat && state.view === "related") p.set("rc", state.relCat);
    if (state.aiCat && state.view === "ai") p.set("ac", state.aiCat);
    if (state.codeOnly) p.set("code", "1");
    if (state.q) p.set("q", state.q);
    if (state.ix.size) p.set("ix", [...state.ix].join(","));
    if (state.plat.size) p.set("p", [...state.plat].join(","));
    if (state.era) p.set("era", state.era);
    if (state.sort !== "new") p.set("sort", state.sort);
    if (state.creator) p.set("c", state.creator);
    if ($("#tour").open && tour) p.set("t", tour.key.id);
    if (workId) p.set("w", workId);
    history.replaceState(null, "", "#" + p.toString());
  }

  /* ---------- filtering ---------- */
  const creatorNames = (w) => w.creator_ids.map((id) => creatorsById[id]?.name || id);
  function haystack(w) {
    return [w.title, w.description, w.description_zh, w.idea_zh, w.idea_en, w.technique, w.technique_zh, w.exercise_zh, w.exercise_en,
      ...(w.tech || []), ...creatorNames(w), w.year].join(" ").toLowerCase();
  }
  function matches(w, { ignoreIx = false } = {}) {
    if (state.creator && !w.creator_ids.includes(state.creator)) return false;
    if (state.keyOnly && !w.creator_ids.some(isKeyCreator)) return false;
    if (state.salientOnly && !w.salient) return false;
    if (state.codeOnly && !w.code_url) return false;
    if (!ignoreIx && state.ix.size && !(w.interaction || []).some((i) => state.ix.has(i))) return false;
    if (state.plat.size && !(w.platform || []).some((p) => state.plat.has(p))) return false;
    if (state.era) {
      const e = ERAS.find((x) => x[0] === state.era);
      if (!w.year || w.year < e[1] || w.year > e[2]) return false;
    }
    if (state.q && !haystack(w).includes(state.q.toLowerCase())) return false;
    return true;
  }
  function sorted(list) {
    const arr = [...list];
    if (state.sort === "old") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    else if (state.sort === "creator") arr.sort((a, b) => creatorNames(a)[0].localeCompare(creatorNames(b)[0]) || (a.year || 0) - (b.year || 0));
    else arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    return arr;
  }

  /* ---------- cards ---------- */
  function thumb(w) {
    const v = w.video;
    if (v.thumbnail) return `<img loading="lazy" src="${esc(v.thumbnail)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:this.dataset.t}))" data-t="${esc(w.title)}">`;
    if (v.platform === "mp4") return `<video muted playsinline preload="none" data-src="${esc(v.url)}#t=0.8"></video>`;
    return `<div class="ph">${esc(w.title)}</div>`;
  }
  const starBtn = (id, cls = "star") => `<button class="${cls}" type="button" data-star="${esc(id)}" aria-pressed="${stars.has(id)}" aria-label="${esc(S().star_aria)}">${stars.has(id) ? "★" : "☆"}</button>`;
  const salientWhy = (w) => (w.salient ? (lang === "zh" ? w.salient.why_zh : w.salient.why_en) : "");
  function card(w, useWhy = false) {
    const who = creatorNames(w).join(", ");
    const tags = (w.interaction || []).map((i) => `<span class="tag">${esc(ixName(i))}</span>`).join("");
    return `<div class="cardwrap">
      <button class="card" data-id="${esc(w.id)}" aria-label="${esc(w.title)} — ${esc(who)}">
        <div class="card__media">${thumb(w)}
          <span class="br br--tl"></span><span class="br br--tr"></span><span class="br br--bl"></span><span class="br br--br"></span>
          <span class="card__src">${src(w.video.platform)}${w.video.embeddable === false ? " ↗" : ""}</span>
          ${w.year ? `<span class="card__year">${w.year}</span>` : ""}
        </div>
        <div class="card__title">${w.salient ? '<span class="salient-mark" aria-hidden="true">✦</span>' : ""}${w.code_url ? '<span class="code-mark mono" aria-hidden="true">&lt;/&gt;</span>' : ""}${esc(w.title)}</div>
        <div class="card__meta">${esc(who)}</div>
        <div class="card__idea">${esc((useWhy && salientWhy(w)) || TX.work(w, lang).idea || "")}</div>
        <div class="tags">${tags}</div>
      </button>${starBtn(w.id)}
    </div>`;
  }

  /* ---------- static text ---------- */
  function applyStatic() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = S()[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = S()[el.dataset.i18nHtml]; });
    $("#q").placeholder = S().search_ph;
    $("#langToggle").textContent = S().lang_toggle;
    const years = DATA.works.map((w) => w.year).filter(Boolean);
    $("#stats").innerHTML = [
      [S().stat_keys, KEYS.creators.length], [S().tab_salient, DATA.works.filter((w) => w.salient).length],
      [S().tab_ai, DATA.works.filter((w) => w.ai_cat).length],
      [S().tab_vfx, DATA.works.filter((w) => w.vfx_cat).length],
      [S().tab_related, DATA.works.filter((w) => w.related_cat).length],
      [S().stat_creators, DATA.creators.length], [S().stat_works, DATA.works.length],
      [S().stat_span, years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"],
      [S().stat_ix, INTERACTIONS.filter(([k]) => DATA.works.some((w) => (w.interaction || []).includes(k))).length],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $("#generated").textContent = DATA.generated ? S().updated(DATA.generated) : "";
    $("#empty").textContent = S().empty;
  }

  function renderChips() {
    const base = DATA.works.filter((w) => matches(w, { ignoreIx: true }));
    const count = (k) => base.filter((w) => (w.interaction || []).includes(k)).length;
    $("#interactionChips").innerHTML = INTERACTIONS.map(([k]) =>
      `<button class="chip" data-ix="${k}" aria-pressed="${state.ix.has(k)}">${esc(ixName(k))}<small>${count(k)}</small></button>`).join("");
    $("#platformChips").innerHTML = PLATFORMS.filter((p) => DATA.works.some((w) => (w.platform || []).includes(p)))
      .map((p) => `<button class="chip" data-plat="${p}" aria-pressed="${state.plat.has(p)}">${esc(S().platforms[p])}</button>`).join("");
    $("#eraChips").innerHTML = ERAS.map(([k, , , label]) => `<button class="chip" data-era="${k}" aria-pressed="${state.era === k}">${label}</button>`).join("");
    const ac = $("#activeCreator");
    ac.hidden = !state.creator;
    if (state.creator) ac.innerHTML = `${esc(S().showing_by)} <strong>${esc(creatorsById[state.creator]?.name || state.creator)}</strong> <button data-clear-creator>${esc(S().clear_creator)}</button>`;
  }

  /* ---------- views ---------- */
  function renderWorks() {
    currentList = sorted(DATA.works.filter((w) => matches(w)));
    $("#grid").innerHTML = currentList.map(card).join("");
    $("#worksCount").textContent = S().n_works(currentList.length);
    return currentList.length;
  }
  function renderCreators() {
    const q = state.q.toLowerCase();
    const rows = DATA.creators
      .map((c) => ({ c, works: sorted(DATA.works.filter((w) => w.creator_ids.includes(c.id) && matches(w))) }))
      .filter(({ c, works }) => works.length || (q && [c.name, c.bio, c.bio_zh, c.role].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => (!!b.c.key - !!a.c.key) || b.works.length - a.works.length || a.c.name.localeCompare(b.c.name));
    currentList = rows.flatMap((r) => r.works);
    $("#creatorList").innerHTML = rows.map(({ c, works }) => {
      const t = TX.creator(c, lang);
      const links = Object.entries(c.links || {}).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join("");
      const via = c.discovered_via && c.discovered_via !== "seed" && creatorsById[c.discovered_via]
        ? `${esc(S().found_via)} <button data-creator="${esc(c.discovered_via)}">${esc(creatorsById[c.discovered_via].name)}</button>` : (c.discovered_via === "seed" ? esc(S().seed) : "");
      const conn = (c.connected_to || []).filter((id) => creatorsById[id]).map((id) => `<button data-creator="${esc(id)}">${esc(creatorsById[id].name)}</button>`).join("");
      return `<article class="creator" id="c-${esc(c.id)}"><div>
          <h2 class="creator__name"><button data-creator="${esc(c.id)}">${esc(c.name)}</button></h2>
          ${c.key ? `<button class="key-badge mono" data-tour="${esc(c.key)}">${esc(S().open_tour)}</button>` : ""}
          <p class="creator__role">${esc(t.role || "")}${t.based ? " · " + esc(t.based) : ""} · ${esc(S().n_works(works.length))}</p>
          ${t.bio ? `<p class="creator__bio">${esc(t.bio)}</p>` : ""}
          ${t.why ? `<p class="creator__why">${esc(t.why)}</p>` : ""}
          <div class="links">${links}</div>
          ${via ? `<div class="web">${via}</div>` : ""}
          ${conn ? `<div class="web">${esc(S().connected)} ${conn}</div>` : ""}
        </div><div class="strip">${works.map(card).join("")}</div></article>`;
    }).join("");
    return rows.length;
  }
  function renderModules() {
    const all = DATA.works.filter((w) => matches(w, { ignoreIx: true }));
    currentList = [];
    let n = 0;
    $("#moduleList").innerHTML = INTERACTIONS.map(([k, en, zh, dEn, dZh]) => {
      if (state.ix.size && !state.ix.has(k)) return "";
      const works = sorted(all.filter((w) => (w.interaction || []).includes(k)));
      if (!works.length) return "";
      n += 1;
      currentList.push(...works);
      return `<section class="module"><div class="module__head"><span class="module__num">M${String(n).padStart(2, "0")}</span>
          <h2 class="module__title">${esc(lang === "zh" ? zh : en)}</h2>
          <button class="module__all" data-module="${k}">${esc(S().all_n(works.length))}</button></div>
        <p class="module__desc">${esc(lang === "zh" ? dZh : dEn)}</p>
        <div class="strip">${works.map(card).join("")}</div></section>`;
    }).join("");
    return n;
  }
  const SCATS = DATA.salient_categories || [];
  const VCATS = DATA.vfx_categories || [];
  const RCATS = DATA.related_categories || [];
  const ACATS = DATA.ai_categories || [];
  const catName = (c) => (lang === "zh" ? c.zh : c.en);
  /* A column of works grouped by category, with category chips (Salient, Visual Effects). */
  function renderGrouped({ all, cats, catOf, current, attr, prefix, head, grid, title, lede, count, extra = "", useWhy = false }) {
    const byCat = (id) => all.filter((w) => catOf(w) === id);
    const known = new Set(cats.map((c) => c.id));
    const other = all.filter((w) => !known.has(catOf(w)));
    const otherCat = { id: "_other", en: S().other_cat, zh: S().other_cat, desc_en: "", desc_zh: "" };
    const chip = (id, label, n) => `<button class="chip" data-${attr}="${esc(id)}" aria-pressed="${current === id}">${esc(label)}<small>${n}</small></button>`;
    const chips = [chip("", S().all_cats, all.length), ...cats.map((c) => chip(c.id, catName(c), byCat(c.id).length)),
      ...(other.length ? [chip("_other", S().other_cat, other.length)] : [])].join("");
    $(head).innerHTML = `<div class="starred__head">
        <h2 class="starred__title">${title}</h2>
        <p class="starred__lede">${esc(lede)}</p>
        <p class="count mono">${esc(count)}</p>${extra}</div>
      <div class="chips scat-chips">${chips}</div>`;
    const section = (c, works) => works.length ? `<section class="scat" id="${prefix}-${esc(c.id)}">
        <div class="scat__head"><h3 class="scat__title">${esc(catName(c))}</h3><span class="scat__n mono">${works.length}</span></div>
        <p class="scat__desc">${esc(lang === "zh" ? c.desc_zh : c.desc_en)}</p>
        <div class="grid">${works.map((w) => card(w, useWhy)).join("")}</div></section>` : "";
    let list;
    if (!current) {
      list = [...cats.flatMap((c) => byCat(c.id)), ...other];
      $(grid).innerHTML = cats.map((c) => section(c, byCat(c.id))).join("") + section(otherCat, other);
    } else {
      const c = cats.find((x) => x.id === current) || otherCat;
      list = c.id === "_other" ? other : byCat(c.id);
      $(grid).innerHTML = section(c, list);
    }
    currentList = list;
    return all.length;
  }
  function renderSalient() {
    const all = sorted(DATA.works.filter((w) => w.salient));
    return renderGrouped({ all, cats: SCATS, catOf: (w) => w.salient.cat || "", current: state.salientCat, attr: "scat", prefix: "scat",
      head: "#salientHead", grid: "#salientGrid", title: `✦ ${esc(S().salient_title)}`, lede: S().salient_lede,
      count: S().salient_count(all.length), useWhy: true });
  }
  function renderAi() {
    const all = sorted(DATA.works.filter((w) => w.ai_cat));
    return renderGrouped({ all, cats: ACATS, catOf: (w) => w.ai_cat || "", current: state.aiCat, attr: "acat", prefix: "acat",
      head: "#aiHead", grid: "#aiGrid", title: esc(S().ai_title), lede: S().ai_lede, count: S().ai_count(all.length) });
  }
  function renderRelated() {
    const all = sorted(DATA.works.filter((w) => w.related_cat));
    return renderGrouped({ all, cats: RCATS, catOf: (w) => w.related_cat || "", current: state.relCat, attr: "rcat", prefix: "rcat",
      head: "#relatedHead", grid: "#relatedGrid", title: esc(S().related_title), lede: S().related_lede,
      count: S().related_count(all.length) });
  }
  function renderVfx() {
    const every = DATA.works.filter((w) => w.vfx_cat);
    const all = sorted(every.filter((w) => !state.codeOnly || w.code_url));
    const extra = `<button class="chip chip--key vfx-code" type="button" data-code-toggle aria-pressed="${state.codeOnly}">${esc(S().code_only)}</button>`;
    return renderGrouped({ all, cats: VCATS, catOf: (w) => w.vfx_cat || "", current: state.vfxCat, attr: "vcat", prefix: "vcat",
      head: "#vfxHead", grid: "#vfxGrid", title: `<span class="code-mark mono">&lt;/&gt;</span>${esc(S().vfx_title)}`, lede: S().vfx_lede,
      count: S().vfx_count(every.length, every.filter((w) => w.code_url).length), extra });
  }
  function renderStarred() {
    const list = DATA.works.filter((w) => stars.has(w.id));
    currentList = list;
    $("#starredHead").innerHTML = `<div class="starred__head">
        <h2 class="starred__title">${esc(S().starred_title)}</h2>
        <p class="starred__lede">${esc(S().starred_lede)}</p>
        ${list.length ? `<div class="starred__actions">
          <button class="btn btn--accent mono" data-export="skill">${esc(S().export_skill)}</button>
          <button class="btn mono" data-export="readme">${esc(S().export_readme)}</button>
          <button class="btn mono" data-export="copy">${esc(S().copy_md)}</button>
          <button class="btn btn--quiet mono" data-export="clear">${esc(S().clear_stars)}</button></div>` : `<p class="starred__empty">${esc(S().starred_empty)}</p>`}
      </div>`;
    $("#starGrid").innerHTML = list.map(card).join("");
    return 1;
  }

  /* ---------- Key Creators ---------- */
  function keyStats(k) {
    const works = DATA.works.filter((w) => w.creator_ids.some((c) => k.creator_ids.includes(c)));
    const ys = works.map((w) => w.year).filter(Boolean);
    return { works, span: ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "" };
  }
  const keyName = (k) => k.name || creatorsById[k.creator_ids[0]]?.name || k.id;
  function keyCard(k) {
    const { works, span } = keyStats(k);
    const hs = k.highlights.map((h) => worksById[h.work]).filter(Boolean);
    const shot = (w, cls) => (w ? `<div class="kc__shot ${cls}">${thumb(w)}</div>` : "");
    return `<button class="kc" data-tour="${esc(k.id)}" aria-label="${esc(keyName(k))}">
      <div class="kc__collage">${shot(hs[0], "kc__shot--a")}${shot(hs[1], "kc__shot--b")}${shot(hs[2], "kc__shot--c")}
        <span class="br br--tl"></span><span class="br br--tr"></span><span class="br br--bl"></span><span class="br br--br"></span></div>
      <div class="kc__body"><div class="kc__name">${esc(keyName(k))}</div>
        <p class="kc__tag">${esc(TX.key(k, lang).tagline)}</p>
        <div class="kc__meta mono">${esc(S().n_works(works.length))} · ${span} · ${esc(S().stop_tour(hs.length))}</div></div>
    </button>`;
  }
  function renderKeys() {
    const total = KEYS.creators.reduce((n, k) => n + k.highlights.length, 0);
    $("#keyList").innerHTML = `<p class="keys__lede">${esc(S().keys_lede(KEYS.creators.length, total))}</p>` +
      KEYS.groups.map((g) => {
        const ks = KEYS.creators.filter((k) => k.group === g.id);
        const gt = TX.group(g, lang);
        return ks.length ? `<section class="kgroup"><div class="kgroup__head"><h2 class="kgroup__title">${esc(gt.name)}</h2></div>
          <p class="kgroup__desc">${esc(gt.desc)}</p><div class="kgrid">${ks.map(keyCard).join("")}</div></section>` : "";
      }).join("");
    currentList = [];
    return KEYS.creators.length;
  }
  function openTour(keyId) {
    const k = keysById[keyId];
    if (!k) return;
    const hs = k.highlights.filter((h) => worksById[h.work]);
    tour = { key: k, list: hs.map((h) => worksById[h.work]) };
    const { works, span } = keyStats(k);
    const kt = TX.key(k, lang);
    const c0 = creatorsById[k.creator_ids[0]] || {};
    const links = Object.entries(c0.links || {}).filter(([, u]) => u).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join("");
    const g = KEYS.groups.find((x) => x.id === k.group);
    $("#tourInner").innerHTML = `
      <button class="player__close mono" data-close-tour aria-label="Close">ESC ✕</button>
      <header class="tour__head">
        <div class="mono tour__eyebrow">${esc(S().key_creator)} · ${esc(g ? TX.group(g, lang).name : "")}</div>
        <h2 class="tour__name">${esc(keyName(k))}</h2>
        <p class="tour__tag">${esc(kt.tagline)}</p>
        <div class="mono tour__meta">${esc(S().works_in_gallery(works.length))} · ${span}</div>
      </header>
      <div class="tour__cols">
        <div class="tour__text"><p>${esc(kt.intro)}</p>
          <div class="note"><b>${esc(S().what_to_learn)}</b><p>${esc(kt.learn)}</p></div>
          <div class="links">${links}</div>
          <div class="tour__actions"><button class="tour__start mono" data-tour-play="0">${esc(S().start_tour(hs.length))}</button>
            <button class="tour__all mono" data-tour-all>${esc(S().all_works(works.length))}</button></div></div>
        <ol class="stops">${hs.map((h, i) => {
          const w = worksById[h.work];
          return `<li><button class="stop" data-tour-play="${i}"><span class="stop__n mono">${String(i + 1).padStart(2, "0")}</span>
            <span class="stop__media">${thumb(w)}</span>
            <span class="stop__body"><span class="stop__title">${esc(w.title)}</span>
              <span class="stop__meta mono">${w.year || ""} · ${esc(creatorNames(w).join(", "))}</span>
              <span class="stop__note">${esc(TX.note(h, lang))}</span></span></button></li>`;
        }).join("")}</ol>
      </div>`;
    if (!$("#tour").open) $("#tour").showModal();
    $("#tourInner").scrollTop = 0;
    writeHash();
  }
  const closeTour = () => { if ($("#tour").open) $("#tour").close(); };

  function render() {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.view === state.view));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-on", v.id === "view-" + state.view));
    $("#q").value = state.q;
    $("#sort").value = state.sort;
    $("#filters").hidden = ["keys", "starred", "salient", "ai", "vfx", "related"].includes(state.view);
    $("#keyOnly").setAttribute("aria-pressed", state.keyOnly);
    $("#salientOnly").setAttribute("aria-pressed", state.salientOnly);
    $("#codeOnly").setAttribute("aria-pressed", state.codeOnly);
    $("#starCount").textContent = stars.size ? stars.size : "";
    renderChips();
    const r = { keys: renderKeys, salient: renderSalient, ai: renderAi, vfx: renderVfx, related: renderRelated, works: renderWorks, creators: renderCreators, modules: renderModules, starred: renderStarred }[state.view];
    $("#empty").hidden = r() > 0;
    lazyVideos();
    writeHash();
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.src = e.target.dataset.src; e.target.preload = "metadata"; io.unobserve(e.target); } });
  }, { rootMargin: "300px" }) : null;
  function lazyVideos() {
    document.querySelectorAll("video[data-src]:not([src])").forEach((v) => (io ? io.observe(v) : (v.src = v.dataset.src)));
  }

  /* ---------- player ---------- */
  function embed(v) {
    if (v.embeddable === false) {
      return `<a class="offsite" href="${esc(v.url)}" target="_blank" rel="noopener">${v.thumbnail ? `<img src="${esc(v.thumbnail)}" alt="">` : ""}
        <span class="offsite__btn mono">${esc(S().play_on(src(v.platform)))}</span><span class="offsite__note mono">${esc(S().only_on(src(v.platform)))}</span></a>`;
    }
    switch (v.platform) {
      case "youtube": return `<iframe class="frame" src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?autoplay=1&rel=0&playsinline=1" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="Video"></iframe>`;
      case "vimeo": return `<iframe class="frame" src="https://player.vimeo.com/video/${esc(v.id)}?autoplay=1&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>`;
      case "x": {
        const light = document.documentElement.dataset.theme === "light" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: light)").matches);
        return `<iframe class="frame frame--tweet" src="https://platform.twitter.com/embed/Tweet.html?id=${esc(v.id)}&theme=${light ? "light" : "dark"}&dnt=true&lang=${lang}" allowfullscreen title="Post"></iframe>`;
      }
      case "mp4": return `<video src="${esc(v.url)}" controls autoplay playsinline></video>`;
      default: return `<a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(S().watch_on(src(v.platform)))}</a>`;
    }
  }
  function openWork(id, fromTour = false) {
    if (!fromTour) tour = $("#tour").open ? tour : null;
    const list = tour && fromTour ? tour.list : (currentList.length ? currentList : DATA.works);
    openIndex = list.findIndex((w) => w.id === id);
    const w = list[openIndex] || worksById[id];
    if (!w) return;
    $("#playerMedia").innerHTML = embed(w.video);
    fillInfo(w, fromTour);
    if (!$("#player").open) $("#player").showModal();
    writeHash(w.id);
  }
  function fillInfo(w, fromTour) {
    const t = TX.work(w, lang);
    const stop = tour && fromTour ? tour.key.highlights.find((h) => h.work === w.id) : null;
    const who = w.creator_ids.map((cid) => `<button data-creator="${esc(cid)}">${isKeyCreator(cid) ? "★ " : ""}${esc(creatorsById[cid]?.name || cid)}</button>`).join("");
    const ix = (w.interaction || []).map((i) => `<span class="tag">${esc(ixName(i))}</span>`).join("");
    const vcat = VCATS.find((c) => c.id === w.vfx_cat);
    const rcat = RCATS.find((c) => c.id === w.related_cat);
    const acat = ACATS.find((c) => c.id === w.ai_cat);
    const tech = [...(vcat ? [`${S().effect_type}: ${catName(vcat)}`] : []), ...(rcat ? [`${S().related_type}: ${catName(rcat)}`] : []), ...(acat ? [`${S().ai_type}: ${catName(acat)}`] : []), ...(w.platform || []).map((p) => S().platforms[p] || p), ...(w.tech || [])]
      .map((x) => `<span class="tag">${esc(x)}</span>`).join("");
    const note = (label, body, cls = "") => (body ? `<div class="note ${cls}"><b>${esc(label)}</b><p>${esc(body)}</p></div>` : "");
    $("#playerInfo").innerHTML = `
      ${stop ? `<div class="tour-bar mono">${esc(S().tour_bar(keyName(tour.key), openIndex + 1, tour.list.length))}</div>` : ""}
      <div class="meta">${w.year || ""} · ${src(w.video.platform)}</div>
      <h2>${esc(w.title)}</h2>
      <div class="who">${who}</div>
      ${starBtn(w.id, "star-inline mono")}
      ${stop ? note(S().why_matters, TX.note(stop, lang), "note--curator") : ""}
      ${w.salient ? note("✦ " + S().why_salient, salientWhy(w), "note--salient") : ""}
      ${t.description ? `<p>${esc(t.description)}</p>` : ""}
      ${note(S().idea, t.idea)}${note(S().technique, t.technique)}${note(S().try_it, t.exercise)}
      <div class="tags">${ix}</div><div class="tags">${tech}</div>
      ${w.code_url ? `<a class="watch watch--code" href="${esc(w.code_url)}" target="_blank" rel="noopener"><span class="mono">&lt;/&gt;</span> ${esc(S().source_code)}</a>` : ""}
      <a class="watch" href="${esc(w.video.url)}" target="_blank" rel="noopener">${esc(S().watch_on(src(w.video.platform)))}</a>
      ${w.source_url && w.source_url !== w.code_url ? `<a class="watch" href="${esc(w.source_url)}" target="_blank" rel="noopener">${esc(S().project_page)}</a>` : ""}
      ${w.found_via && w.found_via.url ? `<a class="watch watch--muted" href="${esc(w.found_via.url)}" target="_blank" rel="noopener">${esc(S().found_via(S().src_names[w.found_via.source] || w.found_via.source))}</a>` : ""}`;
    document.querySelectorAll(".star-inline").forEach((b) => { b.textContent = stars.has(w.id) ? S().starred : S().star; });
  }
  function closeWork() { $("#playerMedia").innerHTML = ""; if ($("#player").open) $("#player").close(); writeHash(); }
  function step(d) {
    const list = tourMode && tour ? tour.list : (currentList.length ? currentList : DATA.works);
    if (openIndex < 0) return;
    openWork(list[(openIndex + d + list.length) % list.length].id, tourMode);
  }

  /* ---------- stars + export ---------- */
  function toggleStar(id) {
    stars.has(id) ? stars.delete(id) : stars.add(id);
    store.set("inspire-stars", [...stars]);
    document.querySelectorAll(`[data-star="${CSS.escape(id)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", stars.has(id));
      b.textContent = b.classList.contains("star-inline") ? (stars.has(id) ? S().starred : S().star) : (stars.has(id) ? "★" : "☆");
    });
    $("#starCount").textContent = stars.size ? stars.size : "";
    if (state.view === "starred" && !$("#player").open) render();
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
  }
  function download(name, body) {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(S().downloaded(name));
  }
  let clearArmed = false;
  function doExport(kind) {
    const list = DATA.works.filter((w) => stars.has(w.id));
    if (kind === "skill") download("SKILL.md", window.InspireExport.skillMd(list, DATA, lang));
    if (kind === "readme") download("README.md", window.InspireExport.readmeMd(list, DATA, lang));
    if (kind === "copy") {
      const md = window.InspireExport.skillMd(list, DATA, lang);
      navigator.clipboard?.writeText(md).then(() => toast(S().copied), () => download("SKILL.md", md));
    }
    if (kind === "clear") {
      if (!clearArmed) { clearArmed = true; toast(S().confirm_clear); setTimeout(() => { clearArmed = false; }, 3000); return; }
      stars = new Set(); store.set("inspire-stars", []); clearArmed = false; toast(S().cleared); render();
    }
  }

  /* ---------- events ---------- */
  function setCreator(id) { state.creator = id; state.view = "works"; closeWork(); render(); window.scrollTo({ top: $("#filters").offsetTop, behavior: "smooth" }); }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.star) { toggleStar(t.dataset.star); return; }
    if (t.dataset.export) { doExport(t.dataset.export); return; }
    if (t.classList.contains("tab")) { state.view = t.dataset.view; render(); return; }
    if (t.dataset.ix) { state.ix.has(t.dataset.ix) ? state.ix.delete(t.dataset.ix) : state.ix.add(t.dataset.ix); render(); return; }
    if (t.dataset.plat) { state.plat.has(t.dataset.plat) ? state.plat.delete(t.dataset.plat) : state.plat.add(t.dataset.plat); render(); return; }
    if (t.dataset.scat !== undefined) { state.salientCat = t.dataset.scat; render(); return; }
    if (t.dataset.vcat !== undefined) { state.vfxCat = t.dataset.vcat; render(); return; }
    if (t.dataset.rcat !== undefined) { state.relCat = t.dataset.rcat; render(); return; }
    if (t.dataset.acat !== undefined) { state.aiCat = t.dataset.acat; render(); return; }
    if ("codeToggle" in t.dataset) { state.codeOnly = !state.codeOnly; render(); return; }
    if (t.dataset.era) { state.era = state.era === t.dataset.era ? "" : t.dataset.era; render(); return; }
    if (t.dataset.module) { state.ix = new Set([t.dataset.module]); state.view = "works"; render(); return; }
    if (t.dataset.tour) { openTour(t.dataset.tour); return; }
    if (t.dataset.tourPlay !== undefined && tour) { tourMode = true; openWork(tour.list[+t.dataset.tourPlay].id, true); return; }
    if ("tourAll" in t.dataset && tour) { const cid = tour.key.creator_ids[0]; closeTour(); setCreator(cid); return; }
    if ("closeTour" in t.dataset) { closeTour(); return; }
    if (t.dataset.creator) { closeTour(); setCreator(t.dataset.creator); return; }
    if ("clearCreator" in t.dataset) { state.creator = ""; render(); return; }
    if (t.classList.contains("card")) { tourMode = false; openWork(t.dataset.id); return; }
  });
  $("#clear").addEventListener("click", () => { Object.assign(state, { q: "", ix: new Set(), plat: new Set(), era: "", creator: "", keyOnly: false, salientOnly: false, codeOnly: false }); render(); });
  $("#keyOnly").addEventListener("click", () => { state.keyOnly = !state.keyOnly; render(); });
  $("#salientOnly").addEventListener("click", () => { state.salientOnly = !state.salientOnly; render(); });
  $("#codeOnly").addEventListener("click", () => { state.codeOnly = !state.codeOnly; render(); });
  let qTimer;
  $("#q").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 160); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("#playerClose").addEventListener("click", closeWork);
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));
  $("#player").addEventListener("close", () => { $("#playerMedia").innerHTML = ""; tourMode = false; writeHash(); });
  $("#player").addEventListener("click", (e) => { if (e.target.id === "player") closeWork(); });
  $("#tour").addEventListener("close", () => { tour = $("#player").open ? tour : null; writeHash(); });
  $("#tour").addEventListener("click", (e) => { if (e.target.id === "tour") closeTour(); });
  document.addEventListener("keydown", (e) => {
    if (!$("#player").open) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  $("#langToggle").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    store.set("inspire-lang", lang);
    applyStatic();
    render();
    if ($("#tour").open && tour) openTour(tour.key.id);
    if ($("#player").open) { const w = (tourMode && tour ? tour.list : currentList)[openIndex]; if (w) fillInfo(w, tourMode); }
  });
  const savedTheme = store.get("inspire-theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    store.set("inspire-theme", next);
  });

  /* ---------- init ---------- */
  applyStatic();
  const start = readHash();
  render();
  if (start.tour) openTour(start.tour);
  if (start.work) openWork(start.work);
})();
