export type DraftCheckpoint = {
  at: number;
  phase: string;
  evidence: string;
  status: "frame-located" | "needs-ocr";
};

export type DraftVideoGameSource = {
  matchId: string;
  bvid: string;
  cid: number;
  page: number;
  part: string;
  duration: number;
  url: string;
  bpWindow?: {
    start: number;
    end: number;
  };
  checkpoints: DraftCheckpoint[];
  status: "video-indexed" | "bp-window-located" | "ocr-ready";
};

export const draftVideoSources: DraftVideoGameSource[] = [
  {
    matchId: "2026-wolves-ag-g1",
    bvid: "BV1QXAAzsEZD",
    cid: 36865835856,
    page: 1,
    part: "第一局",
    duration: 2226,
    url: "https://www.bilibili.com/video/BV1QXAAzsEZD/?p=1",
    bpWindow: { start: 300, end: 450 },
    status: "bp-window-located",
    checkpoints: [
      {
        at: 300,
        phase: "BP first-pick entry",
        evidence: "Official Bilibili replay frame shows the KPL draft board with both teams, empty pick slots, and picking timer.",
        status: "frame-located",
      },
      {
        at: 330,
        phase: "B1 into R1/R2",
        evidence: "Frame shows blue first pick locked and red first response pair visible on the right side.",
        status: "needs-ocr",
      },
      {
        at: 360,
        phase: "B2/B3 response",
        evidence: "Frame shows the next blue-side pick block and red-side early picks, suitable for OCR/template matching.",
        status: "needs-ocr",
      },
      {
        at: 420,
        phase: "second ban phase",
        evidence: "Frame shows the draft has moved back to banning after the first pick rotation.",
        status: "needs-ocr",
      },
    ],
  },
  {
    matchId: "2026-wolves-ag-g2",
    bvid: "BV1QXAAzsEZD",
    cid: 36866558772,
    page: 2,
    part: "第二局",
    duration: 1702,
    url: "https://www.bilibili.com/video/BV1QXAAzsEZD/?p=2",
    status: "video-indexed",
    checkpoints: [],
  },
  {
    matchId: "2026-wolves-ag-g3",
    bvid: "BV1QXAAzsEZD",
    cid: 36867280757,
    page: 3,
    part: "第三局",
    duration: 1710,
    url: "https://www.bilibili.com/video/BV1QXAAzsEZD/?p=3",
    status: "video-indexed",
    checkpoints: [],
  },
];

export function getDraftVideoSource(matchId: string) {
  return draftVideoSources.find((item) => item.matchId === matchId);
}

export function formatDraftTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
