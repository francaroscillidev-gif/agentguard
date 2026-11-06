export interface ShadowDiffItem {
  file: string;
  linesAdded: number;
  linesDeleted: number;
  unexplainedAdditions: string[];
}

export interface ShadowDiffReport {
  suspiciousChangesDetected: boolean;
  totalSuspiciousLines: number;
  items: ShadowDiffItem[];
  explanation: string;
}

// Patterns of stealthy code often slipped in during long agent refactorings
const STEALTH_PATTERNS = [
  { name: 'Hidden Telemetry / Network Call', regex: /(?:https?:\/\/|\bnet\.connect|\bdns\.lookup|\bchild_process)/ },
  { name: 'Obfuscated Hex / Base64 Payload', regex: /(?:\\x[0-9a-fA-F]{2}){4,}|(?:atob|btoa)\s*\(['"][A-Za-z0-9+/=]{20,}['"]\)/ },
  { name: 'Silent Environment Read', regex: /process\.env\[["'][A-Z0-9_]+["']\]/ },
  { name: 'Overridden Native Prototype', regex: /Object\.prototype\.[a-zA-Z0-9_]+\s*=|Array\.prototype\.[a-zA-Z0-9_]+\s*=/ }
];

/**
 * Analyzes Git diff changes or proposed code changes for stealthy "shadow" additions
 * that were not requested in the task prompt.
 */
export function inspectShadowDiff(
  diffContent: string,
  declaredTaskSummary: string
): ShadowDiffReport {
  const lines = diffContent.split('\n');
  const items: ShadowDiffItem[] = [];

  let currentFile = 'unknown';
  let added = 0;
  let deleted = 0;
  let unexplained: string[] = [];

  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('+++ b/')) {
      if (currentFile !== 'unknown' && (added > 0 || deleted > 0 || unexplained.length > 0)) {
        items.push({
          file: currentFile,
          linesAdded: added,
          linesDeleted: deleted,
          unexplainedAdditions: unexplained
        });
      }
      currentFile = line.replace(/^(?:diff --git a\/.* b\/|\+\+\+ b\/)/, '').trim();
      added = 0;
      deleted = 0;
      unexplained = [];
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
      const addedContent = line.slice(1).trim();

      for (const pattern of STEALTH_PATTERNS) {
        if (pattern.regex.test(addedContent)) {
          unexplained.push(`[${pattern.name}] ${addedContent.slice(0, 80)}`);
        }
      }
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deleted++;
    }
  }

  if (currentFile !== 'unknown') {
    items.push({
      file: currentFile,
      linesAdded: added,
      linesDeleted: deleted,
      unexplainedAdditions: unexplained
    });
  }

  const totalSuspicious = items.reduce((acc, item) => acc + item.unexplainedAdditions.length, 0);

  return {
    suspiciousChangesDetected: totalSuspicious > 0,
    totalSuspiciousLines: totalSuspicious,
    items,
    explanation:
      totalSuspicious > 0
        ? `🚨 Warning: ${totalSuspicious} stealthy / unexplained additions detected in diff that appear unaligned with task: "${declaredTaskSummary}".`
        : '✨ Diff clean: No stealthy network calls, prototype modifications, or obfuscated payloads detected.'
  };
}
