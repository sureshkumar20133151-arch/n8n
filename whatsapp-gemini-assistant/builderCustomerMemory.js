const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'builder_customer_profiles.json');

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

  getProfile(chatId = '') {
    const phone = this.getCleanPhone(chatId);
    if (!this.profiles[phone]) {
      this.profiles[phone] = {
        phone,
        customer_name: null,
        preferred_language: null, // 'Tamil', 'English', 'Tanglish'
        plot_owned: null,
        plot_size: null,
        location: null,
        house_type: null,
        built_up_area: null,
        bedrooms: null,
        budget: null,
        preferred_package: null,
        starting_timeline: null,
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

    // 1. STRICT LANGUAGE DETECTION & LOCKING
    const hasTamilScript = /[\u0B80-\u0BFF]/.test(text);
    const asksTamil = /\b(tamil|தமிழ்|thamil|thamizh)\b/i.test(text) || lower.includes('speak tamil') || lower.includes('chat tamil') || lower.includes('want tamil') || lower.includes('in tamil');
    const asksEnglish = /\b(english|ஆங்கிலம்)\b/i.test(text) || lower.includes('speak english') || lower.includes('in english');
    const asksTanglish = /\b(tanglish)\b/i.test(text);

    if (hasTamilScript || asksTamil) {
      if (profile.preferred_language !== 'Tamil') {
        profile.preferred_language = 'Tamil';
        updated = true;
        console.log(`🔒 [Language Locked] ${profile.phone} ➔ TAMIL (Strict Mode)`);
      }
    } else if (asksEnglish) {
      profile.preferred_language = 'English';
      updated = true;
    } else if (asksTanglish) {
      profile.preferred_language = 'Tanglish';
      updated = true;
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

    // 8. UPDATE CONVERSATION STAGE
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
- Keep only technical civil terms in English script where customary (e.g., G+1, 3D Elevation, Sq.Ft, Danam Holdings, Er. Dhilip Kumar).`
      : profile.preferred_language === 'Tanglish'
      ? `The customer prefers Tanglish. Reply naturally in Tanglish with polite civil engineering warmth.`
      : `Reply in clear, professional, consultative English. If the customer speaks Tamil, immediately switch and lock to Tamil.`;

    const knownSummary = [];
    if (profile.plot_size) knownSummary.push(`Plot Size: ${profile.plot_size} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.plot_owned !== null) knownSummary.push(`Plot Ownership: ${profile.plot_owned ? 'Owns plot' : 'Looking for plot'} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.location) knownSummary.push(`Location: ${profile.location} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.house_type) knownSummary.push(`House Type: ${profile.house_type} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.built_up_area) knownSummary.push(`Built-up Area: ${profile.built_up_area} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.bedrooms) knownSummary.push(`Bedrooms: ${profile.bedrooms} (ALREADY KNOWN - NEVER ASK AGAIN)`);
    if (profile.budget) knownSummary.push(`Budget: ${profile.budget} (ALREADY KNOWN - NEVER ASK AGAIN)`);

    return `
======================================================================
[CRITICAL MEMORY & CONVERSATION STATE - SENDER: +${profile.phone}]
Language Lock: ${profile.preferred_language || 'Auto-detect'}
${langInstruction}

KNOWN CUSTOMER DETAILS (VERIFIED FROM MEMORY):
${knownSummary.length > 0 ? knownSummary.map(k => `• ${k}`).join('\n') : '• No previous details recorded yet.'}

NEXT MISSING ACTION:
${nextStep}

RULES FOR THIS TURN:
1. DO NOT re-ask any detail listed above as ALREADY KNOWN.
2. If customer asks "Who are you?", state: "நான் Danam Holdings Civil Engineering & Turnkey EPC நிறுவனத்தின் AI கட்டுமான உதவியாளர். Er. திலீப் குமார் (15+ வருட அனுபவம்) தலைமையில் செயல்படுகிறோம்..."
3. If customer asks "What can you do for me?", state: 2D Floor Plan, 3D Elevation, BOQ Cost Estimation, G+1 designs, Package details, Free Engineer Site Visit.
4. If customer says "Are you there?" or greetings, acknowledge warmly without restarting qualification: mention what you already know (e.g., ${profile.plot_size || 'your plot'} in ${profile.location || 'Madurai'}) and ask the next missing detail.
5. NEVER invent completed projects or rates not in approved knowledge base. Standard (₹1,950/sq.ft), Premium (₹2,350/sq.ft), Luxury (₹2,850/sq.ft).
6. Ask EXACTLY ONE question at a time.
======================================================================
`;
  }
}

module.exports = new BuilderCustomerMemory();
