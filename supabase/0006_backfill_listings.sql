-- =============================================================================
-- 0006 — backfill the columns 0004 and 0005 added
--
-- GENERATED FILE. Do not edit by hand.
-- Regenerate with:  npx tsx scripts/generate-backfill-sql.ts
--
-- Run AFTER 0004 and 0005. Running it before will fail on the first unknown
-- column, having changed nothing.
--
-- 147 statements, one per bundled record. Each matches a single row on
-- (section, title) — the dedupe key the importer uses — and on `slug is null`,
-- which marks a row as not yet backfilled.
--
-- SAFE TO RUN TWICE. The second run matches zero rows, because `slug` is no
-- longer null. That also makes it safe to resume after an interruption, and
-- means an admin edit made afterwards can never be reverted by re-running it.
--
-- Touches only the columns 0004/0005 added. The original sixteen — title,
-- phone, description, address, image_url, status and the rest — are never
-- named here, so anything edited in the admin panel survives untouched.
--
-- Expected: 147 rows updated on the first run, 0 on any run after it.
-- =============================================================================

begin;

update public.listings set
  slug = 'niramoy-general-hospital',
  verified = true,
  featured = true,
  image_seed = 0,
  title_bn = 'নিরাময় জেনারেল হাসপাতাল',
  title_en = 'Niramoy General Hospital',
  description_bn = 'জরুরি বিভাগ, ইনডোর ও আউটডোর সেবা এবং অভিজ্ঞ চিকিৎসক নিয়ে ২৪ ঘণ্টা খোলা।',
  description_en = 'Round-the-clock emergency, indoor and outdoor care with experienced physicians on duty.',
  address_bn = '72 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 72, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.910240728444066,
  lng = 89.1073567290382,
  category_group = 'healthcare',
  website = 'https://example.com/niramoy-general-hospital',
  rating = 4.6,
  review_count = 128,
  photo_count = 3,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b001-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-07-14"},{"id":"b001-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-06-27"},{"id":"b001-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-06-10"},{"id":"b001-r3","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-05-24"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'niramoy general hospital'
  and slug is null;

update public.listings set
  slug = 'arogya-sadan-hospital',
  verified = true,
  featured = false,
  image_seed = 1,
  title_bn = 'আরোগ্য সদন হাসপাতাল',
  title_en = 'Arogya Sadan Hospital',
  description_bn = 'সাধারণ ও বিশেষায়িত চিকিৎসা, অপারেশন থিয়েটার এবং প্যাথলজি সুবিধা রয়েছে।',
  description_en = 'General and specialist treatment with operating theatre and in-house pathology.',
  address_bn = '39 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 39, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.89023110791428,
  lng = 89.1200521111779,
  category_group = 'healthcare',
  rating = 4.3,
  review_count = 96,
  photo_count = 4,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b002-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-07-03"},{"id":"b002-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-06-16"},{"id":"b002-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-05-30"},{"id":"b002-r3","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-05-13"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'arogya sadan hospital'
  and slug is null;

update public.listings set
  slug = 'padma-medical-centre',
  verified = true,
  featured = false,
  image_seed = 2,
  title_bn = 'পদ্মা মেডিকেল সেন্টার',
  title_en = 'Padma Medical Centre',
  description_bn = 'জরুরি বিভাগ, ইনডোর ও আউটডোর সেবা এবং অভিজ্ঞ চিকিৎসক নিয়ে ২৪ ঘণ্টা খোলা।',
  description_en = 'Round-the-clock emergency, indoor and outdoor care with experienced physicians on duty.',
  address_bn = '91 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 91, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.9097029983083,
  lng = 89.1295590338131,
  category_group = 'healthcare',
  rating = 4.1,
  review_count = 74,
  photo_count = 5,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b003-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-06-22"},{"id":"b003-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-06-05"},{"id":"b003-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-19"},{"id":"b003-r3","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-05-02"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'padma medical centre'
  and slug is null;

update public.listings set
  slug = 'kumarkhali-general-hospital',
  verified = true,
  featured = false,
  image_seed = 3,
  title_bn = 'কুমারখালী জেনারেল হাসপাতাল',
  title_en = 'Kumarkhali General Hospital',
  description_bn = 'সাধারণ ও বিশেষায়িত চিকিৎসা, অপারেশন থিয়েটার এবং প্যাথলজি সুবিধা রয়েছে।',
  description_en = 'General and specialist treatment with operating theatre and in-house pathology.',
  address_bn = '62 নং, হাসপাতাল মোড়, কুমারখালী',
  address_en = 'Holding 62, Hospital Mor, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.86623166089184,
  lng = 89.23403784540189,
  category_group = 'healthcare',
  rating = 4,
  review_count = 52,
  photo_count = 6,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b004-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-06-11"},{"id":"b004-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-25"},{"id":"b004-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-08"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kumarkhali general hospital'
  and slug is null;

update public.listings set
  slug = 'bheramara-health-complex',
  verified = false,
  featured = false,
  image_seed = 4,
  title_bn = 'ভেড়ামারা হেলথ কমপ্লেক্স',
  title_en = 'Bheramara Health Complex',
  description_bn = 'জরুরি বিভাগ, ইনডোর ও আউটডোর সেবা এবং অভিজ্ঞ চিকিৎসক নিয়ে ২৪ ঘণ্টা খোলা।',
  description_en = 'Round-the-clock emergency, indoor and outdoor care with experienced physicians on duty.',
  address_bn = '7 নং, স্টেশন বাজার, ভেড়ামারা',
  address_en = 'Holding 7, Station Bazar, Bheramara',
  area_id = 'bheramara',
  lat = 24.032098079202143,
  lng = 88.993609233532,
  category_group = 'healthcare',
  rating = 3.8,
  review_count = 41,
  photo_count = 3,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b005-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-31"},{"id":"b005-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-05-14"},{"id":"b005-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-04-27"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'bheramara health complex'
  and slug is null;

update public.listings set
  slug = 'mirpur-sheba-hospital',
  verified = true,
  featured = false,
  image_seed = 5,
  title_bn = 'মিরপুর সেবা হাসপাতাল',
  title_en = 'Mirpur Sheba Hospital',
  description_bn = 'সাধারণ ও বিশেষায়িত চিকিৎসা, অপারেশন থিয়েটার এবং প্যাথলজি সুবিধা রয়েছে।',
  description_en = 'General and specialist treatment with operating theatre and in-house pathology.',
  address_bn = '13 নং, কলেজ পাড়া, মিরপুর',
  address_en = 'Holding 13, College Para, Mirpur',
  area_id = 'mirpur',
  lat = 23.95174667457558,
  lng = 89.02810927539487,
  category_group = 'healthcare',
  rating = 4.2,
  review_count = 63,
  photo_count = 4,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency department"},{"bn":"ভর্তি ও কেবিন","en":"Admission & cabins"},{"bn":"অপারেশন থিয়েটার","en":"Operating theatre"},{"bn":"প্যাথলজি","en":"Pathology lab"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  reviews = '[{"id":"b006-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-05-20"},{"id":"b006-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-03"},{"id":"b006-r2","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-04-16"},{"id":"b006-r3","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-03-30"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'mirpur sheba hospital'
  and slug is null;

update public.listings set
  slug = 'shefa-clinic',
  verified = true,
  featured = false,
  image_seed = 6,
  title_bn = 'শেফা ক্লিনিক',
  title_en = 'Shefa Clinic',
  description_bn = 'সাধারণ চিকিৎসা, ছোট অপারেশন ও নিয়মিত স্বাস্থ্য পরীক্ষার জন্য স্থানীয় ক্লিনিক।',
  description_en = 'Neighbourhood clinic for general treatment, minor procedures and routine check-ups.',
  address_bn = '80 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 80, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.91479450222252,
  lng = 89.12489361773491,
  category_group = 'healthcare',
  rating = 4.4,
  review_count = 58,
  photo_count = 5,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"সাধারণ চিকিৎসা","en":"General consultation"},{"bn":"ড্রেসিং ও সেলাই","en":"Dressing & stitches"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"স্বাস্থ্য পরীক্ষা","en":"Health check-up"}]'::jsonb,
  reviews = '[{"id":"b007-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-05-09"},{"id":"b007-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-04-22"},{"id":"b007-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-04-05"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'shefa clinic'
  and slug is null;

update public.listings set
  slug = 'ma-o-shishu-clinic',
  verified = true,
  featured = true,
  image_seed = 7,
  title_bn = 'মা ও শিশু ক্লিনিক',
  title_en = 'Ma O Shishu Clinic',
  description_bn = 'মা ও শিশু স্বাস্থ্যসেবায় বিশেষ গুরুত্ব দিয়ে পরিচালিত ক্লিনিক।',
  description_en = 'Clinic with a particular focus on maternal and child health services.',
  address_bn = '37 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 37, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.912999939825397,
  lng = 89.12801052157664,
  category_group = 'healthcare',
  rating = 4.5,
  review_count = 87,
  photo_count = 6,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"সাধারণ চিকিৎসা","en":"General consultation"},{"bn":"ড্রেসিং ও সেলাই","en":"Dressing & stitches"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"স্বাস্থ্য পরীক্ষা","en":"Health check-up"}]'::jsonb,
  reviews = '[{"id":"b008-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-04-28"},{"id":"b008-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-04-11"},{"id":"b008-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-03-25"},{"id":"b008-r3","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-03-08"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'ma o shishu clinic'
  and slug is null;

update public.listings set
  slug = 'janasheba-clinic',
  verified = false,
  featured = false,
  image_seed = 8,
  title_bn = 'জনসেবা ক্লিনিক',
  title_en = 'Janasheba Clinic',
  description_bn = 'সাধারণ চিকিৎসা, ছোট অপারেশন ও নিয়মিত স্বাস্থ্য পরীক্ষার জন্য স্থানীয় ক্লিনিক।',
  description_en = 'Neighbourhood clinic for general treatment, minor procedures and routine check-ups.',
  address_bn = '51 নং, কলেজ রোড, কুমারখালী',
  address_en = 'Holding 51, College Road, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.871624663186925,
  lng = 89.22954109280822,
  category_group = 'healthcare',
  rating = 3.9,
  review_count = 33,
  photo_count = 3,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"সাধারণ চিকিৎসা","en":"General consultation"},{"bn":"ড্রেসিং ও সেলাই","en":"Dressing & stitches"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"স্বাস্থ্য পরীক্ষা","en":"Health check-up"}]'::jsonb,
  reviews = '[{"id":"b009-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-04-17"},{"id":"b009-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-31"},{"id":"b009-r2","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-03-14"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'janasheba clinic'
  and slug is null;

update public.listings set
  slug = 'nabajibon-clinic',
  verified = false,
  featured = false,
  image_seed = 9,
  title_bn = 'নবজীবন ক্লিনিক',
  title_en = 'Nabajibon Clinic',
  description_bn = 'মা ও শিশু স্বাস্থ্যসেবায় বিশেষ গুরুত্ব দিয়ে পরিচালিত ক্লিনিক।',
  description_en = 'Clinic with a particular focus on maternal and child health services.',
  address_bn = '75 নং, তারাগুনিয়া বাজার, দৌলতপুর',
  address_en = 'Holding 75, Taragunia Bazar, Daulatpur',
  area_id = 'daulatpur',
  lat = 24.07926537518665,
  lng = 88.90935610687849,
  category_group = 'healthcare',
  rating = 4,
  review_count = 27,
  photo_count = 4,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"সাধারণ চিকিৎসা","en":"General consultation"},{"bn":"ড্রেসিং ও সেলাই","en":"Dressing & stitches"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"স্বাস্থ্য পরীক্ষা","en":"Health check-up"}]'::jsonb,
  reviews = '[{"id":"b010-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-04-06"},{"id":"b010-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-03-20"},{"id":"b010-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-03"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'nabajibon clinic'
  and slug is null;

update public.listings set
  slug = 'susthota-clinic',
  verified = false,
  featured = false,
  image_seed = 10,
  title_bn = 'সুস্থতা ক্লিনিক',
  title_en = 'Susthota Clinic',
  description_bn = 'সাধারণ চিকিৎসা, ছোট অপারেশন ও নিয়মিত স্বাস্থ্য পরীক্ষার জন্য স্থানীয় ক্লিনিক।',
  description_en = 'Neighbourhood clinic for general treatment, minor procedures and routine check-ups.',
  address_bn = '58 নং, জানিপুর রোড, খোকসা',
  address_en = 'Holding 58, Janipur Road, Khoksa',
  area_id = 'khoksa',
  lat = 23.79029093237451,
  lng = 89.2532579702696,
  category_group = 'healthcare',
  rating = 3.7,
  review_count = 19,
  photo_count = 5,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"সাধারণ চিকিৎসা","en":"General consultation"},{"bn":"ড্রেসিং ও সেলাই","en":"Dressing & stitches"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"স্বাস্থ্য পরীক্ষা","en":"Health check-up"}]'::jsonb,
  reviews = '[{"id":"b011-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-03-26"},{"id":"b011-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-03-09"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'susthota clinic'
  and slug is null;

update public.listings set
  slug = 'dr-anisur-rahman-chamber',
  verified = true,
  featured = true,
  image_seed = 11,
  title_bn = 'ডাঃ আনিসুর রহমান চেম্বার',
  title_en = 'Dr. Anisur Rahman Chamber',
  description_bn = 'নিয়মিত রোগী দেখা হয় সন্ধ্যায়, আগাম সময় নেওয়া যায়।',
  description_en = 'Regular evening consulting hours with advance appointments available.',
  address_bn = '42 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 42, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.905486880961483,
  lng = 89.13179722323935,
  category_group = 'healthcare',
  rating = 4.8,
  review_count = 142,
  photo_count = 6,
  hours = '[[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b012-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-15"},{"id":"b012-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-02-26"},{"id":"b012-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-02-09"},{"id":"b012-r3","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-01-23"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. anisur rahman chamber'
  and slug is null;

update public.listings set
  slug = 'dr-sharmin-sultana-chamber',
  verified = true,
  featured = true,
  image_seed = 12,
  title_bn = 'ডাঃ শারমিন সুলতানা চেম্বার',
  title_en = 'Dr. Sharmin Sultana Chamber',
  description_bn = 'অভিজ্ঞ চিকিৎসকের ব্যক্তিগত চেম্বার, সিরিয়ালের জন্য আগে ফোন করুন।',
  description_en = 'Private chamber of an experienced consultant. Call ahead for a serial number.',
  address_bn = '120 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 120, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.89305994309099,
  lng = 89.1193608986051,
  category_group = 'healthcare',
  website = 'https://example.com/dr-sharmin-sultana-chamber',
  rating = 4.7,
  review_count = 118,
  photo_count = 3,
  hours = '[[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b013-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-03-04"},{"id":"b013-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-02-15"},{"id":"b013-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-01-29"},{"id":"b013-r3","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-01-12"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. sharmin sultana chamber'
  and slug is null;

update public.listings set
  slug = 'dr-kamrul-hasan-chamber',
  verified = true,
  featured = false,
  image_seed = 13,
  title_bn = 'ডাঃ কামরুল হাসান চেম্বার',
  title_en = 'Dr. Kamrul Hasan Chamber',
  description_bn = 'নিয়মিত রোগী দেখা হয় সন্ধ্যায়, আগাম সময় নেওয়া যায়।',
  description_en = 'Regular evening consulting hours with advance appointments available.',
  address_bn = '105 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 105, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.913502163326466,
  lng = 89.12931360647748,
  category_group = 'healthcare',
  rating = 4.4,
  review_count = 76,
  photo_count = 4,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b014-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-02-21"},{"id":"b014-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-02-04"},{"id":"b014-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-01-18"},{"id":"b014-r3","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-01-01"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. kamrul hasan chamber'
  and slug is null;

update public.listings set
  slug = 'dr-nazma-parveen-chamber',
  verified = false,
  featured = false,
  image_seed = 14,
  title_bn = 'ডাঃ নাজমা পারভীন চেম্বার',
  title_en = 'Dr. Nazma Parveen Chamber',
  description_bn = 'অভিজ্ঞ চিকিৎসকের ব্যক্তিগত চেম্বার, সিরিয়ালের জন্য আগে ফোন করুন।',
  description_en = 'Private chamber of an experienced consultant. Call ahead for a serial number.',
  address_bn = '1 নং, স্টেশন রোড, কুমারখালী',
  address_en = 'Holding 1, Station Road, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.85197845819717,
  lng = 89.21694956570012,
  category_group = 'healthcare',
  rating = 4.2,
  review_count = 44,
  photo_count = 5,
  hours = '[[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b015-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-02-10"},{"id":"b015-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-01-24"},{"id":"b015-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-01-07"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. nazma parveen chamber'
  and slug is null;

update public.listings set
  slug = 'dr-mahbub-alam-chamber',
  verified = true,
  featured = true,
  image_seed = 15,
  title_bn = 'ডাঃ মাহবুব আলম চেম্বার',
  title_en = 'Dr. Mahbub Alam Chamber',
  description_bn = 'নিয়মিত রোগী দেখা হয় সন্ধ্যায়, আগাম সময় নেওয়া যায়।',
  description_en = 'Regular evening consulting hours with advance appointments available.',
  address_bn = '70 নং, নতুন বাজার, ভেড়ামারা',
  address_en = 'Holding 70, Notun Bazar, Bheramara',
  area_id = 'bheramara',
  lat = 24.03354983538934,
  lng = 88.9767992375691,
  category_group = 'healthcare',
  rating = 4.5,
  review_count = 61,
  photo_count = 6,
  hours = '[[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}],[{"open":960,"close":1380}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b016-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-01-30"},{"id":"b016-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-01-13"},{"id":"b016-r2","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2025-12-27"},{"id":"b016-r3","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2025-12-10"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. mahbub alam chamber'
  and slug is null;

update public.listings set
  slug = 'dr-rubina-yasmin-chamber',
  verified = false,
  featured = false,
  image_seed = 16,
  title_bn = 'ডাঃ রুবিনা ইয়াসমিন চেম্বার',
  title_en = 'Dr. Rubina Yasmin Chamber',
  description_bn = 'অভিজ্ঞ চিকিৎসকের ব্যক্তিগত চেম্বার, সিরিয়ালের জন্য আগে ফোন করুন।',
  description_en = 'Private chamber of an experienced consultant. Call ahead for a serial number.',
  address_bn = '87 নং, পুরাতন বাজার, মিরপুর',
  address_en = 'Holding 87, Purano Bazar, Mirpur',
  area_id = 'mirpur',
  lat = 23.940852819708468,
  lng = 89.02061410009284,
  category_group = 'healthcare',
  rating = 4.1,
  review_count = 29,
  photo_count = 3,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রোগী দেখা","en":"Consultation"},{"bn":"ফলো-আপ","en":"Follow-up visit"},{"bn":"রিপোর্ট দেখা","en":"Report review"}]'::jsonb,
  reviews = '[{"id":"b017-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-01-19"},{"id":"b017-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-01-02"},{"id":"b017-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2025-12-16"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. rubina yasmin chamber'
  and slug is null;

