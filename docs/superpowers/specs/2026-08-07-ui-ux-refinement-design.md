# Refinamento de UI/UX — Design

> Este documento **substitui** o plano de redesenho anterior descrito em `2026-06-19-navigation-foundation-design.md` e `2026-06-19-pasted-html-preview-design.md` (fases de "wizard de identidade" e "loop de preview"). O usuário decidiu desconsiderar aquele plano por completo e partir de um diagnóstico novo, focado em refinamento visual e usabilidade dentro da linguagem visual já existente — não em reestruturar fluxos de navegação ou introduzir preview de HTML.

## Contexto e motivação

O app (ferramenta de geração de prompts para posts/carrosséis) está funcional, mas acumulou inconsistências visuais e lacunas de usabilidade nunca revisadas sistematicamente. Uma auditoria dedicada (Fable 5, com achados verificados linha a linha contra `index.html`, `css/style.css`, `js/ui.js` e `js/app.js`) levantou 17 problemas concretos, divididos em dois grupos:

- **Visuais** (8 itens): hierarquia tipográfica pobre, cor de foco inconsistente entre seções, contraste insuficiente em texto de apoio e placeholder, indicador de campo obrigatório presente em só 3 de ~45 campos, uso de divisores inconsistente, espaçamento sem nível intermediário, paleta do painel de preview desalinhada do resto do sistema.
- **Usabilidade** (9 itens): zero responsividade na grade interna do formulário, zero atributos de acessibilidade em toda a aplicação, foco de teclado invisível nos seletores customizados (afeta toda decisão de conteúdo), tooltips só em hover, modal "Montar prompt" órfão (código morto, nenhum botão o abre), modais sem Esc/devolução de foco, exclusão de marca usando o mesmo alerta genérico de excluir um preset, salvar com 3 pontos de entrada mas feedback distante do clique, e o Post tratando 5 de 6 seções como obrigatórias quando só 1 realmente é.

### Decisões já tomadas (não estão em aberto)

- **Manter a linguagem visual atual** (tema escuro, fundo quase preto, corpo em fonte monoespaçada, cor de destaque por seção — roxo/Base, amarelo-limão/Carrossel, laranja/Post). Este design é sobre refinamento dentro dessa linguagem, não sobre uma nova identidade visual.
- **Manter a stack 100% vanilla JS/HTML/CSS**, sem framework, sem build step.
- **Cobrir o sistema inteiro nesta mesma rodada** (navegação, Identidade/Base, Carrossel, Post, login, admin), organizados em lotes temáticos — nenhum lote fica para depois.
- Papel do Fable 5: contribuiu o diagnóstico inicial e vai contribuir microcopy/textos pontuais (ex. o texto do novo modal de exclusão de marca). A implementação estrutural de CSS/HTML/JS é feita diretamente, sem passar por ele.

## Escopo geral

**Fora de escopo** (explicitamente descartado nesta rodada):
- Nova paleta de cores ou sistema tipográfico.
- Qualquer reestruturação de fluxo/navegação, ou adição/remoção de campos de formulário além do estritamente necessário para os itens abaixo (ex: adicionar um asterisco não é "mudar o formulário", remover o modal órfão não é "mudar o fluxo" — é remover algo que já não tem fluxo nenhum).
- Loop de preview (colar HTML de volta e renderizar), wizard progressivo de identidade, histórico de peças geradas — pertenciam ao plano anterior, descartado.
- Mudanças de arquitetura de autenticação ou funcionalidade do painel admin — essas telas só herdam os fixes globais de acessibilidade/tipografia/responsividade dos Lotes 1, 2 e 4 onde já se aplicam por serem regras compartilhadas, sem nenhuma mudança de fluxo dedicada a elas.
- Testes automatizados — o projeto não tem suíte hoje; introduzir uma está fora do escopo. Verificação é checagem de sintaxe (`node -c`) por arquivo alterado + teste manual no navegador.

## Lote 1 — Acessibilidade & foco de teclado

**Problemas atacados:** ausência total de `aria-`/`role`/`label for` (item 10); foco de teclado invisível nos seletores customizados que escondem o `<input>` nativo — `.radio-item`, `.logo-pos-item`, `.type-card`, `.format-card` (item 11); tooltips de campo só reagem a `:hover` (item 12); modais sem tecla Esc nem devolução de foco (item 14).

