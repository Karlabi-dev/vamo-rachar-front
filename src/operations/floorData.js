// Fictional fixtures for the Praça screens. No persistence or service calls.
export const floorTables = [
  { id:'01', state:'open', people:2, elapsed:32, area:'Salão', seats:4 },
  { id:'02', state:'open', people:3, elapsed:25, area:'Salão', seats:4 },
  { id:'03', state:'open', people:2, elapsed:18, area:'Salão', seats:4 },
  { id:'04', state:'attention', people:2, elapsed:28, area:'Salão', seats:4, late:true },
  { id:'05', state:'open', people:2, elapsed:14, area:'Salão', seats:4 },
  { id:'06', state:'available', people:0, elapsed:0, area:'Salão', seats:4 },
  { id:'07', state:'open', people:4, elapsed:20, area:'Salão', seats:4 },
  { id:'08', state:'attention', people:2, elapsed:14, area:'Salão', seats:4, ready:true },
  { id:'09', state:'open', people:2, elapsed:5, area:'Varanda', seats:4 },
  { id:'10', state:'available', people:0, elapsed:0, area:'Varanda', seats:2 },
  { id:'11', state:'closing', people:0, elapsed:40, area:'Varanda', seats:4 },
  { id:'12', state:'attention', people:2, elapsed:33, area:'Varanda', seats:4, call:true },
].map(t=>({...t, session:`M${t.id}-1102`, opened:t.id==='12'?'12:05':'12:18', waiter:'Lucas Oliveira'}));

export const floorOrders = [
  { table:'12', id:'1042', received:'12:18', sector:'Cozinha', due:'12:43', status:'Em preparo', items:[
    {id:'burger', name:'Burger da casa', quantity:1, client:'Ana', note:'sem cebola', delivered:true, time:'12:31'},
    {id:'salad', name:'Salada da horta', quantity:1, client:'Bruno', note:'molho à parte', delivered:true, time:'12:33'},
    {id:'fries', name:'Batata rústica', quantity:1, client:'Ana', note:'compartilhar', delivered:false},
  ]},
  { table:'04', id:'1040', received:'12:10', sector:'Cozinha', due:'12:30', status:'Em preparo', items:[{id:'risotto', name:'Risoto de cogumelos', quantity:2, client:'Ana', note:'', delivered:false}]},
  { table:'08', id:'1046', received:'12:24', sector:'Cozinha', due:'12:39', status:'Pronto na Cozinha', items:[{id:'burger',name:'Burger da casa',quantity:1,client:'Ana',note:'',delivered:false,ready:true},{id:'fries',name:'Batata rústica',quantity:1,client:'Bruno',note:'',delivered:false,ready:true}]},
];
export const createFloorTables = () => floorTables.map(t=>({...t}));
export const createFloorOrders = () => floorOrders.map(o=>({...o,items:o.items.map(i=>({...i}))}));
export const stateNames = {open:'Aberta', available:'Disponível', attention:'Atenção', closing:'Finalizando'};
export const stateTones = {open:'blue', available:'green', attention:'yellow', closing:'blue'};
export function floorCounts(tables){
  return Object.fromEntries(['available','open','attention','closing'].map(key=>[key,tables.filter(t=>t.state===key).length]));
}
export function tableSubtitle(table){
  if(table.state==='available')return `${table.seats} lugares · ${table.area.toLocaleLowerCase('pt-BR')}`;
  if(table.late)return 'Pedido 8 min atrasado';
  if(table.ready)return 'Pedido pronto · 2 min';
  if(table.call)return 'Garçom solicitado';
  if(table.state==='closing')return 'Sem itens pendentes';
  return `${table.people} clientes · há ${table.elapsed} min`;
}
export function tablePending(table,orders){
  const items=orders.filter(o=>o.table===table.id).reduce((count,o)=>count+o.items.filter(i=>!i.delivered).length,0);
  return {items,calls:table.call?1:0};
}
export function openFloorTable(tables,id,waiter){
  return tables.map(t=>t.id===id&&t.state==='available'?{...t,state:'open',people:0,elapsed:0,waiter,opened:'12:38',call:false,ready:false,late:false}:t);
}
export function attendFloorCall(tables,id){
  return tables.map(t=>t.id===id&&t.call?{...t,call:false,state:t.late||t.ready?'attention':'open'}:t);
}
export function closeFloorTable(tables,id){
  return tables.map(t=>t.id===id?{...t,state:'available',people:0,elapsed:0,call:false,ready:false,late:false}:t);
}
