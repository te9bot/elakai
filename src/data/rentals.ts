import { AREA_MAP } from './categories'
import type { AreaId, Localized, Rental, TenantType } from './types'

/* ==========================================================================
 * PLACEHOLDER DATA — see src/lib/config.ts.
 * Fictional listings; phone numbers are in the reserved +880 1700-000-8xx
 * range and reach nobody.
 * ========================================================================== */

type RentalCategory = Rental['category']

/** [ title(bn), title(en), category, area, rent, beds, baths, sqft, tenant, furnished, verified ] */
type Seed = [
  string,
  string,
  RentalCategory,
  AreaId,
  number,
  number,
  number,
  number,
  TenantType,
  0 | 1,
  0 | 1,
]

const SEEDS: Seed[] = [
  ['মজমপুরে ৩ রুমের পরিবারিক ফ্ল্যাট', '3-room family flat at Mojompur', 'apartment', 'kushtia-sadar', 12000, 3, 2, 1100, 'family', 0, 1],
  ['এন.এস. রোডে ২ রুমের ফ্ল্যাট', '2-room flat on N.S. Road', 'apartment', 'kushtia-sadar', 9000, 2, 1, 850, 'family', 0, 1],
  ['হাউজিংয়ে সাজানো ফ্ল্যাট', 'Furnished flat in Housing Estate', 'apartment', 'kushtia-sadar', 18000, 3, 2, 1350, 'family', 1, 1],
  ['কোর্ট পাড়ায় ছোট ফ্ল্যাট', 'Compact flat at Court Para', 'apartment', 'kushtia-sadar', 7500, 2, 1, 720, 'any', 0, 0],
  ['থানা মোড়ে একতলা বাসা', 'Single-storey house at Thana Mor', 'house', 'kushtia-sadar', 15000, 4, 2, 1600, 'family', 0, 1],
  ['চৌড়হাসে টিনশেড বাসা', 'Tin-shed house at Chowrhas', 'house', 'kushtia-sadar', 6000, 2, 1, 700, 'family', 0, 0],
  ['কুমারখালীতে পারিবারিক বাসা', 'Family house in Kumarkhali', 'house', 'kumarkhali', 8500, 3, 2, 1200, 'family', 0, 1],
  ['ভেড়ামারায় নতুন বাসা', 'Newly built house in Bheramara', 'house', 'bheramara', 7000, 3, 1, 1000, 'family', 0, 0],
  ['কলেজ পাড়ায় ব্যাচেলর সিট', 'Bachelor seat at College Para', 'bachelor', 'kushtia-sadar', 2500, 1, 1, 180, 'bachelor', 1, 1],
  ['মজমপুরে ব্যাচেলর মেস', 'Bachelor mess at Mojompur', 'bachelor', 'kushtia-sadar', 3000, 1, 1, 220, 'bachelor', 1, 0],
  ['স্টেশন রোডে ছাত্রাবাস', 'Student hostel on Station Road', 'bachelor', 'kumarkhali', 2200, 1, 1, 160, 'bachelor', 1, 0],
  ['এন.এস. রোডে অফিস স্পেস', 'Office space on N.S. Road', 'office', 'kushtia-sadar', 22000, 0, 2, 1400, 'any', 0, 1],
  ['কোর্ট পাড়ায় চেম্বার স্পেস', 'Chamber space at Court Para', 'office', 'kushtia-sadar', 14000, 0, 1, 650, 'any', 1, 1],
  ['থানা মোড়ে দোকান ঘর', 'Shop unit at Thana Mor', 'shop', 'kushtia-sadar', 11000, 0, 1, 400, 'any', 0, 1],
  ['বাজার পাড়ায় দোকান', 'Shop in Bazar Para', 'shop', 'kumarkhali', 6500, 0, 1, 280, 'any', 0, 0],
  ['নতুন বাজারে দোকান ঘর', 'Shop unit at Notun Bazar', 'shop', 'bheramara', 5500, 0, 0, 240, 'any', 0, 0],
  ['চৌড়হাসে গুদাম ঘর', 'Warehouse at Chowrhas', 'warehouse', 'kushtia-sadar', 25000, 0, 1, 3000, 'any', 0, 1],
  ['মিরপুরে গোডাউন', 'Godown in Mirpur', 'warehouse', 'mirpur', 16000, 0, 1, 2200, 'any', 0, 0],
]

