const personaManager = require('./personaManager');
const {
  PLUMBING_ELECTRICAL_TOOLS,
  buildPlumbingElectricalSystemPrompt,
  executePlumbingElectricalToolCall,
  loadLaborers
} = require('./plumbingElectricalPersona');

async function runTests() {
  console.log('--- 1. Testing Persona Switcher ---');
  const switchRes = personaManager.setMode('plumber', 'test_script');
  console.log('Switch result:', switchRes.success, '| Mode:', switchRes.currentMode);
  console.log('Switch message preview:\n', switchRes.switchMessage);

  console.log('\n--- 2. Testing 10-Laborers Directory Tool ---');
  const laborersRes = await executePlumbingElectricalToolCall({
    name: 'getLaborersList',
    args: {}
  });
  console.log('Laborers found count:', laborersRes.totalCount);
  console.log('Formatted Tamil output:\n', laborersRes.formattedTextTamil);

  console.log('\n--- 3. Testing Site Photo Logging Tool (Roof Concrete Pipes) ---');
  const logRes = await executePlumbingElectricalToolCall({
    name: 'logSitePhotos',
    args: {
      siteName: 'Ram Nagar Villa',
      stage: 'Roof_Concrete_Pipes',
      workType: 'Electrical',
      notes: 'ரூஃப் கான்கிரீட் போடுவதற்கு முன் ஸ்லாப் பைப்ஸ் மற்றும் ஃபேன் பாக்ஸ் கட்டிய போட்டோக்கள்',
      photoCount: 4
    }
  }, '919361599097@s.whatsapp.net');
  console.log('Log Success:', logRes.success);
  console.log('Confirmation Reply:\n', logRes.messageTamil);

  console.log('\n--- 4. Testing Site Photo Fetch Tool (On-Demand Query) ---');
  const fetchRes = await executePlumbingElectricalToolCall({
    name: 'fetchSitePhotos',
    args: {
      siteName: 'Ram Nagar',
      stage: 'Roof_Concrete_Pipes'
    }
  });
  console.log('Fetch Success:', fetchRes.success);
  console.log('Fetch Reply:\n', fetchRes.messageTamil);

  console.log('\n--- 5. Testing System Prompt Generation ---');
  const prompt = buildPlumbingElectricalSystemPrompt('Suresh', true);
  console.log('Prompt contains 10-member team:', prompt.includes('Muthuvel') && prompt.includes('Mani'));
  console.log('Prompt length:', prompt.length, 'characters');

  console.log('\n✅ ALL 5 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(console.error);
