# 🤖 AI Providers Configuration Guide

The Ultimate Excel MCP Server supports multiple AI providers! Users can connect their preferred AI service or use multiple providers with automatic fallback.

## 🎯 Supported Providers

### 1. **Anthropic Claude** 🧠
- **Models**: Claude Opus 4, Claude Sonnet 4, Claude Sonnet 3.7, Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Latest**: Claude Opus 4 🚀 (Top SWE-bench: 79.4%), Claude Sonnet 4 (80.2% SWE-bench)
- **Best for**: Agentic coding (72.5% SWE-bench), graduate-level reasoning (83.3% GPQA), complex analysis
- **Benchmarks**: #1 in terminal coding (50.0%), visual reasoning (76.5%), multilingual Q&A (88.8%)
- **Setup**: Get API key from [console.anthropic.com](https://console.anthropic.com)

### 2. **OpenAI GPT** ⚡
- **Models**: OpenAI o3 🚀, GPT-4.1, GPT-4o, o1-preview, o1-mini, GPT-4o-mini
- **Latest**: OpenAI o3 (83.3% GPQA Diamond, 88.9% AIME math), GPT-4.1 (enhanced capabilities)
- **Best for**: Advanced reasoning (o3), visual tasks (82.9% MMMU), high-school math (88.9% AIME)
- **Benchmarks**: Leading in graduate reasoning and math competitions
- **Setup**: Get API key from [platform.openai.com](https://platform.openai.com)

### 3. **Google Gemini** 🌟
- **Models**: Gemini 2.5 Pro Preview (05-06), Gemini 2.0 Flash, Gemini 1.5 Pro
- **Latest**: Gemini 2.5 Pro 🚀 (83.0% GPQA Diamond, 79.6% MMMU visual reasoning)
- **Best for**: Visual reasoning, multimodal tasks, fast responses, coding assistance
- **Benchmarks**: Strong in graduate reasoning (83.0%) and visual understanding (79.6%)
- **Setup**: Get API key from [console.cloud.google.com](https://console.cloud.google.com)

### 4. **DeepSeek** 💰
- **Models**: DeepSeek-V3, DeepSeek-Chat, DeepSeek-Coder-V2, DeepSeek-Math, DeepSeek-Reasoner
- **Latest**: DeepSeek-V3 (most capable), DeepSeek-Reasoner (reasoning specialist)
- **Best for**: Cost-effective, specialized models, coding, math reasoning
- **Benchmarks**: Excellent value with competitive performance at 90% lower cost
- **Setup**: Get API key from [platform.deepseek.com](https://platform.deepseek.com)

### 5. **Local Fallback** 🔧
- **Always available**: Pattern-matching based responses
- **Best for**: Offline use, basic formula generation
- **Setup**: No configuration needed

## ⚙️ Configuration Methods

### Method 1: Environment Variables (Recommended)

Set environment variables for your preferred providers:

```bash
# Anthropic Claude (🚀 LATEST 2025)
export ANTHROPIC_API_KEY="your-anthropic-key"
export ANTHROPIC_MODEL="claude-sonnet-4"  # or "claude-opus-4" for maximum capability

# OpenAI GPT (🚀 LATEST 2025)
export OPENAI_API_KEY="your-openai-key"
export OPENAI_MODEL="gpt-4.1"  # or "o3" for advanced reasoning
export OPENAI_BASE_URL="https://api.openai.com/v1"  # optional

# Google Gemini (🌟 NEW)
export GEMINI_API_KEY="your-gemini-key"
export GEMINI_MODEL="gemini-2.5-pro"  # latest and most capable
export GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1"  # optional

# DeepSeek (💰 COST-EFFECTIVE)
export DEEPSEEK_API_KEY="your-deepseek-key"
export DEEPSEEK_MODEL="deepseek-v3"  # latest and most capable
export DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"  # optional
```

### Method 2: Claude Desktop Config

Add AI provider settings to your Claude Desktop config:

```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "node",
      "args": ["C:\\\\path\\\\to\\\\excel-csv-mcp\\\\dist\\\\index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-key",
        "OPENAI_API_KEY": "your-openai-key",
        "DEEPSEEK_API_KEY": "your-deepseek-key"
      }
    }
  }
}
```

### Method 3: Runtime Configuration

Configure providers programmatically:

```javascript
import { NLPProcessor } from './ai/nlp-processor';

const nlp = new NLPProcessor({
  providers: [
    {
      type: 'anthropic',
      config: { 
        apiKey: 'your-key',
        model: 'claude-3-haiku-20240307'
      },
      priority: 3  // Higher priority = used first
    },
    {
      type: 'openai',
      config: { 
        apiKey: 'your-key',
        model: 'gpt-4o-mini'
      },
      priority: 2
    },
    {
      type: 'deepseek',
      config: { 
        apiKey: 'your-key',
        model: 'deepseek-chat'
      },
      priority: 1
    }
  ],
  fallbackToLocal: true,
  enableProviderSwitching: true
});
```

## 🔄 Provider Features

### **Automatic Fallback**
If your primary provider fails, the system automatically tries backup providers:
```
Anthropic (fails) → OpenAI → DeepSeek → Local Fallback
```

### **Provider Switching**
Switch providers on-demand:
```javascript
// Check available providers
const providers = nlp.getAvailableProviders();

// Switch to a specific provider
await nlp.switchProvider('deepseek');

// Use a provider for one request
await nlp.parseCommand("sum column A", context, 'openai');
```

### **Health Monitoring**
Test all providers:
```javascript
const status = await nlp.testProviders();
console.log(status);
// [
//   { type: 'anthropic', name: 'Anthropic', working: true },
//   { type: 'openai', name: 'OpenAI', working: false },
//   { type: 'local', name: 'Local', working: true }
// ]
```

## 💰 Cost Optimization

### **Provider Priority by Cost** (cheapest first - 2025 pricing)
1. **Local** - Free (pattern matching)
2. **DeepSeek-V3** - ~$0.14/$0.28 per 1M tokens (90% cheaper!) 🏆
3. **Gemini 2.0 Flash** - $0.075/$0.30 per 1M tokens (super fast)
4. **OpenAI GPT-4o-mini** - $0.15/$0.60 per 1M tokens
5. **Gemini 2.5 Pro** - $1.25/$5.00 per 1M tokens
6. **OpenAI GPT-4.1** - $2.50/$10.00 per 1M tokens
7. **OpenAI o3** - $15/$60 per 1M tokens (premium reasoning)
8. **Claude Sonnet 4** - $3/$15 per 1M tokens
9. **Claude Opus 4** - $15/$75 per 1M tokens (maximum capability)

### **Smart Usage Strategy**
```javascript
// Cost-optimized configuration
const config = {
  providers: [
    { type: 'local', priority: 5 },        // Try free first
    { type: 'deepseek', priority: 4 },     // Then cheapest AI
    { type: 'openai', priority: 3 },       // Mid-tier for complex tasks
    { type: 'anthropic', priority: 2 }     // Premium for hardest problems
  ]
};
```

## 🚀 Quick Setup Examples

### **Claude Desktop Users**
1. Get an API key from any provider
2. Add to your config file:
```json
{
  "mcpServers": {
    "excel-csv": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

### **Cost-Conscious Users**
Use DeepSeek for best value:
```bash
export DEEPSEEK_API_KEY="your-deepseek-key"
# All AI features for ~90% less cost than GPT-4
```

### **Performance Users**
Use multiple providers with fallback:
```bash
export ANTHROPIC_API_KEY="primary-key"
export OPENAI_API_KEY="backup-key"
export DEEPSEEK_API_KEY="budget-key"
# Automatic failover + cost optimization
```

### **Offline Users**
No setup needed! Local fallback always works:
- Basic formula generation
- Pattern-based responses
- No internet required

## 🛠️ Troubleshooting

### Provider Not Working?
```javascript
// Test specific provider
const result = await nlp.testProviders();
console.log(result);

// Check active provider
const active = nlp.getActiveProvider();
console.log('Current provider:', active);
```

### API Key Issues?
- Verify key is correct
- Check API quotas/billing
- Ensure key has proper permissions

### Want Better Responses?
- Try Anthropic for complex reasoning
- Use OpenAI for speed
- DeepSeek for coding tasks
- Local for basic operations

## 🎯 Recommendations

### **For Most Users**: OpenAI GPT-4o-mini
- Good balance of cost/performance
- Fast responses
- Widely supported

### **For Power Users**: Anthropic Claude + OpenAI fallback
- Best reasoning for complex formulas
- Reliable backup system

### **For Budget Users**: DeepSeek + Local fallback
- 90% cost savings
- Still gets AI benefits
- Free offline mode

### **For Enterprise**: All providers configured
- Maximum reliability
- Cost optimization
- Provider diversity

Start with one provider and add more as needed!