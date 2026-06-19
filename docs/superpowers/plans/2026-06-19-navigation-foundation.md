# Fundação de Navegação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lista→editor→lista navigation flow with a persistent workspace shell: a sidebar with a brand switcher and 3 fixed destinations (Identidade, Criar conteúdo, Histórico), without changing any form field or database schema.

**Architecture:** Pure HTML/CSS/JS changes to `index.html`, `css/style.css`, `js/app.js`, `js/ui.js`. The existing per-tab scroll-spy sidebars (`.sidebar`/`.nav-item`, used inside Base/Carrossel/Post panels) are untouched and keep their class names — the new app-level sidebar uses distinct class names (`.app-sidebar`, `.app-nav-item`) to avoid collisions. No new files, no new dependencies, no build step changes.

**Tech Stack:** Vanilla JavaScript (ES6+), plain CSS, no framework, no bundler — matches the existing codebase exactly.

## Global Constraints

- No automated test framework exists in this repo (no Jest/Mocha/Playwright, no `test` script in `package.json`). Verification for every step is: (a) `node --check <file>.js` for any modified `.js` file — must exit with no output/error; (b) a manual browser check of the specific behavior described in the step (open `index.html` directly, or serve the directory with `python3 -m http.server 8000` and open `http://localhost:8000`).
- Do not modify `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/prompts.js`, `js/templates.js`, `js/claude-generate.js`, or any database/Supabase schema. This phase is presentation/navigation only.
- Reuse existing CSS tokens from `css/style.css:1-6` (`--bg`, `--surface`, `--border`, `--border-hi`, `--text`, `--muted`, `--label`, `--accent2`, `--acc-base`, `--acc-car`, `--acc-post`, `--font-d`, `--font-m`). Do not introduce new color values.
- Mobile breakpoint: `max-width: 920px`, matching the existing breakpoint already used in `css/style.css:491`.
- The existing per-panel scroll-spy sidebar (`css/style.css:137` `.sidebar`, used by `panelBase`/`panelCar`/`panelPost` internal navigation) must keep working exactly as today — do not rename or remove those classes.
- Every task must leave the app in a fully working state when finished (no task may be "done" while the app is broken).

---

### Task 1: CSS foundation for the app shell (additive only)

**Files:**
- Modify: `css/style.css` (append a new section at the end of the file)

**Interfaces:**
- Consumes: existing CSS custom properties from `:root` (`css/style.css:1-6`).
- Produces: CSS classes `.app-shell`, `.app-sidebar`, `.app-sidebar-brand`, `.app-brand-switcher`, `.app-brand-dropdown`, `.app-brand-list`, `.app-brand-list-item`, `.app-brand-list-actions`, `.app-sidebar-nav`, `.app-nav-item`, `.app-nav-item.active`, `.app-sidebar-footer`, `.app-content`, `.app-dest`, `.app-dest.active`, `.segmented`, `.segmented-btn`, `.segmented-btn.active`, `.app-empty-state`, `.app-sidebar-toggle` — these names are relied on by Task 2 and Task 4.

- [ ] **Step 1: Append the new CSS section**

Add this block at the very end of `css/style.css`:

