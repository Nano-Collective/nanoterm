import fs from 'fs';
import path from 'path';
import os from 'os';

export interface NanotermConfig {
  provider: string;
  model: string;
}

export function loadConfig(): NanotermConfig {
  const configPaths = [
    process.env.NANOTERM_CONFIG_PATH,
    path.join(os.homedir(), '.config', 'nanocoder', 'agents.config.json'),
    path.join(os.homedir(), '.config', 'nanoterm', 'agents.config.json'),
    path.join(process.cwd(), 'agents.config.json'),
  ];

  for (const configPath of configPaths) {
    if (configPath && fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(fileContent);
        return {
          provider: config.provider || 'openai',
          model: config.model || 'gpt-4o',
        };
      } catch (err) {
        console.warn(`Failed to parse config at ${configPath}:`, err);
      }
    }
  }

  // Fallback defaults if no config is found
  return {
    provider: 'openai',
    model: 'gpt-4o',
  };
}
