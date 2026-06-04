# IDContent — Plano de Melhorias e Escalabilidade

## Contexto

O IDContent é um gerador de prompts estruturados para criação de conteúdo de Instagram (Carrossel e Post) com identidade visual de marca. A app é vanilla HTML/CSS/JS + Supabase. Estamos expandindo a plataforma em 5 fases: quick wins, migração estrutural crítica de presets, histórico de prompts, templates por nicho e novos formatos de plataforma.

**Constraint importante — logos e Claude:** Claude (claude.ai) não consegue acessar URLs externas. A abordagem atual (checkbox "logo ativa" + prompt `"Solicite o envio da logo ao usuário"`) é a correta e deve ser mantida. Não implementar upload/storage de logo.

---

## Status de Execução

- [ ] Fase 1 — Quick Wins
- [ ] Fase 2 — Migração Crítica de Presets (SQL primeiro)
- [ ] Fase 3 — Histórico de Prompts
- [ ] Fase 4 — Templates por Nicho
- [ ] Fase 5 — Novos Formatos de Plataforma

---

## Sequência de Execução Recomendada

1. **Rodar SQL da Fase 2** (colunas + tabela + migração de dados) — ANTES de qualquer código
2. **Fase 1** — mudanças cirúrgicas sem risco
3. **Fase 2 frontend** — atualizar `db.js` e `app.js` para usar nova estrutura de presets; testar criar/aplicar/deletar preset exaustivamente
4. **Fase 3** — histórico é aditivo, não altera nada existente
5. **Fase 4** — aditiva, pode ser feita a qualquer momento
6. **Fase 5** — as novas abas são aditivas, mas o refactor de `switchTab()` afeta abas existentes; testar bem

---

## Fase 1 — Quick Wins (baixo risco, sem mudança de schema crítico)

### 1.1 · Autosave: ajuste de timing
**Arquivo:** `js/ui.js:211`

O autosave já existe com debounce de 2s. Mudar para 3s e adicionar `setSaveStatus('saving')` imediatamente ao disparar:
```js
saveTimer = setTimeout(() => {
  if (app.currentBrandId) {
    setSaveStatus('saving');
    app.save();
  }
}, 3000);
```

### 1.2 · Busca e filtro na lista de marcas
**Arquivos:** `index.html` (seção `#screenList`), `js/app.js`, `js/db.js`, `css/style.css`

- Adicionar `<input id="brandSearch">` + `<select id="brandSort">` acima de `#brandGrid`
- Extrair a lógica de render de `loadBrandList()` para novo método `renderBrandGrid(brands)`
- Adicionar método `filterBrands()` que filtra `app.allBrands` (cache local) por nome/nicho e reordena
- `db.listBrands()` precisa incluir `niche` no select query
- **SQL:** nenhuma alteração de schema necessária (campo `niche` já existe em `brands`)

### 1.3 · Novos campos na aba Base
**Arquivos:** `index.html`, `js/app.js`, `js/prompts.js`

**SQL necessário:**
```sql
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS hashtags jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS competitors text,
  ADD COLUMN IF NOT EXISTS topics jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS post_frequency text;
```

Campos a adicionar:
- **Hashtags padrão** (chips — modelo idêntico a `personalityChips`) → seção b7
- **Concorrentes principais** (textarea) → seção b7
- **Temas/pautas recorrentes** (chips) → seção b6
- **Frequência de postagem** (select) → seção b6

Em `app.js`:
- Adicionar `hashtag: [], topic: []` a `chipData`
- Expandir `resetForm()`, `fillBrand()`, `collectBrand()` com os novos campos

Em `prompts.js → buildBase()`:
- Seção `## 06 · AUDIÊNCIA`: adicionar pautas e frequência
- Seção `## 07 · REFERÊNCIAS`: adicionar hashtags e concorrentes

### 1.4 · Progresso com peso por campo obrigatório
**Arquivo:** `js/ui.js:129` — função `updateProgress()`

Separar campos em `required` (peso 2) e `optional` (peso 1). Exibir no sidebar como "X obrig. preenchidos" em vez de "X campos".

---

## Fase 2 — Migração Crítica de Presets (risco médio — fazer com cuidado)

### O problema
Presets estão serializados dentro de `logo_url` (`brands.logo_url = JSON.stringify({ active, presets: [...] })`). Isso impede paginação, busca e operações independentes sobre presets.

