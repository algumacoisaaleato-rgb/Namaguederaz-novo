# Namaguederaz

Protótipo inicial do Namaguederaz, estruturado para evitar os problemas do projeto anterior.

## Estrutura
- `server.js`: servidor Express + WebSocket.
- `public/`: interface preta do aplicativo.
- `public/assets/app-photo.jpg`: imagem fornecida para a identidade do aplicativo.
- `package.json`: dependências na raiz do projeto.

## Regras já implementadas
- Não existem salas públicas falsas/semeadas.
- Uma sala pública só aparece enquanto houver alguém conectado nela.
- Ao sair o último participante, a sala é removida da lista pública.
- `+` abre a seleção de plataformas.
- YouTube: vídeo começa e aparece `Assistir na sala`; tocar cria a sala imediatamente.
- Web: abre dentro do app e oferece `Assistir na sala` após carregar.
- Netflix: somente acesso oficial/compatível; sem burlar DRM.
- Interface predominante preta.
- Microfone começa desligado.
- Navegação usa o botão de voltar do Android quando empacotado como app.
- Proteção básica contra pop-ups/redirecionamentos no navegador interno.

## Rodar
1. Instale Node.js.
2. Na raiz deste projeto:
   `npm install`
3. Execute:
   `npm start`
4. Abra `http://localhost:3000`.

## Verificação
`npm run verify`

## Observação
O player oficial do YouTube é usado. O projeto não remove/burla anúncios ou DRM de terceiros.
