import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface SessionContext {
	lastCommand: string;
	stdout: string;
	stderr: string;
	timestamp: number;
}

export const MAX_OUTPUT_LENGTH = 2000;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getSessionFilePath(): string {
	// Use the parent shell process ID to scope the session to the current terminal tab
	const ppid = process.ppid;
	return path.join(os.tmpdir(), `nanoterm-session-${ppid}.json`);
}

export function appendOutputTail(current: string, chunk: string): string {
	const combined = current + chunk;
	return combined.length > MAX_OUTPUT_LENGTH
		? combined.slice(-MAX_OUTPUT_LENGTH)
		: combined;
}

function cleanupStaleSessions(): void {
	try {
		const tmpDir = os.tmpdir();
		// Fire-and-forget async cleanup so we don't block the CLI
		fs.readdir(tmpDir, (err, files) => {
			if (err) return;
			const now = Date.now();
			for (const file of files) {
				if (file.startsWith("nanoterm-session-") && file.endsWith(".json")) {
					const filePath = path.join(tmpDir, file);
					fs.stat(filePath, (err, stats) => {
						if (!err && now - stats.mtimeMs > MAX_AGE_MS) {
							fs.unlink(filePath, () => {});
						}
					});
				}
			}
		});
	} catch {
		// Ignore cleanup errors
	}
}

export function saveSessionContext(
	command: string,
	stdout: string,
	stderr: string,
): void {
	try {
		const sessionFilePath = getSessionFilePath();

		// Truncate to the last N characters to avoid blowing up the LLM token limit
		const truncatedStdout =
			stdout.length > MAX_OUTPUT_LENGTH
				? `...${stdout.slice(-MAX_OUTPUT_LENGTH)}`
				: stdout;

		const truncatedStderr =
			stderr.length > MAX_OUTPUT_LENGTH
				? `...${stderr.slice(-MAX_OUTPUT_LENGTH)}`
				: stderr;

		const data: SessionContext = {
			lastCommand: command,
			stdout: truncatedStdout,
			stderr: truncatedStderr,
			timestamp: Date.now(),
		};

		fs.writeFileSync(sessionFilePath, JSON.stringify(data), {
			encoding: "utf-8",
			mode: 0o600,
		});
		// writeFileSync's mode is ignored for an existing file, so enforce it explicitly.
		fs.chmodSync(sessionFilePath, 0o600);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`\n[WARN] Failed to save session context: ${msg}`);
	}
}

export function loadSessionContext(): SessionContext | null {
	cleanupStaleSessions();

	try {
		const sessionFilePath = getSessionFilePath();
		if (fs.existsSync(sessionFilePath)) {
			const data = fs.readFileSync(sessionFilePath, "utf-8");
			const context = JSON.parse(data) as SessionContext;

			if (Date.now() - (context.timestamp || 0) > MAX_AGE_MS) {
				fs.unlinkSync(sessionFilePath);
				return null;
			}

			return context;
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(`\n[WARN] Failed to load session context: ${msg}`);
	}
	return null;
}
