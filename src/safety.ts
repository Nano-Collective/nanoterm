const COMMAND_WRAPPERS = new Set([
	"busybox",
	"command",
	"builtin",
	"env",
	"nohup",
	"sudo",
]);
const SHELL_INTERPRETERS = new Set([
	"bash",
	"dash",
	"fish",
	"ksh",
	"node",
	"nodejs",
	"perl",
	"php",
	"python",
	"python3",
	"ruby",
	"sh",
	"zsh",
]);

function executableName(token: string): string {
	return token.replace(/^.*[\\/]/, "");
}

function splitShellSegments(command: string): string[] {
	const segments: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escaped = false;

	for (const character of command) {
		if (escaped) {
			current += character;
			escaped = false;
			continue;
		}
		if (character === "\\" && quote !== "'") {
			current += character;
			escaped = true;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = quote === character ? null : quote || character;
			current += character;
			continue;
		}
		if (
			!quote &&
			(character === ";" ||
				character === "|" ||
				character === "&" ||
				character === "\n")
		) {
			if (current.trim()) segments.push(current.trim());
			current = "";
			continue;
		}
		current += character;
	}
	if (current.trim()) segments.push(current.trim());
	return segments;
}

function tokenize(segment: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	let escaped = false;

	for (const character of segment) {
		if (escaped) {
			current += character;
			escaped = false;
			continue;
		}
		if (character === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}
		if (character === "'" || character === '"') {
			quote = quote === character ? null : quote || character;
			continue;
		}
		if (!quote && /\s/.test(character)) {
			if (current) tokens.push(current);
			current = "";
			continue;
		}
		current += character;
	}
	if (current) tokens.push(current);
	return tokens;
}

function unwrapCommand(
	tokens: string[],
): { exe: string; args: string[] } | null {
	let index = 0;
	while (index < tokens.length) {
		while (tokens[index]?.includes("=") && !tokens[index]?.startsWith("="))
			index++;
		const wrapper = executableName(tokens[index] || "");
		if (!COMMAND_WRAPPERS.has(wrapper)) break;
		index++;

		while (tokens[index]?.startsWith("-")) {
			const option = tokens[index++];
			if (
				wrapper === "sudo" &&
				[
					"-C",
					"-g",
					"-h",
					"-p",
					"-R",
					"-T",
					"-u",
					"--chdir",
					"--group",
					"--host",
					"--prompt",
					"--role",
					"--type",
					"--user",
				].includes(option)
			) {
				index++;
			}
			if (
				wrapper === "env" &&
				["-C", "-S", "-u", "--chdir", "--split-string", "--unset"].includes(
					option,
				)
			) {
				index++;
			}
		}
	}

	if (index >= tokens.length) return null;
	return {
		exe: executableName(tokens[index]),
		args: tokens.slice(index + 1),
	};
}

export function isDangerousCommand(command: string): boolean {
	if (command.includes(":(){ :|:& };:")) return true;

	// Dynamic command construction cannot be inspected reliably before shell execution.
	if (/(^|[^\\])`|\$\(/.test(command)) return true;
	if (
		/\|\s*(?:sudo\s+)?(?:sh|bash|zsh|php|python\d*|ruby|perl)\b/.test(command)
	)
		return true;
	if (/>\s*["']?(?:\/etc\/|\/var\/|\/usr\/|\/dev\/)/.test(command)) return true;

	for (const segment of splitShellSegments(command)) {
		const parsed = unwrapCommand(tokenize(segment));
		if (!parsed) continue;
		const { exe, args } = parsed;

		const flags = new Set<string>();
		const longFlags = new Set<string>();
		const targets: string[] = [];
		for (const arg of args) {
			if (arg.startsWith("--")) {
				longFlags.add(arg.slice(2).split("=", 1)[0]);
			} else if (arg.startsWith("-") && arg.length > 1) {
				for (let index = 1; index < arg.length; index++) flags.add(arg[index]);
			} else {
				targets.push(arg);
			}
		}

		if (exe === "eval" || exe === "source" || exe === ".") return true;
		if (
			SHELL_INTERPRETERS.has(exe) &&
			(flags.has("c") ||
				flags.has("e") ||
				flags.has("r") ||
				longFlags.has("command") ||
				longFlags.has("eval") ||
				longFlags.has("print"))
		)
			return true;

		if (exe === "rm") {
			if (flags.has("r") || flags.has("R") || longFlags.has("recursive"))
				return true;
			if (targets.some((target) => target.includes("*"))) return true;
		}
		if (
			(exe === "chmod" || exe === "chown") &&
			(flags.has("R") || longFlags.has("recursive"))
		)
			return true;
		if (exe.startsWith("mkfs") || exe === "fdisk") return true;
		if (exe === "dd" && args.some((arg) => arg.startsWith("of=/dev/")))
			return true;
		if (
			exe === "find" &&
			(args.includes("-delete") ||
				args.includes("-exec") ||
				args.includes("-execdir"))
		)
			return true;
		if (exe === "git") {
			if (targets.includes("reset") && longFlags.has("hard")) return true;
			if (targets.includes("clean") && flags.has("f") && flags.has("d"))
				return true;
		}
		if (exe === "shred" || exe === "truncate") return true;
		if (["shutdown", "reboot", "halt", "poweroff"].includes(exe)) return true;
		if (
			(exe === "docker" || exe === "podman") &&
			targets.includes("system") &&
			targets.includes("prune") &&
			(flags.has("a") || longFlags.has("all")) &&
			(flags.has("f") || longFlags.has("force"))
		)
			return true;
		if (
			exe === "kubectl" &&
			targets.includes("delete") &&
			(targets.includes("ns") || targets.includes("namespace"))
		)
			return true;
		if (exe === "mv" && targets.includes("/dev/null")) return true;
	}

	return false;
}