### 2.1 · SQL: criar tabela `brand_presets` e adicionar `logo_active`

```sql
-- Nova coluna limpa para o boolean de logo
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_active boolean NOT NULL DEFAULT false;

-- Nova tabela de presets
CREATE TABLE IF NOT EXISTS brand_presets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('carousel', 'post')),
  colors     jsonb,
  fonts      jsonb,
  layout     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brand_presets_brand_id_idx ON brand_presets(brand_id);
ALTER TABLE brand_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_presets_user" ON brand_presets
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
```

### 2.2 · SQL: migrar dados existentes (executar ANTES do deploy do frontend)

```sql
-- Migrar logo_active a partir do JSON em logo_url
UPDATE brands SET logo_active = CASE
  WHEN logo_url IS NULL OR logo_url = '' OR logo_url = 'Nenhuma' THEN false
  WHEN logo_url LIKE '{%' THEN COALESCE((logo_url::jsonb->>'active')::boolean, false)
  ELSE true END;

-- Migrar presets do JSON para a nova tabela
DO $$ DECLARE rec RECORD; p jsonb;
BEGIN
  FOR rec IN SELECT id, user_id, logo_url FROM brands WHERE logo_url LIKE '{%'
  LOOP BEGIN
    IF jsonb_array_length(rec.logo_url::jsonb->'presets') > 0 THEN
      FOR p IN SELECT * FROM jsonb_array_elements(rec.logo_url::jsonb->'presets')
      LOOP
        INSERT INTO brand_presets(brand_id, user_id, name, type, colors, fonts, layout)
        VALUES(rec.id, rec.user_id, p->>'name', p->>'type', p->'colors', p->'fonts', p->'layout')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- Limpar logo_url (manter coluna para não quebrar schema, só zerar o conteúdo JSON)
UPDATE brands SET logo_url = NULL WHERE logo_url LIKE '{%';
```

### 2.3 · Atualizar `js/db.js`

- Adicionar seção `// BRAND PRESETS` com `listPresets(brandId)`, `savePreset(brandId, data)`, `deletePreset(presetId)`
- `savePreset` verifica duplicado por nome+tipo e faz update se existir, insert se não
- `loadFullBrand()` passa a buscar presets em paralelo: `Promise.all([getBrand, getCarouselConfig, getPostConfig, listPresets])`
- `getBrand()` usar `select=*` para pegar `logo_active`
- `saveAll()` não precisa mais serializar presets (eles têm save independente)

### 2.4 · Atualizar `js/app.js`

- **Estado:** substituir `app.logoData` por `app.presets: []` (array de objetos com `id` real do banco)
- **`fillBrand()`:** remover o bloco de parse de `logo_url` (linhas 193–211); usar simplesmente `bActive.checked = !!b.logo_active`
- **`collectBrand()`:** remover `logo_url: JSON.stringify(this.logoData)`; adicionar `logo_active: bActive.checked`
- **`savePreset()`:** virar async, chamar `db.savePreset()`, atualizar `app.presets` com o objeto retornado (que tem `id`)
- **`applyPreset(index)`:** usar `app.presets[index]` em vez de `app.logoData.presets[index]`
- **`deletePreset(index)`:** virar async, chamar `db.deletePreset(preset.id)`, depois `app.presets.splice(index, 1)`

### 2.5 · Atualizar `js/ui.js` — `renderPresets()`

Substituir referências a `app.logoData.presets` por `app.presets`.

---

## Fase 3 — Histórico de Prompts Gerados

### 3.1 · SQL

```sql
CREATE TABLE IF NOT EXISTS prompt_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('base', 'carousel', 'post')),
  prompt_text text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prompt_history_brand_created_idx ON prompt_history(brand_id, created_at DESC);
ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompt_history_user" ON prompt_history
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
```

### 3.2 · `js/db.js`

Adicionar `addHistory(brandId, type, promptText)` e `listHistory(brandId, limit=10)`.

### 3.3 · `js/ui.js` — funções de copy

`baseCopy()`, `carCopy()`, `postCopy()` (linhas 95–108) passam a chamar `db.addHistory(...)` após copiar com sucesso (erro silencioso — não bloquear o usuário).

### 3.4 · `index.html` + `js/ui.js`

