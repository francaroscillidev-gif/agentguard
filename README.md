# 🛡️ AgentGuard

> **The open-source AI Integrity Sentinel & MCP Server preventing AI Dependency Hallucinations, Secret Leaks, Silent Code Degradation ("AI Slop"), and Agent Scope Drift.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@francaroscillidev/agentguard.svg)](https://www.npmjs.com/package/@francaroscillidev/agentguard)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compliant-brightgreen.svg)](https://modelcontextprotocol.io)

---

## 💥 The Critical Unsolved Problems in AI Coding

As autonomous AI Coding Agents (Claude Code, Cursor, Antigravity, Devin, Copilot Workspace) generate code, critical failure modes frequently bypass traditional static linters (ESLint, Prettier, SonarQube):

1. **AI Dependency Hallucination / Package Confusion Attack:**
   Agents invent non-existent package names across npm, PyPI, Crates, and Go, creating ripe opportunities for attackers to register malicious packages with the same names.
2. **Accidental Hardcoded Secrets:**
   Agents frequently hardcode real API keys (OpenAI `sk-...`, GitHub PAT, AWS tokens) inside test scripts or client source files.
3. **AI Code Smells & "Lazy Stubs":**
   Agents often bypass errors with empty `catch (e) {}` blocks, inline `eval()`, or suppress strict checks with `@ts-ignore` to "pretend" the build passed.
4. **AI Slop & Repetitive Helpers:**
   Agents duplicate common utilities (`deepClone`, `formatDate`) across multiple files rather than centralizing them.
5. **Agent Scope Drift:**
   Agents modify files unrelated to the user's initial task specification.

---

## ⚡ What AgentGuard v1.3.0 Solves

AgentGuard acts as an **autonomous MCP Server** and a **Git Pre-Commit Hook**:

* 🌐 **Multi-Ecosystem Anti-Hallucination:**
  - Validates **npm**, **PyPI**, **crates.io** (Rust), and **proxy.golang.org** (Go).
  - Flags packages released <30 days ago or with dangerously low adoption.
* 📦 **Workspace Manifest Deep Auditor (`audit-manifests`):**
  - Scans `package.json`, `requirements.txt`, and `Cargo.toml` in bulk.
* 🔑 **Secret & Credential Interceptor (`scan-secrets`):**
  - Detects and masks OpenAI/Anthropic keys, GitHub PATs, AWS credentials, and private keys.
* 🦹 **AI Code Smell Detector (`audit-smells`):**
  - Flags swallowed exceptions (`catch {}`), `eval()`, and `@ts-ignore`.
* ⚓ **Native Git Pre-Commit Hook (`install-hook`):**
  - Installs a zero-dependency pre-commit guard in `.git/hooks/pre-commit` to prevent committing hallucinations and secrets.
* 🧭 **Semantic Scope Drift Sentinel (`check-drift`):**
  - Measures alignment between user intent and modified files.

---

## 🚀 Installation & Quick Start

### Global / Local CLI
```bash
# Run directly with npx
npx @francaroscillidev/agentguard --help

# Or install globally
npm install -g @francaroscillidev/agentguard
```

### 1. Install Pre-Commit Hook in Your Repo
```bash
agentguard install-hook
```
*Now, every `git commit` automatically validates staged files for secret leaks and verifies modified manifests!*

### 2. Verify Single Dependencies
```bash
# npm
agentguard check-package react

# Rust (crates.io)
agentguard check-package serde -e crates

# Python (PyPI)
agentguard check-package requests -e pypi

# Go (proxy.golang.org)
agentguard check-package github.com/gin-gonic/gin -e golang
```

### 3. Audit Full Project Manifests
```bash
agentguard audit-manifests
```

### 4. Scan for Secrets & AI Code Smells
```bash
# Scan for API keys or credentials
agentguard scan-secrets

# Scan for swallowed errors & dangerous antipatterns
agentguard audit-smells
```

### 5. Audit Codebase for AI Slop
```bash
agentguard audit-slop --format markdown
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
- `audit_manifests`: Validate all project dependencies in bulk.
- `detect_secret_leaks`: Check for hardcoded credentials.
- `audit_code_smells`: Scan for swallowed exceptions and antipatterns.
- `analyze_code_slop`: Detect repetitive utilities and AI boilerplate.
- `check_scope_drift`: Verify file changes match user prompt intent.

---

## 📄 License

Apache License 2.0. Open-source and free for all developers and AI agent platforms.
