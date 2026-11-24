// Rebuilds static/core/sieuviet.wasm from a vietmoi checkout when its core sources changed.
// Runs before `pnpm dev` and `pnpm build`. Looks for vietmoi at $SIEUVIET_CORE or ../vietmoi.
// Without a checkout or a Swift toolchain, the committed static/core is used as-is.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const vietmoi = resolve(process.env.SIEUVIET_CORE ?? '../vietmoi');
const script = resolve(vietmoi, 'scripts/build-wasm.py');
const output = resolve('static/core');
const swift = spawnSync('swift', ['--version'], { stdio: 'ignore' }).status === 0;

if (!existsSync(script)) {
	console.log(`core: no vietmoi checkout at ${vietmoi}; using static/core as committed`);
} else if (!swift) {
	console.log('core: swift is not installed; using static/core as committed');
} else {
	const run = spawnSync('python3', [script, '--if-changed', '--output', output], { stdio: 'inherit' });
	if (run.status !== 0) {
		if (process.env.CI) process.exit(run.status ?? 1);
		console.warn('core: the WebAssembly build failed; using static/core as committed');
	}
}
