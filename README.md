# 🛡️ AgentGuard

> **The first open-source AI Integrity Sentinel & MCP Server preventing AI Dependency Hallucinations, Silent Code Degradation ("AI Slop"), and Agent Scope Drift.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compliant-brightgreen.svg)](https://modelcontextprotocol.io)

---

## 💥 The Critical Unsolved Problem

As autonomous AI Coding Agents (Claude Code, Cursor, Antigravity, Devin, Copilot Workspace) write and refactor code, three dangerous failure modes have emerged that existing linters (ESLint, Prettier, SonarQube) completely ignore:

1. **AI Dependency Hallucination / Package Squatting:**
   Agents frequently hallucinate library names (e.g. `express-async-router-v4`) or import packages that were newly registered by attackers targeting LLM hallucination patterns (AI Supply Chain Poisoning).
2. **AI Silent Code Degradation ("AI Slop"):**
   Agents write redundant boilerplate, place inline comments like `// In production replace this with...`, and repeatedly reinvent common utilities (`deepClone`, `formatDate`) in multiple files rather than reusing existing architecture.
3. **Agent Scope Drift:**
   During long iterative runs, agents drift away from the original user instructions and modify completely unrelated critical files or config.

---

## ⚡ How AgentGuard Solves It

**AgentGuard** runs both as an **autonomous MCP Server** (plugging directly into your agent's brain before execution) and as a **lightweight CLI tool** for CI/CD and pre-commit hooks:

* 🛡️ **Package Verifier:** Pre-validates package existence, registration age (blocks suspicious packages <30 days old), and weekly download counts against official registries (npm, PyPI).
* 🧹 **Slop & Boilerplate Auditor:** Scans code changes to catch duplicate helper reinventions and lazy agent placeholders.
* 🧭 **Semantic Drift Sentinel:** Measures alignment between the user's initial task specification and the files being changed.

---

## 🚀 Installation & Quick Start

### Global / Local CLI
```bash
# Clone and build
git clone https://github.com/your-username/agentguard.git
cd agentguard
npm install
npm run build
npm link
```

### 1. Check a Package for AI Hallucinations
```bash
# Safe package
agentguard check-package react

# Hallucinated package (blocks execution with exit code 1)
agentguard check-package react-super-fake-agent-hallucination-xyz
```

### 2. Audit Codebase for AI Slop
```bash
agentguard audit-slop .
```

### 3. Check for Agent Scope Drift
```bash
agentguard check-drift \
  --intent "Add Google OAuth login button" \
  --files src/auth/login.tsx package.json
```

---

## 🤖 Integration as an MCP Server

Add **AgentGuard** to your agent configuration (e.g., `claude_desktop_config.json`, Antigravity, or Cursor):

```json
{
  "mcpServers": {
    "agentguard": {
      "command": "node",
      "args": ["/path/to/agentguard/dist/cli/index.js", "mcp"]
    }
  }
}
```

### Exposed MCP Tools for Agents:
- `verify_package`: Called before running `npm install` or `pip install`.
- `analyze_code_slop`: Called before creating pull requests to prevent bloated boilerplate.
- `check_scope_drift`: Compares modified file lists against user prompt intent.

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```

---

## 📄 License

Apache License 2.0. Open-source and free for all developers and AI agent platforms.
