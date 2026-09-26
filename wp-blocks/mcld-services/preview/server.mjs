import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import {
	loadNodeRuntime,
	withNetworking,
	createNodeFsMountHandler,
} from "@php-wasm/node";
import { bootWordPressAndRequestHandler } from "@wp-playground/wordpress";
import { unzipFile } from "@wp-playground/common";

const versions = { wordpress: "6.8.3", elementor: "4.3.2", sqlite: "3.0.2" };

export async function startPreview({ apiUrl, port, pluginDir, cacheDir }) {
	const siteUrl = `http://127.0.0.1:${port}`;
	let handler;
	let networking;
	let ready = false;
	let queue = Promise.resolve();
	// Reserve the port before downloading/booting; PHP requests share one runtime.
	const server = createServer((req, res) => {
		if (!ready) {
			res.writeHead(503, {
				"Content-Type": "text/plain",
				"Retry-After": "2",
			});
			res.end("WordPress preview is starting. Refresh shortly.");
			return;
		}
		queue = queue.then(async () => {
			try {
				const chunks = [];
				for await (const chunk of req) chunks.push(chunk);
				const body = Buffer.concat(chunks);
				const response = await handler.request({
					url: req.url,
					method: req.method,
					headers: req.headers,
					...(body.length ? { body } : {}),
				});
				res.writeHead(response.httpStatusCode, {
					...response.headers,
					"cache-control": ["no-store"],
				});
				res.end(response.bytes);
			} catch (error) {
				console.error(error.message);
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("WordPress preview error. Check the terminal.");
			}
		});
	});
	await new Promise((resolve, reject) => {
		server.once("error", (error) =>
			reject(
				new Error(
					error.code === "EADDRINUSE"
						? `Port ${port} is already in use. Stop that preview or pass --port ${port + 1}.`
						: error.message,
				),
			),
		);
		server.listen(port, "127.0.0.1", resolve);
	});

	const stop = async () => {
		ready = false;
		server.close();
		server.closeAllConnections();
		await queue;
		if (handler) await handler[Symbol.asyncDispose]();
		networking?.outboundNetworkProxyServer.close();
	};
	let stopping = false;
	for (const signal of ["SIGINT", "SIGTERM"])
		process.once(signal, async () => {
			if (stopping) return;
			stopping = true;
			console.log("\nStopping the disposable WordPress preview.");
			await stop();
			process.exit(0);
		});

	try {
		const downloads = join(cacheDir, "downloads");
		await mkdir(downloads, { recursive: true });
		const download = async (url, name) => {
			const path = join(downloads, name);
			let bytes;
			try {
				bytes = await readFile(path);
			} catch {
				console.log(`Downloading ${name}…`);
				const response = await fetch(url, {
					signal: AbortSignal.timeout(120000),
				});
				if (!response.ok)
					throw new Error(
						`Download failed: ${name} (HTTP ${response.status})`,
					);
				bytes = new Uint8Array(await response.arrayBuffer());
				const temporary = `${path}.${process.pid}.tmp`;
				await writeFile(temporary, bytes);
				await rename(temporary, path);
			}
			return new File([bytes], name);
		};
		const [wordPressZip, sqliteIntegrationPluginZip, elementorZip] =
			await Promise.all([
				download(
					`https://wordpress.org/wordpress-${versions.wordpress}.zip`,
					`wordpress-${versions.wordpress}.zip`,
				),
				download(
					`https://downloads.wordpress.org/plugin/sqlite-database-integration.${versions.sqlite}.zip`,
					`sqlite-${versions.sqlite}.zip`,
				),
				download(
					`https://downloads.wordpress.org/plugin/elementor.${versions.elementor}.zip`,
					`elementor-${versions.elementor}.zip`,
				),
			]);
		networking = await withNetworking({ processId: process.pid });
		handler = await bootWordPressAndRequestHandler({
			createPhpRuntime: () =>
				loadNodeRuntime("8.3", { emscriptenOptions: networking }),
			phpVersion: "8.3",
			siteUrl,
			documentRoot: "/wordpress",
			wordPressZip,
			sqliteIntegrationPluginZip,
			maxPhpInstances: 1,
			cookieStore: false,
			constants: {
				WP_ENVIRONMENT_TYPE: "local",
				WP_DEBUG: true,
				WP_DEBUG_LOG: true,
				WP_DEBUG_DISPLAY: false,
				DISABLE_WP_CRON: true,
				WP_AUTO_UPDATE_CORE: false,
				MCLD_PREVIEW_API_URL: apiUrl,
			},
			phpIniEntries: { memory_limit: "512M" },
			onProgress: console.log,
		});
		const php = await handler.getPrimaryPhp();
		await unzipFile(php, elementorZip, "/wordpress/wp-content/plugins");
		const mount = "/wordpress/wp-content/plugins/mcld-services";
		php.mkdirTree(mount);
		php.writeFile(
			`${mount}/mcld-services.php`,
			await readFile(join(pluginDir, "mcld-services.php")),
		);
		// Mount only runtime directories, never credentials, node_modules, or test files.
		for (const dir of ["build", "includes", "templates"]) {
			php.mkdirTree(`${mount}/${dir}`);
			await php.mount(
				`${mount}/${dir}`,
				createNodeFsMountHandler(join(pluginDir, dir)),
			);
		}
		php.mkdirTree("/wordpress/wp-content/mu-plugins");
		php.writeFile(
			"/wordpress/wp-content/mu-plugins/mcld-preview.php",
			await readFile(new URL("./environment.php", import.meta.url)),
		);
		php.writeFile(
			"/wordpress/mcld-preview-setup.php",
			await readFile(new URL("./setup.php", import.meta.url)),
		);
		try {
			const result = await php.run({
				code: "<?php require '/wordpress/mcld-preview-setup.php';",
			});
			if (result.errors) console.error(result.errors);
			console.log(result.text.trim());
			php.unlink("/wordpress/mcld-preview-setup.php");
		} catch (error) {
			if (php.fileExists("/wordpress/wp-content/debug.log"))
				console.error(
					php.readFileAsText("/wordpress/wp-content/debug.log"),
				);
			throw error;
		}
		ready = true;
		console.log(
			`\nElementor preview: ${siteUrl}/\nReal services API: ${apiUrl}/api/public/services\nRefresh to see PHP/template edits or service changes. After JS/SCSS edits, run npm run build in wp-blocks/mcld-services, then refresh.\nCtrl+C stops WordPress; Next.js keeps running.`,
		);
	} catch (error) {
		await stop();
		throw error;
	}
}
