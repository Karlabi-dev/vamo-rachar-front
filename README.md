# VamoRachar! — Front-end

Aplicação em React + Vite com protótipo visual de 29 telas do cliente e integração inicial de entrada, cardápio, pedido individual e divisão de uma unidade. Inclui áreas de Cozinha/Bar, Praça e Administrador com dados fictícios e estado local, além de telas conectadas experimentais para a operação.

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

O modo conectado identifica a mesa pelo endereço, autentica o cliente anonimamente no Firebase e chama `joinTable` e `listMenu` no backend. O cardápio usa preço em centavos retornado pela API. O modo conectado permite pedido de uma unidade por vez, divisão com participantes da sessão, aceite ou recusa de convites e resolução da recusa. A visão completa de acompanhamento, o pagamento e a comanda ainda não estão conectados. Não há cobrança real. A versão integrada depende da branch correspondente do backend, que valida o preço apresentado.

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

## Cozinha e Bar em demonstração local

Abra `/#/cozinha` para a fila de cozinha e `/#/bar` para dados fictícios do bar, em qualquer modo de execução. Essas rotas são carregadas separadamente e não inicializam o cliente conectado nem o Firebase. Nenhum pedido ou status é enviado a um serviço externo.

A fila de cozinha foi implementada a partir da referência visual e do contexto de design do frame Figma `110:29366`: Inter, oito cartões por mesa, recebimento e previsão, observações, destaque de entrega parcial, atrasos e espera pelo garçom. Usa quatro colunas em notebook/desktop, três ou duas em larguras intermediárias e uma em celulares. O cabeçalho e a navegação ficam fixos; não foi reproduzida a barra decorativa de navegador do design, conforme a orientação anterior sobre exibir o sistema sem moldura.

`/#/cozinha/estados` lista loading, vazio, erro e atualização com sucesso. `Ver detalhes` abre **uma prévia local dos itens**, com confirmação para mudar o status de um item e retorno à fila. Essa prévia não é a reprodução da tela de detalhes do Figma: a consulta dessa referência foi bloqueada pelo limite do plano Starter. A reprodução fiel dos detalhes da Cozinha ainda depende de uma referência legível. Praça e Administrador foram adicionados posteriormente com os prints fornecidos pelo usuário, conforme as seções abaixo.

O estado da fila fica somente na memória e é reiniciado ao recarregar a página. Os pedidos parcialmente entregues continuam visíveis; quando todos os itens de um pedido fictício são marcados como entregues ao garçom, o cartão sai da fila local. Isso é uma demonstração visual, sem regra financeira, autenticação, API ou persistência em banco. A logo usa o arquivo original já existente no projeto. Os itens do Bar são exemplos criados para a demonstração, não uma cópia de uma tela de referência específica.

Para executar os testes desta área, use `npm run test:e2e:kitchen` após instalar o Chromium do Playwright.

## Praça em demonstração local

A Praça foi implementada a partir dos cinco prints enviados pelo usuário, que representam quatro referências: painel de mesas, abertura de mesa, detalhes da Mesa 12 para tablet/computador e detalhes para celular (estes divididos nos dois últimos prints). As linhas azuis de seleção do Figma e a barra decorativa de navegador não fazem parte do sistema. A logo original e os componentes visuais existentes foram reutilizados. O cabeçalho e as abas Mesas e Chamadas permanecem fixos.

- `/#/praca`: painel com 12 mesas fictícias, indicadores (02 disponíveis, 06 abertas, 03 em atenção, 01 finalizando), filtros por Salão/Varanda, grade/lista e alertas.
- `/#/praca/abrir`: seleção de mesa disponível, garçom responsável e confirmação local da abertura; o resultado exibe o QR Code de demonstração e acesso à nova mesa.
- `/#/praca/mesa/12`: pedido #1042, status de cada item, chamada, QR Code ampliável, clientes e encerramento desabilitado enquanto há pendências. No celular os cartões de QR Code e clientes antecedem o pedido; no tablet/computador eles ficam na coluna lateral.
- `/#/praca/chamadas`: solicitações fictícias e confirmação local de atendimento.
- `/#/praca/estados`: acesso a loading, vazio, erro e confirmação de encerramento. Uma mesa sem itens nem chamadas pendentes (por exemplo, a Mesa 11) permite testar a confirmação e o retorno ao painel.

As interações alteram exclusivamente estados React em memória. Recarregar a página restaura os dados iniciais. Não há API, banco, autenticação, pagamento, geração de token ou sessão real. O QR é gerado localmente em SVG pela biblioteca `qrcode` e codifica somente texto com a indicação de DEMONSTRAÇÃO LOCAL; não aponta para um site e não dá acesso a uma mesa real. IDs, horários e nomes são fictícios. Essas rotas funcionam nos modos demo e api sem inicializar Firebase ou serviços externos.

