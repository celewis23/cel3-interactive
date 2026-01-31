"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useScrollState } from "@/components/motion/useScrollState";

type LogoProps = {
  href?: string;
};

export function Logo({ href = "/" }: LogoProps) {
  const scrollState = useScrollState(30);
  const activated = scrollState === "activated";

  return (
    <Link href={href} aria-label="CEL3 Interactive" className="group">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: activated ? 0.95 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-baseline gap-2 select-none"
      >
        {/* CEL3 */}
        <motion.span
          className="font-semibold text-white text-base tracking-[-0.02em]"
          animate={{
            letterSpacing: activated ? "-0.03em" : "-0.02em",
          }}
          whileHover={{
            letterSpacing: "-0.01em",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          CEL3
        </motion.span>

        {/* INTERACTIVE — hidden on mobile */}
        <motion.span
          className="hidden sm:inline-block text-white/65 text-xs uppercase tracking-[0.28em]"
          animate={{
            opacity: activated ? 0.55 : 0.65,
          }}
          whileHover={{
            opacity: 0.85,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          Interactive
        </motion.span>
      </motion.div>
    </Link>
  );
}
