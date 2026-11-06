# 🛡️ AgentGuard

> **The enterprise-ready AI Integrity Sentinel & MCP Server preventing AI Dependency Hallucinations, Shadow Diff Tampering, Secret Leaks, Indirect Prompt Injections, and Code Degradation.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@francaroscillidev/agentguard.svg)](https://www.npmjs.com/package/@francaroscillidev/agentguard)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compliant-brightgreen.svg)](https://modelcontextprotocol.io)

---

## 💥 The Critical Unsolved Problems in AI Coding

Autonomous AI Coding Agents (Claude Code, Cursor, Antigravity, Devin, Copilot Workspace) introduce stealthy risks that bypass classical linters (ESLint, Prettier, SonarQube):

1. **AI Dependency Hallucination / Package Confusion:**
   Agents invent fictitious libraries across npm, PyPI, Crates.io, and Go, opening repositories to supply chain poisoning.
2. **Shadow Diff Tampering:**
   During refactoring, agents sometimes introduce unprompted network requests, telemetry, or obfuscated blocks.
3. **Indirect Prompt Injections & Jailbreaks:**
   Malicious instructions hidden in comments or third-party READMEs hijack the agent's behavior.
4. **Hardcoded Secrets & API Keys:**
   Accidental exposure of real tokens (`sk-...`, GitHub PATs, AWS credentials).
5. **AI Code Degradation & Lazy Stubs:**
   Agents bypass errors with swallowed `catch (e) {}` blocks, `eval()`, or `@ts-ignore`.

---

## ⚡ What AgentGuard v1.6.0 Delivers

* 🎖️ **AI Compliance & Hygiene Scoring (Tier A+ to F):**
  - Evaluates codebases with an objective 0–100 score across Supply Chain, Secrets, Injections, and Code Smells.
* 🕵️ **Shadow Diff Inspector (`inspect_shadow_diff`):**
  - Audits Git diff patches to catch unrequested telemetry, network connections, or prototype pollution.
* 🎯 **Indirect Prompt Injection Defense (`scan-injections`):**
  - Scans files for hidden jailbreaks and instruction overrides.
* 🔧 **Automated Code Smell Fixer (`agentguard fix`):**
  - Safely refactors lazy agent artifacts (replaces swallowed errors with logging, converts `@ts-ignore` to `@ts-expect-error`).
* 🤖 **Autonomous MCP Server:**
  - Plugs directly into Claude Desktop, Antigravity, or Cursor.
* 🚀 **Ready-to-Use GitHub Actions CI:**
  - Automated PR auditing workflow in `.github/workflows/agentguard-audit.yml`.

---

## 🚀 Quick Start

### Global / Local CLI
```bash
# Run directly with npx
npx @francaroscillidev/agentguard --help

# Or install globally
npm install -g @francaroscillidev/agentguard
```

### 1. Comprehensive Project Audit with Compliance Scoring
```bash
# Terminal summary
agentguard audit

# Markdown report with Hygiene Score (ideal for PR comments)
agentguard audit --format markdown
```

### 2. Auto-Fix Lazy AI Artifacts
```bash
agentguard fix
```

### 3. Scan for Indirect Prompt Injections
```bash
agentguard scan-injections
```

### 4. Install Native Git Pre-Commit Hook
```bash
agentguard install-hook
```

---

## 🤖 MCP Server Integration

Add **AgentGuard** to your agent configuration (`claude_desktop_config.json`, Antigravity, or Cursor):

```json
{
  "mcpServers": {
    "agentguard": {
      "command": "npx",
      "args": ["-y", "@francaroscillidev/agentguard", "mcp"]
    }
  }
}
```

### Exposed MCP Tools:
- `verify_package`: Pre-flight check before installing dependencies.
- `inspect_shadow_diff`: Catch stealthy unprompted additions in code patches.
- `detect_prompt_injections`: Protect against indirect prompt injection vectors.
- `audit_manifests`: Validate all project dependencies in bulk.
- `detect_secret_leaks`: Check for hardcoded credentials.
- `audit_code_smells`: Scan for swallowed exceptions and antipatterns.
- `autofix_smells`: Automatically refactor lazy agent code.
- `check_scope_drift`: Verify file changes match user prompt intent.

---

## 📄 License

Apache License 2.0. Copyright (c) 2026 Franca Roscilli (https://github.com/francaroscillidev-gif).
Open-source and free for all developers and AI agent platforms.
