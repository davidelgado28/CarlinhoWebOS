import { audioService } from "../core/audioService";

const formatTime = (time: number): string => {
  if (!Number.isFinite(time)) return "0:00";
  return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
};

export function renderMusic(): HTMLElement {
  const root = document.createElement("div");
  root.className = "music-player app-fill";
  root.innerHTML = `<div class="music-art"><span>♫</span><i></i><i></i><i></i></div>
    <div class="music-now"><span class="eyebrow">TOCANDO AGORA</span><strong class="track-title">Sua trilha começa aqui</strong><span class="track-subtitle">Adicione um arquivo de música</span></div>
    <div class="music-progress"><span class="elapsed">0:00</span><input type="range" min="0" max="100" value="0" aria-label="Progresso da faixa" /><span class="duration">0:00</span></div>
    <div class="music-controls"><button data-control="previous" aria-label="Anterior">|‹</button><button class="play-button" data-control="toggle" aria-label="Reproduzir">▶</button><button data-control="next" aria-label="Próxima">›|</button></div>
    <div class="music-volume"><span>◖</span><input type="range" min="0" max="1" step="0.01" value="0.65" aria-label="Volume" /></div>
    <div class="playlist-heading"><span>PLAYLIST</span><label class="upload-button">＋ Adicionar música<input type="file" accept="audio/mpeg,.mp3,audio/*" multiple /></label></div>
    <div class="playlist"></div>`;
  const seek = root.querySelector<HTMLInputElement>(".music-progress input")!;
  const volume = root.querySelector<HTMLInputElement>(".music-volume input")!;
  const draw = () => {
    const track = audioService.current;
    root.querySelector<HTMLElement>(".track-title")!.textContent = track?.name.replace(/\.[^.]+$/, "") ?? "Sua trilha começa aqui";
    root.querySelector<HTMLElement>(".track-subtitle")!.textContent = track ? "Arquivo local · sua biblioteca" : "Adicione um arquivo de música";
    root.querySelector<HTMLElement>(".elapsed")!.textContent = formatTime(audioService.element.currentTime);
    root.querySelector<HTMLElement>(".duration")!.textContent = formatTime(audioService.element.duration);
    seek.max = String(audioService.element.duration || 100);
    seek.value = String(audioService.element.currentTime || 0);
    root.querySelector<HTMLButtonElement>(".play-button")!.textContent = audioService.element.paused ? "▶" : "Ⅱ";
    const playlist = root.querySelector<HTMLElement>(".playlist")!;
    playlist.replaceChildren(...audioService.tracks.map((item, index) => {
      const button = document.createElement("button");
      button.className = `track-row${index === audioService.currentIndex ? " selected" : ""}`;
      button.innerHTML = `<span class="track-index">${index + 1}</span><span>${item.name.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!)}</span><span>♪</span>`;
      button.addEventListener("click", () => audioService.select(index));
      return button;
    }));
  };
  audioService.subscribe(draw);
  root.querySelectorAll<HTMLButtonElement>("[data-control]").forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.control) {
        case "toggle": audioService.toggle(); break;
        case "next": audioService.next(); break;
        case "previous": audioService.previous(); break;
      }
    });
  });
  root.querySelector<HTMLInputElement>(".upload-button input")!.addEventListener("change", (event) => {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    void Promise.all(files.map((file) => audioService.add(file))).catch((error: unknown) => {
      alert(error instanceof Error ? `Não foi possível salvar a música: ${error.message}` : "Não foi possível salvar a música.");
    });
    (event.target as HTMLInputElement).value = "";
  });
  seek.addEventListener("input", () => { audioService.element.currentTime = Number(seek.value); });
  volume.addEventListener("input", () => { audioService.element.volume = Number(volume.value); });
  draw();
  return root;
}
