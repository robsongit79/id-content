# Simplificação dos Formulários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove low-value fields from the Identidade, Carrossel, and Post forms (per the approved spec), without losing previously-saved data for existing brands and without breaking the prompt generator, progress bar, or post-type selection.

**Architecture:** Pure HTML/CSS/JS edits across `index.html`, `css/style.css`, `js/app.js`, `js/ui.js`, `js/prompts.js`. No backend/schema changes. Removed fields stop being collected (not sent as empty strings) so existing Supabase rows keep their old values via `PATCH` semantics.

**Tech Stack:** Vanilla JavaScript (ES6+), plain CSS, no framework, no build step.

## Global Constraints

- No automated test framework exists in this repo. Verification = `node --check` for modified `.js` files + div-balance/brace-balance checks + manual browser check.
- Do not modify `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/templates.js`, `js/claude-generate.js`, or any database schema.
- **Data safety:** for every field removed from the UI, `collectBrand()`/`collectCarousel()`/`collectPost()` must stop including that key in the object they return — never send it as `''`. Supabase's `update()` does a `PATCH`, so omitted keys leave the existing database value untouched.
- The post-type selector (13 type-cards) and the `POST_COMPOSITION_PATTERNS` determinism in `js/prompts.js` must keep working unchanged — only the *dynamic fields per type* are removed, not the type selector itself.
- Section numbers in the generated prompt text (`## 01 · ...`, `## 02 · ...`) and in the UI sidebar (`section-num`) must stay sequential after sections are removed — no gaps like `01, 02, 04`.

---

### Task 1: Simplify Identidade (Base form + prompt)

