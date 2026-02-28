"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, ListTodo, Radio, Settings, type LucideIcon } from "lucide-react";

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
		<aside className="sticky top-0 flex h-screen w-full flex-col border-r border-border bg-card">
			<div className="flex items-center gap-2 border-b border-border px-4 py-4">
				<span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
				<p className="text-sm font-semibold tracking-wide text-foreground">Control Center</p>
			</div>

			<nav className="flex-1 space-y-1 px-3 py-4">
				{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
					const active = isActivePath(pathname, href);
					return (
						<Link
							key={href}
							href={href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
								active && "bg-primary/10 text-primary",
							)}
						>
							<Icon className="h-4 w-4" />
							<span>{label}</span>
						</Link>
					);
				})}
			</nav>

			<div className="border-t border-border px-4 py-3">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
					<span>Connected</span>
				</div>
			</div>
		</aside>
	);
}
