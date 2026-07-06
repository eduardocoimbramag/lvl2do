import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Auth via Supabase: atualiza a sessão e protege as rotas internas. */
export async function middleware(request: NextRequest) {
  // Webhooks (ex.: RevenueCat) NÃO passam pelo auth do Supabase — eles não têm
  // cookie de sessão e seriam redirecionados para /login (307). A própria rota
  // se protege via header Authorization. Deixa passar direto. (Checagem
  // explícita além do matcher, por segurança/clareza.)
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto arquivos estáticos, imagens e webhooks (/api/webhooks/*).
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico)$).*)",
  ],
};
