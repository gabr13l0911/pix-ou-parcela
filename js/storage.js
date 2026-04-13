/**
 * Storage - Gerencia persistência local (localStorage)
 */
const Storage = (() => {
  const KEYS = {
    SETTINGS: 'pxp_settings',
    HISTORY: 'pxp_history',
    TAXA_CACHE: 'pxp_taxa_cache',
  };

  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  // --- Settings ---
  function getSettings() {
    return get(KEYS.SETTINGS) || {
      taxaFonte: 'auto',
      taxaCustom: null,
      parcelasPadrao: 6,
    };
  }

  function saveSettings(settings) {
    set(KEYS.SETTINGS, settings);
  }

  // --- Taxa Cache ---
  function getTaxaCache() {
    return get(KEYS.TAXA_CACHE);
  }

  function saveTaxaCache(taxa) {
    set(KEYS.TAXA_CACHE, taxa);
  }

  // --- History ---
  function getHistory() {
    return get(KEYS.HISTORY) || [];
  }

  function addToHistory(entry) {
    const hist = getHistory();
    hist.unshift({
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    });
    // Limita a 100 entradas
    if (hist.length > 100) hist.length = 100;
    set(KEYS.HISTORY, hist);
  }

  function clearHistory() {
    set(KEYS.HISTORY, []);
  }

  function exportHistoryCSV() {
    const hist = getHistory();
    if (!hist.length) return null;

    const headers = [
      'Data', 'Valor Compra', 'Desconto %', 'Desconto R$',
      'Parcelas', 'Taxa Mensal %', 'Valor Pix', 'VPL Parcela',
      'Economia', 'Melhor Opcao'
    ];

    const rows = hist.map(h => [
      h.createdAt,
      h.valorCompra.toFixed(2),
      h.descontoPercent.toFixed(2),
      h.descontoReais.toFixed(2),
      h.numParcelas,
      (h.taxaMensal * 100).toFixed(4),
      h.valorPix.toFixed(2),
      h.vplParcela.toFixed(2),
      h.economia.toFixed(2),
      h.pixWins ? 'Pix' : 'Parcela',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    return csvContent;
  }

  return {
    getSettings,
    saveSettings,
    getTaxaCache,
    saveTaxaCache,
    getHistory,
    addToHistory,
    clearHistory,
    exportHistoryCSV,
  };
})();
