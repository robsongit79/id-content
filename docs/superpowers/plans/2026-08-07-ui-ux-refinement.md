# Refinamento de UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar acessibilidade, consistência visual e usabilidade da interface do IDContent, dentro da linguagem visual escura/monoespaçada já existente, sem introduzir framework, build step ou nova paleta de cores.

**Architecture:** 18 tasks agrupadas em 5 lotes temáticos (spec: `docs/superpowers/specs/2026-08-07-ui-ux-refinement-design.md`). Cada task modifica `index.html`, `css/style.css` e/ou `js/ui.js`/`js/app.js` diretamente — sem novos arquivos, sem dependências externas.

**Tech Stack:** Vanilla HTML/CSS/JS, sem framework, sem build step, sem suíte de testes automatizada.

## Global Constraints

- Manter a linguagem visual escura/monoespaçada atual — nenhuma task troca cor de marca, fonte de sistema ou introduz um framework/build step.
- Verificação por task: `node -c <arquivo.js>` para todo `.js` alterado (sintaxe); teste manual no navegador (abrir `index.html` localmente) confirmando o critério de aceite específico da task. O projeto não tem suíte de testes automatizada — não introduzir uma.
- Todo texto de interface novo é em português do Brasil, no mesmo tom direto/técnico já usado no restante do app.
- Cada task termina com commit próprio.

---

## Task 1: Labels reais com `for`/`id` em todos os campos de formulário

**Files:**
- Modify: `index.html` (Base, Carrossel, Post, Login)
- Modify: `css/style.css` (nova classe `.sr-only`)

**Interfaces:**
- Consumes: nada (task inicial de acessibilidade).
- Produces: classe utilitária `.sr-only` reutilizável por qualquer task futura que precise de rótulo visualmente oculto.

- [ ] **Step 1: Adicionar `.sr-only` ao `css/style.css`**

Adicionar ao final do arquivo (após a seção `IMPERSONATION BANNER`):

```css
/* ══ ACESSIBILIDADE ══ */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
```

- [ ] **Step 2: Aplicar `for="<id>"` em todo `<label class="field-label">` que já precede um único campo de texto/select/textarea**

Regra mecânica: todo `<label class="field-label">TEXTO</label>` que é seguido, dentro do mesmo `.field`, por exatamente um `<input>`/`<textarea>`/`<select>`, ganha o atributo `for="<id do campo seguinte>"` — sem mudar mais nada no texto ou na estrutura. Não se aplica a: labels que envolvem (`wrap`) um checkbox diretamente (`bLogoActive`, `bIsShared`, `pUnifiedLayout` — já acessíveis por associação implícita), nem a labels de cabeçalho de grupo sem um único campo alvo (ex: "Estilo visual geral", "Posição — Slide capa", "Presets de Layout para Carrossel" — este último é tratado na Task 7).

Lista completa dos ids que recebem `for="<próprio id>"` no `<label class="field-label">` imediatamente anterior:

Base: `bName`, `bColorsNotes`, `bFontDisplay`, `bFontBody`, `bSizeTitle`, `bSizeSubtitle`, `bSizeBody`, `bWeightTitle`, `bItalicUse`, `bTypoNotes`, `bBorderUse`, `bCornerRadius`, `bBgRhythm`, `bGradientUse`, `bVisualSig`.

Carrossel: `cContent`, `cFormat`, `cSlideCount`, `cSequence`, `cFixedEl`, `cSlide1`, `cSlideCta`, `cNotes`, `cForbidden`, `cFinalNotes`.

Post: `pFreeText`, `pContentNotes`, `pUnifiedTextPos`, `pUnifiedBg`, `pUnifiedNotes`, `pL1TextPos`, `pL1Bg`, `pL1Notes`, `pL4TextPos`, `pL4Bg`, `pL4Notes`, `pL9TextPos`, `pL9Bg`, `pL9Notes`, `pFinalNotes`.

Exemplo do padrão de edição (idêntico para os 29 ids acima, trocando só o id e o texto do label):

```html
<!-- Antes -->
<div class="field"><label class="field-label">Nome da marca <span class="required">*</span></label><input type="text" id="bName" placeholder="Ex: CFC Produtivo" oninput="markDirty()"></div>
<!-- Depois -->
<div class="field"><label class="field-label" for="bName">Nome da marca <span class="required">*</span></label><input type="text" id="bName" placeholder="Ex: CFC Produtivo" oninput="markDirty()"></div>
```

- [ ] **Step 3: Converter os 6 rótulos da Paleta de Cores de `<div>` para `<label for>`**

Os 6 campos de cor usam `<div class="field-label">` solto (sem nenhuma associação, nem implícita nem explícita). Trocar `<div class="field-label">` por `<label class="field-label" for="<idHex>">` nos 6 campos (a associação vai para o input de texto hex, que é a fonte de verdade lida por `js/prompts.js`):

```html
<!-- Antes -->
<div class="field"><div class="field-label">Primária <span class="required">*</span></div><div class="palette-swatch-row"><input type="color" id="cPrimary" value="#1E40AF" oninput="document.getElementById('cPrimaryHex').value=this.value;markDirty()"><input type="text" id="cPrimaryHex" value="#1E40AF" oninput="syncColor('cPrimary','cPrimaryHex')" style="flex:1;"></div></div>
<!-- Depois -->
<div class="field"><label class="field-label" for="cPrimaryHex">Primária <span class="required">*</span></label><div class="palette-swatch-row"><input type="color" id="cPrimary" value="#1E40AF" oninput="document.getElementById('cPrimaryHex').value=this.value;markDirty()"><input type="text" id="cPrimaryHex" value="#1E40AF" oninput="syncColor('cPrimary','cPrimaryHex')" style="flex:1;"></div></div>
```

Repetir a mesma troca (`<div class="field-label">` → `<label class="field-label" for="<idHex>">...</label>`, fechando com `</label>` no lugar de `</div>`) para: `Secundária` → `for="cSecondaryHex"`, `Acento` → `for="cAccentHex"`, `Fundo escuro` → `for="cDarkHex"`, `Fundo claro` → `for="cLightHex"`, `Texto` → `for="cTextHex"`.

