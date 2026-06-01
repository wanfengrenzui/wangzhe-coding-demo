import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { HeroSearchList } from "@/components/hero-search-list";
import { getHeroSummaries } from "@/lib/knowledge";

export default async function HeroesPage() {
  const heroes = await getHeroSummaries();

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-8 py-7 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">KingAI Ops Knowledge Base</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold">
            <BookOpenText size={28} />
            英雄语料库
          </h1>
        </div>
        <Link
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white"
          href="/"
        >
          返回工作台
        </Link>
      </header>

      <HeroSearchList heroes={heroes} />
    </main>
  );
}
