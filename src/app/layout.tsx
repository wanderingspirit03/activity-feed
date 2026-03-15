import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

import { BottomTabs } from "@/components/layout/bottom-tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/app/providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Control Center",
	description: "Unified monitoring dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" className="dark">
			<body className={cn(inter.className, "min-h-screen bg-background text-foreground")}>
				<Providers>
					<div className="flex min-h-screen">
						{/* Sidebar — desktop only */}
						<aside className="hidden md:flex md:w-[240px] md:shrink-0 md:flex-col border-r border-border bg-card">
							<Sidebar />
						</aside>

						{/* Main content */}
						<main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">
							{children}
						</main>
					</div>

					{/* Bottom tabs — mobile only */}
					<BottomTabs />
				</Providers>
			</body>
		</html>
	);
}
