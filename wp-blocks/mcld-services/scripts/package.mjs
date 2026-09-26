import { readFile, readdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';

const files = {};
async function add(path) {
	files[`mcld-services/${path}`] = new Uint8Array(await readFile(path));
}
// Explicit release allowlist: no dependencies, source, test data, or secrets.
for (const path of ['mcld-services.php', 'readme.txt']) await add(path);
for (const dir of ['build', 'includes', 'templates']) {
	for (const file of await readdir(dir)) await add(`${dir}/${file}`);
}
await writeFile('mcld-services.zip', zipSync(files, { level: 9 }));
console.log(`Packaged ${Object.keys(files).length} runtime files in mcld-services.zip.`);
