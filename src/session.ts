import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SessionContext {
  lastCommand: string;
  stdout: string;
  stderr: string;
}

const MAX_OUTPUT_LENGTH = 2000;

function getSessionFilePath(): string {
  // Use the parent shell process ID to scope the session to the current terminal tab
  const ppid = process.ppid;
  return path.join(os.tmpdir(), `nanoterm-session-${ppid}.json`);
}

export function saveSessionContext(command: string, stdout: string, stderr: string): void {
  try {
    const sessionFilePath = getSessionFilePath();
    
    // Truncate to the last N characters to avoid blowing up the LLM token limit
    const truncatedStdout = stdout.length > MAX_OUTPUT_LENGTH 
      ? '...' + stdout.slice(-MAX_OUTPUT_LENGTH) 
      : stdout;
      
    const truncatedStderr = stderr.length > MAX_OUTPUT_LENGTH 
      ? '...' + stderr.slice(-MAX_OUTPUT_LENGTH) 
      : stderr;

    const data: SessionContext = {
      lastCommand: command,
      stdout: truncatedStdout,
      stderr: truncatedStderr,
    };

    fs.writeFileSync(sessionFilePath, JSON.stringify(data), 'utf-8');
  } catch (err: any) {
    console.warn(`\n[WARN] Failed to save session context: ${err.message}`);
  }
}

export function loadSessionContext(): SessionContext | null {
  try {
    const sessionFilePath = getSessionFilePath();
    if (fs.existsSync(sessionFilePath)) {
      const data = fs.readFileSync(sessionFilePath, 'utf-8');
      return JSON.parse(data) as SessionContext;
    }
  } catch (err: any) {
    console.warn(`\n[WARN] Failed to load session context: ${err.message}`);
  }
  return null;
}
