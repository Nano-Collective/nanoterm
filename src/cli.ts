import { Command } from 'commander';
import { generateCommand } from './generate.js';
import { promptApproval } from './approval.js';
import { executeCommand } from './execute.js';

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
          try {
            const exitCode = await executeCommand(approvedCommand);
            process.exit(exitCode);
          } catch (execErr: any) {
            console.error(`\nExecution failed: ${execErr.message}`);
            process.exit(1);
          }
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
