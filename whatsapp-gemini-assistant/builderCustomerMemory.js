const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'builder_customer_profiles.json');
const BOT_PHONE = '919361599097';

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

  getCleanPhone(chatId = '') {
    return String(chatId).replace(/\D/g, '');
  }

  getVerifiedCustomerPhone(chatId = '', profile = null) {
    if (profile && profile.customer_phone) {
      return profile.customer_phone;
    }
    const str = String(chatId);
    if (str.endsWith('@lid') || str.includes('lid:')) {
      return null; // WhatsApp Linked Device privacy ID, NOT a phone number!
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
        preferred_language: 'English', // ALWAYS START FIRST CHAT IN ENGLISH BY DEFAULT!
        plot_owned: null,
        plot_size: null,
        location: null,
        site_address: null,
        house_type: null,
        built_up_area: null,
        bedrooms: null,
        budget: null,
        preferred_package: null,
        starting_timeline: null,
        site_visit_requested: null,
        site_visit_status: null,
        conversation_stage: 'Initial greeting',
        updated_at: new Date().toISOString()
      };
      this.saveProfiles();
    }
    return this.profiles[phone];
  }

  // Update profile from incoming message heuristics
  updateFromMessage(chatId, text = '') {
    const profile = this.getProfile(chatId);
    const lower = text.toLowerCase();
    let updated = false;

    // 1. STRICT LANGUAGE DETECTION & LOCKING:
    // ALWAYS start in English. Switch language ONLY when the customer explicitly requests it, then lock it!
    const asksTamil = /\b(tamil|தமிழ்|thamil|thamizh)\b/i.test(text) || 
                      lower.includes('speak tamil') || 
                      lower.includes('chat tamil') || 
                      lower.includes('in tamil') || 
                      lower.includes('want tamil') || 
                      lower.includes('reply in tamil') || 
                      lower.includes('reply me in tamil') || 
                      lower.includes('tamil la') || 
                      lower.includes('tamil theriyuma');
    const asksEnglish = /\b(english|ஆங்கிலம்)\b/i.test(text) || lower.includes('speak english') || lower.includes('in english') || lower.includes('reply in english');
    const asksTanglish = /\b(tanglish)\b/i.test(text) || lower.includes('speak tanglish') || lower.includes('in tanglish');

    if (asksTamil) {
      if (profile.preferred_language !== 'Tamil') {
        profile.preferred_language = 'Tamil';
        updated = true;
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ TAMIL`);
      }
    } else if (asksEnglish) {
      if (profile.preferred_language !== 'English') {
        profile.preferred_language = 'English';
        updated = true;
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ ENGLISH`);
      }
    } else if (asksTanglish) {
      if (profile.preferred_language !== 'Tanglish') {
        profile.preferred_language = 'Tanglish';
        updated = true;
        console.log(`🔒 [Language Switched & Locked] ${profile.phone} ➔ TANGLISH`);
      }
    }

    // 2. PLOT OWNERSHIP & SIZE DETECTION
    const centMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents|சென்ட்)/i);
    const sqftMatch = text.match(/(\d{3,5})\s*(?:sqft|sq\.ft|sq\s*ft|சதுர\s*அடி)/i);
    const dimensionMatch = text.match(/(\d{2}\s*[xX*]\s*\d{2})/);

    if (centMatch) {
      profile.plot_size = `${centMatch[1]} cents`;
      profile.plot_owned = true;
      updated = true;
    } else if (sqftMatch && !profile.built_up_area && (lower.includes('plot') || lower.includes('land') || lower.includes('இடம்'))) {
      profile.plot_size = `${sqftMatch[1]} sq.ft`;
      profile.plot_owned = true;
      updated = true;
    } else if (dimensionMatch) {
      profile.plot_size = `${dimensionMatch[1]} ft`;
      profile.plot_owned = true;
      updated = true;
    }

    if (lower.includes('have plot') || lower.includes('own plot') || lower.includes('இடம் இருக்கு') || lower.includes('பிளாட் இருக்கு') || lower.includes('சொந்த இடம்')) {
      profile.plot_owned = true;
      updated = true;
    }

    // 3. HOUSE TYPE DETECTION (G+1, G+2, Ground floor, Duplex, Villa)
    if (/\b(g\+1|g\s*\+\s*1|duplex|டூப்ளக்ஸ்|இரண்டு மாடி|2 floors|two floors)\b/i.test(lower)) {
      profile.house_type = 'G+1 Duplex';
      updated = true;
    } else if (/\b(g\+2|g\s*\+\s*2|three floors|3 floors)\b/i.test(lower)) {
      profile.house_type = 'G+2 Triplex';
      updated = true;
    } else if (/\b(ground floor|g\+0|single floor|தரை தளம்)\b/i.test(lower)) {
      profile.house_type = 'Ground Floor Only (Individual House)';
      updated = true;
    }

    // 4. LOCATION DETECTION
    const knownLocations = [
      'vagaikulam', 'வாகைகுளம்', 'madurai', 'மதுரை', 'selvapuram', 'செல்வபுரம்',
      'othakadai', 'ஒத்தக்கடை', 'tirunagar', 'திருநகர்', 'k.pudur', 'புதூர்',
      'samayanallur', 'villapuram', 'anna nagar', 'theni', 'தேனி', 'dindigul',
      'திண்டுக்கல்', 'sivagangai', 'சிவகங்கை', 'virudhunagar', 'விருதுநகர்',
      'alagar kovil', 'mattuthavani', 'maruthupandiyar nagar', 'avaniyapuram'
    ];
    for (const loc of knownLocations) {
      if (lower.includes(loc.toLowerCase())) {
        profile.location = loc.charAt(0).toUpperCase() + loc.slice(1);
        updated = true;
        break;
      }
    }

    // 5. BUILT-UP AREA DETECTION (if already has plot or mentions house size)
    if (sqftMatch && (lower.includes('built') || lower.includes('house size') || lower.includes('வீடு') || profile.plot_size)) {
      profile.built_up_area = `${sqftMatch[1]} sq.ft`;
      updated = true;
    }

    // 6. BEDROOMS
    const bhkMatch = text.match(/([1-5])\s*bhk/i);
    if (bhkMatch) {
      profile.bedrooms = `${bhkMatch[1]} BHK`;
      updated = true;
    }

    // 7. BUDGET
    const budgetMatch = text.match(/(₹?\s*\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|லட்சம்))/i);
    if (budgetMatch) {
      profile.budget = budgetMatch[1];
      updated = true;
    }

    // 8. SITE ADDRESS & LANDMARK DETECTION
    if (lower.includes('street') || lower.includes('தெரு') || lower.includes('road') || lower.includes('bust stand') || lower.includes('bus stand') || lower.includes('near') || lower.includes('no ') || lower.includes('landmark')) {
      if (text.length > 15) {
        profile.site_address = text.trim();
        updated = true;
      }
    }

    // 9. SITE VISIT REQUEST DETECTION
    if (lower.includes('sunday') || lower.includes('monday') || lower.includes('tomorrow') || lower.includes('morning') || lower.includes('evening') || lower.includes('visit') || lower.includes('ஞாயிறு')) {
      if (lower.includes('morning') || lower.includes('evening') || lower.includes('sunday') || lower.includes('pm') || lower.includes('am')) {
        profile.site_visit_requested = text.trim();
        profile.site_visit_status = 'Pending Team Availability Confirmation';
        updated = true;
      }
    }

    // 10. CUSTOMER EXPLICIT MOBILE NUMBER DETECTION
    const explicitPhoneMatch = text.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/);
    if (explicitPhoneMatch) {
      const num = explicitPhoneMatch[1];
      if (num !== '9361599097') {
        profile.customer_phone = `+91 ${num}`;
        updated = true;
      }
    }

    // 11. UPDATE CONVERSATION STAGE
    if (profile.plot_size && profile.location && profile.house_type) {
      profile.conversation_stage = 'Floor plan & built-up area estimation';
    } else if (profile.plot_size || profile.location) {
      profile.conversation_stage = 'Project qualification';
    }

    if (updated) {
      profile.updated_at = new Date().toISOString();
      this.saveProfiles();
      console.log(`📋 [BuilderMemory Updated] for ${profile.phone}:`, JSON.stringify(profile));
    }

    return profile;
  }

  // Calculate next important missing question
  getNextMissingDetail(profile) {
    if (profile.plot_owned === null && !profile.plot_size) {
      return 'Ask if they already own a plot of land or are in the planning stage.';
    }
    if (!profile.plot_size) {
      return 'Ask for the plot dimensions or size (e.g. 4 cents, 30x40, 1200 sq.ft).';
    }
    if (!profile.location) {
      return 'Ask what city, area, or locality their plot is located in (e.g. Vagaikulam, Madurai).';
    }
    if (!profile.house_type) {
      return 'Ask what type of house they plan to build (Ground floor only, G+1 Duplex, or Luxury Villa).';
    }
    if (!profile.built_up_area) {
      return 'Ask approximately how many square feet (built-up area) they want across the floors.';
    }
    if (!profile.budget) {
      return 'Ask what their approximate budget range is for the construction.';
    }
    return 'Offer a Free Site Visit / Soil Inspection or 3D Architectural consultation with Er. Dhilip Kumar.';
  }

  // Generate complete context prompt to inject into Gemini turn
  buildContextInjection(chatId, userText) {
    const profile = this.updateFromMessage(chatId, userText);
    const nextStep = this.getNextMissingDetail(profile);

    const langInstruction = profile.preferred_language === 'Tamil'
      ? `🚨 STRICT TAMIL LANGUAGE LOCK: The customer has requested Tamil.
- You MUST reply 100% ONLY in pure Tamil script (தமிழ் எழுத்துக்களில்).
- STRICTLY FORBIDDEN: NEVER USE MALAYALAM SCRIPT (NO മലയാളം, NO Malayalam letters or words under any circumstance!).
- NEVER write Latin Tanglish (no English spelling of Tamil words).
- CRITICAL VOCABULARY RULE (USER DIRECTIVE): ALWAYS write technical and measurement terms in ENGLISH script:
  • Use "cents" or "Cents" (NEVER write "சென்ட்")
  • Use "Sq.Ft" or "sq.ft" (NEVER write "சதுர அடி")
  • Use "Mobile Number" or "Phone Number" (NEVER write "அலைபேசி எண்" or "தொலைபேசி எண்")
  • Use "Plot" (NEVER write "மனை")
  • Use "Budget"
  • Use "Site Visit" (NEVER write "கள ஆய்வு")
  • Use "Floor Plan" & "3D Elevation"
  • Use "G+1", "G+2", "Duplex", "BHK", "Car Parking", "Compound Wall", "Borewell", "EB Connection", "Danam Holdings", "Er. Dhilip Kumar".`
      : profile.preferred_language === 'Tanglish'
      ? `🚨 STRICT TANGLISH LANGUAGE LOCK: The customer requested Tanglish. Reply naturally in Tanglish with polite civil engineering warmth.`
      : `🌟 DEFAULT ENGLISH MODE: You MUST reply in clear, professional, consultative English.
- Always conduct the initial/first chat in English by default.
- Only switch to Tamil or Tanglish if the customer explicitly requests to change language (e.g. "Can you speak Tamil", "Reply in Tamil", etc.).`;

    const knownSummary = [];
    if (profile.plot_size) knownSummary.push(`Plot Size: ${profile.plot_size} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.plot_owned !== null) knownSummary.push(`Plot Ownership: ${profile.plot_owned ? 'Owns plot' : 'Looking for plot'} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.location) knownSummary.push(`Location: ${profile.location} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.site_address) knownSummary.push(`Site Address / Landmark: ${profile.site_address} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.house_type) knownSummary.push(`House Type: ${profile.house_type} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.built_up_area) knownSummary.push(`Built-up Area: ${profile.built_up_area} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.bedrooms) knownSummary.push(`Bedrooms: ${profile.bedrooms} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.budget) knownSummary.push(`Budget: ${profile.budget} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.site_visit_requested) knownSummary.push(`Site Visit Requested: ${profile.site_visit_requested} [Status: ${profile.site_visit_status || 'Pending Availability Confirmation'}] (ALREADY KNOWN)`);

    // Feasibility warning check (e.g. 5,000 sq.ft on 4 cents)
    let feasibilityWarning = '';
    const centVal = profile.plot_size ? parseFloat(profile.plot_size) : null;
    const sqftVal = profile.built_up_area ? parseInt(profile.built_up_area, 10) : null;
    if (centVal && sqftVal) {
      const approxPlotSqFt = Math.round(centVal * 435.6);
      if (sqftVal > (approxPlotSqFt * 1.8)) {
        feasibilityWarning = `
🚨 CRITICAL ENGINEERING FEASIBILITY WARNING:
• The customer's plot is ${profile.plot_size} (~${approxPlotSqFt} sq.ft), but they requested ${profile.built_up_area}.
• A G+1 duplex on a ${profile.plot_size} plot can realistically accommodate at most ~2,000 to 2,400 sq.ft built-up area after mandatory setbacks and FSI regulations.
• 5,000 sq.ft on 4 cents is NOT feasible for a G+1 house (it would require G+3/G+4 with commercial/special planning approvals).
• YOU MUST POLITELY CLARIFY THIS FEASIBILITY CONSTRAINT:
  "சார், உங்கள் 4 Cents Plot-ன் மொத்த பரப்பளவு சுமார் 1,742 Sq.Ft. 5,000 Sq.Ft கட்டுமானப் பரப்பளவு G+1 வீட்டிற்கு திட்டமிடுவதற்கு முன்பு, Setback, FSI மற்றும் உள்ளூர் கட்டிட அனுமதி விதிமுறைகளைச் சரிபார்க்க வேண்டும். உங்கள் 5,000 Sq.Ft என்பது இரண்டு தளங்களையும் சேர்த்த மொத்த பரப்பளவா சார்?"
• DO NOT quote or approve 5,000 sq.ft without flagging this feasibility constraint!`;
      }
    }

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
Language Lock: ${profile.preferred_language || 'Auto-detect'}
${langInstruction}

KNOWN CUSTOMER DETAILS (VERIFIED FROM MEMORY):
${knownSummary.length > 0 ? knownSummary.map(k => `• ${k}`).join('\n') : '• No previous details recorded yet.'}
${feasibilityWarning}

VERIFIED PHONE NUMBERS (STRICT INTEGRITY):
• BOT / Danam Holdings Official Business Line: +91 93615 99097 (THIS IS OUR BOT'S NUMBER! NEVER say this is the customer's phone number!)
${customerPhoneSummary}

NEXT MISSING ACTION:
${nextStep}

CRITICAL OPERATIONAL RULES FOR THIS TURN:
1. DO NOT re-ask any detail listed above as ALREADY KNOWN.
2. PHONE NUMBER INTEGRITY:
   - NEVER tell the customer "Your mobile number is +91 93615 99097"! That is OUR company's WhatsApp bot number.
   - If the customer asks "What is my number?" or "Intha number sollu / check my number":
     ${phoneDirective}
   - If the customer asks for Er. Dhilip Kumar's direct number or company contact:
     Share ONLY the official business number: +91 93615 99097. NEVER invent any fake number like +91 98421 82955!
   - When coordinating a Site Visit, do NOT demand a phone number:
     Say: "இந்த WhatsApp Chat மூலமாகவே உங்களைத் தொடர்புகொள்ளலாமா, அல்லது மாற்று Mobile Number ஏதும் உள்ளதா சார்?"
3. SITE VISIT CONFIRMATION:
   - A site visit is NEVER confirmed automatically simply because the customer gave a day/time.
   - Always state: "உங்கள் Site Visit கோரிக்கையைப் பதிவு செய்துள்ளேன். எங்கள் பொறியாளர் குழுவின் Availability-ஐ உறுதி செய்துவிட்டு உங்களுக்குத் தெரிவிக்கிறேன் சார்."
   - NEVER say "Site visit is confirmed" or "ஏற்பாடு செய்துவிட்டேன்" until our team actually confirms the slot!
4. EXTRA WORK & EXCLUSIONS:
   - Explain inclusions vs exclusions clearly (Compound wall, deep borewell beyond 300ft, EB deposits are exclusions).
   - NEVER invent per-running-foot rates or arbitrary numbers for compound wall or borewell! State that exact extra-work costs require on-site measurement and customized quotation.
5. DESIGN DELIVERY TIMELINE:
   - When asked about 2D plans or 3D elevation delivery: Explain that site measurements and customer requirements must be completed first, then the design team confirms the delivery timeline. Do NOT promise 3–5 days without team confirmation.
6. GREETINGS & CONTINUITY:
   - If customer says "Hi", "Are you there?" or greetings: Acknowledge warmly without restarting qualification. Mention known details (e.g., G+1 plan in ${profile.location || 'Madurai'}) and continue smoothly.
7. ACCURACY:
   - Ask EXACTLY ONE question at a time.
   - Show arithmetic cleanly: e.g., 2,400 sq.ft × ₹2,350 = ₹56,40,000.
======================================================================
`;
  }
}

module.exports = new BuilderCustomerMemory();
