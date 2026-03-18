"use client";

import { Loader2, Plus, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type NewOpDialogProps = {
	open: boolean;
	onClose: () => void;
	onSuccess?: () => void;
};

export default function NewOpDialog({ open, onClose, onSuccess }: NewOpDialogProps) {
	const [description, setDescription] = useState("");
	const [autoPlan, setAutoPlan] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isSubmitting) {
				onClose();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [open, isSubmitting, onClose]);

	useEffect(() => {
		if (!open) return;
		setDescription("");
		setAutoPlan(true);
		setError(null);
	}, [open]);

	if (!open) {
		return null;
	}

	const handleClose = () => {
		if (isSubmitting) return;
		onClose();
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedDescription = description.trim();

		if (!trimmedDescription) {
			setError("Description is required.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/ops", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					description: trimmedDescription,
					autoPlan,
				}),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(payload?.error ?? "Failed to create operation");
			}

			onSuccess?.();
			onClose();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Failed to create operation");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={handleClose} role="presentation">
			<div className="flex h-full w-full items-end sm:items-center sm:justify-center">
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Create new operation"
					onClick={(event) => event.stopPropagation()}
					className={cn(
						"h-full w-full border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl",
						"sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl",
					)}
				>
					<div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
						<div className="flex items-center gap-2">
							<div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-1.5 text-blue-300">
								<Plus className="size-4" />
							</div>
							<div>
								<h2 className="text-sm font-semibold text-zinc-100 sm:text-base">New operation</h2>
								<p className="text-xs text-zinc-400">Describe what should be planned and executed.</p>
							</div>
						</div>
						<button
							type="button"
							onClick={handleClose}
							disabled={isSubmitting}
							className="rounded-md border border-zinc-700 p-1.5 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
						>
							<X className="size-4" />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="flex h-[calc(100%-61px)] flex-col sm:h-auto">
						<div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
							<div className="space-y-2">
								<label htmlFor="new-op-description" className="text-xs font-medium text-zinc-300">
									Description
								</label>
								<textarea
									id="new-op-description"
									required
									rows={4}
									autoFocus
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									placeholder="Describe the operation objective, scope, and constraints..."
									className={cn(
										"w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100",
										"placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
									)}
								/>
							</div>

							<label className="flex items-center gap-2 text-sm text-zinc-300">
								<input
									type="checkbox"
									checked={autoPlan}
									onChange={(event) => setAutoPlan(event.target.checked)}
									className="size-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500"
								/>
								<span>Auto-plan this operation immediately</span>
							</label>

							{error ? <p className="text-xs text-red-400">{error}</p> : null}
						</div>

						<div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3 sm:px-6">
							<button
								type="button"
								onClick={handleClose}
								disabled={isSubmitting}
								className="inline-flex h-9 items-center rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || description.trim().length === 0}
								className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-500/70 bg-blue-500/20 px-3 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/30 disabled:opacity-60"
							>
								{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
								<span>Create operation</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
