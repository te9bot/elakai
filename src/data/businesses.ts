import { AREA_MAP, CATEGORY_MAP } from './categories'
import { buildReviews, CATEGORY_COPY, HOURS_PRESETS, type HoursPreset } from './templates'
import type { AreaId, Business, CategoryId, Localized } from './types'

/* ==========================================================================
 * PLACEHOLDER DATA — see src/lib/config.ts
 *
 * Every business below is fictional and every phone number is a placeholder in
 * the reserved +880 1700-000-0xx range. Nothing here reaches a real person or
 * institution. Do not present this data as a real directory.
 * ========================================================================== */

const ROADS: Record<AreaId, Localized[]> = {
  'kushtia-sadar': [
    { bn: 'এন.এস. রোড', en: 'N.S. Road' },
    { bn: 'থানা মোড়', en: 'Thana Mor' },
    { bn: 'কোর্ট পাড়া', en: 'Court Para' },
    { bn: 'মজমপুর গেট', en: 'Mojompur Gate' },
    { bn: 'হাউজিং এলাকা', en: 'Housing Estate' },
    { bn: 'চৌড়হাস মোড়', en: 'Chowrhas Mor' },
  ],
  kumarkhali: [
    { bn: 'কলেজ রোড', en: 'College Road' },
    { bn: 'বাজার পাড়া', en: 'Bazar Para' },
    { bn: 'স্টেশন রোড', en: 'Station Road' },
    { bn: 'হাসপাতাল মোড়', en: 'Hospital Mor' },
  ],
  bheramara: [
    { bn: 'স্টেশন বাজার', en: 'Station Bazar' },
    { bn: 'ফারাক্কা রোড', en: 'Farakka Road' },
    { bn: 'উপজেলা মোড়', en: 'Upazila Mor' },
    { bn: 'নতুন বাজার', en: 'Notun Bazar' },
  ],
  mirpur: [
    { bn: 'বাসস্ট্যান্ড', en: 'Bus Stand' },
    { bn: 'পুরাতন বাজার', en: 'Purano Bazar' },
    { bn: 'কলেজ পাড়া', en: 'College Para' },
  ],
  daulatpur: [
    { bn: 'তারাগুনিয়া বাজার', en: 'Taragunia Bazar' },
    { bn: 'উপজেলা সদর', en: 'Upazila Sadar' },
    { bn: 'হাট মোড়', en: 'Hat Mor' },
  ],
  khoksa: [
    { bn: 'খোকসা বাজার', en: 'Khoksa Bazar' },
    { bn: 'জানিপুর রোড', en: 'Janipur Road' },
    { bn: 'থানা রোড', en: 'Thana Road' },
  ],
}

/**
 * Compact seed table.
 * [ name(bn), name(en), category, area, verified, rating, reviewCount, hours ]
 */
type Seed = [string, string, CategoryId, AreaId, 0 | 1, number, number, HoursPreset]

