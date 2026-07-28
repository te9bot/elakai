import type { CategoryId, HoursWindow, Localized, Review, WeeklyHours } from './types'

/* ------------------------------------------------------------------ */
/* Opening-hours presets                                               */
/* ------------------------------------------------------------------ */

const h = (open: number, close: number): HoursWindow => ({ open, close })
/** Repeat one daily window across all seven days. */
const everyday = (w: HoursWindow[]): HoursWindow[][] => Array.from({ length: 7 }, () => w)

export type HoursPreset = 'always' | 'shop' | 'day' | 'office' | 'chamber' | 'evening' | 'weekdays'

export const HOURS_PRESETS: Record<HoursPreset, WeeklyHours> = {
  /** 24/7 — hospitals, ambulance, emergency utilities. */
  always: 'always',
  /** 8:00–22:00 daily — pharmacies, shops. */
  shop: everyday([h(8 * 60, 22 * 60)]),
  /** 9:00–21:00 daily — most trade services. */
  day: everyday([h(9 * 60, 21 * 60)]),
  /** 9:00–17:00, closed Friday — offices, ISPs, legal. */
  office: (() => {
    const week = everyday([h(9 * 60, 17 * 60)])
    week[5] = [] // Friday
    return week
  })(),
  /** Split morning/evening chamber hours — doctors, diagnostics. */
  chamber: (() => {
    const week = everyday([h(8 * 60, 13 * 60), h(17 * 60, 21 * 60)])
    week[5] = [h(17 * 60, 21 * 60)]
    return week
  })(),
  /** 16:00–23:00 — evening-only chambers and repair stalls. */
  evening: everyday([h(16 * 60, 23 * 60)]),
  /** 9:00–18:00, closed Fri + Sat. */
  weekdays: (() => {
    const week = everyday([h(9 * 60, 18 * 60)])
    week[5] = []
    week[6] = []
    return week
  })(),
}

/* ------------------------------------------------------------------ */
/* Per-category copy                                                   */
/* ------------------------------------------------------------------ */

type CategoryCopy = {
  /** Two description variants so listings in the same category do not read identically. */
  descriptions: [Localized, Localized]
  services: Localized[]
}

