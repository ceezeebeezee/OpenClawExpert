/**
 * Morning Briefing Engine — OpenClaw Plugin
 *
 * This plugin assembles and delivers a daily morning briefing via Telegram/WhatsApp.
 * It combines data from calendar, email, tasks, weather, and memory into a single
 * scannable message.
 *
 * HOW THIS WORKS:
 * ───────────────
 * 1. The plugin registers a hook on "command:new" and a tool "morning_brief".
 * 2. The heartbeat system in HEARTBEAT.md detects "first heartbeat of the day"
 *    and asks the agent to use the morning_brief tool.
 * 3. The tool gathers data from available skills and returns a formatted briefing.
 * 4. The agent delivers it to the user's last active channel.
 *
 * ALTERNATIVELY: The user can trigger it manually with /brief slash command.
 *
 * LEARNING NOTES:
 * ───────────────
 * - Plugins export a function that receives the `api` object
 * - api.registerTool() makes actions available to the LLM
 * - api.registerCommand() creates slash commands (bypass LLM)
 * - api.registerHook() reacts to lifecycle events
 * - api.registerService() runs background processes
 * - api.logger provides structured logging
 * - api.config accesses the plugin's config from openclaw.json
 *
 * This is a LEARNING SCAFFOLD — not all API calls are real.
 * The sections marked [PLACEHOLDER] show where you'd integrate with actual skills.
 */

// Type definitions for the OpenClaw plugin API
// In a real plugin, these come from @openclaw/types or the runtime
interface PluginApi {
  config: Record<string, any>;
  logger: {
    info: (msg: string, meta?: any) => void;
    warn: (msg: string, meta?: any) => void;
    error: (msg: string, meta?: any) => void;
  };
  registerTool: (tool: ToolDefinition) => void;
  registerCommand: (cmd: CommandDefinition) => void;
  registerHook: (
    event: string,
    handler: () => Promise<void>,
    meta: { name: string; description: string }
  ) => void;
  registerService: (service: ServiceDefinition) => void;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
  };
  handler: (args: any) => Promise<any>;
}

interface CommandDefinition {
  name: string;
  description: string;
  acceptsArgs: boolean;
  requireAuth: boolean;
  handler: (ctx: any) => { text: string };
}

interface ServiceDefinition {
  id: string;
  start: () => void;
  stop: () => void;
}

// ─── HELPER: Format current date ──────────────────────────────────
function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── HELPER: Get current hour ─────────────────────────────────────
function getCurrentHour(): number {
  return new Date().getHours();
}

