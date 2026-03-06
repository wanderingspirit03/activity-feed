"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Home, ListTodo, Radio, Settings, type LucideIcon } from "lucide-react";

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
	{ href: "/ops/history", label: "History", icon: ClipboardList },
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
			<ul className="grid grid-cols-6">
				{TABS.map((item) => {
					const Icon = item.icon;
					const active = isActivePath(pathname, item.href);

					return (
						<li key={item.href}>
							<Link
								href={item.href}
								className={cn(
									"flex h-16 flex-col items-center justify-center gap-1 text-[11px]",
									active ? "text-primary" : "text-muted-foreground",
								)}
							>
								<Icon className={cn("size-4", active && "text-primary")} />
								<span className="truncate">{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
