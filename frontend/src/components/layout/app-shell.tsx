import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./sidebar";
import { useSSE } from "../../hooks/useSSE";

export function AppShell() {
  useSSE();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
