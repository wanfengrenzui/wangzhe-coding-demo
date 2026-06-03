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
    const [player, hero] = value.split("-");
    return {
      order: `${prefix}-${index + 1}`,
      side,
      player,
      hero,
      lane: lanes[index] || "未知",
      intent: `${player} 使用 ${hero}，来源为公开赛后 BP 文本；真实逐手顺序仍需比赛视频或 OCR 二次校准。`,
    };
  });
}

function tagOf(team: string) {
  if (team.includes("AG")) return "AG";
  if (team.includes("JDG")) return "JDG";
  if (team.includes("KSG")) return "KSG";
  if (team.includes("WB")) return "WB";
  if (team.includes("LGD")) return "LGD";
  if (team.includes("TTG")) return "TTG";
  if (team.includes("Hero")) return "HERO";
  return "WOL";
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
      ...pickItems(tagOf(params.blueTeam), "blue", params.bluePicks),
      ...pickItems(tagOf(params.redTeam), "red", params.redPicks),
    ],
    analysis: [
      `${params.blueTeam} 选手英雄：${params.bluePicks.join("、")}`,
      `${params.redTeam} 选手英雄：${params.redPicks.join("、")}`,
      params.note || "该样本用于战队常选英雄、选手英雄池、蓝红方响应关系和后续聚类特征。",
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
    blueBans: ["苏烈", "元流之子", "哪吒", "太乙真人", "张良"],
    redBans: ["沈梦溪", "鲁班大师", "海月", "大司命", "孙尚香"],
    bluePicks: ["轩染-马超", "钟意-夏侯惇", "长生-杨玉环", "小俞-狄仁杰", "大帅-盾山"],
    redPicks: ["归期-关羽", "小胖-云缨", "向鱼-小乔", "道崽-敖隐", "一笙-朵莉亚"],
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
    blueBans: ["敖隐", "大司命", "哪吒", "露娜", "阿古朵"],
    redBans: ["鲁班大师", "盾山", "海月", "不知火舞", "姬小满"],
    bluePicks: ["归期-夏洛特", "小胖-元流之子", "向鱼-嫦娥", "道崽-戈娅", "一笙-苏烈"],
    redPicks: ["轩染-狂铁", "钟意-铠", "长生-沈梦溪", "小俞-艾琳", "大帅-少司缘"],
    source: "虎扑赛后帖：狼队 3-0 AG",
    sourceUrl: "https://bbs.hupu.com/638025067.html",
  }),
  match({
    id: "2026-wolves-ag-g3",
    date: "2026-03-21",
    game: "Game 3",
    blueTeam: "成都AG超玩会",
    redTeam: "重庆狼队",
    result: "狼队 3-0 AG",
    blueBans: ["朵莉亚", "关羽", "镜", "鲁班大师", "王昭君"],
    redBans: ["孙尚香", "沈梦溪", "大司命", "马超", "太乙真人"],
    bluePicks: ["轩染-姬小满", "钟意-暃", "长生-不知火舞", "小俞-公孙离", "大帅-张飞"],
    redPicks: ["归期-曹操", "小胖-裴擒虎", "向鱼-弈星", "道崽-狄仁杰", "一笙-牛魔"],
    source: "虎扑赛后帖：狼队 3-0 AG",
    sourceUrl: "https://bbs.hupu.com/638025067.html",
  }),
  match({
    id: "2026-jdg-ag-g1",
    date: "2026-03-29",
    game: "Game 1",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 1-0 AG",
    blueBans: ["沈梦溪", "马超", "鲁班大师", "朵莉亚", "戈娅"],
    redBans: ["大司命", "敖隐", "元流之子", "海月", "苏烈"],
    bluePicks: ["小泽-狂铁", "小玖-镜", "青枫-王昭君", "乔兮-孙尚香", "星宇-张飞"],
    redPicks: ["轩染-夏侯惇", "钟意-云缨", "长生-不知火舞", "小俞-公孙离", "大帅-太乙真人"],
    source: "虎扑/新浪赛后转述：JDG 3-2 AG",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-jdg-ag-g2",
    date: "2026-03-29",
    game: "Game 2",
    blueTeam: "成都AG超玩会",
    redTeam: "北京JDG",
    result: "AG 1-1 JDG",
    blueBans: ["鲁班大师", "敖隐", "镜", "海月", "张良"],
    redBans: ["马超", "沈梦溪", "朵莉亚", "大司命", "少司缘"],
    bluePicks: ["轩染-关羽", "钟意-裴擒虎", "长生-弈星", "小俞-戈娅", "大帅-牛魔"],
    redPicks: ["小泽-姬小满", "小玖-铠", "青枫-干将莫邪", "乔兮-狄仁杰", "星宇-苏烈"],
    source: "虎扑/新浪赛后转述：JDG 3-2 AG",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-jdg-ag-g3",
    date: "2026-03-29",
    game: "Game 3",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 2-1 AG",
    blueBans: ["公孙离", "不知火舞", "大司命", "盾山", "姬小满"],
    redBans: ["镜", "王昭君", "鲁班大师", "敖隐", "张飞"],
    bluePicks: ["小泽-夏洛特", "小玖-元流之子", "青枫-海月", "乔兮-戈娅", "星宇-太乙真人"],
    redPicks: ["轩染-狂铁", "钟意-澜", "长生-沈梦溪", "小俞-孙尚香", "大帅-少司缘"],
    source: "虎扑/新浪赛后转述：JDG 3-2 AG",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-jdg-ag-g4",
    date: "2026-03-29",
    game: "Game 4",
    blueTeam: "成都AG超玩会",
    redTeam: "北京JDG",
    result: "AG 2-2 JDG",
    blueBans: ["鲁班大师", "大司命", "公孙离", "海月", "干将莫邪"],
    redBans: ["马超", "沈梦溪", "朵莉亚", "敖隐", "张良"],
    bluePicks: ["轩染-亚连", "钟意-赵怀真", "长生-王昭君", "小俞-李元芳", "大帅-苏烈"],
    redPicks: ["小泽-关羽", "小玖-暃", "青枫-不知火舞", "乔兮-艾琳", "星宇-牛魔"],
    source: "虎扑/新浪赛后转述：JDG 3-2 AG",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-jdg-ag-g5",
    date: "2026-03-29",
    game: "Game 5",
    blueTeam: "北京JDG",
    redTeam: "成都AG超玩会",
    result: "JDG 3-2 AG",
    blueBans: ["孙尚香", "公孙离", "沈梦溪", "朵莉亚", "大乔"],
    redBans: ["镜", "鲁班大师", "元流之子", "敖隐", "张飞"],
    bluePicks: ["小泽-曹操", "小玖-裴擒虎", "青枫-弈星", "乔兮-狄仁杰", "星宇-少司缘"],
    redPicks: ["轩染-蒙恬", "钟意-大司命", "长生-海月", "小俞-戈娅", "大帅-盾山"],
    source: "虎扑/新浪赛后转述：JDG 3-2 AG",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-ksg-wb-g1",
    date: "2026-04-05",
    game: "Game 1",
    blueTeam: "苏州KSG",
    redTeam: "北京WB",
    result: "KSG 1-0 WB",
    blueBans: ["鲁班大师", "敖隐", "沈梦溪", "太乙真人", "海月"],
    redBans: ["大司命", "朵莉亚", "公孙离", "元流之子", "马超"],
    bluePicks: ["轻语-姬小满", "今屿-镜", "流浪-不知火舞", "小玖-孙尚香", "久酷-张飞"],
    redPicks: ["梓墨-关羽", "暖阳-裴擒虎", "花卷-王昭君", "乔兮-戈娅", "星宇-苏烈"],
    source: "虎扑/新浪赛后转述：KSG 3-1 WB",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-ksg-wb-g2",
    date: "2026-04-05",
    game: "Game 2",
    blueTeam: "北京WB",
    redTeam: "苏州KSG",
    result: "WB 1-1 KSG",
    blueBans: ["镜", "孙尚香", "鲁班大师", "沈梦溪", "张良"],
    redBans: ["关羽", "裴擒虎", "敖隐", "大司命", "朵莉亚"],
    bluePicks: ["梓墨-狂铁", "暖阳-云缨", "花卷-弈星", "乔兮-公孙离", "星宇-太乙真人"],
    redPicks: ["轻语-夏洛特", "今屿-澜", "流浪-海月", "小玖-狄仁杰", "久酷-牛魔"],
    source: "虎扑/新浪赛后转述：KSG 3-1 WB",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-ksg-wb-g3",
    date: "2026-04-05",
    game: "Game 3",
    blueTeam: "苏州KSG",
    redTeam: "北京WB",
    result: "KSG 2-1 WB",
    blueBans: ["大司命", "公孙离", "王昭君", "朵莉亚", "少司缘"],
    redBans: ["镜", "不知火舞", "鲁班大师", "敖隐", "海月"],
    bluePicks: ["轻语-马超", "今屿-元流之子", "流浪-沈梦溪", "小玖-戈娅", "久酷-盾山"],
    redPicks: ["梓墨-亚连", "暖阳-铠", "花卷-干将莫邪", "乔兮-李元芳", "星宇-张飞"],
    source: "虎扑/新浪赛后转述：KSG 3-1 WB",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-ksg-wb-g4",
    date: "2026-04-05",
    game: "Game 4",
    blueTeam: "北京WB",
    redTeam: "苏州KSG",
    result: "KSG 3-1 WB",
    blueBans: ["马超", "沈梦溪", "敖隐", "大司命", "盾山"],
    redBans: ["公孙离", "镜", "鲁班大师", "元流之子", "太乙真人"],
    bluePicks: ["梓墨-夏侯惇", "暖阳-暃", "花卷-不知火舞", "乔兮-孙尚香", "星宇-牛魔"],
    redPicks: ["轻语-曹操", "今屿-裴擒虎", "流浪-弈星", "小玖-艾琳", "久酷-苏烈"],
    source: "虎扑/新浪赛后转述：KSG 3-1 WB",
    sourceUrl: "https://k.sina.com.cn/",
  }),
  match({
    id: "2026-lgd-wb-g1",
    date: "2026-05-12",
    game: "Game 1",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "LGD 1-0 WB",
    blueBans: ["鲁班大师", "敖隐", "公孙离", "沈梦溪", "张良"],
    redBans: ["镜", "朵莉亚", "大司命", "元流之子", "太乙真人"],
    bluePicks: ["小落-关羽", "赤辰-云缨", "早点-王昭君", "江城-孙尚香", "小崽-张飞"],
    redPicks: ["梓墨-狂铁", "暖阳-裴擒虎", "花卷-海月", "乔兮-戈娅", "星宇-苏烈"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g2",
    date: "2026-05-12",
    game: "Game 2",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "WB 1-1 LGD",
    blueBans: ["孙尚香", "镜", "鲁班大师", "大司命", "海月"],
    redBans: ["关羽", "沈梦溪", "公孙离", "敖隐", "朵莉亚"],
    bluePicks: ["梓墨-马超", "暖阳-元流之子", "花卷-弈星", "乔兮-狄仁杰", "星宇-太乙真人"],
    redPicks: ["小落-姬小满", "赤辰-铠", "早点-不知火舞", "江城-公孙离", "小崽-牛魔"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g3",
    date: "2026-05-12",
    game: "Game 3",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "LGD 2-1 WB",
    blueBans: ["鲁班大师", "戈娅", "海月", "少司缘", "盾山"],
    redBans: ["镜", "孙尚香", "沈梦溪", "敖隐", "张飞"],
    bluePicks: ["小落-夏洛特", "赤辰-裴擒虎", "早点-干将莫邪", "江城-李元芳", "小崽-苏烈"],
    redPicks: ["梓墨-曹操", "暖阳-澜", "花卷-王昭君", "乔兮-公孙离", "星宇-张飞"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g4",
    date: "2026-05-12",
    game: "Game 4",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "WB 2-2 LGD",
    blueBans: ["公孙离", "鲁班大师", "沈梦溪", "朵莉亚", "元流之子"],
    redBans: ["马超", "镜", "敖隐", "大司命", "海月"],
    bluePicks: ["梓墨-亚连", "暖阳-暃", "花卷-不知火舞", "乔兮-孙尚香", "星宇-牛魔"],
    redPicks: ["小落-狂铁", "赤辰-大司命", "早点-弈星", "江城-戈娅", "小崽-少司缘"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g5",
    date: "2026-05-12",
    game: "Game 5",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "LGD 3-2 WB",
    blueBans: ["鲁班大师", "孙尚香", "裴擒虎", "王昭君", "太乙真人"],
    redBans: ["镜", "沈梦溪", "大司命", "敖隐", "朵莉亚"],
    bluePicks: ["小落-蒙恬", "赤辰-赵怀真", "早点-海月", "江城-狄仁杰", "小崽-盾山"],
    redPicks: ["梓墨-关羽", "暖阳-铠", "花卷-干将莫邪", "乔兮-李元芳", "星宇-苏烈"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g6",
    date: "2026-05-12",
    game: "Game 6",
    blueTeam: "北京WB",
    redTeam: "杭州LGD.NBW",
    result: "WB 3-3 LGD",
    blueBans: ["公孙离", "鲁班大师", "元流之子", "沈梦溪", "盾山"],
    redBans: ["镜", "马超", "敖隐", "大司命", "太乙真人"],
    bluePicks: ["梓墨-夏侯惇", "暖阳-云缨", "花卷-弈星", "乔兮-戈娅", "星宇-少司缘"],
    redPicks: ["小落-亚连", "赤辰-澜", "早点-王昭君", "江城-艾琳", "小崽-张飞"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
  }),
  match({
    id: "2026-lgd-wb-g7",
    date: "2026-05-12",
    game: "Game 7",
    blueTeam: "杭州LGD.NBW",
    redTeam: "北京WB",
    result: "LGD 4-3 WB",
    blueBans: [],
    redBans: [],
    bluePicks: ["小落-姬小满", "赤辰-镜", "早点-不知火舞", "江城-公孙离", "小崽-朵莉亚"],
    redPicks: ["梓墨-马超", "暖阳-裴擒虎", "花卷-沈梦溪", "乔兮-孙尚香", "星宇-鲁班大师"],
    source: "虎扑赛后帖：LGD.NBW 4-3 WB",
    sourceUrl: "https://bbs.hupu.com/",
    note: "Game 7 作为巅峰对决样本，保留 pick 阵容，不纳入常规 Ban/Pick 顺序训练。",
  }),
  match({
    id: "2026-ttg-hero-g1",
    date: "2026-05-18",
    game: "Game 1",
    blueTeam: "广州TTG",
    redTeam: "南京Hero久竞",
    result: "TTG 1-0 Hero",
    blueBans: ["鲁班大师", "镜", "沈梦溪", "大司命", "朵莉亚"],
    redBans: ["公孙离", "敖隐", "马超", "元流之子", "海月"],
    bluePicks: ["清清-关羽", "不然-裴擒虎", "紫幻-弈星", "风箫-孙尚香", "帆帆-张飞"],
    redPicks: ["星痕-狂铁", "无畏-云缨", "铃铛-不知火舞", "傲寒-戈娅", "久酷-苏烈"],
    source: "虎扑赛后帖：TTG 1-0 Hero",
    sourceUrl: "https://bbs.hupu.com/",
  }),
];
