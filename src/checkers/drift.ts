export interface DriftCheckResult {
  intent: string;
  filesModified: string[];
  semanticAlignmentScore: number; // 0 to 1
  driftDetected: boolean;
  unrelatedFiles: string[];
  explanation: string;
}

/**
 * Checks if the files touched by an agent's task correspond to the declared intent/scope.
 */
export function checkSemanticDrift(
  userIntent: string,
  filesModified: string[]
): DriftCheckResult {
  const intentLower = userIntent.toLowerCase();
  const intentTokens = new Set(
    intentLower
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const unrelatedFiles: string[] = [];
  let alignedCount = 0;

  for (const file of filesModified) {
    const fileLower = file.toLowerCase();
    const fileTokens = fileLower
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Check if filename shares semantic intent with the prompt
    const hasOverlap = fileTokens.some((token) => intentTokens.has(token));

    // Common system files or config files modified in reasonable tasks
    const isCommonConfig =
      fileLower.includes('package.json') ||
      fileLower.includes('tsconfig') ||
      fileLower.includes('readme.md');

    if (hasOverlap || isCommonConfig) {
      alignedCount++;
    } else {
      unrelatedFiles.push(file);
    }
  }

  const total = filesModified.length;
  const score = total > 0 ? Number((alignedCount / total).toFixed(2)) : 1.0;
  const driftDetected = score < 0.5 && unrelatedFiles.length > 0;

  let explanation = 'Files modified are consistent with the declared user intent.';
  if (driftDetected) {
    explanation = `Agent drift detected! Modified files (${unrelatedFiles.join(
      ', '
    )}) have low semantic correlation with intent "${userIntent}". The agent might be editing out of scope.`;
  }

  return {
    intent: userIntent,
    filesModified,
    semanticAlignmentScore: score,
    driftDetected,
    unrelatedFiles,
    explanation
  };
}
