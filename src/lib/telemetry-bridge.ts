import type { ActivityItem, RunOverview, RunPhase, TelemetryEvent } from "./types";

const toolFriendlyNames: Record<string, { title: string; icon: string }> = {
	web_search: { title: "Searching the web for answers…", icon: "search" },
	web_extract: { title: "Reading a web page…", icon: "globe" },
	read: { title: "Looking through files…", icon: "file-text" },
	read_multi: { title: "Reviewing several documents…", icon: "files" },
	write: { title: "Writing up results…", icon: "pen-line" },
	edit: { title: "Making some edits…", icon: "pen-line" },
	grep: { title: "Searching for something specific…", icon: "search" },
	find: { title: "Looking for the right files…", icon: "folder-search" },
	bash: { title: "Running a quick check…", icon: "terminal" },
	slack_reply: { title: "Sending you an update…", icon: "send" },
	run_subagent: { title: "Bringing in a specialist…", icon: "users" },
	human_ask: { title: "Needs your input…", icon: "message-circle" },
	memory_read_working: { title: "Checking memory…", icon: "brain" },
	memory_write_working: { title: "Saving progress…", icon: "save" },
	memory_store_knowledge: { title: "Remembering this for later…", icon: "bookmark" },
	deep_research_railway: { title: "Starting deep research…", icon: "microscope" },
	computer_use: { title: "Working on the computer…", icon: "monitor" },
	ls: { title: "Browsing folders…", icon: "folder" },
};

export function translateEvent(
	event: TelemetryEvent,
	currentProgress: number,
): ActivityItem {
	const base: ActivityItem = {
		id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		runId: event.runId || "unknown",
		timestamp: event.ts || Date.now(),
		phase: "working",
		title: "Working on the next step…",
		icon: "sparkles",
		isActive: true,
	};

	switch (event.type) {
		case "run.start":
			return {
				...base,
				phase: "queued",
				title: "Starting to work on your request…",
				icon: "rocket",
				progress: 5,
			};

		case "llm.start":
			return {
				...base,
				phase: "understanding",
				title: "Thinking about your request…",
				icon: "brain",
				progress: Math.min(currentProgress + 5, 95),
			};

		case "llm.done":
			return {
				...base,
				phase: "working",
				title: "Figured out the next step…",
				icon: "lightbulb",
				isActive: false,
				progress: Math.min(currentProgress + 5, 95),
			};

		case "tool.start": {
			const toolName = (event.data?.toolName as string) || "";
			const friendly = toolFriendlyNames[toolName] || {
				title: "Working on the next step…",
				icon: "sparkles",
			};
			return {
				...base,
				title: friendly.title,
				icon: friendly.icon,
				progress: Math.min(currentProgress + 3, 95),
			};
		}

		case "tool.done": {
			const toolName = (event.data?.toolName as string) || "";
			const friendly = toolFriendlyNames[toolName] || {
				title: "Completed a step",
				icon: "check",
			};
			return {
				...base,
				title: friendly.title.replace("…", " ✓"),
				icon: "check",
				isActive: false,
				progress: Math.min(currentProgress + 5, 95),
			};
		}

		case "tool.error":
			return {
				...base,
				phase: "working",
				title: "Hit a small bump — working around it…",
				icon: "alert-triangle",
				progress: currentProgress,
			};

		case "subagent.spawn":
			return {
				...base,
				title: "A specialist is helping out…",
				icon: "users",
				progress: Math.min(currentProgress + 5, 95),
			};

		case "subagent.done":
			return {
				...base,
				title: "Specialist finished their part ✓",
				icon: "user-check",
				isActive: false,
				progress: Math.min(currentProgress + 10, 95),
			};

		case "human.ask":
			return {
				...base,
				phase: "reviewing",
				title: "Needs your input on something…",
				icon: "message-circle",
				progress: currentProgress,
			};

		case "human.answer":
			return {
				...base,
				phase: "working",
				title: "Got your input — continuing…",
				icon: "check-circle",
				progress: Math.min(currentProgress + 5, 95),
			};

		case "run.done": {
			const status = (event.data?.status as string) || "ok";
			if (status === "ok" || status === "done") {
				return {
					...base,
					phase: "complete",
					title: "All done! ✓",
					icon: "check-circle",
					isActive: false,
					progress: 100,
				};
			}
			return {
				...base,
				phase: "error",
				title: "Something went wrong — we're on it",
				icon: "alert-triangle",
				isActive: false,
				progress: currentProgress,
			};
		}

		default:
			return base;
	}
}

export function calculatePhase(activities: ActivityItem[]): RunPhase {
	if (activities.length === 0) return "queued";
	const last = activities[activities.length - 1];
	return last.phase;
}

export function calculateProgress(activities: ActivityItem[]): number {
	if (activities.length === 0) return 0;
	const last = activities[activities.length - 1];
	return last.progress ?? 0;
}

export function getSpecialistName(task: string): string {
	const t = task.toLowerCase();
	if (t.includes("research") || t.includes("find") || t.includes("search"))
		return "Researcher";
	if (t.includes("write") || t.includes("create") || t.includes("build") || t.includes("implement"))
		return "Builder";
	if (t.includes("fix") || t.includes("debug") || t.includes("error"))
		return "Troubleshooter";
	if (t.includes("deploy") || t.includes("ship") || t.includes("launch"))
		return "Deployer";
	if (t.includes("review") || t.includes("check") || t.includes("verify"))
		return "Reviewer";
	if (t.includes("analyze") || t.includes("report") || t.includes("data"))
		return "Analyst";
	return "Assistant";
}
