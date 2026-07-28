import { Command } from 'commander';
import { generateCommand } from './generate.js';

export async function runCLI(args: string[]) {
  const program = new Command();

  program
    .name('nanoterm')
    .description('An ultra-lightweight AI terminal companion')
    .argument('<request>', 'The natural language request for a shell command')
    .action(async (request: string) => {
      try {
        const command = await generateCommand(request);
        console.log(`\nProposed command:\n> ${command}\n`);
      } catch (error: any) {
        console.error(`\nError generating command: ${error.message}\n`);
        process.exit(1);
      }
    });

  program.parse(args);
}
