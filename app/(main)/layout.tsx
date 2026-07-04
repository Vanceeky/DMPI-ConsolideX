import { Sidebar } from "@/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { ConsolidationProvider } from "@/lib/consolidation/context";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConsolidationProvider>
      <div className="flex h-screen overflow-hidden bg-[#f3f4f6]">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ConsolidationProvider>
  );
}
