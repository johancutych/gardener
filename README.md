# 🪴 Gardener

**One-click company context for AI tools.**

Gardener syncs markdown files from a Git repo and copies them to your clipboard with a single click. Give any AI tool instant context about your company, product, or project.

![macOS](https://img.shields.io/badge/macOS-000000?style=flat&logo=apple&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Why?

Every ChatGPT/Claude conversation starts from zero. You re-explain your product, your market, your constraints — every time.

Gardener fixes this:
1. Your team maintains context files in a shared Git repo
2. Everyone installs Gardener → 🪴 appears in their menubar
3. Click 🪴 → context copied → paste into any AI tool

**Your AI conversations start informed, not from scratch.**

## Install

```bash
npm install -g gardener-context
```

## Quick Start

```bash
# 1. Setup - point to your team's context repo
gardener setup
# Enter repo URL (e.g., git@github.com:your-company/context.git)

# 2. Start the menubar app
gardener start

# 3. (Optional) Auto-start on login
gardener autostart --enable
```

## Usage

| Action | Result |
|--------|--------|
| **Click 🪴** | Copy context to clipboard |
| **Right-click 🪴** | Open menu |
| **Menu → Refresh** | Pull latest from Git |
| **Menu → [filename]** | Switch between markdown files |

Then paste into ChatGPT, Claude, Cursor, or any AI tool.

## CLI Commands

```bash
gardener setup              # Configure repo URL and clone
gardener start              # Start menubar app
gardener copy               # Copy context to clipboard (CLI)
gardener update             # Pull latest from repo
gardener status             # Show config and sync status
gardener autostart          # Show autostart status
gardener autostart --enable # Start on login
gardener autostart --disable
```

## How It Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Shared Git     │ pull │  ~/.gardener/   │ copy │   Clipboard     │
│  Repo           │ ───► │  repo/          │ ───► │   → AI Tool     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. Your team maintains markdown files in a shared Git repo
2. Gardener clones it locally to `~/.gardener/repo/`
3. Click 🪴 → copies selected file to clipboard
4. Paste into any AI conversation

## Example Context File

```markdown
# Acme Corp — Product Context

**What we do:** B2B SaaS for inventory management

**Tech stack:** React, Node.js, PostgreSQL, AWS

**Current focus:** Q1 launch of mobile app

**Key constraints:**
- Users are non-technical warehouse managers
- Mobile-first is our current priority
- We prioritize speed over perfection

**Tone:** Professional but friendly
```

## Multiple Context Files

Gardener supports multiple `.md` files in your repo. Right-click the menubar icon to switch between them:

```
your-context-repo/
├── Context.md        # General company context
├── Engineering.md    # Technical standards
├── Product.md        # Product strategy
└── Brand.md          # Voice and tone
```

## Development

### Prerequisites

- macOS
- Node.js 18+
- Git with SSH key configured

### Setup

```bash
git clone https://github.com/yourusername/gardener.git
cd gardener

# Install dependencies
npm install

# Run in dev mode
npm start

# Or use CLI directly
npm run cli -- status
```

### Build

```bash
# Build macOS app
npm run build

# App is created at dist/mac-arm64/Gardener.app
```

### Project Structure

```
gardener/
├── bin/cli.js       # CLI entry point
├── src/
│   ├── index.js     # Electron menubar app
│   ├── config.js    # User settings (~/.config/gardener)
│   └── git.js       # Git operations
├── assets/
│   ├── icon.png     # Menubar icon source
│   └── icon.icns    # macOS app icon
└── dist/            # Built app (after npm run build)
```

## Configuration

Config is stored at `~/.config/gardener/config.json`:

```json
{
  "repoUrl": "git@github.com:your-company/context.git",
  "contextFile": "Context.md",
  "lastSync": "2024-01-15T10:30:00.000Z"
}
```

Repo is cloned to `~/.gardener/repo/`.

## Troubleshooting

**App doesn't start on login?**
```bash
gardener autostart --disable
gardener autostart --enable
```

**Context not updating?**
```bash
gardener update
# or right-click 🪴 → Refresh
```

**Want to change repos?**
```bash
gardener setup
# Re-run setup to clone a different repo
```

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT
