import type { EmergencyContact } from './types'
import { AREA_MAP } from './categories'

/* ==========================================================================
 * EMERGENCY CONTACTS — SAFETY CRITICAL.
 *
 * MOSTLY PLACEHOLDER. Every `phone` below in the reserved +880 1700-000-9xx
 * range reaches nobody, and `lib/phone.ts` refuses to dial it. Replace each one
 * with a number verified against the publishing authority; nothing else is
 * needed, because dialability is decided from the number itself and a verified
 * number starts working the moment it lands here.
 *
 * THE ONE REAL NUMBER
 *
 * `e01` carries 999 — Bangladesh's actual national emergency line, reaching
 * police, fire service and ambulance. It is real, correct, and published by the
 * government for exactly this purpose.
 *
 * It is deliberately the only verified number in this file. The earlier policy
 * was to reproduce no real helpline at all, so that nothing here could be
 * mistaken for an authoritative source. That made sense while the whole site
 * was a demonstration; it does not now, because the one thing a Kushtia
 * resident opening an emergency page most needs is the number that actually
 * answers. Withholding it to avoid implying authority is the more dangerous of
 * the two mistakes.
 *
 * 999 IS NOT 911. 911 is the North American number and reaches nothing from a
 * Bangladeshi phone. If you see 911 anywhere in this application or its
 * database, it is wrong and must be corrected to 999.
 * ========================================================================== */

