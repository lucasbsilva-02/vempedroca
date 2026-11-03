# Vem Pedroca

Jogo educacional de plataforma, contextualizado em Pernambuco, para estudantes do 6º e 7º anos do Ensino Fundamental II. Aproxima aprendizagem e entretenimento com exploração, desafios, personagens e conteúdos da cultura pernambucana.

**Status:** MVP web em evolução.

## O que o MVP tem

- Mapa de mundos e fases (Português, Matemática e Ciências), com perguntas em blocos, chefão e artefatos.
- Viagem de ônibus no início e no fim de cada fase, trânsito com semáforo, rio com canoas, escalada em cipós e bloqueios educativos.
- Personagens selecionáveis (Pedroca e Renata) e acompanhante com orientação.
- Controles por teclado e por toque.

## Tecnologias

React, TypeScript, Phaser 3 e Vite. As fases são geradas por `tools/build-levels.mjs` a partir do conteúdo educativo.

## Minha atuação

Produção, game design, level design, arte 2D e UI/UX.

## Rodar

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

Parâmetros de teste: `?map`, `?play=<id>`, `?debug`, `?nobus`, `?hitboxes`.

## Documentação

O diário de desenvolvimento por versão está em [`docs/CHANGELOG.md`](docs/CHANGELOG.md), as artes ainda pendentes em [`docs/arte-pendente.md`](docs/arte-pendente.md) e o roteiro em [`docs/roadmap.md`](docs/roadmap.md).
