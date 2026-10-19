// Барлық беттерге ортақ көмекші функциялар.
(function () {
  var LANGS = ["kk", "ru", "en"];
  var LANG_LABELS = { kk: "ҚАЗ", ru: "РУС", en: "ENG" };

  var CATEGORIES = {
    history: "#b23a2a",
    poet: "#3d7a3a",
    hero: "#2f5d9b",
    science: "#c08a12",
    music: "#7a4a8c",
    place: "#6b5440"
  };

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (LANGS.indexOf(q) >= 0) { storageSet("lang", q); return q; }
    var saved = storageGet("lang");
    return LANGS.indexOf(saved) >= 0 ? saved : "kk";
  }

  var lang = detectLang();
  document.documentElement.lang = lang === "kk" ? "kk" : lang;

  function t(key, vars) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.kk[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }

  // Көп тілді өріс: {kk, ru, en}. Таңдалған тілде бос болса — қазақшасы.
  var usedFallback = false;
  function tx(field) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    var v = field[lang];
    if (v) return v;
    if (field.kk && lang !== "kk") usedFallback = true;
    return field.kk || "";
  }
  function txOrDash(field) { return tx(field) || "—"; }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(name + ": " + r.status);
        return r.json();
      });
    }
    return cache[name];
  }

  function baseUrl() {
    var b = (window.BASE_URL || "").trim();
    if (b) return b.charAt(b.length - 1) === "/" ? b : b + "/";
    return location.href.split("#")[0].split("?")[0].replace(/[^/]*$/, "");
  }
  function objectUrl(id) { return "object.html?id=" + id; }
  function shortUrl(id) { return baseUrl() + "#n" + id; }

  function sourceUrl(src, sources) { return (sources && sources[src]) || src; }
  function sourceLabel(url) {
    try {
      var u = new URL(url);
      var host = u.hostname.replace(/^www\./, "");
      var path = decodeURIComponent(u.pathname);
      if (/wikipedia\.org$/.test(host) || /cyclowiki\.org$/.test(host)) {
        return host + " — " + path.split("/").pop().replace(/_/g, " ");
      }
      return host;
    } catch (e) { return url; }
  }

  function formatDist(m) {
    if (m < 1000) return Math.round(m / 10) * 10 + " " + t("m");
    return (m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", lang === "en" ? "." : ",") + " " + t("km");
  }

  function distance(lat1, lon1, lat2, lon2) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function catColor(cat) { return CATEGORIES[cat] || CATEGORIES.place; }

  function markerIcon(label, cat, opts) {
    opts = opts || {};
    var size = opts.small ? 26 : 34;
    return L.divIcon({
      className: "num-marker-wrap",
      html: '<span class="num-marker' + (opts.small ? " small" : "") + '" style="background:' + catColor(cat) + '">' + esc(label) + "</span>",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  }

  var TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  function makeMap(el, opts) {
    var map = L.map(el, Object.assign({ scrollWheelZoom: false, tap: true }, opts || {}));
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    return map;
  }

  // Фото: файл болса — сурет, болмаса — placeholder.
  function photo(src, alt, placeholderLabel, extraClass) {
    var wrap = document.createElement("figure");
    wrap.className = "photo is-empty " + (extraClass || "");
    wrap.innerHTML = '<div class="photo-ph"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 38 18 24l8 9 6-6 10 11z" fill="currentColor" opacity=".35"/><circle cx="33" cy="15" r="5" fill="currentColor" opacity=".35"/><rect x="3" y="7" width="42" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/></svg><span>' + esc(placeholderLabel) + "</span></div>";
    var img = new Image();
    img.alt = alt;
    img.decoding = "async";
    img.onload = function () {
      // Барлық фото бірдей 4:3 жақтауда: фото толық көрінеді,
      // бос орын сол фотоның бұлдыр көшірмесімен толтырылады.
      var bg = new Image();
      bg.src = src;
      bg.alt = "";
      bg.className = "photo-bg";
      bg.setAttribute("aria-hidden", "true");
      img.className = "photo-fg";
      wrap.classList.remove("is-empty");
      wrap.innerHTML = "";
      wrap.appendChild(bg);
      wrap.appendChild(img);
    };
    img.src = src;
    return wrap;
  }

  // Файл бар-жоғын тексеру (сурет үшін).
  function imageExists(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  // Аудио: файл болса — ойнатқыш, болмаса — ештеңе.
  function audioPlayer(src, container, title) {
    var audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", function () {
      container.innerHTML = '<h2 class="h-small">' + esc(title) + "</h2>";
      container.appendChild(audio);
      container.hidden = false;
    }, { once: true });
    audio.src = src;
  }

  function setLang(next) {
    storageSet("lang", next);
    var url = new URL(location.href);
    url.searchParams.delete("lang");
    location.href = url.toString();
  }

  var NAV = [
    ["index", "index.html", "navMap"],
    ["route", "route.html", "navRoute"],
    ["quiz", "quiz.html", "navQuiz"],
    ["about", "about.html", "navAbout"],
    ["share", "share.html", "navShare"],
    ["qr", "qr.html", "navQr"],
    ["print", "print.html", "navPrint"]
  ];

  function renderShell(active) {
    document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = t(el.dataset.t); });
    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="bar">' +
      '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">✦</span><span>' + esc(t("siteTitle")) + "</span></a>" +
      '<div class="lang" role="group" aria-label="' + esc(t("langLabel")) + '">' +
      LANGS.map(function (l) {
        return '<button type="button" data-lang="' + l + '"' + (l === lang ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + LANG_LABELS[l] + "</button>";
      }).join("") +
      "</div></div>" +
      '<nav class="nav" aria-label="Menu"><div class="nav-inner">' +
      NAV.map(function (n) {
        return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : "") + ">" + esc(t(n[2])) + "</a>";
      }).join("") +
      "</div></nav>";
    document.body.insertBefore(header, document.body.firstChild);
    header.querySelectorAll("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { if (b.dataset.lang !== lang) setLang(b.dataset.lang); });
    });
    var cur = header.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = "<p>" + esc(t("footerAuthors")) + "</p><p>" + esc(t("footerMap")) + "</p>";
    document.body.appendChild(footer);
    document.title = (document.body.dataset.title ? t(document.body.dataset.title) + " · " : "") + t("siteTitle");
  }

  function fallbackNote() {
    if (lang === "kk" || !usedFallback) return "";
    return '<p class="lang-note">' + esc(t("onlyKk")) + "</p>";
  }

  function showError(container, err) {
    console.error(err);
    container.innerHTML = '<p class="error">' + esc(t("loadError")) + "</p>";
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  window.App = {
    lang: lang,
    langs: LANGS,
    categories: CATEGORIES,
    t: t, tx: tx, txOrDash: txOrDash, esc: esc,
    load: load,
    baseUrl: baseUrl, objectUrl: objectUrl, shortUrl: shortUrl,
    sourceUrl: sourceUrl, sourceLabel: sourceLabel,
    formatDist: formatDist, distance: distance,
    catColor: catColor, markerIcon: markerIcon, makeMap: makeMap,
    photo: photo, imageExists: imageExists, audioPlayer: audioPlayer,
    renderShell: renderShell, fallbackNote: fallbackNote, showError: showError,
    shuffle: shuffle,
    storageGet: storageGet, storageSet: storageSet
  };
})();
