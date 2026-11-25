(() => {
  "use strict";
  const S = window.Store;
  const $app = document.getElementById("app");
  const $sheet = document.getElementById("sheet-root");

  // ---------------- Konstanten ----------------
  const GROUPS = ["M54B30", "M57", "M43", "M54B25", "M54B22", "M47", "VW16", "VW18T"];
  const GROUP_COLOR = { M54B30: "#5b9bff", M57: "#b49cff", M43: "#2dd4bf", M54B25: "#7cb6ff", M54B22: "#a9cdff", M47: "#d4c6ff", VW16: "#fbbf24", VW18T: "#fb7185" };
  const RATING_COLOR = { 5: "var(--r5)", 4: "var(--r4)", 3: "var(--r3)", 2: "var(--r2)", 1: "var(--r1)" };
  const LABEL_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"];
  const DEFAULT_FILTERS = { maxPrice: 5000, tuv: "any", severe: false, showNo: false, source: "all" };
  const ICON = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 20l1-3h4l1 3"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M3 13l2-6a2 2 0 0 1 2-1.4h10A2 2 0 0 1 19 7l2 6v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/></svg>',
    swipe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="17" rx="3"/><path d="M3 7v10M21 7v10"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };

  // ---------------- Zustand ----------------
  const st = {
    tab: "foryou", lang: "de", data: null, idx: null,
    playlist: localStorage.getItem("g2-playlist") || "all",
    sort: localStorage.getItem("g2-sort2") || "offer",
    rateWho: "me", rateVal: "all",
    radius: localStorage.getItem("g2-radius") || "near",   // near | r300 | b | c | all
    fySeed: (Math.random() * 1e9) | 0, fyCount: 20, skipped: new Set(),
    q: "", filters: Object.assign({}, DEFAULT_FILTERS, JSON.parse(localStorage.getItem("g2-filters2") || "{}")),
    detail: null, swipeQueue: null, undo: [], lastVisit: null, listScroll: 0,
  };

  // ---------------- Helfer ----------------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (typeof u === "string" && u.startsWith("https://")) ? u : "";
  function t(key, vars) {
    let s = (I18N[st.lang] && I18N[st.lang][key]) || I18N.de[key] || key;
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }
  const fmtNum = (n) => n == null ? "–" : Number(n).toLocaleString("de-DE");
  const fmtPrice = (n) => n == null ? "–" : fmtNum(n) + " €";
  const fmtKm = (n) => n == null ? "–" : (n >= 10000 ? Math.round(n / 1000) + " Tkm" : fmtNum(n) + " km");
  function fmtDate(iso, withYear) {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleDateString(st.lang === "ar" ? "ar-EG" : "de-DE", withYear ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "2-digit", month: "2-digit" });
  }
  function ago(iso) {
    if (!iso) return t("never");
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return t("ago_min", { n: Math.max(1, m) });
    if (m < 60 * 36) return t("ago_h", { n: Math.round(m / 60) });
    return t("ago_d", { n: Math.round(m / 1440) });
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }
  function fail(e) { console.error(e); toast((e && e.message) || "Fehler"); }
  const me = () => S.me;
  const canWrite = () => !!(S.me && S.me.can_write);
  const raters = () => S.members.filter(m => m.can_write);
  const short = (m) => (m.name || m.role).slice(0, 3);

  // ---------------- Daten-Index ----------------
  function buildIndex() {
    const d = st.data;
    const idx = { car: {}, ratings: {}, labels: {}, carLabels: {}, comments: {}, events: {}, imp: {} };
    d.impressions = d.impressions || [];
    d.impressions.forEach(i => { (idx.imp[i.car_id] = idx.imp[i.car_id] || {})[i.user_id] = i; });
    d.cars.forEach(c => idx.car[c.id] = c);
    d.ratings.forEach(r => { (idx.ratings[r.car_id] = idx.ratings[r.car_id] || {})[r.user_id] = r; });
    d.labels.forEach(l => idx.labels[l.id] = l);
    d.carLabels.forEach(x => { (idx.carLabels[x.car_id] = idx.carLabels[x.car_id] || []).push(x.label_id); });
    d.comments.forEach(c => { (idx.comments[c.car_id] = idx.comments[c.car_id] || []).push(c); });
    d.events.forEach(e => { (idx.events[e.car_id] = idx.events[e.car_id] || []).push(e); });
    // Schwellen für "weit weg, aber Top-Angebot": relativ zum aktuellen Angebot,
    // 150–300 km ab den besten 6 %, über 300 km nur die besten 2 %
    // Maßstab ist der Passt-Score (Motor, Preis, km, TÜV) – nicht der reine Preisvorteil, sonst rutschen Billig-Bastler rein
    const fitOf = (c) => c.score ?? 0;
    const sc = d.cars.filter(c => c.eligible && !c.archived && !isGone(c) && !c.dup_of && !c.severe).map(fitOf).sort((a, b) => a - b);
    const q = (p) => sc.length ? sc[Math.min(sc.length - 1, Math.floor(p * sc.length))] : 999;
    idx.tB = q(0.94); idx.tC = q(0.98);
    st.idx = idx;
  }
  const zoneOf = (c) => c.zone || "B";   // ohne Entfernung: wie 150–300 behandeln
  function inRadius(c, mode = st.radius) {
    const z = zoneOf(c);
    if (mode === "near") return z === "A" || (!c.severe && ((z === "B" && (c.score ?? 0) >= st.idx.tB) || (z === "C" && (c.score ?? 0) >= st.idx.tC)));
    if (mode === "r300") return z !== "C";
    if (mode === "b") return z === "B";
    if (mode === "c") return z === "C";
    return true;
  }
  const isFarPick = (c) => st.radius === "near" && zoneOf(c) !== "A";
  const farTag = (c) => isFarPick(c) ? `<span class="tag far">↗ ${esc(t("far_pick"))}</span>` : "";
  const myRating = (id) => { const r = (st.idx.ratings[id] || {})[me().user_id]; return r ? r.rating : null; };
  const ratingOf = (id, uid) => { const r = (st.idx.ratings[id] || {})[uid]; return r ? r.rating : null; };

  function carTitle(c) {
    if (c.make === "BMW" && c.series && c.variant) {
      const compact = /ti$/i.test(c.variant) || /compact|kompakt/i.test(c.title || "");
      const body = compact ? " Compact" : /touring|kombi/i.test(c.body || "") ? " Touring" : /coup/i.test(c.body || "") ? " Coupé" : /cabrio/i.test(c.body || "") ? " Cabrio" : "";
      return `${c.series} ${c.variant}${body}`;
    }
    return (c.title || "").replace(/\s+/g, " ").trim();
  }
  const isGone = (c) => c.status === "deleted";
  const isNew = (c) => c.first_seen && (Date.now() - new Date(c.first_seen).getTime()) < 48 * 3600e3;
  function priceDelta(c) {
    const h = c.price_history || [];
    if (h.length < 2 || c.price_eur == null) return 0;
    const first = h[0][1];
    return first ? c.price_eur - first : 0;
  }
  function huLeft(c) {
    if (!c.hu) return null;
    if (c.hu === "neu") return 24;
    if (c.hu === "abgelaufen") return -1;
    const [y, m] = c.hu.split("-").map(Number);
    if (!y) return null;
    const now = new Date();
    return (y - now.getFullYear()) * 12 + ((m || 6) - (now.getMonth() + 1));
  }
  function combinedScore(c) {
    let s = c.offer_score ?? c.score ?? 0;
    const rs = st.idx.ratings[c.id] || {};
    for (const uid in rs) s += { 5: 22, 4: 11, 3: 3, 2: -10, 1: -35 }[rs[uid].rating] || 0;
    return s;
  }

  // ---------------- Filter ----------------
  function inBase(c, playlist, radius = st.radius) {
    const f = st.filters;
    if (c.dup_of && st.idx.car[c.dup_of]) return false;
    if (playlist === "archive") return c.archived || isGone(c) || (!c.eligible && !c.manual);
    if (c.archived || isGone(c)) return false;
    if (!c.eligible && !c.manual) return false;
    if (playlist === "problems") return !!c.severe;
    if (c.severe && !f.severe) return false;
    if (radius && !inRadius(c, radius)) return false;
    if (f.maxPrice < 5000 && c.price_eur != null && c.price_eur > f.maxPrice) return false;
    if (f.tuv !== "any") { const l = huLeft(c); if (l == null || l < (f.tuv === "12" ? 12 : 0)) return false; }
    if (f.source !== "all" && c.source !== f.source) return false;
    if (!f.showNo && canWrite() && myRating(c.id) === 1 && playlist !== "unrated") return false;
    return true;
  }
  function inPlaylist(c, p) {
    if (p === "all" || p === "archive" || p === "problems") return true;
    if (p === "fav") { const rs = st.idx.ratings[c.id] || {}; return Object.values(rs).some(r => r.rating >= 4); }
    if (p === "unrated") return myRating(c.id) == null;
    if (p.startsWith("label:")) return (st.idx.carLabels[c.id] || []).includes(Number(p.slice(6)));
    return c.engine_group === p;
  }
  function matchQuery(c, q) {
    if (!q) return true;
    const hay = [c.title, c.series, c.variant, c.engine_code, c.engine_group, c.location_text, c.zip, c.body, c.make, c.model].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }
  function rateOk(c) {
    if (st.rateVal === "all") return true;
    const uid = st.rateWho === "me" ? me().user_id : st.rateWho;
    const r = ratingOf(c.id, uid);
    return st.rateVal === "none" ? r == null : r === Number(st.rateVal);
  }
  function visibleCars(playlist = st.playlist, withRate = true) {
    const list = st.data.cars.filter(c => inBase(c, playlist) && inPlaylist(c, playlist) && matchQuery(c, st.q) && (!withRate || rateOk(c)));
    const by = {
      offer: (a, b) => (b.offer_score ?? b.score ?? 0) - (a.offer_score ?? a.score ?? 0),
      score: (a, b) => combinedScore(b) - combinedScore(a),
      new: (a, b) => (b.first_seen || "").localeCompare(a.first_seen || ""),
      price: (a, b) => (a.price_eur ?? 1e9) - (b.price_eur ?? 1e9),
      dist: (a, b) => (a.dist_km ?? 1e9) - (b.dist_km ?? 1e9),
      km: (a, b) => (a.mileage_km ?? 1e9) - (b.mileage_km ?? 1e9),
    }[st.sort] || ((a, b) => 0);
    return list.sort(by);
  }
  const activeFilterCount = () => Object.keys(DEFAULT_FILTERS).filter(k => st.filters[k] !== DEFAULT_FILTERS[k]).length;

  // ---------------- Bausteine ----------------
  function engineChip(c) {
    if (!c.engine_group) return `<span class="engine none">${esc(c.engine_code || t("group_none"))}</span>`;
    const name = t("group_" + c.engine_group) !== "group_" + c.engine_group ? t("group_" + c.engine_group) : c.engine_group;
    const unsure = c.engine_confidence !== "sicher" ? " unsure" : "";
    return `<span class="engine${unsure}" style="background:${GROUP_COLOR[c.engine_group] || "#ccc"}">${esc(name)}</span>`;
  }
  function autoLabelText(l) {
    const k = l.key;
    if (k === "hu") {
      if (l.text === "TÜV neu") return t("lbl_hu_new");
      if (l.text === "TÜV ?") return t("lbl_hu_none");
      if (l.text === "TÜV abgelaufen") return t("lbl_hu_exp");
      return t("lbl_hu", { d: l.text.replace(/^TÜV\s*/, "") });
    }
    if (k === "preis") return t(l.text === "Top-Preis" ? "lbl_preis_top" : l.text === "Über Budget" ? "lbl_preis_over" : "lbl_preis_hoch");
    if (k === "markt") return t(l.tone === "good" ? "lbl_markt_good" : "lbl_markt_bad");
    if (k === "km") return t(l.text === "Wenig km" ? "lbl_km_low" : "lbl_km_high");
    if (k === "unfall" && l.text === "Beschädigt") return t("lbl_beschaedigt");
    const v = t("lbl_" + k);
    return v === "lbl_" + k ? l.text : v;
  }
  const labelName = (l) => (st.lang === "ar" && l.name_ar) ? l.name_ar : l.name;
  function tagsHtml(c, max) {
    const out = [];
    if (isNew(c)) out.push(`<span class="tag good">${esc(t("lbl_new"))}</span>`);
    (st.idx.carLabels[c.id] || []).forEach(id => {
      const l = st.idx.labels[id];
      if (l) out.push(`<span class="tag custom" style="background:${esc(l.color)}">${esc(labelName(l))}</span>`);
    });
    const order = { bad: 0, warn: 1, good: 2, info: 3 };
    (c.auto_labels || []).filter(l => !(l.key === "zone" || (l.key === "markt" && c.expected_price))).sort((a, b) => order[a.tone] - order[b.tone])
      .forEach(l => out.push(`<span class="tag ${esc(l.tone)}">${esc(autoLabelText(l))}</span>`));
    return out.slice(0, max || 99).join("");
  }
  function raterDots(c) {
    return raters().map(m => {
      const r = ratingOf(c.id, m.user_id);
      return r ? `<span class="rdot" style="background:${RATING_COLOR[r]};border-color:transparent" title="${esc(m.name)}">${esc(short(m))}</span>` : "";
    }).join("");
  }
  const firstImg = (c) => safeUrl((c.images || [])[0]);

  function cardHtml(c, i) {
    const rank = (typeof i === "number" && st.sort === "offer") ? `<span class="rank num">${i + 1}</span>` : "";
    const img = firstImg(c);
    const d = priceDelta(c);
    const gone = isGone(c);
    const stamp = gone ? t("st_deleted") : c.status === "reserved" ? t("st_reserved") : c.archived ? t("st_archived") : "";
    return `<article class="card${gone ? " is-gone" : ""}" data-id="${esc(c.id)}">
      <div class="thumb">${img ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt="">` : `<div class="noimg">—</div>`}
        <div class="raters">${raterDots(c)}</div>${rank}${stamp ? `<div class="stamp">${esc(stamp)}</div>` : ""}</div>
      <div class="c-body">
        <div class="c-head"><div class="c-title">${esc(carTitle(c))}</div>
          <div class="c-price num">${esc(fmtPrice(c.price_eur))}${d ? `<small class="${d < 0 ? "down" : "up"}">${d < 0 ? "↓ " : "↑ "}${esc(fmtNum(Math.abs(d)))} €</small>` : ""}</div></div>
        <div class="c-facts">${engineChip(c)}<span class="num"><b>${esc(fmtKm(c.mileage_km))}</b></span><span class="num">· ${esc(c.year || "–")}</span>
          <span class="num">· ${c.dist_km != null ? esc(c.dist_km + " km") : "? km"}</span></div>
        <div class="tags">${farTag(c)}${dealHtml(c)}${tagsHtml(c, 6)}</div>
      </div></article>`;
  }

  // ---------------- Render: Rahmen ----------------
  function render() {
    document.documentElement.lang = st.lang;
    document.documentElement.dir = st.lang === "ar" ? "rtl" : "ltr";
    const tabs = [["foryou", ICON.spark, t("tab_foryou")], ["cars", ICON.trophy, t("tab_top")]];
    if (canWrite()) tabs.push(["swipe", ICON.swipe, t("tab_swipe")]);
    tabs.push(["feed", ICON.bell, t("tab_feed")], ["more", ICON.more, t("tab_more")]);
    const unread = feedItems().filter(i => st.lastVisit && i.at > st.lastVisit).length;
    $app.innerHTML = `<div id="view"></div>
      <nav class="tabbar">${tabs.map(([k, ic, lab]) => `<button data-tab="${k}" class="${st.tab === k ? "on" : ""}">${ic}<span>${esc(lab)}</span>${k === "feed" && unread ? `<span class="badge">${unread > 99 ? "99+" : unread}</span>` : ""}</button>`).join("")}</nav>`;
    $app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    ({ foryou: renderForYou, cars: renderCars, swipe: renderSwipe, feed: renderFeed, more: renderMore })[st.tab]();
  }
  function switchTab(tab) {
    if (st.tab === "cars") st.listScroll = window.scrollY;
    st.tab = tab;
    if (tab === "swipe") st.swipeQueue = null;
    render();
    window.scrollTo(0, tab === "cars" ? st.listScroll : 0);
    if (tab === "feed") markVisited();
  }
  function lastRunText() {
    const r = (st.data.runs || [])[0];
    return r ? `${t("last_run")}: ${ago(r.finished_at)}` : "";
  }

  // ---------------- Umkreis-Umschalter (oben in Für dich / Top / Eindruck) ----------------
  // "Nah" = bis 150 km + die besten Angebote von weiter weg (markiert mit ↗)
  const RADIUS_MODES = [["near", "rad_near"], ["r300", "rad_300"], ["b", "rad_b"], ["c", "rad_c"], ["all", "rad_all"]];
  function radiusBarHtml(countFn) {
    return `<div class="radbar" role="tablist">${RADIUS_MODES.map(([k, key]) => {
      const n = countFn ? countFn(k) : null;
      return `<button data-rad="${k}" class="${st.radius === k ? "on" : ""}"><bdi dir="ltr">${esc(t(key))}</bdi>${n != null ? `<span class="cnt">${n}</span>` : ""}</button>`;
    }).join("")}</div>`;
  }
  function bindRadius(view, rerender) {
    view.querySelectorAll("[data-rad]").forEach(b => b.onclick = () => {
      st.radius = b.dataset.rad; localStorage.setItem("g2-radius", st.radius);
      st.swipeQueue = null; st.fyCount = 20;
      rerender(); window.scrollTo(0, 0);
    });
  }

  // ---------------- Render: Top-Liste ----------------
  // Bewertungs-Filter: wessen Bewertung (ich / der andere) und welche Stufe
  function rateRowHtml() {
    const rs = raters();
    if (!rs.length) return "";
    const opts = canWrite()
      ? [["me", t("rated_me")]].concat(rs.filter(m => m.user_id !== me().user_id).map(m => [m.user_id, m.name]))
      : rs.map(m => [m.user_id, m.name]);
    const whoBtns = opts.length > 1
      ? `<div class="seg mini">${opts.map(([k, l]) => `<button data-rw="${esc(k)}" class="${st.rateWho === k ? "on" : ""}">${esc(l)}</button>`).join("")}</div>` : "";
    const vals = [["all", t("all")], ["5", t("r5")], ["4", t("r4")], ["3", t("r3")], ["2", t("r2")], ["1", t("r1")], ["none", t("not_rated_short")]];
    return `<div class="raterow">${whoBtns}<div class="chips rchips">${vals.map(([k, l]) =>
      `<button class="chip${st.rateVal === k ? " on" : ""}" data-rv="${k}">${RATING_COLOR[k] ? `<i class="dot" style="background:${RATING_COLOR[k]}"></i>` : ""}${esc(l)}</button>`).join("")}</div></div>`;
  }
  function renderCars() {
    if (!canWrite() && st.rateWho === "me" && raters()[0]) st.rateWho = raters()[0].user_id;
    const view = document.getElementById("view");
    const chips = [["all", t("all")], ["fav", "★ " + t("favorites")]];
    if (canWrite()) chips.push(["unrated", t("unrated")]);
    GROUPS.forEach(g => chips.push([g, t("group_" + g) !== "group_" + g ? t("group_" + g) : g]));
    st.data.labels.forEach(l => chips.push(["label:" + l.id, labelName(l), l.color]));
    chips.push(["problems", t("problems")], ["archive", t("archive")]);
    const counts = {};
    chips.forEach(([k]) => counts[k] = visibleCars(k).length);
    const cars = visibleCars();
    const nf = activeFilterCount();
    view.innerHTML = `<header class="top">
        <div class="top-row"><div class="brand">GARAGE<span>/</span>02</div><div class="top-meta">${esc(lastRunText())}</div></div>
        <div class="searchbar"><input class="input" id="q" type="search" placeholder="${esc(t("search"))}" value="${esc(st.q)}">
          <button class="icon-btn" id="filterbtn" aria-label="${esc(t("filters"))}">${ICON.filter}${nf ? `<span class="badge">${nf}</span>` : ""}</button></div>
        ${radiusBarHtml((m) => st.data.cars.filter(c => inBase(c, st.playlist, m) && inPlaylist(c, st.playlist) && matchQuery(c, st.q) && rateOk(c)).length)}
        <div class="chips">${chips.filter(([k]) => counts[k] > 0 || ["all", "fav", "unrated"].includes(k) || k === st.playlist).map(([k, lab, col]) =>
          `<button class="chip${st.playlist === k ? " on" : ""}" data-pl="${esc(k)}">${col ? `<i class="dot" style="background:${esc(col)}"></i>` : GROUP_COLOR[k] ? `<i class="dot" style="background:${GROUP_COLOR[k]}"></i>` : ""}${esc(lab)} <span class="cnt">${counts[k]}</span></button>`).join("")}</div>
        ${rateRowHtml()}
        <div class="sortrow"><span>${esc(t("cars_count", { n: cars.length }))}</span>
          <select id="sort">${[["offer", t("sort_offer")], ["score", t("sort_score")], ["new", t("sort_new")], ["price", t("sort_price")], ["dist", t("sort_dist")], ["km", t("sort_km")]].map(([k, l]) => `<option value="${k}"${st.sort === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      </header>
      <main class="content">${S.mode === "demo" ? `<div class="demo-banner">${esc(t("demo_mode"))} · ${esc(me().name)}</div>` : ""}
        <div id="list">${cars.length ? cars.map((c, i) => cardHtml(c, i)).join("") : `<div class="empty-state">—</div>`}</div></main>`;
    const q = view.querySelector("#q");
    q.oninput = () => { st.q = q.value; const l = visibleCars(); view.querySelector("#list").innerHTML = l.map((c, i) => cardHtml(c, i)).join("") || `<div class="empty-state">—</div>`; view.querySelector(".sortrow span").textContent = t("cars_count", { n: l.length }); };
    view.querySelector("#sort").onchange = (e) => { st.sort = e.target.value; localStorage.setItem("g2-sort2", st.sort); renderCars(); };
    view.querySelectorAll("[data-rw]").forEach(b => b.onclick = () => { st.rateWho = b.dataset.rw; renderCars(); });
    view.querySelectorAll("[data-rv]").forEach(b => b.onclick = () => { st.rateVal = b.dataset.rv; renderCars(); });
    view.querySelector("#filterbtn").onclick = openFilters;
    bindRadius(view, renderCars);
    view.querySelectorAll("[data-pl]").forEach(b => b.onclick = () => { st.playlist = b.dataset.pl; localStorage.setItem("g2-playlist", st.playlist); renderCars(); window.scrollTo(0, 0); });
    view.querySelector("#list").onclick = (e) => { const a = e.target.closest(".card"); if (a) openDetail(a.dataset.id); };
    const on = view.querySelector(".chip.on"); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
  }

  // ---------------- Filter-Sheet ----------------
  function sheet(html, onMount) {
    $sheet.innerHTML = `<div class="sheet-bg"></div><div class="sheet"><div class="grab"></div>${html}</div>`;
    const close = () => { $sheet.innerHTML = ""; };
    $sheet.querySelector(".sheet-bg").onclick = close;
    if (onMount) onMount($sheet.querySelector(".sheet"), close);
    return close;
  }
  function openFilters() {
    const f = Object.assign({}, st.filters);
    const draw = (el) => {
      el.innerHTML = `<div class="grab"></div><h2>${esc(t("filters"))}</h2>
        <div class="field"><span>${esc(t("max_price"))}: <b class="num" id="pv">${esc(fmtPrice(f.maxPrice))}</b></span>
          <div class="range-row"><input type="range" min="1000" max="5000" step="250" value="${f.maxPrice}" id="pr"></div></div>
        <div class="field"><span>${esc(t("tuv"))}</span><div class="seg" data-k="tuv">
          <button data-v="any" class="${f.tuv === "any" ? "on" : ""}">${esc(t("tuv_any"))}</button><button data-v="valid" class="${f.tuv === "valid" ? "on" : ""}">${esc(t("tuv_valid"))}</button><button data-v="12" class="${f.tuv === "12" ? "on" : ""}">${esc(t("tuv_12"))}</button></div></div>
        <div class="field"><span>${esc(t("source"))}</span><div class="seg" data-k="source">
          ${[["all", t("all")], ["kleinanzeigen", "Kleinanz."], ["mobile.de", "mobile"], ["autoscout24", "Scout24"]].map(([v, l]) => `<button data-v="${v}" class="${f.source === v ? "on" : ""}">${esc(l)}</button>`).join("")}</div></div>
        <div class="toggle-row"><span>${esc(t("show_severe"))}</span><button class="switch${f.severe ? " on" : ""}" data-sw="severe"></button></div>
        ${canWrite() ? `<div class="toggle-row"><span>${esc(t("show_no"))}</span><button class="switch${f.showNo ? " on" : ""}" data-sw="showNo"></button></div>` : ""}
        <div class="d-actions"><button class="btn" id="fr">${esc(t("reset"))}</button><button class="btn btn-primary" id="fa">${esc(t("apply"))}</button></div>`;
      el.querySelectorAll(".seg").forEach(s => s.querySelectorAll("button").forEach(b => b.onclick = () => { f[s.dataset.k] = b.dataset.v; draw(el); }));
      el.querySelectorAll("[data-sw]").forEach(b => b.onclick = () => { f[b.dataset.sw] = !f[b.dataset.sw]; draw(el); });
      const pr = el.querySelector("#pr"); pr.oninput = () => { f.maxPrice = Number(pr.value); el.querySelector("#pv").textContent = fmtPrice(f.maxPrice); };
      el.querySelector("#fr").onclick = () => { Object.assign(f, DEFAULT_FILTERS); draw(el); };
      el.querySelector("#fa").onclick = () => { st.filters = f; localStorage.setItem("g2-filters2", JSON.stringify(f)); $sheet.innerHTML = ""; render(); };
    };
    sheet("", (el) => draw(el));
  }

  // ---------------- Detail ----------------
  const HL = [
    ["bad", /(rost\w*|durchgerostet|unfall\w*|defekt\w*|motorschaden|getriebeschaden|kopfdichtung|ölverlust|undicht\w*|kaputt|ausgefallen|abgemeldet|ohne t[üu]v|kein(en)? t[üu]v|bastler|export|leuchtet|fehlermeldung|beschädigt|delle\w*|kratzer)/gi],
    ["good", /(scheckheft\w*|rechnung\w*|belege|unfallfrei|rostfrei|garage\w*|t[üu]v neu|hu neu|neu(e|er|es)? (kupplung|bremsen|reifen|wasserpumpe|batterie|steuerkette|zahnriemen)|erneuert|gewechselt|getauscht|1\. hand|erste hand|nichtraucher)/gi],
  ];
  function highlight(text) {
    let s = esc(text);
    HL.forEach(([cls, rx]) => { s = s.replace(rx, (m) => `<mark class="${cls}">${m}</mark>`); });
    s = s.replace(/<mark class="bad">(rost)(frei)<\/mark>/gi, '<mark class="good">$1$2</mark>');
    return s;
  }
  function eventText(e) {
    const k = "ev_" + e.kind;
    if (e.kind === "price") return `${t(k)}: ${fmtPrice(Number(e.old))} → ${fmtPrice(Number(e.new))}`;
    if (e.kind === "mileage") return `${t(k)}: ${fmtNum(Number(e.old))} → ${fmtNum(Number(e.new))} km`;
    if (e.kind === "hu") return `${t(k)}: ${e.old || "?"} → ${e.new || "?"}`;
    if (e.kind === "new" && e.new) return `${t(k)} · ${fmtPrice(Number(e.new))}`;
    return t(k);
  }
  function openDetail(id) {
    const c = st.idx.car[id];
    if (!c) return;
    st.detail = { id, extra: null, descOpen: false };
    history.pushState({ detail: id }, "");
    drawDetail();
    S.loadCarDetail(id).then(x => { if (st.detail && st.detail.id === id) { st.detail.extra = x; drawDetail(true); } }).catch(fail);
  }
  function closeDetail(fromPop) {
    const el = document.querySelector(".detail");
    if (el) el.remove();
    st.detail = null;
    if (!fromPop && history.state && history.state.detail) history.back();
    if (st.tab === "cars") renderCars(); else if (st.tab === "feed") renderFeed(); else if (st.tab === "foryou") { const y = window.scrollY; renderForYou(); window.scrollTo(0, y); }
  }
  window.addEventListener("popstate", () => { if (st.detail) closeDetail(true); });

  function drawDetail(keepScroll) {
    const c = st.idx.car[st.detail.id];
    if (!c) return;
    let el = document.querySelector(".detail");
    const scroll = el && keepScroll ? el.scrollTop : 0;
    if (!el) { el = document.createElement("div"); el.className = "detail"; document.body.appendChild(el); }
    const x = st.detail.extra || {};
    const imgs = (c.images || []).map(safeUrl).filter(Boolean);
    const url = safeUrl(c.url);
    const ph = c.price_history || [];
    const d = priceDelta(c);
    const conf = c.engine_confidence ? t("conf_" + c.engine_confidence) : "";
    const myR = myRating(c.id);
    const others = raters().filter(m => m.user_id !== me().user_id);
    const comments = st.idx.comments[c.id] || [];
    const evs = (st.idx.events[c.id] || []).slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const myLabels = st.idx.carLabels[c.id] || [];
    const nameOf = (uid) => (S.members.find(m => m.user_id === uid) || {}).name || "?";
    const legacy = c.legacy || x.legacy;
    el.innerHTML = `
      <div class="d-bar"><button class="icon-btn" id="dback" aria-label="zurück">${ICON.back}</button>
        <div class="t">${esc(carTitle(c))}</div>
        ${url ? `<a class="d-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t("open_listing"))} ${ICON.ext}</a>` : ""}</div>
      <div class="g-count"><div class="gallery" id="gal">${imgs.length ? imgs.map((u, i) => `<img src="${esc(u)}" referrerpolicy="no-referrer" ${i > 1 ? 'loading="lazy"' : ""} alt="">`).join("") : `<div class="noimg">—</div>`}</div>
        ${imgs.length > 1 ? `<span id="gc">1 / ${imgs.length}</span>` : ""}</div>
      <div class="d-main">
        <div class="tags" style="margin-bottom:8px">${engineChip(c)}</div>
        <div class="d-title">${esc(c.title || carTitle(c))}</div>
        <div class="d-pricerow"><div class="d-price num">${esc(fmtPrice(c.price_eur))}${c.price_type === "VB" ? ' <small style="font-size:15px;color:var(--muted)">VB</small>' : ""}</div>
          ${d ? `<div class="d-pricehist ${d < 0 ? "down" : "up"}">${d < 0 ? "↓" : "↑"} ${esc(fmtNum(Math.abs(d)))} € · ${esc(ph.map(p => fmtNum(p[1])).join(" → "))}</div>` : ""}</div>
        ${isGone(c) ? `<div class="d-status">${esc(t("st_deleted"))}${c.deleted_at ? " · " + esc(fmtDate(c.deleted_at, true)) : ""}</div>` : c.status === "reserved" ? `<div class="d-status" style="color:var(--warn);background:rgba(251,191,36,.12)">${esc(t("st_reserved"))}</div>` : ""}
        ${(c.also_on || []).length ? `<div class="tags" style="margin-top:8px">${c.also_on.map(a => safeUrl(a.url) ? `<a class="tag" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(t("also_on"))} ${esc(a.source)}${a.price ? " · " + esc(fmtPrice(a.price)) : ""} ↗</a>` : "").join("")}</div>` : ""}
        ${!c.eligible && (c.exclude_reasons || []).length ? `<div class="excluded">${esc(t("excluded"))}: ${esc(c.exclude_reasons.join(", "))}</div>` : ""}
        ${c.expected_price ? `<div class="market"><div><small>${esc(t("market_value"))}</small><b class="num">≈ ${esc(fmtPrice(c.expected_price))}</b></div>
          <div>${dealHtml(c, true)}</div><div><small>${esc(t("offer_score"))}</small><b class="num">${esc(c.offer_score ?? "–")}</b></div></div>` : ""}
        <div class="tags" style="margin-top:10px">${tagsHtml(c)}</div>
        ${canWrite() && myImpression(c.id) != null ? `<div class="imp-line">${esc(t("your_impression"))}: <b>${esc(t({ "-1": "imp_no", "1": "imp_yes", "2": "imp_top" }[myImpression(c.id)]))}</b>
          <button class="linkbtn" id="impclear" style="margin:0 0 0 8px;font-size:13px">${esc(t("reset"))}</button></div>` : ""}

        <section class="box"><h3>${esc(canWrite() ? t("my_rating") : t("ratings"))}</h3>
          ${canWrite() ? `<div class="rate-row">${[5, 4, 3, 2, 1].map(r => `<button class="rate-btn${myR === r ? " on" : ""}" data-rate="${r}" style="${myR === r ? "color:" + RATING_COLOR[r] : ""}"><i style="background:${RATING_COLOR[r]}"></i>${esc(t("r" + r))}</button>`).join("")}</div>` : ""}
          ${(canWrite() ? others : raters()).map(m => { const r = ratingOf(c.id, m.user_id); return `<div class="other-rating"><b>${esc(m.name)}:</b> ${r ? `<span class="pill" style="background:${RATING_COLOR[r]}">${esc(t("r" + r))}</span>` : esc(t("not_rated"))}</div>`; }).join("")}
        </section>

        <section class="box"><h3>${esc(t("facts"))}</h3><div class="facts">
          <div><small>${esc(t("f_engine"))}</small><b>${esc(c.engine_code || "–")}</b>${conf ? `<small style="margin-top:2px">${esc(conf)}${c.engine_note ? " · " + esc(c.engine_note) : ""}</small>` : ""}</div>
          <div><small>${esc(t("f_power"))}</small><b class="num">${c.power_hp ? esc(c.power_hp + " PS") : "–"}</b></div>
          <div><small>${esc(t("f_reg"))}</small><b class="num">${esc(c.first_reg ? c.first_reg.split("-").reverse().join("/") : "–")}</b></div>
          <div><small>${esc(t("f_km"))}</small><b class="num">${esc(c.mileage_km != null ? fmtNum(c.mileage_km) + " km" : "–")}</b></div>
          <div><small>${esc(t("f_hu"))}</small><b class="num">${esc(c.hu === "neu" ? t("lbl_hu_new") : c.hu === "abgelaufen" ? t("lbl_hu_exp") : c.hu ? c.hu.split("-").reverse().join("/") : "–")}</b></div>
          <div><small>${esc(t("f_trans"))}</small><b>${esc(c.transmission === "manuell" ? t("manual") : c.transmission === "automatik" ? t("automatic") : "–")}</b></div>
          <div><small>${esc(t("f_body"))}</small><b>${esc(c.body || "–")}</b></div>
          <div><small>${esc(t("f_fuel"))}</small><b>${esc(c.fuel || "–")}</b></div>
          <div class="wide"><small>${esc(t("f_location"))}</small><b>${esc([c.zip, c.location_text].filter(Boolean).join(" ") || "–")}</b>
            <small style="margin-top:2px">${c.dist_km != null ? esc(t("km_away", { n: c.dist_km })) : esc(t("unknown"))}</small></div>
          <div><small>${esc(t("f_seller"))}</small><b>${esc(c.seller_type === "privat" ? t("private") : c.seller_type ? t("dealer") : "–")}</b></div>
          <div><small>${esc(t("f_source"))}</small><b>${esc(c.source || "–")}</b></div>
          <div><small>${esc(t("f_seen"))}</small><b class="num">${esc(fmtDate(c.first_seen, true))}</b></div>
          <div><small>${esc(t("f_checked"))}</small><b class="num">${esc(c.last_checked ? ago(c.last_checked) : "–")}</b></div>
          <div><small>${esc(t("f_score"))}</small><b class="num">${esc(c.score ?? "–")}</b></div>
        </div></section>

        <section class="box"><h3>${esc(t("labels"))}</h3><div class="label-edit">
          ${st.data.labels.map(l => { const on = myLabels.includes(l.id); return `<button class="label-toggle${on ? " on" : ""}" data-lab="${l.id}" style="${on ? `background:${esc(l.color)};border-color:${esc(l.color)}` : ""}" ${canWrite() ? "" : "disabled"}>${esc(labelName(l))}</button>`; }).join("")}
          ${canWrite() ? `<button class="label-toggle" id="newlab">＋ ${esc(t("new_label"))}</button>` : ""}</div></section>

        <section class="box"><h3>${esc(t("notes"))}</h3>
          ${comments.map(cm => `<div class="comment"><small>${esc(nameOf(cm.user_id))} · ${esc(fmtDate(cm.created_at, true))}${cm.user_id === me().user_id ? ` · <button class="linkbtn" style="margin:0;font-size:12px" data-delc="${cm.id}">${esc(t("delete"))}</button>` : ""}</small>${esc(cm.body)}</div>`).join("") || ""}
          ${canWrite() ? `<form class="comment-form" id="cform"><input class="input" id="ctext" placeholder="${esc(t("add_note"))}" maxlength="2000"><button class="btn btn-primary" type="submit">${esc(t("send"))}</button></form>` : ""}</section>

        <section class="box"><h3>${esc(t("description"))}</h3>
          ${x.description == null ? `<div class="desc" style="color:var(--muted)">…</div>` :
            `<div class="desc${st.detail.descOpen ? "" : " clamp"}" id="desc">${highlight(x.description || "–")}</div>
             ${(x.description || "").length > 380 ? `<button class="linkbtn" id="dmore">${esc(st.detail.descOpen ? t("show_less") : t("show_more"))}</button>` : ""}`}
        </section>

        ${legacy ? `<section class="box"><h3>${esc(t("legacy"))}</h3><div class="desc">${esc([legacy.known_issues, legacy.notes, legacy.open_questions, legacy.research_assessment].filter(Boolean).join("\n\n"))}</div></section>` : ""}

        ${evs.length ? `<section class="box"><h3>${esc(t("history"))}</h3><ul class="timeline">${evs.map(e => `<li><time class="num">${esc(fmtDate(e.at, true))}</time><span>${esc(eventText(e))}</span></li>`).join("")}</ul></section>` : ""}

        <div class="d-actions">
          ${canWrite() ? `<button class="btn" id="arch">${esc(c.archived ? t("unarchive_car") : t("archive_car"))}</button>` : ""}
          ${navigator.share && url ? `<button class="btn" id="share">${esc(t("share"))}</button>` : ""}
        </div>
      </div>`;
    el.scrollTop = scroll;
    el.querySelector("#dback").onclick = () => closeDetail();
    const gal = el.querySelector("#gal"), gc = el.querySelector("#gc");
    if (gal && gc) gal.onscroll = () => { gc.textContent = `${Math.round(Math.abs(gal.scrollLeft) / gal.clientWidth) + 1} / ${imgs.length}`; };
    el.querySelectorAll("[data-rate]").forEach(b => b.onclick = () => rate(c.id, Number(b.dataset.rate) === myR ? null : Number(b.dataset.rate)).then(() => drawDetail(true)));
    el.querySelectorAll("[data-lab]").forEach(b => b.onclick = () => toggleLabel(c.id, Number(b.dataset.lab)));
    const nl = el.querySelector("#newlab"); if (nl) nl.onclick = () => labelEditor(null, (l) => toggleLabel(c.id, l.id, true));
    const cf = el.querySelector("#cform"); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const v = el.querySelector("#ctext").value.trim(); if (v) addComment(c.id, v); };
    el.querySelectorAll("[data-delc]").forEach(b => b.onclick = () => delComment(Number(b.dataset.delc)));
    const dm = el.querySelector("#dmore"); if (dm) dm.onclick = () => { st.detail.descOpen = !st.detail.descOpen; drawDetail(true); };
    const ic = el.querySelector("#impclear"); if (ic) ic.onclick = () => impress(c.id, null).then(() => drawDetail(true));
    const ar = el.querySelector("#arch"); if (ar) ar.onclick = () => archive(c.id, !c.archived);
    const sh = el.querySelector("#share"); if (sh) sh.onclick = () => navigator.share({ title: carTitle(c), url }).catch(() => { });
  }

  // ---------------- Aktionen ----------------
  async function rate(carId, rating) {
    const prev = myRating(carId);
    const uid = me().user_id;
    st.data.ratings = st.data.ratings.filter(r => !(r.car_id === carId && r.user_id === uid));
    if (rating != null) st.data.ratings.push({ car_id: carId, user_id: uid, rating, updated_at: new Date().toISOString() });
    buildIndex();
    try { await S.setRating(carId, rating); } catch (e) { fail(e); }
    return prev;
  }
  async function toggleLabel(carId, labelId, forceOn) {
    const has = (st.idx.carLabels[carId] || []).includes(labelId);
    const on = forceOn != null ? forceOn : !has;
    if (on === has) { drawDetail(true); return; }
    st.data.carLabels = st.data.carLabels.filter(x => !(x.car_id === carId && x.label_id === labelId));
    if (on) st.data.carLabels.push({ car_id: carId, label_id: labelId });
    buildIndex(); if (st.detail) drawDetail(true);
    try { await S.toggleCarLabel(carId, labelId, on); } catch (e) { fail(e); }
  }
  async function addComment(carId, body) {
    try { const c = await S.addComment(carId, body); st.data.comments.push(c); buildIndex(); drawDetail(true); } catch (e) { fail(e); }
  }
  async function delComment(id) {
    try { await S.deleteComment(id); st.data.comments = st.data.comments.filter(c => c.id !== id); buildIndex(); drawDetail(true); } catch (e) { fail(e); }
  }
  async function archive(carId, a) {
    st.idx.car[carId].archived = a;
    try { await S.setArchived(carId, a); toast(t("saved")); } catch (e) { fail(e); }
    drawDetail(true);
  }
  // Übersetzung für Label-Namen – kostenlos, ohne Konto/Schlüssel:
  // 1. Google Übersetzer (freie Web-Schnittstelle), 2. Ersatz: Maschinen-Übersetzung von MyMemory.
  // Nur ein Vorschlag – das zweite Feld bleibt editierbar und ist Pflicht.
  async function translate(text, from, to) {
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`);
      const j = await r.json();
      const out = (j && j[0] || []).map(p => p[0]).join("").trim();
      if (out) return out;
    } catch (e) { /* weiter mit Ersatz */ }
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const j = await r.json();
    const mt = (j.matches || []).find(m => m["created-by"] === "MT!");   // menschliche Treffer dort sind oft unpassend
    return mt ? String(mt.translation || "").trim() : "";
  }
  function labelEditor(label, onDone) {
    let color = label ? label.color : LABEL_COLORS[st.data.labels.length % LABEL_COLORS.length];
    // Erst die eigene Sprache, darunter automatisch die andere
    const mine = st.lang === "ar" ? "ar" : "de", other = mine === "ar" ? "de" : "ar";
    const val = { de: label ? label.name : "", ar: label ? (label.name_ar || "") : "" };
    let touched = !!(label && label.name_ar);   // zweites Feld von Hand geändert -> nicht mehr überschreiben
    let timer = null, reqNo = 0;
    sheet("", (el, close) => {
      const field = (lang, primary) => `<label class="lab-field"><span>${esc(t(lang === "de" ? "label_de" : "label_ar"))}${primary ? "" : ` <i id="trst"></i>`}</span>
        <input class="input" id="ln-${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}" maxlength="30" value="${esc(val[lang])}"></label>`;
      const draw = () => {
        el.innerHTML = `<div class="grab"></div><h2>${esc(label ? t("rename") : t("new_label"))}</h2>
          ${field(mine, true)}${field(other, false)}
          <div class="swatches">${LABEL_COLORS.map(c => `<button class="swatch${c === color ? " on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("")}</div>
          <div class="d-actions">${label ? `<button class="btn" id="ld" style="color:var(--bad)">${esc(t("delete"))}</button>` : `<button class="btn" id="lc">${esc(t("cancel"))}</button>`}
          <button class="btn btn-primary" id="ls">${esc(label ? t("save") : t("create"))}</button></div>`;
        const inMine = el.querySelector("#ln-" + mine), inOther = el.querySelector("#ln-" + other), status = el.querySelector("#trst");
        const sync = () => { val[mine] = inMine.value; val[other] = inOther.value; };
        inMine.oninput = () => {
          sync();
          if (touched) return;
          clearTimeout(timer);
          const text = inMine.value.trim();
          if (!text) { inOther.value = val[other] = ""; status.textContent = ""; return; }
          timer = setTimeout(async () => {
            const no = ++reqNo;
            status.textContent = t("translating");
            try {
              const tr = await translate(text, mine, other);
              if (no !== reqNo || touched) return;
              if (tr) { inOther.value = val[other] = tr; status.textContent = t("translated_auto"); }
              else status.textContent = t("translate_failed");
            } catch (e) { if (no === reqNo) status.textContent = t("translate_failed"); }
          }, 600);
        };
        inOther.oninput = () => { touched = inOther.value.trim() !== ""; sync(); status.textContent = ""; };
        el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { sync(); color = b.dataset.c; draw(); });
        const lc = el.querySelector("#lc"); if (lc) lc.onclick = close;
        const ld = el.querySelector("#ld"); if (ld) ld.onclick = async () => { try { await S.deleteLabel(label.id); st.data.labels = st.data.labels.filter(l => l.id !== label.id); st.data.carLabels = st.data.carLabels.filter(x => x.label_id !== label.id); buildIndex(); close(); render(); } catch (e) { fail(e); } };
        el.querySelector("#ls").onclick = async () => {
          sync();
          const name = val.de.trim(), name_ar = val.ar.trim();
          if (!name || !name_ar) { toast(t("label_both")); (name ? el.querySelector("#ln-ar") : el.querySelector("#ln-de")).focus(); return; }
          try {
            if (label) { await S.updateLabel(label.id, { name, name_ar, color }); Object.assign(label, { name, name_ar, color }); buildIndex(); close(); render(); }
            else { const l = await S.addLabel(name, color, name_ar); if (!l.name_ar) l.name_ar = name_ar; st.data.labels.push(l); buildIndex(); close(); if (onDone) onDone(l); }
          } catch (e) { fail(e); }
        };
        setTimeout(() => inMine.focus(), 50);
      };
      draw();
    });
  }

  // ---------------- Geschmacks-Modell ("Für dich") ----------------
  // Lernt aus Eindrücken (Swipen) und Bewertungen, welche Merkmale dir gefallen.
  // Merkmale: Motor, Baureihe, Karosserie, Preisband, km-Band, Umkreis, Marke, Zustand-Labels.
  const IMP_WEIGHT = { "-1": -1, "1": 1, "2": 2 };
  const PRIOR = { M54B30: 0.35, M57: 0.28, M43: 0.18, M54B25: 0.14, M54B22: 0.05, M47: -0.02, VW16: -0.08, VW18T: -0.04 };
  const RATE_WEIGHT = { 5: 2.5, 4: 1.5, 3: 0.3, 2: -1, 1: -2 };
  function bodyClass(c) {
    const b = `${c.body || ""} ${c.title || ""}`.toLowerCase();
    if (/compact|kompakt|\b31[68]ti\b|\b325ti\b/.test(b)) return "compact";
    if (/touring|kombi|variant|avant|combi/.test(b)) return "touring";
    if (/cabrio/.test(b)) return "cabrio";
    if (/coup/.test(b)) return "coupe";
    return "limo";
  }
  function features(c) {
    const f = [];
    if (c.engine_group) f.push("g:" + c.engine_group);
    if (c.series) f.push("s:" + c.series);
    f.push("b:" + bodyClass(c));
    const p = c.price_eur;
    if (p != null) f.push("p:" + (p <= 2000 ? "lo" : p <= 3000 ? "mid" : p <= 4000 ? "hi" : "xhi"));
    const km = c.mileage_km;
    if (km != null) f.push("k:" + (km < 180000 ? "lo" : km < 260000 ? "mid" : "hi"));
    if (c.zone) f.push("z:" + c.zone);
    if (c.make) f.push("m:" + c.make.toLowerCase());
    (c.auto_labels || []).forEach(l => { if (l.tone === "bad" || l.tone === "good" || l.key === "abgemeldet") f.push("l:" + l.key + ":" + l.tone); });
    return f;
  }
  function prefModel(uid) {
    const signal = {};
    const add = (id, v) => { signal[id] = (signal[id] || 0) + v; };
    st.data.impressions.forEach(i => { if (i.user_id === uid) add(i.car_id, IMP_WEIGHT[i.value] || 0); });
    st.data.ratings.forEach(r => add(r.car_id, (RATE_WEIGHT[r.rating] || 0) * (r.user_id === uid ? 1 : 0.3)));
    const sum = {}, n = {};
    for (const id in signal) {
      const c = st.idx.car[id]; if (!c) continue;
      features(c).forEach(k => { sum[k] = (sum[k] || 0) + signal[id]; n[k] = (n[k] || 0) + 1; });
    }
    const w = {};
    for (const k in sum) w[k] = sum[k] / (n[k] + 3);   // geglättet: wenige Signale zählen wenig
    return { w, count: Object.keys(signal).length };
  }
  function affinity(c, model) {
    let a = 0; const parts = [];
    features(c).forEach(k => { const v = model.w[k] || 0; a += v; if (v > 0.15) parts.push([k, v]); });
    parts.sort((x, y) => y[1] - x[1]);
    return { a, top: parts.slice(0, 2).map(p => p[0]) };
  }
  const offerOf = (c) => c.offer_score ?? c.score ?? 50;
  function reasonText(c, top) {
    const out = [];
    top.forEach(k => {
      const [kind, val] = k.split(":");
      if (kind === "g") out.push(t("why_engine", { x: t("group_" + val) !== "group_" + val ? t("group_" + val) : val }));
      else if (kind === "s") out.push(val);
      else if (kind === "b") out.push(t("body_" + val));
      else if (kind === "p") out.push(t("why_price_" + val));
      else if (kind === "z") out.push(val === "A" ? t("why_near") : "");
      else if (kind === "m") out.push(val.toUpperCase() === "BMW" ? "BMW" : val);
    });
    const r = out.filter(Boolean);
    return r.slice(0, 3).join(" · ");
  }
  function rng(seed) { // Mulberry32: reproduzierbarer Zufall je "Mischung"
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  function forYouList() {
    const uid = me().user_id;
    const model = prefModel(uid);
    const rand = rng(st.fySeed);
    const learned = Math.min(1, model.count / 25);            // je mehr Signale, desto mehr zählt der Geschmack
    const out = [];
    st.data.cars.forEach(c => {
      if (!inBase(c, "all") || c.severe) return;
      const myR = myRating(c.id), imp = myImpression(c.id);
      if (myR != null && myR <= 2) return;
      const af = affinity(c, model);
      // Vorwissen: deine Motor-Prioritäten zählen, solange noch wenig gelernt ist
      const prior = PRIOR[c.engine_group] ?? -0.1;
      let w = offerOf(c) / 100 + (1 - learned * 0.6) * prior + learned * 0.55 * Math.tanh(af.a) + (isNew(c) ? 0.12 : 0);
      if (myR != null && myR >= 4) w -= 0.25;                   // kennst du schon
      if (imp === -1) w -= 0.35;
      if (imp === 2) w += 0.15;
      const u = Math.max(1e-9, rand());
      const key = w + 0.13 * -Math.log(-Math.log(u));          // Gumbel-Rauschen = gewichteter Zufall
      out.push({ c, key, why: reasonText(c, af.top) });
    });
    return out.sort((a, b) => b.key - a.key);
  }
  function renderForYou() {
    const view = document.getElementById("view");
    const list = forYouList();
    const shown = list.slice(0, st.fyCount);
    const model = canWrite() ? prefModel(me().user_id) : { count: 0 };
    view.innerHTML = `<header class="top"><div class="top-row"><div class="brand">GARAGE<span>/</span>02</div>
        <button class="btn btn-sm" id="shuffle" style="margin-inline-start:auto">↻ ${esc(t("reshuffle"))}</button></div>
        <div class="fy-sub">${esc(canWrite() ? (model.count < 10 ? t("fy_learning", { n: model.count }) : t("fy_learned", { n: model.count })) : t("fy_readonly"))}</div>
        ${radiusBarHtml((m) => st.data.cars.filter(c => inBase(c, "all", m) && !c.severe).length)}</header>
      <main class="content">
        ${shown.map(({ c, why }) => fyCardHtml(c, why)).join("") || `<div class="empty-state">—</div>`}
        ${list.length > shown.length ? `<button class="btn btn-block" id="fymore">${esc(t("show_more"))}</button>` : ""}
      </main>`;
    bindRadius(view, renderForYou);
    view.querySelector("#shuffle").onclick = () => { st.fySeed = (Math.random() * 1e9) | 0; st.fyCount = 20; renderForYou(); window.scrollTo(0, 0); };
    const more = view.querySelector("#fymore"); if (more) more.onclick = () => { st.fyCount += 20; const y = window.scrollY; renderForYou(); window.scrollTo(0, y); };
    view.querySelectorAll(".fy-card").forEach(el => el.onclick = () => openDetail(el.dataset.id));
  }
  // Karten: kurz "Marktwert ↓/–/↑"; Detailansicht (long): mit Euro-Betrag
  function dealHtml(c, long) {
    if (c.deal_pct == null || !c.expected_price || c.price_eur == null) return "";
    const diff = c.expected_price - c.price_eur;
    const fair = Math.abs(c.deal_pct) < 0.08;
    if (!long) {
      const [cls, arrow] = fair ? ["neutral", "–"] : diff > 0 ? ["good", "↓"] : ["bad", "↑"];
      return `<span class="deal ${cls}">${esc(t("mv_short"))} <b>${arrow}</b></span>`;
    }
    if (fair) return `<span class="deal neutral">${esc(t("deal_fair"))}</span>`;
    return diff > 0 ? `<span class="deal good">${esc(t("deal_below", { n: fmtNum(diff) }))}</span>`
      : `<span class="deal bad">${esc(t("deal_above", { n: fmtNum(-diff) }))}</span>`;
  }
  function fyCardHtml(c, why) {
    const imgs = (c.images || []).map(safeUrl).filter(Boolean);
    return `<article class="fy-card" data-id="${esc(c.id)}">
      <div class="fy-photo">${imgs[0] ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(imgs[0])}" alt="">` : ""}
        <div class="raters">${raterDots(c)}</div>
        <div class="fy-grad"></div>
        <div class="fy-info"><h3>${esc(carTitle(c))}</h3>
          <div class="row"><b class="num">${esc(fmtPrice(c.price_eur))}</b>${engineChip(c)}<span class="num">${esc(fmtKm(c.mileage_km))}</span><span class="num">${esc(c.year || "")}</span><span class="num">${c.dist_km != null ? esc(c.dist_km + " km") : ""}</span></div></div></div>
      <div class="fy-bottom">${why ? `<div class="fy-why">✦ ${esc(why)}</div>` : ""}
        <div class="tags">${farTag(c)}${dealHtml(c)}${tagsHtml(c, 5)}</div></div></article>`;
  }

  // ---------------- Eindruck (Swipen) ----------------
  // Kein Urteil, nur ein erster Eindruck – trainiert "Für dich". Bewerten bleibt in der Detailansicht.
  const myImpression = (id) => { const r = (st.idx.imp[id] || {})[me().user_id]; return r ? r.value : null; };
  function buildSwipeQueue() {
    const model = prefModel(me().user_id);
    const rand = rng((Math.random() * 1e9) | 0);
    st.swipeQueue = st.data.cars.filter(c => inBase(c, "unrated") && myRating(c.id) == null && myImpression(c.id) == null)
      .map(c => ({ id: c.id, k: offerOf(c) / 100 + (PRIOR[c.engine_group] ?? -0.1) + 0.4 * Math.tanh(affinity(c, model).a) + 0.25 * -Math.log(-Math.log(Math.max(1e-9, rand()))) }))
      .sort((a, b) => b.k - a.k).map(x => x.id);
  }
  function pendingSwipe() { return st.swipeQueue.filter(id => myRating(id) == null && myImpression(id) == null && !st.skipped.has(id)); }
  function renderSwipe() {
    if (!st.swipeQueue) buildSwipeQueue();
    const view = document.getElementById("view");
    const ids = pendingSwipe().slice(0, 2);
    const done = st.data.impressions.filter(i => i.user_id === me().user_id).length;
    view.innerHTML = `<header class="top"><div class="top-row"><div class="brand">GARAGE<span>/</span>02</div>
        <div class="top-meta">${esc(t("imp_count", { n: done }))}</div></div>
        <div class="fy-sub">${esc(t("imp_hint"))}</div>
        ${radiusBarHtml((m) => st.data.cars.filter(c => inBase(c, "unrated", m) && myRating(c.id) == null && myImpression(c.id) == null).length)}</header>
      <main class="content" style="padding-bottom:0">
        ${ids.length ? `<div class="swipe-wrap">${ids.slice().reverse().map((id, i) => swipeCardHtml(st.idx.car[id], i === 0 && ids.length > 1)).join("")}</div>
        <div class="swipe-buttons">
          <button class="sbtn" data-v="-1" style="color:var(--r1)" aria-label="${esc(t("imp_no"))}">👎</button>
          <button class="sbtn small" data-v="skip" style="color:var(--muted)" aria-label="${esc(t("imp_skip"))}">⏭</button>
          <button class="sbtn" data-v="1" style="color:var(--r4)" aria-label="${esc(t("imp_yes"))}">👍</button>
          <button class="sbtn small" data-v="2" style="color:var(--r5)" aria-label="${esc(t("imp_top"))}">🔥</button>
          <button class="sbtn small" id="undo" style="color:var(--muted)" ${st.undo.length ? "" : "disabled"} aria-label="${esc(t("undo"))}">↶</button>
        </div><div class="swipe-hint">${esc(t("swipe_hint"))}</div>` : `<div class="empty-state">${esc(t("swipe_empty"))}</div>`}
      </main>`;
    bindRadius(view, renderSwipe);
    if (!ids.length) return;
    const top = view.querySelector(".swipe-card:last-child");
    attachSwipe(top, ids[0]);
    view.querySelectorAll("[data-v]").forEach(b => b.onclick = () => commitSwipe(ids[0], b.dataset.v === "skip" ? "skip" : Number(b.dataset.v), top));
    view.querySelector("#undo").onclick = async () => {
      const u = st.undo.pop(); if (!u) return;
      if (u.skip) st.skipped.delete(u.id); else await impress(u.id, u.prev);
      st.swipeQueue = st.swipeQueue.filter(x => x !== u.id); st.swipeQueue.unshift(u.id);
      renderSwipe();
    };
  }
  function swipeCardHtml(c, behind) {
    const imgs = (c.images || []).map(safeUrl).filter(Boolean).slice(0, 8);
    const d = priceDelta(c);
    return `<div class="swipe-card${behind ? " behind" : ""}" data-id="${esc(c.id)}" data-img="0">
      <div class="swipe-photo">${imgs.length ? `<img src="${esc(imgs[0])}" referrerpolicy="no-referrer" alt="">` : ""}
        ${imgs.length > 1 ? `<div class="bars">${imgs.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>` : ""}
        <div class="grad"></div>
        <div class="info"><h2>${esc(carTitle(c))}</h2>
          <div class="row"><b class="num" style="font-size:19px">${esc(fmtPrice(c.price_eur))}</b>${d < 0 ? `<span class="down num">↓ ${esc(fmtNum(-d))} €</span>` : ""}
            ${engineChip(c)}<span class="num">${esc(fmtKm(c.mileage_km))}</span><span class="num">${esc(c.year || "")}</span><span class="num">${c.dist_km != null ? esc(c.dist_km + " km") : ""}</span></div></div>
        <div class="stamp-big yes">${esc(t("imp_yes"))}</div><div class="stamp-big no">${esc(t("imp_no"))}</div><div class="stamp-big top">${esc(t("imp_top"))}</div>
      </div>
      <div class="swipe-bottom"><div class="tags">${farTag(c)}${dealHtml(c)}${tagsHtml(c, 6)}</div>
        <div class="snip">${esc((c.title || "").slice(0, 140))}</div></div></div>`;
  }
  function attachSwipe(card, id) {
    const c = st.idx.car[id];
    const imgs = (c.images || []).map(safeUrl).filter(Boolean).slice(0, 8);
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, moved = false;
    const yes = card.querySelector(".stamp-big.yes"), no = card.querySelector(".stamp-big.no"), topS = card.querySelector(".stamp-big.top");
    const rtl = document.documentElement.dir === "rtl";
    card.addEventListener("pointerdown", (e) => { dragging = true; moved = false; sx = e.clientX; sy = e.clientY; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      const ddx = rtl ? -dx : dx;
      yes.style.opacity = Math.max(0, Math.min(1, ddx / 110));
      no.style.opacity = Math.max(0, Math.min(1, -ddx / 110));
      topS.style.opacity = Math.max(0, Math.min(1, -dy / 120)) * (Math.abs(dx) < 80 ? 1 : 0);
    });
    const end = (e) => {
      if (!dragging) return; dragging = false;
      card.style.transition = "transform .25s ease";
      const ddx = rtl ? -dx : dx;
      if (!moved) {
        const r = card.getBoundingClientRect();
        if (e.clientY - r.top > r.height * 0.68) { openDetail(id); }
        else if (imgs.length > 1) {
          let i = Number(card.dataset.img);
          i = (e.clientX - r.left > r.width / 2) ? Math.min(imgs.length - 1, i + 1) : Math.max(0, i - 1);
          card.dataset.img = i;
          card.querySelector(".swipe-photo img").src = imgs[i];
          card.querySelectorAll(".bars i").forEach((b, j) => b.classList.toggle("on", j === i));
        }
        card.style.transform = ""; return;
      }
      if (ddx > 110) commitSwipe(id, 1, card);
      else if (ddx < -110) commitSwipe(id, -1, card);
      else if (dy < -120 && Math.abs(dx) < 80) commitSwipe(id, 2, card);
      else { card.style.transform = ""; yes.style.opacity = no.style.opacity = topS.style.opacity = 0; }
      dx = dy = 0;
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }
  async function impress(carId, value) {
    const uid = me().user_id;
    const prev = myImpression(carId);
    st.data.impressions = st.data.impressions.filter(i => !(i.car_id === carId && i.user_id === uid));
    if (value != null) st.data.impressions.push({ car_id: carId, user_id: uid, value, at: new Date().toISOString() });
    buildIndex();
    try { await S.setImpression(carId, value); } catch (e) { fail(e); }
    return prev;
  }
  async function commitSwipe(id, v, card) {
    const rtl = document.documentElement.dir === "rtl";
    if (card) {
      card.style.transition = "transform .28s ease, opacity .28s";
      const dir = v === "skip" ? 0 : v > 0 ? 1 : -1;
      card.style.transform = v === 2 ? "translateY(-120%)" : dir ? `translateX(${(rtl ? -dir : dir) * 140}%) rotate(${dir * 18}deg)` : "scale(.85)";
      card.style.opacity = "0";
    }
    if (v === "skip") { st.skipped.add(id); st.undo.push({ id, skip: true }); }
    else { const prev = await impress(id, v); st.undo.push({ id, prev }); }
    if (st.undo.length > 30) st.undo.shift();
    setTimeout(renderSwipe, 240);
  }

  // ---------------- Neuigkeiten ----------------
  function feedItems() {
    if (!st.data) return [];
    const items = [];
    st.data.events.forEach(e => { if (st.idx.car[e.car_id] && e.kind !== "eligibility" && e.kind !== "title") items.push({ at: e.at, type: "ev", e, car: st.idx.car[e.car_id] }); });
    st.data.ratings.forEach(r => { if (r.user_id !== me().user_id && st.idx.car[r.car_id]) items.push({ at: r.updated_at, type: "rating", r, car: st.idx.car[r.car_id] }); });
    st.data.comments.forEach(c => { if (c.user_id !== me().user_id && st.idx.car[c.car_id]) items.push({ at: c.created_at, type: "comment", c, car: st.idx.car[c.car_id] }); });
    return items.filter(i => i.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 250);
  }
  function renderFeed() {
    const view = document.getElementById("view");
    const items = feedItems();
    const nameOf = (uid) => (S.members.find(m => m.user_id === uid) || {}).name || "?";
    const icon = { new: "✦", price: "€", deleted: "⌫", reactivated: "↺", description: "✎", mileage: "⏲", hu: "✓", status: "•" };
    let html = "", lastDay = "", markerDone = !st.lastVisit;
    items.forEach(i => {
      if (!markerDone && i.at <= st.lastVisit) { html += `<div class="section-title" style="color:var(--accent)">— ${esc(t("since_last"))} ↑ —</div>`; markerDone = true; }
      const day = i.at.slice(0, 10);
      if (day !== lastDay) {
        const today = new Date().toISOString().slice(0, 10), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        html += `<div class="section-title">${esc(day === today ? t("today") : day === y ? t("yesterday") : fmtDate(i.at, true))}</div>`; lastDay = day;
      }
      const c = i.car, img = firstImg(c);
      let ic = "", line = "", color = "";
      if (i.type === "ev") {
        ic = icon[i.e.kind] || "•"; line = eventText(i.e);
        if (i.e.kind === "price") color = Number(i.e.new) < Number(i.e.old) ? "var(--good)" : "var(--bad)";
        if (i.e.kind === "deleted") color = "var(--muted)";
        if (i.e.kind === "new") color = "var(--accent)";
      } else if (i.type === "rating") { ic = "●"; color = RATING_COLOR[i.r.rating]; line = `${nameOf(i.r.user_id)} ${t("ev_rating")}: ${t("r" + i.r.rating)}`; }
      else { ic = "✎"; line = `${nameOf(i.c.user_id)} ${t("ev_comment")}: „${i.c.body.slice(0, 60)}“`; }
      html += `<div class="feed-item" data-id="${esc(c.id)}"><span class="ic" style="color:${color}">${esc(ic)}</span>
        ${img ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt="">` : `<div class="ph"></div>`}
        <div class="tx"><b>${esc(carTitle(c))} · <span class="num">${esc(fmtPrice(c.price_eur))}</span></b><span>${esc(line)}</span></div></div>`;
    });
    view.innerHTML = `<header class="top"><div class="top-row"><div class="brand">GARAGE<span>/</span>02</div><div class="top-meta">${esc(lastRunText())}</div></div></header>
      <main class="content">${html || `<div class="empty-state">${esc(t("feed_empty"))}</div>`}</main>`;
    view.querySelectorAll(".feed-item").forEach(f => f.onclick = () => openDetail(f.dataset.id));
  }
  function markVisited() {
    const now = new Date().toISOString();
    setTimeout(() => { st.lastVisit = now; S.updateMe({ last_visit: now }).catch(() => { }); }, 4000);
  }

  // ---------------- Mehr ----------------
  async function renderMore() {
    const view = document.getElementById("view");
    const run = (st.data.runs || [])[0];
    view.innerHTML = `<header class="top"><div class="top-row"><div class="brand">GARAGE<span>/</span>02</div><div class="top-meta">${esc(me().name)}${canWrite() ? "" : " · " + esc(t("read_only"))}</div></div></header>
      <main class="content">
        ${canWrite() ? `<section class="box"><h3>${esc(t("add_link"))}</h3>
          <p style="color:var(--muted);font-size:13.5px;margin:0 0 10px">${esc(t("add_link_hint"))}</p>
          <form id="lf"><input class="input" id="lu" type="url" inputmode="url" placeholder="https://www.kleinanzeigen.de/s-anzeige/…" required style="margin-bottom:8px">
          <input class="input" id="ln" placeholder="${esc(t("link_note"))}" style="margin-bottom:10px">
          <button class="btn btn-primary btn-block" type="submit">${esc(t("submit"))}</button></form>
          <div id="subs" style="margin-top:8px"></div></section>` : ""}
        ${canWrite() ? `<section class="box"><h3>${esc(t("manage_labels"))}</h3>
          ${st.data.labels.map(l => `<div class="list-row"><span class="tag custom" style="background:${esc(l.color)}">${esc(labelName(l))}</span><div class="grow"></div><span class="num" style="color:var(--muted);font-size:13px">${st.data.carLabels.filter(x => x.label_id === l.id).length}</span><button class="btn btn-sm" data-el="${l.id}">${esc(t("rename"))}</button></div>`).join("")}
          <button class="btn btn-block" id="addlab" style="margin-top:8px">＋ ${esc(t("new_label"))}</button></section>` : ""}
        <section class="box"><h3>${esc(t("language"))}</h3><div class="lang-switch"><button data-lang="de" class="${st.lang === "de" ? "on" : ""}">Deutsch</button><button data-lang="ar" class="${st.lang === "ar" ? "on" : ""}">العربية</button></div></section>
        <section class="box"><h3>${esc(t("last_run"))}</h3><div style="font-size:14px">${run ? `${esc(fmtDate(run.finished_at, true))} · ${esc(ago(run.finished_at))}` : esc(t("never"))}
          ${run && run.stats && run.stats.new_eligible != null ? `<div style="color:var(--muted);margin-top:4px">+${esc(run.stats.new_eligible)} neu · ${esc(run.stats.total_tracked ?? "")} aktiv</div>` : ""}</div></section>
        <section class="box"><h3>${esc(t("install"))}</h3><div style="font-size:14px;color:var(--muted)">${esc(t("install_hint"))}</div></section>
        ${S.mode === "demo" ? `<section class="box"><h3>Demo</h3>${S.members.map(m => `<a class="btn btn-sm" style="margin:0 6px 6px 0" href="?as=${esc(m.role)}">${esc(m.name)}</a>`).join("")}</section>` : ""}
        <button class="btn btn-block" id="logout" style="margin-top:16px;color:var(--bad)">${esc(t("logout"))}</button>
      </main>`;
    view.querySelectorAll("[data-lang]").forEach(b => b.onclick = async () => { st.lang = b.dataset.lang; await S.updateMe({ lang: st.lang }).catch(() => { }); render(); });
    view.querySelector("#logout").onclick = async () => { await S.signOut(); location.reload(); };
    const lf = view.querySelector("#lf");
    if (lf) {
      lf.onsubmit = async (e) => {
        e.preventDefault();
        const url = view.querySelector("#lu").value.trim();
        if (!/^https:\/\/(www\.)?(kleinanzeigen\.de|suchen\.mobile\.de|m\.mobile\.de|www\.autoscout24\.de|autoscout24\.de)\//.test(url)) { toast("Kleinanzeigen, mobile.de oder AutoScout24"); return; }
        try { await S.submitLink(url, view.querySelector("#ln").value.trim() || null); toast(t("link_sent")); lf.reset(); drawSubs(); } catch (er) { fail(er); }
      };
      drawSubs();
    }
    view.querySelectorAll("[data-el]").forEach(b => b.onclick = () => labelEditor(st.idx.labels[Number(b.dataset.el)]));
    const al = view.querySelector("#addlab"); if (al) al.onclick = () => labelEditor(null, () => render());
    async function drawSubs() {
      const box = view.querySelector("#subs"); if (!box) return;
      const subs = await S.listSubmissions().catch(() => []);
      box.innerHTML = subs.length ? `<div class="section-title" style="margin-top:14px">${esc(t("my_links"))}</div>` + subs.slice(0, 10).map(s => `<div class="list-row"><div class="grow"><b style="font-size:13px">${esc(s.status === "pending" ? t("pending") : s.status === "done" ? t("done") : t("error"))}</b><small>${esc(s.result || s.url)}</small></div>${s.car_id && st.idx.car[s.car_id] ? `<button class="btn btn-sm" data-open="${esc(s.car_id)}">${esc(t("details"))}</button>` : ""}</div>`).join("") : "";
      box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openDetail(b.dataset.open));
    }
  }

  // ---------------- Login ----------------
  function renderLogin(msg) {
    document.documentElement.dir = st.lang === "ar" ? "rtl" : "ltr";
    $app.innerHTML = `<div class="login"><h1>GARAGE<span>/</span>02</h1><p>${esc(t("login_title"))}</p>
      <form id="lg"><label class="field"><span>${esc(t("email"))}</span><input class="input" id="em" type="email" autocomplete="username" required></label>
      <label class="field"><span>${esc(t("password"))}</span><input class="input" id="pw" type="password" autocomplete="current-password" required></label>
      <div class="err">${esc(msg || "")}</div><button class="btn btn-primary btn-block" type="submit">${esc(t("login"))}</button></form>
      <div style="margin-top:22px;text-align:center"><div class="lang-switch"><button data-lang="de" class="${st.lang === "de" ? "on" : ""}">Deutsch</button><button data-lang="ar" class="${st.lang === "ar" ? "on" : ""}">العربية</button></div></div></div>`;
    $app.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { st.lang = b.dataset.lang; localStorage.setItem("g2-lang", st.lang); renderLogin(); });
    $app.querySelector("#lg").onsubmit = async (e) => {
      e.preventDefault();
      try { await S.signIn($app.querySelector("#em").value.trim(), $app.querySelector("#pw").value); boot(); }
      catch (er) { renderLogin(t("login_error")); }
    };
  }

  // ---------------- Start ----------------
  let reloadTimer = null;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
      try {
        st.data = await S.loadAll(); buildIndex();
        if (st.detail) drawDetail(true);
        else if (st.tab !== "swipe" && !$sheet.innerHTML) { const y = window.scrollY; render(); window.scrollTo(0, y); }
      } catch (e) { console.warn(e); }
    }, 900);
  }
  async function boot() {
    st.lang = localStorage.getItem("g2-lang") || "de";
    try {
      const session = await S.session();
      if (!session) return renderLogin();
      const m = await S.loadMembers();
      if (!m) { await S.signOut(); return renderLogin(t("not_member")); }
      st.lang = m.lang || st.lang; localStorage.setItem("g2-lang", st.lang);
      st.lastVisit = m.last_visit || null;
      const cached = S.cached && S.cached();
      if (cached && cached.res) { st.data = cached.res; buildIndex(); render(); }
      try { st.data = await S.loadAll(); }
      catch (e) { if (!st.data) throw e; toast(t("offline")); }
      buildIndex();
      if (!canWrite() && st.tab === "swipe") st.tab = "cars";
      render();
      S.subscribe((table) => { if (table !== "submissions") scheduleReload(); });
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleReload(); });
      const add = new URLSearchParams(location.search).get("add");
      if (add && canWrite()) { st.tab = "more"; render(); const i = document.getElementById("lu"); if (i) i.value = add; }
    } catch (e) {
      console.error(e);
      $app.innerHTML = `<div class="login"><h1>GARAGE<span>/</span>02</h1><p class="err">${esc(e.message || e)}</p><button class="btn" onclick="location.reload()">↻</button></div>`;
    }
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
  boot();
})();
