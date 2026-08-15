import { HOURS_PRESETS } from './templates'
import type {
  DataSource,
  Doctor,
  HealthCategoryId,
  HealthcareData,
  HealthFacility,
  HealthRecord,
} from './healthcare-types'
import type { Localized } from './types'

/* ==========================================================================
 * KUSHTIA HEALTHCARE DIRECTORY
 *
 * READ BEFORE EDITING.
 *
 * Facility and doctor NAMES come from the researched Kushtia list. Everything
 * that could send a person to the wrong place is held to a different standard:
 *
 *   phone          Always a placeholder in the reserved +880 1700-000-2xx /
 *                  -3xx range, which `src/lib/phone.ts` never dials.
 *                  Nothing here dials. Replace with a number verified by
 *                  actually dialling it, and it becomes live immediately —
 *                  there is no flag to flip.
 *   address        Present only where a location is actually known. A record
 *                  with no address falls back to its upazila, which is true.
 *   coords         Omitted. The map falls back to the area centre and says so.
 *   rating         OMITTED EVERYWHERE. Ratings and review counts are only ever
 *                  set from a real source — the UI hides them when absent
 *                  rather than showing an invented number.
 *   hours          Typical operating pattern, not a verified schedule. Any
 *                  record whose `source.verifiedAt` is null renders a "not yet
 *                  verified" note next to its schedule.
 *   source         Every record carries one. `verifiedAt: null` means nobody
 *                  has checked it against the source yet, and the profile page
 *                  says exactly that.
 *
 * `kind: 'placeholder'` records are demonstration data, marked as such in the
 * UI. They exist so a category is not empty; replace them, do not extend them.
 *
 * TO ADD A FACILITY: append to the right array below. No component changes.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                   */
/*                                                                     */
/* Services, departments and tests are drawn from these maps so the    */
/* same concept spells identically on every record — which is what     */
/* lets the filter lists be derived from the data instead of hardcoded.*/
/* ------------------------------------------------------------------ */

