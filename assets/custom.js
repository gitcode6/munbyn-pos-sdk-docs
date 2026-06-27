(function () {
  "use strict";

  var SRC = "de";
  var DST = "en";
  var KEY = "googtrans";

  // ── Cookie-Hilfsfunktionen ─────────────────────────────────────────────────

  function isTranslated() {
    return document.cookie.indexOf(KEY + "=/" + SRC + "/" + DST) !== -1;
  }

  function applyLang(enable) {
    var val  = enable ? ("/" + SRC + "/" + DST) : ("/" + SRC + "/" + SRC);
    var base = KEY + "=" + val + "; path=/";
    document.cookie = base;
    if (window.location.hostname) {
      document.cookie = base + "; domain=" + window.location.hostname;
    }
    window.location.reload();
  }

  // ── Button ─────────────────────────────────────────────────────────────────

  function buildButton(active) {
    var btn = document.createElement("button");
    btn.id        = "tsd-lang-toggle";
    btn.className = "tsd-widget";
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.title = active ? "Auf Deutsch wechseln" : "Switch to English";

    var icon  = document.createElement("span");
    icon.className   = "lang-icon";
    icon.textContent = "🌐";

    var label = document.createElement("span");
    label.className   = "lang-label";
    label.textContent = active ? "DE" : "EN";

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener("click", function () { applyLang(!isTranslated()); });
    return btn;
  }

  // ── Google Translate — nur wenn Übersetzung aktiv ist ─────────────────────

  window.googleTranslateElementInit = function () {
    new window.google.translate.TranslateElement(
      { pageLanguage: SRC, includedLanguages: DST, autoDisplay: false },
      "tsd-gt-hidden"
    );
  };

  function loadGoogleTranslate() {
    var hidden = document.createElement("div");
    hidden.id = "tsd-gt-hidden";
    document.body.appendChild(hidden);

    var s = document.createElement("script");
    s.async = true;
    s.src   = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.head.appendChild(s);
  }

  // ── Einhängen ──────────────────────────────────────────────────────────────

  function mount() {
    var slot = document.getElementById("tsd-toolbar-links");
    if (!slot) return;

    var active = isTranslated();
    slot.appendChild(buildButton(active));

    // Google Translate nur laden wenn Cookie gesetzt (EN-Modus aktiv)
    if (active) {
      loadGoogleTranslate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
