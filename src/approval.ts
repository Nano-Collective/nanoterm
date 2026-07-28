import readline from 'readline';
import { explainCommand } from './generate.js';

export async function promptApproval(command: string): Promise<string | null> {
  let currentCommand = command;

  while (true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`\nExecute? [y/N/edit/?]: `, (ans) => {
        resolve(ans.trim());
      });
    });

    rl.close();

    const lowerAnswer = answer.toLowerCase();

    if (lowerAnswer === 'y' || lowerAnswer === 'yes') {
      return currentCommand;
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
