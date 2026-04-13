/**
 * API - Busca taxa CDI/Selic do Banco Central do Brasil
 */
const TaxaAPI = (() => {
  // API pública do BCB - Série 4389 = CDI diária anualizada
  const BCB_CDI_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
  // Série 432 = Meta Selic (backup)
  const BCB_SELIC_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json';

  /**
   * Converte taxa anual para mensal.
   * Taxa mensal = (1 + taxa_anual)^(1/12) - 1
   */
  function anualParaMensal(taxaAnualPercent) {
    return (Math.pow(1 + taxaAnualPercent / 100, 1 / 12) - 1);
  }

  /**
   * Busca a taxa CDI atualizada do Banco Central.
   * Retorna objeto { taxaMensal, taxaAnual, fonte, data }
   */
  async function buscarCDI() {
    try {
      const response = await fetch(BCB_CDI_URL);
      if (!response.ok) throw new Error('BCB CDI falhou');
      const data = await response.json();
      if (!data || !data.length) throw new Error('Sem dados CDI');

      const taxaAnual = parseFloat(data[0].valor);
      const taxaMensal = anualParaMensal(taxaAnual);

      return {
        taxaMensal,
        taxaAnual,
        taxaMensalPercent: taxaMensal * 100,
        fonte: 'BCB/CDI',
        data: data[0].data,
        timestamp: Date.now(),
      };
    } catch (e) {
      // Fallback: tenta Selic
      try {
        const response = await fetch(BCB_SELIC_URL);
        if (!response.ok) throw new Error('BCB Selic falhou');
        const data = await response.json();
        if (!data || !data.length) throw new Error('Sem dados Selic');

        const taxaAnual = parseFloat(data[0].valor);
        const taxaMensal = anualParaMensal(taxaAnual);

        return {
          taxaMensal,
          taxaAnual,
          taxaMensalPercent: taxaMensal * 100,
          fonte: 'BCB/Selic',
          data: data[0].data,
          timestamp: Date.now(),
        };
      } catch (e2) {
        return null;
      }
    }
  }

  return { buscarCDI, anualParaMensal };
})();
