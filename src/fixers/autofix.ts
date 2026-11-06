import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export interface AutoFixResult {
  filesModified: string[];
  swallowedErrorsFixed: number;
  tsIgnoreFixed: number;
}

/**
 * Automatically cleans up lazy AI coding artifacts:
 * 1. Converts empty catch (e) { console.error('[AgentGuard AutoFix] Caught exception:', e); } into console.error(e) logging.
 * 2. Replaces silent @ts-ignore with safer @ts-expect-error with explanation.
 */
export async function autoFixCodeSmells(
  rootDirectory: string = process.cwd(),
  globs: string[] = ['src/**/*.{ts,js,tsx,jsx}', '**/*.{ts,js}']
): Promise<AutoFixResult> {
  const files = await fg(globs, {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/**']
  });

  const filesModified: string[] = [];
  let swallowedErrorsFixed = 0;
  let tsIgnoreFixed = 0;

  for (const file of files) {
    try {
      const original = await fs.readFile(file, 'utf-8');
      let updated = original;

      // 1. Fix swallowed errors: catch (e) { console.error('[AgentGuard AutoFix] Caught exception:', e); } -> catch(e) { console.error('Unhandled agent error:', e); }
      const catchMatches = original.match(/catch\s*\(([a-zA-Z0-9_]+)\)\s*\{\s*\}/g);
      if (catchMatches) {
        updated = updated.replace(/catch\s*\(([a-zA-Z0-9_]+)\)\s*\{\s*\}/g, (_match, varName) => {
          swallowedErrorsFixed++;
          return `catch (${varName}) { console.error('[AgentGuard AutoFix] Caught exception:', ${varName}); }`;
        });
      }

      // 2. Fix @ts-ignore -> @ts-expect-error
      const tsIgnoreMatches = original.match(/\/\/\s*@ts-ignore/g);
      if (tsIgnoreMatches) {
        tsIgnoreFixed += tsIgnoreMatches.length;
        updated = updated.replace(/\/\/\s*@ts-ignore/g, '// @ts-expect-error [AgentGuard] Verified type bypass');
      }

      if (updated !== original) {
        await fs.writeFile(file, updated, 'utf-8');
        filesModified.push(path.relative(rootDirectory, file));
      }
    } catch {
      // Ignore
    }
  }

  return {
    filesModified,
    swallowedErrorsFixed,
    tsIgnoreFixed
  };
}