export const CATEGORY_COPY: Record<CategoryId, CategoryCopy> = {
  hospital: {
    descriptions: [
      {
        bn: 'জরুরি বিভাগ, ইনডোর ও আউটডোর সেবা এবং অভিজ্ঞ চিকিৎসক নিয়ে ২৪ ঘণ্টা খোলা।',
        en: 'Round-the-clock emergency, indoor and outdoor care with experienced physicians on duty.',
      },
      {
        bn: 'সাধারণ ও বিশেষায়িত চিকিৎসা, অপারেশন থিয়েটার এবং প্যাথলজি সুবিধা রয়েছে।',
        en: 'General and specialist treatment with operating theatre and in-house pathology.',
      },
    ],
    services: [
      { bn: 'জরুরি বিভাগ', en: 'Emergency department' },
      { bn: 'ভর্তি ও কেবিন', en: 'Admission & cabins' },
      { bn: 'অপারেশন থিয়েটার', en: 'Operating theatre' },
      { bn: 'প্যাথলজি', en: 'Pathology lab' },
      { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
    ],
  },
  clinic: {
    descriptions: [
      {
        bn: 'সাধারণ চিকিৎসা, ছোট অপারেশন ও নিয়মিত স্বাস্থ্য পরীক্ষার জন্য স্থানীয় ক্লিনিক।',
        en: 'Neighbourhood clinic for general treatment, minor procedures and routine check-ups.',
      },
      {
        bn: 'মা ও শিশু স্বাস্থ্যসেবায় বিশেষ গুরুত্ব দিয়ে পরিচালিত ক্লিনিক।',
        en: 'Clinic with a particular focus on maternal and child health services.',
      },
    ],
    services: [
      { bn: 'সাধারণ চিকিৎসা', en: 'General consultation' },
      { bn: 'ড্রেসিং ও সেলাই', en: 'Dressing & stitches' },
      { bn: 'টিকাদান', en: 'Vaccination' },
      { bn: 'স্বাস্থ্য পরীক্ষা', en: 'Health check-up' },
    ],
  },
  doctor: {
    descriptions: [
      {
        bn: 'অভিজ্ঞ চিকিৎসকের ব্যক্তিগত চেম্বার, সিরিয়ালের জন্য আগে ফোন করুন।',
        en: 'Private chamber of an experienced consultant. Call ahead for a serial number.',
      },
      {
        bn: 'নিয়মিত রোগী দেখা হয় সন্ধ্যায়, আগাম সময় নেওয়া যায়।',
        en: 'Regular evening consulting hours with advance appointments available.',
      },
    ],
    services: [
      { bn: 'রোগী দেখা', en: 'Consultation' },
      { bn: 'ফলো-আপ', en: 'Follow-up visit' },
      { bn: 'রিপোর্ট দেখা', en: 'Report review' },
    ],
  },
  'blood-bank': {
    descriptions: [
      {
        bn: 'সব গ্রুপের রক্ত সরবরাহ ও স্বেচ্ছায় রক্তদাতাদের তালিকা রক্ষণাবেক্ষণ করা হয়।',
        en: 'Supplies all blood groups and maintains a register of voluntary donors.',
      },
      {
        bn: 'জরুরি প্রয়োজনে রক্ত সংগ্রহ ও ক্রস-ম্যাচিং সুবিধা।',
        en: 'Emergency blood collection with on-site cross-matching.',
      },
    ],
    services: [
      { bn: 'রক্ত সরবরাহ', en: 'Blood supply' },
      { bn: 'রক্তদাতা খোঁজা', en: 'Donor matching' },
      { bn: 'ক্রস-ম্যাচিং', en: 'Cross-matching' },
      { bn: 'রক্তের গ্রুপ পরীক্ষা', en: 'Blood grouping' },
    ],
  },
  pharmacy: {
    descriptions: [
      {
        bn: 'সব ধরনের ওষুধ, স্বাস্থ্য সামগ্রী ও শিশুখাদ্য পাওয়া যায়।',
        en: 'Stocks a full range of medicines, health supplies and baby food.',
      },
      {
        bn: 'রেজিস্টার্ড ফার্মাসিস্টের তত্ত্বাবধানে পরিচালিত ওষুধের দোকান।',
        en: 'Dispensary operating under a registered pharmacist.',
      },
    ],
    services: [
      { bn: 'ওষুধ বিক্রয়', en: 'Prescription medicine' },
      { bn: 'ব্লাড প্রেশার মাপা', en: 'Blood pressure check' },
      { bn: 'ডায়াবেটিস পরীক্ষা', en: 'Diabetes test' },
      { bn: 'হোম ডেলিভারি', en: 'Home delivery' },
    ],
  },
  diagnostic: {
    descriptions: [
      {
        bn: 'প্যাথলজি, এক্স-রে, আল্ট্রাসনোগ্রাম ও ইসিজি সুবিধা এক ছাদের নিচে।',
        en: 'Pathology, X-ray, ultrasound and ECG facilities under one roof.',
      },
      {
        bn: 'আধুনিক যন্ত্রপাতিতে দ্রুত ও নির্ভুল রিপোর্ট প্রদান করা হয়।',
        en: 'Modern equipment delivering fast, accurate reports.',
      },
    ],
    services: [
      { bn: 'রক্ত পরীক্ষা', en: 'Blood tests' },
      { bn: 'এক্স-রে', en: 'X-ray' },
      { bn: 'আল্ট্রাসনোগ্রাম', en: 'Ultrasonogram' },
      { bn: 'ইসিজি', en: 'ECG' },
    ],
  },
  ambulance: {
    descriptions: [
      {
        bn: 'অক্সিজেন ও প্রাথমিক চিকিৎসা সরঞ্জামসহ ২৪ ঘণ্টা অ্যাম্বুলেন্স সেবা।',
        en: '24-hour ambulance service with oxygen and basic life-support equipment.',
      },
      {
        bn: 'জেলার ভেতরে ও ঢাকাসহ দূরপাল্লার রোগী পরিবহন করা হয়।',
        en: 'Patient transport within the district and long distance including Dhaka.',
      },
    ],
    services: [
      { bn: 'জরুরি পরিবহন', en: 'Emergency transport' },
      { bn: 'অক্সিজেন সুবিধা', en: 'Oxygen support' },
      { bn: 'দূরপাল্লার সেবা', en: 'Long-distance transfer' },
      { bn: 'ফ্রিজিং ভ্যান', en: 'Freezer van' },
    ],
  },
  electrician: {
    descriptions: [
      {
        bn: 'বাসাবাড়ি ও দোকানের ওয়্যারিং, ফ্যান, লাইট ও মিটারের কাজ করা হয়।',
        en: 'House and shop wiring, fans, lighting and meter work undertaken.',
      },
      {
        bn: 'অভিজ্ঞ ইলেকট্রিশিয়ান, জরুরি ডাকে দ্রুত পৌঁছান।',
        en: 'Experienced electrician with fast response on urgent call-outs.',
      },
    ],
    services: [
      { bn: 'ঘরের ওয়্যারিং', en: 'House wiring' },
      { bn: 'ফ্যান ও লাইট', en: 'Fan & light fitting' },
      { bn: 'মিটার সংযোগ', en: 'Meter connection' },
      { bn: 'শর্ট সার্কিট মেরামত', en: 'Short-circuit repair' },
    ],
  },
  plumber: {
    descriptions: [
      {
        bn: 'পানির লাইন, ট্যাংক, বাথরুম ফিটিংস ও লিক মেরামতের কাজ করা হয়।',
        en: 'Water lines, tanks, bathroom fittings and leak repairs.',
      },
      {
        bn: 'নতুন সংযোগ ও পুরনো পাইপ বদলানোর কাজে অভিজ্ঞ।',
        en: 'Experienced in new connections and replacing old pipework.',
      },
    ],
    services: [
      { bn: 'পাইপ লিক মেরামত', en: 'Leak repair' },
      { bn: 'বাথরুম ফিটিংস', en: 'Bathroom fittings' },
      { bn: 'পানির ট্যাংক পরিষ্কার', en: 'Tank cleaning' },
      { bn: 'মোটর সংযোগ', en: 'Pump installation' },
    ],
  },
  mechanic: {
    descriptions: [
      {
        bn: 'মোটরসাইকেল ও প্রাইভেট কারের সার্ভিসিং ও যন্ত্রাংশ মেরামত।',
        en: 'Servicing and parts repair for motorcycles and private cars.',
      },
      {
        bn: 'ইঞ্জিন, ব্রেক ও বৈদ্যুতিক সমস্যার সমাধান করা হয়।',
        en: 'Engine, brake and vehicle electrical faults resolved.',
      },
    ],
    services: [
      { bn: 'ইঞ্জিন সার্ভিসিং', en: 'Engine servicing' },
      { bn: 'ব্রেক মেরামত', en: 'Brake repair' },
      { bn: 'টায়ার বদল', en: 'Tyre change' },
      { bn: 'ব্যাটারি', en: 'Battery service' },
    ],
  },
  'ac-repair': {
    descriptions: [
      {
        bn: 'এসি সার্ভিসিং, গ্যাস রিফিল ও নতুন এসি স্থাপন করা হয়।',
        en: 'AC servicing, gas refill and new unit installation.',
      },
      {
        bn: 'সব ব্র্যান্ডের এয়ার কন্ডিশনার মেরামতে অভিজ্ঞ টেকনিশিয়ান।',
        en: 'Technicians experienced with all major air-conditioner brands.',
      },
    ],
    services: [
      { bn: 'এসি সার্ভিসিং', en: 'AC servicing' },
      { bn: 'গ্যাস রিফিল', en: 'Gas refill' },
      { bn: 'নতুন স্থাপন', en: 'New installation' },
      { bn: 'কম্প্রেসর মেরামত', en: 'Compressor repair' },
    ],
  },
  'generator-repair': {
    descriptions: [
      {
        bn: 'জেনারেটর ও আইপিএস মেরামত, সার্ভিসিং এবং ব্যাটারি সরবরাহ।',
        en: 'Generator and IPS repair, servicing and battery supply.',
      },
      {
        bn: 'লোডশেডিংয়ের সময় জরুরি সেবা দেওয়া হয়।',
        en: 'Emergency call-outs available during load-shedding.',
      },
    ],
    services: [
      { bn: 'জেনারেটর মেরামত', en: 'Generator repair' },
      { bn: 'আইপিএস সার্ভিসিং', en: 'IPS servicing' },
      { bn: 'ব্যাটারি সরবরাহ', en: 'Battery supply' },
      { bn: 'নিয়মিত রক্ষণাবেক্ষণ', en: 'Routine maintenance' },
    ],
  },
  'computer-repair': {
    descriptions: [
      {
        bn: 'ডেস্কটপ ও ল্যাপটপ মেরামত, সফটওয়্যার সেটআপ ও যন্ত্রাংশ বিক্রয়।',
        en: 'Desktop and laptop repair, software setup and parts sales.',
      },
      {
        bn: 'ডেটা রিকভারি ও নেটওয়ার্ক সেটআপের কাজও করা হয়।',
        en: 'Data recovery and small-office network setup also handled.',
      },
    ],
    services: [
      { bn: 'ল্যাপটপ মেরামত', en: 'Laptop repair' },
      { bn: 'সফটওয়্যার সেটআপ', en: 'Software setup' },
      { bn: 'ডেটা রিকভারি', en: 'Data recovery' },
      { bn: 'যন্ত্রাংশ বিক্রয়', en: 'Parts & accessories' },
    ],
  },
  'mobile-repair': {
    descriptions: [
      {
        bn: 'মোবাইলের ডিসপ্লে, ব্যাটারি ও সফটওয়্যার সমস্যার সমাধান।',
        en: 'Display, battery and software fixes for all handsets.',
      },
      {
        bn: 'অরিজিনাল যন্ত্রাংশ ব্যবহার করে দ্রুত সার্ভিসিং।',
        en: 'Quick servicing using original replacement parts.',
      },
    ],
    services: [
      { bn: 'ডিসপ্লে পরিবর্তন', en: 'Display replacement' },
      { bn: 'ব্যাটারি পরিবর্তন', en: 'Battery replacement' },
      { bn: 'সফটওয়্যার আপডেট', en: 'Software flashing' },
      { bn: 'পানি ক্ষতি মেরামত', en: 'Water-damage repair' },
    ],
  },
  internet: {
    descriptions: [
      {
        bn: 'বাসা ও অফিসের জন্য ব্রডব্যান্ড সংযোগ ও ফাইবার লাইন।',
        en: 'Broadband and fibre connections for homes and offices.',
      },
      {
        bn: 'দ্রুতগতির ইন্টারনেট, ২৪ ঘণ্টা কারিগরি সহায়তা।',
        en: 'High-speed internet with 24-hour technical support.',
      },
    ],
    services: [
      { bn: 'নতুন সংযোগ', en: 'New connection' },
      { bn: 'ফাইবার লাইন', en: 'Fibre line' },
      { bn: 'রাউটার সেটআপ', en: 'Router setup' },
      { bn: 'কারিগরি সহায়তা', en: 'Technical support' },
    ],
  },
  'water-supply': {
    descriptions: [
      {
        bn: 'বিশুদ্ধ খাবার পানি ও ট্যাংকে পানি সরবরাহ করা হয়।',
        en: 'Purified drinking water and bulk tanker supply.',
      },
      {
        bn: 'জার ও ট্যাংক পানি হোম ডেলিভারি সুবিধা।',
        en: 'Home delivery of jar and tanker water.',
      },
    ],
    services: [
      { bn: 'জার পানি', en: 'Jar water' },
      { bn: 'ট্যাংক সরবরাহ', en: 'Tanker supply' },
      { bn: 'হোম ডেলিভারি', en: 'Home delivery' },
      { bn: 'পানির ফিল্টার', en: 'Water filters' },
    ],
  },
  lawyer: {
    descriptions: [
      {
        bn: 'দেওয়ানি, ফৌজদারি ও পারিবারিক মামলায় আইনি পরামর্শ দেওয়া হয়।',
        en: 'Legal advice on civil, criminal and family matters.',
      },
      {
        bn: 'জমিজমা ও দলিল সংক্রান্ত পরামর্শে অভিজ্ঞ আইনজীবী।',
        en: 'Advocate experienced in land and property documentation.',
      },
    ],
    services: [
      { bn: 'আইনি পরামর্শ', en: 'Legal consultation' },
      { bn: 'দলিল প্রস্তুত', en: 'Deed drafting' },
      { bn: 'মামলা পরিচালনা', en: 'Case representation' },
      { bn: 'জমি সংক্রান্ত', en: 'Land matters' },
    ],
  },
  tailor: {
    descriptions: [
      {
        bn: 'পুরুষ ও নারীদের পোশাক তৈরি এবং মাপ অনুযায়ী সেলাই।',
        en: 'Made-to-measure stitching for men and women.',
      },
      {
        bn: 'দ্রুত ডেলিভারি ও ঈদ মৌসুমে বিশেষ অর্ডার নেওয়া হয়।',
        en: 'Fast delivery with special order slots during Eid season.',
      },
    ],
    services: [
      { bn: 'পাঞ্জাবি ও শার্ট', en: 'Panjabi & shirts' },
      { bn: 'সালোয়ার কামিজ', en: 'Salwar kameez' },
      { bn: 'ব্লাউজ ও কুর্তি', en: 'Blouse & kurti' },
      { bn: 'অল্টারেশন', en: 'Alterations' },
    ],
  },
  cleaning: {
    descriptions: [
      {
        bn: 'বাসা, অফিস ও দোকান পরিষ্কারের পেশাদার সেবা।',
        en: 'Professional cleaning for homes, offices and shops.',
      },
      {
        bn: 'পানির ট্যাংক, সেপটিক ট্যাংক ও ডিপ ক্লিনিং করা হয়।',
        en: 'Water tank, septic tank and deep-cleaning services.',
      },
    ],
    services: [
      { bn: 'ঘর পরিষ্কার', en: 'House cleaning' },
      { bn: 'ট্যাংক পরিষ্কার', en: 'Tank cleaning' },
      { bn: 'সোফা ক্লিনিং', en: 'Sofa cleaning' },
      { bn: 'ডিপ ক্লিনিং', en: 'Deep cleaning' },
    ],
  },

  // Rental categories are described per-listing, not per-category.
  house: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
  apartment: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
  bachelor: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
  office: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
  shop: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
  warehouse: { descriptions: [{ bn: '', en: '' }, { bn: '', en: '' }], services: [] },
}

/* ------------------------------------------------------------------ */
/* Review pool                                                         */
/* ------------------------------------------------------------------ */

const REVIEW_AUTHORS: Localized[] = [
  { bn: 'রফিকুল ইসলাম', en: 'Rafiqul Islam' },
  { bn: 'সাবরিনা আক্তার', en: 'Sabrina Akter' },
  { bn: 'মোঃ শাহিন', en: 'Md. Shahin' },
  { bn: 'নুসরাত জাহান', en: 'Nusrat Jahan' },
  { bn: 'আব্দুল করিম', en: 'Abdul Karim' },
  { bn: 'তানভীর হাসান', en: 'Tanvir Hasan' },
  { bn: 'ফারজানা ইয়াসমিন', en: 'Farzana Yasmin' },
  { bn: 'জাহিদ হোসেন', en: 'Zahid Hossain' },
  { bn: 'মিতা রানী', en: 'Mita Rani' },
  { bn: 'সোহেল রানা', en: 'Sohel Rana' },
]

const REVIEW_BODIES: { rating: number; text: Localized }[] = [
  {
    rating: 5,
    text: {
      bn: 'খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।',
      en: 'Responded very quickly. Polite staff and the work was done properly.',
    },
  },
  {
    rating: 5,
    text: {
      bn: 'রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।',
      en: 'Picked up the phone late at night and arrived on time. Thank you.',
    },
  },
  {
    rating: 4,
    text: {
      bn: 'সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।',
      en: 'Good service though there was some waiting. Prices are reasonable.',
    },
  },
  {
    rating: 4,
    text: {
      bn: 'কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।',
      en: 'Work was fine. Took me a little while to find the place.',
    },
  },
  {
    rating: 5,
    text: {
      bn: 'পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।',
      en: 'Our whole family goes here. We have trusted them for years.',
    },
  },
  {
    rating: 3,
    text: {
      bn: 'মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।',
      en: 'Average. You need some patience during busy hours.',
    },
  },
  {
    rating: 5,
    text: {
      bn: 'দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।',
      en: 'No haggling over the price and the job was done well.',
    },
  },
  {
    rating: 4,
    text: {
      bn: 'ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।',
      en: 'Explained everything on the phone and fixed it quickly on arrival.',
    },
  },
]

/**
 * Deterministic review assignment so the same listing always shows the same
 * reviews across reloads — important for anything that looks like a record.
 */
export function buildReviews(businessId: string, seed: number, count: number): Review[] {
  const out: Review[] = []
  const n = Math.min(count, 4)
  for (let i = 0; i < n; i++) {
    const bodyIdx = (seed * 3 + i * 5) % REVIEW_BODIES.length
    const authorIdx = (seed * 7 + i * 3) % REVIEW_AUTHORS.length
    const body = REVIEW_BODIES[bodyIdx]
    const daysAgo = 6 + ((seed * 11 + i * 17) % 220)
    const date = new Date(Date.UTC(2026, 6, 20) - daysAgo * 86_400_000)
    out.push({
      id: `${businessId}-r${i}`,
      author: REVIEW_AUTHORS[authorIdx],
      rating: body.rating,
      comment: body.text,
      date: date.toISOString().slice(0, 10),
    })
  }
  return out
}
