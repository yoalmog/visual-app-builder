// Performance Stress Test: 100 and 250 Component Nodes
import { createInitialProject } from '../src/builder/persistence/project-storage';
import { createDefaultNode } from '../src/builder/components/registry';
import { insertNode } from '../src/builder/tree/insert-node';
import { validateTree } from '../src/builder/tree/validate-tree';
import { resolveNodeStylesForViewport } from '../src/builder/responsive/style-resolver';
import { duplicateNode } from '../src/builder/tree/duplicate-node';

console.log('\n========================================');
console.log('PERFORMANCE & SCALE STRESS TEST');
console.log('========================================\n');

function runScaleTest(nodeTarget: number) {
  const t0 = Date.now();
  const proj = createInitialProject(`perf_${nodeTarget}`);
  let root = proj.pages[0].root;

  console.log(`Building tree with ${nodeTarget} nodes...`);
  // Generate a realistic nested visual page structure
  let count = 1; // root container
  let sectionIndex = 1;

  while (count < nodeTarget) {
    const row = createDefaultNode('row', `row_perf_${sectionIndex}`);
    root = insertNode(root, root.id, row);
    count++;

    for (let c = 0; c < 4 && count < nodeTarget; c++) {
      const col = createDefaultNode('column', `col_perf_${sectionIndex}_${c}`);
      root = insertNode(root, `row_perf_${sectionIndex}`, col);
      count++;

      if (count < nodeTarget) {
        const h = createDefaultNode('heading', `head_perf_${count}`);
        root = insertNode(root, col.id, h);
        count++;
      }
      if (count < nodeTarget) {
        const p = createDefaultNode('paragraph', `para_perf_${count}`);
        root = insertNode(root, col.id, p);
        count++;
      }
      if (count < nodeTarget) {
        const b = createDefaultNode('button', `btn_perf_${count}`);
        root = insertNode(root, col.id, b);
        count++;
      }
    }
    sectionIndex++;
  }

  const buildTime = Date.now() - t0;
  console.log(`  ✓ Created ${count} nodes in ${buildTime}ms.`);

  // Validate entire large tree
  const tVal = Date.now();
  const validation = validateTree(root);
  const valTime = Date.now() - tVal;
  console.log(`  ✓ Validated ${count} nodes in ${valTime}ms (Valid: ${validation.valid}, Errors: ${validation.errors.length}).`);

  // Style resolution benchmarking on all nodes
  const tStyle = Date.now();
  function resolveAll(node: any) {
    resolveNodeStylesForViewport(node, 'desktop');
    resolveNodeStylesForViewport(node, 'tablet');
    resolveNodeStylesForViewport(node, 'mobile');
    for (const ch of node.children || []) resolveAll(ch);
  }
  resolveAll(root);
  const styleTime = Date.now() - tStyle;
  console.log(`  ✓ Resolved 3 viewport styles across all ${count} nodes in ${styleTime}ms.`);

  // Duplication stress test on a sub-branch
  const tDup = Date.now();
  const dupResult = duplicateNode(root, `row_perf_1`);
  const dupTime = Date.now() - tDup;
  console.log(`  ✓ Subtree duplication of Section 1 executed in ${dupTime}ms.`);

  const totalTime = Date.now() - t0;
  console.log(`  ✓ Total stress test for ${count} nodes completed in ${totalTime}ms.\n`);

  if (!validation.valid || totalTime > 5000) {
    console.error('Performance test failed or exceeded latency budget.');
    process.exit(1);
  }
}

// 1. Test 100 components
runScaleTest(100);

// 2. Test 250 components
runScaleTest(250);

console.log('ALL SCALE & PERFORMANCE TESTS PASSED WITHIN TIME BUDGET.');
process.exit(0);
