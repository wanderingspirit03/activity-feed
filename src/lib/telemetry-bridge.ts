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
  if (lowercaseTask.includes("research") || lowercaseTask.includes("find")) {
    return "Researcher";
  }
  if (lowercaseTask.includes("write") || lowercaseTask.includes("create") || lowercaseTask.includes("build")) {
    return "Builder";
  }
  if (lowercaseTask.includes("fix") || lowercaseTask.includes("debug") || lowercaseTask.includes("error")) {
    return "Troubleshooter";
  }
  if (lowercaseTask.includes("deploy") || lowercaseTask.includes("ship") || lowercaseTask.includes("launch")) {
    return "Deployer";
  }
  return "Assistant";
}
