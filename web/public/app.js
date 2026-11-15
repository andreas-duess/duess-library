// The shelf: white shelves wall to wall and spines drawn to look like real books.
// Sizes are worked out in millimetres from each book's format and page count, colours come from the
// cover (see pipeline/build.py), and sections are packed onto shelves so the boards stay full.

const SMALL = new Set(["Cooking & Food", "Art, Design & Photography", "Home, Craft & Reference"]);
const FICTION = new Set(["Literary Fiction & Poetry", "Crime & Thriller", "Science Fiction", "Fantasy & Horror", "Historical Fiction", "Humour"]);

// spine colours for books without a cover: mostly off-whites and dark neutrals, some muted colour
const PAL = [
  ["#f1ece1", "#1f1c19", "#a4472f", 6], ["#e9e2d0", "#2b2a28", "#3d5a6c", 5], ["#fbfaf6", "#1d1d1d", "#c2502f", 5],
  ["#ded6c4", "#3a2e22", "#7a2e2a", 3], ["#1d1d1f", "#efe9dd", "#c9a24d", 4], ["#2c2a29", "#e8e2d6", "#b5523b", 2],
  ["#23344a", "#f0e9db", "#d6b46a", 2], ["#6b2228", "#f2e7d5", "#d9b45f", 2], ["#2f4a3c", "#efe7d4", "#d5b871", 2],
  ["#c9962e", "#1f1c19", "#7a2e2a", 1], ["#c0592f", "#fbf3e6", "#1f1c19", 2], ["#2e6a6b", "#f2ede1", "#e3c27a", 1],
  ["#8b8c88", "#141414", "#ffffff", 1], ["#5a6e86", "#f4efe4", "#1f1c19", 1], ["#b8c2b0", "#1f2a22", "#7a2e2a", 1],
];
const FONTS = [
  { ff: '"Libre Caslon Text", serif', fw: 400 },
  { ff: '"Libre Caslon Text", serif', fw: 700, tt: "uppercase", ls: ".08em" },
  { ff: '"Playfair Display", serif', fw: 600 },
  { ff: '"Oswald", sans-serif', fw: 500, tt: "uppercase", ls: ".06em" },
  { ff: '"Barlow Condensed", sans-serif', fw: 600, tt: "uppercase", ls: ".1em" },
  { ff: '"Inter", sans-serif', fw: 600, ls: ".01em" },
  { ff: '"Fraunces", serif', fw: 400 },
];
const MARKS = [
  '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  '<svg viewBox="0 0 10 10"><ellipse cx="5" cy="5" rx="3" ry="4.4" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="5" r="1.4" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 10 10"><path d="M5 1l4 8H1z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 10 10"><path d="M1 7h8M2.5 4.5h5" stroke="currentColor" stroke-width="1.3"/></svg>',
];

