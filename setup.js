#!/usr/bin/env node

/**
 * Setup script for pnpm project
 * This script initializes the project by running pnpm install with proper flags
 * to handle pnpm's build script validation.
 */

const { execSync } = require('child_process');

console.log('Setting up project...\n');

try {
  console.log('Installing dependencies with pnpm...');
  execSync('pnpm install --ignore-scripts', {
    stdio: 'inherit',
    shell: true
  });
  console.log('\n✓ Setup complete! You can now run:');
  console.log('  pnpm dev       - Start development server');
  console.log('  pnpm build     - Build for production');
  console.log('  pnpm test      - Run tests');
  console.log('  pnpm test:e2e  - Run end-to-end tests');
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
}
