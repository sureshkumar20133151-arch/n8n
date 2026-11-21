const fs = require('fs');
const path = require('path');
const googleDriveService = require('./googleDriveService');

// Persistent storage file paths
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PHOTOS_ARCHIVE_FILE = path.resolve(DATA_DIR, 'electrical_plumbing_photos.json');
const LABORERS_FILE = path.resolve(DATA_DIR, 'laborers_list.json');

function getISTDateString(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  } catch {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + istOffset).toISOString().split('T')[0];
  }
}

// Memory queue for on-demand image dispatch to WhatsApp (supports file paths & direct image buffers)
const queuedImages = new Map();
let lastActiveSiteName = 'Ponmeni';

function queueImage(chatId, imgData, caption = '') {
  if (!chatId) return;
  // Cleanup stale entries older than 5 minutes
  const now = Date.now();
  for (const [k, v] of queuedImages.entries()) {
    if (v.queuedAt && now - v.queuedAt > 5 * 60 * 1000) {
      queuedImages.delete(k);
    }
  }

  if (typeof imgData === 'string') {
    queuedImages.set(chatId, { filePath: imgData, buffer: null, caption, queuedAt: now });
  } else if (imgData && typeof imgData === 'object') {
    queuedImages.set(chatId, {
      filePath: imgData.filePath || null,
      buffer: imgData.buffer || null,
      caption: caption || imgData.caption || '',
      queuedAt: now
    });
  }
}

function getQueuedImage(chatId) {
  if (!chatId) return null;
  const item = queuedImages.get(chatId);
  queuedImages.delete(chatId);
  return item;
}

// Default initial laborers (synced with user's Google Sheet Laborers_Directory)
const DEFAULT_LABORERS = [
  {
    id: 1,
    name: "Prabhu (பிரபு)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Plumbing & Electrical Fitting",
    phone: "9600310448",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 2,
    name: "Pandi (பாண்டி)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Concealed Conduit & Piping",
    phone: "8695410060",
    status: "Off Duty (Off)",
    assignedSite: "All Sites"
  },
  {
    id: 3,
    name: "Paal Pandi (பால் பாண்டி)",
    role: "Helper (ஹெல்பர்)",
    skill: "Wall Chasing & Pipe Carrying",
    phone: "8098287117",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 4,
    name: "Sanjay (சஞ்சய்)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Roof Slab Conduit & Piping",
    phone: "7708123560",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 5,
    name: "Easwaren (ஈஸ்வரன்)",
    role: "Helper (ஹெல்பர்)",
    skill: "Material Handling & Site Support",
    phone: "8072842592",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 6,
    name: "Vicky (விக்கி)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Bathroom Plumbing & Sanitary Lines",
    phone: "9043205943",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 8,
    name: "Suresh (சுரேஷ்)",
    role: "Helper (ஹெல்பர்)",
    skill: "Site Assistance & Grooving",
    phone: "8072239594",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 9,
    name: "Kumareson (குமரேசன்)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Electrical Wiring & Conduit Laying",
    phone: "7010124382",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 10,
    name: "Aswin (அஸ்வின்)",
    role: "Helper (ஹெல்பர்)",
    skill: "Concrete Pipe & Chasing Support",
    phone: "9159779787",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 11,
    name: "Muthu (முத்து)",
    role: "Fitter (ஃபிட்டர்)",
    skill: "Drainage & Water Supply Lines",
    phone: "6380895983",
    status: "Active (On)",
    assignedSite: "All Sites / On Call"
  },
  {
    id: 12,
    name: "Dhilip (திலீப்)",
    role: "Supervisor (சூப்பர்வைசர்)",
    skill: "Site Supervision & Inspection",
    phone: "8883332499",
    status: "Off Duty (Off)",
    assignedSite: "Head Office / Roving"
  }
];