const $ = (s) => document.querySelector(s);
const shelves = $("#shelves"), stage = $("#stage"), book3d = $("#book3d"), note = $("#note"), tip = $("#tip");
let books = [], open = null;

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed) { // mulberry32: the same sequence for the same book on every visit
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const scale = () => (innerWidth < 720 ? 0.66 : innerWidth < 1100 ? 0.85 : 1); // px per millimetre

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const inkOn = (hex) => (luminance(hex) > 0.36 ? "#1d1b19" : "#f7f3ea");

// Format, size, material, layout and colours for one book, the same on every visit.
function spec(b) {
  const h = hash(b.id + b.title), r = h % 100;
  let fmt;
  if (b.section === "Art, Design & Photography") fmt = "art";
  else if (SMALL.has(b.section)) fmt = r < 85 ? "cook" : "hc";
  else if (/vol\. 1/i.test(b.title)) fmt = "manga";
  else if (b.year && b.year < 1930) fmt = "cloth";
  else if (FICTION.has(b.section)) fmt = r < 22 ? "mass" : r < 50 ? "bfmt" : r < 72 ? "trade" : "hc";
  else fmt = r < 20 ? "bfmt" : r < 45 ? "trade" : "hc";

  const v = (h >>> 8) % 41;
  const heightMm = { mass: 175 + (v % 7), bfmt: 196 + (v % 5), trade: 203 + (v % 14), hc: 222 + (v % 21),
    cook: 245 + v, art: 280 + (v % 26), manga: 182, cloth: 198 + (v % 30) }[fmt];
  const pages = b.pages || (FICTION.has(b.section) ? 300 + (h % 120) : 260 + (h % 100));
  const thickMm = Math.max(9, Math.min(70,
    fmt === "cook" || fmt === "art" ? pages * 0.11 + 6 : fmt === "hc" ? pages * 0.075 + 5 : fmt === "cloth" ? pages * 0.08 + 5 : pages * 0.065 + 1.5));
  const type = fmt === "cloth" ? "cloth" : ["hc", "cook", "art"].includes(fmt) ? "hc" : "pb";

  let bg, ink, acc;
  if (b.pal) ({ bg, ink, accent: acc } = b.pal);
  else {
    const total = PAL.reduce((n, p) => n + p[3], 0);
    let k = (h >>> 4) % total, p = PAL[0];
    for (const q of PAL) { if ((k -= q[3]) < 0) { p = q; break; } }
    [bg, ink, acc] = p;
  }
  if (type === "cloth" && !b.pal) bg = ["#5b1f22", "#1f3a33", "#22304a", "#4a3a26"][h % 4];

  const k = scale();
  const w = thickMm * k, height = heightMm * k;
  let layout;
  if (type === "cloth") layout = "cloth";
  else if (thickMm >= 34 && thickMm * k >= 30 && (h >>> 9) % 3) layout = "horiz"; // sideways lettering needs room
  else layout = ["classic", "rules", "band", "bold", "head", "classic"][(h >>> 11) % 6];
  const font = FONTS[(h >>> 13) % FONTS.length];
  const fs = layout === "horiz" ? Math.min(20, Math.max(10, w * 0.34)) : Math.min(19, Math.max(8.5, w * 0.47));
  // signs of age and use: sun fading, rubbed corners, reading creases, books set back, foil lettering
  const rand = rng(h);
  const light = luminance(bg) > 0.36;
  const wear = {
    fade: rand() < 0.22, worn: type !== "hc" || rand() < 0.3, creases: type === "pb" && rand() < 0.45 ? 1 + Math.floor(rand() * 4) : 0,
    back: rand() < 0.16, foil: type === "hc" && !light && layout !== "band" && layout !== "head" && rand() < 0.45,
    foilTone: rand() < 0.65 ? "gold" : "silver", seed: h,
    tear: type === "hc" && rand() < 0.2 ? { top: rand() < 0.75, from: rand() * 35, to: 55 + rand() * 45, depth: 7 + rand() * 11 } : null,
  };
  const space = [0, 0, 0, 0, 0.5, 1, 1.5, 2.5][(h >>> 21) % 8] * k; // books never stand perfectly evenly
  return { fmt, type, layout, font, w, h: height, wear, light, space, thickMm, heightMm, bg, ink, acc, ink3: inkOn(acc), fs,
    mark: MARKS[(h >>> 17) % MARKS.length], wrap: layout !== "horiz" && b.title.length > 22 && w > 26 };
}

function makeSpine(b, sp) {
  const s = document.createElement("button");
  s.className = `spine ${sp.type} l-${sp.layout}${b.de ? " de" : ""}`;
  s.style.cssText = `--w:${sp.w}px;--h:${sp.h}px;--bg:${sp.bg};--ink2:${sp.ink};--acc:${sp.acc};--acc2:${sp.ink};--ink3:${sp.ink3};` +
    `--fs:${sp.fs}px;--ff:${sp.font.ff};--fw:${sp.font.fw};--tt:${sp.font.tt || "none"};--ls:${sp.font.ls || "0"};` +
    `--ffa:${sp.font.ff.includes("serif") && !sp.font.ff.includes("sans") ? sp.font.ff : '"Inter", sans-serif'}`;
  s.dataset.id = b.id;
  const wr = sp.wear;
  if (wr.back) s.classList.add("back");
  if (wr.foil) s.classList.add(`foil-${wr.foilTone}`);
  s.style.setProperty("--emb", sp.light ? "0 1px 0 rgba(255,255,255,.45)" : "0 -1px 0 rgba(0,0,0,.45)");
  s.setAttribute("aria-label", b.author ? `${b.title} by ${b.author}` : b.title);
  const vert = sp.layout !== "horiz" ? " v" : "";
  const surname = (b.author || "").split(";")[0].replace(/\(ed\.\)/, "").trim().split(" ").pop();
  const author = document.createElement("span");
  author.className = `sp-author${vert}`;
  author.textContent = sp.layout === "horiz" || sp.layout === "cloth" ? surname : (b.author || "").split(";")[0].replace(/\(ed\.\)/, "").trim();
  const title = document.createElement("span");
  title.className = `sp-title${vert}${sp.wrap ? " wrap" : ""}`;
  title.textContent = b.title;
  if (sp.wrap) title.style.fontSize = `${Math.min(sp.fs * (sp.layout === "bold" ? 1.2 : 1), sp.w * 0.3)}px`; // two columns must fit across the spine
  const mark = document.createElement("span");
  mark.className = "sp-mark";
  mark.innerHTML = sp.mark;
  if (sp.layout === "horiz" || sp.layout === "cloth") s.append(title, author, mark);
  else s.append(author, title, mark);
  if (!b.author) author.remove();
  s.append(wearLayer(sp));
  if (sp.wear.tear) s.append(...tearLayers(sp));
  return s;
}

// A chipped dust jacket: a ragged piece missing at the head or foot, the board showing through
// with a sliver of white paper along the torn edge.
function tearLayers(sp) {
  const t = sp.wear.tear, rand = rng(sp.wear.seed ^ 0x2545f491);
  const pts = [], n = 7;
  for (let i = 0; i <= n; i++) {
    const x = t.from + ((t.to - t.from) * i) / n;
    const edge = i === 0 || i === n;
    pts.push([x, edge ? 0 : t.depth * (0.35 + rand() * 0.65)]);
  }
  const poly = (grow) => {
    const p = pts.map(([x, y], i) => [x + (i === 0 ? -grow : i === n ? grow : 0), y + (y ? grow : 0)]);
    const at = (y) => (t.top ? `${y}px` : `calc(100% - ${y}px)`);
    return `polygon(${p.map(([x, y]) => `${x}% ${at(y)}`).join(",")})`;
  };
  const board = ["#2d2c30", "#3d2c22", "#22303d", "#4f4a42", "#5a2a2a"][sp.wear.seed % 5];
  const paper = document.createElement("span");
  paper.className = "tear";
  paper.style.cssText = `background-color:#f4efe4;clip-path:${poly(2)}`;
  const under = document.createElement("span");
  under.className = "tear";
  under.style.cssText = `background-color:${board};clip-path:${poly(0)}`;
  return [paper, under];
}

// One overlay per spine: head and foot shading, rubbed corners, sun fading and reading creases.
function wearLayer(sp) {
  const rand = rng(sp.wear.seed ^ 0x9e3779b9);
  const img = [], size = [], pos = [];
  const add = (i, s, p) => { img.push(i); size.push(s); pos.push(p); };
  add("linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,0))", "100% 5px", "0 0");          // head
  add("linear-gradient(to top, rgba(0,0,0,.30), rgba(0,0,0,0))", "100% 6px", "0 100%");          // foot, where it meets the board
  if (sp.wear.fade) add("linear-gradient(to bottom, rgba(255,250,240,.28), rgba(255,250,240,.06) 55%, rgba(255,250,240,0))", "100% 100%", "0 0");
  if (sp.wear.worn) {
    const c = sp.light ? "rgba(120,100,80,.22)" : "rgba(255,255,255,.22)";
    add(`radial-gradient(circle at 0 0, ${c}, transparent 70%)`, "7px 7px", "0 0");
    add(`radial-gradient(circle at 100% 0, ${c}, transparent 70%)`, "7px 7px", "100% 0");
    add(`radial-gradient(circle at 0 100%, ${c}, transparent 70%)`, "6px 6px", "0 100%");
    add(`linear-gradient(${c}, ${c})`, "100% 1px", "0 0");
  }
  for (let i = 0; i < sp.wear.creases; i++) { // a broken spine: short pale lines with a shadow beside them
    const x = rand() < 0.5 ? 8 + rand() * 14 : 78 + rand() * 14, y = rand() * 80, len = 6 + rand() * 22; // near the hinges, where spines crack
    add("linear-gradient(to right, rgba(255,255,255,.28), rgba(255,255,255,.28) 50%, rgba(0,0,0,.14) 50%)", `2px ${len}%`, `${x}% ${y}%`);
  }
  const layer = document.createElement("span");
  layer.className = "wear";
  layer.style.cssText = `background-image:${img.join(",")};background-size:${size.join(",")};background-position:${pos.join(",")}`;
  return layer;
}

// A flat book lying in a stack: the same spine, turned on its side.
function makeFlat(b, sp) {
  const f = document.createElement("div");
  f.className = "flat";
  f.style.width = `${sp.h}px`;
  f.style.height = `${sp.w}px`;
  f.style.marginLeft = `${hash(b.id) % 9}px`;
  return f;
}

function render() {
  hideTip();
  const k = scale();
  const side = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--side"));
  const avail = shelves.clientWidth - side * 2;
  const gap = innerWidth < 720 ? 28 : 56;

  // sections, each with its books and (for larger sections) a stack of two or three flat books at the end
  const bySection = new Map();
  for (const b of books) {
    b.sp = spec(b);
    if (!bySection.has(b.section)) bySection.set(b.section, { name: b.section, books: [] });
    bySection.get(b.section).books.push(b);
  }
  const sections = [...bySection.values()];
  for (const s of sections) s.books.sort((a, c) => a.title.localeCompare(c.title));
  for (const s of sections) {
    s.stack = [];
    if (s.books.length >= 8) {
      const n = s.books.length >= 20 ? 3 : 2;
      const pool = s.books.slice(1).filter((b) => b.sp.heightMm <= 250 && b.sp.thickMm <= 40)
        .sort((a, c) => hash(a.id + "s") - hash(c.id + "s")).slice(0, n);
      s.stack = pool.sort((a, c) => c.sp.heightMm - a.sp.heightMm);
      for (const b of s.stack) {
        if (b.sp.layout === "horiz") b.sp.layout = "classic";
        b.sp.wrap = false;
      }
    }
    s.upright = s.books.filter((b) => !s.stack.includes(b));
    const last = s.upright[s.upright.length - 1];
    if (!s.stack.length && last && hash(last.id + "lean") % 3 === 0) last.sp.tilt = { rot: -3.5, origin: "0 0", end: true };
    // a gap where a book has been taken out; the book beside it usually leans into the space
    s.gap = null;
    if (s.upright.length >= 10 && hash(s.name + "gap") % 4 !== 0) {
      const before = s.upright[2 + (hash(s.name + "at") % (s.upright.length - 4))];
      const w = (14 + (hash(s.name + "w") % 12)) * k;
      s.gap = { after: before, w };
      if (hash(s.name + "into") % 3) before.sp.tilt = { rot: (Math.atan((w * 0.92) / before.sp.h) * 180) / Math.PI, origin: "100% 100%" };
    }
  }

  // pack sections onto shelves; a section that doesn't fit what's left of a shelf starts a new one,
  // and one longer than a whole shelf continues on the next
  const rows = [];
  let row = null;
  const newRow = () => rows.push((row = { segs: [], used: 0 }));
  newRow();
  for (const s of sections) {
    const units = [];
    for (const b of s.upright) {
      units.push({ kind: "book", b, w: b.sp.w + b.sp.space + (b.sp.tilt?.end ? b.sp.h * 0.07 : 0) });
      if (s.gap?.after === b) units.push({ kind: "gap", w: s.gap.w });
    }
    if (s.stack.length) units.push({ kind: "stack", books: s.stack, w: Math.max(...s.stack.map((b) => b.sp.h)) + 18 });
    const total = units.reduce((n, u) => n + u.w, 0);
    const lead = () => (row.segs.length ? gap : 0);
    if (row.used + lead() + total > avail && row.segs.length && total <= avail) newRow();
    let seg = null, first = true;
    for (const u of units) {
      if (!seg || row.used + u.w > avail) {
        if (seg) newRow();
        else if (row.used + lead() + Math.min(u.w * 4, total) > avail && row.segs.length) newRow();
        row.used += lead();
        seg = { name: s.name, label: first, units: [] };
        first = false;
        row.segs.push(seg);
      }
      seg.units.push(u);
      row.used += u.w;
    }
  }

  shelves.innerHTML = "";
  $("#sections").innerHTML = "";
  rows.forEach((r, ri) => {
    const el = document.createElement("div");
    el.className = "shelfrow";
    let tallest = 0;
    const line = document.createElement("div");
    line.className = "books";
    for (const seg of r.segs) {
      const segEl = document.createElement("div");
      segEl.className = "seg";
      if (seg.label) {
        segEl.id = slug(seg.name);
        const lab = document.createElement("span");
        lab.className = "seg-label";
        lab.textContent = seg.name;
        segEl.append(lab);
        const a = document.createElement("a");
        a.href = `#${segEl.id}`;
        a.textContent = seg.name;
        $("#sections").append(a);
      }
      for (const u of seg.units) {
        if (u.kind === "book") {
          const s = makeSpine(u.b, u.b.sp);
          const tilt = u.b.sp.tilt;
          if (tilt && (!tilt.end || u === seg.units[seg.units.length - 1])) {
            s.classList.add("tilt");
            s.style.setProperty("--rot", `${tilt.rot}deg`);
            s.style.setProperty("--to", tilt.origin);
          }
          if (u.b.sp.space) s.style.marginRight = `${u.b.sp.space}px`;
          wire(u.b, s, s, false);
          segEl.append(s);
          tallest = Math.max(tallest, u.b.sp.h);
        } else if (u.kind === "gap") {
          const g = document.createElement("div");
          g.className = "gapspace";
          g.style.width = `${u.w}px`;
          segEl.append(g);
        } else {
          const st = document.createElement("div");
          st.className = "stack";
          st.style.width = `${u.w - 10}px`;
          let height = 0;
          for (const b of u.books) {
            const f = makeFlat(b, b.sp);
            const s = makeSpine(b, b.sp);
            f.append(s);
            wire(b, f, s, true);
            st.append(f);
            height += b.sp.w;
          }
          segEl.append(st);
          tallest = Math.max(tallest, height);
        }
      }
      line.append(segEl);
    }
    el.style.setProperty("--rh", `${tallest + 36 * k}px`);
    el.append(line);
    const board = document.createElement("div");
    board.className = "board";
    el.append(board);
    shelves.append(el);
  });
  if (document.fonts.status === "loaded") fitTitles();
  if (q.value) search(); // keep search highlighting after a resize
}

// Shrink lettering that doesn't fit its spine; past the floor the title ends in an ellipsis.
function fitTitles() {
  for (const t of shelves.querySelectorAll(".sp-title, .sp-author")) {
    const horiz = !t.classList.contains("v");
    const vertNoWrap = !horiz && !t.classList.contains("wrap");
    let size = parseFloat(getComputedStyle(t).fontSize);
    const floor = horiz ? 6.5 : Math.max(7, size * 0.72);
    const over = () => vertNoWrap ? t.scrollHeight > t.clientHeight + 1
      : t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1;
    while (over() && size > floor) {
      size -= 0.5;
      t.style.fontSize = `${size}px`;
    }
    if (horiz && over()) t.classList.add("brk"); // still too wide at the floor: let long words break
  }
}

function wire(b, el, spineEl, flat) {
  b.el = el;
  b.spineEl = spineEl;
  b.flat = flat;
  spineEl.addEventListener("click", () => { hideTip(); openBook(b); });
  spineEl.addEventListener("mouseenter", () => showTip(b));
  spineEl.addEventListener("mouseleave", hideTip);
  spineEl.addEventListener("focus", () => spineEl.matches(":focus-visible") && showTip(b));
  spineEl.addEventListener("blur", hideTip);
}

// The small panel above a book on hover or keyboard focus: title, author, year and section.
function showTip(b) {
  if (open || (!matchMedia("(hover: hover)").matches && !b.spineEl.matches(":focus-visible"))) return;
  tip.querySelector(".tip-title").textContent = b.title;
  tip.querySelector(".tip-author").textContent = b.author || "";
  tip.querySelector(".tip-meta").textContent = [b.year, b.section].filter(Boolean).join(" · ");
  tip.hidden = false;
  const r = b.el.getBoundingClientRect(), t = tip.getBoundingClientRect();
  const lift = b.flat ? 0 : 7;
  const cx = r.left + r.width / 2;
  const left = Math.min(Math.max(12, cx - t.width / 2), innerWidth - t.width - 12);
  const below = r.top - lift - t.height - 12 < 8;
  tip.classList.toggle("below", below);
  tip.style.setProperty("--ax", `${cx - left}px`);
  tip.style.left = `${left}px`;
  tip.style.top = `${below ? r.bottom + 12 : r.top - lift - t.height - 12}px`;
  requestAnimationFrame(() => tip.classList.add("show"));
}
function hideTip() {
  tip.classList.remove("show");
  tip.hidden = true;
}
addEventListener("scroll", hideTip, { passive: true });

// Where the cover and the note go, for the current window size.
function layout(b) {
  const vw = innerWidth, vh = innerHeight;
  const ratio = b.cover ? b.cover.w / b.cover.h : 0.66;
  if (vw >= 760) {
    let H = Math.min(vh * 0.68, 540), W = H * ratio;
    if (W > vw * 0.34) { W = vw * 0.34; H = W / ratio; }
    const gap = Math.min(72, vw * 0.05), noteW = Math.min(440, vw - W - gap - 64);
    const left = (vw - (W + gap + noteW)) / 2;
    return { W, H, cx: left + W / 2, cy: vh / 2, note: { left: left + W + gap, width: noteW, centerY: vh / 2 } };
  }
  const W = Math.min(vw * 0.56, 240), H = W / ratio;
  return { W, H, cx: vw / 2, cy: 32 + H / 2, note: { left: 20, width: vw - 40, top: 32 + H + 28 } };
}

function buildBook(b, L, D, s0) {
  const { W, H } = L, sp = b.sp;
  book3d.style.width = `${W}px`;
  book3d.style.height = `${H}px`;
  book3d.style.setProperty("--c", sp.bg);
  book3d.style.setProperty("--t", sp.ink);
  book3d.innerHTML = "";
  const face = (cls, css) => {
    const f = document.createElement("div");
    f.className = `face ${cls}`;
    f.style.cssText = css;
    book3d.append(f);
    return f;
  };
  const front = face("front", `transform: translateZ(${D / 2}px)`);
  if (b.cover) front.style.backgroundImage = `url(/covers/${b.id}.jpg)`;
  else {
    front.classList.add("generated");
    front.style.fontSize = `${W / 16}px`;
    front.innerHTML = `<div class="gt"></div><div class="ga"></div>`;
    front.firstChild.textContent = b.title;
    front.lastChild.textContent = b.author || "";
  }
  face("back", `transform: rotateY(180deg) translateZ(${D / 2}px)`);
  // the spine face is a scaled copy of the spine on the shelf, so the first frame matches it exactly
  const spineFace = face("spine-face", `width:${D}px; left:${(W - D) / 2}px; transform: rotateY(-90deg) translateZ(${W / 2}px)`);
  const clone = b.spineEl.cloneNode(true);
  clone.removeAttribute("id");
  clone.tabIndex = -1;
  clone.style.transform = `scale(${1 / s0})`;
  spineFace.append(clone);
  face("pages", `width:${D}px; left:${(W - D) / 2}px; transform: rotateY(90deg) translateZ(${W / 2 - 2}px)`);
  face("edge", `height:${D}px; top:${(H - D) / 2}px; transform: rotateX(90deg) translateZ(${H / 2 - 2}px)`);
  face("edge", `height:${D}px; top:${(H - D) / 2}px; transform: rotateX(-90deg) translateZ(${H / 2 - 2}px)`);
}

function makeAnimation(b) {
  const L = layout(b);
  const r = b.el.getBoundingClientRect();
  // upright: the spine's height is the book's height; flat: its width is. offset sizes ignore any lean.
  const ow = b.el.offsetWidth, oh = b.el.offsetHeight;
  const s0 = (b.flat ? ow : oh) / L.H;
  const D = (b.flat ? oh : ow) / s0;
  const rz = b.flat ? -90 : b.el.classList.contains("tilt") ? parseFloat(b.el.style.getPropertyValue("--rot")) : 0;
  buildBook(b, L, D, s0);
  const T = (cx, cy, s, rotY, z, rotZ) =>
    `translate3d(${cx - L.W / 2}px, ${cy - L.H / 2}px, ${z}px) scale3d(${s}, ${s}, ${s}) rotateZ(${rotZ}deg) rotateY(${rotY}deg)`;
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const anim = book3d.animate([
    { transform: T(x0, y0, s0, 90, (-L.W * s0) / 2, rz), easing: "cubic-bezier(.2,.6,.3,1)" },
    { transform: T(x0, y0 - 6, s0 * 1.04, 90, (-L.W * s0) / 2 + 140, rz), offset: 0.28, easing: "cubic-bezier(.45,0,.2,1)" },
    { transform: T(L.cx, L.cy, 1, 0, -D / 2, 0) },
  ], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1000, fill: "both" });
  placeNote(L);
  return anim;
}

