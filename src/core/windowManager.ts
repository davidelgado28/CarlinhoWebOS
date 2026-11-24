export type AppId = "notepad" | "terminal" | "browser" | "music";
export interface AppDefinition {
  id: AppId;
  title: string;
  icon: string;
  render: () => HTMLElement;
}

interface ManagedWindow {
  id: number;
  app: AppDefinition;
  element: HTMLElement;
  minimized: boolean;
  maximized: boolean;
  previousRect?: { left: number; top: number; width: number; height: number };
}

export class WindowManager {
  private windows: ManagedWindow[] = [];
  private nextId = 1;
  private zIndex = 5;
  private workspace: HTMLElement;
  private taskbarApps: HTMLElement;

  constructor(workspace: HTMLElement, taskbarApps: HTMLElement) {
    this.workspace = workspace;
    this.taskbarApps = taskbarApps;
  }

  open(app: AppDefinition): void {
    const existing = this.windows.find((win) => win.app.id === app.id);
    if (existing) {
      existing.minimized = false;
      existing.element.hidden = false;
      this.focus(existing);
      this.updateTaskbar();
      return;
    }

    const id = this.nextId++;
    const windowElement = document.createElement("section");
    windowElement.className = "window glass active";
    windowElement.style.left = `${Math.max(30, 100 + (this.windows.length % 6) * 34)}px`;
    windowElement.style.top = `${Math.max(28, 62 + (this.windows.length % 6) * 28)}px`;
    windowElement.style.zIndex = String(++this.zIndex);
    windowElement.setAttribute("aria-label", app.title);
    windowElement.innerHTML = `
      <header class="window-titlebar">
        <div class="window-title"><span class="app-icon">${app.icon}</span><span>${app.title}</span></div>
        <div class="window-controls">
          <button class="window-control minimize" aria-label="Minimizar">−</button>
          <button class="window-control maximize" aria-label="Maximizar">□</button>
          <button class="window-control close" aria-label="Fechar">×</button>
        </div>
      </header>
      <div class="window-content"></div>
      <div class="resize-handle" aria-hidden="true"></div>`;
    windowElement.querySelector(".window-content")!.append(app.render());
    this.workspace.append(windowElement);

    const managed: ManagedWindow = { id, app, element: windowElement, minimized: false, maximized: false };
    this.windows.push(managed);
    windowElement.addEventListener("pointerdown", () => this.focus(managed));
    windowElement.querySelector(".close")!.addEventListener("click", () => this.close(managed));
    windowElement.querySelector(".minimize")!.addEventListener("click", () => this.minimize(managed));
    windowElement.querySelector(".maximize")!.addEventListener("click", () => this.maximize(managed));
    this.makeDraggable(managed);
    this.makeResizable(windowElement);
    this.focus(managed);
    this.updateTaskbar();
  }

  private focus(win: ManagedWindow): void {
    this.windows.forEach((item) => item.element.classList.remove("active"));
    win.element.classList.add("active");
    win.element.style.zIndex = String(++this.zIndex);
  }

  private close(win: ManagedWindow): void {
    win.element.remove();
    this.windows = this.windows.filter((item) => item !== win);
    this.updateTaskbar();
  }

  private minimize(win: ManagedWindow): void {
    win.minimized = true;
    win.element.hidden = true;
    this.updateTaskbar();
  }

  private maximize(win: ManagedWindow): void {
    if (win.maximized) {
      win.element.classList.remove("maximized");
      if (win.previousRect) {
        win.element.style.left = `${win.previousRect.left}px`;
        win.element.style.top = `${win.previousRect.top}px`;
        win.element.style.width = `${win.previousRect.width}px`;
        win.element.style.height = `${win.previousRect.height}px`;
      }
      win.maximized = false;
    } else {
      win.previousRect = {
        left: win.element.offsetLeft,
        top: win.element.offsetTop,
        width: win.element.offsetWidth,
        height: win.element.offsetHeight,
      };
      win.element.classList.add("maximized");
      win.maximized = true;
    }
  }

  private makeDraggable(win: ManagedWindow): void {
    const bar = win.element.querySelector<HTMLElement>(".window-titlebar")!;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    bar.addEventListener("pointerdown", (event) => {
      if ((event.target as HTMLElement).closest(".window-controls") || win.maximized) return;
      bar.setPointerCapture(event.pointerId);
      startX = event.clientX;
      startY = event.clientY;
      initialLeft = win.element.offsetLeft;
      initialTop = win.element.offsetTop;
      const move = (pointer: PointerEvent) => {
        win.element.style.transform = `translate3d(${pointer.clientX - startX}px, ${pointer.clientY - startY}px, 0)`;
      };
      const end = (pointer: PointerEvent) => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", end);
        const dx = pointer.clientX - startX;
        const dy = pointer.clientY - startY;
        win.element.style.transform = "";
        win.element.style.left = `${Math.max(0, initialLeft + dx)}px`;
        win.element.style.top = `${Math.max(0, initialTop + dy)}px`;
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", end);
    });
  }

  private makeResizable(element: HTMLElement): void {
    const handle = element.querySelector<HTMLElement>(".resize-handle")!;
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const x = event.clientX;
      const y = event.clientY;
      const move = (pointer: PointerEvent) => {
        element.style.width = `${Math.max(360, width + pointer.clientX - x)}px`;
        element.style.height = `${Math.max(260, height + pointer.clientY - y)}px`;
      };
      const end = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
    });
  }

  private updateTaskbar(): void {
    this.taskbarApps.replaceChildren(...this.windows.map((win) => {
      const button = document.createElement("button");
      button.className = `taskbar-app${win.minimized ? "" : " open"}`;
      button.title = win.app.title;
      button.textContent = win.app.icon;
      button.addEventListener("click", () => {
        if (win.minimized) {
          win.minimized = false;
          win.element.hidden = false;
          this.focus(win);
          this.updateTaskbar();
        } else this.focus(win);
      });
      return button;
    }));
  }
}
