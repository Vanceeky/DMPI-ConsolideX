"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FilePlus2, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",         href: "/",                    icon: LayoutGrid },
  { label: "New Consolidation", href: "/consolidation/upload", icon: FilePlus2  },
];

const bottomItems = [
  { label: "Help", href: "/help", icon: CircleHelp },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-[220px] shrink-0 h-full bg-white border-r border-[#e5e7eb]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#e5e7eb]">
        <p className="text-[18px] font-bold text-[#00488d] leading-tight tracking-tight">
          ConsolideX
        </p>
        <p className="text-[12px] text-[#6b7280] mt-0.5">Enterprise Data</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#00488d] text-white"
                  : "text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]"
              )}
            >
              <Icon
                className={cn("shrink-0", active ? "text-white" : "text-[#6b7280]")}
                size={16}
                strokeWidth={2}
              />
              <span className="leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-[#e5e7eb] space-y-0.5">
        {bottomItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#00488d] text-white"
                  : "text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]"
              )}
            >
              <Icon
                className={cn("shrink-0", active ? "text-white" : "text-[#6b7280]")}
                size={16}
                strokeWidth={2}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
