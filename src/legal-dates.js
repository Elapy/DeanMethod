// src/legal-dates.js
(function(){
  var dt = new Date().toLocaleDateString();
  var t = document.getElementById("termsDate");
  if (t) t.textContent = dt;

  var p = document.getElementById("privacyDate");
  if (p) p.textContent = dt;
})();
