// The shelf: one row of generated spines per section. Clicking a spine pulls the book out
// (a 3D box that starts exactly where the spine sits), turns it to show the cover and opens the note.

const PALETTE = ["#7a2e2a", "#2f4a6b", "#3f6b5c", "#c9a24d", "#5b3d5e", "#1f3b3a", "#a5532f", "#e6dccb", "#34495e", "#8c6d46", "#4c5c2c", "#d8cbb0"];
const BIG = new Set(["Cooking & Food", "Art, Design & Photography", "Home, Craft & Reference"]);

const $ = (s) => document.querySelector(s);
const shelves = $("#shelves"), stage = $("#stage"), book3d = $("#book3d"), note = $("#note");
let books = [], open = null;

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inkFor(hex, h) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum > 0.55) return "#1f1c19";
  return h % 3 === 0 ? "#e5c784" : "#f6f1e7"; // some dark spines get gold lettering
}

function spineLook(b) {
  const h = hash(b.id + b.title);
  const k = innerWidth < 720 ? 0.78 : 1;
  const big = BIG.has(b.section);
  const pages = b.pages || 220 + (h % 160);
  const w = Math.max(20, Math.min(66, big ? pages / 7 : pages / 11)) * k;
  const height = (big ? 204 + (h % 26) : b.section === "Children's & YA" ? 172 + (h % 40) : 166 + (h % 36)) * k;
  const c = b.color || PALETTE[h % PALETTE.length];
  return { w, h: height, c, t: inkFor(c, h >> 3), fs: Math.max(10, Math.min(17, w * 0.42)), font: `f${(h >> 5) % 4}`, deco: `d${(h >> 7) % 4}` };
}

function spineInner(b) {
  const t = document.createElement("span");
  t.className = "t";
  t.textContent = b.title;
  return t;
}

function render() {
  const bySection = new Map();
  for (const b of books) (bySection.get(b.section) || bySection.set(b.section, []).get(b.section)).push(b);
  $("#count").textContent = `${books.length}`;
  $("#sections").innerHTML = "";
  shelves.innerHTML = "";
  for (const [section, list] of bySection) {
    const a = document.createElement("a");
    a.href = `#${slug(section)}`;
    a.textContent = section;
    $("#sections").append(a);

    const shelf = document.createElement("section");
    shelf.className = "shelf";
    shelf.id = slug(section);
    shelf.innerHTML = `<h2>${section} <small>${list.length}</small></h2>`;
    const rows = document.createElement("div");
    rows.className = "rows";
    for (const b of list) {
      const look = (b.look = spineLook(b));
      const slot = document.createElement("div");
      slot.className = "slot";
      const s = document.createElement("button");
      s.className = `spine ${look.font} ${look.deco}${b.de ? " de" : ""}`;
      s.style.cssText = `--w:${look.w}px;--h:${look.h}px;--c:${look.c};--t:${look.t};--fs:${look.fs}px`;
      s.setAttribute("aria-label", b.author ? `${b.title} by ${b.author}` : b.title);
      s.title = b.title;
      s.append(spineInner(b));
      s.addEventListener("click", () => openBook(b, s));
      b.el = s;
      slot.append(s);
      rows.append(slot);
    }
    shelf.append(rows);
    shelves.append(shelf);
  }
}

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

function buildBook(b, L, D) {
  const { W, H } = L, look = b.look;
  book3d.style.width = `${W}px`;
  book3d.style.height = `${H}px`;
  book3d.style.setProperty("--c", look.c);
  book3d.style.setProperty("--t", look.t);
  book3d.innerHTML = "";
  const face = (cls, css) => {
    const f = document.createElement("div");
    f.className = `face ${cls}`;
    f.style.cssText = css;
    book3d.append(f);
    return f;
  };
  const front = face("front", `transform: translateZ(${D / 2}px)`);
  if (b.cover) front.style.backgroundImage = `url(covers/${b.id}.jpg)`;
  else {
    front.classList.add("generated");
    front.style.fontSize = `${W / 16}px`;
    front.innerHTML = `<div class="gt"></div><div class="ga"></div>`;
    front.firstChild.textContent = b.title;
    front.lastChild.textContent = b.author || "";
  }
  face("back", `transform: rotateY(180deg) translateZ(${D / 2}px)`);
  const s0 = b.el.getBoundingClientRect().height / H;
  const spine = face(`spine-face ${look.font} ${look.deco}${b.de ? " de" : ""}`,
    `width:${D}px; left:${(W - D) / 2}px; transform: rotateY(-90deg) translateZ(${W / 2}px); font-size:${look.fs / s0}px; padding:${10 / s0}px 0`);
  spine.append(spineInner(b));
  face("pages", `width:${D}px; left:${(W - D) / 2}px; transform: rotateY(90deg) translateZ(${W / 2 - 2}px)`);
  face("edge", `height:${D}px; top:${(H - D) / 2}px; transform: rotateX(90deg) translateZ(${H / 2 - 2}px)`);
  face("edge", `height:${D}px; top:${(H - D) / 2}px; transform: rotateX(-90deg) translateZ(${H / 2 - 2}px)`);
}

function makeAnimation(b) {
  const L = layout(b);
  const r = b.el.getBoundingClientRect();
  const s0 = r.height / L.H;
  const D = r.width / s0; // book depth, so the spine face matches the spine on the shelf
  buildBook(b, L, D);
  const T = (cx, cy, s, rot, z) =>
    `translate3d(${cx - L.W / 2}px, ${cy - L.H / 2}px, ${z}px) scale3d(${s}, ${s}, ${s}) rotateY(${rot}deg)`;
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const anim = book3d.animate([
    { transform: T(x0, y0, s0, 90, (-L.W * s0) / 2), easing: "cubic-bezier(.2,.6,.3,1)" },
    { transform: T(x0, y0 - 6, s0 * 1.04, 90, (-L.W * s0) / 2 + 140), offset: 0.28, easing: "cubic-bezier(.45,0,.2,1)" },
    { transform: T(L.cx, L.cy, 1, 0, -D / 2) },
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

function openBook(b, el) {
  if (open) return;
  fillNote(b);
  stage.hidden = false;
  book3d.classList.remove("landed");
  const anim = makeAnimation(b);
  open = { b, anim };
  el.classList.add("out");
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
    stage.hidden = true;
    book3d.innerHTML = "";
    open = null;
    b.el.focus({ preventScroll: true });
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

let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (open && !open.closing) {
      // re-measure from the spine's new place and jump to the end state
      open.anim.cancel();
      open.anim = makeAnimation(open.b);
      open.anim.finish();
      book3d.classList.add("landed");
    } else if (!open) {
      render();
    }
  }, 150);
});

fetch("books.json")
  .then((r) => r.json())
  .then((data) => { books = data; render(); });