function loadLaborers() {
  try {
    if (fs.existsSync(LABORERS_FILE)) {
      return JSON.parse(fs.readFileSync(LABORERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[PlumbingPersona] Error reading laborers file:', e.message);
  }
  // Initialize file with default laborers
  saveLaborers(DEFAULT_LABORERS);
  return DEFAULT_LABORERS;
}

function saveLaborers(list) {
  try {
    fs.writeFileSync(LABORERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('[PlumbingPersona] Error saving laborers file:', e.message);
  }
}

function findLaborerByName(name) {
  if (!name) return null;
  const laborers = loadLaborers();
  const cleanInput = name.toLowerCase().replace(/[\(\)\[\]\{\}]/g, ' ').replace(/[\u0B80-\u0BFF]/g, '').trim().replace(/\s+/g, ' ');
  const cleanTamilInput = (name.match(/[\u0B80-\u0BFF]+/g) || []).join(' ').trim();

  // 1. Exact English or Tamil match on full name
  for (const l of laborers) {
    const lEng = l.name.toLowerCase().replace(/[\(\)\[\]\{\}]/g, ' ').replace(/[\u0B80-\u0BFF]/g, '').trim().replace(/\s+/g, ' ');
    const lTam = (l.name.match(/[\u0B80-\u0BFF]+/g) || []).join(' ').trim();

    if (cleanInput && lEng === cleanInput) return l;
    if (cleanTamilInput && lTam === cleanTamilInput) return l;
  }

  // 2. Specific multi-word check: 'paal pandi' must match 'Paal Pandi', NEVER 'Pandi'
  if (cleanInput.includes('paal') || cleanInput.includes('பால்')) {
    const paal = laborers.find(l => l.name.toLowerCase().includes('paal') || l.name.includes('பால்'));
    if (paal) return paal;
  }

  // 3. Exact word match
  for (const l of laborers) {
    const lEng = l.name.toLowerCase().replace(/[\(\)\[\]\{\}]/g, ' ').replace(/[\u0B80-\u0BFF]/g, '').trim().replace(/\s+/g, ' ');
    const words = lEng.split(' ');
    if (cleanInput && words.includes(cleanInput)) {
      if (lEng !== cleanInput && words.length > 1) continue;
      return l;
    }
  }

  // 4. Substring fallback (min 4 chars)
  for (const l of laborers) {
    const lEng = l.name.toLowerCase();
    if (cleanInput.length >= 4 && lEng.includes(cleanInput)) return l;
    if (cleanTamilInput.length >= 4 && l.name.includes(cleanTamilInput)) return l;
  }

  return null;
}

function getDefaultDailyRate(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('supervisor')) return 1100;
  if (r.includes('helper')) return 550;
  return 850; // default fitter / technician
}

function loadPhotosArchive() {
  try {
    if (fs.existsSync(PHOTOS_ARCHIVE_FILE)) {
      return JSON.parse(fs.readFileSync(PHOTOS_ARCHIVE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[PlumbingPersona] Error reading photos archive:', e.message);
  }
  return [];
}

function savePhotosArchive(list) {
  try {
    fs.writeFileSync(PHOTOS_ARCHIVE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('[PlumbingPersona] Error saving photos archive:', e.message);
  }
}

// -------------------------------------------------------------
// PROFILE & KNOWLEDGE
// -------------------------------------------------------------
const CONTRACTOR_PROFILE = {
  companyName: "Arasan Electrical & Plumbing",
  contractorHead: "Arasan MEP Team / Suresh",
  contactNumber: "+91 93615 99097",
  whatsappNumber: "+91 93615 99097",
  location: "Madurai & South Tamil Nadu",
  specialization: "Concealed Conduit Piping, Slab Concrete Piping, Bathroom Diverter Plumbing, 3-Phase DB Wiring",
  stages: {
    roof_concrete: "ரூஃப் கான்கிரீட் பைப்ஸ் (Roof Slab Electrical & Plumbing Pipes)",
    wall_chasing: "கார்டி & கன்சீல்டு பைப்ஸ் (Wall Chasing / Concealed Switch Boxes & Pipes)",
    bathroom_plumbing: "பாத்ரூம் பிளம்பிங் (Bathroom Under-floor & In-wall Plumbing)",
    drainage_sewage: "டிரைனேஜ் & கழிவுநீர் பைப்ஸ் (External Drainage & Chamber Lines)",
    main_db: "மெயின் டிபி & எர்திங் (Main DB Board, Inverter & Earthing)"
  }
};

// -------------------------------------------------------------
// GEMINI TOOL DECLARATIONS
// -------------------------------------------------------------
const PLUMBING_ELECTRICAL_TOOLS = [{
  functionDeclarations: [
    {
      name: 'logSitePhotos',
      description: 'Call this tool when the contractor, supervisor, or worker uploads photos with a voice note or text caption regarding site electrical or plumbing work. It records the site, stage, and Google Drive archive details.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the construction site (e.g., Ram Nagar, Anna Nagar, Selvapuram, K.Pudur, HMS Colony)'
          },
          stage: {
            type: 'STRING',
            description: 'Stage or category of work: Roof_Concrete_Pipes, Wall_Chasing_Pipes, Bathroom_Plumbing, Profile_LED_Work, Drainage_Sewage, Main_DB_Wiring, False_Ceiling_Wiring, or any custom site stage name'
          },
          workType: {
            type: 'STRING',
            description: 'Trade category: Electrical, Plumbing, or Both'
          },
          notes: {
            type: 'STRING',
            description: 'Summary of what was reported in the voice note or text'
          },
          photoCount: {
            type: 'INTEGER',
            description: 'Number of photos attached or received'
          }
        },
        required: ['siteName', 'stage']
      }
    },
    {
      name: 'fetchSitePhotos',
      description: 'Call this tool whenever anyone (owner, client, supervisor, or laborer in WhatsApp DM or Group) requests photos for a site or stage, or says "Send picture not link", "போட்டோ அனுப்பு", "latest photo காட்டு". If the user does not specify a site name, omit it or pass empty string, and the tool will automatically use the current active site (e.g. Ponmeni, Aanaiyur).',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the site (e.g. Ponmeni, Aanaiyur, Ramnad, HMS Colony). If not mentioned by user, leave blank to use the active site.'
          },
          stage: {
            type: 'STRING',
            description: 'Specific stage requested or All (e.g. Profile_LED_Work, Roof_Concrete_Pipes, All)'
          }
        }
      }
    },
    {
      name: 'renameOrUpdateSiteStage',
      description: 'Call this tool when the contractor asks to rename or change a site stage, folder, or category in Google Drive (e.g. rename "Main_DB_Wiring" to "Profile_LED_Work" for HMS Colony).',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the site (e.g. HMS Colony, Ramnad)'
          },
          oldStage: {
            type: 'STRING',
            description: 'The current or old stage/folder name to change (e.g. Main_DB_Wiring)'
          },
          newStage: {
            type: 'STRING',
            description: 'The new desired stage/folder name (e.g. Profile_LED_Work)'
          }
        },
        required: ['siteName', 'oldStage', 'newStage']
      }
    },
    {
      name: 'getLaborersList',
      description: 'Call this tool whenever someone in the WhatsApp Group or DM asks for the workers/laborers list, contacts, or a specific worker like plumber or electrician (e.g. "லேபர்ஸ் லிஸ்ட் அனுப்பு", "plumber phone number", "who is working on Ram Nagar site").',
      parameters: {
        type: 'OBJECT',
        properties: {
          roleFilter: {
            type: 'STRING',
            description: 'Filter by trade or role (e.g. Plumber, Electrician, Chasing, Supervisor, or All)'
          },
          siteFilter: {
            type: 'STRING',
            description: 'Filter by site name if looking for workers assigned to a specific site'
          }
        }
      }
    },
    {
      name: 'addOrUpdateLaborer',
      description: 'Call this tool to add a new worker/laborer or update a laborer phone number or site assignment in the team directory.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Name of the worker' },
          role: { type: 'STRING', description: 'Job role: Plumber, Electrician, Helper, Supervisor, etc.' },
          phone: { type: 'STRING', description: 'Worker mobile number' },
          assignedSite: { type: 'STRING', description: 'Site currently assigned to' },
          skill: { type: 'STRING', description: 'Specific skill or specialization' }
        },
        required: ['name', 'phone', 'role']
      }
    },
    {
      name: 'recordDailyAttendance',
      description: 'Call this tool when Suresh or supervisors report daily attendance, which worker went to which site (e.g. "Prabhu went to Ramnad today", "Vicky at HMS Colony"), attendance status (Full Day / Half Day), and any cash advance taken that day.',
      parameters: {
        type: 'OBJECT',
        properties: {
          workerName: {
            type: 'STRING',
            description: 'Name of the worker (e.g. Prabhu, Pandi, Paal Pandi, Sanjay, Vicky, Easwaren, Kumareson, Suresh, Aswin, Muthu, Dhilip)'
          },
          siteName: {
            type: 'STRING',
            description: 'Name of the site they worked at (e.g. Ramnad, HMS Colony, Ponmeni, Anna Nagar)'
          },
          status: {
            type: 'STRING',
            description: 'Attendance status: "Present" (Full day), "Half Day", or "Absent"'
          },
          dailyRate: {
            type: 'NUMBER',
            description: 'Daily wage rate in Rs (default ₹850 for Fitters, ₹550 for Helpers, ₹1,100 for Supervisors unless specified)'
          },
          advanceAmount: {
            type: 'NUMBER',
            description: 'Cash/UPI advance taken on that day in Rs (0 if none)'
          },
          advanceNotes: {
            type: 'STRING',
            description: 'Reason for advance (e.g. Tea & snacks, petrol, personal)'
          },
          date: {
            type: 'STRING',
            description: 'Date in YYYY-MM-DD format (defaults to today)'
          }
        },
        required: ['workerName', 'siteName']
      }
    },
    {
      name: 'recordLaborAdvance',
      description: 'Call this tool when any worker is given a cash or UPI advance on any day (e.g. "பிரபுவுக்கு 500 அட்வான்ஸ் கொடுத்தேன்", "Paal Pandi advance 300"). Logs to Google Sheet so it is automatically deducted from their weekend salary.',
      parameters: {
        type: 'OBJECT',
        properties: {
          workerName: {
            type: 'STRING',
            description: 'Name of the worker receiving the advance'
          },
          advanceAmount: {
            type: 'NUMBER',
            description: 'Amount in Rupees given as advance'
          },
          reason: {
            type: 'STRING',
            description: 'Reason for advance (e.g. Tea, lunch, petrol, personal)'
          },
          date: {
            type: 'STRING',
            description: 'Date in YYYY-MM-DD format (defaults to today)'
          }
        },
        required: ['workerName', 'advanceAmount']
      }
    },
    {
      name: 'calculateWeeklySalarySettlement',
      description: 'Call this tool when Suresh or anyone asks for weekend salary, wages, or settlement (e.g. "பிரபு சம்பளம் எவ்வளவு", "வாரம் சம்பள கணக்கு போடு", "Prabhu salary settlement", "calculate weekend wages for all"). Automatically sums days worked, calculates gross wages, subtracts all advances taken during the period, logs the finalized settlement into Google Sheet, and gives a complete Tamil breakdown.',
      parameters: {
        type: 'OBJECT',
        properties: {
          workerName: {
            type: 'STRING',
            description: 'Name of the specific worker (or "All" for all workers)'
          },
          weekPeriod: {
            type: 'STRING',
            description: 'Week label or date range (e.g. "This Week", "Nov 17 - Nov 23")'
          },
          autoRecord: {
            type: 'BOOLEAN',
            description: 'Whether to append this calculation into the Weekly_Salary_Settlement sheet (default true)'
          }
        }
      }
    },
    {
      name: 'markSalaryAsPaid',
      description: 'Call this tool whenever Suresh (owner/contractor) sends a message in WhatsApp confirming that wages/salary have been paid or settled (e.g. "salary paid", "சம்பளம் கொடுத்தாச்சு", "paid", "Prabhu salary paid", "weekend salary settled", "all salary paid"). Updates Weekly_Salary_Settlement in Google Sheets so Payment Status becomes "Paid" and Paid Date is recorded.',
      parameters: {
        type: 'OBJECT',
        properties: {
          workerName: {
            type: 'STRING',
            description: 'Name of the worker whose salary was paid, or "All" if all workers were paid'
          },
          paidDate: {
            type: 'STRING',
            description: 'The date payment was issued (defaults to today or weekend date in YYYY-MM-DD format)'
          }
        }
      }
    },
    {
      name: 'queryDailyAttendance',
      description: 'Call this tool whenever Suresh or anyone asks ANY question about attendance, site assignments, leaves, or daily advances (e.g. "who went to Aanaiyur site today?", "இன்னைக்கு யார் லீவ்?", "show today attendance", "20 Nov attendance status", "Prabhu எந்த சைட் போனாரு?", "யார் யார் வேலைக்கு வந்தாங்க?"). Reads live from Daily_Attendance_Site_Log sheet.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: {
            type: 'STRING',
            description: 'Date to query (e.g. "2026-11-20", or defaults to today YYYY-MM-DD)'
          },
          siteName: {
            type: 'STRING',
            description: 'Optional filter by site name (e.g. "Aanaiyur", "Sevugan 2nd street")'
          },
          workerName: {
            type: 'STRING',
            description: 'Optional filter by worker name (e.g. "Prabhu", "Sanjay")'
          },
          statusFilter: {
            type: 'STRING',
            description: 'Optional filter by status: "Present", "Leave" / "Absent", or "All"'
          }
        }
      }
    },
    {
      name: 'correctAttendanceRecord',
      description: 'Call this tool whenever Suresh or a supervisor corrects an attendance mistake (e.g. "Pandi இல்ல Paal Pandi", "correct attendance for Paal Pandi", "change Pandi to Paal Pandi for Aanaiyur site"). Directly updates and corrects the row in Google Sheet Daily_Attendance_Site_Log.',
      parameters: {
        type: 'OBJECT',
        properties: {
          date: {
            type: 'STRING',
            description: 'Date of the record to correct (defaults to today YYYY-MM-DD)'
          },
          wrongWorkerName: {
            type: 'STRING',
            description: 'The name that was wrongly recorded (e.g. Pandi)'
          },
          correctWorkerName: {
            type: 'STRING',
            description: 'The correct worker name (e.g. Paal Pandi)'
          },
          siteName: {
            type: 'STRING',
            description: 'Site name (optional, keeps existing if not passed)'
          },
          status: {
            type: 'STRING',
            description: 'Attendance status (optional, defaults to Present)'
          },
          advanceAmount: {
            type: 'NUMBER',
            description: 'Advance amount if any (optional)'
          }
        },
        required: ['wrongWorkerName', 'correctWorkerName']
      }
    },
    {
      name: 'recordSiteBill',
      description: 'Call this tool whenever a site bill photo or purchase details are shared in the WhatsApp group (e.g. "Aanaiyur site bill 1800 paid by Suresh contractor account", or when an image of a bill/receipt/invoice is uploaded). Extracts date, site name, worker who purchased, who paid out at the shop (paidOutBy: Arasan Owner / Worker / Contractor / House Owner), whose expense it is / who owes this money (billOwedBy: Contractor / House Owner / Arasan Self), amount in ₹, collection status (collectionStatus: "Pending Collection" or "Received"), and bill details. Uploads image to Google Drive and appends row to Site_Bills_Log tab.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the site (e.g. Aanaiyur, Sevugan 2nd street)'
          },
          amount: {
            type: 'NUMBER',
            description: 'Total bill amount in Rupees (e.g. 1800, 3500)'
          },
          workerName: {
            type: 'STRING',
            description: 'Name of worker who made the purchase (e.g. Prabhu, Vicky, Suresh)'
          },
          paidOutBy: {
            type: 'STRING',
            description: 'Who paid money at the shop right now: "Arasan Owner", "Worker", "Contractor", or "House Owner"'
          },
          billOwedBy: {
            type: 'STRING',
            description: 'Whose expense is this / Who owes this money: "Contractor" (e.g. Rama chandran, Sabiek), "House Owner", or "Arasan Self"'
          },
          collectionStatus: {
            type: 'STRING',
            description: 'Collection status: "Pending Collection" (if Arasan owner paid and money needs to be collected from contractor/owner) or "Received" (if already collected/paid directly or amount received)'
          },
          details: {
            type: 'STRING',
            description: 'Materials or items purchased (e.g. CPVC pipes, bend, modular box, wire)'
          },
          date: {
            type: 'STRING',
            description: 'Date on bill (defaults to today YYYY-MM-DD)'
          }
        },
        required: ['siteName', 'amount']
      }
    },
    {
      name: 'markBillAsReceived',
      description: 'Call this tool whenever Suresh (owner) or anyone confirms that money for a site bill has been collected or received from Contractor or House Owner (e.g. "Aanaiyur bill Rama chandran காசு குடுத்துட்டாரு", "கான்ட்ராக்டர்ட்ட காசு வாங்கியாச்சு", "பில் அமௌன்ட் ரிசீவ்டு", "settled bill 1800", "received bill money"). Updates Collection Status in Site_Bills_Log from Pending Collection to Received.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the site (e.g. Aanaiyur, Sevugan 2nd street)'
          },
          billOwedBy: {
            type: 'STRING',
            description: 'Who gave the money: Contractor name (e.g. Rama chandran, Sabiek) or "Contractor" or "House Owner"'
          },
          amount: {
            type: 'NUMBER',
            description: 'Bill amount settled/received in ₹ (optional, e.g. 1800)'
          },
          notes: {
            type: 'STRING',
            description: 'Optional remarks or payment mode (cash, gpay)'
          }
        },
        required: ['siteName']
      }
    },
    {
      name: 'querySiteBillsAndBalances',
      description: 'Call this tool whenever someone asks how much bill money is pending to be collected, or asks for a breakdown of expenses/balances by site or contractor/house owner (e.g. "Aanaiyur சைட்ல கான்ட்ராக்டர்ட்ட இன்னும் எவ்வளவு காசு வாங்கணும்?", "யாரெல்லாம் காசு தரணும்?", "pending bills summary", "ஹவுஸ் ஓனர் எவ்வளவு தரணும்?"). Summarizes pending and settled bills from Site_Bills_Log.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Optional site name to filter by (or "all" for all sites)'
          },
          statusFilter: {
            type: 'STRING',
            description: 'Filter: "pending", "received", or "all"'
          }
        }
      }
    },
    {
      name: 'fetchSiteBills',
      description: 'Call this tool whenever anyone asks for site bills, expense reports, or asks to see bill photos (e.g. "Aanaiyur bill photo காட்டு", "send site bills for Aanaiyur", "show yesterday bills", "bill picture அனுப்பு"). Queries Site_Bills_Log and dispatches the actual bill image to WhatsApp.',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name of the site (e.g. Aanaiyur, Sevugan 2nd street)'
          },
          date: {
            type: 'STRING',
            description: 'Optional date filter (YYYY-MM-DD)'
          }
        },
        required: ['siteName']
      }
    }
  ]
}];

