# Carlinho WebOS

Um desktop web estático, client-side e em português, criado com TypeScript e Vite.

## Desenvolvimento

```sh
npm install
npm run dev
```

`npm run build` executa a verificação de tipos e gera o site em `dist/`. O diretório `dist/` pode ser hospedado em GitHub Pages ou Cloudflare Pages. Não há servidor de aplicação.

## Aplicativos

- **notes:** abre arquivos locais de texto e salva notas no VFS do navegador.
- **Terminal:** inclui comandos básicos e carrega Pyodide em um Web Worker somente quando `python` é usado. O runtime é baixado do CDN oficial na primeira execução.
- **Carlinho-Browser:** exibe páginas em iframe isolado; sites que bloqueiam incorporação podem ser abertos em uma nova aba.
- **Carlinho Músicas:** inclui quatro faixas pré-carregadas e reproduz músicas adicionadas localmente; o áudio continua ativo independente da janela do player.

Arquivos de texto do VFS ficam no `localStorage` e faixas de áudio no `IndexedDB` deste navegador; nada é enviado a um servidor. O espaço disponível depende das cotas do navegador.

## Créditos musicais

Faixas incluídas com autorização do usuário. Os direitos permanecem com os artistas e titulares originais:

- Bassnectar, “Empathy”
- Bon Jovi, “It's My Life”
- Stromae, “Alors on danse”
- Jay Sean, “Ride It (LOVEIN Remix)”