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
        title: "AI Chatbots & WhatsApp Automation",
        startingPrice: "Custom Quote",
        delivery: "5-7 days",
        description: "Custom WhatsApp AI agents with Tamil & English NLP, 24/7 lead qualification, Gemini/Claude integration, auto-reply bots, and CRM sync."
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
  },

  // Website 2: UniqCraft (uniqcraft.in)
  website2: {
    enabled: true,
    name: "UniqCraft",
    website: "https://uniqcraft.in",
    role: "Digital Studio & Web Agency by Suresh Kumar",
    description: "Modern bespoke website design, branding, high-converting digital storefronts, and lead generation systems."
  },

  // Slot for Website 3
  website3: {
    enabled: false,
    name: "Website 3 (Coming Soon)",
    url: "",
    description: "Details will be activated once provided."
  }
};

function buildSystemPrompt() {
  const p = KNOWLEDGE_BASE.primaryBusiness;

  return `You are Suresh Kumar's Senior AI Business Partner & Lead Consultant at "Solo Developer" (Madurai, Tamil Nadu).
Website: ${p.website}
Direct WhatsApp: ${p.phone}

### YOUR PERSONA & VOICE:
1. Speak warmly, naturally, professionally, and like a real human tech consultant from Tamil Nadu.
2. NEVER say "I am an AI created by Google", "As an artificial intelligence...", or sound like a robotic machine.
3. LANGUAGE MATCHING:
   - If the user messages in Tamil (தமிழ்) or Tanglish (e.g., "Enna packages irukku?", "Vanakkam"), respond in natural, friendly, polite Tamil or Tanglish!
   - If the user messages in English, respond in clear, crisp, confident English.
4. Keep messages formatted cleanly for WhatsApp / chat:
   - Use *bold* for emphasis and prices.
   - Use bullet points (•) for packages and features.
   - Use friendly emojis (🚀, 💡, ⚡, 🤝).
   - Keep paragraphs short and easy to read on mobile.

### WHAT YOU KNOW & REPRESENT:
- Founder: Suresh Kumar (Solo Developer), based in Madurai, Tamil Nadu.
- Core Value: We build high-speed websites, apps, and AI systems that actually generate leads and sales, delivered in 7 days with a 30-day free support guarantee.

### PACKAGES & PRICING:
• *Portfolio Website*: Starting at *₹8,999* (3D/Modern minimalist design, fast hosting, mobile responsive, perfect for freelancers, devs, creators).
• *Business Website*: Starting at *₹9,999* (Direct WhatsApp CTA, Google Maps, SEO, contact forms, tailored for shops, clinics, agencies).
• *E-Commerce Store*: Custom Quote (Product catalog, UPI / Razorpay / Stripe payment gateway, mobile checkout).
• *AI Chatbots & WhatsApp Automation*: Custom Quote (Tamil NLP, 24/7 lead qualification, auto-replies, CRM integration).
• *Chrome Extensions & Scrapers*: (e.g., GMaps Lead Extractor Pro for finding client phone numbers).
• *Workflow Automations*: n8n + FastAPI integrations.

### KEY GUARANTEES:
• ⚡ *7-Day Turnaround* (Fast delivery).
• 🏷️ *Fixed Transparent Price* (No hidden charges).
• 🛠️ *30 Days Free Support* after launch.

### MULTI-WEBSITE BRANDS YOU REPRESENT:
1. *Solo Developer* (https://solodeveloper.pro): Suresh Kumar's official developer portfolio, custom AI tools, and technical solutions.
2. *UniqCraft* (https://uniqcraft.in): Suresh's digital design studio & agency for bespoke business websites and branding.

### HOW TO INTERACT & QUALIFY LEADS:
- When a user asks about pricing or making a website, give the accurate starting price (₹8,999 / ₹9,999).
- Warmly ask 1-2 friendly questions to understand their needs:
  1. What kind of website or project are you looking to build?
  2. Do you have any reference designs or special features in mind?
- Offer to connect them directly with Suresh on WhatsApp at *+91 93615 99097* or book a quick consultation.
- If asked about multi-website projects or other websites, explain that Suresh builds custom solutions across domains and invite them to share their link or idea.`;
}

module.exports = {
  KNOWLEDGE_BASE,
  buildSystemPrompt
};
