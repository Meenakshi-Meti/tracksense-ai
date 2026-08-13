import { useCallback, useRef, useState } from "react";
import { Upload, Camera } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  busy: boolean;
}

export function FrameDropzone({ onFiles, busy }: Props) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (images.length) onFiles(images);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed p-8 text-center transition-all ${
        over ? "border-primary bg-primary/10" : "border-border bg-asphalt hover:border-primary/60"
      }`}
    >
      <div className="track-lines pointer-events-none absolute inset-x-0 top-1/2 h-1 opacity-40" />
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-gradient-pit text-primary-foreground shadow-[var(--shadow-pit)]">
          {busy ? <Camera className="size-6 animate-pit-pulse" /> : <Upload className="size-6" />}
        </div>
        <p className="font-display text-2xl">
          {busy ? "Scanning frame…" : "Drop trackside frames"}
        </p>
        <p className="max-w-sm font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Onboard or marshal-post stills · JPG / PNG · multiple frames supported
        </p>
      </div>
    </div>
  );
}
