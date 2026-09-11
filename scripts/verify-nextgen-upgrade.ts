import { createInitialProject } from '../src/builder/persistence/project-storage';
import { generateProjectCodebase, generateNodeJSX, generatePageCode } from '../src/builder/codegen/react-code-generator';
import { createZipArchive } from '../src/builder/codegen/zip-bundler';
import { stylesToTailwind } from '../src/builder/codegen/tailwind-mapper';
import { createDefaultNode } from '../src/builder/components/registry';

async function runNextGenVerification() {
  console.log('================================================================');
  console.log('VERIFYING NEXT-GEN PLATFORM UPGRADE (PHASE 12 PRE-RELEASE)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Tailwind Mapper tests
  console.log('\n--- 1. Testing Tailwind CSS Mapper ---');
  const twFlex = stylesToTailwind({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
  });
  assert(twFlex.includes('flex'), 'Mapper: Display flex');
  assert(twFlex.includes('flex-col'), 'Mapper: Flex direction col');
  assert(twFlex.includes('justify-center'), 'Mapper: Justify center');
  assert(twFlex.includes('items-center'), 'Mapper: Align items center');
  assert(twFlex.includes('gap-[16px]'), 'Mapper: Gap token');
  assert(twFlex.includes('bg-[#0F172A]'), 'Mapper: Custom hex background');
  assert(twFlex.includes('text-[#FFFFFF]'), 'Mapper: Custom hex text');
  assert(twFlex.includes('rounded-[12px]'), 'Mapper: Custom border radius');
  assert(twFlex.includes('p-[24px]'), 'Mapper: Padding token');

  // 2. Component JSX Generation
  console.log('\n--- 2. Testing Component TSX Generation ---');
  const headingNode = createDefaultNode('heading', 'h1_test');
  headingNode.props = { level: 'h1', text: 'Empowering Builders' };
  headingNode.styles = { fontSize: '32px', fontWeight: 'bold' };
  const headingJSX = generateNodeJSX(headingNode, 0);
  assert(headingJSX.includes('<h1'), 'Codegen: Renders <h1> tag');
  assert(headingJSX.includes('Empowering Builders</h1>'), 'Codegen: Renders escaped text content');
  assert(headingJSX.includes('font-bold'), 'Codegen: Translates font weight to Tailwind');

  const buttonNode = createDefaultNode('button', 'btn_test');
  buttonNode.props = { text: 'Deploy to Cloud' };
  buttonNode.styles = { backgroundColor: '#4F46E5', color: '#FFFFFF', borderRadius: '8px', padding: '12px' };
  const buttonJSX = generateNodeJSX(buttonNode, 0);
  assert(buttonJSX.includes('<button'), 'Codegen: Renders <button> tag');
  assert(buttonJSX.includes('Deploy to Cloud</button>'), 'Codegen: Button text content');
  assert(buttonJSX.includes('bg-[#4F46E5]'), 'Codegen: Button background color');

  const inputNode = createDefaultNode('input', 'input_test');
  inputNode.props = { inputType: 'email', placeholder: 'Enter work email...', required: true };
  const inputJSX = generateNodeJSX(inputNode, 0);
  assert(inputJSX.includes('<input type="email"'), 'Codegen: Renders email input');
  assert(inputJSX.includes('placeholder="Enter work email..."'), 'Codegen: Input placeholder attribute');
  assert(inputJSX.includes('required'), 'Codegen: Input required attribute');

  // 3. Full Project Next.js 14 Codebase Generation
  console.log('\n--- 3. Testing Next.js 14 Project Codebase Generation ---');
  const project = createInitialProject('test_proj');
  project.name = 'Apex Enterprise Cloud';
  const bundle = generateProjectCodebase(project);
  assert(bundle.projectName === 'apex-enterprise-cloud', 'Project: Safe project name normalization');
  assert(bundle.files.length >= 8, `Project: Generated ${bundle.files.length} project files`);

  const pkgJson = bundle.files.find((f) => f.path === 'package.json');
  assert(Boolean(pkgJson), 'Project: package.json included');
  if (pkgJson) {
    const parsedPkg = JSON.parse(pkgJson.content);
    assert(parsedPkg.dependencies['next'] === '14.2.15', 'Project: Next.js 14 dependency version');
    assert(parsedPkg.dependencies['react'] === '^18.3.1', 'Project: React 18 dependency');
  }

  const appLayout = bundle.files.find((f) => f.path === 'app/layout.tsx');
  assert(Boolean(appLayout && appLayout.content.includes('RootLayout')), 'Project: app/layout.tsx contains RootLayout');

  const appPage = bundle.files.find((f) => f.path === 'app/page.tsx');
  assert(Boolean(appPage && appPage.content.includes('use client')), 'Project: app/page.tsx has client directive');

  // 4. PKZIP Archive Creation
  console.log('\n--- 4. Testing PKZIP Client-Side Archive Generation ---');
  const zipBlob = createZipArchive(bundle.files);
  assert(zipBlob instanceof Blob, 'ZIP: Creates standard Blob instance');
  assert(zipBlob.type === 'application/zip', 'ZIP: Sets application/zip MIME type');
  assert(zipBlob.size > 1000, `ZIP: Valid non-trivial byte length (${zipBlob.size} bytes)`);

  // Verify PKZIP magic bytes (0x50, 0x4b, 0x03, 0x04 = "PK\x03\x04")
  const arrayBuffer = await zipBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const isZipMagic = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  assert(isZipMagic, 'ZIP: Magic header bytes PK\\x03\\x04 verified');

  console.log('\n================================================================');
  console.log(`NEXT-GEN VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNextGenVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
