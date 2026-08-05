import test from "ava";
import { isInteractiveCommand } from "../src/execute.js";

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