A apresentação usa quatro indicadores, três colunas de mesas com alertas laterais em telas grandes, reorganiza o painel em larguras intermediárias e muda a ordem dos cartões dos detalhes no celular. Foram adicionados testes em 320, 412, 768, 1194 e 1440 px, cobrindo overflow, ausência de requisições externas, abertura/encerramento local, atendimento, filtros, QR e estados de recuperação. Execute `npm run test:e2e:floor` após instalar o Chromium do Playwright.


## Administrador em demonstração local

Implementado com os nove prints enviados: pedidos, cancelamento, auditoria, configurações, cardápio para computador/tablet, edição de produto, painel de estados e cardápio para celular (os dois últimos prints compõem uma única tela). A barra decorativa de navegador e as linhas azuis de seleção do Figma foram omitidas. A logo original, os componentes compartilhados e a tecnologia existente foram preservados. Cabeçalho e abas permanecem fixos.

| Endereço | Tela e interações locais |
| --- | --- |
| `/#/admin` | Cardápio: seis produtos, categorias, busca por nome/descrição, filtros por setor, disponibilidade e acesso à edição. No celular, cards e categorias em duas colunas substituem a tabela e a lateral. |
| `/#/admin/produto/burger` | Edição: nome, descrição, categoria, preço em centavos, setor, disponibilidade e prévia de imagem JPG/PNG até 5 MB. Valida campos obrigatórios antes de salvar em memória. |
| `/#/admin/produto/novo` | Cadastro visual de um produto fictício. |
| `/#/admin/configuracoes` | Preparo junto/separado, taxa sugerida, mesas, ambientes e dispositivos fictícios. Modais adicionam setor, mesa ou dispositivo e editam mesa/vínculo; Salvar configurações aplica somente à demonstração. |
| `/#/admin/pedidos` | Nove pedidos fictícios, indicadores, busca, filtros por setor/status/data e paginação de oito registros. |
| `/#/admin/pedido/1042` | Detalhes do pedido com status individuais por item. |
| `/#/admin/cancelar/1048` | Etapas de token demonstrativo, seleção de item/pedido, motivo obrigatório, confirmação e resultado; mantém os outros itens ao simular cancelamento parcial. |
| `/#/admin/auditoria` | Histórico fictício, destaque de evento, filtros e exportação CSV local. Registros não possuem controles de edição/exclusão. |
| `/#/admin/estados` | Exemplos de carregamento, vazio, erro com dados preservados e sucesso com QR demonstrativo. |
| `/#/admin/loading`, `/#/admin/vazio`, `/#/admin/erro` | Estados alternativos do cardápio e recuperação para a visualização normal. |

O token **123456** é público e serve exclusivamente para avançar as etapas visuais. Não representa autenticação ou autorização real. É apagado do campo após a validação local e não é incluído no histórico ou CSV. Uma confirmação consome essa autorização de demonstração. Não há backend, API, banco, pagamento, vínculo real de dispositivo ou persistência nesta área. Tudo é estado React em memória e é restaurado ao recarregar a página. Cada área operacional tem seu próprio conjunto de dados mockados; alterações do Administrador não são propagadas às outras áreas nem ao cliente conectado.

As rotas do Administrador usam carregamento separado e funcionam nos modos demo/api sem inicializar Firebase ou o cliente conectado. Todas as fontes e fotos são locais. As fotos foram recortadas dos prints e têm resolução limitada pela referência. A contagem do cardápio é calculada pelos seis produtos exibidos, mantendo os indicadores coerentes entre computador e celular.

Arquivos: `src/operations/AdminApp.jsx` controla navegação e estado; `AdminCatalog.jsx`, `AdminSettings.jsx`, `AdminOrders.jsx` e `AdminStates.jsx` compõem as telas; `AdminUI.jsx` reutiliza os componentes existentes e acrescenta diálogo, campos e feedbacks; `adminData.js` fornece os dados fictícios; `admin.css` contém estilos isolados desta área.

Validação: `npm run build`, `npm test` e `npm run test:e2e:admin`. Os testes de navegador cobrem 320, 412, 768, 1194 e 1440 px, ausência de overflow/requisições externas/erros JavaScript, cabeçalho/abas fixos, edição/cadastro, imagens locais, categorias, configurações, paginação, status por item, cancelamento parcial/integral, auditoria/CSV e recuperação de estados. O fluxo foi incluído no GitHub Actions, junto às verificações anteriores de cliente, Cozinha/Bar e Praça.


## Primeira integração operacional: protótipo conectado

As telas `/#/operacao/praca`, `/#/operacao/cozinha` e `/#/operacao/bar` são uma primeira interface conectada à API; as rotas visuais anteriores (`/#/praca`, `/#/cozinha`, `/#/bar` e `/#/admin`) continuam como demonstrações independentes. As telas conectadas não substituem ainda os painéis completos. A URL exige a configuração pública do Firebase e da API descrita acima.

