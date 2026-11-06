import fs from 'node:fs/promises';
import path from 'node:path';

export interface PreCommitInstallResult {
  installed: boolean;
  hookPath: string;
  message: string;
}

const PRE_COMMIT_SCRIPT = `#!/bin/sh
# 🛡️ AgentGuard Git Pre-Commit Hook
# Prevents AI dependency hallucinations, secret leaks, and cognitive code degradation

echo "🛡️  Running AgentGuard pre-commit checks..."

# Check if agentguard or npx @francaroscillidev/agentguard is available
RUNNER="npx --no-install @francaroscillidev/agentguard"
if command -v agentguard >/dev/null 2>&1; then
  RUNNER="agentguard"
elif [ -f "dist/cli/index.js" ]; then
  RUNNER="node dist/cli/index.js"
fi

# 1. Check for leaked secrets in staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -n "$STAGED_FILES" ]; then
  $RUNNER scan-secrets $STAGED_FILES
  if [ $? -ne 0 ]; then
    echo "❌ [AgentGuard] Commit aborted: Secret credentials or API keys detected in staged files."
    exit 1
  fi
fi

# 2. Check workspace manifests if modified
if echo "$STAGED_FILES" | grep -E '(package\.json|requirements.*\.txt|Cargo\.toml)' > /dev/null; then
  echo "🔍 [AgentGuard] Manifest changes detected. Validating dependencies against registries..."
  $RUNNER audit-manifests .
  if [ $? -ne 0 ]; then
    echo "❌ [AgentGuard] Commit aborted: Hallucinated or high-risk dependencies detected in manifests."
    exit 1
  fi
fi

echo "✅ [AgentGuard] All integrity checks passed!"
exit 0
`;

/**
 * Installs AgentGuard as a native Git pre-commit hook in .git/hooks/pre-commit
 */
export async function installGitHook(rootDirectory: string = process.cwd()): Promise<PreCommitInstallResult> {
  const gitDir = path.join(rootDirectory, '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const hookFile = path.join(hooksDir, 'pre-commit');

  try {
    await fs.access(gitDir);
  } catch {
    throw new Error(`Directory "${rootDirectory}" is not a Git repository (.git not found).`);
  }

  await fs.mkdir(hooksDir, { recursive: true });
  await fs.writeFile(hookFile, PRE_COMMIT_SCRIPT, { mode: 0o755 });

  return {
    installed: true,
    hookPath: hookFile,
    message: 'Git pre-commit hook installed successfully!'
  };
}
