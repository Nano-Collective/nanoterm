import { spawn } from "node:child_process";
import { saveSessionContext } from "./session.js";

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

export function isInteractiveCommand(command: string): boolean {
	const trimmed = command.trim();
	return INTERACTIVE_COMMANDS.some(
		(cmd) => trimmed === cmd || trimmed.startsWith(`${cmd} `),
	);
}

export async function executeCommand(command: string): Promise<number> {
	return new Promise((resolve, reject) => {
		// Detect the user's shell, fallback to /bin/sh
		const shell = process.env.SHELL || "/bin/sh";

		console.log(`\nExecuting: ${command}\n`);

		const isInteractive = isInteractiveCommand(command);

		// Propagate TTY color hints if our own stdout is a TTY
		const env = { ...process.env };
		if (process.stdout.isTTY && !env.FORCE_COLOR) {
			env.FORCE_COLOR = "1";
		}

		const child = spawn(shell, ["-c", command], {
			stdio: isInteractive ? "inherit" : ["inherit", "pipe", "pipe"],
			env,
		});

		let stdoutData = "";
		let stderrData = "";

		if (!isInteractive) {
			child.stdout?.on("data", (data: Buffer | string) => {
				stdoutData += data.toString();
				process.stdout.write(data);
			});

			child.stderr?.on("data", (data: Buffer | string) => {
				stderrData += data.toString();
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
