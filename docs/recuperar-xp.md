# Recuperar meu XP — passo a passo

Guia curto. É só seguir na ordem e copiar/colar. Não precisa entender o que
cada comando faz.

**Seu caso:** o app tinha um defeito que apagava seu XP toda vez que a página
carregava. O defeito **já foi corrigido no código**. Falta agora devolver o XP
que você já tinha ganhado: **160 XP**.

---

## Passo 1 — Recarregue o app (importante)

Antes de qualquer coisa, abra o lvl2do no navegador e aperte:

```
Cmd + Shift + R
```

E feche as outras abas do lvl2do que estiverem abertas.

**Por que isso primeiro:** o navegador pode estar guardando a versão antiga do
app, a que apagava o XP. Se você restaurar o XP antes de recarregar, ele apaga
de novo. Recarregando, você garante que está rodando a versão corrigida.

---

## Passo 2 — Devolva o XP

> **Antes:** não conclua missões enquanto roda os passos 2 e 3. Uma conclusão
> no meio da execução pode não ser contada. Leva menos de um minuto.

Abra o **SQL Editor** do Supabase, cole o bloco inteiro abaixo e clique em Run.

```sql
update public.profiles p
   set total_xp = v.total,
       level    = public.xp_level_from_total(v.total)
  from (
    select sum(credited_xp)::int as total
      from public.mission_completions
     where user_id = 'b0411a85-faaa-42f9-843f-df3dc4f01852'
       and reverted_at is null
  ) v
 where p.id = 'b0411a85-faaa-42f9-843f-df3dc4f01852'
   and p.total_xp < v.total;
```

**O que esperar:** ele avisa que atualizou 1 linha (algo como `Success. 1 rows`).

Este comando é seguro: ele só **aumenta** o XP, nunca diminui. Se você rodar
duas vezes sem querer, não acontece nada de errado na segunda.

---

## Passo 3 — Acerte o contador do dia

Cole este segundo bloco e clique em Run.

```sql
update public.profiles p set
  daily_xp = coalesce((
    select sum(credited_xp) from public.mission_completions
     where user_id = p.id and reverted_at is null
       and completed_for_date = (now() at time zone 'America/Sao_Paulo')::date), 0),
  daily_xp_date = (now() at time zone 'America/Sao_Paulo')::date,
  yesterday_xp = coalesce((
    select sum(credited_xp) from public.mission_completions
     where user_id = p.id and reverted_at is null
       and completed_for_date = (now() at time zone 'America/Sao_Paulo')::date - 1), 0),
  yesterday_xp_date = (now() at time zone 'America/Sao_Paulo')::date - 1
 where p.id = 'b0411a85-faaa-42f9-843f-df3dc4f01852';
```

**Para que serve:** o painel mostra "XP diário 0 / 300". Este comando acerta
esse número para o valor certo de hoje. É só visual — o limite de 300 por dia
sempre funcionou direito, mesmo com o defeito.

---

## Passo 4 — Confira se deu certo

Cole este bloco (ele só consulta, não muda nada) e clique em Run.

```sql
select
  p.nickname,
  p.total_xp                              as xp_no_app,
  coalesce(sum(c.credited_xp), 0)::int    as xp_que_voce_ganhou
from public.profiles p
left join public.mission_completions c
       on c.user_id = p.id and c.reverted_at is null
where p.id = 'b0411a85-faaa-42f9-843f-df3dc4f01852'
group by p.nickname, p.total_xp;
```

**O que esperar:** as duas colunas com o **mesmo número (160)**.

Se estiverem iguais, deu certo. Pode fechar o SQL Editor.

---

## Passo 5 — Veja no app

Volte ao lvl2do e recarregue a página.

Você deve ver:

- **160 XP** no lugar de 0
- Nível 1 (160 ainda é nível 1 — o nível 2 começa em 800)
- "Faltam 640 XP para o próximo nível"

---

## Passo 6 — O teste final

Recarregue a página **3 vezes seguidas**. Depois rode o comando do Passo 4 de
novo.

Se os dois números continuarem iguais (160 e 160), **acabou** — o defeito era
exatamente isso: o XP sumia a cada carregamento.

---

## Se algo der errado

**O XP voltou a zerar depois de recarregar**
Alguma aba antiga ainda está aberta com a versão velha do app. Feche todas,
dê `Cmd + Shift + R` e refaça os passos 2 a 4.

**Os dois números do Passo 4 estão diferentes**
Não rode mais nada e me avise, dizendo quais números apareceram.

**Deu erro vermelho no SQL Editor**
Copie a mensagem de erro inteira e me mande. Nenhum desses comandos apaga
dados, então não tem risco de ter estragado algo.

---

## Uma coisa que ficou para depois

Existe uma proteção extra (a "Parte 3" do arquivo
`supabase/2026-xp-fix.sql`) que impede o defeito de voltar por outro caminho.
Ela está **desativada de propósito** — não rode ainda. Estou terminando de
conferir se ela não atrapalha outras partes do app, e te aviso quando puder.

Nada do que está neste guia depende dela.
