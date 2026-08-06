import { spawn } from "node:child_process";
import { appendOutputTail, saveSessionContext } from "./session.js";

// A heuristic list of commands that require a real TTY to function properly
const INTERACTIVE_COMMANDS = [
	"vim",
	"vi",
	"nvim",
	"nano",
	"emacs",
	"pico",
	"top",
	"htop",
	"btop",
	"glances",
	"ssh",
	"scp",
	"sftp",
	"less",
	"more",
	"man",
	"git commit",
	"git rebase",
	"git log",
	"git diff",
	"git show",
	"git add -p",
];

const SHELL_BUILTINS = new Set([
	".",
	"alias",
	"bg",
	"cd",
	"eval",
	"exec",
	"export",
	"fg",
	"jobs",
	"read",
	"set",
	"source",
	"trap",
	"ulimit",
	"umask",
	"unalias",
	"unset",
	"wait",
]);

export interface DirectCommand {
	command: string;
	args: string[];
}

export function parseDirectCommand(command: string): DirectCommand | null {
	const tokens: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escaped = false;

	for (const character of command.trim()) {
		if (escaped) {
			current += character;
			escaped = false;
			continue;
		}
		if (character === "\\" && quote === '"') return null;
		if (character === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = quote === character ? null : quote || character;
			continue;
		}
		if (
			(!quote && /[|&;<>()$`*?[\]{}~>\n]/.test(character)) ||
			(quote === '"' && /[$`]/.test(character))
		)
			return null;
		if (!quote && /\s/.test(character)) {
			if (current) tokens.push(current);
			current = "";
			continue;
		}
		current += character;
	}

	if (quote || escaped) return null;
	if (current) tokens.push(current);
	if (
		tokens.length === 0 ||
		tokens[0].includes("=") ||
		SHELL_BUILTINS.has(tokens[0])
	) {
		return null;
	}
	return { command: tokens[0], args: tokens.slice(1) };
}

export function isInteractiveCommand(command: string): boolean {
	const trimmed = command.trim();
	return INTERACTIVE_COMMANDS.some(
		(cmd) => trimmed === cmd || trimmed.startsWith(`${cmd} `),
	);
}

export async function executeCommand(command: string): Promise<number> {
	if (command.includes("\0")) {
		throw new Error("Refusing to execute a command containing a null byte");
	}

	return new Promise((resolve, reject) => {
		// Detect the user's shell, fallback to /bin/sh
		const shell = process.env.SHELL || "/bin/sh";

		console.log(`\nExecuting: ${command}\n`);

		const isInteractive = isInteractiveCommand(command);
		const directCommand = parseDirectCommand(command);

		// Propagate TTY color hints if our own stdout is a TTY
		const env = { ...process.env };
		if (process.stdout.isTTY && !env.FORCE_COLOR) {
			env.FORCE_COLOR = "1";
		}

		const child = directCommand
			? spawn(directCommand.command, directCommand.args, {
					stdio: isInteractive ? "inherit" : ["inherit", "pipe", "pipe"],
					env,
				})
			: spawn(shell, ["-c", "--", command], {
					stdio: isInteractive ? "inherit" : ["inherit", "pipe", "pipe"],
					env,
				});

		let stdoutData = "";
		let stderrData = "";

		if (!isInteractive) {
			child.stdout?.on("data", (data: Buffer | string) => {
				stdoutData = appendOutputTail(stdoutData, data.toString());
				process.stdout.write(data);
			});

			child.stderr?.on("data", (data: Buffer | string) => {
				stderrData = appendOutputTail(stderrData, data.toString());
				process.stderr.write(data);
			});
		}

		child.on("error", (err: Error) => {
			reject(err);
		});

		child.on("exit", (code: number | null) => {
			// Save session context before exiting
			if (!isInteractive) {
				saveSessionContext(command, stdoutData, stderrData);
			}

			if (code === null) {
				// Process was terminated by a signal
				resolve(1);
			} else {
				resolve(code);
			}
		});
	});
}
