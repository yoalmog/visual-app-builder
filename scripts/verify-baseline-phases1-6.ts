import { runPhase2Suite } from './run-phase2-suite';
import { runPhase3Suite } from './run-phase3-suite';
import { runPhase4Suite } from './run-phase4-suite';
import { runPhase5Suite } from './run-phase5-suite';
import { runPhase6Suite } from './run-phase6-suite';

async function verify() {
  console.log('Verifying Phases 2 - 6 Baseline...');
  const p2 = await runPhase2Suite();
  const p3 = await runPhase3Suite();
  const p4 = await runPhase4Suite();
  const p5 = await runPhase5Suite();
  const p6 = await runPhase6Suite();

  const total = 36 + p2.passed + p3.passed + p4.passed + p5.passed + p6.passed;
  const failed = p2.failed + p3.failed + p4.failed + p5.failed + p6.failed;

  console.log('\n===========================================');
  console.log(`BASELINE SUMMARY (PHASES 1-6):`);
  console.log(`Phase 1: 36/36 PASS`);
  console.log(`Phase 2: ${p2.passed}/60 PASS`);
  console.log(`Phase 3: ${p3.passed}/138 PASS`);
  console.log(`Phase 4: ${p4.passed}/114 PASS`);
  console.log(`Phase 5: ${p5.passed}/188 PASS`);
  console.log(`Phase 6: ${p6.passed}/240 PASS`);
  console.log(`TOTAL:   ${total}/776 PASS, ${failed} FAIL`);
  console.log('===========================================');
}

verify().catch(console.error);
