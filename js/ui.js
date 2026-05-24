// UI Helpers

function f(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }
function getRadio(name) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : ''; }

function syncColor(pickId, hexId) {
  const t = document.getElementById(hexId).value;
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) document.getElementById(pickId).value = t;
  markDirty();
}

function selectRadio(el, gridId) {
  document.querySelectorAll(`#${gridId} .radio-item, #${gridId} .logo-pos-item`).forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  const radio = el.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
  markDirty();
  setTimeout(updatePreviews, 50);
}

// ── CHIPS ──
function addChip(e, wrapId, key) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const input = e.target, val = input.value.trim();
  if (!val) return;
  app.chipData[key].push(val);
  const wrap = document.getElementById(wrapId);
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.innerHTML = `${val}<span class="chip-x" onclick="removeChip(this,'${key}')">×</span>`;
  wrap.insertBefore(chip, input);
  input.value = '';
  markDirty();
  updatePreviews();
}

function removeChip(el, key) {
  const chip = el.parentElement, val = chip.childNodes[0].textContent.trim();
  app.chipData[key] = app.chipData[key].filter(v => v !== val);
  chip.remove();
  markDirty();
  updatePreviews();
}

// ── FONT LOADER ──
const fontCache = {};
let fontTimers = {};

function loadFont(inputId, previewId, statusId) {
  const name = f(inputId);
  const preview = document.getElementById(previewId), status = document.getElementById(statusId);
  if (!name) { status.textContent = ''; preview.style.fontFamily = ''; return; }
  clearTimeout(fontTimers[inputId]);
  fontTimers[inputId] = setTimeout(async () => {
    status.textContent = '⏳';
    if (fontCache[name] === 'ok') { preview.style.fontFamily = `'${name}',serif`; status.textContent = '✓'; status.style.color = 'var(--accent2)'; return; }
    if (fontCache[name] === 'err') { status.textContent = '✗'; status.style.color = 'var(--red)'; return; }
    try {
      const slug = name.replace(/ /g, '+'), lid = `gf-${slug}`;
      if (!document.getElementById(lid)) {
        const l = document.createElement('link'); l.id = lid; l.rel = 'stylesheet';
        l.href = `https://fonts.googleapis.com/css2?family=${slug}:ital,wght@0,400;0,700;1,400&display=swap`;
        document.head.appendChild(l);
      }
      await Promise.race([document.fonts.load(`700 20px '${name}'`), new Promise(r => setTimeout(r, 3000))]);
      if (document.fonts.check(`400 20px '${name}'`) || document.fonts.check(`700 20px '${name}'`)) {
        fontCache[name] = 'ok'; preview.style.fontFamily = `'${name}',serif`;
        status.textContent = '✓'; status.style.color = 'var(--accent2)';
      } else throw new Error();
    } catch (e) {
      fontCache[name] = 'err'; preview.style.fontFamily = '';
      status.textContent = '✗'; status.style.color = 'var(--red)';
    }
  }, 600);
}



