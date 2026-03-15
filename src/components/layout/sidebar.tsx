"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Home, ListTodo, Radio, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Home", icon: Home },
	{ href: "/live", label: "Live", icon: Radio },
	{ href: "/tasks", label: "Tasks", icon: ListTodo },
	{ href: "/ops/history", label: "Operations", icon: ClipboardList },
	{ href: "/quality", label: "Quality", icon: BarChart3 },
	{ href: "/system", label: "System", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r border-border bg-card md:flex">
			<div className="flex items-center gap-2 border-b border-border px-4 py-4">
				<span className="inline-block h-2 w-2 rounded-full bg-primary" />
				<p className="text-sm font-semibold tracking-wide">Control Center</p>
			</div>

			<nav className="flex-1 space-y-1 px-3 py-4">
				{NAV_ITEMS.map((item) => {
					const active = isActivePath(pathname, item.href);
					const Icon = item.icon;

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
								active
									? "bg-primary/15 text-primary"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<Icon className="size-4" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