update public.listings set
  slug = 'kushtia-blood-bank',
  verified = true,
  featured = true,
  image_seed = 17,
  title_bn = 'কুষ্টিয়া ব্লাড ব্যাংক',
  title_en = 'Kushtia Blood Bank',
  description_bn = 'জরুরি প্রয়োজনে রক্ত সংগ্রহ ও ক্রস-ম্যাচিং সুবিধা।',
  description_en = 'Emergency blood collection with on-site cross-matching.',
  address_bn = '12 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 12, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.889184726905345,
  lng = 89.10628614813487,
  category_group = 'healthcare',
  rating = 4.9,
  review_count = 203,
  photo_count = 4,
  always_open = true,
  services = '[{"bn":"রক্ত সরবরাহ","en":"Blood supply"},{"bn":"রক্তদাতা খোঁজা","en":"Donor matching"},{"bn":"ক্রস-ম্যাচিং","en":"Cross-matching"},{"bn":"রক্তের গ্রুপ পরীক্ষা","en":"Blood grouping"}]'::jsonb,
  reviews = '[{"id":"b018-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-01-08"},{"id":"b018-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2025-12-22"},{"id":"b018-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-07-13"},{"id":"b018-r3","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-06-26"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia blood bank'
  and slug is null;

update public.listings set
  slug = 'sandhani-blood-centre',
  verified = true,
  featured = true,
  image_seed = 18,
  title_bn = 'সন্ধানী ব্লাড সেন্টার',
  title_en = 'Sandhani Blood Centre',
  description_bn = 'সব গ্রুপের রক্ত সরবরাহ ও স্বেচ্ছায় রক্তদাতাদের তালিকা রক্ষণাবেক্ষণ করা হয়।',
  description_en = 'Supplies all blood groups and maintains a register of voluntary donors.',
  address_bn = '75 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 75, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.913766112828522,
  lng = 89.12153999925604,
  category_group = 'healthcare',
  rating = 4.7,
  review_count = 156,
  photo_count = 5,
  always_open = true,
  services = '[{"bn":"রক্ত সরবরাহ","en":"Blood supply"},{"bn":"রক্তদাতা খোঁজা","en":"Donor matching"},{"bn":"ক্রস-ম্যাচিং","en":"Cross-matching"},{"bn":"রক্তের গ্রুপ পরীক্ষা","en":"Blood grouping"}]'::jsonb,
  reviews = '[{"id":"b019-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2025-12-28"},{"id":"b019-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2025-12-11"},{"id":"b019-r2","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-07-02"},{"id":"b019-r3","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-06-15"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'sandhani blood centre'
  and slug is null;

update public.listings set
  slug = 'badhon-blood-donation-centre',
  verified = true,
  featured = true,
  image_seed = 19,
  title_bn = 'বাঁধন রক্তদান কেন্দ্র',
  title_en = 'Badhon Blood Donation Centre',
  description_bn = 'জরুরি প্রয়োজনে রক্ত সংগ্রহ ও ক্রস-ম্যাচিং সুবিধা।',
  description_en = 'Emergency blood collection with on-site cross-matching.',
  address_bn = '78 নং, হাসপাতাল মোড়, কুমারখালী',
  address_en = 'Holding 78, Hospital Mor, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.854174576562563,
  lng = 89.24118180464316,
  category_group = 'healthcare',
  rating = 4.6,
  review_count = 88,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্ত সরবরাহ","en":"Blood supply"},{"bn":"রক্তদাতা খোঁজা","en":"Donor matching"},{"bn":"ক্রস-ম্যাচিং","en":"Cross-matching"},{"bn":"রক্তের গ্রুপ পরীক্ষা","en":"Blood grouping"}]'::jsonb,
  reviews = '[{"id":"b020-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2025-12-17"},{"id":"b020-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-07-08"},{"id":"b020-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-06-21"},{"id":"b020-r3","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-06-04"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'badhon blood donation centre'
  and slug is null;

update public.listings set
  slug = 'life-care-pharmacy',
  verified = true,
  featured = true,
  image_seed = 20,
  title_bn = 'লাইফ কেয়ার ফার্মেসি',
  title_en = 'Life Care Pharmacy',
  description_bn = 'সব ধরনের ওষুধ, স্বাস্থ্য সামগ্রী ও শিশুখাদ্য পাওয়া যায়।',
  description_en = 'Stocks a full range of medicines, health supplies and baby food.',
  address_bn = '114 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 114, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.907688868886744,
  lng = 89.11954122275407,
  category_group = 'healthcare',
  website = 'https://example.com/life-care-pharmacy',
  rating = 4.5,
  review_count = 92,
  photo_count = 3,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b021-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-07-14"},{"id":"b021-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-06-27"},{"id":"b021-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-06-10"},{"id":"b021-r3","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-24"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'life care pharmacy'
  and slug is null;

update public.listings set
  slug = 'janani-pharmacy',
  verified = true,
  featured = false,
  image_seed = 21,
  title_bn = 'জননী ফার্মেসি',
  title_en = 'Janani Pharmacy',
  description_bn = 'রেজিস্টার্ড ফার্মাসিস্টের তত্ত্বাবধানে পরিচালিত ওষুধের দোকান।',
  description_en = 'Dispensary operating under a registered pharmacist.',
  address_bn = '93 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 93, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.890291561516783,
  lng = 89.13146794781612,
  category_group = 'healthcare',
  rating = 4.3,
  review_count = 67,
  photo_count = 4,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b022-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-07-03"},{"id":"b022-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-06-16"},{"id":"b022-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-05-30"},{"id":"b022-r3","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-13"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'janani pharmacy'
  and slug is null;

update public.listings set
  slug = 'health-plus-pharmacy',
  verified = false,
  featured = false,
  image_seed = 22,
  title_bn = 'হেলথ প্লাস ফার্মেসি',
  title_en = 'Health Plus Pharmacy',
  description_bn = 'সব ধরনের ওষুধ, স্বাস্থ্য সামগ্রী ও শিশুখাদ্য পাওয়া যায়।',
  description_en = 'Stocks a full range of medicines, health supplies and baby food.',
  address_bn = '106 নং, হাউজিং এলাকা, কুষ্টিয়া সদর',
  address_en = 'Holding 106, Housing Estate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.898317638068676,
  lng = 89.1160061188735,
  category_group = 'healthcare',
  rating = 4,
  review_count = 38,
  photo_count = 5,
  always_open = true,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b023-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-06-22"},{"id":"b023-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-06-05"},{"id":"b023-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-19"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'health plus pharmacy'
  and slug is null;

update public.listings set
  slug = 'new-medicine-corner',
  verified = false,
  featured = false,
  image_seed = 23,
  title_bn = 'নিউ মেডিসিন কর্নার',
  title_en = 'New Medicine Corner',
  description_bn = 'রেজিস্টার্ড ফার্মাসিস্টের তত্ত্বাবধানে পরিচালিত ওষুধের দোকান।',
  description_en = 'Dispensary operating under a registered pharmacist.',
  address_bn = '104 নং, হাসপাতাল মোড়, কুমারখালী',
  address_en = 'Holding 104, Hospital Mor, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.872424459928467,
  lng = 89.23267872295794,
  category_group = 'healthcare',
  rating = 3.9,
  review_count = 24,
  photo_count = 6,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b024-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-06-11"},{"id":"b024-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-05-25"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'new medicine corner'
  and slug is null;

update public.listings set
  slug = 'bheramara-oushadhaloy',
  verified = true,
  featured = false,
  image_seed = 24,
  title_bn = 'ভেড়ামারা ঔষধালয়',
  title_en = 'Bheramara Oushadhaloy',
  description_bn = 'সব ধরনের ওষুধ, স্বাস্থ্য সামগ্রী ও শিশুখাদ্য পাওয়া যায়।',
  description_en = 'Stocks a full range of medicines, health supplies and baby food.',
  address_bn = '42 নং, স্টেশন বাজার, ভেড়ামারা',
  address_en = 'Holding 42, Station Bazar, Bheramara',
  area_id = 'bheramara',
  lat = 24.016675279872736,
  lng = 88.99002839722276,
  category_group = 'healthcare',
  website = 'https://example.com/bheramara-oushadhaloy',
  rating = 4.2,
  review_count = 45,
  photo_count = 3,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b025-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-31"},{"id":"b025-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-05-14"},{"id":"b025-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-04-27"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'bheramara oushadhaloy'
  and slug is null;

update public.listings set
  slug = 'mirpur-pharma',
  verified = false,
  featured = false,
  image_seed = 25,
  title_bn = 'মিরপুর ফার্মা',
  title_en = 'Mirpur Pharma',
  description_bn = 'রেজিস্টার্ড ফার্মাসিস্টের তত্ত্বাবধানে পরিচালিত ওষুধের দোকান।',
  description_en = 'Dispensary operating under a registered pharmacist.',
  address_bn = '114 নং, পুরাতন বাজার, মিরপুর',
  address_en = 'Holding 114, Purano Bazar, Mirpur',
  area_id = 'mirpur',
  lat = 23.950917452396535,
  lng = 89.01133455606241,
  category_group = 'healthcare',
  rating = 3.8,
  review_count = 21,
  photo_count = 4,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Prescription medicine"},{"bn":"ব্লাড প্রেশার মাপা","en":"Blood pressure check"},{"bn":"ডায়াবেটিস পরীক্ষা","en":"Diabetes test"},{"bn":"হোম ডেলিভারি","en":"Home delivery"}]'::jsonb,
  reviews = '[{"id":"b026-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-20"},{"id":"b026-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-03"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'mirpur pharma'
  and slug is null;

update public.listings set
  slug = 'popular-diagnostic-centre',
  verified = true,
  featured = false,
  image_seed = 26,
  title_bn = 'পপুলার ডায়াগনস্টিক সেন্টার',
  title_en = 'Popular Diagnostic Centre',
  description_bn = 'প্যাথলজি, এক্স-রে, আল্ট্রাসনোগ্রাম ও ইসিজি সুবিধা এক ছাদের নিচে।',
  description_en = 'Pathology, X-ray, ultrasound and ECG facilities under one roof.',
  address_bn = '107 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 107, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.90363942819195,
  lng = 89.10790100816884,
  category_group = 'healthcare',
  rating = 4.4,
  review_count = 111,
  photo_count = 5,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্ত পরীক্ষা","en":"Blood tests"},{"bn":"এক্স-রে","en":"X-ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasonogram"},{"bn":"ইসিজি","en":"ECG"}]'::jsonb,
  reviews = '[{"id":"b027-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-09"},{"id":"b027-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-04-22"},{"id":"b027-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-04-05"},{"id":"b027-r3","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-19"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'popular diagnostic centre'
  and slug is null;

update public.listings set
  slug = 'lab-aid-diagnostic',
  verified = true,
  featured = false,
  image_seed = 27,
  title_bn = 'ল্যাব এইড ডায়াগনস্টিক',
  title_en = 'Lab Aid Diagnostic',
  description_bn = 'আধুনিক যন্ত্রপাতিতে দ্রুত ও নির্ভুল রিপোর্ট প্রদান করা হয়।',
  description_en = 'Modern equipment delivering fast, accurate reports.',
  address_bn = '79 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 79, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.901015652143176,
  lng = 89.13077968403547,
  category_group = 'healthcare',
  rating = 4.3,
  review_count = 89,
  photo_count = 6,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্ত পরীক্ষা","en":"Blood tests"},{"bn":"এক্স-রে","en":"X-ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasonogram"},{"bn":"ইসিজি","en":"ECG"}]'::jsonb,
  reviews = '[{"id":"b028-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-04-28"},{"id":"b028-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-04-11"},{"id":"b028-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-03-25"},{"id":"b028-r3","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-03-08"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'lab aid diagnostic'
  and slug is null;

update public.listings set
  slug = 'modern-pathology',
  verified = false,
  featured = false,
  image_seed = 28,
  title_bn = 'মডার্ন প্যাথলজি',
  title_en = 'Modern Pathology',
  description_bn = 'প্যাথলজি, এক্স-রে, আল্ট্রাসনোগ্রাম ও ইসিজি সুবিধা এক ছাদের নিচে।',
  description_en = 'Pathology, X-ray, ultrasound and ECG facilities under one roof.',
  address_bn = '36 নং, কলেজ রোড, কুমারখালী',
  address_en = 'Holding 36, College Road, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.85011434968416,
  lng = 89.22281818601614,
  category_group = 'healthcare',
  rating = 4,
  review_count = 36,
  photo_count = 3,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্ত পরীক্ষা","en":"Blood tests"},{"bn":"এক্স-রে","en":"X-ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasonogram"},{"bn":"ইসিজি","en":"ECG"}]'::jsonb,
  reviews = '[{"id":"b029-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-04-17"},{"id":"b029-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-31"},{"id":"b029-r2","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-03-14"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'modern pathology'
  and slug is null;

update public.listings set
  slug = 'trust-diagnostic',
  verified = false,
  featured = false,
  image_seed = 29,
  title_bn = 'ট্রাস্ট ডায়াগনস্টিক',
  title_en = 'Trust Diagnostic',
  description_bn = 'আধুনিক যন্ত্রপাতিতে দ্রুত ও নির্ভুল রিপোর্ট প্রদান করা হয়।',
  description_en = 'Modern equipment delivering fast, accurate reports.',
  address_bn = '42 নং, ফারাক্কা রোড, ভেড়ামারা',
  address_en = 'Holding 42, Farakka Road, Bheramara',
  area_id = 'bheramara',
  lat = 24.011894764056674,
  lng = 88.98697751935549,
  category_group = 'healthcare',
  rating = 3.9,
  review_count = 28,
  photo_count = 4,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্ত পরীক্ষা","en":"Blood tests"},{"bn":"এক্স-রে","en":"X-ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasonogram"},{"bn":"ইসিজি","en":"ECG"}]'::jsonb,
  reviews = '[{"id":"b030-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-04-06"},{"id":"b030-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-03-20"},{"id":"b030-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-03"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'trust diagnostic'
  and slug is null;

update public.listings set
  slug = 'kushtia-ambulance-service',
  verified = true,
  featured = true,
  image_seed = 30,
  title_bn = 'কুষ্টিয়া অ্যাম্বুলেন্স সার্ভিস',
  title_en = 'Kushtia Ambulance Service',
  description_bn = 'অক্সিজেন ও প্রাথমিক চিকিৎসা সরঞ্জামসহ ২৪ ঘণ্টা অ্যাম্বুলেন্স সেবা।',
  description_en = '24-hour ambulance service with oxygen and basic life-support equipment.',
  address_bn = '55 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 55, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.895444010572525,
  lng = 89.11738761682437,
  category_group = 'healthcare',
  rating = 4.7,
  review_count = 174,
  photo_count = 5,
  always_open = true,
  services = '[{"bn":"জরুরি পরিবহন","en":"Emergency transport"},{"bn":"অক্সিজেন সুবিধা","en":"Oxygen support"},{"bn":"দূরপাল্লার সেবা","en":"Long-distance transfer"},{"bn":"ফ্রিজিং ভ্যান","en":"Freezer van"}]'::jsonb,
  reviews = '[{"id":"b031-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-03-26"},{"id":"b031-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-03-09"},{"id":"b031-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-02-20"},{"id":"b031-r3","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-02-03"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia ambulance service'
  and slug is null;

update public.listings set
  slug = 'druto-ambulance',
  verified = true,
  featured = true,
  image_seed = 31,
  title_bn = 'দ্রুত অ্যাম্বুলেন্স',
  title_en = 'Druto Ambulance',
  description_bn = 'জেলার ভেতরে ও ঢাকাসহ দূরপাল্লার রোগী পরিবহন করা হয়।',
  description_en = 'Patient transport within the district and long distance including Dhaka.',
  address_bn = '110 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 110, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.905040052988607,
  lng = 89.13432026219894,
  category_group = 'healthcare',
  rating = 4.5,
  review_count = 121,
  photo_count = 6,
  always_open = true,
  services = '[{"bn":"জরুরি পরিবহন","en":"Emergency transport"},{"bn":"অক্সিজেন সুবিধা","en":"Oxygen support"},{"bn":"দূরপাল্লার সেবা","en":"Long-distance transfer"},{"bn":"ফ্রিজিং ভ্যান","en":"Freezer van"}]'::jsonb,
  reviews = '[{"id":"b032-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-15"},{"id":"b032-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-02-26"},{"id":"b032-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-02-09"},{"id":"b032-r3","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-01-23"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'druto ambulance'
  and slug is null;

update public.listings set
  slug = 'sheba-ambulance',
  verified = false,
  featured = false,
  image_seed = 32,
  title_bn = 'সেবা অ্যাম্বুলেন্স',
  title_en = 'Sheba Ambulance',
  description_bn = 'অক্সিজেন ও প্রাথমিক চিকিৎসা সরঞ্জামসহ ২৪ ঘণ্টা অ্যাম্বুলেন্স সেবা।',
  description_en = '24-hour ambulance service with oxygen and basic life-support equipment.',
  address_bn = '50 নং, কলেজ রোড, কুমারখালী',
  address_en = 'Holding 50, College Road, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.849716566237557,
  lng = 89.22812661634354,
  category_group = 'healthcare',
  rating = 4.2,
  review_count = 58,
  photo_count = 3,
  always_open = true,
  services = '[{"bn":"জরুরি পরিবহন","en":"Emergency transport"},{"bn":"অক্সিজেন সুবিধা","en":"Oxygen support"},{"bn":"দূরপাল্লার সেবা","en":"Long-distance transfer"},{"bn":"ফ্রিজিং ভ্যান","en":"Freezer van"}]'::jsonb,
  reviews = '[{"id":"b033-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-03-04"},{"id":"b033-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-02-15"},{"id":"b033-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-01-29"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'sheba ambulance'
  and slug is null;

update public.listings set
  slug = 'bhorosha-ambulance',
  verified = true,
  featured = false,
  image_seed = 33,
  title_bn = 'ভরসা অ্যাম্বুলেন্স',
  title_en = 'Bhorosha Ambulance',
  description_bn = 'জেলার ভেতরে ও ঢাকাসহ দূরপাল্লার রোগী পরিবহন করা হয়।',
  description_en = 'Patient transport within the district and long distance including Dhaka.',
  address_bn = '102 নং, বাসস্ট্যান্ড, মিরপুর',
  address_en = 'Holding 102, Bus Stand, Mirpur',
  area_id = 'mirpur',
  lat = 23.946080302541464,
  lng = 89.01970822994927,
  category_group = 'healthcare',
  rating = 4.4,
  review_count = 66,
  photo_count = 4,
  always_open = true,
  services = '[{"bn":"জরুরি পরিবহন","en":"Emergency transport"},{"bn":"অক্সিজেন সুবিধা","en":"Oxygen support"},{"bn":"দূরপাল্লার সেবা","en":"Long-distance transfer"},{"bn":"ফ্রিজিং ভ্যান","en":"Freezer van"}]'::jsonb,
  reviews = '[{"id":"b034-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-02-21"},{"id":"b034-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-02-04"},{"id":"b034-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-01-18"},{"id":"b034-r3","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-01-01"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'bhorosha ambulance'
  and slug is null;

