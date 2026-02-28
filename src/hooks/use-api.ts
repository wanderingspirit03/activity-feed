"use client";

import useSWR, { type SWRConfiguration } from "swr";

export async function fetcher<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Request failed (${response.status}): ${response.statusText}`);
	}
	return (await response.json()) as T;
}

function useApi<T>(
	url: string,
	refreshInterval: number,
	opts?: SWRConfiguration<T, Error>,
) {
	const { data, error, isLoading, mutate } = useSWR<T, Error>(url, fetcher, {
		refreshInterval,
		revalidateOnFocus: false,
		...opts,
	});

	return { data, error, isLoading, mutate };
}

export function useRuns(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/runs", 10_000, opts);
}

export function useScores(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/scores", 30_000, opts);
}

export function useHealth(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/health", 15_000, opts);
}

export function useCron(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/cron", 30_000, opts);
}

export function useMemory(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/memory", 30_000, opts);
}

export function useActors(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/actors", 15_000, opts);
}

export function useDlq(opts?: SWRConfiguration<any, Error>) {
	return useApi<any>("/api/dlq", 15_000, opts);
}
