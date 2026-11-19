# ⚡🔧 Project 13: Electrical & Plumbing Site Management — WhatsApp AI Vault & Laborers Dispatch Engine

**Owner & Architect:** Suresh Kumar — SoloDeveloper ([solodeveloper.pro](https://solodeveloper.pro))  
**Client Persona:** Sri Meenakshi Electrical & Plumbing Works (Er. Rajesh Kannan / Contractor Team)  
**Location:** Madurai, Tamil Nadu, India  
**System Status:** 🟢 Production Ready (Integrated with Baileys WhatsApp Assistant & n8n)  
**Operating Principle:** 100% Permanent Free-Tier ($0/month)

---

## 📌 1. திட்டத்தின் நோக்கம் & பின்னணி (Executive Overview)

வீடு மற்றும் வணிகக் கட்டிடக் கட்டுமானத்தில் **எலக்ட்ரிக்கல் & பிளம்பிங் (MEP)** வேலைகளில் மிக முக்கியமான சில நிலைகள் பூச்சு அல்லது கான்கிரீட் போடுவதற்கு முன்னரே மறைக்கப்பட்டு விடுகின்றன:
1. **ரூஃப் கான்கிரீட் பைப்ஸ் (Roof Slab Piping):** கான்கிரீட் ஊற்றுவதற்கு முன் ஸ்லாப்பில் பதிக்கப்படும் பிளம்பிங் மற்றும் எலக்ட்ரிக்கல் கன்டியூட் பைப்ஸ்.
2. **கார்டி எடுத்த பைப்ஸ் (Wall Chasing / Concealed Piping):** சுவரில் கட்டிங் (கார்டி) எடுத்து பைப் மற்றும் சுவிட்ச் பாக்ஸ் பொருத்தும் நிலை (சிமெண்ட் பூச்சுக்கு முன்).
3. **பாத்ரூம் பிளம்பிங் (Bathroom Under-Floor / Wall Plumbing):** டைல்ஸ் ஒட்டுவதற்கு முன் பதிக்கப்படும் இன்லெட், அவுட்லெட் மற்றும் வால்-மவுண்டட் டைவர்ஷன் பைப்லைன்கள்.

பிற்காலத்தில் சுவரில் ஆணி அடிக்கும்போதோ அல்லது லீக்கேஜ் வரும்போதோ, இந்த ஒரிஜினல் போட்டோக்கள் கைவசம் இருப்பது மிக அவசியம். இந்த அமைப்பு வாட்ஸ்அப் வழியாகவே அனைத்தையும் தானாகப் பதிவு செய்து, பாதுகாத்து, தேவைப்படும்போது திரும்ப அனுப்புகிறது.

---

## 🚀 2. முக்கிய வசதிகள் (Core Features)

1. **Auto-Categorized Google Drive Vault (15 GB Free):**
   - வாட்ஸ்அப்பில் போட்டோக்கள் மற்றும் தமிழ் வாய்ஸ் நோட் அனுப்பியவுடன், ஜெமினி AI தானாகவே சைட் பெயர் & வேலைப் பிரிவைப் பிரித்தறிந்து Google Drive-ல் ஃபோல்டர் அமைத்துச் சேமிக்கும்:
     `📁 MEP Sites ➔ 📁 [Site Name] ➔ 📁 [Stage Name]/`
2. **On-Demand Photo Dispatch (வாட்ஸ்அப் குரூப் & தனி நபர்):**
   - வாட்ஸ்அப் குரூப்பில் உள்ள லேபரோ, ஓனரோ அல்லது கிளைன்ட்டோ:
     *"ராம் நகர் சைட் பாத்ரூம் பிளம்பிங் போட்டோஸ் அனுப்பு"* அல்லது *"கான்கிரீட் பைப் போட்டோஸ் வேணும்"* என்று கேட்டால், உடனடி பதில் + Google Drive ஹை-ரெசல்யூஷன் லிங்க் அனுப்பப்படும்.
3. **10-Member Laborers Directory:**
   - 10 எலக்ட்ரிக்கல் & பிளம்பிங் பணியாளர்களின் விபரம் (தலைமை பிளம்பர், சீனியர் எலக்ட்ரீசியன், கார்டி ஸ்பெஷலிஸ்ட், ஃபிட்டர், ஹெல்பர்) கூகுள் ஷீட்டில் பராமரிக்கப்படும்.
   - குரூப்பில் யார் கேட்டாலும் *"லேபர்ஸ் லிஸ்ட்"* நொடிப் பொழுதில் மொபைல் நம்பருடன் அனுப்பப்படும்.
4. **Smart WhatsApp Group Bypass:**
   - குரூப்பில் லேபர்கள் `!ai` என்று டைப் செய்யத் தேவையில்லை. சைட் போட்டோக்கள், ஆடியோ நோட், அல்லது வேலை சம்பந்தப்பட்ட வார்த்தைகள் (போட்டோ, பைப், லேபர்) இருந்தால் பாட் தானாகவே குரூப்பில் பதிலளிக்கும்.

---

## 👥 3. 10 லேபர்கள் விபரம் (Pre-configured 10-Laborers Directory)

| ID | பெயர் (Name) | பதவி (Role) | திறன் (Skill) | மொபைல் (Phone) | சைட் (Assigned Site) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Muthuvel (முத்துவேல்) | Head Plumber (தலைமை பிளம்பர்) | PPR / CPVC / Concealed Diverter | +91 98421 11001 | Anna Nagar Villa |
| **2** | Senthil Kumar (செந்தில்) | Senior Electrician (சீனியர் எலக்ட்ரீசியன்) | 3-Phase DB / Conduit / Concealed Wiring | +91 98421 11002 | Ram Nagar Site |
| **3** | Murugan (முருகன்) | Wall Chasing Specialist (கார்டி ஸ்பெஷலிஸ்ட்) | Chaser Machine / Box Fixing | +91 98421 11003 | Ram Nagar Site |
| **4** | Karthi (கார்த்தி) | Plumbing Pipe Fitter (பிளம்பிங் ஃபிட்டர்) | PVC Drainage & Manhole Line | +91 98421 11004 | K.Pudur Commercial |
| **5** | Velu (வேலு) | Roof Conduit Layer (ரூஃப் கான்கிரீட் பைப்) | Slab Conduit & Fan Box Tying | +91 98421 11005 | Anna Nagar Villa |
| **6** | Ramu (ராமு) | Bathroom Plumbing (பாத்ரூம் ஃபிட்டிங்) | Wall Concealed Mixer / Diverter | +91 98421 11006 | Selvapuram House |
| **7** | Dinesh (தினேஷ்) | Wireman (வயர்மேன்) | Cable Pulling / Inverter / Earthing | +91 98421 11007 | Selvapuram House |
| **8** | Saravanan (சரவணன்) | Chasing & Plaster Assistant (கார்டி ஹெல்பர்) | Grooving / Pipe Clamping | +91 98421 11008 | Ram Nagar Site |
| **9** | Pandian (பாண்டியன்) | Site Supervisor (சைட் சூப்பர்வைசர்) | Material Inspection / Quality Check | +91 98421 11009 | All Sites (Madurai) |
| **10** | Mani (மணி) | Helper / Handler (ஹெல்பர் / லோடு) | Material Loading / Unloading | +91 98421 11010 | K.Pudur Commercial |

---

## 🔑 4. தேவைப்படும் கிரெடென்ஷியல்ஸ் & செட்டிங்ஸ் (Credentials Checklist)

| கிரெடென்ஷியல் | எங்குள்ளது / என்ன தேவை | நிலை (Status) |
| :--- | :--- | :--- |
| **Google Gemini API Key** | `GEMINI_API_KEY` (Free AI Studio) | 🟢 **ஏற்கனவே உள்ளது** (`whatsapp-gemini-assistant/.env`) |
| **Google Sheets OAuth2** | n8n Credential `XtknJPUddSwDeQRl` | 🟢 **ஏற்கனவே உள்ளது** (n8n Cloud-ல் இணைக்கப்பட்டுள்ளது) |
| **Google Drive OAuth2** | Google Cloud Console ➔ Drive API Enable | 🟡 **Google Drive API Scope சேர்க்கப்பட வேண்டும்** |
| **WhatsApp Baileys Session** | QR Code Scan (`.baileys_auth`) | 🟢 **உடனடியாக ஸ்கேன் செய்யத் தயார்** |

---

## 📊 5. Google Sheet கட்டமைப்பு (CRM Schema)

Google Sheet பெயர்: **`Electrical_Plumbing_Sites_CRM`**

### Tab 1: `Site_Photos_Log`
| Timestamp | Date | Site_Name | Stage_Category | Work_Type | Uploaded_By | Drive_Folder_URL | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### Tab 2: `Laborers_Directory`
| ID | Name | Role | Skill | Phone | Assigned_Site | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

---

## ⚡ 6. மோட் மாற்றுவது எப்படி? (Switching to MEP Mode)

சுரேஷின் வாட்ஸ்அப் நம்பரிலிருந்து கீழ்கண்ட ஏதேனும் ஒரு கமாண்டை அனுப்பினால் போதும்:
* `!mode plumber` அல்லது `/mode plumber`
* `!mode electrical`
* *"switch to plumber"*

**பாட் பதில் மெசேஜ்:**
> ✅ *Switched!* Mode is now active: ⚡🔧 *Sri Meenakshi Electrical & Plumbing Site Assistant*.  
> • Site photo archiving (Roof Concrete pipes, Wall Chasing/கார்டி, Bathroom plumbing) active.  
> • 10 Laborers directory & auto-dispatch ready.  
> • Group & DM on-demand photo retrieval active!

---

## 📦 7. கிளைன்ட்டிற்குத் தனியாக கிளவுட் காப்பி அனுப்புவது எப்படி? (Client Cloud Deployment)

1. **Workflow JSON:** [`electrical_plumbing_whatsapp_workflow.json`](./electrical_plumbing_whatsapp_workflow.json) கோப்பை எடுத்து கிளைன்ட்டின் தனி n8n-ல் "Import Workflow" கொடுக்கவும்.
2. **Google Sheet Template:** மேலே உள்ள 2 டேப்களைக் கொண்ட Google Sheet-ஐ கிளைன்ட்டின் ஜிமெயிலில் உருவாக்கிக் கொடுக்கவும்.
3. **Baileys Engine:** கிளைன்ட்டின் வாட்ஸ்அப் நம்பருக்குத் தனி Render Web Service அல்லது லோக்கல் ரன்னர் இயக்கி QR கோடை ஸ்கேன் செய்து இணைத்துக் கொடுக்கலாம்.
