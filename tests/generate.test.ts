import test from "ava";
import { sanitizeCommand } from "../src/generate.js";

test("sanitizeCommand strips full markdown blocks", (t) => {
	const raw = "```bash\nls -la\n```";
	t.is(sanitizeCommand(raw), "ls -la");
});

test("sanitizeCommand strips incomplete markdown blocks", (t) => {
	const raw = "```\nls -la\n";
	t.is(sanitizeCommand(raw), "ls -la");
});

test("sanitizeCommand strips leading prompt characters", (t) => {
	const raw = "$ find . -name '*.png'";
	t.is(sanitizeCommand(raw), "find . -name '*.png'");
});

test("sanitizeCommand strips markdown blocks containing shell prompts", (t) => {
	const raw = "```bash\n$ npm run test\n```";
	t.is(sanitizeCommand(raw), "npm run test");
});

test("sanitizeCommand handles text surrounding markdown blocks", (t) => {
	const raw = "Here is your command:\n```bash\ngit status\n```\nEnjoy!";
	t.is(sanitizeCommand(raw), "git status");
});

test("sanitizeCommand leaves normal commands untouched", (t) => {
	const raw = "docker build -t my-app .";
	t.is(sanitizeCommand(raw), "docker build -t my-app .");
});

test("sanitizeCommand trims whitespace from normal commands", (t) => {
	const raw = "   \n  echo hello \n  ";
	t.is(sanitizeCommand(raw), "echo hello");
});
