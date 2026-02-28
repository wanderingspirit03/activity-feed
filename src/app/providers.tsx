"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { fetcher } from "@/hooks/use-api";
import { useWebsocket } from "@/hooks/use-websocket";

function WebsocketBootstrap() {
	useWebsocket();
	return null;
}

export function Providers({ children }: { children: ReactNode }) {
	return (
		<SWRConfig
			value={{
				fetcher,
				errorRetryCount: 3,
				errorRetryInterval: 2_000,
				onErrorRetry: (error, key, _config, revalidate, { retryCount }) => {
					if (error?.name === "AbortError") return;
					if (retryCount >= 3) return;

					setTimeout(() => {
						void revalidate({ retryCount });
					}, Math.min(1_000 * 2 ** retryCount, 10_000));
				},
			}}
		>
			<WebsocketBootstrap />
			{children}
		</SWRConfig>
	);
}
