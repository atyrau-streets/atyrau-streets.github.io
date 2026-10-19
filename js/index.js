(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  App.renderShell("index");

  Promise.all([App.load("objects"), App.load("project"), App.load("streets").catch(function () { return { streets: [] }; })])
    .then(function (r) { init(r[0], r[1], r[2].streets || []); })
    .catch(function (e) { App.showError(document.getElementById("list"), e); });

  function init(data, project, streets) {
    var objects = data.objects;
    document.getElementById("hero-title").textContent = tx(project.title);
    document.getElementById("hero-goal").textContent = tx(project.goal);
    document.getElementById("search").placeholder = t("searchPlaceholder");
    Search.attach(document.getElementById("search"), document.getElementById("search-results"), Search.buildIndex(data, streets));

    // --- Карта ---
    var map = App.makeMap("map");
    var markers = {};
    var group = L.featureGroup().addTo(map);
    objects.forEach(function (o) {
      var m = L.marker([o.lat, o.lon], { icon: App.markerIcon(o.id, o.category), title: tx(o.name), riseOnHover: true })
        .bindPopup(popupHtml(o));
      m._cat = o.category;
      m.addTo(group);
      markers[o.id] = m;
    });
    map.fitBounds(group.getBounds(), { padding: [24, 24] });

    var streetLayers = [];
    Streets.addToMap(map, streets, objects).then(function (arr) {
      streetLayers = arr;
      var h = location.hash.match(/^#street-(.+)$/);
      if (h) {
        var s = arr.filter(function (x) { return x.street.id === decodeURIComponent(h[1]); })[0];
        if (s) { map.fitBounds(s.layer.getBounds()); s.layer.openPopup(); document.getElementById("map").scrollIntoView(); }
      }
    });

    // --- Санаттар (түстер) ---
    var used = Object.keys(App.categories).filter(function (c) {
      return objects.some(function (o) { return o.category === c; }) || streets.some(function (s) { return s.category === c; });
    });
    var hidden = {};
    var legend = document.getElementById("legend");
    legend.innerHTML = used.map(function (c) {
      return '<button type="button" aria-pressed="true" data-cat="' + c + '"><span class="dot" style="background:' + App.catColor(c) + '"></span>' + esc(t("cat_" + c)) + "</button>";
    }).join("");
    legend.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-cat]");
      if (!b) return;
      var c = b.dataset.cat;
      hidden[c] = !hidden[c];
      b.setAttribute("aria-pressed", hidden[c] ? "false" : "true");
      Object.keys(markers).forEach(function (id) {
        var m = markers[id];
        if (m._cat !== c) return;
        if (hidden[c]) group.removeLayer(m); else group.addLayer(m);
      });
      streetLayers.forEach(function (s) {
        if (s.street.category !== c) return;
        if (hidden[c]) map.removeLayer(s.layer); else s.layer.addTo(map);
      });
    });

    // --- Тізім ---
    document.getElementById("list").innerHTML = objects.map(function (o) {
      return '<li><a class="card" href="' + App.objectUrl(o.id) + '">' +
        '<span class="num-badge num" style="background:' + App.catColor(o.category) + '">' + o.id + "</span>" +
        "<span><h3>" + esc(tx(o.name)) + "</h3>" +
        '<div class="meta">' + esc(App.txOrDash(o.type)) + " · " + esc(o.year || "—") + "</div>" +
        "<p>" + esc(tx(o.teaser)) + "</p></span></a></li>";
    }).join("");

    renderCity(data);
    renderChronicle(data, streets);
    setupNearMe(map, objects, function () { return streetLayers; });

    var note = App.fallbackNote();
    if (note) document.querySelector(".hero").insertAdjacentHTML("beforeend", note);

    if (location.hash === "#city") document.getElementById("city").scrollIntoView();
  }

  function popupHtml(o) {
    return '<div class="popup"><strong>' + o.id + ". " + esc(tx(o.name)) + "</strong>" +
      '<p class="muted">' + esc(App.txOrDash(o.type)) + " · " + esc(o.year || "—") + "</p>" +
      "<p>" + esc(tx(o.teaser)) + "</p>" +
      '<a class="popup-link" href="' + App.objectUrl(o.id) + '">' + esc(t("more")) + " →</a></div>";
  }

  function sourcesList(list, map) {
    return '<ol class="sources">' + list.map(function (s) {
      var url = App.sourceUrl(s, map);
      return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(App.sourceLabel(url)) + "</a></li>";
    }).join("") + "</ol>";
  }

  function renderCity(data) {
    var c = data.city;
    var disc = tx(c.discrepancy);
    document.getElementById("city-panel").innerHTML =
      '<h2 id="city-title">' + esc(t("cityTitle")) + "</h2>" +
      '<div class="city-names"><span class="old">' + esc(tx(c.old_name)) + '</span><span class="arrow">→</span><span>' + esc(tx(c.name)) + "</span></div>" +
      "<p>" + esc(App.txOrDash(c.text)) + "</p>" +
      (disc ? '<div class="warn"><h3>' + esc(t("discrepancy")) + "</h3><p>" + esc(disc) + "</p></div>" : "") +
      '<h3 class="h-small">' + esc(t("sources")) + "</h3>" + sourcesList(c.sources, data.sources);
  }

  function renderChronicle(data, streets) {
    var html = "<h3>" + esc(t("chronicleCity")) + '</h3><ol class="timeline">' +
      data.city.timeline.map(function (e) {
        return '<li><span class="yr">' + esc(e.year) + "</span> — <strong>" + esc(e.name) + "</strong>. " + esc(tx(e.text)) + "</li>";
      }).join("") + "</ol>";
    html += "<h3>" + esc(t("chronicleStreets")) + "</h3>";
    var withOld = streets.filter(function (s) { return s.old_names && s.old_names.length; });
    if (!withOld.length) {
      html += '<p class="muted">' + esc(t("streetsEmpty")) + "</p>";
    } else {
      html += '<ul class="timeline">' + withOld.map(function (s) {
        return "<li>" + s.old_names.map(function (n) {
          return esc(n.name) + (n.period ? " <span class=\"muted\">(" + esc(n.period) + ")</span>" : "");
        }).join(" → ") + ' → <a href="index.html#street-' + encodeURIComponent(s.id) + '"><strong>' + esc(tx(s.name)) + "</strong></a></li>";
      }).join("") + "</ul>";
    }
    document.getElementById("chronicle").innerHTML = html;
  }

  function setupNearMe(map, objects, getStreets) {
    var btn = document.getElementById("near-btn");
    var panel = document.getElementById("near-panel");
    var meMarker = null;

    btn.addEventListener("click", function () {
      panel.hidden = false;
      if (!navigator.geolocation) { panel.textContent = t("geoUnsupported"); return; }
      panel.textContent = t("locating");
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lon = pos.coords.longitude;
        if (meMarker) map.removeLayer(meMarker);
        meMarker = L.marker([lat, lon], {
          icon: L.divIcon({ className: "num-marker-wrap", html: '<span class="num-marker me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
          zIndexOffset: 1000
        }).addTo(map).bindPopup(t("youAreHere"));

        var near = objects.map(function (o) {
          return { o: o, d: App.distance(lat, lon, o.lat, o.lon) };
        }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);

        var html = "";
        var streetsNear = getStreets().map(function (s) {
          return { s: s, d: Streets.distToLines(lat, lon, s.lines) };
        }).filter(function (x) { return x.d < 60; }).sort(function (a, b) { return a.d - b.d; });
        if (streetsNear.length) {
          html += '<h3 class="h-small">' + esc(t("nearStreet")) + "</h3>" + Streets.popupHtml(streetsNear[0].s.street, objects);
        }
        html += '<h3 class="h-small">' + esc(t("nearTitle")) + "</h3><ol>" + near.map(function (n) {
          return '<li><a href="' + App.objectUrl(n.o.id) + '"><strong>' + n.o.id + ". " + esc(tx(n.o.name)) + "</strong></a>" +
            '<div class="dist">' + App.formatDist(n.d) + " " + esc(t("fromYou")) + "</div>" +
            "<div>" + esc(tx(n.o.teaser)) + "</div></li>";
        }).join("") + "</ol>";
        panel.innerHTML = html;

        var b = L.latLngBounds([[lat, lon]]);
        near.forEach(function (n) { b.extend([n.o.lat, n.o.lon]); });
        map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
      }, function () {
        panel.textContent = t("geoDenied");
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    });
  }
})();
