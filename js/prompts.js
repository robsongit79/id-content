// Prompt builders
const prompts = {

  highlight(text, sc) {
    // 1. Escapar caracteres HTML para que apareçam literalmente na tela
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Aplicar a colorização usando classes CSS
    return escaped
      .replace(/^(# .*)/gm, `<span class="${sc}">$1</span>`)
      .replace(/^(## .*)/gm, `<span class="${sc}">$1</span>`)
      .replace(/^(---.*)/gm, '<span class="sep">$1</span>')
      .replace(/^([A-ZÀ-Ú\. \/&º:N]+:)\s+(.+)/gm, '<span class="key">$1</span> <span class="val">$2</span>')
      // Adicionar destaque para as tags XML escapadas
      .replace(/(&lt;\/?[a-z_]+&gt;)/g, '<span class="key" style="color:var(--accent2); font-weight:bold;">$1</span>')
      .replace(/\n/g, '<br>');
  },

  buildBase() {
    const s = [];
    s.push(`<diretrizes_marca>`);
    s.push(`# BASE — ${f('bName') || 'MARCA'}\n# Identidade visual e tom de voz. Usada em todos os conteúdos.`);

    const s1 = [];
    if (f('bName'))        s1.push(`MARCA:          ${f('bName')}`);
    if (f('bHandle'))      s1.push(`HANDLE:         ${f('bHandle')}`);
    if (f('bTagline'))     s1.push(`TAGLINE:        ${f('bTagline')}`);
    if (f('bNiche'))       s1.push(`NICHO:          ${f('bNiche')}`);
    if (f('bPositioning')) s1.push(`POSICIONAMENTO: ${f('bPositioning')}`);
    const activeLogo = document.getElementById('bLogoActive')?.checked || false;
    if (activeLogo) {
      s1.push("LOGO:           Ativa — Solicite o envio do link da logo ao usuário.");
    } else {
      s1.push("LOGO:           Nenhuma — não exibir logo.");
    }
    if (s1.length) s.push(`## 01 · IDENTIDADE\n${s1.join('\n')}`);

    const s2 = [];
    const colorLabels = { cPrimaryHex:'PRIMÁRIA', cSecondaryHex:'SECUNDÁRIA', cAccentHex:'ACENTO', cDarkHex:'FUNDO ESCURO', cLightHex:'FUNDO CLARO', cTextHex:'TEXTO' };
    Object.entries(colorLabels).forEach(([id, label]) => {
      const v = document.getElementById(id)?.value;
      if (v) s2.push(`${label}:${' '.repeat(Math.max(1, 16 - label.length))}${v}`);
    });
    if (f('bColorsNotes')) s2.push(`NOTAS:          ${f('bColorsNotes')}`);
    if (s2.length) s.push(`## 02 · PALETA\n${s2.join('\n')}`);

    const s3 = [];
    if (f('bFontDisplay'))  s3.push(`FONTE DISPLAY:  ${f('bFontDisplay')}`);
    if (f('bFontBody'))     s3.push(`FONTE CORPO:    ${f('bFontBody')}`);
    if (f('bSizeTitle'))    s3.push(`TAMANHO TÍTULO: ${f('bSizeTitle')}`);
    if (f('bSizeSubtitle')) s3.push(`TAMANHO SUBTÍT: ${f('bSizeSubtitle')}`);
    if (f('bSizeBody'))     s3.push(`TAMANHO CORPO:  ${f('bSizeBody')}`);
    if (f('bWeightTitle'))  s3.push(`PESO TÍTULO:    ${f('bWeightTitle')}`);
    if (f('bItalicUse'))    s3.push(`ITÁLICO:        ${f('bItalicUse')}`);
    if (f('bTypoNotes'))    s3.push(`NOTAS:          ${f('bTypoNotes')}`);
    if (s3.length) s.push(`## 03 · TIPOGRAFIA\n${s3.join('\n')}`);

    const s4 = [];
    if (app.chipData.personality.length) s4.push(`PERSONALIDADE:  ${app.chipData.personality.join(', ')}`);
    if (f('bToneMain'))    s4.push(`TOM:            ${f('bToneMain')}`);
    if (f('bToneReader'))  s4.push(`TRATAMENTO:     ${f('bToneReader')}`);
    if (f('bToneNever'))   s4.push(`NUNCA:          ${f('bToneNever')}`);
    if (f('bToneExample')) s4.push(`EXEMPLO:        "${f('bToneExample')}"`);
    if (s4.length) s.push(`## 04 · TOM DE VOZ\n${s4.join('\n')}`);

    const s5 = [], sv = getRadio('styleVisual');
    if (sv)               s5.push(`ESTILO:         ${sv}`);
    if (f('bBorderUse'))  s5.push(`BORDAS:         ${f('bBorderUse')}`);
    if (f('bCornerRadius'))s5.push(`CANTOS:         ${f('bCornerRadius')}`);
    if (f('bBgRhythm'))   s5.push(`RITMO FUNDOS:   ${f('bBgRhythm')}`);
    if (f('bGradientUse'))s5.push(`GRADIENTES:     ${f('bGradientUse')}`);
    if (f('bVisualSig'))  s5.push(`ASSINATURA:     ${f('bVisualSig')}`);
    if (s5.length) s.push(`## 05 · VISUAL\n${s5.join('\n')}`);

    const s6 = [];
    if (f('bAudience')) s6.push(`PÚBLICO:        ${f('bAudience')}`);
    if (f('bPain'))     s6.push(`DOR:            ${f('bPain')}`);
    if (f('bDesire'))   s6.push(`DESEJO:         ${f('bDesire')}`);
    if (app.chipData.goal.length) s6.push(`OBJETIVOS:      ${app.chipData.goal.join(', ')}`);
    if (app.chipData.topic.length) s6.push(`PAUTAS:         ${app.chipData.topic.join(', ')}`);
    if (f('bPostFrequency')) s6.push(`FREQUÊNCIA:     ${f('bPostFrequency')}`);
    if (s6.length) s.push(`## 06 · AUDIÊNCIA\n${s6.join('\n')}`);

    const s7 = [];
    if (f('bReferences')) s7.push(`REFERÊNCIAS:    ${f('bReferences')}`);
    if (f('bForbidden'))  s7.push(`PROIBIDO:       ${f('bForbidden')}`);
    if (f('bCanonical'))  s7.push(`CANÔNICO:       ${f('bCanonical')}`);
    if (app.chipData.hashtag.length) s7.push(`HASHTAGS:       ${app.chipData.hashtag.map(h => h.startsWith('#') ? h : '#' + h).join(' ')}`);
    if (f('bCompetitors')) s7.push(`CONCORRENTES:   ${f('bCompetitors')}`);
    if (f('bFinalNotes')) s7.push(`NOTAS:          ${f('bFinalNotes')}`);
    if (s7.length) s.push(`## 07 · REFERÊNCIAS\n${s7.join('\n')}`);

    s.push(`</diretrizes_marca>`);
    if (s.length <= 3) return null;
    return s.join('\n\n');
  },

  buildCarousel() {
    const base = this.buildBase();
    if (!base) return null;
    const s = [];
    s.push(`# PROMPT UNIFICADO PARA CLAUDE / LLM\nUse as especificações abaixo para gerar o código do carrossel.`);
    s.push(base);

    const c = [];
    c.push(`<configuracao_formato>`);
    c.push(`# CARROSSEL — ${f('bName') || 'MARCA'}\n# Configurações do formato.`);

    const c1 = [];
    const lh = getRadio('carLogoPosHero'), lc = getRadio('carLogoPosCta');
    const activeLogo = document.getElementById('bLogoActive')?.checked || false;
    if (activeLogo) {
      if (lh) c1.push(`LOGO CAPA:      ${lh}`);
      if (lc) c1.push(`LOGO CTA:       ${lc}`);
      c1.push(`LOGO:           Solicite a imagem da logo ao usuário. Quando ela for fornecida, respeite a seguinte regra de exibição:`);
      c1.push(`LOGO DISPLAY:   Sempre exibir a logo em tamanho e proporção originais, com object-fit: contain. Nunca aplicar border-radius, overflow: hidden, recorte circular ou qualquer máscara de forma. O container deve se adaptar à logo, não o contrário.`);
    } else {
      c1.push(`LOGO:           Nenhuma — não exibir placeholder nos slides de capa e CTA. O carrossel deve ser criado sem nenhum tipo de logo.`);
    }
    if (c1.length) c.push(`## LOGO\n${c1.join('\n')}`);

    const c2 = [];
    if (f('cFormat'))    c2.push(`FORMATO:        ${f('cFormat')}`);
    if (f('cSlideCount'))c2.push(`Nº SLIDES:      ${f('cSlideCount')}`);
    if (f('cSequence'))  c2.push(`SEQUÊNCIA:      ${f('cSequence')}`);
    if (f('cFixedEl'))   c2.push(`FIXOS:          ${f('cFixedEl')}`);
    if (c2.length) c.push(`## ESTRUTURA\n${c2.join('\n')}`);

    const c3 = [];
    if (f('cSlide1'))   c3.push(`SLIDE HERO:     ${f('cSlide1')}`);
    if (f('cSlideCta')) c3.push(`SLIDE CTA:      ${f('cSlideCta')}`);
    if (f('cNotes'))    c3.push(`NOTAS:          ${f('cNotes')}`);
    if (c3.length) c.push(`## SLIDES ESPECIAIS\n${c3.join('\n')}`);

    const c4 = [];
    if (f('cForbidden')) c4.push(`PROIBIDO:       ${f('cForbidden')}`);
    if (f('cDelivery'))  c4.push(`ENTREGA:        ${f('cDelivery')}`);
    if (f('cFontB64'))   c4.push(`FONTES:         ${f('cFontB64')}`);
    if (f('cFinalNotes'))c4.push(`NOTAS:          ${f('cFinalNotes')}`);
    if (c4.length) c.push(`## ENTREGA\n${c4.join('\n')}`);
    c.push(`</configuracao_formato>`);
    s.push(c.join('\n\n'));

    const content = f('cContent');
    if (content) {
      s.push(`<conteudo_bruto>\n${content}\n</conteudo_bruto>`);
    }

    s.push(`<instrucoes_saida>
1. Atue como um desenvolvedor frontend sênior e web designer especialista em conversão.
2. Crie o carrossel em HTML completo (com estilos CSS incorporados na tag <style>), aplicando rigorosamente as cores, tipografia e diretrizes visuais especificadas em <diretrizes_marca> e <configuracao_formato>.
3. Utilize o roteiro e textos fornecidos em <conteudo_bruto> distribuindo-os harmonicamente entre os slides de conteúdo, capa e CTA.
4. **REGRAS DE RESPOSTA CRÍTICAS (CRUCIAIS PARA CÓPIA DIRETA):**
   - Retorne APENAS o código final completo (HTML + CSS) dentro de um bloco de código Markdown (\`\`\`html ... \`\`\`).
   - Não inclua nenhuma saudação, introdução, explicação textual ou observações de desenvolvimento antes ou depois do bloco de código. O usuário deve ser capaz de simplesmente copiar o código gerado direto da tela e usar.
</instrucoes_saida>`);

    return s.join('\n\n');
  },

  buildPost() {
    const base = this.buildBase();
    if (!base) return null;
    const s = [];
    s.push(`# PROMPT UNIFICADO PARA CLAUDE / LLM\nUse as especificações abaixo para gerar o código do post.`);
    s.push(base);

    const p = [];
    p.push(`<configuracao_formato>`);
    p.push(`# POST — ${f('bName') || 'MARCA'}\n# Configurações do formato.`);

    const p1 = [];
    const lp = getRadio('postLogoPos');
    const activeLogo = document.getElementById('bLogoActive')?.checked || false;
    if (activeLogo) {
      if (lp) p1.push(`LOGO POSIÇÃO:   ${lp}`);
      p1.push(`LOGO:           Solicite a imagem da logo ao usuário. Quando ela for fornecida, respeite a seguinte regra de exibição:`);
      p1.push(`LOGO DISPLAY:   Sempre exibir a logo em tamanho e proporção originais, com object-fit: contain. Nunca aplicar border-radius, overflow: hidden, recorte circular ou qualquer máscara de forma. O container deve se adaptar à logo, não o contrário.`);
    }
    else p1.push(`LOGO:           Nenhuma — não exibir placeholder. O post deve ser criado sem nenhum tipo de logo.`);
    if (p1.length) p.push(`## LOGO\n${p1.join('\n')}`);

    if (app.postType) p.push(`## TIPO\nTIPO:           ${app.postTypeConfig[app.postType].label}`);
    if (app.postFmts.size) p.push(`## FORMATOS\nFORMATOS:       ${[...app.postFmts].join(', ')}\nGerar uma versão de layout adaptada para cada formato.`);

    const p4 = [];
    if (f('pHeadline')) p4.push(`HEADLINE:       ${f('pHeadline')}`);
    if (f('pSubtitle')) p4.push(`SUBTÍTULO:      ${f('pSubtitle')}`);
    if (f('pCta'))      p4.push(`CTA:            ${f('pCta')}`);
    if (app.postType) {
      const cfg = app.postTypeConfig[app.postType];
      if (['checklist','passo-a-passo'].includes(app.postType) && app.chipData.pItems.length)
        p4.push(`ITENS:\n${app.chipData.pItems.map((v,i) => `  ${i+1}. ${v}`).join('\n')}`);
      if (app.postType === 'estatistica') { if(f('pStatNum'))p4.push(`NÚMERO:         ${f('pStatNum')}`); if(f('pStatCtx'))p4.push(`CONTEXTO:       ${f('pStatCtx')}`); if(f('pStatSrc'))p4.push(`FONTE:          ${f('pStatSrc')}`); }
      if (['antes-depois','comparativo'].includes(app.postType)) { if(f('pCompA'))p4.push(`${cfg.compA.toUpperCase()}:${' '.repeat(Math.max(1,14-cfg.compA.length))}${f('pCompA')}`); if(f('pCompB'))p4.push(`${cfg.compB.toUpperCase()}:${' '.repeat(Math.max(1,14-cfg.compB.length))}${f('pCompB')}`); }
      if (app.postType === 'anuncio') { if(f('pAnPrice'))p4.push(`PREÇO:          ${f('pAnPrice')}`); if(f('pAnBenefit'))p4.push(`BENEFÍCIO:      ${f('pAnBenefit')}`); }
      if (app.postType === 'urgencia') { if(f('pUrgPrazo'))p4.push(`PRAZO:          ${f('pUrgPrazo')}`); if(f('pUrgOque'))p4.push(`O QUE ACABA:    ${f('pUrgOque')}`); }
      if (['depoimento','citacao'].includes(app.postType)) { if(f('pQuoteText'))p4.push(`CITAÇÃO:        "${f('pQuoteText')}"`); if(f('pQuoteAuthor'))p4.push(`AUTOR:          ${f('pQuoteAuthor')}`); if(f('pQuoteRole'))p4.push(`CARGO:          ${f('pQuoteRole')}`); }
      if (app.postType === 'mini-artigo' && f('pArtBody')) p4.push(`CORPO:          ${f('pArtBody')}`);
    }
    if (f('pContentNotes')) p4.push(`NOTAS:          ${f('pContentNotes')}`);
    const freeText = f('pFreeText');
    if (freeText) p4.push(`TEXTO LIVRE / COPY DIRETA:\n${freeText}`);
    if (p4.length) p.push(`## CONTEÚDO\n${p4.join('\n')}`);

    const p5 = [];
    if (app.postFmts.has('1x1')) { const l=[]; if(f('pL1TextPos'))l.push(`  TEXTO: ${f('pL1TextPos')}`); if(f('pL1Bg'))l.push(`  FUNDO: ${f('pL1Bg')}`); if(f('pL1Notes'))l.push(`  NOTAS: ${f('pL1Notes')}`); if(l.length)p5.push(`LAYOUT 1:1:\n${l.join('\n')}`); }
    if (app.postFmts.has('4x5')) { const l=[]; if(f('pL4TextPos'))l.push(`  TEXTO: ${f('pL4TextPos')}`); if(f('pL4Bg'))l.push(`  FUNDO: ${f('pL4Bg')}`); if(f('pL4Notes'))l.push(`  NOTAS: ${f('pL4Notes')}`); if(l.length)p5.push(`LAYOUT 4:5:\n${l.join('\n')}`); }
    if (app.postFmts.has('9x16')) { const l=[]; if(f('pL9TextPos'))l.push(`  TEXTO: ${f('pL9TextPos')}`); if(f('pL9Bg'))l.push(`  FUNDO: ${f('pL9Bg')}`); if(f('pL9Notes'))l.push(`  NOTAS: ${f('pL9Notes')}`); if(l.length)p5.push(`LAYOUT 9:16:\n${l.join('\n')}`); }
    if (p5.length) p.push(`## LAYOUT\n${p5.join('\n\n')}`);

    const p6 = [];
    if (f('pForbidden')) p6.push(`PROIBIDO:       ${f('pForbidden')}`);
    if (f('pDelivery'))  p6.push(`ENTREGA:        ${f('pDelivery')}`);
    if (f('pFontB64'))   p6.push(`FONTES:         ${f('pFontB64')}`);
    if (f('pFinalNotes'))p6.push(`NOTAS:          ${f('pFinalNotes')}`);
    if (p6.length) p.push(`## ENTREGA\n${p6.join('\n')}`);
    p.push(`</configuracao_formato>`);
    s.push(p.join('\n\n'));

    s.push(`<instrucoes_saida>
1. Atue como um desenvolvedor frontend sênior e designer especialista em conversão.
2. Crie o layout do post em HTML completo (com estilos CSS incorporados na tag <style>), aplicando rigorosamente as cores, tipografia, formatos e regras visuais especificadas em <diretrizes_marca> e <configuracao_formato>.
3. Utilize o conteúdo textual (Headline, Subtítulo, CTA, Citações ou Itens) fornecido em <configuracao_formato> ou <conteudo_bruto>.
4. **REGRAS DE RESPOSTA CRÍTICAS (CRUCIAIS PARA CÓPIA DIRETA):**
   - Retorne APENAS o código final completo (HTML + CSS) dentro de um bloco de código Markdown (\`\`\`html ... \`\`\$).
   - Não inclua nenhuma saudação, introdução, explicação textual ou observações de desenvolvimento antes ou depois do bloco de código. O usuário deve ser capaz de simplesmente copiar o código gerado direto da tela e usar.
</instrucoes_saida>`);

    return s.join('\n\n');
  }
};
