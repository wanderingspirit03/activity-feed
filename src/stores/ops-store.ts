"use client";

import { create } from "zustand";

export type OpsFeatureStatus = "pending" | "in-progress" | "done" | "failed" | "fix-needed";

export type OpsFeature = {
	id: string;
	title: string;
	status: OpsFeatureStatus;
	phase: number;
	assignedModel: string;
	attempts: number;
};

export type OpsEvent = {
	id: string;
	timestamp: number;
	type: string;
	title: string;
	featureId?: string;
	status?: OpsFeatureStatus;
	verdict?: string;
};

export type OpsData = {
	opId: string;
	title: string;
	status: string;
	features: OpsFeature[];
	currentPhase: number;
	totalPhases: number;
	startedAt: number;
	updatedAt: number;
	events: OpsEvent[];
};

type OpsStore = {
	ops: OpsData[];
	addOrUpdateOp: (op: OpsData) => void;
	processEvent: (envelope: any) => void;
};

function normalizeOp(op: OpsData): OpsData {
	return {
		...op,
		features: Array.isArray(op.features) ? op.features : [],
		events: Array.isArray(op.events) ? op.events : [],
		startedAt: Number(op.startedAt) || Date.now(),
		updatedAt: Number(op.updatedAt) || Date.now(),
	};
}

function sortOpsByUpdatedAt(ops: OpsData[]): OpsData[] {
	return [...ops].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export const useOpsStore = create<OpsStore>((set, get) => ({
	ops: [],
	addOrUpdateOp: (op) => {
		const normalized = normalizeOp(op);
		set((state) => {
			const idx = state.ops.findIndex((existing) => existing.opId === normalized.opId);
			if (idx === -1) {
				return { ops: sortOpsByUpdatedAt([...state.ops, normalized]) };
			}

			const next = [...state.ops];
			next[idx] = {
				...next[idx],
				...normalized,
				features: normalized.features,
				events: normalized.events,
			};
			return { ops: sortOpsByUpdatedAt(next) };
		});
	},
	processEvent: (envelope) => {
		const type = envelope?.type;
		if (!type) return;

		if (type === "ops.list" && Array.isArray(envelope.data)) {
			set({ ops: sortOpsByUpdatedAt(envelope.data.map((op: OpsData) => normalizeOp(op))) });
			return;
		}

		if (type === "ops.update" && envelope.data?.opId) {
			get().addOrUpdateOp(envelope.data as OpsData);
		}
	},
}));
