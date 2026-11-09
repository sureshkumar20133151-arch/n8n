const assert = require('assert');
const path = require('path');
const personaManager = require('./personaManager');
const {
  BUILDER_TOOLS,
  BUILDER_PROFILE,
  buildBuilderSystemPrompt,
  executeBuilderToolCall
} = require('./builderPersona');

console.log('🧪 ========================================================');
console.log('🧪 TEST SUITE: BUILDER PERSONA & AI AGENT MODULE');
console.log('🧪 ========================================================\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// 1. Test personaManager registration
runTest('PersonaManager registers builder persona with icon and details', () => {
  const details = personaManager.getPersonaDetails('builder');
  assert.strictEqual(details.id, 'builder');
  assert.strictEqual(details.icon, '🏗️');
  assert(details.name.includes('Danam Holdings'));
  assert(details.switchMessage.includes('House Construction'));
});

// 2. Test tools structure
runTest('BUILDER_TOOLS declares 4 tools for Gemini', () => {
  assert(Array.isArray(BUILDER_TOOLS) && BUILDER_TOOLS.length > 0);
  const fns = BUILDER_TOOLS[0].functionDeclarations;
  assert.strictEqual(fns.length, 4);
  const names = fns.map(f => f.name);
  assert(names.includes('calculatePreliminaryEstimate'));
  assert(names.includes('saveConstructionEnquiry'));
  assert(names.includes('requestSiteVisitOrConsultation'));
  assert(names.includes('getProjectPortfolio'));
});

// 3. Test System Prompt generation
runTest('buildBuilderSystemPrompt generates comprehensive prompt', () => {
  const prompt = buildBuilderSystemPrompt();
  assert(prompt.includes(BUILDER_PROFILE.companyName));
  assert(prompt.includes('Standard Package: ₹1,850 – ₹1,950 / sq.ft'));
  assert(prompt.includes('Premium Package: ₹2,250 – ₹2,350 / sq.ft'));
  assert(prompt.includes('Elite Luxury Villa Package: ₹2,750 – ₹2,950 / sq.ft'));
  assert(prompt.includes('Ocean Peacock SR Villa'));
  assert(prompt.includes('Tanglish'));
});

// 4. Test calculatePreliminaryEstimate execution
(async () => {
  try {
    console.log('Testing async tool executions...');
    
    // Estimate 1500 sq.ft Premium
    const estRes = await executeBuilderToolCall({
      name: 'calculatePreliminaryEstimate',
      args: {
        builtUpAreaSqFt: 1500,
        floors: 'G+1',
        packageType: 'premium',
        location: 'Madurai'
      }
    }, '919361599097@s.whatsapp.net');

    assert.strictEqual(estRes.status, 'success');
    assert.strictEqual(estRes.builtUpArea, '1500 Sq.Ft');
    assert(estRes.estimatedCostRange.includes('Lakhs'));
    console.log(`✅ [PASS] calculatePreliminaryEstimate: 1,500 sq.ft = ${estRes.estimatedCostRange}`);

    // Save Construction Enquiry
    const enqRes = await executeBuilderToolCall({
      name: 'saveConstructionEnquiry',
      args: {
        customerName: 'Karthik Raja',
        customerPhone: '+91 98401 23456',
        siteLocation: 'Selvapuram, Madurai',
        hasPlot: true,
        plotDimensions: '30x40 (1200 sq.ft)',
        builtUpAreaSqFt: 1800,
        floors: 'G+1',
        bedrooms: '3 BHK',
        approxBudget: '₹40 - ₹45 Lakhs',
        preferredPackage: 'premium',
        startingTimeline: 'Next month',
        specialRequirements: 'North-facing Vastu & 3D exterior plan'
      }
    }, '919840123456@s.whatsapp.net');

    assert.strictEqual(enqRes.status, 'enquiry_saved');
    assert(enqRes.enquiryId.startsWith('ENQ-'));
    console.log(`✅ [PASS] saveConstructionEnquiry: created ${enqRes.enquiryId}`);

    // Request Site Visit
    const visitRes = await executeBuilderToolCall({
      name: 'requestSiteVisitOrConsultation',
      args: {
        customerName: 'Karthik Raja',
        customerPhone: '+91 98401 23456',
        siteLocation: 'Selvapuram, Madurai (near EB Substation)',
        preferredDate: 'Tomorrow',
        preferredTimeSlot: '11:00 AM'
      }
    }, '919840123456@s.whatsapp.net');

    assert.strictEqual(visitRes.status, 'site_visit_scheduled');
    assert(visitRes.visitId.startsWith('VISIT-'));
    console.log(`✅ [PASS] requestSiteVisitOrConsultation: scheduled ${visitRes.visitId}`);

    // Get Project Portfolio
    const portRes = await executeBuilderToolCall({
      name: 'getProjectPortfolio',
      args: { category: 'all' }
    });

    assert.strictEqual(portRes.status, 'success');
    assert(portRes.totalProjects >= 3);
    console.log(`✅ [PASS] getProjectPortfolio: retrieved ${portRes.totalProjects} verified projects`);

    console.log('\n🎉 ALL BUILDER PERSONA TESTS PASSED!');
  } catch (err) {
    console.error('❌ Async Test Error:', err);
    process.exit(1);
  }
})();
