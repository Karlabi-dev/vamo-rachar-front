export const screens = [
 ['entrada','Entrada na mesa'],['conectando','Conectando à mesa'],['inicio','Início da Mesa 13'],['cardapio','Cardápio'],['produto','Detalhes do produto'],['dividir','Selecionar divisão'],['revisar-divisao','Confirmar divisão'],['aguardando','Aguardando participantes'],['convite','Convite recebido por Karla'],['revisar-pedido','Revisar pedido'],['pedido-enviado','Pedido enviado'],['acompanhar','Acompanhar em preparo'],['comanda','Minha comanda'],['mesa','Resumo coletivo da Mesa 13'],['pagamento','Conferir pagamento'],['processando','Pagamento processando'],['aprovado','Pagamento aprovado'],['recusado','Pagamento recusado'],['ajuda','Ajuda e atendimento'],['comprovante','Comanda encerrada e comprovante'],['nome-vazio','Erro de entrada — nome vazio'],['erro-conexao','Erro de conexão com a mesa'],['pedidos-vazios','Pedidos vazios'],['busca-vazia','Busca sem resultados'],['divisao-recusada','Divisão recusada'],['divisao-cancelada','Divisão cancelada'],['atendimento','Atendimento solicitado'],['pronto','Acompanhamento pronto'],['entregue','Acompanhamento entregue']
].map(([path, name], i) => ({path, name, number: i+1}));
export const products = [
 {id:'fries',name:'Fritas da casa',description:'Crocantes, com aioli de ervas.',detail:'Porção de 400 g de batatas douradas e crocantes, acompanhadas de aioli de ervas.',price:36,category:'Porções',image:'fries.png'},
 {id:'burger',name:'Burger da casa',description:'Brioche, carne e cheddar.',detail:'Pão brioche, hambúrguer da casa e cheddar. Feito na hora.',price:32,category:'Lanches',image:'burger.png'},
 {id:'lemonade',name:'Limonada natural',description:'Limão fresquinho. Copo 400 mL.',detail:'Limão fresquinho e gelo. Copo de 400 mL.',price:10,category:'Bebidas',image:'lemonade.png'}
];
export const money = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export function totals(items, shared=12, service=true) {
 const individual = items.reduce((sum,item)=>sum+item.price*item.quantity,0);
 const subtotal = Math.round((individual+shared)*100)/100;
 const fee = service ? Math.round(subtotal*10)/100 : 0;
 return {individual, shared, subtotal, fee, total:Math.round((subtotal+fee)*100)/100};
}
export const initialItems = [{...products[1],quantity:1},{...products[2],quantity:1}];
