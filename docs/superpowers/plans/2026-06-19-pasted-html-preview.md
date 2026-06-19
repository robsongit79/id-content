# Preview de HTML Colado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user paste the HTML a LLM generated for a carousel or post and see it rendered inside the app (sandboxed iframe thumbnail + expand-to-full-size modal), closing the feedback loop without touching any existing content form.

**Architecture:** Pure additive HTML/CSS/JS changes. A new "paste & render" block is added to the existing `<aside class="preview-panel">` in both the Carrossel and Post panels. A single new modal (`#previewExpandModal`) is shared by both panels for the "expand to full size" view. All logic is plain DOM manipulation in `js/ui.js` (consistent with where `baseCopy`/`carCopy`/`postCopy`/`toast` already live); two one-line hooks in `js/app.js` clear the preview state when the user navigates away.

**Tech Stack:** Vanilla JavaScript (ES6+), plain CSS, no framework, no build step — matches the existing codebase exactly.

## Global Constraints

- No automated test framework exists in this repo. Verification for every step is: (a) `node --check <file>.js` for any modified `.js` file; (b) a manual browser check of the specific behavior described in the step (open `index.html` directly, or serve the directory with `python3 -m http.server 8000`).
- Do not modify `js/db.js`, `js/auth.js`, `js/supabase.js`, `js/prompts.js`, `js/templates.js`, `js/claude-generate.js`, or any database/Supabase schema. This phase is presentation-only and introduces no persistence.
- Do not modify any existing content form field (Base/Carrossel/Post sections) — only additive changes inside the existing `<aside class="preview-panel">` blocks.
- Reuse existing CSS tokens from `css/style.css:1-6` (`--bg`, `--surface`, `--border`, `--border-hi`, `--text`, `--muted`, `--label`, `--accent2`, `--acc-base`, `--acc-car`, `--acc-post`, `--font-d`, `--font-m`). Do not introduce new color values.
- The pasted HTML must render inside a `<iframe sandbox="allow-scripts">` — never add `allow-same-origin` to any sandbox attribute in this feature, and never render pasted HTML by any method other than the iframe's `srcdoc` (no `innerHTML`, no `document.write` on the main document).
- No network calls, no new database table, no change to any existing Supabase schema.

---

### Task 1: CSS foundation for the paste-and-render UI

**Files:**
- Modify: `css/style.css` (append at the very end of the file, after the existing `@media (max-width: 920px) { ... }` block that currently ends the file at line 818)

**Interfaces:**
- Consumes: existing CSS custom properties from `:root` (`css/style.css:1-6`).
- Produces: CSS classes `.pasted-preview`, `.pasted-preview-frame-wrap`, `.pasted-preview-frame`, `.pasted-preview-expand`, `.modal-header-flex`, `.expanded-preview-frame` — relied on by Task 2.

- [ ] **Step 1: Append the new CSS section**

Add this block at the very end of `css/style.css` (after the closing `}` of the existing `@media (max-width: 920px)` block):

```css

/* ══ PASTED HTML PREVIEW ══ */
.pasted-preview{border-top:1px solid var(--border);padding-top:16px;margin-top:4px;}
.pasted-preview textarea{font-size:11px;min-height:80px;}
.pasted-preview-frame-wrap{position:relative;margin-top:12px;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:#fff;display:none;align-items:center;justify-content:center;height:200px;}
.pasted-preview-frame{border:none;transform-origin:top left;pointer-events:none;}
.pasted-preview-expand{position:absolute;bottom:8px;right:8px;padding:4px 10px;font-size:10px;background:rgba(14,14,14,0.7);backdrop-filter:blur(4px);}
.modal-header-flex{display:flex;align-items:center;justify-content:space-between;}
.expanded-preview-frame{border:none;}
```

- [ ] **Step 2: Verify the CSS is syntactically valid and doesn't affect current rendering**

Run: `python3 -c "import re; s=open('css/style.css').read(); print(s.count('{') , s.count('}'))"`
Expected: both numbers equal (braces balanced).

