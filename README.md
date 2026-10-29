# VamoRachar! — Front-end

Aplicação em React + Vite com protótipo visual de 29 telas do cliente e uma primeira integração de entrada na mesa e consulta ao cardápio. As telas de equipe ainda não estão implementadas.

## Rodar localmente

```bash
npm ci
npm run dev
```

Para o modo conectado, configure primeiro `.env.local` conforme a seção de integração abaixo e use um endereço com os identificadores da mesa. Para ver as 29 telas de demonstração, configure `VITE_APP_MODE=demo` e abra `/#/telas`.

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
- `public/assets`: logo original enviada pelo usuário e fotos locais extraídas da referência. A resolução das fotos é limitada pelo arquivo fornecido; substitua por exportações originais quando disponíveis.

## Escopo

Entrada, conexão, início, cardápio, produto, divisão e convites, revisão de pedido, acompanhamento, comanda individual e coletiva, pagamento, comprovante, ajuda e estados alternativos. Referência visual de 390 px e layout de sistema web em toda a largura da janela, adaptado para celular e tablet. Sem barra de hora/bateria/Wi-Fi, moldura arredondada ou indicador de navegação do dispositivo. O menu do próprio sistema foi mantido. A logo foi substituída pelo arquivo original enviado pelo usuário.

No modo de demonstração, pedidos, convites, status e pagamentos são simulações locais. Nesse modo nada é enviado a um servidor e não há cobrança real. Os dados ficam no `sessionStorage` da aba. O comprovante baixado é um arquivo de texto de demonstração, sem valor fiscal. Os termos definitivos e a integração com API devem ser implementados antes de operar o produto.

O botão de pagamento usa o total calculado com a taxa de serviço (R$ 59,40 no exemplo), corrigindo a inconsistência de R$ 54,00 do botão na referência.

## Verificação

Testes unitários de valores e rotas; testes de navegador para as 29 telas em 320, 390, 768 e 1024 px, e fluxo de entrada até comprovante. Os testes também verificam ausência de elementos de celular e contêiner sem cantos arredondados ocupando toda a largura. Todas as imagens e fontes são locais, sem dependência de URLs temporárias do Figma.

## Cabeçalho e menu fixos

O cabeçalho permanece fixo no topo e o menu do sistema na parte inferior durante a rolagem. O conteúdo reserva espaço para ambos, incluindo a área segura inferior de dispositivos compatíveis. Telas que não possuem menu inferior reservam somente o espaço do cabeçalho. Os modais continuam acima dos controles fixos.

## Integração inicial: entrada e cardápio

O modo conectado identifica a mesa pelo endereço, autentica o cliente anonimamente no Firebase e chama `joinTable` e `listMenu` no backend. O cardápio usa preço em centavos retornado pela API. Esta etapa não envia pedidos nem processa pagamentos; o modo conectado informa essa limitação e não apresenta as telas simuladas como operações reais.

Copie `.env.example` para `.env.local` e configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` e `VITE_API_BASE_URL`. A chave Web do Firebase e o ID do projeto são públicos; nunca coloque credenciais de conta de serviço ou chaves privadas em variáveis `VITE_`, pois elas são incluídas no código entregue ao navegador. A API deve usar HTTPS, exceto testes em localhost.

O QR precisa apontar para o site com parâmetros `restaurantId` e `tableId`, por exemplo `https://site.exemplo/?restaurantId=restaurante-demo&tableId=mesa-13`. Esses IDs e uma sessão aberta precisam existir no backend. Os parâmetros podem estar antes do hash ou no fragmento após `?`. Para testar sem QR, as variáveis opcionais `VITE_DEMO_RESTAURANT_ID` e `VITE_DEMO_TABLE_ID` fornecem valores padrão; os parâmetros do QR têm prioridade. A API autoriza entrada somente em sessão aberta.

Em um Static Site no Render, configure o build com `npm ci && npm run build`, diretório de publicação `dist` e as variáveis `VITE_` no ambiente do front-end antes do build. No serviço da API, inclua a origem exata do front em `CORS_ORIGINS`, preservando outras origens necessárias. Não é necessário configurar nem publicar o Render para executar os testes locais. O aplicativo e a API devem ser testados com dados fictícios e uma mesa aberta antes de qualquer uso em restaurante.

Por padrão a aplicação usa o modo conectado e exibe erro se a configuração estiver ausente. Para acessar explicitamente a demonstração visual anterior, ajuste `VITE_APP_MODE=demo` em `.env.local` antes de executar `npm run dev`. Os testes de navegador são `npm run test:e2e:demo` e `npm run test:e2e:api` depois de `npx playwright install chromium`. O segundo usa respostas fictícias para Authentication e API; não valida conexão com o Firebase ou Render reais.

Para testes locais com os emuladores, é possível definir `VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099` e usar uma API local conectada aos mesmos emuladores. O cliente aceita essa configuração somente no servidor de desenvolvimento e apenas para localhost; ela não é válida no build de produção.

Para verificar os dois repositórios juntos com emuladores locais, instale as dependências do front e do backend e o Chromium do Playwright. A partir da pasta do backend, execute:

```sh
npx firebase emulators:exec --project demo-vamo-rachar --only auth,firestore 'node ../vamo-rachar-front/scripts/test-local-integration.cjs'
```

O script espera o backend em `../Vamo-Rachar-` em relação ao front; use `VAMO_BACKEND_PATH` se estiver em outro local. Ele aceita apenas hosts de emuladores locais e um projeto `demo-*`, cria dados fictícios nos emuladores e não acessa o Firebase real. Esse teste integrado precisa dos dois repositórios e é independente dos testes do GitHub Actions deste repositório.
