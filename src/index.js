import { app, Menu, Tray, clipboard, Notification, nativeImage } from 'electron';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getContextPath, getLastSync, setLastSync, isConfigured, getContextFile, setContextFile } from './config.js';
import { pullRepo, isRepoCloned, findMarkdownFiles } from './git.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tray = null;
let appIcon = null;

// Load the app icon
const iconPath = join(__dirname, '..', 'assets', 'icon.png');
if (existsSync(iconPath)) {
  appIcon = nativeImage.createFromPath(iconPath);
}

let lastSyncDisplay = 'Never';

function updateLastSyncDisplay() {
  const lastSync = getLastSync();
  if (lastSync) {
    const diff = Date.now() - new Date(lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      lastSyncDisplay = 'Just now';
    } else if (mins < 60) {
      lastSyncDisplay = `${mins}m ago`;
    } else {
      const hours = Math.floor(mins / 60);
      lastSyncDisplay = `${hours}h ago`;
    }
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    // Don't set icon - let macOS use the app icon only
    // silent: true to disable notification sound
    new Notification({ title, body, silent: true }).show();
  }
}

async function copyContext() {
  const contextPath = getContextPath();
  const contextFile = getContextFile();

  if (!existsSync(contextPath)) {
    showNotification('Gardener', `${contextFile} not found in repo`);
    return;
  }

  try {
    const content = readFileSync(contextPath, 'utf8');
    clipboard.writeText(content);
    showNotification('🪴 Gardener', `${contextFile} copied!`);
  } catch (err) {
    showNotification('Gardener', `Error: ${err.message}`);
  }
}

async function refreshRepo() {
  try {
    await pullRepo();
    setLastSync();
    updateLastSyncDisplay();
    showNotification('🪴 Gardener', 'Updated to latest version');
    updateMenu();
  } catch (err) {
    showNotification('Gardener', `Sync failed: ${err.message}`);
  }
}

function updateMenu() {
  if (tray) {
    const currentFile = getContextFile();
    tray.setToolTip(`Click to copy ${currentFile} • Right-click for menu`);
  }
}

function getContextMenu() {
  updateLastSyncDisplay();

  const currentFile = getContextFile();
  const mdFiles = findMarkdownFiles();

  // Build markdown files submenu
  const fileMenuItems = mdFiles.length > 0 ? mdFiles.map(file => ({
    label: file,
    type: 'checkbox',
    checked: file === currentFile,
    click: () => {
      setContextFile(file);
      updateMenu();
      showNotification('🪴 Gardener', `Selected: ${file}`);
    }
  })) : [{
    label: 'No .md files found',
    enabled: false
  }];

  return Menu.buildFromTemplate([
    {
      label: '↻ Refresh',
      click: refreshRepo
    },
    { type: 'separator' },
    {
      label: `📄 ${currentFile}`,
      submenu: fileMenuItems
    },
    { type: 'separator' },
    {
      label: `✓ Synced: ${lastSyncDisplay}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
}

// Set app name and icon
app.setName('Gardener');

// Set dock icon before hiding (for notifications)
if (appIcon && app.dock) {
  app.dock.setIcon(appIcon);
}
app.dock?.hide();

app.whenReady().then(async () => {
  // Create a transparent 1x1 image (required for tray, but we'll use title instead)
  const emptyIcon = nativeImage.createEmpty();

  tray = new Tray(emptyIcon);
  tray.setTitle('🪴'); // This shows the emoji in the menubar!
  tray.setToolTip(`Click to copy ${getContextFile()} • Right-click for menu`);

  // Left click = copy context immediately
  tray.on('click', () => {
    copyContext();
  });

  // Right click = show menu
  tray.on('right-click', () => {
    tray.popUpContextMenu(getContextMenu());
  });

  console.log('🪴 Gardener is ready');

  if (!isConfigured() || !isRepoCloned()) {
    showNotification('Gardener', 'Not configured. Run `gardener setup` in terminal.');
  } else {
    // Auto-pull on start
    try {
      await pullRepo();
      setLastSync();
    } catch (err) {
      console.error('Auto-pull failed:', err.message);
    }
  }

  // Update sync display periodically
  setInterval(() => updateLastSyncDisplay(), 60000);
});
