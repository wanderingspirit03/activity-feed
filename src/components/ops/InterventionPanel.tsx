"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type InterventionPanelProps = {
	opId: string;
	status: string;
};

export default function InterventionPanel({ opId, status }: InterventionPanelProps) {
	const [message, setMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isSent, setIsSent] = useState(false);
	const sentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (sentTimerRef.current) {
				clearTimeout(sentTimerRef.current);
			}
		};
	}, []);

	if (status !== "running") {
		return null;
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = message.trim();
		if (!trimmed || isSending) {
			return;
		}

		setIsSending(true);

		try {
			const response = await fetch(`/api/ops/${opId}/action`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "intervene",
					message: trimmed,
				}),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(payload?.error ?? "Failed to send intervention");
			}

			setMessage("");
			setIsSent(true);

			if (sentTimerRef.current) {
				clearTimeout(sentTimerRef.current);
			}
			sentTimerRef.current = setTimeout(() => setIsSent(false), 2000);
		} catch (error) {
			console.error("Failed to send intervention", error);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 shadow-sm"
		>
			<textarea
				rows={2}
				value={message}
				onChange={(event) => setMessage(event.target.value)}
				placeholder="Send an instruction to the running operation..."
				className={cn(
					"w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100",
					"placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
				)}
			/>

			<div className="mt-2 flex items-center justify-end gap-2">
				{isSent ? <span className="text-xs text-emerald-400">Sent!</span> : null}
				<button
					type="submit"
					disabled={isSending || message.trim().length === 0}
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-500/60 px-2.5 text-xs font-medium text-blue-300",
						"transition-colors hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
						"disabled:cursor-not-allowed disabled:opacity-60",
					)}
				>
					{isSending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<ArrowRight className="size-3.5" />
					)}
					<span>Send</span>
				</button>
			</div>
		</form>
	);
}
