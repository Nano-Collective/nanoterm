import os from 'os';

export interface EnvironmentContext {
  osPlatform: string;
  osRelease: string;
  shell: string;
  cwd: string;
}

export function getEnvironmentContext(): EnvironmentContext {
  return {
    osPlatform: os.platform(),
    osRelease: os.release(),
    shell: process.env.SHELL || 'unknown',
    cwd: process.cwd(),
  };
}