**Mudanças:**
- Todo `<input>`/`<select>`/`<textarea>` do formulário passa a ter um `<label for="id">` de verdade associado — incluindo os campos de paleta de cores, que hoje usam `<div class="field-label">` solto, sem vínculo algum com o input.
- Os componentes de escolha customizados (`.radio-item`, `.logo-pos-item`, `.type-card`, `.format-card`) ganham um anel de foco visível quando o `<input type="radio">` escondido dentro deles recebe foco via teclado. Reaproveita o mesmo padrão `:has()` já usado em `.field:has(input:focus...)` — evita introduzir uma técnica nova no CSS.
- `.field-tip` (o ícone "?") passa a reagir também a `:focus`/`:focus-within`, não só a `:hover` — precisa ficar alcançável por Tab (`tabindex="0"` se ainda não for focável).
- `#templateModal` e o novo modal de exclusão de marca (Lote 5) fecham com Esc e devolvem o foco ao elemento que os abriu.

**Critérios de aceite:**
1. Todo campo do formulário tem um `<label for>` associado ao seu id.
2. Navegar só de teclado (Tab) por Estilo Visual, Tipo de Post, Formatos e Posição de Logo mostra visualmente qual opção está em foco, em todas as 3 seções (Base/Carrossel/Post).
3. Tooltips de campo aparecem também ao focar via teclado.
4. Esc fecha os modais existentes e o novo modal do Lote 5, devolvendo o foco a quem os abriu.

## Lote 2 — Tipografia, cor e espaçamento

**Problemas atacados:** hierarquia tipográfica com só 2 níveis (item 1); cor do rótulo em foco sempre vira teal mesmo dentro de Carrossel/Post, contradizendo a cor de borda da própria seção (item 2); contraste insuficiente em `--muted` e no placeholder (itens 3, 4); uso de `.divider` inconsistente (item 6); espaçamento sem nível intermediário entre campo e seção (item 7); paleta do painel de preview desalinhada (item 8).

**Mudanças:**
- Novo nível tipográfico intermediário (ex: uma classe de "subtítulo de subgrupo") aplicado a cabeçalhos hoje reaproveitando `.field-label` para algo que não é rótulo de campo (ex: cabeçalho de "Presets de Layout para Carrossel", título de bloco de layout por formato no Post).
- A regra `.field:has(input:focus...) .field-label{color:var(--accent2)}` (hoje genérica, sempre teal) passa a ser escopada por seção, do mesmo jeito que a borda já é: `.base-focus` usa `--acc-base`, `.car-focus` usa `--acc-car`, `.post-focus` usa `--acc-post` — os wrappers já existem em `index.html` (`.layout base-focus`/`.layout car-focus`/`.layout post-focus`), só falta a regra de cor do label reaproveitar o mesmo escopo.
- `--muted` e a cor de placeholder sobem de contraste para atingir no mínimo AA (4.5:1) contra `--bg`. O valor hexadecimal exato é ajustado durante a implementação com um checker de contraste — este documento fixa o critério, não o hex.
- `.divider` (hoje usado uma única vez em todo o app) passa a separar subgrupos de campos dentro das seções mais densas identificadas na auditoria (Tipografia e Estrutura Visual da Base, no mínimo).
- Novo valor de espaçamento intermediário entre o gap de campo (`14px`) e a margem de seção (`64px`), usado para separar subgrupos conceituais dentro de uma mesma seção.
- `.output-box .key`/`.val` do painel de preview deixam de usar uma cor azul hardcoded (`#B0C4F8`) sem variável e passam a usar tokens já existentes no sistema (`--text`/`--label` ou equivalente), alinhando o preview ao resto da paleta.

**Critérios de aceite:**
1. Existe pelo menos um nível tipográfico visualmente distinto entre título de seção e rótulo de campo, aplicado onde a auditoria identificou o problema.
2. Focar um campo dentro do Carrossel ou do Post faz o rótulo mudar para a cor daquela seção (amarelo-limão/laranja), não mais sempre teal.
3. `--muted` e o placeholder atingem contraste mínimo 4.5:1 contra `--bg`, verificável com ferramenta de contraste.
4. Subgrupos de campos dentro de seções densas (Tipografia, Estrutura Visual) têm separação visual clara.
5. O painel de preview do prompt não usa mais nenhuma cor hardcoded fora do sistema de tokens.

## Lote 3 — Obrigatoriedade & progresso

**Problemas atacados:** indicador `.required` presente em só 3 de ~45 campos, dessincronizado da lógica real de `updateProgress()` (item 5); no Post, a navegação lateral trata as 6 seções com o mesmo peso visual quando só "Tipo de Post" é de fato obrigatório para gerar o prompt (item 17).

**Mudanças:**
- O `<span class="required">*</span>` passa a aparecer em todo campo que `updateProgress()` já trata como obrigatório na lógica — incluindo `cFormat`, `cSlideCount` e `cSequence` no Carrossel, que hoje contam para a barra "X/3 obrig." sem ter o indicador visual correspondente.
- Na navegação lateral do Post, a seção "Tipo de Post" recebe uma marcação visual distinta (ex: mesmo padrão do asterisco, ou um rótulo discreto) das outras 5 seções, sinalizando que só ela é necessária para já ter um prompt funcional — as demais ficam com um tratamento visual de "opcional".

