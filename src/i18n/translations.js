/**
 * SAHAYAK — Translation strings
 * Supports: en (English), hi (Hindi), as (Assamese)
 *
 * Usage: t('key.sub') returns the string for the current language.
 * Keep keys flat-ish — one dot separator max for readability.
 */

const T = {
  // ── Global / Navigation ────────────────────────────────────────────────────
  'nav.map':          { en: 'Map',           hi: 'नक्शा',          as: 'মানচিত্ৰ' },
  'nav.tele':         { en: 'Tele-Health',   hi: 'टेली-स्वास्थ्य', as: 'টেলি-স্বাস্থ্য' },
  'nav.audit':        { en: 'Audit',         hi: 'ऑडिट',           as: 'অডিট' },
  'nav.field':        { en: 'Field Sync',    hi: 'फ़ील्ड सिंक',     as: 'ফিল্ড চিংক' },
  'btn.back':         { en: '← Back to Map', hi: '← नक्शे पर वापस', as: '← মানচিত্ৰলৈ' },
  'btn.retry':        { en: 'Retry',         hi: 'पुनः प्रयास',     as: 'পুনৰায় চেষ্টা' },
  'lbl.loading':      { en: 'Loading…',      hi: 'लोड हो रहा है…',  as: 'লোড হৈছে…' },
  'lbl.error':        { en: "Couldn't load data.",hi: 'डेटा लोड नहीं हुआ।', as: 'তথ্য লোড হোৱা নাই।' },

  // ── MapView — Queue Panel ──────────────────────────────────────────────────
  'queue.title':      { en: 'Live Priority Queue', hi: 'लाइव प्राथमिकता कतार', as: 'লাইভ অগ্ৰাধিকাৰ শাৰী' },
  'queue.cases':      { en: 'active cases',        hi: 'सक्रिय केस',             as: 'সক্ৰিয় কেছ' },
  'queue.case':       { en: 'case',                hi: 'केस',                    as: 'কেছ' },
  'queue.empty':      { en: 'No active cases right now', hi: 'अभी कोई सक्रिय केस नहीं', as: 'এতিয়া কোনো সক্ৰিয় কেছ নাই' },
  'queue.no_match':   { en: 'No matches',          hi: 'कोई मेल नहीं',            as: 'কোনো মিল নাই' },
  'queue.filter':     { en: 'Filter by location or tier…', hi: 'स्थान या टियर से फ़िल्टर करें…', as: 'স্থান বা টিয়াৰ দ্বাৰা ফিল্টাৰ কৰক…' },
  'queue.dispatch':   { en: 'Dispatch',            hi: 'भेजें',                   as: 'প্ৰেৰণ' },
  'queue.victims':    { en: 'victims',             hi: 'पीड़ित',                  as: 'ভুক্তভোগী' },
  'queue.overdue':    { en: 'OVERDUE',             hi: 'अतिदेय',                 as: 'অতিৰিক্ত' },

  // ── MapView — Tier labels ──────────────────────────────────────────────────
  'tier.t1':          { en: 'T1 · Critical', hi: 'T1 · गंभीर',   as: 'T1 · জটিল' },
  'tier.t2':          { en: 'T2 · High',     hi: 'T2 · उच्च',    as: 'T2 · উচ্চ' },
  'tier.t3':          { en: 'T3 · Standard', hi: 'T3 · सामान्य', as: 'T3 · সাধাৰণ' },
  'tier.critical':    { en: 'Critical',      hi: 'गंभीर',         as: 'জটিল' },
  'tier.high':        { en: 'High',          hi: 'उच्च',          as: 'উচ্চ' },
  'tier.rescuing':    { en: 'Rescuing',      hi: 'बचाव में',      as: 'উদ্ধাৰত' },
  'tier.safe':        { en: 'Safe',          hi: 'सुरक्षित',      as: 'সুৰক্ষিত' },

  // ── MapView — Panels ───────────────────────────────────────────────────────
  'panel.queue':      { en: 'Queue',         hi: 'कतार',          as: 'শাৰী' },
  'panel.shelter':    { en: 'Shelters & Camps', hi: 'आश्रय और शिविर', as: 'আশ্ৰয় আৰু শিবিৰ' },
  'panel.missing':    { en: 'Missing Registry', hi: 'लापता रजिस्ट्री', as: 'নিখোঁজ ৰেজিষ্ট্ৰি' },
  'panel.close':      { en: 'Close',         hi: 'बंद करें',       as: 'বন্ধ কৰক' },

  // ── MapView — Map toolbar ──────────────────────────────────────────────────
  'map.heatmap':      { en: 'Heatmap',          hi: 'हीटमैप',          as: 'হিটমেপ' },
  'map.zones':        { en: 'Flood Zones',      hi: 'बाढ़ क्षेत्र',     as: 'বানপানী অঞ্চল' },
  'map.camps':        { en: 'Camps',            hi: 'शिविर',            as: 'শিবিৰ' },
  'map.missing':      { en: 'Missing Persons',  hi: 'लापता व्यक्ति',    as: 'নিখোঁজ ব্যক্তি' },
  'map.routes':       { en: 'Routes',           hi: 'मार्ग',            as: 'পথ' },
  'map.resetview':    { en: 'Reset view',       hi: 'दृश्य रीसेट करें', as: 'দৃশ্য পুনৰায় ছেট কৰক' },
  'map.shelter_route':{ en: 'Route to Nearest Safe Shelter', hi: 'निकटतम सुरक्षित आश्रय का मार्ग', as: 'নিকটতম সুৰক্ষিত আশ্ৰয়লৈ পথ' },
  'map.rec_asset':    { en: 'RECOMMENDED ASSET', hi: 'अनुशंसित संपत्ति', as: 'প্ৰস্তাৱিত সম্পদ' },

  // ── MapView — Header bar ───────────────────────────────────────────────────
  'header.title':     { en: 'SAHAYAK',           hi: 'सहायक',             as: 'সহায়ক' },
  'header.subtitle':  { en: 'Flood Response Control', hi: 'बाढ़ राहत नियंत्रण', as: 'বান প্ৰতিক্ৰিয়া নিয়ন্ত্ৰণ' },
  'header.active':    { en: 'active',            hi: 'सक्रिय',            as: 'সক্ৰিয়' },
  'header.stranded':  { en: 'stranded',          hi: 'फंसे हुए',          as: 'আবদ্ধ' },
  'header.camps':     { en: 'camps',             hi: 'शिविर',             as: 'শিবিৰ' },
  'header.missing':   { en: 'missing',           hi: 'लापता',             as: 'নিখোঁজ' },
  'header.overdue':   { en: 'overdue',           hi: 'अतिदेय',            as: 'অতিৰিক্ত' },
  'header.online':    { en: 'LIVE',              hi: 'लाइव',              as: 'লাইভ' },

  // ── TelePage ───────────────────────────────────────────────────────────────
  'tele.title':       { en: 'Tele-Maternity Emergency Bridge', hi: 'टेली-मातृत्व आपातकालीन ब्रिज', as: 'টেলি-মাতৃত্ব জৰুৰী সেতু' },
  'tele.module':      { en: 'MODULE 4',          hi: 'मॉड्यूल 4',         as: 'মডিউল 4' },
  'tele.eligible_hdr':{ en: 'ELIGIBLE — PREGNANT / LABOR', hi: 'पात्र — गर्भवती / प्रसव', as: 'যোগ্য — গৰ্ভৱতী / প্ৰসৱ' },
  'tele.other_t1':    { en: 'OTHER TIER 1 — NOT ELIGIBLE', hi: 'अन्य टियर 1 — अपात्र', as: 'অন্য টিয়াৰ 1 — অযোগ্য' },
  'tele.empty':       { en: 'No eligible maternity cases in the current queue', hi: 'वर्तमान कतार में कोई पात्र मातृत्व केस नहीं', as: 'বৰ্তমান শাৰীত কোনো যোগ্য মাতৃত্ব কেছ নাই' },
  'tele.connect':     { en: '📞 Connect',        hi: '📞 कनेक्ट',          as: '📞 সংযোগ' },
  'tele.active':      { en: '📞 Active',         hi: '📞 सक्रिय',          as: '📞 সক্ৰিয়' },
  'tele.not_eligible':{ en: 'Not eligible',      hi: 'अपात्र',            as: 'অযোগ্য' },
  'tele.maternity':   { en: '♥ MATERNITY',       hi: '♥ मातृत्व',          as: '♥ মাতৃত্ব' },
  'tele.eligible_count':{ en: 'eligible',        hi: 'पात्र',              as: 'যোগ্য' },
  'tele.on_call':     { en: 'on call',           hi: 'कॉल पर',            as: 'কলত' },
  'tele.select_case': { en: 'Select a case from the list to open the Tele-Maternity bridge', hi: 'टेली-मातृत्व ब्रिज खोलने के लिए सूची से कोई केस चुनें', as: 'টেলি-মাতৃত্ব সেতু খুলিবলৈ তালিকাৰপৰা এটা কেছ বাছক' },
  'tele.load_err':    { en: 'Could not load triage queue', hi: 'ट्राइज कतार लोड नहीं हुई', as: 'ট্ৰিয়াজ শাৰী লোড হোৱা নাই' },

  // ── AuditPage ──────────────────────────────────────────────────────────────
  'audit.title':      { en: 'System Audit',      hi: 'सिस्टम ऑडिट',      as: 'চিষ্টেম অডিট' },
  'audit.module':     { en: 'MODULE 6',          hi: 'मॉड्यूल 6',         as: 'মডিউল 6' },
  'audit.tab_overdue':{ en: 'Still Stranded',    hi: 'अभी भी फंसे हुए',   as: 'এতিয়াও আবদ্ধ' },
  'audit.tab_feedback':{ en: 'Relief Feedback',  hi: 'राहत प्रतिक्रिया',  as: 'সকাহ মতামত' },
  'audit.tab_hazard': { en: 'Health Hazards',    hi: 'स्वास्थ्य खतरे',    as: 'স্বাস্থ্য বিপদ' },
  'audit.no_overdue': { en: 'No overdue cases right now', hi: 'अभी कोई अतिदेय केस नहीं', as: 'এতিয়া কোনো অতিৰিক্ত কেছ নাই' },
  'audit.hours_since':{ en: 'h since dispatch',  hi: 'घंटे हुए प्रेषण',   as: 'ঘণ্টা হ\'ল প্ৰেৰণৰ পিছৰেপৰা' },
  'audit.submit_fb':  { en: 'Submit Feedback',   hi: 'प्रतिक्रिया दें',   as: 'মতামত দিয়ক' },
  'audit.fb_camp':    { en: 'Camp',              hi: 'शिविर',             as: 'শিবিৰ' },
  'audit.fb_category':{ en: 'Category',          hi: 'श्रेणी',            as: 'শ্ৰেণী' },
  'audit.fb_rating':  { en: 'Rating',            hi: 'रेटिंग',            as: 'মূল্যায়ন' },
  'audit.fb_comment': { en: 'Comment',           hi: 'टिप्पणी',           as: 'মন্তব্য' },
  'audit.no_hazards': { en: 'No health hazards detected', hi: 'कोई स्वास्थ्य खतरा नहीं', as: 'কোনো স্বাস্থ্য বিপদ চিনাক্ত হোৱা নাই' },
  'audit.load_err':   { en: "Couldn't load audit data", hi: 'ऑडिट डेटा लोड नहीं हुआ', as: 'অডিট তথ্য লোড হোৱা নাই' },
  'audit.sim_title':  { en: 'Simulate Overdue',  hi: 'अतिदेय अनुकरण करें', as: 'অতিৰিক্ত অনুকৰণ কৰক' },
  'audit.sim_run':    { en: 'Run Simulation',    hi: 'अनुकरण चलाएं',      as: 'অনুকৰণ চলাওক' },

  // ── FieldWorkerPage ────────────────────────────────────────────────────────
  'field.title':      { en: 'Field Sync',        hi: 'फ़ील्ड सिंक',        as: 'ফিল্ড চিংক' },
  'field.module':     { en: 'MODULE 11',         hi: 'मॉड्यूल 11',         as: 'মডিউল 11' },
  'field.tab_rescue': { en: 'Rescue Completion', hi: 'बचाव पूर्ण',         as: 'উদ্ধাৰ সম্পন্ন' },
  'field.tab_checkin':{ en: 'Camp Check-in',     hi: 'शिविर चेक-इन',      as: 'শিবিৰ চেক-ইন' },
  'field.tab_damage': { en: 'Damage Report',     hi: 'नुकसान रिपोर्ट',    as: 'ক্ষতিৰ প্ৰতিবেদন' },
  'field.submit':     { en: 'Submit',            hi: 'जमा करें',           as: 'দাখিল' },
  'field.sync':       { en: 'Sync Now',          hi: 'अभी सिंक करें',      as: 'এতিয়া চিংক' },
  'field.syncing':    { en: 'Syncing…',          hi: 'सिंक हो रहा है…',    as: 'চিংক হৈছে…' },
  'field.offline':    { en: '⚡ Offline — saves locally', hi: '⚡ ऑफलाइन — स्थानीय रूप से सहेजेगा', as: '⚡ অফলাইন — স্থানীয়ভাৱে সংৰক্ষণ' },
  'field.online':     { en: '● Online',          hi: '● ऑनलाइन',           as: '● অনলাইন' },
  'field.unsynced':   { en: 'unsynced',          hi: 'असिंक्ड',            as: 'চিংক নহা' },
  'field.no_records': { en: 'No field records yet', hi: 'अभी कोई फ़ील्ड रिकॉर्ड नहीं', as: 'এতিয়ালৈ কোনো ফিল্ড ৰেকৰ্ড নাই' },
  'field.case_id':    { en: 'Case ID',           hi: 'केस आईडी',           as: 'কেছ আইডি' },
  'field.rescued':    { en: 'Number rescued',    hi: 'बचाए गए लोग',       as: 'উদ্ধাৰ কৰা সংখ্যা' },
  'field.notes':      { en: 'Notes',             hi: 'नोट्स',              as: 'টোকা' },
  'field.name':       { en: 'Survivor name',     hi: 'जीवित व्यक्ति का नाम', as: 'জীয়াই থকাৰ নাম' },
  'field.camp':       { en: 'Camp ID',           hi: 'शिविर आईडी',         as: 'শিবিৰ আইডি' },
  'field.location':   { en: 'Location',          hi: 'स्थान',              as: 'স্থান' },
  'field.damage_desc':{ en: 'Damage description',hi: 'नुकसान विवरण',      as: 'ক্ষতিৰ বিৱৰণ' },
  'field.photo_url':  { en: 'Photo URL (optional)', hi: 'फोटो URL (वैकल्पिक)', as: 'ফটো URL (ঐচ্ছিক)' },
  'field.records_log':{ en: 'Field Records Log', hi: 'फ़ील्ड रिकॉर्ड लॉग', as: 'ফিল্ড ৰেকৰ্ড লগ' },

  // ── MapView Sidebar Nav ──────────────────────────────────────────────────────
  'sidebar.title':        { en: 'MISSION CONTROL',    hi: 'मिशन नियंत्रण',    as: 'মিছন নিয়ন্ত্ৰণ' },
  'sidebar.grp_response': { en: 'RESPONSE',           hi: 'प्रतिक्रिया',       as: 'প্ৰতিক্ৰিয়া' },
  'sidebar.grp_resources':{ en: 'RESOURCES',          hi: 'संसाधन',            as: 'সম্পদ' },
  'sidebar.grp_intel':    { en: 'INTELLIGENCE',       hi: 'खुफिया',            as: 'গোপন সংবাদ' },
  'sidebar.grp_modules':  { en: 'MODULES',            hi: 'मॉड्यूल',           as: 'মডিউল' },
  'sidebar.tactical_map': { en: 'Tactical Map',       hi: 'सामरिक नक्शा',     as: 'কৌশলগত মানচিত্ৰ' },
  'sidebar.queue':        { en: 'Priority Queue',     hi: 'प्राथमिकता कतार',  as: 'অগ্ৰাধিকাৰ শাৰী' },
  'sidebar.insights':     { en: 'Worst-Hit Ranking',  hi: 'सबसे प्रभावित',    as: 'সৰ্বাধিক ক্ষতিগ্ৰস্ত' },
  'sidebar.camps':        { en: 'Relief Camps',       hi: 'राहत शिविर',       as: 'সকাহ শিবিৰ' },
  'sidebar.missing':      { en: 'Missing Persons',    hi: 'लापता व्यक्ति',    as: 'নিখোঁজ ব্যক্তি' },
  'sidebar.early_warning':{ en: 'Early Warning',      hi: 'प्रारंभिक चेतावनी', as: 'আগতীয়া সতৰ্কতা' },
  'sidebar.health_bridge':{ en: 'Health Bridge',      hi: 'स्वास्थ्य सेतु',    as: 'স্বাস্থ্য সেতু' },
  'sidebar.audit_log':    { en: 'Audit Log',          hi: 'ऑडिट लॉग',         as: 'অডিট লগ' },
  'sidebar.field_portal': { en: 'Field Portal',       hi: 'फ़ील्ड पोर्टल',      as: 'ফিল্ড পৰ্টেল' },
  'sidebar.filter':       { en: 'Filter location / tier…', hi: 'स्थान / टियर फ़िल्टर…', as: 'স্থান / টিয়াৰ ফিল্টাৰ…' },

  // ── MapView Metric Header Cards ─────────────────────────────────────────────
  'metric.sos_label':     { en: 'Active SOS Requests', hi: 'सक्रिय SOS अनुरोध', as: 'সক্ৰিয় SOS অনুৰোধ' },
  'metric.sos_sub':       { en: 'across Assam districts', hi: 'असम जिलों में', as: 'অসমৰ জিলাত' },
  'metric.trapped_label': { en: 'People Trapped',     hi: 'फंसे लोग',          as: 'আটকা পৰা লোক' },
  'metric.trapped_sub':   { en: 'estimated victims',  hi: 'अनुमानित पीड़ित',   as: 'আনুমানিক ভুক্তভোগী' },
  'metric.boats_label':   { en: 'Boats Deployed',     hi: 'नौकाएं तैनात',      as: 'নাও মোতায়েন' },
  'metric.boats_sub':     { en: 'rescue assets active', hi: 'बचाव संपत्ति सक्रिय', as: 'উদ্ধাৰ সম্পদ সক্ৰিয়' },
  'metric.river_label':   { en: 'River Level Status', hi: 'नदी स्तर स्थिति',  as: 'নদী স্তৰ অৱস্থা' },
  'metric.river_loading': { en: 'loading gauges…',   hi: 'गेज लोड हो रहा है…', as: 'গেজ লোড হৈছে…' },
  'metric.river_danger':  { en: '⚠ danger level reached', hi: '⚠ खतरा स्तर पहुंचा', as: '⚠ বিপদ স্তৰ পাইছে' },
  'metric.river_approach':{ en: 'approaching danger', hi: 'खतरे की ओर बढ़ रहा', as: 'বিপদৰ দিশে আগবাঢ়িছে' },
  'metric.river_safe':    { en: 'within safe range',  hi: 'सुरक्षित सीमा में',  as: 'সুৰক্ষিত সীমাত' },

  // ── MapView Mobile menu ───────────────────────────────────────────────
  'mobile.worst_hit':     { en: 'Worst Hit',          hi: 'सबसे प्रभावित',    as: 'সৰ্বাধিক ক্ষতিগ্ৰস্ত' },
  'mobile.missing':       { en: 'Missing',            hi: 'लापता',            as: 'নিখোঁজ' },
  'mobile.warning':       { en: 'Warning',            hi: 'चेतावनी',          as: 'সতৰ্কতা' },
  'mobile.map_only':      { en: 'Map only',           hi: 'केवल नक्शा',       as: 'কেৱল মানচিত্ৰ' },
  'mobile.tele':          { en: 'Tele-health',        hi: 'टेली-स्वास्थ्य',   as: 'টেলি-স্বাস্থ্য' },
  'mobile.audit':         { en: 'System Audit',       hi: 'सिस्टम ऑडिट',      as: 'চিষ্টেম অডিট' },
  'mobile.field':         { en: 'Field Portal',       hi: 'फ़ील्ड पोर्टल',      as: 'ফিল্ড পৰ্টেল' },

  // ── Panel headers visible in MapView right panel ───────────────────────
  'panel.camps_title':    { en: 'Relief Camps & Inventory', hi: 'राहत शिविर और इन्वेंटरी', as: 'সকাহ শিবিৰ আৰু মজুত' },
  'panel.camps_sub':      { en: 'operational shelters in Assam', hi: 'असम में संचालित आश्रय', as: 'অসমত পৰিচালিত আশ্ৰয়' },
  'panel.missing_title':  { en: 'Missing Persons Registry', hi: 'लापता व्यक्ति रजिस्ट्री', as: 'নিখোঁজ ব্যক্তি ৰেজিষ্ট্ৰি' },
  'panel.queue_title':    { en: 'Live Priority Queue', hi: 'लाइव प्राथमिकता कतार', as: 'লাইভ অগ্ৰাধিকাৰ শাৰী' },
  // ── Inner Graph / Map Popups & Panels ──────────────────────────────────────
  'map.cwc_gauge':    { en: 'CWC Gauge',     hi: 'सीडब्ल्यूसी गेज', as: 'চিডব্লিউচি গেজ' },
  'map.cwc_station':  { en: 'CWC RIVER MONITORING STATION', hi: 'सीडब्ल्यूसी नदी निगरानी स्टेशन', as: 'চিডব্লিউচি নদী নিৰীক্ষণ কেন্দ্ৰ' },
  'map.level':        { en: 'Level',         hi: 'स्तर',          as: 'স্তৰ' },
  'map.current_level':{ en: 'Current Level', hi: 'वर्तमान स्तर',  as: 'বৰ্তমান স্তৰ' },
  'map.danger_level': { en: 'Danger Level',  hi: 'खतरे का स्तर',  as: 'বিপদৰ স্তৰ' },
  'map.danger':       { en: 'Danger',        hi: 'खतरा',          as: 'বিপদ' },
  'map.trend':        { en: 'Trend',         hi: 'प्रवृत्ति',     as: 'প্ৰৱণতা' },
  'map.rate_of_rise': { en: 'Rate of rise',  hi: 'बढ़ने की दर',   as: 'বৃদ্ধিৰ হাৰ' },
  'map.camp':         { en: 'CAMP',          hi: 'शिविर',         as: 'শিবিৰ' },
  'map.relief_camp':  { en: 'RELIEF CAMP',   hi: 'राहत शिविर',    as: 'সকাহ শিবিৰ' },
  'map.occupancy':    { en: 'Occupancy',     hi: 'भराव',          as: 'দখল' },
  'map.beds':         { en: 'beds',          hi: 'बिस्तर',        as: 'বিছনা' },
  'map.hazard':       { en: 'HAZARD',        hi: 'खतरा',          as: 'বিপদ' },
  'map.overdue':      { en: 'OVERDUE',       hi: 'अतिदेय',        as: 'অতিৰিক্ত' },
  'map.reps':         { en: 'REPS',          hi: 'प्रतिनिधि',     as: 'প্ৰতিনিধি' },
  'map.suggested_route': { en: 'Suggested Route', hi: 'सुझाया गया मार्ग', as: 'পৰামৰ্শিত পথ' },
  
  'panel.impact':     { en: 'IMPACT',        hi: 'प्रभाव',        as: 'প্ৰভাৱ' },
  'panel.victims':    { en: 'victims',       hi: 'पीड़ित',        as: 'ভুক্তভোগী' },
  'panel.calls':      { en: 'calls',         hi: 'कॉल',           as: 'কল' },
  'panel.locate':     { en: 'Locate Target on Map ➔', hi: 'नक्शे पर लक्ष्य खोजें ➔', as: 'মানচিত্ৰত লক্ষ্য বিচাৰক ➔' },
  
  'panel.cwc_stations': { en: 'CWC RIVER MONITORING STATIONS', hi: 'सीडब्ल्यूसी नदी निगरानी स्टेशन', as: 'চিডব্লিউচি নদী নিৰীক্ষণ কেন্দ্ৰ' },
  'panel.risk_model': { en: 'PREDICTED INUNDATION RISK MODEL', hi: 'अनुमानित बाढ़ जोखिम मॉडल', as: 'আনুমানিক বানপানী বিপদাশংকা আৰ্হি' },
  'panel.risk':       { en: 'RISK',          hi: 'जोखिम',         as: 'বিপদাশংকা' },
  'panel.rain_alert': { en: 'IMD Rain Alert',hi: 'आईएमडी बारिश अलर्ट', as: 'IMD বৰষুণৰ সতৰ্কতা' },
  'panel.rising':     { en: '↗ RISING',      hi: '↗ बढ़ रहा है',  as: '↗ বৃদ্ধি' },
  'panel.falling':    { en: '↘ FALLING',     hi: '↘ गिर रहा है',  as: '↘ হ্ৰাস' },
  'panel.stable':     { en: '→ STABLE',      hi: '→ स्थिर',       as: '→ স্থিৰ' },
}

export default T
