# Simplificação dos Formulários (Identidade, Carrossel, Post) — Design

> Trabalho no branch `simplificado`. Não é parte da sequência de fases do redesenho de UX (navegação / preview de HTML) — é uma simplificação direta de conteúdo de formulário, pedida pelo usuário a partir da experiência real de uso do app.

## Contexto e motivação

Usando o app no dia a dia, o usuário identificou que vários campos dos formulários de Identidade, Carrossel e Post nunca são preenchidos ou não agregam valor proporcional ao tempo de preenchimento — preferindo formulários mais curtos, com texto livre cobrindo o que sobrar, em vez de muitos campos estruturados de baixo uso.

## Escopo

### 1. Identidade (aba Base)

**Seção 01 · Identidade da Marca** — remove os campos:
- Handle Instagram (`bHandle`)
- Tagline (`bTagline`)
- Segmento / Nicho (`bNiche`)
- Posicionamento (`bPositioning`)

Mantém: Nome da marca, checkbox de logo ativa, checkbox de compartilhamento (admin).

**Remove completamente as seções:**
- 02 · Tom de Voz (Personalidade, Tom principal, Tratamento, Nunca fazer, Exemplo de headline)
- 03 · Audiência (Perfil do público, Principal dor, Principal desejo, Objetivos de conteúdo, Temas/Pautas, Frequência de postagem)
- 07 · Referências & Restrições (Referências visuais, Proibições globais, Referência canônica aprovada, Hashtags padrão, Concorrentes principais, Notas finais)

**Mantém sem alteração:** Paleta de Cores, Tipografia, Estrutura Visual. A numeração das seções restantes é renumerada sequencialmente (01–04).

### 2. Carrossel

Remove o botão "Mostrar Configurações Avançadas" e o bloco que ele revela (Formato de entrega, Fontes) da seção "Restrições & Entrega". O restante da seção (O que não fazer, Notas finais) permanece sem alteração.

### 3. Post

**Tipo de Post:** mantém os 13 cards de seleção de tipo (continuam alimentando a regra de composição visual determinística do prompt, implementada em `js/prompts.js`). Remove o bloco de campos dinâmicos por tipo que aparecia abaixo da seleção (número/contexto/fonte da estatística, comparação A/B, preço/benefício, prazo/o-que-acaba, citação/autor/cargo, corpo do mini-artigo, itens de checklist/passo-a-passo).

**Conteúdo do Post:** remove Headline, Subtítulo e CTA. Sobram apenas dois campos, usados para todos os tipos de post:
- Texto livre / Copy do Post
- Observações de conteúdo

**Restrições & Entrega → renomeada para "Obrigatoriedades":** remove "O que não fazer", o toggle de Configurações Avançadas (Formato de entrega, Fontes) e "Notas finais". Sobra um único campo de texto livre, rotulado "Obrigatoriedades", reaproveitando a coluna `final_notes` já existente na tabela `post_configs` (sem migração de banco).

**Simulador Visual:** removido completamente do painel lateral do Post (o card de preview com toggles 1:1/4:5/9:16 e a simulação de headline/CTA/corpo por tipo) — sem os campos estruturados que ele exibia, deixa de ter dados para mostrar.

**Seções não tocadas:** Posicionamento da Logo, Formatos, Layout do Post.

## Princípio de segurança de dados (decisão de implementação, vale para os 3 itens acima)

Para marcas/posts/carrosséis já existentes que tenham valores salvos nos campos removidos: **não sobrescrever esses valores com string vazia**. `collectBrand()`, `collectCarousel()` e `collectPost()` passam a simplesmente **não incluir** essas chaves no objeto enviado ao Supabase. Como o `supabase.update()` usa `PATCH` (atualização parcial), os valores antigos permanecem intactos no banco — só deixam de ser editáveis pela UI e deixam de aparecer no prompt gerado (que lê os campos do DOM, não do banco, via a função `f(id)`).

## Impacto no prompt gerado

- `buildBase()`: as seções `## 02 · TOM DE VOZ`, `## 03 · AUDIÊNCIA` e `## 07 · REFERÊNCIAS` deixam de aparecer (cada seção só é incluída quando há ao menos um campo preenchido — sem os campos, a condição nunca é verdadeira). Os campos do bloco "Identidade" que restam (`bName`) continuam funcionando como hoje.
- `buildCarousel()`: a linha `FONTES:` na seção `## ENTREGA` deixa de aparecer (não há mais campo `cFontB64`/`cDelivery` para gerar essa linha).
- `buildPost()`: as linhas de `HEADLINE`/`SUBTÍTULO`/`CTA` e os blocos de conteúdo dinâmico por tipo (número, citação, comparação etc.) deixam de aparecer na seção `## CONTEÚDO`. A seção `## ENTREGA` passa a ter apenas a linha `OBRIGATORIEDADES:` (reaproveitando o valor antes salvo como `final_notes`).
- A regra de composição visual determinística (`POST_COMPOSITION_PATTERNS`, baseada em `app.postType`) **não é afetada** — continua funcionando exatamente como hoje, já que depende só do tipo selecionado, não dos campos de conteúdo dinâmico.

