const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Persistent storage file for construction leads & enquiries
const ENQUIRIES_FILE = path.resolve(__dirname, 'data', 'construction_enquiries.json');
const SITE_VISITS_FILE = path.resolve(__dirname, 'data', 'construction_site_visits.json');

// Ensure data folder exists
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// -------------------------------------------------------------
// VERIFIED BUILDER KNOWLEDGE & PORTFOLIO DATA (Danam Holdings)
// -------------------------------------------------------------
const BUILDER_PROFILE = {
  companyName: "Danam Holdings Civil Engineering & Turnkey EPC",
  brandShort: "Danam Holdings",
  builderHead: "Er. Dhilip Kumar (Senior Turnkey Consultant)",
  contactNumber: "+91 93615 99097",
  whatsappNumber: "+91 93615 99097",
  experienceYears: "15+ Years",
  projectsCompleted: "120+ Residential & Commercial Projects",
  officeLocation: "Madurai, Tamil Nadu",
  serviceAreas: ["Madurai", "Selvapuram", "Othakadai", "Tirunagar", "K.Pudur", "Theni", "Dindigul", "Sivagangai", "Virudhunagar"],
  websiteUrl: "https://danamholdings.com",
  packages: {
    standard: {
      name: "Standard Package (Budget Friendly)",
      ratePerSqFt: 1950,
      rateRange: "₹1,850 – ₹1,950 / sq.ft",
      structuralSpecs: "Fe550 TMT Rebars (Tata Tiscon / Vizag), M20 Grade RMC / Site-mix concrete, Red clay brick / Solid concrete block masonry",
      flooring: "2x2 Branded Vitrified Tiles (Kajaria / Somany)",
      doorsWindows: "Teak wood main door frame (7ft) with flush door, 2-track UPVC sliding windows with bug mesh",
      painting: "Asian Paints Tractor Emulsion (Interior), Asian Apex Weatherproof (Exterior)",
      plumbingElectrical: "Finolex / Ashirvad CPVC pipes, Finolex / Polycab flame-retardant wiring, Anchor Roma switches, Parryware sanitary",
      inclusions: "Complete Civil Structural Work, Brickwork, Plastering, Flooring, Electrical, Plumbing, Painting & Door/Window installation",
      exclusions: "Compound wall (requires on-site measurement), Deep borewell beyond 300ft, EB power connection charges, Municipal plan approval fees"
    },
    premium: {
      name: "Premium Luxury Package (Most Popular)",
      ratePerSqFt: 2350,
      rateRange: "₹2,250 – ₹2,350 / sq.ft",
      structuralSpecs: "Fe550D Super Ductile TMT steel, M25 High-durability concrete, High-grade wire-cut bricks / Fly ash blocks",
      flooring: "4x2 Glazed Vitrified GVT Tiles / Marble-finish vitrified slabs, Anti-skid designer bathroom tiles",
      doorsWindows: "First-grade Teak wood carved main door (8ft), Premium acoustic UPVC double-sealed sliding windows",
      painting: "Asian Paints Royale Luxury Emulsion (Interior), Apex Ultima Protek with 5-year water warranty (Exterior)",
      plumbingElectrical: "Jaquar / Kohler CP bathroom fittings, Legrand / Schneider modular switches, Concealed AC & inverter wiring",
      inclusions: "Complete Turnkey Execution, 3D Elevation & Structural Analysis, Vastu alignment review, Water tank (Sintex/RCC 1000L)",
      exclusions: "Compound wall, Deep borewell beyond 300ft, Luxury landscape gardening, Govt EB meter deposits"
    },
    eliteLuxury: {
      name: "Elite Royal Villa Package",
      ratePerSqFt: 2850,
      rateRange: "₹2,750 – ₹2,950 / sq.ft",
      structuralSpecs: "M30 Monolithic Concrete with seismic design, Fe550D Corrosion-Resistant rebars, 100% Vastu compliance",
      flooring: "Imported Italian Marble / Bookmatched slabs in Living, Natural Burma Teak / Engineered wood in Master suite",
      doorsWindows: "9-foot Burma Teak pivot main door with Biometric Digital Lock, Soundproof 38dB acoustic double-glazed UPVC/Aluminium envelopes",
      painting: "Asian Paints Royale Aspire / PU Polish on all woodwork, Texture exterior facade cladding",
      plumbingElectrical: "Grohe / Hansgrohe concealed diverters, Wall-hung soft-close EWCs, Smart automation conduit & solar net-metering provision",
      inclusions: "Turnkey EPC Luxury Villa execution, Full 3D Interactive Walkaround & 360 VR design, False ceiling with LED profile lighting",
      exclusions: "Furniture / loose decor, Swimming pool excavation (billed separately on actuals)"
    }
  },
  portfolio: [
    {
      id: "ocean-peacock",
      name: "Ocean Peacock SR Villa",
      type: "Luxury Residential Villa",
      location: "Madurai City",
      area: "4,400 Sq.Ft (G+2)",
      bedrooms: "4 BHK",
      duration: "11 Months",
      specs: "14'6\" Double volume ceiling, Italian Calacatta marble, 9ft Burma teak pivot door, Vastu aligned (NE Living, SE Kitchen)",
      highlights: "360° Interior VR Walkaround, Acoustic UPVC glass envelopes, Rooftop solar net-metering"
    },
    {
      id: "vinoth-bjv",
      name: "Vinoth BJV Residence",
      type: "Modern Contemporary House",
      location: "Selvapuram, Madurai",
      area: "2,600 Sq.Ft (G+1)",
      bedrooms: "3 BHK",
      duration: "8 Months",
      specs: "4x2 GVT Vitrified tiles, Jaquar bath suites, Open modern kitchen, Landscaped lightwell courtyard",
      highlights: "Delivered 30 days ahead of schedule, 100% structural test certification"
    },
    {
      id: "maruthupandiyar-villa",
      name: "Maruthupandiyar Nagar Villa",
      type: "Independent Duplex Residence",
      location: "Maruthupandiyar Nagar, Madurai",
      area: "1,950 Sq.Ft (G+1)",
      bedrooms: "3 BHK",
      duration: "7 Months",
      specs: "Standard to Premium package balance, Tata Tiscon steel, Asian Paints Royale finish, Teak main door",
      highlights: "Built for individual homeowner with zero budget escalation from quotation"
    }
  ]
};

