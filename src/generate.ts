import { generateText } from 'ai';
import { getEnvironmentContext } from './env.js';
import { loadConfig } from './config.js';
import { getProviderModel } from './provider.js';
import { buildSystemPrompt, buildExplainPrompt } from './prompt.js';

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

export async function explainCommand(command: string): Promise<string> {
  const config = loadConfig();
  const model = getProviderModel(config.provider, config.model);
  const systemPrompt = buildExplainPrompt();

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `Explain this command:\n${command}`,
  });

  return text.trim();
}
