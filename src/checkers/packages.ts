export type Ecosystem = 'npm' | 'pypi';

export interface PackageVerificationResult {
  packageName: string;
  ecosystem: Ecosystem;
  exists: boolean;
  version?: string;
  publishedDate?: string;
  ageDays?: number;
  weeklyDownloads?: number;
  isHallucinated: boolean;
  isHighRisk: boolean;
  warnings: string[];
}

export interface VerificationOptions {
  minAgeDays?: number; // default: 30 days
  minWeeklyDownloads?: number; // default: 100
}

/**
 * Verifies if an npm package exists and assesses supply chain hallucination / squatting risk.
 */
export async function verifyNpmPackage(
  packageName: string,
  options: VerificationOptions = {}
): Promise<PackageVerificationResult> {
  const minAgeDays = options.minAgeDays ?? 30;
  const minWeeklyDownloads = options.minWeeklyDownloads ?? 100;
  const warnings: string[] = [];

  try {
    const regUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const regRes = await fetch(regUrl);

    if (regRes.status === 404) {
      return {
        packageName,
        ecosystem: 'npm',
        exists: false,
        isHallucinated: true,
        isHighRisk: true,
        warnings: [
          `🚨 PACKAGE HALLUCINATION DETECTED: "${packageName}" does not exist in the npm registry!`,
          `Attackers could register this package name to execute arbitrary code on your system.`
        ]
      };
    }

    if (!regRes.ok) {
      warnings.push(`Warning: Registry responded with status ${regRes.status}.`);
    }

    const regData = (await regRes.json()) as any;
    const timeInfo = regData.time || {};
    const createdStr = timeInfo.created;
    let ageDays: number | undefined;

    if (createdStr) {
      const createdDate = new Date(createdStr);
      const diffMs = Date.now() - createdDate.getTime();
      ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // Check downloads via npm downloads API
    let weeklyDownloads: number | undefined;
    try {
      const dlUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
      const dlRes = await fetch(dlUrl);
      if (dlRes.ok) {
        const dlData = (await dlRes.json()) as any;
        weeklyDownloads = dlData.downloads;
      }
    } catch {
      // Ignored if downloads endpoint is unavailable
    }

    let isHighRisk = false;

    if (ageDays !== undefined && ageDays < minAgeDays) {
      isHighRisk = true;
      warnings.push(
        `⚠️ RECENTLY CREATED PACKAGE: "${packageName}" was published only ${ageDays} days ago (minimum safe threshold: ${minAgeDays} days). Potential typosquat or malicious AI package.`
      );
    }

    if (weeklyDownloads !== undefined && weeklyDownloads < minWeeklyDownloads) {
      isHighRisk = true;
      warnings.push(
        `⚠️ LOW ADOPTION: "${packageName}" has only ${weeklyDownloads} weekly downloads (safe threshold: >= ${minWeeklyDownloads}).`
      );
    }

    const latestVersion = regData['dist-tags']?.latest;

    return {
      packageName,
      ecosystem: 'npm',
      exists: true,
      version: latestVersion,
      publishedDate: createdStr,
      ageDays,
      weeklyDownloads,
      isHallucinated: false,
      isHighRisk,
      warnings
    };
  } catch (err: any) {
    return {
      packageName,
      ecosystem: 'npm',
      exists: false,
      isHallucinated: false,
      isHighRisk: true,
      warnings: [`Network / registry check error: ${err.message}`]
    };
  }
}

/**
 * Verifies if a PyPI package exists and assesses hallucination risk.
 */
export async function verifyPyPIPackage(
  packageName: string,
  options: VerificationOptions = {}
): Promise<PackageVerificationResult> {
  const minAgeDays = options.minAgeDays ?? 30;
  const warnings: string[] = [];

  try {
    const url = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;
    const res = await fetch(url);

    if (res.status === 404) {
      return {
        packageName,
        ecosystem: 'pypi',
        exists: false,
        isHallucinated: true,
        isHighRisk: true,
        warnings: [
          `🚨 PACKAGE HALLUCINATION DETECTED: "${packageName}" does not exist in PyPI!`,
          `This package may have been hallucinated by an LLM.`
        ]
      };
    }

    const data = (await res.json()) as any;
    const latestVersion = data.info?.version;
    const releases = data.releases || {};
    let createdStr: string | undefined;

    // Find earliest release upload time
    for (const v in releases) {
      const files = releases[v];
      if (files && files.length > 0 && files[0].upload_time_iso_8601) {
        if (!createdStr || new Date(files[0].upload_time_iso_8601) < new Date(createdStr)) {
          createdStr = files[0].upload_time_iso_8601;
        }
      }
    }

    let ageDays: number | undefined;
    let isHighRisk = false;

    if (createdStr) {
      const createdDate = new Date(createdStr);
      const diffMs = Date.now() - createdDate.getTime();
      ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (ageDays < minAgeDays) {
        isHighRisk = true;
        warnings.push(
          `⚠️ RECENTLY CREATED PACKAGE: "${packageName}" on PyPI is only ${ageDays} days old (safe threshold: ${minAgeDays} days).`
        );
      }
    }

    return {
      packageName,
      ecosystem: 'pypi',
      exists: true,
      version: latestVersion,
      publishedDate: createdStr,
      ageDays,
      isHallucinated: false,
      isHighRisk,
      warnings
    };
  } catch (err: any) {
    return {
      packageName,
      ecosystem: 'pypi',
      exists: false,
      isHallucinated: false,
      isHighRisk: true,
      warnings: [`PyPI check error: ${err.message}`]
    };
  }
}
