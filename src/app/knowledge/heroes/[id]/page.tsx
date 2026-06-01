import Link from "next/link";
import { BookOpen, Boxes, Clapperboard, Lightbulb, Swords, Users } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { getHeroDetail } from "@/lib/knowledge";

export default async function HeroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getHeroDetail(Number(id));
  const { hero } = detail;
  const commentarySamples = createCommentarySamples(hero.name);

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-8 py-6 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <AssetImage
            alt={hero.name}
            className="h-16 w-16 overflow-hidden rounded-full border-2 border-amber-300"
            fallback={hero.name.slice(0, 2)}
            src={hero.avatar}
          />
          <div>
            <p className="text-sm text-slate-500">
              {hero.role} / {hero.title}
            </p>
            <h1 className="text-3xl font-semibold">{hero.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
            href="/knowledge/heroes"
          >
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
            <div className="flex flex-wrap gap-8">
              {hero.skills.map((skill, index) => (
                <div className="w-24 text-center" key={skill.name}>
                  <AssetImage
                    alt={skill.name}
                    className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-amber-300"
                    fallback={skill.name.slice(0, 2)}
                    src={`https://game.gtimg.cn/images/yxzj/img201606/heroimg/${hero.id}/${hero.id}0${index}.png`}
                  />
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
            <div className="flex flex-wrap items-center gap-8">
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
                  <div
                    className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm"
                    key={item.name}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
              <p className="text-sm leading-7 text-slate-700">
                {detail.relations.best.map((item) => `${item.name}：${item.note}`).join(" ")}
              </p>
            </div>
          </Panel>

          <Panel icon={Clapperboard} title="KPL 解说语料库">
            <div className="grid gap-3">
              {commentarySamples.map((sample) => (
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={sample.quote}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{sample.match}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {sample.caster} / {sample.tag}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                      可入 RAG
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">“{sample.quote}”</p>
                </article>
              ))}
            </div>
            <p className="mt-4 bg-slate-100 p-3 text-sm leading-6 text-slate-700">
              这里的设计意义是沉淀赛事真实表达：一场 KPL 比赛中，解说围绕这个英雄说了什么、适合什么场景、能补强哪类 Agent 输出。正式版本可以接入赛事字幕、ASR 转写和人工审核标签。
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel icon={Boxes} title="铭文搭配建议">
            <div className="grid grid-cols-3 gap-4 text-center">
              {detail.inscriptions.map((item) => (
                <div key={item.name}>
                  <AssetImage
                    alt={item.name}
                    className="mx-auto h-16 w-16 overflow-hidden rounded-lg border border-amber-300"
                    fallback="铭文"
                    src={item.image}
                  />
                  <p className="mt-3 font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.description}
                  </p>
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
                  <AssetImage
                    alt={item.name}
                    className="mx-auto h-16 w-16 overflow-hidden rounded-full border border-amber-300"
                    fallback="装备"
                    src={`https://game.gtimg.cn/images/yxzj/img201606/itemimg/${item.id}.jpg`}
                  />
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

function createCommentarySamples(heroName: string) {
  return [
    {
      match: "KPL 春季赛高光切片 08:30",
      caster: "解说 A",
      tag: "团战站位",
      quote: `${heroName}这一波先等控制交完再进场，输出位置非常舒服，核心不是急着打满伤害，而是先活下来。`,
    },
    {
      match: "狼队 vs AG 复盘片段",
      caster: "解说 B",
      tag: "技能窗口",
      quote: `${heroName}的关键技能已经转好，这个时间点可以逼对面接团，队友只要把视野铺开就能打主动。`,
    },
    {
      match: "KPL 赛后分析",
      caster: "评论席",
      tag: "内容生成素材",
      quote: `如果要给观众讲清楚${heroName}，不能只报技能名，要把进场时机、输出目标和队友保护关系说出来。`,
    },
  ];
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
