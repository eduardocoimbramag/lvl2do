import Link from "next/link";
import { Smartphone } from "lucide-react";
import { Logo } from "./Logo";

/* Colunas de links do footer. */
const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Navegação",
    links: [
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Classes", href: "#recursos" },
      { label: "Planos", href: "#planos" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Conta",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Registre-se", href: "/register" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de uso", href: "#" },
      { label: "Privacidade", href: "#" },
    ],
  },
];

/** Footer premium da landing page. */
export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06]">
      {/* brilho sutil no topo */}
      <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 max-w-3xl -translate-x-1/2 bg-brand-gradient opacity-40" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />

      <div className="container-page relative py-16">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* marca */}
          <div className="max-w-xs">
            <Logo size="lg" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Transforme sua rotina em uma jornada de RPG. Evolua um nível por dia.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted">
              <Smartphone size={13} className="text-brand-light" />
              Em breve para iOS e Android
            </span>
          </div>

          {/* colunas de links */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-semibold text-soft">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* barra inferior */}
        <div className="mt-12 flex flex-col items-center gap-5 border-t border-white/[0.06] pt-7 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted">
            © 2026 lvl2do. Todos os direitos reservados.
          </p>

          {/* crédito do estúdio */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted">Desenvolvido por</span>
            <a
              href="#"
              aria-label="SWN STUDIO"
              className="group inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 transition-all duration-300 hover:border-brand/40 hover:bg-white/[0.06]"
            >
              {/*
                PLACEHOLDER DA LOGO SWN STUDIO — substitua futuramente por:
                  <Image src="/swn-studio.svg" alt="SWN STUDIO" width={20} height={20} />
                mantendo o texto ao lado, se desejar.
              */}
              <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-brand-gradient font-display text-[9px] font-bold text-white shadow-glow-sm">
                S
              </span>
              <span className="font-display text-sm font-semibold tracking-wide text-soft transition-colors group-hover:text-brand-light">
                SWN STUDIO
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Link do footer: usa Next Link para rotas internas e <a> para âncoras/externos. */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    "text-sm text-muted transition-colors hover:text-soft focus-visible:outline-none focus-visible:text-soft";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
