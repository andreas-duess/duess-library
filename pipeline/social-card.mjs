// Renders web/public/social-card.jpg (1200x630, for Twitter/X and Open Graph) from the live page:
// the headline over the first shelves, with the search, buttons and section links hidden.
//   cd web/public && python3 -m http.server 8765 &
//   node pipeline/social-card.mjs        (needs playwright and Google Chrome; OUT=path to write elsewhere)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const out = process.env.OUT || fileURLToPath(new URL("../web/public/social-card.jpg", import.meta.url));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8765/", { waitUntil: "networkidle" });
await page.addStyleTag({ content: `
  .tools, #sections { display: none !important; }
  .masthead { padding: 46px 24px 34px !important; }
  h1 { font-size: 64px !important; }
` });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: out, type: "jpeg", quality: 82 });
await browser.close();
console.log("wrote", out);
