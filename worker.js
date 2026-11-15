// whatiamreading.com: the bookshelf is static files (web/public); this Worker only answers /api/*.
// POST /api/recommend stores a visitor's book recommendation in D1 and emails it to Andreas.
// Spam checks, none of which a visitor sees: Turnstile in invisible mode, a hidden field only robots
// fill in, a minimum time with the form open, length limits, and at most five per visitor an hour.
import { EmailMessage } from "cloudflare:email";

const FROM = "library@whatiamreading.com";
const PER_HOUR = 5;

const clean = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mail(env, r) {
  const body = `${r.title}${r.author ? ` by ${r.author}` : ""}\n\n${r.note || "(no note)"}\n\n` +
    `From: ${r.name || "no name given"}${r.email ? ` <${r.email}>` : ""}\nCountry: ${r.country || "?"}\n`;
  const bytes = new TextEncoder().encode(body);
  let b64 = "";
  for (let i = 0; i < bytes.length; i += 57) b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + 57))) + "\r\n";
  const subject = `Book recommendation: ${r.title}`.replace(/[^\x20-\x7e]/g, "?").slice(0, 150);
  const raw = [`From: What I Am Reading <${FROM}>`, `To: ${env.RECOMMEND_TO}`, ...(r.email ? [`Reply-To: ${r.email}`] : []),
    `Subject: ${subject}`, `Message-ID: <${crypto.randomUUID()}@whatiamreading.com>`, `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64].join("\r\n");
  return env.MAIL.send(new EmailMessage(FROM, env.RECOMMEND_TO, raw));
}

async function recommend(request, env) {
  const f = await request.json().catch(() => null);
  if (!f) return Response.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  // robots: the hidden field is filled in, or the form went back in under three seconds. Answer as if it worked.
  if (f.website || !(Date.now() - Number(f.opened) >= 3000)) return new Response(null, { status: 204 });

  const r = {
    title: clean(f.title, 200), author: clean(f.author, 200), note: String(f.note ?? "").trim().slice(0, 1500),
    name: clean(f.name, 100), email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean(f.email, 200)) ? clean(f.email, 200) : "",
    country: request.cf?.country ?? "",
  };
  if (!r.title) return Response.json({ error: "Please add the book's title." }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(f.token ?? ""), remoteip: ip }),
  }).then((x) => x.json()).catch(() => ({ success: false }));
  if (!check.success) return Response.json({ error: "We couldn't confirm you're not a robot. Please reload the page and try again." }, { status: 403 });

  const ipHash = await sha256(`whatiamreading:${ip}`);
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM recommendations WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')")
    .bind(ipHash).first();
  if (n >= PER_HOUR) return Response.json({ error: "Thank you, that's plenty for now. Please try again in an hour." }, { status: 429 });

  const row = await env.DB.prepare("INSERT INTO recommendations (title, author, note, name, email, country, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id")
    .bind(r.title, r.author, r.note, r.name, r.email, r.country, ipHash).first();
  try {
    await mail(env, r);
    await env.DB.prepare("UPDATE recommendations SET emailed = 1 WHERE id = ?").bind(row.id).run();
  } catch (e) {
    console.error("recommendation not emailed:", e.message); // it is saved in D1 either way
  }
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/recommend") {
      return request.method === "POST" ? recommend(request, env) : new Response("Not here", { status: 405 });
    }
    return env.ASSETS.fetch(request);
  },
};
