#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fg from 'fast-glob';
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
import { runServer } from '../mcp/server.js';

const program = new Command();

program
  .name('agentguard')
  .description('🛡️ AgentGuard: Open Source AI Integrity & Anti-Hallucination Sentinel for Coding Agents')
  .version('1.2.0');

// Verify single package CLI
program
  .command('check-package <name>')
  .description('Verify if a package is genuine or an AI hallucination / recent typosquat')
  .option('-e, --ecosystem <ecosystem>', 'npm, pypi, crates, or golang', 'npm')
  .option('-d, --days <days>', 'Minimum safe days since release', '30')
  .action(async (name, options) => {
    const eco = options.ecosystem as Ecosystem;
    console.log(chalk.blue(`\n🔍 Verifying dependency '${name}' on ${eco}...`));

    let result;
    if (eco === 'pypi') {
      result = await verifyPyPIPackage(name, { minAgeDays: Number(options.days) });
    } else if (eco === 'crates') {
      result = await verifyCratesPackage(name, { minAgeDays: Number(options.days) });
    } else if (eco === 'golang') {
      result = await verifyGoModule(name, { minAgeDays: Number(options.days) });
    } else {
      result = await verifyNpmPackage(name, { minAgeDays: Number(options.days) });
    }

    if (!result.exists) {
      console.log(chalk.red.bold(`\n❌ BLOCKED: Package does not exist!`));
      result.warnings.forEach((w) => console.log(chalk.red(`  • ${w}`)));
      process.exit(1);
    }

    if (result.isHighRisk) {
      console.log(chalk.yellow.bold(`\n⚠️  WARNING: High-risk dependency detected!`));
      result.warnings.forEach((w) => console.log(chalk.yellow(`  • ${w}`)));
    } else {
      console.log(chalk.green.bold(`\n✅ SAFE: Package verified.`));
      if (result.version) console.log(chalk.gray(`  Version: ${result.version}`));
      if (result.ageDays !== undefined) console.log(chalk.gray(`  Age: ${result.ageDays} days`));
      if (result.weeklyDownloads !== undefined) console.log(chalk.gray(`  Downloads: ${result.weeklyDownloads}`));
    }
  });

// Full Workspace Manifest Audit
program
  .command('audit-manifests [directory]')
  .description('Scan all package.json, requirements.txt, and Cargo.toml for hallucinated dependencies')
  .option('--format <format>', 'Output format: human or json', 'human')
  .action(async (directory = process.cwd(), options) => {
    if (options.format === 'human') {
      console.log(chalk.blue(`\n📦 Auditing all workspace manifests in ${directory}...`));
    }

    const report = await auditManifests(directory);

    if (options.format === 'json') {
      console.log(JSON.stringify(report, null, 2));
      if (!report.passed) process.exitCode = 1;
      return;
    }

    console.log(`\nScanned files: ${report.scannedFiles.join(', ')}`);
    console.log(`Total dependencies verified: ${report.totalDependencies}`);

    if (report.hallucinatedCount > 0) {
      console.log(chalk.red.bold(`\n🚨 DETECTED ${report.hallucinatedCount} HALLUCINATED DEPENDENCIES:`));
      report.dependencies
        .filter((d) => d.result.isHallucinated)
        .forEach((d) => {
          console.log(chalk.red(`  • ${d.name} in ${d.file}`));
        });
      process.exitCode = 1;
    } else {
      console.log(chalk.green.bold('\n✨ All manifest dependencies are genuine and verified!'));
    }
  });