```css

/* ══ APP SHELL (workspace navigation) ══ */
.app-shell{display:none;grid-template-columns:240px 1fr;min-height:calc(100vh - 49px);}
.app-shell.active{display:grid;}
.app-sidebar{border-right:1px solid var(--border);display:flex;flex-direction:column;height:calc(100vh - 49px);position:sticky;top:49px;}
.app-sidebar-brand{padding:16px;border-bottom:1px solid var(--border);position:relative;}
.app-brand-switcher{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:10px 12px;color:var(--text);font-family:var(--font-m);font-size:12px;cursor:pointer;text-align:left;}
.app-brand-switcher:hover{border-color:var(--border-hi);}
.app-brand-switcher-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.app-brand-dropdown{position:absolute;top:calc(100% + 6px);left:16px;right:16px;background:var(--surface);border:1px solid var(--border-hi);border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,0.5);z-index:300;padding:10px;}
.app-brand-dropdown input[type="text"]{margin-bottom:8px;}
.app-brand-list{max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;margin-bottom:8px;}
.app-brand-list-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:4px;cursor:pointer;font-size:12px;color:var(--text);}
.app-brand-list-item:hover{background:rgba(255,255,255,0.04);}
.app-brand-list-item.active{background:rgba(180,130,255,0.08);color:var(--acc-base);}
.app-brand-list-actions{display:flex;gap:4px;opacity:0;transition:opacity 0.12s;}
.app-brand-list-item:hover .app-brand-list-actions{opacity:1;}
.app-brand-list-actions button{background:none;border:none;color:var(--muted);cursor:pointer;padding:2px;display:flex;}
.app-brand-list-actions button:hover{color:var(--text);}
.app-sidebar-nav{padding:14px 10px;display:flex;flex-direction:column;gap:2px;}
.app-nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:5px;color:var(--muted);font-size:12px;font-family:var(--font-m);cursor:pointer;transition:all 0.12s;}
.app-nav-item:hover{background:rgba(255,255,255,0.04);color:var(--text);}
.app-nav-item.active{background:rgba(71,255,212,0.08);color:var(--accent2);}
.app-nav-item.disabled{opacity:0.4;cursor:not-allowed;pointer-events:none;}
.app-sidebar-footer{margin-top:auto;border-top:1px solid var(--border);padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.app-content{overflow-y:auto;height:calc(100vh - 49px);}
.app-dest{display:none;}
.app-dest.active{display:block;}
.segmented{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px;margin:24px 44px 0;width:fit-content;}
.segmented-btn{background:none;border:none;color:var(--muted);font-family:var(--font-m);font-size:12px;padding:7px 18px;border-radius:4px;cursor:pointer;transition:all 0.12s;}
.segmented-btn.active{background:var(--acc-car);color:#0E0E0E;font-weight:600;}
.segmented-btn[data-sub="post"].active{background:var(--acc-post);color:#fff;}
.app-empty-state{padding:80px 48px;text-align:center;color:var(--muted);}
.app-empty-state h3{font-family:var(--font-d);font-size:18px;color:var(--text);margin-bottom:8px;}
.app-empty-state p{font-size:12px;max-width:380px;margin:0 auto;}
.app-sidebar-toggle{display:none;}
```

- [ ] **Step 2: Verify the CSS is syntactically valid and doesn't affect current rendering**

Run: `python3 -c "import re; s=open('css/style.css').read(); print(s.count('{') , s.count('}'))"`
Expected: both numbers equal (braces balanced).

Then open `index.html` in a browser (or `python3 -m http.server 8000` and visit `http://localhost:8000`) and confirm the app looks and behaves exactly as before (no `.app-shell` element exists in the HTML yet, so none of this CSS is active).

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(nav): add app shell CSS foundation (additive, unused until next task)"
```

---

### Task 2: Replace the navigation shell (HTML + JS)

This is the core task: removes `#screenList` and the `#tabs` bar, introduces the sidebar with brand switcher and 3 destinations, and wires `app.switchDestination()`. Ends with a fully working app using the new navigation.

**Files:**
- Modify: `index.html:14-59` (topbar + screenList removal/replacement), `index.html:62` and `index.html:210` and `index.html:324` and `index.html:542` (panel wrapping)
- Modify: `js/app.js` (`showScreen`, `renderBrandGrid`, `filterBrands`, `openBrand`, `goHome`)
- Modify: `js/ui.js` (`switchTab`)

**Interfaces:**
- Produces: `app.switchDestination(dest)` where `dest` is `'identity' | 'create' | 'history'`. Produces: `app.toggleBrandSwitcher()`. Produces: `app.currentDestination` (string, one of the 3 values above). Produces: `app.currentCreateTab` (string, `'car' | 'post'`, replaces the destination-level meaning of the old `app.currentTab`).
- Consumes: `app.allBrands` (array, already populated by `loadBrandList()`), `app.filterBrands()` (existing method, will be modified in Step 6), `app.renderBrandGrid()` (existing method, will be replaced in Step 6), `app.openBrand(id)` (existing method, modified in Step 8), `app.isAdminUser` (boolean, unchanged).

