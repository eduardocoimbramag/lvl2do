/**
 * ⚠️ EXEMPLO — NÃO ATIVO.
 *
 * Este arquivo é um PLACEHOLDER de referência para a futura proteção de rotas
 * com Clerk. Ele NÃO está em uso (o nome real precisa ser `middleware.ts`).
 *
 * COMO ATIVAR NO FUTURO:
 * 1. Instale o Clerk:        npm install @clerk/nextjs
 * 2. Configure as variáveis: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY e CLERK_SECRET_KEY
 * 3. Envolva o app com <ClerkProvider> em src/app/layout.tsx
 * 4. Renomeie este arquivo para `middleware.ts` (na raiz do projeto)
 * 5. Substitua /login e /register pelos componentes <SignIn /> e <SignUp />
 *
 * Siga sempre o prompt/documentação OFICIAL de integração do Clerk.
 *
 * --------------------------------------------------------------------------
 * Exemplo de implementação (descomentar ao integrar):
 *
 * import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
 *
 * // Rotas internas que serão protegidas:
 * const isProtectedRoute = createRouteMatcher([
 *   "/dashboard(.*)",
 *   "/missions(.*)",
 *   "/progress(.*)",
 *   "/profile(.*)",
 * ]);
 *
 * export default clerkMiddleware(async (auth, req) => {
 *   if (isProtectedRoute(req)) {
 *     await auth.protect();
 *   }
 * });
 *
 * export const config = {
 *   matcher: [
 *     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
 *     "/(api|trpc)(.*)",
 *   ],
 * };
 * --------------------------------------------------------------------------
 */

export {};
