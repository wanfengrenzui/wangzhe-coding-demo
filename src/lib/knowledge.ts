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

export type InscriptionRecord = {
  id: number;
  name: string;
  description: string;
  image: string;
};

export type HeroSummary = Omit<HeroRecord, "skills"> & {
  avatar: string;
  cover: string;
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

const roleFallbackItems: Record<string, string[]> = {
  法师: ["秘法之靴", "回响之杖", "痛苦面具", "博学者之怒", "虚无法杖", "贤者天书"],
  射手: ["急速战靴", "无尽战刃", "宗师之力", "破晓", "泣血之刃", "名刀·司命"],
  坦克: ["抵抗之靴", "红莲斗篷", "不祥征兆", "魔女斗篷", "霸者重装", "贤者的庇护"],
  战士: ["抵抗之靴", "暗影战斧", "宗师之力", "破军", "名刀·司命", "贤者的庇护"],
  刺客: ["贪婪之噬", "抵抗之靴", "暗影战斧", "宗师之力", "破军", "名刀·司命"],
  辅助: ["近卫荣耀", "抵抗之靴", "极寒风暴", "魔女斗篷", "不祥征兆", "贤者的庇护"],
};

const roleFallbackInscriptions: Record<string, Array<[string, string]>> = {
  法师: [
    ["梦魇", "法术攻击力+4.2 / 法术穿透+2.4"],
    ["心眼", "攻速加成+0.6% / 法术穿透+6.4"],
    ["狩猎", "攻速加成+1% / 移速+1%"],
  ],
  射手: [
    ["祸源", "暴击率+1.6%"],
    ["鹰眼", "物理攻击+0.9 / 物理穿透+6.4"],
    ["隐匿", "物理攻击+1.6 / 移速+1%"],
  ],
  默认: [
    ["宿命", "攻速加成+1% / 最大生命+33.7 / 物理防御+2.3"],
    ["虚空", "最大生命+37.5 / 冷却缩减+0.6%"],
    ["调和", "最大生命+45 / 每5秒回血+5.2 / 移速+0.4%"],
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

async function fetchHeroHtml(heroId: number) {
  const response = await fetch(
    `https://pvp.qq.com/web201605/herodetail/${heroId}.shtml`,
    { cache: "force-cache" },
  );
  const buffer = await response.arrayBuffer();
  return new TextDecoder("gbk").decode(buffer);
}

async function getMingList() {
  return fetchJson<
    Array<{
      ming_id: string;
      ming_name: string;
      ming_des: string;
    }>
  >("https://pvp.qq.com/web201605/js/ming.json");
}

async function getSummonerList() {
  return fetchJson<
    Array<{
      summoner_id: number;
      summoner_name: string;
    }>
  >("https://pvp.qq.com/web201605/js/summoner.json");
}

function parseDataIds(html: string, attributeName: string) {
  const match = html.match(new RegExp(`${attributeName}="([^"]+)"`));
  return match?.[1]
    .split("|")
    .map((id) => Number(id))
    .filter(Boolean) || [];
}

function parseAllDataIds(html: string, attributeName: string) {
  return [...html.matchAll(new RegExp(`${attributeName}="([^"]+)"`, "g"))].map(
    (match) =>
      match[1]
        .split("|")
        .map((id) => Number(id))
        .filter(Boolean),
  );
}

function getSkillByIconId(
  heroId: number,
  skills: HeroRecord["skills"],
  imageUrl: string,
) {
  const match = imageUrl.match(new RegExp(`${heroId}(\\d)0\\.png`));
  const skillIndex = match ? Number(match[1]) : 0;
  return skills[skillIndex]?.name || skills[1]?.name || skills[0]?.name || "技能";
}

function parseSkillOrder(html: string, heroId: number, skills: HeroRecord["skills"]) {
  const block = html.match(/<div class="sugg-info2 info">([\s\S]*?)<\/div>/)?.[1] || "";
  const labels = [...block.matchAll(/<p class="sugg-name[^"]*"><b>(.*?)<\/b>/g)]
    .map((match) => stripHtml(match[1]))
    .filter((label) => label && label !== "召唤师技能");
  const images = [...block.matchAll(/<img src="([^"]*heroimg\/[^"]+\.png)"/g)].map(
    (match) => match[1],
  );

  const derived = images.slice(0, 2).map((image, index) => ({
    label: labels[index] || (index === 0 ? "主升" : "副升"),
    skill: getSkillByIconId(heroId, skills, image),
    reason:
      index === 0
        ? "来自官方技能加点图标，优先升级该英雄的核心技能。"
        : "来自官方技能加点图标，作为第二优先级补强控制、爆发或消耗能力。",
  }));

  return derived.length > 0
    ? derived
    : skills.slice(1, 3).map((skill, index) => ({
        label: index === 0 ? "主升" : "副升",
        skill: skill.name,
        reason:
          index === 0
            ? "优先强化核心输出/机动技能，提高对线与团战能力。"
            : "补足控制、减速或爆发能力，提升团战容错。",
      }));
}

function parseRelationGroups(html: string, heroes: HeroSummary[]) {
  const groups = [...html.matchAll(/<div class="hero-info l info"[^>]*>([\s\S]*?)(?=<div class="hero-info l info"|<div class="equip rs fl">)/g)];
  const parseGroup = (index: number) => {
    const block = groups[index]?.[1] || "";
    const ids = [...block.matchAll(/href="(\d+)\.shtml"/g)]
      .map((match) => Number(match[1]))
      .slice(0, 2);
    const notes = [...block.matchAll(/<p(?: style="display:none;")?>([\s\S]*?)<\/p>/g)]
      .map((match) => stripHtml(match[1]))
      .filter(Boolean);

    return ids.map((id, itemIndex) => ({
      name: heroes.find((hero) => hero.id === id)?.name || String(id),
      note: notes[itemIndex] || "官方英雄关系推荐。",
    }));
  };

  return {
    best: parseGroup(0),
    counter: parseGroup(1),
    restrained: parseGroup(2),
  };
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

export async function getHeroSummaries(): Promise<HeroSummary[]> {
  const heroList = await fetchJson<
    Array<{
      ename: number;
      cname: string;
      title: string;
      hero_type: number;
      id_name: string;
    }>
  >("https://pvp.qq.com/web201605/js/herolist.json");

  return heroList.map((hero) => ({
    id: hero.ename,
    name: hero.cname,
    title: hero.title,
    role: heroTypeMap[hero.hero_type] || "综合",
    pinyin: hero.id_name,
    avatar: `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${hero.ename}/${hero.ename}.jpg`,
    cover: `https://game.gtimg.cn/images/yxzj/img201606/skin/hero-info/${hero.ename}/${hero.ename}-bigskin-1.jpg`,
  }));
}

export async function getEquipmentList(): Promise<EquipmentRecord[]> {
  const itemList = await fetchJson<
    Array<{
      item_id: number;
      item_name: string;
      item_type: number;
      price: number;
      total_price: number;
      des1: string;
      des2?: string;
    }>
  >("https://pvp.qq.com/web201605/js/item.json");

  return itemList.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    type: itemTypeMap[item.item_type] || "通用",
    price: item.price,
    totalPrice: item.total_price,
    description: stripHtml(`${item.des1 || ""} ${item.des2 || ""}`),
  }));
}

export async function getHeroDetail(id: number) {
  const [heroes, equipment, mingList, summonerList] = await Promise.all([
    getHeroSummaries(),
    getEquipmentList(),
    getMingList(),
    getSummonerList(),
  ]);
  const hero = heroes.find((item) => item.id === id) || heroes[0];
  const [fetchedSkills, heroHtml] = await Promise.all([
    fetchHeroSkills(hero.id),
    fetchHeroHtml(hero.id),
  ]);
  const skills =
    fetchedSkills.length > 0 ? fetchedSkills : fallbackHeroSkills[hero.name] || [];

  const officialBuildIds = parseAllDataIds(heroHtml, "data-item")[0] || [];
  const fallbackBuildNames =
    roleFallbackItems[hero.role] || roleFallbackItems.法师 || [];
  const buildByIds = officialBuildIds
    .map((itemId) => equipment.find((item) => item.id === itemId))
    .filter(Boolean) as EquipmentRecord[];
  const build =
    buildByIds.length > 0
      ? buildByIds
      : (fallbackBuildNames
    .map((name) => equipment.find((item) => item.name === name))
          .filter(Boolean) as EquipmentRecord[]);

  const inscriptionIds = parseDataIds(heroHtml, "data-ming");
  const officialInscriptions = inscriptionIds
    .map((mingId) => {
      const ming = mingList.find((item) => Number(item.ming_id) === mingId);
      if (!ming) return null;

      return {
        id: mingId,
        name: ming.ming_name,
        description: stripHtml(ming.ming_des).replace(/法术/g, "法术 "),
        image: `https://game.gtimg.cn/images/yxzj/img201606/mingwen/${mingId}.png`,
      };
    })
    .filter(Boolean) as InscriptionRecord[];
  const fallbackInscriptions =
    roleFallbackInscriptions[hero.role] || roleFallbackInscriptions.默认;

  const summonSkillIds = parseDataIds(heroHtml, "data-skill");
  const summonSkills = summonSkillIds
    .map((skillId) => summonerList.find((item) => item.summoner_id === skillId)?.summoner_name)
    .filter(Boolean) as string[];

  return {
    hero: {
      ...hero,
      skills,
    },
    inscriptions:
      officialInscriptions.length > 0
        ? officialInscriptions
        : fallbackInscriptions.map(([name, description], index) => ({
            id: index,
            name,
            description,
            image: "",
          })),
    skillOrder: parseSkillOrder(heroHtml, hero.id, skills),
    summonSkills: summonSkills.length > 0 ? summonSkills : ["闪现"],
    build,
    relations: parseRelationGroups(heroHtml, heroes),
  };
}
