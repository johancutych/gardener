import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

const config = new Conf({
  projectName: 'gardener',
  defaults: {
    repoUrl: '',
    contextFile: 'Context.md',
    lastSync: null
  }
});

export const GARDENER_DIR = join(homedir(), '.gardener');
export const REPO_DIR = join(GARDENER_DIR, 'repo');

export function getRepoUrl() {
  return config.get('repoUrl');
}

export function setRepoUrl(url) {
  config.set('repoUrl', url);
}

export function getContextFile() {
  return config.get('contextFile');
}

export function setContextFile(filename) {
  config.set('contextFile', filename);
}

export function getLastSync() {
  return config.get('lastSync');
}

export function setLastSync(date = new Date()) {
  config.set('lastSync', date.toISOString());
}

export function isConfigured() {
  return !!config.get('repoUrl');
}

export function getContextPath() {
  return join(REPO_DIR, getContextFile());
}

export default config;