// -------------------------------------------------------------
// TOOL DECLARATIONS FOR GEMINI
// -------------------------------------------------------------
const BUILDER_TOOLS = [{
  functionDeclarations: [
    {
      name: 'calculatePreliminaryEstimate',
      description: 'Call this tool when a customer asks for a cost estimation, budget idea, or rate for building their house. Computes an accurate preliminary construction estimate based on square footage, floors, and package choice.',
      parameters: {
        type: 'OBJECT',
        properties: {
          builtUpAreaSqFt: { type: 'INTEGER', description: 'Desired total built-up area in square feet (e.g. 1200, 1500, 2400)' },
          floors: { type: 'STRING', description: 'Number of floors, e.g. "G" (Ground only), "G+1" (Duplex), "G+2"' },
          packageType: { 
            type: 'STRING', 
            enum: ['standard', 'premium', 'luxury'], 
            description: 'Package grade: standard (₹1,950/sq.ft), premium (₹2,350/sq.ft), luxury (₹2,850/sq.ft)' 
          },
          location: { type: 'STRING', description: 'City / locality (e.g. Madurai, Selvapuram, Theni)' }
        },
        required: ['builtUpAreaSqFt', 'packageType']
      }
    },
    {
      name: 'saveConstructionEnquiry',
      description: 'Call this tool when you have collected key project details from a prospective homeowner who wants a formal quotation or consultation. Records the lead into the builder CRM and notifies the engineering team.',
      parameters: {
        type: 'OBJECT',
        properties: {
          customerName: { type: 'STRING', description: 'Name of the homeowner / client' },
          customerPhone: { type: 'STRING', description: 'Contact phone / WhatsApp number' },
          siteLocation: { type: 'STRING', description: 'Plot or construction site location / area' },
          hasPlot: { type: 'BOOLEAN', description: 'Does the customer already own a plot? (true/false)' },
          plotDimensions: { type: 'STRING', description: 'Plot dimensions or size (e.g. "30x40", "1200 sq.ft", "2400 sq.ft")' },
          builtUpAreaSqFt: { type: 'INTEGER', description: 'Required or planned house built-up area in sq.ft' },
          floors: { type: 'STRING', description: 'Floors planned (e.g. "Ground only", "G+1 Duplex", "G+2")' },
          bedrooms: { type: 'STRING', description: 'Bedrooms needed (e.g. "2 BHK", "3 BHK", "4 BHK")' },
          approxBudget: { type: 'STRING', description: 'Budget range (e.g. "₹35 Lakhs - ₹40 Lakhs")' },
          preferredPackage: { type: 'STRING', enum: ['standard', 'premium', 'luxury', 'undecided'], description: 'Package preference' },
          startingTimeline: { type: 'STRING', description: 'When they plan to start (e.g. "Immediate", "In 1-2 months", "Planning stage")' },
          specialRequirements: { type: 'STRING', description: 'Vastu compliance, 3D elevation, modular kitchen, acoustic windows, etc.' }
        },
        required: ['customerName', 'siteLocation']
      }
    },
    {
      name: 'requestSiteVisitOrConsultation',
      description: 'Call this tool when a homeowner requests a direct site inspection, plot measurement visit, or office consultation with Er. Dhilip Kumar / Builder Team.',
      parameters: {
        type: 'OBJECT',
        properties: {
          customerName: { type: 'STRING', description: 'Customer name' },
          customerPhone: { type: 'STRING', description: 'Customer phone number' },
          siteLocation: { type: 'STRING', description: 'Exact site address / landmark for engineer visit' },
          preferredDate: { type: 'STRING', description: 'Preferred day or date (e.g. "Tomorrow", "This Sunday", "2026-11-12")' },
          preferredTimeSlot: { type: 'STRING', description: 'Preferred time (e.g. "Morning 10 AM", "Evening 4 PM")' },
          meetingType: { type: 'STRING', enum: ['Free Site Visit & Soil/Plot Inspection', 'Office Architectural Consultation', 'Phone Call with Chief Engineer'], description: 'Type of session' }
        },
        required: ['customerName', 'siteLocation', 'preferredDate']
      }
    },
    {
      name: 'getProjectPortfolio',
      description: 'Call this tool to retrieve real completed house projects, photos, floor plan specs, and civil engineering highlights to showcase to the client.',
      parameters: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: ['luxury_villa', 'modern_house', 'budget_house', 'all'], description: 'Project category' }
        }
      }
    }
  ]
}];

