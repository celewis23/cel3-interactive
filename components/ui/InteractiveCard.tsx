"use client";

import { motion, useReducedMotion } from "framer-motion";
import MicroViz from "@/components/ui/MicroViz";

type Variant = "respond" | "adapt" | "evolve";

export default function InteractiveCard({
  variant,
  eyebrow,
  title,
  desc,
  footLeft,
  footRight,
}: {
  variant: Variant;
  eyebrow: string;
  title: string;
  desc: string;
  footLeft: string;
  footRight: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      animate="rest"
      className="group relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
    >
      {/* Scene layer (cinematic) */}
      <motion.div
        variants={{
          rest: { opacity: 0, scale: 0.985 },
          hover: { opacity: 1, scale: 1 },
        }}
        transition={reduce ? { duration: 0 } : { duration: 0.42, ease: "easeOut" }}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Accent scene fill */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(520px 240px at 18% 26%, rgba(var(--accent),0.22), transparent 60%), radial-gradient(420px 220px at 82% 72%, rgba(var(--accent),0.14), transparent 60%)",
          }}
        />

        {/* Subtle technical grid texture */}
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.20)_1px,transparent_0)] [background-size:18px_18px]" />

        {/* One-pass scanline (quiet) */}
        {!reduce && (
          <motion.div
            className="absolute inset-y-0 w-28"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)",
              mixBlendMode: "screen",
            }}
            variants={{
              rest: { x: -140, opacity: 0 },
              hover: { x: 560, opacity: 0.9 },
            }}
            transition={{ duration: 0.9, ease: "linear" }}
          />
        )}
      </motion.div>

      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]"
              variants={{
                rest: { opacity: 0.28, scale: 1 },
                hover: { opacity: 0.75, scale: 1.1 },
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              {eyebrow}
            </p>
          </div>

          {/* tiny “status” tick */}
          <motion.div
            className="h-2 w-2 rounded-full border border-white/15 bg-white/5"
            variants={{
              rest: { opacity: 0.35 },
              hover: { opacity: 0.7 },
            }}
            transition={{ duration: 0.25 }}
          />
        </div>

        <motion.h3
          className="mt-4 text-lg font-semibold tracking-tight text-white"
          variants={{
            rest: { y: 0, opacity: 0.95 },
            hover: { y: -2, opacity: 1 },
          }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        >
          {title}
        </motion.h3>

        <motion.p
          className="mt-3 text-sm text-white/70"
          variants={{
            rest: { opacity: 0.72 },
            hover: { opacity: 0.9 },
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {desc}
        </motion.p>

        {/* Micro-dashboard (technical) */}
        <motion.div
          className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4 overflow-hidden"
          variants={{
            rest: { opacity: 0.9, y: 0 },
            hover: { opacity: 1, y: -1 },
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <MicroViz variant={variant} />
        </motion.div>

        {/* Footer row */}
        <div className="mt-5 flex items-center justify-between text-[10px] tracking-[0.22em] uppercase">
          <span className="text-white/45">{footLeft}</span>
          <motion.span
            className="text-white/55"
            variants={{ rest: { opacity: 0.55 }, hover: { opacity: 0.9 } }}
            transition={{ duration: 0.25 }}
          >
            {footRight}
          </motion.span>
        </div>
      </div>

      {/* Gloss */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/6 to-white/0" />
      </div>
    </motion.article>
  );
}
