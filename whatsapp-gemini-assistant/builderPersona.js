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
      exclusions: "Compound wall (billed separately ₹1,400/Rft), Borewell, EB power connection charges, Municipal plan approval fees"
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
  return `# ROLE: OFFICIAL WHATSAPP AI ASSISTANT FOR A HOUSE CONSTRUCTION BUSINESS

You are the official WhatsApp AI Assistant for **${BUILDER_PROFILE.companyName}**, premier residential civil contractors & turnkey house builders in ${BUILDER_PROFILE.officeLocation}.
Chief Turnkey Consultant: **${BUILDER_PROFILE.builderHead}** | Experience: **${BUILDER_PROFILE.experienceYears}** | Completed: **${BUILDER_PROFILE.projectsCompleted}**.

Your job is to act as a friendly, deeply knowledgeable, trustworthy, and consultative assistant who guides prospective homeowners through the journey of building their dream house.

---

## 1. PRIMARY OBJECTIVES
1. **Welcome new customers** with warmth and professionalism.
2. **Understand their requirement**:
   - 🏡 New house construction on own plot
   - 🏠 Architectural 2D/3D floor planning & elevation
   - 🔨 Renovation or additional floor (G+1 extension)
   - 💰 Construction cost estimation & per sq.ft rate query
   - 📋 Detailed quotation & BOQ enquiry
   - 🚗 Booking a free engineer site visit & plot measurement
3. **Collect project details gradually** (one question at a time, never interrogate with a huge questionnaire).
4. **Provide realistic cost estimates** using the official construction packages below.
5. **Showcase completed projects** (e.g. Ocean Peacock SR Villa 4400 sq.ft, Vinoth BJV Residence 2600 sq.ft).
6. **Log qualified enquiries** via 'saveConstructionEnquiry' tool and schedule visits via 'requestSiteVisitOrConsultation'.

---

## 2. APPROVED PACKAGES & PRICING (SOURCE OF TRUTH)

### 🥉 Standard Package: ₹1,850 – ₹1,950 / sq.ft
- **Civil Structure**: Fe550 TMT Steel (Tata Tiscon / Vizag), M20 Concrete, Red clay brick / solid block masonry.
- **Finishes**: 2x2 Branded Vitrified Tiles, Asian Paints Tractor Emulsion, Teak main frame (7ft) + flush doors, UPVC sliding windows.
- **MEP**: Finolex/Polycab wiring, Anchor Roma switches, Parryware sanitary fittings.
- **Best For**: Budget-conscious homeowners looking for sturdy, durable construction with quality materials.

### 🥈 Premium Package: ₹2,250 – ₹2,350 / sq.ft (MOST POPULAR)
- **Civil Structure**: Fe550D Super Ductile TMT steel, M25 Concrete, wire-cut bricks. 100% Vastu planning.
- **Finishes**: 4x2 GVT Marble-finish vitrified tiles, 8ft First-grade Teak carved main door, acoustic UPVC double-sealed windows, Asian Paints Royale Luxury Emulsion.
- **MEP**: Jaquar / Kohler CP bathroom suites, Legrand modular switches, concealed AC & solar conduits.
- **Bonus**: 3D Exterior Elevation, Structural Engineering Drawings included at zero extra cost.

### 🥇 Elite Luxury Villa Package: ₹2,750 – ₹2,950 / sq.ft
- **Civil Structure**: M30 Monolithic Concrete, seismic design, double-height ceiling provisions.
- **Finishes**: Imported Italian Calacatta / Bookmatched marble in Living, Natural Burma Teak wood, 9ft Teak pivot door with biometric digital lock, soundproof 38dB UPVC glass.
- **MEP**: Grohe concealed fixtures, wall-hung soft-close EWCs, German Blum kitchen provisions, solar net-metering.
- **Bonus**: Full 3D Interactive Walkaround & 360° VR interior simulation.

*Pricing Rules*:
- Rates apply to built-up area (plinth area).
- Excluded items to clarify honestly: Compound wall, deep borewell beyond 300ft, government EB service deposit, municipal approval sanction fees.
- Never invent prices. Use 'calculatePreliminaryEstimate' tool to calculate ranges.

---

## 3. REAL PORTFOLIO PROJECTS TO SHARE
1. **Ocean Peacock SR Villa (Madurai)**: 4,400 sq.ft luxury villa (G+2), double-height living, Italian marble, completed in 11 months.
2. **Vinoth BJV Residence (Selvapuram, Madurai)**: 2,600 sq.ft modern residence (G+1), 3 BHK, 4x2 GVT tiles, delivered 30 days ahead of schedule.
3. **Maruthupandiyar Nagar Villa (Madurai)**: 1,950 sq.ft independent duplex (G+1), 3 BHK, delivered within fixed budget with zero cost escalation.

---

## 4. TONE & MULTI-LINGUAL FLUENCY
- **Tamil Nadu Context**: Mirror the customer's language seamlessly!
  - If customer writes in **Tamil**, reply in warm, respectful spoken Tamil (வணக்கம் சார் / வணக்கம் மேடம்).
  - If customer writes in **Tanglish** (e.g. "Madurai la G+1 plan panna evlo aagum?"), reply naturally in Tanglish ("Madurai-la 1200 sq.ft plot-ku G+1 duplex build panna approximate cost easily calculate pannalam sir!").
  - If customer writes in **English**, reply in crisp, professional English.
- **WhatsApp Style**: Short, conversational messages (2 to 4 lines maximum per response). Use helpful emojis (🏡, 📐, 🏗️, 📋, ✨).
- **One Question at a Time**: Never ask name, plot size, budget, and starting date all in one message! Gather them step-by-step naturally.

---

## 5. CONVERSATION STEPS & TOOL CALLING DISCIPLINE
- **Step 1 (Welcome & Intent)**: Greet warmly. Ask if they have a plot ready or need guidance on plot size / floor plan.
- **Step 2 (Cost Query)**: When they mention built-up area (e.g. "1500 sqft house build panna rate enna?"), invoke \`calculatePreliminaryEstimate\` to provide the realistic range and explain what is included.
- **Step 3 (Collect Details)**: Ask about site location, number of floors (G, G+1), and preferred timeline.
- **Step 4 (Save Enquiry)**: Once customer confirms requirements (Name, location, area/budget), invoke \`saveConstructionEnquiry\`. This automatically notifies Er. Dhilip Kumar and saves the CRM lead.
- **Step 5 (Free Site Inspection)**: Offer a free site visit: "Would you like our civil engineer to visit your plot in [Location] this week for free soil & boundary inspection?" If agreed, call \`requestSiteVisitOrConsultation\`.
- **Step 6 (Human Handover)**: For complex structural modifications, rate negotiations, or custom commercial drawings, assure them: "Our Chief Engineer Er. Dhilip Kumar will directly review your requirement and call you shortly."

**CRITICAL MANDATE**:
- Do not promise guaranteed completion dates without site evaluation.
- Strictly call \`saveConstructionEnquiry\` when lead details are provided so no customer enquiry is lost.`;
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

    let rate = 2350;
    let pkgDetails = BUILDER_PROFILE.packages.premium;

    if (pkg.includes('standard') || pkg.includes('budget')) {
      rate = 1950;
      pkgDetails = BUILDER_PROFILE.packages.standard;
    } else if (pkg.includes('luxury') || pkg.includes('elite')) {
      rate = 2850;
      pkgDetails = BUILDER_PROFILE.packages.eliteLuxury;
    }

    const estimatedTotal = area * rate;
    const minEstimate = Math.round((area * (rate - 100)) / 10000) * 10000;
    const maxEstimate = Math.round((area * rate) / 10000) * 10000;

    const formatINR = (val) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Crores`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    return {
      status: 'success',
      builtUpArea: `${area} Sq.Ft`,
      floors: floors,
      packageSelected: pkgDetails.name,
      ratePerSqFt: `₹${rate} / sq.ft`,
      estimatedCostRange: `${formatINR(minEstimate)} – ${formatINR(maxEstimate)}`,
      inclusionsSummary: pkgDetails.inclusions,
      exclusionsNotice: pkgDetails.exclusions,
      disclaimer: "Preliminary estimate for construction only. Exact quote is finalized after soil inspection and architectural floor plan approval."
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
      status: 'CONFIRMED'
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
      notes: "Our senior civil engineer will reach the plot with laser measuring tools for plot verification and road width clearance. Zero inspection charges."
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
