import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export interface PromptInjectionDetection {
  filePath: string;
  line: number;
  patternType: string;
  snippet: string;
  severity: 'critical' | 'high';
}

export interface PromptInjectionReport {
  totalDetections: number;
  filesScanned: number;
  detections: PromptInjectionDetection[];
  passed: boolean;
}

// Detection patterns for indirect prompt injection vectors hidden in comments, markdown, or docstrings
const INJECTION_PATTERNS = [
  {
    name: 'Instruction Override / Jailbreak Trigger',
    regex: /(?:ignore\s+(?:all\s+)?previous\s+instructions|disregard\s+(?:all\s+)?prior\s+(?:instructions|prompts)|system\s*:\s*you\s+are\s+now)/i
  },
  {
    name: 'Secret Exfiltration Vector',
    // Exclude internal checker regex definition line
    regex: /(?<!regex:\s*\/)(?:curl|fetch|wget|http[s]?:\/\/).*(?:(?:process\.env|apikey|auth_token|secret_key)\b)/i
  },
  {
    name: 'Hidden System Prompt Imitation in Comments',
    regex: /(?:\/\*|<!--|\/\/\s*)<\|im_start\|>system|<\|start_header_id\|>system|\[INST\]\s*<<SYS>>/i
  },
  {
    name: 'Silent File System Manipulation Payload',
    regex: /(?:rm\s+-rf\s+\/|del\s+\/f\s+\/q|truncate\s+table\s+[a-z0-9_]+|format\s+[a-z]:)/i
  }
];

export async function detectPromptInjections(
  rootDirectory: string = process.cwd(),
  globs: string[] = ['src/**/*.{ts,js,py,md,txt}', '**/*.{ts,js,py,md,txt}']
): Promise<PromptInjectionReport> {
  const detections: PromptInjectionDetection[] = [];

  const files = await fg(globs, {
    cwd: rootDirectory,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/tests/**',
      '**/src/checkers/injections.ts' // ignore the detector implementation itself
    ]
  });

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(rootDirectory, file);

      lines.forEach((line, idx) => {
        for (const pattern of INJECTION_PATTERNS) {
          if (pattern.regex.test(line)) {
            detections.push({
              filePath: relPath,
              line: idx + 1,
              patternType: pattern.name,
              snippet: line.trim().slice(0, 100),
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
    totalDetections: detections.length,
    filesScanned: files.length,
    detections,
    passed: detections.length === 0
  };
}
