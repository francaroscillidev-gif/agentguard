import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {
  verifyNpmPackage,
  verifyPyPIPackage,
  verifyCratesPackage,
  verifyGoModule,
  Ecosystem
} from '../checkers/packages.js';
import { analyzeCodeSlop } from '../checkers/slop.js';
import { checkSemanticDrift } from '../checkers/drift.js';
import { auditManifests } from '../checkers/manifests.js';
import { detectHardcodedSecrets } from '../checkers/secrets.js';
import { auditCodeSmells } from '../checkers/smells.js';
import { detectPromptInjections } from '../checkers/injections.js';
import { inspectShadowDiff } from '../checkers/shadowdiff.js';
import { interceptCommandExecution } from '../guardrails/shield.js';
import { CognitiveLoopTracker } from '../guardrails/loops.js';
import { autoFixCodeSmells } from '../fixers/autofix.js';

const loopTracker = new CognitiveLoopTracker(3);

export function createAgentGuardServer() {
  const server = new Server(
    {
      name: 'agentguard-mcp',
      version: '2.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'verify_package',
          description:
            'Verifies if an npm, PyPI, crates.io, or Go dependency genuinely exists, has not been hallucinated by an LLM, and is safe from typosquatting / malicious recent uploads.',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'The package/module name (e.g. "lodash", "requests", "serde", "github.com/gin-gonic/gin")'
              },
              ecosystem: {
                type: 'string',
                enum: ['npm', 'pypi', 'crates', 'golang'],
                description: 'Package registry ecosystem (default: npm)'
              },
              minAgeDays: {
                type: 'number',
                description: 'Minimum required days since release to be considered safe (default: 30)'
              }
            },
            required: ['packageName']
          }
        },
        {
          name: 'shield_command',
          description:
            'Pre-execution security interceptor that blocks destructive shell actions (rm -rf /, chmod 777, reverse shells, unverified curl pipes).',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Shell command the agent is about to execute'
              }
            },
            required: ['command']
          }
        },
        {
          name: 'check_cognitive_loop',
          description:
            'Monitors repeated failing tool executions or identical actions to break runaway infinite agent retry loops.',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'Description or key of the action attempted'
              }
            },
            required: ['action']
          }
        },
        {
          name: 'inspect_shadow_diff',
          description:
            'Analyzes git diff or proposed additions for stealthy unprompted network calls, obfuscated payloads, or prototype manipulations.',
          inputSchema: {
            type: 'object',
            properties: {
              diff: {
                type: 'string',
                description: 'Unified diff content or patch string'
              },
              taskSummary: {
                type: 'string',
                description: 'The task description the agent was asked to perform'
              }
            },
            required: ['diff', 'taskSummary']
          }
        },
        {
          name: 'detect_prompt_injections',
          description:
            'Scans files for indirect prompt injection vectors, jailbreak payloads, and instruction overrides hidden in comments or markdown.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Target root directory to scan (default: current directory)'
              }
            }
          }
        },
        {
          name: 'audit_manifests',
          description:
            'Scans all project manifest files (package.json, requirements.txt, Cargo.toml) to detect hallucinated or unverified dependencies across the whole codebase.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Target root directory to scan (default: current directory)'
              }
            }
          }
        },
        {
          name: 'detect_secret_leaks',
          description:
            'Scans modified or generated code for accidentally hardcoded API keys, tokens, or private credentials.',
          inputSchema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of files to scan for leaks'
              }
            },
            required: ['files']
          }
        },
        {
          name: 'audit_code_smells',
          description:
            'Detects dangerous AI coding antipatterns like swallowed exceptions (catch {}), eval(), and suppressed type errors (@ts-ignore).',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Target root directory to scan (default: current directory)'
              }
            }
          }
        },
        {
          name: 'autofix_smells',
          description:
            'Automatically fixes lazy AI code smells (replaces swallowed catch blocks with logging, replaces ts-ignore with ts-expect-error).',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Target root directory to fix (default: current directory)'
              }
            }
          }
        },
        {
          name: 'analyze_code_slop',
          description:
            'Audits codebase for redundant AI-generated boilerplate, placeholder comments ("// in production..."), lazy fake stubs, and duplicate reinventions of existing utility functions.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'The target directory path to audit (default: current directory)'
              }
            }
          }
        },
        {
          name: 'check_scope_drift',
          description:
            'Assesses whether modified files have drifted from original user instructions or if out-of-scope files were touched.',
          inputSchema: {
            type: 'object',
            properties: {
              userIntent: {
                type: 'string',
                description: 'The user requirement or original prompt task description'
              },
              filesModified: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of relative file paths proposed to be edited/created'
              }
            },
            required: ['userIntent', 'filesModified']
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'verify_package') {
      const pkg = String(args?.packageName);
      const eco = (args?.ecosystem as Ecosystem) || 'npm';
      const minAge = args?.minAgeDays ? Number(args.minAgeDays) : 30;

      let res;
      switch (eco) {
        case 'pypi':
          res = await verifyPyPIPackage(pkg, { minAgeDays: minAge });
          break;
        case 'crates':
          res = await verifyCratesPackage(pkg, { minAgeDays: minAge });
          break;
        case 'golang':
          res = await verifyGoModule(pkg, { minAgeDays: minAge });
          break;
        case 'npm':
        default:
          res = await verifyNpmPackage(pkg, { minAgeDays: minAge });
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }
        ]
      };
    }

    if (name === 'shield_command') {
      const cmd = String(args?.command || '');
      const decision = interceptCommandExecution(cmd);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(decision, null, 2)
          }
        ]
      };
    }

    if (name === 'check_cognitive_loop') {
      const act = String(args?.action || '');
      const verdict = loopTracker.recordAndEvaluate(act);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(verdict, null, 2)
          }
        ]
      };
    }

    if (name === 'inspect_shadow_diff') {
      const diff = String(args?.diff || '');
      const task = String(args?.taskSummary || '');
      const res = inspectShadowDiff(diff, task);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }
        ]
      };
    }

    if (name === 'detect_prompt_injections') {
      const dir = String(args?.directory || process.cwd());
      const report = await detectPromptInjections(dir);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    }

    if (name === 'autofix_smells') {
      const dir = String(args?.directory || process.cwd());
      const res = await autoFixCodeSmells(dir);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }
        ]
      };
    }

    if (name === 'audit_manifests') {
      const dir = String(args?.directory || process.cwd());
      const report = await auditManifests(dir);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    }

    if (name === 'detect_secret_leaks') {
      const files = (args?.files as string[]) || [];
      const report = await detectHardcodedSecrets(files);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    }

    if (name === 'audit_code_smells') {
      const dir = String(args?.directory || process.cwd());
      const report = await auditCodeSmells(dir);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    }

    if (name === 'analyze_code_slop') {
      const dir = String(args?.directory || process.cwd());
      const report = await analyzeCodeSlop(dir);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    }

    if (name === 'check_scope_drift') {
      const userIntent = String(args?.userIntent);
      const files = (args?.filesModified as string[]) || [];
      const driftResult = checkSemanticDrift(userIntent, files);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(driftResult, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

export async function runServer() {
  const server = createAgentGuardServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentGuard MCP Server running on stdio');
}
