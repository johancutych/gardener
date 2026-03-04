import { app, Menu, Tray, clipboard, Notification, nativeImage } from 'electron';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getContextPath, getLastSync, setLastSync, isConfigured } from './config.js';
import { pullRepo, isRepoCloned } from './git.js';

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
    const options = { title, body };
    if (appIcon) {
      options.icon = appIcon;
    }
    new Notification(options).show();
  }
}

async function copyContext() {
  const contextPath = getContextPath();

  if (!existsSync(contextPath)) {
    showNotification('Gardener', 'Context.md not found in repo');
    return;
  }

  try {
    const content = readFileSync(contextPath, 'utf8');
    clipboard.writeText(content);
    showNotification('🪴 Gardener', 'Context copied to clipboard!');
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

function getContextMenu() {
  updateLastSyncDisplay();

  return Menu.buildFromTemplate([
    {
      label: '↻ Refresh',
      click: refreshRepo
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

// Set app icon (for notifications) and hide dock
if (appIcon && app.dock) {
  app.dock.setIcon(appIcon);
}
app.dock?.hide();

app.whenReady().then(async () => {
  // Create a transparent 1x1 image (required for tray, but we'll use title instead)
  const emptyIcon = nativeImage.createEmpty();

  tray = new Tray(emptyIcon);
  tray.setTitle('🪴'); // This shows the emoji in the menubar!
  tray.setToolTip('Click to copy context • Right-click for menu');

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
