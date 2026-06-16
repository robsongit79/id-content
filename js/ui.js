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
      const slug = name.replace(/ /g, '+'), lid = `gf-link-${inputId}`;
      let l = document.getElementById(lid);
      if (!l) {
        l = document.createElement('link'); l.id = lid; l.rel = 'stylesheet';
        document.head.appendChild(l);
      }
      l.href = `https://fonts.googleapis.com/css2?family=${slug}:ital,wght@0,400;0,700;1,400&display=swap`;
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
  navigator.clipboard.writeText(p).then(() => { showCopied('baseCopyMsg'); savePromptHistory('base', p); });
}

function carCopy() {
  const p = prompts.buildCarousel(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => { showCopied('carCopyMsg'); savePromptHistory('car', p); });
}

function postCopy() {
  const p = prompts.buildPost(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => { showCopied('postCopyMsg'); savePromptHistory('post', p); });
}

// ── UPDATE PREVIEWS ──
function updatePreviews() {
  const bp = prompts.buildBase();
  document.getElementById('baseOutput').innerHTML = bp ? prompts.highlight(bp, 'sec-base') : '<span class="empty">← Preencha os campos.</span>';

  const cp = prompts.buildCarousel();
  document.getElementById('carOutput').innerHTML = cp ? prompts.highlight(cp, 'sec-car') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  const pp = prompts.buildPost();
  document.getElementById('postOutput').innerHTML = pp ? prompts.highlight(pp, 'sec-post') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  const activeBrandNameEl = document.getElementById('activeBrandName');
  if (activeBrandNameEl && app.currentBrandId) {
    activeBrandNameEl.textContent = f('bName') || 'Sem nome';
  }

  updateBrandSummary();
  updateProgress();
}

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

  const cReq = ['cFormat','cSlideCount','cSequence'];
  const cOpt = ['cDelivery','cFontB64'];
  let cScore = 0, cMax = cReq.length * 2 + cOpt.length + 2;
  cReq.forEach(id => { if (f(id)) cScore += 2; });
  cOpt.forEach(id => { if (f(id)) cScore += 1; });
  if (getRadio('carLogoPosHero')) cScore += 1;
  if (getRadio('carLogoPosCta')) cScore += 1;
  const cReqFilled = cReq.filter(id => f(id)).length;
  const cPct = Math.round((cScore / cMax) * 100);
  document.getElementById('carProgFill').style.width = cPct + '%';
  document.getElementById('carProgLabel').textContent = `${cReqFilled}/${cReq.length} obrig.`;
  document.getElementById('carProgPct').textContent = cPct + '%';

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
  
  syncUnifiedLayout();
  markDirty(); updatePreviews();
}

function syncUnifiedLayout() {
  const isUnified = document.getElementById('pUnifiedLayout')?.checked;
  const layoutUnified = document.getElementById('pLayoutUnified');
  const hasFormats = app.postFmts.size > 0;
  
  if (layoutUnified) {
    layoutUnified.style.display = (isUnified && hasFormats) ? 'block' : 'none';
  }
  
  // Mostrar/ocultar layouts individuais com base no estado unificado e seleção de formato
  ['1x1','4x5','9x16'].forEach(id => {
    const el = document.getElementById(`pLayout${id}`);
    if (el) {
      el.style.display = (!isUnified && app.postFmts.has(id) && hasFormats) ? 'block' : 'none';
    }
  });

  if (!isUnified) return;

  const textPos = document.getElementById('pUnifiedTextPos')?.value || '';
  const bg = document.getElementById('pUnifiedBg')?.value || '';
  const notes = document.getElementById('pUnifiedNotes')?.value || '';

  // Propagar os valores para os inputs reais dos formatos selecionados
  ['1', '4', '9'].forEach(num => {
    const textPosEl = document.getElementById(`pL${num}TextPos`);
    const bgEl = document.getElementById(`pL${num}Bg`);
    const notesEl = document.getElementById(`pL${num}Notes`);
    
    if (textPosEl) textPosEl.value = textPos;
    if (bgEl) bgEl.value = bg;
    if (notesEl) notesEl.value = notes;
  });
}

function togglePostAdvanced() {
  const adv = document.getElementById('pAdvancedOptions');
  const btn = document.getElementById('pToggleAdvancedBtn');
  if (!adv || !btn) return;
  
  if (adv.style.display === 'none') {
    adv.style.display = 'block';
    btn.querySelector('span').textContent = 'Ocultar Configurações Avançadas';
  } else {
    adv.style.display = 'none';
    btn.querySelector('span').textContent = 'Mostrar Configurações Avançadas de Exportação';
  }
}

function toggleCarAdvanced() {
  const adv = document.getElementById('cAdvancedOptions');
  const btn = document.getElementById('cToggleAdvancedBtn');
  if (!adv || !btn) return;
  
  if (adv.style.display === 'none') {
    adv.style.display = 'block';
    btn.querySelector('span').textContent = 'Ocultar Configurações Avançadas';
  } else {
    adv.style.display = 'none';
    btn.querySelector('span').textContent = 'Mostrar Configurações Avançadas de Exportação';
  }
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
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (app.currentBrandId) { setSaveStatus('saving'); app.save(); } }, 3000);
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
  // Novos campos de conteúdo
  cContent:    'Conteúdo bruto (texto, tópicos ou roteiro) que servirá de base para a geração dos slides do carrossel.',
  pFreeText:   'Caso prefira colar a copy direta do post em formato livre, cole aqui. Esse texto será enviado no prompt.',
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

  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { document.querySelectorAll('[data-car]').forEach(n => n.classList.remove('active')); const m = document.querySelector(`[data-car="${e.target.id}"]`); if (m) m.classList.add('active'); }});
  }, { threshold: 0.3, root: document.getElementById('carMain') });
  document.querySelectorAll('#panelCar .section').forEach(s => cObs.observe(s));

  const pObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { document.querySelectorAll('[data-post]').forEach(n => n.classList.remove('active')); const m = document.querySelector(`[data-post="${e.target.id}"]`); if (m) m.classList.add('active'); }});
  }, { threshold: 0.3, root: document.getElementById('postMain') });
  document.querySelectorAll('#panelPost .section').forEach(s => pObs.observe(s));
}

