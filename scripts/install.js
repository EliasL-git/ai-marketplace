#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;

// Install dependencies
const workspaces = ['client', 'server'];
workspaces.forEach(workspace => {
  const dir = path.join(root, workspace);
  const pkgPath = path.join(dir, 'package.json');
  
  if (fs.existsSync(pkgPath)) {
    try {
      execSync('npm install', { cwd: dir, stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to install for ${workspace}:`, err.message);
    }
  }
});

console.log('Installation complete');