## Limpeza de código necessária (consequência direta da remoção, não escopo adicional)

- **`js/ui.js`** — `selectPostType()`: remove a lógica de mostrar/ocultar campos dinâmicos por tipo (não existem mais). `updateVisualPreview()` e `setPreviewRatio()`: removidas por completo (só existiam para o Simulador Visual).
- **`js/app.js`** — `collectPost()`/`fillPost()`: removem a coleta/preenchimento de `headline`, `subtitle`, `cta`, `stat_*`, `comp_a/b`, `anuncio_*`, `urgencia_*`, `quote_*`, `article_body`, `items`, `forbidden`, `delivery_format`, `font_base64`; mantêm `final_notes` (agora "Obrigatoriedades"), `content_notes`/`free_text`, `logo_pos`, `post_type`, `formats`, e os campos de layout por formato (`layout_*`, não tocados). `collectBrand()`/`fillBrand()`: removem a coleta/preenchimento de `handle`, `tagline`, `niche`, `positioning`, `tone_*`, `personality`, `audience`, `pain`, `desire`, `goals`, `topics`, `post_frequency`, `visual_references`, `forbidden`, `canonical`, `hashtags`, `competitors`, `final_notes` (da Base — note que `final_notes` existe tanto em `brands` quanto em `post_configs`; só a de `brands` é removida aqui). `collectCarousel()`: remove a coleta de `delivery_format`/`font_base64` do objeto `notesData`.
- **`js/ui.js`** — `updateProgress()`: a lista de campos "obrigatórios" do Base hoje inclui `bToneMain` e `bAudience`; como esses campos somem, a barra de progresso nunca chegaria a 100% sem ajuste. Passa a considerar apenas os campos que continuam existindo (`bName`, `cPrimaryHex`, `bFontDisplay`, e os dois opcionais relevantes que sobraram).
- **`js/prompts.js`** — `buildBase()`, `buildCarousel()`, `buildPost()`: removem as linhas que leem os campos eliminados (já cobertas em "Impacto no prompt gerado" acima).
- **`js/ui.js`** — `FIELD_TIPS`: remove as entradas de tooltip dos campos eliminados (entradas órfãs, já que `initTooltips()` teria nada para anexar — inofensivo deixá-las, mas removidas por limpeza).
- **`index.html`**: remove o markup de todos os campos/seções listados, renumera as seções restantes do Base, atualiza o título da seção "Restrições & Entrega" do Post para "Obrigatoriedades" em ambos Carrossel (mantém o nome atual, não foi pedido renomear lá) e Post (renomeia).

**Fora de escopo:** `js/templates.js` (BRAND_TEMPLATES) continua preenchendo campos como `tagline`/`positioning`/`tone_main`/etc. ao criar marca a partir de um template — isso é inofensivo (os valores são salvos no banco mas nunca aparecem em nenhum campo de UI nem no prompt, já que o prompt lê do DOM). Não há necessidade de alterar `templates.js` para este escopo.

## Critérios de aceite

1. Aba Identidade mostra só: Nome da marca, logo, paleta de cores, tipografia, estrutura visual.
2. Aba Carrossel não mostra mais o botão/bloco de Configurações Avançadas.
3. Aba Post: seleção de tipo continua funcionando; campos dinâmicos por tipo não aparecem mais; Conteúdo do Post mostra só texto livre + observações; "Restrições & Entrega" aparece como "Obrigatoriedades" com um único campo; Simulador Visual não aparece mais.
4. Prompts gerados (Base/Carrossel/Post) refletem as remoções (seções/linhas correspondentes não aparecem mais).
5. A regra de composição visual por tipo de post continua funcionando sem alteração.
6. Abrir uma marca/post/carrossel já existente (criado antes desta mudança, com dados nos campos removidos) não apaga esses dados no banco — eles só deixam de ser visíveis/editáveis.
7. Barra de progresso do Base continua funcionando e consegue chegar a 100% com os campos restantes preenchidos.
8. Nenhuma mudança de schema no banco de dados.

## Riscos e decisões em aberto

- Ao reaproveitar a coluna `final_notes` de `post_configs` como o campo único "Obrigatoriedades", qualquer post antigo que já tivesse algo em "Notas finais" passará a aparecer automaticamente no novo campo único (mesmo dado, rótulo novo) — isso é o comportamento esperado e desejado (não há perda de dado, e o campo "O que não fazer"/`forbidden` antigo fica preservado no banco mas não é mais mostrado nem reaproveitado em nenhum campo visível).
