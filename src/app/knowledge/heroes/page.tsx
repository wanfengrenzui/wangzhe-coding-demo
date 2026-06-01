import Link from "next/link";
import { BookOpenText, Database, Search } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
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

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm text-slate-500">
            <Search size={17} />
            <span>搜索英雄名称、分路、定位；详情页包含技能、铭文、出装、关系与 KPL 解说语料。</span>
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 text-amber-600" size={18} />
            <div>
              <p className="font-semibold text-amber-900">语料状态说明</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                英雄基础资料来自官方列表；KPL 解说语料用于沉淀“哪场比赛、哪位解说、围绕这个英雄说了什么”，后续作为 Agent 的 RAG 资料源。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {heroes.map((hero) => (
          <Link
            className="group rounded-lg border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
            href={`/knowledge/heroes/${hero.id}`}
            key={hero.id}
          >
            <AssetImage
              alt={hero.name}
              className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-amber-300"
              fallback={hero.name.slice(0, 2)}
              src={hero.avatar}
            />
            <div className="mt-3 text-center">
              <p className="font-semibold">{hero.name}</p>
              <p className="mt-1 text-xs text-slate-500">{hero.title}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {hero.role}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  KPL 语料
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
