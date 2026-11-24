export interface VfsEntry {
  name: string;
  type: "file" | "directory";
  content?: string;
  mime?: string;
  size?: number;
  updatedAt: number;
}

type FileTable = Record<string, VfsEntry>;
const STORAGE_KEY = "carlinho-webos-vfs-v1";

export function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

class VirtualFileSystem {
  private files: FileTable;
  private database?: Promise<IDBDatabase>;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    this.files = stored ? JSON.parse(stored) as FileTable : this.initialFiles();
    this.persist();
  }

  private initialFiles(): FileTable {
    const now = Date.now();
    return {
      "/Documents": { name: "Documents", type: "directory", updatedAt: now },
      "/Music": { name: "Music", type: "directory", updatedAt: now },
      "/welcome.txt": {
        name: "welcome.txt",
        type: "file",
        mime: "text/plain",
        content: "Bem-vindo ao Carlinho WebOS.\nSeus arquivos ficam salvos neste navegador.",
        updatedAt: now,
      },
      "/hello.py": {
        name: "hello.py",
        type: "file",
        mime: "text/x-python",
        content: 'print("Olá do Python!")',
        updatedAt: now,
      },
    };
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files));
  }

  private openDatabase(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open("carlinho-webos-files-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("blobs");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento de arquivos."));
    });
    return this.database;
  }

  private parent(path: string): { path: string; name: string } {
    const normalized = normalizePath(path);
    if (normalized === "/") throw new Error("Informe um nome de arquivo.");
    const separator = normalized.lastIndexOf("/");
    const parentPath = separator === 0 ? "/" : normalized.slice(0, separator);
    const parent = this.files[parentPath];
    if (parentPath !== "/" && parent?.type !== "directory") throw new Error(`Pasta não encontrada: ${parentPath}`);
    return { path: normalized, name: normalized.slice(separator + 1) };
  }

  list(path = "/"): VfsEntry[] {
    const directory = normalizePath(path);
    if (directory !== "/" && this.files[directory]?.type !== "directory") throw new Error(`Pasta não encontrada: ${directory}`);
    const prefix = directory === "/" ? "/" : `${directory}/`;
    return Object.entries(this.files)
      .filter(([entryPath]) => entryPath.startsWith(prefix) && entryPath.slice(prefix.length).length > 0 && !entryPath.slice(prefix.length).includes("/"))
      .map(([, entry]) => entry);
  }

  read(path: string): VfsEntry {
    const entry = this.files[normalizePath(path)];
    if (!entry || entry.type !== "file") throw new Error(`Arquivo não encontrado: ${path}`);
    return entry;
  }

  allFiles(): Array<{ path: string; entry: VfsEntry }> {
    return Object.entries(this.files)
      .filter(([, entry]) => entry.type === "file")
      .map(([path, entry]) => ({ path, entry }));
  }

  write(path: string, content: string, mime = "text/plain"): void {
    const target = this.parent(path);
    this.files[target.path] = { name: target.name, type: "file", content, mime, updatedAt: Date.now() };
    this.persist();
  }

  async writeBinary(path: string, blob: Blob): Promise<void> {
    const target = this.parent(path);
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("blobs", "readwrite");
      transaction.objectStore("blobs").put(blob, target.path);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível salvar o arquivo."));
      transaction.onabort = () => reject(transaction.error ?? new Error("O salvamento do arquivo foi cancelado."));
    });
    this.files[target.path] = {
      name: target.name,
      type: "file",
      mime: blob.type || "audio/mpeg",
      size: blob.size,
      updatedAt: Date.now(),
    };
    this.persist();
  }

  async readBinary(path: string): Promise<Blob> {
    const normalized = normalizePath(path);
    const database = await this.openDatabase();
    return new Promise<Blob>((resolve, reject) => {
      const request = database.transaction("blobs", "readonly").objectStore("blobs").get(normalized);
      request.onsuccess = () => {
        if (request.result instanceof Blob) resolve(request.result);
        else reject(new Error(`Arquivo binário não encontrado: ${path}`));
      };
      request.onerror = () => reject(request.error ?? new Error("Não foi possível ler o arquivo."));
    });
  }

  mkdir(path: string): void {
    const target = this.parent(path);
    if (this.files[target.path]) throw new Error("Este item já existe.");
    this.files[target.path] = { name: target.name, type: "directory", updatedAt: Date.now() };
    this.persist();
  }

  remove(path: string): void {
    const normalized = normalizePath(path);
    if (!this.files[normalized]) throw new Error(`Caminho não encontrado: ${path}`);
    for (const entryPath of Object.keys(this.files)) {
      if (entryPath === normalized || entryPath.startsWith(`${normalized}/`)) delete this.files[entryPath];
    }
    this.persist();
  }
}

export const vfs = new VirtualFileSystem();