Open `index.html` in a browser (or `python3 -m http.server 8000`) and confirm the app looks and behaves exactly as before — none of these new classes are referenced by any HTML yet, so nothing visible changes.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(preview): add CSS foundation for pasted-HTML preview (additive, unused until next task)"
```

---

### Task 2: Paste, render, and expand the pasted HTML

**Files:**
- Modify: `index.html` (add markup to both `preview-panel` asides, add the expand modal)
- Modify: `js/ui.js` (add the rendering/expand/clear logic)

**Interfaces:**
- Consumes: CSS classes from Task 1 (`.pasted-preview`, `.pasted-preview-frame-wrap`, `.pasted-preview-frame`, `.pasted-preview-expand`, `.expanded-preview-frame`, `.modal-header-flex`), and the existing `.modal-overlay`/`.modal-card`/`.modal-header`/`.modal-title` classes already used by `#templateModal`.
- Produces: global functions `renderPastedHtml(panel)`, `expandPreview(panel)`, `closeExpandedPreview()`, `clearPastedPreview(panel)` where `panel` is `'car' | 'post'` — relied on by Task 3 (`clearPastedPreview`) and by the `onclick` handlers added to `index.html` in this task.

- [ ] **Step 1: Add the paste-and-render block to the Carrossel panel**

In `index.html`, find this exact block (the last two children of the Carrossel `<aside class="preview-panel">`, currently ending the aside):

```html
      <div><button class="btn btn-copy" style="width:100%;display:flex;justify-content:center;" onclick="carCopy()">⌘ Copiar prompt</button><div class="copy-success" id="carCopyMsg">✓ Copiado</div></div>
      <div style="font-size:10px;color:var(--muted);line-height:1.6;">Para gerar o carrossel, cole este prompt unificado no Claude.</div>
    </aside>
```

Replace it with:

```html
      <div><button class="btn btn-copy" style="width:100%;display:flex;justify-content:center;" onclick="carCopy()">⌘ Copiar prompt</button><div class="copy-success" id="carCopyMsg">✓ Copiado</div></div>
      <div style="font-size:10px;color:var(--muted);line-height:1.6;">Para gerar o carrossel, cole este prompt unificado no Claude.</div>
      <div class="pasted-preview">
        <div class="preview-label">Visualizar resultado</div>
        <textarea id="carPastedHtml" placeholder="Cole aqui o HTML que o Claude gerou"></textarea>
        <button class="btn btn-car" style="width:100%;justify-content:center;margin-top:8px;" onclick="renderPastedHtml('car')">Renderizar</button>
        <div class="pasted-preview-frame-wrap" id="carPastedFrameWrap">
          <iframe id="carPastedFrame" class="pasted-preview-frame" sandbox="allow-scripts"></iframe>
          <button class="btn btn-ghost pasted-preview-expand" onclick="expandPreview('car')">⤢ Expandir</button>
        </div>
      </div>
    </aside>
```

- [ ] **Step 2: Add the paste-and-render block to the Post panel**

In `index.html`, find this exact block (the last two children of the Post `<aside class="preview-panel">`, currently ending the aside):

```html
      <div><button class="btn btn-copy" style="width:100%;display:flex;justify-content:center;" onclick="postCopy()">⌘ Copiar prompt</button><div class="copy-success" id="postCopyMsg">✓ Copiado</div></div>
      <div style="font-size:10px;color:var(--muted);line-height:1.6;">Para gerar o post, cole este prompt unificado no Claude.</div>
    </aside>
```

Replace it with:

```html
      <div><button class="btn btn-copy" style="width:100%;display:flex;justify-content:center;" onclick="postCopy()">⌘ Copiar prompt</button><div class="copy-success" id="postCopyMsg">✓ Copiado</div></div>
      <div style="font-size:10px;color:var(--muted);line-height:1.6;">Para gerar o post, cole este prompt unificado no Claude.</div>
      <div class="pasted-preview">
        <div class="preview-label">Visualizar resultado</div>
        <textarea id="postPastedHtml" placeholder="Cole aqui o HTML que o Claude gerou"></textarea>
        <button class="btn btn-post" style="width:100%;justify-content:center;margin-top:8px;" onclick="renderPastedHtml('post')">Renderizar</button>
        <div class="pasted-preview-frame-wrap" id="postPastedFrameWrap">
          <iframe id="postPastedFrame" class="pasted-preview-frame" sandbox="allow-scripts"></iframe>
          <button class="btn btn-ghost pasted-preview-expand" onclick="expandPreview('post')">⤢ Expandir</button>
        </div>
      </div>
    </aside>
```

