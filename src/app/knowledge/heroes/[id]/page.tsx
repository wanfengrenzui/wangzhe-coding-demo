import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Boxes,
  Lightbulb,
  Swords,
  Users,
} from "lucide-react";
import { getHeroDetail } from "@/lib/knowledge";

export default async function HeroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getHeroDetail(Number(id));
  const { hero } = detail;

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-8 py-6 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-amber-300 bg-white">
            <Image alt={hero.name} fill sizes="64px" src={hero.avatar} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{hero.role} / {hero.title}</p>
            <h1 className="text-3xl font-semibold">{hero.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm" href="/knowledge/heroes">
            英雄总览
          </Link>
          <Link className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white" href="/">
            返回工作台
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-6 grid max-w-7xl grid-cols-[1.9fr_1fr] gap-5">
        <div className="space-y-5">
          <Panel icon={BookOpen} title="技能介绍">
            <div className="flex gap-8">
              {hero.skills.map((skill, index) => (
                <div className="text-center" key={skill.name}>
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-amber-300 bg-slate-100">
                    <Image
                      alt={skill.name}
                      fill
                      sizes="80px"
                      src={`https://game.gtimg.cn/images/yxzj/img201606/heroimg/${hero.id}/${hero.id}0${index}.png`}
                    />
                  </div>
                  <p className="mt-3 font-semibold">{skill.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{skill.cost}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-700">
              {hero.skills[0]?.description || "暂无技能说明。"}
            </p>
          </Panel>

          <Panel icon={Lightbulb} title="技能加点建议">
            <div className="flex items-center gap-8">
              {detail.skillOrder.map((item) => (
                <div className="flex items-center gap-4" key={item.label}>
                  <span className="text-lg font-semibold text-slate-600">{item.label}</span>
                  <div>
                    <p className="font-semibold">{item.skill}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                  </div>
                </div>
              ))}
              <div>
                <p className="font-semibold">召唤师技能</p>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.summonSkills.join(" / ")}
                </p>
              </div>
            </div>
          </Panel>

          <Panel icon={Users} title="英雄关系">
            <div className="grid grid-cols-3 border-b border-slate-200 text-center text-sm">
              <div className="border-b-2 border-amber-300 pb-2">最佳搭档</div>
              <div className="pb-2">压制英雄</div>
              <div className="pb-2">被压制英雄</div>
            </div>
            <div className="mt-5 grid grid-cols-[170px_1fr] gap-5">
              <div className="flex gap-3">
                {detail.relations.best.map((item) => (
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm" key={item.name}>
                    {item.name}
                  </div>
                ))}
              </div>
              <p className="text-sm leading-7 text-slate-700">
                {detail.relations.best.map((item) => `${item.name}：${item.note}`).join(" ")}
              </p>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel icon={Boxes} title="铭文搭配建议">
            <div className="grid grid-cols-3 gap-4 text-center">
              {detail.inscriptions.map(([name, desc]) => (
                <div key={name}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 font-semibold text-amber-700">
                    铭文
                  </div>
                  <p className="mt-3 font-semibold">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 bg-slate-100 p-3 text-sm leading-6 text-slate-700">
              Tips：铭文以核心输出属性为主，结合英雄定位补充移速、穿透、暴击或冷却属性。
            </p>
          </Panel>

          <Panel icon={Swords} title="出装建议">
            <div className="grid grid-cols-3 gap-4">
              {detail.build.map((item) => (
                <div className="text-center" key={item.id}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300 bg-slate-100 text-xs text-slate-500">
                    装备
                  </div>
                  <p className="mt-2 text-sm font-semibold">{item.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 bg-slate-100 p-3 text-sm leading-6 text-slate-700">
              Tips：出装建议会结合英雄定位、敌方坦度和生存压力调整。正式版本可接入版本数据与胜率样本。
            </p>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: typeof BookOpen;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <Icon size={24} className="text-slate-600" />
        {title}
      </h2>
      <div className="border border-slate-200 bg-white p-6">{children}</div>
    </section>
  );
}
