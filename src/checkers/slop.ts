import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

export interface CodeSlopDetection {
  filePath: string;
  category: 'DUPLICATE_UTILITY' | 'OVER_ENGINEERED_FALLBACK' | 'VERBOSE_COMMENTARY' | 'DEAD_BOILERPLATE';
  severity: 'low' | 'medium' | 'high';
  description: string;
  matchedPattern?: string;
  suggestion: string;
}

export interface SlopAnalysisReport {
  totalIssues: number;
  detections: CodeSlopDetection[];
  passed: boolean;
}

// Patterns commonly hallucinated or bloated by AI coding agents
const AI_COMMENT_PATTERNS = [
  /\/\/ In a production environment, this should be replaced with/i,
  /\/\/ NOTE: For simplicity, we implement this inline/i,
  /\/\/ TODO: add real error handling here/i,
  /\/\* Auto-generated fallback implementation \*\//i,
  /\/\/ In real code you would use a library like/i
];

/**
 * Common utils that AI agents tend to reinvent instead of reusing project helpers or stdlib.
 */
const COMMON_REINVENTED_UTILS = [
  { name: 'deepClone', pattern: /(function\s+deepClone|const\s+deepClone\s*=)/ },
  { name: 'debounce', pattern: /(function\s+debounce|const\s+debounce\s*=)/ },
  { name: 'throttle', pattern: /(function\s+throttle|const\s+throttle\s*=)/ },
  { name: 'slugify', pattern: /(function\s+slugify|const\s+slugify\s*=)/ },
  { name: 'uuidv4', pattern: /(function\s+(?:generateUUID|uuidv4)|const\s+uuidv4\s*=)/ },
  { name: 'formatDate', pattern: /(function\s+formatDate|const\s+formatDate\s*=)/ }
];

/**
 * Scans code files for signs of "AI Slop" (gratuitous boilerplate, duplicated utils, lazy agent placeholders).
 */
export async function analyzeCodeSlop(
  rootDirectory: string,
  targetGlobs: string[] = ['src/**/*.{ts,js,tsx,jsx,py}']
): Promise<SlopAnalysisReport> {
  const detections: CodeSlopDetection[] = [];

  const files = await fg(targetGlobs, {
    cwd: rootDirectory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
  });

  const utilityOccurrences = new Map<string, string[]>();

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // 1. Check for AI commentary placeholders
      lines.forEach((line, idx) => {
        for (const pattern of AI_COMMENT_PATTERNS) {
          if (pattern.test(line)) {
            detections.push({
              filePath: path.relative(rootDirectory, filePath),
              category: 'VERBOSE_COMMENTARY',
              severity: 'medium',
              description: `Agent placeholder comment found at line ${idx + 1}: "${line.trim()}"`,
              suggestion: 'Remove artificial agent boilerplate or implement actual production logic.'
            });
          }
        }
      });

      // 2. Check for duplicated/reinvented common utility functions across files
      for (const util of COMMON_REINVENTED_UTILS) {
        if (util.pattern.test(content)) {
          const relativePath = path.relative(rootDirectory, filePath);
          const list = utilityOccurrences.get(util.name) || [];
          list.push(relativePath);
          utilityOccurrences.set(util.name, list);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Flag utilities that appear in multiple files without being centralized
  for (const [utilName, locations] of utilityOccurrences.entries()) {
    if (locations.length > 1) {
      locations.forEach((loc) => {
        detections.push({
          filePath: loc,
          category: 'DUPLICATE_UTILITY',
          severity: 'high',
          description: `Utility '${utilName}' is duplicated across ${locations.length} files (${locations.join(', ')}).`,
          suggestion: `Centralize '${utilName}' in a shared utils module rather than letting AI re-generate it per file.`
        });
      });
    }
  }

  return {
    totalIssues: detections.length,
    detections,
    passed: detections.filter((d) => d.severity === 'high').length === 0
  };
}
