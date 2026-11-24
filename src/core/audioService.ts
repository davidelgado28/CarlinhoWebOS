import { vfs } from "./vfs";

export interface Track {
  name: string;
  url: string;
  revoke?: boolean;
  path?: string;
}

type Listener = () => void;

function makeDemoTrack(notes: number[], name: string): Track {
  const sampleRate = 11_025;
  const secondsPerNote = 0.45;
  const sampleCount = Math.floor(sampleRate * secondsPerNote * notes.length);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  notes.forEach((midi, noteIndex) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const firstSample = Math.floor(noteIndex * secondsPerNote * sampleRate);
    const lastSample = firstSample + Math.floor(secondsPerNote * sampleRate);
    for (let sample = firstSample; sample < lastSample; sample += 1) {
      const progress = (sample - firstSample) / (lastSample - firstSample);
      const envelope = Math.min(1, progress * 18, (1 - progress) * 8);
      const time = sample / sampleRate;
      const tone = Math.sin(2 * Math.PI * frequency * time) * 0.18
        + Math.sin(2 * Math.PI * frequency * 2 * time) * 0.045;
      view.setInt16(44 + sample * 2, Math.round(tone * envelope * 32767), true);
    }
  });
  return { name, url: URL.createObjectURL(new Blob([buffer], { type: "audio/wav" })) };
}

class AudioService {
  readonly element = new Audio();
  tracks = [
    makeDemoTrack([60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65, 60, 64, 67, 72], "Carlinho — Pulso"),
    makeDemoTrack([57, 60, 64, 69, 64, 60, 55, 59, 62, 67, 62, 59, 57, 60, 64, 69], "Carlinho — Noite"),
  ];
  currentIndex = 0;
  private listeners = new Set<Listener>();

  constructor() {
    this.element.volume = 0.65;
    this.element.src = this.tracks[0].url;
    this.element.addEventListener("timeupdate", () => this.emit());
    this.element.addEventListener("play", () => this.emit());
    this.element.addEventListener("pause", () => this.emit());
    this.element.addEventListener("ended", () => this.next());
    void this.restore().catch((error: unknown) => console.error("Não foi possível restaurar a biblioteca de música.", error));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  async add(file: File): Promise<void> {
    const path = `/Music/${file.name}`;
    await vfs.writeBinary(path, file);
    this.tracks.push({ name: file.name, url: URL.createObjectURL(file), revoke: true, path });
    if (this.currentIndex < 0) this.select(0);
    this.emit();
  }

  private async restore(): Promise<void> {
    const savedTracks = vfs.allFiles().filter(({ entry, path }) =>
      path.startsWith("/Music/") && (entry.mime?.startsWith("audio/") || path.toLowerCase().endsWith(".mp3")),
    );
    for (const { path, entry } of savedTracks) {
      try {
        const blob = await vfs.readBinary(path);
        this.tracks.push({ name: entry.name, url: URL.createObjectURL(blob), revoke: true, path });
      } catch (error) {
        console.error(`Não foi possível restaurar ${path}.`, error);
      }
    }
    this.emit();
  }

  select(index: number): void {
    if (!this.tracks.length) return;
    this.currentIndex = (index + this.tracks.length) % this.tracks.length;
    this.element.src = this.tracks[this.currentIndex].url;
    void this.element.play().catch(() => this.emit());
    this.emit();
  }

  toggle(): void {
    if (this.currentIndex < 0 && this.tracks.length) {
      this.select(0);
      return;
    }
    if (this.element.paused) void this.element.play().catch(() => this.emit());
    else this.element.pause();
    this.emit();
  }

  next(): void {
    if (this.tracks.length) this.select(this.currentIndex + 1);
  }

  previous(): void {
    if (this.element.currentTime > 3) this.element.currentTime = 0;
    else if (this.tracks.length) this.select(this.currentIndex - 1);
  }

  get current(): Track | undefined {
    return this.tracks[this.currentIndex];
  }
}

export const audioService = new AudioService();
