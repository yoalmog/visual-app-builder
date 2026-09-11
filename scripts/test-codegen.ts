import { createInitialProject } from '../src/builder/persistence/project-storage';
import { generateProjectCodebase } from '../src/builder/codegen/react-code-generator';
import { createZipArchive } from '../src/builder/codegen/zip-bundler';

async function testCodegen() {
  console.log('Testing Next-Gen Code Generator and ZIP Bundler...');

  const project = createInitialProject('Test Next-Gen Project');
  console.log(`Initialized project: ${project.name}, pages: ${project.pages.length}`);

  const bundle = generateProjectCodebase(project);
  console.log(`Generated bundle for: ${bundle.projectName}`);
  console.log(`Total files generated: ${bundle.files.length}`);

  for (const f of bundle.files) {
    console.log(`  - ${f.path} (${f.content.length} chars)`);
  }

  // Verify key files exist
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'tailwind.config.js',
    'next.config.mjs',
    'app/layout.tsx',
    'app/page.tsx',
    'README.md',
  ];

  for (const rf of requiredFiles) {
    const found = bundle.files.find((f) => f.path === rf);
    if (!found) {
      throw new Error(`Missing expected file: ${rf}`);
    }
  }

  // Test ZIP bundling
  const zipBlob = createZipArchive(bundle.files);
  console.log(`ZIP Blob generated successfully! Size: ${zipBlob.size} bytes, type: ${zipBlob.type}`);

  if (zipBlob.size < 100) {
    throw new Error(`ZIP blob suspiciously small: ${zipBlob.size} bytes`);
  }

  console.log('All Codegen and ZIP Bundler tests passed with 100% success!');
}

testCodegen().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
