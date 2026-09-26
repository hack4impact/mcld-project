import { mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { compile } from 'sass';

// Remove obsolete block bundles as well as previous widget builds.
await rm(new URL('../build/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../build/', import.meta.url), { recursive: true });
await build({
	entryPoints: ['src/services.js'],
	outfile: 'build/services.js',
	bundle: true,
	minify: true,
	format: 'iife',
	target: ['es2020'],
});
await writeFile('build/services.css', compile('src/services.scss', { style: 'compressed' }).css);
console.log('Built Elementor widget assets.');
