import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Auth via Supabase: atualiza a sessão e protege as rotas internas. */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto arquivos estáticos e imagens.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico)$).*)",
  ],
};