Note: these two blocks are textually identical in structure but for the `car`/`post` substring in every ID and the `btn-car`/`btn-post` button class — do not swap them, double-check each panel gets its own matching prefix.

- [ ] **Step 3: Add the expand modal**

In `index.html`, find this exact line (the closing tag of `#templateModal`, immediately followed by a blank line and the admin screen comment):

```html
  </div>
</div>

<!-- ══ ADMINISTRATIVE SCREEN ══ -->
```

Replace it with:

```html
  </div>
</div>

<!-- ══ PASTED HTML PREVIEW — EXPAND MODAL ══ -->
<div id="previewExpandModal" class="modal-overlay" style="display:none;" onclick="if(event.target===this)closeExpandedPreview()">
  <div class="modal-card" style="max-width:96vw;width:fit-content;">
    <div class="modal-header modal-header-flex">
      <div class="modal-title">Preview</div>
      <button class="btn btn-ghost" onclick="closeExpandedPreview()">Fechar</button>
    </div>
    <div style="padding:24px;display:flex;justify-content:center;overflow:auto;max-height:90vh;">
      <iframe id="expandedPreviewFrame" class="expanded-preview-frame" sandbox="allow-scripts"></iframe>
    </div>
  </div>
</div>

<!-- ══ ADMINISTRATIVE SCREEN ══ -->
```

- [ ] **Step 4: Verify HTML structure after Steps 1–3**

Run:
```bash
grep -c 'id="carPastedHtml"\|id="carPastedFrameWrap"\|id="carPastedFrame"\|id="postPastedHtml"\|id="postPastedFrameWrap"\|id="postPastedFrame"\|id="previewExpandModal"\|id="expandedPreviewFrame"' index.html
```
Expected: `8` (each ID appears exactly once).

Run: `python3 -c "import re; s=open('index.html').read(); print(s.count('<div'), s.count('</div>'))"`
Expected: both numbers equal (div balance preserved).

- [ ] **Step 5: Add the rendering/expand/clear logic to `js/ui.js`**

In `js/ui.js`, add this block at the very end of the file (after the existing `setPreviewRatio(ratio)` function and its closing `}`):

