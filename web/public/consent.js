// Loads the Google tag, and asks visitors from Europe first.
// The Worker says whether the visitor is in the EU, the rest of the EEA, the UK or Switzerland
// (/geo). There the tag is loaded only after "Accept", and never after "No thanks". Elsewhere it
// is loaded at once. If the place cannot be found out, the visitor is asked. The choice is kept in
// this browser (localStorage "consent") and can be changed on the privacy page.
(function () {
  var TAG = "GTM-TGJWDV3Q";
  function choice() { try { return localStorage.getItem("consent"); } catch (e) { return null; } }
  function keep(value) { try { localStorage.setItem("consent", value); } catch (e) { /* private window */ } }

  function loadTag() {
    if (window.__tagLoaded) return;
    window.__tagLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + TAG;
    document.head.appendChild(s);
  }

  function ask() {
    if (document.getElementById("consent")) return;
    var box = document.createElement("div");
    box.id = "consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Cookies");
    box.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:30;max-width:540px;margin:0 auto;padding:16px 18px;" +
      "background:#fff;color:#1f1c19;border:1px solid #e6e1d9;border-radius:14px;box-shadow:0 18px 40px -14px rgba(40,30,20,.35);" +
      "font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
    box.innerHTML = '<p style="margin:0 0 12px">This site would like to use Google Analytics cookies to count visits. ' +
      'The shelves work the same either way. <a href="/privacy" style="color:#a4472f">Privacy</a></p>' +
      '<button id="consent-yes" style="margin-right:8px;height:38px;padding:0 18px;border:1px solid #1f1c19;border-radius:19px;background:#1f1c19;color:#fff;font:500 14px Inter,sans-serif;cursor:pointer">Accept</button>' +
      '<button id="consent-no" style="height:38px;padding:0 18px;border:1px solid #1f1c19;border-radius:19px;background:#fff;color:#1f1c19;font:500 14px Inter,sans-serif;cursor:pointer">No thanks</button>';
    document.body.appendChild(box);
    document.getElementById("consent-yes").onclick = function () { keep("granted"); box.remove(); loadTag(); };
    document.getElementById("consent-no").onclick = function () { keep("denied"); box.remove(); };
  }
  // for the "change my choice" link on the privacy page
  window.askConsent = function () { try { localStorage.removeItem("consent"); } catch (e) { /* private window */ } ask(); };

  function start() {
    var c = choice();
    if (c === "granted") return loadTag();
    if (c === "denied") return;
    fetch("/geo").then(function (r) { return r.json(); })
      .then(function (g) { if (g.ask) ask(); else loadTag(); })
      .catch(ask);
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
