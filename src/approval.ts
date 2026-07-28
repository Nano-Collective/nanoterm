import readline from 'readline';
import { explainCommand } from './generate.js';
import { isDangerousCommand } from './safety.js';

export async function promptApproval(command: string): Promise<string | null> {
  let currentCommand = command;

  while (true) {
    const isDangerous = isDangerousCommand(currentCommand);

    if (isDangerous) {
      console.log(`\n\x1b[31;1m[WARNING] This command appears to be destructive.\x1b[0m`);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const promptText = isDangerous
      ? `Execute? Type 'yes' to confirm [yes/N/edit/?]: `
      : `Execute? [y/N/edit/?]: `;

    const answer = await new Promise<string>((resolve) => {
      rl.question(`\n${promptText}`, (ans) => {
        resolve(ans.trim());
      });
    });

    rl.close();

    const lowerAnswer = answer.toLowerCase();

    if ((!isDangerous && (lowerAnswer === 'y' || lowerAnswer === 'yes')) || 
        (isDangerous && lowerAnswer === 'yes')) {
      return currentCommand;
    } else if (isDangerous && lowerAnswer === 'y') {
      console.log(`\n\x1b[33mDestructive commands require typing the full word 'yes'.\x1b[0m`);
      // loop continues
    } else if (lowerAnswer === '?' || lowerAnswer === 'explain') {
      try {
        console.log(`\nAsking for explanation...`);
        const explanation = await explainCommand(currentCommand);
        console.log(`\nExplanation:\n${explanation}`);
      } catch (err: any) {
        console.error(`\nFailed to explain command: ${err.message}`);
      }
      // loop continues
    } else if (lowerAnswer === 'edit' || lowerAnswer === 'e') {
      currentCommand = await promptEdit(currentCommand);
      console.log(`\nProposed command:\n> ${currentCommand}`);
      // loop continues
    } else {
      // Default to No
      return null;
    }
  }
}

async function promptEdit(initialCommand: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`Edit command: `, (ans) => {
      rl.close();
      resolve(ans.trim());
    });

    // Write the initial command to the stream so the user can edit it
    rl.write(initialCommand);
  });
}
