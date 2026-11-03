import {test as base,expect} from '@playwright/test';
const test=process.env.PLAYWRIGHT_EXECUTABLE_PATH?base.extend({page:async({playwright},use,info)=>{const browser=await playwright.chromium.launch(info.project.use.launchOptions);const page=await browser.newPage();await use(page);await browser.close();}}):base;
for(const [width,columns] of [[320,1],[412,1],[768,3],[1194,4],[1440,4]]){
 test(`kitchen at ${width}px has ${columns} columns and no service calls`,async({page})=>{
  await page.setViewportSize({width,height:900});const remote=[],errors=[];
  page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:5175')remote.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/cozinha');await expect(page.getByRole('heading',{name:'Cada pedido no seu tempo.'})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.kitchen-order')).toHaveCount(8);
  expect(await page.locator('.kitchen-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const logo=page.getByAltText('VamoRachar!');expect(await logo.evaluate(el=>el.naturalWidth>0)).toBeTruthy();
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));expect((await page.locator('.kitchen-header').boundingBox()).y).toBe(0);
  expect(remote).toEqual([]);expect(errors).toEqual([]);
 });
}
test('item confirmation affects only the chosen item and preserves the partial order',async({page})=>{
 await page.goto('/#/cozinha');await page.getByRole('article',{name:'Mesa 12, pedido 1042'}).getByRole('button',{name:'Ver detalhes'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.getByRole('combobox',{name:'Status de Batata rústica'}).selectOption('Pronto');
 await expect(dialog.getByRole('region',{name:'Confirmar alteração'})).toBeVisible();await dialog.getByRole('button',{name:'Voltar sem alterar'}).click();await expect(dialog.getByRole('combobox',{name:'Status de Batata rústica'})).toHaveValue('Em preparo');
 await dialog.getByRole('combobox',{name:'Status de Batata rústica'}).selectOption('Pronto');await dialog.getByRole('button',{name:'Confirmar status'}).click();await expect(dialog.getByRole('combobox',{name:'Status de Batata rústica'})).toHaveValue('Pronto');await expect(dialog.getByRole('combobox',{name:'Status de Burger da casa'})).toHaveValue('Entregue ao garçom');
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('article',{name:'Mesa 12, pedido 1042'})).toBeVisible();
 await page.getByRole('article',{name:'Mesa 12, pedido 1042'}).getByRole('button',{name:'Ver detalhes'}).click();await dialog.getByRole('combobox',{name:'Status de Batata rústica'}).selectOption('Entregue ao garçom');await dialog.getByRole('button',{name:'Confirmar status'}).click();await dialog.getByRole('button',{name:'Voltar à fila'}).click();
 await expect(page.locator('.kitchen-order')).toHaveCount(7);await page.reload();await expect(page.locator('.kitchen-order')).toHaveCount(8);
});
test('loading, empty, error, refresh success and bar sector are navigable',async({page})=>{
 await page.goto('/#/cozinha/estados');await page.getByRole('link',{name:'Carregando',exact:true}).click();await expect(page.getByRole('status',{name:'Carregando pedidos'})).toBeVisible();
 await page.goto('/#/cozinha/vazio');await expect(page.getByRole('heading',{name:'Nenhum pedido por enquanto.'})).toBeVisible();
 await page.goto('/#/cozinha/erro');await expect(page.getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('.kitchen-order')).toHaveCount(8);await expect(page.getByRole('status')).toContainText('Fila de demonstração atualizada.');
 await page.getByRole('button',{name:/Setor Cozinha/}).click();await expect(page.locator('.kitchen-order')).toHaveCount(2);await expect(page.getByRole('button',{name:/Setor Bar/})).toBeVisible();
});
