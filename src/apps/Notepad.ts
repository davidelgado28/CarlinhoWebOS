import { vfs } from "../core/vfs";

export function renderNotepad(): HTMLElement {
  const root = document.createElement("div");
  root.className = "notepad app-fill";
  root.innerHTML = `
    <nav class="notepad-menu">
      <button data-action="new">Novo</button><button data-action="open">Abrir</button>
      <button data-action="save">Salvar</button><button data-action="save-as">Salvar como</button>
      <span class="file-label">Sem título</span>
    </nav>
    <textarea spellcheck="false" aria-label="Texto do documento" placeholder="Comece a escrever..."></textarea>
    <input class="hidden-input" type="file" accept=".txt,.py,text/plain,text/x-python" />`;
  const editor = root.querySelector("textarea")!;
  const fileLabel = root.querySelector<HTMLElement>(".file-label")!;
  const fileInput = root.querySelector<HTMLInputElement>(".hidden-input")!;
  let path = "";
  const saveAs = () => {
    const name = prompt("Salvar arquivo como:", path.split("/").pop() || "documento.txt");
    if (!name) return;
    path = name.startsWith("/") ? name : `/Documents/${name}`;
    vfs.write(path, editor.value);
    fileLabel.textContent = path;
  };
  root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.action) {
        case "new":
          if (editor.value && !confirm("Descartar o documento atual?")) return;
          editor.value = "";
          path = "";
          fileLabel.textContent = "Sem título";
          break;
        case "open":
          if (confirm("Abrir um arquivo salvo no WebOS? Se escolher Cancelar, você poderá importar um arquivo do computador.")) {
            const paths = vfs.allFiles().filter(({ entry }) => entry.content !== undefined).map(({ path }) => path);
            const selected = prompt(`Arquivos disponíveis:\n${paths.join("\n") || "(nenhum arquivo)"}`, path || paths[0] || "");
            if (selected) {
              const entry = vfs.read(selected);
              editor.value = entry.content ?? "";
              path = selected;
              fileLabel.textContent = path;
            }
          } else fileInput.click();
          break;
        case "save":
          if (path) {
            vfs.write(path, editor.value);
            fileLabel.textContent = `${path} · Salvo`;
          } else saveAs();
          break;
        case "save-as":
          saveAs();
          break;
      }
    });
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = String(reader.result);
      path = `/Documents/${file.name}`;
      vfs.write(path, editor.value);
      fileLabel.textContent = path;
    };
    reader.readAsText(file);
    fileInput.value = "";
  });
  return root;
}
