import {
  verifyNpmPackage,
  verifyCratesPackage,
  verifyGoModule
} from '../src/checkers/packages.js';
import { checkSemanticDrift } from '../src/checkers/drift.js';
import { analyzeCodeSlop } from '../src/checkers/slop.js';
import { auditManifests } from '../src/checkers/manifests.js';
import { detectHardcodedSecrets } from '../src/checkers/secrets.js';
import { auditCodeSmells } from '../src/checkers/smells.js';
import { installGitHook } from '../src/checkers/githook.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function runTests() {
  console.log('🧪 Starting AgentGuard v1.3.0 Complete Test Suite...\n');

  // Test 1: Verify multi-ecosystem packages
  console.log('Test 1: Multi-ecosystem resolution');
  const npmRes = await verifyNpmPackage('express');
  if (!npmRes.exists) throw new Error('FAIL: npm express');
  console.log('  ✔ npm "express" verified.');

  const crateRes = await verifyCratesPackage('serde');
  if (!crateRes.exists) throw new Error('FAIL: crates serde');
  console.log('  ✔ crates.io "serde" verified.');

  const goRes = await verifyGoModule('github.com/gin-gonic/gin');
  if (!goRes.exists) throw new Error('FAIL: go module gin');
  console.log('  ✔ go module "github.com/gin-gonic/gin" verified.');

  // Test 2: Workspace Manifest Audit
  console.log('\nTest 2: Workspace Manifest Audit');
  const manifestReport = await auditManifests(process.cwd());
  console.log(`  ✔ Scanned ${manifestReport.scannedFiles.length} manifests with ${manifestReport.totalDependencies} dependencies.`);

  // Test 3: Secret Leak Detection
  console.log('\nTest 3: Hardcoded Secret & Key Detection');
  const tempTestFile = path.join(process.cwd(), 'tests', 'dummy_secret.txt');
  // Obfuscate in test file so git scanner doesn't trigger on test source itself
  const dummyKey = ['sk-', 'proj-', '1234567890abcdef1234567890abcdef'].join('');
  await fs.writeFile(tempTestFile, `const key = "${dummyKey}";`);
  const secretReport = await detectHardcodedSecrets([tempTestFile]);
  await fs.unlink(tempTestFile);
  if (secretReport.totalLeaks > 0 && secretReport.detections[0].patternType.includes('OpenAI')) {
    console.log('  ✔ Successfully intercepted OpenAI API key leak.');
  } else {
    throw new Error('FAIL: Did not intercept leaked secret');
  }

  // Test 4: Code Smells Detection
  console.log('\nTest 4: AI Code Smells Detection');
  const tempSmellFile = path.join(process.cwd(), 'tests', 'dummy_smell.ts');
  await fs.writeFile(tempSmellFile, 'try { doSomething(); } catch (e) {} // swallowed error\neval("foo");\n');
  const smellReport = await auditCodeSmells(process.cwd(), ['tests/dummy_smell.ts']);
  await fs.unlink(tempSmellFile);
  if (smellReport.totalSmells >= 2) {
    console.log(`  ✔ Successfully detected ${smellReport.totalSmells} AI code smells.`);
  } else {
    throw new Error('FAIL: Did not detect code smells');
  }

  // Test 5: Git Hook Installer
  console.log('\nTest 5: Git Hook Installer');
  const hookResult = await installGitHook(process.cwd());
  if (hookResult.installed) {
    console.log('  ✔ Git pre-commit hook installed successfully.');
  } else {
    throw new Error('FAIL: Git hook installation failed');
  }

  console.log('\n🎉 ALL v1.3.0 EXTENDED TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
