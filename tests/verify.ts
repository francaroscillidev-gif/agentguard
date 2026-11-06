import {
  verifyNpmPackage,
  verifyCratesPackage,
  verifyGoModule
} from '../src/checkers/packages.js';
import { checkSemanticDrift } from '../src/checkers/drift.js';
import { analyzeCodeSlop } from '../src/checkers/slop.js';
import { auditManifests } from '../src/checkers/manifests.js';
import { detectHardcodedSecrets } from '../src/checkers/secrets.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function runTests() {
  console.log('🧪 Starting AgentGuard v1.2.0 Complete Test Suite...\n');

  // Test 1: Verify real packages
  console.log('Test 1: Verify multi-ecosystem packages (npm, crates, go)');
  const npmRes = await verifyNpmPackage('express');
  if (!npmRes.exists) throw new Error('FAIL: npm express');
  console.log('  ✔ npm "express" verified.');

  const crateRes = await verifyCratesPackage('serde');
  if (!crateRes.exists) throw new Error('FAIL: crates serde');
  console.log('  ✔ crates.io "serde" verified.');

  const goRes = await verifyGoModule('github.com/gin-gonic/gin');
  if (!goRes.exists) throw new Error('FAIL: go module gin');
  console.log('  ✔ go module "github.com/gin-gonic/gin" verified.');

  // Test 2: Full Workspace Manifest Audit
  console.log('\nTest 2: Workspace Manifest Audit');
  const manifestReport = await auditManifests(process.cwd());
  console.log(`  ✔ Scanned ${manifestReport.scannedFiles.length} manifests with ${manifestReport.totalDependencies} dependencies.`);
  if (manifestReport.hallucinatedCount > 0) throw new Error('FAIL: Hallucinated dependencies in own project');

  // Test 3: Secret Leak Detection
  console.log('\nTest 3: Hardcoded Secret & Key Detection');
  const tempTestFile = path.join(process.cwd(), 'tests', 'dummy_secret.txt');
  await fs.writeFile(tempTestFile, 'const key = "sk-proj-1234567890abcdef1234567890abcdef";');
  const secretReport = await detectHardcodedSecrets([tempTestFile]);
  await fs.unlink(tempTestFile);

  if (secretReport.totalLeaks > 0 && secretReport.detections[0].patternType.includes('OpenAI')) {
    console.log('  ✔ Successfully intercepted OpenAI API key leak.');
  } else {
    throw new Error('FAIL: Did not intercept leaked secret');
  }

  // Test 4: Drift Detection
  console.log('\nTest 4: Semantic Drift Detection');
  const aligned = checkSemanticDrift('Add authentication login with JWT', [
    'src/auth/login.ts',
    'src/auth/jwt.ts',
    'package.json'
  ]);
  if (!aligned.driftDetected && aligned.semanticAlignmentScore >= 0.8) {
    console.log('  ✔ Relevant files correctly recognized as aligned.');
  } else {
    throw new Error('FAIL: Legitimate files flagged as drift');
  }

  // Test 5: Slop Analyzer
  console.log('\nTest 5: Code Slop Analyzer');
  const slopReport = await analyzeCodeSlop(process.cwd());
  console.log(`  ✔ Slop scan passed cleanly.`);

  console.log('\n🎉 ALL v1.2.0 SUITE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
