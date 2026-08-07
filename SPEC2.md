# SPEC2 — ID Content: Especificação para Reconstrução do Sistema

> Documento de Spec Driven Development (SDD). Descreve o sistema atual em detalhe suficiente para que ele possa ser recriado do zero, em outro repositório/ambiente, sem acesso ao código-fonte original.

---

## 1. Visão Geral

**ID Content** é uma SPA (Single Page Application) em JavaScript puro (sem framework) que ajuda usuários a gerar **prompts estruturados de identidade de marca** para serem colados em um LLM (Claude/ChatGPT), que então gera o **código HTML/CSS final** de carrosséis e posts para redes sociais, já respeitando a identidade visual da marca.

O sistema **não gera as imagens/HTML diretamente com IA** — ele monta um prompt de texto bem estruturado (com base nos dados preenchidos no formulário) que o usuário copia e cola em um LLM externo (ou via integração com a API Anthropic, opcionalmente). O grande valor do produto está na **engenharia do prompt**, não em geração de imagem.

### Problema que resolve
Sem um sistema estruturado, cada vez que alguém pede para uma IA gerar um post/carrossel, o resultado é inconsistente: tamanhos de fonte variam, paleta de cores não é respeitada, hierarquia visual fica fraca. O sistema resolve isso permitindo cadastrar a identidade da marca **uma vez** (cores, tipografia, tom de voz, restrições) e reaproveitar essas informações em todos os prompts gerados, com regras explícitas e mensuráveis de composição visual.

### Usuários
- Criadores de conteúdo / gestores de redes sociais que atendem múltiplas marcas/clientes.
- Um usuário pode cadastrar várias "marcas", cada uma com sua identidade visual própria.
- Existe um papel de **administrador**, que pode gerenciar usuários e compartilhar marcas com todos.

---

## 2. Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla (ES6+, sem build step, sem framework) |
| Hospedagem | Vercel (deploy estático + 2 serverless functions) |
| Backend/dados | Supabase (Postgres + Auth + REST autogerado via PostgREST) |
| Autenticação | Supabase Auth (email/senha), JWT access/refresh token |
| Funções serverless | Vercel Functions (Node.js) em `/api`, usadas só para ações administrativas e para uma integração opcional com a API da Anthropic |
| Fontes | Google Fonts (carregadas dinamicamente no editor para preview) |

Não há bundler, transpiler, nem dependências de runtime no frontend — tudo roda direto no navegador via `<script>` tags em sequência.

---

