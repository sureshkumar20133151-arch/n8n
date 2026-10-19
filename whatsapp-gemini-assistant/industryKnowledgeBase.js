// SOLODEVELOPER AI BUSINESS AGENT - INDUSTRY SPECIFIC INTELLIGENCE BASE
// Contains domain-specific diagnosis, customer journeys, pain points, discovery questions, and Grand Slam Offers for 10 industries.

const INDUSTRY_KNOWLEDGE = {
  construction: {
    id: "construction",
    name: "Construction & Civil Contractors",
    keywords: [
      "builder", "construction", "contractor", "civil contractor", "architect",
      "real estate developer", "turnkey", "building materials", "renovation", "flats builder"
    ],
    commonProblems: [
      "Not getting enough qualified project enquiries",
      "Low quality leads and tire-kickers",
      "Manual WhatsApp follow-up with prospects",
      "Missing WhatsApp enquiries while working on construction sites",
      "Difficulty showing completed project photos and videos professionally",
      "Slow quotation and estimate follow-up"
    ],
    customerJourney: [
      "Customer discovers builder (Referral/Social/Ads)",
      "Checks credibility & past project quality",
      "Inquires on WhatsApp about pricing & floor plans",
      "Schedules site visit",
      "Receives quotation & proposal",
      "Follow-up & negotiation",
      "Project confirmation & contract signoff"
    ],
    discoveryQuestions: [
      "Are most of your current inquiries for residential homes, commercial projects, or renovations?",
      "When a client asks for an estimate, how long does your team typically take to share the quotation?",
      "Do you have a dedicated website to showcase completed site photos and videos to new buyers?"
    ],
    dreamOutcomes: [
      "More qualified turnkey and residential villa contracts",
      "Instant 24/7 response to prospective buyers while on site",
      "Streamlined site visit booking on WhatsApp",
      "High online credibility that justifies premium pricing"
    ],
    solutions: [
      "Construction Growth Website (High-credibility portfolio & 3D site galleries)",
      "WhatsApp AI Lead Qualification Agent (Qualifies plot size, budget, and location in 60s)",
      "Automated Site Visit Scheduler",
      "n8n CRM Follow-up System"
    ],
    offerTemplate: "Construction Growth & AI Sales System",
    closingHook: "Explain how responding in 60 seconds vs 4 hours stops villa buyers from checking competitor builders in their area.",
    followupStrategy: "Send a sample live WhatsApp demo link showing automated villa buyer qualification and site tour booking."
  },

  interiorDesign: {
    id: "interiorDesign",
    name: "Interior Designers & Architects",
    keywords: [
      "interior", "interior designer", "home interiors", "villa design",
      "modular kitchen", "decor", "architecture", "interior architect", "space designer"
    ],
    commonProblems: [
      "Not enough premium and luxury villa clients",
      "Instagram leads bouncing without consultation booking",
      "Portfolio photos scattered across WhatsApp without professional presentation",
      "Too many low-budget inquiries asking for unrealistically cheap rates",
      "Chasing clients manually for design scope and floor plans"
    ],
    customerJourney: [
      "Customer sees design reel/photo on Instagram or Pinterest",
      "Builds trust by viewing luxury portfolio",
      "Requests consultation on WhatsApp or DM",
      "Discusses project scope & budget",
      "Site inspection & measurements",
      "3D Design proposal & quote",
      "Project signoff & execution"
    ],
    discoveryQuestions: [
      "What type of projects do you want more of — luxury residential villas or commercial spaces?",
      "When inquiries come from Instagram, how do you currently pre-qualify their budget?",
      "Do you have an online 3D portfolio showcase to highlight your completed luxury work?"
    ],
    dreamOutcomes: [
      "15+ premium villa turnkey inquiries per month",
      "Speaking only with pre-qualified high-budget homeowners",
      "Elevated luxury brand image that commands premium design fees",
      "Automated initial design consultation booking"
    ],
    solutions: [
      "Premium Interior Website (3D immersive project showcase & mobile-first UI)",
      "WhatsApp AI Consultation Booking Agent (Filters budget & collects floorplans 24/7)",
      "Automated Design Scope Intake Form",
      "Instagram-to-WhatsApp Direct Lead Nurturing Funnel"
    ],
    offerTemplate: "Premium Interior Client Acquisition System",
    closingHook: "Pitch pre-qualifying client floor plans and budget before the designer spends hours on site visits.",
    followupStrategy: "Send an interactive showcase demo and explain how the AI pre-qualifies ₹10L+ villa budgets automatically."
  },

  realEstate: {
    id: "realEstate",
    name: "Real Estate Developers & Property Brokers",
    keywords: [
      "real estate", "property", "developer", "plots", "layout", "apartment",
      "villa", "land broker", "flats", "gated community", "farmland", "realtor"
    ],
    commonProblems: [
      "High volume of tire-kickers and casual inquiries wasting sales agents' time",
      "Unverified buyer budgets and location preferences",
      "Slow agent response losing serious property investors to competitors",
      "Property portal leads (99acres/MagicBricks) going cold within 1 hour"
    ],
    customerJourney: [
      "Buyer sees property ad, listing, or hoarding",
      "Contacts via WhatsApp or website form",
      "Verifies budget, unit type & location preference",
      "Schedules site tour",
      "Site inspection with property manager",
      "Documentation check & payment plan discussion",
      "Token booking confirmation"
    ],
    discoveryQuestions: [
      "Are you currently promoting residential villa plots, gated community apartments, or commercial units?",
      "How do your sales agents currently filter serious property buyers from casual tire-kickers?",
      "Would an instant brochure delivery & automated site visit scheduling system help your sales team?"
    ],
    dreamOutcomes: [
      "Sales agents speak only with verified, pre-qualified high-budget buyers",
      "3x more confirmed weekend site tour appointments",
      "Zero missed property leads 24/7 with instant brochure delivery",
      "Complete visibility over lead pipeline in Google Sheets / CRM"
    ],
    solutions: [
      "High-Converting Real Estate Project Website (Interactive master plan & unit locator)",
      "WhatsApp AI Property Advisor & Qualifier (Qualifies budget, unit type, and location in 60s)",
      "Instant PDF Brochure Dispatcher",
      "Automated Calendar Site Tour Booking System"
    ],
    offerTemplate: "Real Estate AI Lead Conversion & Tour Booking System",
    closingHook: "Show how the AI instantly filters buyers with budget above ₹50L and books site tours automatically.",
    followupStrategy: "Send a sample automated property brochure flow showing instant site visit booking."
  },

  clinicHealthcare: {
    id: "clinicHealthcare",
    name: "Clinics, Doctors & Healthcare Centers",
    keywords: [
      "clinic", "doctor", "hospital", "dental", "pediatrics", "dermatologist",
      "wellness", "healthcare", "physiotherapy", "ayurveda", "eye clinic", "skin clinic"
    ],
    commonProblems: [
      "Missed patient inquiries during surgeries and after clinic hours (after 8 PM)",
      "Reception staff overwhelmed with repetitive phone calls (timings, fees, location)",
      "High appointment no-show rate disrupting doctor schedules",
      "Manual phone calls needed for rescheduling and follow-up reminders"
    ],
    customerJourney: [
      "Patient experiences symptom or searches specialist online",
      "Checks doctor qualifications, reviews, and timings",
      "Calls or WhatsApps clinic to inquire",
      "Selects appointment slot",
      "Attends consultation at clinic",
      "Undergoes treatment / prescription",
      "Receives follow-up checkup reminder"
    ],
    discoveryQuestions: [
      "Do you get patient inquiries after clinic hours or during doctor consultations that go unanswered?",
      "Is your reception team spending excessive time answering repetitive questions about doctor timings and consultation fees?",
      "Are missed appointments or no-shows a challenge for your clinic schedule?"
    ],
    dreamOutcomes: [
      "Zero missed patient inquiries 24/7 in English and Tamil",
      "Reduced reception phone burnout so staff focuses on patient care",
      "90%+ appointment attendance with automated WhatsApp reminders",
      "Patients self-booking consultations directly on WhatsApp in under 1 minute"
    ],
    solutions: [
      "Healthcare Credibility Website (Doctor profiles, services, patient reviews & Google Maps)",
      "24/7 WhatsApp AI Receptionist in Tamil & English (Answers FAQs, shares fees, books slots)",
      "Automated Appointment Slot Booking System",
      "Automated WhatsApp Appointment & Medication Reminders"
    ],
    offerTemplate: "Healthcare AI Reception & Patient Management System",
    closingHook: "Highlight zero missed patient inquiries after 8 PM and automated WhatsApp appointment reminders reducing no-shows.",
    followupStrategy: "Share a 60-second video demo of a patient booking a dental/clinic slot on WhatsApp in Tamil and English."
  },

  restaurantFood: {
    id: "restaurantFood",
    name: "Restaurants, Cafes & Cloud Kitchens",
    keywords: [
      "restaurant", "cafe", "cloud kitchen", "food delivery", "bakery",
      "catering", "dining", "sweet stall", "bistro", "fast food"
    ],
    commonProblems: [
      "Paying high 25%–30% aggregator commissions to Swiggy/Zomato on every order",
      "Slow, manual order taking and price checking on WhatsApp",
      "Table reservation confusion and customer waitlist frustration during peak rush",
      "Lack of direct customer data for repeat marketing and weekend offers"
    ],
    customerJourney: [
      "Customer discovers restaurant on Instagram, Google Maps, or through friend",
      "Checks digital menu and food reviews",
      "Places direct order or reserves table on WhatsApp",
      "Dines in restaurant or receives direct delivery",
      "Enjoys food and receives automated feedback link",
      "Receives weekend special discount offer to re-order"
    ],
    discoveryQuestions: [
      "Are you currently paying high commissions on food delivery platforms, or do you take direct WhatsApp orders?",
      "During weekend peak rush, how do you manage table reservations and customer waitlists?",
      "Do you have a digital menu where customers can order directly with instant UPI payment?"
    ],
    dreamOutcomes: [
      "40%+ direct orders with zero commission to third-party apps",
      "Smooth automated table reservations without staff phone interruptions",
      "Direct customer phone database for automated festive and weekend marketing",
      "Instant UPI payments credited directly to restaurant bank account"
    ],
    solutions: [
      "Direct Food Ordering Web App (Zero commission, mobile-first digital menu)",
      "24/7 WhatsApp AI Table Reservation & Menu Bot",
      "Instant UPI & Razorpay Checkout Integration",
      "Customer Re-engagement & Festive Broadcast Automation via n8n"
    ],
    offerTemplate: "Restaurant Direct Ordering & Table Booking AI System",
    closingHook: "Show how saving 25-30% aggregator commission on direct WhatsApp orders adds ₹50,000 to ₹1,50,000 pure monthly profit.",
    followupStrategy: "Share a sample digital menu where Suresh placed a test food order directly into WhatsApp."
  },

  retailBoutique: {
    id: "retailBoutique",
    name: "Retail Shops, Boutiques & Jewelers",
    keywords: [
      "boutique", "retail shop", "clothing store", "sarees", "jewelry",
      "fashion store", "footwear", "electronics shop", "textiles", "apparel"
    ],
    commonProblems: [
      "Manual price, color, and size inquiries on WhatsApp consuming staff all day",
      "Abandoned inquiries when customer service is offline after shop hours",
      "Manual UPI screenshot verification causing dispatch delays",
      "Dead inventory because customers cannot easily browse available collections"
    ],
    customerJourney: [
      "Customer sees product photo on Instagram, Facebook, or WhatsApp status",
      "Messages store asking 'Price please?' or 'Is size M available?'",
      "Staff manually checks stock and sends photos",
      "Customer requests payment details",
      "Sends UPI screenshot for manual verification",
      "Store dispatches parcel and manually texts tracking number"
    ],
    discoveryQuestions: [
      "How much time does your team spend manually replying to 'price please' and sizing questions on WhatsApp?",
      "Do customers message late at night after the store closes and end up buying from somewhere else?",
      "Would having an automated WhatsApp catalog with instant UPI payment help increase your sales?"
    ],
    dreamOutcomes: [
      "24/7 impulse sales on WhatsApp even while the physical store is closed",
      "Zero staff hours wasted on repetitive 'price please' messages",
      "Instant automated payment verification and shipping alerts",
      "Higher average order value through automated related product recommendations"
    ],
    solutions: [
      "Mobile-First Retail Storefront (Fast loading product catalog)",
      "Autonomous WhatsApp Catalog & Order Bot (Browsing, stock check & cart inside chat)",
      "Razorpay / Instant UPI Payment Verification",
      "Automated Order Confirmation & Tracking SMS/WhatsApp"
    ],
    offerTemplate: "Autonomous Retail Growth & WhatsApp Store System",
    closingHook: "Demonstrate instant catalog browsing and UPI checkout directly inside WhatsApp without manual staff intervention.",
    followupStrategy: "Send an interactive WhatsApp catalog sample with direct buy button."
  },

  educationCoaching: {
    id: "educationCoaching",
    name: "Education, Coaching Centers & Academies",
    keywords: [
      "coaching", "academy", "tuition", "institute", "school", "college",
      "training", "spoken english", "neet coaching", "ias academy", "computer center", "upsc"
    ],
    commonProblems: [
      "High inquiry volume during admission season overwhelming staff phone lines",
      "Slow response to parent fee and syllabus inquiries causing drop-offs",
      "Low attendance for free demo classes and orientation sessions",
      "Manual fee payment follow-up with existing students"
    ],
    customerJourney: [
      "Parent or student sees banner, ad, or Google Maps listing",
      "Inquires on WhatsApp for course details, syllabus, and fee structure",
      "Counselor shares brochure & invites to demo session",
      "Attends free demo class or faculty counseling",
      "Submits admission registration form",
      "Pays course fee & receives enrollment confirmation"
    ],
    discoveryQuestions: [
      "During admission season, how quickly is your team able to share course brochures and syllabus details with inquiring parents?",
      "Do you offer free demo classes or webinars, and how do you track student attendance?",
      "Is follow-up with interested parents currently done manually in Excel sheets?"
    ],
    dreamOutcomes: [
      "Instant 24/7 course brochure & fee structure delivery on WhatsApp",
      "2x higher demo class attendance with automated WhatsApp reminders",
      "Streamlined digital admission intake without manual paper forms",
      "Automated fee installment reminders that reduce delayed payments"
    ],
    solutions: [
      "Academy Credibility Portal (Course listings, faculty credentials, student results)",
      "WhatsApp AI Admission Counselor & Syllabus Bot (24/7 course qualification)",
      "Automated Demo Class Booking & Webinar Registration Funnel",
      "Automated Fee Reminder & Student Intake Pipeline"
    ],
    offerTemplate: "Education AI Admission & Student Enrollment Engine",
    closingHook: "Show how instant course brochure delivery and 1-click demo registration doubles admission conversion during peak season.",
    followupStrategy: "Share a demo flow of a student instantly downloading a NEET/IAS syllabus PDF on WhatsApp."
  },

  manufacturingB2B: {
    id: "manufacturingB2B",
    name: "Manufacturers, B2B Suppliers & Industrial Units",
    keywords: [
      "manufacturer", "factory", "industrial", "b2b supplier", "fabrication",
      "machinery", "packaging", "raw materials", "exporter", "wholesaler", "oem"
    ],
    commonProblems: [
      "Inbound inquiries lack technical specs, drawings, or order volume details",
      "Endless back-and-forth emails for RFQs (Request for Quote)",
      "Slow quote turnaround losing high-value commercial orders",
      "Relying on old paper brochures that do not reflect modern factory capabilities"
    ],
    customerJourney: [
      "B2B procurement buyer searches for reliable Indian manufacturer",
      "Reviews factory certifications, machinery specs, and past client audits",
      "Submits RFQ with technical specs or sample drawing",
      "Engineering team reviews tolerances & material specs",
      "Shares formal quotation and lead time estimate",
      "Sample approval & factory visit",
      "Purchase Order (PO) issued & production begins"
    ],
    discoveryQuestions: [
      "When a buyer requests a quote, do you often have to go back and forth asking for quantity, dimensions, or technical specs?",
      "Do you supply across India or export, and do buyers find you through trade portals or direct Google search?",
      "Would an automated RFQ intake system that collects technical specs and order quantities save your engineering team time?"
    ],
    dreamOutcomes: [
      "Pre-qualified commercial RFQs with complete technical specifications attached",
      "70% faster quotation turnaround on high-value B2B orders",
      "High online credibility that wins audits from institutional and export buyers",
      "Zero manual data entry between WhatsApp inquiries and ERP/Sheets"
    ],
    solutions: [
      "Industrial Capability Website (Machine specs, capacity, certifications & export portfolio)",
      "WhatsApp AI RFQ & Technical Spec Intake Agent",
      "Digital Technical Catalog & Spec Sheet Dispatcher",
      "Automated B2B Quotation Pipeline via n8n"
    ],
    offerTemplate: "Manufacturing B2B Lead Conversion & RFQ System",
    closingHook: "Focus on eliminating 3 days of back-and-forth RFQ emails by collecting technical specs and quantities instantly via AI.",
    followupStrategy: "Send an RFQ intake workflow demo showing automated quote generation."
  },

  professionalServices: {
    id: "professionalServices",
    name: "Professional Services (CA, Legal, Consultants)",
    keywords: [
      "chartered accountant", "ca firm", "lawyer", "advocate", "tax consultant",
      "financial advisor", "consulting", "legal", "audit", "management consultant", "cpa"
    ],
    commonProblems: [
      "Wasting high-value billable hours answering basic repetitive tax/legal queries",
      "Chasing clients manually for KYC and financial documents over messy WhatsApp chats",
      "Missed compliance and tax filing deadlines due to disorganised client communication",
      "Struggling to attract high-ticket business advisory retainers"
    ],
    customerJourney: [
      "Client faces tax notice, legal query, or business incorporation requirement",
      "Searches for reputable consultant or receives referral",
      "Contacts firm to book preliminary discovery consultation",
      "Consultant assesses case & defines fee structure",
      "Client submits required documents (ITR, KYC, Bank statements)",
      "Work executed & compliance filed",
      "Annual retainer onboarding"
    ],
    discoveryQuestions: [
      "Does your firm spend significant billable hours answering repetitive preliminary queries or chasing clients for documents?",
      "How do clients currently book consultations or share their financial/legal documents with your office?",
      "Would an automated document intake and appointment scheduling system streamline your practice?"
    ],
    dreamOutcomes: [
      "15+ billable hours saved each week by automating routine client queries",
      "Organized, secure client document collection on WhatsApp",
      "Attracting premium corporate clients who pay annual retainers",
      "Zero deadline panic with automated compliance reminder broadcasts"
    ],
    solutions: [
      "Professional Authority Website (Practice areas, case studies, client testimonials)",
      "WhatsApp AI Client Intake & Document Collection Agent",
      "Automated Paid Consultation Scheduler",
      "Automated Compliance & Tax Deadline Broadcast System"
    ],
    offerTemplate: "Professional Practice Client Intake & Automation System",
    closingHook: "Position the system as freeing up 15+ billable hours every week by automating routine client inquiries and document collection.",
    followupStrategy: "Share a sample client onboarding flow showing secure document collection on WhatsApp."
  },

  ecommerceD2C: {
    id: "ecommerceD2C",
    name: "E-Commerce & D2C Brands",
    keywords: [
      "ecommerce", "d2c", "online store", "shopify", "woocommerce", "d2c brand",
      "cosmetics", "skincare", "apparel", "accessories", "supplements", "direct to consumer"
    ],
    commonProblems: [
      "High Customer Acquisition Cost (CAC) on Meta and Google Ads eating profit margins",
      "Cart abandonment rates exceeding 70% with standard email recovery failing",
      "Customer support flooded with 'Where is my order?' (WISMO) queries",
      "Low customer lifetime value (LTV) and weak repeat purchase rates"
    ],
    customerJourney: [
      "Consumer clicks Instagram/Facebook Ad or influencer reel",
      "Browses mobile-first product landing page",
      "Adds item to cart & proceeds to checkout",
      "If abandoned: receives automated WhatsApp recovery discount within 30 minutes",
      "Completes purchase with 1-click UPI / COD confirmation",
      "Receives automated dispatch & tracking WhatsApp alerts",
      "Receives review request and VIP repurchase offer 14 days later"
    ],
    discoveryQuestions: [
      "What is your current cart abandonment rate on your online store?",
      "How do you currently recover abandoned carts or notify customers about order tracking?",
      "Are support staff spending hours answering 'where is my order' (WISMO) messages manually?"
    ],
    dreamOutcomes: [
      "Recovering 20%+ of abandoned carts via high-converting WhatsApp messages",
      "Automated order tracking updates reducing support tickets by 80%",
      "30%+ increase in repeat purchases through automated VIP post-purchase flows",
      "Ultra-fast mobile store loading speed under 1.5 seconds"
    ],
    solutions: [
      "High-Performance Next.js / Shopify Headless Storefront",
      "WhatsApp AI Abandoned Cart Recovery & Checkout Bot",
      "Automated Order Tracking (WISMO) & Delivery Alert System",
      "Automated Post-Purchase Review & Re-order Retention Funnel"
    ],
    offerTemplate: "D2C E-Commerce Growth & WhatsApp Cart Recovery Engine",
    closingHook: "Show that recovering just 10 abandoned carts per week directly adds ₹40,000 to ₹1,00,000 monthly revenue with zero ad spend.",
    followupStrategy: "Send case study metrics on how WhatsApp cart recovery generates an immediate 15-20% revenue lift."
  }
};

