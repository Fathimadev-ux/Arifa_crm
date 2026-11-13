"use client";

import { motion } from "motion/react";
import { PAGE_TRANSITION } from "@/config/motion";

/** Templates re-mount on every navigation, so each page fades in smoothly. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={PAGE_TRANSITION}>
      {children}
    </motion.div>
  );
}
