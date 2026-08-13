import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flag, TrendingDown, TrendingUp, Minus, Gauge, Trash2, CircleDot } from "lucide-react";
import heroImg from "@/assets/track-hero.jpg";
import { FrameDropzone } from "@/components/FrameDropzone";
import { TrendChart } from "@/components/TrendChart";
import { Button } from "@/components/ui/button";
import {
  analyzeImage,
  computeTrend,
  CONDITION_META,
  type Reading,
} from "@/lib/track-analysis";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PitWall Radar — Live Track Condition Detector" },
      {
        name: "description",
        content:
          "Upload trackside or onboard frames and get instant Dry, Damp, Wet or Drying calls, a live wetness trend and tire-change guidance.",
      },
      { property: "og:title", content: "PitWall Radar — Live Track Condition Detector" },
      {
        property: "og:description",
        content:
          "Instant track surface calls, live wetness trend and tire-change window alerts for race engineers.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [busy, setBusy] = useState(false);

  const trend = useMemo(() => computeTrend(readings), [readings]);
  const latest = readings[readings.length - 1];

  async function handleFiles(files: File[]) {
    setBusy(true);
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const result = await analyzeImage(file, url);
      setReadings((prev) => [...prev, { ...result, id: crypto.randomUUID() }]);
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
  }

  const TrendIcon =
    trend?.direction === "improving"
      ? TrendingDown
      : trend?.direction === "worsening"
        ? TrendingUp
        : Minus;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden border-b border-border">
        <img
          src={heroImg}
          alt="Race cars on a wet floodlit circuit passing a checkered flag and cones"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="checker-strip absolute inset-x-0 top-0 h-4" />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em] text-primary">
            <CircleDot className="size-3 animate-pit-pulse" /> Live from the pit wall
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl leading-none sm:text-7xl">
            Weather <span className="text-gradient-pit">Whiplash</span> Radar
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Feed in trackside or onboard frames. Get the surface call, the trend, and the tire
            window — before the weather report catches up.
          </p>
        </div>
        <div className="kerb-strip h-2" />
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="panel-pit rounded-lg p-6">
            <h2 className="mb-4 flex items-center gap-2 text-2xl">
              <Flag className="size-5 text-primary" /> Frame intake
            </h2>
            <FrameDropzone onFiles={handleFiles} busy={busy} />

            {latest && (
              <div className="mt-6 grid gap-4 sm:grid-cols-[160px_1fr]">
                <img
                  src={latest.imageUrl}
                  alt={`Latest analysed track frame: ${latest.fileName}`}
                  loading="lazy"
                  className="h-32 w-full rounded-md border border-border object-cover"
                />
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Current call
                  </p>
                  <p
                    className={`font-display text-5xl leading-none ${CONDITION_META[trend?.displayCondition ?? latest.condition].tone}`}
                  >
                    {(trend?.displayCondition ?? latest.condition).toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {CONDITION_META[trend?.displayCondition ?? latest.condition].blurb} ·{" "}
                    {Math.round(latest.confidence * 100)}% confidence
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-pit transition-all duration-500"
                      style={{ width: `${latest.wetnessIndex}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Wetness index {latest.wetnessIndex}/100
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="panel-pit rounded-lg p-6">
            <h2 className="mb-4 flex items-center gap-2 text-2xl">
              <Gauge className="size-5 text-primary" /> Strategy call
            </h2>
            {trend ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 p-4">
                  <TrendIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-display text-2xl leading-tight">{trend.headline}</p>
                    <p className="mt-1 text-sm text-foreground/90">{trend.advice}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 font-mono text-xs uppercase tracking-widest">
                  {[
                    ["Frames", String(readings.length)],
                    ["Trend", trend.direction],
                    ["Δ / frame", `${trend.slope > 0 ? "+" : ""}${trend.slope.toFixed(1)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border bg-asphalt p-3">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="mt-1 font-display text-xl tracking-normal text-foreground">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="rounded-md border border-border bg-asphalt p-4 text-sm text-muted-foreground">
                No frames yet. Upload a shot of the racing surface to start the read.
              </p>
            )}

            <h3 className="mb-3 mt-8 text-xl">Wetness trend</h3>
            <TrendChart readings={readings} />
          </section>
        </div>

        {readings.length > 0 && (
          <section className="panel-pit mt-6 rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl">Frame log</h2>
              <Button variant="outline" size="sm" onClick={() => setReadings([])}>
                <Trash2 className="mr-2 size-4" /> Clear session
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {readings
                .slice()
                .reverse()
                .map((r) => (
                  <figure
                    key={r.id}
                    className={`overflow-hidden rounded-md border border-border bg-asphalt ring-2 ${CONDITION_META[r.condition].ring}`}
                  >
                    <img
                      src={r.imageUrl}
                      alt={`Track frame classified as ${r.condition}`}
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                    <figcaption className="p-2">
                      <p className={`font-display text-lg leading-none ${CONDITION_META[r.condition].tone}`}>
                        {r.condition.toUpperCase()}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {new Date(r.timestamp).toLocaleTimeString()} · {r.wetnessIndex}
                      </p>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>
        )}
      </main>

      <footer className="checker-strip mt-10 h-6" />
    </div>
  );
}
