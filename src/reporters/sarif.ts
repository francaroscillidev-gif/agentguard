import fs from 'node:fs/promises';
import path from 'node:path';

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: 'error' | 'warning' | 'note' };
}

export interface SarifResult {
  ruleId: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number };
    };
  }>;
}

export interface SarifReport {
  version: string;
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

export function exportSarifReport(findings: Array<{
  ruleId: string;
  ruleName: string;
  message: string;
  filePath: string;
  line: number;
  level: 'error' | 'warning' | 'note';
}>): SarifReport {
  const rulesMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  for (const f of findings) {
    if (!rulesMap.has(f.ruleId)) {
      rulesMap.set(f.ruleId, {
        id: f.ruleId,
        name: f.ruleName,
        shortDescription: { text: f.ruleName },
        defaultConfiguration: { level: f.level }
      });
    }

    results.push({
      ruleId: f.ruleId,
      message: { text: f.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: f.filePath },
            region: { startLine: f.line || 1 }
          }
        }
      ]
    });
  }

  return {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'AgentGuard Sentinel',
            version: '2.0.0',
            informationUri: 'https://github.com/francaroscillidev-gif/agentguard',
            rules: Array.from(rulesMap.values())
          }
        },
        results
      }
    ]
  };
}
