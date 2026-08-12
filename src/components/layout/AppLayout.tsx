import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Topbar } from "./Topbar";
import { AnimatePresence, motion } from "framer-motion";
import { pageTransition } from "@/styles/motion";

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="flex h-screen flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[var(--color-background)] p-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