## 3. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────┐
│  index.html (SPA single-file shell)          │
│  ├─ Tela de Login/Signup                     │
│  ├─ Tela de Lista de Marcas                  │
│  ├─ Tela de Editor (3 abas: Base/Carrossel/Post) │
│  └─ Tela de Admin                            │
└───────────────┬───────────────────────────────┘
                │
   ┌────────────┴─────────────┐
   │     js/*.js (vanilla)     │
   │  app.js     → controller  │
   │  ui.js      → DOM helpers │
   │  prompts.js → prompt gen  │
   │  db.js      → CRUD calls  │
   │  supabase.js→ REST wrapper│
   │  auth.js    → sessão JWT  │
   │  templates.js→ presets de nicho │
   └────────────┬───────────────┘
                │ REST (fetch)
   ┌────────────┴─────────────┐
   │ Supabase (Postgres+Auth) │
   │  tabelas: brands,         │
   │  carousel_configs,        │
   │  post_configs,            │
   │  brand_presets            │
   └────────────┬───────────────┘
                │
   ┌────────────┴─────────────┐
   │ Vercel Functions (/api)   │
   │  admin.js  → gestão users │
   │  claude.js → proxy Anthropic API (órfã, não chamada pelo frontend atual) │
   └───────────────────────────┘
```

Não existe estado global de servidor além do Supabase — o frontend fala diretamente com a REST API do Supabase (PostgREST) usando a `anon key` + o JWT do usuário logado, respeitando Row Level Security (RLS) configurada no banco.

---

## 4. Modelo de Dados (Supabase / Postgres)

### Tabela `brands`
Armazena a identidade de marca (equivalente à aba "Base" do editor).

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | gerado pelo Supabase |
| name | text | obrigatório |
| handle | text | @ do Instagram |
| tagline | text | |
| niche | text | |
| positioning | text | |
| logo_active | boolean | se a marca usa logo |
| logo_url | text | **JSON serializado** com `{ user_id, created_by, is_shared }` — usado tanto para metadados de propriedade/compartilhamento quanto (no nome do campo, por herança histórica) para a URL da logo |
| color_primary, color_secondary, color_accent, color_dark, color_light, color_text | text (hex) | paleta de cores |
| colors_notes | text | regras de uso das cores |
| font_display, font_body | text | nomes exatos do Google Fonts |
| size_title, size_subtitle, size_body | text | faixas em px, ex: "28–36px" |
| weight_title | text | ex: "700 (Bold)" |
| italic_use | text | regra textual de uso de itálico |
| typo_notes | text | notas tipográficas livres — **crítico para consistência** |
| personality | text[] / jsonb | chips de adjetivos |
| goals | text[] / jsonb | chips de objetivos |
| tone_main, tone_reader, tone_never, tone_example | text | tom de voz |
| style_visual | text | um valor de um conjunto fixo (radio) |
| border_use, corner_radius, bg_rhythm, gradient_use, visual_signature | text | regras de estrutura visual |
| audience, pain, desire | text | ICP |
| visual_references, forbidden, canonical, final_notes | text | referências e restrições |
| hashtags | text[] / jsonb | chips |
| competitors | text | |
| topics | text[] / jsonb | chips de pautas |
| post_frequency | text | |
| created_at, updated_at | timestamptz | |

### Tabela `carousel_configs`
1:1 com `brands` (uma config de carrossel por marca).

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| brand_id | uuid (FK → brands.id) | |
| logo_pos_hero, logo_pos_cta | text | posição da logo nos slides de capa/CTA |
| format | text | proporção do carrossel |
| slide_count | text | |
| sequence | text | descrição da narrativa dos slides |
| fixed_elements | text | elementos repetidos em todos os slides |
| slide_hero, slide_cta | text | descrição de estrutura dos slides especiais |
| notes | text | **JSON serializado**: `{ notes, forbidden, delivery_format, font_base64, final_notes, content }` |
| created_at, updated_at | timestamptz | |

> Nota de design: o campo `notes` empacota várias sub-informações em JSON dentro de uma coluna `text`, em vez de ter uma coluna por campo. Isso foi feito para evitar migrations a cada novo campo de "notas" — ao recriar do zero, vale considerar se isso compensa ou se é melhor ter colunas normalizadas.

### Tabela `post_configs`
1:1 com `brands`.

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| brand_id | uuid (FK) | |
| logo_pos | text | |
| post_type | text | um dos 13 tipos (ver seção 6.3) |
| formats | text[] / jsonb | quais proporções gerar: `1x1`, `4x5`, `9x16` |
| headline, subtitle, cta | text | |
| content_notes | text | **JSON serializado**: `{ content_notes, free_text, unified_layout }` |
| items | text[] / jsonb | chips (usado por checklist/passo-a-passo) |
| stat_number, stat_context, stat_source | text | campos do tipo "estatística" |
| comp_a, comp_b | text | campos do tipo "comparativo"/"antes-depois" |
| anuncio_price, anuncio_benefit | text | campos do tipo "anúncio" |
| urgencia_prazo, urgencia_oque | text | campos do tipo "urgência" |
| quote_text, quote_author, quote_role | text | campos do tipo "depoimento"/"citação" |
| article_body | text | campo do tipo "mini-artigo" |
| layout_1x1_text_pos, layout_1x1_bg, layout_1x1_notes | text | layout por formato |
| layout_4x5_text_pos, layout_4x5_bg, layout_4x5_notes | text | |
| layout_9x16_text_pos, layout_9x16_bg, layout_9x16_notes | text | |
| forbidden, delivery_format, font_base64, final_notes | text | |
| created_at, updated_at | timestamptz | |

### Tabela `brand_presets`
Permite salvar combinações de cor/fonte/layout reutilizáveis por marca.

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| brand_id | uuid (FK) | |
| user_id | uuid | dono do preset |
| name | text | |
| type | text | `'carousel'` ou `'post'` |
| colors | jsonb | subset dos campos de cor da marca |
| fonts | jsonb | subset dos campos de tipografia da marca |
| layout | jsonb | o resultado de `collectCarousel()` ou `collectPost()` |
| created_at | timestamptz | |

### RLS (Row Level Security) — comportamento esperado
- Cada marca tem um "dono" (`user_id` dentro do JSON de `logo_url`, infelizmente não normalizado — ao recriar do zero, criar uma coluna `owner_id uuid` real).
- Marcas podem ser marcadas como `is_shared: true`, e nesse caso ficam visíveis para todos os usuários autenticados, não só o dono.
- Administradores (ver seção 7) veem todas as marcas independentemente de dono/compartilhamento.
- Recomendação para a reconstrução: implementar isso via RLS real do Postgres (policy baseada em `auth.uid() = owner_id OR is_shared = true OR is_admin()`), em vez de filtrar no frontend como o sistema atual faz em `app.filterBrands()`.

---

## 5. Estrutura de Arquivos

```
/
├── index.html              # shell único da SPA (todas as telas, ~660 linhas)
├── css/style.css           # design system + todos os estilos (~770 linhas)
├── js/
│   ├── config.js           # gerado no build: window.SUPABASE_URL / window.SUPABASE_KEY
│   ├── config.example.js   # template do config.js (não usado em runtime)
│   ├── supabase.js         # wrapper REST genérico (select/insert/update/delete) + retry em 401
│   ├── auth.js             # signup/login/logout/checkSession (refresh token)
│   ├── db.js               # camada de CRUD específica do domínio (brands, configs, presets)
│   ├── prompts.js          # construção dos prompts de texto (o "coração" do produto)
│   ├── ui.js                # helpers de DOM, tooltips, preview visual, progresso, dirty/save
│   ├── templates.js          # presets de marca por nicho (autoescola, nutricionista, etc.)
│   ├── claude-generate.js   # modal opcional que monta prompt + conteúdo bruto combinados
│   └── app.js                # controller principal: estado, fluxos, fill/collect forms
├── api/
│   ├── admin.js             # Vercel Function: gestão de usuários (lista/promove/exclui)
│   └── claude.js            # Vercel Function: proxy para a API da Anthropic — existe e funciona isoladamente, mas NÃO é chamada por nenhum fluxo atual do frontend (órfã; ver seção 6.8)
├── vercel.json               # build command que gera js/config.js a partir de env vars
├── package.json
└── .gitignore                # ignora js/config.js (contém credenciais)
```

---

## 6. Especificação Funcional

### 6.1 Autenticação (`js/auth.js`)
- Login/Signup via Supabase Auth REST (`/auth/v1/token?grant_type=password`, `/auth/v1/signup`).
- Sessão guardada em `localStorage`: `supabase_access_token`, `supabase_refresh_token`, `supabase_user`.
- `checkSession()`: se o token existir mas estiver expirado, tenta renovar via refresh token.
  - **Detalhe crítico de implementação**: o Supabase rotaciona o refresh token a cada uso (um refresh token só pode ser usado uma vez). Se múltiplas requisições disparam refresh em paralelo (ex: salvamento de 3 tabelas simultâneas), a 2ª e 3ª tentativa de refresh falham porque o token já foi invalidado pela 1ª. **Solução obrigatória**: deduplicar refreshes concorrentes com uma promise compartilhada (`this._refreshPromise`), de forma que todas as chamadas concorrentes aguardem o mesmo refresh em vez de cada uma disparar a sua.
- `logout()`: invalida sessão no Supabase e limpa localStorage.

### 6.2 Camada de dados (`js/supabase.js` + `js/db.js`)
- `supabase.query()` é o único ponto de acesso HTTP: monta a URL `${SUPABASE_URL}/rest/v1/${table}${filter}`, manda `apikey` + `Authorization: Bearer <token>` + `Prefer: return=representation`.
- Em caso de `401`, tenta `auth.checkSession()` uma vez e refaz a requisição.
- `db.js` implementa um padrão "upsert manual": para `carousel_configs`/`post_configs`, primeiro busca se já existe linha para aquele `brand_id`; se sim, `PATCH`, senão `POST`. (Numa reconstrução, considerar usar `upsert` nativo do PostgREST com `on_conflict=brand_id` para simplificar.)
- `saveAll(brandId, brandData, carData, postData)` salva as 3 tabelas em paralelo via `Promise.all` — é a origem do race condition de refresh token descrito acima; ao reconstruir, manter a deduplicação de refresh em vez de serializar os saves (paralelismo é desejável por performance).

### 6.3 Editor — 3 Abas

#### Aba Base (identidade da marca)
Seções (na ordem do formulário): Identidade → Tom de Voz → Audiência → Paleta de Cores → Tipografia → Estrutura Visual → Referências & Restrições.

Campos-chave e por que existem:
- `bTypoNotes`, `bCanonical`, `bForbidden`: são campos de **texto livre que carregam regras comportamentais**, não apenas dados. Removê-los do prompt (erro cometido numa iteração anterior do projeto) causa inconsistência visual entre gerações, porque o LLM perde as âncoras de "como aplicar" os valores numéricos/cores.
- Paleta sempre com 6 cores nomeadas: primária, secundária, acento, fundo escuro, fundo claro, texto — não cores genéricas "cor 1/cor 2".
- Tamanhos de fonte são guardados como **faixa em texto livre** (ex: "28–36px"), não como número — isso dá flexibilidade mas exige instruir o LLM a escolher um valor fixo dentro da faixa e mantê-lo constante entre peças (ver seção 6.5).

#### Aba Carrossel
Seções: Conteúdo (texto bruto) → Estrutura (formato, nº de slides, sequência narrativa) → Logo → Slides Especiais (hero + CTA com estrutura descrita em texto livre) → Restrições & Entrega.

#### Aba Post
Seções: Logo → **Tipo de Post** (seleção exclusiva entre 13 tipos pré-definidos) → Conteúdo → Formatos (multi-seleção entre `1x1`, `4x5`, `9x16`) → Layout (por formato, ou unificado) → Restrições & Entrega.

**Os 13 tipos de post** (`app.postTypeConfig`), cada um com campos dinâmicos próprios:
1. `frase-impacto` — sem campos extras
2. `checklist` — itens (chips)
3. `estatistica` — número, contexto, fonte
4. `antes-depois` — comparação A/B
5. `passo-a-passo` — itens numerados (chips)
6. `pergunta` — sem campos extras
7. `comparativo` — comparação X/Y
8. `anuncio` — preço, benefício
9. `urgencia` — prazo, o que acaba
10. `lancamento` — sem campos extras
11. `depoimento` — citação, autor, cargo
12. `citacao` — citação, autor, cargo (igual ao depoimento, rótulos diferentes)
13. `mini-artigo` — corpo de texto

> Numa versão mais madura, o produto chegou a ter **9 formatos adicionais** de post mais disruptivos (recibo, print de chat, capa de revista, correção de erro, manchete de jornal, ranking, dilema, revelação, terminal de código) — ver histórico do git para os campos exatos, caso se queira reincorporar isso na reconstrução. Não estão descritos em detalhe aqui porque não fazem parte do estado mínimo a recriar, mas valem como backlog de v2.

### 6.4 Geração de Prompt (`js/prompts.js`) — o núcleo do produto

Três funções builders, todas retornam uma string de texto (ou `null` se a marca não tiver nome preenchido):

- `buildBase()` — monta o prompt da identidade de marca em seções numeradas `## 01 · IDENTIDADE` até `## 07 · REFERÊNCIAS`. Cada seção só aparece se tiver pelo menos um campo preenchido.
- `buildCarousel()` — chama `buildBase()` internamente, concatena com a config de carrossel, e finaliza com um bloco `# INSTRUÇÕES DE SAÍDA` numerado contendo as regras críticas (ver 6.5).
- `buildPost()` — mesma lógica, para post.
- `highlight(text, sectionClass)` — apenas para syntax-highlight do preview na UI (não afeta o prompt copiado).

Formato de saída de cada campo: `RÓTULO:          valor`, com o rótulo alinhado em colunas fixas usando `' '.repeat(...)` — isso é estético/legibilidade para quem olha o preview, não é semanticamente necessário pro LLM.

### 6.5 Regras Críticas de Geração (texto exato a preservar/replicar)

Estas regras vivem dentro do bloco `# INSTRUÇÕES DE SAÍDA` de `buildCarousel()`/`buildPost()` e são o resultado de iteração e correção de bugs reais de qualidade visual. **Ao reconstruir, replicar o espírito (e de preferência o texto) destas regras é o que diferencia este produto de um simples "monta texto com os valores dos inputs":**

1. **Acentuação/codificação**: forçar `<meta charset="UTF-8">` e proibir perda de acentos.
2. **Fontes em base64 obrigatórias** (ou fallback documentado): instruir a IA a embutir fontes reais via `@font-face` em base64, e **nunca inventar uma string base64 falsa** (uma string inválida quebra o carregamento da fonte sem erro visível). Caso não tenha o binário real, permitir fallback explícito para Google Fonts via `<link>`/`@import` — mas nunca uma base64 alucinada.
3. **Composição visual e hierarquia (regra mais importante para qualidade estética do post)**:
   - A IA deve escolher entre **4 padrões de composição nomeados** em vez de cair no "card centralizado genérico": *split assimétrico* (60/40), *figura/número de fundo* (elemento gigante como camada), *banner diagonal* (faixa cortando o canvas), *card sobreposto* (camadas com sombra/profundidade).
   - Hierarquia obrigatória em 3 camadas de peso visual (destaque principal / suporte / secundário).
   - **Limite numérico de espaço vazio**: nenhum vão entre blocos pode exceder ~8% da altura do canvas sem um elemento decorativo preenchendo.
   - **Proporção mínima de tamanho de texto**: texto de suporte nunca menor que 25–33% do tamanho do headline (combate o problema real observado de "headline gigante + resto minúsculo").
   - Mapeamento de padrão recomendado por tipo de post (estatística → figura/número de fundo; citação → idem; comparativo → split ou banner diagonal; checklist → card sobreposto; anúncio/urgência → banner diagonal ou split).
4. **Tamanhos de tipografia são valores fixos e invioláveis**: a seção de TIPOGRAFIA do prompt deve ser explicitamente marcada como "não alterar", inclusive proibindo que a IA aumente o tamanho da fonte para preencher espaço vazio — esse ajuste deve ser feito por line-height/padding/reposicionamento, nunca por font-size. (Bug real corrigido: uma regra anterior de "preencher espaço vazio" entrava em conflito com os tamanhos configurados e a IA aumentava a fonte livremente.)
5. **Regras de resposta para cópia direta**: retornar **apenas** o bloco de código HTML/CSS dentro de \`\`\`html, sem texto antes/depois — o usuário precisa colar e usar sem editar.

> Lição de produto a preservar: regras **principiológicas** ("tenha boa hierarquia") tendem a ser ignoradas pela IA porque não dão limite concreto. Regras **com números e nomes de padrões concretos** funcionam muito melhor. Ao escrever novas regras de prompt no futuro, sempre converter princípios vagos em limites mensuráveis ou em opções nomeadas e finitas.

### 6.6 Outras Funcionalidades
- **Presets**: salvar/aplicar combinações reutilizáveis de cor+fonte+layout, por marca, separados por tipo (carrossel/post).
- **Templates de marca por nicho** (`js/templates.js`): 6 templates pré-preenchidos (autoescola, nutricionista, SaaS B2B, infoproduto, moda, consultoria) para começar uma marca nova rapidamente.
- **Import/Export JSON**: cada marca pode ser exportada como `.json` (brand + carousel + post + presets) e reimportada — útil para backup ou para duplicar entre contas.
- **Duplicar/Excluir/Compartilhar marca** direto na lista (cards com ações inline).
- **Autosave com debounce**: qualquer alteração em campo dispara `markDirty()`, que reseta um timer de 3s; se não houver nova alteração, salva automaticamente.
- **Painel Admin**: lista usuários do Supabase Auth, permite promover/remover admin e excluir usuários (via Vercel Function com Service Role Key — nunca exposta no frontend).
- **Atalhos de cópia**: botões/menu para copiar rapidamente o prompt Base, Carrossel ou Post para a área de transferência.
- **Modal "Montar prompt com IA" (`js/claude-generate.js`)**: permite colar um conteúdo bruto e gerar um texto combinado (config da marca + conteúdo + instrução final) para copiar manualmente. **Importante**: apesar do nome e da existência de `api/claude.js`, esse modal não chama nenhuma API de IA — ele só concatena texto localmente (`build()`) e copia para a área de transferência (`copyResult()`). Não há nenhuma chamada `fetch('/api/claude')` em todo o frontend.

### 6.8 Integração com a API da Anthropic — existe mas está desconectada
`api/claude.js` é uma Vercel Function completa e funcional (recebe `systemPrompt` + `userContent`, chama `api.anthropic.com/v1/messages` com a `ANTHROPIC_API_KEY`, retorna o texto gerado). O histórico do git mostra que o produto já teve geração via IA diretamente no app (`feat: integração Claude API para geração de carrossel e post com IA`), e depois foi revertido para montagem local de prompt (`refactor: montar prompt localmente em vez de chamar Claude API`) — provavelmente para reduzir custo de API e dar ao usuário controle total do prompt final antes de colar em outro lugar.
**Ao reconstruir**: decidir conscientemente se a Fase 8+ deve reconectar essa function (gerando o HTML automaticamente dentro do app) ou se o modelo "copiar prompt e colar manualmente em um LLM externo" continua sendo a escolha de produto certa. Não assumir que a function existente está em uso só porque o arquivo está no repositório.

### 6.7 Admin (`api/admin.js`)
- Toda ação administrativa passa por uma Vercel Function que:
  1. Valida o JWT do chamador contra o endpoint `/auth/v1/user` do Supabase.
  2. Verifica se o e-mail está na lista `ADMIN_EMAILS` (env var, lista separada por vírgula) OU se `app_metadata.role === 'admin'`.
  3. Só então usa a **Service Role Key** (nunca exposta ao frontend) para listar/promover/excluir usuários via `/auth/v1/admin/users`.
- Proteções: usuário não pode remover o próprio admin nem excluir a própria conta.

---

## 7. Design System (`css/style.css`)

Tema escuro fixo (não há modo claro). Tokens principais (CSS custom properties):

```css
--bg:#0E0E0E; --surface:#161616; --border:#2A2A2A; --border-hi:#3D3D3D;
--text:#F0F0F0; --muted:#666; --label:#999; --red:#FF5C5C; --accent2:#47FFD4;
--acc-base:#B482FF; --acc-car:#E8FF47; --acc-post:#FF6B35;
--font-d:'Montserrat',sans-serif; --font-m:'IBM Plex Mono',monospace;
```

- `--acc-base/--acc-car/--acc-post` são cores de identidade **da própria UI do editor** (para diferenciar visualmente as abas Base/Carrossel/Post) — não confundir com a paleta de cores da marca do usuário, que é outro conjunto de campos.
- Tipografia da UI: Montserrat (display) + IBM Plex Mono (rótulos/código), carregadas via Google Fonts no `<head>`.

---

## 8. Deploy

- **Vercel** com `buildCommand` customizado que:
  1. Limpa e recria a pasta `public/`.
  2. Copia `index.html`, `css/`, `js/` para `public/`.
  3. **Gera `public/js/config.js` dinamicamente** a partir das env vars `SUPABASE_URL` e `SUPABASE_KEY` do ambiente Vercel — assim as credenciais públicas (anon key) nunca ficam hardcoded no repositório.
- `outputDirectory: "public"`.
- Variáveis de ambiente necessárias no Vercel:
  - `SUPABASE_URL`, `SUPABASE_KEY` (anon key — pública, protegida por RLS)
  - `SUPABASE_SERVICE_ROLE_KEY` (secreta, só usada nas Functions)
  - `ADMIN_EMAILS` (lista de e-mails admin, separada por vírgula)
  - `ANTHROPIC_API_KEY` (opcional, só se for usar `api/claude.js`)
- `.gitignore` deve sempre excluir `js/config.js` (gerado no build, nunca commitado).

---

## 9. Plano de Implementação (do zero, em fases)

### Fase 0 — Setup
1. Criar projeto no Supabase; criar as 4 tabelas (seção 4) com RLS habilitada.
2. Criar policies de RLS reais (dono vê o que é seu + compartilhados + admin vê tudo) — **não reimplementar o filtro só no frontend** como o sistema original faz.
3. Configurar Supabase Auth (email/senha).
4. Criar repositório, `vercel.json` com o build command que injeta as env vars em `config.js`.

### Fase 1 — Esqueleto da SPA
1. `index.html` com as 4 telas (login, lista, editor com 3 abas vazias, admin) e `css/style.css` com os tokens de design.
2. `js/supabase.js` (wrapper REST genérico) e `js/auth.js` (login/signup/checkSession com deduplicação de refresh — implementar a dedup desde o início, não como correção posterior).
3. Fluxo de login funcionando e navegação entre telas.

### Fase 2 — CRUD de Marca (aba Base)
1. `js/db.js` com CRUD de `brands`.
2. Formulário completo da aba Base (todas as seções da 6.3).
3. `app.collectBrand()` / `app.fillBrand()`.
4. Autosave com debounce.

### Fase 3 — Geração de Prompt Base
1. `js/prompts.js` com `buildBase()`.
2. Preview do prompt gerado na tela, com botão de copiar.
3. Validar manualmente que o prompt gerado, colado num LLM, produz resultado coerente com os dados da marca.

### Fase 4 — Aba Carrossel
1. CRUD de `carousel_configs`.
2. Formulário completo (estrutura, logo, slides especiais, entrega).
3. `buildCarousel()` com as regras críticas da seção 6.5 (fontes base64, acentuação, regras de resposta) — implementar a regra de composição visual aqui mesmo, não deixar para depois (foi o erro do projeto original: composição visual só foi adicionada depois que os posts já estavam "esteticamente pobres" em produção).

### Fase 5 — Aba Post
1. CRUD de `post_configs`.
2. Seleção de tipo de post + campos dinâmicos (13 tipos da seção 6.3).
3. Seleção de formatos + layout por formato.
4. `buildPost()` com as mesmas regras críticas + a regra de composição visual (padrões nomeados, limite de espaço vazio, proporção mínima de texto) **desde a primeira versão**.

### Fase 6 — Funcionalidades de produtividade
1. Presets (salvar/aplicar combinações de cor+fonte+layout).
2. Templates de marca por nicho.
3. Import/Export JSON de marca.
4. Duplicar/Excluir/Compartilhar marca na lista.

### Fase 7 — Admin
1. Vercel Function `api/admin.js` com validação de JWT + Service Role Key.
2. Painel admin no frontend (listar/promover/excluir usuários).
3. Campo `is_shared` por marca + filtro de visibilidade (idealmente via RLS, não só frontend).

### Fase 8 — Polimento de Prompt (iteração contínua)
Esta fase nunca "termina" — é o ciclo de melhoria do produto:
1. Gerar peças reais com os prompts atuais.
2. Identificar problemas estéticos concretos (ex: espaço vazio, texto pequeno, composição genérica).
3. Traduzir o problema em **regra mensurável** (número, padrão nomeado, lista finita de opções) — nunca em princípio vago.
4. Adicionar a regra ao `buildCarousel()`/`buildPost()`, testar, e verificar que não conflita com nenhuma regra existente (ex: regra de "preencher espaço" não pode conflitar com "tamanho de fonte fixo").

---

## 10. Critérios de Aceite (Definition of Done) por Fase

- **Fase 1**: usuário consegue criar conta, logar, deslogar, e a sessão persiste entre reloads (refresh token funcional, sem o bug de race condition).
- **Fase 2**: dados da aba Base persistem no Supabase e voltam a aparecer ao reabrir a marca.
- **Fase 3**: o prompt gerado, colado manualmente num LLM, produz uma resposta que respeita nome da marca, cores e tom de voz informados.
- **Fase 4/5**: prompt de carrossel/post gerado e testado manualmente produz HTML que:
  - usa exatamente as cores e fontes da marca;
  - usa font-size fixo conforme configurado (não varia entre gerações);
  - não tem vazios visuais grandes e não-intencionais;
  - usa um dos padrões de composição definidos, não um card genérico centralizado.
- **Fase 6**: marca pode ser duplicada/exportada/importada sem perda de dados (incluindo presets).
- **Fase 7**: usuário não-admin não consegue acessar `/api/admin` (testar diretamente via curl/Postman, não só esconder o botão na UI).

---

## 11. Riscos e Decisões a Revisitar na Reconstrução

| Decisão original | Risco | Recomendação para v2 |
|---|---|---|
| `logo_url` reaproveitado como campo de metadados JSON (dono, compartilhamento) | Confuso, frágil a erro de parse | Criar colunas reais: `owner_id uuid`, `is_shared boolean` |
| Filtro de visibilidade de marca feito no frontend (`filterBrands()`) | Qualquer usuário com a anon key pode, em tese, listar marcas de outros via REST direta se RLS não estiver bem configurada | Implementar RLS real no Postgres desde o início |
| Campos de "notas" empacotados em JSON dentro de uma coluna `text` (`carousel_configs.notes`, `post_configs.content_notes`) | Dificulta queries/migrations futuras | Considerar colunas normalizadas se o volume de dados justificar |
| Fallback de fonte hardcoded em algumas funções da API admin | Chave anônima exposta em texto no código-fonte do `api/admin.js` original | Sempre usar `process.env`, nunca hardcode, nem como fallback "temporário" |
| Refresh token sem deduplicação (bug corrigido depois) | Perda de sessão sob salvamento paralelo | Implementar a deduplicação de refresh (`_refreshPromise`) desde a Fase 1 |
| Regras de prompt vagas/principiológicas (corrigido depois) | IA ignora ou interpreta de forma inconsistente | Escrever toda regra nova de composição já com números/padrões nomeados, nunca só princípios |

---

*Documento gerado a partir da análise do código-fonte do sistema em produção (commit `978f898`), em 2026-06-19.*
