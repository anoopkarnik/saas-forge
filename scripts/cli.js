#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoUrl = 'https://github.com/anoopkarnik/saas-forge.git';

const main = () => {
  // Parse args
  const args = process.argv.slice(2);
  const targetDir = args[0] && !args[0].startsWith('--') ? args[0] : 'saas-forge';

  // Check for pnpm
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
  } catch (e) {
    console.error('\x1b[31mError: pnpm is required to use saas-forge.\x1b[0m');
    console.log('Please install pnpm first: https://pnpm.io/installation');
    process.exit(1);
  }

  // Extract --theme argument
  const themeArg = args.find(arg => arg.startsWith('--theme='));
  const theme = themeArg ? themeArg.split('=')[1] : null;

  console.log(`Cloning the repository into ${targetDir}...`);
  execSync(`git clone --depth=1 ${repoUrl} ${targetDir}`, { stdio: 'inherit' });

  // Path to envs
  const envExamplePath = path.join(targetDir, 'apps/web/.env.example');
  const envPath = path.join(targetDir, 'apps/web/.env');

  console.log('Preparing environment file...');

  // Copy .env.example → .env
  let envContent = fs.readFileSync(envExamplePath, 'utf-8');

  // Replace theme only if provided
  if (theme) {
    console.log(`Applying theme: ${theme}`);
    envContent = envContent.replace(/NEXT_PUBLIC_THEME=.*/, `NEXT_PUBLIC_THEME=${theme}`);
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log('Installing dependencies...');
  execSync(`cd ${targetDir} && pnpm install`, { stdio: 'inherit' });

  console.log('Your SaaS is ready! 🎉');
};

main();
