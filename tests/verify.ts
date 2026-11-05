import { verifyNpmPackage, verifyPyPIPackage } from '../src/checkers/packages.js';
import { checkSemanticDrift } from '../src/checkers/drift.js';

async function runTests() {
  console.log('🧪 Starting AgentGuard Unit & Integration Tests...\n');

  // Test 1: Verify existing legit package
  console.log('Test 1: Verify established package ("express")');
  const expressRes = await verifyNpmPackage('express');
  if (expressRes.exists && !expressRes.isHallucinated && !expressRes.isHighRisk) {
    console.log('✅ PASS: Express recognized as safe & verified.');
  } else {
    throw new Error('FAIL: Express should be detected as safe');
  }

  // Test 2: Verify hallucinated / non-existent package
  console.log('\nTest 2: Verify hallucinated non-existent package ("super-fake-ai-package-xyz-999")');
  const fakeRes = await verifyNpmPackage('super-fake-ai-package-xyz-999');
  if (!fakeRes.exists && fakeRes.isHallucinated && fakeRes.isHighRisk) {
    console.log('✅ PASS: Hallucinated package caught and blocked!');
  } else {
    throw new Error('FAIL: Hallucinated package should be caught');
  }

  // Test 3: Drift Detection
  console.log('\nTest 3: Semantic Drift Detection');
  const aligned = checkSemanticDrift('Add authentication login with JWT', [
    'src/auth/login.ts',
    'src/auth/jwt.ts',
    'package.json'
  ]);
  if (!aligned.driftDetected && aligned.semanticAlignmentScore >= 0.8) {
    console.log('✅ PASS: Relevant files correctly recognized as aligned.');
  } else {
    throw new Error('FAIL: Legitimate files flagged as drift');
  }

  const drifted = checkSemanticDrift('Add authentication login with JWT', [
    'src/billing/stripe-webhook.ts',
    'scripts/deploy-k8s.yaml',
    'internal/db-migration.sql'
  ]);
  if (drifted.driftDetected && drifted.semanticAlignmentScore === 0) {
    console.log('✅ PASS: Unrelated files correctly flagged as agent drift!');
  } else {
    throw new Error('FAIL: Drifted files were not flagged');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
