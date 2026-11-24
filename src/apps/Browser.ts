const startPage = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:48px 24px;background:#101014;color:#f5f5f7;font:15px system-ui;text-align:center}
.mark{width:72px;height:72px;margin:0 auto 20px;display:grid;place-items:center;border-radius:50%;background:#e60000;font-size:42px;font-weight:800}
h1{font-size:30px;margin:0 0 8px}p{color:#aaa;margin:0 0 28px}.links{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
a{color:#fff;text-decoration:none;padding:12px 17px;border-radius:12px;background:#ffffff12;border:1px solid #ffffff20}
</style></head><body><div class="mark">C</div><h1>Olá, internet.</h1><p>Uma janela para explorar a web.</p>
<div class="links"><a href="https://www.wikipedia.org" target="_blank" rel="noopener">Wikipedia ↗</a><a href="https://developer.mozilla.org" target="_blank" rel="noopener">MDN ↗</a><a href="https://github.com" target="_blank" rel="noopener">GitHub ↗</a></div>
<p style="margin-top:32px;font-size:12px">Alguns sites não permitem exibição em janelas incorporadas.</p></body></html>`;

export function renderBrowser(): HTMLElement {
  const root = document.createElement("div");
  root.className = "browser app-fill";
  root.innerHTML = `<form class="browser-toolbar">
    <button type="button" data-nav="back" title="Voltar">‹</button><button type="button" data-nav="forward" title="Avançar">›</button>
    <button type="button" data-nav="reload" title="Recarregar">↻</button><button type="button" data-nav="home" title="Início">⌂</button>
    <input class="address" aria-label="Endereço" placeholder="Pesquise ou digite um endereço" />
    <button class="go-button" type="submit">Ir</button>
  </form><div class="browser-stage"><iframe title="Navegador" sandbox="allow-scripts allow-forms allow-popups"></iframe>
  <div class="browser-fallback" hidden><div class="fallback-icon">↗</div><h3>Não consegue visualizar este site?</h3>
  <p>Alguns sites bloqueiam a visualização incorporada. Você pode continuar em uma nova aba.</p>
  <a target="_blank" rel="noopener noreferrer">Abrir em nova aba ↗</a></div></div>`;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const address = root.querySelector<HTMLInputElement>(".address")!;
  const frame = root.querySelector<HTMLIFrameElement>("iframe")!;
  const fallback = root.querySelector<HTMLElement>(".browser-fallback")!;
  const back: string[] = [];
  const forward: string[] = [];
  let current = "";
  let fallbackTimer = 0;
  const home = () => {
    current = "";
    address.value = "";
    fallback.hidden = true;
    frame.srcdoc = startPage;
  };
  const navigate = (value: string, remember = true) => {
    const input = value.trim();
    if (!input) return home();
    const url = /^https?:\/\//i.test(input) ? input : `https://${input.includes(".") && !input.includes(" ") ? input : `www.google.com/search?q=${encodeURIComponent(input)}`}`;
    if (remember && current) back.push(current);
    current = url;
    address.value = url;
    fallback.hidden = true;
    frame.removeAttribute("srcdoc");
    frame.src = url;
    window.clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(() => {
      fallback.hidden = false;
      fallback.querySelector<HTMLAnchorElement>("a")!.href = url;
    }, 3500);
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); navigate(address.value); });
  root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      switch (button.dataset.nav) {
        case "home": home(); break;
        case "reload": if (current) navigate(current, false); else home(); break;
        case "back": {
          const previous = back.pop();
          if (previous) { forward.push(current); navigate(previous, false); }
          break;
        }
        case "forward": {
          const next = forward.pop();
          if (next) { back.push(current); navigate(next, false); }
          break;
      }
      }
    });
  });
  home();
  return root;
}
