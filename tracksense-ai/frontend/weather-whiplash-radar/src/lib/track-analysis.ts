export type TrackCondition = "Dry" | "Damp" | "Wet" | "Drying";

export interface Reading {
  id: string;
  fileName: string;
  imageUrl: string;
  condition: TrackCondition;
  /** 0 = bone dry, 100 = standing water */
  wetnessIndex: number;
  confidence: number;
  timestamp: number;
}

/**
 * Classifies a frame via the TrackSense AI backend (FastAPI /api/analyze).
 * Falls back to a client-side estimate when the API is unreachable so the
 * demo keeps working offline. Override the API location with VITE_API_URL.
 */
const API_BASE: string = import.meta.env["VITE_API_URL"] ?? "http://127.0.0.1:8001";

let sessionId: string | undefined;

interface AnalyzeResponse {
  session_id: string;
  frame_id: number;
  condition: "DRY" | "DAMP" | "WET";
  confidence: number;
  probabilities: { DRY: number; DAMP: number; WET: number };
  timestamp: string;
}

const CONDITION_FROM_API: Record<AnalyzeResponse["condition"], TrackCondition> = {
  DRY: "Dry",
  DAMP: "Damp",
  WET: "Wet",
};

export async function analyzeImage(file: File, imageUrl: string): Promise<Omit<Reading, "id">> {
  try {
    const form = new FormData();
    form.append("file", file);
    if (sessionId) form.append("session_id", sessionId);

    const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`TrackSense API responded ${res.status}`);

    const data: AnalyzeResponse = await res.json();
    sessionId = data.session_id;

    return {
      fileName: file.name,
      imageUrl,
      condition: CONDITION_FROM_API[data.condition],
      wetnessIndex: Math.round(data.probabilities.WET + data.probabilities.DAMP * 0.5),
      confidence: Math.min(1, Math.max(0, data.confidence / 100)),
      timestamp: Date.now(),
    };
  } catch (err) {
    console.warn(`TrackSense API unreachable at ${API_BASE}, using client estimate.`, err);
    const wetness = await estimateWetness(imageUrl);
    return {
      fileName: file.name,
      imageUrl,
      wetnessIndex: wetness,
      condition: labelFor(wetness),
      confidence: Math.min(0.98, 0.72 + Math.abs(wetness - 50) / 200),
      timestamp: Date.now(),
    };
  }
}

export function labelFor(wetness: number): TrackCondition {
  if (wetness < 25) return "Dry";
  if (wetness < 50) return "Damp";
  return "Wet";
}

function estimateWetness(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(50);
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let sum = 0;
      let bright = 0;
      const lums: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const l = (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255;
        lums.push(l);
        sum += l;
        if (l > 0.82) bright++;
      }
      const mean = sum / lums.length;
      const variance = lums.reduce((a, l) => a + (l - mean) ** 2, 0) / lums.length;
      const specular = bright / lums.length;
      const raw = (1 - mean) * 70 + specular * 90 + Math.sqrt(variance) * 40;
      resolve(Math.max(2, Math.min(98, Math.round(raw))));
    };
    img.onerror = () => resolve(50);
    img.src = src;
  });
}

export type TrendDirection = "improving" | "worsening" | "stable";

export interface TrendResult {
  direction: TrendDirection;
  slope: number;
  headline: string;
  advice: string;
  displayCondition: TrackCondition;
}

export function computeTrend(readings: Reading[]): TrendResult | null {
  if (readings.length === 0) return null;
  const latest = readings[readings.length - 1]!;
  const window = readings.slice(-5);
  const slope =
    window.length < 2 ? 0 : (latest.wetnessIndex - window[0]!.wetnessIndex) / (window.length - 1);

  const direction: TrendDirection = slope < -3 ? "improving" : slope > 3 ? "worsening" : "stable";
  const drying = direction === "improving" && latest.wetnessIndex >= 25;
  const displayCondition: TrackCondition = drying ? "Drying" : latest.condition;

  if (drying) {
    return {
      direction,
      slope,
      displayCondition,
      headline: "Track drying",
      advice:
        latest.wetnessIndex < 40
          ? "Tire change window open — slicks are the call within 1–2 laps."
          : "Tire change window approaching. Prep slicks, hold one more lap.",
    };
  }
  if (direction === "worsening") {
    return {
      direction,
      slope,
      displayCondition,
      headline: "Conditions deteriorating",
      advice:
        latest.wetnessIndex > 65
          ? "Standing water risk — box for full wets now."
          : "Grip falling. Consider intermediates soon.",
    };
  }
  return {
    direction,
    slope,
    displayCondition,
    headline: "Conditions stable",
    advice:
      latest.wetnessIndex < 25
        ? "Dry line holding. Stay out on slicks."
        : "No change detected. Hold current compound and keep monitoring.",
  };
}

export const CONDITION_META: Record<
  TrackCondition,
  { tone: string; ring: string; blurb: string }
> = {
  Dry: { tone: "text-flag-green", ring: "ring-flag-green/40", blurb: "Full grip, slicks optimal" },
  Damp: { tone: "text-flag-yellow", ring: "ring-flag-yellow/40", blurb: "Patchy grip off-line" },
  Wet: { tone: "text-flag-blue", ring: "ring-flag-blue/40", blurb: "Low grip, aquaplaning risk" },
  Drying: { tone: "text-primary", ring: "ring-primary/40", blurb: "Crossover window forming" },
};
