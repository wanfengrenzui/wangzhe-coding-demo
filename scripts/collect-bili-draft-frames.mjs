import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBvid = "BV1QXAAzsEZD";
const defaultSeconds = [300, 330, 360, 420];

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function getOptionalFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  try {
    const module = await import("ffmpeg-static");
    if (module.default && existsSync(module.default)) return module.default;
  } catch {
    // Optional dependency. The script still creates metadata and OCR tasks without it.
  }

  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return probe.status === 0 ? "ffmpeg" : "";
}

async function biliGet(pathname, params, bvid) {
  const url = new URL(`https://api.bilibili.com${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      referer: `https://www.bilibili.com/video/${bvid}/`,
    },
  });

  if (!response.ok) throw new Error(`${pathname} failed with HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(`${pathname} failed: ${payload.code} ${payload.message}`);
  return payload.data;
}

function selectVideoStream(playurl) {
  const videos = playurl.dash?.video ?? [];
  const candidates = videos
    .filter((item) => item.id === 16 || item.id === 32 || item.id === 64)
    .sort((a, b) => Number(a.bandwidth ?? 0) - Number(b.bandwidth ?? 0));
  return candidates[0] ?? videos[0];
}

function extractFrame({ bvid, ffmpeg, outPath, seconds, streamUrl }) {
  const result = spawnSync(
    ffmpeg,
    [
      "-y",
      "-headers",
      `Referer: https://www.bilibili.com/video/${bvid}/\r\nUser-Agent: Mozilla/5.0\r\n`,
      "-ss",
      String(seconds),
      "-i",
      streamUrl,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outPath,
    ],
    { encoding: "utf8", timeout: 60_000 },
  );

  if (result.status !== 0) {
    return {
      ok: false,
      error: result.stderr?.split("\n").slice(-6).join("\n") || "ffmpeg failed",
    };
  }

  return { ok: true };
}

async function main() {
  const bvid = getArg("--bvid", defaultBvid);
  const outDir = path.resolve(repoRoot, getArg("--out-dir", "tmp/bili-draft-frames"));
  const seconds = getArg("--seconds", "")
    ? getArg("--seconds").split(",").map((item) => Number(item.trim())).filter(Number.isFinite)
    : defaultSeconds;
  const extract = hasFlag("--extract");

  await mkdir(outDir, { recursive: true });

  const view = await biliGet("/x/web-interface/view", { bvid }, bvid);
  const ffmpeg = extract ? await getOptionalFfmpeg() : "";
  const games = [];

  for (const page of view.pages ?? []) {
    if (!/第.+局/.test(page.part)) continue;

    const playurl = await biliGet(
      "/x/player/playurl",
      { bvid, cid: page.cid, qn: 16, fnval: 16 },
      bvid,
    );
    const stream = selectVideoStream(playurl);
    const frameTasks = seconds.map((second) => ({
      at: second,
      out: path.join(outDir, `${bvid}-p${page.page}-${second}s.jpg`),
      status: "queued",
    }));

    if (extract && ffmpeg && stream?.baseUrl) {
      for (const task of frameTasks) {
        const result = extractFrame({
          bvid,
          ffmpeg,
          outPath: task.out,
          seconds: task.at,
          streamUrl: stream.baseUrl,
        });
        task.status = result.ok ? "extracted" : "failed";
        if (!result.ok) task.error = result.error;
      }
    }

    games.push({
      page: page.page,
      cid: page.cid,
      part: page.part,
      duration: page.duration,
      url: `https://www.bilibili.com/video/${bvid}/?p=${page.page}`,
      streamAvailable: Boolean(stream?.baseUrl),
      frameTasks,
    });
  }

  const report = {
    bvid,
    title: view.title,
    owner: view.owner,
    sourceUrl: `https://www.bilibili.com/video/${bvid}/`,
    collectedAt: new Date().toISOString(),
    extraction: {
      requested: extract,
      ffmpeg: ffmpeg || null,
      note: ffmpeg
        ? "Frames can be extracted locally and then sent to OCR/template matching."
        : "Install ffmpeg or set FFMPEG_PATH to extract frames; metadata and OCR tasks are still generated.",
    },
    games,
  };

  const reportPath = path.join(outDir, `${bvid}-draft-report.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ reportPath, ...report }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