- [ ] **Step 1: Replace the topbar markup and remove `#screenList`**

In `index.html`, replace lines 14–56 (the `<!-- ══ TOPBAR ══ -->` block through the closing `</div>` of `#screenList`):

Old:
```html
<!-- ══ TOPBAR ══ -->
<div class="topbar">
  <div class="topbar-left">
    <div class="brand-mark">ID<span>Content</span></div>
    <span id="userWelcome" class="user-welcome" style="display:none;">Olá, <span id="userEmail" class="user-email"></span></span>
    <div id="activeBrandName" class="active-brand-name" style="display:none;"></div>
    <div class="tabs" id="tabs" style="display:none;">
      <button class="tab-btn active-base" id="tabBase" onclick="switchTab('base')"><span class="tab-badge badge-base">Base</span> Marca</button>
      <button class="tab-btn" id="tabCar" onclick="switchTab('car')"><span class="tab-badge badge-car">Carrossel</span> Carrossel</button>
      <button class="tab-btn" id="tabPost" onclick="switchTab('post')"><span class="tab-badge badge-post">Post</span> Post</button>
    </div>
  </div>
  <div class="topbar-right">
    <div id="topbarActions" style="display:flex;align-items:center;gap:8px;">
      <!-- injected by state -->
    </div>
    <button class="btn btn-ghost btn-logout" id="btnLogout" onclick="auth.logout()" style="display:none;gap:6px;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Sair</button>
  </div>
</div>

<!-- ══ BRAND LIST (home screen) ══ -->
<div id="screenList" class="screen">
  <div class="list-header">
    <div>
      <h1 class="list-title">Suas Marcas</h1>
      <p class="list-subtitle">Selecione uma marca para editar ou crie uma nova.</p>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-ghost" id="btnAdminPanel" onclick="app.showScreen('admin')" style="display:none;color:var(--acc-base);border-color:rgba(180,130,255,0.3);">Painel Admin</button>
      <button class="btn btn-base" onclick="app.showTemplateModal()">+ Nova marca</button>
    </div>
  </div>
  <div class="list-search-bar">
    <input type="text" id="brandSearch" placeholder="Buscar por nome, nicho ou handle..." oninput="app.filterBrands()" style="flex:1;max-width:360px;">
    <select id="brandSort" onchange="app.filterBrands()" style="width:180px;">
      <option value="updated">Recentemente editadas</option>
      <option value="name">Nome A–Z</option>
    </select>
  </div>
  <div id="brandGrid" class="brand-grid">
    <div class="loading-state">Carregando marcas...</div>
  </div>
</div>
```

New:
```html
<!-- ══ TOPBAR ══ -->
<div class="topbar">
  <div class="topbar-left">
    <div class="brand-mark">ID<span>Content</span></div>
  </div>
  <div class="topbar-right">
    <div id="topbarActions" style="display:flex;align-items:center;gap:8px;">
      <!-- injected by state -->
    </div>
    <button class="btn btn-ghost btn-logout" id="btnLogout" onclick="auth.logout()" style="display:none;gap:6px;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Sair</button>
  </div>
</div>

<!-- ══ APP SHELL ══ -->
<div id="appShell" class="app-shell">
  <nav class="app-sidebar">
    <div class="app-sidebar-brand">
      <button class="app-brand-switcher" id="brandSwitcherBtn" onclick="app.toggleBrandSwitcher()">
        <span class="app-brand-switcher-name" id="appActiveBrandName">Selecionar marca</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="app-brand-dropdown" id="brandSwitcherDropdown" style="display:none;">
        <input type="text" id="brandSearch" placeholder="Buscar marca..." oninput="app.filterBrands()">
        <div id="brandGrid" class="app-brand-list">
          <div class="loading-state">Carregando marcas...</div>
        </div>
        <button class="btn btn-base" style="width:100%;justify-content:center;" onclick="app.showTemplateModal()">+ Nova marca</button>
      </div>
    </div>
    <div class="app-sidebar-nav">
      <a class="app-nav-item disabled" id="navIdentity" onclick="app.switchDestination('identity')">Identidade</a>
      <a class="app-nav-item disabled" id="navCreate" onclick="app.switchDestination('create')">Criar conteúdo</a>
      <a class="app-nav-item disabled" id="navHistory" onclick="app.switchDestination('history')">Histórico</a>
    </div>
    <div class="app-sidebar-footer">
      <span id="userWelcome" class="user-welcome" style="display:none;">Olá, <span id="userEmail" class="user-email"></span></span>
      <button class="btn btn-ghost" id="btnAdminPanel" onclick="app.showScreen('admin')" style="display:none;color:var(--acc-base);border-color:rgba(180,130,255,0.3);justify-content:center;">Painel Admin</button>
    </div>
  </nav>
  <div class="app-content" id="appContent">
    <div class="app-dest" id="destIdentity"></div>
    <div class="app-dest" id="destCreate">
      <div class="segmented" id="createSegmented">
        <button class="segmented-btn active" data-sub="car" onclick="app.setCreateTab('car')">Carrossel</button>
        <button class="segmented-btn" data-sub="post" onclick="app.setCreateTab('post')">Post</button>
      </div>
      <div id="createSubpanels"></div>
    </div>
    <div class="app-dest" id="destHistory">
      <div class="app-empty-state">
        <h3>Nenhum conteúdo gerado ainda</h3>
        <p>Em breve, as peças de carrossel e post que você gerar vão aparecer aqui, com histórico e preview.</p>
      </div>
    </div>
  </div>
</div>
```