/**
 * Detect matching industry from client text or keywords
 * @param {string} text 
 * @returns {object|null}
 */
function detectIndustry(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const key of Object.keys(INDUSTRY_KNOWLEDGE)) {
    const mod = INDUSTRY_KNOWLEDGE[key];
    if (mod.keywords.some(kw => lower.includes(kw))) {
      return mod;
    }
  }
  return null;
}

/**
 * Format the entire 10-industry matrix into an injection-ready prompt section
 * @returns {string}
 */
function formatIndustryPrompt() {
  return Object.values(INDUSTRY_KNOWLEDGE).map((m, idx) => `
[${idx + 1}. INDUSTRY: ${m.name.toUpperCase()}]
• Keywords: ${m.keywords.join(', ')}
• Common Problems: ${m.commonProblems.join('; ')}
• Typical Customer Journey: ${m.customerJourney.join(' -> ')}
• Consultative Discovery Questions (Ask ONLY ONE at a time!): ${m.discoveryQuestions.map(q => `"${q}"`).join(', ')}
• Dream Outcomes: ${m.dreamOutcomes.join('; ')}
• Recommended Solutions: ${m.solutions.join(', ')}
• Grand Slam Offer Template: "${m.offerTemplate}"
• Suresh Closing Call Angle: ${m.closingHook}
• Follow-up Strategy: ${m.followupStrategy}`).join('\n');
}

module.exports = {
  INDUSTRY_KNOWLEDGE,
  detectIndustry,
  formatIndustryPrompt
};
