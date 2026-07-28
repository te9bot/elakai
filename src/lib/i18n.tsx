import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS } from './config'

export type Locale = 'bn' | 'en'

/** A string that exists in both locales. Used throughout the data layer. */
export type Localized = { bn: string; en: string }

/* ------------------------------------------------------------------ */
/* Dictionary                                                          */
/* ------------------------------------------------------------------ */

const en = {
  'brand.tagline': 'Your Local Information. One Place.',

  'nav.home': 'Home',
  'nav.emergency': 'Emergency',
  'nav.healthcare': 'Healthcare',
  'nav.services': 'Services',
  'nav.rentals': 'Rentals',
  'nav.search': 'Search',
  'nav.menu': 'Menu',
  'nav.primary': 'Primary',

  'a11y.skip': 'Skip to main content',
  'a11y.toggleTheme': 'Toggle dark mode',
  'a11y.toggleLang': 'Switch language',
  'a11y.close': 'Close',
  'a11y.back': 'Go back',

  'home.hero.title': 'Find trusted local services in Kushtia',
  'home.hero.sub':
    'Emergency contacts, healthcare, rentals, and verified local services — all in one place.',
  'home.hero.location': 'Kushtia, Bangladesh',
  'home.hero.locationNear': 'Near you · Kushtia',
  'home.hero.chips.label': 'Quick categories',
  'home.hero.emergency.title': 'Emergency — call now',
  'home.hero.emergency.all': 'All emergency contacts',
  // Read inline as "128 listings · 94 verified · 31 open 24/7", hence lowercase.
  'home.hero.stat.listings': 'listings',
  'home.hero.stat.verified': 'verified',
  'home.hero.stat.roundClock': 'open 24/7',
  'home.section.emergency': 'Emergency services',
  'home.section.emergency.sub': 'One tap when every second counts',
  'home.section.healthcare': 'Healthcare',
  'home.section.healthcare.sub': 'Hospitals, doctors, pharmacies and more',
  'home.section.utilities': 'Utilities',
  'home.section.utilities.sub': 'Power, water and internet you can reach',
  'home.section.popular': 'Popular local services',
  'home.section.popular.sub': 'Most searched in your area',
  'home.section.latest': 'Latest verified businesses',
  'home.section.latest.sub': 'Recently checked by our team',
  'home.section.rentals': 'Rental listings',
  'home.section.rentals.sub': 'Houses, flats and offices available now',
  'home.seeAll': 'See all',
  'home.howItWorks': 'How ELAKAI works',
  'home.step.search': 'Search',
  'home.step.search.sub': 'Type what you need in Bangla or English',
  'home.step.find': 'Find',
  'home.step.find.sub': 'See open, verified and nearby options first',
  'home.step.call': 'Call',
  'home.step.call.sub': 'One tap to dial — no account needed',
  'home.step.help': 'Get help',
  'home.step.help.sub': 'Directions and full details ready to go',

  'search.placeholder': 'Search hospitals, ambulance, plumbers, apartments...',
  'search.placeholderShort': 'Search services in Kushtia',
  'search.label': 'Search local services',
  'search.recent': 'Recent searches',
  'search.suggestions': 'Suggestions',
  'search.popular': 'Popular searches',
  'search.clear': 'Clear',
  'search.clearAll': 'Clear all',
  'search.cancel': 'Cancel',
  'search.results': 'results',
  'search.result': 'result',
  'search.resultsFor': 'Results for',
  'search.noResults': 'No results found',
  'search.noResultsSub': 'Try a different word, or browse a category below.',
  'search.emptyTitle': 'What do you need today?',
  'search.emptySub': 'Search by service, business name, or area.',
  'search.filters': 'Filters',
  'search.sort': 'Sort',
  'search.sort.best': 'Best match',
  'search.sort.nearest': 'Nearest',
  'search.sort.rating': 'Top rated',
  'search.sort.openFirst': 'Open now first',
  'search.openOnly': 'Open now only',
  'search.verifiedOnly': 'Verified only',
  'search.allCategories': 'All categories',
  'search.apply': 'Show results',
  'search.reset': 'Reset',
  'search.activeFilters': 'active',

  'card.call': 'Call',
  'card.directions': 'Directions',
  'card.details': 'View details',
  'card.verified': 'Verified',
  'card.open': 'Open',
  'card.closed': 'Closed',
  'card.open24': 'Open 24 hours',
  'card.opensAt': 'Opens at',
  'card.closesAt': 'Closes at',
  'card.away': 'away',
  'card.reviews': 'reviews',
  'card.noRating': 'New',

  'biz.about': 'About',
  'biz.services': 'Services offered',
  'biz.hours': 'Opening hours',
  'biz.contact': 'Contact',
  'biz.location': 'Location',
  'biz.showMap': 'Show map',
  'biz.mapHint': 'The map loads only when you tap, to save your data.',
  'biz.gallery': 'Photos',
  'biz.reviews': 'Customer reviews',
  'biz.noReviews': 'No reviews yet',
  'biz.noReviewsSub': 'Be the first to share your experience.',
  'biz.website': 'Website',
  'biz.phone': 'Phone',
  'biz.address': 'Address',
  'biz.share': 'Share',
  'biz.notFound': 'Business not found',
  'biz.notFoundSub': 'This listing may have been removed or the link is wrong.',
  'biz.backHome': 'Back to home',
  'biz.today': 'Today',

  'emergency.title': 'Emergency contacts',
  'emergency.sub': 'Large, one-tap contacts for urgent situations in Kushtia.',
  'emergency.national': 'National helplines',
  'emergency.local': 'Local emergency services',
  'emergency.available24': 'Available 24 hours',
  'emergency.callNow': 'Call now',

  'health.title': 'Healthcare',
  'health.sub': 'Hospitals, clinics, doctors, blood banks, pharmacies and diagnostics.',
  'services.title': 'Local services',
  'services.sub': 'Verified electricians, plumbers, mechanics and more across Kushtia.',
  'rentals.title': 'Rentals',
  'rentals.sub': 'Houses, apartments, offices and shops available in Kushtia.',

  'rentals.budget': 'Monthly budget',
  'rentals.bedrooms': 'Bedrooms',
  'rentals.area': 'Area',
  'rentals.tenant': 'Tenant type',
  'rentals.furnished': 'Furnished only',
  'rentals.anyBedrooms': 'Any',
  'rentals.perMonth': '/month',
  'rentals.bed': 'bed',
  'rentals.beds': 'beds',
  'rentals.bath': 'bath',
  'rentals.baths': 'baths',
  'rentals.sqft': 'sq ft',
  'rentals.tenant.family': 'Family',
  'rentals.tenant.bachelor': 'Bachelor',
  'rentals.tenant.any': 'Family or bachelor',
  'rentals.furnishedYes': 'Furnished',
  'rentals.furnishedNo': 'Unfurnished',
  'rentals.contact': 'Contact owner',

  'demo.badge': 'Demo data',
  'demo.banner':
    'All listings and phone numbers on this site are placeholders for demonstration. Nothing here can be dialled.',
  'demo.dialogTitle': 'This number is not real',
  'demo.dialogBody':
    'ELAKAI is running with demonstration data. This number is a placeholder and will not connect to anyone. In an actual emergency, use the numbers published by your local authority.',
  'demo.dialogAck': 'I understand',
  'demo.dismiss': 'Dismiss',

  'state.loading': 'Loading',
  'state.errorTitle': 'Something went wrong',
  'state.errorSub': 'We could not load this right now. Please try again.',
  'state.retry': 'Try again',
  'state.emptyTitle': 'Nothing here yet',
  'state.emptySub': 'Try adjusting your filters.',
  'state.notFound': 'Page not found',
  'state.notFoundSub': 'The page you are looking for does not exist.',

  'footer.about': 'ELAKAI is a free public directory for the people of Kushtia.',
  'footer.rights': 'All rights reserved.',
  'footer.explore': 'Explore',
  'footer.disclaimer':
    'Demonstration build — listings and numbers are placeholders and must not be relied on in an emergency.',

  'lang.name': 'English',
  'lang.switchTo': 'বাংলা',
} as const

