const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'builder_customer_profiles.json');
const AUDIT_FILE = path.join(DATA_DIR, 'conversation_quality_audit.jsonl');
const BOT_PHONE = '919361599097';

// Comprehensive Madurai Landmark Validation Map for Local Authority
const MADURAI_LANDMARK_MAP = {
  'villapuram': {
    areaTamil: 'வில்லாபுரம்',
    landmarks: 'Vetri Theater அல்லது Housing Board Colony',
    promptSnippet: 'ஆஹா வில்லாபுரம் அருமையான இடம் சார்! Vetri Theater பக்கமா அல்லது Housing Board பக்கமா உங்கள் Site அமைந்திருக்கிறது சார்?'
  },
  'goripalayam': {
    areaTamil: 'கோரிப்பாளையம்',
    landmarks: 'Thevar Silai அல்லது GH (Government Rajaji Hospital)',
    promptSnippet: 'ஆஹா கோரிப்பாளையம்! தேவர் சிலை (Thevar Silai) பக்கமா அல்லது GH பக்கமா உங்கள் Plot அமைந்திருக்கிறது சார்?'
  },
  'mattuthavani': {
    areaTamil: 'மாட்டுத்தாவணி',
    landmarks: 'Omni Bus Stand, Flower Market அல்லது High Court Bench / Apollo Hospital',
    promptSnippet: 'மாட்டுத்தாவணி பக்கம்னா Omni Bus Stand பக்கமா அல்லது High Court Bench / Apollo Hospital பக்கமா சார்?'
  },
  'anna nagar': {
    areaTamil: 'அண்ணா நகர்',
    landmarks: 'Ambika Theater, Suguna Store அல்லது 80 Feet Road',
    promptSnippet: 'அண்ணா நகர்! Ambika Theater / Suguna Store பக்கமா அல்லது 80 Feet Road பக்கமா சார்?'
  },
  'kk nagar': {
    areaTamil: 'கே.கே. நகர்',
    landmarks: 'Sundaram Park, Court Complex அல்லது Apollo Specialty Hospital',
    promptSnippet: 'கே.கே. நகர்! Sundaram Park / Court Complex பக்கமா அல்லது Apollo Specialty பக்கமா சார்?'
  },
  'k.k. nagar': {
    areaTamil: 'கே.கே. நகர்',
    landmarks: 'Sundaram Park, Court Complex அல்லது Apollo Specialty Hospital',
    promptSnippet: 'கே.கே. நகர்! Sundaram Park / Court Complex பக்கமா அல்லது Apollo Specialty பக்கமா சார்?'
  },
  'tirunagar': {
    areaTamil: 'திருநகர்',
    landmarks: '1st to 8th Stop, Meetna School அல்லது Sivan Temple / NH',
    promptSnippet: 'திருநகர்! 1st to 8th Stop பக்கமா அல்லது Sivan Temple / NH பக்கமா சார்?'
  },
  'thirunagar': {
    areaTamil: 'திருநகர்',
    landmarks: '1st to 8th Stop, Meetna School அல்லது Sivan Temple / NH',
    promptSnippet: 'திருநகர்! 1st to 8th Stop பக்கமா அல்லது Sivan Temple / NH பக்கமா சார்?'
  },
  'thiruparankundram': {
    areaTamil: 'திருப்பரங்குன்றம்',
    landmarks: 'முருகன் கோவில் ரத வீதி, TCE காலேஜ் அல்லது சரவண பொய்கை',
    promptSnippet: 'திருப்பரங்குன்றம்! முருகன் கோவில் ரத வீதியா அல்லது TCE காலேஜ் / பைபாஸ் பக்கமா சார்?'
  },
  'tiruparankundram': {
    areaTamil: 'திருப்பரங்குன்றம்',
    landmarks: 'முருகன் கோவில் ரத வீதி, TCE காலேஜ் அல்லது சரவண பொய்கை',
    promptSnippet: 'திருப்பரங்குன்றம்! முருகன் கோவில் ரத வீதியா அல்லது TCE காலேஜ் / பைபாஸ் பக்கமா சார்?'
  },
  'k.pudur': {
    areaTamil: 'கே.புதூர்',
    landmarks: 'ITI, Karpaga Nagar அல்லது Alagar Kovil Road',
    promptSnippet: 'கே.புதூர்! ITI / Karpaga Nagar பக்கமா அல்லது Alagar Kovil Road பக்கமா சார்?'
  },
  'pudur': {
    areaTamil: 'கே.புதூர்',
    landmarks: 'ITI, Karpaga Nagar அல்லது Alagar Kovil Road',
    promptSnippet: 'கே.புதூர்! ITI / Karpaga Nagar பக்கமா அல்லது Alagar Kovil Road பக்கமா சார்?'
  },
  'iyer bungalow': {
    areaTamil: 'ஐயர் பங்களா',
    landmarks: 'Yadava College, Reserve Line அல்லது New Natham Flyover',
    promptSnippet: 'ஐயர் பங்களா! Yadava College ரோடா அல்லது New Natham Flyover பக்கமா சார்?'
  },
  'thiruppalai': {
    areaTamil: 'திருப்பாலை',
    landmarks: 'Yadava College அல்லது New Natham Road',
    promptSnippet: 'திருப்பாலை! Yadava College பக்கமா அல்லது New Natham Road பக்கமா சார்?'
  },
  'avaniyapuram': {
    areaTamil: 'அவனியாபுரம்',
    landmarks: 'ஜல்லிக்கட்டு மைதானம், Airport Road அல்லது Ring Road',
    promptSnippet: 'அவனியாபுரம்! ஜல்லிக்கட்டு மைதானம் பக்கமா அல்லது Airport Road / Ring Road பக்கமா சார்?'
  },
  'sellur': {
    areaTamil: 'செல்லூர்',
    landmarks: '50 Feet Road அல்லது Sellur Kanmai',
    promptSnippet: 'செல்லூர்! 50 Feet Road பக்கமா அல்லது கண்மாய் பக்கமா சார்?'
  },
  'arapalayam': {
    areaTamil: 'ஆரப்பாளையம்',
    landmarks: 'Arapalayam Bus Stand அல்லது Guru Theater',
    promptSnippet: 'ஆரப்பாளையம்! Arapalayam Bus Stand பக்கமா அல்லது Guru Theater பக்கமா சார்?'
  },
  'ss colony': {
    areaTamil: 'எஸ்.எஸ். காலனி',
    landmarks: 'SS Colony Main Road, Bye-Pass Road அல்லது Ponmeni Jalroad',
    promptSnippet: 'எஸ்.எஸ். காலனி! Bye-Pass Road பக்கமா அல்லது Ponmeni Main Road பக்கமா சார்?'
  },
  'ponmeni': {
    areaTamil: 'பொன்மேனி',
    landmarks: 'Ponmeni Main Road அல்லது Bye-Pass Road',
    promptSnippet: 'பொன்மேனி! Bye-Pass Road பக்கமா அல்லது Ponmeni Main Road பக்கமா சார்?'
  },
  'theppakulam': {
    areaTamil: 'தெப்பக்குளம்',
    landmarks: 'மாரியம்மன் தெப்பக்குளம் அல்லது Anuppanadi / Velammal Hospital',
    promptSnippet: 'தெப்பக்குளம்! மாரியம்மன் தெப்பக்குளம் பக்கமா அல்லது Velammal Hospital பக்கமா சார்?'
  },
  'anuppanadi': {
    areaTamil: 'அனுப்பானடி',
    landmarks: 'Velammal Hospital அல்லது Viraganoor Ring Road',
    promptSnippet: 'அனுப்பானடி! Velammal Hospital பக்கமா அல்லது Viraganoor Ring Road பக்கமா சார்?'
  },
  'othakadai': {
    areaTamil: 'ஒத்தக்கடை',
    landmarks: 'Yanaimalai அடிவாரம், High Court Bench அல்லது Agri College',
    promptSnippet: 'ஒத்தக்கடை! Yanaimalai அடிவாரமா அல்லது High Court / Agri College பக்கமா சார்?'
  },
  'samayanallur': {
    areaTamil: 'சமயநல்லூர்',
    landmarks: 'NH Dindigul Four-way Track அல்லது Paravai Market',
    promptSnippet: 'சமயநல்லூர் / பரவை! Paravai Market பக்கமா அல்லது Dindigul Four-way Track பக்கமா சார்?'
  },
  'paravai': {
    areaTamil: 'பரவை',
    landmarks: 'Paravai Market அல்லது NH Track',
    promptSnippet: 'பரவை! Paravai Market பக்கமா அல்லது NH Track பக்கமா சார்?'
  },
  'vagaikulam': {
    areaTamil: 'வாகைகுளம்',
    landmarks: 'Ring Road அல்லது Airport / Sipcot Area',
    promptSnippet: 'வாகைகுளம்! Ring Road பக்கமா அல்லது Airport / Sipcot பகுதி பக்கமா சார்?'
  },
  'selvapuram': {
    areaTamil: 'செல்வாபுரம்',
    landmarks: 'Villapuram Bypass அல்லது Housing Board',
    promptSnippet: 'செல்வாபுரம்! Bypass ரோடா அல்லது Housing Board பக்கமா சார்?'
  },
  'tallakulam': {
    areaTamil: 'தல்லாகுளம்',
    landmarks: 'Perumal Kovil, Tamukkam Ground அல்லது Outpost',
    promptSnippet: 'தல்லாகுளம்! தமுக்கம் மைதானம் (Tamukkam) பக்கமா அல்லது பெருமாள் கோவில் பக்கமா சார்?'
  },
  'pasumalai': {
    areaTamil: 'பசுமலை',
    landmarks: 'Harvey Patti, Railway Station அல்லது Bypass',
    promptSnippet: 'பசுமலை! Harvey Patti பக்கமா அல்லது Main Road பக்கமா சார்?'
  },
  'alagar kovil': {
    areaTamil: 'அழகர் கோவில்',
    landmarks: 'Kallazhagar Temple ரோடு அல்லது Appan Thirupathi',
    promptSnippet: 'அழகர் கோவில் ரோடு! Appan Thirupathi பக்கமா அல்லது கோவில் ரத வீதியா சார்?'
  },
  'umachikulam': {
    areaTamil: 'உமச்சிகுளம்',
    landmarks: 'Natham Road அல்லது Surya Nagar',
    promptSnippet: 'உமச்சிகுளம்! Natham Main Road பக்கமா சார்?'
  }
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class BuilderCustomerMemory {
  constructor() {
    this.profiles = this.loadProfiles();
  }

  loadProfiles() {
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('⚠️ [BuilderMemory] Failed to load profiles file:', e.message);
    }
    return {};
  }

  saveProfiles() {
    try {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (e) {
      console.warn('⚠️ [BuilderMemory] Failed to save profiles file:', e.message);
    }
  }

  logAudit(chatId, eventType, details = {}) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        chatId: String(chatId),
        eventType,
        ...details
      };
      fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (e) {
      console.warn('⚠️ [BuilderMemory] Failed to write audit log:', e.message);
    }
  }

  getCleanPhone(chatId = '') {
    return String(chatId).replace(/\D/g, '');
  }

  getVerifiedCustomerPhone(chatId = '', profile = null) {
    if (profile && profile.customer_phone) {
      return profile.customer_phone;
    }
    const str = String(chatId);
    if (str.endsWith('@lid') || str.includes('lid:')) {
      return null; // WhatsApp Linked Device privacy ID, NOT a dialable phone number!
    }
    const digits = str.replace(/\D/g, '');
    if (digits === BOT_PHONE || digits === '9361599097') {
      return null; // This is the BOT's own phone number!
    }
    if (digits.length >= 10 && digits.length <= 13) {
      return `+${digits}`;
    }
    return null;
  }

  getProfile(chatId = '') {
    const phone = this.getCleanPhone(chatId);
    if (!this.profiles[phone]) {
      this.profiles[phone] = {
        phone,
        customer_name: null,
        customer_phone: null,
        preferred_language: 'Tamil', // Default is ALWAYS Tamil for Danam Holdings
        explicit_english: false,
        plot_owned: null,              // true (owns plot), false (looking to purchase)
        plot_status: 'unknown',        // 'owned', 'looking_to_buy', 'unknown'
        plot_size: null,               // e.g. '2 Cents', '4 Cents'
        plot_type: 'unknown',          // 'corner_plot', 'middle_plot', 'unknown'
        setback_inquiry_active: false,
        location: null,
        landmark_info: null,
        needs_landmark_validation: false,
        service_area_status: 'approved', // 'approved', 'outside_review_needed'
        site_address: null,
        house_type: null,              // 'G+1 Duplex', 'Ground Floor Only', etc.
        built_up_area: null,
        bedrooms: null,                // '3 BHK', etc.
        budget: null,
        preferred_package: null,
        starting_timeline: null,
        site_visit_requested: null,
        site_visit_status: null,
        customer_stage: 'new_enquiry', // 'new_enquiry' | 'requirements_collection' | 'planning_discussion' | 'budget_discussion' | 'site_visit_pending' | 'site_visit_confirmed' | 'complaint_escalation' | 'human_handover_requested'
        follow_up_consent: 'not_asked',// 'granted', 'declined', 'not_asked'
        complaint: null,               // { active: true, issue: '...', logged_at: '...' }
        human_handover: null,          // { active: true, requested_at: '...', notes: '...' }
        comment_check_requested: false,
        social_link_shared: false,
        facts: {
          confirmed: {},
          inferred: {},
          last_updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      };
      this.saveProfiles();
    } else {
      // If legacy profile had English as unrequested default, upgrade to Tamil
      if (!this.profiles[phone].explicit_english && this.profiles[phone].preferred_language === 'English') {
        this.profiles[phone].preferred_language = 'Tamil';
      }
    }
    return this.profiles[phone];
  }

  // Update profile from incoming message heuristics
  updateFromMessage(chatId, text = '') {
    const profile = this.getProfile(chatId);
    const lower = text.toLowerCase();
    let updated = false;

    // 1. STRICT LANGUAGE DETECTION & LOCKING:
    const asksTamil = text.includes('தமி') ||
                      /\b(tamil|thamil|thamizh)\b/i.test(text) || 
                      lower.includes('speak tamil') || 
                      lower.includes('chat tamil') || 
                      lower.includes('in tamil') || 
                      lower.includes('want tamil') || 
                      lower.includes('reply in tamil') || 
                      lower.includes('reply me in tamil') || 
                      lower.includes('tamil la') || 
                      lower.includes('tamil theriyuma');
    const asksEnglish = text.includes('ஆங்கிலம்') || /\b(english)\b/i.test(text) || lower.includes('speak english') || lower.includes('in english') || lower.includes('reply in english');
    const asksTanglish = /\b(tanglish)\b/i.test(text) || lower.includes('speak tanglish') || lower.includes('in tanglish');

    if (asksTamil) {
      if (profile.preferred_language !== 'Tamil' || profile.explicit_english) {
        profile.preferred_language = 'Tamil';
        profile.explicit_english = false;
        updated = true;
        this.logAudit(chatId, 'language_switched', { target: 'Tamil' });
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ TAMIL`);
      }
    } else if (asksEnglish) {
      if (profile.preferred_language !== 'English') {
        profile.preferred_language = 'English';
        profile.explicit_english = true;
        updated = true;
        this.logAudit(chatId, 'language_switched', { target: 'English' });
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ ENGLISH`);
      }
    } else if (asksTanglish) {
      if (profile.preferred_language !== 'Tanglish') {
        profile.preferred_language = 'Tanglish';
        profile.explicit_english = false;
        updated = true;
        this.logAudit(chatId, 'language_switched', { target: 'Tanglish' });
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ TANGLISH`);
      }
    }

    // 2. COMPLAINT & SERVICE ISSUE DETECTION:
    const complaintMatch = text.match(/\b(complaint|problem|delay|cheated|poor work|bad service|refund|cancel|dispute|money issue|waste|not visited|not came|haven't visited|did not visit|தாமதம்|மோசம்|ஏமாற்று|புகார்|பணம் பிரச்சனை|வரவில்லை|இன்னும் வரல|வரவே இல்ல)\b/i);
    if (complaintMatch) {
      profile.customer_stage = 'complaint_escalation';
      profile.complaint = {
        active: true,
        issue: text.trim(),
        logged_at: new Date().toISOString()
      };
      this.logAudit(chatId, 'complaint_detected', { issue: text.trim() });
      updated = true;
    }

    // 3. HUMAN HANDOVER REQUEST DETECTION:
    const humanMatch = text.match(/\b(speak to dhilip|talk to dhilip|call dhilip|dhilip sir|speak with engineer|talk to engineer|human engineer|human agent|call me|திலீப் குமார்|திலீப் சார்|பொறியாளரிடம் பேச|நேரில் பேச|போனில் பேச|அழைக்கவும்)\b/i);
    if (humanMatch) {
      profile.customer_stage = 'human_handover_requested';
      profile.human_handover = {
        active: true,
        requested_at: new Date().toISOString(),
        request_text: text.trim()
      };
      this.logAudit(chatId, 'human_handover_requested', { request: text.trim() });
      updated = true;
    }

    // 4. PRIVACY / OTHER CLIENT DATA PROBE DETECTION:
    const privacyMatch = text.match(/\b(another customer|other customer|other client|other quotation|someone else's quotation|some other quotation|மற்றுமொரு வாடிக்கையாளர்|வேற கஸ்டமர்)\b/i);
    if (privacyMatch) {
      profile.privacy_probe_active = true;
      this.logAudit(chatId, 'privacy_probe_detected', { text: text.trim() });
      updated = true;
    } else {
      profile.privacy_probe_active = false;
    }

    // 5. FOLLOW-UP CONSENT DETECTION:
    if (/\b(stop|unsubscribe|don't message|dont message|no follow up|வேண்டாம்|மெசேஜ் பண்ணாதீங்க|மெசேஜ் செய்ய வேண்டாம்)\b/i.test(lower)) {
      profile.follow_up_consent = 'declined';
      this.logAudit(chatId, 'consent_declined', { text: text.trim() });
      updated = true;
    } else if (/\b(yes please|share photos|send details|வாட்ஸ்அப்பில் அனுப்புங்கள்|அனுப்புங்கள்)\b/i.test(lower)) {
      profile.follow_up_consent = 'granted';
      this.logAudit(chatId, 'consent_granted', { text: text.trim() });
      updated = true;
    }

    // 5a. SOCIAL MEDIA LINK & COMMENT CHECK DETECTION:
    const asksCommentCheck = /\b(comment section paru|comment paru|comments paru|check comments?|read comments?|கமெண்ட் பாரு|கமெண்ட்ஸ் பாரு|கமெண்ட் செக்ஷன் பாரு)\b/i.test(text);
    if (asksCommentCheck) {
      profile.comment_check_requested = true;
      updated = true;
      this.logAudit(chatId, 'comment_check_requested', { text: text.trim() });
    }

    const hasSocialLink = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|instagram\.com|youtube\.com|youtu\.be)\/[^\s]+/i.test(text);
    if (hasSocialLink) {
      profile.social_link_shared = true;
      updated = true;
      this.logAudit(chatId, 'social_link_detected', { text: text.trim() });
    }

    if (text.includes('[IMAGE_SCREENSHOT_SHARED]') || /\b(screenshot|elevation photo|house photo|plan photo|design photo|போட்டோ)\b/i.test(lower)) {
      profile.screenshot_shared = true;
      updated = true;
    }
    if (text.includes('[VIDEO_OR_REEL_SHARED]')) {
      profile.video_shared = true;
      updated = true;
    }

    // 6. PLOT OWNERSHIP & STATUS DETECTION:
    if (
      lower.includes('no i need') || lower.includes('dont have plot') || lower.includes("don't have plot") ||
      lower.includes('need plot') || lower.includes('searching plot') || lower.includes('looking for plot') ||
      lower.includes('looking for a 2-cent plot') || lower.includes('looking for 2 cent plot') ||
      lower.includes('இடம் இல்லை') || lower.includes('இடம் வேண்டும்') || lower.includes('இடம் தேடுகிறேன்') ||
      lower.includes('இடம் வாங்க வேண்டும்')
    ) {
      profile.plot_owned = false;
      profile.plot_status = 'looking_to_buy';
      updated = true;
    } else if (
      lower.includes('have plot') || lower.includes('own plot') || lower.includes('already have') ||
      lower.includes('இடம் இருக்கு') || lower.includes('பிளாட் இருக்கு') || lower.includes('சொந்த இடம்')
    ) {
      profile.plot_owned = true;
      profile.plot_status = 'owned';
      updated = true;
    }

    // 7. PLOT SIZE DETECTION:
    const centMatch = text.match(/(\d+(?:\.\d+)?)\s*[-\s]?\s*(?:cent|cents|சென்ட்)/i);
    const sqftMatch = text.match(/(\d{3,5})\s*[-\s]?\s*(?:sqft|sq\.ft|sq\s*ft|சதுர\s*அடி)/i);
    const dimensionMatch = text.match(/(\d{2}\s*[xX*]\s*\d{2})/);

    if (centMatch) {
      profile.plot_size = `${centMatch[1]} Cents`;
      if (profile.plot_status !== 'looking_to_buy' && profile.plot_owned !== false) {
        profile.plot_owned = true;
        profile.plot_status = 'owned';
      }
      updated = true;
    } else if (sqftMatch && !profile.built_up_area && (lower.includes('plot') || lower.includes('land') || lower.includes('இடம்'))) {
      profile.plot_size = `${sqftMatch[1]} Sq.Ft`;
      if (profile.plot_status !== 'looking_to_buy' && profile.plot_owned !== false) {
        profile.plot_owned = true;
        profile.plot_status = 'owned';
      }
      updated = true;
    } else if (dimensionMatch) {
      profile.plot_size = `${dimensionMatch[1]} ft`;
      if (profile.plot_status !== 'looking_to_buy' && profile.plot_owned !== false) {
        profile.plot_owned = true;
        profile.plot_status = 'owned';
      }
      updated = true;
    }

    // 7b. PLOT TYPE / ORIENTATION DETECTION (Corner Plot vs Middle Plot)
    if (/\b(corner\s*plot|corner|கார்னர்|இரண்டு பக்கம் ரோடு|2 side road|2 பக்கம் ரோடு|corner site)\b/i.test(lower) || text.includes('கார்னர்') || text.includes('இரண்டு பக்கம் ரோடு')) {
      profile.plot_type = 'corner_plot';
      updated = true;
    } else if (/\b(middle\s*plot|middle|மிடில்|ஒரு பக்கம் ரோடு|1 side road|1 பக்கம் ரோடு|center plot)\b/i.test(lower) || text.includes('மிடில்') || text.includes('ஒரு பக்கம் ரோடு')) {
      profile.plot_type = 'middle_plot';
      updated = true;
    }

    // 7c. SETBACK / DRAINAGE / OTS / WATER LINE INQUIRY DETECTION
    if (lower.includes('setback') || lower.includes('இடைவெளி') || lower.includes('drainage') || lower.includes('சாக்கடை') || lower.includes('pipe') || lower.includes('குழாய்') || lower.includes('ots') || lower.includes('open to sky') || lower.includes('water link') || lower.includes('தண்ணீர்') || lower.includes('விதிமுறை') || text.includes('இடம் விட') || lower.includes('784')) {
      profile.setback_inquiry_active = true;
      updated = true;
    }

    // 8. HOUSE TYPE DETECTION (G+1, G+2, Ground floor, Duplex, Villa)
    if (/\b(g\+1|g\s*\+\s*1|duplex|டூப்ளக்ஸ்|இரண்டு மாடி|2 floors|two floors)\b/i.test(lower)) {
      profile.house_type = 'G+1 Duplex';
      updated = true;
    } else if (/\b(g\+2|g\s*\+\s*2|மூன்று மாடி|3 floors|three floors)\b/i.test(lower)) {
      profile.house_type = 'G+2 Triplex';
      updated = true;
    } else if (/\b(ground floor only|ground floor|தரை தளம் மட்டும்|ஒற்றை மாடி|single floor)\b/i.test(lower)) {
      profile.house_type = 'Ground Floor Only';
      updated = true;
    } else if (/\b(villa|வில்லா|luxury villa|farm house|farmhouse)\b/i.test(lower)) {
      profile.house_type = lower.includes('farm') ? 'Farm House' : 'Luxury Villa';
      updated = true;
    }

    // 9. LOCATION & MADURAI REAL-PROOF LANDMARK DETECTION:
    let matchedLandmark = null;
    for (const [areaKey, info] of Object.entries(MADURAI_LANDMARK_MAP)) {
      const tamilStem = info.areaTamil ? info.areaTamil.replace(/ம்$/, '') : '';
      if (lower.includes(areaKey) || (info.areaTamil && (text.includes(info.areaTamil) || (tamilStem && text.includes(tamilStem))))) {
        profile.location = areaKey.charAt(0).toUpperCase() + areaKey.slice(1) + ', Madurai';
        profile.service_area_status = 'approved';
        profile.landmark_info = info;
        profile.needs_landmark_validation = true;
        matchedLandmark = info;
        updated = true;
        console.log(`📍 [Builder Location Matched] ${profile.location} -> Landmark: ${info.landmarks}`);
        break;
      }
    }

    if (!profile.location && (lower.includes('madurai') || lower.includes('மதுரை'))) {
      profile.location = 'Madurai';
      profile.service_area_status = 'approved';
      updated = true;
    }

    const outsideAreas = ['chennai', 'bangalore', 'bengaluru', 'coimbatore', 'kovai', 'trichy', 'salem', 'tirunelveli'];
    for (const outLoc of outsideAreas) {
      if (lower.includes(outLoc)) {
        profile.location = outLoc.charAt(0).toUpperCase() + outLoc.slice(1);
        profile.service_area_status = 'outside_review_needed';
        updated = true;
        break;
      }
    }

    // 10. BUILT-UP AREA DETECTION
    if (sqftMatch && (lower.includes('built') || lower.includes('house size') || lower.includes('வீடு') || profile.plot_size || lower.includes('need'))) {
      profile.built_up_area = `${sqftMatch[1]} Sq.Ft`;
      updated = true;
    }

    // 11. BEDROOMS DETECTION
    const bhkMatch = text.match(/([1-5])\s*bhk/i);
    if (bhkMatch) {
      profile.bedrooms = `${bhkMatch[1]} BHK`;
      updated = true;
    }

    // 12. BUDGET DETECTION
    const budgetMatch = text.match(/(₹?\s*\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|லட்சம்))/i);
    if (budgetMatch) {
      profile.budget = budgetMatch[1].trim();
      updated = true;
    }

    // 13. SITE ADDRESS & LANDMARK DETECTION
    if (lower.includes('street') || lower.includes('தெரு') || lower.includes('road') || lower.includes('bust stand') || lower.includes('bus stand') || lower.includes('near') || lower.includes('no ') || lower.includes('landmark')) {
      if (text.length > 15) {
        profile.site_address = text.trim();
        updated = true;
      }
    }

    // 14. SITE VISIT REQUEST DETECTION
    if (lower.includes('sunday') || lower.includes('monday') || lower.includes('tomorrow') || lower.includes('morning') || lower.includes('evening') || lower.includes('visit') || lower.includes('ஞாயிறு')) {
      if (lower.includes('morning') || lower.includes('evening') || lower.includes('sunday') || lower.includes('pm') || lower.includes('am') || lower.includes('tomorrow')) {
        profile.site_visit_requested = text.trim();
        profile.site_visit_status = 'Pending Team Availability Confirmation';
        updated = true;
      }
    }

    // 15. CUSTOMER EXPLICIT MOBILE NUMBER DETECTION
    const explicitPhoneMatch = text.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/);
    if (explicitPhoneMatch) {
      const num = explicitPhoneMatch[1];
      if (num !== '9361599097') {
        profile.customer_phone = `+91 ${num}`;
        updated = true;
      }
    }

    // 16. ADVANCE CUSTOMER JOURNEY STAGE
    if (profile.complaint?.active) {
      profile.customer_stage = 'complaint_escalation';
    } else if (profile.human_handover?.active) {
      profile.customer_stage = 'human_handover_requested';
    } else if (profile.site_visit_status === 'Confirmed') {
      profile.customer_stage = 'site_visit_confirmed';
    } else if (profile.site_visit_requested) {
      profile.customer_stage = 'site_visit_pending';
    } else if (profile.budget) {
      profile.customer_stage = 'budget_discussion';
    } else if (profile.house_type || profile.built_up_area || profile.bedrooms) {
      profile.customer_stage = 'planning_discussion';
    } else if (profile.plot_size || profile.location || profile.plot_owned !== null) {
      profile.customer_stage = 'requirements_collection';
    } else {
      profile.customer_stage = 'new_enquiry';
    }

    // 17. STRUCTURED FACTS (CONFIRMED VS INFERRED)
    const centVal = profile.plot_size ? parseFloat(profile.plot_size) : null;
    const sqftVal = profile.built_up_area ? parseInt(profile.built_up_area, 10) : null;
    let highFsiFlag = false;
    if (centVal && sqftVal) {
      const plotSqFt = centVal * 435.6;
      if (sqftVal > plotSqFt * 1.8) {
        highFsiFlag = true;
      }
    }

    profile.facts = {
      confirmed: {
        customer_name: profile.customer_name || null,
        customer_phone: profile.customer_phone || null,
        preferred_language: profile.preferred_language,
        plot_status: profile.plot_status, // 'owned' | 'looking_to_buy' | 'unknown'
        plot_size: profile.plot_size,
        location: profile.location,
        site_address: profile.site_address,
        house_type: profile.house_type,
        built_up_area: profile.built_up_area,
        bedrooms: profile.bedrooms,
        budget: profile.budget,
        site_visit_requested: profile.site_visit_requested,
        site_visit_status: profile.site_visit_status,
        follow_up_consent: profile.follow_up_consent
      },
      inferred: {
        recommended_package: profile.preferred_package || (profile.budget ? 'Inferred from budget' : 'Premium Package (₹2,250 – ₹2,350/Sq.Ft)'),
        feasibility_status: highFsiFlag ? 'FLAGGED_HIGH_FSI_NEEDS_ENGINEERING_REVIEW' : 'NORMAL'
      },
      last_updated_at: new Date().toISOString()
    };

    if (updated) {
      profile.updated_at = new Date().toISOString();
      this.saveProfiles();
      console.log(`📋 [BuilderMemory Updated] for ${profile.phone}: stage=${profile.customer_stage}, lang=${profile.preferred_language}`);
    }

    return profile;
  }

  // Calculate next important missing question based on customer stage
  getNextMissingDetail(profile) {
    if (profile.customer_stage === 'complaint_escalation') {
      return 'Acknowledge complaint with deep empathy, apologize for the inconvenience, do not argue, and reassure them that Er. Dhilip Kumar is directly notified.';
    }
    if (profile.customer_stage === 'human_handover_requested') {
      return 'Connect them to Er. Dhilip Kumar at +91 93615 99097 and offer an immediate engineer callback.';
    }
    if (profile.plot_owned === null && !profile.plot_size) {
      return 'Ask if they already own a plot of land or are currently in the planning stage.';
    }
    if (!profile.location) {
      return 'Ask which city or area in Madurai / South TN they are looking at or have their plot in.';
    }
    if (!profile.plot_size) {
      return 'Ask for the plot dimensions or size in Cents / Sq.Ft.';
    }
    if (profile.plot_type === 'unknown' || !profile.plot_type) {
      return 'Ask whether the plot is a Corner Plot (road on 2 sides) or a Middle Plot (road on 1 side) to calculate setback and road clearances accurately.';
    }
    if (!profile.house_type) {
      return 'Ask what type of house they plan to build (Ground floor only, G+1 Duplex, or Luxury Villa).';
    }
    if (!profile.bedrooms && !profile.built_up_area) {
      return 'Ask how many BHK (bedrooms) or approximate Sq.Ft built-up area they want across the floors.';
    }
    if (!profile.budget) {
      return 'Ask what their approximate budget range is for the turnkey civil construction.';
    }
    return 'Offer a Free Site Visit / Soil & Setback Inspection with Er. Dhilip Kumar, explaining road level, UGD drainage slope, and OTS pipe duct planning.';
  }

  // Generate complete context prompt to inject into Gemini turn
  buildContextInjection(chatId, userText) {
    const profile = this.updateFromMessage(chatId, userText);
    const nextStep = this.getNextMissingDetail(profile);

    // Language Directive: Strictly follow locked customer language without conflicting text!
    const langInstruction = (profile.preferred_language === 'English' && profile.explicit_english)
      ? `🌟 ACTIVE LANGUAGE: ENGLISH (EXPLICITLY REQUESTED BY CUSTOMER)
- The customer explicitly requested English. Communicate in clear, consultative, professional English.`
      : `🚨 ACTIVE LANGUAGE: TAMIL (MANDATORY DEFAULT FOR DANAM HOLDINGS)
- You MUST reply 100% ONLY in pure Tamil script (தமிழ் எழுத்துக்களில்).
- Even if customer inputs short English words like "Hi", "Villapuram", "3bhk", "20lakh", you MUST reply in Tamil!
- STRICTLY FORBIDDEN: NEVER USE SINHALA SCRIPT (\u0D80-\u0DFF) AND NEVER USE MALAYALAM SCRIPT (\u0D00-\u0D7F).
- Always use the standard Tamil words "விதிமுறைகளின்படி" or "விதிகளின்படி". NEVER write corrupted words like "நியமங்களின்படி"!
- NEVER write Latin Tanglish (no English spelling of Tamil words).
- CRITICAL VOCABULARY RULE: ALWAYS write technical and measurement terms in ENGLISH script:
  • Use "Corner Plot" & "Middle Plot"
  • Use "Setback"
  • Use "OTS Duct" or "OTS (Open to Sky) Duct"
  • Use "Drainage" & "UGD"
  • Use "cents" or "Cents" (NEVER write "சென்ட்")
  • Use "Sq.Ft" or "sq.ft" (NEVER write "சதுர அடி")
  • Use "Mobile Number" or "Phone Number" (NEVER write "அலைபேசி எண்" or "தொலைபேசி எண்")
  • Use "Plot" (NEVER write "மனை")
  • Use "Budget"
  • Use "Site Visit" (NEVER write "கள ஆய்வு")
  • Use "Floor Plan" & "3D Elevation"
  • Use "G+1", "G+2", "Duplex", "BHK", "Car Parking", "Compound Wall", "Borewell", "EB Connection", "Danam Holdings", "Er. Dhilip Kumar".`;

    const confirmedFacts = [];
    
    // Accurate Plot Ownership Status (eliminating conflict between owning vs looking to buy)
    if (profile.plot_status === 'looking_to_buy') {
      confirmedFacts.push(`Plot Status: Customer does NOT own land yet; they are LOOKING TO PURCHASE a ${profile.plot_size || 'plot'} in ${profile.location || 'Madurai'}. [Status: Confirmed]`);
      confirmedFacts.push(`STRICT VOCABULARY GUARD: NEVER say "உங்களிடம் உள்ள ${profile.plot_size || ''} Plot" (Your plot). ALWAYS say: "நீங்கள் வாங்கத் திட்டமிட்டுள்ள ${profile.plot_size || ''} Plot" (The plot you are planning to purchase)!`);
    } else if (profile.plot_status === 'owned') {
      confirmedFacts.push(`Plot Ownership: Customer owns a ${profile.plot_size || 'plot'} in ${profile.location || 'Madurai'}. [Status: Confirmed]`);
    }

    if (profile.plot_size) {
      confirmedFacts.push(`Plot Size: ${profile.plot_size} [Status: Confirmed]`);
    }

    if (profile.plot_type === 'corner_plot') {
      confirmedFacts.push(`Plot Type: Corner Plot (Road on 2 sides). Road setbacks required on both road-facing sides. [Status: Confirmed]`);
    } else if (profile.plot_type === 'middle_plot') {
      confirmedFacts.push(`Plot Type: Middle Plot (Road on 1 side). Road setback required on front road side; side & rear need minimal boundary clearances. [Status: Confirmed]`);
    } else {
      confirmedFacts.push(`Plot Type: NOT KNOWN YET (Needs check: Corner Plot vs Middle Plot).`);
    }

    if (profile.location) confirmedFacts.push(`Location: ${profile.location} [Status: Confirmed]`);
    if (profile.site_address) confirmedFacts.push(`Site Address / Landmark: ${profile.site_address} [Status: Confirmed]`);
    if (profile.house_type) confirmedFacts.push(`House Type: ${profile.house_type} [Status: Confirmed]`);
    if (profile.built_up_area) confirmedFacts.push(`Built-up Area: ${profile.built_up_area} [Status: Confirmed]`);
    if (profile.bedrooms) confirmedFacts.push(`Bedrooms: ${profile.bedrooms} [Status: Confirmed]`);
    
    // Budget facts
    if (profile.budget) {
      confirmedFacts.push(`Budget: ${profile.budget} [Status: Confirmed]`);
    } else {
      confirmedFacts.push(`Budget: NOT PROVIDED YET. If customer asks "What is my budget?", state clearly that they have not shared their budget yet, and share our transparent package rates (Standard ₹1,850–₹1,950, Premium ₹2,250–₹2,350, Elite Luxury ₹2,750–₹2,950/Sq.Ft).`);
    }

    if (profile.site_visit_requested) {
      confirmedFacts.push(`Site Visit Requested: ${profile.site_visit_requested} [Status: ${profile.site_visit_status || 'Pending Availability Confirmation'}]`);
    }

    // Preliminary Indicative Feasibility Warning
    let feasibilityWarning = '';
    const centVal = profile.plot_size ? parseFloat(profile.plot_size) : null;
    const sqftVal = profile.built_up_area ? parseInt(profile.built_up_area, 10) : null;
    if (centVal && sqftVal) {
      const approxPlotSqFt = Math.round(centVal * 435.6);
      if (sqftVal > (approxPlotSqFt * 1.8)) {
        feasibilityWarning = `
🚨 PRELIMINARY ENGINEERING FEASIBILITY WARNING (INDICATIVE ONLY):
• The customer's plot is ${profile.plot_size} (~${approxPlotSqFt} Sq.Ft), but they mentioned ${profile.built_up_area}.
• A G+1 duplex on a ${profile.plot_size} plot can typically accommodate at most ~${Math.round(approxPlotSqFt * 1.3)} to ${Math.round(approxPlotSqFt * 1.4)} Sq.Ft built-up area after mandatory setbacks and FSI regulations.
• 5,000 Sq.Ft on 4 Cents is NOT feasible for a standard G+1 house (it would require G+3/G+4 with special structural sanctions).
• YOU MUST POLITELY FLAG THIS CONSTRAINT FOR ENGINEERING REVIEW:
  "சார், ${profile.plot_size} Plot-ன் மொத்த பரப்பளவு சுமார் ${approxPlotSqFt} Sq.Ft. 5,000 Sq.Ft கட்டுமானப் பரப்பளவு G+1 வீட்டிற்கு திட்டமிடுவதற்கு முன்பு, Setback, FSI மற்றும் உள்ளூர் கட்டிட அனுமதி விதிமுறைகளைச் சரிபார்க்க வேண்டும். எங்கள் தலைமைப் பொறியாளர் குழுவுடன் ஆலோசித்து சரியான Floor Plan திட்டத்தை வடிவமைக்கலாம் சார்."
• DO NOT approve 5,000 Sq.Ft on 4 Cents blindly or pretend it is a standard G+1 home!`;
      }
    }

    // Active Complaint Alert
    let complaintAlert = '';
    if (profile.customer_stage === 'complaint_escalation' && profile.complaint?.active) {
      complaintAlert = `
🚨 ACTIVE COMPLAINT ESCALATION IN EFFECT:
• Customer Issue: "${profile.complaint.issue}"
• PROTOCOL:
  1. Respectfully acknowledge the concern with sincere empathy and gratitude for bringing it up.
  2. Apologize for the inconvenience or delay caused.
  3. NEVER argue, make excuses, blame the customer, or blame an engineer.
  4. NEVER promise unauthorized monetary compensation or arbitrary discounts.
  5. State clearly that Er. Dhilip Kumar (Chief Turnkey Consultant) has been personally alerted to this chat and will contact them directly with high priority.`;
    }

    // Human Handover Alert
    let humanHandoverAlert = '';
    if (profile.customer_stage === 'human_handover_requested') {
      humanHandoverAlert = `
👤 DIRECT HUMAN / CONSULTANT REQUESTED:
• Customer wants to speak directly with Er. Dhilip Kumar or a senior engineer.
• PROTOCOL:
  1. Warmly confirm: "நிச்சயமாக சார்! எங்கள் தலைமைப் பொறியாளர் Er. Dhilip Kumar அவர்களிடம் உடனடியாகப் பேசலாம்."
  2. Provide official direct line: +91 93615 99097.
  3. Ask if they prefer an immediate callback on this WhatsApp number or if they have an alternate Mobile Number and preferred time.`;
    }

    // Privacy Probe Alert
    let privacyProbeAlert = '';
    if (profile.privacy_probe_active) {
      privacyProbeAlert = `
🔒 CLIENT PRIVACY & NON-DISCLOSURE DIRECTIVE:
• Customer is asking for another customer's quotation, budget, or private records.
• PROTOCOL:
  1. Firmly and politely refuse disclosure based on client confidentiality.
  2. State: "எங்கள் வாடிக்கையாளர்களின் மதிப்பீடுகள் (Quotations) மற்றும் திட்ட விவரங்கள் அனைத்தும் முழுமையாகப் பாதுகாக்கப்படுகின்றன (Strictly Confidential). பிற வாடிக்கையாளர்களின் பிரத்யேக மதிப்பீடுகளைப் பகிர இயலாது. ஆனால் உங்கள் வீட்டிற்கான பிரத்யேக மதிப்பீட்டை எங்கள் அதிகாரப்பூர்வ பேக்கேஜ் கட்டணங்களின்படி நான் உடனே கணக்கிட்டுத் தருகிறேன் சார்!"
  3. In English: "We maintain strict confidentiality regarding all our clients' project details and financial quotations. We never disclose other clients' personal records. However, I can gladly share our approved package rates and calculate a customized preliminary estimate for you!"`;
    }

    // Service Area Alert
    let serviceAreaAlert = '';
    if (profile.service_area_status === 'outside_review_needed') {
      serviceAreaAlert = `
⚠️ SERVICE AREA NOTICE:
• Customer location (${profile.location}) is outside our primary Madurai & South TN belt.
• State politely: "எங்கள் முதன்மை கட்டுமானப் பணிகள் மதுரை மற்றும் தென் தமிழகத்தில் நடைபெற்று வருகின்றன. உங்கள் பகுதியில் திட்டத்தை மேற்கொள்ள முடியுமா என்பதை எங்கள் பொறியாளர் குழுவுடன் ஆலோசித்துவிட்டுத் தெரிவிக்கிறேன் சார்."`;
    }

    // Landmark Validation Prompt (Triggered when customer shares an area)
    let landmarkValidationPrompt = '';
    if (profile.needs_landmark_validation && profile.landmark_info) {
      landmarkValidationPrompt = `
📍 MANDATORY LOCAL REAL-PROOF LANDMARK VALIDATION:
• The customer's plot/site is located in: "${profile.location}".
• You MUST immediately validate this location with authentic local knowledge before asking about budget or anything else!
• Validation question to use:
  "${profile.landmark_info.promptSnippet}"
• Example: If Villapuram, say "ஆஹா வில்லாபுரம் அருமையான இடம் சார்! Vetri Theater பக்கமா அல்லது Housing Board பக்கமா உங்கள் Site அமைந்திருக்கிறது சார்?"
• If Goripalayam, say "ஆஹா கோரிப்பாளையம்! தேவர் சிலை (Thevar Silai) பக்கமா அல்லது GH பக்கமா உங்கள் Plot அமைந்திருக்கிறது சார்?"
• DO NOT just give generic praise like "Villapuram is a fantastic area" — ask the landmark question!`;
      profile.needs_landmark_validation = false;
      this.saveProfiles();
    }

    // Social Media Link / Reel / Comment Query Handling
    let socialLinkPrompt = '';
    if (profile.comment_check_requested || profile.social_link_shared || /(?:facebook\.com|instagram\.com|fb\.watch|youtu\.be|youtube\.com)/i.test(userText)) {
      socialLinkPrompt = `
🎥 SOCIAL MEDIA LINK / COMMENT SECTION HANDLING DIRECTIVE (STRICT ZERO-HALLUCINATION):
• Customer shared a video link or asked you to check comments ("Comment section paru").
• ABSOLUTE RULE: NEVER HALLUCINATE OR CLAIM THAT YOU WATCHED THE VIDEO OR READ COMMENTS ON FACEBOOK/INSTAGRAM!
• Explain honestly, politely, and helpfully in Tamil:
  "சார், Facebook/Instagram பாதுகாப்பு விதிமுறைகளின்படி (Login & Privacy Protection), வாட்ஸ்அப் வழியாக AI-யால் அங்குள்ள நேரடி கமெண்ட்களைப் (Comments) படிக்க இயலாது சார்.
  ஆனால் Danam Holdings சார்பாக அந்த வீடியோவில் நீங்கள் பார்த்த வீடு கட்டும் பிளான், 3D Elevation அல்லது பட்ஜெட் சம்பந்தமான எந்த கேள்விகளுக்கும் நான் உடனடியாக உங்களுக்கு துல்லியமான விளக்கம் மற்றும் மதிப்பீடு தருகிறேன் சார்!
  இந்த வீடியோவில் உங்களுக்குப் பிடித்த எலிவேஷன் (3D Elevation) அல்லது பிளான் உள்ள பகுதியை ஒரு Screenshot எடுத்து இங்கே வாட்ஸ்அப்பில் பகிருங்கள் சார்! எங்கள் AI உடனே அந்த டிசைனை ஸ்கேன் செய்து, உங்கள் பிளாட்டிற்கு அது பொருந்துமா மற்றும் தோராயமான பட்ஜெட் என்ன ஆகும் என்று உடனடியாகக் கணக்கிட்டுத் தரும்! 🏡"
• If [LINK PREVIEW METADATA] was extracted in the user message, acknowledge the actual video title/topic respectfully!`;
    }

    const civilConsultationPrompt = `
🏛️ CIVIL ENGINEERING CONSULTATION DIRECTIVE (PLOT TYPES, SETBACKS, OTS DUCT & DRAINAGE):
• 1. CORNER PLOT VS MIDDLE PLOT DISCOVERY:
  - If plot type is unknown or customer mentions setback/plan: Ask:
    "சார், உங்கள் இடம் ஒரு Corner Plot-ஆ (இரண்டு பக்கம் ரோடு) அல்லது Middle Plot-ஆ (ஒரு பக்கம் ரோடு) சார்?"
  - Explain: Corner Plot requires setback on BOTH road-facing sides (முன்புறம் மற்றும் பக்கவாட்டு ரோடு); Middle Plot requires setback on the single front road side, with minimal boundary clearance on the other 3 sides.
• 2. WATER LINK, DRAINAGE & OTS (OPEN TO SKY) SERVICE DUCT:
  - Ground floor service space: For drinking water connection, underground drainage (UGD) line, and sewage chamber, dedicated open clearance space must be reserved on at least one side at the Ground Floor level.
  - Vertical continuation across all floors: This plumbing line clearance continues vertically up to all upper floors (G, G+1, G+2).
  - OTS (Open to Sky) Duct: A dedicated vertical open shaft/duct inside or along the building must be planned from terrace to ground.
    * All water pipes, PVC soil/waste lines, and drainage run cleanly inside this OTS duct without cutting structural RCC beams.
    * Conceals pipes from bedroom/living view and allows easy lifetime maintenance without breaking walls.
• 3. SITE VISIT JUSTIFICATION (ABSOLUTE PROHIBITION OF ROBOTIC REPETITION):
  - NEVER repeat "Site Visit ஏற்பாடு செய்யலாமா சார்?" nakedly or mechanically in back-to-back turns!
  - When discussing floor plans, setback, or site visits, ALWAYS justify the site visit with real civil engineering factors:
    1. Road width & Corporation setback calculation
    2. Road level vs plot level (plinth height check to prevent flood water entry)
    3. Underground Drainage (UGD) chamber depth & gravity slope direction
    4. Physical boundary check (Corner vs Middle plot dimensions)
    5. Optimal placement of OTS plumbing/drainage duct so zero space is wasted in rooms
  - Conclude naturally: Because of these factors, an on-site physical inspection by Er. Dhilip Kumar / engineering team is recommended before finalizing the floor plan to make 100% efficient use of every single square foot!`;

    const customerPhone = this.getVerifiedCustomerPhone(chatId, profile);
    const customerPhoneSummary = customerPhone 
      ? `• Customer's Verified Mobile Number: ${customerPhone}`
      : `• Customer's Mobile Number: Not explicitly shared yet (Chatting via WhatsApp). DO NOT state the bot's number (+91 93615 99097) as the customer's number!`;

    const phoneDirective = customerPhone
      ? `State ONLY their actual Mobile Number: ${customerPhone}.`
      : `Do NOT guess or invent any number (and NEVER make up a phone number or format WhatsApp device IDs). State politely: "நீங்கள் தற்போது என்னுடன் வாட்ஸ்அப்பில் தொடர்பு கொண்டுள்ளீர்கள் சார். இந்த WhatsApp Chat மூலமாகவே எங்கள் தலைமைப் பொறியாளர் Er. Dhilip Kumar உங்களைத் தொடர்புகொள்வார். தேவைப்பட்டால் உங்கள் நேரடி Mobile Number-ஐப் பகிரலாம்!"`;

    return `
======================================================================
[CRITICAL MEMORY & CONVERSATION STATE - CHAT: ${chatId}]
${langInstruction}

STRUCTURED CUSTOMER FACTS (CONFIRMED VS INFERRED):
Confirmed Facts:
${confirmedFacts.length > 0 ? confirmedFacts.map(k => `• ${k}`).join('\n') : '• No previous details recorded yet.'}

Inferred Facts & Inferred Status:
• Customer Journey Stage: ${profile.customer_stage}
• Recommended Package: ${profile.facts?.inferred?.recommended_package || 'Premium Package (₹2,250 – ₹2,350/Sq.Ft)'}
• Feasibility Status: ${profile.facts?.inferred?.feasibility_status || 'NORMAL'}
• Last State Update: ${profile.facts?.last_updated_at || profile.updated_at}
${feasibilityWarning}
${complaintAlert}
${humanHandoverAlert}
${privacyProbeAlert}
${serviceAreaAlert}
${landmarkValidationPrompt}
${socialLinkPrompt}
${civilConsultationPrompt}

VERIFIED PHONE NUMBERS (STRICT INTEGRITY):
• BOT / Danam Holdings Official Business Line: +91 93615 99097 (THIS IS OUR BOT'S NUMBER! NEVER say this is the customer's phone number!)
${customerPhoneSummary}

NEXT RECOMMENDED ACTION:
${nextStep}

CRITICAL OPERATIONAL RULES FOR THIS TURN:
1. DO NOT re-ask any detail listed above as ALREADY KNOWN.
2. ANSWER IMMEDIATE INTENT FIRST:
   - If the customer asks a specific question (e.g. package specifications, price per Sq.Ft, portfolio, or site visit), answer that question completely before asking for any missing detail. Do not force an interrogation questionnaire!
3. PHONE NUMBER INTEGRITY:
   - NEVER tell the customer "Your mobile number is +91 93615 99097"! That is OUR company's WhatsApp bot number.
   - If the customer asks "What is my number?" or "Intha number sollu / check my number":
     ${phoneDirective}
   - If the customer asks for Er. Dhilip Kumar's or Danam Holdings contact number:
     Share ONLY the official business number: +91 93615 99097. NEVER invent any fake number like +91 98421 82955!
   - When coordinating a Site Visit, do NOT demand a phone number:
     Say: "இந்த WhatsApp Chat மூலமாகவே உங்களைத் தொடர்புகொள்ளலாமா, அல்லது மாற்று Mobile Number ஏதும் உள்ளதா சார்?"
4. PRELIMINARY ESTIMATES & EXCLUSIONS:
   - Always state that cost estimates represent Preliminary Civil Construction estimates.
   - Premium Package: ₹2,250 – ₹2,350 / Sq.Ft. Standard: ₹1,850 – ₹1,950 / Sq.Ft. Elite Luxury: ₹2,750 – ₹2,950 / Sq.Ft.
   - Clearly clarify exclusions: Compound wall, deep borewell beyond 300ft, EB meter deposit, and municipal approval fees.
   - NEVER invent per-running-foot rates or arbitrary numbers for extra work! State that exact extra-work costs require on-site measurement and customized quotation.
5. NO FAKE URGENCY OR PRESSURE:
   - NEVER say "Only 2 slots left", "Price rises tomorrow", or create artificial pressure. Give customers time to decide.
6. SITE VISIT CONFIRMATION:
   - A site visit is NEVER confirmed automatically simply because the customer gave a day/time (e.g. "Come Sunday morning").
   - Always state: "உங்கள் Site Visit கோரிக்கையைப் பதிவு செய்துள்ளேன். எங்கள் பொறியாளர் குழுவின் Availability-ஐ உறுதி செய்துவிட்டு உங்களுக்குத் தெரிவிக்கிறேன் சார்."
   - NEVER say "Site visit is confirmed" or "ஏற்பாடு செய்துவிட்டேன்" until our team actually confirms the slot!
7. GREETINGS & CONTINUITY:
   - If customer says "Hi", "Are you there?" or greetings after some time: Acknowledge warmly without restarting qualification. Mention known details naturally (e.g., G+1 plan in ${profile.location || 'Madurai'}) and continue smoothly.
8. ACCURACY & SCRIPT:
   - Ask EXACTLY ONE question at a time.
   - Show arithmetic cleanly: e.g., 2,400 Sq.Ft × ₹2,350 = ₹56,40,000.
======================================================================
`;
  }
}

module.exports = new BuilderCustomerMemory();
