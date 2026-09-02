// A Node ESM loader that replaces @inquirer/prompts with a stubbed module
// that returns predetermined answers or throws ExitPromptError on demand.
// Used by tests/setup-wizard.test.ts to exercise the runConfigWizard state
// machine without requiring a real TTY.

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const stubSource = `
const pending = [];

// Each prompt key may have either a static answer (object literal) or an
// array of answers consumed FIFO across repeated calls (array literal).
const lookupAnswer = (answers, key) => {
  if (answers && key in answers) {
    const value = answers[key];
    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return value.shift();
    }
    return value;
  }
  return undefined;
};

const makeStub = (kind) => (...args) => {
  const opts = args[0] || {};
  const key = kind + ":" + (opts.message || "");
  if (globalThis.__INQUIRER_TRACE__) {
    process.stderr.write("[inquirer " + kind + "] " + key + "\\n");
  }
  return new Promise((resolve, reject) => {
    const answers = globalThis.__INQUIRER_STUB_ANSWERS__ || {};
    const value = lookupAnswer(answers, key);
    if (value !== undefined) {
      resolve(value);
      return;
    }
    if (answers.__throw_exit_on__ && answers.__throw_exit_on__ === key) {
      const err = new Error("force-closed");
      err.name = "ExitPromptError";
      reject(err);
      return;
    }
    pending.push({ key, resolve, reject });
  });
};

const select = makeStub("select");
const input = makeStub("input");
const password = makeStub("password");

export { select, input, password };
`;

export function resolve(specifier, context, nextResolve) {
	if (specifier === "@inquirer/prompts") {
		return {
			url: pathToFileURL(
				path.join(
					path.dirname(fileURLToPath(import.meta.url)),
					"_inquirer-stub.mjs",
				),
			).href,
			format: "module",
			shortCircuit: true,
		};
	}
	return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
	if (url.endsWith("/_inquirer-stub.mjs")) {
		return {
			format: "module",
			source: stubSource,
			shortCircuit: true,
		};
	}
	return nextLoad(url, context);
}
