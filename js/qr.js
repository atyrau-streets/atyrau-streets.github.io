(function () {
  var t = App.t, tx = App.tx, esc = App.esc;
  var PER_PAGE = 6; // A4 бетінде 2 × 3
  App.renderShell("qr");

  if (!(window.BASE_URL || "").trim()) {
    var w = document.getElementById("qr-warn");
    w.hidden = false;
    w.innerHTML = esc(t("qrBaseWarn")) + ' <span class="qr-url">' + esc(App.baseUrl()) + "</span>";
  }

  App.load("objects").then(function (data) {
    var root = document.getElementById("qr-pages");
    root.innerHTML = "";
    var page;
    data.objects.forEach(function (o, i) {
      if (i % PER_PAGE === 0) {
        page = document.createElement("div");
        page.className = "qr-grid qr-page";
        root.appendChild(page);
      }
      var url = App.shortUrl(o.id);
      var card = document.createElement("div");
      card.className = "qr-card";
      card.innerHTML = '<div class="qr"></div><div class="qr-num">№ ' + o.id + "</div>" +
        '<div class="qr-name">' + esc(tx(o.name)) + "</div>" +
        '<div class="qr-site">' + esc(t("siteTitle")) + "</div>";
      page.appendChild(card);
      var qr = card.querySelector(".qr");
      new QRCode(qr, { text: url, width: 320, height: 320, correctLevel: QRCode.CorrectLevel.M });
      qr.title = url;
    });
  }).catch(function (e) { App.showError(document.getElementById("qr-pages"), e); });
})();
