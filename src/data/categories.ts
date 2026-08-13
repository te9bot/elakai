import type { Area, Category, CategoryId } from './types'

/** The six upazilas of Kushtia district, used for the area filter and distances. */
export const AREAS: Area[] = [
  { id: 'kushtia-sadar', name: { bn: 'কুষ্টিয়া সদর', en: 'Kushtia Sadar' }, coords: { lat: 23.9013, lng: 89.1206 } },
  { id: 'kumarkhali', name: { bn: 'কুমারখালী', en: 'Kumarkhali' }, coords: { lat: 23.8626, lng: 89.2264 } },
  { id: 'bheramara', name: { bn: 'ভেড়ামারা', en: 'Bheramara' }, coords: { lat: 24.0243, lng: 88.9925 } },
  { id: 'mirpur', name: { bn: 'মিরপুর', en: 'Mirpur' }, coords: { lat: 23.9500, lng: 89.0167 } },
  { id: 'daulatpur', name: { bn: 'দৌলতপুর', en: 'Daulatpur' }, coords: { lat: 24.0667, lng: 88.9000 } },
  { id: 'khoksa', name: { bn: 'খোকসা', en: 'Khoksa' }, coords: { lat: 23.7833, lng: 89.2667 } },
]

export const AREA_MAP: Record<string, Area> = Object.fromEntries(AREAS.map((a) => [a.id, a]))

