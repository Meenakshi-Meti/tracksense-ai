export const API_BASE: string = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")
).replace(/\/+$/, "");

export interface BackendHealth {
  status: string;
  model_loaded: boolean;
  version: string;
}

export interface AnalyzeResponse {
  session_id: string;
  frame_id: number;
  condition: "DRY" | "DAMP" | "WET";
  confidence: number;
  probabilities: { DRY: number; DAMP: number; WET: number };
  timestamp: string;
}

export async function fetchHealth(): Promise<BackendHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check responded ${res.status}`);
  return (await res.json()) as BackendHealth;
}

export async function analyzeFrame(file: File, sessionId?: string): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  if (sessionId) form.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body?.detail ?? "";
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `TrackSense API responded ${res.status}`);
  }
  return (await res.json()) as AnalyzeResponse;
}