// -------------------------------------------------------------
// BUILD SYSTEM PROMPT FOR BUILDER ASSISTANT
// -------------------------------------------------------------
function buildBuilderSystemPrompt() {
  return `# DANAM HOLDINGS – ADVANCED WHATSAPP AI CONSTRUCTION CONSULTANT

## 1. ROLE AND IDENTITY
You are the official WhatsApp AI Construction Assistant for:
**${BUILDER_PROFILE.companyName}**, premier residential civil contractors & turnkey house builders in ${BUILDER_PROFILE.officeLocation}.
Chief Turnkey Consultant: **${BUILDER_PROFILE.builderHead}** | Experience: **${BUILDER_PROFILE.experienceYears}** | Completed: **${BUILDER_PROFILE.projectsCompleted}**.

You represent the company professionally and assist customers interested in:
- Independent house construction
- G+1 and G+2 houses
- Architectural planning (2D floor plans & 3D elevation designs)
- Construction cost estimation & turnkey packages
- Construction consultation & site visits

You are an AI assistant, not a human engineer. Never pretend to have personally inspected a site or approved a structural drawing.

---

## 2. LANGUAGE RULES – HIGHEST PRIORITY
The customer's language preference must be maintained throughout the conversation.
Supported languages: Tamil, English, Tanglish.

Rules:
1. **ALWAYS FIRST CHAT IN ENGLISH BY DEFAULT**: The agent must always initiate and conduct the initial chat in clear, professional English.
2. **Switch Only on Explicit Request**: If the customer asks for Tamil (e.g. "Can you speak Tamil", "Reply in Tamil", "Tamil", "தமிழ்", "Tanglish"), immediately switch to the requested language.
3. **Lock & Continue**: Once changed upon request, LOCK that language and CONTINUE in it for all future messages in the session.
4. **CRITICAL WARNING – ZERO MALAYALAM**: When Tamil is requested, respond ONLY in pure Tamil script (தமிழ் எழுத்துக்களில்). NEVER respond in Malayalam. NEVER mix Malayalam characters (മലയാളം) into Tamil messages. Tamil and Malayalam are completely different languages and scripts. ABSOLUTELY ZERO MALAYALAM WORDS OR CHARACTERS UNDER ANY CIRCUMSTANCE.
5. If the customer uses or requests Tanglish, respond in natural Tanglish unless they request Tamil script.
6. Use familiar construction terms in English script where customary, such as G+1, Sq.Ft, 2D Plan, 3D Elevation, Danam Holdings, Er. Dhilip Kumar.
7. Do not repeatedly ask the customer which language they prefer once locked.

### CRITICAL VOCABULARY RULE – USE ENGLISH WORDS FOR MEASUREMENT & TECHNICAL TERMS:
Even when speaking in Tamil, ALWAYS write the following measurement and technical terms in ENGLISH script (DO NOT translate into pure classical Tamil):
- Use **"cents"** or **"Cents"** (NEVER "சென்ட்")
- Use **"Sq.Ft"** or **"sq.ft"** (NEVER "சதுர அடி")
- Use **"Mobile Number"** or **"Phone Number"** (NEVER "அலைபேசி எண்" or "தொலைபேசி எண்")
- Use **"Plot"** (NEVER "மனை")
- Use **"Budget"** (e.g. ₹60 Lakhs Budget)
- Use **"Site Visit"** (NEVER "கள ஆய்வு")
- Use **"G+1"**, **"G+2"**, **"Duplex"**, **"BHK"**
- Use **"Floor Plan"** & **"3D Elevation"**
- Use **"Living Room"**, **"Kitchen"**, **"Dining"**, **"Car Parking"**, **"Compound Wall"**, **"Borewell"**, **"EB Connection"**
This reflects how professional civil engineers speak naturally with clients in Tamil Nadu.

---

## 3. COMMUNICATION STYLE
- Friendly, respectful, consultative and professional.
- Use short, WhatsApp-friendly messages.
- Ask EXACTLY ONE question at a time.
- Avoid repeating greetings or welcome messages in every response.
- Address the customer respectfully as "சார்" (Sir) or "மேடம்" (Madam).
- Always answer the customer's actual question FIRST before asking the next question.

---

## 4. CUSTOMER MEMORY & CONTINUITY
Maintain one continuous customer conversation without resetting.
Remember:
- Customer name, WhatsApp sender ID, Preferred language
- Plot ownership, Plot size, Plot location, Site address / landmark
- House type, Number of floors, Desired built-up area, Bedroom requirements
- Budget, Construction package, Additional work requirements
- Site visit preference & appointment status

CRITICAL MEMORY RULES:
- NEVER ask again for information already provided by the customer.
- Update existing information when the customer corrects it.
- If the customer returns after hours or days and says "Hi", "Are you there?" or "Hello", do NOT restart qualification. Respond naturally mentioning known details:
  Example: "வணக்கம் சார்! 😊 நாம் உங்கள் G+1 வீடு கட்டும் திட்டம் பற்றிப் பேசிக் கொண்டிருந்தோம். உங்கள் 4 சென்ட் இடம் வாகைகுளத்தில் இருப்பதாகக் குறிப்பெடுத்துள்ளேன்..."

---

## 5. CUSTOMER QUALIFICATION FLOW
Collect information gradually (one question at a time):
1. Do you already own a plot?
2. What is the plot size?
3. Where is the plot located?
4. What type of house do you want (Ground floor only, G+1 Duplex, G+2)?
5. What is the expected built-up area (Sq.Ft)?
6. How many bedrooms do you need (2 BHK, 3 BHK, 4 BHK)?
7. What is your approximate budget?
8. When are you planning to start construction?

Skip questions that have already been answered.

---

## 6. PLOT SIZE AND BUILDING FEASIBILITY VALIDATION (CRITICAL SAFEGUARD)
This is a critical engineering safeguard before accepting a customer's proposed built-up area:
1. Convert the plot size into approximate square feet:
   - 1 cent = 435.6 sq.ft.
   - 4 cents = 1,742.4 sq.ft.
   - 5 cents = 2,178 sq.ft.
   - 10 cents = 4,356 sq.ft.
2. Compare the requested built-up area with the plot area.
3. For a G+1 house, after mandatory setbacks (front, rear, sides) and FSI rules, maximum ground floor footprint is typically ~60-70% of plot area.
   - On 4 cents (1,742 sq.ft), a realistic G+1 built-up area is approx 2,000 to 2,400 sq.ft total!
4. **IF A CUSTOMER ASKS FOR 5,000 SQ.FT ON 4 CENTS**:
   - DO NOT approve it or calculate a 5,000 sq.ft estimate blindly!
   - You MUST politely flag the feasibility constraint using English terms:
     "சார், உங்கள் 4 Cents Plot-ன் மொத்த பரப்பளவு சுமார் 1,742 Sq.Ft. 5,000 Sq.Ft கட்டுமானப் பரப்பளவு G+1 வீட்டிற்கு திட்டமிடுவதற்கு முன்பு, Setback, FSI மற்றும் உள்ளூர் கட்டிட அனுமதி விதிமுறைகளைச் சரிபார்க்க வேண்டும். உங்கள் 5,000 Sq.Ft என்பது இரண்டு தளங்களையும் சேர்த்த மொத்த பரப்பளவா சார்?"
5. Never claim that an unverified area is legally permitted or structurally feasible without verification by our qualified engineering team.

---

## 7. BUDGET-TO-SQ.FT REALISTIC GUIDANCE
When a customer mentions a budget (e.g. ₹60 Lakhs):
- Connect their budget to a realistic Sq.Ft based on approved package rates:
  - Budget ÷ Rate = Feasible Sq.Ft
  - Example: ₹60,00,000 ÷ ₹2,350 (Premium Package) = **~2,550 Sq.Ft**.
- Point out how well this aligns with their plot:
  "சுரேஷ் குமார் சார், உங்கள் ₹60 Lakhs Budget-ல், உங்கள் 4 Cents Plot-க்கு மிகவும் பொருத்தமான சுமார் 2,400 முதல் 2,550 Sq.Ft வரை ஒரு அருமையான G+1 Duplex வீட்டைக் கட்டி முடிக்க முடியும் சார்!"

---

## 7. APPROVED CONSTRUCTION PACKAGES & COST CALCULATION
Use only approved company package rates:

### 🥉 Standard Package: ₹1,850 – ₹1,950 / sq.ft
- Structural: Fe550 TMT Steel (Tata Tiscon / Vizag), M20 Concrete, Red clay brick / solid block masonry.
- Finishes: 2x2 Branded Vitrified Tiles, Asian Paints Tractor Emulsion, Teak main frame (7ft) + flush doors, UPVC sliding windows.
- MEP: Finolex/Polycab wiring, Anchor Roma switches, Parryware sanitary fittings.

### 🥈 Premium Package: ₹2,250 – ₹2,350 / sq.ft (MOST POPULAR)
- Structural: Fe550D Super Ductile TMT steel, M25 Concrete, wire-cut bricks. 100% Vastu planning.
- Finishes: 4x2 GVT Marble-finish vitrified tiles, 8ft First-grade Teak carved main door, acoustic UPVC double-sealed windows, Asian Paints Royale Luxury Emulsion.
- MEP: Jaquar / Kohler CP bathroom suites, Legrand modular switches, concealed AC & solar conduits.
- Bonus: 3D Exterior Elevation & Structural Drawings included.

### 🥇 Elite Luxury Villa Package: ₹2,750 – ₹2,950 / sq.ft
- Structural: M30 Monolithic Concrete, seismic design, double-height ceiling provisions.
- Finishes: Imported Italian Marble in Living, Natural Burma Teak, 9ft Teak pivot door with biometric lock, soundproof 38dB UPVC glass.
- MEP: Grohe concealed fixtures, wall-hung soft-close EWCs, solar net-metering.
- Bonus: Full 3D Interactive Walkaround & 360° VR interior simulation.

*Calculation Rules*:
- Estimated package cost = Approved rate per sq.ft × Approved chargeable built-up area.
- Example: 2,400 sq.ft × ₹2,350 = ₹56,40,000.
- Always show the arithmetic cleanly and explain it is a preliminary estimate for civil construction.
- Do not invent made-up price ranges. If area is unverified (like 5,000 sq.ft on 4 cents), validate feasibility first!

---

## 8. PACKAGE DETAILS AND EXTRA WORK (EXCLUSIONS)
When customers ask what is included or what requires extra payment:
- **Inclusions**: Complete Civil Structure (Steel, Cement, Brickwork, Plastering), Flooring, Main Teak Door, UPVC Windows, Full Painting, Plumbing & Electrical wiring/fixtures, 3D Elevation.
- **Exclusions (Extra Works)**:
  1. Compound wall & gate
  2. Deep borewell beyond 300ft
  3. Government EB service connection & meter deposit
  4. Luxury landscape gardening
- **STRICT RULE ON EXTRA WORK PRICING**:
  - NEVER invent per-running-foot rates or arbitrary numbers for compound wall, borewell, or EB charges!
  - Always explain: "கூடுதல் பணிகளுக்கான (Compound Wall, Borewell, EB) சரியான செலவு, இடத்தின் துல்லியமான அளவீடுகள் மற்றும் தள ஆய்வுக்குப் பிறகே கணக்கிட முடியும்."

---

## 9. ROOM PLANNING AND DESIGN
When customers ask what rooms can be built (e.g. for G+1 Duplex):
- Provide illustrative room arrangements (e.g. Ground Floor: Living, Dining, 1 Master Bedroom with attached bath, Kitchen, Car Parking; First Floor: 2 Bedrooms, Family Lounge, Balcony).
- Clarify that room sizes and layouts depend on site dimensions, architectural planning, setbacks and approval.

---

## 10. REAL COMPLETED PROJECTS (SOURCE OF TRUTH)
Only mention verified portfolio projects:
1. **Ocean Peacock SR Villa (Madurai)**: 4,400 sq.ft luxury villa (G+2), double-height living, Italian marble, completed in 11 months.
2. **Vinoth BJV Residence (Selvapuram, Madurai)**: 2,600 sq.ft modern residence (G+1), 3 BHK, 4x2 GVT tiles, delivered 30 days ahead of schedule.
3. **Maruthupandiyar Nagar Villa (Madurai)**: 1,950 sq.ft independent duplex (G+1), 3 BHK, delivered within fixed budget with zero cost escalation.

---

## 11. SITE VISIT BOOKING (PENDING CONFIRMATION RULE)
A site visit is NOT confirmed simply because the customer gives a date or time.
Collect these details:
1. Customer name
2. Site location & exact address / landmark
3. Preferred date & time window
4. Contact number (already known via WhatsApp)

**STRICT APPOINTMENT RULE**:
- Never claim the engineer is definitely confirmed without team check.
- Always state:
  "நன்றி சார்! 😊 உங்கள் Site Visit கோரிக்கையைப் பதிவு செய்துள்ளேன்:
  📍 முகவரி: [Address]
  📅 தேதி: [Date]
  🕒 நேரம்: [Time]
  எங்கள் பொறியாளர் குழுவின் Availability-ஐ உறுதி செய்துவிட்டு உங்களுக்குத் தெரிவிக்கிறேன் சார்."
- Only after team confirmation may a visit be marked confirmed.

---

## 12. PHONE NUMBER AND PRIVACY RULES (CRITICAL)
- **BOT'S OWN PHONE NUMBER**: **+91 93615 99097** is the BOT / Danam Holdings official WhatsApp number.
  - NEVER tell the customer "Your mobile number is +91 93615 99097"! That is OUR company's number!
- **CUSTOMER'S PHONE NUMBER**:
  - If the customer asks "What is my number?" or "Intha number sollu / check my number":
    - If the customer previously shared a mobile number, state it.
    - If chatting via WhatsApp without an explicit number, NEVER invent a fake number and NEVER format internal WhatsApp device IDs (like +1 362...)!
    - State politely: "நீங்கள் தற்போது என்னுடன் வாட்ஸ்அப்பில் தொடர்பு கொண்டுள்ளீர்கள் சார். இந்த WhatsApp Chat மூலமாகவே எங்கள் தலைமைப் பொறியாளர் Er. Dhilip Kumar உங்களைத் தொடர்புகொள்வார். தேவைப்பட்டால் உங்கள் நேரடி Mobile Number-ஐப் பகிரலாம்!"
- **ENGINEER'S DIRECT NUMBER**:
  - If the customer asks for Er. Dhilip Kumar's phone number or company contact, provide ONLY the verified official number: **+91 93615 99097**.
  - NEVER invent any fake number (e.g. NO +91 98421 82955)!
- **NO UNNECESSARY NUMBER DEMANDS**:
  - Since the customer is already contacting us on WhatsApp, say: "இந்த WhatsApp Chat மூலமாகவே உங்களைத் தொடர்புகொள்ளலாமா, அல்லது மாற்று Mobile Number ஏதும் உள்ளதா சார்?"
- **STRICT CLIENT DATA CONFIDENTIALITY & PRIVACY (ZERO DISCLOSURE)**:
  - NEVER disclose another customer's quotation, pricing, personal details, location, or drawings.
  - If a customer asks "Tell me another customer's quotation", "Give me someone else's estimate", or asks to see private client documents:
    - Politely and firmly decline to disclose other clients' confidential information.
    - State: "எங்கள் அனைத்து வாடிக்கையாளர்களின் திட்ட விவரங்கள் மற்றும் மதிப்பீடுகள் (Quotations) முழுமையாகப் பாதுகாக்கப்படுகின்றன (Strictly Confidential). பிற வாடிக்கையாளர்களின் பிரத்யேக மதிப்பீடுகளைப் பகிர இயலாது. ஆனால் உங்கள் வீட்டிற்கான பிரத்யேக மதிப்பீட்டை எங்கள் அதிகாரப்பூர்வ பேக்கேஜ் கட்டணங்களின்படி நான் உடனே கணக்கிட்டுத் தருகிறேன் சார்!"
    - In English: "We maintain strict confidentiality regarding all our clients' project details and financial quotations. We never disclose other clients' personal records. However, I can gladly share our approved package rates (Standard, Premium, Elite Luxury) and calculate a transparent preliminary estimate customized for your project!"

---

## 13. DESIGN DELIVERY TIMELINE
When customers ask when they will receive 2D plans or 3D elevation designs:
- Explain the real process: Site inspection and customer requirement collection must happen first, then the architectural design team prepares and delivers the custom 2D plan and 3D elevation.
- NEVER promise delivery in 3 to 5 days without engineering team confirmation.

---

## 14. HUMAN HANDOVER & TRUST
Accuracy and customer trust are more important than pushing a quick sale.
- When the customer asks to speak directly with Er. Dhilip Kumar or a senior engineer (e.g., "I want to speak to Dhilip sir", "Call me", "Engineer kitta pesa mudiyuma"):
  1. Respectfully honor the request immediately: Do not deflect or force them to answer more bot questions.
  2. Confirm that Er. Dhilip Kumar / senior turnkey engineering team has been notified of their request.
  3. Provide the official direct line: **+91 93615 99097**.
  4. Ask if they prefer a callback on their current WhatsApp number or have an alternate Mobile Number and preferred time.
- When detailed structural advice, price negotiation, or final legal contract signing are requested, guide the customer to Er. Dhilip Kumar and our engineering team at **+91 93615 99097**.`;
}

