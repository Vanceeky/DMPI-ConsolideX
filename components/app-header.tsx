"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const routeLabels: Record<string, string> = {
  "": "Home",
  consolidation: "New Consolidation",
  upload: "Upload",
  validate: "Validate",
  process: "Process",
  download: "Download",
  history: "Consolidation History",
  settings: "Settings",
  profile: "Profile",
  help: "Help",
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
  ];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = routeLabels[segment] ?? segment;
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex items-center justify-between h-[52px] px-6 bg-white border-b border-[#e5e7eb] shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[13px]">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight size={13} className="text-[#9ca3af]" strokeWidth={2} />
              )}
              {isLast ? (
                <span className="text-[#111827] font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[#6b7280] hover:text-[#374151] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center justify-center w-8 h-8 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors">
          <Bell size={16} strokeWidth={2} />
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors">
          <CircleHelp size={16} strokeWidth={2} />
        </button>
        <Button size="sm" className="bg-[#00488d] hover:bg-[#003a72] text-white text-[13px] h-8 px-3 rounded-lg ml-1">
          DMPI
        </Button>
        <div className="w-8 h-8 rounded-full bg-[#00488d] flex items-center justify-center ml-1 shrink-0 overflow-hidden">
          <span className="text-white text-[11px] font-semibold">JM</span>
        </div>
      </div>
    </header>
  );
}
