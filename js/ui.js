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

function activateOnKey(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
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
// Guarda a URL do Google Fonts já validada por nome de fonte, para que
// prompts.js possa injetá-la no prompt em vez do LLM ter que reconstruí-la
// de memória a partir só do nome.
const fontMeta = {};
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
    const slug = name.replace(/ /g, '+'), lid = `gf-link-${inputId}`;
    const url = `https://fonts.googleapis.com/css2?family=${slug}:ital,wght@0,400;0,700;1,400&display=swap`;
    try {
      let l = document.getElementById(lid);
      if (!l) {
        l = document.createElement('link'); l.id = lid; l.rel = 'stylesheet';
        document.head.appendChild(l);
      }
      l.href = url;
      await Promise.race([document.fonts.load(`700 20px '${name}'`), new Promise(r => setTimeout(r, 3000))]);
      if (document.fonts.check(`400 20px '${name}'`) || document.fonts.check(`700 20px '${name}'`)) {
        fontCache[name] = 'ok'; fontMeta[name] = { status: 'ok', url };
        preview.style.fontFamily = `'${name}',serif`;
        status.textContent = '✓'; status.style.color = 'var(--accent2)';
      } else throw new Error();
    } catch (e) {
      fontCache[name] = 'err'; fontMeta[name] = { status: 'err', url };
      preview.style.fontFamily = '';
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
  navigator.clipboard.writeText(p).then(() => {
    showCopied('baseCopyMsg');
  });
}

function carCopy() {
  const p = prompts.buildCarousel(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => {
    showCopied('carCopyMsg');
  });
}

function postCopy() {
  const p = prompts.buildPost(); if (!p) { toast('Preencha a aba Base primeiro.', 'error'); return; }
  navigator.clipboard.writeText(p).then(() => {
    showCopied('postCopyMsg');
  });
}

// ── UPDATE PREVIEWS ──
function updatePreviews() {
  const bp = prompts.buildBase();
  document.getElementById('baseOutput').innerHTML = bp ? prompts.highlight(bp, 'sec-base') : '<span class="empty">← Preencha os campos.</span>';

  const cp = prompts.buildCarousel();
  document.getElementById('carOutput').innerHTML = cp ? prompts.highlight(cp, 'sec-car') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  const pp = prompts.buildPost();
  document.getElementById('postOutput').innerHTML = pp ? prompts.highlight(pp, 'sec-post') : '<span class="empty">← Preencha a aba Base para gerar o prompt.</span>';

  const switcherNameEl = document.getElementById('appActiveBrandName');
  if (switcherNameEl && app.currentBrandId) {
    switcherNameEl.textContent = f('bName') || 'Sem nome';
  }

  updateProgress();
}

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

  const cReq = ['cFormat','cSlideCount','cSequence'];
  const cOpt = ['cFixedEl'];
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

  let pScore = 0, pMax = 4;
  if (app.postType) pScore += 2;
  if (f('pFreeText')) pScore += 1;
  if (app.postFmts.size) pScore += 1;
  const pReqFilled = app.postType ? 1 : 0;
  const pPct = Math.round((pScore / pMax) * 100);
  document.getElementById('postProgFill').style.width = pPct + '%';
  document.getElementById('postProgLabel').textContent = `${pReqFilled}/1 obrig.`;
  document.getElementById('postProgPct').textContent = pPct + '%';
}

// ── TAB SWITCHING ──
function switchTab(tab) {
  if (tab === 'base') { app.currentTab = 'base'; return; }
  app.setCreateTab(tab);
}

// ── POST TYPE ──
function selectPostType(el, type) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); app.postType = type;
  const cfg = app.postTypeConfig[type];
  document.getElementById('pTypeInfo').style.display = 'block';
  document.getElementById('pTypeLabel').textContent = cfg.label;
  markDirty(); updatePreviews();
}

function togglePostFmt(fmt) {
  const card = document.getElementById(`pFmt${fmt}`);
  if (app.postFmts.has(fmt)) { app.postFmts.delete(fmt); card.classList.remove('checked'); card.setAttribute('aria-checked', 'false'); }
  else { app.postFmts.add(fmt); card.classList.add('checked'); card.setAttribute('aria-checked', 'true'); }
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
  // Base — Visual
  bBorderUse:    'Papel das bordas no design. De decorativas a estruturais.',
  bCornerRadius: 'Grau de arredondamento de cards e botões.',
  bBgRhythm:     'Padrão de alternância escuro/claro entre os slides do carrossel.',
  bGradientUse:  'Quando e onde gradientes da paleta podem ser usados.',
  bVisualSig:    'Elementos recorrentes que identificam a marca visualmente. Ex: linha fina na base, número de slide em destaque.',
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
  cFinalNotes: 'Últimas instruções antes de o Claude gerar o código do carrossel.',
  // Post — Conteúdo
  pContentNotes: 'Instruções específicas sobre elementos, destaques ou tom deste post.',
  // Novos campos de conteúdo
  cContent:    'Conteúdo bruto (texto, tópicos ou roteiro) que servirá de base para a geração dos slides do carrossel.',
  pFreeText:   'Caso prefira colar a copy direta do post em formato livre, cole aqui. Esse texto será enviado no prompt.',
  // Post — Obrigatoriedades
  pFinalNotes: 'Itens que sempre devem aparecer no post. Ex: telefone de contato, logo no topo.',
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
    icon.setAttribute('tabindex', '0');
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', tip);
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
  deleteBrandModal: () => closeDeleteBrandModal(),
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

