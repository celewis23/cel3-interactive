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
        {/* CEL */}
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
          CEL
        </motion.span>

        {/* 3 — accent + slightly larger */}
        <motion.span
          className="font-semibold text-[1.15em] leading-none text-sky-400"
          animate={{
            scale: activated ? 0.96 : 1,
          }}
          style={{marginLeft: "-6px"}}
          whileHover={{
            scale: 1.15,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
         3
        </motion.span>

        {/* INTERACTIVE — now visible on mobile */}
        <motion.span
          className="text-white/65 text-[0.65rem] sm:text-xs uppercase tracking-[0.28em]"
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
