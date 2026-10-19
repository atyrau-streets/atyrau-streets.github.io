(function () {
  var t = App.t, esc = App.esc;
  var COUNT = 8;
  App.renderShell("quiz");
  var box = document.getElementById("quiz");
  var bar = document.getElementById("quiz-bar");

  App.load("objects").then(function (data) {
    start(data.objects);
  }).catch(function (e) { App.showError(box, e); });

  function start(objects) {
    var qs = App.shuffle(Quiz.all(objects)).slice(0, COUNT);
    var i = 0, score = 0;
    bar.style.width = "0";

    function step() {
      box.innerHTML = '<p class="muted">' + (i + 1) + " / " + qs.length + "</p>";
      var q = qs[i];
      Quiz.renderQuestion(q, box, function (ok) {
        if (ok) score++;
        bar.style.width = ((i + 1) / qs.length * 100) + "%";
        var more = document.createElement("p");
        more.innerHTML = '<a href="' + App.objectUrl(q.objId) + '">' + esc(t("more")) + " →</a>";
        box.appendChild(more);
        var btn = document.createElement("button");
        btn.className = "btn";
        btn.type = "button";
        btn.textContent = i + 1 < qs.length ? t("quizNext") : t("quizScore", { score: score, total: qs.length });
        btn.addEventListener("click", function () { i++; if (i < qs.length) step(); else finish(); });
        box.appendChild(btn);
        btn.focus();
      });
    }

    function finish() {
      var ratio = score / qs.length;
      var msg = ratio >= 0.75 ? "quizResult2" : ratio >= 0.4 ? "quizResult1" : "quizResult0";
      box.innerHTML = '<div class="panel" style="text-align:center"><div class="score">' + score + " / " + qs.length + "</div>" +
        "<p>" + esc(t(msg)) + '</p><div class="btn-row"><button type="button" class="btn" id="again">' + esc(t("quizAgain")) + "</button>" +
        '<a class="btn secondary" href="route.html">' + esc(t("navRoute")) + "</a></div></div>";
      document.getElementById("again").addEventListener("click", function () { start(objects); });
    }

    step();
  }
})();
