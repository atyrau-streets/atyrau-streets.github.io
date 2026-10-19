// Ақылды іздеу: қате терілген сөздерді, синонимдерді («ул. Абая», «Абай көшесі»)
// және ескі атауларды түсінеді.
(function () {
  var LETTERS = { "ә": "а", "ғ": "г", "қ": "к", "ң": "н", "ө": "о", "ұ": "у", "ү": "у", "һ": "х", "і": "и", "ё": "е", "й": "и", "ъ": "", "ь": "" };
  var STOP = [
    "ул", "улица", "улицы", "көше", "көшесі", "кошеси", "кошеси", "проспект", "пр", "пр-т", "даңғылы", "дангылы",
    "street", "st", "ave", "avenue", "пер", "переулок", "тұйық", "памятник", "ескерткіш", "ескерткіші",
    "монумент", "монументі", "monument", "имени", "им", "атындағы", "мен", "и", "and", "the", "of"
  ].map(normalizeWord);

  function normalizeWord(w) {
    return w.toLowerCase().replace(/[әғқңөұүһіёйъь]/g, function (c) { return LETTERS[c]; });
  }

  function tokens(s) {
    return normalizeWord(String(s || ""))
      .replace(/[«»"'“”„.,;:!?()\[\]\/\\—–-]+/g, " ")
      .split(/\s+/)
      .filter(function (w) { return w && STOP.indexOf(w) < 0; });
  }

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i], rowMin = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  // Бір сөздің бір сөзбен ұқсастығы (0..1).
  function wordScore(q, w) {
    if (q === w) return 1;
    if (w.indexOf(q) === 0) return q.length >= 2 ? 0.9 : 0.5;
    // Септік жалғаулары: «Абая» ~ «Абай», «Курмангазы» ~ «Курмангазы»
    var stem = Math.min(q.length, w.length) - 1;
    if (stem >= 3 && q.slice(0, stem) === w.slice(0, stem)) return 0.8;
    if (q.length >= 4 && w.indexOf(q) > 0) return 0.7;
    var max = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
    if (max && lev(q, w.slice(0, q.length + max), max) <= max) return 0.65;
    if (max && lev(q, w, max) <= max) return 0.65;
    return 0;
  }

  function scoreEntry(qTokens, entryTokens) {
    if (!qTokens.length) return 0;
    var total = 0;
    for (var i = 0; i < qTokens.length; i++) {
      var best = 0;
      for (var j = 0; j < entryTokens.length; j++) {
        var s = wordScore(qTokens[i], entryTokens[j]);
        if (s > best) best = s;
      }
      if (best === 0) return 0;
      total += best;
    }
    return total / qTokens.length;
  }

  // entries: [{ label, sub, href, terms: [string], oldTerms: [string], oldLabel }]
  function buildIndex(data, streets) {
    var t = App.t, tx = App.tx, entries = [];
    data.objects.forEach(function (o) {
      var names = App.langs.map(function (l) { return o.name[l]; }).filter(Boolean);
      entries.push({
        kind: "object",
        label: o.id + ". " + tx(o.name),
        sub: tx(o.type) + (o.year && o.year !== "—" ? " · " + o.year : ""),
        href: App.objectUrl(o.id),
        color: App.catColor(o.category),
        terms: names.concat(o.aliases || [], [String(o.id)]),
        oldTerms: []
      });
    });
    (streets || []).forEach(function (s) {
      var olds = (s.old_names || []).map(function (n) { return n.name; });
      entries.push({
        kind: "street",
        label: tx(s.name),
        sub: tx(s.person),
        href: s.object_id ? App.objectUrl(s.object_id) : "index.html#street-" + encodeURIComponent(s.id),
        color: App.catColor(s.category),
        terms: App.langs.map(function (l) { return s.name[l]; }).filter(Boolean).concat(s.osm_name ? [s.osm_name] : []),
        oldTerms: olds,
        oldNames: s.old_names || []
      });
    });
    if (data.city) {
      entries.push({
        kind: "city",
        label: tx(data.city.name),
        sub: t("cityTitle"),
        href: "index.html#city",
        terms: App.langs.map(function (l) { return data.city.name[l]; }),
        oldTerms: App.langs.map(function (l) { return data.city.old_name[l]; }),
        oldNames: [{ name: tx(data.city.old_name), period: "1640–1991" }]
      });
    }
    entries.forEach(function (e) {
      e.tok = [].concat.apply([], e.terms.map(tokens));
      e.oldTok = [].concat.apply([], e.oldTerms.map(tokens));
    });
    return entries;
  }

  function search(entries, query) {
    var q = tokens(query);
    if (!q.length) return [];
    var out = [];
    entries.forEach(function (e) {
      var s = scoreEntry(q, e.tok);
      var sOld = e.oldTok.length ? scoreEntry(q, e.oldTok) : 0;
      var best = Math.max(s, sOld * 0.98);
      if (best >= 0.6) out.push({ entry: e, score: best, viaOld: sOld > s });
    });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
  }

  function attach(input, list, entries) {
    var results = [], active = -1;
    var esc = App.esc, t = App.t;

    function render() {
      if (!input.value.trim()) { list.hidden = true; list.innerHTML = ""; input.setAttribute("aria-expanded", "false"); return; }
      results = search(entries, input.value);
      active = results.length ? 0 : -1;
      if (!results.length) {
        list.innerHTML = '<li class="sr-empty">' + esc(t("searchNoResults")) + "</li>";
      } else {
        list.innerHTML = results.map(function (r, i) {
          var e = r.entry, sub = e.sub;
          if (r.viaOld && e.oldNames) {
            sub = t("searchOldName") + ": " + e.oldNames.map(function (n) { return n.name; }).join(", ") + " → " + t("searchNow") + ": " + e.label;
          }
          return '<li role="option" id="sr-' + i + '"' + (i === active ? ' aria-selected="true"' : "") + '><a href="' + esc(e.href) + '">' +
            (e.color ? '<span class="dot" style="background:' + e.color + '"></span>' : "") +
            '<span class="sr-text"><strong>' + esc(e.label) + "</strong>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></a></li>";
        }).join("");
      }
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function highlight() {
      list.querySelectorAll("li[role=option]").forEach(function (li, i) {
        li.setAttribute("aria-selected", i === active ? "true" : "false");
      });
    }

    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown" && results.length) { active = (active + 1) % results.length; highlight(); ev.preventDefault(); }
      else if (ev.key === "ArrowUp" && results.length) { active = (active - 1 + results.length) % results.length; highlight(); ev.preventDefault(); }
      else if (ev.key === "Enter" && active >= 0) { location.href = results[active].entry.href; ev.preventDefault(); }
      else if (ev.key === "Escape") { list.hidden = true; }
    });
    document.addEventListener("click", function (ev) {
      if (ev.target !== input && !list.contains(ev.target)) list.hidden = true;
    });
  }

  window.Search = { buildIndex: buildIndex, search: search, attach: attach, tokens: tokens };
})();
