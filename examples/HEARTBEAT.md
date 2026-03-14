# HEARTBEAT.md — Periodic Check-in Checklist
# Place this file at: ~/.openclaw/workspace/HEARTBEAT.md
#
# The agent reads this file on every heartbeat cycle (default: every 30 minutes).
# If nothing needs attention, reply HEARTBEAT_OK (the message will be dropped).

## Morning Brief (first heartbeat of the day)

If this is the first heartbeat today (no prior heartbeat log for today), prepare
a morning briefing. Include:

1. **Today's calendar**: List all events with times and locations. Flag any
   back-to-back meetings missing buffers. Note events requiring travel with
   estimated drive/transit times.
2. **Email highlights**: Summarize unread emails that need action
   (skip newsletters and automated notifications). Group by urgency:
   - Needs reply today
   - FYI / can wait
   - Meeting requests (cross-reference with calendar availability)
3. **Pending tasks**: List any open Todoist tasks due today or overdue.
   Note tasks that were due yesterday but not completed.
4. **Weather**: Brief forecast for my location.
5. **Yesterday's notes**: Summarize anything I saved to second brain or
   memory yesterday.
6. **Contact follow-ups**: Flag any frequent contacts I haven't engaged
   with in 30+ days (if CRM skill is available).

Format the briefing as a single, scannable message. Use bullet points.
Send to the last active DM channel.

## Regular Heartbeat (all other times)

Check in this order. Stop at the first item that needs attention:

1. **Urgent messages**: Any unread messages flagged as urgent or from priority contacts?
   → If yes, summarize and alert me.

2. **Calendar reminders**: Any events starting in the next 30 minutes?
   → If yes, send a heads-up with event name, time, and any prep context.
   → If the event requires travel, remind me of departure time.

3. **Meeting requests in email**: Any new emails that look like meeting requests
   or scheduling proposals?
   → If yes, summarize the request, check my calendar availability, and ask if
   I want to reply with available times.

4. **Email requiring action**: Any unread emails from known contacts that
   require a reply or decision?
   → If yes, summarize briefly. Don't include the full email body.

5. **Deployment alerts**: Check if any active deployments have failed or are unhealthy.
   → If yes, summarize the issue.

6. **Task deadlines**: Any Todoist tasks due in the next 2 hours?
   → If yes, remind me.

7. **Task reconciliation**: Any Todoist tasks that were marked complete outside
   this agent (e.g., completed in the Todoist app)?
   → If yes, note them silently in the daily memory log. Don't alert me.

8. **Calendar changes**: Any events that were modified, cancelled, or added
   by other attendees since the last heartbeat?
   → If yes, summarize the change.

9. **Nothing needs attention**: Reply HEARTBEAT_OK.

## Rules

- Never send more than one heartbeat message per cycle.
- Bundle multiple items into a single message if several need attention.
- Don't repeat alerts I've already acknowledged.
- Respect active hours — no heartbeat messages outside configured hours.
- Keep heartbeat messages SHORT. If I need details, I'll ask.
- Use the cheapest available model for heartbeat checks (Haiku recommended).
- Email scanning should only look at the last 30 minutes of new mail to avoid
  re-processing old messages.
- Never include full email bodies in heartbeat alerts — subject line and
  one-sentence summary only.
- If nothing needs attention, reply HEARTBEAT_OK (will be suppressed if ≤300 chars).
- When `lightContext: true` is set, only essential workspace files are loaded to
  minimize token usage during heartbeat checks.

## Manual Triggers

To manually trigger a heartbeat-like check at any time:
```
openclaw system event --text "Check my inbox for anything urgent" --mode now
```

## Configuration Reference

```json5
heartbeat: {
  every: "30m",               // Check interval
  activeHours: "07:00-23:00", // Quiet hours
  target: "last",             // "last" (active DM) or "none" (internal only)
  model: "anthropic/claude-haiku-4-5",
  lightContext: true          // Minimal context for cheaper heartbeat turns
}
```
