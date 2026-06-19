// Main app controller
const app = {
  currentBrandId: null,
  currentTab: 'base',
  isDirty: false,
  isAdminUser: false,
  currentBrandOriginalLogoUrl: null,
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
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('btnLogout').style.display = 'none';
    document.getElementById('screenLogin').style.display = 'flex';
  },

  async showAuthenticatedApp() {
    document.getElementById('screenLogin').style.display = 'none';
    document.getElementById('btnLogout').style.display = 'inline-flex';

    // 1. Configurar mensagem de boas-vindas com e-mail do usuário
    const user = auth.getUser();
    const userEmail = document.getElementById('userEmail');
    if (user && user.email && userEmail) {
      userEmail.textContent = user.email;
    }

    // Fallback imediato: verifica metadados locais do JWT antes de carregar marcas
    const isLocalAdmin = user && (user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin');
    app.isAdminUser = !!isLocalAdmin;

    const btnAdmin = document.getElementById('btnAdminPanel');
    if (btnAdmin) {
      btnAdmin.style.display = isLocalAdmin ? 'inline-flex' : 'none';
    }

    this.showScreen('editor');
    this.loadBrandList();
    initScrollNav();
    initTooltips();

    // 2. Checagem real via API (cobre adminEmails e mudanças de permissão em tempo real)
    if (btnAdmin) {
      try {
        const token = localStorage.getItem('supabase_access_token');
        if (token) {
          const res = await fetch('/api/admin?action=checkAdmin', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const originalAdminState = app.isAdminUser;
            if (data.isAdmin) {
              app.isAdminUser = true;
              btnAdmin.style.display = 'inline-flex';
            } else {
              app.isAdminUser = false;
              btnAdmin.style.display = 'none';
            }
            // Se o estado de administrador mudou após a checagem da API, re-renderiza o grid
            if (originalAdminState !== app.isAdminUser) {
              this.filterBrands();
            }
          } else if (res.status === 403 || res.status === 401) {
            const originalAdminState = app.isAdminUser;
            app.isAdminUser = false;
            btnAdmin.style.display = 'none';
            if (originalAdminState !== app.isAdminUser) {
              this.filterBrands();
            }
          }
        }
      } catch (e) {
        console.warn('[Admin Check] Não foi possível validar permissões admin na API:', e.message);
      }
    }
  },

  // ── SCREENS ──
  showScreen(screen) {
    document.getElementById('appShell').classList.toggle('active', screen === 'editor');
    document.getElementById('screenAdmin').style.display = screen === 'admin' ? 'block' : 'none';

    const userWelcomeEl = document.getElementById('userWelcome');
    if (userWelcomeEl) {
      userWelcomeEl.style.display = (screen !== 'editor' && auth.isAuthenticated()) ? 'inline-flex' : 'none';
    }

    this.renderTopbar(screen);
    if (screen === 'admin') {
      this.loadAdminUsers();
    }
  },

  // ── APP SHELL DESTINATIONS ──
  switchDestination(dest) {
    if (!this.currentBrandId) return;
    this.currentDestination = dest;
    ['identity', 'create', 'history'].forEach(d => {
      document.getElementById(`dest${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
      document.getElementById(`nav${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
    });
  },

  toggleBrandSwitcher() {
    const dd = document.getElementById('brandSwitcherDropdown');
    const isOpen = dd.style.display !== 'none';
    if (isOpen) { dd.style.display = 'none'; return; }
    dd.style.display = 'block';
    this.loadBrandList();
    const close = (e) => {
      if (!dd.contains(e.target) && e.target.id !== 'brandSwitcherBtn') {
        dd.style.display = 'none';
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  },

  setCreateTab(sub) {
    this.currentCreateTab = sub;
    document.querySelectorAll('#createSegmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.getElementById('panelCar').classList.toggle('active', sub === 'car');
    document.getElementById('panelPost').classList.toggle('active', sub === 'post');
    app.currentTab = sub;
    updatePreviews();
  },

  renderTopbar(screen) {
    const el = document.getElementById('topbarActions');
    if (screen === 'list') {
      el.innerHTML = '';
    } else if (screen === 'admin') {
      el.innerHTML = `
        <button class="btn btn-ghost topbar-back-btn" onclick="app.goHome()" title="Voltar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>Voltar</span></button>
      `;
    } else {
      el.innerHTML = `
        <div class="topbar-menu-wrap">
          <button class="btn btn-ghost topbar-menu-trigger" onclick="app.toggleMenu(event)" title="Mais ações"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
          <div class="topbar-menu" id="topbarMenu" style="display:none;">
            <button class="topbar-menu-item" onclick="baseCopy();app.closeMenu()">⌘ Copiar prompt Base</button>
            <button class="topbar-menu-item" onclick="carCopy();app.closeMenu()">⌘ Copiar prompt Carrossel</button>
            <button class="topbar-menu-item" onclick="postCopy();app.closeMenu()">⌘ Copiar prompt Post</button>
            <div class="topbar-menu-divider"></div>
            <button class="topbar-menu-item topbar-menu-danger" onclick="app.confirmDelete();app.closeMenu()">Excluir marca</button>
          </div>
        </div>
        <button class="btn btn-ghost topbar-save-btn" onclick="app.save()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button>
      `;
    }
  },

  // ── BRAND LIST ──
  async loadBrandList() {
    const grid = document.getElementById('brandGrid');
    grid.innerHTML = '<div class="loading-state">Carregando marcas...</div>';
    try {
      this.allBrands = await db.listBrands();
      this.filterBrands();
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><h3>Erro ao carregar</h3><p>${e.message}</p></div>`;
    }
  },

  renderBrandGrid(brands) {
    const grid = document.getElementById('brandGrid');
    if (brands.length === 0) {
      grid.innerHTML = `<div class="loading-state">Nenhuma marca encontrada.</div>`;
      return;
    }
    grid.innerHTML = brands.map(b => {
      let meta = { is_shared: false };
      if (b.logo_url) {
        try { meta = JSON.parse(b.logo_url) || meta; } catch(e) {}
      }
      const isShared = !!meta.is_shared;
      const isActive = b.id === app.currentBrandId;
      return `
        <div class="app-brand-list-item${isActive ? ' active' : ''}" onclick="app.openBrand('${b.id}');document.getElementById('brandSwitcherDropdown').style.display='none';">
          <span class="app-brand-switcher-name">${b.name}${isShared ? ' 🔗' : ''}</span>
          <div class="app-brand-list-actions">
            ${app.isAdminUser ? `<button onclick="event.stopPropagation();app.toggleShareBrand('${b.id}')" title="${isShared ? 'Remover compartilhamento' : 'Compartilhar'}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>` : ''}
            <button onclick="event.stopPropagation();app.downloadBrandConfigById('${b.id}')" title="Baixar configuração"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button onclick="event.stopPropagation();app.duplicateBrand('${b.id}')" title="Duplicar marca"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            <button onclick="event.stopPropagation();app.deleteBrandById('${b.id}', '${b.name.replace(/'/g, "\\'")}')" title="Excluir marca"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
          </div>
        </div>
      `;
    }).join('');
  },

  filterBrands() {
    const searchEl = document.getElementById('brandSearch');
    const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const user = auth.getUser();

    let filtered = this.allBrands.filter(b => {
      // 1. Controle de Privacidade / Compartilhamento
      if (user && !app.isAdminUser) {
        let meta = { user_id: null, is_shared: false };
        if (b.logo_url) {
          try {
            meta = JSON.parse(b.logo_url) || meta;
          } catch(e) {}
        }
        
        const isOwner = meta.user_id === user.id;
        const isShared = !!meta.is_shared;
        if (!isOwner && !isShared) return false;
      }

      // 2. Busca por texto
      if (!q) return true;
      return (b.name || '').toLowerCase().includes(q) || (b.niche || '').toLowerCase().includes(q) || (b.handle || '').toLowerCase().includes(q);
    });

    filtered = [...filtered].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

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
      const user = auth.getUser();
      const meta = {
        user_id: user ? user.id : null,
        created_by: user ? user.email : null,
        is_shared: false
      };
      const brand = await db.createBrand({ 
        name: 'Nova marca', 
        color_primary: '#1E40AF', 
        color_secondary: '#3B82F6', 
        color_accent: '#FFFFFF', 
        color_dark: '#0A0F1E', 
        color_light: '#F0F4FF', 
        color_text: '#F5F0E8',
        logo_url: JSON.stringify(meta)
      });
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
        app.currentBrandOriginalLogoUrl = brand.logo_url;
        this.fillBrand(brand);
        const switcherNameEl = document.getElementById('appActiveBrandName');
        if (switcherNameEl) switcherNameEl.textContent = brand.name || 'Sem nome';
      }
      this.presets = presets || [];
      if (carousel) this.fillCarousel(carousel);
      if (post) this.fillPost(post);
      setSaveStatus('saved');
      this.isDirty = false;
      ['navIdentity', 'navCreate', 'navHistory'].forEach(id => document.getElementById(id).classList.remove('disabled'));
      this.setCreateTab('car');
      this.switchDestination('identity');
      updatePreviews();
      renderPresets();
      setTimeout(() => document.getElementById('bName')?.focus(), 150);
    } catch (e) {
      toast('Erro ao carregar marca: ' + e.message, 'error');
      setSaveStatus('error');
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

    // Configura o checkbox de compartilhamento (apenas para Admin)
    const adminShareSection = document.getElementById('adminShareSection');
    const bIsShared = document.getElementById('bIsShared');
    if (adminShareSection && bIsShared) {
      if (app.isAdminUser) {
        adminShareSection.style.display = 'block';
      } else {
        adminShareSection.style.display = 'none';
      }
      
      let isShared = false;
      if (b.logo_url) {
        try {
          const meta = JSON.parse(b.logo_url);
          isShared = !!meta.is_shared;
        } catch(e) {}
      }
      bIsShared.checked = isShared;
    }
  },

  fillCarousel(c) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('cFormat', c.format); set('cSlideCount', c.slide_count);
    set('cSequence', c.sequence); set('cFixedEl', c.fixed_elements);
    set('cSlide1', c.slide_hero); set('cSlideCta', c.slide_cta);

    let notes = '', forbidden = '', delivery_format = 'HTML standalone por formato', font_base64 = 'Embutir fontes em base64 no CSS', final_notes = '', content = '';
    if (c.notes) {
      try {
        const parsed = JSON.parse(c.notes);
        if (parsed && typeof parsed === 'object') {
          notes = parsed.notes || ''; forbidden = parsed.forbidden || '';
          delivery_format = parsed.delivery_format || delivery_format;
          font_base64 = parsed.font_base64 || font_base64; final_notes = parsed.final_notes || '';
          content = parsed.content || '';
        } else { notes = c.notes; }
      } catch (e) { notes = c.notes; }
    }
    set('cNotes', notes); set('cForbidden', forbidden); set('cDelivery', delivery_format);
    set('cFontB64', font_base64); set('cFinalNotes', final_notes); set('cContent', content);

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
    let content_notes = '', free_text = '', unified_layout = false;
    if (p.content_notes) {
      try {
        const parsed = JSON.parse(p.content_notes);
        if (parsed && typeof parsed === 'object') {
          content_notes = parsed.content_notes || '';
          free_text = parsed.free_text || '';
          unified_layout = !!parsed.unified_layout;
        } else {
          content_notes = p.content_notes;
        }
      } catch (e) {
        content_notes = p.content_notes;
      }
    }
    set('pContentNotes', content_notes);
    set('pFreeText', free_text);

    const pUnified = document.getElementById('pUnifiedLayout');
    if (pUnified) {
      pUnified.checked = unified_layout;
    }
    if (unified_layout) {
      set('pUnifiedTextPos', p.layout_1x1_text_pos || '');
      set('pUnifiedBg', p.layout_1x1_bg || '');
      set('pUnifiedNotes', p.layout_1x1_notes || '');
    }

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
      syncUnifiedLayout();
    }
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
    const user = auth.getUser();
    
    // Tenta carregar metadados anteriores do cache original para preservar dono
    let meta = { user_id: null, is_shared: false, created_by: null };
    if (app.currentBrandOriginalLogoUrl) {
      try {
        meta = JSON.parse(app.currentBrandOriginalLogoUrl);
      } catch(e) {}
    }
    
    // Se a marca não tiver user_id e o usuário atual existir, associamos
    if (!meta.user_id && user) {
      meta.user_id = user.id;
      meta.created_by = user.email;
    }
    
    // Se for admin, lemos o checkbox bIsShared
    if (app.isAdminUser) {
      const bIsShared = document.getElementById('bIsShared');
      if (bIsShared) {
        meta.is_shared = bIsShared.checked;
      }
    }

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

  collectCarousel() {
    const notesData = {
      notes: f('cNotes'), forbidden: f('cForbidden'),
      delivery_format: f('cDelivery'), font_base64: f('cFontB64'), final_notes: f('cFinalNotes'),
      content: f('cContent')
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
    ['navIdentity', 'navCreate', 'navHistory'].forEach(id => document.getElementById(id).classList.add('disabled'));
    document.getElementById('appActiveBrandName').textContent = 'Selecionar marca';
    this.toggleBrandSwitcher();
  },

  // ── RESET FORM ──
  resetForm() {
    this.activeCarouselPresetIndex = null;
    this.activePostPresetIndex = null;
    this.presets = [];
    document.querySelectorAll('#appContent input[type="text"],#appContent input[type="url"],#appContent textarea').forEach(e => e.value = '');
    document.querySelectorAll('#appContent select').forEach(e => { if (e.options.length) e.value = e.options[0].value; });
    document.querySelectorAll('.radio-item,.logo-pos-item,.type-card').forEach(e => e.classList.remove('selected'));
    document.querySelectorAll('#appContent input[type="radio"]').forEach(e => e.checked = false);
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
      const saved = await db.savePreset(this.currentBrandId, existing ? existing.id : null, { name, type, colors, fonts, layout });
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
      
      let content_notes = '', free_text = '', unified_layout = false;
      if (preset.layout.content_notes) {
        try {
          const parsed = JSON.parse(preset.layout.content_notes);
          if (parsed && typeof parsed === 'object') {
            content_notes = parsed.content_notes || '';
            free_text = parsed.free_text || '';
            unified_layout = !!parsed.unified_layout;
          } else {
            content_notes = preset.layout.content_notes;
          }
        } catch (e) {
          content_notes = preset.layout.content_notes;
        }
      }

      const pUnified = document.getElementById('pUnifiedLayout');
      if (pUnified) {
        pUnified.checked = unified_layout;
      }
      if (unified_layout) {
        setVal('pUnifiedTextPos', preset.layout.layout_1x1_text_pos || '');
        setVal('pUnifiedBg', preset.layout.layout_1x1_bg || '');
        setVal('pUnifiedNotes', preset.layout.layout_1x1_notes || '');
      }

      const pFields = {
        pHeadline: preset.layout.headline, pSubtitle: preset.layout.subtitle, pCta: preset.layout.cta,
        pContentNotes: content_notes,
        pFreeText: free_text,
        pStatNum: preset.layout.stat_number,
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
      
      if (typeof syncUnifiedLayout === 'function') {
        syncUnifiedLayout();
      }
    }

    markDirty();
    this.isApplyingPreset = false;
    renderPresets();
    toast(`Preset "${preset.name}" aplicado!`, 'success');
  },

  // ── TEMPLATE MODAL ──
  showTemplateModal() {
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
      const user = auth.getUser();
      const meta = {
        user_id: user ? user.id : null,
        created_by: user ? user.email : null,
        is_shared: false
      };
      const brand = await db.createBrand({ 
        ...baseData, 
        color_dark: baseData.color_dark || '#0A0F1E', 
        color_light: baseData.color_light || '#F0F4FF', 
        color_text: baseData.color_text || '#F5F0E8',
        logo_url: JSON.stringify(meta)
      });
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

  toggleMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('topbarMenu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    if (isOpen) { menu.style.display = 'none'; return; }
    menu.style.display = 'block';
    const close = () => { menu.style.display = 'none'; document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 0);
  },

  closeMenu() {
    const menu = document.getElementById('topbarMenu');
    if (menu) menu.style.display = 'none';
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
  },

  async loadAdminUsers() {
    const listEl = document.getElementById('adminUserList');
    if (!listEl) return;
    listEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted);">Carregando usuários...</td></tr>';
    
    try {
      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch('/api/admin?action=listUsers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar usuários');
      }
      const data = await res.json();
      const users = Array.isArray(data.users) 
        ? data.users 
        : (data.users && Array.isArray(data.users.users) 
            ? data.users.users 
            : (Array.isArray(data) ? data : []));
      
      if (users.length === 0) {
        listEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted);">Nenhum usuário encontrado.</td></tr>';
        return;
      }
      
      listEl.innerHTML = users.map(u => {
        const created = new Date(u.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(u.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        const lastSignIn = u.last_sign_in_at 
          ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') + ' ' + new Date(u.last_sign_in_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
          : '—';
        const role = u.app_metadata?.role === 'admin' || u.user_metadata?.role === 'admin' ? 'admin' : 'user';
        const roleLabel = role === 'admin' ? '<span class="admin-badge admin-badge-admin">Admin</span>' : '<span class="admin-badge admin-badge-user">Usuário</span>';
        const toggleBtnLabel = role === 'admin' ? 'Remover Admin' : 'Tornar Admin';
        const isSelf = u.id === auth.getUser()?.id;
        
        return `
          <tr>
            <td data-label="E-mail">${u.email}</td>
            <td data-label="Função">${roleLabel}</td>
            <td data-label="Criado em">${created}</td>
            <td data-label="Último acesso">${lastSignIn}</td>
            <td data-label="Ações" style="display:flex;gap:8px;">
              ${isSelf ? '<span style="color:var(--muted);font-size:11px;padding:6px 0;">Você</span>' : `
                <button class="btn btn-ghost" style="padding:4px 8px;font-size:10px;" onclick="app.toggleAdminStatus('${u.id}', '${role}')">${toggleBtnLabel}</button>
                <button class="btn btn-danger" style="padding:4px 8px;font-size:10px;" onclick="app.deleteAdminUser('${u.id}', '${u.email}')">Excluir</button>
              `}
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      listEl.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--red);">Erro: ${e.message}</td></tr>`;
    }
  },

  async toggleAdminStatus(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const msg = currentRole === 'admin' 
      ? 'Deseja remover as permissões de administrador deste usuário?' 
      : 'Deseja promover este usuário a administrador?';
    if (!confirm(msg)) return;
    
    try {
      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch('/api/admin?action=toggleAdmin', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar cargo');
      }
      toast('Cargo atualizado com sucesso!', 'success');
      this.loadAdminUsers();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    }
  },

  async deleteAdminUser(userId, email) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${email}" permanentemente? Todas as marcas e configurações vinculadas a ele serão excluídas pelo banco.`)) return;
    
    try {
      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch('/api/admin?action=deleteUser', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir usuário');
      }
      toast('Usuário excluído com sucesso!', 'success');
      this.loadAdminUsers();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    }
  },

  async downloadBrandConfig() {
    if (!this.currentBrandId) return;
    try {
      const brandData = this.collectBrand();
      const carData = this.collectCarousel();
      const postData = this.collectPost();
      
      const presetsData = this.presets.map(p => ({
        name: p.name,
        type: p.type,
        colors: p.colors,
        fonts: p.fonts,
        layout: p.layout
      }));

      const config = {
        version: "1.0",
        brand: brandData,
        carousel: carData,
        post: postData,
        presets: presetsData
      };

      const name = brandData.name || 'marca';
      const filename = `marca_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_config.json`;

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Configuração baixada com sucesso!', 'success');
    } catch (e) {
      toast('Erro ao baixar configuração: ' + e.message, 'error');
    }
  },

  async downloadBrandConfigById(id) {
    try {
      const configData = await db.loadFullBrand(id);
      if (!configData || !configData.brand) {
        throw new Error('Configuração da marca não encontrada.');
      }
      
      const brandData = { ...configData.brand };
      const carData = configData.carousel ? { ...configData.carousel } : null;
      const postData = configData.post ? { ...configData.post } : null;
      const presetsData = (configData.presets || []).map(p => ({
        name: p.name,
        type: p.type,
        colors: p.colors,
        fonts: p.fonts,
        layout: p.layout
      }));

      const config = {
        version: "1.0",
        brand: brandData,
        carousel: carData,
        post: postData,
        presets: presetsData
      };

      const name = brandData.name || 'marca';
      const filename = `marca_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_config.json`;

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Configuração baixada com sucesso!', 'success');
    } catch (e) {
      toast('Erro ao baixar configuração: ' + e.message, 'error');
    }
  },

  async duplicateBrand(id) {
    try {
      const configData = await db.loadFullBrand(id);
      if (!configData || !configData.brand) {
        throw new Error('Marca não encontrada para duplicação.');
      }
      
      const user = auth.getUser();
      const meta = {
        user_id: user ? user.id : null,
        created_by: user ? user.email : null,
        is_shared: false
      };

      const newBrandData = { ...configData.brand };
      delete newBrandData.id;
      delete newBrandData.created_at;
      delete newBrandData.updated_at;
      newBrandData.name = `${newBrandData.name} (Cópia)`;
      newBrandData.logo_url = JSON.stringify(meta);

      const createdBrand = await db.createBrand(newBrandData);
      if (!createdBrand || !createdBrand.id) {
        throw new Error('Falha ao duplicar registro de marca.');
      }

      if (configData.carousel) {
        const newCarData = { ...configData.carousel };
        delete newCarData.id;
        delete newCarData.brand_id;
        await db.saveCarouselConfig(createdBrand.id, newCarData);
      }

      if (configData.post) {
        const newPostData = { ...configData.post };
        delete newPostData.id;
        delete newPostData.brand_id;
        await db.savePostConfig(createdBrand.id, newPostData);
      }

      if (Array.isArray(configData.presets)) {
        for (const preset of configData.presets) {
          const newPresetData = {
            name: preset.name,
            type: preset.type,
            colors: preset.colors,
            fonts: preset.fonts,
            layout: preset.layout
          };
          await db.savePreset(createdBrand.id, null, newPresetData);
        }
      }

      toast(`Marca duplicada com sucesso!`, 'success');
      await this.loadBrandList();
    } catch (e) {
      toast('Erro ao duplicar marca: ' + e.message, 'error');
    }
  },

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

  async toggleShareBrand(id) {
    try {
      const brand = this.allBrands.find(b => b.id === id);
      if (!brand) return;

      let meta = { user_id: null, is_shared: false, created_by: null };
      if (brand.logo_url) {
        try {
          meta = JSON.parse(brand.logo_url) || meta;
        } catch(e) {}
      }

      meta.is_shared = !meta.is_shared;
      const updatedLogoUrl = JSON.stringify(meta);

      await db.updateBrand(id, { logo_url: updatedLogoUrl });
      toast(meta.is_shared ? 'Marca compartilhada com todos!' : 'Compartilhamento removido.', 'success');
      
      brand.logo_url = updatedLogoUrl;
      this.filterBrands();
    } catch (e) {
      toast('Erro ao alterar compartilhamento: ' + e.message, 'error');
    }
  },

  handleBrandImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    this.readAndImportBrandFile(file);
  },

  handleBrandImportDrop(e) {
    e.preventDefault();
    const area = document.getElementById('importArea');
    if (area) {
      area.style.borderColor = 'var(--border-hi)';
      area.style.background = 'rgba(255, 255, 255, 0.01)';
    }
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    this.readAndImportBrandFile(file);
  },

  readAndImportBrandFile(file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast('Por favor, envie apenas arquivos no formato JSON (.json).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const configData = JSON.parse(event.target.result);
        await this.importBrandConfig(configData);
      } catch (err) {
        toast('Erro ao processar JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  },

  async importBrandConfig(configData) {
    if (!configData || !configData.brand) {
      toast('Arquivo JSON inválido. A propriedade "brand" é obrigatória.', 'error');
      return;
    }

    const user = auth.getUser();
    const meta = {
      user_id: user ? user.id : null,
      created_by: user ? user.email : null,
      is_shared: false
    };

    setSaveStatus('saving');
    try {
      const newBrandData = { ...configData.brand };
      
      delete newBrandData.id;
      delete newBrandData.created_at;
      delete newBrandData.updated_at;
      
      newBrandData.logo_url = JSON.stringify(meta);

      const createdBrand = await db.createBrand(newBrandData);
      if (!createdBrand || !createdBrand.id) {
        throw new Error('Falha ao criar o registro de marca.');
      }

      if (configData.carousel) {
        const newCarData = { ...configData.carousel };
        delete newCarData.id;
        delete newCarData.brand_id;
        await db.saveCarouselConfig(createdBrand.id, newCarData);
      }

      if (configData.post) {
        const newPostData = { ...configData.post };
        delete newPostData.id;
        delete newPostData.brand_id;
        await db.savePostConfig(createdBrand.id, newPostData);
      }

      if (Array.isArray(configData.presets)) {
        for (const preset of configData.presets) {
          const newPresetData = {
            name: preset.name,
            type: preset.type,
            colors: preset.colors,
            fonts: preset.fonts,
            layout: preset.layout
          };
          await db.savePreset(createdBrand.id, null, newPresetData);
        }
      }

      await this.loadBrandList();
      await this.openBrand(createdBrand.id);
      this.closeTemplateModal();
      toast(`Marca "${createdBrand.name}" importada com sucesso!`, 'success');
    } catch (e) {
      setSaveStatus('error');
      toast('Erro ao importar marca: ' + e.message, 'error');
    }
  }
};

// ── GLOBAL SHORTCUTS ──
function savePreset(type) { app.savePreset(type); }
function applyPreset(index) { app.applyPreset(index); }
function deletePreset(index) { app.deletePreset(index); }

window.authMode = 'login';

function toggleAuthMode() {
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authBtnText = document.getElementById('authBtnText');
  const authSwitchText = document.getElementById('authSwitchText');
  const authSwitchLink = document.getElementById('authSwitchLink');
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';
  errorEl.textContent = '';

  if (window.authMode === 'login') {
    window.authMode = 'signup';
    authTitle.textContent = 'Criar Conta';
    authSubtitle.textContent = 'Crie sua conta para começar a gerenciar suas marcas e gerar conteúdos.';
    authBtnText.textContent = 'Cadastrar';
    authSwitchText.textContent = 'Já tem uma conta?';
    authSwitchLink.textContent = 'Fazer Login';
  } else {
    window.authMode = 'login';
    authTitle.textContent = 'Acesso Restrito';
    authSubtitle.textContent = 'Entre com suas credenciais do Supabase para gerenciar suas marcas.';
    authBtnText.textContent = 'Entrar';
    authSwitchText.textContent = 'Não tem uma conta?';
    authSwitchLink.textContent = 'Criar conta';
  }
}

async function handleLoginSubmit() {
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  const btnEl = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';
  errorEl.textContent = '';
  const originalBtnText = btnEl.innerHTML;
  btnEl.disabled = true;

  if (window.authMode === 'signup') {
    btnEl.innerHTML = '<span class="spinner"></span> <span>Cadastrando...</span>';
  } else {
    btnEl.innerHTML = '<span class="spinner"></span> <span>Entrando...</span>';
  }

  try {
    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (window.authMode === 'signup') {
      const data = await auth.signup(email, password);
      if (data.user && !data.access_token) {
        toast('Cadastro realizado! Verifique seu e-mail para confirmação.', 'success');
        toggleAuthMode();
      } else {
        toast('Cadastro e login realizados com sucesso!', 'success');
        app.showAuthenticatedApp();
        emailEl.value = '';
        passwordEl.value = '';
      }
    } else {
      await auth.login(email, password);
      app.showAuthenticatedApp();
      emailEl.value = '';
      passwordEl.value = '';
    }
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
