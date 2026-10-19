(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  App.renderShell("print");
  var main = document.getElementById("main");

  Promise.all([App.load("objects"), App.load("project")]).then(function (r) {
    var data = r[0], p = r[1];

    function srcs(list) {
      return '<ol class="sources">' + list.map(function (s) {
        var url = App.sourceUrl(s, data.sources);
        return '<li><a href="' + esc(url) + '">' + esc(url) + "</a></li>";
      }).join("") + "</ol>";
    }
    function para(title, text) {
      return '<h3 class="h-small">' + esc(title) + "</h3><p>" + esc(text || "—") + "</p>";
    }

    var c = data.city;
    var html =
      '<section class="hero"><h1>' + esc(tx(p.title)) + "</h1>" +
      '<p class="lead">' + esc(tx(p.goal)) + "</p>" +
      "<p>" + esc(t("printTitle")) + ". " + esc(t("footerAuthors")) + "</p>" +
      '<p class="no-print muted">' + esc(t("printIntro")) + "</p>" +
      '<button type="button" class="btn no-print" onclick="window.print()">' + esc(t("printButton")) + "</button></section>" +
      '<article class="print-obj"><h2>' + esc(t("cityTitle")) + "</h2><p>" + esc(App.txOrDash(c.text)) + "</p>" +
      '<div class="warn"><h3>' + esc(t("discrepancy")) + "</h3><p>" + esc(tx(c.discrepancy)) + "</p></div>" +
      '<h3 class="h-small">' + esc(t("sources")) + "</h3>" + srcs(c.sources) + "</article>" +
      data.objects.map(function (o) {
        var disc = tx(o.discrepancy);
        return '<article class="print-obj"><h2><span class="num-badge" style="background:' + App.catColor(o.category) + '">' + o.id + "</span>" + esc(tx(o.name)) + "</h2>" +
          '<dl class="facts"><dt>' + esc(t("type")) + "</dt><dd>" + esc(App.txOrDash(o.type)) + "</dd>" +
          "<dt>" + esc(t("year")) + "</dt><dd>" + esc(o.year || "—") + "</dd>" +
          "<dt>" + esc(t("coords")) + "</dt><dd>" + o.lat.toFixed(5) + ", " + o.lon.toFixed(5) + "</dd>" +
          "<dt>" + esc(t("shortLink")) + "</dt><dd>" + esc(App.shortUrl(o.id)) + "</dd></dl>" +
          para(t("history"), tx(o.history)) +
          para(t("person"), tx(o.person)) +
          para(t("connection"), tx(o.connection)) +
          (disc ? '<div class="warn"><h3>' + esc(t("discrepancy")) + "</h3><p>" + esc(disc) + "</p></div>" : "") +
          '<h3 class="h-small">' + esc(t("sources")) + "</h3>" + srcs(o.sources) + "</article>";
      }).join("");

    main.innerHTML = App.fallbackNote() + html;
  }).catch(function (e) { App.showError(main, e); });
})();