```javascript

// ── PASTED HTML PREVIEW ──
function stripCodeFences(text) {
  let t = text.trim();
  t = t.replace(/^```(?:html)?\s*\n?/i, '');
  t = t.replace(/\n?```\s*$/, '');
  return t.trim();
}

function getPastedCanvasSize(html) {
  const wMatch = html.match(/data-canvas-width=["']?(\d+)/i);
  const hMatch = html.match(/data-canvas-height=["']?(\d+)/i);
  return {
    width: wMatch ? parseInt(wMatch[1], 10) : 1080,
    height: hMatch ? parseInt(hMatch[1], 10) : 1080
  };
}

function renderPastedHtml(panel) {
  const textareaId = panel === 'car' ? 'carPastedHtml' : 'postPastedHtml';
  const wrapId = panel === 'car' ? 'carPastedFrameWrap' : 'postPastedFrameWrap';
  const frameId = panel === 'car' ? 'carPastedFrame' : 'postPastedFrame';
  const raw = document.getElementById(textareaId).value;
  if (!raw.trim()) { toast('Cole o HTML antes de renderizar.', 'error'); return; }
  const html = stripCodeFences(raw);
  const wrap = document.getElementById(wrapId);
  const frame = document.getElementById(frameId);
  const { width, height } = getPastedCanvasSize(html);
  frame.setAttribute('width', width);
  frame.setAttribute('height', height);
  wrap.style.display = 'flex';
  frame.onload = () => {
    const scale = Math.min(wrap.clientWidth / width, wrap.clientHeight / height);
    frame.style.transform = `scale(${scale})`;
  };
  frame.srcdoc = html;
}

function expandPreview(panel) {
  const textareaId = panel === 'car' ? 'carPastedHtml' : 'postPastedHtml';
  const raw = document.getElementById(textareaId).value;
  if (!raw.trim()) return;
  const html = stripCodeFences(raw);
  const { width, height } = getPastedCanvasSize(html);
  const modal = document.getElementById('previewExpandModal');
  const frame = document.getElementById('expandedPreviewFrame');
  frame.setAttribute('width', width);
  frame.setAttribute('height', height);
  frame.style.transform = '';
  modal.style.display = 'flex';
  frame.onload = () => {
    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.8;
    const scale = Math.min(1, maxW / width, maxH / height);
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = 'top left';
  };
  frame.srcdoc = html;
}

function closeExpandedPreview() {
  document.getElementById('previewExpandModal').style.display = 'none';
  document.getElementById('expandedPreviewFrame').srcdoc = '';
}

function clearPastedPreview(panel) {
  const textareaId = panel === 'car' ? 'carPastedHtml' : 'postPastedHtml';
  const wrapId = panel === 'car' ? 'carPastedFrameWrap' : 'postPastedFrameWrap';
  const frameId = panel === 'car' ? 'carPastedFrame' : 'postPastedFrame';
  document.getElementById(textareaId).value = '';
  document.getElementById(wrapId).style.display = 'none';
  document.getElementById(frameId).srcdoc = '';
}
```

- [ ] **Step 6: Run syntax check**

```bash
node --check js/ui.js
```
Expected: no output, exit code 0.

- [ ] **Step 7: Manual browser verification**

Serve the directory (`python3 -m http.server 8000`) and in the browser:
1. Log in, open a brand, go to "Criar conteúdo" → Carrossel.
2. In the "Visualizar resultado" box, paste a small test HTML, e.g.:
   ```html
   <!DOCTYPE html><html><head><style>body{margin:0;width:400px;height:400px;background:#1E40AF;color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-family:sans-serif;}</style></head><body>Teste</body></html>
   ```
   (no `data-canvas-width`/`data-canvas-height` attributes, so this exercises the 1080 fallback — the thumbnail will show this 400×400 div scaled down inside a 1080×1080 frame, which is expected since the HTML itself didn't declare its real size; this is fine for this manual smoke test, it's just confirming the mechanism renders something instead of producing exact pixel-perfect output).
3. Click "Renderizar" — confirm a thumbnail appears showing the blue "Teste" box, with an "⤢ Expandir" button overlaid.
4. Click "Expandir" — confirm the modal opens showing the same content larger, with a working "Fechar" button (and clicking outside the modal card also closes it).
5. Try pasting the same HTML wrapped in ` ```html ... ``` ` fences — confirm it still renders correctly (fences stripped).
6. Click "Renderizar" with the textarea empty — confirm a red error toast appears and nothing renders.
7. Repeat steps 2–3 in the Post panel (`postPastedHtml`/`postPastedFrameWrap`/`postPastedFrame`) — confirm it works independently of the Carrossel panel's state.

- [ ] **Step 8: Commit**

```bash
git add index.html js/ui.js
git commit -m "feat(preview): add paste-and-render HTML preview to Carrossel and Post panels"
```

---

### Task 3: Clear preview state on navigation

**Files:**
- Modify: `js/app.js:129-138` (`switchDestination`), `js/app.js:159-163` (`setCreateTab`)

**Interfaces:**
- Consumes: `clearPastedPreview(panel)` produced by Task 2 (global function in `js/ui.js`, loaded before `js/app.js` in `index.html`'s script tag order).

- [ ] **Step 1: Clear both panels' preview state in `switchDestination()`**

In `js/app.js`, find this exact method:

```javascript
  switchDestination(dest) {
    if (!this.currentBrandId) return;
    this.currentDestination = dest;
    document.getElementById('destWelcome').classList.remove('active');
    ['identity', 'create', 'history'].forEach(d => {
      document.getElementById(`dest${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
      document.getElementById(`nav${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
    });
    document.getElementById('appShell').classList.remove('mobile-open');
  },
```

Replace it with:

```javascript
  switchDestination(dest) {
    if (!this.currentBrandId) return;
    this.currentDestination = dest;
    document.getElementById('destWelcome').classList.remove('active');
    ['identity', 'create', 'history'].forEach(d => {
      document.getElementById(`dest${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
      document.getElementById(`nav${d.charAt(0).toUpperCase() + d.slice(1)}`).classList.toggle('active', d === dest);
    });
    document.getElementById('appShell').classList.remove('mobile-open');
    clearPastedPreview('car');
    clearPastedPreview('post');
  },
```

- [ ] **Step 2: Clear both panels' preview state in `setCreateTab()`**

In `js/app.js`, find this exact method (note: only show the part that changes — the method has more lines after `app.currentTab = sub;` that must stay untouched):

```javascript
  setCreateTab(sub) {
    this.currentCreateTab = sub;
    document.querySelectorAll('#createSegmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.getElementById('panelCar').classList.toggle('active', sub === 'car');
    document.getElementById('panelPost').classList.toggle('active', sub === 'post');
```

Replace just this excerpt with:

```javascript
  setCreateTab(sub) {
    this.currentCreateTab = sub;
    document.querySelectorAll('#createSegmented .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
    document.getElementById('panelCar').classList.toggle('active', sub === 'car');
    document.getElementById('panelPost').classList.toggle('active', sub === 'post');
    clearPastedPreview('car');
    clearPastedPreview('post');
```

(Leave every line after this excerpt — `app.currentTab = sub;` and anything following it in the method body — exactly as it is; only the five lines shown above change, by adding the two `clearPastedPreview` calls before the method's existing remaining lines.)

- [ ] **Step 3: Run syntax check**

```bash
node --check js/app.js
```
Expected: no output, exit code 0.

- [ ] **Step 4: Manual browser verification**

Serve the directory and in the browser:
1. Open a brand, go to Carrossel, paste and render a test HTML (reuse the snippet from Task 2 Step 7) — confirm the thumbnail shows.
2. Click "Post" in the segmented control — confirm the Carrossel thumbnail/textarea are cleared when you switch back to Carrossel (i.e., go Post → Carrossel and confirm the textarea is empty and no thumbnail shows).
3. Paste and render in Post, then click "Identidade" in the sidebar, then click "Criar conteúdo" again — confirm both Carrossel and Post previews are cleared.
4. Open the brand switcher and select a different brand (or the same brand again) — confirm both previews are cleared after the brand loads.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat(preview): clear pasted-HTML preview state on destination/tab navigation"
```

---

## Plan Self-Review Notes

- **Spec coverage:** textarea + "Renderizar" button in both panels (Task 2 Steps 1-2) ✓. Sandboxed iframe via `srcdoc`, no `allow-same-origin` (Task 2 Step 5) ✓. Code-fence stripping (Task 2 Step 5, `stripCodeFences`) ✓. Scaled thumbnail respecting real proportions via `data-canvas-width`/`data-canvas-height` with 1080×1080 fallback (Task 2 Step 5, `getPastedCanvasSize`) ✓. "Expandir" modal at real size, fit to viewport (Task 2 Steps 3, 5) ✓. Empty-textarea error toast (Task 2 Step 5, `renderPastedHtml`'s early return) ✓. Clear on destination/tab/brand switch (Task 3; brand-switch case covered transitively because `openBrand()` already calls `setCreateTab('car')` then `switchDestination('identity')`, both of which now clear both panels) ✓. No DB/backend/content-form changes (explicitly excluded throughout, see Global Constraints) ✓.
- **Type/name consistency checked:** `renderPastedHtml`, `expandPreview`, `closeExpandedPreview`, `clearPastedPreview`, `stripCodeFences`, `getPastedCanvasSize` are each defined once (Task 2 Step 5) and referenced with the same names and the same `panel: 'car'|'post'` argument convention everywhere they're used later (Task 2 Steps 1-3, Task 3 Steps 1-2).
- **Open design decision resolved:** the spec flagged measuring `scrollWidth`/`scrollHeight` as a possible alternative to the `data-canvas-width`/`data-canvas-height` attributes. Resolved as: use the attributes with a 1080×1080 fallback only, for this phase — reading layout dimensions across a sandboxed iframe boundary adds complexity (timing with `onload`, potential `null` if the document inside has no explicit sized root) disproportionate to the value, and the fallback already produces a reasonable result for the common Instagram-square case. Revisit only if real-world generated HTML proves the fallback insufficient.
