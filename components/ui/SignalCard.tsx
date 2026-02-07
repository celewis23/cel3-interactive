"use client";

import { motion } from "framer-motion";

export default function SignalCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
      whileHover={{ borderColor: "rgba(var(--accent))!important" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* subtle signal sweep */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-24"
        initial={{ x: "-140%", opacity: 0 }}
        whileHover={{ x: "160%", opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
          mixBlendMode: "screen",
        }}
      />

      {children}
    </motion.div>
  );
}
