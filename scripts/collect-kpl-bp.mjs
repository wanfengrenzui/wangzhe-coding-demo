const sources = [
  {
    name: "狼队 3-0 AG",
    url: "https://bbs.hupu.com/638025067.html",
    games: 3,
  },
  {
    name: "北京JDG 3-2 成都AG超玩会",
    url: "https://voice.hupu.com/bbs/637502661",
    games: 5,
  },
  {
    name: "苏州KSG 3-1 北京WB",
    url: "https://bbs.hupu.com/638019344.html",
    games: 4,
  },
  {
    name: "杭州LGD.NBW 4-3 北京WB",
    url: "https://bbs.hupu.com/638189132.html",
    games: 7,
  },
  {
    name: "广州TTG 1-0 南通Hero久竞",
    url: "https://bbs.hupu.com/638137564.html",
    games: 1,
  },
];

async function main() {
  const checked = [];

  for (const source of sources) {
    const response = await fetch(source.url);
    checked.push({
      ...source,
      reachable: response.ok,
      status: response.status,
      confidence: "lineup-level BP; exact draft order still needs replay/OCR",
    });
  }

  process.stdout.write(JSON.stringify({
    totalGames: checked.reduce((sum, item) => sum + item.games, 0),
    sources: checked,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