update public.listings set
  slug = 'rahman-electric',
  verified = true,
  featured = true,
  image_seed = 34,
  title_bn = 'রহমান ইলেকট্রিক',
  title_en = 'Rahman Electric',
  description_bn = 'বাসাবাড়ি ও দোকানের ওয়্যারিং, ফ্যান, লাইট ও মিটারের কাজ করা হয়।',
  description_en = 'House and shop wiring, fans, lighting and meter work undertaken.',
  address_bn = '73 নং, হাউজিং এলাকা, কুষ্টিয়া সদর',
  address_en = 'Holding 73, Housing Estate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.90815527834759,
  lng = 89.12053739618203,
  category_group = 'services',
  rating = 4.6,
  review_count = 84,
  photo_count = 5,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘরের ওয়্যারিং","en":"House wiring"},{"bn":"ফ্যান ও লাইট","en":"Fan & light fitting"},{"bn":"মিটার সংযোগ","en":"Meter connection"},{"bn":"শর্ট সার্কিট মেরামত","en":"Short-circuit repair"}]'::jsonb,
  reviews = '[{"id":"b035-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-02-10"},{"id":"b035-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-01-24"},{"id":"b035-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-01-07"},{"id":"b035-r3","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2025-12-21"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'rahman electric'
  and slug is null;

update public.listings set
  slug = 'alo-electric-service',
  verified = true,
  featured = false,
  image_seed = 35,
  title_bn = 'আলো ইলেকট্রিক সার্ভিস',
  title_en = 'Alo Electric Service',
  description_bn = 'অভিজ্ঞ ইলেকট্রিশিয়ান, জরুরি ডাকে দ্রুত পৌঁছান।',
  description_en = 'Experienced electrician with fast response on urgent call-outs.',
  address_bn = '46 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 46, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.888373214838907,
  lng = 89.1240175568053,
  category_group = 'services',
  rating = 4.4,
  review_count = 62,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘরের ওয়্যারিং","en":"House wiring"},{"bn":"ফ্যান ও লাইট","en":"Fan & light fitting"},{"bn":"মিটার সংযোগ","en":"Meter connection"},{"bn":"শর্ট সার্কিট মেরামত","en":"Short-circuit repair"}]'::jsonb,
  reviews = '[{"id":"b036-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-01-30"},{"id":"b036-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-01-13"},{"id":"b036-r2","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2025-12-27"},{"id":"b036-r3","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2025-12-10"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'alo electric service'
  and slug is null;

update public.listings set
  slug = 'bijli-electric',
  verified = false,
  featured = false,
  image_seed = 36,
  title_bn = 'বিজলী ইলেকট্রিক',
  title_en = 'Bijli Electric',
  description_bn = 'বাসাবাড়ি ও দোকানের ওয়্যারিং, ফ্যান, লাইট ও মিটারের কাজ করা হয়।',
  description_en = 'House and shop wiring, fans, lighting and meter work undertaken.',
  address_bn = '19 নং, কলেজ রোড, কুমারখালী',
  address_en = 'Holding 19, College Road, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.876275246299826,
  lng = 89.21805624844231,
  category_group = 'services',
  rating = 4.1,
  review_count = 31,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘরের ওয়্যারিং","en":"House wiring"},{"bn":"ফ্যান ও লাইট","en":"Fan & light fitting"},{"bn":"মিটার সংযোগ","en":"Meter connection"},{"bn":"শর্ট সার্কিট মেরামত","en":"Short-circuit repair"}]'::jsonb,
  reviews = '[{"id":"b037-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-01-19"},{"id":"b037-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-01-02"},{"id":"b037-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2025-12-16"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'bijli electric'
  and slug is null;

update public.listings set
  slug = 'new-power-electric',
  verified = false,
  featured = false,
  image_seed = 37,
  title_bn = 'নিউ পাওয়ার ইলেকট্রিক',
  title_en = 'New Power Electric',
  description_bn = 'অভিজ্ঞ ইলেকট্রিশিয়ান, জরুরি ডাকে দ্রুত পৌঁছান।',
  description_en = 'Experienced electrician with fast response on urgent call-outs.',
  address_bn = '5 নং, ফারাক্কা রোড, ভেড়ামারা',
  address_en = 'Holding 5, Farakka Road, Bheramara',
  area_id = 'bheramara',
  lat = 24.011736623701594,
  lng = 88.97942651843233,
  category_group = 'services',
  rating = 3.9,
  review_count = 22,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘরের ওয়্যারিং","en":"House wiring"},{"bn":"ফ্যান ও লাইট","en":"Fan & light fitting"},{"bn":"মিটার সংযোগ","en":"Meter connection"},{"bn":"শর্ট সার্কিট মেরামত","en":"Short-circuit repair"}]'::jsonb,
  reviews = '[{"id":"b038-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-01-08"},{"id":"b038-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2025-12-22"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'new power electric'
  and slug is null;

update public.listings set
  slug = 'shahin-electric-works',
  verified = true,
  featured = false,
  image_seed = 38,
  title_bn = 'শাহীন ইলেকট্রিক ওয়ার্কস',
  title_en = 'Shahin Electric Works',
  description_bn = 'বাসাবাড়ি ও দোকানের ওয়্যারিং, ফ্যান, লাইট ও মিটারের কাজ করা হয়।',
  description_en = 'House and shop wiring, fans, lighting and meter work undertaken.',
  address_bn = '115 নং, কলেজ পাড়া, মিরপুর',
  address_en = 'Holding 115, College Para, Mirpur',
  area_id = 'mirpur',
  lat = 23.9445879818291,
  lng = 89.01091317484114,
  category_group = 'services',
  rating = 4.3,
  review_count = 40,
  photo_count = 5,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘরের ওয়্যারিং","en":"House wiring"},{"bn":"ফ্যান ও লাইট","en":"Fan & light fitting"},{"bn":"মিটার সংযোগ","en":"Meter connection"},{"bn":"শর্ট সার্কিট মেরামত","en":"Short-circuit repair"}]'::jsonb,
  reviews = '[{"id":"b039-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2025-12-28"},{"id":"b039-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2025-12-11"},{"id":"b039-r2","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-07-02"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'shahin electric works'
  and slug is null;

update public.listings set
  slug = 'karim-plumbing-service',
  verified = true,
  featured = true,
  image_seed = 39,
  title_bn = 'করিম প্লাম্বিং সার্ভিস',
  title_en = 'Karim Plumbing Service',
  description_bn = 'নতুন সংযোগ ও পুরনো পাইপ বদলানোর কাজে অভিজ্ঞ।',
  description_en = 'Experienced in new connections and replacing old pipework.',
  address_bn = '70 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 70, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.91209098508031,
  lng = 89.12086653741137,
  category_group = 'services',
  rating = 4.5,
  review_count = 71,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাইপ লিক মেরামত","en":"Leak repair"},{"bn":"বাথরুম ফিটিংস","en":"Bathroom fittings"},{"bn":"পানির ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"মোটর সংযোগ","en":"Pump installation"}]'::jsonb,
  reviews = '[{"id":"b040-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2025-12-17"},{"id":"b040-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-07-08"},{"id":"b040-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-06-21"},{"id":"b040-r3","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-06-04"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'karim plumbing service'
  and slug is null;

update public.listings set
  slug = 'pani-sheba-plumber',
  verified = false,
  featured = false,
  image_seed = 40,
  title_bn = 'পানি সেবা প্লাম্বার',
  title_en = 'Pani Sheba Plumber',
  description_bn = 'পানির লাইন, ট্যাংক, বাথরুম ফিটিংস ও লিক মেরামতের কাজ করা হয়।',
  description_en = 'Water lines, tanks, bathroom fittings and leak repairs.',
  address_bn = '39 নং, হাউজিং এলাকা, কুষ্টিয়া সদর',
  address_en = 'Holding 39, Housing Estate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.890927781916815,
  lng = 89.11588412605403,
  category_group = 'services',
  rating = 4,
  review_count = 34,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাইপ লিক মেরামত","en":"Leak repair"},{"bn":"বাথরুম ফিটিংস","en":"Bathroom fittings"},{"bn":"পানির ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"মোটর সংযোগ","en":"Pump installation"}]'::jsonb,
  reviews = '[{"id":"b041-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-07-14"},{"id":"b041-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-06-27"},{"id":"b041-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-06-10"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'pani sheba plumber'
  and slug is null;

update public.listings set
  slug = 'mistri-ghor-plumbing',
  verified = false,
  featured = false,
  image_seed = 41,
  title_bn = 'মিস্ত্রি ঘর প্লাম্বিং',
  title_en = 'Mistri Ghor Plumbing',
  description_bn = 'নতুন সংযোগ ও পুরনো পাইপ বদলানোর কাজে অভিজ্ঞ।',
  description_en = 'Experienced in new connections and replacing old pipework.',
  address_bn = '54 নং, বাজার পাড়া, কুমারখালী',
  address_en = 'Holding 54, Bazar Para, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.86437971969183,
  lng = 89.22919326359543,
  category_group = 'services',
  rating = 3.8,
  review_count = 18,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাইপ লিক মেরামত","en":"Leak repair"},{"bn":"বাথরুম ফিটিংস","en":"Bathroom fittings"},{"bn":"পানির ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"মোটর সংযোগ","en":"Pump installation"}]'::jsonb,
  reviews = '[{"id":"b042-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-07-03"},{"id":"b042-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-06-16"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'mistri ghor plumbing'
  and slug is null;

update public.listings set
  slug = 'bheramara-plumbing',
  verified = true,
  featured = false,
  image_seed = 42,
  title_bn = 'ভেড়ামারা প্লাম্বিং',
  title_en = 'Bheramara Plumbing',
  description_bn = 'পানির লাইন, ট্যাংক, বাথরুম ফিটিংস ও লিক মেরামতের কাজ করা হয়।',
  description_en = 'Water lines, tanks, bathroom fittings and leak repairs.',
  address_bn = '33 নং, উপজেলা মোড়, ভেড়ামারা',
  address_en = 'Holding 33, Upazila Mor, Bheramara',
  area_id = 'bheramara',
  lat = 24.01845169246,
  lng = 88.99199693785748,
  category_group = 'services',
  rating = 4.2,
  review_count = 26,
  photo_count = 5,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাইপ লিক মেরামত","en":"Leak repair"},{"bn":"বাথরুম ফিটিংস","en":"Bathroom fittings"},{"bn":"পানির ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"মোটর সংযোগ","en":"Pump installation"}]'::jsonb,
  reviews = '[{"id":"b043-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-06-22"},{"id":"b043-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-06-05"},{"id":"b043-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-19"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'bheramara plumbing'
  and slug is null;

update public.listings set
  slug = 'haque-auto-garage',
  verified = true,
  featured = false,
  image_seed = 43,
  title_bn = 'হক অটো গ্যারেজ',
  title_en = 'Haque Auto Garage',
  description_bn = 'ইঞ্জিন, ব্রেক ও বৈদ্যুতিক সমস্যার সমাধান করা হয়।',
  description_en = 'Engine, brake and vehicle electrical faults resolved.',
  address_bn = '25 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 25, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.90284330985715,
  lng = 89.13377278751324,
  category_group = 'services',
  rating = 4.4,
  review_count = 58,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ইঞ্জিন সার্ভিসিং","en":"Engine servicing"},{"bn":"ব্রেক মেরামত","en":"Brake repair"},{"bn":"টায়ার বদল","en":"Tyre change"},{"bn":"ব্যাটারি","en":"Battery service"}]'::jsonb,
  reviews = '[{"id":"b044-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-06-11"},{"id":"b044-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-25"},{"id":"b044-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-08"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'haque auto garage'
  and slug is null;

update public.listings set
  slug = 'speed-motors',
  verified = false,
  featured = false,
  image_seed = 44,
  title_bn = 'স্পিড মোটরস',
  title_en = 'Speed Motors',
  description_bn = 'মোটরসাইকেল ও প্রাইভেট কারের সার্ভিসিং ও যন্ত্রাংশ মেরামত।',
  description_en = 'Servicing and parts repair for motorcycles and private cars.',
  address_bn = '114 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 114, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.900574188233218,
  lng = 89.10558769593216,
  category_group = 'services',
  rating = 4.1,
  review_count = 37,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ইঞ্জিন সার্ভিসিং","en":"Engine servicing"},{"bn":"ব্রেক মেরামত","en":"Brake repair"},{"bn":"টায়ার বদল","en":"Tyre change"},{"bn":"ব্যাটারি","en":"Battery service"}]'::jsonb,
  reviews = '[{"id":"b045-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-31"},{"id":"b045-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-05-14"},{"id":"b045-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-04-27"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'speed motors'
  and slug is null;

update public.listings set
  slug = 'bike-care-service',
  verified = true,
  featured = false,
  image_seed = 45,
  title_bn = 'বাইক কেয়ার সার্ভিস',
  title_en = 'Bike Care Service',
  description_bn = 'ইঞ্জিন, ব্রেক ও বৈদ্যুতিক সমস্যার সমাধান করা হয়।',
  description_en = 'Engine, brake and vehicle electrical faults resolved.',
  address_bn = '75 নং, বাজার পাড়া, কুমারখালী',
  address_en = 'Holding 75, Bazar Para, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.869015586376445,
  lng = 89.24175954713184,
  category_group = 'services',
  rating = 4.3,
  review_count = 44,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ইঞ্জিন সার্ভিসিং","en":"Engine servicing"},{"bn":"ব্রেক মেরামত","en":"Brake repair"},{"bn":"টায়ার বদল","en":"Tyre change"},{"bn":"ব্যাটারি","en":"Battery service"}]'::jsonb,
  reviews = '[{"id":"b046-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-05-20"},{"id":"b046-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-03"},{"id":"b046-r2","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-04-16"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'bike care service'
  and slug is null;

update public.listings set
  slug = 'mirpur-motor-workshop',
  verified = false,
  featured = false,
  image_seed = 46,
  title_bn = 'মিরপুর মোটর ওয়ার্কশপ',
  title_en = 'Mirpur Motor Workshop',
  description_bn = 'মোটরসাইকেল ও প্রাইভেট কারের সার্ভিসিং ও যন্ত্রাংশ মেরামত।',
  description_en = 'Servicing and parts repair for motorcycles and private cars.',
  address_bn = '117 নং, পুরাতন বাজার, মিরপুর',
  address_en = 'Holding 117, Purano Bazar, Mirpur',
  area_id = 'mirpur',
  lat = 23.953892185816045,
  lng = 89.00914023521128,
  category_group = 'services',
  rating = 3.9,
  review_count = 20,
  photo_count = 5,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ইঞ্জিন সার্ভিসিং","en":"Engine servicing"},{"bn":"ব্রেক মেরামত","en":"Brake repair"},{"bn":"টায়ার বদল","en":"Tyre change"},{"bn":"ব্যাটারি","en":"Battery service"}]'::jsonb,
  reviews = '[{"id":"b047-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-05-09"},{"id":"b047-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-04-22"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'mirpur motor workshop'
  and slug is null;

update public.listings set
  slug = 'cool-tech-ac-service',
  verified = true,
  featured = true,
  image_seed = 47,
  title_bn = 'কুল টেক এসি সার্ভিস',
  title_en = 'Cool Tech AC Service',
  description_bn = 'সব ব্র্যান্ডের এয়ার কন্ডিশনার মেরামতে অভিজ্ঞ টেকনিশিয়ান।',
  description_en = 'Technicians experienced with all major air-conditioner brands.',
  address_bn = '54 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 54, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.89997350310841,
  lng = 89.11213758588205,
  category_group = 'services',
  rating = 4.5,
  review_count = 49,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"এসি সার্ভিসিং","en":"AC servicing"},{"bn":"গ্যাস রিফিল","en":"Gas refill"},{"bn":"নতুন স্থাপন","en":"New installation"},{"bn":"কম্প্রেসর মেরামত","en":"Compressor repair"}]'::jsonb,
  reviews = '[{"id":"b048-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-04-28"},{"id":"b048-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-04-11"},{"id":"b048-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-03-25"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'cool tech ac service'
  and slug is null;

update public.listings set
  slug = 'shital-ac-care',
  verified = false,
  featured = false,
  image_seed = 48,
  title_bn = 'শীতল এসি কেয়ার',
  title_en = 'Shital AC Care',
  description_bn = 'এসি সার্ভিসিং, গ্যাস রিফিল ও নতুন এসি স্থাপন করা হয়।',
  description_en = 'AC servicing, gas refill and new unit installation.',
  address_bn = '18 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 18, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.89346054852704,
  lng = 89.104907580302,
  category_group = 'services',
  rating = 4,
  review_count = 25,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"এসি সার্ভিসিং","en":"AC servicing"},{"bn":"গ্যাস রিফিল","en":"Gas refill"},{"bn":"নতুন স্থাপন","en":"New installation"},{"bn":"কম্প্রেসর মেরামত","en":"Compressor repair"}]'::jsonb,
  reviews = '[{"id":"b049-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-04-17"},{"id":"b049-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-31"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'shital ac care'
  and slug is null;

update public.listings set
  slug = 'air-fresh-servicing',
  verified = false,
  featured = false,
  image_seed = 49,
  title_bn = 'এয়ার ফ্রেশ সার্ভিসিং',
  title_en = 'Air Fresh Servicing',
  description_bn = 'সব ব্র্যান্ডের এয়ার কন্ডিশনার মেরামতে অভিজ্ঞ টেকনিশিয়ান।',
  description_en = 'Technicians experienced with all major air-conditioner brands.',
  address_bn = '31 নং, বাজার পাড়া, কুমারখালী',
  address_en = 'Holding 31, Bazar Para, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.865460800898518,
  lng = 89.22362322086651,
  category_group = 'services',
  rating = 3.8,
  review_count = 14,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"এসি সার্ভিসিং","en":"AC servicing"},{"bn":"গ্যাস রিফিল","en":"Gas refill"},{"bn":"নতুন স্থাপন","en":"New installation"},{"bn":"কম্প্রেসর মেরামত","en":"Compressor repair"}]'::jsonb,
  reviews = '[{"id":"b050-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-04-06"},{"id":"b050-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-03-20"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'air fresh servicing'
  and slug is null;

update public.listings set
  slug = 'power-house-generator',
  verified = true,
  featured = true,
  image_seed = 50,
  title_bn = 'পাওয়ার হাউস জেনারেটর',
  title_en = 'Power House Generator',
  description_bn = 'জেনারেটর ও আইপিএস মেরামত, সার্ভিসিং এবং ব্যাটারি সরবরাহ।',
  description_en = 'Generator and IPS repair, servicing and battery supply.',
  address_bn = '107 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 107, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.888925415605566,
  lng = 89.12854762229873,
  category_group = 'services',
  rating = 4.6,
  review_count = 53,
  photo_count = 5,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জেনারেটর মেরামত","en":"Generator repair"},{"bn":"আইপিএস সার্ভিসিং","en":"IPS servicing"},{"bn":"ব্যাটারি সরবরাহ","en":"Battery supply"},{"bn":"নিয়মিত রক্ষণাবেক্ষণ","en":"Routine maintenance"}]'::jsonb,
  reviews = '[{"id":"b051-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-03-26"},{"id":"b051-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-03-09"},{"id":"b051-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-02-20"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'power house generator'
  and slug is null;

update public.listings set
  slug = 'volt-generator-service',
  verified = false,
  featured = false,
  image_seed = 51,
  title_bn = 'ভোল্ট জেনারেটর সার্ভিস',
  title_en = 'Volt Generator Service',
  description_bn = 'লোডশেডিংয়ের সময় জরুরি সেবা দেওয়া হয়।',
  description_en = 'Emergency call-outs available during load-shedding.',
  address_bn = '81 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 81, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.900307832334697,
  lng = 89.1136578002642,
  category_group = 'services',
  rating = 4.1,
  review_count = 29,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জেনারেটর মেরামত","en":"Generator repair"},{"bn":"আইপিএস সার্ভিসিং","en":"IPS servicing"},{"bn":"ব্যাটারি সরবরাহ","en":"Battery supply"},{"bn":"নিয়মিত রক্ষণাবেক্ষণ","en":"Routine maintenance"}]'::jsonb,
  reviews = '[{"id":"b052-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-15"},{"id":"b052-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-02-26"},{"id":"b052-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-02-09"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'volt generator service'
  and slug is null;