const SERVICE = {
  emergency: { bn: 'জরুরি বিভাগ', en: 'Emergency' },
  icu: { bn: 'আইসিইউ', en: 'ICU' },
  ccu: { bn: 'সিসিইউ', en: 'CCU' },
  nicu: { bn: 'এনআইসিইউ', en: 'NICU' },
  opd: { bn: 'বহির্বিভাগ', en: 'Outdoor (OPD)' },
  indoor: { bn: 'আন্তঃবিভাগ', en: 'Inpatient' },
  operationTheatre: { bn: 'অপারেশন থিয়েটার', en: 'Operation Theatre' },
  ambulance: { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
  bloodBank: { bn: 'ব্লাড ব্যাংক', en: 'Blood Bank' },
  pharmacy: { bn: 'ফার্মেসি', en: 'Pharmacy' },
  pathology: { bn: 'প্যাথলজি', en: 'Pathology' },
  imaging: { bn: 'ইমেজিং', en: 'Imaging' },
  dialysis: { bn: 'ডায়ালাইসিস', en: 'Dialysis' },
  physiotherapy: { bn: 'ফিজিওথেরাপি', en: 'Physiotherapy' },
  vaccination: { bn: 'টিকাদান', en: 'Vaccination' },
  maternity: { bn: 'প্রসূতি সেবা', en: 'Maternity' },
  eyeSurgery: { bn: 'চক্ষু অস্ত্রোপচার', en: 'Eye Surgery' },
  cataract: { bn: 'ছানি অপারেশন', en: 'Cataract Surgery' },
  spectacles: { bn: 'চশমা', en: 'Spectacles' },
  bloodDonation: { bn: 'রক্তদান', en: 'Blood Donation' },
  bloodGrouping: { bn: 'রক্তের গ্রুপ নির্ণয়', en: 'Blood Grouping' },
  bloodScreening: { bn: 'রক্ত স্ক্রিনিং', en: 'Blood Screening' },
  donorSearch: { bn: 'ডোনার খোঁজ', en: 'Donor Search' },
  homeDelivery: { bn: 'হোম ডেলিভারি', en: 'Home Delivery' },
  otcMedicine: { bn: 'ওষুধ বিক্রয়', en: 'Medicine Retail' },
  prescriptionMedicine: { bn: 'প্রেসক্রিপশন ওষুধ', en: 'Prescription Medicine' },
  surgicalItems: { bn: 'সার্জিক্যাল সামগ্রী', en: 'Surgical Supplies' },
  open24: { bn: '২৪ ঘণ্টা খোলা', en: 'Open 24 Hours' },
  familyPlanning: { bn: 'পরিবার পরিকল্পনা', en: 'Family Planning' },
  counselling: { bn: 'কাউন্সেলিং', en: 'Counselling' },
  homeSampleCollection: { bn: 'বাসা থেকে নমুনা সংগ্রহ', en: 'Home Sample Collection' },
  onlineReport: { bn: 'অনলাইন রিপোর্ট', en: 'Online Report' },
  doctorChamber: { bn: 'ডাক্তারের চেম্বার', en: 'Doctor Chambers' },
} satisfies Record<string, Localized>

const DEPARTMENT = {
  medicine: { bn: 'মেডিসিন', en: 'Medicine' },
  cardiology: { bn: 'কার্ডিওলজি', en: 'Cardiology' },
  neurology: { bn: 'নিউরোলজি', en: 'Neurology' },
  nephrology: { bn: 'নেফ্রোলজি', en: 'Nephrology' },
  orthopedics: { bn: 'অর্থোপেডিকস', en: 'Orthopedics' },
  pediatrics: { bn: 'শিশু বিভাগ', en: 'Pediatrics' },
  gynecology: { bn: 'গাইনি', en: 'Gynecology' },
  dermatology: { bn: 'চর্মরোগ', en: 'Dermatology' },
  ent: { bn: 'নাক কান গলা', en: 'ENT' },
  ophthalmology: { bn: 'চক্ষু', en: 'Ophthalmology' },
  gastroenterology: { bn: 'গ্যাস্ট্রোএন্টারোলজি', en: 'Gastroenterology' },
  urology: { bn: 'ইউরোলজি', en: 'Urology' },
  surgery: { bn: 'সার্জারি', en: 'Surgery' },
  psychiatry: { bn: 'মানসিক রোগ', en: 'Psychiatry' },
  dental: { bn: 'ডেন্টাল', en: 'Dental' },
} satisfies Record<string, Localized>

const TEST = {
  ctScan: { bn: 'সিটি স্ক্যান', en: 'CT Scan' },
  mri: { bn: 'এমআরআই', en: 'MRI' },
  xray: { bn: 'এক্স-রে', en: 'X-Ray' },
  ultrasound: { bn: 'আল্ট্রাসনোগ্রাম', en: 'Ultrasound' },
  ecg: { bn: 'ইসিজি', en: 'ECG' },
  echo: { bn: 'ইকো', en: 'Echocardiogram' },
  ett: { bn: 'ইটিটি', en: 'ETT' },
  endoscopy: { bn: 'এন্ডোস্কপি', en: 'Endoscopy' },
  colonoscopy: { bn: 'কোলনোস্কপি', en: 'Colonoscopy' },
  cbc: { bn: 'সিবিসি', en: 'CBC' },
  bloodSugar: { bn: 'রক্তে শর্করা', en: 'Blood Sugar' },
  lipidProfile: { bn: 'লিপিড প্রোফাইল', en: 'Lipid Profile' },
  liverFunction: { bn: 'লিভার ফাংশন', en: 'Liver Function Test' },
  kidneyFunction: { bn: 'কিডনি ফাংশন', en: 'Kidney Function Test' },
  thyroid: { bn: 'থাইরয়েড', en: 'Thyroid Profile' },
  hormone: { bn: 'হরমোন পরীক্ষা', en: 'Hormone Test' },
  urineTest: { bn: 'প্রস্রাব পরীক্ষা', en: 'Urine Test' },
  histopathology: { bn: 'হিস্টোপ্যাথলজি', en: 'Histopathology' },
  microbiology: { bn: 'মাইক্রোবায়োলজি', en: 'Microbiology' },
  covidTest: { bn: 'কোভিড পরীক্ষা', en: 'COVID Test' },
} satisfies Record<string, Localized>

/* ------------------------------------------------------------------ */
/* Source presets                                                      */
/* ------------------------------------------------------------------ */

/** A researched name with no field verification behind it yet. */
const directory = (note?: Localized): DataSource => ({
  kind: 'directory',
  note: note ?? { bn: 'স্থানীয় স্বাস্থ্যসেবা তালিকা', en: 'Local healthcare directory' },
  verifiedAt: null,
})

/** Government facility listed by the Directorate General of Health Services. */
const dghs = (): DataSource => ({
  kind: 'dghs',
  note: { bn: 'স্বাস্থ্য অধিদপ্তর (DGHS) তালিকা', en: 'Directorate General of Health Services listing' },
  url: 'https://dghs.gov.bd/',
  verifiedAt: null,
})

/** Demonstration record. Marked in the UI. Replace with a sourced one. */
const placeholder = (): DataSource => ({
  kind: 'placeholder',
  note: { bn: 'প্রদর্শনের জন্য নমুনা তথ্য', en: 'Sample record for demonstration' },
  verifiedAt: null,
})

/* ------------------------------------------------------------------ */
/* Hospitals                                                           */
/* ------------------------------------------------------------------ */

const hospitals: HealthFacility[] = [
  {
    kind: 'facility',
    id: 'h001',
    slug: 'kushtia-general-hospital',
    category: 'hospital',
    name: { bn: 'কুষ্টিয়া জেনারেল হাসপাতাল', en: 'Kushtia General Hospital' },
    aliases: ['sadar hospital', 'general hospital', 'সদর হাসপাতাল'],
    description: {
      bn: 'কুষ্টিয়া শহরের সরকারি জেনারেল হাসপাতাল। জরুরি বিভাগ, বহির্বিভাগ, আন্তঃবিভাগ ও ব্লাড ব্যাংক সেবা এখানে পাওয়া যায়।',
      en: 'The government general hospital serving Kushtia town, with emergency, outpatient, inpatient and blood bank services.',
    },
    address: { bn: 'হাসপাতাল রোড, কুষ্টিয়া সদর', en: 'Hospital Road, Kushtia Sadar' },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-201' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.opd,
      SERVICE.indoor,
      SERVICE.icu,
      SERVICE.operationTheatre,
      SERVICE.bloodBank,
      SERVICE.ambulance,
      SERVICE.pathology,
      SERVICE.vaccination,
      SERVICE.maternity,
    ],
    departments: [
      DEPARTMENT.medicine,
      DEPARTMENT.surgery,
      DEPARTMENT.gynecology,
      DEPARTMENT.pediatrics,
      DEPARTMENT.orthopedics,
      DEPARTMENT.cardiology,
      DEPARTMENT.ent,
      DEPARTMENT.ophthalmology,
    ],
    tests: [TEST.xray, TEST.ultrasound, TEST.ecg, TEST.cbc, TEST.bloodSugar, TEST.urineTest],
    doctorIds: ['d001', 'd002'],
    featured: true,
    source: dghs(),
  },
  {
    kind: 'facility',
    id: 'h002',
    slug: 'kushtia-medical-college-hospital',
    category: 'hospital',
    name: { bn: 'কুষ্টিয়া মেডিকেল কলেজ হাসপাতাল', en: 'Kushtia Medical College Hospital' },
    aliases: ['kmch', 'medical college', 'মেডিকেল কলেজ'],
    description: {
      bn: 'কুষ্টিয়া মেডিকেল কলেজের সংযুক্ত সরকারি হাসপাতাল। বিশেষায়িত বিভাগ, আইসিইউ ও শিক্ষানবিশ চিকিৎসা সেবা রয়েছে।',
      en: 'The teaching hospital attached to Kushtia Medical College, carrying specialist departments and intensive care.',
    },
    address: { bn: 'জুগিয়া, কুষ্টিয়া সদর', en: 'Jugia, Kushtia Sadar' },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-202' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.opd,
      SERVICE.indoor,
      SERVICE.icu,
      SERVICE.ccu,
      SERVICE.nicu,
      SERVICE.operationTheatre,
      SERVICE.ambulance,
      SERVICE.bloodBank,
      SERVICE.pathology,
      SERVICE.imaging,
      SERVICE.dialysis,
    ],
    departments: [
      DEPARTMENT.medicine,
      DEPARTMENT.surgery,
      DEPARTMENT.cardiology,
      DEPARTMENT.neurology,
      DEPARTMENT.nephrology,
      DEPARTMENT.gynecology,
      DEPARTMENT.pediatrics,
      DEPARTMENT.orthopedics,
      DEPARTMENT.dermatology,
      DEPARTMENT.ent,
      DEPARTMENT.ophthalmology,
      DEPARTMENT.psychiatry,
    ],
    tests: [
      TEST.ctScan,
      TEST.xray,
      TEST.ultrasound,
      TEST.ecg,
      TEST.echo,
      TEST.endoscopy,
      TEST.cbc,
      TEST.histopathology,
      TEST.microbiology,
    ],
    doctorIds: ['d003', 'd004'],
    featured: true,
    source: dghs(),
  },
  {
    kind: 'facility',
    id: 'h003',
    slug: 'ad-din-hospital-kushtia',
    category: 'hospital',
    name: { bn: 'আদ-দ্বীন হাসপাতাল কুষ্টিয়া', en: 'Ad-Din Hospital Kushtia' },
    aliases: ['ad din', 'addin', 'আদ দ্বীন'],
    description: {
      bn: 'আদ-দ্বীন ফাউন্ডেশন পরিচালিত বেসরকারি হাসপাতাল। প্রসূতি ও শিশু সেবার জন্য পরিচিত।',
      en: 'A private hospital run by the Ad-Din Foundation, known locally for maternity and child care.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-203' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.opd,
      SERVICE.indoor,
      SERVICE.maternity,
      SERVICE.operationTheatre,
      SERVICE.pharmacy,
      SERVICE.pathology,
      SERVICE.ambulance,
      SERVICE.vaccination,
    ],
    departments: [
      DEPARTMENT.gynecology,
      DEPARTMENT.pediatrics,
      DEPARTMENT.medicine,
      DEPARTMENT.surgery,
    ],
    tests: [TEST.ultrasound, TEST.xray, TEST.cbc, TEST.urineTest, TEST.bloodSugar],
    doctorIds: ['d005'],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h004',
    slug: 'sono-hospital-limited',
    category: 'hospital',
    name: { bn: 'সনো হাসপাতাল লিমিটেড', en: 'Sono Hospital Limited' },
    aliases: ['sono', 'sono hospital', 'সনো'],
    description: {
      bn: 'কুষ্টিয়ার বেসরকারি হাসপাতাল, একই প্রাঙ্গণে ডায়াগনস্টিক সেবা ও বিশেষজ্ঞ চেম্বার রয়েছে।',
      en: 'A private hospital in Kushtia with diagnostic services and specialist chambers on the same premises.',
    },
    address: { bn: 'কলেজ মোড়, কুষ্টিয়া', en: 'College Mor, Kushtia' },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-204', appointmentPhone: '+880 1700-000-244' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.icu,
      SERVICE.indoor,
      SERVICE.operationTheatre,
      SERVICE.doctorChamber,
      SERVICE.pathology,
      SERVICE.imaging,
      SERVICE.pharmacy,
      SERVICE.ambulance,
    ],
    departments: [
      DEPARTMENT.cardiology,
      DEPARTMENT.medicine,
      DEPARTMENT.surgery,
      DEPARTMENT.orthopedics,
      DEPARTMENT.gynecology,
      DEPARTMENT.gastroenterology,
    ],
    tests: [
      TEST.ctScan,
      TEST.xray,
      TEST.ultrasound,
      TEST.ecg,
      TEST.echo,
      TEST.ett,
      TEST.endoscopy,
      TEST.cbc,
      TEST.lipidProfile,
    ],
    doctorIds: ['d001', 'd006'],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h005',
    slug: 'dar-us-shefa-private-hospital',
    category: 'hospital',
    name: { bn: 'দার-উস শেফা প্রাইভেট হাসপাতাল', en: 'Dar-Us Shefa Private Hospital' },
    aliases: ['darus shefa', 'dar us shifa', 'শেফা'],
    description: {
      bn: 'কুষ্টিয়া শহরের বেসরকারি হাসপাতাল — সাধারণ চিকিৎসা, সার্জারি ও ভর্তি সেবা।',
      en: 'A private hospital in Kushtia town offering general medicine, surgery and inpatient care.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-205' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.indoor,
      SERVICE.operationTheatre,
      SERVICE.doctorChamber,
      SERVICE.pathology,
      SERVICE.pharmacy,
    ],
    departments: [DEPARTMENT.medicine, DEPARTMENT.surgery, DEPARTMENT.gynecology, DEPARTMENT.orthopedics],
    tests: [TEST.xray, TEST.ultrasound, TEST.ecg, TEST.cbc],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h006',
    slug: 'kushtia-trauma-center',
    category: 'hospital',
    name: { bn: 'কুষ্টিয়া ট্রমা সেন্টার', en: 'Kushtia Trauma Center' },
    aliases: ['trauma', 'ট্রমা'],
    description: {
      bn: 'দুর্ঘটনা ও হাড়-সংক্রান্ত জরুরি চিকিৎসার জন্য বিশেষায়িত কেন্দ্র।',
      en: 'A centre focused on accident, trauma and orthopedic emergency care.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-206' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [
      SERVICE.emergency,
      SERVICE.operationTheatre,
      SERVICE.indoor,
      SERVICE.physiotherapy,
      SERVICE.ambulance,
      SERVICE.imaging,
    ],
    departments: [DEPARTMENT.orthopedics, DEPARTMENT.surgery, DEPARTMENT.medicine],
    tests: [TEST.xray, TEST.ctScan, TEST.ultrasound],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h007',
    slug: 'kushtia-surgical-clinic',
    category: 'hospital',
    name: { bn: 'কুষ্টিয়া সার্জিক্যাল ক্লিনিক', en: 'Kushtia Surgical Clinic' },
    aliases: ['surgical clinic', 'সার্জিক্যাল'],
    description: {
      bn: 'অস্ত্রোপচার ও ভর্তি সেবার জন্য পরিচিত কুষ্টিয়ার একটি বেসরকারি প্রতিষ্ঠান।',
      en: 'A private surgical facility in Kushtia providing operative and inpatient care.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-207' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.operationTheatre, SERVICE.indoor, SERVICE.doctorChamber, SERVICE.pathology],
    departments: [DEPARTMENT.surgery, DEPARTMENT.gynecology, DEPARTMENT.orthopedics, DEPARTMENT.urology],
    tests: [TEST.xray, TEST.ultrasound, TEST.cbc],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h008',
    slug: 'rotary-eye-hospital-kushtia',
    category: 'hospital',
    name: { bn: 'রোটারি চক্ষু হাসপাতাল', en: 'Rotary Eye Hospital' },
    aliases: ['rotary', 'eye hospital', 'চক্ষু হাসপাতাল'],
    description: {
      bn: 'চক্ষু চিকিৎসা ও ছানি অপারেশনে বিশেষায়িত হাসপাতাল।',
      en: 'An eye hospital specialising in ophthalmic treatment and cataract surgery.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-208' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.eyeSurgery, SERVICE.cataract, SERVICE.opd, SERVICE.spectacles],
    departments: [DEPARTMENT.ophthalmology],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h009',
    slug: 'dristi-eye-hospital-kushtia',
    category: 'hospital',
    name: { bn: 'দৃষ্টি চক্ষু হাসপাতাল কুষ্টিয়া', en: 'Dristi Eye Hospital Kushtia' },
    aliases: ['dristi', 'drishti', 'দৃষ্টি'],
    description: {
      bn: 'চক্ষু পরীক্ষা, ছানি অপারেশন ও চশমার সেবা দেয় এমন বেসরকারি চক্ষু হাসপাতাল।',
      en: 'A private eye hospital offering eye examination, cataract surgery and spectacles.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-209' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.eyeSurgery, SERVICE.cataract, SERVICE.opd, SERVICE.spectacles],
    departments: [DEPARTMENT.ophthalmology],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h010',
    slug: 'agha-yusuf-adhunik-hospital',
    category: 'hospital',
    name: { bn: 'আগা ইউসুফ আধুনিক হাসপাতাল', en: 'Agha Yusuf Adhunik Hospital' },
    aliases: ['agha yusuf', 'adhunik', 'আধুনিক হাসপাতাল'],
    description: {
      bn: 'কুষ্টিয়ার একটি বেসরকারি হাসপাতাল — বহির্বিভাগ, ভর্তি ও ডায়াগনস্টিক সেবা।',
      en: 'A private hospital in Kushtia with outpatient, inpatient and diagnostic services.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-210' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.opd, SERVICE.indoor, SERVICE.operationTheatre, SERVICE.pathology, SERVICE.pharmacy],
    departments: [DEPARTMENT.medicine, DEPARTMENT.surgery, DEPARTMENT.gynecology, DEPARTMENT.pediatrics],
    tests: [TEST.xray, TEST.ultrasound, TEST.ecg, TEST.cbc],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'h011',
    slug: 'islamia-hospital-kushtia',
    category: 'hospital',
    name: { bn: 'ইসলামিয়া হাসপাতাল', en: 'Islamia Hospital' },
    aliases: ['islamia', 'ইসলামিয়া'],
    description: {
      bn: 'কুষ্টিয়ার বেসরকারি হাসপাতাল — সাধারণ চিকিৎসা, ভর্তি ও বিশেষজ্ঞ চেম্বার।',
      en: 'A private hospital in Kushtia offering general treatment, admission and specialist chambers.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-211' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.opd, SERVICE.indoor, SERVICE.doctorChamber, SERVICE.pathology],
    departments: [DEPARTMENT.medicine, DEPARTMENT.surgery, DEPARTMENT.pediatrics],
    tests: [TEST.xray, TEST.ultrasound, TEST.cbc],
    source: directory(),
  },
]

