// Сұрақтар нысан деректерінен автоматты түрде құрылады —
// сондықтан жаңа нысан қосылса, квиз де өзі толығады.
(function () {
  var YEAR_RE = /^\d{4}$/;

  // Нысанның өз мәтінінде кездесетін жылдар (мысалы, жаңарту жылы) қате нұсқа
  // ретінде ұсынылмайды — әйтпесе сұрақ екіұшты болады.
  function ownYears(o) {
    var text = ["teaser", "history", "person", "connection"].map(function (k) { return (o[k] && o[k].kk) || ""; }).join(" ");
    return text.match(/\d{4}/g) || [];
  }

  function yearOptions(correct, objects, o) {
    var own = ownYears(o);
    var ok = function (y) { return y !== correct && own.indexOf(y) < 0; };
    var pool = objects.map(function (x) { return x.year; }).filter(function (y) { return YEAR_RE.test(y) && ok(y); });
    var opts = App.shuffle(Array.from(new Set(pool))).slice(0, 3);
    var n = parseInt(correct, 10), d = 1;
    while (opts.length < 3) {
      var cand = String(n + (d % 2 ? d * 3 : -d * 3));
      if (ok(cand) && opts.indexOf(cand) < 0) opts.push(cand);
      d++;
    }
    return App.shuffle(opts.concat(correct));
  }

  function yearsOptions(correct, objects) {
    var pool = objects.map(function (o) { return o.person_years; }).filter(function (y) { return y && y !== correct; });
    return App.shuffle(App.shuffle(Array.from(new Set(pool))).slice(0, 3).concat(correct));
  }

  function forObject(o, objects) {
    var name = App.tx(o.name), qs = [];
    if (YEAR_RE.test(o.year)) {
      qs.push({ objId: o.id, text: App.t("qYear", { name: name }), options: yearOptions(o.year, objects, o), answer: o.year });
    }
    if (o.person_years) {
      qs.push({ objId: o.id, text: App.t("qYears", { name: name }), options: yearsOptions(o.person_years, objects), answer: o.person_years });
    }
    return qs;
  }

  function all(objects) {
    return [].concat.apply([], objects.map(function (o) { return forObject(o, objects); }));
  }

  // Бір сұрақтың интерактивті блогы. onAnswer(isCorrect, chosen)
  function renderQuestion(q, container, onAnswer, opts) {
    opts = opts || {};
    var esc = App.esc;
    var box = document.createElement("div");
    box.className = "quiz-q";
    box.innerHTML = '<p class="quiz-text">' + esc(q.text) + "</p>" +
      '<div class="quiz-options">' + q.options.map(function (o) {
        return '<button type="button" class="opt" data-v="' + esc(o) + '">' + esc(o) + "</button>";
      }).join("") + '</div><p class="quiz-feedback" aria-live="polite"></p>';
    container.appendChild(box);
    var fb = box.querySelector(".quiz-feedback");

    function lock(chosen) {
      var ok = chosen === q.answer;
      box.querySelectorAll(".opt").forEach(function (b) {
        b.disabled = true;
        if (b.dataset.v === q.answer) b.classList.add("right");
        else if (b.dataset.v === chosen) b.classList.add("wrong");
      });
      fb.textContent = ok ? App.t("quizCorrect") : App.t("quizWrong", { answer: q.answer });
      fb.className = "quiz-feedback " + (ok ? "ok" : "bad");
      return ok;
    }

    if (opts.answered) lock(opts.answered);
    else {
      box.querySelectorAll(".opt").forEach(function (b) {
        b.addEventListener("click", function () {
          var ok = lock(b.dataset.v);
          if (onAnswer) onAnswer(ok, b.dataset.v);
        });
      });
    }
    return box;
  }

  window.Quiz = { forObject: forObject, all: all, renderQuestion: renderQuestion };
})();
