#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { verifyNpmPackage, verifyPyPIPackage } from '../checkers/packages.js';
import { analyzeCodeSlop } from '../checkers/slop.js';
import { checkSemanticDrift } from '../checkers/drift.js';
import { runServer } from '../mcp/server.js';

const program = new Command();

program
  .name('agentguard')
  .description('🛡️ AgentGuard: Open Source AI Integrity & Anti-Hallucination Sentinel for Coding Agents')
  .version('1.0.0');

// Verify package CLI
program
  .command('check-package <name>')
  .description('Verify if a package is genuine or an AI hallucination / recent typosquat')
  .option('-e, --ecosystem <ecosystem>', 'npm or pypi', 'npm')
  .option('-d, --days <days>', 'Minimum safe days since release', '30')
  .action(async (name, options) => {
    console.log(chalk.blue(`\n🔍 Verifying dependency '${name}' on ${options.ecosystem}...`));
    const result =
      options.ecosystem === 'pypi'
        ? await verifyPyPIPackage(name, { minAgeDays: Number(options.days) })
        : await verifyNpmPackage(name, { minAgeDays: Number(options.days) });

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
      console.log(chalk.gray(`  Version: ${result.version}`));
      if (result.ageDays !== undefined) console.log(chalk.gray(`  Age: ${result.ageDays} days`));
      if (result.weeklyDownloads !== undefined) console.log(chalk.gray(`  Weekly Downloads: ${result.weeklyDownloads}`));
    }
  });

// Audit codebase for slop
program
  .command('audit-slop [directory]')
  .description('Scan project for AI boilerplate, duplicate reinvented utils, and fake placeholders')
  .action(async (directory = process.cwd()) => {
    console.log(chalk.blue(`\n🧹 Scanning for AI Slop & Code Degradation in ${directory}...`));
    const report = await analyzeCodeSlop(directory);

    if (report.detections.length === 0) {
      console.log(chalk.green.bold('\n✨ No AI slop or duplicate utilities detected! Codebase is clean.'));
      return;
    }

    console.log(chalk.yellow.bold(`\nFound ${report.totalIssues} potential AI integrity issues:`));
    for (const d of report.detections) {
      const tag = d.severity === 'high' ? chalk.red('[HIGH]') : chalk.yellow('[WARN]');
      console.log(`\n${tag} ${chalk.cyan(d.filePath)} - ${d.category}`);
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
