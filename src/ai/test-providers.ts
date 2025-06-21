/**
 * Test Multi-Provider AI System
 */

import { AIManager, createAIManagerConfig } from './ai-manager';
import { NLPProcessor } from './nlp-processor';

async function testMultiProviderSystem(): Promise<void> {
  console.log('🧪 Testing Multi-Provider AI System...\n');

  // Test 1: Basic AI Manager
  console.log('📋 Test 1: AI Manager Configuration');
  const config = createAIManagerConfig();
  console.log('Auto-detected providers:', config.providers.map(p => p.type));

  const aiManager = new AIManager(config);
  await aiManager.initialize();

  const providers = aiManager.getAvailableProviders();
  console.log('\n🔧 Available providers:');
  providers.forEach(p => {
    console.log(`  ${p.ready ? '✅' : '❌'} ${p.name} (${p.type})`);
    console.log(`     Models: ${p.models.slice(0, 2).join(', ')}${p.models.length > 2 ? '...' : ''}`);
  });

  const activeProvider = aiManager.getActiveProvider();
  console.log(`\n🎯 Active provider: ${activeProvider?.name || 'None'}`);

  // Test 2: NLP Processor with multi-provider
  console.log('\n📋 Test 2: NLP Processor with Multi-Provider Support');
  const nlp = new NLPProcessor();

  const testQueries = [
    'sum all values in column A',
    'calculate average sales',
    'create a pivot table',
    'explain the formula =VLOOKUP(A1,B:C,2,FALSE)'
  ];

  for (const query of testQueries) {
    try {
      console.log(`\n🗣️ Query: "${query}"`);
      
      // Test with default provider
      const result = await nlp.parseCommand(query);
      console.log(`✅ Response type: ${result.type}, action: ${result.action}`);
      
      // Test formula building
      if (query.includes('sum') || query.includes('average')) {
        const formula = await nlp.buildFormula(query);
        console.log(`🔧 Generated formula: ${formula.formula}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }

  // Test 3: Provider switching
  console.log('\n📋 Test 3: Provider Switching');
  const availableProviders = nlp.getAvailableProviders();
  
  for (const provider of availableProviders) {
    if (provider.ready && provider.type !== 'local') {
      console.log(`\n🔄 Testing provider: ${provider.name}`);
      
      try {
        await nlp.switchProvider(provider.type);
        const result = await nlp.parseCommand('sum column A', undefined, provider.type);
        console.log(`✅ ${provider.name} working: ${result.type}/${result.action}`);
      } catch (error) {
        console.log(`❌ ${provider.name} failed: ${error}`);
      }
    }
  }

  // Test 4: Provider health check
  console.log('\n📋 Test 4: Provider Health Check');
  const healthStatus = await nlp.testProviders();
  
  console.log('\n🏥 Provider Health Status:');
  healthStatus.forEach(status => {
    console.log(`  ${status.working ? '🟢' : '🔴'} ${status.name}: ${status.working ? 'Healthy' : 'Unhealthy'}`);
  });

  // Test 5: Fallback chain
  console.log('\n📋 Test 5: Testing Fallback Chain');
  
  // This should always work because of local fallback
  try {
    const result = await nlp.parseCommand('sum all numbers');
    console.log(`✅ Fallback chain working: ${result.type}/${result.action}`);
    console.log(`🎯 Confidence: ${result.confidence}`);
  } catch (error) {
    console.log(`❌ Fallback chain failed: ${error}`);
  }

  console.log('\n🎉 Multi-Provider AI System Test Complete!');
}

// Configuration examples
export function showConfigurationExamples(): void {
  console.log('\n📚 Configuration Examples:\n');

  console.log('1️⃣ Environment Variables:');
  console.log('export ANTHROPIC_API_KEY="sk-ant-..."');
  console.log('export OPENAI_API_KEY="sk-..."');
  console.log('export DEEPSEEK_API_KEY="sk-..."');

  console.log('\n2️⃣ Custom Configuration:');
  console.log(`
const customConfig = {
  providers: [
    {
      type: 'anthropic',
      config: { apiKey: 'your-key', model: 'claude-3-haiku-20240307' },
      priority: 3
    },
    {
      type: 'openai', 
      config: { apiKey: 'your-key', model: 'gpt-4o-mini' },
      priority: 2
    },
    {
      type: 'deepseek',
      config: { apiKey: 'your-key', model: 'deepseek-chat' },
      priority: 1
    }
  ],
  fallbackToLocal: true,
  enableProviderSwitching: true
};

const nlp = new NLPProcessor(customConfig);
  `);

  console.log('\n3️⃣ Provider-Specific Requests:');
  console.log(`
// Use specific provider for one request
await nlp.parseCommand("sum column A", context, 'deepseek');
await nlp.buildFormula("calculate average", context, 'openai');
await nlp.explainFormula("=SUM(A:A)", 'anthropic');
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testMultiProviderSystem()
    .then(() => showConfigurationExamples())
    .catch(console.error);
}