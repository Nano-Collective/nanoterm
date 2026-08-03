import os from "node:os";
import path from "node:path";

export interface EnvironmentContext {
	osPlatform: string;
	osRelease: string;
	shell: string;
	cwd: string;
}

export function getEnvironmentContext(): EnvironmentContext {
	return {
		osPlatform: os.platform(),
		osRelease: os.release(),
		shell: path.basename(process.env.SHELL || "unknown"),
		cwd: process.cwd(),
	};
}
