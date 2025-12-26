// src/inline.js
(function(){
  // Contact form -> mailto
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function(ev){
      ev.preventDefault();

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var preferred = (data.get("preferred") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var goals = data.getAll("goals")
        .map(function(v){ return String(v).trim(); })
        .filter(Boolean);

      var goalsLine = goals.length ? goals.join(", ") : "(none selected)";

      var subject = "DeanMethod Inquiry — " + (goals.length ? goals[0] : "General");
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Goals: " + goalsLine + "\n" +
        "Preferred contact: " + preferred + "\n\n" +
        "Message:\n" + message + "\n";

      var mailto = "mailto:method.dean@outlook.com"
        + "?subject=" + encodeURIComponent(subject)
        + "&body=" + encodeURIComponent(body);

      window.location.href = mailto;
    });
  }

  // Coverage map (Ventura County)
  var el = document.getElementById("coverageMap");
  if (el && window.L) {
    var center = [34.332906481499236, -119.117673076886];

    var map = L.map("coverageMap", {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true
    }).setView(center, 9);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(map);

    L.circle(center, {
      radius: 42000,
      color: "#2f6feb",
      weight: 2,
      opacity: 0.65,
      fillColor: "#2f6feb",
      fillOpacity: 0.10
    }).addTo(map);

    L.marker(center, {opacity: 0.9})
      .addTo(map)
      .bindPopup("Ventura County coverage")
      .openPopup();
  }

  // Try 1 modal
  var openBtn = document.getElementById("openTrialBtn");
  var dlg = document.getElementById("trialDialog");
  if (!openBtn || !dlg) return;

  function closeDialog(){
    if (dlg.open) dlg.close();
  }

  openBtn.addEventListener("click", function(){
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "open");
  });

  var closeBtn = dlg.querySelector(".modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeDialog);

  var dismissBtn = document.getElementById("trialDismissBtn");
  if (dismissBtn) dismissBtn.addEventListener("click", closeDialog);

  var cta = document.getElementById("trialCtaLink");
  if (cta) cta.addEventListener("click", closeDialog);

  dlg.addEventListener("click", function(ev){
    var card = dlg.querySelector(".modal-card");
    if (!card) return;
    var r = card.getBoundingClientRect();
    var inCard =
      ev.clientX >= r.left && ev.clientX <= r.right &&
      ev.clientY >= r.top  && ev.clientY <= r.bottom;
    if (!inCard) closeDialog();
  });

  dlg.addEventListener("cancel", function(){ closeDialog(); });
})();
