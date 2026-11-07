export interface SecurityShieldDecision {
  allowed: boolean;
  action: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blockedReason?: string;
  sanitizedCommand?: string;
  suggestedAlternative?: string;
}

// Dangerous system commands AI coding agents occasionally execute by mistake or under hallucination
const DANGEROUS_COMMAND_RULES = [
  {
    pattern: /\brm\s+-(?:r[fF]|fr)\s+[\/\~]/,
    risk: 'CRITICAL' as const,
    reason: 'Destructive root or home recursive deletion detected.'
  },
  {
    pattern: /\bchmod\s+(?:-R\s+)?777\b/,
    risk: 'HIGH' as const,
    reason: 'Insecure universal permissions (chmod 777) requested.'
  },
  {
    pattern: /\bcurl\s+.*\|\s*(?:bash|sh|zsh)\b/,
    risk: 'CRITICAL' as const,
    reason: 'Unverified remote script piped directly into shell execution.'
  },
  {
    pattern: /\b(?:dd\s+if=.*of=\/dev|mkfs\b)/,
    risk: 'CRITICAL' as const,
    reason: 'Direct block device manipulation or disk format command.'
  },
  {
    pattern: /\b(?:killall|pkill)\s+-9\b/,
    risk: 'HIGH' as const,
    reason: 'Aggressive ungraceful process termination.'
  },
  {
    pattern: /\b(nc|netcat)\s+-[a-zA-Z]*e\b/,
    risk: 'CRITICAL' as const,
    reason: 'Reverse shell invocation attempted via Netcat.'
  }
];

export function interceptCommandExecution(rawCommandLine: string): SecurityShieldDecision {
  const trimmed = rawCommandLine.trim();

  for (const rule of DANGEROUS_COMMAND_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        allowed: false,
        action: rawCommandLine,
        riskLevel: rule.risk,
        blockedReason: rule.reason,
        suggestedAlternative: 'Use scoped workspace paths and standard package scripts instead.'
      };
    }
  }

  return {
    allowed: true,
    action: rawCommandLine,
    riskLevel: 'LOW'
  };
}
