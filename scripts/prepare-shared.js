const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = process.cwd();
const rootDir = path.resolve(appDir, '../..');
const sharedDir = path.join(rootDir, 'packages', 'shared');
const targetSharedInNodeModules = path.join(appDir, 'node_modules', '@lbdc', 'shared');

console.log('[LBDC] Preparing @lbdc/shared before Next.js build...');
execSync('npm install --no-audit --no-fund', { cwd: sharedDir, stdio: 'inherit' });
execSync('npm run build', { cwd: sharedDir, stdio: 'inherit' });

const srcDist = path.join(sharedDir, 'dist');
if (fs.existsSync(targetSharedInNodeModules)) {
  const stats = fs.lstatSync(targetSharedInNodeModules);
  if (!stats.isSymbolicLink()) {
    const destDist = path.join(targetSharedInNodeModules, 'dist');
    fs.cpSync(srcDist, destDist, { recursive: true, force: true });
    console.log('[LBDC] Synced @lbdc/shared/dist into copied node_modules/@lbdc/shared');
  }
}
