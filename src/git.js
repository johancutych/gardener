import simpleGit from 'simple-git';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { GARDENER_DIR, REPO_DIR, setLastSync } from './config.js';

/**
 * Ensure the gardener directory exists
 */
function ensureDir() {
  if (!existsSync(GARDENER_DIR)) {
    mkdirSync(GARDENER_DIR, { recursive: true });
  }
}

/**
 * Check if repo is already cloned
 */
export function isRepoCloned() {
  return existsSync(REPO_DIR) && existsSync(`${REPO_DIR}/.git`);
}

/**
 * Clone a repository
 * @param {string} repoUrl - SSH URL of the repo
 */
export async function cloneRepo(repoUrl) {
  ensureDir();

  if (isRepoCloned()) {
    throw new Error('Repository already exists. Run `gardener update` to pull latest.');
  }

  const git = simpleGit();
  await git.clone(repoUrl, REPO_DIR);
  setLastSync();

  return REPO_DIR;
}

/**
 * Pull latest changes from remote
 */
export async function pullRepo() {
  if (!isRepoCloned()) {
    throw new Error('Repository not found. Run `gardener setup` first.');
  }

  const git = simpleGit(REPO_DIR);
  const result = await git.pull();
  setLastSync();

  return result;
}

/**
 * Get current branch and status
 */
export async function getStatus() {
  if (!isRepoCloned()) {
    return { cloned: false };
  }

  const git = simpleGit(REPO_DIR);
  const status = await git.status();
  const log = await git.log({ maxCount: 1 });

  return {
    cloned: true,
    branch: status.current,
    lastCommit: log.latest ? {
      hash: log.latest.hash.substring(0, 7),
      message: log.latest.message,
      date: log.latest.date
    } : null
  };
}

/**
 * Find all markdown files in the repo
 * @returns {string[]} Array of relative paths to .md files
 */
export function findMarkdownFiles() {
  if (!isRepoCloned()) {
    return [];
  }

  const mdFiles = [];

  function scanDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      // Skip hidden files/folders and node_modules
      if (entry.startsWith('.') || entry === 'node_modules') {
        continue;
      }

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.endsWith('.md')) {
        mdFiles.push(relative(REPO_DIR, fullPath));
      }
    }
  }

  scanDir(REPO_DIR);
  return mdFiles.sort();
}