export const CATEGORIES: Category[] = [
  // ---- healthcare -------------------------------------------------------
  {
    id: 'ambulance',
    group: 'healthcare',
    name: { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
    emoji: '🚑',
    icon: 'ambulance',
    keywords: ['ambulance', 'emergency transport', 'অ্যাম্বুলেন্স', 'এম্বুলেন্স', 'জরুরি গাড়ি'],
  },
  {
    id: 'hospital',
    group: 'healthcare',
    name: { bn: 'হাসপাতাল', en: 'Hospital' },
    emoji: '🏥',
    icon: 'hospital',
    keywords: ['hospital', 'medical college', 'emergency room', 'হাসপাতাল', 'মেডিকেল'],
  },
  {
    id: 'clinic',
    group: 'healthcare',
    name: { bn: 'ক্লিনিক', en: 'Clinic' },
    emoji: '🩺',
    icon: 'stethoscope',
    keywords: ['clinic', 'health centre', 'ক্লিনিক', 'স্বাস্থ্য কেন্দ্র'],
  },
  {
    id: 'doctor',
    group: 'healthcare',
    name: { bn: 'ডাক্তার', en: 'Doctor' },
    emoji: '👨‍⚕️',
    icon: 'stethoscope',
    keywords: ['doctor', 'chamber', 'physician', 'specialist', 'ডাক্তার', 'চেম্বার', 'বিশেষজ্ঞ'],
  },
  {
    id: 'blood-bank',
    group: 'healthcare',
    name: { bn: 'ব্লাড ব্যাংক', en: 'Blood Bank' },
    emoji: '🩸',
    icon: 'droplet',
    keywords: ['blood', 'blood bank', 'donor', 'ব্লাড', 'রক্ত', 'রক্তদান'],
  },
  {
    id: 'pharmacy',
    group: 'healthcare',
    name: { bn: 'ফার্মেসি', en: 'Pharmacy' },
    emoji: '💊',
    icon: 'pill',
    keywords: ['pharmacy', 'medicine', 'drug store', 'ফার্মেসি', 'ওষুধ', 'দোকান'],
  },
  {
    id: 'diagnostic',
    group: 'healthcare',
    name: { bn: 'ডায়াগনস্টিক', en: 'Diagnostic Centre' },
    emoji: '🔬',
    icon: 'microscope',
    keywords: ['diagnostic', 'lab', 'test', 'x-ray', 'ultrasound', 'ডায়াগনস্টিক', 'পরীক্ষা', 'ল্যাব'],
  },

  // ---- services ---------------------------------------------------------
  {
    id: 'electrician',
    group: 'services',
    name: { bn: 'ইলেকট্রিশিয়ান', en: 'Electrician' },
    emoji: '🔧',
    icon: 'zap',
    keywords: ['electrician', 'wiring', 'electric', 'ইলেকট্রিশিয়ান', 'বিদ্যুৎ', 'মিস্ত্রি'],
  },
  {
    id: 'plumber',
    group: 'services',
    name: { bn: 'প্লাম্বার', en: 'Plumber' },
    emoji: '🚰',
    icon: 'wrench',
    keywords: ['plumber', 'pipe', 'water line', 'প্লাম্বার', 'পানির লাইন', 'পাইপ'],
  },
  {
    id: 'mechanic',
    group: 'services',
    name: { bn: 'মেকানিক', en: 'Mechanic' },
    emoji: '🔩',
    icon: 'car',
    keywords: ['mechanic', 'garage', 'car repair', 'bike', 'মেকানিক', 'গ্যারেজ', 'গাড়ি'],
  },
  {
    id: 'ac-repair',
    group: 'services',
    name: { bn: 'এসি মেরামত', en: 'AC Repair' },
    emoji: '❄️',
    icon: 'wind',
    keywords: ['ac', 'air conditioner', 'cooling', 'এসি', 'শীতাতপ'],
  },
  {
    id: 'generator-repair',
    group: 'services',
    name: { bn: 'জেনারেটর মেরামত', en: 'Generator Repair' },
    emoji: '⚡',
    icon: 'fuel',
    keywords: ['generator', 'ips', 'power backup', 'জেনারেটর', 'আইপিএস'],
  },
  {
    id: 'computer-repair',
    group: 'services',
    name: { bn: 'কম্পিউটার মেরামত', en: 'Computer Repair' },
    emoji: '💻',
    icon: 'laptop',
    keywords: ['computer', 'laptop', 'pc', 'কম্পিউটার', 'ল্যাপটপ'],
  },
  {
    id: 'mobile-repair',
    group: 'services',
    name: { bn: 'মোবাইল মেরামত', en: 'Mobile Repair' },
    emoji: '📱',
    icon: 'smartphone',
    keywords: ['mobile', 'phone repair', 'servicing', 'মোবাইল', 'ফোন'],
  },
  {
    id: 'internet',
    group: 'utilities',
    name: { bn: 'ইন্টারনেট', en: 'Internet Provider' },
    emoji: '📶',
    icon: 'wifi',
    keywords: ['internet', 'broadband', 'isp', 'wifi', 'ইন্টারনেট', 'ব্রডব্যান্ড'],
  },
  {
    id: 'water-supply',
    group: 'utilities',
    name: { bn: 'পানি সরবরাহ', en: 'Water Supply' },
    emoji: '💧',
    icon: 'droplets',
    keywords: ['water', 'tank', 'supply', 'পানি', 'ট্যাংক', 'সরবরাহ'],
  },
  {
    id: 'lawyer',
    group: 'services',
    name: { bn: 'আইনজীবী', en: 'Lawyer' },
    emoji: '⚖️',
    icon: 'scale',
    keywords: ['lawyer', 'advocate', 'legal', 'court', 'আইনজীবী', 'উকিল', 'আদালত'],
  },
  {
    id: 'tailor',
    group: 'services',
    name: { bn: 'দর্জি', en: 'Tailor' },
    emoji: '✂️',
    icon: 'scissors',
    keywords: ['tailor', 'stitching', 'clothes', 'দর্জি', 'সেলাই', 'কাপড়'],
  },
  {
    id: 'cleaning',
    group: 'services',
    name: { bn: 'পরিষ্কার সেবা', en: 'Cleaning' },
    emoji: '🧹',
    icon: 'sparkles',
    keywords: ['cleaning', 'housekeeping', 'sanitation', 'পরিষ্কার', 'ক্লিনিং'],
  },

  // ---- rentals ----------------------------------------------------------
  {
    id: 'house',
    group: 'rentals',
    name: { bn: 'বাসা', en: 'House' },
    emoji: '🏠',
    icon: 'home',
    keywords: ['house', 'home', 'rent', 'বাসা', 'বাড়ি', 'ভাড়া'],
  },
  {
    id: 'apartment',
    group: 'rentals',
    name: { bn: 'ফ্ল্যাট', en: 'Apartment' },
    emoji: '🏢',
    icon: 'building',
    keywords: ['apartment', 'flat', 'ফ্ল্যাট', 'অ্যাপার্টমেন্ট'],
  },
  {
    id: 'bachelor',
    group: 'rentals',
    name: { bn: 'ব্যাচেলর', en: 'Bachelor' },
    emoji: '🛏️',
    icon: 'bed',
    keywords: ['bachelor', 'seat', 'mess', 'ব্যাচেলর', 'মেস', 'সিট'],
  },
  {
    id: 'office',
    group: 'rentals',
    name: { bn: 'অফিস', en: 'Office' },
    emoji: '🏛️',
    icon: 'building-2',
    keywords: ['office', 'commercial', 'অফিস', 'বাণিজ্যিক'],
  },
  {
    id: 'shop',
    group: 'rentals',
    name: { bn: 'দোকান', en: 'Shop' },
    emoji: '🏪',
    icon: 'store',
    keywords: ['shop', 'store', 'retail', 'দোকান', 'স্টোর'],
  },
  {
    id: 'warehouse',
    group: 'rentals',
    name: { bn: 'গুদাম', en: 'Warehouse' },
    emoji: '📦',
    icon: 'warehouse',
    keywords: ['warehouse', 'godown', 'storage', 'গুদাম', 'গোডাউন'],
  },
]

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>

/** The eight chips shown on the homepage, in the order the brief specifies. */
export const HOME_CHIP_IDS: CategoryId[] = [
  'ambulance',
  'hospital',
  'pharmacy',
  'blood-bank',
  'electrician',
  'plumber',
  'apartment',
  'generator-repair',
]

// The homepage bands — "Covering" and "Everything ELAKAI covers" — used to keep
// their lists here. They live in `data/coverage.ts` now, next to the resolver
// that will one day fetch them, so there is exactly one place to edit when the
// bands change.

export const HEALTHCARE_IDS: CategoryId[] = [
  'hospital',
  'clinic',
  'doctor',
  'blood-bank',
  'pharmacy',
  'diagnostic',
  'ambulance',
]

export const SERVICE_IDS: CategoryId[] = [
  'electrician',
  'plumber',
  'mechanic',
  'ac-repair',
  'generator-repair',
  'computer-repair',
  'mobile-repair',
  'internet',
  'water-supply',
  'lawyer',
  'tailor',
  'cleaning',
]

export const RENTAL_IDS: CategoryId[] = [
  'house',
  'apartment',
  'bachelor',
  'office',
  'shop',
  'warehouse',
]

export const UTILITY_IDS: CategoryId[] = ['internet', 'water-supply', 'generator-repair']
