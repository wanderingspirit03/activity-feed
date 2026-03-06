import { cn } from "@/lib/utils";

export interface OpsFeature {
	id: string;
	title: string;
	status: "pending" | "in-progress" | "done" | "failed" | "fix-needed" | string;
	phase: number | string;
	assignedModel: string;
	attempts: number;
}

interface DependencyGraphProps {
	features: OpsFeature[];
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;
const PHASE_GAP = 96;
const ROW_GAP = 14;
const PADDING_X = 28;
const HEADER_HEIGHT = 52;
const FOOTER_PADDING = 26;

const STATUS_STYLES: Record<string, { rect: string; text: string }> = {
	pending: {
		rect: "stroke-border fill-card/50",
		text: "fill-muted-foreground",
	},
	"in-progress": {
		rect: "stroke-amber-500/40 fill-amber-500/10",
		text: "fill-amber-400",
	},
	done: {
		rect: "stroke-emerald-500/40 fill-emerald-500/10",
		text: "fill-emerald-400",
	},
	failed: {
		rect: "stroke-red-500/40 fill-red-500/10",
		text: "fill-red-400",
	},
	"fix-needed": {
		rect: "stroke-orange-500/40 fill-orange-500/10",
		text: "fill-orange-400",
	},
};

const toPhaseNumber = (phase: number | string): number | null => {
	if (typeof phase === "number" && Number.isFinite(phase)) {
		return phase;
	}
	const match = String(phase).match(/\d+/);
	if (!match) {
		return null;
	}
	const value = Number.parseInt(match[0], 10);
	return Number.isFinite(value) ? value : null;
};

const truncate = (value: string, max = 26): string => {
	if (value.length <= max) {
		return value;
	}
	return `${value.slice(0, Math.max(1, max - 1))}…`;
};

const normalizeStatus = (status: string): string => status.trim().toLowerCase();

export function DependencyGraph({ features }: DependencyGraphProps) {
	if (!features.length) {
		return (
			<div className="w-full overflow-x-auto rounded-lg border border-border/60 bg-card/30 p-6">
				<div className="text-sm text-muted-foreground">No features yet. Dependency graph will appear once phases are populated.</div>
			</div>
		);
	}

	const phaseMap = new Map<string, OpsFeature[]>();
	for (const feature of features) {
		const key = String(feature.phase);
		const existing = phaseMap.get(key);
		if (existing) {
			existing.push(feature);
		} else {
			phaseMap.set(key, [feature]);
		}
	}

	const sortedPhaseKeys = [...phaseMap.keys()].sort((a, b) => {
		const aNum = toPhaseNumber(a);
		const bNum = toPhaseNumber(b);
		if (aNum !== null && bNum !== null) {
			return aNum - bNum;
		}
		if (aNum !== null) {
			return -1;
		}
		if (bNum !== null) {
			return 1;
		}
		return a.localeCompare(b);
	});

	const phaseColumns = sortedPhaseKeys.map((key, index) => {
		const parsed = toPhaseNumber(key);
		const labelNumber = parsed !== null && parsed > 0 ? parsed : index + 1;
		return {
			key,
			label: `Phase ${labelNumber}`,
			features: phaseMap.get(key) ?? [],
		};
	});

	const maxRows = Math.max(1, ...phaseColumns.map((phase) => phase.features.length));
	const phaseCount = phaseColumns.length;
	const viewWidth = PADDING_X * 2 + phaseCount * NODE_WIDTH + (phaseCount - 1) * PHASE_GAP;
	const viewHeight = HEADER_HEIGHT + maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP + FOOTER_PADDING;

	const positionedPhases = phaseColumns.map((phase, phaseIndex) => {
		const x = PADDING_X + phaseIndex * (NODE_WIDTH + PHASE_GAP);
		return phase.features.map((feature, rowIndex) => ({
			feature,
			x,
			y: HEADER_HEIGHT + rowIndex * (NODE_HEIGHT + ROW_GAP),
			rowIndex,
		}));
	});

	const connectorPaths: Array<{ key: string; d: string }> = [];
	for (let phaseIndex = 0; phaseIndex < positionedPhases.length - 1; phaseIndex++) {
		const current = positionedPhases[phaseIndex];
		const next = positionedPhases[phaseIndex + 1];
		if (!current.length || !next.length) {
			continue;
		}

		const pairSet = new Set<string>();

		for (let i = 0; i < current.length; i++) {
			const targetIndex =
				next.length === 1
					? 0
					: Math.round((i / Math.max(1, current.length - 1)) * (next.length - 1));
			pairSet.add(`${i}-${targetIndex}`);
		}

		for (let j = 0; j < next.length; j++) {
			const sourceIndex =
				current.length === 1
					? 0
					: Math.round((j / Math.max(1, next.length - 1)) * (current.length - 1));
			pairSet.add(`${sourceIndex}-${j}`);
		}

		for (const pair of pairSet) {
			const [sourceIdx, targetIdx] = pair.split("-").map((value) => Number.parseInt(value, 10));
			const source = current[sourceIdx];
			const target = next[targetIdx];
			if (!source || !target) {
				continue;
			}

			const x1 = source.x + NODE_WIDTH;
			const y1 = source.y + NODE_HEIGHT / 2;
			const x2 = target.x;
			const y2 = target.y + NODE_HEIGHT / 2;
			const dx = (x2 - x1) * 0.5;

			connectorPaths.push({
				key: `${phaseIndex}-${source.feature.id}-${target.feature.id}`,
				d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
			});
		}
	}

	return (
		<div className="w-full overflow-x-auto rounded-lg border border-border/60 bg-card/30 p-2">
			<svg
				viewBox={`0 0 ${viewWidth} ${viewHeight}`}
				width={viewWidth}
				height={viewHeight}
				className="h-auto min-w-max"
				role="img"
				aria-label="Feature dependency graph by phase"
			>
				<g>
					{connectorPaths.map((connector) => (
						<path
							key={connector.key}
							d={connector.d}
							className="fill-none stroke-border/40"
							strokeWidth={1.4}
							strokeLinecap="round"
						/>
					))}
				</g>

				{phaseColumns.map((phase, phaseIndex) => {
					const phaseX = PADDING_X + phaseIndex * (NODE_WIDTH + PHASE_GAP);
					return (
						<text
							key={`${phase.key}-label`}
							x={phaseX + NODE_WIDTH / 2}
							y={24}
							textAnchor="middle"
							className="fill-muted-foreground"
							fontSize={12}
							fontWeight={500}
						>
							{phase.label}
						</text>
					);
				})}

				{positionedPhases.flatMap((phaseNodes) =>
					phaseNodes.map((node) => {
						const style = STATUS_STYLES[normalizeStatus(node.feature.status)] ?? STATUS_STYLES.pending;
						return (
							<g key={node.feature.id}>
								<title>{node.feature.title}</title>
								<rect
									x={node.x}
									y={node.y}
									rx={10}
									ry={10}
									width={NODE_WIDTH}
									height={NODE_HEIGHT}
									className={cn("stroke-[1.2]", style.rect)}
								/>
								<text
									x={node.x + 10}
									y={node.y + 22}
									className={cn("pointer-events-none text-[11px] font-medium", style.text)}
								>
									{truncate(node.feature.title)}
								</text>
							</g>
						);
					}),
				)}
			</svg>
		</div>
	);
}
