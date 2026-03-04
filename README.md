# 🪴 Gardener

**One-click company context for AI tools.**

Gardener syncs a shared `Context.md` file from a Git repo and copies it to your clipboard with a single click. Give any AI tool instant context about your company, product, or project.

## Why?

Every ChatGPT/Claude conversation starts from zero. You re-explain your product, your market, your constraints — every time.

Gardener fixes this:
1. Your team maintains one `Context.md` in a shared Git repo
2. Everyone installs Gardener → 🪴 appears in their menubar
3. Click 🪴 → context copied → paste into any AI tool

**Your AI conversations start informed, not from scratch.**

## Install

```bash
npm install -g gardener-context
```

## Setup

```bash
gardener setup
# Enter your team's context repo URL (SSH)
# Example: git@github.com:your-company/context.git

gardener start
# 🪴 appears in your menubar
```

## Usage

- **Click 🪴** → Copies context to clipboard instantly
- **Right-click 🪴** → Menu (Refresh, Quit)

Then paste into ChatGPT, Claude, or any AI tool.

## CLI Commands

```bash
gardener setup      # Configure repo URL and clone
gardener start      # Start menubar app
gardener copy       # Copy context to clipboard (CLI)
gardener update     # Pull latest from repo
gardener status     # Show current config and sync status
```

## How It Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Shared Git     │ pull │  ~/.gardener/   │ copy │   Clipboard     │
│  Context.md     │ ───► │  repo/          │ ───► │   → AI Tool     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. Your team maintains `Context.md` in a shared Git repo
2. Gardener clones it locally to `~/.gardener/repo/`
3. Click 🪴 → copies to clipboard
4. Paste into any AI conversation

## Example Context.md

```markdown
# Acme Corp — Product Context

**What we do:** B2B SaaS for inventory management

**Tech stack:** React, Node.js, PostgreSQL, AWS

**Current focus:** Q1 launch of mobile app

**Key metrics:** 500 customers, $2M ARR, 15% MoM growth

**When helping with Acme work:**
- We prioritize speed over perfection
- Our users are non-technical warehouse managers
- Mobile-first is our current priority
```

## Editing Context

Edit the context using any tool:
- VS Code / Cursor
- Claude Code: `claude ~/.gardener/repo`
- GitHub web UI

Then commit and push. Team members click **Right-click → Refresh** to get updates.

## Requirements

- macOS (menubar app)
- Node.js 18+
- Git with SSH access to your context repo

## License

MIT
