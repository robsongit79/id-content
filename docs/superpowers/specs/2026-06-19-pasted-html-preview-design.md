# Preview de HTML Colado (Carrossel e Post) — Design

> Fase 2 do redesenho de UX/UI do ID Content (a Fase 1, Fundação de Navegação, está concluída e mesclada — ver `docs/superpowers/specs/2026-06-19-navigation-foundation-design.md`). Esta fase ataca a causa-raiz mais dolorosa identificada na análise de UX original: o usuário gera um prompt de texto, copia, cola num LLM externo, e nunca vê o resultado visual dentro do próprio app — cada iteração de "não ficou bom" exige saltar entre ferramentas, sem histórico do que já foi tentado.

## Contexto e motivação

Hoje, os painéis de Carrossel e Post (`#panelCar`, `#panelPost`) têm cada um um `<aside class="preview-panel">` com:
- O prompt de texto gerado (`#carOutput` / `#postOutput`)
- Um botão "Copiar prompt"

O fluxo termina aí. Para ver o resultado, o usuário precisa colar o prompt num LLM externo (Claude, ChatGPT), esperar o HTML, e abrir esse HTML em outro lugar (editor de código, navegador) para ver a peça final. Não há como comparar visualmente, no mesmo lugar, o briefing configurado e o resultado gerado.

## Escopo desta fase

**Dentro do escopo:**
- Um campo para colar o HTML retornado pelo LLM, dentro do mesmo `preview-panel` de Carrossel e de Post (simetricamente, um em cada).
- Um botão "Renderizar" que injeta esse HTML num `<iframe sandbox>` isolado.
- Uma miniatura escalada (fit dentro dos 310px do painel, respeitando a proporção real do canvas) com um botão "Expandir" que abre a mesma renderização em tamanho real, num modal.
- Limpeza automática do estado de preview ao trocar de marca ou de destino na navegação.
- Tolerância a colar a resposta completa do LLM incluindo crases de bloco de código (` ```html ... ``` `).

**Fora do escopo (fases futuras):**
- Qualquer alteração nos formulários de conteúdo de Base/Carrossel/Post.
- Reconstrução das seções de Carrossel/Post como um wizard passo-a-passo sequencial (avaliado e descartado nesta fase — os formulários atuais, com navegação lateral por seções, continuam como estão).
- Persistência/histórico das peças geradas (tabela de banco nova). O preview é efêmero: existe só enquanto a página está aberta, e é limpo ao trocar de marca/destino ou recarregar.
- Exportar a peça renderizada como imagem/PNG.
- Qualquer mudança em `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/prompts.js`, `js/templates.js`, `js/claude-generate.js`, ou no schema do banco.

## Interface

Em cada `preview-panel` (Carrossel e Post), abaixo do bloco de prompt + botão de copiar existente, adiciona-se um novo bloco:

```
[ textarea: "Cole aqui o HTML gerado pelo Claude" ]
[ botão: "Renderizar" ]

┌─────────────────┐
│  (iframe escalado,  │   [Expandir ⤢]
│   sandbox, fit-310px)│
└─────────────────┘
```

- O botão "Renderizar" fica desabilitado/sem efeito (com toast de erro) se o textarea estiver vazio.
- Antes de renderizar, o texto colado é limpo de marcadores de bloco de código Markdown (` ```html` no início, ` ``` ` no fim) caso estejam presentes — para não exigir que o usuário edite manualmente o texto.
- A miniatura renderiza num `<iframe sandbox="allow-scripts">` (sem `allow-same-origin`) via atributo `srcdoc`, isolando o HTML colado do resto do app: mesmo que o HTML seja malformado ou contenha algo inesperado, não pode acessar cookies, localStorage ou navegar a página principal.
- A escala da miniatura é calculada a partir da largura/altura reais do canvas: se o HTML gerado incluir os atributos `data-canvas-width`/`data-canvas-height` (convenção já mencionada nas instruções de prompt existentes para exportação Express, reaproveitada aqui), usa esses valores; caso contrário, assume um fallback de 1080×1080px. A miniatura usa `transform: scale()` para caber nos 310px de largura do painel sem distorcer a proporção.
- O botão "Expandir" abre um modal (mesmo padrão visual dos modais existentes no app, ex. `#templateModal`) com o mesmo HTML renderizado num segundo `<iframe sandbox>` em tamanho real, limitado a `max-height: 90vh` e centralizado, com botão de fechar.