update public.listings set
  slug = 'energy-ips-centre',
  verified = false,
  featured = false,
  image_seed = 52,
  title_bn = 'এনার্জি আইপিএস সেন্টার',
  title_en = 'Energy IPS Centre',
  description_bn = 'জেনারেটর ও আইপিএস মেরামত, সার্ভিসিং এবং ব্যাটারি সরবরাহ।',
  description_en = 'Generator and IPS repair, servicing and battery supply.',
  address_bn = '87 নং, স্টেশন বাজার, ভেড়ামারা',
  address_en = 'Holding 87, Station Bazar, Bheramara',
  area_id = 'bheramara',
  lat = 24.01078841361787,
  lng = 88.98237793554611,
  category_group = 'services',
  rating = 3.9,
  review_count = 17,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জেনারেটর মেরামত","en":"Generator repair"},{"bn":"আইপিএস সার্ভিসিং","en":"IPS servicing"},{"bn":"ব্যাটারি সরবরাহ","en":"Battery supply"},{"bn":"নিয়মিত রক্ষণাবেক্ষণ","en":"Routine maintenance"}]'::jsonb,
  reviews = '[{"id":"b053-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-03-04"},{"id":"b053-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-02-15"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'energy ips centre'
  and slug is null;

update public.listings set
  slug = 'tech-zone-computer',
  verified = true,
  featured = true,
  image_seed = 53,
  title_bn = 'টেক জোন কম্পিউটার',
  title_en = 'Tech Zone Computer',
  description_bn = 'ডেটা রিকভারি ও নেটওয়ার্ক সেটআপের কাজও করা হয়।',
  description_en = 'Data recovery and small-office network setup also handled.',
  address_bn = '52 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 52, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.896252467315364,
  lng = 89.12675236639325,
  category_group = 'services',
  rating = 4.5,
  review_count = 66,
  photo_count = 4,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ল্যাপটপ মেরামত","en":"Laptop repair"},{"bn":"সফটওয়্যার সেটআপ","en":"Software setup"},{"bn":"ডেটা রিকভারি","en":"Data recovery"},{"bn":"যন্ত্রাংশ বিক্রয়","en":"Parts & accessories"}]'::jsonb,
  reviews = '[{"id":"b054-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-02-21"},{"id":"b054-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-02-04"},{"id":"b054-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-01-18"},{"id":"b054-r3","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-01-01"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'tech zone computer'
  and slug is null;

update public.listings set
  slug = 'cyber-care',
  verified = false,
  featured = false,
  image_seed = 54,
  title_bn = 'সাইবার কেয়ার',
  title_en = 'Cyber Care',
  description_bn = 'ডেস্কটপ ও ল্যাপটপ মেরামত, সফটওয়্যার সেটআপ ও যন্ত্রাংশ বিক্রয়।',
  description_en = 'Desktop and laptop repair, software setup and parts sales.',
  address_bn = '64 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 64, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.914252581202263,
  lng = 89.13603637339037,
  category_group = 'services',
  rating = 4.2,
  review_count = 38,
  photo_count = 5,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ল্যাপটপ মেরামত","en":"Laptop repair"},{"bn":"সফটওয়্যার সেটআপ","en":"Software setup"},{"bn":"ডেটা রিকভারি","en":"Data recovery"},{"bn":"যন্ত্রাংশ বিক্রয়","en":"Parts & accessories"}]'::jsonb,
  reviews = '[{"id":"b055-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-02-10"},{"id":"b055-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-01-24"},{"id":"b055-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-01-07"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'cyber care'
  and slug is null;

update public.listings set
  slug = 'digital-it-solution',
  verified = false,
  featured = false,
  image_seed = 55,
  title_bn = 'ডিজিটাল আইটি সলিউশন',
  title_en = 'Digital IT Solution',
  description_bn = 'ডেটা রিকভারি ও নেটওয়ার্ক সেটআপের কাজও করা হয়।',
  description_en = 'Data recovery and small-office network setup also handled.',
  address_bn = '57 নং, হাসপাতাল মোড়, কুমারখালী',
  address_en = 'Holding 57, Hospital Mor, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.8541256457479,
  lng = 89.21077020823174,
  category_group = 'services',
  rating = 4,
  review_count = 21,
  photo_count = 6,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ল্যাপটপ মেরামত","en":"Laptop repair"},{"bn":"সফটওয়্যার সেটআপ","en":"Software setup"},{"bn":"ডেটা রিকভারি","en":"Data recovery"},{"bn":"যন্ত্রাংশ বিক্রয়","en":"Parts & accessories"}]'::jsonb,
  reviews = '[{"id":"b056-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-01-30"},{"id":"b056-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-01-13"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'digital it solution'
  and slug is null;

update public.listings set
  slug = 'mobile-care-centre',
  verified = true,
  featured = false,
  image_seed = 56,
  title_bn = 'মোবাইল কেয়ার সেন্টার',
  title_en = 'Mobile Care Centre',
  description_bn = 'মোবাইলের ডিসপ্লে, ব্যাটারি ও সফটওয়্যার সমস্যার সমাধান।',
  description_en = 'Display, battery and software fixes for all handsets.',
  address_bn = '84 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 84, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.889268222281544,
  lng = 89.12518129834972,
  category_group = 'services',
  website = 'https://example.com/mobile-care-centre',
  rating = 4.4,
  review_count = 95,
  photo_count = 3,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ডিসপ্লে পরিবর্তন","en":"Display replacement"},{"bn":"ব্যাটারি পরিবর্তন","en":"Battery replacement"},{"bn":"সফটওয়্যার আপডেট","en":"Software flashing"},{"bn":"পানি ক্ষতি মেরামত","en":"Water-damage repair"}]'::jsonb,
  reviews = '[{"id":"b057-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-01-19"},{"id":"b057-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-01-02"},{"id":"b057-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2025-12-16"},{"id":"b057-r3","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-07-07"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'mobile care centre'
  and slug is null;

update public.listings set
  slug = 'smart-phone-hospital',
  verified = false,
  featured = false,
  image_seed = 57,
  title_bn = 'স্মার্ট ফোন হাসপাতাল',
  title_en = 'Smart Phone Hospital',
  description_bn = 'অরিজিনাল যন্ত্রাংশ ব্যবহার করে দ্রুত সার্ভিসিং।',
  description_en = 'Quick servicing using original replacement parts.',
  address_bn = '110 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 110, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.899734052567492,
  lng = 89.13057646085568,
  category_group = 'services',
  rating = 4.1,
  review_count = 52,
  photo_count = 4,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ডিসপ্লে পরিবর্তন","en":"Display replacement"},{"bn":"ব্যাটারি পরিবর্তন","en":"Battery replacement"},{"bn":"সফটওয়্যার আপডেট","en":"Software flashing"},{"bn":"পানি ক্ষতি মেরামত","en":"Water-damage repair"}]'::jsonb,
  reviews = '[{"id":"b058-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-01-08"},{"id":"b058-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2025-12-22"},{"id":"b058-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-07-13"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'smart phone hospital'
  and slug is null;

update public.listings set
  slug = 'phone-fix-point',
  verified = false,
  featured = false,
  image_seed = 58,
  title_bn = 'ফোন ফিক্স পয়েন্ট',
  title_en = 'Phone Fix Point',
  description_bn = 'মোবাইলের ডিসপ্লে, ব্যাটারি ও সফটওয়্যার সমস্যার সমাধান।',
  description_en = 'Display, battery and software fixes for all handsets.',
  address_bn = '65 নং, পুরাতন বাজার, মিরপুর',
  address_en = 'Holding 65, Purano Bazar, Mirpur',
  area_id = 'mirpur',
  lat = 23.947942701026957,
  lng = 89.00350196586962,
  category_group = 'services',
  rating = 3.9,
  review_count = 27,
  photo_count = 5,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ডিসপ্লে পরিবর্তন","en":"Display replacement"},{"bn":"ব্যাটারি পরিবর্তন","en":"Battery replacement"},{"bn":"সফটওয়্যার আপডেট","en":"Software flashing"},{"bn":"পানি ক্ষতি মেরামত","en":"Water-damage repair"}]'::jsonb,
  reviews = '[{"id":"b059-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2025-12-28"},{"id":"b059-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2025-12-11"},{"id":"b059-r2","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-07-02"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'phone fix point'
  and slug is null;

update public.listings set
  slug = 'kushtia-online-broadband',
  verified = true,
  featured = false,
  image_seed = 59,
  title_bn = 'কুষ্টিয়া অনলাইন ব্রডব্যান্ড',
  title_en = 'Kushtia Online Broadband',
  description_bn = 'দ্রুতগতির ইন্টারনেট, ২৪ ঘণ্টা কারিগরি সহায়তা।',
  description_en = 'High-speed internet with 24-hour technical support.',
  address_bn = '5 নং, চৌড়হাস মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 5, Chowrhas Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.911904456678513,
  lng = 89.11381357502462,
  category_group = 'utilities',
  rating = 4.3,
  review_count = 187,
  photo_count = 6,
  hours = '[[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[],[{"open":540,"close":1020}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"নতুন সংযোগ","en":"New connection"},{"bn":"ফাইবার লাইন","en":"Fibre line"},{"bn":"রাউটার সেটআপ","en":"Router setup"},{"bn":"কারিগরি সহায়তা","en":"Technical support"}]'::jsonb,
  reviews = '[{"id":"b060-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2025-12-17"},{"id":"b060-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-07-08"},{"id":"b060-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-06-21"},{"id":"b060-r3","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-06-04"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'kushtia online broadband'
  and slug is null;

update public.listings set
  slug = 'sky-net-communication',
  verified = true,
  featured = false,
  image_seed = 60,
  title_bn = 'স্কাই নেট কমিউনিকেশন',
  title_en = 'Sky Net Communication',
  description_bn = 'বাসা ও অফিসের জন্য ব্রডব্যান্ড সংযোগ ও ফাইবার লাইন।',
  description_en = 'Broadband and fibre connections for homes and offices.',
  address_bn = '88 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 88, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.902122738550602,
  lng = 89.13062050204388,
  category_group = 'utilities',
  website = 'https://example.com/sky-net-communication',
  rating = 4.1,
  review_count = 143,
  photo_count = 3,
  hours = '[[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[],[{"open":540,"close":1020}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"নতুন সংযোগ","en":"New connection"},{"bn":"ফাইবার লাইন","en":"Fibre line"},{"bn":"রাউটার সেটআপ","en":"Router setup"},{"bn":"কারিগরি সহায়তা","en":"Technical support"}]'::jsonb,
  reviews = '[{"id":"b061-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-07-14"},{"id":"b061-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-06-27"},{"id":"b061-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-06-10"},{"id":"b061-r3","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-24"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'sky net communication'
  and slug is null;

update public.listings set
  slug = 'fiber-link-isp',
  verified = false,
  featured = false,
  image_seed = 61,
  title_bn = 'ফাইবার লিংক আইএসপি',
  title_en = 'Fiber Link ISP',
  description_bn = 'দ্রুতগতির ইন্টারনেট, ২৪ ঘণ্টা কারিগরি সহায়তা।',
  description_en = 'High-speed internet with 24-hour technical support.',
  address_bn = '84 নং, বাজার পাড়া, কুমারখালী',
  address_en = 'Holding 84, Bazar Para, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.868796707119934,
  lng = 89.22934755075546,
  category_group = 'utilities',
  rating = 3.9,
  review_count = 76,
  photo_count = 4,
  hours = '[[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[],[{"open":540,"close":1020}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"নতুন সংযোগ","en":"New connection"},{"bn":"ফাইবার লাইন","en":"Fibre line"},{"bn":"রাউটার সেটআপ","en":"Router setup"},{"bn":"কারিগরি সহায়তা","en":"Technical support"}]'::jsonb,
  reviews = '[{"id":"b062-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-07-03"},{"id":"b062-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-06-16"},{"id":"b062-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-05-30"},{"id":"b062-r3","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-13"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'fiber link isp'
  and slug is null;

update public.listings set
  slug = 'bheramara-net',
  verified = false,
  featured = false,
  image_seed = 62,
  title_bn = 'ভেড়ামারা নেট',
  title_en = 'Bheramara Net',
  description_bn = 'বাসা ও অফিসের জন্য ব্রডব্যান্ড সংযোগ ও ফাইবার লাইন।',
  description_en = 'Broadband and fibre connections for homes and offices.',
  address_bn = '96 নং, উপজেলা মোড়, ভেড়ামারা',
  address_en = 'Holding 96, Upazila Mor, Bheramara',
  area_id = 'bheramara',
  lat = 24.014764649420027,
  lng = 88.98411721457367,
  category_group = 'utilities',
  rating = 3.7,
  review_count = 44,
  photo_count = 5,
  hours = '[[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[{"open":540,"close":1020}],[],[{"open":540,"close":1020}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"নতুন সংযোগ","en":"New connection"},{"bn":"ফাইবার লাইন","en":"Fibre line"},{"bn":"রাউটার সেটআপ","en":"Router setup"},{"bn":"কারিগরি সহায়তা","en":"Technical support"}]'::jsonb,
  reviews = '[{"id":"b063-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-06-22"},{"id":"b063-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-06-05"},{"id":"b063-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-05-19"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'bheramara net'
  and slug is null;

update public.listings set
  slug = 'bishuddho-water-supply',
  verified = true,
  featured = false,
  image_seed = 63,
  title_bn = 'বিশুদ্ধ পানি সরবরাহ',
  title_en = 'Bishuddho Water Supply',
  description_bn = 'জার ও ট্যাংক পানি হোম ডেলিভারি সুবিধা।',
  description_en = 'Home delivery of jar and tanker water.',
  address_bn = '102 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 102, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.910363384564175,
  lng = 89.12265479794962,
  category_group = 'utilities',
  rating = 4.4,
  review_count = 81,
  photo_count = 6,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জার পানি","en":"Jar water"},{"bn":"ট্যাংক সরবরাহ","en":"Tanker supply"},{"bn":"হোম ডেলিভারি","en":"Home delivery"},{"bn":"পানির ফিল্টার","en":"Water filters"}]'::jsonb,
  reviews = '[{"id":"b064-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-06-11"},{"id":"b064-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-05-25"},{"id":"b064-r2","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-05-08"},{"id":"b064-r3","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-04-21"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'bishuddho water supply'
  and slug is null;

update public.listings set
  slug = 'clear-water-service',
  verified = false,
  featured = false,
  image_seed = 64,
  title_bn = 'ক্লিয়ার ওয়াটার সার্ভিস',
  title_en = 'Clear Water Service',
  description_bn = 'বিশুদ্ধ খাবার পানি ও ট্যাংকে পানি সরবরাহ করা হয়।',
  description_en = 'Purified drinking water and bulk tanker supply.',
  address_bn = '49 নং, হাউজিং এলাকা, কুষ্টিয়া সদর',
  address_en = 'Holding 49, Housing Estate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.905399802185023,
  lng = 89.11690656405422,
  category_group = 'utilities',
  rating = 4,
  review_count = 39,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জার পানি","en":"Jar water"},{"bn":"ট্যাংক সরবরাহ","en":"Tanker supply"},{"bn":"হোম ডেলিভারি","en":"Home delivery"},{"bn":"পানির ফিল্টার","en":"Water filters"}]'::jsonb,
  reviews = '[{"id":"b065-r0","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-31"},{"id":"b065-r1","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-05-14"},{"id":"b065-r2","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-04-27"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'clear water service'
  and slug is null;

update public.listings set
  slug = 'aqua-pure',
  verified = false,
  featured = false,
  image_seed = 65,
  title_bn = 'আকুয়া পিওর',
  title_en = 'Aqua Pure',
  description_bn = 'জার ও ট্যাংক পানি হোম ডেলিভারি সুবিধা।',
  description_en = 'Home delivery of jar and tanker water.',
  address_bn = '90 নং, কলেজ পাড়া, মিরপুর',
  address_en = 'Holding 90, College Para, Mirpur',
  area_id = 'mirpur',
  lat = 23.955663261913234,
  lng = 89.01420874530105,
  category_group = 'utilities',
  rating = 3.8,
  review_count = 23,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"জার পানি","en":"Jar water"},{"bn":"ট্যাংক সরবরাহ","en":"Tanker supply"},{"bn":"হোম ডেলিভারি","en":"Home delivery"},{"bn":"পানির ফিল্টার","en":"Water filters"}]'::jsonb,
  reviews = '[{"id":"b066-r0","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-05-20"},{"id":"b066-r1","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-05-03"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'utilities'
  and lower(trim(title)) = 'aqua pure'
  and slug is null;

update public.listings set
  slug = 'advocate-mizanur-rahman',
  verified = true,
  featured = true,
  image_seed = 66,
  title_bn = 'অ্যাডভোকেট মিজানুর রহমান',
  title_en = 'Advocate Mizanur Rahman',
  description_bn = 'দেওয়ানি, ফৌজদারি ও পারিবারিক মামলায় আইনি পরামর্শ দেওয়া হয়।',
  description_en = 'Legal advice on civil, criminal and family matters.',
  address_bn = '17 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 17, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.912678059623268,
  lng = 89.1055610062777,
  category_group = 'services',
  rating = 4.6,
  review_count = 47,
  photo_count = 5,
  hours = '[[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[],[]]'::jsonb,
  always_open = false,
  services = '[{"bn":"আইনি পরামর্শ","en":"Legal consultation"},{"bn":"দলিল প্রস্তুত","en":"Deed drafting"},{"bn":"মামলা পরিচালনা","en":"Case representation"},{"bn":"জমি সংক্রান্ত","en":"Land matters"}]'::jsonb,
  reviews = '[{"id":"b067-r0","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-05-09"},{"id":"b067-r1","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-04-22"},{"id":"b067-r2","author":{"bn":"মিতা রানী","en":"Mita Rani"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-04-05"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'advocate mizanur rahman'
  and slug is null;

update public.listings set
  slug = 'advocate-salma-khatun',
  verified = true,
  featured = false,
  image_seed = 67,
  title_bn = 'অ্যাডভোকেট সালমা খাতুন',
  title_en = 'Advocate Salma Khatun',
  description_bn = 'জমিজমা ও দলিল সংক্রান্ত পরামর্শে অভিজ্ঞ আইনজীবী।',
  description_en = 'Advocate experienced in land and property documentation.',
  address_bn = '23 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 23, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.905774954455595,
  lng = 89.12971877269251,
  category_group = 'services',
  rating = 4.4,
  review_count = 33,
  photo_count = 6,
  hours = '[[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[],[]]'::jsonb,
  always_open = false,
  services = '[{"bn":"আইনি পরামর্শ","en":"Legal consultation"},{"bn":"দলিল প্রস্তুত","en":"Deed drafting"},{"bn":"মামলা পরিচালনা","en":"Case representation"},{"bn":"জমি সংক্রান্ত","en":"Land matters"}]'::jsonb,
  reviews = '[{"id":"b068-r0","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-04-28"},{"id":"b068-r1","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-04-11"},{"id":"b068-r2","author":{"bn":"তানভীর হাসান","en":"Tanvir Hasan"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-03-25"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'advocate salma khatun'
  and slug is null;