function placeNote(L) {
  note.style.left = `${L.note.left}px`;
  note.style.width = `${L.note.width}px`;
  if (L.note.top != null) { note.style.top = `${L.note.top}px`; return; }
  note.style.top = `${Math.max(24, L.note.centerY - note.offsetHeight / 2)}px`;
}

function fillNote(b) {
  $("#note-section").textContent = b.section;
  $("#note-title").textContent = b.title;
  $("#note-author").textContent = b.author || "";
  $("#note-blurb").textContent = b.blurb || "";
  $("#note-mine").hidden = !b.note;
  $("#note-mine-text").textContent = b.note || "";
  $("#note-facts").textContent = b.year ? `First published ${b.year}` : "";
}

function openBook(b) {
  if (open) return;
  fillNote(b);
  stage.hidden = false;
  book3d.classList.remove("landed");
  const anim = makeAnimation(b);
  open = { b, anim };
  b.el.classList.add("out");
  b.spineEl.classList.add("out");
  document.body.classList.add("reading");
  requestAnimationFrame(() => stage.classList.add("open"));
  anim.onfinish = () => {
    if (open?.anim !== anim || anim.playbackRate < 0) return;
    book3d.classList.add("landed");
    stage.classList.add("ready");
    $("#close").focus({ preventScroll: true });
  };
}

