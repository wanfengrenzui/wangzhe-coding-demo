export type KplPick = {
  order: string;
  side: "blue" | "red";
  player: string;
  hero: string;
  lane: string;
  intent: string;
};

export type KplBpMatch = {
  id: string;
  date: string;
  stage: string;
  game: string;
  blueTeam: string;
  redTeam: string;
  result: string;
  patch: string;
  duration: string;
  source: string;
  confidence: string;
  status: "verified-lineup" | "placeholder";
  bans: { blue: string[]; red: string[] };
  picks: KplPick[];
  analysis: string[];
  turningPoint: string;
  tags: string[];
  sourceLinks: string[];
};

const lanes = ["对抗路", "打野", "中路", "发育路", "游走"];

function pickItems(prefix: string, side: "blue" | "red", values: string[]): KplPick[] {
  return values.map((value, index) => {
    const [player, hero] = value.includes("-")
      ? value.split("-")
      : [value.slice(0, 2), value.slice(2)];
    return {
      order: `${prefix}-${index + 1}`,
      side,
      player,
      hero,
      lane: lanes[index] || "未知",
      intent: `${player} 使用 ${hero}；来源为公开赛后 Ban/Pick 文本，真实逐手顺序待视频/OCR 校准。`,
    };
  });
}

function match(params: {
  id: string;
  date: string;
  game: string;
  blueTeam: string;
  redTeam: string;
  result: string;
  blueBans: string[];
  redBans: string[];
  bluePicks: string[];
  redPicks: string[];
  source: string;
  sourceUrl: string;
  note?: string;
}): KplBpMatch {
  const blueTag = params.blueTeam.includes("AG")
    ? "AG"
    : params.blueTeam.includes("JDG")
      ? "JDG"
      : params.blueTeam.includes("KSG")
        ? "KSG"
        : params.blueTeam.includes("WB")
          ? "WB"
          : "WOL";
  const redTag = params.redTeam.includes("AG")
    ? "AG"
    : params.redTeam.includes("JDG")
      ? "JDG"
      : params.redTeam.includes("KSG")
        ? "KSG"
        : params.redTeam.includes("WB")
          ? "WB"
          : "WOL";

  return {
    id: params.id,
    date: params.date,
    stage: "2026 KPL 春季赛",
    game: params.game,
    blueTeam: params.blueTeam,
    redTeam: params.redTeam,
    result: params.result,
    patch: "公开来源未标明版本",
    duration: "公开来源未披露",
    source: params.source,
    confidence: "阵容级 BP 已有公开来源；逐手 pick/ban 顺序仍需比赛视频或 OCR 二次校准。",
    status: "verified-lineup",
    bans: { blue: params.blueBans, red: params.redBans },
    picks: [
      ...pickItems(blueTag, "blue", params.bluePicks),
      ...pickItems(redTag, "red", params.redPicks),
    ],
    analysis: [
      `${params.blueTeam} 首发选择：${params.bluePicks.join("、")}。`,
      `${params.redTeam} 首发选择：${params.redPicks.join("、")}。`,
      params.note || "该样本可用于战队常选英雄、选手英雄池、蓝红方响应关系的聚类特征。",
    ],
    turningPoint: params.result,
    tags: ["2026 KPL", "阵容级 BP", "选手-英雄", "待校准逐手顺序"],
    sourceLinks: [params.sourceUrl],
  };
}