// ── TOAST ──
function toast(msg, type = 'success') {
  let el = document.getElementById('toastEl');
  if (!el) { el = document.createElement('div'); el.id = 'toastEl'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── COPY ──
function showCopied(id) {
  const el = document.getElementById(id); el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200);
}

function baseCopy() {
  const p = prompts.buildBase(); if (!p) { toast('Preencha pelo menos o nome da marca.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => showCopied('baseCopyMsg'));
}

function carCopy() {
  const p = prompts.buildCarousel(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => showCopied('carCopyMsg'));
}

function postCopy() {
  const p = prompts.buildPost(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => showCopied('postCopyMsg'));
}

// ── UPDATE PREVIEWS ──
function updatePreviews() {
  const bp = prompts.buildBase();
  document.getElementById('baseOutput').innerHTML = bp ? prompts.highlight(bp, 'sec-base') : '<span class="empty">← Preencha os campos.</span>';

  const cp = prompts.buildCarousel();
  document.getElementById('carOutput').innerHTML = cp ? prompts.highlight(cp, 'sec-car') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  const pp = prompts.buildPost();
  document.getElementById('postOutput').innerHTML = pp ? prompts.highlight(pp, 'sec-post') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  updateProgress();
}

function updateProgress() {
  const bIds = ['bName','bHandle','bTagline','bNiche','cPrimaryHex','cSecondaryHex','bFontDisplay','bFontBody','bSizeTitle','bSizeSubtitle','bSizeBody','bToneMain','bBgRhythm','bAudience','bReferences'];
  let bf = bIds.filter(id => f(id)).length;
  if (app.chipData.personality.length) bf++;
  if (app.chipData.goal.length) bf++;
  if (getRadio('styleVisual')) bf++;
  const bPct = Math.round((bf / (bIds.length + 3)) * 100);
  document.getElementById('baseProgFill').style.width = bPct + '%';
  document.getElementById('baseProgLabel').textContent = bf + ' campos';
  document.getElementById('baseProgPct').textContent = bPct + '%';

  const cIds = ['cFormat','cSlideCount','cSequence','cDelivery','cFontB64'];
  let cf = cIds.filter(id => f(id)).length;
  if (getRadio('carLogoPosHero')) cf++; if (getRadio('carLogoPosCta')) cf++;
  const cPct = Math.round((cf / (cIds.length + 2)) * 100);
  document.getElementById('carProgFill').style.width = cPct + '%';
  document.getElementById('carProgLabel').textContent = cf + ' campos';
  document.getElementById('carProgPct').textContent = cPct + '%';

  const pIds = ['pHeadline','pSubtitle','pCta'];
  let pf = pIds.filter(id => f(id)).length;
  if (app.postType) pf++; if (app.postFmts.size) pf++;
  const pPct = Math.round((pf / (pIds.length + 2)) * 100);
  document.getElementById('postProgFill').style.width = pPct + '%';
  document.getElementById('postProgLabel').textContent = pf + ' campos';
  document.getElementById('postProgPct').textContent = pPct + '%';
}

// ── TAB SWITCHING ──
function switchTab(tab) {
  ['base','car','post'].forEach(t => {
    document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.toggle('active', t === tab);
    document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`).className = `tab-btn${t === tab ? ' active-' + t : ''}`;
  });
  app.currentTab = tab;
}

// ── POST TYPE ──
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

function togglePostFmt(fmt) {
  const card = document.getElementById(`pFmt${fmt}`);
  if (app.postFmts.has(fmt)) { app.postFmts.delete(fmt); card.classList.remove('checked'); }
  else { app.postFmts.add(fmt); card.classList.add('checked'); }
  const has = app.postFmts.size > 0;
  document.getElementById('pLayoutPlaceholder').style.display = has ? 'none' : 'block';
  ['1x1','4x5','9x16'].forEach(id => document.getElementById(`pLayout${id}`).style.display = app.postFmts.has(id) ? 'block' : 'none');
  markDirty(); updatePreviews();
}

// ── DIRTY / SAVE STATUS ──
let saveTimer = null;

function markDirty() {
  app.isDirty = true;
  ['saveStatus','saveStatusCar','saveStatusPost'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '● Alterações não salvas'; el.className = 'save-status dirty'; }
  });
  if (!app.isApplyingPreset) {
    app.activeCarouselPresetIndex = null;
    app.activePostPresetIndex = null;
    renderPresets();
  }
  updatePreviews();
  // Autosave after 2 seconds of inactivity
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (app.currentBrandId) app.save(); }, 2000);
}

function setSaveStatus(status) {
  const map = { saving: '● Salvando...', saved: '● Salvo', error: '● Erro ao salvar' };
  const cls = { saving: 'saving', saved: '', error: 'dirty' };
  ['saveStatus','saveStatusCar','saveStatusPost'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = map[status]; el.className = 'save-status ' + (cls[status] || ''); }
  });
}

// ── FIELD TOOLTIPS ──
const FIELD_TIPS = {
  // Base — Identidade
  bName:        'Nome completo como será exibido nos posts e no prompt gerado.',
  bHandle:      'Seu @ do Instagram sem espaços. Ex: @suamarca',
  bTagline:     'Frase curta que resume o posicionamento. Aparece em posts de identidade.',
  bNiche:       'Setor de atuação da marca. Usado para contextualizar tom e referências.',
  bPositioning: 'Como a marca quer ser percebida: autoridade, proximidade, inovação etc.',
  bLogoUrl:     'Link direto para PNG com fundo transparente. No Dropbox: botão direito → Copiar link direto.',
  // Base — Paleta
  bColorsNotes: 'Regras de uso das cores. Ex: primária nunca sobre fundo claro.',
  // Base — Tipografia
  bFontDisplay:  'Nome exato como aparece no Google Fonts. Usada em títulos e capas.',
  bFontBody:     'Fonte para textos corridos e legendas. Deve ter boa legibilidade em tamanhos pequenos.',
  bSizeTitle:    'Faixa de tamanho em px para títulos principais. Ex: 28–36px.',
  bSizeSubtitle: 'Faixa de tamanho em px para subtítulos e destaques secundários. Ex: 16–20px.',
  bSizeBody:     'Faixa de tamanho em px para textos de leitura. Ex: 13–15px.',
  bWeightTitle:  'Espessura da fonte nos títulos. Bold+ para alto impacto, Medium para elegância.',
  bItalicUse:    'Define quando o itálico pode ser usado na comunicação da marca.',
  bTypoNotes:    'Regras específicas. Ex: títulos sempre em caixa alta, nunca misturar 3 fontes.',
  // Base — Tom de voz
  personalityInput: 'Adjetivos que descrevem como a marca fala. Pressione Enter após cada um.',
  bToneMain:    'Registro geral da comunicação da marca.',
  bToneReader:  'Como a marca se dirige ao leitor no texto.',
  bToneNever:   'Comportamentos de comunicação proibidos. Um por linha.',
  bToneExample: 'Headline real aprovada que exemplifica o tom e estilo da marca.',
  // Base — Visual
  bBorderUse:    'Papel das bordas no design. De decorativas a estruturais.',
  bCornerRadius: 'Grau de arredondamento de cards e botões.',
  bBgRhythm:     'Padrão de alternância escuro/claro entre os slides do carrossel.',
  bGradientUse:  'Quando e onde gradientes da paleta podem ser usados.',
  bVisualSig:    'Elementos recorrentes que identificam a marca visualmente. Ex: linha fina na base, número de slide em destaque.',
  // Base — Audiência
  bAudience: 'Quem é a audiência: cargo, faixa etária, contexto de vida ou trabalho.',
  bPain:     'O maior problema ou frustração que o público enfrenta.',
  bDesire:   'O que o público mais quer conquistar ou resolver.',
  goalInput: 'Meta de cada post. Ex: gerar leads, educar, aumentar autoridade. Enter para adicionar.',
  // Base — Referências
  bReferences: 'Marcas, perfis ou sites com visual próximo ao desejado.',
  bForbidden:  'O que nunca pode aparecer em nenhum post desta marca.',
  bCanonical:  'Post ou carrossel já aprovado que serve como padrão de qualidade.',
  bFinalNotes: 'Observações gerais que o Claude deve considerar ao gerar conteúdo.',
  // Carrossel — Estrutura
  cFormat:     'Proporção padrão dos slides deste carrossel.',
  cSlideCount: 'Quantidade de slides por carrossel. Entre 5 e 10 é o ideal para retenção.',
  cSequence:   'Ordem e função de cada slide. Define a narrativa do carrossel.',
  cFixedEl:    'Elementos que se repetem em todos os slides. Ex: logo, número, linha decorativa.',
  // Carrossel — Slides Especiais
  cSlide1:   'Layout e hierarquia do slide de abertura. É o mais importante para o swipe.',
  cSlideCta: 'Layout do slide final. Deve converter: direcionar para uma ação clara.',
  cNotes:    'Instruções adicionais: ritmo, limite de palavras por slide, variações.',
  // Carrossel — Entrega
  cForbidden:  'Restrições visuais ou de conteúdo específicas para este carrossel.',
  cDelivery:   'Como o código HTML do carrossel será estruturado na entrega.',
  cFontB64:    'Como as fontes serão carregadas no arquivo HTML entregue.',
  cFinalNotes: 'Últimas instruções antes de o Claude gerar o código do carrossel.',
  // Post — Conteúdo
  pHeadline:     'Texto de maior destaque. Deve capturar atenção em 3 segundos.',
  pSubtitle:     'Complementa ou contextualiza a headline.',
  pCta:          'Chamada para ação. Ex: "Salve este post", "Acesse o link na bio".',
  pContentNotes: 'Instruções específicas sobre elementos, destaques ou tom deste post.',
  // Post — Campos dinâmicos
  pStatNum:    'Número ou porcentagem principal que será exibido em destaque.',
  pStatCtx:    'Frase que contextualiza o número. Ex: "das autoescolas não controlam inadimplência."',
  pStatSrc:    'Fonte da estatística para dar credibilidade. Ex: IBGE 2024.',
  pAnPrice:    'Preço ou condição da oferta. Ex: R$ 197/mês ou 3× sem juros.',
  pAnBenefit:  'Principal benefício ou proposta de valor da oferta.',
  pUrgPrazo:   'Prazo ou data limite da oferta.',
  pUrgOque:    'O que acaba: vagas, desconto, bônus etc.',
  pQuoteText:  'Texto literal da citação ou depoimento.',
  pQuoteAuthor:'Nome de quem disse ou escreveu.',
  pQuoteRole:  'Cargo, empresa ou contexto de quem falou.',
  pArtBody:    'Corpo do mini artigo. Máximo de 3–4 linhas para caber no post.',
  // Post — Entrega
  pForbidden:  'Restrições visuais ou de conteúdo específicas para este post.',
  pDelivery:   'Como o código HTML do post será estruturado na entrega.',
  pFontB64:    'Como as fontes serão carregadas no arquivo HTML entregue.',
  pFinalNotes: 'Últimas instruções antes de o Claude gerar o código do post.',
  // Layout por formato
  pL1Notes: 'Instruções específicas de layout para o formato 1:1.',
  pL4Notes: 'Instruções específicas de layout para o formato 4:5.',
  pL9Notes: 'Instruções específicas de layout para o formato 9:16.',
};

function initTooltips() {
  Object.entries(FIELD_TIPS).forEach(([id, tip]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const field = el.closest('.field');
    if (!field) return;
    const label = field.querySelector('.field-label, label.field-label');
    if (!label) return;
    const icon = document.createElement('span');
    icon.className = 'field-tip';
    icon.setAttribute('data-tip', tip);
    icon.textContent = '?';
    label.appendChild(icon);
  });
}

// ── SCROLL NAV ──
function initScrollNav() {
  const bObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { document.querySelectorAll('[data-base]').forEach(n => n.classList.remove('active')); const m = document.querySelector(`[data-base="${e.target.id}"]`); if (m) m.classList.add('active'); }});
  }, { threshold: 0.3, root: document.getElementById('baseMain') });
  document.querySelectorAll('#panelBase .section').forEach(s => bObs.observe(s));
}

// ── RENDER PRESETS ──
function renderPresets() {
  const cList = document.getElementById('cPresetsList');
  const pList = document.getElementById('pPresetsList');
  
  if (cList) cList.innerHTML = '';
  if (pList) pList.innerHTML = '';
  
  const presets = (app.logoData && app.logoData.presets) ? app.logoData.presets : [];
  
  let cCount = 0;
  let pCount = 0;
  
  presets.forEach((preset, index) => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    if (preset.type === 'carousel' && index === app.activeCarouselPresetIndex) {
      card.classList.add('active');
    } else if (preset.type === 'post' && index === app.activePostPresetIndex) {
      card.classList.add('active');
    }
    card.setAttribute('onclick', `applyPreset(${index})`);
    
    // Nome do preset
    const title = document.createElement('span');
    title.className = 'preset-title';
    title.textContent = preset.name;
    card.appendChild(title);
    
    // Botão de deletar
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'preset-card-delete';
    delBtn.innerHTML = '✕';
    delBtn.setAttribute('onclick', `event.stopPropagation(); deletePreset(${index})`);
    card.appendChild(delBtn);
    
    if (preset.type === 'carousel') {
      if (cList) {
        cList.appendChild(card);
        cCount++;
      }
    } else if (preset.type === 'post') {
      if (pList) {
        pList.appendChild(card);
        pCount++;
      }
    }
  });
  
  // Mensagens vazias se não houver presets
  if (cCount === 0 && cList) {
    cList.innerHTML = '<span style="font-size:11px;color:var(--muted);grid-column:span 3;text-align:center;padding:12px 0;">Nenhum preset de carrossel salvo para esta marca.</span>';
  }
  if (pCount === 0 && pList) {
    pList.innerHTML = '<span style="font-size:11px;color:var(--muted);grid-column:span 3;text-align:center;padding:12px 0;">Nenhum preset de post salvo para esta marca.</span>';
  }
}