function closeBook() {
  if (!open || open.closing) return;
  const { b, anim } = open;
  open.closing = true;
  book3d.classList.remove("landed");
  stage.classList.remove("ready");
  anim.onfinish = () => {
    b.el.classList.remove("out");
    b.spineEl.classList.remove("out");
    stage.hidden = true;
    book3d.innerHTML = "";
    open = null;
    b.spineEl.focus({ preventScroll: true });
  };
  anim.reverse();
  setTimeout(() => {
    stage.classList.remove("open");
    document.body.classList.remove("reading");
  }, 280);
}

$("#close").addEventListener("click", closeBook);
stage.addEventListener("click", (e) => { if (e.target.classList.contains("veil")) closeBook(); });
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!recommend.hidden) closeRecommend();
  else closeBook();
});

// Search: matches title, author and section, ignoring case and accents (typing "saulen" finds Säulen).
// While a query is typed, the books that don't match fade back on the shelves.
const q = $("#q"), results = $("#results");
const fold = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase();
let hits = [], active = -1;
function search() {
  const words = fold(q.value).split(/\s+/).filter(Boolean);
  shelves.classList.toggle("searching", words.length > 0);
  hits = [];
  for (const b of books) {
    b.hay ??= fold(`${b.title} ${b.author} ${b.section}`);
    const hit = words.length > 0 && words.every((w) => b.hay.includes(w));
    b.spineEl?.classList.toggle("match", hit);
    if (hit) hits.push(b);
  }
  hits.sort((a, c) => (fold(c.title).startsWith(words[0] ?? "") - fold(a.title).startsWith(words[0] ?? "")) || a.title.localeCompare(c.title));
  active = -1;
  results.innerHTML = "";
  if (!words.length) { results.hidden = true; q.setAttribute("aria-expanded", "false"); return; }
  if (!hits.length) results.innerHTML = `<li class="none">No books match that.</li>`;
  hits.slice(0, 8).forEach((b, i) => {
    const li = document.createElement("li");
    li.id = `r${i}`;
    li.setAttribute("role", "option");
    li.innerHTML = `<span class="r-title"></span><span class="r-meta"></span>`;
    li.firstChild.textContent = b.title;
    li.lastChild.textContent = [b.author, b.section].filter(Boolean).join(" · ");
    li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(b); });
    results.append(li);
  });
  if (hits.length > 8) results.insertAdjacentHTML("beforeend", `<li class="none">${hits.length - 8} more highlighted on the shelves</li>`);
  results.hidden = false;
  q.setAttribute("aria-expanded", "true");
}
function highlight(i) {
  const items = [...results.querySelectorAll("[role=option]")];
  if (!items.length) return;
  active = (i + items.length) % items.length;
  items.forEach((li, j) => li.setAttribute("aria-selected", j === active ? "true" : "false"));
  q.setAttribute("aria-activedescendant", items[active].id);
}
function choose(b) {
  results.hidden = true;
  q.setAttribute("aria-expanded", "false");
  b.el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  setTimeout(() => openBook(b), 550);
}
q.addEventListener("input", search);
q.addEventListener("focus", () => { if (q.value) search(); });
q.addEventListener("blur", () => setTimeout(() => { results.hidden = true; q.setAttribute("aria-expanded", "false"); }, 120));
q.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
  else if (e.key === "Enter") { e.preventDefault(); const b = hits[Math.max(active, 0)]; if (b) choose(b); }
  else if (e.key === "Escape") { e.stopPropagation(); q.value = ""; search(); }
});

