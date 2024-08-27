import { readFileSync, writeFileSync } from "node:fs";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index", "src/cli"],
	declaration: true,
	failOnWarn: false,
	clean: true,
	sourcemap: true,
	rollup: {
		emitCJS: true,
	},
	hooks: {
		"build:done": () => {
			/**
			 * Prepend shebang to cli entries since unbuild doesn't seem to support it
			 */
			const cliEntries = ["dist/cli.mjs", "dist/cli.cjs"];

			for (const entry of cliEntries) {
				const content = `#!/usr/bin/env node \n${readFileSync(entry, "utf-8")}`;
				writeFileSync(entry, content);
			}
		},
	},
});
