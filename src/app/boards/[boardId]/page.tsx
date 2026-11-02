import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BoardView } from "@/components/board/board-view";
import { getBoard } from "@/server/queries";

export default function BoardPage({ params }: PageProps<"/boards/[boardId]">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardLoader params={params} />
    </Suspense>
  );
}

async function BoardLoader({ params }: { params: PageProps<"/boards/[boardId]">["params"] }) {
  const { boardId } = await params;
  await connection();
  const board = await getBoard(boardId);
  if (!board) notFound();
  return <BoardView board={board} />;
}

function BoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando quadro"
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-blue-700 to-indigo-800"
    >
      <div className="px-4 pt-4 pb-3">
        <div className="h-7 w-48 animate-pulse rounded bg-white/25" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4">
        {[5, 3, 4].map((cards, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-xl bg-slate-100/80 p-2">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-300" />
            {Array.from({ length: cards }, (_, j) => (
              <div key={j} className="h-14 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
