// src/site-config.js

window.DEANMETHOD_CONFIG = {
  orgName: "Method",
  brandName: "DeanMethod",

  businessEmail: "method.dean@outlook.com",
  businessPhoneDisplay: "(805) 665-3528",
  businessPhoneE164: "+18056653528",

  // Form endpoint (FormSubmit) — visitor does not need access to their email account.
  formsubmitEmail: "method.dean@outlook.com",

  // Pricing (base + seasonal sales)
  pricing: {
    base: {
      foundation: 99,
      progress: 179,
      elite: 339
    },

    // Annual sale windows. Month/day based (yearly recurring).
    // If multiple windows match, the FIRST match wins (top-to-bottom).
    sales: [
      {
        id: "new_years",
        label: "New years",
        reason: "New years",
        start: { month: 12, day: 25 },
        end: { month: 1, day: 7 },
        prices: { foundation: 79, progress: 159, elite: 319 }
      },
      {
        id: "back_in_schedule",
        label: "Back in schedule",
        reason: "Back in schedule",
        start: { month: 8, day: 12 },
        end: { month: 8, day: 25 },
        prices: { foundation: 79, progress: 159, elite: 319 }
      },
      {
        id: "summer_prep",
        label: "Summer prep",
        reason: "Summer prep",
        start: { month: 4, day: 24 },
        end: { month: 5, day: 7 },
        prices: { foundation: 89, progress: 169, elite: 329 }
      },
      {
        id: "southern_summer_prep",
        label: "Summer prep (Southern Hemisphere)",
        reason: "Summer prep (for southern hemisphere)",
        start: { month: 10, day: 25 },
        end: { month: 11, day: 7 },
        prices: { foundation: 89, progress: 169, elite: 329 }
      }
    ]
  }
};
