import { generateText } from 'ai';
import { getEnvironmentContext } from './env.js';
import { loadConfig } from './config.js';
import { getProviderModel } from './provider.js';
import { buildSystemPrompt } from './prompt.js';

export async function generateCommand(request: string): Promise<string> {
  const env = getEnvironmentContext();
  const config = loadConfig();
  const model = getProviderModel(config.provider, config.model);
  const systemPrompt = buildSystemPrompt(env);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: request,
  });

  return text.trim();
}