- Adicionar `<div id="historyList">` ao final de cada `<aside class="preview-panel">`
- Função `renderHistoryList(items)` em `ui.js` que injeta os itens com badge de tipo e data
- `app.openBrand()` chama `app.loadHistory()` ao abrir uma marca
- Clicar em item do histórico copia o texto novamente para o clipboard

---

## Fase 4 — Templates por Nicho

### 4.1 · Novo arquivo `js/templates.js`

Objetos JS puros — sem dependências. Estrutura:
```js
const BRAND_TEMPLATES = {
  autoescola: {
    label: 'Autoescola / CFC', icon: '🚗',
    data: { niche, tone_main, tone_reader, style_visual, color_primary, ... personality: [], goals: [], topics: [] }
  },
  nutricionista: { ... },
  saas_b2b:      { ... },
  infoproduto:   { ... },
  moda:          { ... },
  consultoria:   { ... },
};
window.BRAND_TEMPLATES = BRAND_TEMPLATES;
```

Adicionar `<script src="js/templates.js"></script>` em `index.html` antes de `app.js`.

### 4.2 · `index.html` — modal de seleção de template

Substituir o botão "+ Nova marca" por um modal que lista os templates com card visual (ícone + nome). Botão "Começar do zero" no modal chama `app.newBrand()` original.

### 4.3 · `js/app.js`

- `showTemplateModal()` — renderiza cards a partir de `BRAND_TEMPLATES`
- `newBrandFromTemplate(key)` — cria a marca com `db.createBrand(tmpl.data)`, abre o editor e preenche chips separadamente (via `fillChips()`)

---

## Fase 5 — Novos Formatos de Plataforma (LinkedIn, Email, YouTube)

### 5.1 · Refatorar `switchTab()` para ser data-driven
**Arquivo:** `js/ui.js:158`

```js
const ALL_TABS = ['base', 'car', 'post', 'linkedin', 'email', 'youtube'];
function switchTab(tab) {
  ALL_TABS.forEach(t => {
    const panel = document.getElementById(`panel${t[0].toUpperCase() + t.slice(1)}`);
    const btn   = document.getElementById(`tab${t[0].toUpperCase() + t.slice(1)}`);
    if (panel) panel.classList.toggle('active', t === tab);
    if (btn)   btn.className = `tab-btn${t === tab ? ' active-' + t : ''}`;
  });
  app.currentTab = tab;
}
```

### 5.2 · Por nova plataforma (LinkedIn, Email, YouTube): padrão idêntico

Para cada uma:
1. **SQL:** `CREATE TABLE linkedin_configs (id, brand_id UNIQUE, ...campos específicos)`; com RLS
2. **`db.js`:** `getLinkedinConfig(brandId)`, `saveLinkedinConfig(brandId, data)` — mesmo padrão de `carousel_configs`
3. **`index.html`:** tab button + `#panelLinkedin` com seções de campos
4. **`app.js`:** `collectLinkedin()`, `fillLinkedin()`, expandir `save()` e `openBrand()`
5. **`prompts.js`:** `buildLinkedin()` — Base + campos específicos
6. **`css/style.css`:** variável `--acc-linkedin`, badge e nav styles

**LinkedIn:** tom formal, post texto, carrossel PDF, banner 1200×627px
**Email:** assunto, pre-header, estrutura de copy (hook/problema/solução/CTA), notas de HTML inline
**YouTube Thumbnail:** 1280×720px, headline max 5 palavras, rosto (sim/não), emoção, contraste

### 5.3 · `app.save()` e `db.saveAll()` — expandir para novos formatos

`saveAll()` aceita parâmetros opcionais e salva em `Promise.all()`.

---

## Verificação por Fase

- **Fase 1:** abrir marca existente → filtrar por nome → salvar → esperar 3s sem interagir → confirmar que salvou automaticamente
- **Fase 2:** abrir marca com presets → verificar que presets aparecem → criar novo → aplicar → deletar → confirmar na tabela `brand_presets` no Supabase
- **Fase 3:** copiar prompt → abrir histórico → confirmar registro na tabela `prompt_history`
- **Fase 4:** criar nova marca → selecionar template → confirmar pré-preenchimento de campos e chips
- **Fase 5:** alternar entre todas as 6 abas → confirmar que a aba ativa fica correta e o prompt gerado inclui os campos da nova plataforma
