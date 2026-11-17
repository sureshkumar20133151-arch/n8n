const assert = require('assert');
const builderMemory = require('./builderCustomerMemory');
const { buildBuilderSystemPrompt } = require('./builderPersona');
const GeminiService = require('./geminiService');

console.log('🧪 ========================================================');
console.log('🧪 VERIFYING CIVIL ENGINEERING PLOT, SETBACK & OTS FEATURES');
console.log('🧪 ========================================================\n');

const ts = Date.now();
const gemini = new GeminiService();

// 1. Test Plot Type Detection (Corner Plot vs Middle Plot)
console.log('--- Test 1: Plot Type Detection ---');
const testChatId1 = `9198421${ts.toString().slice(-5)}1@s.whatsapp.net`;
builderMemory.buildContextInjection(testChatId1, 'I have a 784 sq.ft corner plot in Madurai');
const prof1 = builderMemory.getProfile(testChatId1);
assert.strictEqual(prof1.plot_type, 'corner_plot', 'Should detect corner_plot');
console.log('✅ [PASS] Corner plot detected accurately');

const testChatId2 = `9198421${ts.toString().slice(-5)}2@s.whatsapp.net`;
builderMemory.buildContextInjection(testChatId2, 'Enakku middle plot irukku');
const prof2 = builderMemory.getProfile(testChatId2);
assert.strictEqual(prof2.plot_type, 'middle_plot', 'Should detect middle_plot');
console.log('✅ [PASS] Middle plot detected accurately\n');

// 2. Test Context Injection for Civil Engineering Consultation
console.log('--- Test 2: Civil Engineering Context Injection ---');
const testChatId3 = `9198421${ts.toString().slice(-5)}3@s.whatsapp.net`;
const inj3 = builderMemory.buildContextInjection(testChatId3, '784 sqft plot la setback evvalavu vidanum?');
assert(inj3.includes('CIVIL ENGINEERING CONSULTATION DIRECTIVE (PLOT TYPES, SETBACKS, OTS DUCT & DRAINAGE)'), 'Should contain civil engineering directive');
assert(inj3.includes('Corner Plot-ஆ (இரண்டு பக்கம் ரோடு) அல்லது Middle Plot-ஆ (ஒரு பக்கம் ரோடு)'), 'Should contain discovery question');
assert(inj3.includes('OTS (Open to Sky) Duct'), 'Should explain OTS Duct');
assert(inj3.includes('Underground Drainage (UGD)'), 'Should mention UGD drainage');
assert(inj3.includes('NEVER repeat "Site Visit ஏற்பாடு செய்யலாமா சார்?" nakedly'), 'Should prohibit robotic repetition');
console.log('✅ [PASS] Context injection contains full civil engineering & setback guidance\n');

// 3. Test Tamil Text Sanitizer (Zero Sinhala / Corrupted text)
console.log('--- Test 3: Tamil Text Sanitizer (Anti-Sinhala / Clean Tamil) ---');
const corruptedText1 = 'Setback (இடைவெளி) ந\u0DD2\u0DBAமங்களின்படி, வீட்டைச் சுற்றி உரிய இடங்களை விட்டுவிட்டுத்தான் கட்ட வேண்டும்.';
const cleaned1 = gemini.sanitizeTamilText(corruptedText1);
assert(!cleaned1.includes('\u0DD2'), 'Should not contain Sinhala vowel sign');
assert(!cleaned1.includes('\u0DBA'), 'Should not contain Sinhala ya');
assert(cleaned1.includes('விதிமுறைகளின்படி'), 'Should convert to proper Tamil விதிமுறைகளின்படி');
console.log('Cleaned 1:', cleaned1);

const corruptedText2 = 'மாநகராட்சி நியமங்களின்படி மற்றும் Setback';
const cleaned2 = gemini.sanitizeTamilText(corruptedText2);
assert(cleaned2.includes('மாநகராட்சி விதிமுறைகளின்படி மற்றும் Setback'), 'Should convert நியமங்களின்படி to விதிமுறைகளின்படி');
console.log('Cleaned 2:', cleaned2);

const malayalamMixed = 'வீடு கட்டும் திட்டம் മലയാളം மற்றும் Floor Plan';
const cleaned3 = gemini.sanitizeTamilText(malayalamMixed);
assert(!/[\u0D00-\u0D7F]/.test(cleaned3), 'Should remove any Malayalam glyphs');
console.log('Cleaned 3:', cleaned3);
console.log('✅ [PASS] Tamil response sanitizer cleans Sinhala/Malayalam glyphs deterministically\n');

// 4. Test System Prompt Section 16
console.log('--- Test 4: System Prompt Section 16 Validation ---');
const sysPrompt = buildBuilderSystemPrompt();
assert(sysPrompt.includes('16. CIVIL ENGINEERING CONSULTATION: PLOT TYPES (CORNER VS MIDDLE), CORPORATION SETBACKS, OTS DUCT & DRAINAGE'));
assert(sysPrompt.includes('Corner Plot (கார்னர் பிளாட்)'));
assert(sysPrompt.includes('Middle Plot (மிடில் பிளாட் / இடைநிலை பிளாட்)'));
assert(sysPrompt.includes('OTS (Open to Sky) Duct / Plumbing Shaft'));
assert(sysPrompt.includes('Underground Drainage (UGD)'));
assert(sysPrompt.includes('Plinth Height'));
console.log('✅ [PASS] System prompt contains Section 16 Civil Engineering Consultation Playbook\n');

console.log('🎉🎉 ALL CIVIL ENGINEERING & SETBACK TESTS PASSED PERFECTLY! 🎉🎉');