const SEEDS: Seed[] = [
  // ---- hospitals --------------------------------------------------------
  ['নিরাময় জেনারেল হাসপাতাল', 'Niramoy General Hospital', 'hospital', 'kushtia-sadar', 1, 4.6, 128, 'always'],
  ['আরোগ্য সদন হাসপাতাল', 'Arogya Sadan Hospital', 'hospital', 'kushtia-sadar', 1, 4.3, 96, 'always'],
  ['পদ্মা মেডিকেল সেন্টার', 'Padma Medical Centre', 'hospital', 'kushtia-sadar', 1, 4.1, 74, 'always'],
  ['কুমারখালী জেনারেল হাসপাতাল', 'Kumarkhali General Hospital', 'hospital', 'kumarkhali', 1, 4.0, 52, 'always'],
  ['ভেড়ামারা হেলথ কমপ্লেক্স', 'Bheramara Health Complex', 'hospital', 'bheramara', 0, 3.8, 41, 'always'],
  ['মিরপুর সেবা হাসপাতাল', 'Mirpur Sheba Hospital', 'hospital', 'mirpur', 1, 4.2, 63, 'always'],

  // ---- clinics ----------------------------------------------------------
  ['শেফা ক্লিনিক', 'Shefa Clinic', 'clinic', 'kushtia-sadar', 1, 4.4, 58, 'chamber'],
  ['মা ও শিশু ক্লিনিক', 'Ma O Shishu Clinic', 'clinic', 'kushtia-sadar', 1, 4.5, 87, 'chamber'],
  ['জনসেবা ক্লিনিক', 'Janasheba Clinic', 'clinic', 'kumarkhali', 0, 3.9, 33, 'chamber'],
  ['নবজীবন ক্লিনিক', 'Nabajibon Clinic', 'clinic', 'daulatpur', 0, 4.0, 27, 'chamber'],
  ['সুস্থতা ক্লিনিক', 'Susthota Clinic', 'clinic', 'khoksa', 0, 3.7, 19, 'chamber'],

  // ---- doctors ----------------------------------------------------------
  ['ডাঃ আনিসুর রহমান চেম্বার', 'Dr. Anisur Rahman Chamber', 'doctor', 'kushtia-sadar', 1, 4.8, 142, 'evening'],
  ['ডাঃ শারমিন সুলতানা চেম্বার', 'Dr. Sharmin Sultana Chamber', 'doctor', 'kushtia-sadar', 1, 4.7, 118, 'evening'],
  ['ডাঃ কামরুল হাসান চেম্বার', 'Dr. Kamrul Hasan Chamber', 'doctor', 'kushtia-sadar', 1, 4.4, 76, 'chamber'],
  ['ডাঃ নাজমা পারভীন চেম্বার', 'Dr. Nazma Parveen Chamber', 'doctor', 'kumarkhali', 0, 4.2, 44, 'evening'],
  ['ডাঃ মাহবুব আলম চেম্বার', 'Dr. Mahbub Alam Chamber', 'doctor', 'bheramara', 1, 4.5, 61, 'evening'],
  ['ডাঃ রুবিনা ইয়াসমিন চেম্বার', 'Dr. Rubina Yasmin Chamber', 'doctor', 'mirpur', 0, 4.1, 29, 'chamber'],

  // ---- blood banks ------------------------------------------------------
  ['কুষ্টিয়া ব্লাড ব্যাংক', 'Kushtia Blood Bank', 'blood-bank', 'kushtia-sadar', 1, 4.9, 203, 'always'],
  ['সন্ধানী ব্লাড সেন্টার', 'Sandhani Blood Centre', 'blood-bank', 'kushtia-sadar', 1, 4.7, 156, 'always'],
  ['বাঁধন রক্তদান কেন্দ্র', 'Badhon Blood Donation Centre', 'blood-bank', 'kumarkhali', 1, 4.6, 88, 'day'],

  // ---- pharmacies -------------------------------------------------------
  ['লাইফ কেয়ার ফার্মেসি', 'Life Care Pharmacy', 'pharmacy', 'kushtia-sadar', 1, 4.5, 92, 'shop'],
  ['জননী ফার্মেসি', 'Janani Pharmacy', 'pharmacy', 'kushtia-sadar', 1, 4.3, 67, 'shop'],
  ['হেলথ প্লাস ফার্মেসি', 'Health Plus Pharmacy', 'pharmacy', 'kushtia-sadar', 0, 4.0, 38, 'always'],
  ['নিউ মেডিসিন কর্নার', 'New Medicine Corner', 'pharmacy', 'kumarkhali', 0, 3.9, 24, 'shop'],
  ['ভেড়ামারা ঔষধালয়', 'Bheramara Oushadhaloy', 'pharmacy', 'bheramara', 1, 4.2, 45, 'shop'],
  ['মিরপুর ফার্মা', 'Mirpur Pharma', 'pharmacy', 'mirpur', 0, 3.8, 21, 'shop'],

  // ---- diagnostics ------------------------------------------------------
  ['পপুলার ডায়াগনস্টিক সেন্টার', 'Popular Diagnostic Centre', 'diagnostic', 'kushtia-sadar', 1, 4.4, 111, 'chamber'],
  ['ল্যাব এইড ডায়াগনস্টিক', 'Lab Aid Diagnostic', 'diagnostic', 'kushtia-sadar', 1, 4.3, 89, 'chamber'],
  ['মডার্ন প্যাথলজি', 'Modern Pathology', 'diagnostic', 'kumarkhali', 0, 4.0, 36, 'chamber'],
  ['ট্রাস্ট ডায়াগনস্টিক', 'Trust Diagnostic', 'diagnostic', 'bheramara', 0, 3.9, 28, 'chamber'],

  // ---- ambulance --------------------------------------------------------
  ['কুষ্টিয়া অ্যাম্বুলেন্স সার্ভিস', 'Kushtia Ambulance Service', 'ambulance', 'kushtia-sadar', 1, 4.7, 174, 'always'],
  ['দ্রুত অ্যাম্বুলেন্স', 'Druto Ambulance', 'ambulance', 'kushtia-sadar', 1, 4.5, 121, 'always'],
  ['সেবা অ্যাম্বুলেন্স', 'Sheba Ambulance', 'ambulance', 'kumarkhali', 0, 4.2, 58, 'always'],
  ['ভরসা অ্যাম্বুলেন্স', 'Bhorosha Ambulance', 'ambulance', 'mirpur', 1, 4.4, 66, 'always'],

  // ---- electricians -----------------------------------------------------
  ['রহমান ইলেকট্রিক', 'Rahman Electric', 'electrician', 'kushtia-sadar', 1, 4.6, 84, 'day'],
  ['আলো ইলেকট্রিক সার্ভিস', 'Alo Electric Service', 'electrician', 'kushtia-sadar', 1, 4.4, 62, 'day'],
  ['বিজলী ইলেকট্রিক', 'Bijli Electric', 'electrician', 'kumarkhali', 0, 4.1, 31, 'day'],
  ['নিউ পাওয়ার ইলেকট্রিক', 'New Power Electric', 'electrician', 'bheramara', 0, 3.9, 22, 'day'],
  ['শাহীন ইলেকট্রিক ওয়ার্কস', 'Shahin Electric Works', 'electrician', 'mirpur', 1, 4.3, 40, 'day'],

  // ---- plumbers ---------------------------------------------------------
  ['করিম প্লাম্বিং সার্ভিস', 'Karim Plumbing Service', 'plumber', 'kushtia-sadar', 1, 4.5, 71, 'day'],
  ['পানি সেবা প্লাম্বার', 'Pani Sheba Plumber', 'plumber', 'kushtia-sadar', 0, 4.0, 34, 'day'],
  ['মিস্ত্রি ঘর প্লাম্বিং', 'Mistri Ghor Plumbing', 'plumber', 'kumarkhali', 0, 3.8, 18, 'day'],
  ['ভেড়ামারা প্লাম্বিং', 'Bheramara Plumbing', 'plumber', 'bheramara', 1, 4.2, 26, 'day'],

  // ---- mechanics --------------------------------------------------------
  ['হক অটো গ্যারেজ', 'Haque Auto Garage', 'mechanic', 'kushtia-sadar', 1, 4.4, 58, 'day'],
  ['স্পিড মোটরস', 'Speed Motors', 'mechanic', 'kushtia-sadar', 0, 4.1, 37, 'day'],
  ['বাইক কেয়ার সার্ভিস', 'Bike Care Service', 'mechanic', 'kumarkhali', 1, 4.3, 44, 'day'],
  ['মিরপুর মোটর ওয়ার্কশপ', 'Mirpur Motor Workshop', 'mechanic', 'mirpur', 0, 3.9, 20, 'day'],

  // ---- AC repair --------------------------------------------------------
  ['কুল টেক এসি সার্ভিস', 'Cool Tech AC Service', 'ac-repair', 'kushtia-sadar', 1, 4.5, 49, 'day'],
  ['শীতল এসি কেয়ার', 'Shital AC Care', 'ac-repair', 'kushtia-sadar', 0, 4.0, 25, 'day'],
  ['এয়ার ফ্রেশ সার্ভিসিং', 'Air Fresh Servicing', 'ac-repair', 'kumarkhali', 0, 3.8, 14, 'day'],

  // ---- generator repair -------------------------------------------------
  ['পাওয়ার হাউস জেনারেটর', 'Power House Generator', 'generator-repair', 'kushtia-sadar', 1, 4.6, 53, 'day'],
  ['ভোল্ট জেনারেটর সার্ভিস', 'Volt Generator Service', 'generator-repair', 'kushtia-sadar', 0, 4.1, 29, 'day'],
  ['এনার্জি আইপিএস সেন্টার', 'Energy IPS Centre', 'generator-repair', 'bheramara', 0, 3.9, 17, 'day'],

  // ---- computer repair --------------------------------------------------
  ['টেক জোন কম্পিউটার', 'Tech Zone Computer', 'computer-repair', 'kushtia-sadar', 1, 4.5, 66, 'shop'],
  ['সাইবার কেয়ার', 'Cyber Care', 'computer-repair', 'kushtia-sadar', 0, 4.2, 38, 'shop'],
  ['ডিজিটাল আইটি সলিউশন', 'Digital IT Solution', 'computer-repair', 'kumarkhali', 0, 4.0, 21, 'shop'],

  // ---- mobile repair ----------------------------------------------------
  ['মোবাইল কেয়ার সেন্টার', 'Mobile Care Centre', 'mobile-repair', 'kushtia-sadar', 1, 4.4, 95, 'shop'],
  ['স্মার্ট ফোন হাসপাতাল', 'Smart Phone Hospital', 'mobile-repair', 'kushtia-sadar', 0, 4.1, 52, 'shop'],
  ['ফোন ফিক্স পয়েন্ট', 'Phone Fix Point', 'mobile-repair', 'mirpur', 0, 3.9, 27, 'shop'],

  // ---- internet ---------------------------------------------------------
  ['কুষ্টিয়া অনলাইন ব্রডব্যান্ড', 'Kushtia Online Broadband', 'internet', 'kushtia-sadar', 1, 4.3, 187, 'office'],
  ['স্কাই নেট কমিউনিকেশন', 'Sky Net Communication', 'internet', 'kushtia-sadar', 1, 4.1, 143, 'office'],
  ['ফাইবার লিংক আইএসপি', 'Fiber Link ISP', 'internet', 'kumarkhali', 0, 3.9, 76, 'office'],
  ['ভেড়ামারা নেট', 'Bheramara Net', 'internet', 'bheramara', 0, 3.7, 44, 'office'],

  // ---- water supply -----------------------------------------------------
  ['বিশুদ্ধ পানি সরবরাহ', 'Bishuddho Water Supply', 'water-supply', 'kushtia-sadar', 1, 4.4, 81, 'day'],
  ['ক্লিয়ার ওয়াটার সার্ভিস', 'Clear Water Service', 'water-supply', 'kushtia-sadar', 0, 4.0, 39, 'day'],
  ['আকুয়া পিওর', 'Aqua Pure', 'water-supply', 'mirpur', 0, 3.8, 23, 'day'],

  // ---- lawyers ----------------------------------------------------------
  ['অ্যাডভোকেট মিজানুর রহমান', 'Advocate Mizanur Rahman', 'lawyer', 'kushtia-sadar', 1, 4.6, 47, 'weekdays'],
  ['অ্যাডভোকেট সালমা খাতুন', 'Advocate Salma Khatun', 'lawyer', 'kushtia-sadar', 1, 4.4, 33, 'weekdays'],
  ['ল চেম্বার কুষ্টিয়া', 'Law Chamber Kushtia', 'lawyer', 'kushtia-sadar', 0, 4.1, 19, 'weekdays'],

  // ---- tailors ----------------------------------------------------------
  ['ফ্যাশন হাউস টেইলার্স', 'Fashion House Tailors', 'tailor', 'kushtia-sadar', 1, 4.5, 74, 'shop'],
  ['নিউ স্টাইল দর্জি', 'New Style Tailor', 'tailor', 'kushtia-sadar', 0, 4.2, 41, 'shop'],
  ['রুচি টেইলার্স', 'Ruchi Tailors', 'tailor', 'kumarkhali', 0, 4.0, 26, 'shop'],

  // ---- cleaning ---------------------------------------------------------
  ['ক্লিন হোম সার্ভিস', 'Clean Home Service', 'cleaning', 'kushtia-sadar', 1, 4.3, 36, 'day'],
  ['ফ্রেশ ক্লিনিং সলিউশন', 'Fresh Cleaning Solution', 'cleaning', 'kushtia-sadar', 0, 3.9, 18, 'day'],
]

