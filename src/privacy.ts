import { scrub } from '@nanocollective/prompt-scrub';

export function scrubPrompt(prompt: string, provider: string): string {
  if (provider.toLowerCase() === 'ollama') {
    // Local providers do not need scrubbing because data never leaves the machine.
    return prompt;
  }
  
  // Use Nano Collective's prompt-scrub to replace sensitive data with placeholders
  const result = scrub({ content: prompt });
  return result.scrubbedContent as string;
}
