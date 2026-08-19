/**
 * Teste ponta a ponta do fluxo de recuperação de senha.
 *
 *   1. npm run dev                          (deixe rodando)
 *   2. node scripts/test-password-recovery.mjs [http://localhost:3000]
 *
 * Cria um usuário descartável, gera um link de recuperação REAL pela Admin API
 * (sem disparar e-mail), percorre o fluxo como o usuário percorreria e confere
 * que a senha mudou de fato no banco. No final, apaga o usuário.
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local (Project Settings > API).
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3000";
const JAR = `/tmp/lvl2do-recovery-test-${process.pid}.txt`;

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON } = env;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON) exit("Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.");
if (!SERVICE) exit("Falta SUPABASE_SERVICE_ROLE_KEY no .env.local (necessária para gerar o link de teste).");

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `teste-recuperacao-${Date.now()}@exemplo-descartavel.com`;
const SENHA_ANTIGA = "SenhaAntiga123!";
const SENHA_NOVA = "SenhaNovaForte456!";

const curl = (args) => execFileSync("curl", args, { encoding: "utf8" });
let falhas = 0;
function checa(condicao, descricao, detalhe = "") {
  if (!condicao) falhas++;
  console.log(`  ${condicao ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${descricao}${detalhe ? `  \x1b[90m${detalhe}\x1b[0m` : ""}`);
}
function exit(msg) {
  console.error(`\n\x1b[31m${msg}\x1b[0m\n`);
  process.exit(1);
}

let userId;
try {
  console.log(`\nFluxo de recuperação de senha — ${BASE}\n`);

  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: SENHA_ANTIGA,
    email_confirm: true,
  });
  if (erroCriar) exit(`Não foi possível criar o usuário de teste: ${erroCriar.message}`);
  userId = criado.user.id;

  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (erroLink) exit(`Não foi possível gerar o link de recuperação: ${erroLink.message}`);

  const callbackUrl =
    `${BASE}/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}` +
    `&type=recovery&flow=recovery`;

  // --- abrir o link do e-mail -------------------------------------------
  execFileSync("rm", ["-f", JAR]);
  const redir = curl(["-s", "-o", "/dev/null", "-c", JAR, "-w", "%{redirect_url}", callbackUrl]);
  checa(redir.includes("/reset-password"), "o link leva para /reset-password", redir);

  const jar = readFileSync(JAR, "utf8");
  checa(/l2d-recovery/.test(jar), "cookie de recuperação emitido");
  checa(/auth-token/.test(jar), "sessão do Supabase estabelecida");

  const status = curl(["-s", "-o", "/dev/null", "-b", JAR, "-w", "%{http_code}", `${BASE}/reset-password`]);
  checa(status.trim() === "200", "/reset-password abre com o link válido", `HTTP ${status}`);

  // --- política de senha validada no servidor ---------------------------
  const curta = curl([
    "-s", "-b", JAR, "-X", "POST", `${BASE}/api/auth/reset-password`,
    "-H", "Content-Type: application/json", "-d", '{"password":"123"}',
  ]);
  checa(curta.includes("ao menos"), "servidor recusa senha fora da política", curta);

  // --- troca efetiva ----------------------------------------------------
  const troca = curl([
    "-s", "-b", JAR, "-c", JAR, "-X", "POST", `${BASE}/api/auth/reset-password`,
    "-H", "Content-Type: application/json", "-d", JSON.stringify({ password: SENHA_NOVA }),
  ]);
  checa(troca.includes('"ok":true'), "senha alterada com sucesso", troca);

  const reuso = curl([
    "-s", "-b", JAR, "-X", "POST", `${BASE}/api/auth/reset-password`,
    "-H", "Content-Type: application/json", "-d", JSON.stringify({ password: "Terceira789!" }),
  ]);
  checa(!reuso.includes('"ok":true'), "mesmo link não troca a senha duas vezes", reuso);

  // --- a senha mudou mesmo? --------------------------------------------
  const publico = createClient(URL_, ANON, { auth: { persistSession: false } });
  const nova = await publico.auth.signInWithPassword({ email, password: SENHA_NOVA });
  checa(!nova.error && !!nova.data.session, "login com a NOVA senha funciona", nova.error?.message ?? "");
  const antiga = await publico.auth.signInWithPassword({ email, password: SENHA_ANTIGA });
  checa(!!antiga.error, "login com a senha ANTIGA é recusado", antiga.error ? "" : "ACEITOU — falha grave");

  // --- token de uso único ----------------------------------------------
  execFileSync("rm", ["-f", JAR]);
  const denovo = curl(["-s", "-o", "/dev/null", "-c", JAR, "-w", "%{redirect_url}", callbackUrl]);
  checa(denovo.includes("/forgot-password?error="), "token de recuperação é de uso único", denovo);

  // --- guards sem link válido ------------------------------------------
  const semCookie = curl(["-s", "-o", "/dev/null", "-w", "%{redirect_url}", `${BASE}/reset-password`]);
  checa(semCookie.includes("/forgot-password"), "/reset-password é inacessível sem link");
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  execFileSync("rm", ["-f", JAR]);
}

console.log(
  falhas === 0
    ? "\n\x1b[32mTodas as verificações passaram.\x1b[0m\n"
    : `\n\x1b[31m${falhas} verificação(ões) falharam.\x1b[0m\n`,
);
process.exit(falhas === 0 ? 0 : 1);