O gerente ativa a tela conectada com seu código de oito dígitos e o ID do restaurante. Cada tela usa uma identidade Firebase anônima técnica separada por setor e dispositivo/navegador, sem login individual para equipe. A praça abre uma mesa existente com o código de garçom ou gerente e gera um QR para a URL de entrada do cliente. O QR é apenas para teste: pode ser compartilhado e não valida presença. A praça pode consultar itens prontos e registrar retirada e entrega. Cozinha/bar consultam e atualizam sua própria fila. Use **Atualizar fila**: não há notificações nem atualização automática. Recarregar a tela solicita nova ativação.

A abertura ainda depende de um restaurante e uma mesa já cadastrados, de códigos válidos, do segredo `STAFF_CODE_PEPPER` no backend e de uma API com essas operações efetivamente implantada. A rota `/#/operacao/admin` oferece uma interface conectada inicial de produtos e códigos da equipe, com e-mail/senha e segundo fator por aplicativo autenticador TOTP. Ela exige uma conta já provisionada, segundo fator configurado e vínculo administrativo ativo no estabelecimento. O cadastro do primeiro administrador, a recuperação e a verificação da disponibilidade/custos do TOTP no plano Firebase escolhido ainda estão pendentes. Os testes com fator simulado não comprovam acesso MFA real. Não enviar senhas, códigos, conta de serviço ou o segredo ao chat ou ao repositório.

O cliente conectado pode enviar um único produto por pedido e selecionar até 19 convidados. O front apresenta as partes usando a ordem de identificadores do backend, e o convidado vê o valor retornado pelo servidor antes de aceitar. Se a divisão for recusada, o responsável pode assumir, cancelar ou convidar novamente; as listagens são atualizadas manualmente. Em falha de resposta, a tentativa de pedido ou resolução fica no `sessionStorage` e usa o mesmo `requestId` na repetição; não limpe a aba/armazenamento antes de resolver. A recuperação ao trocar de dispositivo ou limpar os dados, expiração de convite e múltiplos itens ainda precisam de desenvolvimento. O preço apresentado é enviado como valor esperado e precisa ser conferido na transação do backend antes da criação.

O formulário demonstrativo de produto permite marcar Bar e Cozinha simultaneamente, mas não salva no Firebase. O formulário da rota administrativa conectada grava nome, descrição, preço, disponibilidade, destinos e URL HTTPS opcional pela API; ainda não faz upload de foto nem persiste categorias. A página conectada mostra o código de cada funcionário somente uma vez, com opções de troca e desativação. Setores adicionais e modo conjunto existentes nas configurações visuais são somente simulação e não representam contratos do backend.

### Teste integrado nos emuladores

Além dos testes Playwright com respostas simuladas, o script abaixo cria restaurante, funcionários, mesa e produto **fictícios somente nos emuladores**. Exercita ativação, abertura, entrada do cliente, pedido, preparo em bar e cozinha e entrega parcial pela API Express e Firestore emulados. Precisa dos dois repositórios com dependências instaladas e Chromium. Na pasta do backend:

```bash
npx firebase emulators:exec --project demo-vamo-rachar --only auth,firestore 'node ../vamo-rachar-front-integracao-equipe/scripts/test-operations-integration.cjs'
```

Ajuste o caminho se o front estiver em outra pasta. O script não acessa o Firebase real nem executa pagamento. O GitHub Actions do front cobre os testes de navegador com respostas simuladas; esse teste integrado de dois repositórios é separado e ainda não roda no Actions.


### Teste administrativo nos emuladores

O teste abaixo cria dados fictícios de restaurante e administrador nos emuladores e verifica a interface conectada, escrita de produto e código da equipe no Firestore emulado e recusa de token sem segundo fator. **O desafio e o token com segundo fator são simulados; não provam disponibilidade ou funcionamento do MFA real.** Execute na pasta do backend, depois de instalar as dependências dos dois repositórios e o Chromium:

```bash
npx firebase emulators:exec --project demo-vamo-rachar --only auth,firestore 'node ../vamo-rachar-front-integracao-equipe/scripts/test-admin-integration.cjs'
```

O GitHub Actions do front executa os testes de interface com autenticação e API simuladas. O teste integrado de dois repositórios acima é separado e ainda não roda no Actions.


### Teste de divisão nos emuladores

A branch do front com divisão depende da branch `validar-preco-pedido` do backend, que aceita `expectedUnitPriceCents` e retorna `isOwner` na listagem de itens. **Confirme Actions e revisão nos dois repositórios e atualize o backend antes de publicar o front.** Com ambos checkouts e dependências instaladas, a partir da pasta do backend:

```bash
VAMO_BACKEND_PATH=../vamo-rachar-backend-divisao npx firebase emulators:exec --project demo-vamo-rachar --only auth,firestore 'node ../vamo-rachar-front-integracao-equipe/scripts/test-split-integration.cjs'
```

Ajuste os caminhos conforme as pastas locais. O script usa duas identidades anônimas e dados fictícios nos emuladores para verificar recusa e assunção, aceite, distribuição de centavos e recusa de preço alterado. Não testa cobrança real. Atualize manualmente convites e pedidos; notificações e expiração de convites permanecem pendentes.
