import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export interface CodeSmell {
  filePath: string;
  line: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  recommendation: string;
}

export interface AdvancedSmellReport {
  totalSmells: number;
  filesScanned: number;
  smells: CodeSmell[];
}

const SMELL_RULES = [
  {
    name: 'Broad Catch with Swallowed Error',
    regex: /catch\s*\([^\)]*\)\s*\{\s*(?:\/\/.*|\/\*.*\*\/)?\s*\}/,
    severity: 'high' as const,
    recommendation: 'Do not silently swallow exceptions. Log or rethrow them.'
  },
  {
    name: 'Dangerous Insecure Eval',
    regex: /\beval\s*\(/,
    severity: 'high' as const,
    recommendation: 'Avoid eval() which introduces code injection vulnerabilities.'
  },
  {
    name: 'Disabled Strict Type Checks',
    regex: /\/\/\s*@ts-ignore|\/\/\s*@ts-nocheck/,
    severity: 'medium' as const,
    recommendation: 'Fix the underlying TypeScript type error rather than bypassing compiler checks.'
  }
];

export async function auditCodeSmells(
  rootDirectory: string = process.cwd(),
  globs: string[] = ['src/**/*.{ts,js,tsx,jsx}', '**/*.{ts,js}']
): Promise<AdvancedSmellReport> {
  const smells: CodeSmell[] = [];

  const files = await fg(globs, {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
  });

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(rootDirectory, file);

      lines.forEach((line, idx) => {
        for (const rule of SMELL_RULES) {
          if (rule.regex.test(line)) {
            smells.push({
              filePath: relPath,
              line: idx + 1,
              type: rule.name,
              severity: rule.severity,
              details: line.trim(),
              recommendation: rule.recommendation
            });
          }
        }
      });
    } catch {
      // Ignore
    }
  }

  return {
    totalSmells: smells.length,
    filesScanned: files.length,
    smells
  };
}
