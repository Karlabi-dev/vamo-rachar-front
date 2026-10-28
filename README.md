# VamoRachar! — Front-end

Implementação em React + Vite das 29 telas do usuário, baseada nas referências visuais fornecidas. Sem backend e sem telas da cozinha.

## Rodar localmente

```bash
npm ci
npm run dev
```

Abra a URL exibida no terminal. Para ver o índice das 29 telas, abra `/#/telas`.

```bash
npm run build
npm run preview
npm test
npx playwright install chromium
npx playwright test
```

## Estrutura

- `src/components/UI.jsx`: componentes visuais compartilhados.
- `src/App.jsx`: telas e navegação por hash, compatível com hospedagem estática.
- `src/data/screens.js`: catálogo de telas, produtos de demonstração e cálculos.
- `src/styles.css`: tokens, layouts e adaptação de celular para tablet.
- `public/assets`: imagens locais extraídas da referência enviada; a resolução é limitada pelo arquivo original fornecido. Substitua por exportações originais em alta resolução quando disponíveis.

## Escopo

Entrada, conexão, início, cardápio, produto, divisão e convites, revisão de pedido, acompanhamento, comanda individual e coletiva, pagamento, comprovante, ajuda e estados alternativos. Base visual de 390 px, alturas de referência de cada frame e layout fluido para celular e tablet.

Pedidos, convites, status e pagamentos são simulações locais. Nada é enviado a um servidor e não há cobrança real. Os dados ficam no `sessionStorage` da aba. O comprovante baixado é um arquivo de texto de demonstração, sem valor fiscal. Os termos definitivos e a integração com API devem ser implementados antes de operar o produto.

O botão de pagamento usa o total calculado com a taxa de serviço (R$ 59,40 no exemplo), corrigindo a inconsistência de R$ 54,00 do botão na referência.

## Verificação

Testes unitários de valores e rotas; testes de navegador para as 29 telas em 320, 390, 768 e 1024 px, e fluxo de entrada até comprovante. Todas as imagens e fontes são locais, sem dependência de URLs temporárias do Figma.
