export interface ComplianceReport {
  overallScore: number; // 0 - 100
  tier: 'A+' | 'A' | 'B' | 'C' | 'F';
  hallucinationRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL';
  secretExposureRisk: 'NONE' | 'CRITICAL';
  injectionVulnerability: 'NONE' | 'HIGH';
  codeQualityRating: 'CLEAN' | 'SLOPPY' | 'DEGRADED';
  keyRecommendations: string[];
}

export function computeComplianceScore(metrics: {
  hallucinations: number;
  secrets: number;
  injections: number;
  smells: number;
  slopIssues: number;
}): ComplianceReport {
  let score = 100;
  const recommendations: string[] = [];

  // Severe penalties
  if (metrics.secrets > 0) {
    score -= 40;
    recommendations.push(`Revoke and remove ${metrics.secrets} leaked secrets immediately.`);
  }

  if (metrics.hallucinations > 0) {
    score -= 35;
    recommendations.push(`Remove ${metrics.hallucinations} hallucinated packages before building or deploying.`);
  }

  if (metrics.injections > 0) {
    score -= 25;
    recommendations.push(`Sanitize ${metrics.injections} prompt injection vectors in markdown / code comments.`);
  }

  // Quality penalties
  if (metrics.smells > 0) {
    score -= Math.min(20, metrics.smells * 3);
    recommendations.push(`Resolve ${metrics.smells} AI code smells (run "agentguard fix").`);
  }

  if (metrics.slopIssues > 0) {
    score -= Math.min(15, metrics.slopIssues * 2);
    recommendations.push(`Centralize duplicated utilities to reduce code slop.`);
  }

  score = Math.max(0, Math.min(100, score));

  let tier: 'A+' | 'A' | 'B' | 'C' | 'F' = 'F';
  if (score >= 95) tier = 'A+';
  else if (score >= 85) tier = 'A';
  else if (score >= 70) tier = 'B';
  else if (score >= 50) tier = 'C';

  return {
    overallScore: score,
    tier,
    hallucinationRisk: metrics.hallucinations > 0 ? 'CRITICAL' : 'NONE',
    secretExposureRisk: metrics.secrets > 0 ? 'CRITICAL' : 'NONE',
    injectionVulnerability: metrics.injections > 0 ? 'HIGH' : 'NONE',
    codeQualityRating: metrics.smells === 0 && metrics.slopIssues === 0 ? 'CLEAN' : 'SLOPPY',
    keyRecommendations: recommendations
  };
}