Notes on this change:
- `#brandSearch` and `#brandGrid` keep their existing IDs (just moved inside the dropdown) so `app.filterBrands()` and `app.renderBrandGrid()`/`loadBrandList()` keep working without ID changes.
- `#brandSort` (the "Recentemente editadas / Nome A–Z" select) is intentionally dropped from the dropdown — it added complexity disproportionate to a compact dropdown list. `app.filterBrands()` is updated in Step 6 to stop reading it (default sort: most recently updated first, always).
- `#activeBrandName` (the pill in the old topbar) is removed; `#appActiveBrandName` (inside the new switcher button) replaces it — updated in Step 8.
- `#destIdentity` and `#createSubpanels` start empty; Step 2 moves `panelBase`/`panelCar`/`panelPost` into them.

- [ ] **Step 2: Move `panelBase` into `#destIdentity`, and `panelCar`/`panelPost` into `#createSubpanels`**

In `index.html`, the old structure is:
```html
<!-- ══ EDITOR ══ -->
<div id="screenEditor" class="screen" style="display:none;">

  <!-- BASE TAB -->
  <div class="tab-panel active" id="panelBase">
  <div class="layout base-focus">
  ...
  </div>
  </div>

  <!-- CARROSSEL TAB -->
  <div class="tab-panel" id="panelCar">
  <div class="layout car-focus">
  ...
  </div>
  </div>

  <!-- POST TAB -->
  <div class="tab-panel" id="panelPost">
  <div class="layout post-focus">
  ...
  </div>
  </div>

</div><!-- /screenEditor -->
```

Change it to (note: only the wrapper lines change — everything between `<div class="layout base-focus">` ... `</div>` for each panel is untouched, just re-indented/re-parented):

```html
<!-- BASE TAB → destIdentity -->
<div id="panelBase">
<div class="layout base-focus">
... (unchanged content) ...
</div>
</div>

<!-- CARROSSEL TAB → createSubpanels -->
<div class="create-subpanel active" id="panelCar">
<div class="layout car-focus">
... (unchanged content) ...
</div>
</div>

<!-- POST TAB → createSubpanels -->
<div class="create-subpanel" id="panelPost">
<div class="layout post-focus">
... (unchanged content) ...
</div>
</div>
```

