import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentGuardConfig, DEFAULT_CONFIG } from './schema.js';

export async function loadConfig(rootDirectory: string = process.cwd()): Promise<AgentGuardConfig> {
  const configPath = path.join(rootDirectory, '.agentguardrc.json');
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      rules: { ...DEFAULT_CONFIG.rules, ...(parsed.rules || {}) },
      secrets: { ...DEFAULT_CONFIG.secrets, ...(parsed.secrets || {}) },
      slop: { ...DEFAULT_CONFIG.slop, ...(parsed.slop || {}) }
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function initConfigFile(rootDirectory: string = process.cwd()): Promise<string> {
  const configPath = path.join(rootDirectory, '.agentguardrc.json');
  await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  return configPath;
}
