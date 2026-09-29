# Edusentir Android

Aplicativo mobile em HTML, CSS e JavaScript preparado para Android com Capacitor. Os dados ficam salvos localmente no dispositivo, sem depender de Electron ou PostgreSQL.

## O que mudou

- A interface agora roda como aplicacao web/mobile em `src/src/renderer`.
- A camada `src/src/renderer/mobile-api.js` substitui o backend desktop e persiste dados no `localStorage`.
- O projeto foi preparado para empacotamento Android com `capacitor.config.json`.
- O login inicial de desenvolvimento continua com o usuario `adm` e senha `123`, mas a senha e armazenada com PBKDF2 e salt no armazenamento local do app.

## Estrutura principal

- `src/src/renderer/index.html`: tela principal da aplicacao.
- `src/src/renderer/app-main.js`: logica da interface.
- `src/src/renderer/mobile-api.js`: persistencia local, autenticacao e relatorios.
- `src/src/renderer/styles.css`: estilos responsivos.
- `capacitor.config.json`: configuracao do Capacitor para Android.

## Executar no navegador

1. Instale as dependencias:

```bash
npm install
```

2. Rode a interface localmente:

```bash
npm start
```

## Gerar o projeto Android

1. Instale as dependencias:

```bash
npm install
```

2. Crie a pasta Android do Capacitor:

```bash
npm run android:add
```

3. Sincronize os arquivos web com o projeto Android:

```bash
npm run android:sync
```

4. Abra no Android Studio:

```bash
npm run android:open
```

## Observacoes

- Como o app agora e mobile-first, os dados sao locais ao aparelho.
- A geracao de relatorio abre uma visualizacao interna e permite salvar ou compartilhar o PDF quando o dispositivo permitir.
- A interface escapa os dados digitados antes de renderizar listas, historicos e relatorios na tela.
- Se voce quiser, o proximo passo natural e trocar o `localStorage` por SQLite nativo do Capacitor para maior robustez offline.