## Comportamento / estado

- Cada painel (Carrossel, Post) tem seu próprio textarea, botão e área de preview — totalmente independentes um do outro, seguindo o padrão já existente de `app.currentTab`/`setCreateTab`.
- Ao trocar de marca (`app.openBrand`) ou de destino na sidebar (`app.switchDestination`) ou de sub-aba dentro de "Criar conteúdo" (`app.setCreateTab`), o conteúdo do textarea e a área de preview de ambos os painéis são limpos, para nunca mostrar a peça de uma marca/contexto anterior.
- Não há nenhuma chamada de rede nem persistência: tudo vive em memória/DOM enquanto a página está aberta.

## Tratamento de erros

- **Textarea vazio ao clicar "Renderizar":** toast de erro ("Cole o HTML antes de renderizar"), nada é renderizado.
- **HTML malformado ou incompleto:** sem validação prévia — o iframe renderiza o que conseguir, exatamente como um navegador comum faria. Um resultado visualmente quebrado é um sinal para o usuário ajustar o prompt ou pedir novamente ao LLM, não um erro tratado pelo app.

## Mudanças de código (alto nível)

- **`index.html`**: adicionar o bloco de textarea + botão + área de preview dentro dos dois `preview-panel` existentes (Carrossel e Post); adicionar o markup do modal de expansão (reaproveitando o padrão visual de modal já existente no CSS).
- **`js/ui.js`** (ou `js/app.js`, a decidir na fase de planejamento conforme onde funções afins já residem): novas funções `renderPastedHtml(panel)` (limpa marcadores de código, monta o `srcdoc`, calcula escala, injeta no iframe), `expandPreview(panel)` (abre o modal com o mesmo HTML em tamanho real), `clearPastedPreview(panel)` (limpa textarea + iframe).
- Pontos de integração: `clearPastedPreview()` é chamado a partir dos pontos onde hoje já se limpa estado ao trocar de contexto (`openBrand`, `switchDestination`, `setCreateTab`/`resetForm`).
- **Sem mudanças** em `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/prompts.js`, `js/templates.js`, `js/claude-generate.js`. Nenhuma migration de banco.

## Critérios de aceite

1. Em Carrossel e em Post, existe um campo para colar HTML e um botão "Renderizar", abaixo do prompt já gerado.
2. Colar um HTML válido (com ou sem crases de bloco de código) e clicar "Renderizar" mostra uma miniatura correta, na proporção certa, isolada num iframe sandboxed.
3. O botão "Expandir" abre a mesma peça em tamanho real, legível, num modal.
4. Clicar "Renderizar" com o campo vazio mostra um erro e não tenta renderizar nada.
5. Trocar de marca, de destino ou de sub-aba (Carrossel/Post) limpa o textarea e a área de preview de ambos os painéis.
6. Nenhuma chamada de rede nova é introduzida; nenhuma tabela de banco nova é criada; nenhum formulário de conteúdo existente é alterado.
7. O HTML colado nunca tem acesso a cookies/localStorage/DOM da página principal do app (sandbox do iframe).

## Riscos e decisões em aberto para a implementação

- A convenção `data-canvas-width`/`data-canvas-height` para calcular a escala da miniatura depende do LLM efetivamente incluir esses atributos no HTML gerado — as instruções de prompt atuais (`js/prompts.js`) não exigem isso explicitamente hoje. Se, na prática, o HTML colado não tiver esses atributos, o fallback de 1080×1080px deve produzir um resultado aceitável na maioria dos casos (formatos comuns de Instagram), mas pode distorcer levemente formatos 9:16. Decisão de implementação: medir o `scrollWidth`/`scrollHeight` reais do conteúdo carregado no iframe como alternativa ao atributo, se viável tecnicamente dentro do sandbox.
- Para esta fase, qualquer `<script>` dentro do HTML colado é permitido a rodar (`sandbox="allow-scripts"`), pois algumas peças geradas podem usar JS para pequenas animações/interações. O risco de isso ser usado de forma maliciosa é mitigado por não incluir `allow-same-origin`, então mesmo scripts arbitrários não conseguem ler dados do app.
