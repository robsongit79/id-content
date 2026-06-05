const claudeGenerate = {
  mode: 'carousel',

  open(currentTab) {
    this.mode = currentTab === 'post' ? 'post' : 'carousel';
    this._syncModeButtons();
    document.getElementById('claudeContent').value = '';
    document.getElementById('claudeResult').value = '';
    document.getElementById('claudeResultArea').style.display = 'none';
    document.getElementById('claudeModal').style.display = 'flex';
    setTimeout(() => document.getElementById('claudeContent').focus(), 100);
  },

  close() {
    document.getElementById('claudeModal').style.display = 'none';
  },

  setMode(mode) {
    this.mode = mode;
    this._syncModeButtons();
    document.getElementById('claudeResultArea').style.display = 'none';
  },

  _syncModeButtons() {
    document.getElementById('claudeModeCar').classList.toggle('active', this.mode === 'carousel');
    document.getElementById('claudeModePost').classList.toggle('active', this.mode === 'post');
  },

  build() {
    const content = document.getElementById('claudeContent').value.trim();
    if (!content) {
      toast('Cole o conteúdo bruto antes de montar.', 'error');
      return;
    }

    const configPrompt = this.mode === 'carousel'
      ? prompts.buildCarousel()
      : prompts.buildPost();

    if (!configPrompt) {
      toast('Preencha pelo menos o nome da marca.', 'error');
      return;
    }

    const modeLabel = this.mode === 'carousel' ? 'carrossel' : 'post';
    const combined = `${configPrompt}

---

## CONTEÚDO
${content}

---

Com base na configuração acima, crie um ${modeLabel} completo em HTML usando o conteúdo fornecido.`;

    document.getElementById('claudeResult').value = combined;
    document.getElementById('claudeResultArea').style.display = 'block';
    document.getElementById('claudeResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  copyResult() {
    const result = document.getElementById('claudeResult').value;
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => toast('Prompt copiado! Cole no Claude.', 'success'));
  },
};
