# OpenClaw Expert Guide

> **Version**: 1.0 | **Created**: 2026-03-03 | **Next update**: 2026-03-06
>
> Goal: Make you an OpenClaw expert. This is a living document — updated every 3 days with new
> insights, corrections, and advanced patterns as you learn.

---

## Table of Contents

1. [What Is OpenClaw?](#1-what-is-openclaw)
2. [System Architecture](#2-system-architecture)
3. [Message Flow: End to End](#3-message-flow-end-to-end)
4. [The Gateway](#4-the-gateway)
5. [Channels](#5-channels)
6. [Workspace Files (.md files)](#6-workspace-files)
7. [The Memory System](#7-the-memory-system)
8. [Skills Framework](#8-skills-framework)
9. [Plugin System](#9-plugin-system)
10. [Configuration Deep-Dive (openclaw.json)](#10-configuration-deep-dive)
11. [Security Model](#11-security-model)
12. [Multi-Agent Architecture](#12-multi-agent-architecture)
13. [Sub-Agents](#13-sub-agents)
14. [Hooks System](#14-hooks-system)
15. [Recommended Skills for Your Use Case](#15-recommended-skills)
16. [Plugin Ideas for Your Workflow](#16-plugin-ideas)
17. [CLI Command Reference](#17-cli-command-reference)
18. [Troubleshooting](#18-troubleshooting)
19. [Cost & Infrastructure](#19-cost--infrastructure)
20. [Learning Roadmap](#20-learning-roadmap)

---

## 1. What Is OpenClaw?

OpenClaw is an open-source, local-first AI agent that you run on your own hardware. Unlike ChatGPT
or other chat-only tools, OpenClaw is **agentic** — it doesn't just respond, it *acts*. It connects
to messaging platforms (Telegram, WhatsApp, Discord, Slack, iMessage, Signal) and uses AI models
(Claude, GPT, Gemini, local Ollama models) to perform real tasks on your behalf.

**Key differentiators:**
- **Local-first**: Runs on your machine. Your data stays with you.
- **Messaging-as-UI**: You talk to it where you already are — Telegram, WhatsApp, etc.
- **Proactive**: The heartbeat system lets it act autonomously (check email, prepare briefings).
- **Extensible**: Skills (markdown-based instructions) and plugins (TypeScript modules) add capabilities.
- **Multi-channel**: One agent, many messaging platforms simultaneously.

> **Insight**: Think of OpenClaw as middleware between your messaging apps and AI models. The Gateway
> is the central hub. Everything else — channels, skills, plugins, memory — plugs into it.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR MACHINE                             │
│                                                                 │
│  ┌───────────┐     ┌──────────────────────────────────────┐     │
│  │ Telegram   │────▶│                                      │     │
│  └───────────┘     │         GATEWAY (Node.js)             │     │
│  ┌───────────┐     │         Port 18789 (WebSocket)        │     │
│  │ WhatsApp   │────▶│                                      │     │
│  └───────────┘     │  ┌──────────┐  ┌──────────────────┐  │     │
│  ┌───────────┐     │  │ Session  │  │ Skill Loader     │  │     │
│  │ Discord    │────▶│  │ Manager  │  │ (SKILL.md files) │  │     │
│  └───────────┘     │  └──────────┘  └──────────────────┘  │     │
│  ┌───────────┐     │  ┌──────────┐  ┌──────────────────┐  │     │
│  │ Slack      │────▶│  │ Plugin   │  │ Tool Executor    │  │     │
│  └───────────┘     │  │ Runtime  │  │ (shell, browser) │  │     │
│                    │  └──────────┘  └──────────────────┘  │     │
│                    │  ┌──────────┐  ┌──────────────────┐  │     │
│                    │  │ Memory   │  │ Heartbeat        │  │     │
│                    │  │ Index    │  │ Scheduler        │  │     │
│                    │  └──────────┘  └──────────────────┘  │     │
│                    └──────────┬───────────────────────────┘     │
│                               │                                 │
│                               ▼                                 │
│                    ┌──────────────────────┐                     │
│                    │   LLM BRAIN          │                     │
│                    │   (Claude / GPT /    │                     │
│                    │    Gemini / Ollama)  │                     │
│                    └──────────────────────┘                     │
│                               │                                 │
│                               ▼                                 │
│                    ┌──────────────────────┐                     │
│                    │   WORKSPACE          │                     │
│                    │   ~/.openclaw/       │                     │
│                    │   workspace/         │                     │
│                    │   ├── SOUL.md        │                     │
│                    │   ├── USER.md        │                     │
│                    │   ├── AGENTS.md      │                     │
│                    │   ├── MEMORY.md      │                     │
│                    │   ├── HEARTBEAT.md   │                     │
│                    │   ├── TOOLS.md       │                     │
│                    │   ├── BOOT.md        │                     │
│                    │   ├── IDENTITY.md    │                     │
│                    │   └── memory/        │                     │
│                    │       └── YYYY-MM-DD │                     │
│                    └──────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**The four tiers:**

| Tier | Component | Role |
|------|-----------|------|
| 1 | **Channels** | Input/output adapters for messaging platforms |
| 2 | **Gateway** | Central orchestrator — session management, routing, tool execution |
| 3 | **LLM Brain** | AI model that reasons about your messages and decides what to do |
| 4 | **Skills / Toolbox** | The actual capabilities — shell commands, browser control, file ops |

> **Insight**: The Gateway is the single process everything flows through. It runs as a Node.js
> application (requires Node 22+). On macOS, it can also run as a menubar app. It starts with
> `openclaw gateway` and listens on port 18789 by default.

---

## 3. Message Flow: End to End

Here's exactly what happens when you send a message via Telegram:

```
1. YOU type "What's on my calendar today?" in Telegram
   │
2. Telegram Bot API delivers message to OpenClaw's channel handler
   │
3. Channel handler validates sender against allowlist (channels.telegram.allowFrom)
   ├── Unauthorized? → Message dropped silently
   │
4. Gateway creates/resumes a SESSION for this sender
   │   Sessions are scoped per-sender (dmScope: "per-peer" by default)
   │   Stored in ~/.openclaw/agents/<id>/sessions/sessions.json
   │
5. Gateway ASSEMBLES CONTEXT for the LLM:
   │   ├── SOUL.md (personality + rules)
   │   ├── AGENTS.md (operating instructions)
   │   ├── USER.md (info about you)
   │   ├── TOOLS.md (available tools/commands)
   │   ├── MEMORY.md (long-term facts)
   │   ├── Recent daily memory logs
   │   ├── Eligible SKILL.md files (matching gates)
   │   ├── Conversation history (from session)
   │   └── Your message: "What's on my calendar today?"
   │
6. LLM REASONS about the request
   │   ├── Selects relevant skill(s) or tools
   │   ├── Decides on a plan of action
   │   └── May need to call external APIs (Google Calendar)
   │
7. TOOL EXECUTION
   │   ├── Permission check (HITL for destructive operations)
   │   ├── Skill invocation (e.g., google-calendar skill)
   │   └── Result returned to LLM
   │
8. LLM FORMATS response based on channel constraints
   │   ├── Telegram: Markdown formatting, shorter messages
   │   └── WhatsApp: Plain text, mobile-optimized
   │
9. Gateway delivers response back through Telegram channel
   │
10. YOU see the response in your Telegram chat
```

> **Insight**: Step 5 is where token budget matters most. Each workspace file, each loaded skill,
> and the full conversation history all compete for context window space. A single skill adds
> ~97 characters (~24 tokens) to the system prompt. With 50 skills loaded, that's ~1,200 extra
> tokens before you've even sent a message. Be selective about which skills you enable.

---

## 4. The Gateway

The Gateway is OpenClaw's brain stem — the always-running process that coordinates everything.

### Startup & Management

```bash
# Start the gateway
openclaw gateway                          # Foreground mode
openclaw gateway start                    # Background daemon (launchd/systemd)
openclaw gateway stop                     # Stop the daemon
openclaw gateway restart                  # Restart

# Flags
openclaw gateway --port 18789             # Custom port
openclaw gateway --bind loopback          # Localhost only (SECURITY: always use this)
openclaw gateway --token "my-secret"      # API auth token
```

### What the Gateway does:

1. **Session management**: Creates, stores, resets, and compacts conversation sessions
2. **Channel routing**: Routes incoming messages to the right agent and outgoing responses to the right channel
3. **Skill orchestration**: Loads eligible skills, matches them to user intent, passes to LLM
4. **Plugin runtime**: Loads and runs TypeScript plugins in-process
5. **Tool execution**: Runs shell commands, browser automation, file operations on behalf of the agent
6. **Memory indexing**: Maintains vector embeddings for semantic search over workspace files
7. **Heartbeat scheduling**: Wakes the agent at intervals for proactive task execution
8. **RPC server**: Exposes WebSocket API for the Control UI and CLI tools

### Key Paths

```
~/.openclaw/openclaw.json              # Main configuration
~/.openclaw/workspace/                  # Default agent workspace
~/.openclaw/agents/<id>/                # Per-agent state (multi-agent setups)
~/.openclaw/agents/<id>/sessions/       # Chat history (JSON Lines)
~/.openclaw/credentials/                # OAuth/API keys
~/.openclaw/memory/<agentId>.sqlite     # Vector index (SQLite)
~/.openclaw/extensions/                 # Local plugins
~/.openclaw/skills/                     # Managed/local skills
/tmp/openclaw/openclaw-YYYY-MM-DD.log   # Gateway logs
```

> **Insight**: The Gateway binds to `0.0.0.0` by default, which means *any device on your network*
> can reach it. Always set `bind: "loopback"` to restrict to localhost. If you need remote access,
> use Tailscale Serve (never Funnel — that exposes to the public internet).

---

## 5. Channels

Channels are the messaging platform adapters. Each channel handles the protocol-specific
details of receiving and sending messages.

### Supported Channels

| Channel | Stability | Setup | Group Support | Notes |
|---------|-----------|-------|---------------|-------|
| **Telegram** | High | Easy | Yes (mention) | Best for dev/automation. Bot API. |
| **WhatsApp** | Medium | Hard | Yes (mention) | Uses Baileys library. QR auth. |
| **iMessage** | High | Easy | Yes | macOS only. AppleScript bridge. |
| **Slack** | High | Easy | Yes (thread) | Socket Mode. Workspace-scoped. |
| **Discord** | Medium | Easy | Yes (mention) | WebSocket. Watch for zombie connections. |
| **Signal** | High | Hard | Yes | Privacy-focused. signal-cli bridge. |
| **WebChat** | High | Built-in | No | Testing/development only. |

### Telegram Setup

```bash
# 1. Create a bot via @BotFather in Telegram
# 2. Copy the bot token
# 3. Add to config:
openclaw config set channels.telegram.botToken "${TELEGRAM_BOT_TOKEN}"
openclaw config set channels.telegram.dmPolicy "pairing"
openclaw config set channels.telegram.streamMode "partial"

# 4. Verify:
openclaw channels status --probe
```

### WhatsApp Setup

```bash
# 1. Run the login flow (QR code):
openclaw channels login --channel whatsapp

# 2. Scan QR code with WhatsApp on your personal phone
# 3. Configure allowlist:
openclaw config set channels.whatsapp.allowFrom '["+1234567890"]'

# 4. Verify:
openclaw channels status --probe
```

### Channel-Specific Behavior via SOUL.md

You can specify different tones per channel in SOUL.md:

```markdown
# Communication Style
- On Telegram: casual, direct, use short messages. Technical when discussing code.
- On WhatsApp: same casual tone, optimized for mobile reading. Shorter responses.
- On Slack: professional, use threads, slightly more formal.
- On iMessage: conversational, brief.
```

### MESSAGING.md — Outbound Routing

This file tells the agent *how* to reach people across channels:

```markdown
# Contacts
- Mom: WhatsApp (+1234567890)
- Work team: Slack (#general)
- Dev bot: Telegram (@mydevbot)
```

The agent uses this to decide which channel to use when *it* needs to reach out (via heartbeat
or proactive messaging).

> **Insight**: Start with ONE channel. Get it stable, learn the configuration patterns, understand
> the session model. Then add a second. Adding multiple channels simultaneously multiplies the
> surface area for security misconfigurations.

---

## 6. Workspace Files

These are the `.md` files that define your agent's personality, knowledge, and behavior.
They live in `~/.openclaw/workspace/` (or `~/.openclaw/agents/<id>/workspace/` for multi-agent).

| File | Purpose | Loaded When |
|------|---------|-------------|
| **SOUL.md** | Personality, tone, boundaries | Every session |
| **USER.md** | Info about you (name, role, preferences) | Every session |
| **AGENTS.md** | Operating instructions and rules | Every session |
| **MEMORY.md** | Curated long-term facts | Normal sessions (not heartbeat) |
| **IDENTITY.md** | Agent name, emoji, theme | Session initialization |
| **TOOLS.md** | Documentation for local tools/commands | Every session |
| **HEARTBEAT.md** | Periodic check-in checklist | Heartbeat sessions only |
| **BOOT.md** | Startup procedures | Gateway startup (via boot-md hook) |
| **MESSAGING.md** | Outbound message routing rules | When agent needs to reach out |
| **memory/YYYY-MM-DD.md** | Daily append-only logs | Session start (recent days) |

### How They Compose

When a session starts, the Gateway assembles these files into a **system prompt** for the LLM.
The order matters — files loaded later can override earlier ones. The full context looks like:

```
[System prompt preamble]
[SOUL.md content]
[AGENTS.md content]
[USER.md content]
[TOOLS.md content]
[MEMORY.md content]           ← only in non-heartbeat sessions
[Loaded SKILL.md files]       ← one per eligible skill
[Conversation history]        ← from session store
[Your latest message]
```

> **Insight**: Every character in these files costs tokens. SOUL.md should be 1-2 pages max.
> MEMORY.md should be curated, not a dump. The agent itself maintains memory — you teach it
> *what's important*, and it writes to the daily logs and curates into MEMORY.md over time.

### See `examples/` directory for ready-to-use templates of each file.

---

## 7. The Memory System

OpenClaw has a three-tier memory architecture:

### Tier 1: Daily Logs (Short-term)

```
~/.openclaw/workspace/memory/
├── 2026-03-01.md
├── 2026-03-02.md
└── 2026-03-03.md
```

- **Append-only**: The agent writes to today's log throughout the day
- **Loaded at session start**: Recent daily logs are included in the session context
- **Automatic**: The `session-memory` hook saves context when you run `/new`
- **Format**: Timestamped entries with whatever the agent considers worth remembering

### Tier 2: Curated Memory (Long-term)

```
~/.openclaw/workspace/MEMORY.md
```

- **Curated**: The agent (or you) moves important, durable facts here from daily logs
- **Always loaded**: Included in every non-heartbeat session
- **Quality over quantity**: Keep it concise — key preferences, project details, recurring patterns
- **DM-only modifications**: The agent only modifies MEMORY.md in DM sessions, never in groups

### Tier 3: Vector Search (Semantic)

```
~/.openclaw/memory/<agentId>.sqlite
```

- **Indexed**: All workspace files are embedded as vectors in a SQLite database
- **Searchable**: The agent can use `memory_search` tool for semantic queries
- **Hybrid retrieval**: 70% vector similarity + 30% BM25 keyword matching (configurable)
- **Providers**: Auto-selects: local GGUF model → OpenAI → Gemini → Voyage

```bash
# Manage the vector index
openclaw memory status                  # Check index health
openclaw memory index --all             # Reindex everything
openclaw memory search "project deploy" # Test semantic search
```

### Teaching Your Agent to Remember

The most effective patterns:

```
You (Telegram): "Remember: I deploy Career Navigator to Vercel and AIBoard to Railway"
Agent: "Got it. I've saved this to my memory."

You: "Note: The Timezone Converter doesn't have a build step — load as unpacked extension"
Agent: "Noted. I'll remember this for future reference."

You: "What do you know about my projects?"
Agent: [retrieves from MEMORY.md and vector search]
```

> **Insight**: Memory is the secret weapon of a good OpenClaw setup. Spend time in the first week
> actively teaching it. Say "remember this" often. After a week, you'll have a contextual assistant
> that actually knows your workflow. The `second-brain` skill takes this further by adding
> structured knowledge categories (concepts, toolbox, patterns, references).

---

## 8. Skills Framework

Skills are the primary way to add capabilities to your agent. A skill is a **folder containing a
`SKILL.md` file** — plain Markdown with YAML frontmatter.

### How Skills Work

1. **Gateway scans** skill directories at session start
2. **Gating check**: Does this skill's requirements match? (OS, binaries, env vars, config)
3. **Eligible skills** are loaded into the system prompt as instructions
4. **LLM reads** the instructions and follows them when relevant
5. **Skills are just instructions** — actual capabilities (shell, browser, API calls) come from tools

> **Key concept**: Skills are like recipes for a very literal cook. The LLM follows the written
> instructions exactly. If the skill says "run `curl https://api.example.com`", the LLM will
> use the shell tool to execute that command. Skills don't have their own runtime — they leverage
> the tools already available to the agent.

### Skill Loading Precedence

```
1. <workspace>/skills/     ← Per-agent, highest priority
2. ~/.openclaw/skills/     ← Managed/local (clawhub installs here)
3. Bundled skills          ← Shipped with OpenClaw, lowest priority
```

When naming conflicts occur, higher-precedence skills override lower ones.

### SKILL.md Format

```yaml
---
name: my-skill-name
description: "One-sentence description of what this skill does"
version: 1.0.0
user-invocable: true                    # Expose as /my-skill-name command
disable-model-invocation: false         # If true, LLM won't auto-trigger this
metadata: {"openclaw": {
  "emoji": "📝",
  "os": ["darwin", "linux"],            # Platform filter
  "requires": {
    "bins": ["node"],                   # Required executables on PATH
    "env": ["MY_API_KEY"],              # Required environment variables
    "config": ["skills.entries.my-skill.enabled"]  # Config keys that must be truthy
  },
  "primaryEnv": "MY_API_KEY",          # Maps to skills.entries.my-skill.apiKey
  "install": [{                         # Auto-install instructions
    "id": "brew",
    "kind": "brew",
    "formula": "some-cli",
    "bins": ["some-cli"],
    "label": "Install via Homebrew"
  }]
}}
---

## Instructions

When the user asks to [trigger condition], do the following:

1. [Step 1 — be specific]
2. [Step 2 — include exact commands or API calls]
3. Confirm completion to the user.

## Rules

- Never proceed without confirming sensitive actions first.
- If a required input is missing, ask for it.
- Always show results in a concise format.
```

### Frontmatter Fields Reference

| Field | Default | Purpose |
|-------|---------|---------|
| `name` | (required) | Skill identifier |
| `description` | (required) | What the skill does |
| `user-invocable` | `true` | Exposed as `/name` slash command |
| `disable-model-invocation` | `false` | If true, only triggered by explicit `/name` |
| `command-dispatch` | — | Bypass LLM, dispatch directly to a tool |
| `command-tool` | — | Which tool to invoke when command-dispatched |
| `command-arg-mode` | `raw` | How args are forwarded to the tool |
| `homepage` | — | URL shown in macOS Skills UI |
| `metadata.openclaw.emoji` | — | Icon in macOS Skills UI |
| `metadata.openclaw.os` | all | Platform filter (darwin, linux, win32) |
| `metadata.openclaw.requires.bins` | — | Required binaries on PATH |
| `metadata.openclaw.requires.env` | — | Required environment variables |
| `metadata.openclaw.requires.config` | — | Required config keys |
| `metadata.openclaw.always` | `false` | Skip gating, always load |
| `metadata.openclaw.primaryEnv` | — | Convenience API key mapping |

### Installing Skills

```bash
# From ClawHub registry
clawhub install <slug>

# Update all installed skills
clawhub update --all

# Check installed skills
ls ~/.openclaw/skills/
```

### Creating Custom Skills

See `examples/skills/quick-capture/SKILL.md` for a complete example.

```bash
# Create locally (highest precedence)
mkdir -p ~/.openclaw/workspace/skills/my-skill
# Edit ~/.openclaw/workspace/skills/my-skill/SKILL.md
```

> **Insight**: Start with 5-10 well-chosen skills, not 50. Each skill adds ~24 tokens to your
> system prompt. More importantly, too many skills confuse the LLM about which one to use.
> Quality and specificity beat quantity. You can always add more later.

---

## 9. Plugin System

Plugins are **TypeScript modules** that extend OpenClaw with code-level capabilities beyond
what SKILL.md instructions can do. They run in-process with the Gateway.

### When to Use a Skill vs. a Plugin

| Use a Skill when... | Use a Plugin when... |
|----------------------|----------------------|
| Instructions are enough | You need custom code logic |
| Calling existing tools | You need new tools |
| Simple workflows | Complex state management |
| No external dependencies | You need npm packages |
| Quick to iterate | Performance-critical operations |

### Plugin Architecture

```
~/.openclaw/extensions/my-plugin/
├── openclaw.plugin.json    ← Manifest (required)
├── index.ts                ← Entry point
├── package.json            ← Dependencies (optional)
├── node_modules/           ← npm install (if deps needed)
└── skills/                 ← Plugin-provided skills (optional)
    └── my-skill/
        └── SKILL.md
```

### Plugin Manifest (openclaw.plugin.json)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string" },
      "enabled": { "type": "boolean", "default": true }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true }
  }
}
```

### Plugin Entry Point (index.ts)

```typescript
// Function form (simple)
export default function (api) {
  // Register a tool the agent can call
  api.registerTool({
    name: "my_tool",
    description: "Does something useful",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "The input" }
      }
    },
    handler: async ({ input }) => {
      // Your logic here
      return { result: `Processed: ${input}` };
    }
  });

  // Register a slash command (no LLM involved)
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    acceptsArgs: false,
    requireAuth: true,
    handler: (ctx) => ({ text: "Status: active" })
  });

  // Register a background service
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("Service started"),
    stop: () => api.logger.info("Service stopped")
  });

  // Register a hook
  api.registerHook(
    "command:new",
    async () => { /* runs when /new is invoked */ },
    { name: "my-plugin.on-new", description: "Custom logic on session reset" }
  );

  // Register a Gateway RPC method
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true, uptime: process.uptime() });
  });

  // Register CLI commands
  api.registerCli(({ program }) => {
    program.command("my-cmd")
      .description("My custom CLI command")
      .action(() => console.log("Hello from my plugin"));
  }, { commands: ["my-cmd"] });
}
```

### Plugin Capabilities Summary

| Capability | Method | Use Case |
|------------|--------|----------|
| **Agent Tools** | `api.registerTool()` | New actions the LLM can invoke |
| **Commands** | `api.registerCommand()` | Slash commands (bypass LLM) |
| **Services** | `api.registerService()` | Background processes |
| **Hooks** | `api.registerHook()` | React to events |
| **RPC Methods** | `api.registerGatewayMethod()` | Extend Gateway API |
| **CLI** | `api.registerCli()` | New terminal commands |
| **Channels** | `api.registerChannel()` | Custom messaging integrations |
| **Providers** | `api.registerProvider()` | Custom LLM provider auth |
| **Skills** | `skills/` directory | Plugin-bundled skills |

### Plugin Discovery Precedence

```
1. plugins.load.paths (explicit config paths)
2. <workspace>/.openclaw/extensions/*.ts
3. ~/.openclaw/extensions/*.ts
4. Bundled extensions (disabled by default)
```

### Plugin Management

```bash
openclaw plugins list                          # View loaded plugins
openclaw plugins install @openclaw/voice-call  # Install from npm
openclaw plugins install -l ./my-plugin        # Link local plugin
openclaw plugins enable <id>                   # Enable
openclaw plugins disable <id>                  # Disable
openclaw plugins update <id>                   # Update
```

> **Insight**: Plugins run IN-PROCESS with the Gateway. This means they have full access to
> everything the Gateway can do. Treat third-party plugins as trusted code — review the source
> before installing. Use `plugins.allow` allowlists to restrict which plugins can load.

### See `examples/plugins/morning-brief/` for a complete plugin scaffold.

---

## 10. Configuration Deep-Dive

Everything is configured in `~/.openclaw/openclaw.json` (JSON5 format — comments allowed).

### Complete Structure

```json5
{
  // ─── MODEL SELECTION ───────────────────────────────────────────
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",     // Daily driver
        fallbacks: ["anthropic/claude-haiku-4-5"]   // Cheaper fallback
      },
      models: {
        "anthropic/claude-sonnet-4-6": {
          alias: "sonnet",
          temperature: 0.7,                         // 0 = focused, 2 = creative
          maxTokens: 4096,
          cacheControlTtl: 300                      // Prompt caching (seconds)
        }
      },
      heartbeat: {
        every: "30m",                               // Check-in interval
        activeHours: "07:00-23:00",                 // Don't wake at 3am
        target: "last",                             // Reply in last active chat
        model: "anthropic/claude-haiku-4-5"         // Use cheaper model for heartbeat
      }
    }
  },

  // ─── CHANNELS ──────────────────────────────────────────────────
  channels: {
    telegram: {
      botToken: "${TELEGRAM_BOT_TOKEN}",            // From @BotFather
      dmPolicy: "pairing",                          // Require pairing handshake
      groupPolicy: "mention",                       // Only respond when @mentioned
      streamMode: "partial",                        // Show typing indicators
      allowFrom: [123456789]                        // Telegram user IDs
    },
    whatsapp: {
      allowFrom: ["+1234567890"],                   // Your phone number
      // QR auth handled by: openclaw channels login --channel whatsapp
    }
  },

  // ─── SKILLS ────────────────────────────────────────────────────
  skills: {
    load: {
      watch: true,                                  // Hot-reload skill changes
      extraDirs: ["~/my-custom-skills"]             // Additional skill directories
    },
    entries: {
      "second-brain": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "ENSUE_API_KEY" }
      },
      "web-search": {
        enabled: true,
        env: { BRAVE_API_KEY: "${BRAVE_API_KEY}" }
      },
      "some-dangerous-skill": {
        enabled: false                              // Disable specific skills
      }
    }
  },

  // ─── TOOLS ─────────────────────────────────────────────────────
  tools: {
    web: {
      search: {
        provider: "brave",                          // or "google"
        apiKey: "${BRAVE_API_KEY}"
      }
    },
    media: {
      audio: {
        // Whisper transcription config
      }
    }
  },

  // ─── PLUGINS ───────────────────────────────────────────────────
  plugins: {
    enabled: true,
    allow: ["morning-brief", "workspace-switcher"], // Allowlist (optional)
    deny: [],                                       // Denylist (optional)
    load: {
      paths: ["~/Projects/OpenClaw Learning/examples/plugins/morning-brief"]
    },
    entries: {
      "morning-brief": {
        enabled: true,
        config: { briefingTime: "07:00" }
      }
    },
    slots: {
      memory: "memory-core"                         // Exclusive slot selection
    }
  },

  // ─── SESSIONS ──────────────────────────────────────────────────
  session: {
    dmScope: "per-peer",                            // One session per person
    reset: {
      mode: "daily",                                // Auto-reset at 4am
      // OR mode: "idle", idleMinutes: 120          // Reset after 2hr idle
    },
    store: "~/.openclaw/agents/default/sessions/sessions.json"
  },

  // ─── CONTEXT MANAGEMENT ────────────────────────────────────────
  contextPruning: {
    mode: "cache-ttl"                               // or "sliding", "none"
  },
  compaction: {
    mode: "safeguard"                               // or "aggressive"
  },

  // ─── GATEWAY ───────────────────────────────────────────────────
  gateway: {
    port: 18789,
    mode: "local",
    bind: "loopback",                               // SECURITY: always loopback
    auth: {
      token: "${OPENCLAW_TOKEN}"                    // SECURITY: always set this
    }
  },

  // ─── MESSAGES ──────────────────────────────────────────────────
  messages: {
    tts: {
      auto: "never"                                 // or "always", "dm-only"
      // Provider: elevenlabs, openai, or edge-tts
    }
  },

  // ─── SANDBOXING ────────────────────────────────────────────────
  sandbox: {
    mode: "non-main",                               // Sandbox non-main sessions
    scope: "session",                               // One container per session
    workspaceAccess: "ro"                           // Read-only workspace in sandbox
  }
}
```

### Environment Variables

Store secrets in `~/.openclaw/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=1234567890:ABC...
BRAVE_API_KEY=BSA...
ENSUE_API_KEY=...
OPENCLAW_TOKEN=your-gateway-token
```

Reference them in config as `${VAR_NAME}`. Set permissions: `chmod 600 ~/.openclaw/.env`

### Validation

```bash
openclaw doctor           # Quick health check
openclaw doctor --deep    # Full validation with auto-fixes
openclaw config get       # View current config
openclaw config wizard    # Interactive editor
```

> **Insight**: Start with the minimal config. Add sections as you need them. The `openclaw onboard`
> wizard generates a working baseline. You don't need to understand every option on day one.

---

## 11. Security Model

OpenClaw runs on YOUR machine with YOUR privileges. This means it can do anything you can do.
Security is not optional.

### 10 Essential Controls

| # | Control | How | Why |
|---|---------|-----|-----|
| 1 | **Loopback binding** | `gateway.bind: "loopback"` | Prevents network access to gateway |
| 2 | **Auth token** | `gateway.auth.token` | Authenticates all Gateway API calls |
| 3 | **Channel allowlists** | `channels.*.allowFrom` | Only your accounts can talk to the agent |
| 4 | **File permissions** | `chmod 600 ~/.openclaw/.env` | Protects secrets from other users |
| 5 | **Pairing mode** | `dmPolicy: "pairing"` | Require explicit handshake for new senders |
| 6 | **HITL for destructive ops** | `require_approval` in skills | Human confirms before `rm`, `sudo`, etc. |
| 7 | **Sandboxing** | `sandbox.mode: "non-main"` | Isolate untrusted sessions in containers |
| 8 | **Skill review** | Read before installing | Third-party skills are untrusted code |
| 9 | **Plugin allowlists** | `plugins.allow: [...]` | Only load approved plugins |
| 10 | **Spending limits** | API provider settings | $5-10/day cap prevents runaway costs |

### Threat Vectors

1. **Prompt injection**: Someone sends your agent a message with hidden instructions.
   Mitigation: Channel allowlists + pairing mode
2. **Malicious skills**: A ClawHub skill contains harmful instructions.
   Mitigation: Always review source code before installing
3. **Credential leakage**: Agent includes API keys in responses.
   Mitigation: SOUL.md boundary rules + skill-level restrictions
4. **Privilege escalation**: Agent runs destructive shell commands.
   Mitigation: HITL approval for dangerous patterns + sandboxing
5. **Network exfiltration**: Agent sends data to external endpoints.
   Mitigation: Firewall rules + outbound connection monitoring

> **Insight**: The biggest risk isn't hackers — it's the agent doing something you didn't expect.
> A well-meaning "clean up old files" command could delete important data. Always have HITL
> approval enabled for shell execution and file deletion. Start with read-only tools and
> gradually expand permissions.

---

## 12. Multi-Agent Architecture

OpenClaw supports running multiple agents, each with their own workspace, personality, and
channel bindings.

### When to Use Multi-Agent

- **Work vs. Personal**: Different personality/tone for each context
- **Shared device**: Different users each get their own agent
- **Specialized agents**: One for dev work, one for personal assistant

### Agent Structure

```
~/.openclaw/agents/
├── default/                      # Default agent (always exists)
│   ├── workspace/
│   │   ├── SOUL.md
│   │   ├── USER.md
│   │   └── ...
│   └── sessions/
│       └── sessions.json
├── work-agent/
│   ├── workspace/
│   │   ├── SOUL.md              # Different personality
│   │   └── ...
│   └── sessions/
└── personal-agent/
    ├── workspace/
    └── sessions/
```

### Routing Precedence

When a message arrives, OpenClaw determines which agent handles it:

```
1. peer (DM/group ID)        ← Highest priority
2. guildId (Discord)
3. teamId (Slack)
4. accountId
5. channel type
6. default agent             ← Fallback
```

### Management

```bash
openclaw agents list                    # List all agents
openclaw agents list --bindings         # Show routing bindings
openclaw agents add <name>              # Create new agent
openclaw agents delete <name>           # Remove agent
```

> **Insight**: For your use case (personal assistant + second brain), a single agent is the right
> choice. Multi-agent adds complexity without benefit unless you need genuinely separate contexts.
> You can achieve different "modes" with skills and slash commands instead.

---

## 13. Sub-Agents

Sub-agents are ephemeral child sessions the main agent can spawn for parallel task execution.

### How They Work

```
Main Agent receives: "Research these 3 topics and summarize"
         │
         ├── Spawns Sub-Agent 1: "Research topic A" (runs in background)
         ├── Spawns Sub-Agent 2: "Research topic B" (runs in background)
         └── Spawns Sub-Agent 3: "Research topic C" (runs in background)
                                          │
                                All complete → Results announced to you
```

- Each sub-agent gets its own session key + optional sandbox
- They run in parallel without blocking the main conversation
- Results are auto-announced when complete
- Auto-archived after 60 minutes of idle

### Slash Commands

```
/subagents list              # View active sub-agents
/subagents stop <id>         # Stop a sub-agent
/subagents log <id>          # View sub-agent's conversation
/subagents info <id>         # Detailed status
/subagents send <id> <msg>   # Send message to sub-agent
```

### Tool: `sessions_spawn`

The LLM uses this tool internally:
```json
{
  "task": "Research the latest React 19 features",
  "label": "react-research",
  "model": "anthropic/claude-haiku-4-5",
  "thinking": true,
  "runTimeoutSeconds": 300,
  "cleanup": true
}
```

> **Insight**: Sub-agents are powerful for research tasks. Ask the agent to "research X, Y, and Z
> in parallel and give me a summary." Each topic gets its own sub-agent, and results come back
> faster than sequential processing. The cost is 3x the API calls, but the time savings are
> significant.

---

## 14. Hooks System

Hooks are event-driven scripts that run in response to specific agent lifecycle events.

### Available Events

| Event | Fires When |
|-------|-----------|
| `command:new` | User runs `/new` (session reset) |
| `command:reset` | User runs `/reset` |
| `command:stop` | User runs `/stop` |
| `gateway:startup` | Gateway starts up |
| `agent:bootstrap` | Agent initializes |

### Bundled Hooks

| Hook | What It Does |
|------|-------------|
| `session-memory` | Saves context to daily memory log when `/new` is invoked |
| `command-logger` | Audit log of all commands executed |
| `boot-md` | Runs BOOT.md content on gateway startup |

### Management

```bash
openclaw hooks list                    # View all hooks (bundled + plugin)
openclaw hooks enable <name>           # Enable a hook
openclaw hooks disable <name>          # Disable a hook
openclaw hooks info <name>             # Details about a hook
openclaw hooks check                   # Validate hook configurations
```

### Plugin Hooks

Plugins register hooks via `api.registerHook()` (see Plugin System section). Plugin hooks
appear with a `plugin:<id>` prefix and can only be toggled by enabling/disabling the parent plugin.

> **Insight**: The `session-memory` hook is essential — enable it immediately. Without it, context
> from previous sessions is lost when you run `/new`. With it, the agent saves important context
> to daily memory logs before clearing the session.

---

## 15. Recommended Skills for Your Use Case

Your goal: **Personal assistant + second brain + optimize personal and work life.**

### Tier 1: Install First (Core Experience)

| Skill | Install | Why |
|-------|---------|-----|
| **second-brain** | `clawhub install second-brain` | Structured knowledge base. "Remember this," "what do I know about X." Requires ENSUE_API_KEY. |
| **web-search** | `clawhub install web-search` | Real-time web research. Requires Brave or Google API key. |
| **proactive-agent** | `clawhub install proactive-agent` | Scheduled check-ins via Telegram. Habit tracking. Adaptive reminders. |

### Tier 2: Productivity Layer

| Skill | Install | Why |
|-------|---------|-----|
| **google-calendar** | `clawhub install google-calendar` | Read/write calendar events. Scheduling conflicts. Daily agenda. |
| **gmail** | `clawhub install gmail` | Email triage, drafting, sending (with your permission). |
| **todoist** | `clawhub install todoist` | Task management. Create tasks from conversations. |
| **cron-scheduler** | `clawhub install cron-scheduler` | Schedule recurring tasks (morning briefs, deployment checks). |

### Tier 3: Information Diet

| Skill | Install | Why |
|-------|---------|-----|
| **youtube-watcher** | `clawhub install youtube-watcher` | Fetch transcripts from YouTube channels. Digest videos. |
| **rss-reader** | `clawhub install rss-reader` | Aggregate tech news from RSS feeds. |
| **supermemory** | `clawhub install supermemory` | Store articles/URLs. Retrieve with contextual relevance. |

### Tier 4: Development Tools

| Skill | Install | Why |
|-------|---------|-----|
| **git-automation** | `clawhub install git-automation` | PR management, branch workflows, changelogs. |
| **vercel-deploy** | `clawhub install vercel-deploy` | Deploy Career Navigator + czbz.ai. |
| **browser-control** | `clawhub install browser-control` | Test Chrome extensions, web interaction. |

### Skills Configuration

Add each skill to `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      "second-brain": { enabled: true, apiKey: { source: "env", id: "ENSUE_API_KEY" } },
      "web-search": { enabled: true },
      "proactive-agent": { enabled: true },
      "google-calendar": { enabled: true },
      "gmail": { enabled: true },
      "todoist": { enabled: true, apiKey: { source: "env", id: "TODOIST_API_KEY" } }
    }
  }
}
```

> **Insight**: Install Tier 1 in the first 48 hours. Add Tier 2 in days 3-5. Add Tiers 3-4
> in week 2. This prevents overwhelm and lets you learn each skill's behavior before adding more.
> Remember: each active skill costs ~24 tokens in your context window.

---

## 16. Plugin Ideas for Your Workflow

These are custom plugins you could build. See `examples/plugins/` for scaffolding.

### Plugin 1: Morning Briefing Engine

Assembles and delivers a daily briefing via Telegram:
- Today's calendar events
- Unread email summary
- Pending Todoist tasks
- Weather forecast
- Deployment status across your projects
- Articles/notes saved to second brain yesterday

**Hooks into**: heartbeat (first check-in of the day)

### Plugin 2: Quick Capture Router

When you message prefixes like:
- `note:` → Saves to second brain
- `todo:` → Creates Todoist task
- `idea:` → Saves to ideas log in memory
- `link:` → Archives URL with summary to supermemory

Auto-categorizes, timestamps, and confirms with a one-liner.

### Plugin 3: Multi-Project Context Switcher

`/project aiboard` → Sets context to AIBoard:
- Loads AIBoard-specific memory
- Makes relevant commands available (npm run dev, docker build)
- Sets working directory

Maps: `aiboard` | `timezone` | `career` | `czbz`

### Plugin 4: Deployment Dashboard

`/deploys` → Shows status of all deployments:
- Career Navigator (Vercel)
- czbz.ai (Vercel)
- AIBoard (Railway)
- Latest commit, build status, live URL

---

## 17. CLI Command Reference

### Gateway

```bash
openclaw gateway [start|stop|restart]    # Manage daemon
openclaw gateway --port 18789            # Custom port
```

### Configuration

```bash
openclaw config get [path]               # Read config
openclaw config set <path> <value>       # Write config
openclaw config unset <path>             # Remove key
openclaw config wizard                   # Interactive editor
```

### Channels

```bash
openclaw channels login                  # QR/token auth
openclaw channels add --token <tok>      # Add channel
openclaw channels status --probe         # Health check
```

### Models

```bash
openclaw models list                     # Available models
openclaw models set <model>              # Set default
openclaw models status                   # Auth status
openclaw models auth setup-token         # API key auth
openclaw models fallbacks add <model>    # Add fallback
```

### Memory

```bash
openclaw memory status                   # Index health
openclaw memory index [--all]            # Reindex
openclaw memory search "<query>"         # Semantic search
```

### Agents

```bash
openclaw agents list [--bindings]        # List agents
openclaw agents add <name>               # Create agent
openclaw agents delete <name>            # Remove agent
```

### Skills

```bash
clawhub install <slug>                   # Install from ClawHub
clawhub update --all                     # Update all
clawhub sync --all                       # Sync and publish
```

### Plugins

```bash
openclaw plugins list                    # View loaded
openclaw plugins install <spec>          # Install
openclaw plugins enable|disable <id>     # Toggle
openclaw plugins update <id|--all>       # Update
```

### Sessions

```bash
openclaw sessions --json                 # List sessions
openclaw logs --follow                   # Tail gateway logs
```

### Diagnostics

```bash
openclaw doctor                          # Quick check
openclaw doctor --deep --yes             # Full check + auto-fix
openclaw onboard                         # Re-run setup wizard
```

### In-Chat Slash Commands

```
/status              # Session health, context usage
/context list        # What's loaded in context
/context detail      # Full system prompt + files
/model <model>       # Switch model for this session
/compact             # Summarize old context
/new [model]         # Start fresh session
/stop                # Abort and clear queue
/tts on|off          # Toggle text-to-speech
/think               # Toggle reasoning mode
/verbose             # Toggle verbose mode
```

---

## 18. Troubleshooting

### Common Issues

| Problem | Fix |
|---------|-----|
| WhatsApp disconnects | `openclaw channels login --channel whatsapp` (re-scan QR) |
| Gateway crashes | Check logs: `openclaw logs --follow`. Restart: `openclaw gateway restart` |
| Skills not loading | `openclaw doctor --deep`. Check `skills.entries.<name>.enabled` |
| Memory search empty | `openclaw memory index --all` to rebuild vector index |
| High API costs | Switch to `claude-haiku-4-5` for daily use. Use `sonnet` only when needed. |
| Agent not responding | `openclaw channels status --probe`. Check channel health. |
| Context too large | Run `/compact` to summarize old context. Reduce loaded skills. |

### Nuclear Options

```bash
openclaw reset --scope sessions          # Clear all sessions (keeps config)
openclaw doctor --deep --yes             # Fix everything it can
```

> **Insight**: `openclaw doctor --deep --yes` is your friend. Run it whenever something feels off.
> It validates config, checks channel health, verifies skill loading, and auto-fixes common issues.

---

## 19. Cost & Infrastructure

### API Costs (Anthropic Claude)

| Model | Cost Estimate | Use For |
|-------|--------------|---------|
| Claude Haiku 4.5 | ~$1-2/day | Daily assistant tasks, quick responses |
| Claude Sonnet 4.6 | ~$3-5/day | Complex reasoning, code review, deep work |
| Claude Opus 4.6 | ~$10-15/day | Extended coding, nuanced content creation |

**Recommendation**: Start with Sonnet as primary, Haiku as fallback. Switch to Opus only for
specific deep-work sessions via `/model anthropic/claude-opus-4-6`.

### Hardware

| Setup | Pros | Cons |
|-------|------|------|
| **Mac (always-on)** | Native menubar app, iMessage support | Must stay powered |
| **Mini PC / NUC** | Dedicated, low power | No iMessage |
| **VPS / Cloud** | Always accessible | No local file access |
| **Docker** | Portable, isolated | Extra complexity |

**Recommendation for you**: Run on your Mac during the day. Consider a Mac Mini for 24/7 if
you want always-on Telegram/WhatsApp responsiveness.

### Local LLM Option (Ollama)

If you want zero API costs (at the expense of quality):

```bash
# Install Ollama
brew install ollama

# Pull a model
ollama pull llama3.1

# Configure OpenClaw to use it
openclaw config set agents.defaults.model.primary "ollama/llama3.1"
```

Requires 64GB+ RAM for good results. Claude via API is significantly better for most tasks.

---

## 20. Learning Roadmap

### Week 1: Foundation

- [ ] Install OpenClaw (`npm install -g openclaw`)
- [ ] Run `openclaw onboard --install-daemon`
- [ ] Set up Anthropic API key
- [ ] Create SOUL.md, USER.md, AGENTS.md (copy from `examples/`)
- [ ] Connect Telegram channel
- [ ] Install `second-brain` and `web-search` skills
- [ ] Send 20+ messages to teach it about you
- [ ] Run `openclaw doctor` daily

### Week 2: Productivity

- [ ] Connect WhatsApp channel
- [ ] Install `google-calendar`, `gmail`, `todoist` skills
- [ ] Set up HEARTBEAT.md with morning briefing
- [ ] Enable `session-memory` hook
- [ ] Start using "remember this" and "note:" patterns
- [ ] Install `proactive-agent` for scheduled check-ins
- [ ] Refine SOUL.md based on first week's interactions

### Week 3: Customization

- [ ] Build your first custom skill (see `examples/skills/quick-capture/`)
- [ ] Install dev tools: `git-automation`, `vercel-deploy`
- [ ] Set up cron jobs for deployment monitoring
- [ ] Experiment with sub-agents for parallel research
- [ ] Review and curate MEMORY.md

### Week 4: Advanced

- [ ] Build your first plugin (see `examples/plugins/morning-brief/`)
- [ ] Set up sandboxing for non-main sessions
- [ ] Configure context pruning and compaction
- [ ] Explore vector memory search optimization
- [ ] Consider multi-agent setup if needed

### Ongoing

- [ ] Curate MEMORY.md weekly — remove stale facts, add new patterns
- [ ] Review installed skills monthly — disable unused ones
- [ ] Update this guide every 3 days with new insights
- [ ] Check ClawHub for new skills that match your workflow

---

## Sources & Further Reading

- [OpenClaw GitHub](https://github.com/openclaw/openclaw) — Main repository
- [OpenClaw Official Docs](https://docs.openclaw.ai/) — Official documentation
- [OpenClaw Skills Docs](https://docs.openclaw.ai/tools/skills) — Skills reference
- [OpenClaw Plugin Docs](https://docs.openclaw.ai/tools/plugin) — Plugin reference
- [ClawHub Registry](https://clawhub.com) — Public skills marketplace
- [Awesome OpenClaw Skills](https://github.com/VoltAgent/awesome-openclaw-skills) — Curated skill list (5,400+)
- [OpenClaw Configuration Guide](https://www.getopenclaw.ai/how-to/openclaw-configuration-guide) — Full config reference
- [OpenClaw Mega Cheatsheet](https://moltfounders.com/openclaw-mega-cheatsheet) — CLI quick reference
- [SOUL.md Template](https://github.com/openclaw/openclaw/blob/main/docs/reference/templates/SOUL.md) — Official personality template
- [Making Your Agent Useful](https://amankhan1.substack.com/p/how-to-make-your-openclaw-agent-useful) — Practical setup guide
- [34 OpenClaw Use Cases](https://openclaw.rocks/blog/openclaw-use-cases) — Real-world examples
- [Second Brain Skill](https://playbooks.com/skills/openclaw/skills/second-brain) — Knowledge base skill
- [Personal Assistant Setup](https://docs.openclaw.ai/start/openclaw) — Getting started guide
- [WhatsApp Setup Guide](https://www.marktechpost.com/2026/02/14/getting-started-with-openclaw-and-connecting-it-with-whatsapp/) — WhatsApp connection tutorial
- [Channel Overview](https://learnopenclaw.com/channels/overview) — Channel comparison
- [DigitalOcean Skills Guide](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills) — Skills deep-dive
