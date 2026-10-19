(function () {
  var t = App.t, esc = App.esc;
  App.renderShell("share");
  var url = (window.FORM_URL || "").trim();
  var el = document.getElementById("share-action");
  if (url) {
    el.innerHTML = '<a class="btn accent" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(t("shareButton")) + " →</a>";
  } else {
    el.innerHTML = '<span class="btn accent disabled" aria-disabled="true">' + esc(t("shareButton")) + "</span><br>" +
      '<small class="muted">' + esc(t("shareMissing")) + "</small>";
  }
})();
