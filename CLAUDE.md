# Gardener - Claude Code Instructions

## Security Rules

**NEVER commit or publish these:**
- `.claude/` - Contains local Claude Code settings with potential tokens
- `.npmrc` - Contains npm authentication tokens
- `.env` - Environment variables
- Any file containing `npm_` tokens or API keys

## Before Publishing

Always verify no secrets are included:
```bash
npm pack --dry-run  # Check what files will be published
```

## Files Structure

- `bin/cli.js` - CLI entry point
- `src/index.js` - Electron menubar app
- `src/config.js` - User settings (stored in ~/.config/gardener)
- `src/git.js` - Git operations
- `assets/icon.png` - Menubar icon

## Publishing Updates

```bash
npm version patch   # or minor/major
npm publish --access public
git push
```
