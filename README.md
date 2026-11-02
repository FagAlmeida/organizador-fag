# Organizador FAG

Ferramenta de gestão de tarefas no estilo Trello: quadros, listas e cartões com arrastar e soltar, etiquetas coloridas, checklist, datas de entrega, busca e filtros. Cada pessoa entra com a conta Google e trabalha nos quadros em que é membro, vendo as alterações dos outros em poucos segundos.

**Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, Prisma 7 com SQLite/Turso (adaptador `libsql`), login com Google via [Arctic](https://arcticjs.dev), dnd-kit e Zod.

## Pré-requisitos

- Node.js 20.9 ou superior (testado com Node 22)
- npm

## Como executar

```bash
# 1. Instale as dependências (o postinstall já gera o Prisma Client)
npm install

# 2. Crie o arquivo de ambiente e preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
#    (veja "Login com Google" abaixo)
cp .env.example .env            # no Windows (PowerShell): Copy-Item .env.example .env

# 3. Crie o banco e aplique as migrações
npm run db:migrate

# 4. (Opcional) Popule com um quadro de exemplo
npm run db:seed

# 5. Rode em modo de desenvolvimento
npm run dev
```

Acesse <http://localhost:3000>.

Para rodar em modo de produção:

```bash
npm run db:deploy   # aplica as migrações sem gerar novas
npm run build
npm start
```

## Scripts

| Script               | O que faz                                                        |
| -------------------- | ---------------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento                                      |
| `npm run build`      | Build de produção                                                |
| `npm start`          | Servidor de produção (rode o build antes)                        |
| `npm run lint`       | ESLint                                                           |
| `npm run typecheck`  | Verificação de tipos com o TypeScript                            |
| `npm run db:migrate` | Cria e aplica migrações em desenvolvimento (`prisma migrate dev`) |
| `npm run db:deploy`  | Aplica migrações existentes (`prisma migrate deploy`)            |
| `npm run db:deploy:turso` | Aplica as migrações no Turso (`DATABASE_URL` libsql://)     |
| `npm run vercel-build` | Build usado pela Vercel: migra o Turso e roda `next build`   |
| `npm run db:seed`    | Recria o quadro "Projeto de exemplo" (fica com o primeiro usuário) |
| `npm run db:reset`   | Apaga o banco, reaplica as migrações e roda o seed               |

## Variáveis de ambiente

| Variável               | Exemplo                       | Descrição                                                   |
| ---------------------- | ----------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`         | `file:./prisma/dev.db`        | Local: arquivo SQLite. Produção: `libsql://<banco>.turso.io` |
| `DATABASE_AUTH_TOKEN`  | `eyJ...`                      | Token do Turso. Vazio no banco local                        |
| `GOOGLE_CLIENT_ID`     | `123-abc.apps.googleusercontent.com` | ID do cliente OAuth do Google                        |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...`                  | Chave secreta do cliente OAuth do Google                    |

O `.env` fica fora do Git (veja o `.gitignore`). Só o `.env.example` é versionado.

## Funcionalidades

- **Login:** entrar com a conta Google. Cada pessoa vê só os quadros em que é membro.
- **Membros:** qualquer membro convida pelo e-mail da conta Google. Se a pessoa ainda não tem conta, o convite fica pendente até ela entrar. O dono (quem criou o quadro) remove membros e exclui o quadro; os outros podem sair.
- **Atualização automática:** o quadro aberto busca as alterações dos outros membros a cada 5 segundos e ao voltar para a aba.
- **Quadros:** criar, renomear, excluir (só o dono, com confirmação) e listar na página inicial.
- **Listas:** criar, renomear, excluir (com confirmação) e reordenar arrastando pelo cabeçalho.
- **Cartões:** criar, editar, excluir, reordenar na mesma lista e mover entre listas.
- **Detalhes do cartão (modal):** título, descrição, responsável, data e horário de entrega (com aviso de atrasado, hoje ou em breve), etiquetas coloridas (criar, editar, excluir e aplicar) e checklist com barra de progresso.
- **Responsável:** cada cartão pode ser atribuído a um membro do quadro ou a um convite pendente (pelo e-mail). Quem sai ou é removido do quadro deixa de ser responsável pelos cartões dele.
- **Horário de entrega:** opcional, junto com a data. Passado o horário, o cartão do dia aparece como atrasado.
- **Busca e filtros:** por texto (título e descrição, ignorando acentos), por etiqueta, por responsável (inclusive "Minhas tarefas") e por data de entrega (atrasados, hoje, próximos 7 dias ou sem data). Com um filtro ativo, arrastar cartões fica desativado para evitar posições ambíguas.
- **Acessibilidade:** arrastar também funciona pelo teclado (Tab até o item, Espaço para pegar, setas para mover, Espaço para soltar, Esc para cancelar). Enter abre o cartão.

## Arquitetura

```
prisma/
  schema.prisma          Modelos: User, Session, Board, BoardMember, BoardInvite, List, Card,
                         Label, CardLabel, ChecklistItem
  migrations/            Migrações SQL
  seed.ts                Quadro de exemplo
scripts/
  migrate-turso.ts       Aplica as migrações no Turso
src/
  proxy.ts               Sem cookie de sessão, manda para /login
  app/                   Rotas (início, /boards/[boardId], /login, /auth/google), erro e 404
  components/
    ui/                  Modal, confirmação, toasts, edição inline, estado de erro
    boards/              Página inicial (lista de quadros)
    board/               Quadro: arrastar e soltar, colunas, cartões, modal, filtros
  lib/                   Código compartilhado: validação Zod, tipos, datas, posições, cores
  server/
    actions/             Server Actions (CRUD), todas validadas com Zod
    auth.ts              Sessões, cliente OAuth do Google, criação de usuários e convites
    queries.ts           Leituras usadas pelas páginas
    access.ts            Verifica se cada registro pertence a um quadro do usuário
    viewer.ts            Ponto único de identificação do usuário (ver "Login")
```

### Ordenação

Listas, cartões e itens de checklist têm um campo `position` (`Float`). Um item movido recebe a média das posições dos vizinhos, então só ele é atualizado. Quando o intervalo fica pequeno demais, a lista inteira é renumerada numa transação (`src/lib/position.ts`). O servidor calcula a posição a partir do índice de destino, então a ordem permanece após recarregar a página.

### Atualização otimista

O estado do quadro fica em `BoardProvider` (`src/components/board/board-context.tsx`). Toda alteração é aplicada na hora e enviada para a Server Action. Se a gravação falhar (por erro de validação ou de rede), o estado volta à foto tirada antes da alteração e aparece um aviso. Durante um arrasto, essa foto é a do início do arrasto. Os dados revalidados pelo servidor só são adotados quando não há gravações nem arrasto em andamento. O mesmo vale para a atualização automática: o `router.refresh()` periódico fica pausado durante gravações, arrastos e com a aba em segundo plano.

### Exclusão em cascata

Excluir um quadro remove suas listas, cartões, etiquetas e checklists (`onDelete: Cascade` em todas as relações). Excluir uma etiqueta a remove de todos os cartões.

## Login

- O login usa OAuth do Google com PKCE (`src/app/auth/google/`). O cookie `fag_session` guarda um token aleatório. O banco guarda só o hash SHA-256 desse token, e a sessão vale 30 dias.
- `getViewer()` (`src/server/viewer.ts`) é o único lugar que identifica o usuário. Sem sessão válida, ele redireciona para `/login`. Todas as consultas e ações filtram por `boardScope(viewer)` (quadros em que o usuário é membro) e verificam o acesso em `src/server/access.ts`.
- Quadros sem membros, criados antes do login existir ou pelo seed sem usuários, passam para o **primeiro usuário** que entrar.

### Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto. Em **APIs e serviços → Tela de consentimento OAuth**, escolha o tipo **Externo** e publique o app (sem publicar, só os usuários de teste conseguem entrar).
2. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, escolha **Aplicativo da Web** e cadastre as **URIs de redirecionamento autorizadas**:
   - `http://localhost:3000/auth/google/callback` (desenvolvimento)
   - `https://<seu-dominio>/auth/google/callback` (produção, por exemplo `https://organizador-fag.vercel.app/auth/google/callback`)
3. Copie o ID e a chave secreta para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

## Publicar na Vercel com Turso

1. **Banco:** crie uma conta em [turso.tech](https://turso.tech) e um banco. Com a [CLI do Turso](https://docs.turso.tech/cli/introduction):
   ```bash
   turso db create organizador-fag
   turso db show organizador-fag --url      # → DATABASE_URL
   turso db tokens create organizador-fag   # → DATABASE_AUTH_TOKEN
   ```
2. **Código:** envie o projeto para um repositório no GitHub e importe-o em [vercel.com/new](https://vercel.com/new).
3. **Variáveis:** em *Settings → Environment Variables*, cadastre `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
4. **Deploy:** a Vercel usa o script `vercel-build`, que aplica as migrações pendentes no Turso antes do `next build`. Depois do primeiro deploy, cadastre a URL de produção no Google (passo 2 de "Login com Google").

## Observações

- Uma URL de quadro inexistente mostra a página "não encontrado". Como a página é transmitida em streaming (Partial Prerendering), o status HTTP é 200, não 404.
- O banco SQLite fica em `prisma/dev.db` e é ignorado pelo Git.
- O `prisma migrate deploy` não funciona com o Turso, por isso o `scripts/migrate-turso.ts` registra as migrações aplicadas na tabela `_turso_migrations`. Novas migrações continuam sendo criadas localmente com `npm run db:migrate`.
- A atualização automática faz uma requisição a cada 5 segundos por aba aberta. Para equipes pequenas isso cabe no plano gratuito da Vercel. Para muitos usuários simultâneos, troque por WebSockets ou Server-Sent Events.