- [ ] **Step 4: Adicionar labels visualmente ocultos no formulário de login**

`loginEmail`/`loginPassword` não têm nenhum `<label>`, só `placeholder`. Editar em `index.html`:

```html
<!-- Antes -->
<input type="email" id="loginEmail" placeholder="E-mail" required autocomplete="username">
<input type="password" id="loginPassword" placeholder="Senha" required autocomplete="current-password">
<!-- Depois -->
<label class="sr-only" for="loginEmail">E-mail</label>
<input type="email" id="loginEmail" placeholder="E-mail" required autocomplete="username">
<label class="sr-only" for="loginPassword">Senha</label>
<input type="password" id="loginPassword" placeholder="Senha" required autocomplete="current-password">
```

- [ ] **Step 5: Verificar**

Abrir `index.html` no navegador. Clicar em cada texto de rótulo listado no Step 2 (ex: clicar no texto "Nome da marca") deve focar o campo correspondente. Inspecionar um dos 6 campos de cor e confirmar que agora é `<label for="cPrimaryHex">` (não mais `<div>`). Sem erros no console.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css
git commit -m "feat(a11y): associa labels reais a todos os campos do formulário"
```

---

## Task 2: `.logo-pos-item` e `.type-card` — de `<div>` para `<label>`

**Files:**
- Modify: `index.html` (grids de posição de logo em Carrossel/Post, grid de tipo de post)

**Interfaces:**
- Consumes: nada.
- Produces: nenhuma função nova — só troca de tag, sem quebrar `onclick`/CSS existentes (seletores `.logo-pos-item`/`.type-card` continuam válidos em qualquer tag).

- [ ] **Step 1: Trocar `<div class="logo-pos-item" ...>` por `<label class="logo-pos-item" ...>` nos 3 grids**

São 20 ocorrências no total (6 em `carLogoPosHeroGrid`, 6 em `carLogoPosCtaGrid`, 8 em `postLogoPosGrid`). A troca é sempre a mesma: `<div class="logo-pos-item"` → `<label class="logo-pos-item"`, e o `</div>` de fechamento correspondente → `</label>`. Exemplo (repetir o padrão nas 20 ocorrências, mantendo `onclick`, `name`, `value` e texto exatamente como estão):

```html
<!-- Antes -->
<div class="logo-pos-item" onclick="selectRadio(this,'carLogoPosHeroGrid');markDirty()"><input type="radio" name="carLogoPosHero" value="topo esquerdo">↖ Topo esq.</div>
<!-- Depois -->
<label class="logo-pos-item" onclick="selectRadio(this,'carLogoPosHeroGrid');markDirty()"><input type="radio" name="carLogoPosHero" value="topo esquerdo">↖ Topo esq.</label>
```

- [ ] **Step 2: Trocar `<div class="type-card" ...>` por `<label class="type-card" ...>` nos 13 cards de Tipo de Post**

Mesma troca de tag, mesmo padrão, nas 13 ocorrências dentro de `#p2` (de `frase-impacto` a `mini-artigo`). Exemplo:

```html
<!-- Antes -->
<div class="type-card" onclick="selectPostType(this,'frase-impacto')"><input type="radio" name="pType" value="frase-impacto">...</div>
<!-- Depois -->
<label class="type-card" onclick="selectPostType(this,'frase-impacto')"><input type="radio" name="pType" value="frase-impacto">...</label>
```

- [ ] **Step 3: Verificar**

