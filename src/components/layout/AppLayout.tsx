import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Topbar } from "./Topbar";
import { AnimatePresence, motion } from "framer-motion";
import { pageTransition } from "@/styles/motion";

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-[var(--color-background)] p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition} className="w-full min-w-0">
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
