import test from "ava";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NanotermConfig } from "../src/config.js";

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

type CapturedRun = {
	stdout: string;
	stderr: string;
	exitCalled: boolean;
	exitCode: number;
};

async function captureRunCLI(args: string[]): Promise<CapturedRun> {
	const originalExit = process.exit;
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);
	let capturedStdout = "";
	let capturedStderr = "";
	let exitCalled = false;
	let exitCode = -1;

	process.exit = ((code?: number) => {
		exitCalled = true;
		exitCode = code ?? 0;
		throw new Error("__PROCESS_EXIT__");
	}) as never;
	process.stdout.write = ((chunk: string | Buffer | Uint8Array) => {
		capturedStdout += chunk.toString();
		return true;
	}) as never;
	process.stderr.write = ((chunk: string | Buffer | Uint8Array) => {
		capturedStderr += chunk.toString();
		return true;
	}) as never;

	const uncaughtListeners = process.listeners("uncaughtException");
	const rejectionListeners = process.listeners("unhandledRejection");
	process.removeAllListeners("uncaughtException");
	process.removeAllListeners("unhandledRejection");

	const restoreAva = () => {
		process.removeAllListeners("uncaughtException");
		process.removeAllListeners("unhandledRejection");
		for (const l of uncaughtListeners) process.on("uncaughtException", l);
		for (const l of rejectionListeners) process.on("unhandledRejection", l);
	};

	try {
		const { runCLI } = await import("../src/cli.js");
		const argv = ["node", "cli.js", ...args];
		try {
			await runCLI(argv);
		} catch (e: unknown) {
			if (
				!(e instanceof Error && e.message === "__PROCESS_EXIT__") &&
				!capturedStdout.includes("Aborted")
			) {
				throw e;
			}
		}
		await new Promise((resolve) => setImmediate(resolve));
		await new Promise((resolve) => setImmediate(resolve));
	} finally {
		process.exit = originalExit;
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
		restoreAva();
	}

	return {
		stdout: capturedStdout,
		stderr: capturedStderr,
		exitCalled,
		exitCode,
	};
}

function setupConfigEnv(): { dir: string; cleanup: () => void } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-cli-test-"));
	const configPath = path.join(dir, "agents.config.json");
	const config: NanotermConfig = {
		provider: "Ollama",
		model: "llama3",
		providers: [
			{
				name: "Ollama",
				baseUrl: "http://localhost:11434/v1",
				apiKey: "",
				models: ["llama3"],
				sdkProvider: "openai-compatible",
			},
		],
	};
	fs.writeFileSync(configPath, JSON.stringify(config));
	const originalCwd = process.cwd();
	process.chdir(dir);
	return {
		dir,
		cleanup: () => {
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		},
	};
}

test.serial("runCLI › --version prints the package version", async (t) => {
	const { cleanup } = setupConfigEnv();
	try {
		const { stdout, exitCalled, exitCode } = await captureRunCLI(["--version"]);
		t.true(exitCalled, "expected process.exit to be invoked for --version");
		t.is(exitCode, 0);
		t.true(stdout.includes("1.0.0"));
	} finally {
		cleanup();
	}
});

test.serial("runCLI › --help prints program help", async (t) => {
	const { cleanup } = setupConfigEnv();
	try {
		const { stdout, exitCalled, exitCode } = await captureRunCLI(["--help"]);
		t.true(exitCalled, "expected process.exit to be invoked for --help");
		t.is(exitCode, 0);
		t.true(stdout.includes("Usage"));
		t.true(stdout.includes("nanoterm"));
		t.true(stdout.includes("config"));
	} finally {
		cleanup();
	}
});

// Note: the action-handler path that fires when no args are supplied
// resolves asynchronously and is harder to capture reliably in tests. The
// help output it would produce is already covered by the --help test
// above; commander invokes help() with the same implementation either way.

void REPO_ROOT;