update public.listings set
  slug = 'law-chamber-kushtia',
  verified = false,
  featured = false,
  image_seed = 68,
  title_bn = 'ল চেম্বার কুষ্টিয়া',
  title_en = 'Law Chamber Kushtia',
  description_bn = 'দেওয়ানি, ফৌজদারি ও পারিবারিক মামলায় আইনি পরামর্শ দেওয়া হয়।',
  description_en = 'Legal advice on civil, criminal and family matters.',
  address_bn = '29 নং, কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Holding 29, Court Para, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.891155110675882,
  lng = 89.1144113291012,
  category_group = 'services',
  rating = 4.1,
  review_count = 19,
  photo_count = 3,
  hours = '[[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[{"open":540,"close":1080}],[],[]]'::jsonb,
  always_open = false,
  services = '[{"bn":"আইনি পরামর্শ","en":"Legal consultation"},{"bn":"দলিল প্রস্তুত","en":"Deed drafting"},{"bn":"মামলা পরিচালনা","en":"Case representation"},{"bn":"জমি সংক্রান্ত","en":"Land matters"}]'::jsonb,
  reviews = '[{"id":"b069-r0","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-04-17"},{"id":"b069-r1","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-31"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'law chamber kushtia'
  and slug is null;

update public.listings set
  slug = 'fashion-house-tailors',
  verified = true,
  featured = true,
  image_seed = 69,
  title_bn = 'ফ্যাশন হাউস টেইলার্স',
  title_en = 'Fashion House Tailors',
  description_bn = 'দ্রুত ডেলিভারি ও ঈদ মৌসুমে বিশেষ অর্ডার নেওয়া হয়।',
  description_en = 'Fast delivery with special order slots during Eid season.',
  address_bn = '38 নং, মজমপুর গেট, কুষ্টিয়া সদর',
  address_en = 'Holding 38, Mojompur Gate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.901770574546546,
  lng = 89.11141208206251,
  category_group = 'services',
  rating = 4.5,
  review_count = 74,
  photo_count = 4,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাঞ্জাবি ও শার্ট","en":"Panjabi & shirts"},{"bn":"সালোয়ার কামিজ","en":"Salwar kameez"},{"bn":"ব্লাউজ ও কুর্তি","en":"Blouse & kurti"},{"bn":"অল্টারেশন","en":"Alterations"}]'::jsonb,
  reviews = '[{"id":"b070-r0","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-04-06"},{"id":"b070-r1","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-03-20"},{"id":"b070-r2","author":{"bn":"সোহেল রানা","en":"Sohel Rana"},"rating":5,"comment":{"bn":"রাতেও ফোন ধরেছেন এবং সময়মতো এসেছেন। ধন্যবাদ।","en":"Picked up the phone late at night and arrived on time. Thank you."},"date":"2026-03-03"},{"id":"b070-r3","author":{"bn":"মোঃ শাহিন","en":"Md. Shahin"},"rating":5,"comment":{"bn":"দাম নিয়ে কোনো ঝামেলা করেননি, কাজ ভালো করেছেন।","en":"No haggling over the price and the job was done well."},"date":"2026-02-14"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'fashion house tailors'
  and slug is null;

update public.listings set
  slug = 'new-style-tailor',
  verified = false,
  featured = false,
  image_seed = 70,
  title_bn = 'নিউ স্টাইল দর্জি',
  title_en = 'New Style Tailor',
  description_bn = 'পুরুষ ও নারীদের পোশাক তৈরি এবং মাপ অনুযায়ী সেলাই।',
  description_en = 'Made-to-measure stitching for men and women.',
  address_bn = '7 নং, হাউজিং এলাকা, কুষ্টিয়া সদর',
  address_en = 'Holding 7, Housing Estate, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.91243102021496,
  lng = 89.10903469703081,
  category_group = 'services',
  rating = 4.2,
  review_count = 41,
  photo_count = 5,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাঞ্জাবি ও শার্ট","en":"Panjabi & shirts"},{"bn":"সালোয়ার কামিজ","en":"Salwar kameez"},{"bn":"ব্লাউজ ও কুর্তি","en":"Blouse & kurti"},{"bn":"অল্টারেশন","en":"Alterations"}]'::jsonb,
  reviews = '[{"id":"b071-r0","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-03-26"},{"id":"b071-r1","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-03-09"},{"id":"b071-r2","author":{"bn":"ফারজানা ইয়াসমিন","en":"Farzana Yasmin"},"rating":5,"comment":{"bn":"পরিবারের সবাই এখানেই যাই। অনেক বছর ধরে ভরসা করি।","en":"Our whole family goes here. We have trusted them for years."},"date":"2026-02-20"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'new style tailor'
  and slug is null;

update public.listings set
  slug = 'ruchi-tailors',
  verified = false,
  featured = false,
  image_seed = 71,
  title_bn = 'রুচি টেইলার্স',
  title_en = 'Ruchi Tailors',
  description_bn = 'দ্রুত ডেলিভারি ও ঈদ মৌসুমে বিশেষ অর্ডার নেওয়া হয়।',
  description_en = 'Fast delivery with special order slots during Eid season.',
  address_bn = '78 নং, হাসপাতাল মোড়, কুমারখালী',
  address_en = 'Holding 78, Hospital Mor, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.869072045927105,
  lng = 89.23161675938286,
  category_group = 'services',
  rating = 4,
  review_count = 26,
  photo_count = 6,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"পাঞ্জাবি ও শার্ট","en":"Panjabi & shirts"},{"bn":"সালোয়ার কামিজ","en":"Salwar kameez"},{"bn":"ব্লাউজ ও কুর্তি","en":"Blouse & kurti"},{"bn":"অল্টারেশন","en":"Alterations"}]'::jsonb,
  reviews = '[{"id":"b072-r0","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-03-15"},{"id":"b072-r1","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-02-26"},{"id":"b072-r2","author":{"bn":"নুসরাত জাহান","en":"Nusrat Jahan"},"rating":4,"comment":{"bn":"ফোনে সব বুঝিয়ে বলেছেন, এসে দ্রুত সমাধান করেছেন।","en":"Explained everything on the phone and fixed it quickly on arrival."},"date":"2026-02-09"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'ruchi tailors'
  and slug is null;

update public.listings set
  slug = 'clean-home-service',
  verified = true,
  featured = false,
  image_seed = 72,
  title_bn = 'ক্লিন হোম সার্ভিস',
  title_en = 'Clean Home Service',
  description_bn = 'বাসা, অফিস ও দোকান পরিষ্কারের পেশাদার সেবা।',
  description_en = 'Professional cleaning for homes, offices and shops.',
  address_bn = '40 নং, এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'Holding 40, N.S. Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.912295722500126,
  lng = 89.1142831286901,
  category_group = 'services',
  website = 'https://example.com/clean-home-service',
  rating = 4.3,
  review_count = 36,
  photo_count = 3,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘর পরিষ্কার","en":"House cleaning"},{"bn":"ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"সোফা ক্লিনিং","en":"Sofa cleaning"},{"bn":"ডিপ ক্লিনিং","en":"Deep cleaning"}]'::jsonb,
  reviews = '[{"id":"b073-r0","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-03-04"},{"id":"b073-r1","author":{"bn":"জাহিদ হোসেন","en":"Zahid Hossain"},"rating":3,"comment":{"bn":"মোটামুটি। ভিড়ের সময় একটু ধৈর্য ধরতে হয়।","en":"Average. You need some patience during busy hours."},"date":"2026-02-15"},{"id":"b073-r2","author":{"bn":"রফিকুল ইসলাম","en":"Rafiqul Islam"},"rating":4,"comment":{"bn":"সেবা ভালো, তবে একটু অপেক্ষা করতে হয়েছে। দাম যুক্তিসঙ্গত।","en":"Good service though there was some waiting. Prices are reasonable."},"date":"2026-01-29"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'clean home service'
  and slug is null;

update public.listings set
  slug = 'fresh-cleaning-solution',
  verified = false,
  featured = false,
  image_seed = 73,
  title_bn = 'ফ্রেশ ক্লিনিং সলিউশন',
  title_en = 'Fresh Cleaning Solution',
  description_bn = 'পানির ট্যাংক, সেপটিক ট্যাংক ও ডিপ ক্লিনিং করা হয়।',
  description_en = 'Water tank, septic tank and deep-cleaning services.',
  address_bn = '57 নং, থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Holding 57, Thana Mor, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.88771423715884,
  lng = 89.11975321475582,
  category_group = 'services',
  rating = 3.9,
  review_count = 18,
  photo_count = 4,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ঘর পরিষ্কার","en":"House cleaning"},{"bn":"ট্যাংক পরিষ্কার","en":"Tank cleaning"},{"bn":"সোফা ক্লিনিং","en":"Sofa cleaning"},{"bn":"ডিপ ক্লিনিং","en":"Deep cleaning"}]'::jsonb,
  reviews = '[{"id":"b074-r0","author":{"bn":"সাবরিনা আক্তার","en":"Sabrina Akter"},"rating":4,"comment":{"bn":"কাজ ঠিকঠাক হয়েছে। জায়গাটা খুঁজে পেতে একটু সমস্যা হয়েছিল।","en":"Work was fine. Took me a little while to find the place."},"date":"2026-02-21"},{"id":"b074-r1","author":{"bn":"আব্দুল করিম","en":"Abdul Karim"},"rating":5,"comment":{"bn":"খুব দ্রুত সাড়া দিয়েছেন। ব্যবহার ভালো এবং কাজও পরিষ্কার হয়েছে।","en":"Responded very quickly. Polite staff and the work was done properly."},"date":"2026-02-04"}]'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'services'
  and lower(trim(title)) = 'fresh cleaning solution'
  and slug is null;

update public.listings set
  slug = '3-room-family-flat-at-mojompur',
  verified = true,
  image_seed = 40,
  title_bn = 'মজমপুরে ৩ রুমের পরিবারিক ফ্ল্যাট',
  title_en = '3-room family flat at Mojompur',
  description_bn = 'খোলামেলা ফ্ল্যাট, পর্যাপ্ত আলো-বাতাস। পানি ও বিদ্যুতের নিয়মিত সরবরাহ রয়েছে।',
  description_en = 'Open, airy flat with good natural light. Reliable water and electricity supply.',
  address_bn = '25 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 25, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.914174536806563,
  lng = 89.13147427271217,
  category_group = 'rentals',
  rent = 12000,
  bedrooms = 3,
  bathrooms = 2,
  size_sqft = 1100,
  floor = 1,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-08-01',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = '3-room family flat at mojompur'
  and slug is null;

update public.listings set
  slug = '2-room-flat-on-n-s-road',
  verified = true,
  image_seed = 41,
  title_bn = 'এন.এস. রোডে ২ রুমের ফ্ল্যাট',
  title_en = '2-room flat on N.S. Road',
  description_bn = 'খোলামেলা ফ্ল্যাট, পর্যাপ্ত আলো-বাতাস। পানি ও বিদ্যুতের নিয়মিত সরবরাহ রয়েছে।',
  description_en = 'Open, airy flat with good natural light. Reliable water and electricity supply.',
  address_bn = '37 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 37, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.89310082280858,
  lng = 89.12342435530033,
  category_group = 'rentals',
  rent = 9000,
  bedrooms = 2,
  bathrooms = 1,
  size_sqft = 850,
  floor = 2,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-08-08',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = '2-room flat on n.s. road'
  and slug is null;

update public.listings set
  slug = 'furnished-flat-in-housing-estate',
  verified = true,
  image_seed = 42,
  title_bn = 'হাউজিংয়ে সাজানো ফ্ল্যাট',
  title_en = 'Furnished flat in Housing Estate',
  description_bn = 'খোলামেলা ফ্ল্যাট, পর্যাপ্ত আলো-বাতাস। পানি ও বিদ্যুতের নিয়মিত সরবরাহ রয়েছে।',
  description_en = 'Open, airy flat with good natural light. Reliable water and electricity supply.',
  address_bn = '86 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 86, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.913223920864223,
  lng = 89.13202030399256,
  category_group = 'rentals',
  rent = 18000,
  bedrooms = 3,
  bathrooms = 2,
  size_sqft = 1350,
  floor = 3,
  tenant_type = 'family',
  furnished = true,
  available_from = '2026-08-15',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'furnished flat in housing estate'
  and slug is null;

update public.listings set
  slug = 'compact-flat-at-court-para',
  verified = false,
  image_seed = 43,
  title_bn = 'কোর্ট পাড়ায় ছোট ফ্ল্যাট',
  title_en = 'Compact flat at Court Para',
  description_bn = 'খোলামেলা ফ্ল্যাট, পর্যাপ্ত আলো-বাতাস। পানি ও বিদ্যুতের নিয়মিত সরবরাহ রয়েছে।',
  description_en = 'Open, airy flat with good natural light. Reliable water and electricity supply.',
  address_bn = '54 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 54, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.913092770759608,
  lng = 89.11087627915639,
  category_group = 'rentals',
  rent = 7500,
  bedrooms = 2,
  bathrooms = 1,
  size_sqft = 720,
  floor = 4,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-08-22',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'compact flat at court para'
  and slug is null;

update public.listings set
  slug = 'single-storey-house-at-thana-mor',
  verified = true,
  image_seed = 44,
  title_bn = 'থানা মোড়ে একতলা বাসা',
  title_en = 'Single-storey house at Thana Mor',
  description_bn = 'নিরিবিলি পরিবেশে পারিবারিক বাসা। সামনে খোলা জায়গা ও আলাদা প্রবেশপথ।',
  description_en = 'Family house in a quiet neighbourhood, with open frontage and a separate entrance.',
  address_bn = '62 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 62, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.893577790169317,
  lng = 89.13275736049881,
  category_group = 'rentals',
  rent = 15000,
  bedrooms = 4,
  bathrooms = 2,
  size_sqft = 1600,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-08-29',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'single-storey house at thana mor'
  and slug is null;

update public.listings set
  slug = 'tin-shed-house-at-chowrhas',
  verified = false,
  image_seed = 45,
  title_bn = 'চৌড়হাসে টিনশেড বাসা',
  title_en = 'Tin-shed house at Chowrhas',
  description_bn = 'নিরিবিলি পরিবেশে পারিবারিক বাসা। সামনে খোলা জায়গা ও আলাদা প্রবেশপথ।',
  description_en = 'Family house in a quiet neighbourhood, with open frontage and a separate entrance.',
  address_bn = '27 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 27, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.890369247240958,
  lng = 89.11263567482087,
  category_group = 'rentals',
  rent = 6000,
  bedrooms = 2,
  bathrooms = 1,
  size_sqft = 700,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-09-05',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'tin-shed house at chowrhas'
  and slug is null;

update public.listings set
  slug = 'family-house-in-kumarkhali',
  verified = true,
  image_seed = 46,
  title_bn = 'কুমারখালীতে পারিবারিক বাসা',
  title_en = 'Family house in Kumarkhali',
  description_bn = 'নিরিবিলি পরিবেশে পারিবারিক বাসা। সামনে খোলা জায়গা ও আলাদা প্রবেশপথ।',
  description_en = 'Family house in a quiet neighbourhood, with open frontage and a separate entrance.',
  address_bn = '65 নং, কুমারখালী',
  address_en = 'Holding 65, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.85173439436158,
  lng = 89.23092648906496,
  category_group = 'rentals',
  rent = 8500,
  bedrooms = 3,
  bathrooms = 2,
  size_sqft = 1200,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-09-12',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'family house in kumarkhali'
  and slug is null;

update public.listings set
  slug = 'newly-built-house-in-bheramara',
  verified = false,
  image_seed = 47,
  title_bn = 'ভেড়ামারায় নতুন বাসা',
  title_en = 'Newly built house in Bheramara',
  description_bn = 'নিরিবিলি পরিবেশে পারিবারিক বাসা। সামনে খোলা জায়গা ও আলাদা প্রবেশপথ।',
  description_en = 'Family house in a quiet neighbourhood, with open frontage and a separate entrance.',
  address_bn = '16 নং, ভেড়ামারা',
  address_en = 'Holding 16, Bheramara',
  area_id = 'bheramara',
  lat = 24.03065470674226,
  lng = 88.97751020737189,
  category_group = 'rentals',
  rent = 7000,
  bedrooms = 3,
  bathrooms = 1,
  size_sqft = 1000,
  tenant_type = 'family',
  furnished = false,
  available_from = '2026-09-19',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'newly built house in bheramara'
  and slug is null;

update public.listings set
  slug = 'bachelor-seat-at-college-para',
  verified = true,
  image_seed = 48,
  title_bn = 'কলেজ পাড়ায় ব্যাচেলর সিট',
  title_en = 'Bachelor seat at College Para',
  description_bn = 'ছাত্র ও চাকরিজীবীদের জন্য উপযোগী। খাট, ফ্যান ও সংযুক্ত বাথরুম রয়েছে।',
  description_en = 'Suited to students and working tenants. Bed, fan and attached bathroom included.',
  address_bn = '66 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 66, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.895620447290433,
  lng = 89.11235137123003,
  category_group = 'rentals',
  rent = 2500,
  bedrooms = 1,
  bathrooms = 1,
  size_sqft = 180,
  tenant_type = 'bachelor',
  furnished = true,
  available_from = '2026-08-01',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'bachelor seat at college para'
  and slug is null;

update public.listings set
  slug = 'bachelor-mess-at-mojompur',
  verified = false,
  image_seed = 49,
  title_bn = 'মজমপুরে ব্যাচেলর মেস',
  title_en = 'Bachelor mess at Mojompur',
  description_bn = 'ছাত্র ও চাকরিজীবীদের জন্য উপযোগী। খাট, ফ্যান ও সংযুক্ত বাথরুম রয়েছে।',
  description_en = 'Suited to students and working tenants. Bed, fan and attached bathroom included.',
  address_bn = '78 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 78, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.91172063877861,
  lng = 89.13556055158831,
  category_group = 'rentals',
  rent = 3000,
  bedrooms = 1,
  bathrooms = 1,
  size_sqft = 220,
  tenant_type = 'bachelor',
  furnished = true,
  available_from = '2026-08-08',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'bachelor mess at mojompur'
  and slug is null;

update public.listings set
  slug = 'student-hostel-on-station-road',
  verified = false,
  image_seed = 50,
  title_bn = 'স্টেশন রোডে ছাত্রাবাস',
  title_en = 'Student hostel on Station Road',
  description_bn = 'ছাত্র ও চাকরিজীবীদের জন্য উপযোগী। খাট, ফ্যান ও সংযুক্ত বাথরুম রয়েছে।',
  description_en = 'Suited to students and working tenants. Bed, fan and attached bathroom included.',
  address_bn = '16 নং, কুমারখালী',
  address_en = 'Holding 16, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.866891642943244,
  lng = 89.2238985388164,
  category_group = 'rentals',
  rent = 2200,
  bedrooms = 1,
  bathrooms = 1,
  size_sqft = 160,
  tenant_type = 'bachelor',
  furnished = true,
  available_from = '2026-08-15',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'student hostel on station road'
  and slug is null;

