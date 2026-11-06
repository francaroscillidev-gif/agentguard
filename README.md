# 🛡️ AgentGuard

> **The open-source AI Integrity Sentinel & MCP Server preventing AI Dependency Hallucinations, Silent Code Degradation ("AI Slop"), and Agent Scope Drift.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@francaroscillidev/agentguard.svg)](https://www.npmjs.com/package/@francaroscillidev/agentguard)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compliant-brightgreen.svg)](https://modelcontextprotocol.io)

---

## 💥 The Critical Unsolved Problem

As autonomous AI Coding Agents (Claude Code, Cursor, Antigravity, Devin, Copilot Workspace) write and refactor code, three dangerous failure modes have emerged that existing linters (ESLint, Prettier, SonarQube) completely ignore:

1. **AI Dependency Hallucination / Package Squatting:**
   Agents frequently hallucinate library names (e.g. `express-async-router-v4`, fake crates, fake Go modules) or import packages that were newly registered by attackers targeting LLM hallucination patterns (AI Supply Chain Poisoning).
2. **AI Silent Code Degradation ("AI Slop" & Lazy Stubs):**
   Agents write redundant boilerplate, leave fake stubs (`throw new Error("TODO")`, `return null; // temporary`), and repeatedly reinvent common utilities (`deepClone`, `formatDate`) in multiple files rather than reusing existing architecture.
3. **Agent Scope Drift:**
   During long iterative runs, agents drift away from the original user instructions and modify completely unrelated critical files or configuration.

---

## ⚡ What AgentGuard v1.1.0 Provides

**AgentGuard** runs both as an **autonomous MCP Server** (plugging directly into your agent's brain before execution) and as a **lightweight CLI tool** for CI/CD and pre-commit hooks:

* 🌐 **Multi-Ecosystem Anti-Hallucination:**
  - **npm** (Node.js/JavaScript/TypeScript)
  - **PyPI** (Python)
  - **crates.io** (Rust)
  - **proxy.golang.org** (Go)
  - Pre-validates package existence, registration age (blocks packages <30 days old), and download popularity.
* 🧹 **Slop & Lazy Stub Auditor:**
  - Scans files for mock stubs, duplicate helper reinventions, and artificial AI placeholders.
  - Generates reports in **Human**, **JSON**, or **Markdown** (for GitHub PR comments).
* 🧭 **Semantic Scope Drift Sentinel:**
  - Measures alignment between the user's initial task specification and the files being changed.

---

## 🚀 Installation & Quick Start

### Global / Local CLI
```bash
# Run directly via npx
npx @francaroscillidev/agentguard --help

# Or install globally
npm install -g @francaroscillidev/agentguard
```

### 1. Check Dependencies for AI Hallucinations
```bash
# npm
agentguard check-package react

# Rust (crates.io)
agentguard check-package serde -e crates

# Python (PyPI)
agentguard check-package requests -e pypi

# Go (proxy.golang.org)
agentguard check-package github.com/gin-gonic/gin -e golang

# Catches and blocks hallucinated dependencies
agentguard check-package super-fake-hallucinated-package-xyz
```

### 2. Audit Codebase for AI Slop & Lazy Placeholders
```bash
# Human readable output
agentguard audit-slop .

# Markdown output for GitHub PR comments
agentguard audit-slop --format markdown

# JSON output for CI pipelines
agentguard audit-slop --format json
```

### 3. Check for Agent Scope Drift
```bash
agentguard check-drift \
  --intent "Add Google OAuth login button" \
  --files src/auth/login.tsx package.json
```

---

## 🤖 Integration as an MCP Server

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
- `verify_package`: Pre-flights package installs across npm, PyPI, Crates, and Go.
- `analyze_code_slop`: Detects repetitive utilities, agent stubs, and boilerplate.
- `check_scope_drift`: Compares modified file lists against user prompt intent.

---

## 📄 License

Apache License 2.0. Open-source and free for all developers and AI agent platforms.
