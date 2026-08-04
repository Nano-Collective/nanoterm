export function isDangerousCommand(command: string): boolean {
	if (command.includes(":(){ :|:& };:")) return true;

	if (/\|\s*(?:sudo\s+)?(?:sh|bash|zsh|php|python|ruby|perl)\b/.test(command)) return true;

	if (/>\s*(?:\/etc\/|\/var\/|\/usr\/|\/dev\/)/.test(command)) return true;

	const subCommands = command.split(/;|&&|\|\||\|/);
	
	for (const subCmd of subCommands) {
		const tokens = subCmd.trim().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) continue;

		let exeIndex = 0;
		while (exeIndex < tokens.length && (tokens[exeIndex].includes('=') || tokens[exeIndex] === 'sudo')) {
			exeIndex++;
		}
		if (exeIndex >= tokens.length) continue;

		const exe = tokens[exeIndex];
		const args = tokens.slice(exeIndex + 1);

		const flags = new Set<string>();
		const longFlags = new Set<string>();
		const targets: string[] = [];

		for (const arg of args) {
			if (arg.startsWith('--')) {
				longFlags.add(arg.slice(2));
			} else if (arg.startsWith('-') && arg.length > 1) {
				for (let i = 1; i < arg.length; i++) {
					flags.add(arg[i]);
				}
			} else {
				targets.push(arg);
			}
		}

		if (exe === 'rm') {
			if (flags.has('r') || flags.has('R')) return true;
			if (targets.some(t => t.includes('*'))) return true;
		}

		if (exe === 'chmod' || exe === 'chown') {
			if (flags.has('R')) return true;
		}

		if (exe.startsWith('mkfs') || exe === 'fdisk') {
			return true;
		}

		if (exe === 'dd') {
			if (args.some(a => a.startsWith('of=/dev/'))) return true;
		}

		if (exe === 'find') {
			if (args.includes('-delete')) return true;
		}

		if (exe === 'git') {
			if (targets.includes('reset') && longFlags.has('hard')) return true;
			if (targets.includes('clean') && flags.has('f') && flags.has('d')) return true;
		}

		if (exe === 'shred' || exe === 'truncate') {
			return true;
		}

		if (exe === 'shutdown' || exe === 'reboot' || exe === 'halt' || exe === 'poweroff') {
			return true;
		}

		if (exe === 'docker' || exe === 'podman') {
			if (targets.includes('system') && targets.includes('prune') && flags.has('a') && flags.has('f')) return true;
		}

		if (exe === 'kubectl') {
			if (targets.includes('delete') && (targets.includes('ns') || targets.includes('namespace'))) return true;
		}

		if (exe === 'mv') {
			if (targets.includes('/dev/null')) return true;
		}
	}

	return false;
}
