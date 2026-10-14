# Apaga — programas para noites mais tranquilas

PWA estática (HTML, CSS e JavaScript, sem servidor nem IA) com programas guiados de sono em português de Portugal.

## Estrutura

| Ficheiro | O que é |
| --- | --- |
| `index.html` | Página única da app |
| `app.js` | Lógica: diagnóstico, sessões, diário, compras, páginas legais |
| `content.js` | Conteúdos: técnicas e programas (editar aqui os textos) |
| `config.js` | Configuração: modo pré-venda/venda, preços, links Stripe, dados do vendedor, analítica |
| `styles.css` | Aspeto visual |
| `sw.js` | Service worker (funcionamento sem rede). Mudar `VERSAO` a cada publicação |
| `manifest.webmanifest`, `icons/` | Instalação no ecrã principal |
| `docs/LANCAMENTO.md` | Guia de lançamento: publicação, analítica, Stripe e checklist legal |

## Correr localmente

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`.

## Publicar

Liga este repositório ao Netlify (Add new site → Import from Git). Cada `git push` publica uma nova versão. O `netlify.toml` já está configurado.

## Antes de vender

Lê `docs/LANCAMENTO.md`, secção 4. O `config.js` está em `modo: "pre-venda"` e não cobra nada até ser mudado para `"venda"`.

© Todos os direitos reservados.