Concretely:
1. Delete the line `<!-- ══ EDITOR ══ -->` and the line `<div id="screenEditor" class="screen" style="display:none;">`.
2. Delete the line `</div><!-- /screenEditor -->` at the end.
3. Move the entire `<div class="tab-panel active" id="panelBase">...</div>` block (everything from `<!-- BASE TAB -->` through its matching closing `</div>`) so it is the only child of `<div class="app-dest" id="destIdentity"></div>` from Step 1. Remove the `tab-panel active` classes from that div, leaving just `id="panelBase"` (the `active` visibility toggling is now handled by `.app-dest.active` on its parent, and `panelBase` no longer needs `display:none`/`display:block` toggling of its own).
4. Move the `<div class="tab-panel" id="panelCar">...</div>` block and the `<div class="tab-panel" id="panelPost">...</div>` block so they are both children of `<div id="createSubpanels"></div>` from Step 1. Change their classes from `tab-panel`/`tab-panel active` to `create-subpanel`/`create-subpanel active` respectively (Carrossel starts active, matching `createSegmented`'s default).

- [ ] **Step 3: Add CSS for `.create-subpanel` (small addition, same section as Task 1)**

Append to the `/* ══ APP SHELL ══ */` section added in Task 1 (`css/style.css`):

```css
.create-subpanel{display:none;}
.create-subpanel.active{display:block;}
```

- [ ] **Step 4: Verify HTML structure is valid before wiring JS**

Run:
```bash
grep -c 'id="panelBase"\|id="panelCar"\|id="panelPost"\|id="destIdentity"\|id="destCreate"\|id="destHistory"\|id="appShell"\|id="brandGrid"\|id="brandSearch"' index.html
```
Expected: `9` (each ID appears exactly once).

Run: `python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"`
Expected: both numbers equal (divs balanced) — if they differ, a closing tag was lost during the move in Step 2.

- [ ] **Step 5: Add `app.switchDestination()` and `app.toggleBrandSwitcher()` to `js/app.js`**

In `js/app.js`, add these methods to the `app` object (insert them right after the `showScreen(screen)` method, i.e. after the closing `},` that follows the line `if (screen === 'admin') { this.loadAdminUsers(); }`):

```javascript
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
```

- [ ] **Step 6: Replace `renderBrandGrid()` and update `filterBrands()` for the compact dropdown list**

In `js/app.js`, replace the entire `renderBrandGrid(brands)` method (from `renderBrandGrid(brands) {` through its closing `},`) with:

```javascript
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
```

Then, in the `filterBrands()` method, remove the lines that read `brandSort` and the `sort` branch on `name`, leaving it always sorted by `updated_at` descending. Replace:

Old:
```javascript
  filterBrands() {
    const searchEl = document.getElementById('brandSearch');
    const sortEl = document.getElementById('brandSort');
    const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const sort = sortEl ? sortEl.value : 'updated';
    const user = auth.getUser();
```

New:
```javascript
  filterBrands() {
    const searchEl = document.getElementById('brandSearch');
    const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const user = auth.getUser();
```

And replace:
```javascript
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
```

With:
```javascript
    filtered = [...filtered].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
```

- [ ] **Step 7: Simplify `showScreen()`**

In `js/app.js`, replace the entire `showScreen(screen)` method body. Old:

```javascript
  showScreen(screen) {
    document.getElementById('screenList').style.display = screen === 'list' ? 'block' : 'none';
    document.getElementById('screenEditor').style.display = screen === 'editor' ? 'block' : 'none';
    document.getElementById('screenAdmin').style.display = screen === 'admin' ? 'block' : 'none';
    document.getElementById('tabs').style.display = screen === 'editor' ? 'flex' : 'none';
    
    // Controla visibilidade de boas-vindas e selo da marca na topbar
    const activeBrandNameEl = document.getElementById('activeBrandName');
    const userWelcomeEl = document.getElementById('userWelcome');
    
    if (screen === 'editor') {
      if (activeBrandNameEl) activeBrandNameEl.style.display = 'inline-block';
      if (userWelcomeEl) userWelcomeEl.style.display = 'none';
    } else {
      if (activeBrandNameEl) activeBrandNameEl.style.display = 'none';
      if (userWelcomeEl && auth.isAuthenticated()) {
        userWelcomeEl.style.display = 'inline-flex';
      } else if (userWelcomeEl) {
        userWelcomeEl.style.display = 'none';
      }
    }

    this.renderTopbar(screen);
    if (screen === 'admin') {
      this.loadAdminUsers();
    }
  },
```

New:
```javascript
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
```

Note: `screen === 'list'` is no longer a valid call anywhere after this task — Step 9 removes the only caller (`goHome`'s old behavior). If `showScreen('list')` is still called from anywhere by the end of this task, treat it as a bug and fix the caller to call `app.showScreen('editor')` with no brand active, or simply not navigate (the brand switcher dropdown handles "go to another brand" now).

- [ ] **Step 8: Update `openBrand()` to enable nav items and default to the Identidade destination**

In `js/app.js`, inside `openBrand(id)`, find this block:

```javascript
      this.presets = presets || [];
      if (carousel) this.fillCarousel(carousel);
      if (post) this.fillPost(post);
      setSaveStatus('saved');
      this.isDirty = false;
      switchTab('base');
      updatePreviews();
      renderPresets();
      setTimeout(() => document.getElementById('bName')?.focus(), 150);
```

Replace with:

```javascript
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
```

Also, inside the same method, find:
```javascript
      if (brand) {
        app.currentBrandOriginalLogoUrl = brand.logo_url;
        this.fillBrand(brand);
        const activeBrandNameEl = document.getElementById('activeBrandName');
        if (activeBrandNameEl) {
          activeBrandNameEl.textContent = brand.name || 'Sem nome';
          activeBrandNameEl.style.display = 'block';
        }
      }
```

Replace with:
```javascript
      if (brand) {
        app.currentBrandOriginalLogoUrl = brand.logo_url;
        this.fillBrand(brand);
        const switcherNameEl = document.getElementById('appActiveBrandName');
        if (switcherNameEl) switcherNameEl.textContent = brand.name || 'Sem nome';
      }
```

- [ ] **Step 9: Remove `goHome()` calls to the old list screen; remove dead `activeBrandName` references in `updatePreviews()`**

In `js/app.js`, replace `goHome()`:

Old:
```javascript
  async goHome() {
    if (this.isDirty) {
      if (!confirm('Tem alterações não salvas. Deseja sair mesmo assim?')) return;
    }
    this.currentBrandId = null;
    this.isDirty = false;
    this.showScreen('list');
    await this.loadBrandList();
  },
```

New:
```javascript
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
```

In `js/ui.js`, inside `updatePreviews()`, remove this block (the new switcher name is already kept in sync by `openBrand`/`fillBrand`, not by `updatePreviews`, since the brand name field can change while editing — re-add a live update here instead):

Old:
```javascript
  const activeBrandNameEl = document.getElementById('activeBrandName');
  if (activeBrandNameEl && app.currentBrandId) {
    activeBrandNameEl.textContent = f('bName') || 'Sem nome';
  }
```

New:
```javascript
  const switcherNameEl = document.getElementById('appActiveBrandName');
  if (switcherNameEl && app.currentBrandId) {
    switcherNameEl.textContent = f('bName') || 'Sem nome';
  }
```

- [ ] **Step 10: Update `renderTopbar()` — remove the "Voltar" button (no longer meaningful) and keep Save/menu actions**

In `js/app.js`, inside `renderTopbar(screen)`, the `else` branch (used when `screen === 'editor'`) currently includes a "Voltar" button calling `app.goHome()`. Replace the whole `else` branch:

Old:
```javascript
    } else {
      el.innerHTML = `
        <div class="topbar-menu-wrap">
          <button class="btn btn-ghost topbar-menu-trigger" onclick="app.toggleMenu(event)" title="Mais ações"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
          <div class="topbar-menu" id="topbarMenu" style="display:none;">
            <button class="topbar-menu-item" onclick="baseCopy();app.closeMenu()">⌘ Copiar prompt Base</button>
            <button class="topbar-menu-item" onclick="carCopy();app.closeMenu()">⌘ Copiar prompt Carrossel</button>
            <button class="topbar-menu-item" onclick="postCopy();app.closeMenu()">⌘ Copiar prompt Post</button>
            <div class="topbar-menu-divider"></div>
            <button class="topbar-menu-item" onclick="app.downloadBrandConfig();app.closeMenu()">Baixar configuração (.json)</button>
            <div class="topbar-menu-divider"></div>
            <button class="topbar-menu-item topbar-menu-danger" onclick="app.confirmDelete();app.closeMenu()">Excluir marca</button>
          </div>
        </div>
        <button class="btn btn-ghost topbar-back-btn" onclick="app.goHome()" title="Voltar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>Voltar</span></button>
        <button class="btn btn-ghost topbar-save-btn" onclick="app.save()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Salvar</button>
      `;
    }
```

New:
```javascript
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
```

(`app.downloadBrandConfig()` for the *current* brand is dropped from this menu because the equivalent per-brand action already exists in the brand switcher list from Step 6 — `downloadBrandConfigById(app.currentBrandId)`. `confirmDelete()` stays here since it acts on `app.currentBrandId` directly and is a meaningful "danger zone" action while editing.)

- [ ] **Step 11: Update `js/ui.js`'s `switchTab()` — no longer a top-level destination switch**

`switchTab('base'|'car'|'post')` is called in a few places (`openBrand`, `fillPost` indirectly via `selectPostType`, etc.) expecting to toggle `panelBase`/`panelCar`/`panelPost` visibility. Since `panelBase` now lives alone inside `#destIdentity` (always the only child, no visibility toggling needed) and `panelCar`/`panelPost` visibility is now handled by `app.setCreateTab()`, simplify `switchTab()` to only handle the car/post case and leave `'base'` as a no-op:

Old:
```javascript
// ── TAB SWITCHING ──
function switchTab(tab) {
  ['base','car','post'].forEach(t => {
    document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.toggle('active', t === tab);
    document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`).className = `tab-btn${t === tab ? ' active-' + t : ''}`;
  });
  app.currentTab = tab;
}
```

New:
```javascript
// ── TAB SWITCHING ──
function switchTab(tab) {
  if (tab === 'base') { app.currentTab = 'base'; return; }
  app.setCreateTab(tab);
}
```

- [ ] **Step 12: Run syntax checks**

```bash
node --check js/app.js
node --check js/ui.js
```
Expected: no output, exit code 0 for both.

- [ ] **Step 13: Manual browser verification**

Serve the directory (`python3 -m http.server 8000`) and in the browser:
1. Log in. Confirm the brand switcher button shows "Selecionar marca" and the 3 nav items (Identidade/Criar conteúdo/Histórico) are visibly disabled (greyed out, not clickable).
2. Click the brand switcher, confirm the dropdown opens showing the brand list (or "+ Nova marca" if empty), with working search.
3. Click a brand (or create one). Confirm: dropdown closes, switcher button now shows the brand name, the 3 nav items become enabled, and "Identidade" is active showing the Base form fields.
4. Click "Criar conteúdo". Confirm the segmented control shows, "Carrossel" sub-tab active by default, and clicking "Post" switches to the Post form. Confirm both forms still have their own internal scroll-spy sidebar and prompt preview panel working as before.
5. Click "Histórico". Confirm the empty state message shows.
6. Edit a field (e.g. brand name on Identidade) and confirm the switcher button name updates live and autosave still triggers (watch the save status text).
7. Open the brand switcher again, click a *different* brand (or the same one), confirm it loads correctly and destination resets to Identidade.
8. Resize the browser to confirm nothing currently breaks visually above 920px width (mobile collapse is handled in Task 4 — below 920px the sidebar may look cramped/overflow at this point, that's expected and fixed next task).

- [ ] **Step 14: Commit**

```bash
git add index.html css/style.css js/app.js js/ui.js
git commit -m "feat(nav): replace lista/editor screens with sidebar workspace shell"
```

---

### Task 3: Responsive collapse for mobile (<920px)

**Files:**
- Modify: `css/style.css` (append to the media query block at `css/style.css:491`, and add a new mobile-specific block for `.app-shell`)
- Modify: `index.html` (add a hamburger toggle button in the topbar, visible only on mobile)
- Modify: `js/app.js` (toggle a class on `#appShell` to open/close the mobile drawer)