/* ------------------------------------------------------------------ */
/* Clinics                                                             */
/* ------------------------------------------------------------------ */

const clinics: HealthFacility[] = [
  {
    kind: 'facility',
    id: 'c001',
    slug: 'pstc-model-clinic-kushtia',
    category: 'clinic',
    name: { bn: 'পিএসটিসি মডেল ক্লিনিক কুষ্টিয়া', en: 'PSTC Model Clinic Kushtia' },
    aliases: ['pstc', 'model clinic', 'পিএসটিসি'],
    description: {
      bn: 'পপুলেশন সার্ভিসেস অ্যান্ড ট্রেনিং সেন্টার পরিচালিত ক্লিনিক — মা ও শিশু স্বাস্থ্য এবং পরিবার পরিকল্পনা সেবা।',
      en: 'A clinic run by the Population Services and Training Centre, focused on maternal and child health and family planning.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-212' },
    hours: HOURS_PRESETS.chamber,
    services: [
      SERVICE.opd,
      SERVICE.maternity,
      SERVICE.familyPlanning,
      SERVICE.vaccination,
      SERVICE.counselling,
      SERVICE.pathology,
    ],
    departments: [DEPARTMENT.gynecology, DEPARTMENT.pediatrics, DEPARTMENT.medicine],
    tests: [TEST.ultrasound, TEST.cbc, TEST.urineTest, TEST.bloodSugar],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c002',
    slug: 'new-jonosheba-clinic',
    category: 'clinic',
    name: { bn: 'নিউ জনসেবা ক্লিনিক', en: 'New Jonosheba Clinic' },
    aliases: ['jonosheba', 'janasheba', 'জনসেবা'],
    description: {
      bn: 'কুষ্টিয়া শহরের ক্লিনিক — বহির্বিভাগ, ভর্তি ও ছোট অস্ত্রোপচারের সেবা।',
      en: 'A Kushtia town clinic providing outpatient care, admission and minor surgery.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-213' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.opd, SERVICE.indoor, SERVICE.operationTheatre, SERVICE.doctorChamber],
    departments: [DEPARTMENT.medicine, DEPARTMENT.surgery, DEPARTMENT.gynecology],
    tests: [TEST.ultrasound, TEST.cbc, TEST.urineTest],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c003',
    slug: 'alo-health-center',
    category: 'clinic',
    name: { bn: 'আলো হেলথ সেন্টার', en: 'Alo Health Center' },
    aliases: ['alo', 'আলো'],
    description: {
      bn: 'প্রাথমিক স্বাস্থ্যসেবা ও পরামর্শ কেন্দ্র।',
      en: 'A primary healthcare and consultation centre.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-214' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.opd, SERVICE.counselling, SERVICE.vaccination, SERVICE.pathology],
    departments: [DEPARTMENT.medicine, DEPARTMENT.pediatrics],
    tests: [TEST.cbc, TEST.bloodSugar, TEST.urineTest],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c004',
    slug: 'daulatpur-clinic',
    category: 'clinic',
    name: { bn: 'দৌলতপুর ক্লিনিক', en: 'Daulatpur Clinic' },
    aliases: ['daulatpur', 'দৌলতপুর'],
    description: {
      bn: 'দৌলতপুর উপজেলার ক্লিনিক — বহির্বিভাগ, ভর্তি ও প্রসূতি সেবা।',
      en: 'A clinic in Daulatpur upazila providing outpatient, inpatient and maternity care.',
    },
    area: 'daulatpur',
    contact: { phone: '+880 1700-000-215' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.opd, SERVICE.indoor, SERVICE.maternity, SERVICE.pathology],
    departments: [DEPARTMENT.medicine, DEPARTMENT.gynecology],
    tests: [TEST.ultrasound, TEST.cbc],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c005',
    slug: 'modern-clinic-kushtia',
    category: 'clinic',
    name: { bn: 'মডার্ন ক্লিনিক', en: 'Modern Clinic' },
    aliases: ['modern', 'মডার্ন'],
    description: {
      bn: 'কুষ্টিয়ার ক্লিনিক — সাধারণ চিকিৎসা ও বিশেষজ্ঞ চেম্বার।',
      en: 'A Kushtia clinic offering general treatment and specialist chambers.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-216' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.opd, SERVICE.doctorChamber, SERVICE.pathology],
    departments: [DEPARTMENT.medicine, DEPARTMENT.surgery],
    tests: [TEST.cbc, TEST.ultrasound],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c006',
    slug: 'alhaj-clinic',
    category: 'clinic',
    name: { bn: 'আলহাজ ক্লিনিক', en: 'Alhaj Clinic' },
    aliases: ['alhaj', 'al haj', 'আলহাজ'],
    description: {
      bn: 'কুষ্টিয়ার ক্লিনিক — বহির্বিভাগ ও ভর্তি সেবা।',
      en: 'A Kushtia clinic providing outpatient and inpatient services.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-217' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.opd, SERVICE.indoor, SERVICE.doctorChamber],
    departments: [DEPARTMENT.medicine, DEPARTMENT.gynecology],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c007',
    slug: 'kohinur-nursing-home',
    category: 'clinic',
    name: { bn: 'কোহিনূর নার্সিং হোম', en: 'Kohinur Nursing Home' },
    aliases: ['kohinur', 'nursing home', 'কোহিনূর'],
    description: {
      bn: 'নার্সিং হোম — ভর্তি সেবা, প্রসূতি ও ছোট অস্ত্রোপচার।',
      en: 'A nursing home offering admission, maternity care and minor surgery.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-218' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.indoor, SERVICE.maternity, SERVICE.operationTheatre, SERVICE.opd],
    departments: [DEPARTMENT.gynecology, DEPARTMENT.surgery, DEPARTMENT.medicine],
    tests: [TEST.ultrasound, TEST.cbc],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'c008',
    slug: 'joymon-clinic-nursing-home',
    category: 'clinic',
    name: { bn: 'জয়মন ক্লিনিক অ্যান্ড নার্সিং হোম', en: 'Joymon Clinic & Nursing Home' },
    aliases: ['joymon', 'জয়মন'],
    description: {
      bn: 'ক্লিনিক ও নার্সিং হোম — ভর্তি, প্রসূতি ও বিশেষজ্ঞ পরামর্শ সেবা।',
      en: 'A clinic and nursing home offering admission, maternity care and specialist consultation.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-219' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.indoor, SERVICE.maternity, SERVICE.doctorChamber, SERVICE.opd],
    departments: [DEPARTMENT.gynecology, DEPARTMENT.medicine, DEPARTMENT.pediatrics],
    tests: [TEST.ultrasound, TEST.cbc],
    source: directory(),
  },
]

