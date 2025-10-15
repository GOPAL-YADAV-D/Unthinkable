"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FolderKanban, CheckSquare, CalendarIcon, Clock3, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, comingSoon: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, comingSoon: true },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare, comingSoon: true },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, comingSoon: true },
  { href: "/time", label: "Time Management", icon: Clock3, comingSoon: true },
  { href: "/reports", label: "Reports", icon: BarChart3, comingSoon: true },
  { href: "/settings", label: "Settings", icon: Settings, comingSoon: true },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex md:flex-col gap-2 p-4 border-r bg-sidebar text-sidebar-foreground min-h-screen w-60">
      <div className="px-2 py-1 text-sm font-semibold tracking-wide">Menu</div>
      <nav className="flex-1 flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon, comingSoon }) => {
          const targetHref = comingSoon ? `/coming-soon?feature=${encodeURIComponent(label)}` : href
          const active = (!comingSoon && pathname === href) || (comingSoon && pathname === "/coming-soon")
          return (
            <Link
              key={href}
              href={targetHref}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
              title={comingSoon ? `${label} • Feature coming soon` : label}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-sm">{label}</span>
              {comingSoon ? (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Soon
                </Badge>
              ) : null}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
