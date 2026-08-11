import readline from "node:readline";
import { explainCommand } from "./generate.js";
import { isDangerousCommand } from "./safety.js";

import type { NanotermConfig } from "./config.js";

export async function promptApproval(
	command: string,
	config: NanotermConfig,
): Promise<string | null> {
	let currentCommand = command;

	while (true) {
		const severity = currentCommand
			? isDangerousCommand(currentCommand)
			: "safe";

		const isDestructive = severity === "destructive";
		const isCaution = severity === "caution";

		if (isDestructive) {
			console.log(
				`\n\x1b[31;1m[WARNING] This command appears to be destructive.\x1b[0m`,
			);
		} else if (isCaution) {
			console.log(
				`\n\x1b[33m[CAUTION] This command builds itself dynamically and can't be fully inspected.\x1b[0m`,
			);
		} else if (!currentCommand) {
			console.log(`\n\x1b[33m[WARNING] The command is empty.\x1b[0m`);
		}

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const promptText = isDestructive
			? `Execute? Type 'yes' to confirm [yes/N/edit/?]: `
			: !currentCommand
				? `Command is empty [edit/abort]: `
				: `Execute? [y/N/edit/?]: `;

		const answer = await new Promise<string>((resolve) => {
			rl.question(`\n${promptText}`, (ans: string) => {
				resolve(ans.trim());
			});
		});

		rl.close();

		const lowerAnswer = answer.toLowerCase();

		if (
			currentCommand &&
			((!isDestructive && (lowerAnswer === "y" || lowerAnswer === "yes")) ||
				(isDestructive && lowerAnswer === "yes"))
		) {
			return currentCommand;
		} else if (
			!currentCommand &&
			(lowerAnswer === "y" || lowerAnswer === "yes")
		) {
			console.log(
				`\n\x1b[33mCannot execute an empty command. Please edit or abort.\x1b[0m`,
			);
			// loop continues
		} else if (isDestructive && lowerAnswer === "y") {
			console.log(
				`\n\x1b[33mDestructive commands require typing the full word 'yes'.\x1b[0m`,
			);
			// loop continues
		} else if (lowerAnswer === "?" || lowerAnswer === "explain") {
			try {
				console.log(`\nAsking for explanation...`);
				const explanation = await explainCommand(currentCommand, config);
				console.log(`\nExplanation:\n${explanation}`);
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				if (
					errorMessage.toLowerCase().includes("api key") ||
					errorMessage.toLowerCase().includes("unauthorized")
				) {
					console.error(
						`\n\x1b[31mNo API key configured for ${config.provider}.\x1b[0m`,
					);
					console.error(
						`\x1b[31mRun 'nanoterm config' to set up your provider.\x1b[0m`,
					);
				} else {
					console.error(
						`\n\x1b[31mFailed to explain command: ${errorMessage}\x1b[0m`,
					);
				}
			}
			// loop continues
		} else if (lowerAnswer === "edit" || lowerAnswer === "e") {
			const editedCommand = await promptEdit(currentCommand);
			if (!editedCommand) {
				console.log(`\n\x1b[33mCommand is still empty.\x1b[0m`);
			}
			currentCommand = editedCommand;
			if (currentCommand) {
				console.log(`\nProposed command:\n> ${currentCommand}`);
			}
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

		rl.question(`Edit command: `, (ans: string) => {
			rl.close();
			resolve(ans.trim());
		});

		// Write the initial command to the stream so the user can edit it
		rl.write(initialCommand);
	});
}
