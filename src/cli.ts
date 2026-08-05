import { Command } from "commander";
import { generateCommand } from "./generate.js";
import { promptApproval } from "./approval.js";
import { executeCommand } from "./execute.js";
import { loadConfig } from "./config.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
export async function runCLI(args: string[]) {
	const program = new Command();
	const config = loadConfig();

	program
		.name("nanoterm")
		.description("An ultra-lightweight AI terminal companion")
		.version(pkg.version)
		.allowUnknownOption()
		.enablePositionalOptions();

	program
		.command("config")
		.description("Run the interactive setup wizard to configure API keys")
		.action(async () => {
			const { runConfigWizard } = await import("./setup.js");
			await runConfigWizard();
		});

	program
		.argument(
			"[request...]",
			"The natural language request for a shell command",
		)
		.action(async (requestParts?: string[]) => {
			const request = requestParts?.join(" ");

			if (!request) {
				program.help();
				return;
			}

			try {
				const command = await generateCommand(request, config);
				if (command) {
					console.log(`\nProposed command:\n> ${command}`);
				}

				const approvedCommand = await promptApproval(command, config);

				if (approvedCommand) {
					try {
						const exitCode = await executeCommand(approvedCommand);
						process.exitCode = exitCode;
					} catch (execErr: unknown) {
						const msg =
							execErr instanceof Error ? execErr.message : String(execErr);
						console.error(`\nExecution failed: ${msg}`);
						process.exitCode = 1;
					}
				} else {
					console.log(`\nAborted.`);
					process.exitCode = 0;
				}
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				if (
					msg.toLowerCase().includes("api key") ||
					msg.toLowerCase().includes("unauthorized")
				) {
					console.error(
						`\n\x1b[31mNo API key configured for ${config.provider}.\x1b[0m`,
					);
					console.error(
						`\x1b[31mRun 'nanoterm config' to set up your provider.\x1b[0m\n`,
					);
				} else {
					console.error(`\n\x1b[31mError generating command: ${msg}\x1b[0m\n`);
				}
				process.exitCode = 1;
			}
		});

	program.parse(args);
}