**Critérios de aceite:**
1. Todo campo tratado como obrigatório por `updateProgress()` tem o indicador `.required` visível no formulário.
2. Na navegação lateral do Post, dá para diferenciar visualmente a seção obrigatória das opcionais sem precisar abrir cada uma.

## Lote 4 — Responsividade

**Problemas atacados:** zero regra responsiva na grade interna de conteúdo — `.layout` (3 colunas: sidebar de seções, formulário, preview), `.cols-2`/`.cols-3`, `.palette-grid`, `.type-grid`, `.logo-pos-grid`, `.format-row` (item 9). Hoje só a casca de navegação (`.app-shell`, breakpoint 920px) e o admin (`.admin-grid-layout`, 920px) reagem a tela estreita.

**Mudanças:**
- Breakpoints para `.layout` (colapsar as 3 colunas — provavelmente empilhando ou escondendo o painel de preview atrás de alguma ação, a decidir na fase de plano/implementação) e para os grids de cards (`.cols-2`/`.cols-3`, `.type-grid`, `.palette-grid`, `.logo-pos-grid`, `.format-row`) — empilhando em 1 coluna abaixo de determinada largura.
- Reaproveita os breakpoints já estabelecidos no CSS (1180px e 920px) em vez de introduzir novos valores.

**Critérios de aceite:**
1. Em viewport abaixo de 920px, nenhuma grade do formulário gera scroll horizontal nem sobreposição de conteúdo.
2. Os grids de cards (tipo de post, paleta, posição de logo, formato) permanecem utilizáveis (sem cards cortados ou ilegíveis) em telas estreitas.

## Lote 5 — Fluxo de ações

**Problemas atacados:** modal "Montar prompt" órfão, sem nenhum botão de acesso (item 13); exclusão de marca usa o mesmo `confirm()` genérico de excluir um preset avulso (item 15); salvar tem 3 pontos de entrada mas o único feedback de status fica na sidebar, longe de onde o clique acontece (item 16).

**Mudanças:**
- **Modal órfão:** remoção completa — `#claudeModal` (e o markup relacionado: botões de troca Carrossel/Post do modal) sai de `index.html`, `js/claude-generate.js` é deletado, a tag `<script src="js/claude-generate.js">` é removida. A funcionalidade de copiar o prompt já existe e é usada através dos painéis de Carrossel/Post (`carCopy()`/`postCopy()`); nenhuma perda funcional.
- **Confirmação de exclusão de marca:** novo modal no padrão visual já existente no app (mesma linha de `#templateModal`), explicando o que será perdido (nome da marca, e quantidade de presets salvos, se essa informação estiver prontamente disponível no momento da exclusão) antes de confirmar. Excluir um preset avulso continua usando `confirm()` simples — é uma ação menos grave e não precisa do mesmo tratamento. Texto do modal escrito com apoio do Fable 5.
- **Feedback de salvar:** o botão "Salvar" da topbar passa a mostrar uma confirmação transitória nele mesmo (ex: texto muda brevemente para "✓ Salvo" e volta ao normal) após um salvamento bem-sucedido — complementando, não substituindo, os indicadores que já existem na sidebar de cada painel (`saveStatus`/`saveStatusCar`/`saveStatusPost`).

**Critérios de aceite:**
1. Nenhum vestígio de `#claudeModal`/`claude-generate.js` permanece no projeto; a aplicação carrega e funciona normalmente sem eles.
2. Excluir uma marca abre um modal customizado (não o `confirm()` do navegador) explicando o que será perdido; excluir um preset continua com `confirm()` simples.
3. Clicar em "Salvar" na topbar produz uma confirmação visível no próprio botão, além do indicador já existente na sidebar.

## Riscos e decisões em aberto para a implementação

- O valor hexadecimal exato de `--muted` e da cor de placeholder após o ajuste de contraste é uma decisão de implementação (medida com ferramenta de contraste), não travada neste documento.
- Após remover o modal órfão, pode sobrar CSS não utilizado (`.claude-*`) em `style.css`. Limpar esse CSS é desejável mas não bloqueia o critério de aceite do Lote 5 — pode ficar como um ajuste incremental.
- A forma exata de colapso da grade de 3 colunas em telas estreitas (Lote 4) — empilhar tudo verticalmente vs. esconder o painel de preview atrás de uma ação — fica para a fase de plano/implementação decidir, dentro do critério de aceite já definido (sem scroll horizontal, sem sobreposição).
- A ordem de execução recomendada é 1 → 2 → 3 → 4 → 5 (acessibilidade primeiro, já que o Lote 2 reaproveita os mesmos estados de foco introduzidos no Lote 1), mas não é uma dependência rígida — o plano de implementação pode paralelizar lotes independentes se fizer sentido.