update public.listings set
  slug = 'office-space-on-n-s-road',
  verified = true,
  image_seed = 51,
  title_bn = 'এন.এস. রোডে অফিস স্পেস',
  title_en = 'Office space on N.S. Road',
  description_bn = 'প্রধান সড়কের পাশে অফিস স্পেস, গ্রাহক আসা-যাওয়ার জন্য সুবিধাজনক।',
  description_en = 'Office space beside the main road, convenient for visiting clients.',
  address_bn = '67 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 67, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.894972382205303,
  lng = 89.12363454879201,
  category_group = 'rentals',
  rent = 22000,
  bedrooms = 0,
  bathrooms = 2,
  size_sqft = 1400,
  floor = 2,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-08-22',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'office space on n.s. road'
  and slug is null;

update public.listings set
  slug = 'chamber-space-at-court-para',
  verified = true,
  image_seed = 52,
  title_bn = 'কোর্ট পাড়ায় চেম্বার স্পেস',
  title_en = 'Chamber space at Court Para',
  description_bn = 'প্রধান সড়কের পাশে অফিস স্পেস, গ্রাহক আসা-যাওয়ার জন্য সুবিধাজনক।',
  description_en = 'Office space beside the main road, convenient for visiting clients.',
  address_bn = '81 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 81, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.895487248678666,
  lng = 89.13103826719687,
  category_group = 'rentals',
  rent = 14000,
  bedrooms = 0,
  bathrooms = 1,
  size_sqft = 650,
  floor = 3,
  tenant_type = 'any',
  furnished = true,
  available_from = '2026-08-29',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'chamber space at court para'
  and slug is null;

update public.listings set
  slug = 'shop-unit-at-thana-mor',
  verified = true,
  image_seed = 53,
  title_bn = 'থানা মোড়ে দোকান ঘর',
  title_en = 'Shop unit at Thana Mor',
  description_bn = 'ব্যস্ত বাজার এলাকায় দোকান ঘর, সামনে ভালো প্রদর্শনী জায়গা।',
  description_en = 'Shop unit in a busy market area with good frontage for display.',
  address_bn = '69 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 69, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.88871559292541,
  lng = 89.10802974330166,
  category_group = 'rentals',
  rent = 11000,
  bedrooms = 0,
  bathrooms = 1,
  size_sqft = 400,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-09-05',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'shop unit at thana mor'
  and slug is null;

update public.listings set
  slug = 'shop-in-bazar-para',
  verified = false,
  image_seed = 54,
  title_bn = 'বাজার পাড়ায় দোকান',
  title_en = 'Shop in Bazar Para',
  description_bn = 'ব্যস্ত বাজার এলাকায় দোকান ঘর, সামনে ভালো প্রদর্শনী জায়গা।',
  description_en = 'Shop unit in a busy market area with good frontage for display.',
  address_bn = '69 নং, কুমারখালী',
  address_en = 'Holding 69, Kumarkhali',
  area_id = 'kumarkhali',
  lat = 23.870266961086873,
  lng = 89.23825124481762,
  category_group = 'rentals',
  rent = 6500,
  bedrooms = 0,
  bathrooms = 1,
  size_sqft = 280,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-09-12',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'shop in bazar para'
  and slug is null;

update public.listings set
  slug = 'shop-unit-at-notun-bazar',
  verified = false,
  image_seed = 55,
  title_bn = 'নতুন বাজারে দোকান ঘর',
  title_en = 'Shop unit at Notun Bazar',
  description_bn = 'ব্যস্ত বাজার এলাকায় দোকান ঘর, সামনে ভালো প্রদর্শনী জায়গা।',
  description_en = 'Shop unit in a busy market area with good frontage for display.',
  address_bn = '71 নং, ভেড়ামারা',
  address_en = 'Holding 71, Bheramara',
  area_id = 'bheramara',
  lat = 24.019557048041428,
  lng = 89.0055233798329,
  category_group = 'rentals',
  rent = 5500,
  bedrooms = 0,
  bathrooms = 0,
  size_sqft = 240,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-09-19',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'shop unit at notun bazar'
  and slug is null;

update public.listings set
  slug = 'warehouse-at-chowrhas',
  verified = true,
  image_seed = 56,
  title_bn = 'চৌড়হাসে গুদাম ঘর',
  title_en = 'Warehouse at Chowrhas',
  description_bn = 'পণ্য মজুদের জন্য প্রশস্ত গুদাম, ট্রাক প্রবেশের সুবিধা রয়েছে।',
  description_en = 'Spacious storage with truck access for loading and unloading.',
  address_bn = '35 নং, কুষ্টিয়া সদর',
  address_en = 'Holding 35, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  lat = 23.900289731551837,
  lng = 89.13537377379808,
  category_group = 'rentals',
  rent = 25000,
  bedrooms = 0,
  bathrooms = 1,
  size_sqft = 3000,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-08-01',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'warehouse at chowrhas'
  and slug is null;

update public.listings set
  slug = 'godown-in-mirpur',
  verified = false,
  image_seed = 57,
  title_bn = 'মিরপুরে গোডাউন',
  title_en = 'Godown in Mirpur',
  description_bn = 'পণ্য মজুদের জন্য প্রশস্ত গুদাম, ট্রাক প্রবেশের সুবিধা রয়েছে।',
  description_en = 'Spacious storage with truck access for loading and unloading.',
  address_bn = '28 নং, মিরপুর',
  address_en = 'Holding 28, Mirpur',
  area_id = 'mirpur',
  lat = 23.960338992833485,
  lng = 89.01720041320785,
  category_group = 'rentals',
  rent = 16000,
  bedrooms = 0,
  bathrooms = 1,
  size_sqft = 2200,
  tenant_type = 'any',
  furnished = false,
  available_from = '2026-08-08',
  updated_at = now()
where lower(trim(section)) = 'rentals'
  and lower(trim(title)) = 'godown in mirpur'
  and slug is null;

update public.listings set
  slug = 'emergency-e01',
  title_bn = 'জাতীয় জরুরি সেবা',
  title_en = 'National Emergency Service',
  description_bn = 'পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স — এক নম্বরে সব জরুরি সহায়তা।',
  description_en = 'Police, fire service and ambulance — all urgent help on one line.',
  category_group = 'emergency',
  icon = 'shield',
  scope = 'national',
  tone = 'danger',
  available_24 = true,
  priority = 0,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'national emergency service'
  and slug is null;

update public.listings set
  slug = 'emergency-e02',
  title_bn = 'পুলিশ কন্ট্রোল রুম',
  title_en = 'Police Control Room',
  description_bn = 'অপরাধ, দুর্ঘটনা ও নিরাপত্তা সংক্রান্ত জরুরি সহায়তার জন্য।',
  description_en = 'For crime, accidents and any urgent matter of public safety.',
  category_group = 'emergency',
  icon = 'shield',
  scope = 'national',
  tone = 'primary',
  available_24 = true,
  priority = 1,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'police control room'
  and slug is null;

update public.listings set
  slug = 'emergency-e03',
  title_bn = 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স',
  title_en = 'Fire Service & Civil Defence',
  description_bn = 'অগ্নিকাণ্ড, উদ্ধার কাজ ও দুর্যোগে জরুরি সাড়া।',
  description_en = 'Fire, rescue operations and emergency disaster response.',
  category_group = 'emergency',
  icon = 'flame',
  scope = 'national',
  tone = 'danger',
  available_24 = true,
  priority = 2,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'fire service & civil defence'
  and slug is null;

update public.listings set
  slug = 'emergency-e04',
  title_bn = 'নারী ও শিশু নির্যাতন হেল্পলাইন',
  title_en = 'Women & Children Helpline',
  description_bn = 'নারী ও শিশুর প্রতি সহিংসতা প্রতিরোধে গোপনীয় সহায়তা।',
  description_en = 'Confidential support against violence towards women and children.',
  category_group = 'emergency',
  icon = 'phone',
  scope = 'national',
  tone = 'primary',
  available_24 = true,
  priority = 3,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'women & children helpline'
  and slug is null;

update public.listings set
  slug = 'emergency-e05',
  title_bn = 'জাতীয় স্বাস্থ্য বাতায়ন',
  title_en = 'National Health Line',
  description_bn = 'ফোনে চিকিৎসা পরামর্শ ও স্বাস্থ্য সংক্রান্ত তথ্য।',
  description_en = 'Medical advice and health information over the phone.',
  category_group = 'emergency',
  icon = 'heart-pulse',
  scope = 'national',
  tone = 'primary',
  available_24 = true,
  priority = 4,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'national health line'
  and slug is null;

update public.listings set
  slug = 'emergency-e06',
  title_bn = 'কুষ্টিয়া সদর হাসপাতাল — জরুরি বিভাগ',
  title_en = 'Kushtia Sadar Hospital — Emergency',
  short_bn = 'হাসপাতাল',
  short_en = 'Hospital',
  description_bn = 'জেলা পর্যায়ের জরুরি বিভাগ, ২৪ ঘণ্টা খোলা।',
  description_en = 'District-level emergency department, open around the clock.',
  address_bn = 'হাসপাতাল রোড, কুষ্টিয়া সদর',
  address_en = 'Hospital Road, Kushtia Sadar',
  lat = 23.9073,
  lng = 89.11659999999999,
  category_group = 'emergency',
  icon = 'hospital',
  scope = 'local',
  tone = 'danger',
  available_24 = true,
  priority = 5,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'kushtia sadar hospital — emergency'
  and slug is null;

update public.listings set
  slug = 'emergency-e07',
  title_bn = 'কুষ্টিয়া অ্যাম্বুলেন্স সার্ভিস',
  title_en = 'Kushtia Ambulance Service',
  short_bn = 'অ্যাম্বুলেন্স',
  short_en = 'Ambulance',
  description_bn = 'অক্সিজেনসহ ২৪ ঘণ্টা অ্যাম্বুলেন্স, জেলার ভেতরে ও বাইরে।',
  description_en = '24-hour ambulance with oxygen, inside and outside the district.',
  address_bn = 'এন.এস. রোড, কুষ্টিয়া সদর',
  address_en = 'N.S. Road, Kushtia Sadar',
  lat = 23.8983,
  lng = 89.1276,
  category_group = 'emergency',
  icon = 'ambulance',
  scope = 'local',
  tone = 'danger',
  available_24 = true,
  priority = 6,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'kushtia ambulance service'
  and slug is null;

update public.listings set
  slug = 'emergency-e08',
  title_bn = 'কুষ্টিয়া ফায়ার স্টেশন',
  title_en = 'Kushtia Fire Station',
  description_bn = 'স্থানীয় অগ্নিনির্বাপণ ও উদ্ধার ইউনিট।',
  description_en = 'Local fire-fighting and rescue unit.',
  address_bn = 'থানা মোড়, কুষ্টিয়া সদর',
  address_en = 'Thana Mor, Kushtia Sadar',
  lat = 23.9103,
  lng = 89.12559999999999,
  category_group = 'emergency',
  icon = 'flame',
  scope = 'local',
  tone = 'danger',
  available_24 = true,
  priority = 7,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'kushtia fire station'
  and slug is null;

update public.listings set
  slug = 'emergency-e09',
  title_bn = 'বিদ্যুৎ জরুরি সেবা (পল্লী বিদ্যুৎ)',
  title_en = 'Electricity Emergency (Palli Bidyut)',
  description_bn = 'বিদ্যুৎ বিভ্রাট, ছেঁড়া তার ও ট্রান্সফরমার সমস্যায় জরুরি ডাক।',
  description_en = 'Outages, fallen lines and transformer faults — urgent call-outs.',
  address_bn = 'চৌড়হাস, কুষ্টিয়া সদর',
  address_en = 'Chowrhas, Kushtia Sadar',
  lat = 23.8933,
  lng = 89.1146,
  category_group = 'emergency',
  icon = 'zap',
  scope = 'local',
  tone = 'primary',
  available_24 = true,
  priority = 8,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'electricity emergency (palli bidyut)'
  and slug is null;

update public.listings set
  slug = 'emergency-e10',
  title_bn = 'কুষ্টিয়া মডেল থানা',
  title_en = 'Kushtia Model Police Station',
  description_bn = 'সদর এলাকার থানা — সাধারণ ডায়েরি ও অভিযোগ।',
  description_en = 'Station covering the Sadar area — general diary and complaints.',
  address_bn = 'থানা রোড, কুষ্টিয়া সদর',
  address_en = 'Thana Road, Kushtia Sadar',
  lat = 23.903299999999998,
  lng = 89.13159999999999,
  category_group = 'emergency',
  icon = 'shield',
  scope = 'local',
  tone = 'primary',
  available_24 = true,
  priority = 9,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'kushtia model police station'
  and slug is null;

update public.listings set
  slug = 'emergency-e11',
  title_bn = 'ব্লাড ব্যাংক জরুরি লাইন',
  title_en = 'Blood Bank Emergency Line',
  short_bn = 'ব্লাড ব্যাংক',
  short_en = 'Blood Bank',
  description_bn = 'জরুরি রক্তের প্রয়োজনে সরাসরি যোগাযোগ।',
  description_en = 'Direct line when blood is needed urgently.',
  address_bn = 'কোর্ট পাড়া, কুষ্টিয়া সদর',
  address_en = 'Court Para, Kushtia Sadar',
  lat = 23.9053,
  lng = 89.1116,
  category_group = 'emergency',
  icon = 'droplet',
  scope = 'local',
  tone = 'danger',
  available_24 = true,
  priority = 10,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'blood bank emergency line'
  and slug is null;

update public.listings set
  slug = 'emergency-e12',
  title_bn = 'পানি সরবরাহ জরুরি সেবা',
  title_en = 'Water Supply Emergency',
  description_bn = 'পৌরসভার পানির লাইন ফেটে যাওয়া বা সরবরাহ বন্ধ হলে।',
  description_en = 'Burst municipal mains or an interrupted supply.',
  address_bn = 'পৌরসভা ভবন, কুষ্টিয়া',
  address_en = 'Municipality Building, Kushtia',
  lat = 23.8963,
  lng = 89.1236,
  category_group = 'emergency',
  icon = 'droplets',
  scope = 'local',
  tone = 'neutral',
  available_24 = false,
  priority = 11,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'water supply emergency'
  and slug is null;

update public.listings set
  slug = 'emergency-e13',
  title_bn = 'গ্যাস জরুরি সেবা',
  title_en = 'Gas Emergency Service',
  description_bn = 'গ্যাস লিক বা সিলিন্ডার দুর্ঘটনায় জরুরি সহায়তা।',
  description_en = 'Gas leaks and cylinder incidents.',
  address_bn = 'মজমপুর, কুষ্টিয়া সদর',
  address_en = 'Mojompur, Kushtia Sadar',
  lat = 23.9123,
  lng = 89.1186,
  category_group = 'emergency',
  icon = 'flame',
  scope = 'local',
  tone = 'neutral',
  available_24 = false,
  priority = 12,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'gas emergency service'
  and slug is null;

update public.listings set
  slug = 'emergency-e14',
  title_bn = 'জেলা প্রশাসক কার্যালয় — দুর্যোগ সেল',
  title_en = 'DC Office — Disaster Cell',
  description_bn = 'বন্যা, ঝড় ও বড় দুর্যোগে সমন্বয় ও ত্রাণ তথ্য।',
  description_en = 'Coordination and relief information during floods and storms.',
  address_bn = 'জেলা প্রশাসক কার্যালয়, কুষ্টিয়া',
  address_en = 'DC Office, Kushtia',
  lat = 23.900299999999998,
  lng = 89.1086,
  category_group = 'emergency',
  icon = 'shield',
  scope = 'local',
  tone = 'neutral',
  available_24 = false,
  priority = 13,
  updated_at = now()
where lower(trim(section)) = 'emergency'
  and lower(trim(title)) = 'dc office — disaster cell'
  and slug is null;

update public.listings set
  slug = 'kushtia-general-hospital',
  featured = true,
  title_bn = 'কুষ্টিয়া জেনারেল হাসপাতাল',
  title_en = 'Kushtia General Hospital',
  description_bn = 'কুষ্টিয়া শহরের সরকারি জেনারেল হাসপাতাল। জরুরি বিভাগ, বহির্বিভাগ, আন্তঃবিভাগ ও ব্লাড ব্যাংক সেবা এখানে পাওয়া যায়।',
  description_en = 'The government general hospital serving Kushtia town, with emergency, outpatient, inpatient and blood bank services.',
  address_bn = 'হাসপাতাল রোড, কুষ্টিয়া সদর',
  address_en = 'Hospital Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"আইসিইউ","en":"ICU"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"ব্লাড ব্যাংক","en":"Blood Bank"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"প্রসূতি সেবা","en":"Maternity"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"শিশু বিভাগ","en":"Pediatrics"},{"bn":"অর্থোপেডিকস","en":"Orthopedics"},{"bn":"কার্ডিওলজি","en":"Cardiology"},{"bn":"নাক কান গলা","en":"ENT"},{"bn":"চক্ষু","en":"Ophthalmology"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"সিবিসি","en":"CBC"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"}]'::jsonb,
  aliases = '["sadar hospital","general hospital","সদর হাসপাতাল"]'::jsonb,
  emergency_24 = true,
  doctor_ids = '["dr-refaz-uddin","dr-anisur-rahman"]'::jsonb,
  source = '{"kind":"dghs","note":{"bn":"স্বাস্থ্য অধিদপ্তর (DGHS) তালিকা","en":"Directorate General of Health Services listing"},"url":"https://dghs.gov.bd/","verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia general hospital'
  and slug is null;

update public.listings set
  slug = 'kushtia-medical-college-hospital',
  featured = true,
  title_bn = 'কুষ্টিয়া মেডিকেল কলেজ হাসপাতাল',
  title_en = 'Kushtia Medical College Hospital',
  description_bn = 'কুষ্টিয়া মেডিকেল কলেজের সংযুক্ত সরকারি হাসপাতাল। বিশেষায়িত বিভাগ, আইসিইউ ও শিক্ষানবিশ চিকিৎসা সেবা রয়েছে।',
  description_en = 'The teaching hospital attached to Kushtia Medical College, carrying specialist departments and intensive care.',
  address_bn = 'জুগিয়া, কুষ্টিয়া সদর',
  address_en = 'Jugia, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"আইসিইউ","en":"ICU"},{"bn":"সিসিইউ","en":"CCU"},{"bn":"এনআইসিইউ","en":"NICU"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"},{"bn":"ব্লাড ব্যাংক","en":"Blood Bank"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডায়ালাইসিস","en":"Dialysis"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"কার্ডিওলজি","en":"Cardiology"},{"bn":"নিউরোলজি","en":"Neurology"},{"bn":"নেফ্রোলজি","en":"Nephrology"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"শিশু বিভাগ","en":"Pediatrics"},{"bn":"অর্থোপেডিকস","en":"Orthopedics"},{"bn":"চর্মরোগ","en":"Dermatology"},{"bn":"নাক কান গলা","en":"ENT"},{"bn":"চক্ষু","en":"Ophthalmology"},{"bn":"মানসিক রোগ","en":"Psychiatry"}]'::jsonb,
  tests = '[{"bn":"সিটি স্ক্যান","en":"CT Scan"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"ইকো","en":"Echocardiogram"},{"bn":"এন্ডোস্কপি","en":"Endoscopy"},{"bn":"সিবিসি","en":"CBC"},{"bn":"হিস্টোপ্যাথলজি","en":"Histopathology"},{"bn":"মাইক্রোবায়োলজি","en":"Microbiology"}]'::jsonb,
  aliases = '["kmch","medical college","মেডিকেল কলেজ"]'::jsonb,
  emergency_24 = true,
  doctor_ids = '["dr-sharmin-sultana","dr-kamrul-hasan"]'::jsonb,
  source = '{"kind":"dghs","note":{"bn":"স্বাস্থ্য অধিদপ্তর (DGHS) তালিকা","en":"Directorate General of Health Services listing"},"url":"https://dghs.gov.bd/","verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia medical college hospital'
  and slug is null;

