"use client";

import { CrystalIcon, GoldCoinIcon } from "./RewardIcons";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Saldos das duas moedas, no rodapé da sidebar (acima do card do usuário).
 *
 * Cristais vêm de `profiles.crystals`. Ouro vem de `profiles.gold`, coluna que
 * AINDA NÃO EXISTE — por isso o `?? 0`: o contador já ocupa o lugar dele e
 * passa a mostrar o valor real assim que a coluna for criada, sem tocar aqui.
 */

/**
 * Formata o saldo, compactando só quando isso realmente economiza largura.
 *
 * Duas armadilhas que este formato evita, e que a versão anterior tinha:
 *
 *  1. ARREDONDAR PARA CIMA. `Intl` com notation "compact" transforma 999.999 em
 *     "1 mi" — o contador mostraria um saldo que o usuário NÃO tem. Num contador
 *     de moeda esse é o pior sentido possível de arredondamento, então usamos
 *     `Math.floor` na fração: quem tem 1.999.999 vê "1,9 mi", nunca "2 mi".
 *  2. COMPACTAR CEDO DEMAIS. Entre 100 mil e 999 mil o compacto é IGUAL ou MAIOR
 *     que o número cheio ("123,5 mil" tem 9 caracteres; "123.456" tem 7), então
 *     compactar ali só introduz erro sem ganhar espaço. O ganho real começa no
 *     milhão ("1,5 mi" contra "1.500.000").
 *
 * Também não dependemos de `notation: "compact"`: engines antigas ignoram a
 * opção em silêncio e devolvem o formato longo — justamente no caso em que o
 * layout contava com o curto.
 */
function formatSaldo(valor: number): string {
  if (valor < 1_000_000) return valor.toLocaleString("pt-BR");
  const [divisor, sufixo] =
    valor < 1_000_000_000 ? [1_000_000, "mi"] : [1_000_000_000, "bi"];
  // trunca em vez de arredondar: nunca exibir mais do que se tem
  const truncado = Math.floor((valor / divisor) * 10) / 10;
  return `${truncado.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${sufixo}`;
}

interface MoedaProps {
  icone: React.ReactNode;
  valor: number;
  /** nome por extenso, para leitor de tela e para o title do hover. */
  nome: string;
  className?: string;
}

function Moeda({ icone, valor, nome, className }: MoedaProps) {
  const exato = valor.toLocaleString("pt-BR");
  return (
    <div
      // title dá o número exato quando o compacto arredonda
      title={`${exato} ${nome}`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5",
        className,
      )}
    >
      {icone}
      <span className="sr-only">{nome}:</span>
      <span className="min-w-0 truncate font-display text-xs font-semibold tabular-nums text-soft">
        {formatSaldo(valor)}
      </span>
    </div>
  );
}

export function CurrencyBalance({ className }: { className?: string }) {
  const { profile } = useAuth();
  const crystals = profile?.crystals ?? 0;
  const gold = profile?.gold ?? 0;

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Moeda
        icone={<CrystalIcon size={15} className="shrink-0" />}
        valor={crystals}
        nome="cristais de energia"
      />
      <Moeda
        icone={<GoldCoinIcon size={15} className="shrink-0" />}
        valor={gold}
        nome="moedas de ouro"
      />
    </div>
  );
}
