import { audioService } from "./core/audioService";
import { AppDefinition, WindowManager } from "./core/windowManager";
import { vfs } from "./core/vfs";
import { renderBrowser } from "./apps/Browser";
import { renderMusic } from "./apps/Music";
import { renderNotepad } from "./apps/Notepad";
import { renderTerminal } from "./apps/Terminal";
import "./styles/main.css";

const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `
  <main class="desktop">
    <div class="desktop-shade"></div>
    <div class="desktop-icons">
      <button data-open="notepad"><span>📝</span><small>Notas</small></button>
      <button data-open="terminal"><span>⌘</span><small>Terminal</small></button>
      <button data-open="browser"><span>🌐</span><small>Navegador</small></button>
      <button data-open="music"><span>♫</span><small>Música</small></button>
    </div>
    <div class="workspace" aria-label="Área de trabalho"></div>
    <footer class="taskbar glass">
      <div class="taskbar-start">
        <button class="start-button" aria-label="Menu iniciar"><span>C</span></button>
        <div class="start-menu glass" hidden>
          <div class="start-greeting"><strong>Bom ter você aqui.</strong><span>Seu espaço, do seu jeito.</span></div>
          <div class="start-search">⌕ <span>Encontre um aplicativo</span></div>
          <span class="start-label">FIXADOS</span><div class="start-pinned"></div>
          <div class="start-footer"><span>◉ &nbsp;Carlinho WebOS</span><span>100% local</span></div>
        </div>
      </div>
      <div class="taskbar-apps"></div>
      <div class="taskbar-status">
        <button class="mini-player" aria-label="Abrir player de música"><span class="mini-play">▶</span><span class="mini-track">Nenhuma faixa</span><span>♫</span></button>
        <div class="status-divider"></div><div class="system-status"><span>⌃</span><span>◉</span><span>◖</span></div>
        <button class="clock"><strong></strong><span></span></button>
      </div>
    </footer>
    <div class="notification" role="status" hidden></div>
  </main>`;

const workspace = app.querySelector<HTMLElement>(".workspace")!;
const taskbarApps = app.querySelector<HTMLElement>(".taskbar-apps")!;
const manager = new WindowManager(workspace, taskbarApps);
const applications: AppDefinition[] = [
  { id: "notepad", title: "Bloco de Notas", icon: "📝", render: renderNotepad },
  { id: "terminal", title: "Terminal", icon: "⌘", render: renderTerminal },
  { id: "browser", title: "Navegador", icon: "🌐", render: renderBrowser },
  { id: "music", title: "Player de Música", icon: "♫", render: renderMusic },
];
const openApp = (id: string) => {
  const appDefinition = applications.find((item) => item.id === id);
  if (appDefinition) manager.open(appDefinition);
};

app.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((button) => button.addEventListener("click", () => openApp(button.dataset.open!)));
const startButton = app.querySelector<HTMLButtonElement>(".start-button")!;
const startMenu = app.querySelector<HTMLElement>(".start-menu")!;
const pinned = app.querySelector<HTMLElement>(".start-pinned")!;
applications.forEach((item) => {
  const button = document.createElement("button");
  button.innerHTML = `<span>${item.icon}</span><small>${item.title}</small>`;
  button.addEventListener("click", () => { openApp(item.id); startMenu.hidden = true; });
  pinned.append(button);
});
startButton.addEventListener("click", () => { startMenu.hidden = !startMenu.hidden; });
document.addEventListener("pointerdown", (event) => {
  if (!startMenu.contains(event.target as Node) && !startButton.contains(event.target as Node)) startMenu.hidden = true;
});

const miniPlay = app.querySelector<HTMLElement>(".mini-play")!;
const miniTrack = app.querySelector<HTMLElement>(".mini-track")!;
app.querySelector<HTMLButtonElement>(".mini-player")!.addEventListener("click", () => {
  if (audioService.current) audioService.toggle();
  else openApp("music");
});
audioService.subscribe(() => {
  miniPlay.textContent = audioService.element.paused ? "▶" : "Ⅱ";
  miniTrack.textContent = audioService.current?.name ?? "Nenhuma faixa";
});
const clock = app.querySelector<HTMLElement>(".clock")!;
const updateClock = () => {
  const now = new Date();
  clock.querySelector("strong")!.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  clock.querySelector("span")!.textContent = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
updateClock();
window.setInterval(updateClock, 10_000);

const notify = (message: string) => {
  const element = app.querySelector<HTMLElement>(".notification")!;
  element.textContent = message;
  element.hidden = false;
  window.setTimeout(() => { element.hidden = true; }, 2500);
};
try {
  const entries = vfs.list("/");
  notify(`${entries.length} itens no seu espaço · arquivos salvos neste navegador`);
} catch {
  notify("Não foi possível carregar o espaço de arquivos.");
}
