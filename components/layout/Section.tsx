import type { ReactNode } from "react";
import { Container } from "./Container";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  variant?: "default" | "tight" | "wide";
};

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  variant = "default",
}: SectionProps) {
  const padding =
    variant === "tight"
      ? "py-16 md:py-20"
      : variant === "wide"
        ? "py-24 md:py-32"
        : "py-20 md:py-28";

  return (
    <section id={id} className={padding}>
      <Container>
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs tracking-[0.25em] uppercase text-white/50">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-white">
            {title}
          </h2>

          {subtitle ? (
            <p className="mt-4 text-base md:text-lg text-white/70">
              {subtitle}
            </p>
          ) : null}
        </div>

        {children ? <div className="mt-10 md:mt-12">{children}</div> : null}
      </Container>
    </section>
  );
}
