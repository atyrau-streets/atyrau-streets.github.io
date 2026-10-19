// Тұлғалар атымен аталған көшелер: data/streets.json.
// Сызық geometry-ден немесе OpenStreetMap-тан (osm_name бойынша) алынады.
(function () {
  var OVERPASS = "https://overpass-api.de/api/interpreter";
  var BBOX = "46.95,51.70,47.25,52.10"; // Атырау маңы
  var CACHE_DAYS = 30;

  function cacheKey(name) { return "osm-street:" + name; }

  function fetchGeometry(street) {
    if (street.geometry && street.geometry.length) return Promise.resolve([street.geometry]);
    if (!street.osm_name) return Promise.resolve([]);
    var cached = App.storageGet(cacheKey(street.osm_name));
    if (cached) {
      try {
        var c = JSON.parse(cached);
        if (Date.now() - c.t < CACHE_DAYS * 864e5) return Promise.resolve(c.lines);
      } catch (e) { /* ignore */ }
    }
    var name = street.osm_name.replace(/["\\]/g, "");
    var q = '[out:json][timeout:20];way["highway"]["name"="' + name + '"](' + BBOX + ');out geom;';
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(OVERPASS, {
      method: "POST",
      body: "data=" + encodeURIComponent(q),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.ok ? r.json() : { elements: [] }; })
      .then(function (d) {
        var lines = (d.elements || []).filter(function (e) { return e.geometry; }).map(function (e) {
          return e.geometry.map(function (p) { return [p.lat, p.lon]; });
        });
        App.storageSet(cacheKey(street.osm_name), JSON.stringify({ t: Date.now(), lines: lines }));
        return lines;
      })
      .catch(function () { return []; });
  }

  function popupHtml(s, objects) {
    var esc = App.esc, t = App.t, tx = App.tx;
    var html = '<div class="popup"><strong>' + esc(tx(s.name)) + "</strong>";
    var person = tx(s.person);
    if (person) html += "<p><em>" + esc(t("streetPerson")) + ":</em> " + esc(person) + "</p>";
    if (s.old_names && s.old_names.length) {
      html += "<p><em>" + esc(t("streetOldNames")) + ":</em> " + s.old_names.map(function (n) {
        return esc(n.name) + (n.period ? " (" + esc(n.period) + ")" : "");
      }).join(", ") + "</p>";
    }
    var obj = s.object_id && objects.filter(function (o) { return o.id === s.object_id; })[0];
    if (obj) html += '<a class="popup-link" href="' + App.objectUrl(obj.id) + '">' + esc(tx(obj.name)) + " →</a>";
    return html + "</div>";
  }

  // map-қа көшелерді қосады; Promise<[{street, lines, layer}]> қайтарады
  function addToMap(map, streets, objects) {
    return Promise.all(streets.map(function (s) {
      return fetchGeometry(s).then(function (lines) {
        if (!lines.length) return null;
        var layer = L.polyline(lines, { color: App.catColor(s.category), weight: 7, opacity: 0.75, lineCap: "round" })
          .bindPopup(popupHtml(s, objects))
          .addTo(map);
        return { street: s, lines: lines, layer: layer };
      });
    })).then(function (arr) { return arr.filter(Boolean); });
  }

  // Нүктеден сызыққа дейінгі ең қысқа қашықтық (метр, жуықтап).
  function distToLines(lat, lon, lines) {
    var best = Infinity;
    var kx = Math.cos(lat * Math.PI / 180) * 111320, ky = 110540;
    lines.forEach(function (line) {
      for (var i = 0; i < line.length - 1; i++) {
        var ax = (line[i][1] - lon) * kx, ay = (line[i][0] - lat) * ky;
        var bx = (line[i + 1][1] - lon) * kx, by = (line[i + 1][0] - lat) * ky;
        var dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
        var tt = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
        var px = ax + tt * dx, py = ay + tt * dy;
        var d = Math.sqrt(px * px + py * py);
        if (d < best) best = d;
      }
      if (line.length === 1) best = Math.min(best, Math.hypot(line[0][1] - lon, line[0][0] - lat) * 111000);
    });
    return best;
  }

  window.Streets = { addToMap: addToMap, distToLines: distToLines, popupHtml: popupHtml };
})();
