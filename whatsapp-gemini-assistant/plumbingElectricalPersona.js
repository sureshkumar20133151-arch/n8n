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

// Memory queue for on-demand image dispatch to WhatsApp
const queuedImages = new Map();
let lastActiveSiteName = 'Ponmeni';

function queueImage(chatId, filePath, caption) {
  queuedImages.set(chatId, { filePath, caption });
}

function getQueuedImage(chatId) {
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
      description: 'Call this tool whenever anyone (owner, client, supervisor, or laborer in WhatsApp DM or Group) requests photos for a specific site or stage (e.g. "Ram Nagar bathroom plumbing photos", "HMS Colony profile LED work photos").',
      parameters: {
        type: 'OBJECT',
        properties: {
          siteName: {
            type: 'STRING',
            description: 'Name or part of the site name'
          },
          stage: {
            type: 'STRING',
            description: 'Specific stage requested or All (e.g. Profile_LED_Work, Roof_Concrete_Pipes, All)'
          }
        },
        required: ['siteName']
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
    const dateStr = new Date().toISOString().split('T')[0];

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
