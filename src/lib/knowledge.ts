export type HeroRecord = {
  id: number;
  name: string;
  title: string;
  role: string;
  pinyin: string;
  skills: Array<{
    name: string;
    cost: string;
    description: string;
  }>;
};

export type EquipmentRecord = {
  id: number;
  name: string;
  type: string;
  price: number;
  totalPrice: number;
  description: string;
};

export type KnowledgeResult = {
  heroes: HeroRecord[];
  equipment: EquipmentRecord[];
  answer: string;
  citations: string[];
};

const heroTypeMap: Record<number, string> = {
  1: "战士",
  2: "法师",
  3: "坦克",
  4: "刺客",
  5: "射手",
  6: "辅助",
};

const itemTypeMap: Record<number, string> = {
  1: "攻击",
  2: "法术",
  3: "防御",
  4: "移动",
  5: "打野",
  7: "游走",
};

const fallbackHeroSkills: Record<string, HeroRecord["skills"]> = {
  孙尚香: [
    {
      name: "活力迸发",
      cost: "被动",
      description: "普通攻击命中敌人会减少翻滚突袭冷却，是持续输出和拉扯的核心。",
    },
    {
      name: "翻滚突袭",
      cost: "低消耗",
      description: "位移并强化下一次普攻，适合调整输出角度、拉开身位和追击收割。",
    },
    {
      name: "红莲爆弹",
      cost: "中消耗",
      description: "范围伤害、减速并标记目标，帮助孙尚香提高后续普攻伤害。",
    },
    {
      name: "究极弩炮",
      cost: "大招",
      description: "远距离爆发收割技能，适合团战尾段补伤害或压低后排血量。",
    },
  ],
};

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "force-cache" });
  const text = await response.text();
  return JSON.parse(text) as T;
}

async function fetchHeroSkills(heroId: number) {
  try {
    const response = await fetch(
      `https://pvp.qq.com/web201605/herodetail/${heroId}.shtml`,
      { cache: "force-cache" },
    );
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder("gbk").decode(buffer);
    const matches = [
      ...text.matchAll(
        /<p class="skill-name"><b>(.*?)<\/b><span>(.*?)<\/span><\/p>[\s\S]*?<p class="skill-desc">([\s\S]*?)<\/p>/g,
      ),
    ];

    return matches
      .map((match) => ({
        name: stripHtml(match[1]),
        cost: stripHtml(match[2]),
        description: stripHtml(match[3]),
      }))
      .filter((skill) => skill.name && skill.description);
  } catch {
    return [];
  }
}

export async function getKnowledge(query = ""): Promise<KnowledgeResult> {
  const [heroList, itemList] = await Promise.all([
    fetchJson<
      Array<{
        ename: number;
        cname: string;
        title: string;
        hero_type: number;
        id_name: string;
      }>
    >("https://pvp.qq.com/web201605/js/herolist.json"),
    fetchJson<
      Array<{
        item_id: number;
        item_name: string;
        item_type: number;
        price: number;
        total_price: number;
        des1: string;
      }>
    >("https://pvp.qq.com/web201605/js/item.json"),
  ]);

  const matchedHero =
    heroList.find((hero) => query.includes(hero.cname)) ||
    heroList.find((hero) => /孙尚香|射手|出装/.test(query) && hero.cname === "孙尚香") ||
    heroList[0];

  const fetchedSkills = (await fetchHeroSkills(matchedHero.ename)).slice(0, 4);
  const skills =
    fetchedSkills.length > 0
      ? fetchedSkills
      : fallbackHeroSkills[matchedHero.cname] || [];

  const heroes: HeroRecord[] = heroList.slice(0, 36).map((hero) => ({
    id: hero.ename,
    name: hero.cname,
    title: hero.title,
    role: heroTypeMap[hero.hero_type] || "综合",
    pinyin: hero.id_name,
    skills: hero.ename === matchedHero.ename ? skills : fallbackHeroSkills[hero.cname] || [],
  }));

  const equipment: EquipmentRecord[] = itemList.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    type: itemTypeMap[item.item_type] || "通用",
    price: item.price,
    totalPrice: item.total_price,
    description: stripHtml(item.des1),
  }));

  const marksmanItems = equipment
    .filter((item) =>
      /攻速|暴击|物理攻击|穿透|吸血|破晓|无尽|宗师|影刃|泣血|逐日/.test(
        `${item.name}${item.description}`,
      ),
    )
    .slice(0, 6);

  const answer = query
    ? `识别到 query 关注「${matchedHero.cname} / ${heroTypeMap[matchedHero.hero_type] || "综合"}」。知识库命中 ${skills.length} 条技能说明、${marksmanItems.length} 条相关装备。若是孙尚香出装，可以优先围绕暴击、攻速、物理穿透和保命位构建，并根据敌方坦度决定破晓/吸血/防装优先级。`
    : "输入英雄、装备或出装问题后，系统会基于英雄资料、技能说明和装备库给出 RAG 命中结果。";

  return {
    heroes,
    equipment,
    answer,
    citations: [
      "https://pvp.qq.com/web201605/js/herolist.json",
      "https://pvp.qq.com/web201605/js/item.json",
      `https://pvp.qq.com/web201605/herodetail/${matchedHero.ename}.shtml`,
    ],
  };
}
