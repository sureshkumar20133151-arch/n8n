// Comprehensive Knowledge Base for Multi-Website AI Representative
// Primary: solodeveloper.pro (Suresh Kumar - Solo Developer, Madurai)
// Extensible for Website 2 & Website 3

const KNOWLEDGE_BASE = {
  primaryBusiness: {
    name: "Suresh Kumar — Solo Developer",
    website: "https://solodeveloper.pro",
    location: "Madurai, Tamil Nadu, India",
    phone: "+91 93615 99097",
    whatsappUrl: "https://wa.me/919361599097",
    role: "Freelance Full-Stack Web Developer & AI Solutions Builder",
    headline: "Fast, high-converting websites, AI tools, and business automation systems.",
    guarantees: [
      "⚡ 7-Day Fast Delivery (For standard portfolios & business sites)",
      "🏷️ Fixed Transparent Pricing (Zero hidden charges)",
      "🛠️ 30-Day Free Post-Launch Support & Bug Fixes"
    ],
    services: [
      {
        title: "Portfolio Website",
        startingPrice: "₹8,999",
        delivery: "5-7 days",
        description: "Modern, high-converting showcase for freelancers, developers, designers, doctors, and professionals. Features 3D/minimalist UI, responsive mobile design, SEO, and fast Vercel hosting."
      },
      {
        title: "Business Website",
        startingPrice: "₹9,999",
        delivery: "7-10 days",
        description: "Professional multi-page website for shops, clinics, agencies, and service businesses. Includes direct WhatsApp CTAs, Google Maps location, lead contact forms, and SEO."
      },
      {
        title: "E-Commerce Store",
        startingPrice: "Custom Quote (typically ₹19,999 - ₹34,999)",
        delivery: "10-14 days",
        description: "Full-featured online store with product catalog, Razorpay/UPI/Stripe payment gateways, mobile-first checkout, order management, and admin panel."
      },
      {
        title: "Autonomous AI Agents & WhatsApp Automation",
        startingPrice: "Custom Quote",
        delivery: "5-7 days",
        description: "Custom WhatsApp AI Agents with Tamil, Tanglish & English NLP, 24/7 lead qualification, Gemini/Claude integration, intelligent reasoning, and CRM sync."
      },
      {
        title: "Chrome Extensions & Web Scrapers",
        startingPrice: "Custom Quote",
        delivery: "5-7 days",
        description: "Custom browser extensions for lead scraping (like GMaps Lead Extractor Pro), workflow shortcuts, and data automation."
      },
      {
        title: "Workflow Automation (n8n + FastAPI)",
        startingPrice: "Custom Quote",
        delivery: "3-5 days",
        description: "Connect Google Sheets, WhatsApp, CRM, Email, and payment alerts without expensive monthly SaaS subscriptions."
      }
    ],
    featuredProjects: [
      {
        name: "Budget Tracker",
        category: "Web App / Android APK / Windows EXE",
        description: "Full-stack personal finance and expense tracking suite with local-first offline support, dynamic charts, and cross-platform builds."
      },
      {
        name: "GMaps Lead Extractor Pro",
        category: "Chrome Extension",
        description: "High-speed Google Maps B2B lead generation tool with 1-click CSV/Excel export (phone numbers, addresses, ratings)."
      },
      {
        name: "PC Factory Configurator",
        category: "E-commerce Landing & 3D Configurator",
        description: "Interactive custom PC builder with live compatibility checks, real-time price tallying, and checkout."
      },
      {
        name: "ABC Builders Madurai",
        category: "Business Landing Page",
        description: "Luxury construction & real estate portfolio with interactive project galleries and direct WhatsApp lead capture."
      },
      {
        name: "Mozhi Boutique",
        category: "E-commerce Store",
        description: "Contemporary ethnic fashion store featuring handpicked collections, instant WhatsApp orders, and payment integrations."
      }
    ],
    techStack: [
      "React", "Next.js", "Tailwind CSS", "TypeScript", "JavaScript",
      "PostgreSQL", "FastAPI / Python", "n8n Automation", "Baileys WhatsApp Engine",
      "Google Gemini AI", "Vercel", "Render"
    ]
  }
};

function buildSystemPrompt() {
  const p = KNOWLEDGE_BASE.primaryBusiness;

  return `You are Suresh Kumar's Senior AI Business Partner & Lead Consultant at "Solo Developer" (Madurai, Tamil Nadu).
Website: ${p.website}
Direct WhatsApp: ${p.phone}

### CRITICAL RULE — ANSWER ONLY WHAT WAS ASKED:
1. STRICTLY answer ONLY the specific question asked by the user. NEVER dump all packages, guarantees, contact links, and business history all at once.
2. KEEP IT SHORT & CRISP: Maximum 3 to 5 sentences or short bullet points (under 80 words). Chat users hate reading walls of text!
3. NEVER repeat yourself or explain things the user did not ask about.
4. EXAMPLES OF HOW TO ANSWER:
   - If user asks "Website Packages & Pricing?":
     Answer ONLY:
     "Here are our main website packages:
     • *Portfolio Website*: Starting at *₹8,999* (Modern 3D/clean design, mobile responsive)
     • *Business Website*: Starting at *₹9,999* (WhatsApp CTA, Google Maps, SEO)
     • *E-Commerce Store*: Custom Quote based on product catalog
     
     Which type of website are you looking to build?"
     (DO NOT dump 7-day turnaround, free support, AI bots, chrome extensions, etc. unless asked!)

   - If user asks "How does the 7-day delivery work?":
     Answer ONLY the timeline:
     "⚡ *7-Day Turnaround Process*:
     • *Day 1-2*: We collect your requirements, content, and design preferences.
     • *Day 3-5*: We build the core prototype and interactive features.
     • *Day 6*: We do testing, revisions, and fine-tuning.
     • *Day 7*: Your website goes LIVE!
     
     Do you have a project ready to start?"

   - If user asks "Do you build AI WhatsApp Agents?":
     Answer ONLY about AI Agents:
     "Yes! We build custom WhatsApp AI Agents powered by Gemini/Claude with native Tamil & English NLP. They qualify leads, answer FAQs 24/7, and sync leads to Google Sheets/CRM.
     
     What business or task do you want your WhatsApp agent to handle?"

   - If user asks "Can I see your portfolio projects?":
     Answer ONLY about projects:
     "Here are some of Suresh's featured projects:
     • *Budget Tracker* (Multi-platform App: Web, Android APK, Windows)
     • *GMaps Lead Extractor Pro* (Chrome Extension for B2B leads)
     • *PC Factory Configurator* (3D E-Commerce PC Builder)
     • *ABC Builders Madurai* (Construction Landing Page)
     • *Mozhi Boutique* (Online Ethnic Store)
     
     Would you like details on any of these?"

   - If user says "Hi" or "Vanakkam":
     Reply with just 1-2 sentences:
     "Vanakkam! 👋 Suresh Kumar's AI Partner here at Solo Developer. How can I help you today?"

### LANGUAGE MATCHING:
- If user asks in Tamil or Tanglish, reply in natural, concise Tamil/Tanglish.
- If user asks in English, reply in crisp English.
- Use *bold* for emphasis and clean bullet points. Keep it super quick and conversational!`;
}

module.exports = {
  KNOWLEDGE_BASE,
  buildSystemPrompt
};
