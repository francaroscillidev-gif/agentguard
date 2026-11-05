import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { verifyNpmPackage, verifyPyPIPackage } from '../checkers/packages.js';
import { analyzeCodeSlop } from '../checkers/slop.js';
import { checkSemanticDrift } from '../checkers/drift.js';

export function createAgentGuardServer() {
  const server = new Server(
    {
      name: 'agentguard-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools for AI agents
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'verify_package',
          description:
            'Verifies if an npm or PyPI dependency really exists, has not been hallucinated by an LLM, and is safe from typosquatting/malicious recent uploads.',
          inputSchema: {
            type: 'object',
            properties: {
              packageName: {
                type: 'string',
                description: 'The package name to verify (e.g. "lodash", "react-router-dom-v7-fix")'
              },
              ecosystem: {
                type: 'string',
                enum: ['npm', 'pypi'],
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
          name: 'analyze_code_slop',
          description:
            'Audits codebase for redundant AI-generated boilerplate, placeholder comments ("// in production..."), and duplicate reinventions of existing utility functions.',
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

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'verify_package') {
      const pkg = String(args?.packageName);
      const eco = (args?.ecosystem as 'npm' | 'pypi') || 'npm';
      const minAge = args?.minAgeDays ? Number(args.minAgeDays) : 30;

      const res =
        eco === 'pypi'
          ? await verifyPyPIPackage(pkg, { minAgeDays: minAge })
          : await verifyNpmPackage(pkg, { minAgeDays: minAge });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2)
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
