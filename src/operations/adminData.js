// Reference snapshots for the frontend demonstration. Nothing is persisted or sent.
export const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
export const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function priceInCents(value){
 const raw=String(value).replace(/R\$|\s/g,'');
 if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))return null;
 const result=Math.round(Number(raw.replace(/\./g,'').replace(',','.'))*100);
 return Number.isSafeInteger(result)&&result>0?result:null;
}
export const createProducts=()=>[
 {id:'burger',name:'Burger da casa',summary:'Brioche, carne 180 g e cheddar',description:'Pão brioche, hambúrguer artesanal de 180 g, cheddar, alface, tomate e maionese da casa.',category:'Pratos',price:3290,sector:'Cozinha',available:true,image:'./assets/admin-burger.png'},
 {id:'batata',name:'Batata rústica',summary:'Batatas com alecrim · 300 g',description:'Batatas rústicas com alecrim, crocantes por fora e macias por dentro. Porção de 300 g.',category:'Porções',price:1890,sector:'Cozinha',available:true,image:'./assets/admin-fries.png'},
 {id:'salada',name:'Salada da horta',summary:'Folhas, tomates e parmesão',description:'Folhas frescas, tomates e parmesão. Molho servido à parte.',category:'Pratos',price:2690,sector:'Cozinha',available:true,image:'./assets/admin-salad.png'},
 {id:'risoto',name:'Risoto de cogumelos',summary:'Arroz arbóreo e mix de cogumelos',description:'Arroz arbóreo cremoso com mix de cogumelos e parmesão.',category:'Pratos',price:4290,sector:'Cozinha',available:true,image:'./assets/admin-risotto.png'},
 {id:'suco',name:'Suco de laranja',summary:'Natural, feito na hora · 350 ml',description:'Suco natural de laranja feito na hora. Copo de 350 ml.',category:'Bebidas',price:1200,sector:'Bar',available:false,image:'./assets/admin-orange.png'},
 {id:'limonada',name:'Limonada da casa',summary:'Limão, água e gelo · 350 ml',description:'Limonada refrescante com limão, água e gelo. Copo de 350 ml.',category:'Bebidas',price:1400,sector:'Bar',available:true,image:'./assets/admin-lemonade.png'},
];
const item=(id,name,status='Recebido',client='Ana')=>({id,name,status,client,quantity:1,price:({burger:3290,batata:1890,salada:2690,risoto:4290,suco:1200,limonada:1400})[id]});
export const createAdminOrders=()=>[
 {id:'1054',table:'09',time:'12:37',sector:'Cozinha',status:'Recebido',items:[item('burger','Burger da casa'),item('batata','Batata rústica')]},
 {id:'1053',table:'03',time:'12:35',sector:'Cozinha',status:'Recebido',items:[item('salada','Salada da horta'),item('risoto','Risoto de cogumelos')]},
 {id:'1051',table:'07',time:'12:31',sector:'Cozinha',status:'Aceito',items:[item('burger','Burger da casa','Aceito'),item('batata','Batata rústica','Aceito'),item('salada','Salada da horta','Aceito')]},
 {id:'1050',table:'01',time:'12:29',sector:'Cozinha',status:'Aceito',items:[item('burger','Burger da casa','Aceito')]},
 {id:'1048',table:'05',time:'12:32',sector:'Bar',status:'Parcialmente cancelado',progress:'1 pronto · 1 cancelado',items:[item('suco','Suco de laranja','Aceito'),item('limonada','Limonada da casa','Em preparo')]},
 {id:'1046',table:'08',time:'12:24',sector:'Cozinha',status:'Pronto',items:[item('burger','Burger da casa','Pronto'),item('batata','Batata rústica','Pronto')]},
 {id:'1042',table:'12',time:'12:18',sector:'Cozinha',status:'Em preparo',items:[item('burger','Burger da casa','Entregue'),item('salada','Salada da horta','Entregue','Bruno'),item('batata','Batata rústica','Em preparo')]},
 {id:'1040',table:'04',time:'12:10',sector:'Cozinha',status:'Atrasado · 8 min',items:[{...item('risoto','Risoto de cogumelos','Em preparo'),quantity:2}]},
 {id:'1052',table:'07',time:'12:32',sector:'Bar',status:'Aceito',items:[item('limonada','Limonada da casa','Aceito')]},
];
export const statusTone=status=>/Cancelado|cancelado|Atrasado|Indisponível/.test(status)?'orange':/Pronto|Entregue|Concluído/.test(status)?'green':/preparo/.test(status)?'yellow':'blue';
export const orderProgress=o=>o.progress||`${o.items.filter(i=>i.status==='Entregue').length} de ${o.items.reduce((n,i)=>n+i.quantity,0)} entregue${o.items.length===1&&o.items[0].quantity===1?'':'s'}`;
export const createSettings=()=>({mode:'separate',fee:'10,0',informPartner:true,sectors:['Cozinha','Bar'],tables:Array.from({length:12},(_,i)=>({id:String(i+1).padStart(2,'0'),name:`Mesa ${String(i+1).padStart(2,'0')}`,area:i<8?'Salão':'Varanda',seats:i<8?4:2,active:true,open:![5,9].includes(i)})),devices:[{id:'CZ-01',name:'Tablet cozinha',role:'Cozinha'},{id:'BR-01',name:'Tablet bar',role:'Bar'},{id:'PR-01',name:'Tablet salão',role:'Praça'},{id:'AD-01',name:'Tablet gestão',role:'Administrador'}]});
export const createHistory=()=>[
 {id:'EVT-0832',time:'12:38',author:'Lucas Oliveira',device:'PR-01',role:'Praça',action:'Abertura de mesa',target:'Mesa 06 · M06-1102',reason:'Nova sessão de atendimento',result:'Sessão criada'},
 {id:'EVT-0831',time:'12:36',author:'Marina Costa',device:'AD-01',role:'Administrador',action:'Cancelamento de item',target:'1× Suco de laranja · #1048',context:'Mesa 05 · Bar · Somente este item',reason:'Produto indisponível: laranjas esgotadas.',result:'Item cancelado',detail:'Item cancelado. Bar notificado. Limonada preservada no pedido.'},
 {id:'EVT-0830',time:'12:35',author:'Marina Costa',device:'AD-01',role:'Administrador',action:'Disponibilidade alterada',target:'Suco de laranja · Bar',reason:'Produto sem estoque para preparo',result:'Indisponível'},
 {id:'EVT-0829',time:'12:33',author:'Lucas Oliveira',device:'CZ-01',role:'Cozinha',action:'Entrega ao garçom',target:'#1042 · Salada da horta',reason:'Retirada confirmada na Cozinha',result:'Item entregue'},
 {id:'EVT-0828',time:'11:42',author:'Marina Costa',device:'AD-01',role:'Administrador',action:'Produto atualizado',target:'Burger da casa · Cozinha',reason:'Atualização da descrição do produto',result:'Publicado'},
];
// Escape spreadsheet formulas and quotes; all exported records are fictitious.
export const historyCsv=records=>'\uFEFF'+[['Registro','Data','Hora','Autor','Dispositivo','Ação','Alvo','Motivo','Resultado'],...records.map(e=>[e.id,'02/11/2026',e.time,e.author,e.device,e.action,e.target,e.reason,e.result])].map(row=>row.map(v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n');