update public.listings set
  slug = 'ad-din-hospital-kushtia',
  featured = true,
  title_bn = 'আদ-দ্বীন হাসপাতাল কুষ্টিয়া',
  title_en = 'Ad-Din Hospital Kushtia',
  description_bn = 'আদ-দ্বীন ফাউন্ডেশন পরিচালিত বেসরকারি হাসপাতাল। প্রসূতি ও শিশু সেবার জন্য পরিচিত।',
  description_en = 'A private hospital run by the Ad-Din Foundation, known locally for maternity and child care.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"প্রসূতি সেবা","en":"Maternity"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"ফার্মেসি","en":"Pharmacy"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"},{"bn":"টিকাদান","en":"Vaccination"}]'::jsonb,
  departments = '[{"bn":"গাইনি","en":"Gynecology"},{"bn":"শিশু বিভাগ","en":"Pediatrics"},{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"সিবিসি","en":"CBC"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"}]'::jsonb,
  aliases = '["ad din","addin","আদ দ্বীন"]'::jsonb,
  emergency_24 = true,
  doctor_ids = '["dr-nazma-parveen"]'::jsonb,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'ad-din hospital kushtia'
  and slug is null;

update public.listings set
  slug = 'sono-hospital-limited',
  featured = true,
  title_bn = 'সনো হাসপাতাল লিমিটেড',
  title_en = 'Sono Hospital Limited',
  description_bn = 'কুষ্টিয়ার বেসরকারি হাসপাতাল, একই প্রাঙ্গণে ডায়াগনস্টিক সেবা ও বিশেষজ্ঞ চেম্বার রয়েছে।',
  description_en = 'A private hospital in Kushtia with diagnostic services and specialist chambers on the same premises.',
  address_bn = 'কলেজ মোড়, কুষ্টিয়া',
  address_en = 'College Mor, Kushtia',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"আইসিইউ","en":"ICU"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ফার্মেসি","en":"Pharmacy"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"}]'::jsonb,
  departments = '[{"bn":"কার্ডিওলজি","en":"Cardiology"},{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"অর্থোপেডিকস","en":"Orthopedics"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"গ্যাস্ট্রোএন্টারোলজি","en":"Gastroenterology"}]'::jsonb,
  tests = '[{"bn":"সিটি স্ক্যান","en":"CT Scan"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"ইকো","en":"Echocardiogram"},{"bn":"ইটিটি","en":"ETT"},{"bn":"এন্ডোস্কপি","en":"Endoscopy"},{"bn":"সিবিসি","en":"CBC"},{"bn":"লিপিড প্রোফাইল","en":"Lipid Profile"}]'::jsonb,
  aliases = '["sono","sono hospital","সনো"]'::jsonb,
  appointment_phone = '+880 1700-000-244',
  emergency_24 = true,
  doctor_ids = '["dr-refaz-uddin","dr-mahbub-alam"]'::jsonb,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'sono hospital limited'
  and slug is null;

update public.listings set
  slug = 'dar-us-shefa-private-hospital',
  featured = false,
  title_bn = 'দার-উস শেফা প্রাইভেট হাসপাতাল',
  title_en = 'Dar-Us Shefa Private Hospital',
  description_bn = 'কুষ্টিয়া শহরের বেসরকারি হাসপাতাল — সাধারণ চিকিৎসা, সার্জারি ও ভর্তি সেবা।',
  description_en = 'A private hospital in Kushtia town offering general medicine, surgery and inpatient care.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ফার্মেসি","en":"Pharmacy"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"অর্থোপেডিকস","en":"Orthopedics"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["darus shefa","dar us shifa","শেফা"]'::jsonb,
  emergency_24 = true,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dar-us shefa private hospital'
  and slug is null;

update public.listings set
  slug = 'kushtia-trauma-center',
  featured = false,
  title_bn = 'কুষ্টিয়া ট্রমা সেন্টার',
  title_en = 'Kushtia Trauma Center',
  description_bn = 'দুর্ঘটনা ও হাড়-সংক্রান্ত জরুরি চিকিৎসার জন্য বিশেষায়িত কেন্দ্র।',
  description_en = 'A centre focused on accident, trauma and orthopedic emergency care.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"জরুরি বিভাগ","en":"Emergency"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"ফিজিওথেরাপি","en":"Physiotherapy"},{"bn":"অ্যাম্বুলেন্স","en":"Ambulance"},{"bn":"ইমেজিং","en":"Imaging"}]'::jsonb,
  departments = '[{"bn":"অর্থোপেডিকস","en":"Orthopedics"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"মেডিসিন","en":"Medicine"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"সিটি স্ক্যান","en":"CT Scan"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"}]'::jsonb,
  aliases = '["trauma","ট্রমা"]'::jsonb,
  emergency_24 = true,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia trauma center'
  and slug is null;

update public.listings set
  slug = 'kushtia-surgical-clinic',
  featured = false,
  title_bn = 'কুষ্টিয়া সার্জিক্যাল ক্লিনিক',
  title_en = 'Kushtia Surgical Clinic',
  description_bn = 'অস্ত্রোপচার ও ভর্তি সেবার জন্য পরিচিত কুষ্টিয়ার একটি বেসরকারি প্রতিষ্ঠান।',
  description_en = 'A private surgical facility in Kushtia providing operative and inpatient care.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"সার্জারি","en":"Surgery"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"অর্থোপেডিকস","en":"Orthopedics"},{"bn":"ইউরোলজি","en":"Urology"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["surgical clinic","সার্জিক্যাল"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia surgical clinic'
  and slug is null;

update public.listings set
  slug = 'rotary-eye-hospital-kushtia',
  featured = false,
  title_bn = 'রোটারি চক্ষু হাসপাতাল',
  title_en = 'Rotary Eye Hospital',
  description_bn = 'চক্ষু চিকিৎসা ও ছানি অপারেশনে বিশেষায়িত হাসপাতাল।',
  description_en = 'An eye hospital specialising in ophthalmic treatment and cataract surgery.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"চক্ষু অস্ত্রোপচার","en":"Eye Surgery"},{"bn":"ছানি অপারেশন","en":"Cataract Surgery"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"চশমা","en":"Spectacles"}]'::jsonb,
  departments = '[{"bn":"চক্ষু","en":"Ophthalmology"}]'::jsonb,
  aliases = '["rotary","eye hospital","চক্ষু হাসপাতাল"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'rotary eye hospital'
  and slug is null;

update public.listings set
  slug = 'dristi-eye-hospital-kushtia',
  featured = false,
  title_bn = 'দৃষ্টি চক্ষু হাসপাতাল কুষ্টিয়া',
  title_en = 'Dristi Eye Hospital Kushtia',
  description_bn = 'চক্ষু পরীক্ষা, ছানি অপারেশন ও চশমার সেবা দেয় এমন বেসরকারি চক্ষু হাসপাতাল।',
  description_en = 'A private eye hospital offering eye examination, cataract surgery and spectacles.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"চক্ষু অস্ত্রোপচার","en":"Eye Surgery"},{"bn":"ছানি অপারেশন","en":"Cataract Surgery"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"চশমা","en":"Spectacles"}]'::jsonb,
  departments = '[{"bn":"চক্ষু","en":"Ophthalmology"}]'::jsonb,
  aliases = '["dristi","drishti","দৃষ্টি"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dristi eye hospital kushtia'
  and slug is null;

update public.listings set
  slug = 'agha-yusuf-adhunik-hospital',
  featured = false,
  title_bn = 'আগা ইউসুফ আধুনিক হাসপাতাল',
  title_en = 'Agha Yusuf Adhunik Hospital',
  description_bn = 'কুষ্টিয়ার একটি বেসরকারি হাসপাতাল — বহির্বিভাগ, ভর্তি ও ডায়াগনস্টিক সেবা।',
  description_en = 'A private hospital in Kushtia with outpatient, inpatient and diagnostic services.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ফার্মেসি","en":"Pharmacy"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"গাইনি","en":"Gynecology"},{"bn":"শিশু বিভাগ","en":"Pediatrics"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["agha yusuf","adhunik","আধুনিক হাসপাতাল"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'agha yusuf adhunik hospital'
  and slug is null;

update public.listings set
  slug = 'islamia-hospital-kushtia',
  featured = false,
  title_bn = 'ইসলামিয়া হাসপাতাল',
  title_en = 'Islamia Hospital',
  description_bn = 'কুষ্টিয়ার বেসরকারি হাসপাতাল — সাধারণ চিকিৎসা, ভর্তি ও বিশেষজ্ঞ চেম্বার।',
  description_en = 'A private hospital in Kushtia offering general treatment, admission and specialist chambers.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"শিশু বিভাগ","en":"Pediatrics"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["islamia","ইসলামিয়া"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'islamia hospital'
  and slug is null;

update public.listings set
  slug = 'pstc-model-clinic-kushtia',
  featured = true,
  title_bn = 'পিএসটিসি মডেল ক্লিনিক কুষ্টিয়া',
  title_en = 'PSTC Model Clinic Kushtia',
  description_bn = 'পপুলেশন সার্ভিসেস অ্যান্ড ট্রেনিং সেন্টার পরিচালিত ক্লিনিক — মা ও শিশু স্বাস্থ্য এবং পরিবার পরিকল্পনা সেবা।',
  description_en = 'A clinic run by the Population Services and Training Centre, focused on maternal and child health and family planning.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"প্রসূতি সেবা","en":"Maternity"},{"bn":"পরিবার পরিকল্পনা","en":"Family Planning"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"কাউন্সেলিং","en":"Counselling"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"গাইনি","en":"Gynecology"},{"bn":"শিশু বিভাগ","en":"Pediatrics"},{"bn":"মেডিসিন","en":"Medicine"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"}]'::jsonb,
  aliases = '["pstc","model clinic","পিএসটিসি"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'pstc model clinic kushtia'
  and slug is null;

update public.listings set
  slug = 'new-jonosheba-clinic',
  featured = false,
  title_bn = 'নিউ জনসেবা ক্লিনিক',
  title_en = 'New Jonosheba Clinic',
  description_bn = 'কুষ্টিয়া শহরের ক্লিনিক — বহির্বিভাগ, ভর্তি ও ছোট অস্ত্রোপচারের সেবা।',
  description_en = 'A Kushtia town clinic providing outpatient care, admission and minor surgery.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"গাইনি","en":"Gynecology"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"}]'::jsonb,
  aliases = '["jonosheba","janasheba","জনসেবা"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'new jonosheba clinic'
  and slug is null;

update public.listings set
  slug = 'alo-health-center',
  featured = false,
  title_bn = 'আলো হেলথ সেন্টার',
  title_en = 'Alo Health Center',
  description_bn = 'প্রাথমিক স্বাস্থ্যসেবা ও পরামর্শ কেন্দ্র।',
  description_en = 'A primary healthcare and consultation centre.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"কাউন্সেলিং","en":"Counselling"},{"bn":"টিকাদান","en":"Vaccination"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"শিশু বিভাগ","en":"Pediatrics"}]'::jsonb,
  tests = '[{"bn":"সিবিসি","en":"CBC"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"}]'::jsonb,
  aliases = '["alo","আলো"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'alo health center'
  and slug is null;

update public.listings set
  slug = 'daulatpur-clinic',
  featured = false,
  title_bn = 'দৌলতপুর ক্লিনিক',
  title_en = 'Daulatpur Clinic',
  description_bn = 'দৌলতপুর উপজেলার ক্লিনিক — বহির্বিভাগ, ভর্তি ও প্রসূতি সেবা।',
  description_en = 'A clinic in Daulatpur upazila providing outpatient, inpatient and maternity care.',
  area_id = 'daulatpur',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"প্রসূতি সেবা","en":"Maternity"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"গাইনি","en":"Gynecology"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["daulatpur","দৌলতপুর"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'daulatpur clinic'
  and slug is null;

update public.listings set
  slug = 'modern-clinic-kushtia',
  featured = false,
  title_bn = 'মডার্ন ক্লিনিক',
  title_en = 'Modern Clinic',
  description_bn = 'কুষ্টিয়ার ক্লিনিক — সাধারণ চিকিৎসা ও বিশেষজ্ঞ চেম্বার।',
  description_en = 'A Kushtia clinic offering general treatment and specialist chambers.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"প্যাথলজি","en":"Pathology"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"সার্জারি","en":"Surgery"}]'::jsonb,
  tests = '[{"bn":"সিবিসি","en":"CBC"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"}]'::jsonb,
  aliases = '["modern","মডার্ন"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'modern clinic'
  and slug is null;

update public.listings set
  slug = 'alhaj-clinic',
  featured = false,
  title_bn = 'আলহাজ ক্লিনিক',
  title_en = 'Alhaj Clinic',
  description_bn = 'কুষ্টিয়ার ক্লিনিক — বহির্বিভাগ ও ভর্তি সেবা।',
  description_en = 'A Kushtia clinic providing outpatient and inpatient services.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"},{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"}]'::jsonb,
  departments = '[{"bn":"মেডিসিন","en":"Medicine"},{"bn":"গাইনি","en":"Gynecology"}]'::jsonb,
  aliases = '["alhaj","al haj","আলহাজ"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'alhaj clinic'
  and slug is null;

update public.listings set
  slug = 'kohinur-nursing-home',
  featured = false,
  title_bn = 'কোহিনূর নার্সিং হোম',
  title_en = 'Kohinur Nursing Home',
  description_bn = 'নার্সিং হোম — ভর্তি সেবা, প্রসূতি ও ছোট অস্ত্রোপচার।',
  description_en = 'A nursing home offering admission, maternity care and minor surgery.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"প্রসূতি সেবা","en":"Maternity"},{"bn":"অপারেশন থিয়েটার","en":"Operation Theatre"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"}]'::jsonb,
  departments = '[{"bn":"গাইনি","en":"Gynecology"},{"bn":"সার্জারি","en":"Surgery"},{"bn":"মেডিসিন","en":"Medicine"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["kohinur","nursing home","কোহিনূর"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kohinur nursing home'
  and slug is null;

update public.listings set
  slug = 'joymon-clinic-nursing-home',
  featured = false,
  title_bn = 'জয়মন ক্লিনিক অ্যান্ড নার্সিং হোম',
  title_en = 'Joymon Clinic & Nursing Home',
  description_bn = 'ক্লিনিক ও নার্সিং হোম — ভর্তি, প্রসূতি ও বিশেষজ্ঞ পরামর্শ সেবা।',
  description_en = 'A clinic and nursing home offering admission, maternity care and specialist consultation.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"আন্তঃবিভাগ","en":"Inpatient"},{"bn":"প্রসূতি সেবা","en":"Maternity"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"বহির্বিভাগ","en":"Outdoor (OPD)"}]'::jsonb,
  departments = '[{"bn":"গাইনি","en":"Gynecology"},{"bn":"মেডিসিন","en":"Medicine"},{"bn":"শিশু বিভাগ","en":"Pediatrics"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"সিবিসি","en":"CBC"}]'::jsonb,
  aliases = '["joymon","জয়মন"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'joymon clinic & nursing home'
  and slug is null;

update public.listings set
  slug = 'kushtia-general-hospital-blood-bank',
  featured = true,
  title_bn = 'কুষ্টিয়া জেনারেল হাসপাতাল ব্লাড ব্যাংক',
  title_en = 'Kushtia General Hospital Blood Bank',
  description_bn = 'কুষ্টিয়া জেনারেল হাসপাতালের ভেতরে সরকারি ব্লাড ব্যাংক — রক্ত সংগ্রহ, স্ক্রিনিং ও সরবরাহ।',
  description_en = 'The government blood bank inside Kushtia General Hospital, handling collection, screening and supply.',
  address_bn = 'হাসপাতাল রোড, কুষ্টিয়া সদর',
  address_en = 'Hospital Road, Kushtia Sadar',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"রক্তদান","en":"Blood Donation"},{"bn":"রক্তের গ্রুপ নির্ণয়","en":"Blood Grouping"},{"bn":"রক্ত স্ক্রিনিং","en":"Blood Screening"},{"bn":"২৪ ঘণ্টা খোলা","en":"Open 24 Hours"}]'::jsonb,
  aliases = '["sadar hospital blood bank","সরকারি ব্লাড ব্যাংক"]'::jsonb,
  emergency_24 = true,
  source = '{"kind":"dghs","note":{"bn":"স্বাস্থ্য অধিদপ্তর (DGHS) তালিকা","en":"Directorate General of Health Services listing"},"url":"https://dghs.gov.bd/","verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia general hospital blood bank'
  and slug is null;

update public.listings set
  slug = 'kushtia-blood-bank-transfusion-center',
  featured = false,
  title_bn = 'কুষ্টিয়া ব্লাড ব্যাংক অ্যান্ড ট্রান্সফিউশন সেন্টার',
  title_en = 'Kushtia Blood Bank & Transfusion Center',
  description_bn = 'রক্ত সংগ্রহ, সংরক্ষণ ও ট্রান্সফিউশন সেবা প্রদানকারী কেন্দ্র।',
  description_en = 'A centre providing blood collection, storage and transfusion services.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"রক্তদান","en":"Blood Donation"},{"bn":"রক্তের গ্রুপ নির্ণয়","en":"Blood Grouping"},{"bn":"রক্ত স্ক্রিনিং","en":"Blood Screening"},{"bn":"ডোনার খোঁজ","en":"Donor Search"}]'::jsonb,
  aliases = '["transfusion","ট্রান্সফিউশন"]'::jsonb,
  emergency_24 = true,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'kushtia blood bank & transfusion center'
  and slug is null;

update public.listings set
  slug = 'bangladesh-red-crescent-kushtia-unit',
  featured = true,
  title_bn = 'বাংলাদেশ রেড ক্রিসেন্ট সোসাইটি — কুষ্টিয়া ইউনিট',
  title_en = 'Bangladesh Red Crescent Society — Kushtia Unit',
  description_bn = 'রেড ক্রিসেন্ট সোসাইটির কুষ্টিয়া ইউনিট — স্বেচ্ছায় রক্তদান কর্মসূচি ও ডোনার সহায়তা।',
  description_en = 'The Kushtia unit of the Red Crescent Society, running voluntary blood donation drives and donor support.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  website = 'https://bdrcs.org/',
  review_count = 0,
  hours = '[[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}],[{"open":540,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"রক্তদান","en":"Blood Donation"},{"bn":"ডোনার খোঁজ","en":"Donor Search"},{"bn":"রক্তের গ্রুপ নির্ণয়","en":"Blood Grouping"},{"bn":"কাউন্সেলিং","en":"Counselling"}]'::jsonb,
  aliases = '["red crescent","redcrescent","রেড ক্রিসেন্ট"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"official","note":{"bn":"বাংলাদেশ রেড ক্রিসেন্ট সোসাইটি","en":"Bangladesh Red Crescent Society"},"url":"https://bdrcs.org/","verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'bangladesh red crescent society — kushtia unit'
  and slug is null;

