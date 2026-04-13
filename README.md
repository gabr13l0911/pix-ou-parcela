# Pix ou Parcela?

Calculadora financeira que compara o custo real entre pagar no **Pix/boleto com desconto** ou **parcelar sem juros**, usando o conceito de **Valor Presente Líquido (VPL)**.

## Como funciona

Quando uma loja oferece desconto no Pix, nem sempre vale a pena pagar à vista. Se o dinheiro estivesse rendendo (CDI, CDB, Tesouro Selic), as parcelas futuras valem menos em valor presente. O app calcula exatamente isso:

1. Busca a taxa CDI atual via API do Banco Central
2. Calcula o VPL das parcelas: `VPL = Σ (parcela / (1 + taxa)^n)`
3. Compara com o valor à vista no Pix
4. Mostra qual opção sai mais barata e quanto você economiza

## Funcionalidades

- **Cálculo de VPL** com taxa CDI/Selic em tempo real (API do Banco Central)
- **Dois modos de entrada** para o valor no Pix: percentual de desconto ou valor em R$
- **Memória de cálculo** detalhada com tabela parcela a parcela
- **Histórico** de consultas com exportação em CSV
- **Taxa personalizável** (CDB, Tesouro Selic, etc.)
- **Offline** via Service Worker com cache de assets e taxa
- **APK Android** via Capacitor

## Stack

- HTML/CSS/JS vanilla (sem frameworks)
- [Capacitor](https://capacitorjs.com/) para build Android
- Design system inspirado no Expo: tema claro, monochromático, pill-shaped, Inter font

## Rodando localmente

Basta servir os arquivos estáticos. Exemplo:

```bash
npx serve .
```

## Build Android (APK)

```bash
npm install
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK será gerado em `android/app/build/outputs/apk/debug/`.

> Requer JDK 17+ e Android SDK instalados.

## Estrutura

```
├── index.html          # SPA principal
├── css/style.css       # Estilos (design system Expo)
├── js/
│   ├── calc.js         # Motor de cálculo VPL
│   ├── api.js          # Busca taxa CDI/Selic do BCB
│   ├── storage.js      # localStorage (settings, histórico, cache)
│   └── app.js          # Controller principal e UI
├── sw.js               # Service Worker (offline)
├── manifest.json       # PWA manifest
├── capacitor.config.json
└── DESIGN.md           # Referência do design system
```

## Licença

ISC
