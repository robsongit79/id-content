// Main app controller
const app = {
  currentBrandId: null,
  currentTab: 'base',
  isDirty: false,
  chipData: { personality: [], goal: [], pItems: [], hashtag: [], topic: [] },
  presets: [],
  allBrands: [],
  activeCarouselPresetIndex: null,
  activePostPresetIndex: null,
  isApplyingPreset: false,
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
    initTooltips();
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
        <button class="btn btn-ghost" onclick="app.confirmDelete()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Excluir marca</button>
        <button class="btn btn-ghost" onclick="app.goHome()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>
        <button class="btn btn-copy" onclick="baseCopy()">⌘ Copiar base</button>
        <button class="btn btn-car" onclick="carCopy()">⌘ Copiar carrossel</button>
        <button class="btn btn-post" onclick="postCopy()">⌘ Copiar post</button>
        <button class="btn btn-base" onclick="app.save()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button>
      `;
    }
  },

  // ── BRAND LIST ──
  async loadBrandList() {
    const grid = document.getElementById('brandGrid');
    grid.innerHTML = '<div class="loading-state">Carregando marcas...</div>';
    try {
      this.allBrands = await db.listBrands();
      this.renderBrandGrid(this.allBrands);
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><h3>Erro ao carregar</h3><p>${e.message}</p></div>`;
    }
  },

  renderBrandGrid(brands) {
    const grid = document.getElementById('brandGrid');
    if (brands.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Nenhuma marca encontrada</h3>
          <p>Clique em "+ Nova marca" para começar ou ajuste a busca.</p>
        </div>`;
      return;
    }
    grid.innerHTML = brands.map(b => `
      <div class="brand-card" onclick="app.openBrand('${b.id}')">
        <div class="brand-card-name">${b.name}</div>
        <div class="brand-card-meta">${b.handle || '—'}${b.niche ? ' · ' + b.niche : ''}</div>
        <div class="brand-card-colors">
          <div class="color-dot" style="background:${b.color_primary || '#1E40AF'}" title="Primária"></div>
          <div class="color-dot" style="background:${b.color_secondary || '#3B82F6'}" title="Secundária"></div>
          <div class="color-dot" style="background:${b.color_accent || '#FFFFFF'};border-color:rgba(255,255,255,0.3);" title="Acento"></div>
        </div>
        <div class="brand-card-meta">Atualizado ${this.formatDate(b.updated_at)}</div>
      </div>
    `).join('');
  },

  filterBrands() {
    const searchEl = document.getElementById('brandSearch');
    const sortEl = document.getElementById('brandSort');
    const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const sort = sortEl ? sortEl.value : 'updated';

    let filtered = this.allBrands.filter(b => {
      if (!q) return true;
      return (b.name || '').toLowerCase().includes(q) || (b.niche || '').toLowerCase().includes(q) || (b.handle || '').toLowerCase().includes(q);
    });

    filtered = [...filtered].sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    this.renderBrandGrid(filtered);
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
      const { brand, carousel, post, presets } = await db.loadFullBrand(id);
      if (brand) {
        this.fillBrand(brand);
        const activeBrandNameEl = document.getElementById('activeBrandName');
        if (activeBrandNameEl) {
          activeBrandNameEl.textContent = brand.name || 'Sem nome';
          activeBrandNameEl.style.display = 'block';
        }
      }
      this.presets = presets || [];
      if (carousel) this.fillCarousel(carousel);
      if (post) this.fillPost(post);
      setSaveStatus('saved');
      this.isDirty = false;
      switchTab('base');
      updatePreviews();
      renderPresets();
      this.loadHistory();
      setTimeout(() => document.getElementById('bName')?.focus(), 150);
    } catch (e) {
      toast('Erro ao carregar marca: ' + e.message, 'error');
      setSaveStatus('error');
    }
  },

  async loadHistory() {
    if (!this.currentBrandId) return;
    try {
      const items = await db.listHistory(this.currentBrandId, 10);
      renderHistoryList(items);
    } catch (e) {
      // Silencioso
    }
  },

  // ── FILL FORMS ──
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
    if (b.font_body) loadFont('bFontBody','bPreviewBody','bStatusBody');

    const bActive = document.getElementById('bLogoActive');
    if (bActive) bActive.checked = !!b.logo_active;
  },

  fillCarousel(c) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('cFormat', c.format); set('cSlideCount', c.slide_count);
    set('cSequence', c.sequence); set('cFixedEl', c.fixed_elements);
    set('cSlide1', c.slide_hero); set('cSlideCta', c.slide_cta);

    let notes = '', forbidden = '', delivery_format = 'HTML standalone por formato', font_base64 = 'Embutir fontes em base64 no CSS', final_notes = '';
    if (c.notes) {
      try {
        const parsed = JSON.parse(c.notes);
        if (parsed && typeof parsed === 'object') {
          notes = parsed.notes || ''; forbidden = parsed.forbidden || '';
          delivery_format = parsed.delivery_format || delivery_format;
          font_base64 = parsed.font_base64 || font_base64; final_notes = parsed.final_notes || '';
        } else { notes = c.notes; }
      } catch (e) { notes = c.notes; }
    }
    set('cNotes', notes); set('cForbidden', forbidden); set('cDelivery', delivery_format);
    set('cFontB64', font_base64); set('cFinalNotes', final_notes);

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

  collectBrand() {
    return {
      name: f('bName') || 'Sem nome',
      handle: f('bHandle'), tagline: f('bTagline'), niche: f('bNiche'),
      positioning: f('bPositioning'),
      logo_active: document.getElementById('bLogoActive')?.checked || false,
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

  collectCarousel() {
    const notesData = {
      notes: f('cNotes'), forbidden: f('cForbidden'),
      delivery_format: f('cDelivery'), font_base64: f('cFontB64'), final_notes: f('cFinalNotes')
    };
    return {
      logo_pos_hero: getRadio('carLogoPosHero'), logo_pos_cta: getRadio('carLogoPosCta'),
      format: f('cFormat'), slide_count: f('cSlideCount'),
      sequence: f('cSequence'), fixed_elements: f('cFixedEl'),
      slide_hero: f('cSlide1'), slide_cta: f('cSlideCta'),
      notes: JSON.stringify(notesData),
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
    this.activeCarouselPresetIndex = null;
    this.activePostPresetIndex = null;
    this.presets = [];
    document.querySelectorAll('#screenEditor input[type="text"],#screenEditor input[type="url"],#screenEditor textarea').forEach(e => e.value = '');
    document.querySelectorAll('#screenEditor select').forEach(e => { if (e.options.length) e.value = e.options[0].value; });
    document.querySelectorAll('.radio-item,.logo-pos-item,.type-card').forEach(e => e.classList.remove('selected'));
    document.querySelectorAll('#screenEditor input[type="radio"]').forEach(e => e.checked = false);
    ['personality','goal','pItems','hashtag','topic'].forEach(k => {
      this.chipData[k] = [];
      const ids = { personality:'personalityChips', goal:'goalChips', pItems:'pItemsChips', hashtag:'hashtagChips', topic:'topicChips' };
      if (ids[k]) document.querySelectorAll(`#${ids[k]} .chip`).forEach(c => c.remove());
    });
    const defs = { cPrimary:'#1E40AF',cSecondary:'#3B82F6',cAccent:'#FFFFFF',cDark:'#0A0F1E',cLight:'#F0F4FF',cText:'#F5F0E8' };
    Object.entries(defs).forEach(([id,v]) => { const el = document.getElementById(id); if(el)el.value=v; const hex = document.getElementById(id+'Hex'); if(hex)hex.value=v; });
    const bActive = document.getElementById('bLogoActive');
    if (bActive) bActive.checked = false;
    renderPresets();
    ['bPreviewDisplay','bPreviewBody'].forEach(id => { const el = document.getElementById(id); if(el) el.style.fontFamily = ''; });
    ['bStatusDisplay','bStatusBody'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = ''; });
    this.postType = '';
    this.postFmts.clear();
    ['1x1','4x5','9x16'].forEach(id => document.getElementById(`pFmt${id}`)?.classList.remove('checked'));
    document.getElementById('pTypeInfo').style.display = 'none';
    document.getElementById('pDynamic').style.display = 'none';
    document.getElementById('pLayoutPlaceholder').style.display = 'block';
    ['pLayout1x1','pLayout4x5','pLayout9x16'].forEach(id => document.getElementById(id).style.display = 'none');
    const activeBrandNameEl = document.getElementById('activeBrandName');
    if (activeBrandNameEl) { activeBrandNameEl.textContent = ''; activeBrandNameEl.style.display = 'none'; }
    renderHistoryList([]);
  },

  // ── PRESETS ──
  async savePreset(type) {
    const nameInputId = type === 'carousel' ? 'cPresetName' : 'pPresetName';
    const nameEl = document.getElementById(nameInputId);
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) { toast('Por favor, digite um nome para o preset.', 'error'); return; }

    const colors = {
      color_primary: document.getElementById('cPrimaryHex')?.value,
      color_secondary: document.getElementById('cSecondaryHex')?.value,
      color_accent: document.getElementById('cAccentHex')?.value,
      color_dark: document.getElementById('cDarkHex')?.value,
      color_light: document.getElementById('cLightHex')?.value,
      color_text: document.getElementById('cTextHex')?.value,
      colors_notes: f('bColorsNotes')
    };
    const fonts = {
      font_display: f('bFontDisplay'), font_body: f('bFontBody'),
      size_title: f('bSizeTitle'), size_subtitle: f('bSizeSubtitle'), size_body: f('bSizeBody'),
      weight_title: f('bWeightTitle'), italic_use: f('bItalicUse'), typo_notes: f('bTypoNotes')
    };
    const layout = type === 'carousel' ? this.collectCarousel() : this.collectPost();

    const existing = this.presets.find(p => p.name === name && p.type === type);
    if (existing) {
      if (!confirm(`Já existe um preset de ${type === 'carousel' ? 'carrossel' : 'post'} com o nome "${name}". Deseja sobrescrevê-lo?`)) return;
    }

    try {
      const saved = await db.savePreset(this.currentBrandId, { name, type, colors, fonts, layout });
      const idx = this.presets.findIndex(p => p.name === name && p.type === type);
      if (idx !== -1) { this.presets[idx] = saved; } else { this.presets.push(saved); }
      if (nameEl) nameEl.value = '';
      renderPresets();
      toast(`Preset "${name}" salvo!`, 'success');
    } catch (e) {
      toast('Erro ao salvar preset: ' + e.message, 'error');
    }
  },

  applyPreset(index) {
    this.isApplyingPreset = true;
    const preset = this.presets[index];
    if (!preset) { this.isApplyingPreset = false; return; }

    if (preset.type === 'carousel') { this.activeCarouselPresetIndex = index; }
    else if (preset.type === 'post') { this.activePostPresetIndex = index; }

    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };

    setVal('cPrimaryHex', preset.colors.color_primary); setVal('cSecondaryHex', preset.colors.color_secondary);
    setVal('cAccentHex', preset.colors.color_accent); setVal('cDarkHex', preset.colors.color_dark);
    setVal('cLightHex', preset.colors.color_light); setVal('cTextHex', preset.colors.color_text);
    setVal('bColorsNotes', preset.colors.colors_notes);
    ['Primary','Secondary','Accent','Dark','Light','Text'].forEach(n => {
      const hex = document.getElementById(`c${n}Hex`), picker = document.getElementById(`c${n}`);
      if (hex && picker) picker.value = hex.value;
    });

    setVal('bFontDisplay', preset.fonts.font_display); setVal('bFontBody', preset.fonts.font_body);
    setVal('bSizeTitle', preset.fonts.size_title); setVal('bSizeSubtitle', preset.fonts.size_subtitle);
    setVal('bSizeBody', preset.fonts.size_body); setVal('bWeightTitle', preset.fonts.weight_title);
    setVal('bItalicUse', preset.fonts.italic_use); setVal('bTypoNotes', preset.fonts.typo_notes);
    if (preset.fonts.font_display) loadFont('bFontDisplay','bPreviewDisplay','bStatusDisplay');
    if (preset.fonts.font_body) loadFont('bFontBody','bPreviewBody','bStatusBody');

    if (preset.type === 'carousel') {
      setVal('cFormat', preset.layout.format); setVal('cSlideCount', preset.layout.slide_count);
      setVal('cSequence', preset.layout.sequence); setVal('cFixedEl', preset.layout.fixed_elements);
      setVal('cSlide1', preset.layout.slide_hero); setVal('cSlideCta', preset.layout.slide_cta);
      let notes = '', forbidden = '', delivery_format = 'HTML standalone por formato', font_base64 = 'Embutir fontes em base64 no CSS', final_notes = '';
      if (preset.layout.notes) {
        try {
          const parsed = JSON.parse(preset.layout.notes);
          if (parsed && typeof parsed === 'object') {
            notes = parsed.notes || ''; forbidden = parsed.forbidden || '';
            delivery_format = parsed.delivery_format || delivery_format;
            font_base64 = parsed.font_base64 || font_base64; final_notes = parsed.final_notes || '';
          } else { notes = preset.layout.notes; }
        } catch (e) { notes = preset.layout.notes; }
      }
      setVal('cNotes', notes); setVal('cForbidden', forbidden); setVal('cDelivery', delivery_format);
      setVal('cFontB64', font_base64); setVal('cFinalNotes', final_notes);
      const lh = preset.layout.logo_pos_hero, lc = preset.layout.logo_pos_cta;
      if (lh) document.querySelectorAll(`input[name="carLogoPosHero"]`).forEach(r => { const s = r.value === lh; r.checked = s; r.closest('.logo-pos-item')?.classList.toggle('selected', s); });
      if (lc) document.querySelectorAll(`input[name="carLogoPosCta"]`).forEach(r => { const s = r.value === lc; r.checked = s; r.closest('.logo-pos-item')?.classList.toggle('selected', s); });
    } else if (preset.type === 'post') {
      const lp = preset.layout.logo_pos;
      if (lp) document.querySelectorAll(`input[name="postLogoPos"]`).forEach(r => { const s = r.value === lp; r.checked = s; r.closest('.logo-pos-item')?.classList.toggle('selected', s); });
      if (preset.layout.post_type) { const card = document.querySelector(`input[name="pType"][value="${preset.layout.post_type}"]`); if (card) selectPostType(card.closest('.type-card'), preset.layout.post_type); }
      if (preset.layout.formats) { app.postFmts.clear(); document.querySelectorAll(`.post-fmt`).forEach(c => c.classList.remove('checked')); preset.layout.formats.forEach(fmt => togglePostFmt(fmt)); }
      const pFields = {
        pHeadline: preset.layout.headline, pSubtitle: preset.layout.subtitle, pCta: preset.layout.cta,
        pContentNotes: preset.layout.content_notes, pStatNum: preset.layout.stat_number,
        pStatCtx: preset.layout.stat_context, pStatSrc: preset.layout.stat_source,
        pCompA: preset.layout.comp_a, pCompB: preset.layout.comp_b,
        pAnPrice: preset.layout.anuncio_price, pAnBenefit: preset.layout.anuncio_benefit,
        pUrgPrazo: preset.layout.urgencia_prazo, pUrgOque: preset.layout.urgencia_oque,
        pQuoteText: preset.layout.quote_text, pQuoteAuthor: preset.layout.quote_author, pQuoteRole: preset.layout.quote_role,
        pArtBody: preset.layout.article_body,
        pL1TextPos: preset.layout.layout_1x1_text_pos, pL1Bg: preset.layout.layout_1x1_bg, pL1Notes: preset.layout.layout_1x1_notes,
        pL4TextPos: preset.layout.layout_4x5_text_pos, pL4Bg: preset.layout.layout_4x5_bg, pL4Notes: preset.layout.layout_4x5_notes,
        pL9TextPos: preset.layout.layout_9x16_text_pos, pL9Bg: preset.layout.layout_9x16_bg, pL9Notes: preset.layout.layout_9x16_notes,
        pForbidden: preset.layout.forbidden, pDelivery: preset.layout.delivery_format,
        pFontB64: preset.layout.font_base64, pFinalNotes: preset.layout.final_notes
      };
      Object.entries(pFields).forEach(([id, val]) => setVal(id, val));
      const items = preset.layout.items || [];
      this.fillChips('pItems', items, 'pItemsChips', 'pItemsInput');
    }

    markDirty();
    this.isApplyingPreset = false;
    renderPresets();
    toast(`Preset "${preset.name}" aplicado!`, 'success');
  },

  // ── TEMPLATE MODAL ──
  showTemplateModal() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = Object.entries(BRAND_TEMPLATES).map(([key, tmpl]) => `
      <div class="template-card" onclick="app.newBrandFromTemplate('${key}')">
        <div class="template-icon">${tmpl.icon}</div>
        <div class="template-name">${tmpl.label}</div>
      </div>
    `).join('');
    document.getElementById('templateModal').style.display = 'flex';
  },

  closeTemplateModal() {
    document.getElementById('templateModal').style.display = 'none';
  },

  async newBrandFromTemplate(key) {
    this.closeTemplateModal();
    const tmpl = BRAND_TEMPLATES[key];
    if (!tmpl) return;
    try {
      const { personality, goals, topics, hashtags, ...baseData } = tmpl.data;
      const brand = await db.createBrand({ ...baseData, color_dark: baseData.color_dark || '#0A0F1E', color_light: baseData.color_light || '#F0F4FF', color_text: baseData.color_text || '#F5F0E8' });
      await this.openBrand(brand.id);
      if (personality) this.fillChips('personality', personality, 'personalityChips', 'personalityInput');
      if (goals) this.fillChips('goal', goals, 'goalChips', 'goalInput');
      if (topics) this.fillChips('topic', topics, 'topicChips', 'topicInput');
      if (hashtags) this.fillChips('hashtag', hashtags, 'hashtagChips', 'hashtagInput');
      await this.save();
      toast(`Template "${tmpl.label}" aplicado!`, 'success');
    } catch (e) {
      toast('Erro ao criar marca: ' + e.message, 'error');
    }
  },

  async deletePreset(index) {
    const preset = this.presets[index];
    if (!preset) return;
    if (!confirm(`Excluir preset "${preset.name}"?`)) return;
    try {
      await db.deletePreset(preset.id);
      this.presets.splice(index, 1);
      this.activeCarouselPresetIndex = null;
      this.activePostPresetIndex = null;
      renderPresets();
      toast(`Preset "${preset.name}" excluído.`, 'success');
    } catch (e) {
      toast('Erro ao excluir preset: ' + e.message, 'error');
    }
  }
};

// ── GLOBAL SHORTCUTS ──
function newBrand() { app.newBrand(); }
function savePreset(type) { app.savePreset(type); }
function applyPreset(index) { app.applyPreset(index); }
function deletePreset(index) { app.deletePreset(index); }

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
    app.showAuthenticatedApp();
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
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  window.addEventListener('beforeunload', (e) => {
    if (app.isDirty) { e.preventDefault(); e.returnValue = ''; }
  });
});
