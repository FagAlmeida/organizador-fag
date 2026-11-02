import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  }),
});

const STEP = 1024;
const SEED_TITLE = "Projeto de exemplo";

function inDays(days: number) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  // O quadro fica com o usuário mais antigo. Sem usuários, fica sem membros
  // e é atribuído a quem fizer o primeiro login (veja src/server/auth.ts).
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  // Idempotente: recria apenas o quadro de exemplo desse dono.
  await prisma.board.deleteMany({
    where: {
      title: SEED_TITLE,
      members: owner ? { some: { userId: owner.id, role: "owner" } } : { none: {} },
    },
  });

  const board = await prisma.board.create({
    data: {
      title: SEED_TITLE,
      members: owner ? { create: { userId: owner.id, role: "owner" } } : undefined,
      labels: {
        create: [
          { name: "Urgente", color: "red" },
          { name: "Design", color: "purple" },
          { name: "Backend", color: "blue" },
          { name: "Melhoria", color: "green" },
        ],
      },
    },
    include: { labels: true },
  });
  const label = Object.fromEntries(board.labels.map((l) => [l.name, l.id]));

  const lists: {
    title: string;
    cards: {
      title: string;
      description?: string;
      dueDate?: Date;
      labels?: string[];
      checklist?: [string, boolean][];
    }[];
  }[] = [
    {
      title: "A fazer",
      cards: [
        {
          title: "Definir identidade visual",
          description: "Escolher paleta de cores, tipografia e logotipo do produto.",
          dueDate: inDays(5),
          labels: ["Design"],
          checklist: [
            ["Pesquisar referências", true],
            ["Montar painel de inspiração", false],
            ["Apresentar duas propostas", false],
          ],
        },
        {
          title: "Configurar backups do banco",
          labels: ["Backend", "Urgente"],
          dueDate: inDays(-1),
        },
        { title: "Escrever documentação da API", labels: ["Backend"] },
      ],
    },
    {
      title: "Em andamento",
      cards: [
        {
          title: "Tela de cadastro de clientes",
          description: "Formulário com validação e mensagens de erro em português.",
          dueDate: inDays(0),
          labels: ["Design", "Melhoria"],
          checklist: [
            ["Layout no Figma", true],
            ["Componentes do formulário", true],
            ["Integração com a API", false],
          ],
        },
        { title: "Revisar consultas lentas", labels: ["Backend", "Melhoria"], dueDate: inDays(2) },
      ],
    },
    {
      title: "Concluído",
      cards: [
        {
          title: "Reunião de kickoff",
          description: "Alinhamento de escopo e prazos com a equipe.",
          checklist: [
            ["Enviar convite", true],
            ["Preparar pauta", true],
          ],
        },
      ],
    },
  ];

  for (const [li, list] of lists.entries()) {
    await prisma.list.create({
      data: {
        boardId: board.id,
        title: list.title,
        position: (li + 1) * STEP,
        cards: {
          create: list.cards.map((card, ci) => ({
            title: card.title,
            description: card.description ?? "",
            dueDate: card.dueDate,
            position: (ci + 1) * STEP,
            labels: { create: (card.labels ?? []).map((name) => ({ labelId: label[name] })) },
            checklist: {
              create: (card.checklist ?? []).map(([text, done], i) => ({
                text,
                done,
                position: (i + 1) * STEP,
              })),
            },
          })),
        },
      },
    });
  }

  console.log(`Quadro "${SEED_TITLE}" criado (id: ${board.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