/** Small deterministic hash so jitter and picks are stable between reloads. */
function hash(n: number, salt: number): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function slugify(en: string): string {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const BUSINESSES: Business[] = SEEDS.map(
  ([nameBn, nameEn, category, area, verified, rating, reviewCount, hours], i) => {
    const centre = AREA_MAP[area].coords
    const cat = CATEGORY_MAP[category]
    const copy = CATEGORY_COPY[category]
    const roads = ROADS[area]
    const road = roads[i % roads.length]
    const id = `b${String(i + 1).padStart(3, '0')}`

    // Spread listings ~1.5km around their area centre, deterministically.
    const lat = centre.lat + (hash(i, 1) - 0.5) * 0.028
    const lng = centre.lng + (hash(i, 2) - 0.5) * 0.032

    const holding = 1 + Math.floor(hash(i, 3) * 120)

    return {
      id,
      slug: slugify(nameEn),
      name: { bn: nameBn, en: nameEn },
      category,
      group: cat.group,
      description: copy.descriptions[i % 2],
      // PLACEHOLDER — not dialable. See src/lib/config.ts.
      phone: `+880 1700-000-${String(i + 1).padStart(3, '0')}`,
      website: verified && i % 4 === 0 ? `https://example.com/${slugify(nameEn)}` : undefined,
      address: {
        bn: `${holding} নং, ${road.bn}, ${AREA_MAP[area].name.bn}`,
        en: `Holding ${holding}, ${road.en}, ${AREA_MAP[area].name.en}`,
      },
      area,
      coords: { lat, lng },
      verified: verified === 1,
      rating,
      reviewCount,
      hours: HOURS_PRESETS[hours],
      services: copy.services,
      imageSeed: i,
      photoCount: 3 + (i % 4),
      reviews: buildReviews(id, i, reviewCount > 60 ? 4 : reviewCount > 25 ? 3 : 2),
      updatedAt: new Date(Date.UTC(2026, 6, 24) - (i % 60) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      featured: rating >= 4.5 && verified === 1,
    }
  },
)

export const BUSINESS_BY_SLUG: Record<string, Business> = Object.fromEntries(
  BUSINESSES.map((b) => [b.slug, b]),
)