Abrir `index.html`, ir em Identidade → Estrutura Visual (Estilo visual já era `<label>`, serve de referência), Carrossel → Posicionamento da Logo, Post → Posicionamento da Logo e Tipo de Post. Clicar no texto/ícone de qualquer opção (não só no centro do input) deve continuar selecionando a opção normalmente — o comportamento visual não muda, só a semântica HTML.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(a11y): associa logo-pos-item e type-card como labels reais dos radios"
```

---

## Task 3: `.format-card` — `role="checkbox"`, `aria-checked` e ativação por teclado

**Files:**
- Modify: `index.html` (3 cards de formato do Post)
- Modify: `js/ui.js` (`togglePostFmt`, novo helper `activateOnKey`)

**Interfaces:**
- Consumes: nada.
- Produces: `activateOnKey(event, fn)` — helper genérico em `js/ui.js`, reutilizável por qualquer elemento futuro que precise de ativação por Enter/Espaço.

- [ ] **Step 1: Adicionar `activateOnKey` em `js/ui.js`**

Adicionar próximo a `selectRadio` (topo do arquivo):

```javascript
function activateOnKey(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
}
```

- [ ] **Step 2: Atualizar `togglePostFmt` para manter `aria-checked` sincronizado**

Em `js/ui.js`, substituir:

```javascript
function togglePostFmt(fmt) {
  const card = document.getElementById(`pFmt${fmt}`);
  if (app.postFmts.has(fmt)) { app.postFmts.delete(fmt); card.classList.remove('checked'); }
  else { app.postFmts.add(fmt); card.classList.add('checked'); }
```

por:

```javascript
function togglePostFmt(fmt) {
  const card = document.getElementById(`pFmt${fmt}`);
  if (app.postFmts.has(fmt)) { app.postFmts.delete(fmt); card.classList.remove('checked'); card.setAttribute('aria-checked', 'false'); }
  else { app.postFmts.add(fmt); card.classList.add('checked'); card.setAttribute('aria-checked', 'true'); }
```

(o restante da função não muda).

- [ ] **Step 3: Adicionar atributos de acessibilidade aos 3 `.format-card` em `index.html`**

```html
<!-- Antes -->
<div class="format-card post-fmt" id="pFmt1x1" onclick="togglePostFmt('1x1')"><div class="format-visual format-sq"></div><div><div class="format-label">Feed Quadrado</div><div class="format-ratio">1080×1080 · 1:1</div></div><div class="format-check" id="pCheck1x1">✓</div></div>
<!-- Depois -->
<div class="format-card post-fmt" id="pFmt1x1" role="checkbox" aria-checked="false" tabindex="0" onclick="togglePostFmt('1x1')" onkeydown="activateOnKey(event, () => togglePostFmt('1x1'))"><div class="format-visual format-sq"></div><div><div class="format-label">Feed Quadrado</div><div class="format-ratio">1080×1080 · 1:1</div></div><div class="format-check" id="pCheck1x1">✓</div></div>
```

Repetir para `pFmt4x5` (`togglePostFmt('4x5')`) e `pFmt9x16` (`togglePostFmt('9x16')`), com o mesmo padrão de `role`, `aria-checked="false"`, `tabindex="0"` e `onkeydown`.

- [ ] **Step 4: Verificar**

`node -c js/ui.js` deve passar. No navegador, ir em Post → Formatos, navegar até os cards com Tab, confirmar que dá pra alternar cada formato com Enter e com Espaço, e que o estado visual (`.checked`) e o `aria-checked` (inspecionar no DevTools) ficam sincronizados com o clique do mouse.

- [ ] **Step 5: Commit**

```bash
git add index.html js/ui.js
git commit -m "feat(a11y): torna format-card operável e anunciável via teclado"
```

---

## Task 4: Foco de teclado visível nos seletores customizados

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: as tags `<label>` produzidas nas Tasks 2 (`.logo-pos-item`, `.type-card`) e a estrutura de `.radio-item` (já era `<label>`) e `.format-card` (Task 3, foco direto via `tabindex`).
- Produces: nada consumido por tasks futuras.

- [ ] **Step 1: Adicionar anel de foco visível**

Adicionar em `css/style.css`, logo após a regra `.post-radio .radio-item.selected...` (linha do bloco `RADIO`):

```css
.radio-item:has(input:focus-visible),
.logo-pos-item:has(input:focus-visible),
.type-card:has(input:focus-visible){
  outline:2px solid var(--accent2);
  outline-offset:2px;
}
.format-card:focus-visible{
  outline:2px solid var(--accent2);
  outline-offset:2px;
}
```

- [ ] **Step 2: Verificar**

No navegador, navegar por Tab através de Estilo Visual (Base), Posição de Logo (Carrossel e Post), Tipo de Post e Formatos (Post). Em cada uma, a opção com foco deve ter um contorno teal visível, diferenciável da opção `.selected`/`.checked`.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(a11y): adiciona foco de teclado visível aos seletores customizados"
```

---

## Task 5: Tooltips de campo reagem também ao foco de teclado

**Files:**
- Modify: `css/style.css`
- Modify: `js/ui.js` (`initTooltips`)

**Interfaces:**
- Consumes: `FIELD_TIPS`, `initTooltips()` (já existentes em `js/ui.js`).
- Produces: nada.

- [ ] **Step 1: Tornar o ícone `.field-tip` focável em `initTooltips()`**

Em `js/ui.js`, dentro de `initTooltips()`, adicionar `tabindex="0"` ao ícone criado:

```javascript
// Antes
const icon = document.createElement('span');
icon.className = 'field-tip';
icon.setAttribute('data-tip', tip);
icon.textContent = '?';
label.appendChild(icon);

// Depois
const icon = document.createElement('span');
icon.className = 'field-tip';
icon.setAttribute('data-tip', tip);
icon.setAttribute('tabindex', '0');
icon.setAttribute('role', 'button');
icon.setAttribute('aria-label', tip);
icon.textContent = '?';
label.appendChild(icon);
```

- [ ] **Step 2: Adicionar estado `:focus-visible` ao CSS do tooltip**

Em `css/style.css`, na regra existente do `.field-tip`:

```css
/* Antes */
.field-tip:hover::after,.field-tip:hover::before{opacity:1;}
/* Depois */
.field-tip:hover::after,.field-tip:hover::before,.field-tip:focus-visible::after,.field-tip:focus-visible::before{opacity:1;}
```

- [ ] **Step 3: Verificar**

`node -c js/ui.js` deve passar. No navegador, dar Tab até um ícone "?" de qualquer campo com tooltip (ex: "Nº de slides padrão" no Carrossel) — a dica deve aparecer sem precisar do mouse, e sumir ao sair do foco.

- [ ] **Step 4: Commit**

```bash
git add css/style.css js/ui.js
git commit -m "feat(a11y): tooltips de campo passam a reagir também ao foco de teclado"
```

---

## Task 6: Modais fecham com Esc e devolvem o foco

**Files:**
- Modify: `js/ui.js` (novos helpers `openModal`/`closeModal`/`initModalEscapeHandling`)
- Modify: `js/app.js` (`showTemplateModal`/`closeTemplateModal` passam a usar os helpers)

**Interfaces:**
- Consumes: `#templateModal` (existente).
- Produces: `openModal(id)`, `closeModal(id)` — helpers genéricos de abrir/fechar modal com memória de foco, reutilizados pela Task 18 (modal de exclusão de marca). `MODAL_CLOSE_FNS` — mapa de id→função de fechamento consultado por `initModalEscapeHandling()`, estendido pela Task 18.

- [ ] **Step 1: Adicionar helpers de modal em `js/ui.js`**

Adicionar no final do arquivo:

```javascript
// ── MODAL HELPERS (foco + Esc) ──
let _modalTriggerEl = null;

function openModal(id) {
  _modalTriggerEl = document.activeElement;
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (_modalTriggerEl && typeof _modalTriggerEl.focus === 'function') _modalTriggerEl.focus();
  _modalTriggerEl = null;
}

const MODAL_CLOSE_FNS = {
  templateModal: () => app.closeTemplateModal(),
};

function initModalEscapeHandling() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const [id, closeFn] of Object.entries(MODAL_CLOSE_FNS)) {
      const el = document.getElementById(id);
      if (el && el.style.display === 'flex') { closeFn(); return; }
    }
  });
}
```

- [ ] **Step 2: Fazer `showTemplateModal`/`closeTemplateModal` usar os helpers**

Em `js/app.js`:

```javascript
// Antes
showTemplateModal() {
  document.getElementById('templateModal').style.display = 'flex';
},

closeTemplateModal() {
  document.getElementById('templateModal').style.display = 'none';
},

// Depois
showTemplateModal() {
  openModal('templateModal');
},

closeTemplateModal() {
  closeModal('templateModal');
},
```

- [ ] **Step 3: Chamar `initModalEscapeHandling()` na inicialização**

Em `js/app.js`, dentro de `init()` (perto de `initScrollNav()`/`initTooltips()`):

```javascript
// Antes
initScrollNav();
initTooltips();

// Depois
initScrollNav();
initTooltips();
initModalEscapeHandling();
```

- [ ] **Step 4: Verificar**

`node -c js/ui.js` e `node -c js/app.js` devem passar. No navegador, abrir o modal "Nova Marca" (botão "+ Nova marca") e apertar Esc — o modal deve fechar e o foco deve voltar ao botão que o abriu (visível pelo contorno de foco do navegador).

- [ ] **Step 5: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "feat(a11y): modais fecham com Esc e devolvem o foco ao elemento de origem"
```

---

## Task 7: Subtítulo de subgrupo para cabeçalhos de preset

**Files:**
- Modify: `css/style.css`
- Modify: `index.html` (cabeçalhos "Presets de Layout" do Carrossel e do Post)

**Interfaces:**
- Consumes: nada.
- Produces: classe `.subsection-title`, reutilizável por qualquer cabeçalho de subgrupo futuro.

- [ ] **Step 1: Adicionar `.subsection-title` ao CSS**

Adicionar em `css/style.css`, logo após a regra `.section-desc` (bloco `SECTIONS`):

```css
.subsection-title{font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--text);letter-spacing:0.2px;}
```

- [ ] **Step 2: Trocar o `<label class="field-label">` dos cabeçalhos de preset por `<div class="subsection-title">`**

Esses dois cabeçalhos não são, de fato, rótulo de um campo único (por isso não entraram na Task 1) — são título de subseção. Em `index.html`:

```html
<!-- Antes (Carrossel) -->
<label class="field-label">Presets de Layout para Carrossel</label>
<!-- Depois -->
<div class="subsection-title">Presets de Layout para Carrossel</div>
```

```html
<!-- Antes (Post) -->
<label class="field-label">Presets de Layout para Post</label>
<!-- Depois -->
<div class="subsection-title">Presets de Layout para Post</div>
```

- [ ] **Step 3: Verificar**

Abrir Carrossel e Post no navegador — o cabeçalho "Presets de Layout para..." deve aparecer visualmente maior/mais forte que um rótulo de campo comum, mas menor que um título de seção.

- [ ] **Step 4: Commit**

```bash
git add css/style.css index.html
git commit -m "feat(ui): adiciona nível tipográfico intermediário para cabeçalhos de subseção"
```

---

## Task 8: Cor do rótulo em foco passa a respeitar a cor da seção

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `.base-focus`/`.car-focus`/`.post-focus` (wrappers já existentes em `index.html`, ver spec).
- Produces: nada.

- [ ] **Step 1: Escopar a regra de cor do label em foco por seção**

Em `css/style.css`, substituir a regra genérica:

```css
/* Antes */
.field:has(input:focus,textarea:focus,select:focus) .field-label{color:var(--accent2);transition:color 0.2s ease;}
```

por três regras escopadas, uma por seção:

```css
/* Depois */
.base-focus .field:has(input:focus,textarea:focus,select:focus) .field-label{color:var(--acc-base);transition:color 0.2s ease;}
.car-focus .field:has(input:focus,textarea:focus,select:focus) .field-label{color:var(--acc-car);transition:color 0.2s ease;}
.post-focus .field:has(input:focus,textarea:focus,select:focus) .field-label{color:var(--acc-post);transition:color 0.2s ease;}
```

- [ ] **Step 2: Verificar**

No navegador: focar um campo de texto na Identidade da marca → o rótulo deve ficar roxo (`--acc-base`). Focar um campo no Carrossel → rótulo amarelo-limão (`--acc-car`). Focar um campo no Post → rótulo laranja (`--acc-post`). Nenhum deles deve mais ficar teal.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "fix(ui): cor do rótulo em foco passa a seguir a cor da seção atual"
```

---

## Task 9: Contraste AA em `--muted` e no placeholder

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: nada.
- Produces: nada (`--muted` é consumido por dezenas de seletores já existentes — a mudança é só no valor do token).

- [ ] **Step 1: Subir `--muted` para um valor com contraste AA contra `--bg`**

Em `css/style.css`, no bloco `:root`:

```css
/* Antes */
--text:#F0F0F0; --muted:#666; --label:#999; --red:#FF5C5C; --accent2:#47FFD4;
/* Depois */
--text:#F0F0F0; --muted:#9A9A9A; --label:#999; --red:#FF5C5C; --accent2:#47FFD4;
```

(`#9A9A9A` sobre `#0E0E0E` ≈ 7:1 de contraste — acima do mínimo AA de 4.5:1 para texto pequeno; `#666` ficava em ~3.4:1.)

- [ ] **Step 2: Subir o contraste do placeholder**

Em `css/style.css`:

```css
/* Antes */
input::placeholder,textarea::placeholder{color:#4a4a4a !important;opacity:1 !important;}
input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:#4a4a4a !important;opacity:1 !important;}
input::-moz-placeholder,textarea::-moz-placeholder{color:#4a4a4a !important;opacity:1 !important;}
/* Depois */
input::placeholder,textarea::placeholder{color:#8A8A8A !important;opacity:1 !important;}
input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:#8A8A8A !important;opacity:1 !important;}
input::-moz-placeholder,textarea::-moz-placeholder{color:#8A8A8A !important;opacity:1 !important;}
```

- [ ] **Step 2: Verificar**

Abrir o Carrossel e olhar os placeholders de "Sequência de slides"/"Slide hero — estrutura" (os mais longos e ricos em exemplo) — devem estar claramente legíveis contra o fundo do campo (`--surface:#161616`). Textos de `.field-hint`/`.section-desc` também devem ficar visivelmente mais legíveis.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "fix(a11y): aumenta contraste de --muted e do placeholder para nível AA"
```

---

## Task 10: Divisores e espaçamento intermediário entre subgrupos densos

**Files:**
- Modify: `css/style.css`
- Modify: `index.html` (seções `#b3` Tipografia e `#b5` Estrutura Visual)

**Interfaces:**
- Consumes: classe `.divider` (já existente).
- Produces: nada.

- [ ] **Step 1: Ajustar o espaçamento do `.divider` para um nível intermediário**

Em `css/style.css`:

```css
/* Antes */
.divider{height:1px;background:var(--border);margin:22px 0;}
/* Depois */
.divider{height:1px;background:var(--border);margin:28px 0;}
```

(28px fica entre o gap de campo dentro de um grupo — 14px — e a margem entre seções inteiras — 64px.)

- [ ] **Step 2: Adicionar divisores em `#b3` (Tipografia)**

Em `index.html`, dentro da seção `id="b3"`, inserir `<div class="divider"></div>` entre o bloco de tamanhos (`cols-3`) e o bloco de peso/itálico (`cols-2`):

```html
<!-- Antes -->
        <div class="field-group cols-3">
          <div class="field"><label class="field-label" for="bSizeTitle">Tamanho — Título</label><input type="text" id="bSizeTitle" placeholder="28–36px" oninput="markDirty()"></div>
          <div class="field"><label class="field-label" for="bSizeSubtitle">Tamanho — Subtítulo</label><input type="text" id="bSizeSubtitle" placeholder="16–20px" oninput="markDirty()"></div>
          <div class="field"><label class="field-label" for="bSizeBody">Tamanho — Corpo</label><input type="text" id="bSizeBody" placeholder="13–15px" oninput="markDirty()"></div>
        </div>
        <div class="field-group cols-2">
<!-- Depois -->
        <div class="field-group cols-3">
          <div class="field"><label class="field-label" for="bSizeTitle">Tamanho — Título</label><input type="text" id="bSizeTitle" placeholder="28–36px" oninput="markDirty()"></div>
          <div class="field"><label class="field-label" for="bSizeSubtitle">Tamanho — Subtítulo</label><input type="text" id="bSizeSubtitle" placeholder="16–20px" oninput="markDirty()"></div>
          <div class="field"><label class="field-label" for="bSizeBody">Tamanho — Corpo</label><input type="text" id="bSizeBody" placeholder="13–15px" oninput="markDirty()"></div>
        </div>
        <div class="divider"></div>
        <div class="field-group cols-2">
```

(nota: o exemplo acima já reflete os `for=` adicionados na Task 1 — se esta task for executada antes da Task 1 em uma reordenação, aplicar a mesma inserção do `<div class="divider"></div>` sobre o HTML equivalente sem os `for=`.)

- [ ] **Step 3: Adicionar divisores em `#b5` (Estrutura Visual)**

Em `index.html`, dentro da seção `id="b5"`, inserir `<div class="divider"></div>` entre o grupo "Estilo visual geral" e o grupo "Bordas/Cantos", e entre o grupo "Ritmo de fundo/Gradientes" e o campo "Assinatura visual":

```html
<!-- Antes -->
        <div class="field-group"><div class="field"><label class="field-label">Estilo visual geral</label><div class="radio-grid base-radio" id="styleGrid">...</div></div></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label" for="bBorderUse">Bordas</label>...
<!-- Depois -->
        <div class="field-group"><div class="field"><label class="field-label">Estilo visual geral</label><div class="radio-grid base-radio" id="styleGrid">...</div></div></div>
        <div class="divider"></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label" for="bBorderUse">Bordas</label>...
```

```html
<!-- Antes -->
          <div class="field"><label class="field-label" for="bGradientUse">Gradientes</label>...</div>
        </div>
        <div class="field-group"><div class="field"><label class="field-label" for="bVisualSig">Assinatura visual</label>...
<!-- Depois -->
          <div class="field"><label class="field-label" for="bGradientUse">Gradientes</label>...</div>
        </div>
        <div class="divider"></div>
        <div class="field-group"><div class="field"><label class="field-label" for="bVisualSig">Assinatura visual</label>...
```

- [ ] **Step 4: Verificar**

Abrir Identidade da marca → Tipografia e → Estrutura Visual. Cada subgrupo conceitual (fontes/tamanhos/peso/notas; estilo/bordas/fundo/assinatura) deve ter separação visual clara, sem que a seção inteira pareça um bloco único.

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html
git commit -m "feat(ui): adiciona divisores e espaçamento intermediário entre subgrupos densos"
```

---

## Task 11: Painel de preview usa os tokens de cor do sistema

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `--label`, `--text` (tokens já existentes).
- Produces: nada.

- [ ] **Step 1: Remover a cor hardcoded do `.output-box .val`**

Em `css/style.css`:

```css
/* Antes */
.output-box .key{color:var(--accent2);}.output-box .val{color:#B0C4F8;}
/* Depois */
.output-box .key{color:var(--accent2);}.output-box .val{color:var(--label);}
```

- [ ] **Step 2: Verificar**

Preencher qualquer campo em Identidade/Carrossel/Post e observar o painel de preview lateral — os valores (`.val`) devem usar o cinza claro `--label` já usado no resto do sistema, sem nenhum azul fora da paleta.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "fix(ui): remove cor hardcoded do painel de preview, alinhando aos tokens do sistema"
```

---

## Task 12: Asteriscos de obrigatório sincronizados com `updateProgress()` no Carrossel

**Files:**
- Modify: `index.html` (`#c2`)

**Interfaces:**
- Consumes: lógica de `cReq` em `js/ui.js` `updateProgress()` (já existente, não modificada por esta task).
- Produces: nada.

- [ ] **Step 1: Adicionar `<span class="required">*</span>` aos 3 campos já tratados como obrigatórios**

`js/ui.js` já trata `cFormat`, `cSlideCount` e `cSequence` como obrigatórios (`cReq`) para calcular a barra "X/3 obrig." do Carrossel — só falta o indicador visual. Em `index.html`, dentro de `#c2`:

```html
<!-- Antes -->
<div class="field"><label class="field-label" for="cFormat">Formato padrão</label><select id="cFormat" oninput="markDirty()">...
<div class="field"><label class="field-label" for="cSlideCount">Nº de slides padrão</label><input type="text" id="cSlideCount" ...>
<div class="field-group"><div class="field"><label class="field-label" for="cSequence">Sequência de slides</label><textarea id="cSequence" ...>
<!-- Depois -->
<div class="field"><label class="field-label" for="cFormat">Formato padrão <span class="required">*</span></label><select id="cFormat" oninput="markDirty()">...
<div class="field"><label class="field-label" for="cSlideCount">Nº de slides padrão <span class="required">*</span></label><input type="text" id="cSlideCount" ...>
<div class="field-group"><div class="field"><label class="field-label" for="cSequence">Sequência de slides <span class="required">*</span></label><textarea id="cSequence" ...>
```

(se a Task 1 ainda não tiver sido executada, aplicar sobre o `<label class="field-label">` sem `for=`, mesma lógica.)

- [ ] **Step 2: Verificar**

Abrir Carrossel → Estrutura do Carrossel — os 3 campos devem mostrar o asterisco vermelho, consistente com o que a barra de progresso já contava internamente.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix(ui): sincroniza asteriscos de obrigatório do Carrossel com a lógica real de progresso"
```

---

## Task 13: Diferenciação visual da seção obrigatória no Post

**Files:**
- Modify: `index.html` (nav lateral do Post)
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `app.postType` / lógica de `pReqFilled` em `updateProgress()` (não modificada por esta task — só a apresentação visual estática da navegação).
- Produces: classe `.nav-optional`.

- [ ] **Step 1: Adicionar `.nav-optional` ao CSS**

Em `css/style.css`, após a regra `.post-nav .nav-item.active .nav-dot`:

```css
.nav-item{justify-content:space-between;}
.nav-optional{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
```

- [ ] **Step 2: Marcar as 5 seções opcionais e destacar a obrigatória na nav do Post**

Em `index.html`, dentro da nav do Post:

```html
<!-- Antes -->
<a href="#p1" class="nav-item active" data-post="p1"><span class="nav-dot"></span> 01 · Logo</a>
<a href="#p2" class="nav-item" data-post="p2"><span class="nav-dot"></span> 02 · Tipo de Post</a>
<a href="#p6" class="nav-item" data-post="p6"><span class="nav-dot"></span> 03 · Conteúdo</a>
<a href="#p3" class="nav-item" data-post="p3"><span class="nav-dot"></span> 04 · Formatos</a>
<a href="#p4" class="nav-item" data-post="p4"><span class="nav-dot"></span> 05 · Layout</a>
<a href="#p5" class="nav-item" data-post="p5"><span class="nav-dot"></span> 06 · Entrega</a>
<!-- Depois -->
<a href="#p1" class="nav-item active" data-post="p1"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 01 · Logo</span><span class="nav-optional">opcional</span></a>
<a href="#p2" class="nav-item" data-post="p2"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 02 · Tipo de Post</span><span class="required">*</span></a>
<a href="#p6" class="nav-item" data-post="p6"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 03 · Conteúdo</span><span class="nav-optional">opcional</span></a>
<a href="#p3" class="nav-item" data-post="p3"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 04 · Formatos</span><span class="nav-optional">opcional</span></a>
<a href="#p4" class="nav-item" data-post="p4"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 05 · Layout</span><span class="nav-optional">opcional</span></a>
<a href="#p5" class="nav-item" data-post="p5"><span style="display:flex;align-items:center;gap:8px;"><span class="nav-dot"></span> 06 · Entrega</span><span class="nav-optional">opcional</span></a>
```

- [ ] **Step 3: Verificar**

Abrir Post — a navegação lateral deve mostrar "opcional" em cinza nas 5 seções não-obrigatórias, e um asterisco vermelho ao lado de "02 · Tipo de Post", sem quebrar o realce da seção ativa (`.nav-item.active`) nem o scroll-spy já existente (`initScrollNav`).

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat(ui): diferencia visualmente a única seção obrigatória do Post das opcionais"
```

---

## Task 14: Responsividade da grade principal de 3 colunas

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `.layout` (grid existente, 210px sidebar / 1fr formulário / 310px preview).
- Produces: nada.

- [ ] **Step 1: Adicionar breakpoints para `.layout`**

Em `css/style.css`, dentro do bloco `@media (max-width: 1180px)` já existente, adicionar:

```css
.layout {
  grid-template-columns: 180px 1fr 260px;
}
```

E criar um novo bloco (após o `@media (max-width: 920px)` que já mexe em `.app-shell`):

```css
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .layout .sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .layout .preview-panel {
    position: static;
    height: auto;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
```

- [ ] **Step 2: Verificar**

No navegador, usar o modo de dispositivo (DevTools) e reduzir a largura para 700px em Identidade, Carrossel e Post — as 3 colunas devem empilhar verticalmente (sidebar de seções → formulário → preview), sem scroll horizontal nem sobreposição de conteúdo.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(responsive): adiciona breakpoints para a grade de 3 colunas do formulário"
```

---

## Task 15: Responsividade dos grids de cards

**Files:**
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `.field-group.cols-2`, `.field-group.cols-3`, `.palette-grid`, `.type-grid`, `.logo-pos-grid`, `.format-row` (grids existentes).
- Produces: nada.

- [ ] **Step 1: Adicionar breakpoint para os grids de campos e cards**

No mesmo bloco `@media (max-width: 760px)` criado na Task 14, adicionar:

```css
  .field-group.cols-2,
  .field-group.cols-3,
  .palette-grid,
  .type-grid {
    grid-template-columns: 1fr;
  }
  .logo-pos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .format-row {
    flex-direction: column;
  }
```

(`.logo-pos-grid` vira 2 colunas em vez de 1 para não ficar excessivamente longo com 6-8 opções; os demais empilham em coluna única.)

- [ ] **Step 2: Verificar**

Com a largura ainda em ~700px (DevTools), conferir Paleta de Cores, Tipo de Post, posições de logo e Formatos do Post — nenhum card deve ficar cortado, ilegível ou menor que o conteúdo dentro dele.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(responsive): adiciona breakpoints para os grids de campos e cards"
```

---

## Task 16: Remover o modal "Montar prompt" órfão

**Files:**
- Delete: `js/claude-generate.js`
- Modify: `index.html` (remove `#claudeModal` e o `<script>` correspondente)

**Interfaces:**
- Consumes: nada.
- Produces: nada. Nenhuma outra task depende de `claudeGenerate`/`#claudeModal`.

- [ ] **Step 1: Confirmar que não há nenhum outro ponto de acesso**

```bash
grep -rn "claudeGenerate\." index.html js/*.js
```

Esperado: nenhuma ocorrência fora do próprio `js/claude-generate.js` e do bloco `#claudeModal` que será removido no próximo passo (a função de copiar prompt já é coberta por `baseCopy()`/`carCopy()`/`postCopy()`, usadas nos painéis de Base/Carrossel/Post).

- [ ] **Step 2: Remover o bloco `#claudeModal` de `index.html`**

Remover inteiramente o bloco (da linha `<!-- ══ CLAUDE GENERATE MODAL ══ -->` até o `</div>` de fechamento do `modal-overlay`, imediatamente antes de `<!-- ══ TEMPLATE MODAL ══ -->`):

```html
<!-- Remover este bloco inteiro -->
<div id="claudeModal" class="modal-overlay" style="display:none;" onclick="if(event.target===this)claudeGenerate.close()">
  ...
</div>
```

- [ ] **Step 3: Remover a tag `<script>` de `claude-generate.js`**

```html
<!-- Antes -->
<script src="js/templates.js"></script>
<script src="js/claude-generate.js"></script>
<script src="js/app.js"></script>
<!-- Depois -->
<script src="js/templates.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 4: Deletar o arquivo `js/claude-generate.js`**

```bash
git rm js/claude-generate.js
```

- [ ] **Step 5: Verificar**

Abrir `index.html` no navegador, checar o console: nenhum erro de referência a `claudeGenerate`. Testar `baseCopy()`/`carCopy()`/`postCopy()` (botões "Copiar prompt" de cada painel) — continuam funcionando normalmente.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "chore: remove modal órfão de montagem de prompt (claude-generate.js)"
```

---

## Task 17: Modal de confirmação customizado para exclusão de marca

**Files:**
- Modify: `index.html` (novo `#deleteBrandModal`)
- Modify: `js/app.js` (`confirmDelete`, `deleteBrandById` passam a abrir o modal)
- Modify: `css/style.css` (texto de detalhe do modal)

**Interfaces:**
- Consumes: `openModal(id)`/`closeModal(id)` (Task 6), `MODAL_CLOSE_FNS` (Task 6, estendido aqui), `db.deleteBrand(id)` (já existente).
- Produces: `openDeleteBrandModal(id, name, presetCount)` — função global chamada pelos dois pontos de exclusão de marca.

- [ ] **Step 1: Adicionar o markup do modal em `index.html`**

Adicionar logo após o bloco `<!-- ══ TEMPLATE MODAL ══ -->` (que permanece intacto):

```html
<!-- ══ DELETE BRAND MODAL ══ -->
<div id="deleteBrandModal" class="modal-overlay" style="display:none;" onclick="if(event.target===this)closeDeleteBrandModal()">
  <div class="modal-card" style="max-width: 440px;">
    <div class="modal-header">
      <div class="modal-title">Excluir marca</div>
      <div class="modal-subtitle">Confirme que deseja excluir <strong id="deleteBrandName"></strong>.</div>
    </div>
    <div style="padding: 0 28px 24px; font-size: 12px; color: var(--red); line-height: 1.6;" id="deleteBrandDetail"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeDeleteBrandModal()">Cancelar</button>
      <button class="btn btn-danger" style="background:rgba(255,92,92,0.12);" onclick="confirmDeleteBrandModal()">Excluir permanentemente</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Adicionar a lógica do modal em `js/app.js`**

Adicionar como funções de nível de módulo (fora do objeto `app`, no mesmo padrão de `savePreset`/`deletePreset` já existentes no final do arquivo):

```javascript
let _pendingDeleteBrand = null;

function openDeleteBrandModal(id, name, presetCount) {
  _pendingDeleteBrand = { id, name };
  document.getElementById('deleteBrandName').textContent = name;
  document.getElementById('deleteBrandDetail').textContent = presetCount != null
    ? `Isso apaga permanentemente a identidade de marca, a configuração de Carrossel e Post, e ${presetCount} preset(s) salvo(s). Esta ação não pode ser desfeita.`
    : `Isso apaga permanentemente a identidade de marca, a configuração de Carrossel e Post, e todos os presets salvos desta marca. Esta ação não pode ser desfeita.`;
  openModal('deleteBrandModal');
}

function closeDeleteBrandModal() {
  closeModal('deleteBrandModal');
  _pendingDeleteBrand = null;
}

async function confirmDeleteBrandModal() {
  if (!_pendingDeleteBrand) return;
  const { id, name } = _pendingDeleteBrand;
  const isCurrent = id === app.currentBrandId;
  closeDeleteBrandModal();
  try {
    await db.deleteBrand(id);
    toast(`Marca "${name}" excluída.`, 'success');
    if (isCurrent) { app.goHome(); } else { await app.loadBrandList(); }
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
}
```

- [ ] **Step 3: Registrar o novo modal no mapa de Esc (Task 6)**

Em `js/ui.js`, estender o mapa criado na Task 6:

```javascript
// Antes
const MODAL_CLOSE_FNS = {
  templateModal: () => app.closeTemplateModal(),
};
// Depois
const MODAL_CLOSE_FNS = {
  templateModal: () => app.closeTemplateModal(),
  deleteBrandModal: () => closeDeleteBrandModal(),
};
```

- [ ] **Step 4: Trocar os dois `confirm()` por chamadas ao modal**

Em `js/app.js`:

```javascript
// Antes
async confirmDelete() {
  const name = f('bName') || 'esta marca';
  if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await db.deleteBrand(this.currentBrandId);
    toast('Marca excluída.', 'success');
    this.goHome();
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
},
// Depois
async confirmDelete() {
  const name = f('bName') || 'esta marca';
  openDeleteBrandModal(this.currentBrandId, name, this.presets.length);
},
```

```javascript
// Antes
async deleteBrandById(id, name) {
  if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await db.deleteBrand(id);
    toast('Marca excluída com sucesso.', 'success');
    await this.loadBrandList();
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
},
// Depois
async deleteBrandById(id, name) {
  openDeleteBrandModal(id, name, null);
},
```

- [ ] **Step 5: Verificar**

`node -c js/app.js` e `node -c js/ui.js` devem passar. No navegador: (a) com uma marca aberta, usar o menu "⋮" → "Excluir marca" — deve abrir o modal customizado, não o `confirm()` do navegador, mostrando a contagem de presets; (b) no seletor de marcas da sidebar, excluir uma marca da lista (sem estar com ela aberta) — deve abrir o mesmo modal, sem contagem de presets; (c) Esc fecha o modal (Task 6/Task 17 Step 3); (d) confirmar a exclusão efetivamente remove a marca e mostra o toast de sucesso.

- [ ] **Step 6: Commit**

```bash
git add index.html js/app.js js/ui.js
git commit -m "feat(ui): substitui confirm() nativo por modal customizado na exclusão de marca"
```

---

## Task 18: Feedback inline no botão "Salvar" da topbar

**Files:**
- Modify: `js/app.js` (`renderTopbar`, `save`)
- Modify: `js/ui.js` (novo helper `flashSaveButton`)

**Interfaces:**
- Consumes: `app.save()` (existente), `#topbarActions` (existente).
- Produces: `flashSaveButton()` — helper reutilizável caso outro botão de salvar precise do mesmo feedback no futuro.

- [ ] **Step 1: Dar um id ao botão "Salvar" em `renderTopbar()`**

Em `js/app.js`:

```javascript
// Antes
<button class="btn btn-ghost topbar-save-btn" onclick="app.save()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button>
// Depois
<button class="btn btn-ghost topbar-save-btn" id="topbarSaveBtn" onclick="app.save()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button>
```

- [ ] **Step 2: Adicionar `flashSaveButton()` em `js/ui.js`**

Adicionar próximo a `setSaveStatus()`:

```javascript
function flashSaveButton() {
  const btn = document.getElementById('topbarSaveBtn');
  if (!btn || btn.dataset.flashing) return;
  const original = btn.innerHTML;
  btn.dataset.flashing = '1';
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>✓ Salvo';
  setTimeout(() => { btn.innerHTML = original; delete btn.dataset.flashing; }, 2000);
}
```

- [ ] **Step 3: Chamar `flashSaveButton()` em `save()` após sucesso**

Em `js/app.js`:

```javascript
// Antes
async save() {
  if (!this.currentBrandId) return;
  setSaveStatus('saving');
  try {
    await db.saveAll(this.currentBrandId, this.collectBrand(), this.collectCarousel(), this.collectPost());
    setSaveStatus('saved');
    this.isDirty = false;
  } catch (e) {
    setSaveStatus('error');
    toast('Erro ao salvar: ' + e.message, 'error');
  }
},
// Depois
async save() {
  if (!this.currentBrandId) return;
  setSaveStatus('saving');
  try {
    await db.saveAll(this.currentBrandId, this.collectBrand(), this.collectCarousel(), this.collectPost());
    setSaveStatus('saved');
    this.isDirty = false;
    flashSaveButton();
  } catch (e) {
    setSaveStatus('error');
    toast('Erro ao salvar: ' + e.message, 'error');
  }
},
```

- [ ] **Step 4: Verificar**

`node -c js/app.js` e `node -c js/ui.js` devem passar. No navegador, alterar qualquer campo e clicar em "Salvar" na topbar (não esperar o autosave) — o botão deve mostrar "✓ Salvo" por ~2s e voltar ao normal, além do indicador que já existe na sidebar continuar funcionando.

- [ ] **Step 5: Commit**

```bash
git add js/app.js js/ui.js
git commit -m "feat(ui): adiciona feedback inline no botão Salvar da topbar"
```

---

## Self-Review

**Cobertura da spec:** Lote 1 → Tasks 1-6. Lote 2 → Tasks 7-11. Lote 3 → Tasks 12-13. Lote 4 → Tasks 14-15. Lote 5 → Tasks 16-18. Todos os 17 itens do diagnóstico original e as 3 decisões de produto resolvidas no brainstorming (remoção do modal órfão, modal customizado de exclusão, feedback de salvar) têm task correspondente.

**Placeholders:** nenhum "TBD"/"TODO" — os dois valores de cor sem consenso prévio (`--muted`, placeholder) foram decididos com contraste calculado (Task 9) em vez de deixados em aberto.

**Consistência de tipos/nomes:** `openModal`/`closeModal`/`MODAL_CLOSE_FNS` (Task 6) são consumidos exatamente com esses nomes na Task 17. `flashSaveButton` (Task 18) não colide com nenhum nome existente. `activateOnKey` (Task 3) não é reaproveitado em outra task — nome único, sem conflito.
