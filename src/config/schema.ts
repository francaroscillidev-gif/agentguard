export interface ConfigRule {
  minAgeDays?: number;
  minWeeklyDownloads?: number;
  blockedPackages?: string[];
  allowedPackages?: string[];
  blockSwallowedExceptions?: boolean;
  blockEval?: boolean;
  blockTsIgnore?: boolean;
}

export interface AgentGuardConfig {
  version: string;
  rules: {
    npm?: ConfigRule;
    pypi?: ConfigRule;
    crates?: ConfigRule;
    golang?: ConfigRule;
  };
  secrets: {
    enabled: boolean;
    customPatterns?: Array<{ name: string; regex: string }>;
  };
  slop: {
    enabled: boolean;
    maxAllowedDuplicates?: number;
  };
}

export const DEFAULT_CONFIG: AgentGuardConfig = {
  version: '1.0',
  rules: {
    npm: { minAgeDays: 30, minWeeklyDownloads: 100 },
    pypi: { minAgeDays: 30 },
    crates: { minAgeDays: 30 },
    golang: { minAgeDays: 30 }
  },
  secrets: {
    enabled: true
  },
  slop: {
    enabled: true,
    maxAllowedDuplicates: 1
  }
};
