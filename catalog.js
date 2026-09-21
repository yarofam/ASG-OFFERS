/* Catalogue filtering. The page is complete without it: every card is a plain
   link, and the filters only hide cards that are already in the document. */
(function () {
  "use strict";

  var filters = document.getElementById("filters");
  var grid = document.getElementById("grid");
  var empty = document.getElementById("gridEmpty");
  if (!filters || !grid) return;

  var chips = Array.prototype.slice.call(filters.querySelectorAll(".chip"));
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));

  function apply(value) {
    var shown = 0;
    cards.forEach(function (card) {
      var match = value === "all" || card.getAttribute("data-brand") === value;
      card.hidden = !match;
      if (match) shown += 1;
    });
    if (empty) empty.hidden = shown !== 0;
  }

  filters.addEventListener("click", function (event) {
    var chip = event.target.closest(".chip");
    if (!chip) return;
    chips.forEach(function (other) { other.classList.toggle("is-active", other === chip); });
    apply(chip.getAttribute("data-filter"));
  });
})();
