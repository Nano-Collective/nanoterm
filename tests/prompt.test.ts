import test from "ava";
import { buildSystemPrompt } from "../src/prompt.js";
import type { EnvironmentContext } from "../src/env.js";
import type { SessionContext } from "../src/session.js";

const mockEnv: EnvironmentContext = {
	osPlatform: "darwin",
	osRelease: "21.6.0",
	shell: "/bin/zsh",
	cwd: "/Users/akram/project",
};

test("buildSystemPrompt builds correct prompt without session context", (t) => {
	const prompt = buildSystemPrompt(mockEnv, null);
	t.true(prompt.includes("OS: darwin (21.6.0)"));
	t.true(prompt.includes("Shell: /bin/zsh"));
	t.true(prompt.includes("Current Working Directory: /Users/akram/project"));
	t.false(prompt.includes("Recent context"));
});

test("buildSystemPrompt injects session context when provided", (t) => {
	const mockSession: SessionContext = {
		lastCommand: "ls -la",
		stdout: "total 0\nfile1.txt",
		stderr: "",
		timestamp: Date.now(),
	};

	const prompt = buildSystemPrompt(mockEnv, mockSession);
	t.true(
		prompt.includes("Recent context (from the user's last executed command):"),
	);
	t.true(prompt.includes("Command: ls -la"));
	t.true(prompt.includes("stdout:\ntotal 0\nfile1.txt"));
	t.false(prompt.includes("stderr:\n"));
});

test("buildSystemPrompt injects stderr if present in session context", (t) => {
	const mockSession: SessionContext = {
		lastCommand: "cat missing.txt",
		stdout: "",
		stderr: "cat: missing.txt: No such file or directory",
		timestamp: Date.now(),
	};

	const prompt = buildSystemPrompt(mockEnv, mockSession);
	t.true(prompt.includes("Command: cat missing.txt"));
	t.false(prompt.includes("stdout:\n"));
	t.true(
		prompt.includes("stderr:\ncat: missing.txt: No such file or directory"),
	);
});
