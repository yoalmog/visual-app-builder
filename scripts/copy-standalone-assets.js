const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(rootDir, '.next', 'standalone', '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(rootDir, '.next', 'standalone', 'public');

console.log('[Build Step] Copying static assets to .next/standalone...');

try {
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log('✓ Successfully copied .next/static -> .next/standalone/.next/static');
  } else {
    console.warn('⚠️ .next/static not found.');
  }

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('✓ Successfully copied public -> .next/standalone/public');
  } else {
    // Create empty public folder in standalone if not existing
    fs.mkdirSync(publicDest, { recursive: true });
    console.log('✓ Created empty .next/standalone/public directory');
  }

  console.log('✓ Standalone asset preparation complete.');
} catch (err) {
  console.error('❌ Error copying standalone assets:', err);
  process.exit(1);
}