// ── RENDER PRESETS ──
function renderPresets() {
  const cList = document.getElementById('cPresetsList');
  const pList = document.getElementById('pPresetsList');
  
  if (cList) cList.innerHTML = '';
  if (pList) pList.innerHTML = '';
  
  const presets = app.presets || [];
  
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

    // Color swatches
    if (preset.colors) {
      const swatches = document.createElement('div');
      swatches.className = 'preset-swatches';
      ['color_primary','color_secondary','color_accent'].forEach(k => {
        if (preset.colors[k]) {
          const dot = document.createElement('span');
          dot.className = 'preset-swatch';
          dot.style.background = preset.colors[k];
          dot.title = preset.colors[k];
          swatches.appendChild(dot);
        }
      });
      card.appendChild(swatches);
    }

    // Font name
    if (preset.fonts && preset.fonts.font_display) {
      const fontEl = document.createElement('span');
      fontEl.className = 'preset-font';
      fontEl.textContent = preset.fonts.font_display;
      card.appendChild(fontEl);
    }

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
  
  if (pCount === 0 && pList) {
    pList.innerHTML = '<span style="font-size:11px;color:var(--muted);grid-column:span 3;text-align:center;padding:12px 0;">Nenhum preset de post salvo para esta marca.</span>';
  }
}

function updateVisualPreview() {
  // Simulador removido
}

// ── CATEGORY FILTER ──
function filterPostTypes(cat) {
  document.querySelectorAll('.type-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  document.querySelectorAll('.type-card').forEach(card => {
    if (cat === 'todos') { card.style.display = ''; return; }
    const catEl = card.querySelector('.type-category');
    const cardCat = catEl ? normalize(catEl.textContent.trim()) : 'educacao';
    card.style.display = cardCat === cat ? '' : 'none';
  });
}

// ── BRAND SUMMARY STRIP ──
function updateBrandSummary() {
  const name = f('bName');
  const tone = f('bToneMain');
  const primary = f('cPrimaryHex') || document.getElementById('cPrimary')?.value;
  const secondary = f('cSecondaryHex') || document.getElementById('cSecondary')?.value;
  const accent = f('cAccentHex') || document.getElementById('cAccent')?.value;
  const font = f('bFontDisplay');

  ['brandSummaryCar','brandSummaryPost'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!name) { el.setAttribute('data-empty','true'); el.innerHTML = ''; return; }
    el.removeAttribute('data-empty');
    let html = `<span class="brand-summary-item"><span class="brand-summary-lbl">Marca</span><span class="brand-summary-val">${name}</span></span>`;
    if (tone) html += `<span class="brand-summary-item"><span class="brand-summary-lbl">Tom</span><span class="brand-summary-val">${tone}</span></span>`;
    if (font) html += `<span class="brand-summary-item"><span class="brand-summary-lbl">Fonte</span><span class="brand-summary-val">${font}</span></span>`;
    if (primary || secondary || accent) {
      html += `<span class="brand-summary-item"><span class="brand-summary-lbl">Paleta</span>`;
      if (primary) html += `<span class="brand-summary-dot" style="background:${primary}"></span>`;
      if (secondary) html += `<span class="brand-summary-dot" style="background:${secondary}"></span>`;
      if (accent) html += `<span class="brand-summary-dot" style="background:${accent}"></span>`;
      html += `</span>`;
    }
    el.innerHTML = html;
  });
}

// ── PROMPT HISTORY ──
let _promptHistory = [];
try { _promptHistory = JSON.parse(localStorage.getItem('promptHistory') || '[]'); } catch(e) {}

function savePromptHistory(type, text) {
  _promptHistory.unshift({ type, text, ts: Date.now() });
  _promptHistory = _promptHistory.slice(0, 15);
  try { localStorage.setItem('promptHistory', JSON.stringify(_promptHistory)); } catch(e) {}
  renderPromptHistory();
}

function recopyHistory(idx) {
  const h = _promptHistory[idx];
  if (!h) return;
  navigator.clipboard.writeText(h.text).then(() => toast('Prompt copiado do histórico', 'success'));
}

function renderPromptHistory() {
  ['base','car','post'].forEach(tab => {
    const el = document.getElementById(`${tab}HistoryList`);
    if (!el) return;
    const entries = _promptHistory.map((h, i) => ({ ...h, gi: i })).filter(h => h.type === tab);
    if (!entries.length) { el.innerHTML = '<span class="history-empty">Nenhum prompt copiado ainda.</span>'; return; }
    el.innerHTML = entries.map(h => {
      const d = new Date(h.ts);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="history-item"><span class="history-time">${label}</span><button class="history-copy-btn" onclick="recopyHistory(${h.gi})" title="Copiar novamente">⟳</button></div>`;
    }).join('');
  });
}

// ── KEYBOARD SHORTCUTS ──
function initShortcuts() {
  document.addEventListener('keydown', e => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (app.currentTab === 'base') baseCopy();
      else if (app.currentTab === 'car') carCopy();
      else if (app.currentTab === 'post') postCopy();
    }
    if (e.key === 's') {
      e.preventDefault();
      if (app.currentBrandId && app.isDirty) { setSaveStatus('saving'); app.save(); }
    }
  });
}