// Recommend a book: a form in a panel. Turnstile (invisible) loads only when the panel opens.
const SITEKEY = location.hostname.endsWith("whatiamreading.com") ? "0x4AAAAAAGCjHLvBZn9GoK01" : "1x00000000000000000000AA"; // Turnstile test key elsewhere
const recommend = $("#recommend"), form = $("#rec-form"), recError = $("#rec-error");
let opened = 0, token = "", widget = null, sending = false;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.onload = ok;
    s.onerror = fail;
    document.head.append(s);
  });
}
function openRecommend() {
  hideTip();
  recommend.hidden = false;
  document.body.classList.add("panel-open");
  requestAnimationFrame(() => recommend.classList.add("open"));
  opened = Date.now();
  form.elements.title.focus({ preventScroll: true });
  loadTurnstile().then(() => {
    if (widget === null) widget = turnstile.render("#ts", { sitekey: SITEKEY, callback: (t) => (token = t), "expired-callback": () => (token = ""), "refresh-expired": "auto" });
  }).catch(() => {});
}
function closeRecommend() {
  recommend.classList.remove("open");
  document.body.classList.remove("panel-open");
  setTimeout(() => { recommend.hidden = true; }, 250);
  $("#recommend-open").focus({ preventScroll: true });
}
function showError(msg) {
  recError.textContent = msg;
  recError.hidden = !msg;
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (sending) return;
  const data = Object.fromEntries(new FormData(form));
  if (!data.title.trim()) { showError("Please add the book's title."); form.elements.title.focus(); return; }
  if (data.email && !form.elements.email.checkValidity()) { showError("That email address doesn't look right."); form.elements.email.focus(); return; }
  showError("");
  sending = true;
  const btn = $("#rec-send");
  btn.disabled = true;
  btn.textContent = "Sending…";
  // the invisible check usually finishes while the form is filled in; wait a moment if it hasn't
  for (let i = 0; !token && i < 40; i++) await new Promise((r) => setTimeout(r, 150));
  try {
    const res = await fetch("/api/recommend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, opened, token }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong. Please try again.");
    form.hidden = true;
    $("#rec-thanks").hidden = false;
    $("#rec-another").focus({ preventScroll: true });
  } catch (err) {
    showError(err.message);
  } finally {
    sending = false;
    btn.disabled = false;
    btn.textContent = "Send recommendation";
    token = "";
    if (widget !== null) turnstile.reset(widget);
  }
});
form.addEventListener("input", () => showError(""));
$("#recommend-open").addEventListener("click", openRecommend);
$("#recommend-close").addEventListener("click", closeRecommend);
recommend.querySelector(".panel-veil").addEventListener("click", closeRecommend);
$("#rec-another").addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  $("#rec-thanks").hidden = true;
  opened = Date.now();
  form.elements.title.focus();
});

let resizeTimer, lastWidth = innerWidth;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (open && !open.closing) {
      open.anim.cancel();
      open.anim = makeAnimation(open.b);
      open.anim.finish();
      book3d.classList.add("landed");
    } else if (!open && innerWidth !== lastWidth) {
      lastWidth = innerWidth;
      render();
    }
  }, 150);
});

fetch("/books.json")
  .then((r) => r.json())
  .then((data) => { books = data; render(); document.fonts.ready.then(fitTitles); });
