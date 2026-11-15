// The shelf, second version: white shelves wall to wall and spines drawn to look like real books.
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
const ORNAMENTS = [
  // dark speckled ceramic pot
  { w: 92, svg: `<svg width="92" height="70" viewBox="0 0 92 70" aria-hidden="true"><defs><radialGradient id="pot" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5d6b70"/><stop offset=".55" stop-color="#2a3236"/><stop offset="1" stop-color="#14191b"/></radialGradient><pattern id="speck" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".9" fill="#8fb2b8" opacity=".55"/><circle cx="6.5" cy="7" r=".6" fill="#c9d8d6" opacity=".45"/></pattern></defs><ellipse cx="46" cy="66" rx="34" ry="4" fill="rgba(40,30,20,.18)"/><path d="M8 40C8 18 26 6 46 6s38 12 38 34c0 16-14 26-38 26S8 56 8 40z" fill="url(#pot)"/><path d="M8 40C8 18 26 6 46 6s38 12 38 34c0 16-14 26-38 26S8 56 8 40z" fill="url(#speck)"/><ellipse cx="46" cy="8" rx="13" ry="3" fill="#0d1112"/><path d="M22 20c6-7 14-10 22-10" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
  // plant in a white pot
  { w: 84, svg: `<svg width="84" height="104" viewBox="0 0 84 104" aria-hidden="true"><defs><linearGradient id="wp" x1="0" x2="1"><stop offset="0" stop-color="#e4e0d8"/><stop offset=".35" stop-color="#ffffff"/><stop offset="1" stop-color="#d6d1c8"/></linearGradient><linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fa66a"/><stop offset="1" stop-color="#3f6b3a"/></linearGradient></defs><ellipse cx="42" cy="101" rx="24" ry="3" fill="rgba(40,30,20,.18)"/><path d="M42 62C36 44 20 36 6 36c8 14 20 24 36 26z" fill="url(#lf)"/><path d="M42 62c2-20 14-34 32-38-6 16-16 30-32 38z" fill="url(#lf)"/><path d="M42 64c-8-22-5-42 6-56 5 18 2 38-6 56z" fill="#5f8f4f"/><path d="M42 64C30 54 14 54 4 60c12 6 26 7 38 4z" fill="#4b7a40"/><path d="M42 64c11-11 26-13 37-7-11 6-24 8-37 7z" fill="#557f45"/><path d="M20 64h44l-4 36H24z" fill="url(#wp)"/><path d="M18 60h48v6H18z" fill="#f4f1ec"/><path d="M18 66h48" stroke="#d9d4cb"/></svg>` },
];

const $ = (s) => document.querySelector(s);
const shelves = $("#shelves"), stage = $("#stage"), book3d = $("#book3d"), note = $("#note"), tip = $("#tip");
let books = [], open = null;

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
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
  else if (thickMm >= 34 && (h >>> 9) % 3) layout = "horiz";
  else layout = ["classic", "rules", "band", "bold", "head", "classic"][(h >>> 11) % 6];
  const font = FONTS[(h >>> 13) % FONTS.length];
  const fs = layout === "horiz" ? Math.min(20, Math.max(10, w * 0.34)) : Math.min(19, Math.max(8.5, w * 0.47));
  return { fmt, type, layout, font, w, h: height, thickMm, heightMm, bg, ink, acc, ink3: inkOn(acc), fs,
    mark: MARKS[(h >>> 17) % MARKS.length], wrap: layout !== "horiz" && b.title.length > 22 && w > 26 };
}

function makeSpine(b, sp) {
  const s = document.createElement("button");
  s.className = `spine ${sp.type} l-${sp.layout}${b.de ? " de" : ""}`;
  s.style.cssText = `--w:${sp.w}px;--h:${sp.h}px;--bg:${sp.bg};--ink2:${sp.ink};--acc:${sp.acc};--acc2:${sp.ink};--ink3:${sp.ink3};` +
    `--fs:${sp.fs}px;--ff:${sp.font.ff};--fw:${sp.font.fw};--tt:${sp.font.tt || "none"};--ls:${sp.font.ls || "0"};` +
    `--ffa:${sp.font.ff.includes("serif") && !sp.font.ff.includes("sans") ? sp.font.ff : '"Inter", sans-serif'}`;
  s.dataset.id = b.id;
  s.setAttribute("aria-label", b.author ? `${b.title} by ${b.author}` : b.title);
  const vert = sp.layout !== "horiz" ? " v" : "";
  const surname = (b.author || "").split(";")[0].replace(/\(ed\.\)/, "").trim().split(" ").pop();
  const author = document.createElement("span");
  author.className = `sp-author${vert}`;
  author.textContent = sp.layout === "horiz" || sp.layout === "cloth" ? surname : (b.author || "").split(";")[0].replace(/\(ed\.\)/, "").trim();
  const title = document.createElement("span");
  title.className = `sp-title${vert}${sp.wrap ? " wrap" : ""}`;
  title.textContent = b.title;
  const mark = document.createElement("span");
  mark.className = "sp-mark";
  mark.innerHTML = sp.mark;
  if (sp.layout === "horiz" || sp.layout === "cloth") s.append(title, author, mark);
  else s.append(author, title, mark);
  if (!b.author) author.remove();
  return s;
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
  }

  // pack sections onto shelves; a section that doesn't fit what's left of a shelf starts a new one,
  // and one longer than a whole shelf continues on the next
  const rows = [];
  let row = null;
  const newRow = () => rows.push((row = { segs: [], used: 0 }));
  newRow();
  for (const s of sections) {
    const units = s.upright.map((b) => ({ kind: "book", b, w: b.sp.w }));
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
  $("#count").textContent = `${books.length}`;
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
          wire(u.b, s, s, false);
          segEl.append(s);
          tallest = Math.max(tallest, u.b.sp.h);
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
    // one ornament on a shelf with room to spare
    const spare = avail - r.used;
    if (spare > 200) {
      const o = ORNAMENTS[ri % ORNAMENTS.length];
      const orn = document.createElement("div");
      orn.className = "ornament";
      orn.innerHTML = o.svg;
      orn.style.right = `${side + Math.min(spare - o.w - 40, 30 + (hash(String(ri)) % 120))}px`;
      orn.style.bottom = `calc(var(--topface) + var(--front))`;
      if (k < 1) orn.style.transform = `scale(${k})`, orn.style.transformOrigin = "100% 100%";
      el.append(orn);
    }
    shelves.append(el);
  });
  if (document.fonts.status === "loaded") fitTitles();
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
  // upright: the spine's height is the book's height; flat: its width is
  const s0 = (b.flat ? r.width : r.height) / L.H;
  const D = (b.flat ? r.height : r.width) / s0;
  const rz = b.flat ? -90 : 0;
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
addEventListener("keydown", (e) => { if (e.key === "Escape") closeBook(); });

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
