import { ActivityItem, RunOverview, RunPhase } from "./types.js";

export type RawTelemetryEvent = {
  id: string;
  runId: string;
  timestamp: string;
  type: string;
  task?: string;
  tool?: string;
  subagent?: string;
  status?: string;
  message?: string;
};

// Maps technical event types to human-friendly phases
export function getPhaseForEvent(eventType: string, currentPhase: RunPhase = "queued"): RunPhase {
  switch (eventType) {
    case "run.start":
      return "queued";
    case "llm.start":
    case "llm.done":
      return "understanding";
    case "tool.start":
    case "tool.done":
    case "subagent.spawn":
    case "subagent.done":
      return "working";
    case "human.ask":
    case "human.answer":
      return "reviewing";
    case "run.done":
      return "complete"; // Or "error" if status indicates failure
    case "tool.error":
      return "working"; // Errors during work are still working (retrying)
    default:
      return currentPhase;
  }
}

// Maps technical events to human-readable activity items
export function translateEventToActivity(event: RawTelemetryEvent): ActivityItem {
  const timestamp = parseInt(event.timestamp, 10) || Date.now();
  const phase = getPhaseForEvent(event.type);
  
  let title = "Working on the next step...";
  let description = event.message;
  let icon = "circle-dashed"; // Default icon
  let isActive = true; // Assume event.start means active, we'll mark inactive when .done arrives
  let progressDelta = 5; // Default progress bump
  
  if (event.type.endsWith(".done")) {
    isActive = false;
  }

  // Translation Rules
  switch (event.type) {
    case "run.start":
      title = "Starting your request";
      icon = "play";
      progressDelta = 5;
      break;
    
    case "llm.start":
      title = "Thinking about your request...";
      icon = "brain";
      progressDelta = 5;
      break;
      
    case "llm.done":
      title = "Finished thinking";
      icon = "check";
      progressDelta = 5;
      break;

    case "tool.start":
      if (event.tool === "web_search") {
        title = "Searching the web for answers...";
        icon = "globe";
      } else if (event.tool === "read" || event.tool === "read_multi") {
        title = "Reading through relevant files...";
        icon = "file-text";
      } else if (event.tool === "write" || event.tool === "edit") {
        title = "Writing up the results...";
        icon = "edit-3";
      } else if (event.tool === "slack_reply") {
        title = "Sending you an update...";
        icon = "message-square";
      } else if (event.tool === "bash") {
        title = "Running a quick check...";
        icon = "terminal";
      } else if (event.tool === "run_subagent") {
        title = "Bringing in a specialist...";
        icon = "users";
      } else if (event.tool === "grep") {
        title = "Searching for a specific pattern...";
        icon = "search";
      } else if (event.tool === "find") {
        title = "Looking for the right files...";
        icon = "folder-search";
      } else if (event.tool === "ls") {
        title = "Browsing folder contents...";
        icon = "folder";
      } else if (event.tool === "memory_read_working" || event.tool === "memory_write_working") {
        title = "Checking memory...";
        icon = "brain";
      } else if (event.tool === "memory_store_knowledge") {
        title = "Remembering this for later...";
        icon = "bookmark";
      } else if (event.tool === "deep_research_railway") {
        title = "Starting deep research...";
        icon = "microscope";
      } else if (event.tool === "computer_use") {
        title = "Working on the computer...";
        icon = "monitor";
      } else if (event.tool === "web_extract") {
        title = "Reading a web page...";
        icon = "globe";
      } else {
        title = `Using an unexpected tool: ${event.tool}...`;
        icon = "tool";
      }
      progressDelta = 10;
      break;

    case "tool.done":
      title = `Finished using tool: ${event.tool || "tool"}`;
      icon = "check-circle";
      isActive = false;
      progressDelta = 5;
      break;

    case "tool.error":
      title = "Hit a small bump — working around it...";
      icon = "alert-triangle";
      isActive = false; 
      progressDelta = 0;
      break;

    case "subagent.spawn":
      title = "A specialist is helping out...";
      icon = "user-plus";
      progressDelta = 10;
      break;

    case "subagent.done":
      title = "Specialist finished their part";
      icon = "user-check";
      isActive = false;
      progressDelta = 5;
      break;

    case "human.ask":
      title = "Need your input on something...";
      icon = "help-circle";
      isActive = true; // Waiting for human
      progressDelta = 0;
      break;
      
    case "human.answer":
      title = "Received your input, continuing...";
      icon = "message-circle";
      isActive = false;
      progressDelta = 10;
      break;

    case "run.done":
      if (event.status === "error" || event.status === "failed") {
        title = "Something went wrong — we're on it";
        icon = "x-circle";
      } else {
        title = "All done! ✓";
        icon = "check-circle-2";
      }
      isActive = false;
      progressDelta = 100; // Will be capped contextually
      break;
  }

  // Force error-like handling for tool.error events without marking the whole run as failed.
  if (event.type === "tool.error") {
    return {
      id: event.id,
      runId: event.runId,
      timestamp,
      phase: "working",
      title,
      description,
      icon,
      progress: progressDelta,
      isActive: false,
    };
  }

  return {
    id: event.id,
    runId: event.runId,
    timestamp,
    phase: event.status === "error" ? "error" : phase,
    title,
    description,
    icon,
    progress: progressDelta,
    isActive,
  };
}

export function determineSpecialist(task: string): string {
  const lowercaseTask = task.toLowerCase();
  if (lowercaseTask.includes("research") || lowercaseTask.includes("find") || lowercaseTask.includes("search")) {
    return "Researcher";
  }
  if (
    lowercaseTask.includes("write") ||
    lowercaseTask.includes("create") ||
    lowercaseTask.includes("build") ||
    lowercaseTask.includes("implement")
  ) {
    return "Builder";
  }
  if (
    lowercaseTask.includes("fix") ||
    lowercaseTask.includes("debug") ||
    lowercaseTask.includes("error") ||
    lowercaseTask.includes("bug")
  ) {
    return "Troubleshooter";
  }
  if (
    lowercaseTask.includes("deploy") ||
    lowercaseTask.includes("ship") ||
    lowercaseTask.includes("launch") ||
    lowercaseTask.includes("release")
  ) {
    return "Deployer";
  }
  if (
    lowercaseTask.includes("review") ||
    lowercaseTask.includes("check") ||
    lowercaseTask.includes("verify") ||
    lowercaseTask.includes("audit")
  ) {
    return "Reviewer";
  }
  if (
    lowercaseTask.includes("analyze") ||
    lowercaseTask.includes("report") ||
    lowercaseTask.includes("data") ||
    lowercaseTask.includes("analyse")
  ) {
    return "Analyst";
  }
  return "Assistant";
}