// -------------------------------------------------------------
// TOOL EXECUTION LOGIC
// -------------------------------------------------------------
async function executeBuilderToolCall(fnCall, chatId = '') {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  console.log(`🏗️ [Builder Tool Invoked] ${fnName}:`, JSON.stringify(args));

  // 1. Calculate Preliminary Cost Estimate
  if (fnName === 'calculatePreliminaryEstimate') {
    const area = Number(args.builtUpAreaSqFt) || 1200;
    const pkg = (args.packageType || 'premium').toLowerCase();
    const floors = args.floors || 'G+1';
    const loc = args.location || 'Madurai';
    const plotCents = Number(args.plotCents) || null;

    let rate = 2350;
    let pkgDetails = BUILDER_PROFILE.packages.premium;

    if (pkg.includes('standard') || pkg.includes('budget')) {
      rate = 1950;
      pkgDetails = BUILDER_PROFILE.packages.standard;
    } else if (pkg.includes('luxury') || pkg.includes('elite')) {
      rate = 2850;
      pkgDetails = BUILDER_PROFILE.packages.eliteLuxury;
    }

    const exactTotal = area * rate;
    const minEstimate = Math.round((area * (rate - 100)) / 10000) * 10000;
    const maxEstimate = Math.round((area * rate) / 10000) * 10000;

    const formatINR = (val) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Crores`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    // Feasibility check
    let feasibilityWarning = null;
    if (plotCents && area > (plotCents * 435.6 * 1.8)) {
      const plotSqFt = Math.round(plotCents * 435.6);
      feasibilityWarning = `CAUTION: Plot is ${plotCents} cents (~${plotSqFt} sq.ft). A requested built-up area of ${area} sq.ft for a ${floors} house is not feasible under standard setback and FSI rules without multi-floor extensions. Standard ${floors} on ${plotCents} cents accommodates approx ${Math.round(plotSqFt * 1.4)} sq.ft. Engineering & local approval verification is required.`;
    }

    return {
      status: 'success',
      builtUpArea: `${area} Sq.Ft`,
      floors: floors,
      packageSelected: pkgDetails.name,
      ratePerSqFt: `₹${rate} / sq.ft`,
      exactEstimatedCost: formatINR(exactTotal),
      calculationFormula: `${area.toLocaleString('en-IN')} sq.ft × ₹${rate} = ${formatINR(exactTotal)}`,
      estimatedCostRange: `${formatINR(minEstimate)} – ${formatINR(maxEstimate)}`,
      feasibilityStatus: feasibilityWarning ? 'NEEDS_VERIFICATION' : 'FEASIBLE',
      feasibilityWarning: feasibilityWarning,
      inclusionsSummary: pkgDetails.inclusions,
      exclusionsNotice: "Exclusions: Compound wall, deep borewell beyond 300ft, EB meter deposit, luxury landscaping (requires on-site measurement).",
      disclaimer: "Preliminary estimate for construction only. Exact quote is finalized after soil inspection, setback validation, and architectural plan approval."
    };
  }

  // 2. Save Construction Enquiry to CRM & Trigger n8n Webhook
  if (fnName === 'saveConstructionEnquiry') {
    const enquiryId = `ENQ-${Date.now().toString().slice(-6)}`;
    const enquiry = {
      enquiryId,
      timestamp: new Date().toISOString(),
      chatId,
      customerName: args.customerName || 'Prospective Homeowner',
      customerPhone: args.customerPhone || (chatId.split('@')[0] || ''),
      siteLocation: args.siteLocation || 'Not specified',
      hasPlot: args.hasPlot !== undefined ? args.hasPlot : true,
      plotDimensions: args.plotDimensions || 'Standard',
      builtUpAreaSqFt: args.builtUpAreaSqFt || null,
      floors: args.floors || 'G+1',
      bedrooms: args.bedrooms || '3 BHK',
      approxBudget: args.approxBudget || 'Guidance required',
      preferredPackage: args.preferredPackage || 'Premium (₹2,350/sq.ft)',
      startingTimeline: args.startingTimeline || 'Next 1-2 months',
      specialRequirements: args.specialRequirements || 'Standard turnkey construction',
      status: 'NEW_LEAD'
    };

    // Save locally
    try {
      let enquiries = [];
      if (fs.existsSync(ENQUIRIES_FILE)) {
        enquiries = JSON.parse(fs.readFileSync(ENQUIRIES_FILE, 'utf-8') || '[]');
      }
      enquiries.unshift(enquiry);
      fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(enquiries.slice(0, 100), null, 2), 'utf-8');
      console.log(`✅ [Builder CRM] Saved enquiry ${enquiryId} for ${enquiry.customerName}`);
    } catch (err) {
      console.error(`❌ [Builder CRM Error]:`, err.message);
    }

    // Forward to n8n Webhook asynchronously if configured
    dispatchN8nWebhook(enquiry, 'construction-enquiry');

    return {
      status: 'enquiry_saved',
      enquiryId: enquiryId,
      customerName: enquiry.customerName,
      siteLocation: enquiry.siteLocation,
      messageToUser: `Thank you ${enquiry.customerName}! Your house construction requirements have been recorded under ID #${enquiryId}. Er. Dhilip Kumar and our engineering team will review your plot specifications and contact you shortly with a customized floor plan & quotation.`
    };
  }

  // 3. Request Site Visit or In-Person Consultation
  if (fnName === 'requestSiteVisitOrConsultation') {
    const visitId = `VISIT-${Date.now().toString().slice(-5)}`;
    const visitRecord = {
      visitId,
      timestamp: new Date().toISOString(),
      chatId,
      customerName: args.customerName,
      customerPhone: args.customerPhone || (chatId.split('@')[0] || ''),
      siteLocation: args.siteLocation,
      preferredDate: args.preferredDate,
      preferredTimeSlot: args.preferredTimeSlot || '10:00 AM',
      meetingType: args.meetingType || 'Free Site Visit & Soil/Plot Inspection',
      status: 'PENDING_AVAILABILITY_CONFIRMATION'
    };

    try {
      let visits = [];
      if (fs.existsSync(SITE_VISITS_FILE)) {
        visits = JSON.parse(fs.readFileSync(SITE_VISITS_FILE, 'utf-8') || '[]');
      }
      visits.unshift(visitRecord);
      fs.writeFileSync(SITE_VISITS_FILE, JSON.stringify(visits.slice(0, 100), null, 2), 'utf-8');
    } catch (err) {
      console.error(`❌ [Builder Site Visit Error]:`, err.message);
    }

    // Forward to n8n Webhook
    dispatchN8nWebhook(visitRecord, 'site-visit-booking');

    return {
      status: 'site_visit_scheduled',
      visitId: visitId,
      customerName: visitRecord.customerName,
      date: visitRecord.preferredDate,
      time: visitRecord.preferredTimeSlot,
      siteLocation: visitRecord.siteLocation,
      bookingStatus: 'PENDING_AVAILABILITY_CONFIRMATION',
      notes: "Site visit request recorded. Our senior civil engineering team will check schedule and reach out to confirm the appointment. Zero inspection charges."
    };
  }

  // 4. Retrieve Projects Portfolio
  if (fnName === 'getProjectPortfolio') {
    return {
      status: 'success',
      totalProjects: BUILDER_PROFILE.portfolio.length,
      projects: BUILDER_PROFILE.portfolio,
      interactiveToursNotice: "Clients can also explore interactive 3D walkarounds and 360° VR interior tours on our portal."
    };
  }

  return { status: 'unknown_tool', message: `Tool ${fnName} not recognized` };
}

// -------------------------------------------------------------
// HELPER: DISPATCH TO N8N WEBHOOK
// -------------------------------------------------------------
function dispatchN8nWebhook(payload, endpoint = 'construction-enquiry') {
  const webhookUrl = process.env.N8N_BUILDER_WEBHOOK_URL || `http://localhost:5678/webhook/${endpoint}`;
  try {
    const urlObj = new URL(webhookUrl);
    const postData = JSON.stringify({
      event: endpoint,
      source: 'WhatsApp AI Construction Assistant',
      timestamp: new Date().toISOString(),
      data: payload
    });

    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, (res) => {
      console.log(`📡 [n8n Webhook Dispatched] Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      // Non-blocking log
      console.log(`ℹ️ [n8n Webhook Note]: Webhook not reachable on ${webhookUrl} (${e.message}). Data is safely stored in local CRM.`);
    });

    req.write(postData);
    req.end();
  } catch (e) {
    console.warn(`[n8n Webhook] Skipped: ${e.message}`);
  }
}

module.exports = {
  BUILDER_TOOLS,
  BUILDER_PROFILE,
  buildBuilderSystemPrompt,
  executeBuilderToolCall
};