/* ------------------------------------------------------------------ */
/* Diagnostic centres                                                  */
/* ------------------------------------------------------------------ */

const diagnostics: HealthFacility[] = [
  {
    kind: 'facility',
    id: 'g001',
    slug: 'sono-diagnostic-center',
    category: 'diagnostic',
    name: { bn: 'সনো ডায়াগনস্টিক সেন্টার', en: 'Sono Diagnostic Center' },
    aliases: ['sono', 'sono diagnostic', 'সনো ডায়াগনস্টিক'],
    description: {
      bn: 'কুষ্টিয়ার ডায়াগনস্টিক সেন্টার — প্যাথলজি, ইমেজিং ও বিশেষজ্ঞ চেম্বার একসাথে।',
      en: 'A Kushtia diagnostic centre combining pathology, imaging and specialist chambers.',
    },
    address: { bn: 'কলেজ মোড়, কুষ্টিয়া', en: 'College Mor, Kushtia' },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-220' },
    hours: HOURS_PRESETS.chamber,
    services: [
      SERVICE.pathology,
      SERVICE.imaging,
      SERVICE.doctorChamber,
      SERVICE.homeSampleCollection,
      SERVICE.onlineReport,
    ],
    tests: [
      TEST.ctScan,
      TEST.xray,
      TEST.ultrasound,
      TEST.ecg,
      TEST.echo,
      TEST.cbc,
      TEST.lipidProfile,
      TEST.liverFunction,
      TEST.kidneyFunction,
      TEST.thyroid,
    ],
    doctorIds: ['d001'],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g002',
    slug: 'popular-diagnostic-centre-kushtia',
    category: 'diagnostic',
    name: { bn: 'পপুলার ডায়াগনস্টিক সেন্টার কুষ্টিয়া', en: 'Popular Diagnostic Centre Kushtia' },
    aliases: ['popular', 'পপুলার'],
    description: {
      bn: 'পপুলার ডায়াগনস্টিকের কুষ্টিয়া শাখা — প্যাথলজি, ইমেজিং ও বিশেষজ্ঞ চেম্বার।',
      en: 'The Kushtia branch of Popular Diagnostic, offering pathology, imaging and specialist chambers.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-221' },
    hours: HOURS_PRESETS.chamber,
    services: [
      SERVICE.pathology,
      SERVICE.imaging,
      SERVICE.doctorChamber,
      SERVICE.onlineReport,
      SERVICE.homeSampleCollection,
    ],
    tests: [
      TEST.ctScan,
      TEST.xray,
      TEST.ultrasound,
      TEST.ecg,
      TEST.echo,
      TEST.ett,
      TEST.endoscopy,
      TEST.cbc,
      TEST.thyroid,
      TEST.hormone,
      TEST.histopathology,
    ],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g003',
    slug: 'amin-diagnostic-medical-services',
    category: 'diagnostic',
    name: { bn: 'আমিন ডায়াগনস্টিক অ্যান্ড মেডিকেল সার্ভিসেস', en: 'Amin Diagnostic & Medical Services' },
    aliases: ['amin', 'আমিন'],
    description: {
      bn: 'কুষ্টিয়ার ডায়াগনস্টিক ও মেডিকেল সার্ভিস সেন্টার।',
      en: 'A diagnostic and medical services centre in Kushtia.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-222' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.imaging, SERVICE.doctorChamber],
    tests: [TEST.xray, TEST.ultrasound, TEST.ecg, TEST.cbc, TEST.bloodSugar, TEST.liverFunction],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g004',
    slug: 'dolphin-diagnostic-centre',
    category: 'diagnostic',
    name: { bn: 'ডলফিন ডায়াগনস্টিক সেন্টার', en: 'Dolphin Diagnostic Centre' },
    aliases: ['dolphin', 'ডলফিন'],
    description: {
      bn: 'ডায়াগনস্টিক সেন্টার — প্যাথলজি ও আল্ট্রাসনোগ্রাম সেবা।',
      en: 'A diagnostic centre offering pathology and ultrasound services.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-223' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.imaging],
    tests: [TEST.ultrasound, TEST.xray, TEST.cbc, TEST.urineTest, TEST.bloodSugar],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g005',
    slug: 'shefa-diagnostic-center',
    category: 'diagnostic',
    name: { bn: 'শেফা ডায়াগনস্টিক সেন্টার', en: 'Shefa Diagnostic Center' },
    aliases: ['shefa', 'shifa', 'শেফা'],
    description: {
      bn: 'কুষ্টিয়ার ডায়াগনস্টিক সেন্টার — প্যাথলজি ও ইমেজিং পরীক্ষা।',
      en: 'A Kushtia diagnostic centre for pathology and imaging tests.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-224' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.imaging, SERVICE.doctorChamber],
    tests: [TEST.xray, TEST.ultrasound, TEST.ecg, TEST.cbc, TEST.thyroid],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g006',
    slug: 'the-comfort-diagnostic-centre',
    category: 'diagnostic',
    name: { bn: 'দ্য কমফোর্ট ডায়াগনস্টিক সেন্টার', en: 'The Comfort Diagnostic Centre' },
    aliases: ['comfort', 'কমফোর্ট'],
    description: {
      bn: 'ডায়াগনস্টিক সেন্টার — পরীক্ষা-নিরীক্ষা ও বিশেষজ্ঞ পরামর্শ।',
      en: 'A diagnostic centre offering laboratory tests and specialist consultation.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-225' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.doctorChamber, SERVICE.onlineReport],
    tests: [TEST.cbc, TEST.lipidProfile, TEST.kidneyFunction, TEST.ultrasound, TEST.xray],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g007',
    slug: 'probe-bangladesh-kushtia',
    category: 'diagnostic',
    name: { bn: 'প্রোব বাংলাদেশ', en: 'PROBE Bangladesh' },
    aliases: ['probe', 'প্রোব'],
    description: {
      bn: 'কুষ্টিয়ার ডায়াগনস্টিক প্রতিষ্ঠান — ল্যাব পরীক্ষা ও ইমেজিং সেবা।',
      en: 'A diagnostic organisation in Kushtia providing laboratory testing and imaging.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-226' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.imaging, SERVICE.homeSampleCollection],
    tests: [TEST.cbc, TEST.ultrasound, TEST.xray, TEST.microbiology, TEST.covidTest],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'g008',
    slug: 'medi-care-diagnostic-center',
    category: 'diagnostic',
    name: { bn: 'মেডি-কেয়ার ডায়াগনস্টিক সেন্টার', en: 'Medi-Care Diagnostic Center' },
    aliases: ['medicare', 'medi care', 'মেডিকেয়ার'],
    description: {
      bn: 'ডায়াগনস্টিক সেন্টার — সাধারণ ও বিশেষায়িত পরীক্ষা।',
      en: 'A diagnostic centre offering routine and specialised tests.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-227' },
    hours: HOURS_PRESETS.chamber,
    services: [SERVICE.pathology, SERVICE.imaging, SERVICE.doctorChamber],
    tests: [TEST.cbc, TEST.bloodSugar, TEST.ultrasound, TEST.ecg, TEST.thyroid],
    source: directory(),
  },
]

