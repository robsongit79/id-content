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

// ── LOGO PREVIEW ──
function previewLogo() {
  const url = f('bLogoUrl'), thumb = document.getElementById('bLogoThumb'), status = document.getElementById('bLogoStatus');
  if (!url) { thumb.innerHTML = '<span style="font-size:10px;color:var(--border-hi);text-align:center;line-height:1.3;">sem<br>logo</span>'; status.textContent = ''; return; }
  status.textContent = 'Carregando...'; status.style.color = 'var(--muted)';
  const img = new Image();
  img.onload = () => { thumb.innerHTML = ''; img.style.cssText = 'width:100%;height:100%;object-fit:contain;'; thumb.appendChild(img); status.textContent = '✓'; status.style.color = 'var(--accent2)'; };
  img.onerror = () => { thumb.innerHTML = '<span style="font-size:18px;">✗</span>'; status.textContent = 'URL inválida'; status.style.color = 'var(--red)'; };
  img.src = url;
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

  const cIds = ['cFormat','cSlideCount','cSequence'];
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

// ── SCROLL NAV ──
function initScrollNav() {
  const bObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { document.querySelectorAll('[data-base]').forEach(n => n.classList.remove('active')); const m = document.querySelector(`[data-base="${e.target.id}"]`); if (m) m.classList.add('active'); }});
  }, { threshold: 0.3, root: document.getElementById('baseMain') });
  document.querySelectorAll('#panelBase .section').forEach(s => bObs.observe(s));
}