export const currentKplBpMatches: KplBpMatch[] = [
  match({
    id: "2026-wolves-ag-g1",
    date: "2026-03-21",
    game: "Game 1",
    blueTeam: "成都AG超玩会",
    redTeam: "重庆狼队",
    result: "狼队 1-0 AG",
    blueBans: ["苏烈", "元流之子（辅助）", "哪吒", "太乙真人", "张飞"],
    redBans: ["沈梦溪", "鲁班大师", "元流之子（坦克）", "海月", "大司命"],
    bluePicks: ["轩染-马超", "钟意-夏侯惇", "长生-杨玉环", "小俞-狄仁杰", "大帅-盾山"],
    redPicks: ["清清-关羽", "皖皖-云缨", "紫幻-小乔", "道崽-敖隐", "信-赵怀真"],
    source: "虎扑赛后帖：狼队 3-0 AG",
    sourceUrl: "https://bbs.hupu.com/638025067.html",
  }),
  match({
    id: "2026-wolves-ag-g2",
    date: "2026-03-21",
    game: "Game 2",
    blueTeam: "重庆狼队",
    redTeam: "成都AG超玩会",
    result: "狼队 2-0 AG",
    blueBans: ["敖隐", "大司命", "哪吒", "娜可露露", "阿古朵"],
    redBans: ["鲁班大师", "盾山", "海月", "不知火舞", "嬴政"],
    bluePicks: ["清清-夏洛特", "皖皖-元流之子（坦克）", "紫幻-嫦娥", "道崽-戈娅", "信-苏烈"],
    redPicks: ["轩染-狂铁", "钟意-铠", "长生-沈梦溪", "小俞-艾琳", "大帅-少司缘"],
    source: "虎扑赛后帖：狼队 3-0 AG",
    sourceUrl: "https://bbs.hupu.com/638025067.html",
  }),
  match({
    id: "2026-wolves-ag-g3",
    date: "2026-03-21",
    game: "Game 3",
    blueTeam: "重庆狼队",
    redTeam: "成都AG超玩会",
    result: "狼队 3-0 AG",
    blueBans: ["苏烈", "敖隐", "关羽", "戈娅", "云缨"],
    redBans: ["盾山", "鲁班大师", "老夫子", "白起", "司空震"],
    bluePicks: ["清清-狂铁", "皖皖-娜可露露", "紫幻-武则天", "道崽-公孙离", "信-太乙真人"],
    redPicks: ["轩染-影", "钟意-镜", "长生-小乔", "小俞-蚩奼", "大帅-张飞"],
    source: "虎扑赛后帖：狼队 3-0 AG",
    sourceUrl: "https://bbs.hupu.com/638025067.html",
  }),
  match({
    id: "2026-jdg-ag-g1",
    date: "2026-02-13",
    game: "Game 1",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 1-0 AG",
    blueBans: ["鲁班大师", "太乙真人", "女娲", "哪吒", "阿古朵"],
    redBans: ["沈梦溪", "盾山", "大司命", "海月", "元流之子（坦克）"],
    bluePicks: ["轻语-吕布", "无双-裴擒虎", "清融-不知火舞", "小寒-戈娅", "无畏-苏烈"],
    redPicks: ["轩染-狂铁", "染详-橘右京", "小凡-嬴政", "小俞-蚩奼", "大帅-张飞"],
    source: "虎扑赛后帖：JDG 3-2 AG",
    sourceUrl: "https://voice.hupu.com/bbs/637502661",
  }),
  match({
    id: "2026-jdg-ag-g2",
    date: "2026-02-13",
    game: "Game 2",
    blueTeam: "成都AG超玩会",
    redTeam: "北京JDG",
    result: "AG 1-1 JDG",
    blueBans: ["太乙真人", "空空儿", "蚩奼", "关羽", "太乙真人"],
    redBans: ["鲁班大师", "盾山", "戈娅", "敖隐", "苍"],
    bluePicks: ["轩染-曹操", "染详-阿古朵", "小凡-沈梦溪", "小俞-艾琳", "大帅-苏烈"],
    redPicks: ["轻语-司空震", "无双-大司命", "清融-海诺", "小寒-公孙离", "无畏-少司缘"],
    source: "虎扑赛后帖：JDG 3-2 AG",
    sourceUrl: "https://voice.hupu.com/bbs/637502661",
  }),
  match({
    id: "2026-jdg-ag-g3",
    date: "2026-02-13",
    game: "Game 3",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 2-1 AG",
    blueBans: ["鲁班大师", "关羽", "夏洛特", "老夫子", "哪吒"],
    redBans: ["沈梦溪", "蚩奼", "阿古朵", "嬴政", "海月"],
    bluePicks: ["轻语-曹操", "无双-元流之子（坦克）", "清融-女娲", "小寒-艾琳", "无畏-盾山"],
    redPicks: ["轩染-蒙恬", "染详-镜", "小凡-西施", "小俞-孙尚香", "大帅-太乙真人"],
    source: "虎扑赛后帖：JDG 3-2 AG",
    sourceUrl: "https://voice.hupu.com/bbs/637502661",
  }),
  match({
    id: "2026-jdg-ag-g4",
    date: "2026-02-13",
    game: "Game 4",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "AG 2-2 JDG",
    blueBans: ["盾山", "敖隐", "夏洛特", "影", "马超"],
    redBans: ["沈梦溪", "关羽", "阿古朵", "嬴政", "王昭君"],
    bluePicks: ["轻语-狂铁", "无双-橘右京", "清融-甄姬", "小寒-蚩奼", "无畏-鲁班大师"],
    redPicks: ["轩染-司空震", "染详-夏侯惇", "小凡-海月", "小俞-狄仁杰", "大帅-元流之子（辅助）"],
    source: "虎扑赛后帖：JDG 3-2 AG",
    sourceUrl: "https://voice.hupu.com/bbs/637502661",
  }),
  match({
    id: "2026-jdg-ag-g5",
    date: "2026-02-13",
    game: "Game 5",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 3-2 AG",
    blueBans: ["鲁班大师", "盾山", "女娲", "大司命", "裴擒虎"],
    redBans: ["沈梦溪", "嬴政", "海月", "杨玉环", "虞姬"],
    bluePicks: ["轻语-夏洛特", "无双-镜", "清融-小乔", "小寒-苍", "无畏-张飞"],
    redPicks: ["轩染-马超", "染详-铠", "小凡-武则天", "小俞-敖隐", "大帅-空空儿"],
    source: "虎扑赛后帖：JDG 3-2 AG",
    sourceUrl: "https://voice.hupu.com/bbs/637502661",
  }),
  match({
    id: "2026-ksg-wb-g1",
    date: "2026-03-21",
    game: "Game 1",
    blueTeam: "北京WB",
    redTeam: "苏州KSG",
    result: "KSG 1-0 WB",
    blueBans: ["蚩奼", "关羽", "狂铁", "马超", "云缨"],
    redBans: ["鲁班大师", "盾山", "白起", "司空震", "蒙恬"],
    bluePicks: ["梓墨-曹操", "暖阳-大司命", "听悦-沈梦溪", "小麦-敖隐", "玖欣-张飞"],
    redPicks: ["无言-夏洛特", "句号-阿古朵", "流浪-嫦娥", "小屿-苍", "一笙-苏烈"],
    source: "虎扑赛后帖：KSG 3-1 WB",
    sourceUrl: "https://bbs.hupu.com/638019344.html",
  }),
  match({
    id: "2026-ksg-wb-g2",
    date: "2026-03-21",
    game: "Game 2",
    blueTeam: "苏州KSG",
    redTeam: "北京WB",
    result: "KSG 2-0 WB",
    blueBans: ["苏烈", "狄仁杰", "公孙离", "少司缘", "大禹"],
    redBans: ["盾山", "鲁班大师", "敖隐", "张良", "东皇太一"],
    bluePicks: ["无言-吕布", "句号-元流之子（坦克）", "流浪-女娲", "小屿-蚩奼", "一笙-墨子"],
    redPicks: ["梓墨-狂铁", "暖阳-哪吒", "听悦-海月", "小麦-孙权", "玖欣-孙膑"],
    source: "虎扑赛后帖：KSG 3-1 WB",
    sourceUrl: "https://bbs.hupu.com/638019622.html",
  }),
  match({
    id: "2026-ksg-wb-g3",
    date: "2026-03-21",
    game: "Game 3",
    blueTeam: "苏州KSG",
    redTeam: "北京WB",
    result: "WB 1-2 KSG",
    blueBans: ["苏烈", "元流之子（坦克）", "马超", "夏洛特", "云缨"],
    redBans: ["盾山", "鲁班大师", "哪吒", "镜", "少司缘"],
    bluePicks: ["无言-关羽", "句号-大司命", "流浪-沈梦溪", "小屿-敖隐", "一笙-赵怀真"],
    redPicks: ["梓墨-达摩", "暖阳-夏侯惇", "听悦-嫦娥", "小麦-孙尚香", "玖欣-太乙真人"],
    source: "虎扑赛后帖：KSG 3-1 WB",
    sourceUrl: "https://bbs.hupu.com/638019957.html",
  }),
  match({
    id: "2026-ksg-wb-g4",
    date: "2026-03-21",
    game: "Game 4",
    blueTeam: "北京WB",
    redTeam: "苏州KSG",
    result: "KSG 3-1 WB",
    blueBans: ["狄仁杰", "海月", "哪吒", "杨戬", "镜"],
    redBans: ["鲁班大师", "关羽", "女娲", "武则天", "不知火舞"],
    bluePicks: ["梓墨-庄周", "暖阳-云缨", "听悦-小乔", "小麦-艾琳", "玖欣-盾山"],
    redPicks: ["无言-白起", "句号-马超", "流浪-西施", "小屿-孙尚香", "一笙-太乙真人"],
    source: "虎扑赛后帖：KSG 3-1 WB",
    sourceUrl: "https://k.sina.cn/article_7857201856_1d45362c001903gjuc.html?from=game&subch=ogame",
  }),
  match({
    id: "2026-lgd-wb-g1",
    date: "2026-03-30",
    game: "Game 1",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "LGD 1-0 WB",
    blueBans: ["海月", "太乙真人", "沈梦溪", "女娲", "不知火舞"],
    redBans: ["鲁班大师", "盾山", "关羽", "曹操", "老夫子"],
    bluePicks: ["小落-狂铁", "米苏-杨戬", "九尾-小乔", "小久-敖隐", "小崽-少司缘"],
    redPicks: ["梓墨-白起", "暖阳-宫本武藏", "听悦-安琪拉", "小麦-公孙离", "玖欣-大禹"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
  }),
  match({
    id: "2026-lgd-wb-g2",
    date: "2026-03-30",
    game: "Game 2",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "WB 1-1 LGD",
    blueBans: ["大禹", "狄仁杰", "海月", "不知火舞", "云缨"],
    redBans: ["敖隐", "鲁班大师", "元流之子（坦克）", "大司命", "曹操"],
    bluePicks: ["梓墨-姬小满", "暖阳-橘右京", "听悦-沈梦溪", "小麦-艾琳", "玖欣-盾山"],
    redPicks: ["小落-关羽", "米苏-哪吒", "九尾-武则天", "小久-蚩奼", "小崽-苏烈"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638186515.html",
  }),
  match({
    id: "2026-lgd-wb-g3",
    date: "2026-03-30",
    game: "Game 3",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "LGD 2-1 WB",
    blueBans: ["盾山", "元流之子（辅助）", "夏洛特", "曹操", "阿古朵"],
    redBans: ["敖隐", "戈娅", "嫦娥", "不知火舞", "关羽"],
    bluePicks: ["梓墨-司空震", "暖阳-元流之子（坦克）", "听悦-女娲", "小麦-苍", "玖欣-鲁班大师"],
    redPicks: ["小落-白起", "米苏-云缨", "九尾-沈梦溪", "小久-狄仁杰", "小崽-张飞"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
  }),
  match({
    id: "2026-lgd-wb-g4",
    date: "2026-03-30",
    game: "Game 4",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "WB 2-2 LGD",
    blueBans: ["盾山", "鲁班大师", "海月", "女娲", "阿古朵"],
    redBans: ["苏烈", "张飞", "少司缘", "墨子", "太乙真人"],
    bluePicks: ["梓墨-曹操", "暖阳-大司命", "听悦-小乔", "小麦-戈娅", "玖欣-张良"],
    redPicks: ["小落-夏洛特", "米苏-铠", "九尾-姜子牙", "小久-孙权", "小崽-大禹"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
  }),
  match({
    id: "2026-lgd-wb-g5",
    date: "2026-03-30",
    game: "Game 5",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "LGD 3-2 WB",
    blueBans: ["鲁班大师", "盾山", "张良", "墨子", "不知火舞"],
    redBans: ["敖隐", "蚩奼", "阿古朵", "海月", "西施"],
    bluePicks: ["梓墨-狂铁", "暖阳-娜可露露", "听悦-嫦娥", "小麦-孙尚香", "玖欣-太乙真人"],
    redPicks: ["小落-曹操", "米苏-大司命", "九尾-嬴政", "小久-戈娅", "小崽-廉颇"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
  }),
  match({
    id: "2026-lgd-wb-g6",
    date: "2026-03-30",
    game: "Game 6",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "WB 3-3 LGD",
    blueBans: ["敖隐", "阿古朵", "后羿", "虞姬", "云缨"],
    redBans: ["盾山", "鲁班大师", "司空震", "元流之子（坦克）", "达摩"],
    bluePicks: ["小落-吕布", "米苏-裴擒虎", "九尾-海月", "小久-公孙离", "小崽-墨子"],
    redPicks: ["梓墨-夏洛特", "暖阳-曜", "听悦-武则天", "小麦-狄仁杰", "玖欣-张飞"],
    source: "虎扑赛后帖：LGD vs WB 季后赛 BO7",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
  }),
  match({
    id: "2026-lgd-wb-g7",
    date: "2026-03-30",
    game: "Game 7",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "LGD 4-3 WB",
    blueBans: [],
    redBans: [],
    bluePicks: ["梓墨-司空震", "暖阳-元流之子（坦克）", "听悦-沈梦溪", "小麦-敖隐", "玖欣-鲁班大师"],
    redPicks: ["小落-曹操", "米苏-大司命", "九尾-沈梦溪", "小久-敖隐", "小崽-鲁班大师"],
    source: "虎扑赛后帖：LGD vs WB 季后赛巅峰对决",
    sourceUrl: "https://bbs.hupu.com/638189132.html",
    note: "巅峰对决公开文本只有 Pick，没有 Ban，聚类时应单独标记。"
  }),
  match({
    id: "2026-ttg-hero-g1",
    date: "2026-03-27",
    game: "Game 1",
    blueTeam: "广州TTG",
    redTeam: "南通Hero久竞",
    result: "TTG 1-0 Hero",
    blueBans: ["元流之子（辅助）", "盾山", "赵怀真", "夏侯惇", "庄周"],
    redBans: ["艾琳", "杨戬", "不知火舞", "海月", "嫦娥"],
    bluePicks: ["萝卜-狂铁", "佳心-橘右京", "鹤辞-武则天", "小雪-虞姬", "涵-鲁班大师"],
    redPicks: ["坦然-关羽", "落尘-云缨", "玖熙-沈梦溪", "妖刀-敖隐", "白清-廉颇"],
    source: "虎扑赛后帖：TTG 1-0 Hero",
    sourceUrl: "https://bbs.hupu.com/638137564.html",
  }),
];
