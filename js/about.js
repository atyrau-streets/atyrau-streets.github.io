(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  App.renderShell("about");
  var main = document.getElementById("main");

  Promise.all([App.load("project"), App.load("objects"), App.load("survey")]).then(function (r) {
    render(r[0], r[1], r[2]);
  }).catch(function (e) { App.showError(main, e); });

  function render(p, data, survey) {
    var rows = [
      ["topic", tx(p.title)],
      ["goal", tx(p.goal)],
      ["hypothesis", tx(p.hypothesis)],
      ["authors", p.authors.join(", ") + " (" + tx(p.grade) + ", " + tx(p.school) + ")"],
      ["supervisor", p.supervisor],
      ["contest", tx(p.contest)],
      ["nomination", tx(p.nomination)]
    ];
    var disc = data.objects.filter(function (o) { return o.discrepancy && o.discrepancy.kk; });

    var html =
      '<section class="hero"><h1>' + esc(t("aboutTitle")) + "</h1></section>" +
      '<div class="panel"><dl class="facts">' + rows.map(function (r) {
        return "<dt>" + esc(t(r[0])) + "</dt><dd>" + esc(r[1] || "—") + "</dd>";
      }).join("") + "</dl></div>" +
      "<section><h2>" + esc(t("surveyTitle")) + '</h2><div class="panel" id="survey"></div></section>' +
      "<section><h2>" + esc(t("discTableTitle")) + "</h2>" +
      '<div class="table-wrap"><table><thead><tr><th>' + esc(t("colNo")) + "</th><th>" + esc(t("colObject")) +
      "</th><th>" + esc(t("colDisc")) + "</th></tr></thead><tbody>" +
      disc.map(function (o, i) {
        return "<tr><td>" + (i + 1) + '</td><td><a href="' + App.objectUrl(o.id) + '">' + esc(tx(o.name)) +
          "</a></td><td>" + esc(tx(o.discrepancy)) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<div class="warn"><h3>' + esc(t("discCityNote")) + "</h3><p>" + esc(tx(data.city.discrepancy)) + "</p></div></section>";

    main.innerHTML = App.fallbackNote() + html;
    renderSurvey(document.getElementById("survey"), survey);
  }

  // «Дейін / кейін» топтастырылған бағандық диаграмма (SVG)
  function renderSurvey(el, s) {
    var qs = (s.questions || []).filter(function (q) { return q.before != null || q.after != null; });
    if (!qs.length) { el.innerHTML = '<p class="muted">' + esc(t("surveyNoData")) + "</p>"; return; }
    var C_BEFORE = "#b9a27a", C_AFTER = "#8b2e1f";
    var W = 640, rowH = 58, padL = 4, labelH = 20, barH = 14, H = qs.length * rowH + 6;
    var x = function (v) { return padL + (W - padL - 60) * (v || 0) / 100; };
    var svg = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("surveyTitle")) + '">';
    qs.forEach(function (q, i) {
      var y = i * rowH + 4;
      svg += '<text x="' + padL + '" y="' + (y + 14) + '" font-size="15" fill="currentColor">' + esc(tx(q.label)) + "</text>";
      [["before", C_BEFORE, 0], ["after", C_AFTER, 1]].forEach(function (b) {
        var v = q[b[0]], by = y + labelH + b[2] * (barH + 4);
        if (v == null) return;
        svg += '<rect x="' + padL + '" y="' + by + '" width="' + Math.max(2, x(v) - padL) + '" height="' + barH + '" rx="3" fill="' + b[1] + '">' +
          "<title>" + esc(t(b[0])) + ": " + v + "%</title></rect>";
        svg += '<text x="' + (x(v) + 6) + '" y="' + (by + 12) + '" font-size="13" fill="currentColor">' + v + "%</text>";
      });
    });
    svg += "</svg>";
    var resp = s.respondents || {};
    el.innerHTML = svg +
      '<div class="chart-legend"><span><i style="background:' + C_BEFORE + '"></i>' + esc(t("before")) + (resp.before != null ? " (n=" + resp.before + ")" : "") + "</span>" +
      '<span><i style="background:' + C_AFTER + '"></i>' + esc(t("after")) + (resp.after != null ? " (n=" + resp.after + ")" : "") + "</span></div>";
  }
})();
