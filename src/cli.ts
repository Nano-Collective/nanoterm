import { Command } from 'commander';
import { generateCommand } from './generate.js';
import { promptApproval } from './approval.js';

export async function runCLI(args: string[]) {
  const program = new Command();

  program
    .name('nanoterm')
    .description('An ultra-lightweight AI terminal companion')
    .argument('<request>', 'The natural language request for a shell command')
    .action(async (request: string) => {
      try {
        const command = await generateCommand(request);
        console.log(`\nProposed command:\n> ${command}`);

        const approvedCommand = await promptApproval(command);

        if (approvedCommand) {
          console.log(`\nCommand approved. Execution coming in Phase 3!`);
          process.exit(0);
        } else {
          console.log(`\nAborted.`);
          process.exit(0);
        }
      } catch (error: any) {
        console.error(`\nError generating command: ${error.message}\n`);
        process.exit(1);
      }
    });

  program.parse(args);
}
