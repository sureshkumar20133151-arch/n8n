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
        preferred_language: 'English', // Initial default until customer requests otherwise
        plot_owned: null,              // true (owns plot), false (looking to purchase)
        plot_status: 'unknown',        // 'owned', 'looking_to_buy', 'unknown'
        plot_size: null,               // e.g. '2 Cents', '4 Cents'
        location: null,
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
        customer_stage: 'new_enquiry', // Customer journey stage
        follow_up_consent: 'not_asked',// 'granted', 'declined', 'not_asked'
        complaint: null,               // { active: true, issue: '...', logged_at: '...' }
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

    // 2. COMPLAINT & SERVICE ISSUE DETECTION:
    const complaintMatch = text.match(/\b(complaint|problem|delay|cheated|poor work|bad service|refund|cancel|dispute|money issue|waste|தாமதம்|மோசம்|ஏமாற்று|புகார்|பணம் பிரச்சனை)\b/i);
    if (complaintMatch) {
      profile.customer_stage = 'complaint_escalation';
      profile.complaint = {
        active: true,
        issue: text.trim(),
        logged_at: new Date().toISOString()
      };
      updated = true;
    }

    // 3. FOLLOW-UP CONSENT DETECTION:
    if (/\b(stop|unsubscribe|don't message|dont message|no follow up|வேண்டாம்|மெசேஜ் பண்ணாதீங்க|மெசேஜ் செய்ய வேண்டாம்)\b/i.test(lower)) {
      profile.follow_up_consent = 'declined';
      updated = true;
    } else if (/\b(yes please|share photos|send details|வாட்ஸ்அப்பில் அனுப்புங்கள்|அனுப்புங்கள்)\b/i.test(lower)) {
      profile.follow_up_consent = 'granted';
      updated = true;
    }

    // 4. PLOT OWNERSHIP & STATUS DETECTION:
    if (
      lower.includes('no i need') || lower.includes('dont have plot') || lower.includes("don't have plot") ||
      lower.includes('need plot') || lower.includes('searching plot') || lower.includes('looking for plot') ||
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

    // 5. PLOT SIZE DETECTION:
    const centMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:cent|cents|சென்ட்)/i);
    const sqftMatch = text.match(/(\d{3,5})\s*(?:sqft|sq\.ft|sq\s*ft|சதுர\s*அடி)/i);
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

    // 6. HOUSE TYPE DETECTION (G+1, G+2, Ground floor, Duplex, Villa)
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

    // 7. LOCATION & SERVICE AREA DETECTION
    const knownLocations = [
      'vagaikulam', 'வாகைகுளம்', 'madurai', 'மதுரை', 'selvapuram', 'செல்வபுரம்',
      'othakadai', 'ஒத்தக்கடை', 'tirunagar', 'திருநகர்', 'k.pudur', 'புதூர்',
      'theppakulam', 'தெப்பக்குளம்', 'samayanallur', 'villapuram', 'anna nagar',
      'theni', 'தேனி', 'dindigul', 'திண்டுக்கல்', 'sivagangai', 'சிவகங்கை',
      'virudhunagar', 'விருதுநகர்', 'alagar kovil', 'mattuthavani',
      'maruthupandiyar nagar', 'avaniyapuram'
    ];
    for (const loc of knownLocations) {
      if (lower.includes(loc.toLowerCase())) {
        profile.location = loc.charAt(0).toUpperCase() + loc.slice(1);
        profile.service_area_status = 'approved';
        updated = true;
        break;
      }
    }
    const outsideLocations = ['chennai', 'சென்னை', 'coimbatore', 'கோவை', 'trichy', 'திருச்சி', 'salem', 'சேலம்', 'bangalore', 'பெங்களூரு'];
    for (const outLoc of outsideLocations) {
      if (lower.includes(outLoc.toLowerCase())) {
        profile.location = outLoc.charAt(0).toUpperCase() + outLoc.slice(1);
        profile.service_area_status = 'outside_review_needed';
        updated = true;
        break;
      }
    }

    // 8. BUILT-UP AREA DETECTION
    if (sqftMatch && (lower.includes('built') || lower.includes('house size') || lower.includes('வீடு') || profile.plot_size)) {
      profile.built_up_area = `${sqftMatch[1]} Sq.Ft`;
      updated = true;
    }

    // 9. BEDROOMS DETECTION
    const bhkMatch = text.match(/([1-5])\s*bhk/i);
    if (bhkMatch) {
      profile.bedrooms = `${bhkMatch[1]} BHK`;
      updated = true;
    }

    // 10. BUDGET DETECTION
    const budgetMatch = text.match(/(₹?\s*\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|லட்சம்))/i);
    if (budgetMatch) {
      profile.budget = budgetMatch[1];
      updated = true;
    }

    // 11. SITE ADDRESS & LANDMARK DETECTION
    if (lower.includes('street') || lower.includes('தெரு') || lower.includes('road') || lower.includes('bust stand') || lower.includes('bus stand') || lower.includes('near') || lower.includes('no ') || lower.includes('landmark')) {
      if (text.length > 15) {
        profile.site_address = text.trim();
        updated = true;
      }
    }

    // 12. SITE VISIT REQUEST DETECTION
    if (lower.includes('sunday') || lower.includes('monday') || lower.includes('tomorrow') || lower.includes('morning') || lower.includes('evening') || lower.includes('visit') || lower.includes('ஞாயிறு')) {
      if (lower.includes('morning') || lower.includes('evening') || lower.includes('sunday') || lower.includes('pm') || lower.includes('am')) {
        profile.site_visit_requested = text.trim();
        profile.site_visit_status = 'Pending Team Availability Confirmation';
        updated = true;
      }
    }

    // 13. CUSTOMER EXPLICIT MOBILE NUMBER DETECTION
    const explicitPhoneMatch = text.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/);
    if (explicitPhoneMatch) {
      const num = explicitPhoneMatch[1];
      if (num !== '9361599097') {
        profile.customer_phone = `+91 ${num}`;
        updated = true;
      }
    }

    // 14. CUSTOMER JOURNEY STAGE ADVANCEMENT
    if (profile.complaint?.active) {
      profile.customer_stage = 'complaint_escalation';
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

    if (updated) {
      profile.updated_at = new Date().toISOString();
      this.saveProfiles();
      console.log(`📋 [BuilderMemory Updated] for ${profile.phone}:`, JSON.stringify(profile));
    }

    return profile;
  }

  // Calculate next important missing question based on customer stage
  getNextMissingDetail(profile) {
    if (profile.customer_stage === 'complaint_escalation') {
      return 'Acknowledge complaint with deep empathy, apologize for the inconvenience, do not argue, and reassure them that Er. Dhilip Kumar is directly notified.';
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
    if (!profile.house_type) {
      return 'Ask what type of house they plan to build (Ground floor only, G+1 Duplex, or Luxury Villa).';
    }
    if (!profile.bedrooms && !profile.built_up_area) {
      return 'Ask how many BHK (bedrooms) or approximate Sq.Ft built-up area they want across the floors.';
    }
    if (!profile.budget) {
      return 'Ask what their approximate budget range is for the turnkey civil construction.';
    }
    return 'Offer a Free Site Visit / Soil Inspection or 3D Architectural consultation with Er. Dhilip Kumar.';
  }

  // Generate complete context prompt to inject into Gemini turn
  buildContextInjection(chatId, userText) {
    const profile = this.updateFromMessage(chatId, userText);
    const nextStep = this.getNextMissingDetail(profile);

    // Language Directive: Strictly follow locked customer language without conflicting text!
    const langInstruction = profile.preferred_language === 'Tamil'
      ? `🚨 ACTIVE LANGUAGE: TAMIL (LOCKED BY CUSTOMER REQUEST)
- You MUST reply 100% ONLY in pure Tamil script (தமிழ் எழுத்துக்களில்).
- STRICTLY FORBIDDEN: NEVER USE MALAYALAM SCRIPT (NO മലയാളം, NO Malayalam letters or words under any circumstance!).
- NEVER write Latin Tanglish (no English spelling of Tamil words).
- CRITICAL VOCABULARY RULE: ALWAYS write technical and measurement terms in ENGLISH script:
  • Use "cents" or "Cents" (NEVER write "சென்ட்")
  • Use "Sq.Ft" or "sq.ft" (NEVER write "சதுர அடி")
  • Use "Mobile Number" or "Phone Number" (NEVER write "அலைபேசி எண்" or "தொலைபேசி எண்")
  • Use "Plot" (NEVER write "மனை")
  • Use "Budget"
  • Use "Site Visit" (NEVER write "கள ஆய்வு")
  • Use "Floor Plan" & "3D Elevation"
  • Use "G+1", "G+2", "Duplex", "BHK", "Car Parking", "Compound Wall", "Borewell", "EB Connection", "Danam Holdings", "Er. Dhilip Kumar".`
      : profile.preferred_language === 'Tanglish'
      ? `🚨 ACTIVE LANGUAGE: TANGLISH (LOCKED BY CUSTOMER REQUEST)
- Reply naturally in polite Tanglish with engineering warmth. Keep measurements in English.`
      : `🌟 ACTIVE LANGUAGE: ENGLISH (DEFAULT)
- Communicate in clear, consultative, professional English. Keep terminology clear.`;

    const knownSummary = [];
    
    // Accurate Plot Ownership Status (eliminating conflict between owning vs looking to buy)
    if (profile.plot_status === 'looking_to_buy') {
      knownSummary.push(`Plot Status: Customer does NOT own land yet; they are LOOKING TO PURCHASE a ${profile.plot_size || 'plot'} in ${profile.location || 'Theppakulam, Madurai'}. [Status: Confirmed]`);
      knownSummary.push(`STRICT VOCABULARY GUARD: NEVER say "உங்களிடம் உள்ள ${profile.plot_size || ''} Plot" (Your plot). ALWAYS say: "நீங்கள் ${profile.location || 'தெப்பக்குளத்தில்'} வாங்கத் திட்டமிட்டுள்ள ${profile.plot_size || ''} Plot" (The plot you are planning to purchase)!`);
    } else if (profile.plot_status === 'owned') {
      knownSummary.push(`Plot Ownership: Customer owns a ${profile.plot_size || 'plot'} in ${profile.location || 'Madurai'}. [Status: Confirmed]`);
    } else if (profile.plot_size) {
      knownSummary.push(`Plot Size: ${profile.plot_size} [Status: Confirmed]`);
    }

    if (profile.location) knownSummary.push(`Location: ${profile.location} [Status: Confirmed]`);
    if (profile.site_address) knownSummary.push(`Site Address / Landmark: ${profile.site_address} [Status: Confirmed]`);
    if (profile.house_type) knownSummary.push(`House Type: ${profile.house_type} [Status: Confirmed]`);
    if (profile.built_up_area) knownSummary.push(`Built-up Area: ${profile.built_up_area} [Status: Confirmed]`);
    if (profile.bedrooms) knownSummary.push(`Bedrooms: ${profile.bedrooms} [Status: Confirmed]`);
    if (profile.budget) knownSummary.push(`Budget: ${profile.budget} [Status: Confirmed]`);
    if (profile.site_visit_requested) knownSummary.push(`Site Visit Requested: ${profile.site_visit_requested} [Status: ${profile.site_visit_status || 'Pending Availability Confirmation'}]`);
    knownSummary.push(`Customer Journey Stage: ${profile.customer_stage}`);

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
• 5,000 Sq.Ft on 4 Cents is not feasible for a standard G+1 house (it would require G+3/G+4 with special planning sanctions).
• YOU MUST POLITELY CLARIFY THIS INDICATIVE CONSTRAINT:
  "சார், ${profile.plot_size} Plot-ன் மொத்த பரப்பளவு சுமார் ${approxPlotSqFt} Sq.Ft. ${profile.built_up_area} கட்டுமானப் பரப்பளவு G+1 வீட்டிற்கு திட்டமிடுவதற்கு முன்பு, Setback, FSI மற்றும் உள்ளூர் கட்டிட அனுமதி விதிமுறைகளைச் சரிபார்க்க வேண்டும். உங்கள் ${profile.built_up_area} என்பது இரண்டு தளங்களையும் சேர்த்த மொத்த பரப்பளவா சார்?"
• DO NOT treat feasibility numbers as legal guarantees; state that exact permissible area requires architectural drawings and site inspection.`;
      }
    }

    // Active Complaint Alert
    let complaintAlert = '';
    if (profile.customer_stage === 'complaint_escalation' && profile.complaint?.active) {
      complaintAlert = `
🚨 ACTIVE COMPLAINT ESCALATION IN EFFECT:
• Customer Issue: "${profile.complaint.issue}"
• PROTOCOL:
  1. Respectfully acknowledge the concern with sincere empathy.
  2. Apologize for the inconvenience caused.
  3. NEVER argue, blame the customer, or blame an employee.
  4. NEVER promise unauthorized refunds, discounts, or compensation.
  5. State that Er. Dhilip Kumar and senior engineering management have been personally notified and will contact them directly with a solution.`;
    }

    // Service Area Alert
    let serviceAreaAlert = '';
    if (profile.service_area_status === 'outside_review_needed') {
      serviceAreaAlert = `
⚠️ SERVICE AREA NOTICE:
• Customer location (${profile.location}) is outside our primary Madurai & South TN belt.
• State politely: "எங்கள் முதன்மை கட்டுமானப் பணிகள் மதுரை மற்றும் தென் தமிழகத்தில் நடைபெற்று வருகின்றன. உங்கள் பகுதியில் திட்டத்தை மேற்கொள்ள முடியுமா என்பதை எங்கள் பொறியாளர் குழுவுடன் ஆலோசித்துவிட்டுத் தெரிவிக்கிறேன் சார்."`;
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
${langInstruction}

KNOWN CUSTOMER DETAILS (VERIFIED FROM MEMORY):
${knownSummary.length > 0 ? knownSummary.map(k => `• ${k}`).join('\n') : '• No previous details recorded yet.'}
${feasibilityWarning}
${complaintAlert}
${serviceAreaAlert}

VERIFIED PHONE NUMBERS (STRICT INTEGRITY):
• BOT / Danam Holdings Official Business Line: +91 93615 99097 (THIS IS OUR BOT'S NUMBER! NEVER say this is the customer's phone number!)
${customerPhoneSummary}

NEXT MISSING ACTION:
${nextStep}

CRITICAL OPERATIONAL RULES FOR THIS TURN:
1. DO NOT re-ask any detail listed above as ALREADY KNOWN.
2. ANSWER IMMEDIATE INTENT FIRST:
   - If the customer asks a specific question (e.g. package specifications, price per Sq.Ft, portfolio, or site visit), answer that question completely before asking for any missing detail. Do not force an interrogation questionnaire!
3. PHONE NUMBER INTEGRITY:
   - NEVER tell the customer "Your mobile number is +91 93615 99097"! That is OUR company's WhatsApp bot number.
   - If the customer asks "What is my number?" or "Intha number sollu / check my number":
     ${phoneDirective}
   - If the customer asks for Er. Dhilip Kumar's direct number or company contact:
     Share ONLY the official business number: +91 93615 99097. NEVER invent any fake number like +91 98421 82955!
   - When coordinating a Site Visit, do NOT demand a phone number:
     Say: "இந்த WhatsApp Chat மூலமாகவே உங்களைத் தொடர்புகொள்ளலாமா, அல்லது மாற்று Mobile Number ஏதும் உள்ளதா சார்?"
4. PRELIMINARY ESTIMATES & EXCLUSIONS:
   - Always state that cost estimates represent Preliminary Civil Construction estimates.
   - Clearly clarify exclusions: Compound wall, deep borewell beyond 300ft, EB meter deposit, and municipal approval fees.
   - NEVER invent per-running-foot rates or arbitrary numbers for extra work! State that exact extra-work costs require on-site measurement and customized quotation.
5. NO FAKE URGENCY OR PRESSURE:
   - NEVER say "Only 2 slots left", "Price rises tomorrow", or create artificial pressure. Give customers time to decide.
6. SITE VISIT CONFIRMATION:
   - A site visit is NEVER confirmed automatically simply because the customer gave a day/time.
   - Always state: "உங்கள் Site Visit கோரிக்கையைப் பதிவு செய்துள்ளேன். எங்கள் பொறியாளர் குழுவின் Availability-ஐ உறுதி செய்துவிட்டு உங்களுக்குத் தெரிவிக்கிறேன் சார்."
   - NEVER say "Site visit is confirmed" or "ஏற்பாடு செய்துவிட்டேன்" until our team actually confirms the slot!
7. GREETINGS & CONTINUITY:
   - If customer says "Hi", "Are you there?" or greetings: Acknowledge warmly without restarting qualification. Mention known details naturally and continue smoothly.
8. ACCURACY:
   - Ask EXACTLY ONE question at a time.
   - Show arithmetic cleanly: e.g., 2,400 Sq.Ft × ₹2,350 = ₹56,40,000.
======================================================================
`;
  }
}

module.exports = new BuilderCustomerMemory();
