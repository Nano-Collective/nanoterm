import test from "ava";
import { isInteractiveCommand, parseDirectCommand } from "../src/execute.js";

test("isInteractiveCommand › detects common interactive editors", (t) => {
	t.true(isInteractiveCommand("vim"));
	t.true(isInteractiveCommand("vim /path/to/file"));
	t.true(isInteractiveCommand("nano"));
	t.true(isInteractiveCommand("nano config.json"));
});

test("isInteractiveCommand › detects interactive git commands", (t) => {
	t.true(isInteractiveCommand("git commit -m 'fix'"));
	t.true(isInteractiveCommand("git diff"));
	t.true(isInteractiveCommand("git log"));
	t.true(isInteractiveCommand("git add -p"));
});

test("isInteractiveCommand › detects system monitors and pagers", (t) => {
	t.true(isInteractiveCommand("top"));
	t.true(isInteractiveCommand("htop"));
	t.true(isInteractiveCommand("less /var/log/syslog"));
	t.true(isInteractiveCommand("man ls"));
});

test("isInteractiveCommand › does not flag standard shell commands as interactive", (t) => {
	t.false(isInteractiveCommand("ls -la"));
	t.false(isInteractiveCommand("grep 'pattern' file.txt"));
	t.false(isInteractiveCommand("echo 'hello'"));
	t.false(isInteractiveCommand("cat /etc/hosts"));
	t.false(isInteractiveCommand("npm run dev"));
});

test("isInteractiveCommand › handles leading and trailing whitespace", (t) => {
	t.true(isInteractiveCommand("  vim  "));
	t.false(isInteractiveCommand("  ls  "));
});

test("parseDirectCommand avoids a shell for commands that need no expansion", (t) => {
	t.deepEqual(parseDirectCommand("git status --short"), {
		command: "git",
		args: ["status", "--short"],
	});
	t.deepEqual(parseDirectCommand("find . -name '*.png'"), {
		command: "find",
		args: [".", "-name", "*.png"],
	});
});

test("parseDirectCommand retains shell execution only for shell syntax", (t) => {
	t.is(parseDirectCommand("printf '%s\\n' *.png"), null);
	t.is(parseDirectCommand("echo hello | grep hello"), null);
	t.is(parseDirectCommand("cd /tmp"), null);
	t.is(parseDirectCommand("NAME=value command"), null);
	t.is(parseDirectCommand("echo 'unterminated"), null);
	t.is(parseDirectCommand('echo "$HOME"'), null);
	t.is(parseDirectCommand('echo "$(date)"'), null);
});
