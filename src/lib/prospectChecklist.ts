// Default qualification checklist seeded onto every new Prospect (manual add, CSV import, or
// bulk-add). Purely a starting point — every item is editable/deletable and new items/sections
// can be added per prospect from the drawer, none of this is enforced structure.
export const DEFAULT_PROSPECT_CHECKLIST: { section: string; text: string }[] = [
  {
    section: "Independence check (kill first, saves time)",
    text: 'Google the business name + "franchise" or "locations" — if it shows up in 3+ cities/states, it\'s a chain, skip it.',
  },
  {
    section: "Independence check (kill first, saves time)",
    text: "Check the website footer/about page for multiple location listings. One address = good sign.",
  },
  {
    section: "Independence check (kill first, saves time)",
    text: "Search the name against known chains (LaserAway, Ideal Image, Alchemy 43, Hand & Stone, VIO Med Spa, Skin Laundry, Amazing Lash, European Wax Center) — if it's a \"location\" of one of these, skip.",
  },
  {
    section: "Provider count check (the hardest one)",
    text: 'Open the site\'s "About" / "Team" / "Meet the Team" page. Count named providers (NP, RN, PA, MD, aesthetician).',
  },
  {
    section: "Provider count check (the hardest one)",
    text: "1 provider = solo, 2 = ideal fit. 3+ = too big, skip.",
  },
  {
    section: "Provider count check (the hardest one)",
    text: 'No team page? Check their Instagram bio and recent posts — solo owners usually post as "me" and tag themselves in every before/after. Multi-provider spots tag different staff names.',
  },
  {
    section: "Provider count check (the hardest one)",
    text: 'Still unclear? Call and ask "how many injectors do you have on staff" — fastest, most reliable method, takes 60 seconds.',
  },
  {
    section: "Injectable focus check (not weight-loss/laser-only)",
    text: "Check their services menu — Botox/Dysport and filler (Juvederm, Restylane, Sculptra) should be front and center, not buried under a long list of laser/IV/weight-loss offerings.",
  },
  {
    section: "Injectable focus check (not weight-loss/laser-only)",
    text: "Red flag: homepage hero is about semaglutide/tirzepatide/weight loss, or laser hair removal is the lead service.",
  },
  {
    section: "Injectable focus check (not weight-loss/laser-only)",
    text: 'Green flag: homepage hero literally says "Botox," "filler," or "injectables," or the business name itself signals it (e.g. "Injectables," "Aesthetics," "Med Spa" paired with visible before/afters of lips/cheeks/jawline).',
  },
  {
    section: "Age check (1-3 years old)",
    text: 'Look for a founding year on the about page ("since 2023," "celebrating X years").',
  },
  {
    section: "Age check (1-3 years old)",
    text: "No date stated? Check domain age: whois.com/whois/[domain] — registration date is a decent proxy for launch.",
  },
  {
    section: "Age check (1-3 years old)",
    text: 'Check Google Business Profile — Google shows "X years in business" sometimes, or check the earliest reviews (sort reviews by oldest — first review date ≈ opening date).',
  },
  {
    section: "Age check (1-3 years old)",
    text: "Check Instagram — first post date is a reliable founding signal if the account has been active since launch.",
  },
  {
    section: "Quick disqualifiers (skip without digging further)",
    text: 'Category on Maps says "Plastic surgeon," "Dermatologist," or "Cosmetic surgeon" — wrong buyer, they\'re not the target DMU.',
  },
  {
    section: "Quick disqualifiers (skip without digging further)",
    text: "Review count over ~500-700 — usually signals an established, bigger operation, not a 1-3 year old solo shop.",
  },
  {
    section: "Quick disqualifiers (skip without digging further)",
    text: 'Business name includes "MD," "Institute," or "Surgery Center" — usually physician-led larger practice, not the injector-owner-operator profile you want.',
  },
];