const sadar = AREA_MAP['kushtia-sadar'].coords

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  // ---- national ---------------------------------------------------------
  {
    id: 'e01',
    name: { bn: 'জাতীয় জরুরি সেবা', en: 'National Emergency Service' },
    description: {
      bn: 'পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স — এক নম্বরে সব জরুরি সহায়তা।',
      en: 'Police, fire service and ambulance — all urgent help on one line.',
    },
    // Bangladesh's national emergency number. Real, verified, and the single
    // canonical definition of it in this codebase — the importer, the hero
    // panel, the cards, the detail page and search all read this one value.
    phone: '999',
    icon: 'shield',
    scope: 'national',
    tone: 'danger',
    available24: true,
  },
  {
    id: 'e02',
    name: { bn: 'পুলিশ কন্ট্রোল রুম', en: 'Police Control Room' },
    description: {
      bn: 'অপরাধ, দুর্ঘটনা ও নিরাপত্তা সংক্রান্ত জরুরি সহায়তার জন্য।',
      en: 'For crime, accidents and any urgent matter of public safety.',
    },
    phone: '+880 1700-000-902',
    icon: 'shield',
    scope: 'national',
    tone: 'primary',
    available24: true,
  },
  {
    id: 'e03',
    name: { bn: 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স', en: 'Fire Service & Civil Defence' },
    description: {
      bn: 'অগ্নিকাণ্ড, উদ্ধার কাজ ও দুর্যোগে জরুরি সাড়া।',
      en: 'Fire, rescue operations and emergency disaster response.',
    },
    phone: '+880 1700-000-903',
    icon: 'flame',
    scope: 'national',
    tone: 'danger',
    available24: true,
  },
  {
    id: 'e04',
    name: { bn: 'নারী ও শিশু নির্যাতন হেল্পলাইন', en: 'Women & Children Helpline' },
    description: {
      bn: 'নারী ও শিশুর প্রতি সহিংসতা প্রতিরোধে গোপনীয় সহায়তা।',
      en: 'Confidential support against violence towards women and children.',
    },
    phone: '+880 1700-000-904',
    icon: 'phone',
    scope: 'national',
    tone: 'primary',
    available24: true,
  },
  {
    id: 'e05',
    name: { bn: 'জাতীয় স্বাস্থ্য বাতায়ন', en: 'National Health Line' },
    description: {
      bn: 'ফোনে চিকিৎসা পরামর্শ ও স্বাস্থ্য সংক্রান্ত তথ্য।',
      en: 'Medical advice and health information over the phone.',
    },
    phone: '+880 1700-000-905',
    icon: 'heart-pulse',
    scope: 'national',
    tone: 'primary',
    available24: true,
  },

  // ---- local ------------------------------------------------------------
  {
    id: 'e06',
    name: { bn: 'কুষ্টিয়া সদর হাসপাতাল — জরুরি বিভাগ', en: 'Kushtia Sadar Hospital — Emergency' },
    short: { bn: 'হাসপাতাল', en: 'Hospital' },
    description: {
      bn: 'জেলা পর্যায়ের জরুরি বিভাগ, ২৪ ঘণ্টা খোলা।',
      en: 'District-level emergency department, open around the clock.',
    },
    phone: '+880 1700-000-911',
    icon: 'hospital',
    scope: 'local',
    tone: 'danger',
    available24: true,
    coords: { lat: sadar.lat + 0.006, lng: sadar.lng - 0.004 },
    address: { bn: 'হাসপাতাল রোড, কুষ্টিয়া সদর', en: 'Hospital Road, Kushtia Sadar' },
  },
  {
    id: 'e07',
    name: { bn: 'কুষ্টিয়া অ্যাম্বুলেন্স সার্ভিস', en: 'Kushtia Ambulance Service' },
    short: { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
    description: {
      bn: 'অক্সিজেনসহ ২৪ ঘণ্টা অ্যাম্বুলেন্স, জেলার ভেতরে ও বাইরে।',
      en: '24-hour ambulance with oxygen, inside and outside the district.',
    },
    phone: '+880 1700-000-912',
    icon: 'ambulance',
    scope: 'local',
    tone: 'danger',
    available24: true,
    coords: { lat: sadar.lat - 0.003, lng: sadar.lng + 0.007 },
    address: { bn: 'এন.এস. রোড, কুষ্টিয়া সদর', en: 'N.S. Road, Kushtia Sadar' },
  },
  {
    id: 'e08',
    name: { bn: 'কুষ্টিয়া ফায়ার স্টেশন', en: 'Kushtia Fire Station' },
    description: {
      bn: 'স্থানীয় অগ্নিনির্বাপণ ও উদ্ধার ইউনিট।',
      en: 'Local fire-fighting and rescue unit.',
    },
    phone: '+880 1700-000-913',
    icon: 'flame',
    scope: 'local',
    tone: 'danger',
    available24: true,
    coords: { lat: sadar.lat + 0.009, lng: sadar.lng + 0.005 },
    address: { bn: 'থানা মোড়, কুষ্টিয়া সদর', en: 'Thana Mor, Kushtia Sadar' },
  },
  {
    id: 'e09',
    name: { bn: 'বিদ্যুৎ জরুরি সেবা (পল্লী বিদ্যুৎ)', en: 'Electricity Emergency (Palli Bidyut)' },
    description: {
      bn: 'বিদ্যুৎ বিভ্রাট, ছেঁড়া তার ও ট্রান্সফরমার সমস্যায় জরুরি ডাক।',
      en: 'Outages, fallen lines and transformer faults — urgent call-outs.',
    },
    phone: '+880 1700-000-914',
    icon: 'zap',
    scope: 'local',
    tone: 'primary',
    available24: true,
    coords: { lat: sadar.lat - 0.008, lng: sadar.lng - 0.006 },
    address: { bn: 'চৌড়হাস, কুষ্টিয়া সদর', en: 'Chowrhas, Kushtia Sadar' },
  },
  {
    id: 'e10',
    name: { bn: 'কুষ্টিয়া মডেল থানা', en: 'Kushtia Model Police Station' },
    description: {
      bn: 'সদর এলাকার থানা — সাধারণ ডায়েরি ও অভিযোগ।',
      en: 'Station covering the Sadar area — general diary and complaints.',
    },
    phone: '+880 1700-000-915',
    icon: 'shield',
    scope: 'local',
    tone: 'primary',
    available24: true,
    coords: { lat: sadar.lat + 0.002, lng: sadar.lng + 0.011 },
    address: { bn: 'থানা রোড, কুষ্টিয়া সদর', en: 'Thana Road, Kushtia Sadar' },
  },
  {
    id: 'e11',
    name: { bn: 'ব্লাড ব্যাংক জরুরি লাইন', en: 'Blood Bank Emergency Line' },
    short: { bn: 'ব্লাড ব্যাংক', en: 'Blood Bank' },
    description: {
      bn: 'জরুরি রক্তের প্রয়োজনে সরাসরি যোগাযোগ।',
      en: 'Direct line when blood is needed urgently.',
    },
    phone: '+880 1700-000-916',
    icon: 'droplet',
    scope: 'local',
    tone: 'danger',
    available24: true,
    coords: { lat: sadar.lat + 0.004, lng: sadar.lng - 0.009 },
    address: { bn: 'কোর্ট পাড়া, কুষ্টিয়া সদর', en: 'Court Para, Kushtia Sadar' },
  },
  {
    id: 'e12',
    name: { bn: 'পানি সরবরাহ জরুরি সেবা', en: 'Water Supply Emergency' },
    description: {
      bn: 'পৌরসভার পানির লাইন ফেটে যাওয়া বা সরবরাহ বন্ধ হলে।',
      en: 'Burst municipal mains or an interrupted supply.',
    },
    phone: '+880 1700-000-917',
    icon: 'droplets',
    scope: 'local',
    tone: 'neutral',
    available24: false,
    coords: { lat: sadar.lat - 0.005, lng: sadar.lng + 0.003 },
    address: { bn: 'পৌরসভা ভবন, কুষ্টিয়া', en: 'Municipality Building, Kushtia' },
  },
  {
    id: 'e13',
    name: { bn: 'গ্যাস জরুরি সেবা', en: 'Gas Emergency Service' },
    description: {
      bn: 'গ্যাস লিক বা সিলিন্ডার দুর্ঘটনায় জরুরি সহায়তা।',
      en: 'Gas leaks and cylinder incidents.',
    },
    phone: '+880 1700-000-918',
    icon: 'flame',
    scope: 'local',
    tone: 'neutral',
    available24: false,
    coords: { lat: sadar.lat + 0.011, lng: sadar.lng - 0.002 },
    address: { bn: 'মজমপুর, কুষ্টিয়া সদর', en: 'Mojompur, Kushtia Sadar' },
  },
  {
    id: 'e14',
    name: { bn: 'জেলা প্রশাসক কার্যালয় — দুর্যোগ সেল', en: 'DC Office — Disaster Cell' },
    description: {
      bn: 'বন্যা, ঝড় ও বড় দুর্যোগে সমন্বয় ও ত্রাণ তথ্য।',
      en: 'Coordination and relief information during floods and storms.',
    },
    phone: '+880 1700-000-919',
    icon: 'shield',
    scope: 'local',
    tone: 'neutral',
    available24: false,
    coords: { lat: sadar.lat - 0.001, lng: sadar.lng - 0.012 },
    address: { bn: 'জেলা প্রশাসক কার্যালয়, কুষ্টিয়া', en: 'DC Office, Kushtia' },
  },
]

/**
 * The three shortcuts pinned into the homepage hero, in priority order.
 *
 * Listed explicitly rather than derived: sorting by `tone` alone surfaces the
 * national helplines and drops ambulance, which is the number people actually
 * come here for. Each of these must have a `short` label to fit the tiles.
 */
export const HERO_EMERGENCY_IDS: readonly string[] = ['e07', 'e06', 'e11']
