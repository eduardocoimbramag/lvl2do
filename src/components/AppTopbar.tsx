import { UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";

/** Topbar mobile das páginas internas (a sidebar fica oculta no mobile). */
export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink/80 px-5 backdrop-blur-xl md:hidden">
      <Logo size="sm" />
      <UserButton />
    </header>
  );
}
