/// <reference lib="webworker" />

let pyodide: { runPythonAsync: (code: string) => Promise<unknown>; setStdout: (options: { batched: (text: string) => void }) => void } | undefined;

self.onmessage = async (event: MessageEvent<{ type: "init" | "run"; code?: string }>) => {
  try {
    if (event.data.type === "init" && !pyodide) {
      const loadModule = new Function("url", "return import(url)") as (url: string) => Promise<{
        loadPyodide: () => Promise<NonNullable<typeof pyodide>>;
      }>;
      const pyodideModule = await loadModule("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs");
      pyodide = await pyodideModule.loadPyodide();
      pyodide.setStdout({ batched: (text) => self.postMessage({ type: "output", output: text }) });
      self.postMessage({ type: "ready" });
    } else if (event.data.type === "run" && pyodide && event.data.code) {
      await pyodide.runPythonAsync(event.data.code);
    }
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
  }
};
