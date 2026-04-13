/**
 * App principal - Pix ou Parcela?
 */
(function () {
  'use strict';

  // === DOM Elements ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elValorCompra = $('#valor-compra');
  const elDesconto = $('#desconto');
  const elToggleDesconto = $('#toggle-desconto');
  const elTogglePixMode = $('#toggle-pix-mode');
  const elGrupoDesconto = $('#grupo-desconto');
  const elGrupoValorPix = $('#grupo-valor-pix');
  const elValorPixInput = $('#valor-pix-input');
  const elParcelasCustom = $('#parcelas-custom');
  const elTaxaDisplay = $('#taxa-display');
  const elTaxaFonte = $('#taxa-fonte');
  const elBtnCalc = $('#btn-calcular');
  const elResultado = $('#resultado');
  const elVeredito = $('#resultado-veredito');
  const elVereditoIcone = $('#veredito-icon');
  const elVereditoTexto = $('#veredito-texto');
  const elCardPix = $('#card-pix');
  const elCardParcela = $('#card-parcela');
  const elValorPix = $('#valor-pix');
  const elValorParcela = $('#valor-parcela');
  const elSubPix = $('#sub-pix');
  const elSubParcela = $('#sub-parcela');
  const elBarraPix = $('#barra-pix');
  const elBarraParcela = $('#barra-parcela');
  const elEconomia = $('#economia');
  const elMemoriaBody = $('#memoria-body');
  const elCalcView = $('#calculator-view');
  const elSettingsView = $('#settings-view');
  const elHistoryView = $('#history-view');

  // State
  let descontoMode = 'percent'; // 'percent' or 'reais'
  let pixInputMode = 'percent'; // 'percent' (desconto) or 'valor-pix' (valor direto)
  let parcelasSelecionadas = 6;
  let taxaAtual = null;

  // === Formatação ===
  function formatBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function parseBRL(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }

  function formatInputBRL(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (!val) { input.value = ''; return; }
    val = (parseInt(val, 10) / 100).toFixed(2);
    input.value = val.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function formatInputDecimal(input) {
    let val = input.value.replace(/[^\d,\.]/g, '');
    val = val.replace(/\./, ',');
    const parts = val.split(',');
    if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
    input.value = val;
  }

  // === Masks ===
  elValorCompra.addEventListener('input', () => formatInputBRL(elValorCompra));
  elValorPixInput.addEventListener('input', () => formatInputBRL(elValorPixInput));
  elDesconto.addEventListener('input', () => {
    if (descontoMode === 'reais') {
      formatInputBRL(elDesconto);
    } else {
      formatInputDecimal(elDesconto);
    }
  });

  // === Toggle modo de entrada Pix (% desconto vs valor em R$) ===
  elTogglePixMode.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-opt');
    if (!btn) return;
    pixInputMode = btn.dataset.mode;
    elTogglePixMode.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (pixInputMode === 'valor-pix') {
      elGrupoDesconto.classList.add('hidden');
      elGrupoValorPix.classList.remove('hidden');
      elValorPixInput.focus();
    } else {
      elGrupoDesconto.classList.remove('hidden');
      elGrupoValorPix.classList.add('hidden');
      elDesconto.focus();
    }
  });

  // === Toggle desconto % / R$ ===
  elToggleDesconto.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-opt');
    if (!btn) return;
    descontoMode = btn.dataset.mode;
    elToggleDesconto.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    elDesconto.value = '';
    elDesconto.placeholder = descontoMode === 'percent' ? '0' : '0,00';
    elDesconto.focus();
  });

  // === Parcelas ===
  $$('.parcela-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.parcelas === 'custom') return;
      $$('.parcela-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      parcelasSelecionadas = parseInt(btn.dataset.parcelas, 10);
      elParcelasCustom.value = '';
    });
  });

  elParcelasCustom.addEventListener('focus', () => {
    $$('.parcela-btn').forEach(b => b.classList.remove('active'));
    $('.custom-parcela').classList.add('active');
  });

  elParcelasCustom.addEventListener('input', () => {
    let val = elParcelasCustom.value.replace(/\D/g, '');
    elParcelasCustom.value = val;
    const n = parseInt(val, 10);
    if (n >= 2) parcelasSelecionadas = n;
  });

  // === Taxa CDI ===
  async function carregarTaxa() {
    const settings = Storage.getSettings();

    if (settings.taxaFonte === 'custom' && settings.taxaCustom) {
      taxaAtual = {
        taxaMensal: settings.taxaCustom / 100,
        taxaMensalPercent: settings.taxaCustom,
        fonte: 'Personalizada',
      };
      atualizarTaxaDisplay();
      return;
    }

    const cache = Storage.getTaxaCache();
    if (cache && (Date.now() - cache.timestamp) < 24 * 60 * 60 * 1000) {
      taxaAtual = cache;
      atualizarTaxaDisplay();
    }

    const taxa = await TaxaAPI.buscarCDI();
    if (taxa) {
      taxaAtual = taxa;
      Storage.saveTaxaCache(taxa);
      atualizarTaxaDisplay();
    } else if (!taxaAtual) {
      const fallbackAnual = 13.25;
      const fallbackMensal = TaxaAPI.anualParaMensal(fallbackAnual);
      taxaAtual = {
        taxaMensal: fallbackMensal,
        taxaAnual: fallbackAnual,
        taxaMensalPercent: fallbackMensal * 100,
        fonte: 'Estimativa',
      };
      atualizarTaxaDisplay();
    }
  }

  function atualizarTaxaDisplay() {
    if (!taxaAtual) return;
    elTaxaDisplay.textContent = taxaAtual.taxaMensalPercent.toFixed(2) + '% a.m.';
    elTaxaFonte.textContent = taxaAtual.fonte || '';
  }

  // === Calcular ===
  elBtnCalc.addEventListener('click', calcular);
  elValorCompra.addEventListener('keydown', (e) => { if (e.key === 'Enter') calcular(); });
  elDesconto.addEventListener('keydown', (e) => { if (e.key === 'Enter') calcular(); });
  elValorPixInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') calcular(); });

  function calcular() {
    const valorCompra = parseBRL(elValorCompra.value);

    if (valorCompra <= 0) {
      toast('Digite o valor da compra parcelada');
      elValorCompra.focus();
      return;
    }
    if (!taxaAtual) {
      toast('Taxa de referência indisponível');
      return;
    }

    let desconto, isPercent;

    if (pixInputMode === 'valor-pix') {
      // Usuário informou o valor do Pix direto em R$
      const valorPixDigitado = parseBRL(elValorPixInput.value);
      if (valorPixDigitado <= 0) {
        toast('Digite o valor no Pix');
        elValorPixInput.focus();
        return;
      }
      if (valorPixDigitado >= valorCompra) {
        toast('Valor no Pix deve ser menor que o parcelado');
        elValorPixInput.focus();
        return;
      }
      // Converte para desconto em R$ para o motor de cálculo
      desconto = valorCompra - valorPixDigitado;
      isPercent = false;
    } else {
      // Modo desconto (% ou R$)
      desconto = parseBRL(elDesconto.value);
      isPercent = descontoMode === 'percent';

      if (desconto <= 0) {
        toast('Digite o desconto');
        elDesconto.focus();
        return;
      }
      if (isPercent && desconto >= 100) {
        toast('Desconto não pode ser 100% ou mais');
        return;
      }
      if (!isPercent && desconto >= valorCompra) {
        toast('Desconto não pode ser maior que o valor');
        return;
      }
    }

    const resultado = CalcEngine.comparar({
      valorCompra,
      desconto,
      isPercent,
      parcelas: parcelasSelecionadas,
      taxaMensal: taxaAtual.taxaMensal,
    });

    exibirResultado(resultado);
    exibirMemoriaCalculo(resultado);

    // Salva no histórico
    Storage.addToHistory(resultado);
  }

  function exibirResultado(r) {
    elResultado.classList.remove('hidden');

    // Veredito
    elVeredito.className = 'resultado-veredito ' + (r.pixWins ? 'pix-wins' : 'parcela-wins');

    if (r.pixWins) {
      elVereditoIcone.textContent = '\u{1F4B2}';
      elVereditoTexto.textContent = 'Pague no Pix!';
    } else {
      elVereditoIcone.textContent = '\u{1F4B3}';
      elVereditoTexto.textContent = 'Vale mais parcelar!';
    }

    // Cards
    elValorPix.textContent = formatBRL(r.valorPix);
    elSubPix.textContent = `Desconto de ${r.descontoPercent.toFixed(1)}% (${formatBRL(r.descontoReais)})`;

    elValorParcela.textContent = formatBRL(r.vplParcela);
    elSubParcela.textContent = `${r.numParcelas}x de ${formatBRL(r.valorParcela)} (VPL)`;

    elCardPix.className = 'detalhe-card ' + (r.pixWins ? 'winner' : 'loser');
    elCardParcela.className = 'detalhe-card ' + (r.pixWins ? 'loser' : 'winner');

    // Barras
    const max = Math.max(r.valorPix, r.vplParcela);
    setTimeout(() => {
      elBarraPix.style.width = ((r.valorPix / max) * 100) + '%';
      elBarraParcela.style.width = ((r.vplParcela / max) * 100) + '%';
    }, 50);

    elBarraPix.style.background = r.pixWins ? 'var(--text-primary)' : 'var(--border)';
    elBarraParcela.style.background = r.pixWins ? 'var(--border)' : 'var(--text-primary)';

    // Economia
    if (r.pixWins) {
      elEconomia.innerHTML = `Economia no Pix: <strong>${formatBRL(r.economia)}</strong> em valor presente`;
    } else {
      elEconomia.innerHTML = `Economia parcelando: <strong>${formatBRL(r.economia)}</strong> em valor presente`;
    }

    elResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // === Memória de Cálculo ===
  function exibirMemoriaCalculo(r) {
    const taxa = r.taxaMensal;
    const parcela = r.valorCompra / r.numParcelas;

    // Monta tabela de VPL parcela a parcela
    let tabelaRows = '';
    let somaVPL = 0;
    for (let n = 1; n <= r.numParcelas; n++) {
      const fator = Math.pow(1 + taxa, n);
      const vpParcela = parcela / fator;
      somaVPL += vpParcela;
      tabelaRows += `<tr>
        <td>${n}</td>
        <td>${formatBRL(parcela)}</td>
        <td>(1 + ${(taxa * 100).toFixed(2)}%)^${n} = ${fator.toFixed(6)}</td>
        <td>${formatBRL(vpParcela)}</td>
      </tr>`;
    }
    tabelaRows += `<tr>
      <td colspan="3">Total (Valor Presente das Parcelas)</td>
      <td>${formatBRL(somaVPL)}</td>
    </tr>`;

    const explicacao = r.pixWins
      ? `Como o valor no Pix (${formatBRL(r.valorPix)}) \u00e9 <strong>menor</strong> que o custo real das parcelas (${formatBRL(r.vplParcela)}), pagar \u00e0 vista \u00e9 mais vantajoso. Voc\u00ea economiza ${formatBRL(r.economia)} em valor presente.`
      : `Como o custo real das parcelas (${formatBRL(r.vplParcela)}) \u00e9 <strong>menor</strong> que o valor no Pix (${formatBRL(r.valorPix)}), parcelar \u00e9 mais vantajoso. O dinheiro que voc\u00ea n\u00e3o paga agora pode render ${(taxa * 100).toFixed(2)}% ao m\u00eas, gerando uma economia de ${formatBRL(r.economia)}.`;

    elMemoriaBody.innerHTML = `
      <div class="mc-section">
        <div class="mc-title">1. Dados informados</div>
        <div class="mc-line"><span>Valor da compra parcelada</span><span>${formatBRL(r.valorCompra)}</span></div>
        <div class="mc-line"><span>Valor no Pix/Boleto</span><span>${formatBRL(r.valorPix)}</span></div>
        <div class="mc-line"><span>Desconto</span><span>${r.descontoPercent.toFixed(2)}% (${formatBRL(r.descontoReais)})</span></div>
        <div class="mc-line"><span>N\u00famero de parcelas</span><span>${r.numParcelas}x de ${formatBRL(parcela)}</span></div>
        <div class="mc-line"><span>Taxa mensal de refer\u00eancia</span><span>${(taxa * 100).toFixed(4)}% a.m.</span></div>
      </div>

      <div class="mc-section">
        <div class="mc-title">2. O que \u00e9 o Valor Presente (VPL)?</div>
        <p>Quando voc\u00ea parcela sem juros, cada parcela futura vale <em>menos</em> do que o mesmo valor hoje, porque o dinheiro pode render no tempo. O VPL calcula quanto todas as parcelas valem <strong>em dinheiro de hoje</strong>, considerando que voc\u00ea poderia investir esse dinheiro a ${(taxa * 100).toFixed(2)}% ao m\u00eas.</p>
        <p style="margin-top:6px"><strong>F\u00f3rmula:</strong> VP da parcela = Parcela \u00f7 (1 + taxa)^n</p>
      </div>

      <div class="mc-section">
        <div class="mc-title">3. C\u00e1lculo parcela a parcela</div>
        <table class="mc-table">
          <thead>
            <tr><th>M\u00eas</th><th>Parcela</th><th>Fator de desconto</th><th>Valor Presente</th></tr>
          </thead>
          <tbody>${tabelaRows}</tbody>
        </table>
      </div>

      <div class="mc-section">
        <div class="mc-title">4. Compara\u00e7\u00e3o final</div>
        <div class="mc-line"><span>Custo real do Pix (pago hoje)</span><span>${formatBRL(r.valorPix)}</span></div>
        <div class="mc-line"><span>Custo real da parcela (VPL)</span><span>${formatBRL(r.vplParcela)}</span></div>
        <div class="mc-line"><span>Diferen\u00e7a</span><span>${formatBRL(r.economia)}</span></div>
      </div>

      <div class="mc-highlight">${explicacao}</div>
    `;
  }

  // === Navegação ===
  $('#btn-settings').addEventListener('click', () => {
    loadSettingsUI();
    elSettingsView.classList.remove('hidden');
  });

  $('#btn-history').addEventListener('click', () => {
    renderHistory();
    elHistoryView.classList.remove('hidden');
  });

  $('#btn-back-settings').addEventListener('click', () => {
    elSettingsView.classList.add('hidden');
  });

  $('#btn-back-history').addEventListener('click', () => {
    elHistoryView.classList.add('hidden');
  });

  // === Settings ===
  function loadSettingsUI() {
    const settings = Storage.getSettings();
    const radios = $$('input[name="taxa-fonte"]');
    radios.forEach(r => { r.checked = r.value === settings.taxaFonte; });
    toggleCustomTaxa(settings.taxaFonte === 'custom');

    if (settings.taxaCustom) {
      $('#custom-taxa').value = settings.taxaCustom.toString().replace('.', ',');
    }
    $('#parcelas-padrao').value = settings.parcelasPadrao || 6;
  }

  $$('input[name="taxa-fonte"]').forEach(r => {
    r.addEventListener('change', () => {
      toggleCustomTaxa(r.value === 'custom' && r.checked);
    });
  });

  function toggleCustomTaxa(show) {
    $('#custom-taxa-group').classList.toggle('hidden', !show);
  }

  $('#btn-salvar-settings').addEventListener('click', () => {
    const fonte = $('input[name="taxa-fonte"]:checked').value;
    const customVal = parseBRL($('#custom-taxa').value);
    const parcelasPadrao = parseInt($('#parcelas-padrao').value, 10);

    const settings = {
      taxaFonte: fonte,
      taxaCustom: fonte === 'custom' ? customVal : null,
      parcelasPadrao,
    };

    Storage.saveSettings(settings);

    parcelasSelecionadas = parcelasPadrao;
    $$('.parcela-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.parcelas, 10) === parcelasPadrao);
    });

    carregarTaxa();
    elSettingsView.classList.add('hidden');
    toast('Configurações salvas!');
  });

  // === Histórico ===
  function renderHistory() {
    const hist = Storage.getHistory();
    const container = $('#history-list');
    const btnLimpar = $('#btn-limpar-hist');

    if (!hist.length) {
      container.innerHTML = '<p class="empty-state">Nenhuma consulta realizada ainda.</p>';
      btnLimpar.classList.add('hidden');
      return;
    }

    btnLimpar.classList.remove('hidden');

    container.innerHTML = hist.map(h => {
      const date = new Date(h.createdAt);
      const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const badge = h.pixWins ? 'pix' : 'parcela';
      const badgeText = h.pixWins ? 'Pix' : 'Parcela';

      return `
        <div class="history-entry">
          <div class="hist-top">
            <span class="hist-date">${dateStr}</span>
            <span class="hist-badge ${badge}">${badgeText}</span>
          </div>
          <div class="hist-valor">${formatBRL(h.valorCompra)}</div>
          <div class="hist-detalhe">
            Desconto ${h.descontoPercent.toFixed(1)}% | ${h.numParcelas}x | Economia ${formatBRL(h.economia)}
          </div>
        </div>
      `;
    }).join('');
  }

  $('#btn-export-csv').addEventListener('click', () => {
    const csv = Storage.exportHistoryCSV();
    if (!csv) {
      toast('Histórico vazio');
      return;
    }

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pix-ou-parcela-historico-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado!');
  });

  $('#btn-limpar-hist').addEventListener('click', () => {
    if (confirm('Limpar todo o histórico?')) {
      Storage.clearHistory();
      renderHistory();
      toast('Histórico limpo');
    }
  });

  // === Toast ===
  function toast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // === Init ===
  function init() {
    const settings = Storage.getSettings();
    parcelasSelecionadas = settings.parcelasPadrao || 6;

    $$('.parcela-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.parcelas, 10) === parcelasSelecionadas);
    });

    carregarTaxa();
    setTimeout(() => elValorCompra.focus(), 100);
  }

  init();
})();