/* ------------------------------------------------------------------ */
/* Blood banks                                                         */
/* ------------------------------------------------------------------ */

const bloodBanks: HealthFacility[] = [
  {
    kind: 'facility',
    id: 'b001',
    slug: 'kushtia-general-hospital-blood-bank',
    category: 'blood-bank',
    name: { bn: 'কুষ্টিয়া জেনারেল হাসপাতাল ব্লাড ব্যাংক', en: 'Kushtia General Hospital Blood Bank' },
    aliases: ['sadar hospital blood bank', 'সরকারি ব্লাড ব্যাংক'],
    description: {
      bn: 'কুষ্টিয়া জেনারেল হাসপাতালের ভেতরে সরকারি ব্লাড ব্যাংক — রক্ত সংগ্রহ, স্ক্রিনিং ও সরবরাহ।',
      en: 'The government blood bank inside Kushtia General Hospital, handling collection, screening and supply.',
    },
    address: { bn: 'হাসপাতাল রোড, কুষ্টিয়া সদর', en: 'Hospital Road, Kushtia Sadar' },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-228' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [SERVICE.bloodDonation, SERVICE.bloodGrouping, SERVICE.bloodScreening, SERVICE.open24],
    featured: true,
    source: dghs(),
  },
  {
    kind: 'facility',
    id: 'b002',
    slug: 'kushtia-blood-bank-transfusion-center',
    category: 'blood-bank',
    name: { bn: 'কুষ্টিয়া ব্লাড ব্যাংক অ্যান্ড ট্রান্সফিউশন সেন্টার', en: 'Kushtia Blood Bank & Transfusion Center' },
    aliases: ['transfusion', 'ট্রান্সফিউশন'],
    description: {
      bn: 'রক্ত সংগ্রহ, সংরক্ষণ ও ট্রান্সফিউশন সেবা প্রদানকারী কেন্দ্র।',
      en: 'A centre providing blood collection, storage and transfusion services.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-229' },
    hours: HOURS_PRESETS.always,
    emergency24: true,
    services: [SERVICE.bloodDonation, SERVICE.bloodGrouping, SERVICE.bloodScreening, SERVICE.donorSearch],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'b003',
    slug: 'bangladesh-red-crescent-kushtia-unit',
    category: 'blood-bank',
    name: {
      bn: 'বাংলাদেশ রেড ক্রিসেন্ট সোসাইটি — কুষ্টিয়া ইউনিট',
      en: 'Bangladesh Red Crescent Society — Kushtia Unit',
    },
    aliases: ['red crescent', 'redcrescent', 'রেড ক্রিসেন্ট'],
    description: {
      bn: 'রেড ক্রিসেন্ট সোসাইটির কুষ্টিয়া ইউনিট — স্বেচ্ছায় রক্তদান কর্মসূচি ও ডোনার সহায়তা।',
      en: 'The Kushtia unit of the Red Crescent Society, running voluntary blood donation drives and donor support.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-230', website: 'https://bdrcs.org/' },
    hours: HOURS_PRESETS.day,
    services: [SERVICE.bloodDonation, SERVICE.donorSearch, SERVICE.bloodGrouping, SERVICE.counselling],
    featured: true,
    source: {
      kind: 'official',
      note: { bn: 'বাংলাদেশ রেড ক্রিসেন্ট সোসাইটি', en: 'Bangladesh Red Crescent Society' },
      url: 'https://bdrcs.org/',
      verifiedAt: null,
    },
  },
]

