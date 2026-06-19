# Fundação de Navegação (Workspace Shell) — Design

> Fase 1 de um redesenho de UX/UI mais amplo do ID Content. Contexto completo da análise de UX que motivou este redesenho está em `SPEC2.md` (raiz do projeto) e na conversa que originou este spec. Este documento cobre **só** a fundação de navegação — as fases seguintes (wizard de identidade, wizard de criação de conteúdo + preview, histórico real) terão specs próprios.

## Contexto e motivação

O fluxo atual é: tela de login → tela de lista de marcas → tela de editor (3 abas: Base/Carrossel/Post, cada uma com tab bar no topo) → para trocar de marca, o usuário precisa voltar para a tela de lista.

Problemas identificados (análise completa em conversa anterior, resumo aqui):
1. Modelo mental invertido — sistema força "configurar marca" antes de "criar conteúdo", quando a tarefa do dia a dia é criar conteúdo.
2. Trocar de marca exige sair completamente do contexto de edição (voltar pra lista).
3. Ações raras (duplicar, exportar, compartilhar, excluir) competem visualmente com ações frequentes, escondidas num menu de overflow genérico.

Esta fase resolve especificamente os problemas 2 e 3, estabelecendo a estrutura de navegação (workspace persistente) sobre a qual as fases seguintes (wizards, histórico) serão construídas. **Não resolve o problema 1** — isso fica para a fase do wizard de criação de conteúdo.

## Escopo desta fase

**Dentro do escopo:**
- Nova estrutura de navegação: sidebar persistente com seletor de marca + 3 destinos fixos (Identidade, Criar conteúdo, Histórico).
- Realocação do menu de ações (duplicar/exportar/compartilhar/excluir) para dentro do seletor de marca.
- Estado vazio para "Histórico" (placeholder, sem dados reais).
- Comportamento responsivo (sidebar colapsável em mobile).

**Fora do escopo (fases futuras):**
- Qualquer mudança nos campos dos formulários de Base, Carrossel ou Post.
- Wizard progressivo de identidade da marca.
- Wizard de criação de conteúdo em 3 passos.
- Loop de preview (colar HTML de volta e renderizar).
- Tabela de histórico real no banco de dados.
- Qualquer mudança em `db.js`, `auth.js`, `supabase.js`, `prompts.js`.

## Estrutura de telas

### Login
Inalterada (`screenLogin` continua como está).

### Shell autenticado
Substitui as telas hoje separadas `screenList` e `screenEditor` por um layout único de duas regiões: sidebar + área de conteúdo.

#### Sidebar (nova)
- **Topo — Seletor de marca**: mostra o nome da marca ativa (ou "Selecionar marca" se nenhuma). Ao clicar, abre um painel/dropdown com:
  - Campo de busca (reaproveita `app.filterBrands()`).
  - Lista de marcas (reaproveita `app.allBrands`), cada item com: nome, ações inline (duplicar, exportar, compartilhar [admin], excluir) que hoje vivem no menu de overflow do topbar e nos cards da tela de lista.
  - Botão fixo "+ Nova marca" no rodapé do painel (abre o modal de templates existente, `app.showTemplateModal()`).
  - Se nenhuma marca existir ainda, a área de conteúdo principal (não o dropdown) mostra um estado vazio de boas-vindas com call-to-action para criar a primeira marca.
- **Meio — Navegação fixa**: 3 itens, habilitados somente quando há marca ativa:
  - **Identidade** (ícone de marca/identidade)
  - **Criar conteúdo** (ícone de "+"/conteúdo)
  - **Histórico** (ícone de relógio/lista)
- **Rodapé**: e-mail do usuário logado, botão "Painel Admin" (visível só se `app.isAdminUser`), botão "Sair" (`auth.logout()`).

#### Área de conteúdo
Troca de acordo com o destino selecionado na sidebar:

- **Identidade** → renderiza exatamente o conteúdo hoje em `#panelBase` (todas as 7 seções, campos, chips, tooltips, progress bar) — sem nenhuma alteração de campo. Só não tem mais a tab bar de Carrossel/Post acima, porque essas agora vivem em outro destino.
- **Criar conteúdo** → exibe um segmented control interno com 2 opções — "Carrossel" / "Post" — que alterna entre o conteúdo hoje em `#panelCar` e `#panelPost`, sem alteração de campos. O segmented control é local a este destino, não compete com a navegação principal da sidebar.
- **Histórico** → tela nova e simples: ícone/ilustração + texto "Nenhum conteúdo gerado ainda" + uma frase explicando que essa área vai reunir as peças geradas em uma fase futura do produto. Não há nenhuma chamada ao banco nesta fase.

