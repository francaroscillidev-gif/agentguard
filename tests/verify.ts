import {
  verifyNpmPackage,
  verifyPyPIPackage,
  verifyCratesPackage,
  verifyGoModule
} from '../src/checkers/packages.js';
import { checkSemanticDrift } from '../src/checkers/drift.js';
import { analyzeCodeSlop } from '../src/checkers/slop.js';

async function runTests() {
  console.log('🧪 Starting AgentGuard v1.1.0 Extended Test Suite...\n');

  // Test 1: Verify established packages across ecosystems
  console.log('Test 1: Verify real packages (npm, crates.io, golang)');
  const npmRes = await verifyNpmPackage('express');
  if (!npmRes.exists || npmRes.isHallucinated) throw new Error('FAIL: npm express');
  console.log('  ✔ npm "express" verified.');

  const crateRes = await verifyCratesPackage('serde');
  if (!crateRes.exists || crateRes.isHallucinated) throw new Error('FAIL: crates serde');
  console.log('  ✔ crates.io "serde" verified.');

  const goRes = await verifyGoModule('github.com/gin-gonic/gin');
  if (!goRes.exists || goRes.isHallucinated) throw new Error('FAIL: go module gin');
  console.log('  ✔ go module "github.com/gin-gonic/gin" verified.');

  // Test 2: Catch hallucinations in new ecosystems
  console.log('\nTest 2: Catch hallucinated crates & packages');
  const fakeCrate = await verifyCratesPackage('totally-hallucinated-crate-ai-9999');
  if (fakeCrate.exists || !fakeCrate.isHallucinated) throw new Error('FAIL: hallucinated crate not caught');
  console.log('  ✔ Hallucinated crate successfully caught and blocked.');

  const fakeGo = await verifyGoModule('github.com/nonexistent-org/fake-ai-pkg-9999');
  if (fakeGo.exists || !fakeGo.isHallucinated) throw new Error('FAIL: hallucinated go module not caught');
  console.log('  ✔ Hallucinated Go module successfully caught and blocked.');

  // Test 3: Drift Detection
  console.log('\nTest 3: Semantic Drift Detection');
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

  // Test 4: Slop and lazy stub analyzer
  console.log('\nTest 4: Slop and Code Integrity Analyzer');
  const slopReport = await analyzeCodeSlop(process.cwd());
  console.log(`  ✔ Slop scan executed cleanly (${slopReport.totalIssues} issues found).`);

  console.log('\n🎉 ALL v1.1.0 EXTENDED TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