/* ------------------------------------------------------------------ */
/* Pharmacies                                                          */
/* ------------------------------------------------------------------ */

const pharmacies: HealthFacility[] = [
  {
    kind: 'facility',
    id: 'p001',
    slug: 'amin-pharmacy-kushtia',
    category: 'pharmacy',
    name: { bn: 'আমিন ফার্মেসি', en: 'Amin Pharmacy' },
    aliases: ['amin', 'আমিন'],
    description: {
      bn: 'কুষ্টিয়ার ওষুধের দোকান — প্রেসক্রিপশন ও সাধারণ ওষুধ।',
      en: 'A Kushtia pharmacy stocking prescription and general medicine.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-231' },
    hours: HOURS_PRESETS.shop,
    services: [SERVICE.otcMedicine, SERVICE.prescriptionMedicine, SERVICE.surgicalItems],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'p002',
    slug: '24-7-pharmacy-kushtia',
    category: 'pharmacy',
    name: { bn: '২৪/৭ ফার্মেসি', en: '24/7 Pharmacy' },
    aliases: ['24 7', '247', 'twenty four seven'],
    description: {
      bn: 'সারা দিন-রাত খোলা থাকে এমন ফার্মেসি — রাতের জরুরি ওষুধের জন্য।',
      en: 'A round-the-clock pharmacy, useful for emergency medicine at night.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-232' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.open24, SERVICE.otcMedicine, SERVICE.prescriptionMedicine, SERVICE.homeDelivery],
    featured: true,
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'p003',
    slug: 'ms-rasel-pharmacy',
    category: 'pharmacy',
    name: { bn: 'মেসার্স রাসেল ফার্মেসি', en: 'M/S Rasel Pharmacy' },
    aliases: ['rasel', 'russell', 'রাসেল'],
    description: {
      bn: 'কুষ্টিয়ার ওষুধের দোকান — সাধারণ ও প্রেসক্রিপশন ওষুধ।',
      en: 'A Kushtia medicine shop carrying general and prescription medicine.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-233' },
    hours: HOURS_PRESETS.shop,
    services: [SERVICE.otcMedicine, SERVICE.prescriptionMedicine],
    source: directory(),
  },
  {
    kind: 'facility',
    id: 'p004',
    slug: 'ad-din-hospital-pharmacy',
    category: 'pharmacy',
    name: { bn: 'আদ-দ্বীন হাসপাতাল ফার্মেসি', en: 'Ad-Din Hospital Pharmacy' },
    aliases: ['ad din pharmacy', 'আদ দ্বীন ফার্মেসি'],
    description: {
      bn: 'আদ-দ্বীন হাসপাতালের নিজস্ব ফার্মেসি — হাসপাতালের রোগীদের জন্য ওষুধ সরবরাহ।',
      en: 'The in-house pharmacy of Ad-Din Hospital, supplying medicine to hospital patients.',
    },
    area: 'kushtia-sadar',
    contact: { phone: '+880 1700-000-234' },
    hours: HOURS_PRESETS.always,
    services: [SERVICE.prescriptionMedicine, SERVICE.otcMedicine, SERVICE.surgicalItems, SERVICE.open24],
    source: directory(),
  },
]