export type TranslationKey = keyof typeof en

const bn: Record<TranslationKey, string> = {
  'brand.tagline': 'আপনার এলাকার তথ্য। এক জায়গায়।',

  'nav.home': 'হোম',
  'nav.emergency': 'জরুরি',
  'nav.healthcare': 'স্বাস্থ্যসেবা',
  'nav.services': 'সেবা',
  'nav.rentals': 'ভাড়া',
  'nav.search': 'খুঁজুন',
  'nav.menu': 'মেনু',
  'nav.primary': 'প্রধান',

  'a11y.skip': 'মূল অংশে যান',
  'a11y.toggleTheme': 'ডার্ক মোড চালু/বন্ধ',
  'a11y.toggleLang': 'ভাষা পরিবর্তন',
  'a11y.close': 'বন্ধ করুন',
  'a11y.back': 'ফিরে যান',

  'home.hero.title': 'কুষ্টিয়ার নির্ভরযোগ্য সেবা খুঁজুন',
  'home.hero.sub':
    'জরুরি নম্বর, স্বাস্থ্যসেবা, বাসা ভাড়া এবং যাচাই করা স্থানীয় সেবা — সব এক জায়গায়।',
  'home.hero.location': 'কুষ্টিয়া, বাংলাদেশ',
  'home.hero.locationNear': 'আপনার কাছে · কুষ্টিয়া',
  'home.hero.chips.label': 'দ্রুত বিভাগ',
  'home.hero.emergency.title': 'জরুরি — এখনই কল করুন',
  'home.hero.emergency.all': 'সব জরুরি নম্বর',
  'home.hero.stat.listings': 'তালিকা',
  'home.hero.stat.verified': 'যাচাইকৃত',
  // Not '২৪/৭ সেবা' — inline it would read "১৩ ২৪/৭ সেবা", two numbers collided.
  'home.hero.stat.roundClock': 'সব সময় খোলা',
  'home.section.emergency': 'জরুরি সেবা',
  'home.section.emergency.sub': 'প্রতিটি সেকেন্ড যখন গুরুত্বপূর্ণ',
  'home.section.healthcare': 'স্বাস্থ্যসেবা',
  'home.section.healthcare.sub': 'হাসপাতাল, ডাক্তার, ফার্মেসি ও আরও',
  'home.section.utilities': 'নাগরিক সেবা',
  'home.section.utilities.sub': 'বিদ্যুৎ, পানি ও ইন্টারনেট',
  'home.section.popular': 'জনপ্রিয় স্থানীয় সেবা',
  'home.section.popular.sub': 'আপনার এলাকায় সবচেয়ে বেশি খোঁজা হয়েছে',
  'home.section.latest': 'নতুন যাচাইকৃত প্রতিষ্ঠান',
  'home.section.latest.sub': 'সম্প্রতি যাচাই করা হয়েছে',
  'home.section.rentals': 'ভাড়ার তালিকা',
  'home.section.rentals.sub': 'বাসা, ফ্ল্যাট ও অফিস এখনই পাওয়া যাচ্ছে',
  'home.seeAll': 'সব দেখুন',
  'home.howItWorks': 'ELAKAI যেভাবে কাজ করে',
  'home.step.search': 'খুঁজুন',
  'home.step.search.sub': 'বাংলা বা ইংরেজিতে লিখুন',
  'home.step.find': 'পান',
  'home.step.find.sub': 'খোলা, যাচাইকৃত ও কাছের সেবা আগে দেখুন',
  'home.step.call': 'কল করুন',
  'home.step.call.sub': 'এক চাপে কল — কোনো অ্যাকাউন্ট লাগবে না',
  'home.step.help': 'সাহায্য নিন',
  'home.step.help.sub': 'দিকনির্দেশনা ও বিস্তারিত তথ্য প্রস্তুত',

  'search.placeholder': 'হাসপাতাল, অ্যাম্বুলেন্স, প্লাম্বার, ফ্ল্যাট খুঁজুন...',
  'search.placeholderShort': 'কুষ্টিয়ায় সেবা খুঁজুন',
  'search.label': 'স্থানীয় সেবা খুঁজুন',
  'search.recent': 'সাম্প্রতিক অনুসন্ধান',
  'search.suggestions': 'পরামর্শ',
  'search.popular': 'জনপ্রিয় অনুসন্ধান',
  'search.clear': 'মুছুন',
  'search.clearAll': 'সব মুছুন',
  'search.cancel': 'বাতিল',
  'search.results': 'টি ফলাফল',
  'search.result': 'টি ফলাফল',
  'search.resultsFor': 'ফলাফল',
  'search.noResults': 'কিছু পাওয়া যায়নি',
  'search.noResultsSub': 'অন্য শব্দ দিয়ে চেষ্টা করুন, বা নিচের ক্যাটাগরি দেখুন।',
  'search.emptyTitle': 'আজ আপনার কী প্রয়োজন?',
  'search.emptySub': 'সেবা, প্রতিষ্ঠানের নাম বা এলাকা দিয়ে খুঁজুন।',
  'search.filters': 'ফিল্টার',
  'search.sort': 'সাজান',
  'search.sort.best': 'সেরা মিল',
  'search.sort.nearest': 'সবচেয়ে কাছে',
  'search.sort.rating': 'সেরা রেটিং',
  'search.sort.openFirst': 'খোলা আগে',
  'search.openOnly': 'শুধু খোলা',
  'search.verifiedOnly': 'শুধু যাচাইকৃত',
  'search.allCategories': 'সব ক্যাটাগরি',
  'search.apply': 'ফলাফল দেখুন',
  'search.reset': 'রিসেট',
  'search.activeFilters': 'টি চালু',

  'card.call': 'কল',
  'card.directions': 'দিকনির্দেশ',
  'card.details': 'বিস্তারিত',
  'card.verified': 'যাচাইকৃত',
  'card.open': 'খোলা',
  'card.closed': 'বন্ধ',
  'card.open24': '২৪ ঘণ্টা খোলা',
  'card.opensAt': 'খুলবে',
  'card.closesAt': 'বন্ধ হবে',
  'card.away': 'দূরে',
  'card.reviews': 'টি রিভিউ',
  'card.noRating': 'নতুন',

  'biz.about': 'পরিচিতি',
  'biz.services': 'যেসব সেবা দেওয়া হয়',
  'biz.hours': 'খোলার সময়',
  'biz.contact': 'যোগাযোগ',
  'biz.location': 'অবস্থান',
  'biz.showMap': 'ম্যাপ দেখুন',
  'biz.mapHint': 'আপনার ডেটা বাঁচাতে ম্যাপ শুধু চাপ দিলেই লোড হয়।',
  'biz.gallery': 'ছবি',
  'biz.reviews': 'গ্রাহকের রিভিউ',
  'biz.noReviews': 'এখনো কোনো রিভিউ নেই',
  'biz.noReviewsSub': 'আপনার অভিজ্ঞতা প্রথম জানান।',
  'biz.website': 'ওয়েবসাইট',
  'biz.phone': 'ফোন',
  'biz.address': 'ঠিকানা',
  'biz.share': 'শেয়ার',
  'biz.notFound': 'প্রতিষ্ঠান পাওয়া যায়নি',
  'biz.notFoundSub': 'তালিকাটি সরানো হয়েছে অথবা লিংকটি ভুল।',
  'biz.backHome': 'হোমে ফিরুন',
  'biz.today': 'আজ',

  'emergency.title': 'জরুরি নম্বর',
  'emergency.sub': 'কুষ্টিয়ার জরুরি পরিস্থিতির জন্য বড়, এক-চাপে কল করার নম্বর।',
  'emergency.national': 'জাতীয় হেল্পলাইন',
  'emergency.local': 'স্থানীয় জরুরি সেবা',
  'emergency.available24': '২৪ ঘণ্টা খোলা',
  'emergency.callNow': 'এখনই কল করুন',

  'health.title': 'স্বাস্থ্যসেবা',
  'health.sub': 'হাসপাতাল, ক্লিনিক, ডাক্তার, ব্লাড ব্যাংক, ফার্মেসি ও ডায়াগনস্টিক।',
  'services.title': 'স্থানীয় সেবা',
  'services.sub': 'কুষ্টিয়ার যাচাইকৃত ইলেকট্রিশিয়ান, প্লাম্বার, মেকানিক ও আরও অনেক কিছু।',
  'rentals.title': 'ভাড়া',
  'rentals.sub': 'কুষ্টিয়ায় বাসা, ফ্ল্যাট, অফিস ও দোকান ভাড়া।',

  'rentals.budget': 'মাসিক বাজেট',
  'rentals.bedrooms': 'বেডরুম',
  'rentals.area': 'এলাকা',
  'rentals.tenant': 'ভাড়াটিয়ার ধরন',
  'rentals.furnished': 'শুধু সাজানো',
  'rentals.anyBedrooms': 'যেকোনো',
  'rentals.perMonth': '/মাস',
  'rentals.bed': 'বেড',
  'rentals.beds': 'বেড',
  'rentals.bath': 'বাথ',
  'rentals.baths': 'বাথ',
  'rentals.sqft': 'বর্গফুট',
  'rentals.tenant.family': 'পরিবার',
  'rentals.tenant.bachelor': 'ব্যাচেলর',
  'rentals.tenant.any': 'পরিবার বা ব্যাচেলর',
  'rentals.furnishedYes': 'সাজানো',
  'rentals.furnishedNo': 'সাজানো নয়',
  'rentals.contact': 'মালিকের সাথে যোগাযোগ',

  'demo.badge': 'ডেমো তথ্য',
  'demo.banner':
    'এই সাইটের সব তালিকা ও ফোন নম্বর শুধুমাত্র প্রদর্শনের জন্য। এখানকার কোনো নম্বরে কল করা যাবে না।',
  'demo.dialogTitle': 'এই নম্বরটি আসল নয়',
  'demo.dialogBody':
    'ELAKAI এখন ডেমো তথ্য নিয়ে চলছে। এই নম্বরটি নমুনা মাত্র, এতে কারো সাথে সংযোগ হবে না। প্রকৃত জরুরি অবস্থায় স্থানীয় কর্তৃপক্ষের প্রকাশিত নম্বর ব্যবহার করুন।',
  'demo.dialogAck': 'আমি বুঝেছি',
  'demo.dismiss': 'বন্ধ করুন',

  'state.loading': 'লোড হচ্ছে',
  'state.errorTitle': 'কিছু একটা সমস্যা হয়েছে',
  'state.errorSub': 'এখন লোড করা যায়নি। আবার চেষ্টা করুন।',
  'state.retry': 'আবার চেষ্টা করুন',
  'state.emptyTitle': 'এখানে এখনো কিছু নেই',
  'state.emptySub': 'ফিল্টার বদলে দেখুন।',
  'state.notFound': 'পেজ পাওয়া যায়নি',
  'state.notFoundSub': 'আপনি যে পেজটি খুঁজছেন সেটি নেই।',

  'footer.about': 'ELAKAI কুষ্টিয়ার মানুষের জন্য একটি ফ্রি পাবলিক ডিরেক্টরি।',
  'footer.rights': 'সর্বস্বত্ব সংরক্ষিত।',
  'footer.explore': 'ঘুরে দেখুন',
  'footer.disclaimer':
    'ডেমো সংস্করণ — তালিকা ও নম্বরগুলো নমুনা, জরুরি প্রয়োজনে এগুলোর উপর নির্ভর করবেন না।',

  'lang.name': 'বাংলা',
  'lang.switchTo': 'English',
}

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, bn }

/* ------------------------------------------------------------------ */
/* Numerals                                                            */
/* ------------------------------------------------------------------ */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

/** Converts ASCII digits in a string to Bengali numerals. */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type I18nValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  toggleLocale: () => void
  /** Translate a dictionary key. */
  t: (key: TranslationKey) => string
  /** Pick the active language out of a `Localized` value from the data layer. */
  L: (value: Localized) => string
  /** Localise digits — Bengali numerals in bn, ASCII in en. */
  n: (value: string | number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'bn'
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.lang)
    if (stored === 'bn' || stored === 'en') return stored
  } catch {
    /* private mode */
  }
  return navigator.language?.toLowerCase().startsWith('bn') ? 'bn' : 'bn'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEYS.lang, locale)
    } catch {
      /* private mode */
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])
  const toggleLocale = useCallback(
    () => setLocaleState((p) => (p === 'bn' ? 'en' : 'bn')),
    [],
  )

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[locale]
    return {
      locale,
      setLocale,
      toggleLocale,
      t: (key) => dict[key] ?? key,
      L: (v) => (v ? v[locale] || v.en || v.bn : ''),
      n: (v) => (locale === 'bn' ? toBnDigits(v) : String(v)),
    }
  }, [locale, setLocale, toggleLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
