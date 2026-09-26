import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseArgs } from "node:util";

const previewDir = fileURLToPath(new URL("./", import.meta.url));
const pluginDir = fileURLToPath(new URL("../", import.meta.url));
const cacheDir = join(previewDir, ".cache");

function run(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: "inherit",
			env: { ...process.env, npm_config_cache: join(cacheDir, "npm") },
			// Windows npm is a .cmd launcher. Arguments here are fixed, not user input.
			shell: process.platform === "win32" && command === "npm",
		});
		child.on("error", reject);
		child.on("exit", (code) =>
			code === 0
				? resolve()
				: reject(new Error(`${command} exited with ${code}`)),
		);
	});
}

async function ensureDependencies(directory) {
	const fingerprint = createHash("sha256")
		.update(await readFile(join(directory, "package-lock.json")))
		.digest("hex");
	const stamp = join(directory, "node_modules", ".mcld-preview-lock");
	try {
		if ((await readFile(stamp, "utf8")) === fingerprint) return;
	} catch {
		/* First run or dependencies were removed. */
	}
	console.log(
		`Installing dependencies for ${directory === pluginDir ? "the widget build" : "WordPress Playground"}…`,
	);
	await run("npm", ["ci", "--no-audit", "--no-fund"], directory);
	await writeFile(stamp, fingerprint);
}

try {
	const { values } = parseArgs({
		options: {
			"api-url": { type: "string", default: "http://localhost:3000" },
			port: { type: "string", default: "9463" },
			help: { type: "boolean", short: "h" },
		},
	});
	if (values.help) {
		console.log(
			"Usage: pnpm wordpress:preview [--api-url http://localhost:3000] [--port 9463]\nStart Next.js separately with pnpm dev. This command creates a disposable Elementor page using its real API.",
		);
	} else {
		const [major, minor] = process.versions.node.split(".").map(Number);
		if (major < 24 || (major === 24 && minor < 18))
			throw new Error(
				"The WordPress preview requires Node.js 24.18 or newer.",
			);
		const port = Number(values.port);
		if (!Number.isInteger(port) || port < 1024 || port > 65535)
			throw new Error("--port must be between 1024 and 65535.");
		const url = new URL(values["api-url"]);
		const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
			url.hostname,
		);
		if (
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			!["http:", "https:"].includes(url.protocol) ||
			(url.protocol === "http:" && !loopback) ||
			/\/api\/public\/services\/?$/.test(url.pathname)
		) {
			throw new Error(
				"--api-url must be a dashboard base URL: public HTTPS or local HTTP, without credentials, query parameters, or the API path.",
			);
		}
		const apiUrl = url.href.replace(/\/$/, "");
		let response;
		try {
			response = await fetch(`${apiUrl}/api/public/services`, {
				signal: AbortSignal.timeout(20000),
				redirect: "error",
			});
		} catch {
			throw new Error(
				`Cannot reach ${apiUrl}/api/public/services. Start Next.js with pnpm dev, or set --api-url to its running URL.`,
			);
		}
		if (!response.ok)
			throw new Error(
				`The services API returned HTTP ${response.status}. Check the Next.js terminal and Supabase/Stripe configuration.`,
			);
		let services;
		try {
			services = await response.json();
		} catch {
			/* Report a concise API error below. */
		}
		if (!Array.isArray(services))
			throw new Error(
				"The services API did not return a JSON array. Check --api-url and the Next.js endpoint.",
			);
		console.log(`Next.js is reachable: ${services.length} active services.`);
		await mkdir(cacheDir, { recursive: true });
		await ensureDependencies(pluginDir);
		await ensureDependencies(previewDir);
		await run(process.execPath, ["scripts/build.mjs"], pluginDir);
		const { startPreview } = await import("./server.mjs");
		await startPreview({ apiUrl, port, pluginDir, cacheDir });
	}
} catch (error) {
	console.error(`\nWordPress preview: ${error.message}`);
	process.exit(1);
}
