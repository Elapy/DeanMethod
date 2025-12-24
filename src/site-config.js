// src/site-config.js
window.DEANMETHOD_CONFIG = {
  orgName: "Method",
  brandName: "DeanMethod",

  businessEmail: "method.dean@outlook.com",
  businessPhoneDisplay: "(805) 665-3528",
  businessPhoneE164: "+18056653528",

  // Form endpoint (FormSubmit) — visitor does not need access to their email account.
  // FormSubmit supports CAPTCHA/honeypot controls.
  formsubmitEmail: "method.dean@outlook.com",

  // Pricing + seasonal promos (annual recurring windows)
  pricing: {
    // Default (non-sale) prices
    base: {
      foundation: 99,
      progress: 179,
      elite: 339
    },

    // Sales: when active, replace displayed price, show old price struck through,
    // and show hover card reason + rate lock note.
    sales: [
      {
        // Dec 25 -> Jan 7 (cross-year)
        start: { month: 12, day: 25 },
        end:   { month: 1,  day: 7  },
        label: "New Years",
        reason: "New Years sale",
        prices: { foundation: 79, progress: 159, elite: 319 }
      },
      {
        // Aug 12 -> Aug 25
        start: { month: 8, day: 12 },
        end:   { month: 8, day: 25 },
        label: "Back in schedule",
        reason: "Back in schedule sale",
        prices: { foundation: 79, progress: 159, elite: 319 }
      },
      {
        // Apr 24 -> May 7
        start: { month: 4, day: 24 },
        end:   { month: 5, day: 7  },
        label: "Summer prep",
        reason: "Summer prep sale",
        prices: { foundation: 89, progress: 169, elite: 329 }
      },
      {
        // Oct 25 -> Nov 7 (Southern hemisphere)
        start: { month: 10, day: 25 },
        end:   { month: 11, day: 7  },
        label: "Summer prep (Southern Hemisphere)",
        reason: "Summer prep (Southern Hemisphere) sale",
        prices: { foundation: 89, progress: 169, elite: 329 }
      }
    ]
  }
};