/* ------------------------------------------------------------------ */
/* Doctors                                                             */
/*                                                                     */
/* A separate dataset, searchable on its own. `d001` comes from the    */
/* research list; the rest are `placeholder` records carried over from */
/* the demo seed so the category is not empty, and they are labelled   */
/* as samples wherever they appear. Replace them as real chamber       */
/* listings are verified — no UI change is needed.                     */
/* ------------------------------------------------------------------ */

const doctors: Doctor[] = [
  {
    kind: 'doctor',
    id: 'd001',
    slug: 'dr-refaz-uddin',
    category: 'doctor',
    name: { bn: 'ডাঃ রেফাজ উদ্দিন', en: 'Dr. Refaz Uddin' },
    aliases: ['refaz', 'rafaz', 'রেফাজ'],
    specialty: DEPARTMENT.cardiology,
    qualifications: ['MBBS', 'MD (Cardiology)'],
    designation: { bn: 'হৃদরোগ বিশেষজ্ঞ', en: 'Cardiologist' },
    facilityIds: ['h004', 'h001', 'g001'],
    chambers: [
      {
        facilityId: 'h004',
        place: { bn: 'সনো হাসপাতাল লিমিটেড, কলেজ মোড়', en: 'Sono Hospital Limited, College Mor' },
        area: 'kushtia-sadar',
        hours: { bn: 'বিকাল ৫টা – রাত ৯টা', en: '5:00 PM – 9:00 PM' },
        phone: '+880 1700-000-301',
      },
    ],
    area: 'kushtia-sadar',
    featured: true,
    source: directory(),
  },
  {
    kind: 'doctor',
    id: 'd002',
    slug: 'dr-anisur-rahman',
    category: 'doctor',
    name: { bn: 'ডাঃ আনিসুর রহমান', en: 'Dr. Anisur Rahman' },
    specialty: DEPARTMENT.medicine,
    qualifications: ['MBBS', 'FCPS (Medicine)'],
    designation: { bn: 'মেডিসিন বিশেষজ্ঞ', en: 'Medicine Specialist' },
    facilityIds: ['h001'],
    chambers: [
      {
        facilityId: 'h001',
        place: { bn: 'কুষ্টিয়া জেনারেল হাসপাতাল', en: 'Kushtia General Hospital' },
        area: 'kushtia-sadar',
        hours: { bn: 'সন্ধ্যা ৬টা – রাত ৯টা', en: '6:00 PM – 9:00 PM' },
        phone: '+880 1700-000-302',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
  {
    kind: 'doctor',
    id: 'd003',
    slug: 'dr-sharmin-sultana',
    category: 'doctor',
    name: { bn: 'ডাঃ শারমিন সুলতানা', en: 'Dr. Sharmin Sultana' },
    specialty: DEPARTMENT.gynecology,
    qualifications: ['MBBS', 'FCPS (Gynecology & Obstetrics)'],
    designation: { bn: 'স্ত্রীরোগ ও প্রসূতি বিশেষজ্ঞ', en: 'Gynecologist & Obstetrician' },
    facilityIds: ['h002'],
    chambers: [
      {
        facilityId: 'h002',
        place: { bn: 'কুষ্টিয়া মেডিকেল কলেজ হাসপাতাল', en: 'Kushtia Medical College Hospital' },
        area: 'kushtia-sadar',
        hours: { bn: 'বিকাল ৪টা – রাত ৮টা', en: '4:00 PM – 8:00 PM' },
        phone: '+880 1700-000-303',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
  {
    kind: 'doctor',
    id: 'd004',
    slug: 'dr-kamrul-hasan',
    category: 'doctor',
    name: { bn: 'ডাঃ কামরুল হাসান', en: 'Dr. Kamrul Hasan' },
    specialty: DEPARTMENT.orthopedics,
    qualifications: ['MBBS', 'MS (Orthopedics)'],
    designation: { bn: 'অর্থোপেডিক সার্জন', en: 'Orthopedic Surgeon' },
    facilityIds: ['h002', 'h006'],
    chambers: [
      {
        facilityId: 'h006',
        place: { bn: 'কুষ্টিয়া ট্রমা সেন্টার', en: 'Kushtia Trauma Center' },
        area: 'kushtia-sadar',
        hours: { bn: 'বিকাল ৫টা – রাত ৯টা', en: '5:00 PM – 9:00 PM' },
        phone: '+880 1700-000-304',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
  {
    kind: 'doctor',
    id: 'd005',
    slug: 'dr-nazma-parveen',
    category: 'doctor',
    name: { bn: 'ডাঃ নাজমা পারভীন', en: 'Dr. Nazma Parveen' },
    specialty: DEPARTMENT.pediatrics,
    qualifications: ['MBBS', 'DCH'],
    designation: { bn: 'শিশু রোগ বিশেষজ্ঞ', en: 'Pediatrician' },
    facilityIds: ['h003'],
    chambers: [
      {
        facilityId: 'h003',
        place: { bn: 'আদ-দ্বীন হাসপাতাল কুষ্টিয়া', en: 'Ad-Din Hospital Kushtia' },
        area: 'kushtia-sadar',
        hours: { bn: 'সকাল ১০টা – দুপুর ২টা', en: '10:00 AM – 2:00 PM' },
        phone: '+880 1700-000-305',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
  {
    kind: 'doctor',
    id: 'd006',
    slug: 'dr-mahbub-alam',
    category: 'doctor',
    name: { bn: 'ডাঃ মাহবুব আলম', en: 'Dr. Mahbub Alam' },
    specialty: DEPARTMENT.gastroenterology,
    qualifications: ['MBBS', 'MD (Gastroenterology)'],
    designation: { bn: 'গ্যাস্ট্রোএন্টারোলজিস্ট', en: 'Gastroenterologist' },
    facilityIds: ['h004'],
    chambers: [
      {
        facilityId: 'h004',
        place: { bn: 'সনো হাসপাতাল লিমিটেড, কলেজ মোড়', en: 'Sono Hospital Limited, College Mor' },
        area: 'kushtia-sadar',
        hours: { bn: 'সন্ধ্যা ৬টা – রাত ১০টা', en: '6:00 PM – 10:00 PM' },
        phone: '+880 1700-000-306',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
  {
    kind: 'doctor',
    id: 'd007',
    slug: 'dr-rubina-yasmin',
    category: 'doctor',
    name: { bn: 'ডাঃ রুবিনা ইয়াসমিন', en: 'Dr. Rubina Yasmin' },
    specialty: DEPARTMENT.dermatology,
    qualifications: ['MBBS', 'DDV'],
    designation: { bn: 'চর্ম ও যৌন রোগ বিশেষজ্ঞ', en: 'Dermatologist' },
    facilityIds: ['c005'],
    chambers: [
      {
        facilityId: 'c005',
        place: { bn: 'মডার্ন ক্লিনিক, কুষ্টিয়া', en: 'Modern Clinic, Kushtia' },
        area: 'kushtia-sadar',
        hours: { bn: 'বিকাল ৪টা – রাত ৮টা', en: '4:00 PM – 8:00 PM' },
        phone: '+880 1700-000-307',
      },
    ],
    area: 'kushtia-sadar',
    source: placeholder(),
  },
]

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

export const HEALTHCARE_DATA: HealthcareData = {
  hospitals,
  clinics,
  doctors,
  bloodBanks,
  pharmacies,
  diagnostics,
}

export const HEALTH_FACILITIES: HealthFacility[] = [
  ...hospitals,
  ...clinics,
  ...bloodBanks,
  ...pharmacies,
  ...diagnostics,
]

export const HEALTH_DOCTORS: Doctor[] = doctors

export const HEALTH_RECORDS: HealthRecord[] = [...HEALTH_FACILITIES, ...HEALTH_DOCTORS]

export const HEALTH_BY_SLUG: Record<string, HealthRecord> = Object.fromEntries(
  HEALTH_RECORDS.map((r) => [r.slug, r]),
)

export const HEALTH_BY_ID: Record<string, HealthRecord> = Object.fromEntries(
  HEALTH_RECORDS.map((r) => [r.id, r]),
)

/** The six category buttons, in the order the brief specifies. */
export const HEALTH_CATEGORY_IDS: HealthCategoryId[] = [
  'hospital',
  'clinic',
  'doctor',
  'blood-bank',
  'pharmacy',
  'diagnostic',
]
