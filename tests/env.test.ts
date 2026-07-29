import test from "ava";
import { getEnvironmentContext } from "../src/env.js";

test("getEnvironmentContext returns valid OS details", (t) => {
	const env = getEnvironmentContext();
	t.truthy(env.osPlatform);
	t.truthy(env.osRelease);
	t.truthy(env.cwd);
	t.truthy(env.shell);
});