// -------------------------------------------------------------
// SYSTEM PROMPT BUILDER
// -------------------------------------------------------------
function buildPlumbingElectricalSystemPrompt(senderName = 'Friend', isOwner = false) {
  const currentLaborers = loadLaborers();
  const laborersSummary = currentLaborers.map(l => `• ${l.name} (${l.role}) - ${l.phone} [${l.assignedSite}]`).join('\n');

  return `You are the Official WhatsApp AI Command Center for ${CONTRACTOR_PROFILE.companyName} (${CONTRACTOR_PROFILE.contractorHead}), based in ${CONTRACTOR_PROFILE.location}.
You operate both in private WhatsApp 1-on-1 chats and within WhatsApp Contractor/Laborer Groups.

## 🎯 YOUR CORE CAPABILITIES & RESPONSIBILITIES:
1. **👁️ SMART COMPUTER VISION & PHOTO CLASSIFICATION (போட்டோவை AI தானாகப் புரிந்துகொள்ளும் திறன்):**
   - When an image is received (even with NO caption or just a short text like "இங்க பாரு" / "இது எந்த சைட்"):
     Look carefully at the visual content of the photo and classify it automatically:
     * **ரூஃப் கான்கிரீட் பைப்ஸ் (Roof_Concrete_Pipes):** Rebar steel grid on slab + tied fan boxes + PVC electrical/plumbing conduits before concrete pouring.
     * **சுவர் கார்டி & கன்சீல்டு பைப்ஸ் (Wall_Chasing_Pipes):** Chased/cut brick walls with vertical/horizontal PVC pipes and modular switch boxes before plastering.
     * **பாத்ரூம் பிளம்பிங் (Bathroom_Plumbing):** CPVC/PPR pipes on walls/sunken floor, diverter bodies, shower points, hot/cold mixer lines before tiling.
     * **விண்டோ & கார்டி வேலை (Window_And_Chasing):** Window frames fixed in wall openings with electrical pipes dropping for AC/points.
     * **டிரைனேஜ் லைன் (Drainage_Sewage):** External 4-inch/6-inch sewage PVC lines, manhole chamber masonry, rain water pipes.
     * **மெயின் டிபி & எர்திங் (Main_DB_Wiring):** Distribution board box with MCBs, 3-phase wires, inverter point, or earthing rod/pit.
   - Always state clearly in your Tamil reply what exact stage you identified from looking at the photo!

2. **SITE PHOTO ARCHIVING (கான்கிரீட் & கார்டி & பிளம்பிங் போட்டோக்கள்):**
   - When workers, supervisors, or the contractor upload site photos along with a Tamil voice note or text:
     * Identify the Site Name (e.g., Ram Nagar, Anna Nagar, Selvapuram, K.Pudur).
     * Categorize the critical construction stage:
       - **Roof_Concrete_Pipes:** ரூஃப் கான்கிரீட் போடும் முன் வைக்கப்பட்ட எலக்ட்ரிக்கல்/பிளம்பிங் பைப்ஸ்.
       - **Wall_Chasing_Pipes:** சுவரில் கார்டி எடுத்து பதித்த கன்சீல்டு பைப்ஸ் மற்றும் சுவிட்ச் பாக்ஸ்கள் (பூச்சுக்கு முன்).
       - **Bathroom_Plumbing:** பாத்ரூமில் தரை மற்றும் சுவரில் அமைக்கப்பட்ட டைவர்ஷன் / இன்லெட் / அவுட்லெட் பைப்ஸ் (டைல்ஸ் ஒட்டுவதற்கு முன்).
       - **Drainage_Sewage:** கழிவுநீர் சேம்பர் & டிரைனேஜ் லைன்கள்.
       - **Main_DB_Wiring:** மெயின் டிபி போர்டு, இன்வெர்ட்டர் பாயிண்ட், எர்திங் பிட்.
     * Call the \`logSitePhotos\` tool.
     * Confirm immediately in courteous Tamil that photos are safely uploaded into Google Drive with the folder link.

2. **INSTANT ON-DEMAND PHOTO RETRIEVAL (போட்டோக்கள் தேவைப்படும்போது):**
   - Whenever ANYONE in the WhatsApp Group (Laborer, Mason, Supervisor, Client, or Owner) or in DM asks:
     * e.g., "Send picture not link", "ராம் நகர் பாத்ரூம் பிளம்பிங் போட்டோஸ் அனுப்பு", "Send photo of Ponmeni", "Send Ramnad concrete pipe photo", "HMS Colony photo".
     * You MUST ALWAYS call the \`fetchSitePhotos\` tool immediately with the siteName!
     * NEVER say "I cannot send images" or "no photos found" without calling \`fetchSitePhotos\`. Calling this tool automatically connects to Google Drive live, downloads the high-resolution photo file, and dispatches the actual image directly into WhatsApp!

3. **10-MEMBER LABORERS / WORKERS DIRECTORY:**
   - Whenever anyone asks for the laborer list ("லேபர்ஸ் லிஸ்ட்", "பிளம்பர் நம்பர் கொடு", "எலக்ட்ரீசியன் யார்"):
     * Call the \`getLaborersList\` tool.
     * List the team members with Name, Role, Mobile Number, and Assigned Site neatly formatted.

4. **💬 GENERAL QUESTIONS & CHAT / PHOTO ARCHIVE INQUIRIES:**
   - **"Can u able to read old chats?" / "பழைய மெசேஜ் படிக்க முடியுமா?":**
     Explain clearly and politely in Tamil/English:
     * WhatsApp-ல் பாட் ஆன் செய்யப்பட்ட நேரத்திலிருந்து வரும் **அனைத்து புதிய மெசேஜ்கள், உரையாடல்கள் மற்றும் போட்டோக்களும் உடனடியாக நினைவில் வைத்து Google Drive & Google Sheets-ல் நிரந்தரமாகப் பதிவு செய்யப்படுகின்றன**.
     * பாட் இணைக்கப்படுவதற்கு முந்தைய (பழைய) வரலாற்று மெசேஜ்களை WhatsApp தனியுரிமை காரணமாக நேரடியாக ஸ்ட்ரீம் செய்யாது. ஆனால் நீங்கள் முந்தைய சைட் போட்டோக்கள் அல்லது விபரங்களை எப்போது இந்த குரூப்பில் மீண்டும் ஷேர் செய்தாலும், உடனடியாக AI அதை வகைப்படுத்தி Google Drive-ல் பாதுகாப்பாகச் சேமித்துவிடும்!
   - **"Previously shared photos / பழைய போட்டோக்கள் எங்கே?":**
     * புதிய போட்டோக்கள் (உதாரணமாக Ramnad கான்கிரீட் பைப் போட்டோ) Google Drive மற்றும் Google Sheets-ல் பாதுகாப்பாகப் பதியப்பட்டுவிட்டன.
     * முந்தைய பழைய போட்டோக்கள் ஏதேனும் மிஸ் ஆகியிருந்தால், அதை மீண்டும் ஒருமுறை இந்த குரூப்பில் ஷேர் செய்தால் உடனடியாக அதற்கான சைட் மற்றும் பிரிவில் (Roof Concrete, Wall Chasing, Bathroom Plumbing) வகைப்படுத்தி Drive-ல் நிரந்தரமாகச் சேமித்துவிடுவேன்.

5. **📋 DAILY ATTENDANCE & SITE ALLOCATION (தினசரி வருகை & எந்த சைட் போனாங்க பதிவு):**
   - Whenever Suresh (contractor) or a supervisor/worker mentions attendance or where someone worked today:
     * e.g., "இன்னைக்கு பிரபு ராம்நாடு சைட் போனார்", "Prabhu and Paal Pandi at Ramnad today", "Vicky present at HMS Colony", "Easwaren half day".
     * You MUST immediately call \`recordDailyAttendance\`.
     * Automatically log into Google Sheet (\`Daily_Attendance_Site_Log\` tab): Date, Labor_ID, Name, Role, Site Allocated, Attendance Status (Present/Half Day), Daily Rate (₹850 for Fitters, ₹550 for Helpers, ₹1,100 for Supervisors), and any daily advance cash.
   - **ATTENDANCE QUESTIONS & INQUIRIES (வருகை விபர கேள்விகளுக்கு பதிலளித்தல்):**
     * Whenever anyone asks ANY question about attendance, site assignments, who worked where, who is on leave, or daily advances (e.g., "இன்னைக்கு யார் லீவ்?", "யார் யார் வேலைக்கு வந்தாங்க?", "20 Nov attendance காட்டு", "who is at Aanaiyur site?", "Prabhu எந்த சைட் போனாரு?"):
     * You MUST IMMEDIATELY call \`queryDailyAttendance\`! It reads live from Google Sheet \`Daily_Attendance_Site_Log\` and gives an instant, transparent, and accurate answer in Tamil!

6. **💵 DAILY ADVANCES & AUTOMATIC DEDUCTION ON WEEKEND SALARY (அட்வான்ஸ் பதிவு & வார சம்பளத்தில் தானாகக் கழித்தல்):**
   - **Daily Advances (டெய்லி அட்வான்ஸ்):**
     * Whenever a worker takes cash or UPI advance on any day (e.g., "பிரபுவுக்கு 500 அட்வான்ஸ் கொடுத்தேன்", "Paal Pandi advance ₹300 for tea/lunch/petrol"):
     * Call \`recordLaborAdvance\` (or provide \`advanceAmount\` in \`recordDailyAttendance\`).
     * Confirms clearly in Tamil that the advance is logged into the Google Sheet and will be automatically deducted from their weekend salary!
   - **Weekend Salary Settlement (வார இறுதி சம்பள கணக்கு):**
     * Whenever Suresh or anyone asks for weekly settlement or wages (e.g., "பிரபு சம்பளம் எவ்வளவு", "இந்த வாரம் சம்பள கணக்கு போடு", "weekend salary settlement", "salary calculation for all"):
     * You MUST immediately call \`calculateWeeklySalarySettlement\`.
     * It sums days worked, calculates gross wages, finds all advances taken during the week, automatically deducts total advances (Net Payable = Gross - Advance), and records the settlement into Google Sheet (\`Weekly_Salary_Settlement\` tab)!
     * Responds with a crystal-clear Tamil breakdown:
       - 👷 தொழிலாளி பெயர் & பணி
       - 📍 பணிபுரிந்த சைட்டுகள்
       - 📅 பணிபுரிந்த நாட்கள் & தினக்கூலி
       - 📈 மொத்த சம்பளம் (Gross)
       - 🔻 கழிக்கப்பட்ட அட்வான்ஸ் (Total Advance Deducted)
       - ✨ வழங்க வேண்டிய நிகர சம்பளம் (Net Payable)

7. **💳 OWNER SALARY PAYMENT CONFIRMATION (சம்பளம் கொடுத்தாச்சு உறுதிசெய்தல்):**
   - The initial Payment Status in \`Weekly_Salary_Settlement\` MUST ALWAYS be \`Pending\` and \`Paid Date\` MUST BE EMPTY!
   - ONLY when Suresh (owner/contractor) sends a message in the WhatsApp group or chat saying salary is paid (e.g., "salary paid", "paid", "சம்பளம் கொடுத்தாச்சு", "செட்டில் பண்ணியாச்சு", "all salary paid", "Prabhu salary paid"):
     * Immediately call \`markSalaryAsPaid\`!
     * This updates Google Sheet \`Weekly_Salary_Settlement\`:
       - \`Payment Status\` -> **\`Paid\`**
       - \`Paid Date\` -> That weekend date (e.g. \`YYYY-MM-DD\`)
     * Courteously confirm in the WhatsApp group that the settlement has been marked as Paid!

8. **🔧 ATTENDANCE CORRECTION & ERROR RECTIFICATION (வருகைப் பதிவில் தவறு திருத்துதல்):**
   - When Suresh or anyone mentions an attendance mistake (e.g. "Paal pandi ku attendance poda sonna pandi ku pottrukka", "Pandi இல்ல Paal Pandi", "change Pandi to Paal Pandi", "mistake in attendance"):
     * NEVER just apologize with words or claim it is updated without executing a tool!
     * You MUST IMMEDIATELY call \`correctAttendanceRecord\` with wrongWorkerName and correctWorkerName!
     * This physically edits the existing row in Google Sheet \`Daily_Attendance_Site_Log\`, updating the name, Labor ID, and daily rate!

9. **🧾 SITE BILLS & CASH RECOVERY TRACKING (சைட் பில்கள் & காசு வசூல் கணக்கு):**
   - **When a bill photo or purchase details are sent in WhatsApp:**
     * Identify:
       - **Site Name:** e.g. Aanaiyur, Sevugan 2nd street.
       - **Worker (who bought):** e.g. Prabhu, Vicky, Suresh.
       - **Paid Out By (கடையில காசு போட்டது யார்):** "Arasan Owner" (Suresh hand cash) / "Worker" / "Contractor" / "House Owner".
       - **Bill Owed By (செலவு யாருக்கு / கணக்கு):** "Contractor" (e.g. Rama chandran, Sabiek) / "House Owner" / "Arasan Self".
       - **Collection Status (காசு வாங்கியாச்சா இல்லையா):**
         - If Suresh or Worker paid from pocket and money needs to be recovered from Contractor or House Owner -> **"Pending Collection"** (இன்னும் காசு வாங்கல / பாக்கி).
         - If Contractor or House Owner paid directly or gave cash upfront, or sender says "காசு வாங்கியாச்சு / அமௌன்ட் ரிசீவ்டு / paid" -> **"Received"**.
       - **Amount & Details:** Materials purchased and bill total.
     * Call \`recordSiteBill\` tool!
     * Confirms clearly in Tamil: Amount, Site, Paid Out By, Owed By, and Status (⏳ Pending Collection vs ✅ Received).
   - **When Suresh or contractor confirms bill payment received:**
     * e.g. "Aanaiyur-ல ராமச்சந்திரன் ₹1,800 பில் காசு குடுத்துட்டாரு", "கான்ட்ராக்டர்ட்ட காசு வாங்கியாச்சு", "பில் அமௌன்ட் ரிசீவ்டு", "Aanaiyur bill settled", "amount received from contractor/owner":
     * Call \`markBillAsReceived\` tool!
     * Updates Google Sheet from "Pending Collection" to "Received" with today's date!
   - **When someone asks pending bills / balances:**
     * e.g. "Aanaiyur சைட்ல கான்ட்ராக்டர்ட்ட இன்னும் எவ்வளவு காசு வாங்கணும்?", "யாரெல்லாம் காசு தரணும்?", "pending bills summary", "balance bill list":
     * Call \`querySiteBillsAndBalances\` tool!
     * Reports total pending from Contractor, total pending from House Owner, and list of pending bills!
   - **When anyone asks to see bills or bill photos:**
     * Call \`fetchSiteBills\` tool! It downloads the real bill image file and dispatches it directly into WhatsApp!

## 👥 CURRENT REGISTERED TEAM:
${laborersSummary}

## 🗣️ TONE & LANGUAGE RULES:
- Reply in clear, professional, friendly **Tamil (தமிழ்)** or **Tanglish** depending on how the user communicates.
- Use bold headers, bullet points, and clean WhatsApp formatting.
- Emphasize safety: *"கான்கிரீட் போடுவதற்கு முன்னும், கார்டி பூச்சுக்கு முன்னும் போட்டோக்கள் எடுப்பது பின்னாளில் லீக்கேஜ் அல்லது ஆணி அடிக்கும் போது பைப் உடையாமல் பாதுகாக்க மிக அவசியம்."*`;
}

