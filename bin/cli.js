#!/usr/bin/env node

import { program } from 'commander';
import { createRequire } from 'module';
import { input, confirm } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import { readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
  getRepoUrl,
  setRepoUrl,
  isConfigured,
  getContextPath,
  getLastSync,
  REPO_DIR
} from '../src/config.js';

import {
  cloneRepo,
  pullRepo,
  getStatus,
  isRepoCloned
} from '../src/git.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

program
  .name('gardener')
  .description('🪴 Company context clipboard tool')
  .version(pkg.version);

// ============ SETUP ============
program
  .command('setup')
  .description('Configure repo URL and clone')
  .action(async () => {
    console.log(chalk.green('\n🪴 Gardener Setup\n'));

    if (isRepoCloned()) {
      const overwrite = await confirm({
        message: 'Repository already exists. Re-clone?',
        default: false
      });
      if (!overwrite) {
        console.log('Setup cancelled.');
        return;
      }
    }

    const repoUrl = await input({
      message: 'Git repo URL (SSH):',
      validate: (val) => val.startsWith('git@') || val.startsWith('https://') || 'Enter a valid Git URL'
    });

    console.log(chalk.dim('\nCloning repository...'));

    try {
      // Remove existing repo if re-cloning
      if (isRepoCloned()) {
        const { rmSync } = await import('fs');
        rmSync(REPO_DIR, { recursive: true, force: true });
      }

      await cloneRepo(repoUrl);
      setRepoUrl(repoUrl);

      console.log(chalk.green('✓ Repository cloned to ~/.gardener/repo'));

      // Check if Context.md exists
      const contextPath = getContextPath();
      if (existsSync(contextPath)) {
        console.log(chalk.green('✓ Found Context.md'));
      } else {
        console.log(chalk.yellow('⚠ Context.md not found in repo. Create one to get started.'));
      }

      console.log(chalk.dim('\nRun `gardener start` to launch the menubar app.'));
      console.log(chalk.dim('Or run `gardener copy` to copy context to clipboard.\n'));
    } catch (err) {
      console.error(chalk.red('✗ Clone failed:'), err.message);
      process.exit(1);
    }
  });

// ============ START (MENUBAR) ============
program
  .command('start')
  .description('Start the menubar app')
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow('Not configured. Run `gardener setup` first.'));
      process.exit(1);
    }

    console.log(chalk.green('🪴 Starting Gardener menubar app...'));

    // Find electron binary
    const electronPath = join(__dirname, '..', 'node_modules', '.bin', 'electron');
    const appPath = join(__dirname, '..', 'src', 'index.js');

    // Spawn electron as a detached process
    const child = spawn(electronPath, [appPath], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }
    });
    child.unref();

    console.log(chalk.dim('Gardener is now running in your menubar.'));
    process.exit(0);
  });

// ============ COPY ============
program
  .command('copy')
  .description('Copy context to clipboard')
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow('Not configured. Run `gardener setup` first.'));
      process.exit(1);
    }

    const contextPath = getContextPath();
    if (!existsSync(contextPath)) {
      console.log(chalk.red('✗ Context.md not found in repo.'));
      process.exit(1);
    }

    try {
      const content = readFileSync(contextPath, 'utf8');
      await clipboard.write(content);
      console.log(chalk.green('✓ Context copied to clipboard!'));
    } catch (err) {
      console.error(chalk.red('✗ Failed to copy:'), err.message);
      process.exit(1);
    }
  });

// ============ UPDATE (PULL) ============
program
  .command('update')
  .alias('pull')
  .description('Pull latest from remote')
  .action(async () => {
    if (!isRepoCloned()) {
      console.log(chalk.yellow('Repository not found. Run `gardener setup` first.'));
      process.exit(1);
    }

    console.log(chalk.dim('Pulling latest changes...'));

    try {
      const result = await pullRepo();
      if (result.summary.changes === 0) {
        console.log(chalk.green('✓ Already up to date.'));
      } else {
        console.log(chalk.green(`✓ Updated: ${result.summary.insertions} insertions, ${result.summary.deletions} deletions`));
      }
    } catch (err) {
      console.error(chalk.red('✗ Pull failed:'), err.message);
      process.exit(1);
    }
  });

// ============ STATUS ============
program
  .command('status')
  .description('Show current configuration and status')
  .action(async () => {
    console.log(chalk.green('\n🪴 Gardener Status\n'));

    const repoUrl = getRepoUrl();
    const lastSync = getLastSync();

    console.log(chalk.dim('Repo URL:'), repoUrl || chalk.yellow('Not configured'));
    console.log(chalk.dim('Last sync:'), lastSync ? new Date(lastSync).toLocaleString() : chalk.yellow('Never'));

    if (isRepoCloned()) {
      const status = await getStatus();
      console.log(chalk.dim('Branch:'), status.branch);
      if (status.lastCommit) {
        console.log(chalk.dim('Last commit:'), `${status.lastCommit.hash} - ${status.lastCommit.message}`);
      }

      const contextPath = getContextPath();
      console.log(chalk.dim('Context file:'), existsSync(contextPath) ? chalk.green('✓ Found') : chalk.yellow('✗ Not found'));
    } else {
      console.log(chalk.yellow('\nRepository not cloned. Run `gardener setup` to get started.'));
    }

    console.log('');
  });

// ============ CONFIG ============
program
  .command('config')
  .description('Show config file location')
  .action(() => {
    console.log(chalk.dim('Config stored at:'), '~/.config/gardener/config.json');
    console.log(chalk.dim('Repo cloned to:'), '~/.gardener/repo/');
  });

// ============ AUTOSTART ============
program
  .command('autostart')
  .description('Enable or disable auto-start on login')
  .option('--enable', 'Enable auto-start')
  .option('--disable', 'Disable auto-start')
  .action(async (options) => {
    const { writeFileSync, unlinkSync, existsSync: fsExists } = await import('fs');
    const { homedir } = await import('os');
    const plistPath = `${homedir()}/Library/LaunchAgents/com.gardener.app.plist`;

    const electronPath = join(__dirname, '..', 'node_modules', '.bin', 'electron');
    const appPath = join(__dirname, '..', 'src', 'index.js');

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gardener.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>${electronPath}</string>
        <string>${appPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;

    if (options.enable) {
      writeFileSync(plistPath, plistContent);
      console.log(chalk.green('✓ Auto-start enabled. Gardener will start on login.'));
    } else if (options.disable) {
      if (fsExists(plistPath)) {
        unlinkSync(plistPath);
        console.log(chalk.green('✓ Auto-start disabled.'));
      } else {
        console.log(chalk.yellow('Auto-start was not enabled.'));
      }
    } else {
      // Show current status
      if (fsExists(plistPath)) {
        console.log(chalk.green('Auto-start: enabled'));
        console.log(chalk.dim('To disable: gardener autostart --disable'));
      } else {
        console.log(chalk.yellow('Auto-start: disabled'));
        console.log(chalk.dim('To enable: gardener autostart --enable'));
      }
    }
  });

program.parse();
