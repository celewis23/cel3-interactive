"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useScrollState } from "@/components/motion/useScrollState";
import { PropsWithChildren } from "react";

type LogoProps = {
  /**
   * If provided, Logo renders as a link.
   * If omitted, Logo renders as a non-link (safe for wrapping).
   */
  href?: string;
  className?: string;
};

export function Logo({ href, className = "" }: LogoProps) {
  const scrollState = useScrollState(30);
  const activated = scrollState === "activated";

  const Content = (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: activated ? 0.95 : 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={[
        "flex items-baseline gap-2 select-none",
        className,
      ].join(" ")}
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
        className="font-semibold text-[1.15em] leading-none text-[rgb(var(--accent))]"
        animate={{
          scale: activated ? 0.96 : 1,
        }}
        style={{ marginLeft: "-6px" }}
        whileHover={{
          scale: 1.15,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        3
      </motion.span>

      {/* INTERACTIVE — visible on mobile */}
      <motion.span
        className="text-white/75 text-[0.65rem] sm:text-xs uppercase tracking-[0.28em]"
        animate={{
          opacity: activated ? 0.55 : 0.65,
        }}
        whileHover={{
          opacity: 1,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        Interactive
      </motion.span>
    </motion.div>
  );

  // ✅ Only wrap in Link if href is provided
  if (href) {
    return (
      <Link href={href} aria-label="CEL3 Interactive" className="group">
        {Content}
      </Link>
    );
  }

  return <div className="group">{Content}</div>;
}
