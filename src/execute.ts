import { spawn } from 'child_process';
import { saveSessionContext } from './session.js';

export async function executeCommand(command: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Detect the user's shell, fallback to /bin/sh
    const shell = process.env.SHELL || '/bin/sh';

    console.log(`\nExecuting: ${command}\n`);

    const child = spawn(shell, ['-c', command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
      process.stderr.write(data);
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('exit', (code) => {
      // Save session context before exiting
      saveSessionContext(command, stdoutData, stderrData);

      if (code === null) {
        // Process was terminated by a signal
        resolve(1);
      } else {
        resolve(code);
      }
    });
  });
}
