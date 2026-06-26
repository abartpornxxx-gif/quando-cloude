import { callAI } from './lib/ai/client';

process.env.OPENROUTER_API_KEY = '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';

async function test() {
  try {
    console.log('Testing OpenRouter...');
    const response = await callAI('Sei un test', 'Rispondi ciao');
    console.log('SUCCESS:', response);
  } catch (err: any) {
    console.error('ERROR:', err.message);
  }
}

test();
