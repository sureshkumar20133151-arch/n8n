const assert = require('assert');
const path = require('path');
const builderMemory = require('./builderCustomerMemory');
const { buildBuilderSystemPrompt } = require('./builderPersona');

console.log('🧪 ========================================================');
console.log('🧪 VERIFYING NEW DANAM HOLDINGS BUILDER FEATURES');
console.log('🧪 ========================================================\n');

const ts = Date.now();

// 1. Test Default Language is Tamil from Turn 1 (even with English input)
console.log('--- Test 1: Tamil by Default ---');
const testChatId1 = `9198421${ts.toString().slice(-5)}1@s.whatsapp.net`;
const inj1 = builderMemory.buildContextInjection(testChatId1, 'Hi, I need to build a house');
const prof1 = builderMemory.getProfile(testChatId1);
assert.strictEqual(prof1.preferred_language, 'Tamil', 'Default language must be Tamil');
assert(inj1.includes('ACTIVE LANGUAGE: TAMIL (MANDATORY DEFAULT FOR DANAM HOLDINGS)'), 'Context must mandate Tamil');
assert(inj1.includes('Even if customer inputs short English words like "Hi", "Villapuram", "3bhk", "20lakh", you MUST reply in Tamil!'));
console.log('✅ [PASS] Default language is strictly Tamil from message 1\n');

// 2. Test Madurai Landmark Validation for Villapuram
console.log('--- Test 2: Landmark Validation for Villapuram ---');
const testChatId2 = `9198421${ts.toString().slice(-5)}2@s.whatsapp.net`;
builderMemory.buildContextInjection(testChatId2, '3bhk');
const inj2 = builderMemory.buildContextInjection(testChatId2, 'Villapuram');
const prof2 = builderMemory.getProfile(testChatId2);
assert.strictEqual(prof2.location, 'Villapuram, Madurai');
assert(inj2.includes('MANDATORY LOCAL REAL-PROOF LANDMARK VALIDATION'));
assert(inj2.includes('Vetri Theater'));
console.log('✅ [PASS] Villapuram triggers Vetri Theater / Housing Board landmark validation\n');

// 3. Test Madurai Landmark Validation for Goripalayam
console.log('--- Test 3: Landmark Validation for Goripalayam ---');
const testChatId3 = `9198421${ts.toString().slice(-5)}3@s.whatsapp.net`;
const inj3 = builderMemory.buildContextInjection(testChatId3, 'Goripalayam la plot irukku');
const prof3 = builderMemory.getProfile(testChatId3);
assert.strictEqual(prof3.location, 'Goripalayam, Madurai');
assert(inj3.includes('MANDATORY LOCAL REAL-PROOF LANDMARK VALIDATION'));
assert(inj3.includes('Thevar Silai'));
console.log('✅ [PASS] Goripalayam triggers Thevar Silai / GH landmark validation\n');

// 4. Test Social Media Reel Link & Comment Section Anti-Hallucination
console.log('--- Test 4: Social Media Link & Comment Section Anti-Hallucination ---');
const testChatId4 = `9198421${ts.toString().slice(-5)}4@s.whatsapp.net`;
const inj4 = builderMemory.buildContextInjection(testChatId4, 'https://www.facebook.com/share/r/1KQrjzuvoA/');
const prof4 = builderMemory.getProfile(testChatId4);
assert.strictEqual(prof4.social_link_shared, true);
assert(inj4.includes('SOCIAL MEDIA LINK / COMMENT SECTION HANDLING DIRECTIVE (STRICT ZERO-HALLUCINATION)'));

const inj5 = builderMemory.buildContextInjection(testChatId4, 'Comment section paru');
assert.strictEqual(prof4.comment_check_requested, true);
assert(inj5.includes('NEVER HALLUCINATE OR CLAIM THAT YOU WATCHED THE VIDEO OR READ COMMENTS ON FACEBOOK/INSTAGRAM'));
assert(inj5.includes('வாட்ஸ்அப் வழியாக AI-யால் அங்குள்ள நேரடி கமெண்ட்களைப் (Comments) படிக்க இயலாது சார்'));
console.log('✅ [PASS] Zero-hallucination directive triggered for Facebook link & "Comment section paru"\n');

// 5. System Prompt validation
console.log('--- Test 5: System Prompt Validation ---');
const sysPrompt = buildBuilderSystemPrompt();
assert(sysPrompt.includes('ALWAYS SPEAK IN TAMIL BY DEFAULT'));
assert(sysPrompt.includes('MANDATORY MADURAI LANDMARK VALIDATION PLAYBOOK'));
assert(sysPrompt.includes('Vetri Theater'));
assert(sysPrompt.includes('Thevar Silai'));
assert(sysPrompt.includes('SOCIAL MEDIA REELS, FACEBOOK & INSTAGRAM LINKS (ZERO-HALLUCINATION PROTOCOL)'));
console.log('✅ [PASS] System prompt contains all required behavior directives\n');

console.log('🎉🎉 ALL NEW DANAM HOLDINGS FEATURES VERIFIED SUCCESSFULLY! 🎉🎉');
