import { normalizePath, vfs } from "../core/vfs";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function renderTerminal(): HTMLElement {
  const root = document.createElement("div");
  root.className = "terminal app-fill";
  root.innerHTML = `<div class="terminal-output" aria-live="polite"></div><form class="terminal-form">
    <span class="terminal-path">~/</span><span class="prompt-mark">›</span>
    <input autocomplete="off" spellcheck="false" aria-label="Comando do terminal" />
  </form>`;
  const output = root.querySelector<HTMLElement>(".terminal-output")!;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const input = root.querySelector<HTMLInputElement>("input")!;
  const prompt = root.querySelector<HTMLElement>(".terminal-path")!;
  let cwd = "/";
  const writeLine = (text: string, type = "output") => {
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;
    line.innerHTML = escapeHtml(text);
    output.append(line);
    output.scrollTop = output.scrollHeight;
  };

  let worker: Worker | undefined;
  let pythonReady = false;
  const runPython = (code: string) => {
    writeLine("Carregando Pyodide no Web Worker…", "muted");
    worker ??= new Worker(new URL("../workers/python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ type: string; output?: string; error?: string }>) => {
      if (event.data.type === "ready") {
        pythonReady = true;
        worker?.postMessage({ type: "run", code });
      } else if (event.data.type === "output") {
        if (event.data.output) writeLine(event.data.output);
      } else if (event.data.type === "error") writeLine(event.data.error || "Erro no Python.", "error");
    };
    worker.onerror = () => writeLine("Não foi possível carregar Pyodide. Verifique a conexão e tente novamente.", "error");
    if (pythonReady) worker.postMessage({ type: "run", code });
    else worker.postMessage({ type: "init" });
  };

  const execute = (raw: string) => {
    const [command = "", ...args] = raw.trim().split(/\s+/);
    const arg = args.join(" ");
    try {
      switch (command) {
        case "":
          break;
        case "help":
          writeLine("help  ls [pasta]  cd <pasta>  cat <arquivo>  mkdir <pasta>  rm <caminho>  clear  python <código>  python <arquivo.py>");
          break;
        case "ls":
          vfs.list(args[0] ? `${cwd.replace(/\/$/, "")}/${args[0]}` : cwd).forEach((entry) => writeLine(`${entry.type === "directory" ? "▸" : "·"} ${entry.name}${entry.type === "directory" ? "/" : ""}`));
          break;
        case "cd":
          if (!arg || arg === "~" || arg === "/") cwd = "/";
          else {
            const target = normalizePath(arg.startsWith("/") ? arg : `${cwd}/${arg}`);
            if (vfs.list(target)) cwd = target;
          }
          prompt.textContent = `~${cwd === "/" ? "/" : cwd}`;
          break;
        case "cat": {
          if (!arg) throw new Error("Uso: cat <arquivo>");
          const entry = vfs.read(normalizePath(arg.startsWith("/") ? arg : `${cwd}/${arg}`));
          writeLine(entry.content ?? "");
          break;
        }
        case "mkdir":
          if (!arg) throw new Error("Uso: mkdir <pasta>");
          vfs.mkdir(normalizePath(arg.startsWith("/") ? arg : `${cwd}/${arg}`));
          break;
        case "rm":
          if (!arg) throw new Error("Uso: rm <caminho>");
          vfs.remove(normalizePath(arg.startsWith("/") ? arg : `${cwd}/${arg}`));
          break;
        case "clear":
          output.replaceChildren();
          break;
        case "python":
          if (!arg) throw new Error("Uso: python <código> ou python <arquivo.py>");
          if (arg.endsWith(".py") && !arg.includes("\n")) {
            const entry = vfs.read(normalizePath(arg.startsWith("/") ? arg : `${cwd}/${arg}`));
            runPython(entry.content ?? "");
          } else runPython(arg.replace(/^["']|["']$/g, ""));
          break;
        default:
          writeLine(`Comando não encontrado: ${command}. Digite help para ver os comandos.`, "error");
      }
    } catch (error) {
      writeLine(error instanceof Error ? error.message : "Não foi possível executar o comando.", "error");
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = input.value;
    writeLine(`${cwd === "/" ? "~" : `~${cwd}`} › ${command}`, "command");
    execute(command);
    input.value = "";
  });
  writeLine("Carlinho Terminal 1.0 · digite help para começar", "muted");
  return root;
}
