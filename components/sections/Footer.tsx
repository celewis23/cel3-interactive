import { Container } from "../layout/Container";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <Container>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white font-semibold">CEL3 Interactive</p>
            <p className="mt-2 text-sm text-white/60">Formerly CEL3 Media</p>
          </div>
          <div className="flex gap-6 text-sm text-white/60">
            <a className="hover:text-white" href="#work">
              Work
            </a>
            <a className="hover:text-white" href="#capabilities">
              Capabilities
            </a>
            <a className="hover:text-white" href="#fit">
              Fit
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
