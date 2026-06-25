// Mapa determinístico: cada tipo de post recebe exatamente um padrão de
// composição. Sem isso, a IA recebia 4 opções e "escolher" virava sugestão
// fraca — em chamadas independentes ela convergia sempre para a mesma
// opção (a mais genérica), produzindo posts com a mesma diagramação
// independente do tipo de conteúdo.
const POST_COMPOSITION_PATTERNS = {
  'frase-impacto':  { name: 'Figura/número de fundo', desc: 'uma palavra-chave ou símbolo gigante e sutil como camada de fundo, com a frase de impacto sobreposta em alto contraste.' },
  'checklist':      { name: 'Card sobreposto', desc: 'um cartão com a lista de itens sobreposto a um fundo texturizado ou em gradiente, criando profundidade em camadas.' },
  'estatistica':    { name: 'Figura/número de fundo', desc: 'o número/dado estatístico como elemento dominante e gigante, ocupando boa parte do canvas, com contexto e fonte em camadas menores sobrepostas.' },
  'antes-depois':   { name: 'Split assimétrico', desc: 'canvas dividido em duas áreas desproporcionais (ex: 50/50 com diagonal sutil, ou 60/40), uma para "antes", outra para "depois", com contraste visual claro entre os dois lados.' },
  'passo-a-passo':  { name: 'Split assimétrico', desc: 'uma área lateral (60/40) com a numeração/etapas alinhadas verticalmente, e a outra área com um elemento gráfico de apoio (ícone, forma, número da etapa em destaque).' },
  'pergunta':       { name: 'Figura/número de fundo', desc: 'um símbolo de interrogação (ou elemento gráfico relacionado ao tema) gigante e sutil como camada de fundo, com a pergunta provocativa sobreposta em destaque.' },
  'comparativo':    { name: 'Banner diagonal', desc: 'uma faixa diagonal cortando o canvas, separando claramente os dois lados (X vs Y) com cores ou texturas distintas de cada lado.' },
  'anuncio':        { name: 'Banner diagonal', desc: 'uma faixa diagonal destacando o preço/oferta, cortando o canvas e criando hierarquia clara até o CTA.' },
  'urgencia':       { name: 'Split assimétrico', desc: 'uma área dominante (60/40 ou mais) para o prazo/contagem, e uma área secundária para o que está acabando, com contraste forte de cor de alerta.' },
  'lancamento':     { name: 'Banner diagonal', desc: 'uma faixa diagonal com a chamada de lançamento cruzando o canvas, criando dinamismo e senso de novidade.' },
  'depoimento':     { name: 'Figura/número de fundo', desc: 'aspas estilizadas gigantes como camada de fundo, com o depoimento e a atribuição (nome/cargo) sobrepostos em destaque.' },
  'citacao':        { name: 'Card sobreposto', desc: 'um cartão com a citação sobreposto a um fundo com textura ou gradiente, com a atribuição do especialista discreta abaixo.' },
  'mini-artigo':    { name: 'Card sobreposto', desc: 'o corpo do texto organizado num cartão sobreposto a um fundo com textura sutil, mantendo legibilidade e hierarquia entre título e corpo.' },
};

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
      .replace(/\n/g, '<br>');
  },

  buildBase() {
    const s = [];
    s.push(`# BASE — ${f('bName') || 'MARCA'}\n# Identidade visual e tom de voz. Usada em todos os conteúdos.`);

    const s1 = [];
    if (f('bName'))        s1.push(`MARCA:          ${f('bName')}`);
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

    const s5 = [], sv = getRadio('styleVisual');
    if (sv)               s5.push(`ESTILO:         ${sv}`);
    if (f('bBorderUse'))  s5.push(`BORDAS:         ${f('bBorderUse')}`);
    if (f('bCornerRadius'))s5.push(`CANTOS:         ${f('bCornerRadius')}`);
    if (f('bBgRhythm'))   s5.push(`RITMO FUNDOS:   ${f('bBgRhythm')}`);
    if (f('bGradientUse'))s5.push(`GRADIENTES:     ${f('bGradientUse')}`);
    if (f('bVisualSig'))  s5.push(`ASSINATURA:     ${f('bVisualSig')}`);
    if (s5.length) s.push(`## 04 · VISUAL\n${s5.join('\n')}`);

    if (s.length <= 1) return null;
    return s.join('\n\n');
  },

  buildCarousel() {
    const base = this.buildBase();
    if (!base) return null;
    const s = [];
    s.push(`# PROMPT UNIFICADO PARA CLAUDE / LLM\nUse as especificações abaixo para gerar o código do carrossel.`);
    s.push(base);

    const c = [];
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
    if (f('cFinalNotes'))c4.push(`NOTAS:          ${f('cFinalNotes')}`);
    if (c4.length) c.push(`## ENTREGA\n${c4.join('\n')}`);
    s.push(c.join('\n\n'));

    const content = f('cContent');
    if (content) {
      s.push(`# CONTEÚDO BRUTO\n${content}`);
    }

    s.push(`# INSTRUÇÕES DE SAÍDA
1. Atue como um desenvolvedor frontend sênior e web designer especialista em conversão.
2. Crie o carrossel em HTML completo (com estilos CSS incorporados na tag <style>), aplicando rigorosamente as cores, tipografia e diretrizes visuais especificadas nas seções anteriores.
3. Utilize o roteiro e textos fornecidos em CONTEÚDO BRUTO distribuindo-os harmonicamente entre os slides de conteúdo, capa e CTA.
4. **ACENTUAÇÃO E CODIFICAÇÃO (CRÍTICO):**
   - Todos os textos e conteúdos gerados devem manter rigorosamente a acentuação e caracteres especiais originais da língua portuguesa (como á, é, í, ó, ú, ç, ã, õ, etc.).
   - Certifique-se de incluir a tag \`<meta charset="UTF-8">\` na seção \`<head>\` do HTML.
5. **VISUAL DAS FONTES (CRÍTICO):**
   - Use exatamente as fontes especificadas em FONTE DISPLAY e FONTE CORPO.
   - Caso a especificação de FONTES indique "Embutir fontes em base64 no CSS" e você não possua os dados binários reais da fonte em base64 válidos, **NUNCA invente ou alucine uma string base64 fictícia** (pois strings inválidas impedem o carregamento da fonte e quebram o visual). Em vez disso, faça o carregamento direto das fontes do Google Fonts usando \`@import\` no topo da tag <style> ou links <link> no <head> para garantir que o visual do carrossel seja mantido.
6. **REGRAS DE RESPOSTA CRÍTICAS (CRUCIAIS PARA CÓPIA DIRETA):**
   - Retorne APENAS o código final completo (HTML + CSS) dentro de um bloco de código Markdown (\`\`\`html ... \`\`\`).
   - Não inclua nenhuma saudação, introdução, explicação textual ou observações de desenvolvimento antes ou depois do bloco de código. O usuário deve ser capaz de simplesmente copiar o código gerado direto da tela e usar.`);

    return s.join('\n\n');
  },

  buildPost() {
    const base = this.buildBase();
    if (!base) return null;
    const s = [];
    s.push(`# PROMPT UNIFICADO PARA CLAUDE / LLM\nUse as especificações abaixo para gerar o código do post.`);
    s.push(base);

    const p = [];
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
    const freeText = f('pFreeText');
    if (freeText) p4.push(`TEXTO LIVRE / COPY DIRETA:\n${freeText}`);
    if (f('pContentNotes')) p4.push(`NOTAS:          ${f('pContentNotes')}`);
    if (p4.length) p.push(`## CONTEÚDO\n${p4.join('\n')}`);

    const p5 = [];
    if (app.postFmts.has('1x1')) { const l=[]; if(f('pL1TextPos'))l.push(`  TEXTO: ${f('pL1TextPos')}`); if(f('pL1Bg'))l.push(`  FUNDO: ${f('pL1Bg')}`); if(f('pL1Notes'))l.push(`  NOTAS: ${f('pL1Notes')}`); if(l.length)p5.push(`LAYOUT 1:1:\n${l.join('\n')}`); }
    if (app.postFmts.has('4x5')) { const l=[]; if(f('pL4TextPos'))l.push(`  TEXTO: ${f('pL4TextPos')}`); if(f('pL4Bg'))l.push(`  FUNDO: ${f('pL4Bg')}`); if(f('pL4Notes'))l.push(`  NOTAS: ${f('pL4Notes')}`); if(l.length)p5.push(`LAYOUT 4:5:\n${l.join('\n')}`); }
    if (app.postFmts.has('9x16')) { const l=[]; if(f('pL9TextPos'))l.push(`  TEXTO: ${f('pL9TextPos')}`); if(f('pL9Bg'))l.push(`  FUNDO: ${f('pL9Bg')}`); if(f('pL9Notes'))l.push(`  NOTAS: ${f('pL9Notes')}`); if(l.length)p5.push(`LAYOUT 9:16:\n${l.join('\n')}`); }
    if (p5.length) p.push(`## LAYOUT\n${p5.join('\n\n')}`);

    const p6 = [];
    if (f('pFinalNotes'))p6.push(`OBRIGATORIEDADES: ${f('pFinalNotes')}`);
    if (p6.length) p.push(`## OBRIGATORIEDADES\n${p6.join('\n')}`);
    s.push(p.join('\n\n'));

    const chosenPattern = POST_COMPOSITION_PATTERNS[app.postType];
    const compositionDirective = chosenPattern
      ? `   - **PADRÃO OBRIGATÓRIO PARA ESTE POST: ${chosenPattern.name}** — ${chosenPattern.desc} Este é o único padrão válido para esta peça: não use nenhum outro (não centralize tudo, não empilhe blocos genéricos, não substitua por um padrão diferente).`
      : `   - **Escolha um destes padrões de composição nomeados (não invente um quinto padrão genérico de "card empilhado e centralizado"):**
     a) **Split assimétrico** — canvas dividido em duas áreas desproporcionais (ex: 60/40 ou 65/35), uma com o texto principal, outra com um elemento gráfico dominante (número grande, forma, ícone, bloco de cor sólida).
     b) **Figura/número de fundo** — um elemento gigante (número, símbolo, palavra única, aspas) ocupando boa parte do canvas como camada de fundo, com o conteúdo textual sobreposto por cima em contraste.
     c) **Banner diagonal** — uma faixa ou divisor diagonal corta o canvas, separando duas cores/seções ou destacando uma chamada específica (preço, prazo, badge).
     d) **Card sobreposto** — um bloco/cartão (com sombra, borda ou cor sólida) sobreposto a um fundo com textura, gradiente ou elemento gráfico, criando profundidade em camadas.`;

    s.push(`# INSTRUÇÕES DE SAÍDA
1. Atue como um desenvolvedor frontend sênior e designer especialista em conversão.
2. Crie o layout do post em HTML completo (com estilos CSS incorporados na tag <style>), aplicando rigorosamente as cores, tipografia, formatos e regras visuais especificadas nas seções anteriores.
3. Utilize o conteúdo textual (Headline, Subtítulo, CTA, Citações ou Itens) fornecido nas especificações de conteúdo.
4. **ACENTUAÇÃO E CODIFICAÇÃO (CRÍTICO):**
   - Todos os textos e conteúdos gerados devem manter rigorosamente a acentuação e caracteres especiais originais da língua portuguesa (como á, é, í, ó, ú, ç, ã, õ, etc.).
   - Certifique-se de incluir a tag \`<meta charset="UTF-8">\` na seção \`<head>\` do HTML.
5. **COMPOSIÇÃO VISUAL E HIERARQUIA (CRÍTICO):**
${compositionDirective}
   - Defina um ponto focal claro dentro do padrão (geralmente o headline, número ou elemento de maior impacto) — nunca um bloco de texto solto e centralizado sem nenhum elemento gráfico de apoio.
   - Crie hierarquia em pelo menos 3 camadas de peso visual: (1) destaque principal; (2) suporte — subtítulo, contexto, autor; (3) elementos secundários — CTA, fonte do dado, marca/handle.
   - **Proporção mínima de tamanho de texto:** nenhum texto de suporte (listas, badges, subtítulos secundários, rodapé) pode ter menos de 25% do tamanho em px do headline principal. Textos de apoio devem ter no mínimo 1/3 do tamanho do headline para permanecerem legíveis e com presença visual real no canvas — evite textos pequenos demais que pareçam "rodapé esquecido".
   - **Limite de espaço vazio não-preenchido:** nenhum espaço entre dois blocos de conteúdo consecutivos pode exceder ~8% da altura total do canvas sem conter um elemento decorativo (forma, linha, textura, gradiente, número de fundo) preenchendo-o. Se sobrar espaço depois de posicionar todo o conteúdo, redistribua o conteúdo, aumente os elementos do padrão de composição, ou adicione um elemento gráfico de apoio — nunca deixe um vão vazio sem função.
   - Adicione pelo menos 1 elemento de apoio visual (não textual) por peça, escolhido conforme o conteúdo: eyebrow/label curto acima do headline, número grande estilizado, ícone ou forma geométrica de acento, linha/divisor sutil, badge ou tag, aspas estilizadas para citações, etc. Use a cor de acento da marca nesses elementos para criar ponto de cor.
   - Garanta contraste forte entre fundo e texto e use a paleta da marca para criar profundidade (ex: fundo escuro + acento vibrante + texto claro), evitando o padrão default "texto preto sobre fundo branco, tudo centralizado".
6. **VISUAL DAS FONTES (CRÍTICO):**
   - Use exatamente as fontes especificadas em FONTE DISPLAY e FONTE CORPO.
   - Caso a especificação de FONTES indique "Embutir fontes em base64 no CSS" e você não possua os dados binários reais da fonte em base64 válidos, **NUNCA invente ou alucine uma string base64 fictícia** (pois strings inválidas impedem o carregamento da fonte e quebram o visual). Em vez disso, faça o carregamento direto das fontes do Google Fonts usando \`@import\` no topo da tag <style> ou links <link> no <head> para garantir que o visual do post seja mantido.
7. **REGRAS DE RESPOSTA CRÍTICAS (CRUCIAIS PARA CÓPIA DIRETA):**
   - Retorne APENAS o código final completo (HTML + CSS) dentro de um bloco de código Markdown (\`\`\`html ... \`\`\`).
   - Não inclua nenhuma saudação, introdução, explicação textual ou observações de desenvolvimento antes ou depois do bloco de código. O usuário deve ser capaz de simplesmente copiar o código gerado direto da tela e usar.`);

    return s.join('\n\n');
  }
};
