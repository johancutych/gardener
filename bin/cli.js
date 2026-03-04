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

// Max file size for clipboard operations (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// Get built app path (if available)
function getBuiltAppPath() {
  const appPath = join(__dirname, '..', 'dist', 'mac-arm64', 'Gardener.app');
  return existsSync(appPath) ? appPath : null;
}

// Get electron binary path (fallback)
function getElectronPath() {
  return join(__dirname, '..', 'node_modules', '.bin', 'electron');
}

// Get app path
function getAppPath() {
  return join(__dirname, '..', 'src', 'index.js');
}

// Ensure configuration is set up
function ensureConfigured(message = 'Not configured. Run `gardener setup` first.') {
  if (!isConfigured()) {
    console.log(chalk.yellow(message));
    process.exit(1);
  }
}

// Ensure repository is cloned
function ensureRepoCloned(message = 'Repository not found. Run `gardener setup` first.') {
  if (!isRepoCloned()) {
    console.log(chalk.yellow(message));
    process.exit(1);
  }
}

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
  .action(() => {
    ensureConfigured();

    const builtApp = getBuiltAppPath();

    if (builtApp) {
      // Use the built app
      console.log(chalk.green('🪴 Starting Gardener...'));
      const child = spawn('open', [builtApp], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else {
      // Fall back to electron binary
      const electronPath = getElectronPath();
      const appPath = getAppPath();

      if (!existsSync(electronPath)) {
        console.log(chalk.red('✗ App not found. Run `npm run build` in the gardener directory.'));
        process.exit(1);
      }

      console.log(chalk.green('🪴 Starting Gardener (dev mode)...'));
      const child = spawn(electronPath, [appPath], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }
      });
      child.unref();
    }

    console.log(chalk.dim('Gardener is now running in your menubar.'));
    process.exit(0);
  });

// ============ COPY ============
program
  .command('copy')
  .description('Copy context to clipboard')
  .action(async () => {
    ensureConfigured();

    const contextPath = getContextPath();
    if (!existsSync(contextPath)) {
      console.log(chalk.red('✗ Context.md not found in repo.'));
      process.exit(1);
    }

    try {
      const { statSync } = await import('fs');
      const fileSize = statSync(contextPath).size;

      if (fileSize > MAX_FILE_SIZE) {
        console.log(chalk.red(`✗ File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Max size is 1MB.`));
        process.exit(1);
      }

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
    ensureRepoCloned();

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
    // Check platform
    if (process.platform !== 'darwin') {
      console.log(chalk.yellow('Auto-start is only supported on macOS.'));
      return;
    }

    try {
      const { writeFileSync, unlinkSync, mkdirSync, existsSync: fsExists } = await import('fs');
      const { homedir } = await import('os');

      const launchAgentsDir = `${homedir()}/Library/LaunchAgents`;
      const plistPath = `${launchAgentsDir}/com.gardener.app.plist`;

      const electronPath = getElectronPath();
      const appPath = getAppPath();

      if (options.enable) {
        const builtApp = getBuiltAppPath();

        // Ensure LaunchAgents directory exists
        if (!fsExists(launchAgentsDir)) {
          mkdirSync(launchAgentsDir, { recursive: true });
        }

        let plistContent;

        if (builtApp) {
          // Use the built app (cleaner, shows "Gardener" in macOS)
          plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gardener.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>${builtApp}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;
        } else {
          // Fall back to electron binary (requires PATH)
          if (!fsExists(electronPath)) {
            console.log(chalk.red('✗ App not found. Run `npm run build` in the gardener directory.'));
            process.exit(1);
          }

          const currentPath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
          plistContent = `<?xml version="1.0" encoding="UTF-8"?>
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
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${currentPath}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;
        }

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
    } catch (err) {
      console.error(chalk.red('✗ Auto-start operation failed:'), err.message);
      process.exit(1);
    }
  });

program.parse();
