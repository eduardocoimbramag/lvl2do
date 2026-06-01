import { Logo } from "./Logo";
import { landingNav } from "@/data/navigation";

/** Footer simples da landing page. */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="container-page flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">Seu desenvolvimento em jogo.</p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {landingNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-soft"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="container-page mt-8 border-t border-white/[0.04] pt-6">
        <p className="text-center text-xs text-muted">
          © 2026 lvl2do. Projeto de portfólio — front-end visual.
        </p>
      </div>
    </footer>
  );
}