// Scan for leaked secrets
program
  .command('scan-secrets [files...]')
  .description('Scan modified code or directory for accidentally hardcoded API keys and tokens')
  .action(async (files) => {
    let targetFiles = files;
    if (!files || files.length === 0) {
      targetFiles = await fg(['src/**/*.{ts,js,py}', '**/*.{ts,js,py}'], {
        ignore: ['**/node_modules/**', '**/dist/**']
      });
    }

    console.log(chalk.blue(`\n🔑 Scanning ${targetFiles.length} files for credentials/secrets...`));
    const report = await detectHardcodedSecrets(targetFiles);

    if (report.totalLeaks === 0) {
      console.log(chalk.green.bold('✨ No leaked API keys or secret credentials detected.'));
    } else {
      console.log(chalk.red.bold(`\n🚨 CRITICAL: Found ${report.totalLeaks} hardcoded credentials!`));
      report.detections.forEach((d) => {
        console.log(chalk.red(`  • [${d.patternType}] in ${d.filePath}:${d.line}`));
        console.log(chalk.gray(`    ${d.snippet}`));
      });
      process.exitCode = 1;
    }
  });

// Audit codebase for slop
program
  .command('audit-slop [directory]')
  .description('Scan project for AI boilerplate, duplicate reinvented utils, and fake placeholders')
  .option('--format <format>', 'Output format: human, json, or markdown', 'human')
  .action(async (directory = process.cwd(), options) => {
    if (options.format === 'human') {
      console.log(chalk.blue(`\n🧹 Scanning for AI Slop & Code Degradation in ${directory}...`));
    }

    const report = await analyzeCodeSlop(directory);

    if (options.format === 'json') {
      console.log(JSON.stringify(report, null, 2));
      if (!report.passed) process.exitCode = 1;
      return;
    }

    if (options.format === 'markdown') {
      console.log(`### 🛡️ AgentGuard Slop Audit Report\n`);
      console.log(`- **Total Issues:** ${report.totalIssues}`);
      console.log(`- **High Severity:** ${report.highSeverityCount}`);
      console.log(`- **Status:** ${report.passed ? '✅ Passed' : '❌ Failed'}\n`);
      if (report.detections.length > 0) {
        console.log(`| File | Category | Severity | Issue |`);
        console.log(`|---|---|---|---|`);
        report.detections.forEach((d) => {
          console.log(`| \`${d.filePath}${d.line ? ':' + d.line : ''}\` | ${d.category} | ${d.severity} | ${d.description} |`);
        });
      }
      if (!report.passed) process.exitCode = 1;
      return;
    }

    if (report.detections.length === 0) {
      console.log(chalk.green.bold('\n✨ No AI slop or duplicate utilities detected! Codebase is clean.'));
      return;
    }

    console.log(chalk.yellow.bold(`\nFound ${report.totalIssues} potential AI integrity issues (${report.highSeverityCount} high severity):`));
    for (const d of report.detections) {
      const tag = d.severity === 'high' ? chalk.red('[HIGH]') : chalk.yellow('[WARN]');
      const lineStr = d.line ? `:${d.line}` : '';
      console.log(`\n${tag} ${chalk.cyan(d.filePath + lineStr)} - ${d.category}`);
      console.log(`   ${d.description}`);
      console.log(chalk.gray(`   💡 Suggestion: ${d.suggestion}`));
    }

    if (!report.passed) {
      process.exitCode = 1;
    }
  });

// Check drift
program
  .command('check-drift')
  .description('Verify if edited files align with user prompt intent')
  .requiredOption('-i, --intent <intent>', 'Original user prompt or task specification')
  .requiredOption('-f, --files <files...>', 'Files changed by agent')
  .action((options) => {
    console.log(chalk.blue(`\n🧭 Checking cognitive drift against prompt: "${options.intent}"`));
    const res = checkSemanticDrift(options.intent, options.files);

    if (res.driftDetected) {
      console.log(chalk.red.bold('\n🚨 DRIFT DETECTED:'));
      console.log(chalk.red(`  ${res.explanation}`));
      process.exit(1);
    } else {
      console.log(chalk.green.bold(`\n✅ ALIGNED: Semantic score ${(res.semanticAlignmentScore * 100).toFixed(0)}%`));
      console.log(chalk.gray(`  ${res.explanation}`));
    }
  });

// Run as MCP Server for agents
program
  .command('mcp')
  .description('Launch AgentGuard as an MCP server for Claude, Antigravity, or Cursor')
  .action(async () => {
    await runServer();
  });

program.parse(process.argv);
