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
					<div className="min-h-screen bg-background text-foreground">
						<div className="flex min-h-screen">
							<div className="hidden md:block md:w-[240px] md:shrink-0">
								<Sidebar />
							</div>
							<main className="flex-1 pb-20 md:pb-0">
								<div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">{children}</div>
							</main>
						</div>
						<BottomTabs />
					</div>
				</Providers>
			</body>
		</html>
	);
}
