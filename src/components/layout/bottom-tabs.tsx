"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, ListTodo, Radio, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type TabItem = {
	href: string;
	label: string;
	icon: LucideIcon;
};

const TABS: TabItem[] = [
	{ href: "/", label: "Home", icon: Home },
	{ href: "/live", label: "Live", icon: Radio },
	{ href: "/tasks", label: "Tasks", icon: ListTodo },
	{ href: "/quality", label: "Quality", icon: BarChart3 },
	{ href: "/system", label: "System", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabs() {
	const pathname = usePathname();

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
			<div className="grid grid-cols-5 px-2 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{TABS.map(({ href, label, icon: Icon }) => {
					const active = isActivePath(pathname, href);
					return (
						<Link
							key={href}
							href={href}
							aria-label={label}
							className={cn(
								"flex h-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
								active && "bg-primary/10 text-primary",
							)}
						>
							<Icon className="h-5 w-5" />
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
