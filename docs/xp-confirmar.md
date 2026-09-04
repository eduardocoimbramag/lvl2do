# XP recuperado — últimos 2 passos

O XP já foi devolvido. O resultado que você viu prova isso:

| | |
|---|---|
| `xp_no_app` | **160** |
| `xp_que_voce_ganhou` | **160** |

Os dois números iguais significam que o app e o histórico estão sincronizados.
Falta só confirmar que o defeito não volta.

---

## Passo 1 — Veja no app

Abra o lvl2do e aperte:

```
Cmd + Shift + R
```

Você deve ver:

- **160 XP** no lugar de 0
- **Nível 1** (160 ainda é nível 1 — o nível 2 começa em 800)
- **"Faltam 640 XP para o próximo nível"**

Se aparecer isso, está resolvido.

---

## Passo 2 — O teste final

O defeito antigo apagava o XP **a cada carregamento de página**. Então o teste
é justamente esse: carregar várias vezes.

1. Recarregue a página **3 vezes seguidas**
2. Volte ao SQL Editor e rode o bloco abaixo:

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

**Se continuar 160 e 160 → acabou.** Pode fechar o SQL Editor e usar o app
normalmente. Daqui pra frente o XP só sobe.

---

## Se voltar a zerar

Só pode ser uma coisa: alguma aba antiga do lvl2do ainda aberta, rodando a
versão velha do app.

1. Feche **todas** as abas do lvl2do
2. Abra uma nova e dê `Cmd + Shift + R`
3. Refaça os passos 2 e 3 do guia `docs/recuperar-xp.md`

---

## O que NÃO fazer agora

No arquivo `supabase/2026-xp-fix.sql` existe uma **Parte 3** (uma proteção
extra). Ela está comentada e tem um aviso em vermelho.

**Não descomente.** Do jeito que está, ela trava o cadastro de usuários novos.
Já corrigi o conteúdo dela, mas ainda precisa de um teste antes de valer. Te
aviso quando puder rodar.

Nada do que você fez até aqui depende disso.