**Files:**
- Modify: `index.html` (section `b1`, remove sections `b4`, `b6`, `b7`, renumber `b2`/`b3`/`b5`)
- Modify: `js/prompts.js` (`buildBase()`)
- Modify: `js/app.js` (`collectBrand()`, `fillBrand()`)
- Modify: `js/ui.js` (`updateProgress()`'s Base section)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only removes fields/sections.

- [ ] **Step 1: Remove fields from section `b1` in `index.html`**

Find:
```html
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Nome da marca <span class="required">*</span></label><input type="text" id="bName" placeholder="Ex: CFC Produtivo" oninput="markDirty()"></div>
          <div class="field"><label class="field-label">Handle Instagram</label><input type="text" id="bHandle" placeholder="@cfcprodutivo" oninput="markDirty()"></div>
        </div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Tagline</label><input type="text" id="bTagline" placeholder="Ex: Gestão para autoescolas" oninput="markDirty()"></div>
          <div class="field"><label class="field-label">Segmento / Nicho</label><input type="text" id="bNiche" placeholder="Ex: Autoescolas" oninput="markDirty()"></div>
        </div>
        <div class="field-group"><div class="field"><label class="field-label">Posicionamento</label><textarea id="bPositioning" placeholder="Como a marca quer ser percebida..." oninput="markDirty()"></textarea></div></div>
        <div class="divider"></div>
```

Replace with:
```html
        <div class="field-group">
          <div class="field"><label class="field-label">Nome da marca <span class="required">*</span></label><input type="text" id="bName" placeholder="Ex: CFC Produtivo" oninput="markDirty()"></div>
        </div>
        <div class="divider"></div>
```

- [ ] **Step 2: Delete the entire "Tom de Voz" section (`b4`) from `index.html`**

Find the section starting at `<section class="section" id="b4">` and ending at its matching `</section>`:
```html
      <section class="section" id="b4">
        <div class="section-header"><div><div class="section-num base-num">02</div><h2 class="section-title">Tom de Voz</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Personalidade</label><div class="field-hint">Pressione Enter para adicionar</div><div class="chips-wrap" id="personalityChips" onclick="document.getElementById('personalityInput').focus()"><input class="chip-input" id="personalityInput" placeholder="Ex: Direto, Autoritário..." onkeydown="addChip(event,'personalityChips','personality')"></div></div></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Tom principal</label><select id="bToneMain" oninput="markDirty()"><option value="">Selecione</option><option>Autoritário e direto</option><option>Consultivo e educativo</option><option>Provocativo e agressivo</option><option>Inspiracional e motivacional</option><option>Premium e sofisticado</option><option>Técnico e objetivo</option><option>Próximo e conversacional</option><option>Editorial e jornalístico</option></select></div>
          <div class="field"><label class="field-label">Tratamento</label><select id="bToneReader" oninput="markDirty()"><option value="">Selecione</option><option>Você (informal)</option><option>Você (formal)</option><option>Tu</option><option>Gestor / Profissional (3ª pessoa)</option></select></div>
        </div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Nunca fazer</label><textarea id="bToneNever" placeholder="Ex: Nunca usar gírias. Nunca diminutivos. Evitar exclamações em excesso." oninput="markDirty()"></textarea></div>
          <div class="field"><label class="field-label">Exemplo de headline</label><textarea id="bToneExample" placeholder="Ex: 'Você está gerenciando sua autoescola no improviso — e isso tem custo.'" oninput="markDirty()"></textarea></div>
        </div>
      </section>

      <section class="section" id="b6">
        <div class="section-header"><div><div class="section-num base-num">03</div><h2 class="section-title">Audiência</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Perfil do público</label><textarea id="bAudience" placeholder="Ex: Donos e gestores de autoescolas, 30–55 anos, que já têm operação rodando mas sentem que poderiam ser mais organizados." oninput="markDirty()"></textarea></div></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Principal dor</label><textarea id="bPain" style="min-height:66px;" placeholder="Ex: Perdem alunos por falta de acompanhamento pós-matrícula e não têm visibilidade financeira." oninput="markDirty()"></textarea></div>
          <div class="field"><label class="field-label">Principal desejo</label><textarea id="bDesire" style="min-height:66px;" placeholder="Ex: Ter controle total da escola sem depender de planilhas ou da memória." oninput="markDirty()"></textarea></div>
        </div>
        <div class="field-group"><div class="field"><label class="field-label">Objetivos de conteúdo</label><div class="chips-wrap" id="goalChips" onclick="document.getElementById('goalInput').focus()"><input class="chip-input" id="goalInput" placeholder="Ex: Gerar leads, Educar..." onkeydown="addChip(event,'goalChips','goal')"></div></div></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Temas / Pautas recorrentes</label><div class="field-hint">Pressione Enter para adicionar</div><div class="chips-wrap" id="topicChips" onclick="document.getElementById('topicInput').focus()"><input class="chip-input" id="topicInput" placeholder="Ex: Gestão, Vendas, Legislação..." onkeydown="addChip(event,'topicChips','topic')"></div></div>
          <div class="field"><label class="field-label">Frequência de postagem</label><select id="bPostFrequency" oninput="markDirty()"><option value="">Selecione</option><option>Diário</option><option>3× por semana</option><option>2× por semana</option><option>Semanal</option><option>Quinzenal</option><option>Mensal</option></select></div>
        </div>
      </section>

      <section class="section" id="b2">
        <div class="section-header"><div><div class="section-num base-num">04</div><h2 class="section-title">Paleta de Cores</h2></div></div>
```

Replace with:
```html
      <section class="section" id="b2">
        <div class="section-header"><div><div class="section-num base-num">02</div><h2 class="section-title">Paleta de Cores</h2></div></div>
```

- [ ] **Step 3: Renumber "Tipografia" (`b3`) from 05 to 03**

Find:
```html
      <section class="section" id="b3">
        <div class="section-header"><div><div class="section-num base-num">05</div><h2 class="section-title">Tipografia</h2><p class="section-desc">Nome exato como aparece em <a href="https://fonts.google.com" target="_blank" style="color:var(--accent2);text-decoration:none;">fonts.google.com</a></p></div></div>
```

Replace with:
```html
      <section class="section" id="b3">
        <div class="section-header"><div><div class="section-num base-num">03</div><h2 class="section-title">Tipografia</h2><p class="section-desc">Nome exato como aparece em <a href="https://fonts.google.com" target="_blank" style="color:var(--accent2);text-decoration:none;">fonts.google.com</a></p></div></div>
```

- [ ] **Step 4: Renumber "Estrutura Visual" (`b5`) from 06 to 04, and delete the "Referências & Restrições" section (`b7`) that follows it**

Find:
```html
      <section class="section" id="b5">
        <div class="section-header"><div><div class="section-num base-num">06</div><h2 class="section-title">Estrutura Visual</h2></div></div>
```

Replace with:
```html
      <section class="section" id="b5">
        <div class="section-header"><div><div class="section-num base-num">04</div><h2 class="section-title">Estrutura Visual</h2></div></div>
```

Then find the entire `b7` section (from its opening tag to its matching `</section>`, immediately followed by `</main>`):
```html
      <section class="section" id="b7">
        <div class="section-header"><div><div class="section-num base-num">07</div><h2 class="section-title">Referências & Restrições</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Referências visuais</label><textarea id="bReferences" placeholder="Ex: @resultadosdigitais no Instagram, site linear.app, carrosséis da marca Nubank — todos usam tipografia grande, espaço generoso e paleta sóbria." oninput="markDirty()"></textarea></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Proibições globais</label><textarea id="bForbidden" placeholder="Ex: Nunca usar stock photos genéricas. Nunca fundo branco puro. Proibido emoji fora do contexto de checklist." oninput="markDirty()"></textarea></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Referência canônica aprovada</label><textarea id="bCanonical" placeholder="Ex: O carrossel 'Os 5 erros...' publicado em 12/03 é o padrão de qualidade aprovado pelo cliente — usar como régua." oninput="markDirty()"></textarea></div></div>
        <div class="field-group cols-2">
          <div class="field"><label class="field-label">Hashtags padrão</label><div class="field-hint">Pressione Enter para adicionar</div><div class="chips-wrap" id="hashtagChips" onclick="document.getElementById('hashtagInput').focus()"><input class="chip-input" id="hashtagInput" placeholder="Ex: #autoescola, #gestao..." onkeydown="addChip(event,'hashtagChips','hashtag')"></div></div>
          <div class="field"><label class="field-label">Concorrentes principais</label><textarea id="bCompetitors" placeholder="Ex: CFC Central, Escola de Trânsito XYZ — ambos focados em volume, não em qualidade de atendimento." oninput="markDirty()"></textarea></div>
        </div>
        <div class="field-group"><div class="field"><label class="field-label">Notas finais</label><textarea id="bFinalNotes" placeholder="Ex: Cliente prefere variações com mais texto. Revisar sempre antes de entregar posts de campanha." oninput="markDirty()"></textarea></div></div>
      </section>
    </main>
```

Replace with:
```html
    </main>
```

- [ ] **Step 5: Verify HTML structure**

```bash
python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"
python3 -c "import re; s=open('index.html').read(); print(s.count('<section'), s.count('</section>'))"
```
Expected: both pairs of numbers equal.

```bash
grep -c 'id="bHandle"\|id="bTagline"\|id="bNiche"\|id="bPositioning"\|id="b4"\|id="b6"\|id="b7"\|id="personalityChips"\|id="goalChips"\|id="topicChips"\|id="hashtagChips"' index.html
```
Expected: `0`.

- [ ] **Step 6: Update `buildBase()` in `js/prompts.js`**

Find:
```javascript
    const s1 = [];
    if (f('bName'))        s1.push(`MARCA:          ${f('bName')}`);
    if (f('bHandle'))      s1.push(`HANDLE:         ${f('bHandle')}`);
    if (f('bTagline'))     s1.push(`TAGLINE:        ${f('bTagline')}`);
    if (f('bNiche'))       s1.push(`NICHO:          ${f('bNiche')}`);
    if (f('bPositioning')) s1.push(`POSICIONAMENTO: ${f('bPositioning')}`);
    const activeLogo = document.getElementById('bLogoActive')?.checked || false;
```

Replace with:
```javascript
    const s1 = [];
    if (f('bName'))        s1.push(`MARCA:          ${f('bName')}`);
    const activeLogo = document.getElementById('bLogoActive')?.checked || false;
```

Find:
```javascript
    const s4 = [];
    if (app.chipData.personality.length) s4.push(`PERSONALIDADE:  ${app.chipData.personality.join(', ')}`);
    if (f('bToneMain'))    s4.push(`TOM:            ${f('bToneMain')}`);
    if (f('bToneReader'))  s4.push(`TRATAMENTO:     ${f('bToneReader')}`);
    if (f('bToneNever'))   s4.push(`NUNCA:          ${f('bToneNever')}`);
    if (f('bToneExample')) s4.push(`EXEMPLO:        "${f('bToneExample')}"`);
    if (s4.length) s.push(`## 04 · TOM DE VOZ\n${s4.join('\n')}`);

    const s5 = [], sv = getRadio('styleVisual');
    if (sv)               s5.push(`ESTILO:         ${sv}`);
    if (f('bBorderUse'))  s5.push(`BORDAS:         ${f('bBorderUse')}`);
    if (f('bCornerRadius'))s5.push(`CANTOS:         ${f('bCornerRadius')}`);
    if (f('bBgRhythm'))   s5.push(`RITMO FUNDOS:   ${f('bBgRhythm')}`);
    if (f('bGradientUse'))s5.push(`GRADIENTES:     ${f('bGradientUse')}`);
    if (f('bVisualSig'))  s5.push(`ASSINATURA:     ${f('bVisualSig')}`);
    if (s5.length) s.push(`## 05 · VISUAL\n${s5.join('\n')}`);

    const s6 = [];
    if (f('bAudience')) s6.push(`PÚBLICO:        ${f('bAudience')}`);
    if (f('bPain'))     s6.push(`DOR:            ${f('bPain')}`);
    if (f('bDesire'))   s6.push(`DESEJO:         ${f('bDesire')}`);
    if (app.chipData.goal.length) s6.push(`OBJETIVOS:      ${app.chipData.goal.join(', ')}`);
    if (app.chipData.topic.length) s6.push(`PAUTAS:         ${app.chipData.topic.join(', ')}`);
    if (f('bPostFrequency')) s6.push(`FREQUÊNCIA:     ${f('bPostFrequency')}`);
    if (s6.length) s.push(`## 06 · AUDIÊNCIA\n${s6.join('\n')}`);

    const s7 = [];
    if (f('bReferences')) s7.push(`REFERÊNCIAS:    ${f('bReferences')}`);
    if (f('bForbidden'))  s7.push(`PROIBIDO:       ${f('bForbidden')}`);
    if (f('bCanonical'))  s7.push(`CANÔNICO:       ${f('bCanonical')}`);
    if (app.chipData.hashtag.length) s7.push(`HASHTAGS:       ${app.chipData.hashtag.map(h => h.startsWith('#') ? h : '#' + h).join(' ')}`);
    if (f('bCompetitors')) s7.push(`CONCORRENTES:   ${f('bCompetitors')}`);
    if (f('bFinalNotes')) s7.push(`NOTAS:          ${f('bFinalNotes')}`);
    if (s7.length) s.push(`## 07 · REFERÊNCIAS\n${s7.join('\n')}`);

    if (s.length <= 1) return null;
```

Replace with:
```javascript
    const s5 = [], sv = getRadio('styleVisual');
    if (sv)               s5.push(`ESTILO:         ${sv}`);
    if (f('bBorderUse'))  s5.push(`BORDAS:         ${f('bBorderUse')}`);
    if (f('bCornerRadius'))s5.push(`CANTOS:         ${f('bCornerRadius')}`);
    if (f('bBgRhythm'))   s5.push(`RITMO FUNDOS:   ${f('bBgRhythm')}`);
    if (f('bGradientUse'))s5.push(`GRADIENTES:     ${f('bGradientUse')}`);
    if (f('bVisualSig'))  s5.push(`ASSINATURA:     ${f('bVisualSig')}`);
    if (s5.length) s.push(`## 04 · VISUAL\n${s5.join('\n')}`);

    if (s.length <= 1) return null;
```

(Sections `## 02 · PALETA` and `## 03 · TIPOGRAFIA`, built by `s2`/`s3` just above this excerpt, are untouched — only `s4`, `s6`, `s7` are deleted and `s5`'s header number changes from `05` to `04`.)

- [ ] **Step 7: Update `collectBrand()` in `js/app.js`**

Find:
```javascript
    return {
      name: f('bName') || 'Sem nome',
      handle: f('bHandle'), tagline: f('bTagline'), niche: f('bNiche'),
      positioning: f('bPositioning'),
      logo_active: document.getElementById('bLogoActive')?.checked || false,
      logo_url: JSON.stringify(meta),
      color_primary: document.getElementById('cPrimaryHex')?.value,
      color_secondary: document.getElementById('cSecondaryHex')?.value,
      color_accent: document.getElementById('cAccentHex')?.value,
      color_dark: document.getElementById('cDarkHex')?.value,
      color_light: document.getElementById('cLightHex')?.value,
      color_text: document.getElementById('cTextHex')?.value,
      colors_notes: f('bColorsNotes'),
      font_display: f('bFontDisplay'), font_body: f('bFontBody'),
      size_title: f('bSizeTitle'), size_subtitle: f('bSizeSubtitle'), size_body: f('bSizeBody'),
      weight_title: f('bWeightTitle'), italic_use: f('bItalicUse'), typo_notes: f('bTypoNotes'),
      personality: this.chipData.personality, goals: this.chipData.goal,
      tone_main: f('bToneMain'), tone_reader: f('bToneReader'),
      tone_never: f('bToneNever'), tone_example: f('bToneExample'),
      style_visual: getRadio('styleVisual'),
      border_use: f('bBorderUse'), corner_radius: f('bCornerRadius'),
      bg_rhythm: f('bBgRhythm'), gradient_use: f('bGradientUse'), visual_signature: f('bVisualSig'),
      audience: f('bAudience'), pain: f('bPain'), desire: f('bDesire'),
      visual_references: f('bReferences'), forbidden: f('bForbidden'),
      canonical: f('bCanonical'), final_notes: f('bFinalNotes'),
      // Novos campos
      hashtags: this.chipData.hashtag,
      competitors: f('bCompetitors'),
      topics: this.chipData.topic,
      post_frequency: f('bPostFrequency'),
    };
  },
```

Replace with:
```javascript
    return {
      name: f('bName') || 'Sem nome',
      logo_active: document.getElementById('bLogoActive')?.checked || false,
      logo_url: JSON.stringify(meta),
      color_primary: document.getElementById('cPrimaryHex')?.value,
      color_secondary: document.getElementById('cSecondaryHex')?.value,
      color_accent: document.getElementById('cAccentHex')?.value,
      color_dark: document.getElementById('cDarkHex')?.value,
      color_light: document.getElementById('cLightHex')?.value,
      color_text: document.getElementById('cTextHex')?.value,
      colors_notes: f('bColorsNotes'),
      font_display: f('bFontDisplay'), font_body: f('bFontBody'),
      size_title: f('bSizeTitle'), size_subtitle: f('bSizeSubtitle'), size_body: f('bSizeBody'),
      weight_title: f('bWeightTitle'), italic_use: f('bItalicUse'), typo_notes: f('bTypoNotes'),
      style_visual: getRadio('styleVisual'),
      border_use: f('bBorderUse'), corner_radius: f('bCornerRadius'),
      bg_rhythm: f('bBgRhythm'), gradient_use: f('bGradientUse'), visual_signature: f('bVisualSig'),
    };
  },
```

- [ ] **Step 8: Update `fillBrand()` in `js/app.js`**

Find:
```javascript
  fillBrand(b) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('bName', b.name); set('bHandle', b.handle); set('bTagline', b.tagline);
    set('bNiche', b.niche); set('bPositioning', b.positioning);
    set('cPrimaryHex', b.color_primary); set('cSecondaryHex', b.color_secondary);
    set('cAccentHex', b.color_accent); set('cDarkHex', b.color_dark);
    set('cLightHex', b.color_light); set('cTextHex', b.color_text);
    ['Primary','Secondary','Accent','Dark','Light','Text'].forEach(n => {
      const hex = document.getElementById(`c${n}Hex`), picker = document.getElementById(`c${n}`);
      if (hex && picker) picker.value = hex.value;
    });
    set('bColorsNotes', b.colors_notes); set('bFontDisplay', b.font_display); set('bFontBody', b.font_body);
    set('bSizeTitle', b.size_title); set('bSizeSubtitle', b.size_subtitle); set('bSizeBody', b.size_body);
    set('bWeightTitle', b.weight_title); set('bItalicUse', b.italic_use); set('bTypoNotes', b.typo_notes);
    set('bToneMain', b.tone_main); set('bToneReader', b.tone_reader);
    set('bToneNever', b.tone_never); set('bToneExample', b.tone_example);
    set('bBorderUse', b.border_use); set('bCornerRadius', b.corner_radius);
    set('bBgRhythm', b.bg_rhythm); set('bGradientUse', b.gradient_use); set('bVisualSig', b.visual_signature);
    set('bAudience', b.audience); set('bPain', b.pain); set('bDesire', b.desire);
    set('bReferences', b.visual_references); set('bForbidden', b.forbidden);
    set('bCanonical', b.canonical); set('bFinalNotes', b.final_notes);

    // Novos campos
    set('bCompetitors', b.competitors);
    set('bPostFrequency', b.post_frequency);

    if (b.style_visual) {
      document.querySelectorAll(`input[name="styleVisual"]`).forEach(r => {
        if (r.value === b.style_visual) { r.checked = true; r.closest('.radio-item')?.classList.add('selected'); }
      });
    }
    if (b.personality) this.fillChips('personality', b.personality, 'personalityChips', 'personalityInput');
    if (b.goals) this.fillChips('goal', b.goals, 'goalChips', 'goalInput');
    if (b.hashtags) this.fillChips('hashtag', b.hashtags, 'hashtagChips', 'hashtagInput');
    if (b.topics) this.fillChips('topic', b.topics, 'topicChips', 'topicInput');

    if (b.font_display) loadFont('bFontDisplay','bPreviewDisplay','bStatusDisplay');
```

Replace with:
```javascript
  fillBrand(b) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('bName', b.name);
    set('cPrimaryHex', b.color_primary); set('cSecondaryHex', b.color_secondary);
    set('cAccentHex', b.color_accent); set('cDarkHex', b.color_dark);
    set('cLightHex', b.color_light); set('cTextHex', b.color_text);
    ['Primary','Secondary','Accent','Dark','Light','Text'].forEach(n => {
      const hex = document.getElementById(`c${n}Hex`), picker = document.getElementById(`c${n}`);
      if (hex && picker) picker.value = hex.value;
    });
    set('bColorsNotes', b.colors_notes); set('bFontDisplay', b.font_display); set('bFontBody', b.font_body);
    set('bSizeTitle', b.size_title); set('bSizeSubtitle', b.size_subtitle); set('bSizeBody', b.size_body);
    set('bWeightTitle', b.weight_title); set('bItalicUse', b.italic_use); set('bTypoNotes', b.typo_notes);
    set('bBorderUse', b.border_use); set('bCornerRadius', b.corner_radius);
    set('bBgRhythm', b.bg_rhythm); set('bGradientUse', b.gradient_use); set('bVisualSig', b.visual_signature);

    if (b.style_visual) {
      document.querySelectorAll(`input[name="styleVisual"]`).forEach(r => {
        if (r.value === b.style_visual) { r.checked = true; r.closest('.radio-item')?.classList.add('selected'); }
      });
    }

    if (b.font_display) loadFont('bFontDisplay','bPreviewDisplay','bStatusDisplay');
```

(This deliberately stops calling `this.fillChips('personality'|'goal'|'hashtag'|'topic', ...)` — those wrap elements no longer exist in the DOM after Step 2/4, and this also prevents the old `Cannot read properties of null (reading 'insertBefore')` crash from recurring for any existing brand that has saved `personality`/`goals`/`hashtags`/`topics` data.)

- [ ] **Step 9: Fix `updateProgress()`'s Base section in `js/ui.js` (would otherwise permanently cap the progress bar below 100% — it references `bToneMain`/`bAudience`, removed in Step 2/4, and chip bonuses that can never fire again after Step 8)**

Find:
```javascript
function updateProgress() {
  const bReq = ['bName','cPrimaryHex','bFontDisplay','bToneMain','bAudience'];
  const bOpt = ['bHandle','bTagline','bNiche','cSecondaryHex','bFontBody','bSizeTitle','bSizeSubtitle','bSizeBody','bBgRhythm','bReferences'];
  let bScore = 0, bMax = bReq.length * 2 + bOpt.length;
  bReq.forEach(id => { if (f(id)) bScore += 2; });
  bOpt.forEach(id => { if (f(id)) bScore += 1; });
  if (app.chipData.personality.length) bScore += 2;
  if (app.chipData.goal.length) bScore += 1;
  if (getRadio('styleVisual')) bScore += 1;
  bMax += 3;
  const bReqFilled = bReq.filter(id => f(id)).length + (app.chipData.personality.length ? 1 : 0);
  const bPct = Math.round((bScore / bMax) * 100);
  document.getElementById('baseProgFill').style.width = bPct + '%';
  document.getElementById('baseProgLabel').textContent = `${bReqFilled}/${bReq.length + 1} obrig.`;
  document.getElementById('baseProgPct').textContent = bPct + '%';
```

Replace with:
```javascript
function updateProgress() {
  const bReq = ['bName','cPrimaryHex','bFontDisplay'];
  const bOpt = ['cSecondaryHex','bFontBody','bSizeTitle','bSizeSubtitle','bSizeBody','bBgRhythm'];
  let bScore = 0, bMax = bReq.length * 2 + bOpt.length;
  bReq.forEach(id => { if (f(id)) bScore += 2; });
  bOpt.forEach(id => { if (f(id)) bScore += 1; });
  if (getRadio('styleVisual')) bScore += 1;
  bMax += 1;
  const bReqFilled = bReq.filter(id => f(id)).length;
  const bPct = Math.round((bScore / bMax) * 100);
  document.getElementById('baseProgFill').style.width = bPct + '%';
  document.getElementById('baseProgLabel').textContent = `${bReqFilled}/${bReq.length} obrig.`;
  document.getElementById('baseProgPct').textContent = bPct + '%';
```

(Leave the rest of `updateProgress()` — the Carrossel `cReq`/`cOpt` block and the Post block — untouched in this task; the Carrossel block is fixed in Task 2.)

- [ ] **Step 10: Run syntax checks**

```bash
node --check js/prompts.js
node --check js/app.js
```
Expected: no output, exit code 0 for both.

- [ ] **Step 11: Manual browser verification**

Serve the directory (`python3 -m http.server 8000`) and in the browser:
1. Open a brand. Confirm the Identidade tab shows only: Nome da marca, logo checkbox, admin-share checkbox (if admin), then Paleta de Cores (02), Tipografia (03), Estrutura Visual (04) — no Handle/Tagline/Nicho/Posicionamento, no Tom de Voz, no Audiência, no Referências & Restrições section.
2. Fill in name + a color + a font, confirm the generated prompt (right panel) shows `## 01 · IDENTIDADE`, `## 02 · PALETA`, `## 03 · TIPOGRAFIA`, and (if any visual field filled) `## 04 · VISUAL` — no Tom de Voz/Audiência/Referências sections.
3. If you have an existing brand created before this change with data in the removed fields (e.g. a Handle), open it, confirm the app doesn't crash, save it, then check in Supabase (or re-fetch via the API) that the old `handle` column value is still there (not wiped to empty).
4. Confirm the Base progress bar (top of the left sidebar in the Identidade tab) can reach 100% by filling Nome da marca, a primary color, and a display font (the only 3 required fields now).

- [ ] **Step 12: Commit**

```bash
git add index.html js/prompts.js js/app.js js/ui.js
git commit -m "feat(forms): simplificar Identidade — remover Tom de Voz, Audiência, Referências e campos secundários"
```

---

### Task 2: Simplify Carrossel (remove Configurações Avançadas)

**Files:**
- Modify: `index.html` (section `c4`)
- Modify: `js/prompts.js` (`buildCarousel()`)
- Modify: `js/app.js` (`collectCarousel()`)
- Modify: `js/ui.js` (`updateProgress()`'s Carrossel section)

**Interfaces:** none new.

- [ ] **Step 1: Remove the advanced-options toggle and block from `index.html`**

Find:
```html
        <div class="field-group"><div class="field"><label class="field-label">O que não fazer</label><textarea id="cForbidden" placeholder="Ex: Não usar fundo branco neste carrossel. Não empilar mais de 3 elementos no centro da imagem." oninput="markDirty()"></textarea></div></div>
        
        <!-- Toggle de Configurações Avançadas -->
        <button type="button" class="btn btn-ghost" id="cToggleAdvancedBtn" onclick="toggleCarAdvanced()" style="margin-bottom:14px; width:100%; justify-content:center;">
          <span>Mostrar Configurações Avançadas de Exportação</span>
        </button>

        <div id="cAdvancedOptions" class="advanced-options-group" style="display:none; margin-bottom:14px;">
          <div class="field-group cols-2">
            <div class="field"><label class="field-label">Formato de entrega</label><select id="cDelivery" oninput="markDirty()"><option value="HTML standalone por formato">HTML standalone por formato</option><option value="Um único HTML com todos os formatos">Um HTML com todos os formatos</option><option value="HTML com botão exportar PNG">HTML com botão exportar PNG</option></select></div>
            <div class="field"><label class="field-label">Fontes</label><select id="cFontB64" oninput="markDirty()"><option value="Embutir fontes em base64 no CSS">Embutir em base64</option><option value="Carregar via Google Fonts link">Via Google Fonts link</option></select></div>
          </div>
        </div>

        <div class="field-group"><div class="field"><label class="field-label">Notas finais</label><textarea id="cFinalNotes" placeholder="Ex: Entregar versão 1:1 primeiro para validação. Já deixar estrutura pronta para adaptar 9:16." oninput="markDirty()"></textarea></div></div>
```

Replace with:
```html
        <div class="field-group"><div class="field"><label class="field-label">O que não fazer</label><textarea id="cForbidden" placeholder="Ex: Não usar fundo branco neste carrossel. Não empilar mais de 3 elementos no centro da imagem." oninput="markDirty()"></textarea></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Notas finais</label><textarea id="cFinalNotes" placeholder="Ex: Entregar versão 1:1 primeiro para validação. Já deixar estrutura pronta para adaptar 9:16." oninput="markDirty()"></textarea></div></div>
```

- [ ] **Step 2: Update `buildCarousel()` in `js/prompts.js`**

Find:
```javascript
    const c4 = [];
    if (f('cForbidden')) c4.push(`PROIBIDO:       ${f('cForbidden')}`);
    if (f('cDelivery'))  c4.push(`ENTREGA:        ${f('cDelivery')}`);
    if (f('cFontB64'))   c4.push(`FONTES:         ${f('cFontB64')}`);
    if (f('cFinalNotes'))c4.push(`NOTAS:          ${f('cFinalNotes')}`);
```

Replace with:
```javascript
    const c4 = [];
    if (f('cForbidden')) c4.push(`PROIBIDO:       ${f('cForbidden')}`);
    if (f('cFinalNotes'))c4.push(`NOTAS:          ${f('cFinalNotes')}`);
```

- [ ] **Step 3: Update `collectCarousel()` in `js/app.js`**

Find:
```javascript
  collectCarousel() {
    const notesData = {
      notes: f('cNotes'), forbidden: f('cForbidden'),
      delivery_format: f('cDelivery'), font_base64: f('cFontB64'), final_notes: f('cFinalNotes'),
      content: f('cContent')
    };
```

Replace with:
```javascript
  collectCarousel() {
    const notesData = {
      notes: f('cNotes'), forbidden: f('cForbidden'),
      final_notes: f('cFinalNotes'),
      content: f('cContent')
    };
```

(`cDelivery`/`cFontB64` are intentionally still read by `fillCarousel()` from old saved JSON via `parsed.delivery_format`/`parsed.font_base64` — that function is unaffected by this task since those keys may still exist in old rows; we're only stopping *new* writes of these keys going forward. Do not modify `fillCarousel()` in this task.)

- [ ] **Step 4: Fix `updateProgress()`'s Carrossel section in `js/ui.js` (its `cOpt` array references `cDelivery`/`cFontB64`, removed in Step 1 — this doesn't crash, since `f()` returns `''` for missing elements, but it permanently wastes 2 of the Carrossel progress bar's max points)**

Find:
```javascript
  const cReq = ['cFormat','cSlideCount','cSequence'];
  const cOpt = ['cDelivery','cFontB64'];
  let cScore = 0, cMax = cReq.length * 2 + cOpt.length + 2;
```

Replace with:
```javascript
  const cReq = ['cFormat','cSlideCount','cSequence'];
  const cOpt = ['cFixedEl'];
  let cScore = 0, cMax = cReq.length * 2 + cOpt.length + 2;
```

- [ ] **Step 5: Verify and commit**

```bash
node --check js/prompts.js
node --check js/app.js
node --check js/ui.js
python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"
grep -c 'id="cToggleAdvancedBtn"\|id="cAdvancedOptions"\|id="cDelivery"\|id="cFontB64"' index.html
```
Expected: `node --check` clean for all three files; div counts equal; last grep returns `0`.

Manually: open the Carrossel tab, confirm there's no "Mostrar Configurações Avançadas" button and the section goes directly from "O que não fazer" to "Notas finais". Confirm the Carrossel progress bar can still reach 100% by filling Formato, Nº de slides, and Sequência.

```bash
git add index.html js/prompts.js js/app.js js/ui.js
git commit -m "feat(forms): remover Configurações Avançadas do Carrossel"
```

---

### Task 3: Simplify Post content (remove Headline/Subtítulo/CTA and per-type dynamic fields)

**Files:**
- Modify: `index.html` (section `p2`'s dynamic block, section `p6`)
- Modify: `js/app.js` (`postTypeConfig`, `collectPost()`, `fillPost()`, `resetForm()`)
- Modify: `js/ui.js` (`selectPostType()`, `updateProgress()`)
- Modify: `js/prompts.js` (`buildPost()`'s `p4` content array)

**Interfaces:**
- Consumes: nothing new.
- Produces: `app.postTypeConfig[type]` now only has a `label` property (no `fields`/`dynLabel`/`compA`/`compB`/`qA`/`qR`) — Task 4 and Task 5 do not depend on the removed properties, but be aware if you grep for `postTypeConfig` elsewhere.

- [ ] **Step 1: Remove the dynamic-fields block from `index.html`**

Find (the entire `pDynamic` block, inside section `p2`, ending right before `</section>`):
```html
        <div id="pTypeInfo" style="display:none;margin-top:10px;padding:10px 14px;background:rgba(255,107,53,0.06);border:1px solid rgba(255,107,53,0.2);border-radius:6px;font-size:12px;color:var(--acc-post);">✓ Tipo: <strong id="pTypeLabel"></strong></div>

        <!-- Campos Dinâmicos do Tipo de Post Integrados no Fluxo -->
        <div id="pDynamic" style="display:none; margin-top:14px;">
          <div class="dynamic-fields">
            <div class="dynamic-label" id="pDynLabel">Campos específicos</div>
            <div id="pFieldItems" style="display:none;"><div class="field-group"><div class="field"><label class="field-label">Itens</label><div class="chips-wrap" id="pItemsChips" onclick="document.getElementById('pItemsInput').focus()"><input class="chip-input" id="pItemsInput" placeholder="Item e Enter" onkeydown="addChip(event,'pItemsChips','pItems')"></div></div></div></div>
            <div id="pFieldStat" style="display:none;"><div class="field-group cols-2"><div class="field"><label class="field-label">Número</label><input type="text" id="pStatNum" placeholder="Ex: 73%" oninput="markDirty()"></div><div class="field"><label class="field-label">Contexto</label><input type="text" id="pStatCtx" placeholder="Ex: das autoescolas não controlam inadimplência." oninput="markDirty()"></div></div><div class="field-group"><div class="field"><label class="field-label">Fonte</label><input type="text" id="pStatSrc" placeholder="Ex: Pesquisa DENATRAN 2024" oninput="markDirty()"></div></div></div>
            <div id="pFieldComp" style="display:none;"><div class="field-group cols-2"><div class="field"><label class="field-label" id="pCompLabelA">Lado A</label><textarea id="pCompA" oninput="markDirty()" style="min-height:60px;"></textarea></div><div class="field"><label class="field-label" id="pCompLabelB">Lado B</label><textarea id="pCompB" oninput="markDirty()" style="min-height:60px;"></textarea></div></div></div>
            <div id="pFieldAnuncio" style="display:none;"><div class="field-group cols-2"><div class="field"><label class="field-label">Preço</label><input type="text" id="pAnPrice" placeholder="Ex: R$ 197/mês" oninput="markDirty()"></div><div class="field"><label class="field-label">Benefício</label><input type="text" id="pAnBenefit" placeholder="Ex: Gestão completa sem complicação" oninput="markDirty()"></div></div></div>
            <div id="pFieldUrg" style="display:none;"><div class="field-group cols-2"><div class="field"><label class="field-label">Prazo</label><input type="text" id="pUrgPrazo" placeholder="Ex: Até sexta-feira, 23h59" oninput="markDirty()"></div><div class="field"><label class="field-label">O que acaba</label><input type="text" id="pUrgOque" placeholder="Ex: Vagas para o plano com onboarding incluído" oninput="markDirty()"></div></div></div>
            <div id="pFieldQuote" style="display:none;"><div class="field-group"><div class="field"><label class="field-label">Citação</label><textarea id="pQuoteText" oninput="markDirty()"></textarea></div></div><div class="field-group cols-2"><div class="field"><label class="field-label" id="pQuoteALabel">Autor</label><input type="text" id="pQuoteAuthor" oninput="markDirty()"></div><div class="field"><label class="field-label" id="pQuoteRLabel">Cargo</label><input type="text" id="pQuoteRole" oninput="markDirty()"></div></div></div>
            <div id="pFieldArt" style="display:none;"><div class="field-group"><div class="field"><label class="field-label">Corpo</label><textarea id="pArtBody" placeholder="Ex: Gestão eficiente não começa com tecnologia — começa com processo. Quando você define o fluxo de atendimento antes de automatizar, o resultado é 3× mais rápido." oninput="markDirty()" style="min-height:90px;"></textarea></div></div></div>
          </div>
        </div>
      </section>
```

Replace with:
```html
        <div id="pTypeInfo" style="display:none;margin-top:10px;padding:10px 14px;background:rgba(255,107,53,0.06);border:1px solid rgba(255,107,53,0.2);border-radius:6px;font-size:12px;color:var(--acc-post);">✓ Tipo: <strong id="pTypeLabel"></strong></div>
      </section>
```

- [ ] **Step 2: Remove Headline/Subtítulo/CTA from section `p6` ("Conteúdo do Post") in `index.html`**

Find:
```html
      <section class="section" id="p6">
        <div class="section-header"><div><div class="section-num post-num">03</div><h2 class="section-title">Conteúdo do Post</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Headline <span class="required">*</span></label><input type="text" id="pHeadline" placeholder="Ex: Você perde alunos sem saber por quê." oninput="markDirty()"></div></div>
        <div class="field-group cols-2"><div class="field"><label class="field-label">Subtítulo</label><input type="text" id="pSubtitle" placeholder="Ex: Veja como o CFC Produtivo resolve isso." oninput="markDirty()"></div><div class="field"><label class="field-label">CTA</label><input type="text" id="pCta" placeholder="Ex: Teste grátis por 14 dias →" oninput="markDirty()"></div></div>

        <div class="field-group" style="margin-top:14px;">
```

Replace with:
```html
      <section class="section" id="p6">
        <div class="section-header"><div><div class="section-num post-num">03</div><h2 class="section-title">Conteúdo do Post</h2></div></div>
        <div class="field-group" style="margin-top:14px;">
```

- [ ] **Step 3: Simplify `postTypeConfig` in `js/app.js`**

Find:
```javascript
  postTypeConfig: {
    'frase-impacto': { label:'Frase de impacto', fields:[] },
    'checklist':     { label:'Checklist', fields:['pFieldItems'], dynLabel:'Itens do checklist' },
    'estatistica':   { label:'Estatística / Dado', fields:['pFieldStat'], dynLabel:'Dados' },
    'antes-depois':  { label:'Antes e depois', fields:['pFieldComp'], dynLabel:'Comparação', compA:'Antes', compB:'Depois' },
    'passo-a-passo': { label:'Passo a passo', fields:['pFieldItems'], dynLabel:'Etapas' },
    'pergunta':      { label:'Pergunta provocativa', fields:[] },
    'comparativo':   { label:'Comparativo X vs Y', fields:['pFieldComp'], dynLabel:'Os dois lados', compA:'X', compB:'Y' },
    'anuncio':       { label:'Anúncio / Oferta', fields:['pFieldAnuncio'], dynLabel:'Oferta' },
    'urgencia':      { label:'Urgência / Prazo', fields:['pFieldUrg'], dynLabel:'Urgência' },
    'lancamento':    { label:'Lançamento / Novidade', fields:[] },
    'depoimento':    { label:'Depoimento', fields:['pFieldQuote'], dynLabel:'Depoimento', qA:'Nome do cliente', qR:'Cargo / Empresa' },
    'citacao':       { label:'Citação de especialista', fields:['pFieldQuote'], dynLabel:'Citação', qA:'Especialista', qR:'Cargo / Área' },
    'mini-artigo':   { label:'Mini artigo', fields:['pFieldArt'], dynLabel:'Conteúdo' },
  },
```

Replace with:
```javascript
  postTypeConfig: {
    'frase-impacto': { label:'Frase de impacto' },
    'checklist':     { label:'Checklist' },
    'estatistica':   { label:'Estatística / Dado' },
    'antes-depois':  { label:'Antes e depois' },
    'passo-a-passo': { label:'Passo a passo' },
    'pergunta':      { label:'Pergunta provocativa' },
    'comparativo':   { label:'Comparativo X vs Y' },
    'anuncio':       { label:'Anúncio / Oferta' },
    'urgencia':      { label:'Urgência / Prazo' },
    'lancamento':    { label:'Lançamento / Novidade' },
    'depoimento':    { label:'Depoimento' },
    'citacao':       { label:'Citação de especialista' },
    'mini-artigo':   { label:'Mini artigo' },
  },
```

- [ ] **Step 4: Simplify `selectPostType()` in `js/ui.js`**

Find:
```javascript
function selectPostType(el, type) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); app.postType = type;
  const cfg = app.postTypeConfig[type];
  document.getElementById('pTypeInfo').style.display = 'block';
  document.getElementById('pTypeLabel').textContent = cfg.label;
  ['pFieldItems','pFieldStat','pFieldComp','pFieldAnuncio','pFieldUrg','pFieldQuote','pFieldArt'].forEach(id => document.getElementById(id).style.display = 'none');
  if (cfg.fields.length) {
    document.getElementById('pDynamic').style.display = 'block';
    document.getElementById('pDynLabel').textContent = cfg.dynLabel || 'Campos específicos';
    cfg.fields.forEach(id => document.getElementById(id).style.display = 'block');
  } else document.getElementById('pDynamic').style.display = 'none';
  if (cfg.compA) { document.getElementById('pCompLabelA').textContent = cfg.compA; document.getElementById('pCompLabelB').textContent = cfg.compB; }
  if (cfg.qA) { document.getElementById('pQuoteALabel').textContent = cfg.qA; document.getElementById('pQuoteRLabel').textContent = cfg.qR; }
  markDirty(); updatePreviews();
}
```

Replace with:
```javascript
function selectPostType(el, type) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); app.postType = type;
  const cfg = app.postTypeConfig[type];
  document.getElementById('pTypeInfo').style.display = 'block';
  document.getElementById('pTypeLabel').textContent = cfg.label;
  markDirty(); updatePreviews();
}
```

- [ ] **Step 5: Fix `resetForm()` in `js/app.js` (would otherwise crash — `pDynamic` no longer exists)**

Find:
```javascript
    this.postType = '';
    this.postFmts.clear();
    ['1x1','4x5','9x16'].forEach(id => document.getElementById(`pFmt${id}`)?.classList.remove('checked'));
    document.getElementById('pTypeInfo').style.display = 'none';
    document.getElementById('pDynamic').style.display = 'none';
    document.getElementById('pLayoutPlaceholder').style.display = 'block';
```

Replace with:
```javascript
    this.postType = '';
    this.postFmts.clear();
    ['1x1','4x5','9x16'].forEach(id => document.getElementById(`pFmt${id}`)?.classList.remove('checked'));
    document.getElementById('pTypeInfo').style.display = 'none';
    document.getElementById('pLayoutPlaceholder').style.display = 'block';
```

Also find (same method, a few lines above):
```javascript
    ['personality','goal','pItems','hashtag','topic'].forEach(k => {
      this.chipData[k] = [];
      const ids = { personality:'personalityChips', goal:'goalChips', pItems:'pItemsChips', hashtag:'hashtagChips', topic:'topicChips' };
      if (ids[k]) document.querySelectorAll(`#${ids[k]} .chip`).forEach(c => c.remove());
    });
```

Replace with:
```javascript
    ['personality','goal','pItems','hashtag','topic'].forEach(k => { this.chipData[k] = []; });
```

(This keeps `chipData` reset for hygiene but drops the now-pointless `querySelectorAll` over chip-wrap IDs that no longer exist anywhere in the DOM after this and Task 1.)

- [ ] **Step 6: Update `collectPost()` in `js/app.js`**

Find:
```javascript
  collectPost() {
    const contentNotesData = {
      content_notes: f('pContentNotes'),
      free_text: f('pFreeText'),
      unified_layout: document.getElementById('pUnifiedLayout')?.checked || false
    };
    return {
      logo_pos: getRadio('postLogoPos'),
      post_type: this.postType,
      formats: [...this.postFmts],
      headline: f('pHeadline'), subtitle: f('pSubtitle'), cta: f('pCta'),
      content_notes: JSON.stringify(contentNotesData),
      items: this.chipData.pItems,
      stat_number: f('pStatNum'), stat_context: f('pStatCtx'), stat_source: f('pStatSrc'),
      comp_a: f('pCompA'), comp_b: f('pCompB'),
      anuncio_price: f('pAnPrice'), anuncio_benefit: f('pAnBenefit'),
      urgencia_prazo: f('pUrgPrazo'), urgencia_oque: f('pUrgOque'),
      quote_text: f('pQuoteText'), quote_author: f('pQuoteAuthor'), quote_role: f('pQuoteRole'),
      article_body: f('pArtBody'),
      layout_1x1_text_pos: f('pL1TextPos'), layout_1x1_bg: f('pL1Bg'), layout_1x1_notes: f('pL1Notes'),
      layout_4x5_text_pos: f('pL4TextPos'), layout_4x5_bg: f('pL4Bg'), layout_4x5_notes: f('pL4Notes'),
      layout_9x16_text_pos: f('pL9TextPos'), layout_9x16_bg: f('pL9Bg'), layout_9x16_notes: f('pL9Notes'),
      forbidden: f('pForbidden'), delivery_format: f('pDelivery'), font_base64: f('pFontB64'),
      final_notes: f('pFinalNotes'),
    };
  },
```

Replace with:
```javascript
  collectPost() {
    const contentNotesData = {
      content_notes: f('pContentNotes'),
      free_text: f('pFreeText'),
      unified_layout: document.getElementById('pUnifiedLayout')?.checked || false
    };
    return {
      logo_pos: getRadio('postLogoPos'),
      post_type: this.postType,
      formats: [...this.postFmts],
      content_notes: JSON.stringify(contentNotesData),
      layout_1x1_text_pos: f('pL1TextPos'), layout_1x1_bg: f('pL1Bg'), layout_1x1_notes: f('pL1Notes'),
      layout_4x5_text_pos: f('pL4TextPos'), layout_4x5_bg: f('pL4Bg'), layout_4x5_notes: f('pL4Notes'),
      layout_9x16_text_pos: f('pL9TextPos'), layout_9x16_bg: f('pL9Bg'), layout_9x16_notes: f('pL9Notes'),
      final_notes: f('pFinalNotes'),
    };
  },
```

(`final_notes` stays here deliberately — Task 4 repurposes the `pFinalNotes` field/id as the single "Obrigatoriedades" field, still backed by the same `final_notes` column. `forbidden`/`delivery_format`/`font_base64` are dropped per Task 4's removal of those fields.)

- [ ] **Step 7: Update `fillPost()` in `js/app.js`**

Find:
```javascript
    if (p.formats) p.formats.forEach(fmt => { if (!this.postFmts.has(fmt)) togglePostFmt(fmt); });
    set('pHeadline', p.headline); set('pSubtitle', p.subtitle); set('pCta', p.cta);
    let content_notes = '', free_text = '', unified_layout = false;
```

Replace with:
```javascript
    if (p.formats) p.formats.forEach(fmt => { if (!this.postFmts.has(fmt)) togglePostFmt(fmt); });
    let content_notes = '', free_text = '', unified_layout = false;
```

Find:
```javascript
    set('pStatNum', p.stat_number); set('pStatCtx', p.stat_context); set('pStatSrc', p.stat_source);
    set('pCompA', p.comp_a); set('pCompB', p.comp_b);
    set('pAnPrice', p.anuncio_price); set('pAnBenefit', p.anuncio_benefit);
    set('pUrgPrazo', p.urgencia_prazo); set('pUrgOque', p.urgencia_oque);
    set('pQuoteText', p.quote_text); set('pQuoteAuthor', p.quote_author); set('pQuoteRole', p.quote_role);
    set('pArtBody', p.article_body);
    set('pL1TextPos', p.layout_1x1_text_pos); set('pL1Bg', p.layout_1x1_bg); set('pL1Notes', p.layout_1x1_notes);
    set('pL4TextPos', p.layout_4x5_text_pos); set('pL4Bg', p.layout_4x5_bg); set('pL4Notes', p.layout_4x5_notes);
    set('pL9TextPos', p.layout_9x16_text_pos); set('pL9Bg', p.layout_9x16_bg); set('pL9Notes', p.layout_9x16_notes);
    set('pForbidden', p.forbidden); set('pDelivery', p.delivery_format); set('pFontB64', p.font_base64);
    set('pFinalNotes', p.final_notes);
    if (p.items) this.fillChips('pItems', p.items, 'pItemsChips', 'pItemsInput');
    
    if (typeof syncUnifiedLayout === 'function') {
```

Replace with:
```javascript
    set('pL1TextPos', p.layout_1x1_text_pos); set('pL1Bg', p.layout_1x1_bg); set('pL1Notes', p.layout_1x1_notes);
    set('pL4TextPos', p.layout_4x5_text_pos); set('pL4Bg', p.layout_4x5_bg); set('pL4Notes', p.layout_4x5_notes);
    set('pL9TextPos', p.layout_9x16_text_pos); set('pL9Bg', p.layout_9x16_bg); set('pL9Notes', p.layout_9x16_notes);
    set('pFinalNotes', p.final_notes);

    if (typeof syncUnifiedLayout === 'function') {
```

- [ ] **Step 8: Fix `updateProgress()`'s Post section in `js/ui.js` (would otherwise reference removed `pHeadline`/`pSubtitle`/`pCta`)**

Find:
```javascript
  const pReq = ['pHeadline'];
  const pOpt = ['pSubtitle','pCta'];
  let pScore = 0, pMax = pReq.length * 2 + pOpt.length + 2;
  pReq.forEach(id => { if (f(id)) pScore += 2; });
  pOpt.forEach(id => { if (f(id)) pScore += 1; });
  if (app.postType) pScore += 2;
  if (app.postFmts.size) pScore += 1;
  const pReqFilled = pReq.filter(id => f(id)).length + (app.postType ? 1 : 0);
  const pPct = Math.round((pScore / pMax) * 100);
  document.getElementById('postProgFill').style.width = pPct + '%';
  document.getElementById('postProgLabel').textContent = `${pReqFilled}/${pReq.length + 1} obrig.`;
  document.getElementById('postProgPct').textContent = pPct + '%';
```

Replace with:
```javascript
  let pScore = 0, pMax = 4;
  if (app.postType) pScore += 2;
  if (f('pFreeText')) pScore += 1;
  if (app.postFmts.size) pScore += 1;
  const pReqFilled = app.postType ? 1 : 0;
  const pPct = Math.round((pScore / pMax) * 100);
  document.getElementById('postProgFill').style.width = pPct + '%';
  document.getElementById('postProgLabel').textContent = `${pReqFilled}/1 obrig.`;
  document.getElementById('postProgPct').textContent = pPct + '%';
```

- [ ] **Step 9: Update the `p4` content array in `buildPost()` in `js/prompts.js`**

Find:
```javascript
    const p4 = [];
    if (f('pHeadline')) p4.push(`HEADLINE:       ${f('pHeadline')}`);
    if (f('pSubtitle')) p4.push(`SUBTÍTULO:      ${f('pSubtitle')}`);
    if (f('pCta'))      p4.push(`CTA:            ${f('pCta')}`);
    if (app.postType) {
      const cfg = app.postTypeConfig[app.postType];
      if (['checklist','passo-a-passo'].includes(app.postType) && app.chipData.pItems.length)
        p4.push(`ITENS:\n${app.chipData.pItems.map((v,i) => `  ${i+1}. ${v}`).join('\n')}`);
      if (app.postType === 'estatistica') { if(f('pStatNum'))p4.push(`NÚMERO:         ${f('pStatNum')}`); if(f('pStatCtx'))p4.push(`CONTEXTO:       ${f('pStatCtx')}`); if(f('pStatSrc'))p4.push(`FONTE:          ${f('pStatSrc')}`); }
      if (['antes-depois','comparativo'].includes(app.postType)) { if(f('pCompA'))p4.push(`${cfg.compA.toUpperCase()}:${' '.repeat(Math.max(1,14-cfg.compA.length))}${f('pCompA')}`); if(f('pCompB'))p4.push(`${cfg.compB.toUpperCase()}:${' '.repeat(Math.max(1,14-cfg.compB.length))}${f('pCompB')}`); }
      if (app.postType === 'anuncio') { if(f('pAnPrice'))p4.push(`PREÇO:          ${f('pAnPrice')}`); if(f('pAnBenefit'))p4.push(`BENEFÍCIO:      ${f('pAnBenefit')}`); }
      if (app.postType === 'urgencia') { if(f('pUrgPrazo'))p4.push(`PRAZO:          ${f('pUrgPrazo')}`); if(f('pUrgOque'))p4.push(`O QUE ACABA:    ${f('pUrgOque')}`); }
      if (['depoimento','citacao'].includes(app.postType)) { if(f('pQuoteText'))p4.push(`CITAÇÃO:        "${f('pQuoteText')}"`); if(f('pQuoteAuthor'))p4.push(`AUTOR:          ${f('pQuoteAuthor')}`); if(f('pQuoteRole'))p4.push(`CARGO:          ${f('pQuoteRole')}`); }
      if (app.postType === 'mini-artigo' && f('pArtBody')) p4.push(`CORPO:          ${f('pArtBody')}`);
    }
    if (f('pContentNotes')) p4.push(`NOTAS:          ${f('pContentNotes')}`);
    const freeText = f('pFreeText');
    if (freeText) p4.push(`TEXTO LIVRE / COPY DIRETA:\n${freeText}`);
    if (p4.length) p.push(`## CONTEÚDO\n${p4.join('\n')}`);
```

Replace with:
```javascript
    const p4 = [];
    const freeText = f('pFreeText');
    if (freeText) p4.push(`TEXTO LIVRE / COPY DIRETA:\n${freeText}`);
    if (f('pContentNotes')) p4.push(`NOTAS:          ${f('pContentNotes')}`);
    if (p4.length) p.push(`## CONTEÚDO\n${p4.join('\n')}`);
```

- [ ] **Step 10: Run syntax checks**

```bash
node --check js/app.js
node --check js/ui.js
node --check js/prompts.js
```
Expected: no output, exit code 0 for all three.

- [ ] **Step 11: Verify HTML and manual browser check**

```bash
python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"
grep -c 'id="pDynamic"\|id="pFieldItems"\|id="pFieldStat"\|id="pFieldComp"\|id="pFieldAnuncio"\|id="pFieldUrg"\|id="pFieldQuote"\|id="pFieldArt"\|id="pHeadline"\|id="pSubtitle"\|id="pCta"' index.html
```
Expected: div counts equal; last grep returns `0`.

In the browser: select each of the 13 post types in turn — confirm no dynamic field block ever appears below the type grid, the type-selected confirmation banner still shows, and `app.postType` still drives the `POST_COMPOSITION_PATTERNS` directive (check the generated Post prompt's `# INSTRUÇÕES DE SAÍDA` section still contains a `PADRÃO OBRIGATÓRIO PARA ESTE POST:` line that changes when you switch type). Confirm "Conteúdo do Post" shows only "Texto livre / Copy do Post" and "Observações de conteúdo".

- [ ] **Step 12: Commit**

```bash
git add index.html js/app.js js/ui.js js/prompts.js
git commit -m "feat(forms): simplificar Conteúdo do Post — remover Headline/Subtítulo/CTA e campos dinâmicos por tipo"
```

---

### Task 4: Rename Post "Restrições & Entrega" to "Obrigatoriedades" (single field)

**Files:**
- Modify: `index.html` (section `p5`)
- Modify: `js/prompts.js` (`buildPost()`'s `p6` entrega array)

**Interfaces:** none new. Depends on Task 3's `collectPost()`/`fillPost()` already keeping `final_notes` as the only entrega-related field.

- [ ] **Step 1: Simplify section `p5` in `index.html`**

Find:
```html
      <section class="section" id="p5">
        <div class="section-header"><div><div class="section-num post-num">06</div><h2 class="section-title">Restrições & Entrega</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">O que não fazer</label><textarea id="pForbidden" placeholder="Ex: Não usar fundo branco neste post. Não empilar mais de 3 elementos no centro da imagem." oninput="markDirty()"></textarea></div></div>
        
        <!-- Toggle de Configurações Avançadas -->
        <button type="button" class="btn btn-ghost" id="pToggleAdvancedBtn" onclick="togglePostAdvanced()" style="margin-bottom:14px; width:100%; justify-content:center;">
          <span>Mostrar Configurações Avançadas de Exportação</span>
        </button>

        <div id="pAdvancedOptions" class="advanced-options-group" style="display:none; margin-bottom:14px;">
          <div class="field-group cols-2">
            <div class="field"><label class="field-label">Formato de entrega</label><select id="pDelivery" oninput="markDirty()"><option value="HTML standalone por formato">HTML standalone por formato</option><option value="Um único HTML com todos os formatos">Um HTML com todos os formatos</option><option value="HTML com botão exportar PNG">HTML com botão exportar PNG</option></select></div>
            <div class="field"><label class="field-label">Fontes</label><select id="pFontB64" oninput="markDirty()"><option value="Embutir fontes em base64 no CSS">Embutir em base64</option><option value="Carregar via Google Fonts link">Via Google Fonts link</option></select></div>
          </div>
        </div>

        <div class="field-group"><div class="field"><label class="field-label">Notas finais</label><textarea id="pFinalNotes" placeholder="Ex: Entregar versão 1:1 primeiro para validação. Já deixar estrutura pronta para adaptar 9:16." oninput="markDirty()"></textarea></div></div>
      </section>
```

Replace with:
```html
      <section class="section" id="p5">
        <div class="section-header"><div><div class="section-num post-num">06</div><h2 class="section-title">Obrigatoriedades</h2></div></div>
        <div class="field-group"><div class="field"><label class="field-label">Obrigatoriedades</label><textarea id="pFinalNotes" placeholder="Ex: Sempre incluir o telefone de contato no rodapé. Usar sempre a logo no topo." oninput="markDirty()"></textarea></div></div>
      </section>
```

- [ ] **Step 2: Update the `p6` entrega array in `buildPost()` in `js/prompts.js`**

Find:
```javascript
    const p6 = [];
    if (f('pForbidden')) p6.push(`PROIBIDO:       ${f('pForbidden')}`);
    if (f('pDelivery'))  p6.push(`ENTREGA:        ${f('pDelivery')}`);
    if (f('pFontB64'))   p6.push(`FONTES:         ${f('pFontB64')}`);
    if (f('pFinalNotes'))p6.push(`NOTAS:          ${f('pFinalNotes')}`);
    if (p6.length) p.push(`## ENTREGA\n${p6.join('\n')}`);
```

Replace with:
```javascript
    const p6 = [];
    if (f('pFinalNotes'))p6.push(`OBRIGATORIEDADES: ${f('pFinalNotes')}`);
    if (p6.length) p.push(`## OBRIGATORIEDADES\n${p6.join('\n')}`);
```

- [ ] **Step 3: Verify and commit**

```bash
node --check js/prompts.js
python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"
grep -c 'id="pForbidden"\|id="pToggleAdvancedBtn"\|id="pAdvancedOptions"\|id="pDelivery"\|id="pFontB64"' index.html
```
Expected: `node --check` clean; div counts equal; last grep returns `0`.

Manually: open the Post tab, confirm the last section is titled "Obrigatoriedades" with a single textarea, and that filling it makes a `## OBRIGATORIEDADES` section with an `OBRIGATORIEDADES:` line appear in the generated prompt.

```bash
git add index.html js/prompts.js
git commit -m "feat(forms): renomear Restrições & Entrega do Post para Obrigatoriedades (campo único)"
```

---

### Task 5: Remove the Post Simulador Visual

**Files:**
- Modify: `index.html` (Post `<aside class="preview-panel">`)
- Modify: `css/style.css` (remove unused `.post-preview-*` and `.advanced-options-group` rules)
- Modify: `js/ui.js` (remove `updateVisualPreview()`, `setPreviewRatio()`, and the call to `updateVisualPreview()` in `updatePreviews()`)

**Interfaces:** none new. `.advanced-options-group` is safe to remove only because Task 2 and Task 4 already removed both of its only two usages (`cAdvancedOptions`, `pAdvancedOptions`) — do not run this task before Tasks 2 and 4 are committed.

- [ ] **Step 1: Remove the Simulador Visual markup from `index.html`**

Find:
```html
    <aside class="preview-panel">
      <!-- Simulador Visual do Post -->
      <div class="post-preview-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;width:100%;">
          <div class="preview-label" style="margin:0;">Simulador Visual</div>
          <div class="post-preview-toggle-wrap" id="postPreviewToggles">
            <button type="button" class="btn btn-ghost active" onclick="setPreviewRatio('1x1')">1:1</button>
            <button type="button" class="btn btn-ghost" onclick="setPreviewRatio('4x5')">4:5</button>
            <button type="button" class="btn btn-ghost" onclick="setPreviewRatio('9x16')">9:16</button>
          </div>
        </div>
        <div class="post-preview-card-wrap">
          <div class="post-preview-card" id="postPreviewCard">
            <div class="post-preview-logo" id="postPreviewLogo">logo</div>
            <div class="post-preview-content">
              <div class="post-preview-headline" id="postPreviewHeadline">Título do Post</div>
              <div class="post-preview-subtitle" id="postPreviewSubtitle">Subtítulo</div>
              <div class="post-preview-body" id="postPreviewBody"></div>
            </div>
            <div class="post-preview-footer">
              <span class="post-preview-handle" id="postPreviewHandle">@handle</span>
              <span class="post-preview-cta" id="postPreviewCta">CTA</span>
            </div>
          </div>
        </div>
      </div>

      <div><div class="preview-label">Prompt — Base + Post</div><div class="output-box" id="postOutput"><span class="empty">← Preencha os campos.</span></div></div>
```

Replace with:
```html
    <aside class="preview-panel">
      <div><div class="preview-label">Prompt — Base + Post</div><div class="output-box" id="postOutput"><span class="empty">← Preencha os campos.</span></div></div>
```

- [ ] **Step 2: Remove the unused CSS in `css/style.css`**

Find (the whole `/* ══ POST PREVIEW SIMULATOR ══ */` block through the end of `/* ══ ADVANCED OPTIONS TOGGLE ══ */`'s `.advanced-options-group` rule):
```css
/* ══ POST PREVIEW SIMULATOR ══ */
.post-preview-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 10px;
}
.post-preview-card-wrap {
  width: 100%;
  max-width: 270px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}
.post-preview-card {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  overflow: hidden;
  position: relative;
  transition: aspect-ratio 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, color 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.post-preview-logo {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0.65;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.post-preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
}
.post-preview-headline {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  word-wrap: break-word;
}
.post-preview-subtitle {
  font-size: 10px;
  opacity: 0.8;
  line-height: 1.35;
  word-wrap: break-word;
}
.post-preview-body {
  font-size: 9.5px;
  line-height: 1.35;
  margin-top: 6px;
  word-wrap: break-word;
}
.post-preview-body ul {
  padding-left: 14px;
  margin: 4px 0;
}
.post-preview-body li {
  margin-bottom: 2px;
}
.post-preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8.5px;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 8px;
  margin-top: 4px;
}
.post-preview-handle {
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.post-preview-cta {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  white-space: nowrap;
}
.post-preview-toggle-wrap {
  display: flex;
  gap: 4px;
}
.post-preview-toggle-wrap .btn-ghost {
  padding: 3px 6px !important;
  font-size: 9px !important;
  height: auto !important;
  line-height: 1 !important;
  border-radius: 3px !important;
  color: var(--muted) !important;
  border-color: var(--border) !important;
}
.post-preview-toggle-wrap .btn-ghost.active {
  border-color: var(--acc-post) !important;
  color: var(--acc-post) !important;
  background: rgba(255, 107, 53, 0.08) !important;
}

/* ══ ADVANCED OPTIONS TOGGLE ══ */
.advanced-options-group {
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.01);
  border-radius: 6px;
  padding: 16px;
  margin-top: 10px;
}
```

Replace with: *(nothing — delete the whole block)*

Before deleting, run this check to confirm `.advanced-options-group` truly has zero remaining references in HTML (it must, since Tasks 2 and 4 already removed both elements that used it):
```bash
grep -c 'advanced-options-group\|post-preview-' index.html
```
Expected: `0`. If this prints anything other than `0`, STOP — do not delete the CSS — and report which file/line still references it (Tasks 2/4 may not be committed yet).

- [ ] **Step 3: Remove `updateVisualPreview()` and `setPreviewRatio()` from `js/ui.js`**

Use the Read tool to view `js/ui.js` and locate the exact line containing `function updateVisualPreview() {` and the exact line containing `function setPreviewRatio(ratio) {`. Confirm `setPreviewRatio`'s closing `}` is the last line of the file. Delete everything from `function updateVisualPreview() {` (inclusive) through the end of the file (the closing `}` of `setPreviewRatio`) — this removes both functions in one contiguous block, since `setPreviewRatio` immediately follows `updateVisualPreview` with nothing else between them.

Then, in the same file, find (inside `updatePreviews()`):
```javascript
  updateProgress();
  updateVisualPreview();
}
```

Replace with:
```javascript
  updateProgress();
}
```

- [ ] **Step 4: Run syntax checks**

```bash
node --check js/ui.js
node --check js/app.js
```
Expected: no output, exit code 0 for both (checking `js/app.js` too since it's unmodified by this task but worth confirming nothing else broke).

```bash
grep -n "updateVisualPreview\|setPreviewRatio\|postPreviewCard\|postPreviewToggles" js/ui.js js/app.js index.html
```
Expected: no matches anywhere.

```bash
python3 -c "import re; s=open('css/style.css').read(); print(s.count('{'), s.count('}'))"
```
Expected: both numbers equal.

- [ ] **Step 5: Manual browser verification**

Open the Post tab. Confirm the right-side panel now shows only the prompt output box and the "Copiar prompt" button — no "Simulador Visual" card, no 1:1/4:5/9:16 toggle buttons.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css js/ui.js
git commit -m "feat(forms): remover Simulador Visual do Post"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Identidade simplification (Task 1) ✓. Carrossel Configurações Avançadas removal (Task 2) ✓. Post dynamic-fields + Headline/Subtítulo/CTA removal, type selector preserved (Task 3) ✓. Post Obrigatoriedades single-field rename (Task 4) ✓. Simulador Visual removal (Task 5) ✓. Data-safety principle (omit keys, don't blank them) applied in Tasks 1 (`collectBrand`), 2 (`collectCarousel`), 3 (`collectPost`) ✓. Sequential section renumbering in both UI (Task 1 Steps 2-4) and prompt (Task 1 Step 6) ✓. `POST_COMPOSITION_PATTERNS` determinism explicitly preserved and verified in Task 3 Step 11 ✓.
- **Progress bar fix (gap found and corrected inline):** `updateProgress()`'s Base section referenced `bToneMain`/`bAudience` (removed in Task 1) and chip-length bonuses that could never fire again — fixed as Task 1 Step 9, inserted between the old `fillBrand()` step and the syntax-check step (renumbered the rest of Task 1 accordingly: Steps 10–12). `updateProgress()`'s Carrossel section referenced `cDelivery`/`cFontB64` (removed in Task 2) — fixed as Task 2 Step 4, with the old "verify and commit" step renumbered to Step 5. Both fixes are now part of their task's own step list and `js/ui.js` is included in those tasks' `Files`/commit lists, not left as a trailing note.
- **Type/name consistency checked:** `pFinalNotes` keeps the same id/column (`final_notes`) across Task 3 (kept in `collectPost`/`fillPost`) and Task 4 (relabeled in HTML and in the prompt's entrega line) — no renaming mismatch. `postTypeConfig[type].label` is the only property read anywhere after Task 3 (confirmed no other code reads `.fields`/`.dynLabel`/`.compA`/`.compB`/`.qA`/`.qR`).
