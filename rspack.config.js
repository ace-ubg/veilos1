import { defineConfig } from "@rspack/cli";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(__dirname, process.env.OUTPUT_DIR || "public", "host");

// Bundles only the SpadeOS host glue (transports, Sapphire, CRX helpers).
// Scramjet core + controller are NOT bundled here: they are copied verbatim
// from their npm packages by scripts/copy-assets.mjs and loaded as globals.
export default defineConfig({
	mode: process.env.NODE_ENV === "production" ? "production" : "development",
	devtool: "source-map",
	entry: {
		host: join(__dirname, "host/entry.ts"),
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /epoxy-transport/,
				parser: { url: false },
			},
			{
				test: /\.ts$/,
				loader: "builtin:swc-loader",
				exclude: [/node_modules\/(?!@x8r\/sapphire)/],
				options: {
					jsc: {
						parser: { syntax: "typescript" },
						target: "es2022",
					},
				},
				type: "javascript/auto",
			},
		],
	},
	output: {
		filename: "[name].js",
		path: outDir,
		iife: true,
		clean: true,
	},
	target: "web",
	performance: { hints: false },
});
