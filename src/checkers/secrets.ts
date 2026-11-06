import fs from 'node:fs/promises';
import path from 'node:path';

export interface SecretLeakDetection {
  filePath: string;
  line: number;
  patternType: string;
  snippet: string;
  severity: 'critical' | 'high';
}

export interface SecretAuditReport {
  totalLeaks: number;
  detections: SecretLeakDetection[];
  passed: boolean;
}

// Regex patterns for secrets often hallucinated or accidentally pasted inline by agents
const SECRET_PATTERNS = [
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9_\-]{20,}/ },
  { name: 'Anthropic API Key', regex: /sk-ant-[a-zA-Z0-9_\-]{20,}/ },
  { name: 'GitHub Personal Access Token', regex: /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key Block', regex: /-----BEGIN\s+(?:RSA|OPENSSH|EC|PGP)?\s*PRIVATE KEY-----/ },
  { name: 'Generic Hardcoded Secret Assignment', regex: /(?:apiKey|api_key|secret_key|authToken|password)\s*[:=]\s*["'][a-zA-Z0-9!@#$%^&*_\-]{16,}["']/i }
];

export async function detectHardcodedSecrets(
  files: string[],
  rootDirectory: string = process.cwd()
): Promise<SecretAuditReport> {
  const detections: SecretLeakDetection[] = [];

  for (const file of files) {
    const fullPath = path.isAbsolute(file) ? file : path.join(rootDirectory, file);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            const masked = line.trim().replace(/([a-zA-Z0-9_\-]{4})[a-zA-Z0-9_\-]+([a-zA-Z0-9_\-]{4})/g, '$1****$2');
            detections.push({
              filePath: path.relative(rootDirectory, fullPath),
              line: index + 1,
              patternType: pattern.name,
              snippet: masked,
              severity: 'critical'
            });
            break;
          }
        }
      });
    } catch {
      // Ignore unreadable files
    }
  }

  return {
    totalLeaks: detections.length,
    detections,
    passed: detections.length === 0
  };
}
