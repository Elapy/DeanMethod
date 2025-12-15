(function () {
  const cfg = window.DEANMETHOD_CONFIG || {};

  const email = cfg.businessEmail || "";
  const phoneDisplay = cfg.businessPhoneDisplay || "";
  const phoneE164 = cfg.businessPhoneE164 || "";
  const formEmail = cfg.formsubmitEmail || "";

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function buildSmsHref(numberE164, body) {
    const encoded = encodeURIComponent(body);
    if (isIOS()) return `sms:${numberE164};body=${encoded}`;
    return `sms:${numberE164}?body=${encoded}`;
  }

  function wireLinks() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    const emailLink = document.getElementById("emailLink");
    const smsLink = document.getElementById("smsLink");
    const telLink = document.getElementById("telLink");

    if (emailLink) {
      emailLink.href = `mailto:${email}?subject=${encodeURIComponent("Training inquiry")}`;
    }
    if (smsLink) {
      smsLink.href = buildSmsHref(phoneE164, "Hi — I’d like to discuss training. Goals: ... Availability: ...");
    }
    if (telLink) {
      telLink.href = `tel:${phoneE164}`;
    }

    const form = document.getElementById("contactForm");
    const note = document.getElementById("formNote");
    if (form) {
      form.action = `https://formsubmit.co/${encodeURIComponent(formEmail)}`;
      if (note) note.textContent = "";
    }
  }

  wireLinks();
})();