// -------------------------------------------------------------
// TOOL EXECUTION LOGIC
// -------------------------------------------------------------
async function executePlumbingElectricalToolCall(fnCall, chatId = '', media = null) {
  const fnName = fnCall.name;
  const args = fnCall.args || {};

  console.log(`⚡🔧 [Plumbing/Electrical Tool Invoked] ${fnName}:`, JSON.stringify(args));

  // 1. Log Site Photos
  if (fnName === 'logSitePhotos') {
    const siteName = args.siteName || 'General Site';
    if (siteName && siteName !== 'General Site') {
      lastActiveSiteName = siteName;
    }
    const stage = args.stage || 'General_Work';
    const workType = args.workType || 'Both';
    const notes = args.notes || 'Site progress photo upload';
    const count = Number(args.photoCount) || 1;
    const dateStr = getISTDateString();

    // Real Root Folder: "Arasan electrical & plumbing "
    let driveFolderUrl = 'https://drive.google.com/drive/folders/1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';
    let uploadedFile = null;
    let localFilePath = null;

    if (googleDriveService.isConfigured()) {
      try {
        const driveFolder = await googleDriveService.getOrCreateSiteFolder(siteName, stage);
        if (driveFolder && driveFolder.webViewLink) {
          driveFolderUrl = driveFolder.webViewLink;
        }

        // Save high-resolution physical photo to local media vault & upload to Suresh's 5 TB Google Drive
        if (media && media.data) {
          try {
            const imageBuffer = Buffer.from(media.data, 'base64');
            const cleanSite = siteName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${cleanSite}_${stage}_${dateStr}_${Date.now()}.jpg`;

            // 1. Direct upload to Google Drive via Apps Script Web App
            try {
              const uploadRes = await googleDriveService.uploadSitePhotoViaAppsScript(siteName, stage, fileName, imageBuffer);
              if (uploadRes && uploadRes.success) {
                if (uploadRes.folderUrl) driveFolderUrl = uploadRes.folderUrl;
                if (uploadRes.fileUrl) uploadedFile = { webViewLink: uploadRes.fileUrl, id: uploadRes.fileId };
                console.log(`☁️ [Drive Upload Success] File: ${uploadRes.fileUrl}`);
              }
            } catch (appsScriptErr) {
              console.warn('[PlumbingPersona] Apps Script upload warning:', appsScriptErr.message);
            }

            // 2. Local media vault backup
            const mediaDir = path.resolve(__dirname, 'data', 'site_media');
            if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
            localFilePath = path.resolve(mediaDir, fileName);
            fs.writeFileSync(localFilePath, imageBuffer);
            console.log(`📸 [Local Vault] Saved high-res site photo: ${localFilePath}`);
          } catch (err) {
            console.warn('[PlumbingPersona] Local media save warning:', err.message);
          }
        }
      } catch (e) {
        console.warn('[PlumbingPersona] Drive auto-folder/upload warning:', e.message);
      }
    }

    const newRecord = {
      id: `MEP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: dateStr,
      siteName,
      stage,
      workType,
      notes,
      photoCount: count,
      driveFolderUrl,
      localFilePath: localFilePath || null,
      fileId: uploadedFile ? uploadedFile.id : null,
      fileViewUrl: uploadedFile ? uploadedFile.webViewLink : null,
      loggedByChat: chatId
    };

    const photosList = loadPhotosArchive();
    photosList.unshift(newRecord);
    savePhotosArchive(photosList);

    // Automatically append to live Google Sheet (Site_Photos_Log)
    try {
      googleDriveService.appendPhotoLogToSheet(newRecord);
    } catch (sheetErr) {
      console.warn('[PlumbingPersona] Google Sheet append warning:', sheetErr.message);
    }

    const stageTamil = {
      'Roof_Concrete_Pipes': 'ரூஃப் கான்கிரீட் பைப்ஸ் (Roof Slab Piping)',
      'Wall_Chasing_Pipes': 'சுவர் கார்டி & கன்சீல்டு பைப்ஸ் (Wall Chasing / Conduit)',
      'Bathroom_Plumbing': 'பாத்ரூம் பிளம்பிங் (Bathroom Under-tile Plumbing)',
      'Drainage_Sewage': 'டிரைனேஜ் லைன் (Drainage & Chamber)',
      'Main_DB_Wiring': 'மெயின் டிபி & வயரிங் (Main DB & Earthing)',
      'General_Work': 'பொதுவான வேலை (General Work)'
    }[stage] || stage;

    return {
      success: true,
      record: newRecord,
      messageTamil: `✅ *போட்டோக்கள் வெற்றிகரமாகச் சேமிக்கப்பட்டன!*\n\n📍 *சைட்:* ${siteName}\n🔧 *பிரிவு:* ${stageTamil}\n👷 *வேலை விபரம்:* ${workType}\n📝 *குறிப்பு:* ${notes}\n📁 *Google Drive Folder:* ${driveFolderUrl}\n\n_இந்த போட்டோக்கள் Google Drive & Google Sheet-ல் நிரந்தரமாகப் பதிவு செய்யப்பட்டுள்ளன._`
    };
  }

  // 2. Fetch Site Photos
  if (fnName === 'fetchSitePhotos') {
    let siteNameParam = (args.siteName || '').trim();
    if (!siteNameParam || siteNameParam.toLowerCase() === 'site' || siteNameParam.toLowerCase() === 'all' || siteNameParam.toLowerCase() === 'current') {
      siteNameParam = lastActiveSiteName;
    } else {
      lastActiveSiteName = siteNameParam;
    }
    const rawSite = siteNameParam.toLowerCase().trim();
    const stageQuery = (args.stage || 'All').toLowerCase().trim();

    const photosList = loadPhotosArchive();
    
    // Smart multi-lingual matching for site names
    const matches = photosList.filter(item => {
      const itemSite = item.siteName.toLowerCase();
      const itemStage = item.stage.toLowerCase();
      const itemNotes = (item.notes || '').toLowerCase();

      // Check site match (Tamil or English or partial)
      let siteMatches = false;
      if (!rawSite || rawSite === 'all' || rawSite === 'site' || rawSite === 'எல்லா') {
        siteMatches = true;
      } else {
        const tokens = rawSite.split(/\s+/).filter(t => t.length > 2);
        if (itemSite.includes(rawSite)) {
          siteMatches = true;
        } else if (tokens.some(t => itemSite.includes(t) || itemNotes.includes(t))) {
          siteMatches = true;
        } else if ((rawSite.includes('anna') || rawSite.includes('அண்ணா')) && itemSite.includes('anna')) {
          siteMatches = true;
        } else if ((rawSite.includes('ram') || rawSite.includes('ராம்')) && itemSite.includes('ram')) {
          siteMatches = true;
        } else if ((rawSite.includes('pudur') || rawSite.includes('புதூர்')) && itemSite.includes('pudur')) {
          siteMatches = true;
        } else if ((rawSite.includes('selva') || rawSite.includes('செல்வ')) && itemSite.includes('selva')) {
          siteMatches = true;
        } else if ((rawSite.includes('tiru') || rawSite.includes('திரு')) && itemSite.includes('tiru')) {
          siteMatches = true;
        } else if ((rawSite.includes('govt') || rawSite.includes('அரசு') || rawSite.includes('pwd')) && (itemSite.includes('govt') || itemSite.includes('அரசு'))) {
          siteMatches = true;
        }
      }

      if (!siteMatches) return false;

      // Check stage match
      if (stageQuery && stageQuery !== 'all') {
        if (itemStage.includes(stageQuery) || itemNotes.includes(stageQuery)) return true;
        if ((stageQuery.includes('window') || stageQuery.includes('விண்டோ')) && (itemStage.includes('window') || itemNotes.includes('விண்டோ'))) return true;
        if ((stageQuery.includes('concrete') || stageQuery.includes('கான்கிரீட்') || stageQuery.includes('roof')) && (itemStage.includes('concrete') || itemStage.includes('roof'))) return true;
        if ((stageQuery.includes('chasing') || stageQuery.includes('கார்டி') || stageQuery.includes('wall')) && (itemStage.includes('chasing') || itemStage.includes('wall'))) return true;
        if ((stageQuery.includes('bath') || stageQuery.includes('பாத்ரூம்') || stageQuery.includes('plumb')) && itemStage.includes('bath')) return true;
        if ((stageQuery.includes('db') || stageQuery.includes('எர்த்') || stageQuery.includes('earth')) && itemStage.includes('db')) return true;
      }
      return true;
    });

    // 2. If not found in local memory or local file doesn't exist on disk, fetch live from Google Drive!
    let latest = matches[0];
    if (!latest || !latest.localFilePath || !fs.existsSync(latest.localFilePath)) {
      console.log(`☁️ [Drive Live Fetch] Querying Google Drive directly for "${args.siteName || rawSite}" (${stageQuery})...`);
      const drivePhoto = await googleDriveService.fetchLatestSitePhotoFromDrive(args.siteName || rawSite, stageQuery);
      if (drivePhoto && drivePhoto.localFilePath && fs.existsSync(drivePhoto.localFilePath)) {
        latest = drivePhoto;
      }
    }

    if (latest && latest.localFilePath && fs.existsSync(latest.localFilePath)) {
      queueImage(chatId, latest.localFilePath, `📸 ${latest.siteName} (${latest.stage})`);
      const folderUrl = latest.driveFolderUrl || 'https://drive.google.com/drive/folders/1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';
      return {
        success: true,
        foundCount: 1,
        siteName: latest.siteName,
        stage: latest.stage,
        driveFolderUrl: folderUrl,
        notes: latest.notes || 'Site progress photo',
        messageTamil: `📸 *${latest.siteName} (${latest.stage}) - சைட் போட்டோ தயார்!*\n\n📁 *Google Drive Folder:* ${folderUrl}\n\n_உடனடியாக வாட்ஸ்அப் குரூப்பில் அசல் போட்டோ அனுப்பப்படுகிறது..._`
      };
    }

    const safeSite = args.siteName || 'Site';
    const driveFolderUrl = 'https://drive.google.com/drive/folders/1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';
    return {
      success: false,
      foundCount: 0,
      siteName: args.siteName,
      driveFolderUrl,
      messageTamil: `📂 *${args.siteName}* சைட் போட்டோக்கள் Google Drive-ல் தேடப்பட்டன.\n\n📁 *நேரடி Google Drive லிங்க்:* ${driveFolderUrl}\n_குறிப்பு: புதிய போட்டோக்கள் அப்லோட் செய்யப்பட்டவுடன் உடனடியாக வாட்ஸ்அப்பில் அனுப்பப்படும்._`
    };
  }

  // 3. Get Laborers List
  if (fnName === 'getLaborersList') {
    const roleFilter = (args.roleFilter || '').toLowerCase().trim();
    const siteFilter = (args.siteFilter || '').toLowerCase().trim();

    let laborers = loadLaborers();
    if (roleFilter && roleFilter !== 'all') {
      laborers = laborers.filter(l => l.role.toLowerCase().includes(roleFilter) || l.skill.toLowerCase().includes(roleFilter));
    }
    if (siteFilter) {
      laborers = laborers.filter(l => l.assignedSite.toLowerCase().includes(siteFilter));
    }

    const formattedList = laborers.map((l, idx) => {
      const isOff = (l.status && String(l.status).toLowerCase().includes('off'));
      const statusBadge = isOff ? '🔴 Off' : '🟢 On';
      return `*${idx + 1}. ${l.name}*\n   👷 *பணி:* ${l.role}\n   📞 *மொபைல்:* ${l.phone}\n   🔘 *Status:* ${statusBadge}`;
    }).join('\n\n');

    return {
      success: true,
      totalCount: laborers.length,
      laborers,
      formattedTextTamil: `📋 *அரசன் எலக்ட்ரிக்கல் & பிளம்பிங் - வேலையாட்கள் பட்டியல் (${laborers.length} பேர் குழு):*\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━━━\n_குறிப்பு: இந்த விபரம் Google Sheet (Laborers_Directory)-ல் தொடர்ந்து அப்டேட் செய்யப்பட்டு வருகிறது._`
    };
  }

  // 4. Add or Update Laborer
  if (fnName === 'addOrUpdateLaborer') {
    let laborers = loadLaborers();
    const existingIndex = laborers.findIndex(l => l.name.toLowerCase().includes(args.name.toLowerCase()));

    if (existingIndex >= 0) {
      laborers[existingIndex] = {
        ...laborers[existingIndex],
        role: args.role || laborers[existingIndex].role,
        phone: args.phone || laborers[existingIndex].phone,
        assignedSite: args.assignedSite || laborers[existingIndex].assignedSite,
        skill: args.skill || laborers[existingIndex].skill
      };
    } else {
      laborers.push({
        id: laborers.length + 1,
        name: args.name,
        role: args.role,
        skill: args.skill || "General MEP Technician",
        phone: args.phone,
        status: "Active (ஆன்-சைட்)",
        assignedSite: args.assignedSite || "General"
      });
    }

    saveLaborers(laborers);
    return {
      success: true,
      messageTamil: `✅ *${args.name}* விபரம் லேபர்ஸ் லிஸ்டில் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!`
    };
  }

  // 5. Rename or Update Site Stage Folder in Google Drive
  if (fnName === 'renameOrUpdateSiteStage') {
    const siteName = args.siteName || 'HMS Colony';
    const oldStage = args.oldStage || 'Main_DB_Wiring';
    const newStage = args.newStage || 'Profile_LED_Work';

    console.log(`📂 [Drive Rename Tool] Renaming stage for ${siteName}: "${oldStage}" -> "${newStage}"`);
    const renameRes = await googleDriveService.renameSiteFolder(siteName, oldStage, newStage);

    // Also update local photo archive
    let archive = loadPhotosArchive();
    let updatedCount = 0;
    archive = archive.map(item => {
      const matchSite = (item.siteName || '').toLowerCase().includes(siteName.toLowerCase());
      const matchStage = (item.stage || '').toLowerCase().includes(oldStage.toLowerCase());
      if (matchSite && matchStage) {
        updatedCount++;
        return {
          ...item,
          stage: newStage.replace(/\s+/g, '_'),
          notes: `${item.notes || ''} [Updated to ${newStage}]`
        };
      }
      return item;
    });
    if (updatedCount > 0) {
      savePhotosArchive(archive);
    }

    if (renameRes && renameRes.success) {
      return {
        success: true,
        siteName,
        oldStage,
        newStage,
        folderUrl: renameRes.folderUrl,
        messageTamil: `✅ *Google Drive ஃபோல்டர் பெயர் வெற்றிகரமாக மாற்றப்பட்டது!*\n\n📍 *சைட்:* ${siteName}\n🔄 *பழைய பெயர்:* ${oldStage}\n✨ *புதிய பெயர்:* ${newStage}\n📁 *Drive Folder:* ${renameRes.folderUrl}\n\n_உள்ளே உள்ள அனைத்து போட்டோக்களும் மற்றும் சிஸ்டம் பதிவுகளும் ${newStage} என புதுப்பிக்கப்பட்டுவிட்டன._`
      };
    } else {
      return {
        success: false,
        error: renameRes?.error || 'Failed to rename folder in Google Drive',
        messageTamil: `⚠️ Google Drive-ல் "${oldStage}" ஃபோல்டரை "${newStage}" என மாற்றுவதில் சிறு தடங்கல்: ${renameRes?.error || 'Folder not found'}`
      };
    }
  }

  // 6. Record Daily Attendance & Site Allocation
  if (fnName === 'recordDailyAttendance') {
    const workerName = args.workerName || 'Worker';
    const siteName = args.siteName || 'General Site';
    const status = args.status || 'Present';
    const advanceAmount = Number(args.advanceAmount) || 0;
    const advanceNotes = args.advanceNotes || (advanceAmount > 0 ? 'Daily advance' : '-');
    const date = args.date || getISTDateString();

    const workerObj = findLaborerByName(workerName);
    const role = workerObj ? workerObj.role : 'Technician';
    const laborId = workerObj ? workerObj.id : '';
    const dailyRate = Number(args.dailyRate) || (workerObj ? getDefaultDailyRate(workerObj.role) : 850);

    const entry = {
      date,
      laborId,
      name: workerObj ? workerObj.name : workerName,
      role,
      siteAllocated: siteName,
      attendanceStatus: status,
      dailyRate,
      advanceAmount,
      advanceNotes
    };

    console.log(`📋 [Attendance Tool] Logging ${entry.name} at ${siteName} (${status}) - Adv: ₹${advanceAmount}`);
    await googleDriveService.recordDailyAttendanceAndAdvance(entry);

    let advanceMsg = advanceAmount > 0
      ? `\n💵 *அட்வான்ஸ் தொகை:* ₹${advanceAmount} (${advanceNotes})\n_குறிப்பு: இந்த அட்வான்ஸ் தொகை வார சம்பளத்தில் தானாகக் கழிக்கப்படும்._`
      : '';

    return {
      success: true,
      entry,
      messageTamil: `📋 *தினசரி வருகை & சைட் ஒதுக்கீடு பதிவு செய்யப்பட்டது!*\n\n👷 *பெயர்:* ${entry.name} (${entry.role})\n📍 *ஒதுக்கப்பட்ட சைட்:* ${siteName}\n📅 *தேதி:* ${date}\n🔘 *வருகை நிலை:* ${status}\n💰 *தினக்கூலி:* ₹${dailyRate}${advanceMsg}\n\n📊 *Google Sheet:* \`Daily_Attendance_Site_Log\` ஷீட்டில் பாதுகாப்பாகச் சேர்க்கப்பட்டது.`
    };
  }

  // 7. Record Labor Advance
  if (fnName === 'recordLaborAdvance') {
    const workerName = args.workerName || 'Worker';
    const advanceAmount = Number(args.advanceAmount) || 0;
    const reason = args.reason || 'Personal / Tea / Travel';
    const date = args.date || getISTDateString();

    const workerObj = findLaborerByName(workerName);
    const role = workerObj ? workerObj.role : 'Technician';
    const laborId = workerObj ? workerObj.id : '';
    const dailyRate = workerObj ? getDefaultDailyRate(workerObj.role) : 850;

    const entry = {
      date,
      laborId,
      name: workerObj ? workerObj.name : workerName,
      role,
      siteAllocated: 'General / Advance Entry',
      attendanceStatus: 'Advance Only',
      dailyRate,
      advanceAmount,
      advanceNotes: reason
    };

    console.log(`💵 [Advance Tool] Logging advance of ₹${advanceAmount} for ${entry.name}: ${reason}`);
    await googleDriveService.recordDailyAttendanceAndAdvance(entry);

    return {
      success: true,
      entry,
      messageTamil: `💵 *அட்வான்ஸ் தொகை பதிவு செய்யப்பட்டது!*\n\n👷 *பெயர்:* ${entry.name} (${entry.role})\n📅 *தேதி:* ${date}\n💸 *அட்வான்ஸ் தொகை:* ₹${advanceAmount}\n📝 *காரணம்:* ${reason}\n\n✅ *வார சம்பளக் கணக்கு:* இந்த ₹${advanceAmount} வார இறுதி சம்பளம் போடும் போது மொத்த சம்பளத்திலிருந்து தானாகக் கழித்து கணக்கிடப்படும்!`
    };
  }

  // 8. Calculate Weekly Salary Settlement with Automatic Advance Deduction
  if (fnName === 'calculateWeeklySalarySettlement') {
    const targetWorker = args.workerName || 'All';
    const weekPeriod = args.weekPeriod || 'This Week';
    const autoRecord = args.autoRecord !== false;

    console.log(`💰 [Salary Settlement Tool] Calculating settlement for: ${targetWorker}`);
    const summaryList = await googleDriveService.getAttendanceAndAdvanceSummary(targetWorker);

    if (!summaryList || summaryList.length === 0) {
      return {
        success: false,
        messageTamil: `⚠️ *சம்பள விபரம் கிடைக்கவில்லை:* ${targetWorker !== 'All' ? targetWorker : 'தொழிலாளர்கள்'} குறித்த வருகை அல்லது அட்வான்ஸ் பதிவுகள் தற்போதைக்கு Google Sheet-ல் இல்லை.\n\n_முதலில் தினசரி வருகையை அல்லது அட்வான்ஸை பதிவு செய்யவும்._`
      };
    }

    const recordedEntries = [];
    let summaryTextTamil = `💰 *அரசன் எலக்ட்ரிக்கல் & பிளம்பிங் - வார சம்பள செட்டில்மென்ட் (${weekPeriod})*\n━━━━━━━━━━━━━━━━━━━━━━\n`;

    for (const item of summaryList) {
      if (autoRecord) {
        await googleDriveService.recordWeeklySalarySettlement({
          weekPeriod,
          laborId: item.laborId,
          name: item.name,
          role: item.role,
          daysWorked: item.daysWorked,
          dailyRate: item.dailyRate,
          grossSalary: item.grossSalary,
          totalAdvanceDeducted: item.totalAdvanceDeducted,
          netPayable: item.netPayable,
          paymentStatus: 'Calculated / Due'
        });
        recordedEntries.push(item);
      }

      summaryTextTamil += `\n👷 *${item.name}* (${item.role})\n`;
      summaryTextTamil += `   📍 *பணிபுரிந்த சைட்டுகள்:* ${item.sitesVisited}\n`;
      summaryTextTamil += `   📅 *பணிபுரிந்த நாட்கள்:* ${item.daysWorked} நாட்கள்\n`;
      summaryTextTamil += `   💵 *தினக்கூலி:* ₹${item.dailyRate}\n`;
      summaryTextTamil += `   📈 *மொத்த சம்பளம் (Gross):* ₹${item.grossSalary}\n`;
      summaryTextTamil += `   🔻 *கழிக்கப்பட்ட அட்வான்ஸ் (Advance):* -₹${item.totalAdvanceDeducted}\n`;
      summaryTextTamil += `   ━━━━━━━━━━━━━━━━━━━━\n`;
      summaryTextTamil += `   ✨ *வழங்க வேண்டிய நிகர தொகை (Net Payable):* *₹${item.netPayable}*\n`;
      if (item.advanceDetails && item.advanceDetails.length > 0) {
        const advList = item.advanceDetails.map(a => `     • ${a.date}: ₹${a.amount} (${a.notes})`).join('\n');
        summaryTextTamil += `   _அட்வான்ஸ் விபரம்:_\n${advList}\n`;
      }
    }

    summaryTextTamil += `\n━━━━━━━━━━━━━━━━━━━━━━\n📊 *Google Sheet:* \`Weekly_Salary_Settlement\` ஷீட்டில் அனைத்து கணக்குகளும் துல்லியமாகச் சேமிக்கப்பட்டுவிட்டன!`;

    return {
      success: true,
      weekPeriod,
      summaryList,
      messageTamil: summaryTextTamil
    };
  }

  // 9. Mark Salary As Paid after Owner Confirmation
  if (fnName === 'markSalaryAsPaid') {
    const workerName = args.workerName || 'All';
    const paidDate = args.paidDate || getISTDateString();

    console.log(`💳 [Salary Paid Tool] Marking salary as Paid for: ${workerName} on ${paidDate}`);
    const res = await googleDriveService.markWeeklySalaryPaid(workerName, paidDate);

    if (res && res.success && res.updatedCount > 0) {
      const namesList = res.updatedStatusList.map(u => `• ${u.name}`).join('\n');
      return {
        success: true,
        messageTamil: `✅ *சம்பளம் வழங்கப்பட்டதாகப் பதிவு செய்யப்பட்டது! (Payment Confirmed)*\n\n📅 *வழங்கப்பட்ட தேதி (Paid Date):* ${res.paidDate}\n🔘 *Payment Status:* *Paid (வழங்கப்பட்டது)*\n\n👷 *பயனாளிகள்:*\n${namesList}\n\n📊 *Google Sheet:* \`Weekly_Salary_Settlement\` ஷீட்டில் Payment Status 'Paid' எனவும் Paid Date-ம் துல்லியமாகப் பதிவு செய்யப்பட்டுவிட்டது!`
      };
    } else {
      return {
        success: false,
        messageTamil: `⚠️ சம்பளப் பதிவை 'Paid' என மாற்றுவதில் தகவல் பொருந்தவில்லை அல்லது ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.`
      };
    }
  }

  // 10. Query Daily Attendance & Site Allocation
  if (fnName === 'queryDailyAttendance') {
    const targetDate = args.date || getISTDateString();
    const workerName = args.workerName || null;
    const siteName = args.siteName || null;
    const statusFilter = args.statusFilter || null;

    console.log(`📋 [Query Attendance Tool] Querying attendance for date: ${targetDate}, worker: ${workerName}, site: ${siteName}`);
    const logs = await googleDriveService.getDailyAttendanceLogs(targetDate, workerName, siteName, statusFilter);

    if (!logs || logs.length === 0) {
      return {
        success: true,
        total: 0,
        messageTamil: `ℹ️ *${targetDate}* தேதிக்கான வருகைப் பதிவுகள் எதுவும் Google Sheet-ல் காணப்படவில்லை.`
      };
    }

    const presentList = logs.filter(l => l.status.toLowerCase().includes('present') || l.status.toLowerCase().includes('on'));
    const leaveList = logs.filter(l => l.status.toLowerCase().includes('leave') || l.status.toLowerCase().includes('absent') || l.status.toLowerCase().includes('off'));

    let reply = `📋 *அரசன் எலக்ட்ரிக்கல் & பிளம்பிங் - வருகை விபரம் (${targetDate})*\n━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (presentList.length > 0) {
      reply += `\n🟢 *வேலைக்கு வந்தவர்கள் (${presentList.length} பேர்):*\n`;
      const siteMap = new Map();
      for (const p of presentList) {
        const s = p.site || 'General Site';
        if (!siteMap.has(s)) siteMap.set(s, []);
        siteMap.get(s).push(p);
      }

      for (const [sName, workers] of siteMap.entries()) {
        reply += `\n📍 *${sName}:*\n`;
        workers.forEach(w => {
          const advText = Number(w.advance) > 0 ? ` _(அட்வான்ஸ்: ₹${w.advance})_` : '';
          reply += `   • ${w.name} (கூலி: ₹${w.salary})${advText}\n`;
        });
      }
    }

    if (leaveList.length > 0) {
      reply += `\n🔴 *விடுப்பு / லீவ் (${leaveList.length} பேர்):*\n`;
      leaveList.forEach(w => {
        reply += `   • ${w.name}\n`;
      });
    }

    reply += `\n━━━━━━━━━━━━━━━━━━━━━━\n📊 *Google Sheet:* \`Daily_Attendance_Site_Log\` ஷீட்டிலிருந்து நேரடியாகப் பெறப்பட்டது.`;

    return {
      success: true,
      totalCount: logs.length,
      presentCount: presentList.length,
      leaveCount: leaveList.length,
      logs,
      messageTamil: reply
    };
  }

  // 11. Correct Attendance Record
  if (fnName === 'correctAttendanceRecord') {
    const targetDate = args.date || getISTDateString();
    const wrongWorker = args.wrongWorkerName;
    const correctWorkerName = args.correctWorkerName;

    const workerObj = findLaborerByName(correctWorkerName);
    const correctName = workerObj ? workerObj.name : correctWorkerName;
    const correctLaborId = workerObj ? workerObj.id : '';
    const correctRole = workerObj ? workerObj.role : 'Technician';
    const dailyRate = Number(args.dailyRate) || (workerObj ? getDefaultDailyRate(workerObj.role) : 850);

    const updates = {
      laborId: correctLaborId,
      name: correctName,
      dailyRate: dailyRate
    };
    if (args.siteName) updates.site = args.siteName;
    if (args.status) updates.status = args.status;
    if (args.advanceAmount !== undefined) updates.advance = args.advanceAmount;

    console.log(`🔧 [Correct Attendance Tool] Correcting ${wrongWorker} -> ${correctName} for ${targetDate}`);
    const res = await googleDriveService.updateDailyAttendanceRecord(targetDate, wrongWorker, updates);

    if (res && res.success) {
      return {
        success: true,
        messageTamil: `✅ *வருகைப் பதிவு வெற்றிகரமாகத் திருத்தப்பட்டது!*\n\n📅 *தேதி:* ${targetDate}\n🔄 *தவறான பெயர்:* ${wrongWorker}\n✨ *சரியான பெயர்:* ${correctName} (${correctRole})\n💰 *தினக்கூலி:* ₹${dailyRate}\n\n📊 *Google Sheet:* \`Daily_Attendance_Site_Log\` ஷீட்டில் தவறு திருத்தப்பட்டு அப்டேட் செய்யப்பட்டுவிட்டது!`
      };
    } else {
      return {
        success: false,
        messageTamil: `⚠️ வருகைப் பதிவைத் திருத்துவதில் தடங்கல்: ${res?.error || 'பதிவு கிடைக்கவில்லை'}`
      };
    }
  }

  // 12. Record Site Bill
  if (fnName === 'recordSiteBill') {
    const siteName = args.siteName || 'General Site';
    const amount = Number(args.amount) || 0;
    const workerName = args.workerName || 'Worker';
    const paidOutBy = args.paidOutBy || args.paidBy || 'Arasan Owner';
    const billOwedBy = args.billOwedBy || 'Contractor';

    // Smart status deduction if not explicitly provided
    let collectionStatus = args.collectionStatus;
    if (!collectionStatus) {
      const owedLower = (billOwedBy || '').toLowerCase();
      const paidLower = (paidOutBy || '').toLowerCase();
      if (paidLower.includes('contractor') || (paidLower.includes('owner') && !paidLower.includes('arasan'))) {
        collectionStatus = 'Received';
      } else if (owedLower.includes('arasan') || owedLower.includes('self')) {
        collectionStatus = 'Received';
      } else {
        collectionStatus = 'Pending Collection';
      }
    }

    const details = args.details || 'Site materials purchase';
    const dateStr = args.date || getISTDateString();

    let imageBuffer = null;
    let fileName = null;
    if (media && media.data) {
      try {
        imageBuffer = Buffer.from(media.data, 'base64');
        const cleanSite = siteName.replace(/[^a-zA-Z0-9]/g, '_');
        fileName = `Bill_${cleanSite}_${dateStr}_${Date.now()}.jpg`;
      } catch (err) {
        console.warn('[SiteBill] Media decode error:', err.message);
      }
    }

    console.log(`🧾 [Record Bill Tool] Logging ₹${amount} for ${siteName} by ${workerName} (Paid out: ${paidOutBy}, Owed by: ${billOwedBy}, Status: ${collectionStatus})`);
    const res = await googleDriveService.recordSiteBill({
      date: dateStr,
      siteName,
      workerName,
      paidOutBy,
      billOwedBy,
      amount,
      collectionStatus,
      details
    }, imageBuffer, fileName);

    if (res && res.success) {
      const driveInfo = res.driveLink ? `\n📁 *Drive Link:* ${res.driveLink}` : '';
      const statusText = collectionStatus.toLowerCase().includes('pending')
        ? `⏳ *Pending Collection (இன்னும் காசு வரல / வசூலிக்கப்பட வேண்டும்)*`
        : `✅ *Received / Settled (காசு வாங்கியாச்சு)*`;

      return {
        success: true,
        messageTamil: `🧾 *சைட் பில் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!*\n\n📍 *சைட்:* ${siteName}\n📅 *தேதி:* ${dateStr}\n💰 *தொகை:* *₹${amount}*\n👷 *பொருள் வாங்கியவர்:* ${workerName}\n💳 *கடையில காசு போட்டவர்:* ${paidOutBy}\n👤 *கணக்கு / செலவு யாருக்கு:* *${billOwedBy}*\n📌 *வசூல் நிலை (Status):* ${statusText}\n📝 *விபரம்:* ${details}${driveInfo}\n\n📊 *Google Sheet:* \`Site_Bills_Log\` ஷீட்டில் பாதுகாப்பாகச் சேர்க்கப்பட்டது!`
      };
    } else {
      return {
        success: false,
        messageTamil: `⚠️ சைட் பில் பதிவு செய்வதில் சிறு தடங்கல் ஏற்பட்டது.`
      };
    }
  }

  // 12b. Mark Bill As Received
  if (fnName === 'markBillAsReceived') {
    const siteName = args.siteName || 'General Site';
    const billOwedBy = args.billOwedBy || '';
    const amount = args.amount ? Number(args.amount) : null;
    console.log(`💰 [Mark Bill Received Tool] Marking bill as received for ${siteName} from ${billOwedBy} (Amount: ${amount})`);

    const res = await googleDriveService.updateBillCollectionStatus(siteName, billOwedBy, amount, 'Received');
    if (res && res.success) {
      return {
        success: true,
        messageTamil: `✅ *சைட் பில் தொகை வெற்றிகரமாகப் பெறப்பட்டது (Received/Settled)!*\n\n📍 *சைட்:* ${siteName}\n💰 *தொகை:* *₹${res.matchedBill.amount}*\n👤 *பணம் கொடுத்தவர்:* ${res.matchedBill.owedBy || billOwedBy || 'கான்ட்ராக்டர்'}\n📅 *பெறப்பட்ட தேதி:* ${res.receivedDate}\n📝 *பில் விவரம்:* ${res.matchedBill.details}\n\n📊 Google Sheet \`Site_Bills_Log\`-ல் நிலை **Received** என அப்டேட் செய்யப்பட்டது!`
      };
    } else {
      return {
        success: false,
        messageTamil: `⚠️ பில் நிலையை மாற்றுவதில் குறிப்பு: ${res?.error || 'பொருத்தமான நிலுவை பில் கிடைக்கவில்லை.'}`
      };
    }
  }

  // 12c. Query Site Bills and Balances
  if (fnName === 'querySiteBillsAndBalances') {
    const siteName = args.siteName || 'all';
    console.log(`📊 [Query Bills Tool] Summarizing pending bills for ${siteName}`);
    const summary = await googleDriveService.getPendingBillsSummary(siteName);

    if (!summary || !summary.success || summary.pendingCount === 0) {
      return {
        success: true,
        messageTamil: `🎉 *${siteName === 'all' ? 'அனைத்து சைட்களிலும்' : siteName + ' சைட்டில்'}* நிலுவையில் உள்ள பில்கள் (Pending Bills) எதுவும் இல்லை! அனைத்து தொகைகளும் வசூலிக்கப்பட்டுவிட்டன.`
      };
    }

    const itemsText = summary.pendingList.map((p, idx) =>
      `*${idx + 1}. ₹${p.amount}* - ${p.details}\n   📍 சைட்: ${p.site} | 📅 ${p.date} | 👤 கணக்கு: *${p.owedBy}* (போட்டவர்: ${p.paidOutBy})`
    ).join('\n\n');

    return {
      success: true,
      summary,
      messageTamil: `📊 *${siteName === 'all' ? 'அனைத்து சைட்கள்' : siteName} - நிலுவை பில்கள் & வசூல் அறிக்கை:*\n━━━━━━━━━━━━━━━━━━━━━━\n👷 *கான்ட்ராக்டரிடம் வசூலிக்க வேண்டியது:* *₹${summary.totalPendingContractor}*\n🏠 *ஹவுஸ் ஓனரிடம் வசூலிக்க வேண்டியது:* *₹${summary.totalPendingHouseOwner}*\n💰 *மொத்த நிலுவைத் தொகை (Grand Total):* *₹${summary.grandTotalPending}* (${summary.pendingCount} பில்கள்)\n━━━━━━━━━━━━━━━━━━━━━━\n\n📌 *நிலுவை பில்களின் பட்டியல்:*\n${itemsText}\n\n━━━━━━━━━━━━━━━━━━━━━━\n_💡 குறிப்பு: பணம் வசூலானதும் 'கான்ட்ராக்டர்ட்ட காசு வாங்கியாச்சு' என்று சொன்னால் Status உடனடியாக 'Received' என அப்டேட் செய்யப்படும்._`
    };
  }

  // 13. Fetch Site Bills
  if (fnName === 'fetchSiteBills') {
    const siteName = args.siteName || 'General Site';
    const date = args.date || null;

    console.log(`🧾 [Fetch Bills Tool] Fetching bills for ${siteName}`);
    const bills = await googleDriveService.getSiteBills(siteName, date);

    if (!bills || bills.length === 0) {
      return {
        success: true,
        bills: [],
        messageTamil: `ℹ️ *${siteName}* சைட்டிற்கு பில்கள் எதுவும் Google Sheet-ல் பதிவாகவில்லை.`
      };
    }

    const latestWithImage = bills.find(b => b.fileId);
    if (latestWithImage && latestWithImage.fileId) {
      try {
        console.log(`📥 [Fetch Bills Tool] Downloading bill image for ${siteName} (File ID: ${latestWithImage.fileId})...`);
        const imageBytes = await googleDriveService.downloadFileBinary(latestWithImage.fileId);
        if (imageBytes && imageBytes.length > 0) {
          queueImage(chatId, {
            buffer: imageBytes,
            caption: `🧾 *${siteName} - சைட் பில் (₹${latestWithImage.amount})*\n📅 தேதி: ${latestWithImage.date} | வாங்கியவர்: ${latestWithImage.worker}\n💳 Paid by: ${latestWithImage.paidBy}`
          });
          console.log(`📸 [Fetch Bills Tool] Queued bill photo for direct WhatsApp delivery! (${imageBytes.length} bytes)`);
        }
      } catch (imgErr) {
        console.warn('[Fetch Bills Tool] Bill photo download warning:', imgErr.message);
      }
    }

    const totalAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const billList = bills.map((b, idx) => `*${idx + 1}. ₹${b.amount}* - ${b.details}\n   📅 ${b.date} | 👷 ${b.worker} | 💳 Paid by: ${b.paidBy}`).join('\n\n');

    return {
      success: true,
      totalAmount,
      count: bills.length,
      messageTamil: `🧾 *${siteName} - சைட் பில்கள் அறிக்கை (${bills.length} பில்கள்):*\n━━━━━━━━━━━━━━━━━━━━━━\n${billList}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💵 *மொத்த செலவு (Total):* *₹${totalAmount}*\n\n_குறிப்பு: பில் போட்டோ நேரடியாக வாட்ஸ்அப்பில் அனுப்பப்படுகிறது._`
    };
  }

  return { error: `Unknown tool function: ${fnName}` };
}

module.exports = {
  CONTRACTOR_PROFILE,
  PLUMBING_ELECTRICAL_TOOLS,
  buildPlumbingElectricalSystemPrompt,
  executePlumbingElectricalToolCall,
  loadLaborers,
  loadPhotosArchive,
  getQueuedImage
};
