import type { Config } from 'jest'
import { createDefaultEsmPreset } from 'ts-jest'

const preset = createDefaultEsmPreset({
  tsconfig: './tsconfig.json',
})

/**
 * Configuration for `npm run bench`.
 *
 * Benchmarks live in `__benchmarks__` directories as `*.bench.ts` files, which
 * the default `testMatch` used by `npm test` does not pick up. Coverage stays
 * off because V8 coverage instrumentation changes how the measured code is
 * optimized.
 */
const config: Config = {
  ...preset,
  collectCoverage: false,
  // Jest's sandbox makes reads of globals such as RegExp and String much
  // slower than in plain Node, which would inflate code that reads them per
  // call. Sharing them keeps timings close to an ordinary runtime.
  sandboxInjectedGlobals: ['RegExp', 'String'],
  testEnvironment: 'node',
  testMatch: ['**/__benchmarks__/**/*.bench.ts'],
}

export default config
