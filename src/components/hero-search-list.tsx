"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AssetImage } from "@/components/asset-image";
import type { HeroSummary } from "@/lib/knowledge";

export function HeroSearchList({ heroes }: { heroes: HeroSummary[] }) {
  const [query, setQuery] = useState("");
  const filteredHeroes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return heroes;

    return heroes.filter((hero) =>
      [hero.name, hero.title, hero.role, hero.pinyin]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [heroes, query]);

  return (
    <>
      <section className="mx-auto mt-6 grid max-w-7xl gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 focus-within:border-amber-300">
            <Search size={17} />
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索英雄名称、分路、定位，例如：孙尚香、射手、法师、小乔"
              value={query}
            />
          </label>
          <p className="mt-3 text-xs text-slate-500">
            已匹配 {filteredHeroes.length} / {heroes.length} 个英雄，点击卡片进入技能、铭文、出装、关系与 KPL 解说语料页。
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">语料状态说明</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            英雄基础资料来自官方列表；KPL 解说语料用于沉淀“哪场比赛、哪位解说、围绕这个英雄说了什么”，后续作为 Agent 的 RAG 资料源。
          </p>
        </div>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {filteredHeroes.map((hero) => (
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
    </>
  );
}