**Interfaces:**
- Consumes: `.app-shell`, `.app-sidebar` from Task 1/2.
- Produces: `app.toggleMobileSidebar()`, CSS class `.app-shell.mobile-open`.

- [ ] **Step 1: Add the hamburger button to the topbar**

In `index.html`, inside `<div class="topbar-left">`, right after the `brand-mark` div, add:

```html
    <button class="btn btn-ghost app-sidebar-toggle" id="appSidebarToggle" onclick="app.toggleMobileSidebar()" title="Menu"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
```

- [ ] **Step 2: Add responsive CSS**

In `css/style.css`, find the existing media query at line 491 (`@media (max-width: 920px) {`) and add these rules inside it (before its closing `}`):

```css
  .app-shell{grid-template-columns:1fr;}
  .app-shell.active{display:block;}
  .app-sidebar{position:fixed;left:0;top:49px;bottom:0;width:260px;transform:translateX(-100%);transition:transform 0.2s ease;z-index:250;background:var(--bg);}
  .app-shell.mobile-open .app-sidebar{transform:translateX(0);box-shadow:0 0 30px rgba(0,0,0,0.5);}
  .app-content{height:auto;}
  .app-sidebar-toggle{display:inline-flex;}
```

Also, outside the media query (so it applies at all widths but only has visible effect on mobile where the button exists), update `.app-sidebar-toggle` base rule already added in Task 1 — it's already `display:none;` by default, which is correct (desktop hides it; the media query above shows it on mobile). No change needed there.

