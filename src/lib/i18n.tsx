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
  'home.hero.marquee': 'Covering',
  'home.explore.title': 'Explore Kushtia',
  'home.explore.sub': 'Popular, essential and newly verified — all in one place.',
  'home.explore.tab.popular': 'Popular',
  'home.explore.tab.utilities': 'Utilities',
  'home.explore.tab.latest': 'Newly verified',
  // Eyebrow above the coverage band, in the same register as the hero strip's
  // 'Covering' label — the two bands are one idea at two scales.
  'home.covers.eyebrow': 'Full coverage',
  'home.covers.title': 'Everything ELAKAI covers',
  'home.covers.sub': 'Healthcare, repairs, utilities and rentals across all six upazilas.',
  'home.section.listings': 'From the directory',
  'home.section.listings.sub': 'Places and services added by the ELAKAI team.',
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

  // ---- Healthcare directory --------------------------------------------
  'health.searchPlaceholder': 'Search hospitals, doctors, clinics or services in Kushtia...',
  'health.stat.facilities': 'facilities',
  'health.stat.doctors': 'doctors',
  'health.categories': 'Categories',
  'health.featured': 'Featured',
  'health.featuredSub': 'A few well-known places to start from.',
  'health.hint': 'Search by name, specialty, test or area — or pick a category above to browse.',
  'health.emptyTitle': 'No information found',
  'health.emptySub': 'Try searching another hospital, doctor, specialty or service.',
  'health.filter.area': 'Area',
  'health.filter.specialty': 'Specialty',
  'health.filter.service': 'Services & tests',
  'health.filter.more': 'More',
  'health.filter.less': 'Less',

  'health.services': 'Main services',
  'health.departments': 'Departments',
  'health.doctors': 'Doctors',
  'health.tests': 'Tests offered',
  'health.schedule': 'Schedule',
  'health.emergency24': 'Emergency 24h',
  'health.emergency24Note': 'Emergency department open around the clock',
  'health.hoursUnknown': 'Opening hours have not been collected for this listing yet.',
  'health.hoursUnverified': 'Typical hours — not verified with the facility.',
  'health.addressUnknown': 'full address not yet verified',
  'health.approxLocation': 'Approximate location — the upazila centre, not the exact address.',
  'health.noRatingSource': 'No rating is shown because none has been collected from a source yet.',
  'health.appointmentPhone': 'Appointment',
  'health.emergencyPhone': 'Emergency line',
  'health.email': 'Email',
  'health.facebook': 'Facebook',
  'health.chambers': 'Chambers',
  'health.noChamber': 'No chamber has been recorded for this doctor yet.',
  'health.specialty': 'Specialty',
  'health.qualifications': 'Qualifications',
  'health.affiliations': 'Affiliated facilities',
  'health.bookAppointment': 'Call for appointment',
  'health.notFound': 'Listing not found',
  'health.notFoundSub': 'This entry may have been removed, or the link is wrong.',
  'health.backToDirectory': 'Back to healthcare',

  'health.sample': 'Sample',
  'health.unverified': 'Unverified',
  'health.source': 'Source',
  'health.lastVerified': 'Last verified',
  'health.notVerified': 'Not verified yet',
  'health.source.official': 'Official website',
  'health.source.dghs': 'DGHS',
  'health.source.facebook': 'Facebook page',
  'health.source.directory': 'Directory listing',
  'health.source.placeholder': 'Sample record — not a real listing',

  'services.title': 'Local services',
  'services.sub': 'Verified electricians, plumbers, mechanics and more across Kushtia.',
  'rentals.title': 'Rentals',
  'rentals.sub': 'Houses, apartments, offices and shops available in Kushtia.',

  'rentals.budget': 'Monthly budget',
  'rentals.type': 'Property type',
  'rentals.bathrooms': 'Bathrooms',
  'rentals.any': 'Any',
  'rentals.floor': 'Floor',
  'rentals.availableFrom': 'Available from',
  'rentals.sortPriceAsc': 'Price: low to high',
  'rentals.sortPriceDesc': 'Price: high to low',
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

  /* ---- Landing page ------------------------------------------------------
     The public front door at `/`. Copy is deliberately shorter and flatter
     than the app's — it is read once, at a distance, at display sizes. */
  'lp.nav.what': 'What it is',
  'lp.nav.discover': 'Discover',
  'lp.nav.coverage': 'Coverage',
  'lp.nav.enter': 'Enter ELAKAI',
  'lp.skip': 'Skip intro',

  'lp.hero.eyebrow': 'Kushtia District · Bangladesh',
  'lp.hero.title': 'Everything local. One map.',
  'lp.hero.sub':
    'ELAKAI maps the hospitals, ambulances, services and homes of Kushtia — verified, searchable, and one tap from a phone call.',
  'lp.hero.cta': 'Enter ELAKAI',
  'lp.hero.cta2': 'Emergency numbers',
  'lp.hero.scroll': 'Scroll',
  'lp.hero.marker': 'You are here',

  'lp.what.eyebrow': 'What it is',
  'lp.what.title': 'A directory that starts from where you are.',
  'lp.what.body':
    'Not a search box with a map bolted onto it. ELAKAI begins with place — six upazilas, the roads between them, and the people worth reaching on each one. Everything else is a layer on top of that.',
  'lp.what.note': 'Free. No account. Nothing to install.',

  'lp.discover.eyebrow': 'Discovery',
  'lp.discover.title': 'Ask for it the way you would say it.',
  'lp.discover.sub':
    'Type in Bangla or English. ELAKAI answers with what is open, what is verified, and what is closest — in that order.',
  'lp.discover.q1': 'ambulance tonight',
  'lp.discover.q2': 'ব্লাড ব্যাংক কাছে',
  'lp.discover.q3': '2 bed flat, Sadar',
  'lp.discover.hint': 'Examples of what the directory answers',

  'lp.field.eyebrow': 'The field',
  'lp.field.title': 'Six upazilas. One continuous surface.',
  'lp.field.sub':
    'Every listing carries coordinates, so distance is a fact rather than a guess. Move through the district and the directory moves with you.',
  'lp.field.legend': 'Listings across Kushtia district',

  'lp.feat.eyebrow': 'How it holds up',
  'lp.feat.title': 'Built for the moment you actually need it.',
  'lp.feat.1.title': 'Verified, not scraped',
  'lp.feat.1.body':
    'A listing is marked verified only after it is checked against an official source or a phone call. Everything else says so plainly.',
  'lp.feat.2.title': 'Built for one hand',
  'lp.feat.2.body':
    'Forty-eight pixel targets, one-tap dialling, and nothing standing between a person in a hurry and a phone number.',
  'lp.feat.3.title': 'Survives a weak signal',
  'lp.feat.3.body':
    'Installs as an app, caches what you have already seen, and still opens your emergency contacts with no connection at all.',
  'lp.feat.4.title': 'Bangla first',
  'lp.feat.4.body':
    'Every screen, every listing and every numeral reads in Bangla or English. The search understands both, including how people actually spell.',

  'lp.intel.eyebrow': 'Local intelligence',
  'lp.intel.title': 'Everything you need, where you need it.',
  'lp.intel.sub': 'That is the entire product.',

  'lp.cta.title': 'Start where you are.',
  'lp.cta.sub': 'Open the directory. No sign-up, no download, no cost.',
  'lp.cta.button': 'Enter ELAKAI',

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
  'home.hero.marquee': 'যা যা আছে',
  'home.explore.title': 'কুষ্টিয়া ঘুরে দেখুন',
  'home.explore.sub': 'জনপ্রিয়, প্রয়োজনীয় ও নতুন যাচাইকৃত — সব এক জায়গায়।',
  'home.explore.tab.popular': 'জনপ্রিয়',
  'home.explore.tab.utilities': 'নাগরিক সেবা',
  'home.explore.tab.latest': 'নতুন যাচাইকৃত',
  'home.covers.eyebrow': 'পূর্ণ পরিধি',
  'home.covers.title': 'ELAKAI যা যা কভার করে',
  'home.covers.sub': 'ছয়টি উপজেলা জুড়ে স্বাস্থ্যসেবা, মেরামত, নাগরিক সেবা ও ভাড়া।',
  'home.section.listings': 'ডিরেক্টরি থেকে',
  'home.section.listings.sub': 'ELAKAI টিমের যোগ করা স্থান ও সেবা।',
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

  // ---- Healthcare directory --------------------------------------------
  'health.searchPlaceholder': 'কুষ্টিয়ায় হাসপাতাল, ডাক্তার, ক্লিনিক বা সেবা খুঁজুন...',
  'health.stat.facilities': 'টি প্রতিষ্ঠান',
  'health.stat.doctors': 'জন ডাক্তার',
  'health.categories': 'বিভাগসমূহ',
  'health.featured': 'পরিচিত প্রতিষ্ঠান',
  'health.featuredSub': 'শুরু করার জন্য কয়েকটি পরিচিত জায়গা।',
  'health.hint': 'নাম, বিশেষজ্ঞতা, পরীক্ষা বা এলাকা দিয়ে খুঁজুন — অথবা উপরের যেকোনো বিভাগ বেছে নিন।',
  'health.emptyTitle': 'কোনো তথ্য পাওয়া যায়নি',
  'health.emptySub': 'অন্য কোনো হাসপাতাল, ডাক্তার, বিশেষজ্ঞতা বা সেবা দিয়ে খুঁজে দেখুন।',
  'health.filter.area': 'এলাকা',
  'health.filter.specialty': 'বিশেষজ্ঞতা',
  'health.filter.service': 'সেবা ও পরীক্ষা',
  'health.filter.more': 'আরও',
  'health.filter.less': 'কম',

  'health.services': 'প্রধান সেবাসমূহ',
  'health.departments': 'বিভাগ',
  'health.doctors': 'ডাক্তার',
  'health.tests': 'পরীক্ষা-নিরীক্ষা',
  'health.schedule': 'সময়সূচি',
  'health.emergency24': '২৪ ঘণ্টা জরুরি',
  'health.emergency24Note': 'জরুরি বিভাগ সব সময় খোলা',
  'health.hoursUnknown': 'এই তালিকার খোলার সময় এখনো সংগ্রহ করা হয়নি।',
  'health.hoursUnverified': 'সাধারণ সময়সূচি — প্রতিষ্ঠানের সাথে যাচাই করা হয়নি।',
  'health.addressUnknown': 'সম্পূর্ণ ঠিকানা এখনো যাচাই করা হয়নি',
  'health.approxLocation': 'আনুমানিক অবস্থান — উপজেলার কেন্দ্র, সঠিক ঠিকানা নয়।',
  'health.noRatingSource': 'কোনো নির্ভরযোগ্য উৎস থেকে রেটিং সংগ্রহ করা হয়নি, তাই কোনো রেটিং দেখানো হচ্ছে না।',
  'health.appointmentPhone': 'সিরিয়াল',
  'health.emergencyPhone': 'জরুরি নম্বর',
  'health.email': 'ইমেইল',
  'health.facebook': 'ফেসবুক',
  'health.chambers': 'চেম্বার',
  'health.noChamber': 'এই ডাক্তারের কোনো চেম্বারের তথ্য এখনো যোগ করা হয়নি।',
  'health.specialty': 'বিশেষজ্ঞতা',
  'health.qualifications': 'ডিগ্রি',
  'health.affiliations': 'সংযুক্ত প্রতিষ্ঠান',
  'health.bookAppointment': 'সিরিয়ালের জন্য কল',
  'health.notFound': 'তথ্য পাওয়া যায়নি',
  'health.notFoundSub': 'তালিকাটি সরানো হয়েছে অথবা লিংকটি ভুল।',
  'health.backToDirectory': 'স্বাস্থ্যসেবায় ফিরুন',

  'health.sample': 'নমুনা',
  'health.unverified': 'যাচাই হয়নি',
  'health.source': 'তথ্যের উৎস',
  'health.lastVerified': 'সর্বশেষ যাচাই',
  'health.notVerified': 'এখনো যাচাই করা হয়নি',
  'health.source.official': 'অফিসিয়াল ওয়েবসাইট',
  'health.source.dghs': 'স্বাস্থ্য অধিদপ্তর (DGHS)',
  'health.source.facebook': 'ফেসবুক পেজ',
  'health.source.directory': 'ডিরেক্টরি তালিকা',
  'health.source.placeholder': 'নমুনা তথ্য — প্রকৃত তালিকা নয়',

  'services.title': 'স্থানীয় সেবা',
  'services.sub': 'কুষ্টিয়ার যাচাইকৃত ইলেকট্রিশিয়ান, প্লাম্বার, মেকানিক ও আরও অনেক কিছু।',
  'rentals.title': 'ভাড়া',
  'rentals.sub': 'কুষ্টিয়ায় বাসা, ফ্ল্যাট, অফিস ও দোকান ভাড়া।',

  'rentals.budget': 'মাসিক বাজেট',
  'rentals.type': 'ধরন',
  'rentals.bathrooms': 'বাথরুম',
  'rentals.any': 'যেকোনো',
  'rentals.floor': 'তলা',
  'rentals.availableFrom': 'যেদিন থেকে পাওয়া যাবে',
  'rentals.sortPriceAsc': 'দাম: কম থেকে বেশি',
  'rentals.sortPriceDesc': 'দাম: বেশি থেকে কম',
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

  'lp.nav.what': 'পরিচিতি',
  'lp.nav.discover': 'খোঁজা',
  'lp.nav.coverage': 'পরিধি',
  'lp.nav.enter': 'ELAKAI খুলুন',
  'lp.skip': 'ইন্ট্রো বাদ দিন',

  'lp.hero.eyebrow': 'কুষ্টিয়া জেলা · বাংলাদেশ',
  'lp.hero.title': 'এলাকার সবকিছু। এক মানচিত্রে।',
  'lp.hero.sub':
    'কুষ্টিয়ার হাসপাতাল, অ্যাম্বুলেন্স, সেবা আর বাসা — সব এক জায়গায়। যাচাই করা, সহজে খুঁজে পাওয়া, এক টানে কল করার দূরত্বে।',
  'lp.hero.cta': 'ELAKAI খুলুন',
  'lp.hero.cta2': 'জরুরি নম্বর',
  'lp.hero.scroll': 'স্ক্রল করুন',
  'lp.hero.marker': 'আপনি এখানে',

  'lp.what.eyebrow': 'পরিচিতি',
  'lp.what.title': 'যে ডিরেক্টরি শুরু হয় আপনার অবস্থান থেকে।',
  'lp.what.body':
    'শুধু একটি সার্চ বক্সের সাথে জোড়া লাগানো মানচিত্র নয়। ELAKAI শুরু হয় জায়গা থেকে — ছয়টি উপজেলা, তাদের মধ্যেকার রাস্তা, আর প্রতিটি রাস্তায় যাদের দরকার হতে পারে তাদের নিয়ে। বাকি সবকিছু তার উপরের স্তর।',
  'lp.what.note': 'ফ্রি। অ্যাকাউন্ট লাগে না। ইনস্টল করারও কিছু নেই।',

  'lp.discover.eyebrow': 'খোঁজা',
  'lp.discover.title': 'যেভাবে মুখে বলবেন, সেভাবেই লিখুন।',
  'lp.discover.sub':
    'বাংলা বা ইংরেজি — যেটাতেই লিখুন। ELAKAI আগে দেখায় কোনটা এখন খোলা, কোনটা যাচাই করা, আর কোনটা সবচেয়ে কাছে।',
  'lp.discover.q1': 'অ্যাম্বুলেন্স এখন',
  'lp.discover.q2': 'ব্লাড ব্যাংক কাছে',
  'lp.discover.q3': 'সদরে ২ রুমের ফ্ল্যাট',
  'lp.discover.hint': 'ডিরেক্টরি যেভাবে উত্তর দেয় — কয়েকটি উদাহরণ',

  'lp.field.eyebrow': 'পরিধি',
  'lp.field.title': 'ছয় উপজেলা। একটাই মানচিত্র।',
  'lp.field.sub':
    'প্রতিটি তালিকার সাথে অবস্থান যুক্ত, তাই দূরত্ব অনুমান নয় — তথ্য। আপনি জেলার যেখানেই যান, ডিরেক্টরি সাথে যায়।',
  'lp.field.legend': 'কুষ্টিয়া জেলা জুড়ে তালিকা',

  'lp.feat.eyebrow': 'ভরসার জায়গা',
  'lp.feat.title': 'ঠিক যে মুহূর্তে দরকার, সেই মুহূর্তের জন্য তৈরি।',
  'lp.feat.1.title': 'যাচাই করা তথ্য',
  'lp.feat.1.body':
    'সরকারি সূত্র বা সরাসরি ফোনে মিলিয়ে দেখার পরেই কোনো তালিকা "যাচাই করা" হয়। বাকিগুলোর ক্ষেত্রে সেটাও স্পষ্ট করে লেখা থাকে।',
  'lp.feat.2.title': 'এক হাতে চালানোর মতো',
  'lp.feat.2.body':
    'বড় বোতাম, এক টানে কল, আর তাড়াহুড়োয় থাকা মানুষ ও ফোন নম্বরের মাঝে কোনো বাধা নেই।',
  'lp.feat.3.title': 'দুর্বল নেটওয়ার্কেও চলে',
  'lp.feat.3.body':
    'অ্যাপ হিসেবে ইনস্টল হয়, আগে দেখা তথ্য জমা রাখে, আর ইন্টারনেট একেবারে না থাকলেও জরুরি নম্বরগুলো খোলে।',
  'lp.feat.4.title': 'আগে বাংলা',
  'lp.feat.4.body':
    'প্রতিটি পাতা, প্রতিটি তালিকা আর প্রতিটি সংখ্যা বাংলা বা ইংরেজিতে পড়া যায়। সার্চ দুটোই বোঝে — মানুষ যেভাবে বানান লেখে সেভাবেও।',

  'lp.intel.eyebrow': 'এলাকার তথ্য',
  'lp.intel.title': 'যা দরকার, ঠিক যেখানে দরকার।',
  'lp.intel.sub': 'পুরো ব্যাপারটা এটুকুই।',

  'lp.cta.title': 'যেখানে আছেন, সেখান থেকেই শুরু করুন।',
  'lp.cta.sub': 'ডিরেক্টরি খুলুন। সাইন-আপ নেই, ডাউনলোড নেই, খরচ নেই।',
  'lp.cta.button': 'ELAKAI খুলুন',

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