// ─── HELPER: Determine greeting based on time ─────────────────────
function getGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── MAIN PLUGIN EXPORT ───────────────────────────────────────────
export default function morningBriefPlugin(api: PluginApi) {
  const pluginConfig = api.config ?? {};

  api.logger.info("Morning Brief plugin loaded", {
    briefingTime: pluginConfig.briefingTime ?? "07:00",
  });

  // ─── TOOL: morning_brief ──────────────────────────────────────
  //
  // This tool is available to the LLM. When the heartbeat or user asks
  // for a morning briefing, the agent calls this tool.
  //
  // In a real implementation, this would query calendar, email, and task
  // APIs. For this scaffold, it returns a structured template that the
  // agent fills in using its available skills.
  //
  api.registerTool({
    name: "morning_brief",
    description:
      "Generate a morning briefing with calendar events, email highlights, " +
      "pending tasks, weather, and yesterday's notes. Call this when the user " +
      "asks for their daily briefing or during the first heartbeat of the day.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for the briefing (YYYY-MM-DD). Defaults to today.",
        },
        sections: {
          type: "array",
          description:
            "Which sections to include: calendar, email, tasks, weather, notes. " +
            "Defaults to all.",
        },
      },
    },
    handler: async (args: { date?: string; sections?: string[] }) => {
      const date = args.date ?? new Date().toISOString().split("T")[0];
      const sections = args.sections ?? [
        "calendar",
        "email",
        "tasks",
        "weather",
        "notes",
      ];

      api.logger.info("Generating morning briefing", { date, sections });

      // ──────────────────────────────────────────────────────────
      // [PLACEHOLDER] In a real plugin, you would:
      //
      // 1. Query Google Calendar API for today's events
      //    const events = await googleCalendar.listEvents(date);
      //
      // 2. Query Gmail API for unread important emails
      //    const emails = await gmail.getUnread({ important: true });
      //
      // 3. Query Todoist API for today's tasks
      //    const tasks = await todoist.getTasks({ filter: "today | overdue" });
      //
      // 4. Query weather API
      //    const weather = await weatherApi.getForecast(pluginConfig.weatherLocation);
      //
      // 5. Read yesterday's memory log
      //    const notes = await fs.readFile(`memory/${yesterday}.md`);
      //
      // For now, we return instructions for the agent to gather this data
      // using its available skills.
      // ──────────────────────────────────────────────────────────

      const briefingTemplate = {
        date,
        greeting: getGreeting(),
        formattedDate: formatDate(),
        sections,
        instructions:
          "Use the available skills to gather data for each section. " +
          "Format the briefing as a single scannable message with bullet points. " +
          "Skip any section where the required skill is not available. " +
          "Keep the entire briefing under 500 words.",
        sectionGuide: {
          calendar: "Use google-calendar skill to list today's events with times.",
          email:
            "Use gmail skill to list unread emails from the last 12 hours. " +
            "Summarize important ones, skip newsletters and automated notifications.",
          tasks:
            "Use todoist skill to list tasks due today and overdue tasks. " +
            "Group by priority if possible.",
          weather:
            pluginConfig.includeWeather
              ? `Use web-search to get today's weather for ${pluginConfig.weatherLocation || "user's location"}.`
              : "Weather section disabled in config.",
          notes:
            "Check yesterday's memory log for any captured notes, ideas, or links. " +
            "Summarize if present.",
        },
      };

      return briefingTemplate;
    },
  });

  // ─── COMMAND: /brief ──────────────────────────────────────────
  //
  // Slash command that triggers a briefing without going through the LLM.
  // This is a "command-dispatch" — it directly invokes the morning_brief tool.
  //
  // Usage: Type "/brief" in any channel to get your daily briefing.
  //
  api.registerCommand({
    name: "brief",
    description: "Get your daily briefing now",
    acceptsArgs: false,
    requireAuth: true,
    handler: (_ctx: any) => ({
      text:
        "Generating your daily briefing... " +
        "(The agent will use the morning_brief tool to assemble it.)",
    }),
  });

  // ─── HOOK: Track briefing delivery ────────────────────────────
  //
  // This hook fires when a new session starts. It could be used to
  // check if today's briefing has already been delivered.
  //
  api.registerHook(
    "command:new",
    async () => {
      api.logger.info("New session started — checking if briefing was delivered today");
      // [PLACEHOLDER] Check if briefing already sent today
      // If not, and it's within the briefing window, trigger it
    },
    {
      name: "morning-brief.session-check",
      description: "Check if daily briefing needs to be delivered on new session",
    }
  );

  // ─── SERVICE: Briefing scheduler (optional) ───────────────────
  //
  // A background service that could manage briefing scheduling independently
  // of the heartbeat system. This is an alternative to using HEARTBEAT.md.
  //
  // For most users, the heartbeat approach (in HEARTBEAT.md) is simpler.
  // This service approach gives more control but adds complexity.
  //
  api.registerService({
    id: "morning-brief-scheduler",
    start: () => {
      api.logger.info("Morning Brief scheduler started", {
        briefingTime: pluginConfig.briefingTime ?? "07:00",
      });
      // [PLACEHOLDER] Set up interval to check if briefing time has arrived
      // In practice, the heartbeat + HEARTBEAT.md approach is simpler
    },
    stop: () => {
      api.logger.info("Morning Brief scheduler stopped");
      // [PLACEHOLDER] Clean up any intervals
    },
  });
}
