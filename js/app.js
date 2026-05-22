// Main app controller
const app = {
  currentBrandId: null,
  currentTab: 'base',
  isDirty: false,
  chipData: { personality: [], goal: [], pItems: [] },
  postType: '',
  postFmts: new Set(),
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

  // ── INIT ──
  async init() {
    const user = await auth.checkSession();
    if (user) {
      this.showAuthenticatedApp();
    } else {
      this.showLoginForm();
    }
  },

  showLoginForm() {
    document.getElementById('screenList').style.display = 'none';
    document.getElementById('screenEditor').style.display = 'none';
    document.getElementById('tabs').style.display = 'none';
    document.getElementById('btnLogout').style.display = 'none';
    document.getElementById('screenLogin').style.display = 'flex';
  },

  showAuthenticatedApp() {
    document.getElementById('screenLogin').style.display = 'none';
    document.getElementById('btnLogout').style.display = 'inline-flex';
    this.showScreen('list');
    this.loadBrandList();
    initScrollNav();
  },

  // ── SCREENS ──
  showScreen(screen) {
    document.getElementById('screenList').style.display = screen === 'list' ? 'block' : 'none';
    document.getElementById('screenEditor').style.display = screen === 'editor' ? 'block' : 'none';
    document.getElementById('tabs').style.display = screen === 'editor' ? 'flex' : 'none';
    this.renderTopbar(screen);
  },

  renderTopbar(screen) {
    const el = document.getElementById('topbarActions');
    if (screen === 'list') {
      el.innerHTML = '';
    } else {
      el.innerHTML = `
        <button class="btn btn-ghost" onclick="app.confirmDelete()">🗑 Excluir marca</button>
        <button class="btn btn-ghost" onclick="app.goHome()">← Voltar</button>
        <button class="btn btn-copy" onclick="baseCopy()">⌘ Copiar base</button>
        <button class="btn btn-car" onclick="carCopy()">⌘ Copiar carrossel</button>
        <button class="btn btn-post" onclick="postCopy()">⌘ Copiar post</button>
        <button class="btn btn-base" onclick="app.save()">💾 Salvar</button>
      `;
    }
  },

  // ── BRAND LIST ──
  async loadBrandList() {
    const grid = document.getElementById('brandGrid');
    grid.innerHTML = '<div class="loading-state">Carregando marcas...</div>';
    try {
      const brands = await db.listBrands();
      if (brands.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <h3>Nenhuma marca cadastrada</h3>
            <p>Clique em "+ Nova marca" para começar.</p>
          </div>`;
        return;
      }
      grid.innerHTML = brands.map(b => `
        <div class="brand-card" onclick="app.openBrand('${b.id}')">
          <div class="brand-card-name">${b.name}</div>
          <div class="brand-card-meta">${b.handle || '—'}</div>
          <div class="brand-card-colors">
            <div class="color-dot" style="background:${b.color_primary || '#1E40AF'}" title="Primária"></div>
            <div class="color-dot" style="background:${b.color_secondary || '#3B82F6'}" title="Secundária"></div>
            <div class="color-dot" style="background:${b.color_accent || '#FFFFFF'};border-color:rgba(255,255,255,0.3);" title="Acento"></div>
          </div>
          <div class="brand-card-meta">Atualizado ${this.formatDate(b.updated_at)}</div>
        </div>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><h3>Erro ao carregar</h3><p>${e.message}</p></div>`;
    }
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  },

  // ── NEW BRAND ──
  async newBrand() {
    try {
      const brand = await db.createBrand({ name: 'Nova marca', color_primary: '#1E40AF', color_secondary: '#3B82F6', color_accent: '#FFFFFF', color_dark: '#0A0F1E', color_light: '#F0F4FF', color_text: '#F5F0E8' });
      await this.openBrand(brand.id);
    } catch (e) {
      toast('Erro ao criar marca: ' + e.message, 'error');
    }
  },

  // ── OPEN BRAND ──
  async openBrand(id) {
    this.currentBrandId = id;
    this.showScreen('editor');
    this.resetForm();
    setSaveStatus('saving');

    try {
      const { brand, carousel, post } = await db.loadFullBrand(id);
      if (brand) this.fillBrand(brand);
      if (carousel) this.fillCarousel(carousel);
      if (post) this.fillPost(post);
      setSaveStatus('saved');
      this.isDirty = false;
      switchTab('base');
      updatePreviews();
    } catch (e) {
      toast('Erro ao carregar marca: ' + e.message, 'error');
      setSaveStatus('error');
    }
  },

  // ── FILL FORMS ──
  fillBrand(b) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('bName', b.name); set('bHandle', b.handle); set('bTagline', b.tagline);
    set('bNiche', b.niche); set('bPositioning', b.positioning); set('bLogoUrl', b.logo_url);
    set('cPrimaryHex', b.color_primary); set('cSecondaryHex', b.color_secondary);
    set('cAccentHex', b.color_accent); set('cDarkHex', b.color_dark);
    set('cLightHex', b.color_light); set('cTextHex', b.color_text);
    // Sync color pickers
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

    // Style visual radio
    if (b.style_visual) {
      document.querySelectorAll(`input[name="styleVisual"]`).forEach(r => {
        if (r.value === b.style_visual) { r.checked = true; r.closest('.radio-item')?.classList.add('selected'); }
      });
    }
    // Chips
    if (b.personality) this.fillChips('personality', b.personality, 'personalityChips', 'personalityInput');
    if (b.goals) this.fillChips('goal', b.goals, 'goalChips', 'goalInput');
    // Font previews
    if (b.font_display) loadFont('bFontDisplay','bPreviewDisplay','bStatusDisplay');
    if (b.font_body) loadFont('bFontBody','bPreviewBody','bStatusBody');
    if (b.logo_url) setTimeout(previewLogo, 100);
  },

  fillCarousel(c) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('cFormat', c.format); set('cSlideCount', c.slide_count);
    set('cSequence', c.sequence); set('cFixedEl', c.fixed_elements);
    set('cSlide1', c.slide_hero); set('cSlideCta', c.slide_cta); set('cNotes', c.notes);
    if (c.logo_pos_hero) {
      document.querySelectorAll(`input[name="carLogoPosHero"]`).forEach(r => { if (r.value === c.logo_pos_hero) { r.checked = true; r.closest('.logo-pos-item')?.classList.add('selected'); } });
    }
    if (c.logo_pos_cta) {
      document.querySelectorAll(`input[name="carLogoPosCta"]`).forEach(r => { if (r.value === c.logo_pos_cta) { r.checked = true; r.closest('.logo-pos-item')?.classList.add('selected'); } });
    }
  },

  fillPost(p) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    if (p.post_type) {
      const card = document.querySelector(`input[name="pType"][value="${p.post_type}"]`);
      if (card) selectPostType(card.closest('.type-card'), p.post_type);
    }
    if (p.logo_pos) {
      document.querySelectorAll(`input[name="postLogoPos"]`).forEach(r => { if (r.value === p.logo_pos) { r.checked = true; r.closest('.logo-pos-item')?.classList.add('selected'); } });
    }
    if (p.formats) p.formats.forEach(fmt => { if (!this.postFmts.has(fmt)) togglePostFmt(fmt); });
    set('pHeadline', p.headline); set('pSubtitle', p.subtitle); set('pCta', p.cta);
    set('pContentNotes', p.content_notes);
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
  },

  fillChips(key, values, wrapId, inputId) {
    this.chipData[key] = [];
    document.querySelectorAll(`#${wrapId} .chip`).forEach(c => c.remove());
    values.forEach(v => {
      this.chipData[key].push(v);
      const wrap = document.getElementById(wrapId);
      const chip = document.createElement('span'); chip.className = 'chip';
      chip.innerHTML = `${v}<span class="chip-x" onclick="removeChip(this,'${key}')">×</span>`;
      wrap.insertBefore(chip, document.getElementById(inputId));
    });
  },

  // ── COLLECT DATA ──
  collectBrand() {
    return {
      name: f('bName') || 'Sem nome',
      handle: f('bHandle'), tagline: f('bTagline'), niche: f('bNiche'),
      positioning: f('bPositioning'), logo_url: f('bLogoUrl'),
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
    };
  },

  collectCarousel() {
    return {
      logo_pos_hero: getRadio('carLogoPosHero'), logo_pos_cta: getRadio('carLogoPosCta'),
      format: f('cFormat'), slide_count: f('cSlideCount'),
      sequence: f('cSequence'), fixed_elements: f('cFixedEl'),
      slide_hero: f('cSlide1'), slide_cta: f('cSlideCta'), notes: f('cNotes'),
    };
  },

  collectPost() {
    return {
      logo_pos: getRadio('postLogoPos'),
      post_type: this.postType,
      formats: [...this.postFmts],
      headline: f('pHeadline'), subtitle: f('pSubtitle'), cta: f('pCta'),
      content_notes: f('pContentNotes'),
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

  // ── SAVE ──
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

  // ── DELETE ──
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

  // ── HOME ──
  async goHome() {
    if (this.isDirty) {
      if (!confirm('Tem alterações não salvas. Deseja sair mesmo assim?')) return;
    }
    this.currentBrandId = null;
    this.isDirty = false;
    this.showScreen('list');
    await this.loadBrandList();
  },

  // ── RESET FORM ──
  resetForm() {
    document.querySelectorAll('#screenEditor input[type="text"],#screenEditor input[type="url"],#screenEditor textarea').forEach(e => e.value = '');
    document.querySelectorAll('#screenEditor select').forEach(e => { if (e.options.length) e.value = e.options[0].value; });
    document.querySelectorAll('.radio-item,.logo-pos-item,.type-card').forEach(e => e.classList.remove('selected'));
    document.querySelectorAll('#screenEditor input[type="radio"]').forEach(e => e.checked = false);
    ['personality','goal','pItems'].forEach(k => {
      this.chipData[k] = [];
      const ids = { personality:'personalityChips', goal:'goalChips', pItems:'pItemsChips' };
      document.querySelectorAll(`#${ids[k]} .chip`).forEach(c => c.remove());
    });
    const defs = { cPrimary:'#1E40AF',cSecondary:'#3B82F6',cAccent:'#FFFFFF',cDark:'#0A0F1E',cLight:'#F0F4FF',cText:'#F5F0E8' };
    Object.entries(defs).forEach(([id,v]) => { document.getElementById(id).value = v; document.getElementById(id+'Hex').value = v; });
    document.getElementById('bLogoThumb').innerHTML = '<span style="font-size:10px;color:var(--border-hi);text-align:center;line-height:1.3;">sem<br>logo</span>';
    document.getElementById('bLogoStatus').textContent = '';
    ['bPreviewDisplay','bPreviewBody'].forEach(id => { document.getElementById(id).style.fontFamily = ''; });
    ['bStatusDisplay','bStatusBody'].forEach(id => { document.getElementById(id).textContent = ''; });
    this.postType = '';
    this.postFmts.clear();
    ['1x1','4x5','9x16'].forEach(id => document.getElementById(`pFmt${id}`)?.classList.remove('checked'));
    document.getElementById('pTypeInfo').style.display = 'none';
    document.getElementById('pDynamic').style.display = 'none';
    document.getElementById('pLayoutPlaceholder').style.display = 'block';
    ['pLayout1x1','pLayout4x5','pLayout9x16'].forEach(id => document.getElementById(id).style.display = 'none');
  }
};

// ── GLOBAL SHORTCUTS ──
function newBrand() { app.newBrand(); }

async function handleLoginSubmit() {
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  const btnEl = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';
  errorEl.textContent = '';
  
  const originalBtnText = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerHTML = '<span class="spinner"></span> <span>Entrando...</span>';

  try {
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    
    await auth.login(email, password);
    
    // Sucesso!
    app.showAuthenticatedApp();
    
    // Limpar campos
    emailEl.value = '';
    passwordEl.value = '';
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  } finally {
    btnEl.disabled = false;
    btnEl.innerHTML = originalBtnText;
  }
}

// ── START ──
document.addEventListener('DOMContentLoaded', () => app.init());