- [ ] **Step 3: Add `app.toggleMobileSidebar()` and an overlay-click-to-close behavior**

In `js/app.js`, add this method near `switchDestination`:

```javascript
  toggleMobileSidebar() {
    document.getElementById('appShell').classList.toggle('mobile-open');
  },
```

Then, inside `switchDestination(dest)` (added in Task 2 Step 5), close the mobile drawer after navigating — add this line at the end of the method body, before its closing `},`:

```javascript
    document.getElementById('appShell').classList.remove('mobile-open');
```

- [ ] **Step 4: Run syntax check**

```bash
node --check js/app.js
```
Expected: no output.

- [ ] **Step 5: Manual browser verification**

In the browser dev tools, set viewport width to 375px (mobile):
1. Confirm the sidebar is hidden by default and the hamburger button is visible in the topbar.
2. Click the hamburger: sidebar slides in from the left as an overlay.
3. Click a destination (e.g. "Criar conteúdo"): sidebar closes automatically and the content area shows the selected destination, full width.
4. Click the hamburger again, open the brand switcher dropdown, select a different brand: dropdown and sidebar both close, new brand loads.
5. Resize back to >920px: confirm desktop layout (fixed sidebar, no hamburger) returns correctly.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat(nav): add mobile drawer collapse for the app sidebar (<920px)"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Sidebar with brand switcher (Task 2 Steps 1, 6, 8, 9) ✓. 3 fixed destinations (Task 2 Steps 1, 5, 8) ✓. Identidade = unchanged Base form (Task 2 Step 2) ✓. Criar conteúdo = segmented Carrossel/Post, unchanged forms (Task 2 Steps 1–3, 11) ✓. Histórico empty state (Task 2 Step 1) ✓. Brand actions moved into switcher list (Task 2 Step 6) ✓. Responsive collapse at 920px (Task 3) ✓. No DB/backend changes (explicitly excluded throughout, see Global Constraints) ✓.
- **Type/name consistency checked:** `app.switchDestination`, `app.toggleBrandSwitcher`, `app.setCreateTab`, `app.toggleMobileSidebar`, `app.currentDestination`, `app.currentCreateTab` are each defined once (Task 2 Steps 5–6, Task 3 Step 3) and referenced with the same names everywhere they're used later (Task 2 Steps 8–11, Task 3 Steps 1–3).
- **Open design decision resolved:** the spec flagged "compact list vs. grid" for the brand switcher — resolved as a compact list (Task 2 Step 6, `.app-brand-list-item`). The spec flagged "split `currentTab` into two variables" — resolved as `app.currentDestination` (which destination) + `app.currentCreateTab` (which sub-tab within Criar conteúdo), with `app.currentTab` kept as an alias for `currentCreateTab` for backward compatibility with code in `prompts.js`/`ui.js` that may still read `app.currentTab` (set alongside `currentCreateTab` in `setCreateTab()`, Task 2 Step 5).
