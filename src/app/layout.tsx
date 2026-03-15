import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "olo · activity",
	description: "Real-time activity feed",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className={`${inter.variable} font-sans antialiased`}>
				<TooltipProvider delayDuration={300}>
					{children}
				</TooltipProvider>
			</body>
		</html>
	);
}