const DESCRIPTIONS: Record<RentalCategory, Localized> = {
  apartment: {
    bn: 'খোলামেলা ফ্ল্যাট, পর্যাপ্ত আলো-বাতাস। পানি ও বিদ্যুতের নিয়মিত সরবরাহ রয়েছে।',
    en: 'Open, airy flat with good natural light. Reliable water and electricity supply.',
  },
  house: {
    bn: 'নিরিবিলি পরিবেশে পারিবারিক বাসা। সামনে খোলা জায়গা ও আলাদা প্রবেশপথ।',
    en: 'Family house in a quiet neighbourhood, with open frontage and a separate entrance.',
  },
  bachelor: {
    bn: 'ছাত্র ও চাকরিজীবীদের জন্য উপযোগী। খাট, ফ্যান ও সংযুক্ত বাথরুম রয়েছে।',
    en: 'Suited to students and working tenants. Bed, fan and attached bathroom included.',
  },
  office: {
    bn: 'প্রধান সড়কের পাশে অফিস স্পেস, গ্রাহক আসা-যাওয়ার জন্য সুবিধাজনক।',
    en: 'Office space beside the main road, convenient for visiting clients.',
  },
  shop: {
    bn: 'ব্যস্ত বাজার এলাকায় দোকান ঘর, সামনে ভালো প্রদর্শনী জায়গা।',
    en: 'Shop unit in a busy market area with good frontage for display.',
  },
  warehouse: {
    bn: 'পণ্য মজুদের জন্য প্রশস্ত গুদাম, ট্রাক প্রবেশের সুবিধা রয়েছে।',
    en: 'Spacious storage with truck access for loading and unloading.',
  },
}

function hash(n: number, salt: number): number {
  const x = Math.sin(n * 91.3 + salt * 217.4) * 43758.5453
  return x - Math.floor(x)
}

function slugify(en: string): string {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const RENTALS: Rental[] = SEEDS.map(
  (
    [
      titleBn,
      titleEn,
      category,
      area,
      rent,
      bedrooms,
      bathrooms,
      sizeSqft,
      tenantType,
      furnished,
      verified,
    ],
    i,
  ) => {
    const centre = AREA_MAP[area].coords
    const id = `r${String(i + 1).padStart(3, '0')}`
    const holding = 1 + Math.floor(hash(i, 5) * 90)

    return {
      id,
      slug: slugify(titleEn),
      title: { bn: titleBn, en: titleEn },
      category,
      description: DESCRIPTIONS[category],
      // PLACEHOLDER — not dialable. See src/lib/config.ts.
      phone: `+880 1700-000-8${String(i + 1).padStart(2, '0')}`,
      rent,
      bedrooms,
      bathrooms,
      sizeSqft,
      tenantType,
      furnished: furnished === 1,
      floor: category === 'apartment' || category === 'office' ? 1 + (i % 5) : undefined,
      area,
      address: {
        bn: `${holding} নং, ${AREA_MAP[area].name.bn}`,
        en: `Holding ${holding}, ${AREA_MAP[area].name.en}`,
      },
      coords: {
        lat: centre.lat + (hash(i, 6) - 0.5) * 0.026,
        lng: centre.lng + (hash(i, 7) - 0.5) * 0.03,
      },
      verified: verified === 1,
      imageSeed: i + 40,
      availableFrom: new Date(Date.UTC(2026, 7, 1) + (i % 8) * 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      updatedAt: new Date(Date.UTC(2026, 6, 26) - (i % 30) * 86_400_000)
        .toISOString()
        .slice(0, 10),
    }
  },
)

export const RENTAL_BY_SLUG: Record<string, Rental> = Object.fromEntries(
  RENTALS.map((r) => [r.slug, r]),
)

export const RENT_RANGE = {
  min: 2000,
  max: 30000,
} as const
