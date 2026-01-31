import HeroParallax from "./HeroParallax";

// If you already have a HeroSystem component, import it here:
// import HeroSystem from "./HeroSystem";

export function Hero() {
  return (
    <HeroParallax className="bg-black">
      {/* 
        IMPORTANT:
        Put your EXISTING hero markup inside this container.
        Do not change your layout structure unless you want to.
      */}
      <div className="mx-auto max-w-6xl px-4">
        {/* Replace everything in this block with your current Hero content */}
        <div className="py-16 md:py-24">
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">
            CEL3 Interactive
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-white">
            Systems that move.
          </h1>
          <p className="mt-5 max-w-2xl text-white/70 text-base md:text-lg">
            Interactive design, motion systems, and premium builds that feel alive.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/#fit"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/15 transition-colors"
            >
              Let’s See If We’re a Fit →
            </a>
            <a
              href="/work"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10 transition-colors"
            >
              View Work
            </a>
          </div>
        </div>
      </div>
    </HeroParallax>
  );
}
