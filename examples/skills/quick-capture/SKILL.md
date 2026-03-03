---
name: quick-capture
description: "Route notes, todos, ideas, and links to the right system based on message prefix"
version: 1.0.0
user-invocable: false
metadata: {"openclaw": {"emoji": "📥", "always": true}}
---

## Quick Capture Skill

This skill enables frictionless capture from any messaging channel. When a message
starts with a recognized prefix, automatically route it to the right system.

## Trigger Conditions

Activate this skill when the user's message starts with any of these prefixes
(case-insensitive):

| Prefix | Route | Action |
|--------|-------|--------|
| `note:` | Second Brain | Save as a concept or reference in the second brain |
| `todo:` | Todoist | Create a new task in Todoist inbox |
| `idea:` | Memory Log | Save to today's memory log under "## Ideas" |
| `link:` | Second Brain | Archive URL with a brief summary |
| `remind:` | Calendar/Cron | Create a reminder at specified time |

## Instructions

### When message starts with `note:`

1. Extract the content after the prefix.
2. If the `second-brain` skill is available, save it as a new concept entry.
3. If `second-brain` is not available, append to today's memory log under "## Notes".
4. Confirm with: "Noted: [brief one-line summary]"

### When message starts with `todo:`

1. Extract the task description after the prefix.
2. If the `todoist` skill is available, create a task in the Inbox project.
3. If `todoist` is not available, append to today's memory log under "## Tasks".
4. Check for time indicators (e.g., "todo: buy groceries by Friday"):
   - If found, set the due date accordingly.
5. Confirm with: "Task added: [task summary]"

### When message starts with `idea:`

1. Extract the idea after the prefix.
2. Append to today's memory log (`memory/YYYY-MM-DD.md`) under "## Ideas".
3. Include a timestamp.
4. Confirm with: "Idea captured: [brief summary]"

### When message starts with `link:`

1. Extract the URL after the prefix.
2. If a description follows the URL, use it. Otherwise, fetch the page title.
3. If the `second-brain` skill is available, save as a reference entry.
4. If not, append to today's memory log under "## Links".
5. Confirm with: "Link saved: [title or description]"

### When message starts with `remind:`

1. Parse the reminder content and time from the message.
   Examples:
   - "remind: call dentist tomorrow at 2pm"
   - "remind: review PR in 30 minutes"
   - "remind: team standup every weekday at 9am"
2. If `google-calendar` skill is available, create a calendar event/reminder.
3. If `cron-scheduler` skill is available and it's a recurring reminder, create a cron job.
4. If neither is available, save to memory log under "## Reminders" with the target time.
5. Confirm with: "Reminder set: [what] at [when]"

## Rules

- Always confirm what was captured. Never silently process.
- Keep confirmations to ONE LINE. The user is on mobile — brevity matters.
- If the prefix is present but the content is empty, ask what to capture.
- Never modify the prefix routing logic without user approval.
- Timestamps should use the user's timezone (from USER.md).
- If multiple prefixes could apply, use the first one that matches.

## Examples

```
User: note: Drizzle ORM requires explicit migration calls, not auto-sync
Agent: Noted: Drizzle ORM requires explicit migration calls

User: todo: update Career Navigator dependencies by Friday
Agent: Task added: Update Career Navigator deps (due: Friday)

User: idea: what if AIBoard could auto-summarize after each round?
Agent: Idea captured: AIBoard auto-summarize after each round

User: link: https://example.com/react-19-features Great overview of new hooks
Agent: Link saved: React 19 features — Great overview of new hooks

User: remind: deploy czbz.ai updates tomorrow at 10am
Agent: Reminder set: Deploy czbz.ai updates (tomorrow 10:00 AM)
```
