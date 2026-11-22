/**
 * Test script for Personal Finance & Budget Tracker Persona
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const GeminiService = require('./geminiService');
const personaManager = require('./personaManager');
const { callBudgetTrackerMcp } = require('./financePersona');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING PERSONAL FINANCE & BUDGET TRACKER PERSONA');
  console.log('====================================================\n');

  // Test 1: Direct MCP Connectivity
  console.log('--- TEST 1: Direct MCP Connectivity Check ---');
  const balanceRes = await callBudgetTrackerMcp('get_balances', {});
  console.log('MCP get_balances status:', balanceRes.status);
  if (balanceRes.status !== 'success') {
    console.error('Failed to connect to MCP:', balanceRes.error);
    return;
  }
  console.log('✅ MCP Connected successfully!\n');

  // Test 2: Switch Persona to Finance
  console.log('--- TEST 2: Persona Switching ---');
  personaManager.setMode('finance', 'test_runner');
  console.log('Active persona:', personaManager.getActiveMode());
  console.log('Persona info:', personaManager.getPersonaDetails().name);
  console.log('✅ Persona switched to finance!\n');

  // Test 3: Gemini Chat Simulation
  console.log('--- TEST 3: Gemini Chat with Finance Persona ---');
  const gemini = new GeminiService();
  const testChatId = 'test_finance_user_999@s.whatsapp.net';

  // Scenario A: Add Expense via Text
  console.log('\n[Scenario A]: User sends "Tea kudichen ₹20 cash"');
  try {
    const replyA = await gemini.generateResponse(testChatId, 'Tea kudichen ₹20 cash');
    console.log('🤖 AI Reply:\n', replyA);
  } catch (err) {
    console.error('Error in Scenario A:', err);
  }

  // Scenario B: Query Balance
  console.log('\n[Scenario B]: User asks "Balance evlo irukku?"');
  try {
    const replyB = await gemini.generateResponse(testChatId, 'Balance evlo irukku?');
    console.log('🤖 AI Reply:\n', replyB);
  } catch (err) {
    console.error('Error in Scenario B:', err);
  }

  // Scenario C: Ambiguous query where amount is missing
  console.log('\n[Scenario C]: User says "Hotel-la sapten" (Missing amount & mode)');
  try {
    const replyC = await gemini.generateResponse(testChatId, 'Hotel-la sapten');
    console.log('🤖 AI Reply:\n', replyC);
  } catch (err) {
    console.error('Error in Scenario C:', err);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL TESTS COMPLETED');
  console.log('====================================================');
}

runTests();
