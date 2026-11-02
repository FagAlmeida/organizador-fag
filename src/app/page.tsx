import { connection } from "next/server";
import { Suspense } from "react";
import { BoardsHome } from "@/components/boards/boards-home";
import { listBoards } from "@/server/queries";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Seus quadros</h1>
      <p className="mt-1 text-sm text-slate-600">
        Organize projetos em listas e cartões. Arraste para reordenar.
      </p>
      <Suspense fallback={<BoardsSkeleton />}>
        <BoardsSection />
      </Suspense>
    </main>
  );
}

async function BoardsSection() {
  await connection();
  const boards = await listBoards();
  return <BoardsHome boards={boards} />;
}

function BoardsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando quadros" className="mt-6">
      <div className="h-9 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
