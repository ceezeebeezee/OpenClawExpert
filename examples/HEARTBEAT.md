# HEARTBEAT.md — Periodic Check-in Checklist
# Place this file at: ~/.openclaw/workspace/HEARTBEAT.md
#
# The agent reads this file on every heartbeat cycle (default: every 30 minutes).
# If nothing needs attention, reply HEARTBEAT_OK (the message will be dropped).

## Morning Brief (first heartbeat of the day)

If this is the first heartbeat today (no prior heartbeat log for today), prepare
a morning briefing. Include:

1. **Today's calendar**: List all events with times.
2. **Email highlights**: Summarize any unread emails that need attention
   (skip newsletters and automated notifications).
3. **Pending tasks**: List any open Todoist tasks due today or overdue.
4. **Weather**: Brief forecast for my location.
5. **Yesterday's notes**: Summarize anything I saved to second brain or
   memory yesterday.

Format the briefing as a single, scannable message. Use bullet points.
Send to the last active DM channel.

## Regular Heartbeat (all other times)

Check in this order. Stop at the first item that needs attention:

1. **Urgent messages**: Any unread messages flagged as urgent or from priority contacts?
   → If yes, summarize and alert me.

2. **Calendar reminders**: Any events starting in the next 30 minutes?
   → If yes, send a heads-up with event name and time.

3. **Deployment alerts**: Check if any active deployments have failed or are unhealthy.
   → If yes, summarize the issue.

4. **Task deadlines**: Any Todoist tasks due in the next 2 hours?
   → If yes, remind me.

5. **Nothing needs attention**: Reply HEARTBEAT_OK.

## Rules

- Never send more than one heartbeat message per cycle.
- Bundle multiple items into a single message if several need attention.
- Don't repeat alerts I've already acknowledged.
- Respect active hours — no heartbeat messages outside configured hours.
- Keep heartbeat messages SHORT. If I need details, I'll ask.
