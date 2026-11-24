import { vfs } from "./vfs";

export interface Track {
  name: string;
  artist?: string;
  url: string;
  revoke?: boolean;
  path?: string;
}

type Listener = () => void;

const publicTrack = (filename: string): string =>
  new URL(`music/${filename}`, document.baseURI).toString();

const bundledTracks: Track[] = [
  { name: "Empathy", artist: "Bassnectar", url: publicTrack("bassnectar-empathy.mp3") },
  { name: "It's My Life", artist: "Bon Jovi", url: publicTrack("bon-jovi-its-my-life.mp3") },
  { name: "Alors on danse", artist: "Stromae", url: publicTrack("stromae-alors-on-danse.mp3") },
  { name: "Ride It (LOVEIN Remix)", artist: "Jay Sean", url: publicTrack("jay-sean-ride-it-lovein-remix.mp3") },
];

class AudioService {
  readonly element = new Audio();
  tracks = [...bundledTracks];
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
    this.tracks.push({
      name: file.name.replace(/\.[^.]+$/, ""),
      artist: "Sua biblioteca",
      url: URL.createObjectURL(file),
      revoke: true,
      path,
    });
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
        this.tracks.push({
          name: entry.name.replace(/\.[^.]+$/, ""),
          artist: "Sua biblioteca",
          url: URL.createObjectURL(blob),
          revoke: true,
          path,
        });
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
