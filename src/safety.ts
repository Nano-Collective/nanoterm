export function isDangerousCommand(command: string): boolean {
	const dangerousPatterns = [
		/\brm\s+-.*r/i, // rm -r, rm -rf, rm -fr
		/\bchmod\s+-.*R/i, // chmod -R
		/\bchown\s+-.*R/i, // chown -R
		/\bmkfs\b/i, // mkfs
		/\bfdisk\b/i, // fdisk
		/\bdd\s+if=/i, // dd if=
		/>\s*\/dev\/sd[a-z]/i, // Output to raw disk
		/\bmv\s+.*\s+\/dev\/null/i, // Move to /dev/null
	];

	return dangerousPatterns.some((pattern) => pattern.test(command));
}
