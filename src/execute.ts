import { spawn } from 'child_process';

export async function executeCommand(command: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Detect the user's shell, fallback to /bin/sh
    const shell = process.env.SHELL || '/bin/sh';

    console.log(`\nExecuting: ${command}\n`);

    const child = spawn(shell, ['-c', command], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('exit', (code) => {
      if (code === null) {
        // Process was terminated by a signal
        resolve(1);
      } else {
        resolve(code);
      }
    });
  });
}
