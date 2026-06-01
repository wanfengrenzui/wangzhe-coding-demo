import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { AssetImage } from "@/components/asset-image";
import { getEquipmentList } from "@/lib/knowledge";

export default async function EquipmentPage() {
  const equipment = await getEquipmentList();
  const groups = ["攻击", "法术", "防御", "移动", "打野", "游走"];

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-8 py-7 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">KingAI Ops Knowledge Base</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold">
            <PackageSearch size={28} />
            装备语料库
          </h1>
        </div>
        <Link
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white"
          href="/"
        >
          返回工作台
        </Link>
      </header>

      <section className="mx-auto mt-6 max-w-7xl rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm leading-6 text-slate-600">
          装备图标直连官方 CDN，并在加载失败时显示稳定占位。后续可把装备属性、版本改动、英雄适配关系写入 RAG，用于回答“这个版本该怎么出装”这类 query。
        </p>
      </section>

      <section className="mx-auto mt-6 max-w-7xl space-y-6">
        {groups.map((group) => {
          const items = equipment.filter((item) => item.type === group);

          return (
            <div className="rounded-lg border border-slate-200 bg-white p-5" key={group}>
              <h2 className="text-xl font-semibold">{group}装备</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {items.map((item) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={item.id}
                  >
                    <AssetImage
                      alt={item.name}
                      className="h-14 w-14 overflow-hidden rounded-full border border-amber-300"
                      fallback="装备"
                      src={`https://game.gtimg.cn/images/yxzj/img201606/itemimg/${item.id}.jpg`}
                    />
                    <p className="mt-3 font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">总价 {item.totalPrice}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
