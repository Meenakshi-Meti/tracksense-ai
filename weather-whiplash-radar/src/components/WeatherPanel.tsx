import { useMemo, useState, type ReactNode } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  DEFAULT_TRACK_ID,
  formatClock,
  RACE_TRACKS,
  useTrackWeather,
  uvHint,
  weatherWetness,
  windDir,
  windLabel,
} from "@/lib/weather";
import { CONDITION_META, labelFor } from "@/lib/track-analysis";

function WeatherScene({ main }: { main: string }) {
  if (main === "Clear") {
    return (
      <div className="weather-scene clear" aria-hidden>
        <div className="sun-disc" />
        <div className="sun-rays" />
      </div>
    );
  }
  if (main === "Thunderstorm") {
    return (
      <div className="weather-scene storm" aria-hidden>
        <div className="cloud-puff cloud-puff-a" />
        <div className="cloud-puff cloud-puff-b" />
        <div className="rain-drops" />
        <div className="lightning-flash" />
      </div>
    );
  }
  if (main === "Rain" || main === "Drizzle") {
    return (
      <div className="weather-scene rain" aria-hidden>
        <div className="cloud-puff cloud-puff-a" />
        <div className="cloud-puff cloud-puff-b" />
        <div className="rain-drops" />
      </div>
    );
  }
  if (main === "Snow") {
    return (
      <div className="weather-scene snow" aria-hidden>
        <div className="cloud-puff cloud-puff-a" />
        <div className="snow-flakes" />
      </div>
    );
  }
  if (main === "Mist" || main === "Fog" || main === "Haze") {
    return (
      <div className="weather-scene fog" aria-hidden>
        <div className="fog-bank fog-bank-a" />
        <div className="fog-bank fog-bank-b" />
      </div>
    );
  }
  if (main === "Clouds") {
    return (
      <div className="weather-scene clouds" aria-hidden>
        <div className="cloud-puff cloud-puff-a" />
        <div className="cloud-puff cloud-puff-b" />
      </div>
    );
  }
  return (
    <div className="weather-scene" aria-hidden>
      <div className="cloud-puff cloud-puff-a" />
    </div>
  );
}

function ConditionIcon({ main, icon }: { main: string; icon: string }) {
  const isNight = icon.endsWith("n");
  const cls = "size-5";
  switch (main) {
    case "Clear":
      return <Sun className={`${cls} ${isNight ? "text-flag-blue" : "text-flag-yellow"}`} />;
    case "Clouds":
      return <Cloud className={`${cls} text-muted-foreground`} />;
    case "Rain":
      return <CloudRain className={`${cls} text-flag-blue`} />;
    case "Drizzle":
      return <CloudDrizzle className={`${cls} text-flag-blue`} />;
    case "Thunderstorm":
      return <CloudLightning className={`${cls} text-flag-yellow`} />;
    case "Snow":
      return <CloudSnow className={`${cls} text-sky-300`} />;
    case "Mist":
    case "Fog":
    case "Haze":
      return <CloudFog className={`${cls} text-muted-foreground`} />;
    default:
      return <CloudSun className={`${cls} text-muted-foreground`} />;
  }
}

function TrackSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="relative block">
      <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-primary/40 bg-asphalt py-2 pl-8 pr-8 font-mono text-xs uppercase tracking-widest text-foreground outline-none transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {RACE_TRACKS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · {t.country}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 size-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-muted-foreground" />
    </label>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="stat-cell">
      {icon}
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className={`truncate font-display text-lg leading-tight ${accent ?? "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function WeatherPanel() {
  const [trackId, setTrackId] = useState(DEFAULT_TRACK_ID);
  const { track, reading, loading, error } = useTrackWeather(trackId);

  const wetness = useMemo(() => weatherWetness(reading), [reading]);
  const trackCall = labelFor(wetness);
  const callMeta = CONDITION_META[trackCall];

  const isDay = useMemo(() => {
    if (!reading) return true;
    const now = Math.floor(Date.now() / 1000);
    return now > reading.sunrise && now < reading.sunset;
  }, [reading]);

  const animateScene = useMemo(() => {
    if (loading || !reading) return false;
    return true;
  }, [loading, reading]);

  return (
    <section
      className={`panel-pit relative overflow-hidden rounded-lg p-6 transition-all duration-500 ${
        animateScene ? "panel-live" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between px-4 pt-2 font-mono text-[10px] uppercase tracking-widest">
        <span className="live-dot flex items-center gap-1.5 text-flag-red">
          <span className="size-1.5 rounded-full bg-flag-red" /> Live
        </span>
        <span className="text-muted-foreground">OWM · 60s refresh</span>
      </div>

      <div className="relative z-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="animate-fade-up">
            <h2 className="flex items-center gap-2 text-2xl">
              <Thermometer className="size-5 text-primary" /> Weather radar
            </h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {track.circuit}
            </p>
          </div>
          <div className="w-full max-w-xs animate-fade-up [animation-delay:80ms]">
            <TrackSelect value={trackId} onChange={setTrackId} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="relative min-h-[190px] overflow-hidden rounded-lg border border-border bg-asphalt">
            <WeatherScene main={reading?.main ?? "Clear"} />

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-asphalt/60">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin text-primary" /> Pulling telemetry
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-asphalt/80 p-6 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-flag-red">
                  Weather feed unavailable · {error}
                </p>
              </div>
            )}

            {reading && !loading && !error && (
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Now at {track.name}
                    </p>
                    <p className="mt-1 max-w-[180px] font-display text-3xl leading-none">
                      {reading.temp.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 backdrop-blur-sm">
                    <ConditionIcon main={reading.main} icon={reading.icon} />
                    <span className="font-mono text-[10px] uppercase tracking-widest">
                      {reading.main}
                    </span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {reading.description} · feels {reading.feelsLike.toFixed(0)}°
                  </p>
                  <p
                    className={`font-display text-4xl leading-none ${isDay ? "text-flag-yellow" : "text-flag-blue"}`}
                  >
                    {isDay ? "DAY" : "NIGHT"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Stat
              icon={<Droplets className="size-4 text-flag-blue" />}
              label="Humidity"
              value={reading ? `${reading.humidity}%` : "—"}
            />
            <Stat
              icon={<Wind className="size-4 text-primary" />}
              label="Wind"
              value={
                reading
                  ? `${windLabel(reading)} ${(reading.windSpeed * 3.6).toFixed(0)} km/h`
                  : "—"
              }
            />
            <Stat
              icon={<Navigation className="size-4 text-muted-foreground" />}
              label="Direction"
              value={reading ? `${windDir(reading.windDeg)} · ${reading.windDeg}°` : "—"}
            />
            <Stat
              icon={<Gauge className="size-4 text-flag-green" />}
              label="Pressure"
              value={reading ? `${reading.pressure} hPa` : "—"}
            />
            <Stat
              icon={<Sunrise className="size-4 text-flag-yellow" />}
              label="Sunrise"
              value={reading ? formatClock(reading.sunrise) : "—"}
            />
            <Stat
              icon={<Sunset className="size-4 text-kerb" />}
              label="Sunset"
              value={reading ? formatClock(reading.sunset) : "—"}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-4 rounded-md border border-border bg-asphalt p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <CloudRain className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Radar wetness call
              </p>
              <p className={`font-display text-3xl leading-none ${callMeta.tone}`}>
                {trackCall.toUpperCase()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{callMeta.blurb}</p>
            </div>
            <div className="w-32 shrink-0">
              <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Index</span>
                <span className={callMeta.tone}>{wetness}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-700 ${callMeta.tone === "text-flag-green" ? "bg-flag-green" : callMeta.tone === "text-flag-yellow" ? "bg-flag-yellow" : callMeta.tone === "text-flag-blue" ? "bg-flag-blue" : "bg-gradient-pit"}`}
                  style={{ width: `${wetness}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/10 px-4 py-3">
            <Sun className="size-5 text-flag-yellow" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-foreground/90">
              {uvHint(reading)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