update public.listings set
  slug = 'amin-pharmacy-kushtia',
  featured = true,
  title_bn = 'আমিন ফার্মেসি',
  title_en = 'Amin Pharmacy',
  description_bn = 'কুষ্টিয়ার ওষুধের দোকান — প্রেসক্রিপশন ও সাধারণ ওষুধ।',
  description_en = 'A Kushtia pharmacy stocking prescription and general medicine.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Medicine Retail"},{"bn":"প্রেসক্রিপশন ওষুধ","en":"Prescription Medicine"},{"bn":"সার্জিক্যাল সামগ্রী","en":"Surgical Supplies"}]'::jsonb,
  aliases = '["amin","আমিন"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'amin pharmacy'
  and slug is null;

update public.listings set
  slug = '24-7-pharmacy-kushtia',
  featured = true,
  title_bn = '২৪/৭ ফার্মেসি',
  title_en = '24/7 Pharmacy',
  description_bn = 'সারা দিন-রাত খোলা থাকে এমন ফার্মেসি — রাতের জরুরি ওষুধের জন্য।',
  description_en = 'A round-the-clock pharmacy, useful for emergency medicine at night.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"২৪ ঘণ্টা খোলা","en":"Open 24 Hours"},{"bn":"ওষুধ বিক্রয়","en":"Medicine Retail"},{"bn":"প্রেসক্রিপশন ওষুধ","en":"Prescription Medicine"},{"bn":"হোম ডেলিভারি","en":"Home Delivery"}]'::jsonb,
  aliases = '["24 7","247","twenty four seven"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = '24/7 pharmacy'
  and slug is null;

update public.listings set
  slug = 'ms-rasel-pharmacy',
  featured = false,
  title_bn = 'মেসার্স রাসেল ফার্মেসি',
  title_en = 'M/S Rasel Pharmacy',
  description_bn = 'কুষ্টিয়ার ওষুধের দোকান — সাধারণ ও প্রেসক্রিপশন ওষুধ।',
  description_en = 'A Kushtia medicine shop carrying general and prescription medicine.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}],[{"open":480,"close":1320}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"ওষুধ বিক্রয়","en":"Medicine Retail"},{"bn":"প্রেসক্রিপশন ওষুধ","en":"Prescription Medicine"}]'::jsonb,
  aliases = '["rasel","russell","রাসেল"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'm/s rasel pharmacy'
  and slug is null;

update public.listings set
  slug = 'ad-din-hospital-pharmacy',
  featured = false,
  title_bn = 'আদ-দ্বীন হাসপাতাল ফার্মেসি',
  title_en = 'Ad-Din Hospital Pharmacy',
  description_bn = 'আদ-দ্বীন হাসপাতালের নিজস্ব ফার্মেসি — হাসপাতালের রোগীদের জন্য ওষুধ সরবরাহ।',
  description_en = 'The in-house pharmacy of Ad-Din Hospital, supplying medicine to hospital patients.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  always_open = true,
  services = '[{"bn":"প্রেসক্রিপশন ওষুধ","en":"Prescription Medicine"},{"bn":"ওষুধ বিক্রয়","en":"Medicine Retail"},{"bn":"সার্জিক্যাল সামগ্রী","en":"Surgical Supplies"},{"bn":"২৪ ঘণ্টা খোলা","en":"Open 24 Hours"}]'::jsonb,
  aliases = '["ad din pharmacy","আদ দ্বীন ফার্মেসি"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'ad-din hospital pharmacy'
  and slug is null;

update public.listings set
  slug = 'sono-diagnostic-center',
  featured = true,
  title_bn = 'সনো ডায়াগনস্টিক সেন্টার',
  title_en = 'Sono Diagnostic Center',
  description_bn = 'কুষ্টিয়ার ডায়াগনস্টিক সেন্টার — প্যাথলজি, ইমেজিং ও বিশেষজ্ঞ চেম্বার একসাথে।',
  description_en = 'A Kushtia diagnostic centre combining pathology, imaging and specialist chambers.',
  address_bn = 'কলেজ মোড়, কুষ্টিয়া',
  address_en = 'College Mor, Kushtia',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"বাসা থেকে নমুনা সংগ্রহ","en":"Home Sample Collection"},{"bn":"অনলাইন রিপোর্ট","en":"Online Report"}]'::jsonb,
  tests = '[{"bn":"সিটি স্ক্যান","en":"CT Scan"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"ইকো","en":"Echocardiogram"},{"bn":"সিবিসি","en":"CBC"},{"bn":"লিপিড প্রোফাইল","en":"Lipid Profile"},{"bn":"লিভার ফাংশন","en":"Liver Function Test"},{"bn":"কিডনি ফাংশন","en":"Kidney Function Test"},{"bn":"থাইরয়েড","en":"Thyroid Profile"}]'::jsonb,
  aliases = '["sono","sono diagnostic","সনো ডায়াগনস্টিক"]'::jsonb,
  emergency_24 = false,
  doctor_ids = '["dr-refaz-uddin"]'::jsonb,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'sono diagnostic center'
  and slug is null;

update public.listings set
  slug = 'popular-diagnostic-centre-kushtia',
  featured = true,
  title_bn = 'পপুলার ডায়াগনস্টিক সেন্টার কুষ্টিয়া',
  title_en = 'Popular Diagnostic Centre Kushtia',
  description_bn = 'পপুলার ডায়াগনস্টিকের কুষ্টিয়া শাখা — প্যাথলজি, ইমেজিং ও বিশেষজ্ঞ চেম্বার।',
  description_en = 'The Kushtia branch of Popular Diagnostic, offering pathology, imaging and specialist chambers.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"অনলাইন রিপোর্ট","en":"Online Report"},{"bn":"বাসা থেকে নমুনা সংগ্রহ","en":"Home Sample Collection"}]'::jsonb,
  tests = '[{"bn":"সিটি স্ক্যান","en":"CT Scan"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"ইকো","en":"Echocardiogram"},{"bn":"ইটিটি","en":"ETT"},{"bn":"এন্ডোস্কপি","en":"Endoscopy"},{"bn":"সিবিসি","en":"CBC"},{"bn":"থাইরয়েড","en":"Thyroid Profile"},{"bn":"হরমোন পরীক্ষা","en":"Hormone Test"},{"bn":"হিস্টোপ্যাথলজি","en":"Histopathology"}]'::jsonb,
  aliases = '["popular","পপুলার"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'popular diagnostic centre kushtia'
  and slug is null;

update public.listings set
  slug = 'amin-diagnostic-medical-services',
  featured = false,
  title_bn = 'আমিন ডায়াগনস্টিক অ্যান্ড মেডিকেল সার্ভিসেস',
  title_en = 'Amin Diagnostic & Medical Services',
  description_bn = 'কুষ্টিয়ার ডায়াগনস্টিক ও মেডিকেল সার্ভিস সেন্টার।',
  description_en = 'A diagnostic and medical services centre in Kushtia.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"সিবিসি","en":"CBC"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"},{"bn":"লিভার ফাংশন","en":"Liver Function Test"}]'::jsonb,
  aliases = '["amin","আমিন"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'amin diagnostic & medical services'
  and slug is null;

update public.listings set
  slug = 'dolphin-diagnostic-centre',
  featured = false,
  title_bn = 'ডলফিন ডায়াগনস্টিক সেন্টার',
  title_en = 'Dolphin Diagnostic Centre',
  description_bn = 'ডায়াগনস্টিক সেন্টার — প্যাথলজি ও আল্ট্রাসনোগ্রাম সেবা।',
  description_en = 'A diagnostic centre offering pathology and ultrasound services.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"}]'::jsonb,
  tests = '[{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"সিবিসি","en":"CBC"},{"bn":"প্রস্রাব পরীক্ষা","en":"Urine Test"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"}]'::jsonb,
  aliases = '["dolphin","ডলফিন"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dolphin diagnostic centre'
  and slug is null;

update public.listings set
  slug = 'shefa-diagnostic-center',
  featured = false,
  title_bn = 'শেফা ডায়াগনস্টিক সেন্টার',
  title_en = 'Shefa Diagnostic Center',
  description_bn = 'কুষ্টিয়ার ডায়াগনস্টিক সেন্টার — প্যাথলজি ও ইমেজিং পরীক্ষা।',
  description_en = 'A Kushtia diagnostic centre for pathology and imaging tests.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"}]'::jsonb,
  tests = '[{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"সিবিসি","en":"CBC"},{"bn":"থাইরয়েড","en":"Thyroid Profile"}]'::jsonb,
  aliases = '["shefa","shifa","শেফা"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'shefa diagnostic center'
  and slug is null;

update public.listings set
  slug = 'the-comfort-diagnostic-centre',
  featured = false,
  title_bn = 'দ্য কমফোর্ট ডায়াগনস্টিক সেন্টার',
  title_en = 'The Comfort Diagnostic Centre',
  description_bn = 'ডায়াগনস্টিক সেন্টার — পরীক্ষা-নিরীক্ষা ও বিশেষজ্ঞ পরামর্শ।',
  description_en = 'A diagnostic centre offering laboratory tests and specialist consultation.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"},{"bn":"অনলাইন রিপোর্ট","en":"Online Report"}]'::jsonb,
  tests = '[{"bn":"সিবিসি","en":"CBC"},{"bn":"লিপিড প্রোফাইল","en":"Lipid Profile"},{"bn":"কিডনি ফাংশন","en":"Kidney Function Test"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"এক্স-রে","en":"X-Ray"}]'::jsonb,
  aliases = '["comfort","কমফোর্ট"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'the comfort diagnostic centre'
  and slug is null;

update public.listings set
  slug = 'probe-bangladesh-kushtia',
  featured = false,
  title_bn = 'প্রোব বাংলাদেশ',
  title_en = 'PROBE Bangladesh',
  description_bn = 'কুষ্টিয়ার ডায়াগনস্টিক প্রতিষ্ঠান — ল্যাব পরীক্ষা ও ইমেজিং সেবা।',
  description_en = 'A diagnostic organisation in Kushtia providing laboratory testing and imaging.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"বাসা থেকে নমুনা সংগ্রহ","en":"Home Sample Collection"}]'::jsonb,
  tests = '[{"bn":"সিবিসি","en":"CBC"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"এক্স-রে","en":"X-Ray"},{"bn":"মাইক্রোবায়োলজি","en":"Microbiology"},{"bn":"কোভিড পরীক্ষা","en":"COVID Test"}]'::jsonb,
  aliases = '["probe","প্রোব"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'probe bangladesh'
  and slug is null;

update public.listings set
  slug = 'medi-care-diagnostic-center',
  featured = false,
  title_bn = 'মেডি-কেয়ার ডায়াগনস্টিক সেন্টার',
  title_en = 'Medi-Care Diagnostic Center',
  description_bn = 'ডায়াগনস্টিক সেন্টার — সাধারণ ও বিশেষায়িত পরীক্ষা।',
  description_en = 'A diagnostic centre offering routine and specialised tests.',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  review_count = 0,
  hours = '[[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}],[{"open":1020,"close":1260}],[{"open":480,"close":780},{"open":1020,"close":1260}]]'::jsonb,
  always_open = false,
  services = '[{"bn":"প্যাথলজি","en":"Pathology"},{"bn":"ইমেজিং","en":"Imaging"},{"bn":"ডাক্তারের চেম্বার","en":"Doctor Chambers"}]'::jsonb,
  tests = '[{"bn":"সিবিসি","en":"CBC"},{"bn":"রক্তে শর্করা","en":"Blood Sugar"},{"bn":"আল্ট্রাসনোগ্রাম","en":"Ultrasound"},{"bn":"ইসিজি","en":"ECG"},{"bn":"থাইরয়েড","en":"Thyroid Profile"}]'::jsonb,
  aliases = '["medicare","medi care","মেডিকেয়ার"]'::jsonb,
  emergency_24 = false,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'medi-care diagnostic center'
  and slug is null;

update public.listings set
  slug = 'dr-refaz-uddin',
  featured = true,
  title_bn = 'ডাঃ রেফাজ উদ্দিন',
  title_en = 'Dr. Refaz Uddin',
  specialty_bn = 'কার্ডিওলজি',
  specialty_en = 'Cardiology',
  designation_bn = 'হৃদরোগ বিশেষজ্ঞ',
  designation_en = 'Cardiologist',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","MD (Cardiology)"]'::jsonb,
  facility_ids = '["sono-hospital-limited","kushtia-general-hospital","sono-diagnostic-center"]'::jsonb,
  chambers = '[{"facilityId":"sono-hospital-limited","place":{"bn":"সনো হাসপাতাল লিমিটেড, কলেজ মোড়","en":"Sono Hospital Limited, College Mor"},"area":"kushtia-sadar","hours":{"bn":"বিকাল ৫টা – রাত ৯টা","en":"5:00 PM – 9:00 PM"},"phone":"+880 1700-000-301"}]'::jsonb,
  source = '{"kind":"directory","note":{"bn":"স্থানীয় স্বাস্থ্যসেবা তালিকা","en":"Local healthcare directory"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. refaz uddin'
  and slug is null;

update public.listings set
  slug = 'dr-anisur-rahman',
  featured = false,
  title_bn = 'ডাঃ আনিসুর রহমান',
  title_en = 'Dr. Anisur Rahman',
  specialty_bn = 'মেডিসিন',
  specialty_en = 'Medicine',
  designation_bn = 'মেডিসিন বিশেষজ্ঞ',
  designation_en = 'Medicine Specialist',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","FCPS (Medicine)"]'::jsonb,
  facility_ids = '["kushtia-general-hospital"]'::jsonb,
  chambers = '[{"facilityId":"kushtia-general-hospital","place":{"bn":"কুষ্টিয়া জেনারেল হাসপাতাল","en":"Kushtia General Hospital"},"area":"kushtia-sadar","hours":{"bn":"সন্ধ্যা ৬টা – রাত ৯টা","en":"6:00 PM – 9:00 PM"},"phone":"+880 1700-000-302"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. anisur rahman'
  and slug is null;

update public.listings set
  slug = 'dr-sharmin-sultana',
  featured = false,
  title_bn = 'ডাঃ শারমিন সুলতানা',
  title_en = 'Dr. Sharmin Sultana',
  specialty_bn = 'গাইনি',
  specialty_en = 'Gynecology',
  designation_bn = 'স্ত্রীরোগ ও প্রসূতি বিশেষজ্ঞ',
  designation_en = 'Gynecologist & Obstetrician',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","FCPS (Gynecology & Obstetrics)"]'::jsonb,
  facility_ids = '["kushtia-medical-college-hospital"]'::jsonb,
  chambers = '[{"facilityId":"kushtia-medical-college-hospital","place":{"bn":"কুষ্টিয়া মেডিকেল কলেজ হাসপাতাল","en":"Kushtia Medical College Hospital"},"area":"kushtia-sadar","hours":{"bn":"বিকাল ৪টা – রাত ৮টা","en":"4:00 PM – 8:00 PM"},"phone":"+880 1700-000-303"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. sharmin sultana'
  and slug is null;

update public.listings set
  slug = 'dr-kamrul-hasan',
  featured = false,
  title_bn = 'ডাঃ কামরুল হাসান',
  title_en = 'Dr. Kamrul Hasan',
  specialty_bn = 'অর্থোপেডিকস',
  specialty_en = 'Orthopedics',
  designation_bn = 'অর্থোপেডিক সার্জন',
  designation_en = 'Orthopedic Surgeon',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","MS (Orthopedics)"]'::jsonb,
  facility_ids = '["kushtia-medical-college-hospital","kushtia-trauma-center"]'::jsonb,
  chambers = '[{"facilityId":"kushtia-trauma-center","place":{"bn":"কুষ্টিয়া ট্রমা সেন্টার","en":"Kushtia Trauma Center"},"area":"kushtia-sadar","hours":{"bn":"বিকাল ৫টা – রাত ৯টা","en":"5:00 PM – 9:00 PM"},"phone":"+880 1700-000-304"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. kamrul hasan'
  and slug is null;

update public.listings set
  slug = 'dr-nazma-parveen',
  featured = false,
  title_bn = 'ডাঃ নাজমা পারভীন',
  title_en = 'Dr. Nazma Parveen',
  specialty_bn = 'শিশু বিভাগ',
  specialty_en = 'Pediatrics',
  designation_bn = 'শিশু রোগ বিশেষজ্ঞ',
  designation_en = 'Pediatrician',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","DCH"]'::jsonb,
  facility_ids = '["ad-din-hospital-kushtia"]'::jsonb,
  chambers = '[{"facilityId":"ad-din-hospital-kushtia","place":{"bn":"আদ-দ্বীন হাসপাতাল কুষ্টিয়া","en":"Ad-Din Hospital Kushtia"},"area":"kushtia-sadar","hours":{"bn":"সকাল ১০টা – দুপুর ২টা","en":"10:00 AM – 2:00 PM"},"phone":"+880 1700-000-305"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. nazma parveen'
  and slug is null;

update public.listings set
  slug = 'dr-mahbub-alam',
  featured = false,
  title_bn = 'ডাঃ মাহবুব আলম',
  title_en = 'Dr. Mahbub Alam',
  specialty_bn = 'গ্যাস্ট্রোএন্টারোলজি',
  specialty_en = 'Gastroenterology',
  designation_bn = 'গ্যাস্ট্রোএন্টারোলজিস্ট',
  designation_en = 'Gastroenterologist',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","MD (Gastroenterology)"]'::jsonb,
  facility_ids = '["sono-hospital-limited"]'::jsonb,
  chambers = '[{"facilityId":"sono-hospital-limited","place":{"bn":"সনো হাসপাতাল লিমিটেড, কলেজ মোড়","en":"Sono Hospital Limited, College Mor"},"area":"kushtia-sadar","hours":{"bn":"সন্ধ্যা ৬টা – রাত ১০টা","en":"6:00 PM – 10:00 PM"},"phone":"+880 1700-000-306"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. mahbub alam'
  and slug is null;

update public.listings set
  slug = 'dr-rubina-yasmin',
  featured = false,
  title_bn = 'ডাঃ রুবিনা ইয়াসমিন',
  title_en = 'Dr. Rubina Yasmin',
  specialty_bn = 'চর্মরোগ',
  specialty_en = 'Dermatology',
  designation_bn = 'চর্ম ও যৌন রোগ বিশেষজ্ঞ',
  designation_en = 'Dermatologist',
  area_id = 'kushtia-sadar',
  category_group = 'healthcare',
  qualifications = '["MBBS","DDV"]'::jsonb,
  facility_ids = '["modern-clinic-kushtia"]'::jsonb,
  chambers = '[{"facilityId":"modern-clinic-kushtia","place":{"bn":"মডার্ন ক্লিনিক, কুষ্টিয়া","en":"Modern Clinic, Kushtia"},"area":"kushtia-sadar","hours":{"bn":"বিকাল ৪টা – রাত ৮টা","en":"4:00 PM – 8:00 PM"},"phone":"+880 1700-000-307"}]'::jsonb,
  source = '{"kind":"placeholder","note":{"bn":"প্রদর্শনের জন্য নমুনা তথ্য","en":"Sample record for demonstration"},"verifiedAt":null}'::jsonb,
  updated_at = now()
where lower(trim(section)) = 'healthcare'
  and lower(trim(title)) = 'dr. rubina yasmin'
  and slug is null;

-- Verify before committing: expect 147 / 147 / 0.
select count(*) as total,
       count(slug) as with_slug,
       count(*) filter (where slug is null) as still_missing
from public.listings;

commit;
