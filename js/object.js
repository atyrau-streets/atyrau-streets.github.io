(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  App.renderShell("index");
  var main = document.getElementById("main");

  var params = new URLSearchParams(location.search);
  var hash = location.hash.match(/^#n(\d+)$/);
  var id = parseInt(params.get("id") || (hash && hash[1]), 10);

  App.load("objects").then(render).catch(function (e) { App.showError(main, e); });

  function sec(title, text, cls) {
    return '<section class="' + (cls || "") + '"><h2 class="h-small">' + esc(title) + "</h2><p>" + esc(text || "—") + "</p></section>";
  }

  function render(data) {
    var objects = data.objects;
    var idx = objects.findIndex(function (o) { return o.id === id; });
    if (idx < 0) {
      main.innerHTML = '<section class="hero"><h1>' + esc(t("notFound")) + '</h1><a class="btn" href="index.html">' + esc(t("backToMap")) + "</a></section>";
      return;
    }
    var o = objects[idx];
    var next = objects[(idx + 1) % objects.length];
    var prev = objects[(idx - 1 + objects.length) % objects.length];
    var name = tx(o.name);
    document.title = name + " · " + t("siteTitle");

    var connection = tx(o.connection);
    var disc = tx(o.discrepancy);
    var coords = o.lat.toFixed(5) + ", " + o.lon.toFixed(5);
    var gmaps = "https://www.google.com/maps/search/?api=1&query=" + o.lat + "%2C" + o.lon;
    var dgis = "https://2gis.kz/atyrau/geo/" + o.lon + "%2C" + o.lat;

    var html =
      '<div class="obj-head">' +
      '<div class="chips"><span class="chip"><span class="dot" style="background:' + App.catColor(o.category) + '"></span>' + esc(t("cat_" + o.category)) + "</span>" +
      '<span class="chip">№ ' + o.id + "</span></div>" +
      "<h1>" + esc(name) + "</h1>" +
      '<dl class="facts"><dt>' + esc(t("type")) + "</dt><dd>" + esc(App.txOrDash(o.type)) + "</dd>" +
      "<dt>" + esc(t("year")) + "</dt><dd>" + esc(o.year || "—") + "</dd></dl></div>" +
      '<div class="obj-layout"><div id="media"></div><div>' +
      '<div id="audio" class="audio" hidden></div>' +
      '<div class="portrait-row"><div id="portrait"></div><p class="teaser">' + esc(tx(o.teaser) || "—") + "</p></div>" +
      '<section class="connection"><h2>' + esc(t("connection")) + "</h2><p>" + esc(connection || "—") + "</p></section>" +
      (disc ? '<section class="warn"><h2>' + esc(t("discrepancy")) + "</h2><p>" + esc(disc) + "</p></section>" : "") +
      "</div></div>" +
      '<details class="story" id="story"><summary>' + esc(t("fullStory")) + '</summary><div class="story-body">' +
      sec(t("history"), tx(o.history)) +
      sec(t("person"), tx(o.person)) +
      "</div></details>" +
      '<div id="ba"></div>' +
      "<section><h2 class=\"h-small\">" + esc(t("sources")) + '</h2><ol class="sources">' +
      o.sources.map(function (s) {
        var url = App.sourceUrl(s, data.sources);
        return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(App.sourceLabel(url)) + "</a></li>";
      }).join("") + "</ol></section>" +
      "<section><h2 class=\"h-small\">" + esc(t("openIn")) + "</h2>" +
      '<div id="minimap" class="map small"></div>' +
      '<p class="muted" style="margin-top:8px">' + esc(t("coords")) + ": <span>" + coords + "</span></p>" +
      '<div class="btn-row"><a class="btn secondary" href="' + gmaps + '" target="_blank" rel="noopener">Google Maps</a>' +
      '<a class="btn secondary" href="' + dgis + '" target="_blank" rel="noopener">2ГИС</a></div></section>' +
      '<section><h2 class="h-small">' + esc(t("shortLink")) + '</h2><div class="btn-row">' +
      '<button type="button" class="btn secondary" id="copy">' + esc(t("copyLink")) + "</button></div>" +
      '<p class="muted qr-url" style="margin-top:8px">' + esc(App.shortUrl(o.id)) + "</p></section>" +
      '<section><h2>' + esc(t("quizTitle")) + '</h2><div id="quiz"></div><a href="quiz.html">' + esc(t("quizMore")) + " →</a></section>" +
      '<nav class="pager"><a class="btn secondary" href="' + App.objectUrl(prev.id) + '">← ' + esc(t("prev")) + "</a>" +
      '<a class="btn accent" href="' + App.objectUrl(next.id) + '">' + esc(t("next")) + " →</a></nav>" +
      '<p style="margin-top:16px"><a href="index.html">← ' + esc(t("backToMap")) + "</a></p>";

    main.innerHTML = App.fallbackNote() + html;

    // Фото + портрет + аудио
    document.getElementById("media").appendChild(App.photo("images/" + o.id + ".jpg", name, t("photoMissing")));
    App.imageExists("images/" + o.id + "-portrait.jpg").then(function (ok) {
      if (!ok) return;
      var p = document.getElementById("portrait");
      p.className = "portrait";
      p.innerHTML = '<img src="images/' + o.id + '-portrait.jpg" alt="' + esc(t("portrait")) + '">';
    });
    App.audioPlayer("audio/" + o.id + ".mp3", document.getElementById("audio"), t("audioTitle"));
    beforeAfter(o);

    // Мини-карта
    var map = App.makeMap("minimap", { zoomControl: true });
    var pts = [[o.lat, o.lon]];
    L.marker([o.lat, o.lon], { icon: App.markerIcon(o.id, o.category) }).addTo(map).bindPopup(esc(name));
    (o.extra_points || []).forEach(function (p) {
      pts.push([p.lat, p.lon]);
      L.marker([p.lat, p.lon], { icon: App.markerIcon("+", o.category, { small: true }) }).addTo(map)
        .bindPopup(esc(tx(p.label) || t("extraPoint")));
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] }); else map.setView(pts[0], 16);

    document.getElementById("copy").addEventListener("click", function (ev) {
      var btn = ev.currentTarget;
      var url = App.shortUrl(o.id);
      var done = function () { btn.textContent = t("copied"); setTimeout(function () { btn.textContent = t("copyLink"); }, 1800); };
      if (navigator.share && /Mobi/.test(navigator.userAgent)) {
        navigator.share({ title: name, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(done, function () { prompt("", url); });
      } else {
        prompt("", url);
      }
    });

    var quizBox = document.getElementById("quiz");
    var qs = Quiz.forObject(o, objects);
    if (!qs.length) quizBox.closest("section").querySelector("h2").hidden = true;
    qs.forEach(function (q) { Quiz.renderQuestion(q, quizBox); });
  }

  // «Бұрын / Қазір» слайдері: images/N-old.jpg және images/N-new.jpg екеуі де болса
  function beforeAfter(o) {
    var oldSrc = "images/" + o.id + "-old.jpg", newSrc = "images/" + o.id + "-new.jpg";
    Promise.all([App.imageExists(oldSrc), App.imageExists(newSrc)]).then(function (r) {
      if (!r[0] || !r[1]) return;
      var box = document.getElementById("ba");
      box.innerHTML = '<section><h2 class="h-small">' + esc(t("beforeAfter")) + "</h2>" +
        '<div class="ba"><img src="' + newSrc + '" alt="' + esc(t("after")) + '">' +
        '<div class="ba-top"><img src="' + oldSrc + '" alt="' + esc(t("before")) + '"></div>' +
        '<div class="ba-handle"></div>' +
        '<span class="ba-label" style="left:8px">' + esc(t("before")) + "</span>" +
        '<span class="ba-label" style="right:8px">' + esc(t("after")) + "</span>" +
        '<input type="range" min="0" max="100" value="50" aria-label="' + esc(t("beforeAfter")) + '"></div></section>';
      var ba = box.querySelector(".ba"), top = box.querySelector(".ba-top"), topImg = top.querySelector("img");
      var handle = box.querySelector(".ba-handle"), range = box.querySelector("input");
      function size() { topImg.style.width = ba.clientWidth + "px"; }
      function set(v) { top.style.width = v + "%"; handle.style.left = v + "%"; }
      range.addEventListener("input", function () { set(range.value); });
      window.addEventListener("resize", size);
      ba.querySelector("img").addEventListener("load", size);
      size();
    });
  }
})();
