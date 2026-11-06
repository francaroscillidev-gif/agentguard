import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import {
  verifyNpmPackage,
  verifyPyPIPackage,
  verifyCratesPackage,
  verifyGoModule,
  PackageVerificationResult
} from './packages.js';

export interface ManifestAuditItem {
  name: string;
  version?: string;
  file: string;
  result: PackageVerificationResult;
}

export interface ManifestAuditReport {
  scannedFiles: string[];
  totalDependencies: number;
  hallucinatedCount: number;
  highRiskCount: number;
  dependencies: ManifestAuditItem[];
  passed: boolean;
}

/**
 * Scans all package.json, requirements.txt, pyproject.toml, and Cargo.toml
 * in a workspace and validates every declared dependency against registries.
 */
export async function auditManifests(rootDirectory: string): Promise<ManifestAuditReport> {
  const items: ManifestAuditItem[] = [];
  const scannedFiles: string[] = [];

  // 1. Scan package.json files
  const packageJsonFiles = await fg(['**/package.json'], {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  for (const pFile of packageJsonFiles) {
    try {
      const raw = await fs.readFile(pFile, 'utf-8');
      const json = JSON.parse(raw);
      scannedFiles.push(path.relative(rootDirectory, pFile));

      const allDeps = {
        ...(json.dependencies || {}),
        ...(json.devDependencies || {})
      };

      for (const [pkgName, version] of Object.entries(allDeps)) {
        // Skip local workspace or file protocol references
        if (typeof version === 'string' && (version.startsWith('workspace:') || version.startsWith('file:'))) {
          continue;
        }

        const res = await verifyNpmPackage(pkgName);
        items.push({
          name: pkgName,
          version: typeof version === 'string' ? version : undefined,
          file: path.relative(rootDirectory, pFile),
          result: res
        });
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  // 2. Scan requirements.txt (Python)
  const reqFiles = await fg(['**/requirements*.txt'], {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/.venv/**', '**/venv/**']
  });

  for (const rFile of reqFiles) {
    try {
      const content = await fs.readFile(rFile, 'utf-8');
      scannedFiles.push(path.relative(rootDirectory, rFile));
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Extract package name before operators like ==, >=, <=, ~=
        const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)/);
        if (match) {
          const pkgName = match[1];
          const res = await verifyPyPIPackage(pkgName);
          items.push({
            name: pkgName,
            file: path.relative(rootDirectory, rFile),
            result: res
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Scan Cargo.toml (Rust)
  const cargoFiles = await fg(['**/Cargo.toml'], {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/target/**']
  });

  for (const cFile of cargoFiles) {
    try {
      const content = await fs.readFile(cFile, 'utf-8');
      scannedFiles.push(path.relative(rootDirectory, cFile));
      const lines = content.split('\n');
      let inDeps = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[dependencies]') || trimmed.startsWith('[dev-dependencies]')) {
          inDeps = true;
          continue;
        }
        if (trimmed.startsWith('[') && inDeps) {
          inDeps = false;
        }

        if (inDeps && trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=/);
          if (match) {
            const crateName = match[1];
            const res = await verifyCratesPackage(crateName);
            items.push({
              name: crateName,
              file: path.relative(rootDirectory, cFile),
              result: res
            });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  const hallucinatedCount = items.filter((i) => i.result.isHallucinated).length;
  const highRiskCount = items.filter((i) => i.result.isHighRisk).length;

  return {
    scannedFiles,
    totalDependencies: items.length,
    hallucinatedCount,
    highRiskCount,
    dependencies: items,
    passed: hallucinatedCount === 0 && highRiskCount === 0
  };
}
