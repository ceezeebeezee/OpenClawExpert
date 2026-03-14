# OpenClaw Expert Guide

> **Version**: 1.2 | **Created**: 2026-03-03 | **Updated**: 2026-03-14 | **Next update**: 2026-03-17
>
> Goal: Make you an OpenClaw expert. This is a living document — updated every 3 days with new
> insights, corrections, and advanced patterns as you learn.

---

## Table of Contents

1. [What Is OpenClaw?](#1-what-is-openclaw)
2. [System Architecture](#2-system-architecture)
3. [Architecture Deep-Dive: System Diagrams](#3-architecture-deep-dive-system-diagrams)
4. [Message Flow: End to End](#4-message-flow-end-to-end)
5. [The Gateway](#5-the-gateway)
6. [Channels](#6-channels)
7. [Workspace Files (.md files)](#7-workspace-files)
8. [The Memory System](#8-the-memory-system)
9. [Skills Framework](#9-skills-framework)
10. [Plugin System](#10-plugin-system)
11. [Configuration Deep-Dive (openclaw.json)](#11-configuration-deep-dive)
12. [Context Management & Compaction](#12-context-management--compaction)
13. [Security Model](#13-security-model)
14. [Multi-Agent Architecture](#14-multi-agent-architecture)
15. [Sub-Agents](#15-sub-agents)
16. [Hooks System](#16-hooks-system)
17. [Recommended Skills for Your Use Case](#17-recommended-skills)
18. [Plugin Ideas for Your Workflow](#18-plugin-ideas)
19. [Real-World Workflows: Email, Scheduling & Admin](#19-real-world-workflows)
20. [CLI Command Reference](#20-cli-command-reference)
21. [Troubleshooting](#21-troubleshooting)
22. [Cost & Infrastructure](#22-cost--infrastructure)
23. [Learning Roadmap](#23-learning-roadmap)

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

### Latest Releases (as of March 2026)

| Release | Date | Highlights |
|---------|------|------------|
| **v2026.3.12** | Mar 12 | Shared `/fast` mode, first-class Ollama onboarding, resumable ACP sessions, Dashboard v2 (modular views, command palette, mobile tabs), browser origin validation security fix |
| **v2026.3.7** | Mar 7 | **ContextEngine Plugin System** (pluggable context management), durable ACP bindings (survive restarts), model resilience (auto-fallback chains), scoped subagent runtime, 200+ bug fixes |
| **v2026.2.21** | Feb 21 | Gemini 3.1 Pro Preview support |
| **v2026.2.17** | Feb 17 | Deterministic sub-agent spawning, structured inter-agent communication |
| **v2026.2.14-15** | Feb | 50+ security hardening measures, exec approval fixes |
| **v2026.2.12** | Feb 12 | 40 security fixes, per-channel model control |

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

## 3. Architecture Deep-Dive: System Diagrams

This section provides detailed visual maps of how OpenClaw's subsystems connect and interact.
Use these diagrams as reference when configuring your agent.

### 3.1 Full System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YOUR MACHINE (macOS / Linux)                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         GATEWAY (Node.js 22+)                       │    │
│  │                         Port 18789 (WebSocket)                      │    │
│  │                                                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │    │
│  │  │ AUTH LAYER   │  │ RPC SERVER   │  │ CONTROL UI (WebChat)   │   │    │
│  │  │ token/pass/  │  │ WebSocket    │  │ Built-in web panel     │   │    │
│  │  │ trusted-proxy│  │ + CLI bridge │  │ for testing & debug    │   │    │
│  │  └──────┬───────┘  └──────────────┘  └────────────────────────┘   │    │
│  │         │                                                          │    │
│  │  ┌──────▼────────────────────────────────────────────────────┐    │    │
│  │  │                    SESSION MANAGER                         │    │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │    │
│  │  │  │Session A│ │Session B│ │Session C│ │Session D│  ...   │    │    │
│  │  │  │(Telegram│ │(WhatsApp│ │(Telegram│ │Heartbeat│       │    │    │
│  │  │  │ DM:you) │ │ DM:you) │ │ Group)  │ │(internal│       │    │    │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │    │    │
│  │  │       └────────────┴──────────┴────────────┘             │    │    │
│  │  └──────────────────────────┬────────────────────────────────┘    │    │
│  │                             │                                     │    │
│  │  ┌──────────────────────────▼────────────────────────────────┐   │    │
│  │  │                  CONTEXT ASSEMBLER                         │   │    │
│  │  │                                                           │   │    │
│  │  │   Workspace Files     Skills         Memory    History    │   │    │
│  │  │   ┌────────────┐   ┌──────────┐   ┌────────┐ ┌───────┐  │   │    │
│  │  │   │ SOUL.md    │   │SKILL.md  │   │MEMORY  │ │Session│  │   │    │
│  │  │   │ AGENTS.md  │   │SKILL.md  │   │.md     │ │.jsonl │  │   │    │
│  │  │   │ USER.md    │   │SKILL.md  │   │daily/  │ │       │  │   │    │
│  │  │   │ TOOLS.md   │   │  ...     │   │vector  │ │       │  │   │    │
│  │  │   │ HEARTBEAT  │   │(gated)   │   │index   │ │       │  │   │    │
│  │  │   └────────────┘   └──────────┘   └────────┘ └───────┘  │   │    │
│  │  └──────────────────────────┬────────────────────────────────┘   │    │
│  │                             │                                     │    │
│  │  ┌──────────────────────────▼────────────────────────────────┐   │    │
│  │  │                     LLM ROUTER                             │   │    │
│  │  │   Primary Model ──▶ Fallback Model ──▶ Error               │   │    │
│  │  │   (Sonnet 4.6)      (Haiku 4.5)       (retry/fail)        │   │    │
│  │  └──────────────────────────┬────────────────────────────────┘   │    │
│  │                             │                                     │    │
│  │  ┌──────────────────────────▼────────────────────────────────┐   │    │
│  │  │                   TOOL EXECUTOR                            │   │    │
│  │  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │   │    │
│  │  │   │ Shell    │ │ Browser  │ │ File Ops │ │ Memory     │  │   │    │
│  │  │   │ (exec)   │ │(Playwright│ │(read/    │ │ (search/   │  │   │    │
│  │  │   │          │ │ /CDP)    │ │ write)   │ │  get/store) │  │   │    │
│  │  │   └──────────┘ └──────────┘ └──────────┘ └────────────┘  │   │    │
│  │  │   ┌──────────────────────────────────────────────────────┐│   │    │
│  │  │   │ APPROVAL LAYER (HITL)                                ││   │    │
│  │  │   │ deny → ask → allow  (per-tool configurable)          ││   │    │
│  │  │   └──────────────────────────────────────────────────────┘│   │    │
│  │  └───────────────────────────────────────────────────────────┘   │    │
│  │                                                                   │    │
│  │  ┌───────────────────────────────────────────────────────────┐   │    │
│  │  │                   SCHEDULERS                               │   │    │
│  │  │   ┌───────────────┐  ┌────────────────────────────────┐   │   │    │
│  │  │   │  HEARTBEAT    │  │  CRON ENGINE                    │   │   │    │
│  │  │   │  every: 30m   │  │  ┌─────────────────────────┐   │   │   │    │
│  │  │   │  activeHours: │  │  │ morning-brief  0 7 * * *│   │   │   │    │
│  │  │   │  07:00-23:00  │  │  │ email-triage  */30 * * *│   │   │   │    │
│  │  │   │  model: haiku │  │  │ crm-sync      0 22 * * *│   │   │   │    │
│  │  │   │  target: last │  │  │ eod-summary   0 18 * * *│   │   │   │    │
│  │  │   └───────────────┘  │  └─────────────────────────┘   │   │   │    │
│  │  │                      └────────────────────────────────┘   │   │    │
│  │  └───────────────────────────────────────────────────────────┘   │    │
│  │                                                                   │    │
│  │  ┌───────────────────────────────────────────────────────────┐   │    │
│  │  │                   PLUGIN RUNTIME                           │   │    │
│  │  │   Runs in-process │ TypeScript modules │ Full Gateway API  │   │    │
│  │  │   registerTool() │ registerCommand() │ registerHook()     │   │    │
│  │  └───────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      CHANNEL ADAPTERS                               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │    │
│  │  │ Telegram │ │ WhatsApp │ │ iMessage │ │  Slack   │ │ Discord  │ │    │
│  │  │ Bot API  │ │ Baileys  │ │AppleScript│ │Socket   │ │WebSocket │ │    │
│  │  │          │ │ QR Auth  │ │(macOS)   │ │Mode     │ │          │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      WORKSPACE (Filesystem)                         │    │
│  │  ~/.openclaw/                                                       │    │
│  │  ├── openclaw.json          # Main config (JSON5)                   │    │
│  │  ├── .env                   # API keys & secrets                    │    │
│  │  ├── credentials/           # Channel auth (WhatsApp QR, etc.)     │    │
│  │  ├── workspace/             # Default agent workspace               │    │
│  │  │   ├── SOUL.md            # Personality                           │    │
│  │  │   ├── AGENTS.md          # Operating rules                       │    │
│  │  │   ├── USER.md            # Your profile                          │    │
│  │  │   ├── MEMORY.md          # Curated long-term memory              │    │
│  │  │   ├── HEARTBEAT.md       # Periodic check-in script              │    │
│  │  │   ├── TOOLS.md           # Tool documentation                    │    │
│  │  │   ├── BOOT.md            # Startup procedures                    │    │
│  │  │   ├── IDENTITY.md        # Agent name/emoji/theme                │    │
│  │  │   ├── MESSAGING.md       # Outbound routing rules                │    │
│  │  │   ├── skills/            # Workspace-level skills (highest prio) │    │
│  │  │   └── memory/            # Daily logs (YYYY-MM-DD.md)            │    │
│  │  ├── skills/                # Managed skills (clawhub installs)     │    │
│  │  ├── extensions/            # Local plugins                          │    │
│  │  ├── agents/<id>/           # Multi-agent state                      │    │
│  │  └── memory/<id>.sqlite     # Vector search index                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      LLM PROVIDERS (External APIs)                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │    │
│  │  │ Anthropic│ │ OpenAI   │ │ Google   │ │ Ollama   │              │    │
│  │  │ Claude   │ │ GPT      │ │ Gemini   │ │ (Local)  │              │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Request Processing Pipeline

This diagram shows exactly what happens inside the Gateway for every inbound message:

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    INBOUND MESSAGE PIPELINE                       │
  └──────────────────────────────────────────────────────────────────┘

  User sends message via Telegram/WhatsApp/etc.
       │
       ▼
  ┌─────────────────────┐
  │ 1. CHANNEL ADAPTER   │ Protocol-specific message parsing
  │    Telegram Bot API  │ (text, media, voice → normalized format)
  │    / Baileys / etc.  │
  └──────────┬──────────┘
             │
       ┌─────▼─────┐
       │ 2. ACCESS  │ Check: channels.*.allowFrom
       │   CONTROL  │ Check: dmPolicy (pairing/allowlist/open)
       │            │ Check: groupPolicy (mention required?)
       └──────┬─────┘
              │ ✓ Authorized
       ┌──────▼──────┐
       │ 3. SESSION   │ Lookup/create session by sender ID
       │   RESOLVE    │ Scope: per-peer / per-channel-peer
       │              │ Load: sessions.jsonl (conversation history)
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 4. CONTEXT   │ Assemble LLM system prompt:
       │   ASSEMBLY   │
       │  ┌──────────────────────────────────────────┐
       │  │  [System preamble]                        │
       │  │  [SOUL.md]          ← personality          │
       │  │  [AGENTS.md]        ← rules                │
       │  │  [USER.md]          ← your profile          │
       │  │  [TOOLS.md]         ← tool docs             │
       │  │  [MEMORY.md]        ← curated facts         │
       │  │  [Recent daily logs] ← short-term memory    │
       │  │  [Eligible SKILL.md files] ← gated skills   │
       │  │  [Session history]  ← conversation so far   │
       │  │  [Your message]     ← the new input         │
       │  └──────────────────────────────────────────┘
       └──────┬──────┘
              │
       ┌──────▼──────┐          ┌─────────────────┐
       │ 5. LLM      │ ◀───────│ Prompt Caching   │
       │   INFERENCE  │         │ (cacheControlTtl)│
       │              │         └─────────────────┘
       │   Reason about request
       │   Select tools/skills
       │   Plan response
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 6. TOOL      │ For each tool call:
       │   EXECUTION  │  ├── Check approval policy (deny/ask/allow)
       │              │  ├── If ask → send approval request to user
       │              │  ├── Execute tool (shell/browser/file/memory)
       │              │  └── Return result to LLM
       │              │
       │   (May loop back to step 5 for multi-turn tool use)
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 7. RESPONSE  │ Format for channel constraints:
       │   DELIVERY   │  ├── Telegram: Markdown, chunked messages
       │              │  ├── WhatsApp: Plain text, mobile-optimized
       │              │  └── Slack: Threaded, formatted
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 8. SESSION   │ Append turn to sessions.jsonl
       │   PERSIST    │ Trigger memory hooks if applicable
       │              │ Check context size → compaction if needed
       └─────────────┘
```

### 3.3 Memory System Architecture

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    MEMORY ARCHITECTURE                            │
  └──────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ TIER 1: DAILY LOGS (Short-term, append-only)                   │
  │                                                                 │
  │   memory/                                                       │
  │   ├── 2026-03-12.md   ← yesterday (loaded at session start)   │
  │   ├── 2026-03-13.md   ← today (loaded + actively written to)  │
  │   └── 2026-03-14.md   ← created when new entries arrive       │
  │                                                                 │
  │   Written by: agent during conversation                         │
  │   Loaded: today + yesterday at session start                    │
  │   Flushed: auto-flush before compaction                         │
  │   Format: timestamped markdown entries                          │
  │                                                                 │
  │   Hook: "session-memory" saves context on /new command          │
  └───────────────────────────────────────────────────────────────┘
                              │
                    (curate durable facts)
                              │
  ┌───────────────────────────▼───────────────────────────────────┐
  │ TIER 2: CURATED MEMORY (Long-term, human + agent maintained)   │
  │                                                                 │
  │   MEMORY.md                                                     │
  │                                                                 │
  │   Written by: agent (DM only) or you (manually)                │
  │   Loaded: every non-heartbeat session                           │
  │   Content: key preferences, project details, recurring patterns │
  │   Rule: quality over quantity — every line costs tokens          │
  └───────────────────────────────────────────────────────────────┘
                              │
                      (embedded as vectors)
                              │
  ┌───────────────────────────▼───────────────────────────────────┐
  │ TIER 3: VECTOR INDEX (Semantic search)                          │
  │                                                                 │
  │   ~/.openclaw/memory/<agentId>.sqlite                           │
  │                                                                 │
  │   Agent tools:                                                   │
  │   ├── memory_search — hybrid retrieval                          │
  │   │   ├── 70% vector similarity (cosine)                        │
  │   │   ├── 30% BM25 keyword matching                             │
  │   │   ├── Optional: MMR (reduce redundant results)              │
  │   │   └── Optional: temporal decay (recent > old)               │
  │   └── memory_get — targeted file reads (graceful degradation)   │
  │                                                                 │
  │   Embedding providers (auto-selected):                           │
  │   local GGUF → OpenAI → Gemini → Voyage → Mistral → Ollama    │
  │                                                                 │
  │   Experimental: QMD sidecar (BM25 + vectors + reranking)       │
  └───────────────────────────────────────────────────────────────┘
```

### 3.4 Security Layers

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    SECURITY ARCHITECTURE                          │
  └──────────────────────────────────────────────────────────────────┘

  INBOUND MESSAGE
       │
       ▼
  ╔═══════════════════════════════════════════════╗
  ║  LAYER 1: NETWORK BINDING                     ║
  ║  gateway.bind: "loopback" (default)            ║
  ║  ├── loopback: localhost only                  ║
  ║  ├── lan: local network (requires auth)        ║
  ║  ├── tailnet: Tailscale peers only             ║
  ║  └── custom: explicit IP binding               ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 2: GATEWAY AUTH                         ║
  ║  gateway.auth.mode                             ║
  ║  ├── token: bearer token (recommended)         ║
  ║  ├── password: password-based                  ║
  ║  └── trusted-proxy: reverse proxy identity     ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 3: CHANNEL ACCESS CONTROL               ║
  ║  channels.*.dmPolicy                           ║
  ║  ├── pairing: time-limited codes (1hr expiry)  ║
  ║  ├── allowlist: explicit sender IDs only        ║
  ║  ├── open: public (requires "*" opt-in)         ║
  ║  └── disabled: reject all DMs                  ║
  ║                                                ║
  ║  channels.*.groupPolicy                        ║
  ║  ├── mention: only respond when @mentioned     ║
  ║  └── allowlist per group                       ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 4: SESSION ISOLATION                    ║
  ║  session.dmScope                               ║
  ║  ├── per-peer: one session per sender           ║
  ║  ├── per-channel-peer: per sender+channel       ║
  ║  └── per-account-channel-peer: full isolation   ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 5: TOOL POLICY                          ║
  ║  tools.profile + allow/deny                    ║
  ║  ├── minimal: messaging only                   ║
  ║  ├── messaging: chat + provider tools           ║
  ║  ├── full: all tools available                  ║
  ║  ├── Deny groups: group:automation,             ║
  ║  │   group:runtime, group:fs                    ║
  ║  └── Per-tool: deny specific tools              ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 6: EXEC APPROVAL (HITL)                 ║
  ║  tools.exec.security                           ║
  ║  ├── deny: block all shell execution            ║
  ║  ├── ask: require approval per command           ║
  ║  └── allow: auto-approve (dangerous)            ║
  ╠═══════════════════════════════════════════════╣
  ║  LAYER 7: SANDBOXING                           ║
  ║  sandbox.mode                                  ║
  ║  ├── workspaceAccess: none / ro / rw            ║
  ║  └── scope: agent / session / shared            ║
  ╚═══════════════════════════════════════════════╝
```

### 3.5 Skill Loading Pipeline

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    SKILL LOADING PIPELINE                         │
  └──────────────────────────────────────────────────────────────────┘

  Gateway starts / new session begins / skill watcher fires
       │
       ▼
  ┌─────────────────────┐
  │ 1. SCAN DIRECTORIES  │
  │                      │
  │ Priority order:       │
  │ ┌──────────────────┐ │
  │ │ 3. Workspace     │ │ ← <workspace>/skills/ (highest)
  │ │ 2. Managed/Local │ │ ← ~/.openclaw/skills/ (clawhub installs)
  │ │ 1. Bundled       │ │ ← shipped with OpenClaw (lowest)
  │ └──────────────────┘ │
  │ + Plugin-provided    │ ← via openclaw.plugin.json
  │ + extraDirs          │ ← skills.load.extraDirs
  └──────────┬──────────┘
             │ Found SKILL.md files
       ┌─────▼──────┐
       │ 2. PARSE    │ Read YAML frontmatter
       │   METADATA  │ Extract: name, description, user-invocable,
       │             │   disable-model-invocation, metadata.openclaw
       └──────┬─────┘
              │
       ┌──────▼──────┐
       │ 3. GATING    │ For each skill, check:
       │   CHECK      │
       │  ┌────────────────────────────────────────┐
       │  │ metadata.openclaw.always = true?        │──▶ SKIP gates
       │  │ metadata.openclaw.os matches platform?  │
       │  │ metadata.openclaw.requires.bins exist?  │
       │  │ metadata.openclaw.requires.anyBins?     │
       │  │ metadata.openclaw.requires.env set?     │
       │  │ metadata.openclaw.requires.config set?  │
       │  │ skills.entries.<name>.enabled = true?    │
       │  └────────────────────────────────────────┘
       └──────┬──────┘
              │ Passed gates
       ┌──────▼──────┐
       │ 4. NAME      │ Higher-precedence skill overrides lower
       │   CONFLICT   │ on name collision. Log warning.
       │   RESOLVE    │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 5. ENV       │ Inject skills.entries.<name>.env
       │   INJECT     │ Inject skills.entries.<name>.apiKey → process.env
       │              │ Scoped to agent run (restored after)
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 6. SNAPSHOT  │ Cache eligible skill list for this session
       │   + PROMPT   │ Inject XML skill list into system prompt
       │   INJECT     │ Cost: ~195 bytes base + ~97 bytes per skill
       │              │ (~24 tokens per skill)
       └─────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ LIVE RELOAD (optional)                                      │
  │ skills.load.watch: true                                     │
  │ watchDebounceMs: configurable                               │
  │ Fires mid-session when SKILL.md files change on disk        │
  └─────────────────────────────────────────────────────────────┘
```

### 3.6 Heartbeat & Cron Execution Flow

```
  ┌──────────────────────────────────────────────────────────────────┐
  │              PROACTIVE EXECUTION: HEARTBEAT vs CRON              │
  └──────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────┐    ┌──────────────────────────────┐
  │        HEARTBEAT             │    │         CRON ENGINE           │
  │                              │    │                               │
  │ Trigger: timer (every: 30m)  │    │ Trigger: system crontab       │
  │ Active hours: 07:00-23:00    │    │ No active-hours restriction   │
  │ Model: Haiku (cheap)         │    │ Model: configurable per job   │
  │ Session: reuses last active  │    │ Session: --session isolated   │
  │ Prompt: "Read HEARTBEAT.md"  │    │ Prompt: --message "..."       │
  │ Response: HEARTBEAT_OK       │    │ Response: full agent turn      │
  │   (suppressed if ≤300 chars) │    │                               │
  │                              │    │ Jobs:                          │
  │ Cost: ~$0.15/month (Haiku)   │    │ ├── morning-brief  (0 7 * *) │
  │                              │    │ ├── email-triage  (*/30 * *)  │
  │ Config in openclaw.json:     │    │ ├── crm-sync      (0 22 * *) │
  │   heartbeat.every            │    │ └── eod-summary   (0 18 * *) │
  │   heartbeat.activeHours      │    │                               │
  │   heartbeat.target           │    │ Managed via CLI:              │
  │   heartbeat.model            │    │   openclaw cron add/remove    │
  │   heartbeat.lightContext     │    │   openclaw cron list          │
  └──────────────┬───────────────┘    └──────────────┬───────────────┘
                 │                                    │
                 └──────────┬─────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   Same request pipeline   │
              │   (Context Assembly →     │
              │    LLM → Tool Exec →     │
              │    Response Delivery)     │
              └──────────────────────────┘
```

### 3.7 Plugin Lifecycle

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    PLUGIN LIFECYCLE                                │
  └──────────────────────────────────────────────────────────────────┘

  Gateway startup
       │
       ▼
  ┌─────────────────────┐
  │ 1. DISCOVER          │ Scan in order:
  │                      │ ├── plugins.load.paths (explicit)
  │                      │ ├── <workspace>/.openclaw/extensions/
  │                      │ ├── ~/.openclaw/extensions/
  │                      │ └── Bundled (disabled by default)
  └──────────┬──────────┘
             │
       ┌─────▼──────┐
       │ 2. FILTER   │ Check plugins.allow / plugins.deny lists
       │             │ Check plugins.entries.<id>.enabled
       └──────┬─────┘
              │ Allowed
       ┌──────▼──────┐
       │ 3. LOAD      │ Read openclaw.plugin.json (manifest)
       │   MANIFEST   │ Validate configSchema
       │              │ Apply plugins.entries.<id>.config
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 4. EXECUTE   │ Import and run index.ts
       │   ENTRY PT   │ Plugin registers capabilities:
       │              │
       │  ┌────────────────────────────────────┐
       │  │ api.registerTool()     → LLM tools  │
       │  │ api.registerCommand()  → /commands   │
       │  │ api.registerService()  → background  │
       │  │ api.registerHook()     → event hooks │
       │  │ api.registerGatewayMethod() → RPC    │
       │  │ api.registerCli()      → CLI cmds    │
       │  │ api.registerChannel()  → custom ch.  │
       │  │ api.registerProvider() → LLM auth    │
       │  │ skills/ directory      → skills      │
       │  └────────────────────────────────────┘
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ 5. RUNNING   │ Plugin runs in-process with Gateway
       │              │ Full access to Gateway internals
       │              │ Services start, hooks listen
       └──────┬──────┘
              │ Gateway shutdown
       ┌──────▼──────┐
       │ 6. CLEANUP   │ Services stopped
       │              │ Hooks unregistered
       └─────────────┘
```

> **Insight**: These diagrams map directly to configuration. When something isn't working, trace
> the flow through the relevant diagram to find which layer is misconfigured. For example: agent
> not responding? Start at Layer 1 (binding), then Layer 2 (auth), then Layer 3 (channel access).
> Skill not loading? Walk through the Skill Loading Pipeline — is it gated out by a missing binary?

---

## 4. Message Flow: End to End

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

## 5. The Gateway

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

## 6. Channels

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

## 7. Workspace Files

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

## 8. The Memory System

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
- **Providers**: Auto-selects: local GGUF model → OpenAI → Gemini → Voyage → Mistral → Ollama

```bash
# Manage the vector index
openclaw memory status                  # Check index health
openclaw memory index --all             # Reindex everything
openclaw memory search "project deploy" # Test semantic search
```

### Agent Memory Tools

Two built-in tools power memory operations:

| Tool | Purpose |
|------|---------|
| `memory_search` | Semantic recall — hybrid vector + BM25 retrieval over indexed workspace |
| `memory_get` | Targeted file reads with graceful degradation (returns empty, never errors) |

### Advanced Search Configuration

Optional post-processing under `memorySearch.query.hybrid`:

- **MMR (Maximal Marginal Relevance)**: Reduces redundant results by balancing relevance
  with diversity. Disabled by default.
- **Temporal decay**: Recent memories rank higher than old ones. Evergreen files like
  `MEMORY.md` never decay. Disabled by default.

### Automatic Memory Flush

Before context compaction occurs, OpenClaw triggers a **silent memory flush** — a hidden
agentic turn that reminds the model to write lasting information to disk before the context
is summarized. Controlled by `agents.defaults.compaction.memoryFlush`. The user sees nothing
(receives `NO_REPLY`).

### Embedding Providers

Auto-selected based on available credentials (priority order):
1. Local GGUF model (via `node-llama-cpp`) — zero cost, requires RAM
2. OpenAI embeddings — fast, reliable
3. Google Gemini embeddings
4. Voyage AI
5. Mistral
6. Ollama (local)

**Experimental**: QMD sidecar — a local-first backend combining BM25 + vectors + reranking.

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

## 9. Skills Framework

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

## 10. Plugin System

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

### ContextEngine Plugin System (v2026.3.7+)

The ContextEngine is a major plugin capability introduced in March 2026. It provides a
**pluggable slot** for managing how conversation context is assembled, compressed, and
shared with sub-agents.

**7 lifecycle hooks:**

| Hook | Phase | Purpose |
|------|-------|---------|
| `bootstrap` | Init | Initialize context engine state |
| `ingest` | Input | Inject new information into context |
| `assemble` | Build | Construct the final prompt context |
| `compact` | Compress | Summarize/trim context when window fills |
| `afterTurn` | Post-turn | Post-processing after each conversation turn |
| `prepareSubagentSpawn` | Sub-agent | Prepare context before spawning sub-agent |
| `onSubagentEnded` | Sub-agent | Handle context when sub-agent completes |

**Registration:**
```typescript
api.registerContextEngine("my-context-engine", (config) => ({
  bootstrap: async (ctx) => { /* initialize */ },
  assemble: async (ctx) => { /* build system prompt */ },
  compact: async (ctx) => { /* summarize old context */ },
  // ... other hooks
}));
```

The default `LegacyContextEngine` wrapper preserves existing compaction behavior when no
custom context engine is configured — zero behavior change on upgrade.

**Notable community plugin**: `lossless-claw` provides alternative context management
without modifying core compaction logic.

### See `examples/plugins/morning-brief/` for a complete plugin scaffold.

---

## 11. Configuration Deep-Dive

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

## 12. Context Management & Compaction

As conversations grow, context management prevents token overflow and keeps costs down.

### How Compaction Works

Compaction **summarizes older conversation history** into a compact entry while preserving
recent messages. The summary persists in the session's JSONL file for future use.

```
  Session grows beyond context window
       │
       ▼
  ┌─────────────────────┐
  │ 1. MEMORY FLUSH     │  Silent agentic turn — saves durable facts to disk
  │    (automatic)       │  before the old context is lost. User sees nothing.
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ 2. SUMMARIZE        │  Older turns → compact summary
  │    Keeps recent msgs │  Can use a different model for summarization
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ 3. RETRY            │  Original request retried with compacted context
  └─────────────────────┘
```

### Triggers

- **Auto-compaction** (default): Activates when sessions approach or exceed the model's
  context window limit. OpenClaw retries the original request with compacted context.
- **Manual**: Run `/compact` in chat, optionally with instructions about what to preserve.

### Configuration

```json5
compaction: {
  mode: "safeguard",           // "safeguard" (conservative) or "aggressive"
  // model: "anthropic/claude-haiku-4-5",  // Optional: use cheaper model for summaries
  memoryFlush: true,           // Flush durable notes before compacting (recommended)
  identifierPolicy: "strict"   // "strict" (preserve IDs) | "off" | "custom"
  // identifierInstructions: "..." // Custom instructions when policy is "custom"
}
```

### Compaction vs. Pruning

| | Compaction | Pruning |
|---|-----------|---------|
| **What** | Summarizes old turns | Trims old tool results |
| **Persistence** | Persists in JSONL | In-memory only |
| **Scope** | Entire conversation history | Tool result payloads |

### Context Pruning

Separate from compaction, pruning trims tool result payloads from older turns:

```json5
contextPruning: {
  mode: "cache-ttl"            // "cache-ttl" | "sliding" | "none"
}
```

- `cache-ttl`: Uses prompt caching TTL to determine when to prune (recommended)
- `sliding`: Aggressively trims as context grows
- `none`: No pruning (uses more tokens)

> **Insight**: Enable both compaction and pruning. Use `mode: "safeguard"` compaction with
> `memoryFlush: true` so durable facts survive compaction. Use `cache-ttl` pruning to benefit
> from prompt caching while keeping token costs manageable.

---

## 13. Security Model

OpenClaw runs on YOUR machine with YOUR privileges. This means it can do anything you can do.
Security is not optional. OpenClaw operates on a **personal assistant trust model** — one trusted
operator per gateway. It explicitly rejects hostile multi-tenant isolation on shared infrastructure.

> See [Section 3.4: Security Layers diagram](#34-security-layers) for a visual overview.

### Trust Model

**Key principle**: If someone can modify Gateway host state (`~/.openclaw/`, `openclaw.json`),
they are a trusted operator. Session identifiers are routing selectors, not authorization
boundaries. If you need adversarial-user isolation, use separate gateways on separate OS users/hosts.

### Gateway Authentication

Three modes protect the Gateway control plane:

| Mode | Config | Best For |
|------|--------|----------|
| **Token** (recommended) | `gateway.auth.mode: "token"` | Solo use, simple setup |
| **Password** | `gateway.auth.mode: "password"` | Shared access with rotating creds |
| **Trusted-proxy** | `gateway.auth.mode: "trusted-proxy"` | Behind reverse proxy (Caddy/nginx) |

```json5
// Token mode (recommended)
gateway: {
  auth: {
    mode: "token",
    token: "${OPENCLAW_TOKEN}"   // Long random string, set in .env
  }
}
```

For Tailscale Serve deployments, `gateway.auth.allowTailscale` accepts identity headers. **Never**
forward these from custom reverse proxies.

### 10 Essential Controls

| # | Control | How | Why |
|---|---------|-----|-----|
| 1 | **Loopback binding** | `gateway.bind: "loopback"` | Prevents network access to gateway |
| 2 | **Auth token** | `gateway.auth.token` | Authenticates all Gateway API calls |
| 3 | **Channel allowlists** | `channels.*.allowFrom` | Only your accounts can talk to the agent |
| 4 | **File permissions** | `chmod 600 ~/.openclaw/.env` | Protects secrets from other users |
| 5 | **Pairing mode** | `dmPolicy: "pairing"` | Require explicit handshake for new senders |
| 6 | **HITL for destructive ops** | `tools.exec.security: "ask"` | Human confirms before `rm`, `sudo`, etc. |
| 7 | **Sandboxing** | `sandbox.mode: "non-main"` | Isolate untrusted sessions in containers |
| 8 | **Skill review** | Read before installing | Third-party skills are untrusted code |
| 9 | **Plugin allowlists** | `plugins.allow: [...]` | Only load approved plugins |
| 10 | **Spending limits** | API provider settings | $5-10/day cap prevents runaway costs |

### Tool Policy Framework

Fine-grained control over what the agent can do:

**Profiles** (baseline):
- `minimal` — messaging only, no automation/runtime/filesystem
- `messaging` — chat + basic provider tools
- `full` — all tools available

**Allow/Deny lists** (fine-tuning):
```json5
tools: {
  profile: "messaging",                        // Baseline
  deny: ["gateway", "cron", "sessions_spawn",  // Block dangerous tools
         "sessions_send"],
  // deny: ["group:automation"],               // Or deny entire groups
  // deny: ["group:runtime"],                  // group:runtime = exec, process, docker
  // deny: ["group:fs"],                       // group:fs = read, write, edit, apply_patch
}
```

**Exec approval workflow** (shell commands):
```json5
tools: {
  exec: {
    security: "ask",       // "deny" | "ask" | "allow"
    // Approvals bind to exact request context — they don't carry over
  }
}
```

**Dangerous control-plane tools** to deny for untrusted surfaces:
- `gateway` — can invoke `config.apply`, `config.patch`, `update.run`
- `cron` — creates persistent scheduled jobs beyond the current session

### Sandboxing

Two complementary approaches:

**Container-level**: Run the entire Gateway in Docker (boundary between process and host).

**Tool-level**: Individual tool execution in isolated containers:
```json5
sandbox: {
  mode: "non-main",          // Sandbox non-main sessions
  scope: "session",          // "agent" | "session" | "shared"
  workspaceAccess: "ro"      // "none" (default) | "ro" | "rw"
}
```

**Critical caveat**: If sandbox mode is off, exec runs on the gateway host directly, and host exec
does not require approvals unless you explicitly set `host=gateway`.

### Threat Vectors

1. **Prompt injection**: Someone sends your agent a message with hidden instructions.
   Mitigation: Channel allowlists + pairing mode
2. **Malicious skills**: A ClawHub skill contains harmful instructions.
   Mitigation: Always review source code before installing
3. **Credential leakage**: Agent includes API keys in responses.
   Mitigation: SOUL.md boundary rules + skill-level restrictions + outbound-guard skill
4. **Privilege escalation**: Agent runs destructive shell commands.
   Mitigation: `tools.exec.security: "ask"` + sandboxing
5. **Network exfiltration**: Agent sends data to external endpoints.
   Mitigation: Firewall rules + outbound connection monitoring
6. **Browser profile exposure**: Agent inherits capabilities of its browser profile.
   Mitigation: Use a dedicated `openclaw` browser profile, never your personal one.

### Security Audit Command

```bash
openclaw security audit              # Quick check
openclaw security audit --deep       # Full validation
openclaw security audit --fix        # Auto-fix what it can
openclaw security audit --json       # Machine-readable output
```

The audit checks: inbound access policies, tool blast radius, network exposure, browser control,
local disk permissions, plugin allowlists, policy drift, and model hygiene.

**Critical findings to watch for:**

| Finding | Severity | Fix |
|---------|----------|-----|
| `fs.state_dir.perms_world_writable` | Critical | `chmod 700 ~/.openclaw` |
| `gateway.bind_no_auth` | Critical | Add `gateway.auth.*` |
| `gateway.tailscale_funnel` | Critical | Disable public Funnel |
| `open_groups_with_elevated` | Critical | Remove tool allow-all + elevated combo |

### Hardened Baseline Configuration

Recommended starting point for maximum security:

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs",
            "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
    telegram: { dmPolicy: "pairing", groupPolicy: "mention" },
  },
}
```

Start here, then progressively enable capabilities as you build trust with the agent.

### Incident Response

If you suspect compromise:

**1. Contain**: Stop the Gateway immediately. Set `bind: "loopback"`, disable Tailscale.

**2. Rotate credentials**:
- Gateway auth token (`gateway.auth.token`)
- Channel credentials (WhatsApp, Telegram, Slack tokens)
- Model API keys in `auth-profiles.json`

**3. Audit**:
- Review logs at `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- Inspect session transcripts (`~/.openclaw/agents/<id>/sessions/*.jsonl`)
- Run `openclaw security audit --deep`

> **Insight**: The biggest risk isn't hackers — it's the agent doing something you didn't expect.
> A well-meaning "clean up old files" command could delete important data. Always have HITL
> approval enabled for shell execution and file deletion. Start with read-only tools and
> gradually expand permissions.

---

## 14. Multi-Agent Architecture

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

### Agent Isolation

Each agent operates as a **fully scoped brain**:
- **Own workspace**: SOUL.md, AGENTS.md, USER.md, persona rules
- **Own state**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Own sessions**: `~/.openclaw/agents/<agentId>/sessions/*.jsonl`
- Credentials are **not shared** between agents

### Routing Precedence

When a message arrives, OpenClaw determines which agent handles it (most specific wins):

```
1. Direct peer match         ← Highest priority
2. Parent peer inheritance
3. guildId + role (Discord)
4. guildId / teamId
5. accountId
6. channel-wide fallback
7. default agent             ← Lowest priority
```

### Inter-Agent Communication (ACP)

Agent-to-agent messaging is **disabled by default**. Enable explicitly:

```json5
tools: {
  agentToAgent: {
    enabled: true,
    allow: ["home", "work"]   // Restrict which agents can communicate
  }
}
```

Communication mechanisms:
- **Webhooks**: One agent invokes a webhook routed to another's session
- **Shared channels**: A designated channel both agents subscribe to
- **ACP (Agent Communication Protocol)**: Structured inter-agent task triggering,
  context sharing, and result delivery

**ACP Durable Bindings** (v2026.3.7): Communication links now **survive Gateway restarts**.
Agents reconnect automatically and resume tasks. Thread bindings route messages in a
bound thread to the bound ACP session.

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

## 15. Sub-Agents

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

- Each sub-agent gets its own session key (`subagent:{depth}:{baseKey}`) + optional sandbox
- They run in parallel without blocking the main conversation
- Results are auto-announced when complete
- Auto-archived after 60 minutes of idle
- **Depth tracking** prevents infinite delegation loops (v2026.2.17+)
- **Scoped runtime** via `AsyncLocalStorage` for isolated plugin contexts (v2026.3.7+)

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

## 16. Hooks System

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

## 17. Recommended Skills for Your Use Case

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

## 18. Plugin Ideas for Your Workflow

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

## 19. Real-World Workflows: Email, Scheduling & Admin

This section bridges theory to practice. Below are three production-tested workflows — email
management, calendar scheduling, and personal admin — with the exact configurations, workspace
rules, and architectural patterns that make them work.

### 19.1 Email Management

#### The Skills Landscape

| Skill | Scope | Auth Method | Best For |
|-------|-------|-------------|----------|
| **gmail** | Read/send Gmail only | Google OAuth | Simple inbox triage |
| **gmail-inbox-zero-triage** | Interactive triage with Telegram buttons | Google OAuth | Batch processing 20 emails at a time |
| **gog** | Gmail + Calendar + Drive unified | OAuth via `gog` CLI | Full Google Workspace integration |
| **googleworkspace** | Full Google Workspace | Service account or OAuth | Enterprise multi-service |
| **email** (generic) | Any IMAP/SMTP provider | Himalaya CLI | Non-Gmail providers |

**Recommendation:** Start with `gmail` for basic triage. Graduate to `gog` when you need
email+calendar coordination in a single API call. Use `gmail-inbox-zero-triage` if you want
Telegram inline buttons for batch actions.

#### Integration Methods

**Method 1: Google OAuth (recommended)**
```bash
clawhub install gmail
openclaw skills auth gmail    # Opens browser for OAuth consent
```

**Method 2: gog CLI (most complete — Gmail + Calendar + Drive in one)**
```bash
brew install gog              # or: go install github.com/openclaw/gog@latest
gog auth login
clawhub install gog
```

**Method 3: Himalaya / IMAP+SMTP (non-Gmail providers)**
```bash
brew install himalaya
# Configure in ~/.config/himalaya/config.toml
clawhub install email
```

#### Email Triage Workflow

The most effective pattern is **cron-triggered batch triage**: the agent checks for new mail
on a schedule, categorizes messages, and presents actions for your approval.

```
┌──────────────────────────────────────────────────────────────┐
│                    EMAIL TRIAGE FLOW                          │
│                                                              │
│  ┌─────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │  CRON   │───▶│  Fetch 20    │───▶│  AI Categorize    │   │
│  │ (30min) │    │  Unread Msgs │    │  Each Message     │   │
│  └─────────┘    └──────────────┘    └────────┬──────────┘   │
│                                               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │   Build Summary     │   │
│                                    │   + Action Buttons  │   │
│                                    └──────────┬──────────┘   │
│                                               │              │
│                              ┌────────────────▼────────┐     │
│                              │  Send to Telegram DM    │     │
│                              │  with Inline Buttons:   │     │
│                              │  [Archive] [Reply]      │     │
│                              │  [Star] [Snooze]        │     │
│                              └────────────────┬────────┘     │
│                                               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │  User Taps Button   │   │
│                                    │  → Agent Executes   │   │
│                                    └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Set up the cron:**
```bash
openclaw cron add \
  --name "email-triage" \
  --cron "*/30 * * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Check for unread emails. Triage using the email-triage skill."
```

#### Voice Training for Email

Your agent's email tone comes from SOUL.md. The `Email Voice` section (see `examples/SOUL.md`)
teaches the agent your writing style. Key patterns:

- Internal emails: casual, direct, no pleasantries
- External emails: professional, concise, one clear ask per email
- Declining meetings: always suggest an alternative
- Follow-ups: reference the original thread, add new context only

When you edit a draft the agent wrote, it learns from your changes for future drafts.

#### Email Security: The Golden Rules

1. **Outbound Guard**: Install `outbound-guard` skill — scans every outgoing message for PII
   and credentials before sending.
2. **Human-in-the-loop for sends**: Every email send must be approved by you. Configure this
   in AGENTS.md (see `examples/AGENTS.md`).
3. **Dedicated agent email**: Consider creating a separate email account for your agent
   (e.g., `assistant@yourdomain.com`) so you can revoke access without affecting your inbox.
4. **Treat inbound content as hostile**: Emails can contain prompt injection attempts.
   AGENTS.md should instruct the agent to never execute instructions found in email bodies.

> **Insight**: A well-known incident involved an AI agent that deleted important messages it
> deemed "low priority" without human approval. The lesson: always require human approval for
> destructive email actions (delete, send, forward to external recipients). Reading and organizing
> are safe to automate; sending and deleting are not.

### 19.2 Calendar & Scheduling

#### Core Setup

The `gog` skill provides the most integrated calendar experience because it shares an auth
session with Gmail — enabling workflows where the agent reads a meeting-request email, checks
your calendar, and drafts a reply with available times, all in one flow.

```bash
# Option A: Dedicated calendar skill
clawhub install google-calendar
openclaw skills auth google-calendar

# Option B: Unified Google skill (recommended if also using Gmail)
clawhub install gog
gog auth login
```

#### Natural Language Scheduling

Once the calendar skill is active, conversational scheduling works out of the box:

```
You:    "Schedule a call with Sarah sometime this week"
Agent:  Checking your calendar for this week...
        You're free:
        - Tue 2:00-3:00 PM
        - Wed 10:00-11:30 AM
        - Thu 3:00-4:00 PM
        Want me to create an event for one of these slots?

You:    "Tuesday works. 30 minutes is enough."
Agent:  Created: "Call with Sarah" — Tue 2:00-2:30 PM
        Want me to send her an invite?
```

#### Conflict Resolution

Train the agent to handle conflicts proactively via AGENTS.md rules:
- **Auto-offer alternatives**: When a requested slot is taken, offer the next 3 available windows
- **Timezone awareness**: Always convert to the recipient's timezone when suggesting times
- **Buffer enforcement**: Leave 30-minute gaps between meetings
- **Quiet hours**: Never suggest times before 10 AM or after 4 PM

#### Email-to-Calendar Pipeline

The killer workflow: monitoring your inbox for meeting requests and automatically coordinating.

```
┌──────────────────────────────────────────────────────────────┐
│               EMAIL → CALENDAR PIPELINE                       │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ Heartbeat│───▶│ Scan Inbox   │───▶│ Detect Meeting    │   │
│  │ (30 min) │    │ for Meeting  │    │ Request Patterns  │   │
│  └──────────┘    │ Requests     │    └────────┬──────────┘   │
│                  └──────────────┘             │              │
│                                    ┌──────────▼──────────┐   │
│                                    │ Check Calendar for  │   │
│                                    │ Availability        │   │
│                                    └──────────┬──────────┘   │
│                                               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │ Draft Reply with    │   │
│                                    │ Available Slots     │   │
│                                    └──────────┬──────────┘   │
│                                               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │ Send to You for     │   │
│                                    │ Approval via        │   │
│                                    │ Telegram            │   │
│                                    └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

#### Proactive Calendar Features

Configure these via HEARTBEAT.md and cron:

| Feature | Mechanism | Configuration |
|---------|-----------|---------------|
| **Morning agenda** | First heartbeat of the day | HEARTBEAT.md morning brief section |
| **15-min meeting reminders** | Regular heartbeat check | HEARTBEAT.md calendar reminder check |
| **Meeting prep notes** | Cron 10 min before event | `openclaw cron add --name "meeting-prep" ...` |
| **End-of-day summary** | Evening cron | `openclaw cron add --name "eod-summary" --cron "0 18 * * *" ...` |

#### Heartbeat vs. Cron: When to Use Which

| | Heartbeat | Cron |
|---|-----------|------|
| **Mechanism** | Agent wakes on interval, reads HEARTBEAT.md | System-scheduled command with specific message |
| **Best for** | Cheap recurring checks ("anything need attention?") | Precise time-triggered tasks (morning brief at 7 AM) |
| **Model** | Use Haiku (~$0.15/month at 30-min intervals) | Use Sonnet for complex tasks, Haiku for simple ones |
| **Session** | Reuses last active session | `--session isolated` for clean context |
| **Example** | Calendar reminders, inbox monitoring | Morning brief, deployment checks, end-of-day summary |

> **Insight**: Use Haiku for heartbeat checks. At 30-minute intervals, a Haiku heartbeat costs
> roughly $0.15/month versus $7.20/month with Sonnet — a 48x difference. The heartbeat's job is
> simple triage: "Does anything need attention?" It doesn't need an expensive model for that.

### 19.3 Personal Admin / Chief of Staff

This is where email and calendar converge with task management into a full personal admin system.

#### The Chief of Staff Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  CHIEF OF STAFF AGENT                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    HEARTBEAT (30 min)                   │  │
│  │  Coordinates: Email + Calendar + Tasks in one check     │  │
│  └───────────┬──────────────┬──────────────┬──────────────┘  │
│              │              │              │                  │
│  ┌───────────▼──┐  ┌───────▼──────┐  ┌───▼──────────────┐  │
│  │   Gmail      │  │  Calendar    │  │  Todoist         │  │
│  │  - Triage    │  │  - Conflicts │  │  - Due today     │  │
│  │  - Draft     │  │  - Prep      │  │  - Overdue       │  │
│  │  - Send*     │  │  - Create    │  │  - Create        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│              │              │              │                  │
│  ┌───────────▼──────────────▼──────────────▼──────────────┐  │
│  │              APPROVAL LAYER                             │  │
│  │   * = requires human approval before execution          │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                  │
│              ┌────────────▼────────────┐                     │
│              │  Telegram / WhatsApp    │                     │
│              │  (User Interface)       │                     │
│              └─────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

The key insight: the heartbeat coordinates all three services in a single API call, keeping
costs low while maintaining comprehensive awareness.

#### Day-in-the-Life Example

```
 7:00 AM  ─── Cron: Morning Brief ───────────────────────────
           Agent sends via Telegram:
           "Good morning! Here's your day:
            - 3 meetings (first at 10:00 AM)
            - 7 unread emails (2 need action)
            - 4 tasks due today
            - Drive time to 2 PM meeting: 25 min"

 7:30 AM  ─── Heartbeat ────────────────────────────────────
           HEARTBEAT_OK (nothing new)

 8:00 AM  ─── Heartbeat ────────────────────────────────────
           "New email from Sarah re: Project proposal.
            Looks like she's asking for a meeting.
            Want me to check your availability and reply?"

 9:45 AM  ─── Heartbeat ────────────────────────────────────
           "Heads up: Team standup in 15 min (10:00 AM).
            Context: Yesterday you mentioned the API migration."

12:00 PM  ─── Heartbeat ────────────────────────────────────
           HEARTBEAT_OK

 1:30 PM  ─── Heartbeat ────────────────────────────────────
           "Reminder: Client meeting at 2:00 PM.
            Driving buffer: leave by 1:35 PM.
            Prep notes: Q3 deliverables discussion."

 6:00 PM  ─── Cron: End-of-Day Summary ─────────────────────
           "Today's recap:
            - 3/4 tasks completed (1 moved to tomorrow)
            - 2 emails still need replies
            - Tomorrow: 2 meetings, 5 tasks due"
```

#### Essential Admin Skills

| Skill | Install | Use Case |
|-------|---------|----------|
| **daily-briefing-hub** | `clawhub install daily-briefing-hub` | Aggregated morning/evening briefings |
| **todoist** | `clawhub install todoist` | Full task CRUD with natural language |
| **personal-crm** | `clawhub install personal-crm` | Track contacts, relationship health, follow-ups |
| **template-engine** | `clawhub install template-engine` | Generate letters, invoices, reports from templates |
| **smart-expense-tracker** | `clawhub install smart-expense-tracker` | Receipt photos to spreadsheet, budget tracking |
| **browserautomation** | `clawhub install browserautomation` | Web forms, lookups, bookings |

#### Personal CRM Workflow

A daily cron scans Gmail and Calendar, extracts contact interactions, and tracks relationship
health:

```bash
openclaw cron add \
  --name "crm-sync" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Scan today's emails and calendar events. Extract contacts. \
    Update CRM with interaction dates. Flag contacts not engaged in 30+ days."
```

#### Daily Briefing Cron

```bash
openclaw cron add \
  --name "morning-brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Prepare and deliver the morning briefing. Include: today's \
    calendar, unread email summary, due tasks, weather, and overnight updates."
```

#### Multi-Skill Workflow Coordination

The real power comes from skills working together. A single heartbeat can coordinate:
- **Email**: "Any new meeting requests?"
- **Calendar**: "Any conflicts with existing events?"
- **Todoist**: "Any tasks due in the next 2 hours?"

This works because the heartbeat message triggers the LLM, which has access to all
enabled skills simultaneously. One inference call, multiple skill invocations.

#### Advanced Admin Patterns

**Document generation**: The `template-engine` skill uses Jinja2-style placeholders. Define
templates for recurring documents (weekly reports, meeting agendas, invoices), and the agent
fills them from context.

**Travel planning**: Combine `web-search` + `google-calendar` + a custom travel skill for
visa lookup, passport expiration monitoring, and auto check-in reminders.

**Expense tracking**: The `smart-expense-tracker` skill processes receipt photos (sent via
Telegram) into spreadsheet entries with categories, amounts, and per-diem tracking.

> **Insight**: The "Chief of Staff" pattern works because of two things: the heartbeat keeps
> the agent aware of your world at low cost, and AGENTS.md rules prevent it from acting without
> permission on anything external. Be bold with internal actions (reading, organizing, drafting).
> Be careful with external actions (sending emails, creating events, posting anything public).
> This asymmetry is the key to a useful-but-safe personal agent.

---

## 20. CLI Command Reference

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

### Cron

```bash
openclaw cron add --name "<name>" --cron "<schedule>" \
  --tz "<timezone>" --session isolated --message "<prompt>"
openclaw cron list                       # View all cron jobs
openclaw cron remove <name>              # Remove a cron job
```

### System Events

```bash
openclaw system event --text "..." --mode now  # Manually trigger heartbeat-like event
openclaw pairing approve <channel> <code>      # Approve pairing request
```

### Security

```bash
openclaw security audit                  # Quick security check
openclaw security audit --deep           # Full validation
openclaw security audit --fix            # Auto-fix findings
openclaw security audit --json           # Machine-readable output
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

## 21. Troubleshooting

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

## 22. Cost & Infrastructure

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

## 23. Learning Roadmap

### Week 1: Foundation

- [ ] Install OpenClaw (`npm install -g openclaw`)
- [ ] Run `openclaw onboard --install-daemon`
- [ ] Set up Anthropic API key
- [ ] Create SOUL.md, USER.md, AGENTS.md (copy from `examples/`)
- [ ] Connect Telegram channel
- [ ] Install `second-brain` and `web-search` skills
- [ ] Send 20+ messages to teach it about you
- [ ] Run `openclaw doctor` daily
- [ ] Run `openclaw security audit` and fix any critical findings
- [ ] Set `gateway.bind: "loopback"` and configure auth token

### Week 2: Productivity

- [ ] Connect WhatsApp channel
- [ ] Install `google-calendar`, `gmail`, `todoist` skills
- [ ] Set up HEARTBEAT.md with morning briefing
- [ ] Enable `session-memory` hook
- [ ] Start using "remember this" and "note:" patterns
- [ ] Install `proactive-agent` for scheduled check-ins
- [ ] Refine SOUL.md based on first week's interactions
- [ ] Set up email triage cron (30-minute interval)
- [ ] Add email voice training to SOUL.md
- [ ] Add email/scheduling rules to AGENTS.md
- [ ] Configure tool policies (`tools.exec.security: "ask"`)

### Week 3: Customization

- [ ] Build your first custom skill (see `examples/skills/quick-capture/`)
- [ ] Build email-triage skill (see `examples/skills/email-triage/`)
- [ ] Install dev tools: `git-automation`, `vercel-deploy`
- [ ] Set up cron jobs for deployment monitoring
- [ ] Set up personal CRM cron (nightly contact sync)
- [ ] Configure email-to-calendar pipeline in HEARTBEAT.md
- [ ] Experiment with sub-agents for parallel research
- [ ] Review and curate MEMORY.md
- [ ] Study the architecture diagrams (Section 3) — trace a message end-to-end

### Week 4: Advanced

- [ ] Build your first plugin (see `examples/plugins/morning-brief/`)
- [ ] Set up sandboxing for non-main sessions
- [ ] Configure context pruning and compaction (Section 12)
- [ ] Explore vector memory search optimization (MMR, temporal decay)
- [ ] Consider multi-agent setup if needed
- [ ] Run `openclaw security audit --deep` and address all findings

### Ongoing

- [ ] Curate MEMORY.md weekly — remove stale facts, add new patterns
- [ ] Review installed skills monthly — disable unused ones
- [ ] Update this guide every 3 days with new insights
- [ ] Check ClawHub for new skills that match your workflow
- [ ] Run `openclaw security audit` monthly

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
