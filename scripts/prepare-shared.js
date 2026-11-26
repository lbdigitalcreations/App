const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = process.cwd();
const rootDir = path.resolve(appDir, '../..');
const sharedDir = path.join(rootDir, 'packages', 'shared');
const targetSharedInNodeModules = path.join(appDir, 'node_modules', '@lbdc', 'shared');

console.log('[LBDC] Preparing @lbdc/shared before build...');
if (!fs.existsSync(path.join(sharedDir, 'node_modules', 'zod'))) {
  try {
    execSync('npm install --include=dev --no-audit --no-fund', {
      cwd: sharedDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    });
  } catch (err) {
    console.warn('[LBDC] Warning during shared npm install:', err.message);
  }
}

// Build shared package using npx --yes -p typescript@5.7.2 tsc
try {
  execSync('npx --yes -p typescript@5.7.2 tsc -p tsconfig.json', {
    cwd: sharedDir,
    stdio: 'inherit',
  });
} catch (err) {
  console.warn('[LBDC] Retrying shared build with local npm run build...');
  execSync('npm run build', { cwd: sharedDir, stdio: 'inherit' });
}

const srcDist = path.join(sharedDir, 'dist');
if (fs.existsSync(targetSharedInNodeModules)) {
  const stats = fs.lstatSync(targetSharedInNodeModules);
  if (!stats.isSymbolicLink()) {
    const destDist = path.join(targetSharedInNodeModules, 'dist');
    fs.cpSync(srcDist, destDist, { recursive: true, force: true });
    console.log('[LBDC] Synced @lbdc/shared/dist into copied node_modules/@lbdc/shared');
  }
}
