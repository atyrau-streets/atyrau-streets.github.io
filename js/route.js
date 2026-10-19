(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  var WALK_KMH = 4.5;
  App.renderShell("route");

  var map, layer;

  Promise.all([App.load("objects"), App.load("routes")]).then(function (r) {
    var objects = r[0].objects, routes = r[1].routes;
    var byId = {};
    objects.forEach(function (o) { byId[o.id] = o; });

    var wanted = new URLSearchParams(location.search).get("r");
    var current = routes.filter(function (x) { return x.id === wanted; })[0] || routes[0];

    var tabs = document.getElementById("tabs");
    tabs.innerHTML = routes.map(function (rt) {
      return '<button type="button" data-id="' + esc(rt.id) + '" aria-pressed="' + (rt === current) + '">' + esc(tx(rt.name)) + "</button>";
    }).join("");
    tabs.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-id]");
      if (!b) return;
      current = routes.filter(function (x) { return x.id === b.dataset.id; })[0];
      tabs.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      history.replaceState(null, "", "?r=" + current.id);
      show(current, byId, objects);
    });

    map = App.makeMap("map");
    show(current, byId, objects);
    var note = App.fallbackNote();
    if (note) document.querySelector(".hero").insertAdjacentHTML("beforeend", note);
  }).catch(function (e) { App.showError(document.getElementById("stops"), e); });

  function questKey(rt) { return "quest:" + rt.id; }
  function questState(rt) {
    try { return JSON.parse(App.storageGet(questKey(rt)) || "{}"); } catch (e) { return {}; }
  }

  function show(rt, byId, objects) {
    var stops = rt.stops.map(function (id) { return byId[id]; }).filter(Boolean);
    var latlngs = stops.map(function (o) { return L.latLng(o.lat, o.lon); });

    if (layer) map.removeLayer(layer);
    layer = L.featureGroup().addTo(map);
    L.polyline(latlngs, { color: "#8b2e1f", weight: 4, opacity: .85, dashArray: "8 8" }).addTo(layer);
    stops.forEach(function (o, i) {
      L.marker([o.lat, o.lon], { icon: App.markerIcon(i + 1, o.category) }).addTo(layer)
        .bindPopup('<div class="popup"><strong>' + (i + 1) + ". " + esc(tx(o.name)) + '</strong><a class="popup-link" href="' + App.objectUrl(o.id) + '">' + esc(t("more")) + " →</a></div>");
    });
    map.fitBounds(layer.getBounds(), { padding: [30, 30] });

    // Leaflet арқылы жалпы қашықтық
    var legs = [0], total = 0;
    for (var i = 1; i < latlngs.length; i++) {
      var d = map.distance(latlngs[i - 1], latlngs[i]);
      legs.push(d);
      total += d;
    }
    var minutes = Math.round(total / 1000 / WALK_KMH * 60);
    document.getElementById("stats").innerHTML =
      '<div class="stat"><b>' + App.formatDist(total) + "</b><span>" + esc(t("routeDistance")) + "</span></div>" +
      '<div class="stat"><b>' + minutes + " " + esc(t("min")) + "</b><span>" + esc(t("routeTime")) + "</span></div>" +
      '<div class="stat"><b>' + stops.length + "</b><span>" + esc(t("routeStops")) + "</span></div>";

    // Аялдамалар + квест сұрақтары
    var state = questState(rt);
    var list = document.getElementById("stops");
    list.innerHTML = "";
    stops.forEach(function (o, i) {
      var li = document.createElement("li");
      li.className = "stop";
      li.innerHTML = '<span class="num-badge" style="background:' + App.catColor(o.category) + '">' + (i + 1) + "</span>" +
        (i ? '<div class="leg">↓ ' + App.formatDist(legs[i]) + "</div>" : "") +
        '<h3><a href="' + App.objectUrl(o.id) + '">' + esc(tx(o.name)) + "</a></h3>" +
        '<p class="muted">' + esc(tx(o.teaser)) + "</p>";
      list.appendChild(li);
      if (!rt.quest) return;
      var saved = state[o.id];
      var q = Quiz.forObject(o, objects)[0];
      if (!q) return;
      if (saved) { q.options = saved.options; }
      Quiz.renderQuestion(q, li, function (ok, chosen) {
        state[o.id] = { chosen: chosen, ok: ok, options: q.options };
        App.storageSet(questKey(rt), JSON.stringify(state));
        updateProgress(rt, stops, objects);
      }, { answered: saved && saved.chosen });
    });
    updateProgress(rt, stops, objects);

    document.getElementById("quest-reset").onclick = function () {
      App.storageSet(questKey(rt), "{}");
      show(rt, byId, objects);
    };
  }

  function updateProgress(rt, stops, objects) {
    var state = questState(rt);
    var total = stops.filter(function (o) { return Quiz.forObject(o, objects).length; }).length;
    var done = stops.filter(function (o) { return state[o.id]; }).length;
    document.getElementById("quest-bar").style.width = (total ? done / total * 100 : 0) + "%";
    document.getElementById("quest-status").textContent = done >= total && total ? t("questDone") : t("questProgress", { done: done, total: total });
  }
})();
