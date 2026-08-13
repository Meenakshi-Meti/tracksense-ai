import { useEffect, useState } from "react";

export const WEATHER_API_KEY: string =
  (import.meta.env["VITE_WEATHER_API_KEY"] as string | undefined) ??
  "a7e6586184a668d499fb5f761141e950";

export const WEATHER_API_BASE = "https://api.openweathermap.org/data/2.5/weather";

export interface RaceTrack {
  id: string;
  name: string;
  circuit: string;
  country: string;
  lat: number;
  lon: number;
}

/** Live circuits you can point the weather radar at. */
export const RACE_TRACKS: RaceTrack[] = [
  { id: "silverstone", name: "Silverstone", circuit: "Silverstone Circuit", country: "GB", lat: 52.0786, lon: -1.0169 },
  { id: "monza", name: "Monza", circuit: "Autodromo Nazionale Monza", country: "IT", lat: 45.6156, lon: 9.281 },
  { id: "spa", name: "Spa", circuit: "Circuit de Spa-Francorchamps", country: "BE", lat: 50.4372, lon: 5.9714 },
  { id: "monaco", name: "Monaco", circuit: "Circuit de Monaco", country: "MC", lat: 43.7347, lon: 7.4206 },
  { id: "cota", name: "COTA", circuit: "Circuit of the Americas", country: "US", lat: 30.1328, lon: -97.6411 },
  { id: "suzuka", name: "Suzuka", circuit: "Suzuka International Racing Course", country: "JP", lat: 34.8431, lon: 136.5411 },
  { id: "interlagos", name: "Interlagos", circuit: "Autódromo José Carlos Pace", country: "BR", lat: -23.7036, lon: -46.6997 },
  { id: "melbourne", name: "Melbourne", circuit: "Albert Park Circuit", country: "AU", lat: -37.8497, lon: 144.9683 },
  { id: "bahrain", name: "Bahrain", circuit: "Bahrain International Circuit", country: "BH", lat: 26.0325, lon: 50.5106 },
  { id: "yas-marina", name: "Yas Marina", circuit: "Yas Marina Circuit", country: "AE", lat: 24.4672, lon: 54.6031 },
  { id: "zandvoort", name: "Zandvoort", circuit: "Circuit Zandvoort", country: "NL", lat: 52.3889, lon: 4.5409 },
  { id: "imola", name: "Imola", circuit: "Autodromo Enzo e Dino Ferrari", country: "IT", lat: 44.3439, lon: 11.7167 },
];

export const DEFAULT_TRACK_ID = "silverstone";

export interface WeatherReading {
  fetchedAt: number;
  location: string;
  country: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  windGust: number;
  clouds: number;
  rain1h: number;
  snow1h: number;
  description: string;
  main: string;
  icon: string;
  sunrise: number;
  sunset: number;
}

export function isRaining(w: WeatherReading | null): boolean {
  return !!w && (w.main === "Rain" || w.main === "Thunderstorm" || w.rain1h > 0);
}

export function isSnowing(w: WeatherReading | null): boolean {
  return !!w && (w.main === "Snow" || w.snow1h > 0);
}

export function isClear(w: WeatherReading | null): boolean {
  return !!w && w.main === "Clear";
}

export function isCloudy(w: WeatherReading | null): boolean {
  return !!w && w.main === "Clouds";
}

export function weatherWetness(w: WeatherReading | null): number {
  if (!w) return 0;
  let wetness = 0;
  if (w.rain1h > 0) wetness += Math.min(100, 45 + w.rain1h * 9);
  if (w.snow1h > 0) wetness += 30;
  if (w.main === "Rain") wetness = Math.max(wetness, 62);
  if (w.main === "Thunderstorm") wetness = Math.max(wetness, 82);
  if (w.main === "Drizzle") wetness = Math.max(wetness, 45);
  if (w.main === "Snow") wetness = Math.max(wetness, 40);
  if (w.main === "Mist" || w.main === "Fog") wetness = Math.max(wetness, 22);
  wetness += (100 - w.humidity) * 0.1;
  if (w.humidity > 80) wetness += (w.humidity - 80) * 0.6;
  return Math.round(Math.min(100, Math.max(0, wetness)));
}

export function windLabel(w: WeatherReading | null): string {
  if (!w) return "—";
  const kmh = w.windSpeed * 3.6;
  if (kmh < 1) return "CALM";
  if (kmh < 12) return "LIGHT";
  if (kmh < 29) return "MODERATE";
  if (kmh < 50) return "FRESH";
  return "STRONG";
}

export function windDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16] ?? "N";
}

export function uvHint(w: WeatherReading | null): string {
  if (!w) return "—";
  return isClear(w) ? "HIGH UV — sunscreen for driver change" : "LOW UV — overcast skies";
}

export function formatClock(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface WeatherState {
  track: RaceTrack;
  reading: WeatherReading | null;
  loading: boolean;
  error: string | null;
}

export async function fetchCurrentWeather(
  track: RaceTrack,
  signal?: AbortSignal,
): Promise<WeatherReading> {
  const url =
    `${WEATHER_API_BASE}?lat=${track.lat}&lon=${track.lon}&units=metric&appid=${WEATHER_API_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let detail = `weather API responded ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      detail = body?.message ?? detail;
    } catch {
      // non-JSON error body
    }
    throw new Error(detail);
  }
  const d = (await res.json()) as {
    name: string;
    sys?: { country?: string; sunrise?: number; sunset?: number };
    weather?: { id: number; main: string; description: string; icon: string }[];
    main?: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number; pressure: number };
    wind?: { speed: number; deg: number; gust: number };
    clouds?: { all: number };
    rain?: { "1h"?: number };
    snow?: { "1h"?: number };
  };
  return {
    fetchedAt: Date.now(),
    location: d.name || track.circuit,
    country: d.sys?.country ?? track.country,
    temp: d.main?.temp ?? 0,
    feelsLike: d.main?.feels_like ?? 0,
    tempMin: d.main?.temp_min ?? 0,
    tempMax: d.main?.temp_max ?? 0,
    humidity: d.main?.humidity ?? 0,
    pressure: d.main?.pressure ?? 0,
    windSpeed: d.wind?.speed ?? 0,
    windDeg: d.wind?.deg ?? 0,
    windGust: d.wind?.gust ?? 0,
    clouds: d.clouds?.all ?? 0,
    rain1h: d.rain?.["1h"] ?? 0,
    snow1h: d.snow?.["1h"] ?? 0,
    description: d.weather?.[0]?.description ?? "Unknown",
    main: d.weather?.[0]?.main ?? "Unknown",
    icon: d.weather?.[0]?.icon ?? "01d",
    sunrise: d.sys?.sunrise ?? 0,
    sunset: d.sys?.sunset ?? 0,
  };
}

const REFRESH_MS = 60_000;

export function useTrackWeather(trackId: string = DEFAULT_TRACK_ID): WeatherState {
  const track = RACE_TRACKS.find((t) => t.id === trackId) ?? RACE_TRACKS[0]!;
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCurrentWeather(track, controller.signal);
        if (alive) {
          setReading(data);
          setLoading(false);
        }
      } catch (err) {
        if (alive && !(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Weather fetch failed");
          setLoading(false);
        }
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [track.id, track.lat, track.lon]);

  return { track, reading, loading, error };
}
