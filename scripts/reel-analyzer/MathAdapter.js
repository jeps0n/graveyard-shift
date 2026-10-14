/**
 * Loads unchanged production TypeScript math in an isolated CommonJS module graph.
 * Import resolution redirects paytable, weights, and RNG for external math tools.
 * No production files or global RNG functions are modified.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { REEL_WEIGHTS, PAYTABLE } from './AnalyzerConfig.js';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceMath = resolve(root, 'src/math');
const candidateMath = resolve(root, 'scripts/reel-analyzer/config');

const compiled = new Map();

export function loadMath(random, candidate = null) {
  const cache = new Map();
  const rngModule = { rng: { next: random } };

  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    let output = compiled.get(file);
    if (!output) {
      const source = file === resolve(candidateMath, 'Paytable.ts')
        ? 'export const PAYTABLE = ' + JSON.stringify(PAYTABLE) + ';'
        : file === resolve(candidateMath, 'ReelWeights.ts')
          ? 'export const REEL_WEIGHTS = ' + JSON.stringify(REEL_WEIGHTS) + ';'
          : readFileSync(file, 'utf8');
      output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
      });
      compiled.set(file, output);
    }
    const errors = output.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? [];
    if (errors.length) {
      throw new Error(`Cannot compile ${file}: ${errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('; ')}`);
    }

    const module = { exports: {} };
    cache.set(file, module);
    if (candidate && file === resolve(candidateMath, 'Paytable.ts')) {
      module.exports.PAYTABLE = candidate.paytable;
      return module.exports;
    }
    if (candidate && file === resolve(candidateMath, 'ReelWeights.ts')) {
      module.exports.REEL_WEIGHTS = candidate.reelWeights;
      return module.exports;
    }
    const localRequire = (specifier) => {
      if (specifier === './RNG' || specifier === '../math/RNG') return rngModule;
      if (specifier === './Paytable') return load(resolve(candidateMath, 'Paytable.ts'));
      if (specifier === './ReelWeights') return load(resolve(candidateMath, 'ReelWeights.ts'));
      if (!specifier.startsWith('.')) throw new Error(`Unexpected math dependency: ${specifier}`);
      return load(resolve(dirname(file), `${specifier}.ts`));
    };
    try {
      const execute = compileFunction(output.outputText, ['require', 'module', 'exports'], { filename: file });
      execute(localRequire, module, module.exports);
    } catch (error) {
      cache.delete(file);
      throw error;
    }
    return module.exports;
  }

  const math = load(resolve(sourceMath, 'GameMath.ts'));
  const { AfterMidnight } = load(resolve(root, 'src/features/AfterMidnight.ts'));
  return { ...math, AfterMidnight, reelWeights: load(resolve(candidateMath, 'ReelWeights.ts')).REEL_WEIGHTS, paytable: load(resolve(candidateMath, 'Paytable.ts')).PAYTABLE };
}