## Comportamento responsivo

Breakpoint alinhado ao já existente em `css/style.css` (`@media (max-width: 920px)`):
- Acima de 920px: sidebar fixa à esquerda, largura fixa (~240px), sempre visível.
- Abaixo de 920px: sidebar colapsa; aparece uma barra superior compacta com o nome da marca ativa + um botão de menu (hambúrguer). Ao clicar, abre um drawer/overlay com o mesmo conteúdo da sidebar (seletor de marca + 3 destinos + rodapé de usuário), reaproveitando o padrão visual já existente de `topbar-menu` (usado hoje para o menu de overflow) em vez de criar um componente novo.

## Mudanças de código (alto nível)

- **`index.html`**:
  - Remove a tab bar `#tabs` do topbar atual.
  - Adiciona o markup da sidebar (seletor de marca, 3 itens de navegação, rodapé de usuário).
  - Os containers `#panelBase`, `#panelCar`, `#panelPost` continuam existindo com o mesmo HTML interno, apenas movidos para dentro da nova estrutura de destinos. `#panelCar`/`#panelPost` passam a ficar dentro de um container "Criar conteúdo" com o segmented control acima deles.
  - Novo container de estado vazio para "Histórico".
- **`js/app.js`**:
  - Nova função `app.switchDestination(dest)` (`'identity' | 'create' | 'history'`) que mostra/esconde os containers de destino e atualiza o item ativo na sidebar.
  - `app.showScreen()` é simplificado: só decide entre `screenLogin`, o shell autenticado (lista vazia/com marca) e `screenAdmin`. A lógica de "lista de marcas" vira o conteúdo do dropdown do seletor de marca, não uma tela cheia separada — `renderBrandGrid`/`filterBrands` são reaproveitados, mas renderizam dentro do dropdown.
  - `app.openBrand(id)` passa a, além de carregar os dados, chamar `switchDestination('identity')` como destino padrão ao abrir uma marca (em vez de `switchTab('base')` sozinho).
- **`js/ui.js`**:
  - `switchTab('car'|'post')` continua existindo, mas agora opera dentro do destino "Criar conteúdo" (alterna entre os dois sub-painéis via o segmented control), não mais como navegação de nível superior.
- **Sem nenhuma mudança** em `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/prompts.js`, `js/templates.js`, `js/claude-generate.js`. Nenhuma migration de banco nesta fase.

## Critérios de aceite

1. Usuário loga, vê o shell com sidebar; se não tiver marca, vê estado de boas-vindas com CTA de criar a primeira.
2. Usuário cria ou seleciona uma marca pelo seletor da sidebar, sem navegar para uma "tela de lista" separada em tela cheia.
3. Os 3 destinos (Identidade, Criar conteúdo, Histórico) funcionam e mantêm o estado da marca ativa ao alternar entre eles.
4. Trocar de marca pelo seletor (sem deslogar) carrega os dados da nova marca corretamente nos 3 destinos.
5. Todas as funcionalidades hoje existentes continuam funcionando sem regressão: autosave, presets, templates, tooltips, progress bar, import/export de JSON, ações de duplicar/exportar/compartilhar/excluir (agora dentro do seletor de marca), painel admin.
6. Layout funciona corretamente em desktop (sidebar fixa) e em mobile (sidebar colapsada em drawer), no breakpoint de 920px já usado pelo restante do app.
7. Nenhuma chamada de rede nova é introduzida; nenhuma tabela de banco nova é criada nesta fase.

## Riscos e decisões em aberto para a implementação

- O dropdown do seletor de marca herda toda a lógica hoje em `renderBrandGrid`/`filterBrands` — ao mover isso para um dropdown (espaço menor que uma tela cheia), pode ser necessário um layout de lista mais compacto que o grid de cards atual. Decisão de implementação: lista compacta (uma linha por marca) dentro do dropdown, em vez do grid de cards — os cards completos (com preview de cores etc.) deixam de fazer sentido em um espaço estreito.
- `app.currentTab` hoje guarda `'base'|'car'|'post'` — ao reformular, decidir se ele continua sendo a mesma variável (com `'base'` passando a significar "destino Identidade" implicitamente) ou se vira duas variáveis separadas (`currentDestination` e `currentContentTab`). Recomendação: separar em duas variáveis para não misturar os dois níveis de navegação no mesmo estado.
