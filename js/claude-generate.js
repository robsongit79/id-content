const claudeGenerate = {
  mode: 'carousel',

  open(currentTab) {
    this.mode = currentTab === 'post' ? 'post' : 'carousel';
    this._syncModeButtons();
    document.getElementById('claudeContent').value = '';
    document.getElementById('claudeResult').value = '';
    document.getElementById('claudeResultArea').style.display = 'none';
    document.getElementById('claudeError').style.display = 'none';
    document.getElementById('claudeGenerateBtn').disabled = false;
    document.getElementById('claudeSpinner').style.display = 'none';
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
    document.getElementById('claudeError').style.display = 'none';
  },

  _syncModeButtons() {
    document.getElementById('claudeModeCar').classList.toggle('active', this.mode === 'carousel');
    document.getElementById('claudeModePost').classList.toggle('active', this.mode === 'post');
  },

  async generate() {
    const content = document.getElementById('claudeContent').value.trim();
    if (!content) {
      toast('Cole o conteúdo bruto antes de gerar.', 'error');
      return;
    }

    const systemPrompt = this.mode === 'carousel'
      ? prompts.buildCarousel()
      : prompts.buildPost();

    if (!systemPrompt) {
      toast('Preencha pelo menos o nome da marca.', 'error');
      return;
    }

    const modeLabel = this.mode === 'carousel' ? 'carrossel' : 'post';
    const btn = document.getElementById('claudeGenerateBtn');
    const spinner = document.getElementById('claudeSpinner');
    btn.disabled = true;
    spinner.style.display = 'inline-block';
    document.getElementById('claudeError').style.display = 'none';
    document.getElementById('claudeResultArea').style.display = 'none';

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          userContent: `Usando a configuração acima, crie um ${modeLabel} completo em HTML com base no seguinte conteúdo:\n\n${content}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao chamar Claude API');

      document.getElementById('claudeResult').value = data.result;
      document.getElementById('claudeResultArea').style.display = 'block';
    } catch (e) {
      const errEl = document.getElementById('claudeError');
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
    }
  },

  copyResult() {
    const result = document.getElementById('claudeResult').value;
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => toast('Resultado copiado!', 'success'));
  },
};
