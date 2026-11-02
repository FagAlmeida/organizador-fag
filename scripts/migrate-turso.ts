// Aplica as migrações de prisma/migrations num banco Turso (DATABASE_URL libsql://).
// O `prisma migrate deploy` só entende arquivos SQLite locais, então este script
// guarda o que já foi aplicado na tabela _turso_migrations.
// Com DATABASE_URL apontando para um arquivo local, não faz nada.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida.");

async function main() {
  if (url!.startsWith("file:")) {
    console.log("Banco local: use `npm run db:deploy`. Nada a fazer aqui.");
    return;
  }

  const client = createClient({ url: url!, authToken: process.env.DATABASE_AUTH_TOKEN });
  await client.execute(
    'CREATE TABLE IF NOT EXISTS "_turso_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)',
  );
  const { rows } = await client.execute('SELECT "name" FROM "_turso_migrations"');
  const applied = new Set(rows.map((r) => String(r.name)));

  const dir = join(process.cwd(), "prisma", "migrations");
  const pending = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !applied.has(e.name))
    .map((e) => e.name)
    .sort();

  for (const name of pending) {
    console.log(`Aplicando ${name}…`);
    await client.executeMultiple(readFileSync(join(dir, name, "migration.sql"), "utf8"));
    await client.execute({
      sql: 'INSERT INTO "_turso_migrations" ("name", "appliedAt") VALUES (?, ?)',
      args: [name, new Date().toISOString()],
    });
  }
  console.log(pending.length ? `${pending.length} migração(ões) aplicada(s).` : "Banco em dia.");
  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
