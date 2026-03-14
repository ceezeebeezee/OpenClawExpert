# CLAUDE.md

## Project Overview

OpenClaw agent learning guide and example configuration templates. Documentation/learning material, not runnable code.

- **Git remote**: `https://github.com/ceezeebeezee/OpenClawExpert`
- **Directory has a space in the name** — always quote paths: `cd "OpenClaw Expert"`
- User may refer to this project as "OpenClaw Learning" — the actual directory is "OpenClaw Expert"

## File Structure

| File | Purpose |
|------|---------|
| `OPENCLAW_EXPERT_GUIDE.md` | 23-chapter learning guide (main document, includes architecture diagrams) |
| `examples/SOUL.md` | Agent personality template (includes email voice, scheduling prefs) |
| `examples/USER.md` | User profile template |
| `examples/AGENTS.md` | Operating rules (email handling, scheduling, admin workflows) |
| `examples/HEARTBEAT.md` | Periodic check-in checklist (9 checks, morning brief format) |
| `examples/openclaw.json` | Full JSON5 config with inline comments and skill entries |
| `examples/skills/*/SKILL.md` | Custom skill templates (quick-capture, email-triage) |
| `examples/plugins/morning-brief/` | Plugin scaffold (manifest + TypeScript with `[PLACEHOLDER]` markers) |

## Content Guidelines

- **Guide is versioned** — update the version, date, and "Next update" in the header of `OPENCLAW_EXPERT_GUIDE.md` when making changes
- **Update cadence**: Every 3 days (next update date shown in guide header)
- **Section numbering matters** — TOC anchors must match section headers; renumber downstream sections when inserting
- Example configs use comments/annotations to teach — preserve the educational tone
- `openclaw.json` uses JSON5 format (inline `//` comments are intentional, not errors)
- Plugin `index.ts` uses `[PLACEHOLDER]` markers to show where real API integrations go

## Gotchas

- When pushing to remote for the first time after it has existing content (e.g. a README), use `git pull origin main --rebase` before `git push`
- The guide is large (~74KB) — when editing, read specific line ranges rather than the whole file
- Workspace `.md` files in `examples/` mirror real OpenClaw workspace file names (SOUL.md, AGENTS.md, etc.) — don't confuse them with project docs
