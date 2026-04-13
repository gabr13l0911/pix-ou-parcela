/**
 * Motor de cálculo VPL - Pix ou Parcela?
 */
const CalcEngine = (() => {
  /**
   * Calcula o Valor Presente de uma série de parcelas iguais.
   * VPL = sum( parcela / (1 + taxa)^n ) para n = 1..numParcelas
   *
   * @param {number} valorTotal - Valor total parcelado (sem juros)
   * @param {number} numParcelas - Número de parcelas
   * @param {number} taxaMensal - Taxa mensal decimal (ex: 0.01 para 1%)
   * @returns {number} Valor presente das parcelas
   */
  function valorPresenteParcelas(valorTotal, numParcelas, taxaMensal) {
    if (taxaMensal === 0) return valorTotal;
    const parcela = valorTotal / numParcelas;
    let vpl = 0;
    for (let n = 1; n <= numParcelas; n++) {
      vpl += parcela / Math.pow(1 + taxaMensal, n);
    }
    return vpl;
  }

  /**
   * Calcula o valor à vista com desconto.
   *
   * @param {number} valorTotal - Valor total da compra
   * @param {number} desconto - Valor do desconto
   * @param {boolean} isPercent - Se true, desconto é percentual
   * @returns {number} Valor à vista
   */
  function valorAVista(valorTotal, desconto, isPercent) {
    if (isPercent) {
      return valorTotal * (1 - desconto / 100);
    }
    return valorTotal - desconto;
  }

  /**
   * Compara Pix vs Parcela e retorna o resultado completo.
   *
   * @param {object} params
   * @param {number} params.valorCompra - Valor total da compra
   * @param {number} params.desconto - Desconto oferecido
   * @param {boolean} params.isPercent - Se desconto é em %
   * @param {number} params.parcelas - Número de parcelas
   * @param {number} params.taxaMensal - Taxa mensal decimal
   * @returns {object} Resultado da comparação
   */
  function comparar({ valorCompra, desconto, isPercent, parcelas, taxaMensal }) {
    const pix = valorAVista(valorCompra, desconto, isPercent);
    const vplParcela = valorPresenteParcelas(valorCompra, parcelas, taxaMensal);

    // Custo real: Pix é o valor pago. Parcela é o VPL (quanto vale em dinheiro de hoje).
    // Se VPL da parcela < valor do Pix, parcelar é melhor (você "paga menos" em valor presente).
    const pixWins = pix <= vplParcela;
    const economia = Math.abs(pix - vplParcela);

    const descontoReais = isPercent ? valorCompra * (desconto / 100) : desconto;
    const descontoPercent = isPercent ? desconto : (desconto / valorCompra) * 100;

    return {
      pixWins,
      valorPix: pix,
      vplParcela,
      economia,
      valorParcela: valorCompra / parcelas,
      numParcelas: parcelas,
      descontoReais,
      descontoPercent,
      taxaMensal,
      valorCompra,
    };
  }

  return { comparar, valorPresenteParcelas, valorAVista };
})();
