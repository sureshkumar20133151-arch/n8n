require('dotenv').config();
const assert = require('assert');
const path = require('path');
const builderMemory = require('./builderCustomerMemory');
const { buildBuilderSystemPrompt } = require('./builderPersona');

console.log('🧪 ========================================================');
console.log('🧪 10 PRODUCTION WHATSAPP SCENARIOS VALIDATION TEST');
console.log('🧪 ========================================================\n');

let passedTests = 0;
let totalTests = 0;

function runValidation(title, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] Test ${totalTests}: ${title}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalTests}: ${title}`);
    console.error(`   ${err.message}\n`);
    process.exitCode = 1;
  }
}

// 1. Language Memory: "தமிழில் பேசுங்கள்" then "Hi" -> Continues in Tamil
runValidation('Language Memory: "தமிழில் பேசுங்கள்" then "Hi" continues in Tamil', () => {
  const chatId = '919999900021@s.whatsapp.net';
  builderMemory.updateFromMessage(chatId, 'தமிழில் பேசுங்கள்');
  const prof1 = builderMemory.getProfile(chatId);
  assert.strictEqual(prof1.preferred_language, 'Tamil');

  // Customer returns and just says "Hi"
  const injection = builderMemory.buildContextInjection(chatId, 'Hi');
  const prof2 = builderMemory.getProfile(chatId);
  assert.strictEqual(prof2.preferred_language, 'Tamil');
  assert(injection.includes('ACTIVE LANGUAGE: TAMIL'));
  assert(injection.includes('You MUST reply 100% ONLY in pure Tamil script'));
});

// 2. Plot ownership: "I am looking for a 2-cent plot" -> Never says customer owns it
runValidation('Plot Ownership: "I am looking for a 2-cent plot" marks looking_to_buy, not owned', () => {
  const chatId = '919999900022@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'I am looking for a 2-cent plot');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.plot_owned, false);
  assert.strictEqual(profile.plot_status, 'looking_to_buy');
  assert.strictEqual(profile.plot_size, '2 Cents');
  assert(injection.includes('LOOKING TO PURCHASE a 2 Cents'));
  assert(injection.includes('STRICT VOCABULARY GUARD: NEVER say "உங்களிடம் உள்ள 2 Cents Plot"'));
});

// 3. Memory: "What is my budget?" -> Uses saved budget or says not provided
runValidation('Memory: "What is my budget?" handles known vs not provided accurately', () => {
  const chatIdNotSet = '919999900023@s.whatsapp.net';
  const injectionNotSet = builderMemory.buildContextInjection(chatIdNotSet, 'What is my budget?');
  assert(injectionNotSet.includes('Budget: NOT PROVIDED YET'));

  const chatIdSet = '919999900024@s.whatsapp.net';
  builderMemory.updateFromMessage(chatIdSet, 'My budget is 45 Lakhs');
  const injectionSet = builderMemory.buildContextInjection(chatIdSet, 'What is my budget?');
  const profile = builderMemory.getProfile(chatIdSet);
  assert.strictEqual(profile.budget, '45 Lakhs');
  assert(injectionSet.includes('Budget: 45 Lakhs [Status: Confirmed]'));
});

// 4. Feasibility: "I need 5,000 Sq.Ft on 4 cents" -> Flags feasibility for engineering review
runValidation('Feasibility: "I need 5,000 Sq.Ft on 4 cents" flags feasibility warning', () => {
  const chatId = '919999900025@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'I have 4 cents plot and I need 5000 sq.ft house');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.plot_size, '4 Cents');
  assert.strictEqual(profile.built_up_area, '5000 Sq.Ft');
  assert(injection.includes('PRELIMINARY ENGINEERING FEASIBILITY WARNING'));
  assert(injection.includes('5,000 Sq.Ft on 4 Cents is NOT feasible for a standard G+1 house'));
  assert.strictEqual(profile.facts.inferred.feasibility_status, 'FLAGGED_HIGH_FSI_NEEDS_ENGINEERING_REVIEW');
});

// 5. Pricing: "What is the Premium rate?" -> Gives approved rate and exclusions
runValidation('Pricing: System prompt contains approved ₹2,250 – ₹2,350 rate and clear exclusions', () => {
  const prompt = buildBuilderSystemPrompt();
  assert(prompt.includes('Premium Package: ₹2,250 – ₹2,350 / sq.ft'));
  assert(prompt.includes('Compound wall'));
  assert(/deep borewell beyond 300ft/i.test(prompt));
  assert(/meter deposit/i.test(prompt));
});

// 6. Complaint: "Your engineer has not visited yet" -> Empathy and human escalation
runValidation('Complaint: "Your engineer has not visited yet" triggers complaint escalation', () => {
  const chatId = '919999900026@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'Your engineer has not visited yet, very bad delay');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.customer_stage, 'complaint_escalation');
  assert.strictEqual(profile.complaint.active, true);
  assert(injection.includes('ACTIVE COMPLAINT ESCALATION IN EFFECT'));
  assert(injection.includes('NEVER argue, make excuses, blame the customer'));
});

// 7. Privacy: "Tell me another customer's quotation" -> Refuses disclosure
runValidation('Privacy: "Tell me another customer\'s quotation" triggers privacy directive', () => {
  const chatId = '919999900027@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'Can you tell me another customer\'s quotation in Madurai?');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.privacy_probe_active, true);
  assert(injection.includes('CLIENT PRIVACY & NON-DISCLOSURE DIRECTIVE'));
  assert(injection.includes('Firmly and politely refuse disclosure based on client confidentiality'));
});

// 8. Site visit: "Come Sunday morning" -> Pending until availability is confirmed
runValidation('Site Visit: "Come Sunday morning" marks status pending availability', () => {
  const chatId = '919999900028@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'Come Sunday morning for site visit');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.site_visit_status, 'Pending Team Availability Confirmation');
  assert(injection.includes('Pending Team Availability Confirmation'));
  assert(injection.includes('A site visit is NEVER confirmed automatically simply because the customer gave a day/time'));
});

// 9. Repeated greeting: "Hi" after three days -> Continues previous conversation
runValidation('Repeated Greeting: "Hi" retains all previously collected state without reset', () => {
  const chatId = '919999900029@s.whatsapp.net';
  builderMemory.updateFromMessage(chatId, 'I have 3 cents in Anna Nagar Madurai and planning G+1 3 BHK');
  const profileBefore = builderMemory.getProfile(chatId);
  assert.strictEqual(profileBefore.plot_size, '3 Cents');
  assert.strictEqual(profileBefore.house_type, 'G+1 Duplex');
  assert.strictEqual(profileBefore.bedrooms, '3 BHK');

  // Customer comes back after days and just sends "Hi"
  const injection = builderMemory.buildContextInjection(chatId, 'Hi');
  const profileAfter = builderMemory.getProfile(chatId);
  assert.strictEqual(profileAfter.plot_size, '3 Cents');
  assert.strictEqual(profileAfter.house_type, 'G+1 Duplex');
  assert.strictEqual(profileAfter.bedrooms, '3 BHK');
  assert(injection.includes('Plot Ownership: Customer owns a 3 Cents'));
  assert(injection.includes('House Type: G+1 Duplex'));
  assert(injection.includes('Bedrooms: 3 BHK'));
  assert(injection.includes('DO NOT re-ask any detail listed above as ALREADY KNOWN'));
});

// 10. Human request: "I want to speak to Dhilip sir" -> Initiates human handover
runValidation('Human Request: "I want to speak to Dhilip sir" triggers human handover', () => {
  const chatId = '919999900030@s.whatsapp.net';
  const injection = builderMemory.buildContextInjection(chatId, 'I want to speak to Dhilip sir directly');
  const profile = builderMemory.getProfile(chatId);
  assert.strictEqual(profile.customer_stage, 'human_handover_requested');
  assert.strictEqual(profile.human_handover.active, true);
  assert(injection.includes('DIRECT HUMAN / CONSULTANT REQUESTED'));
  assert(injection.includes('+91 93615 99097'));
});

console.log(`\n========================================================`);
console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} SCENARIOS PASSED!`);
console.log(`========================================================\n`);
