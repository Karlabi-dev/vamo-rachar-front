import {test as base,expect} from '@playwright/test';
import {screens} from '../src/data/screens.js';
const test = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? base.extend({ page: async ({playwright}, use, testInfo) => { const browser = await playwright.chromium.launch(testInfo.project.use.launchOptions); const page=await browser.newPage(); await use(page); await browser.close(); } }) : base;
for(const width of [320,390,768,1024]) {
 test(`29 screens render without overflow or broken assets at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1024});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const screen of screens){
   await page.goto('/#/'+screen.path);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen.path).toBeTruthy();
   await expect(page.locator('.statusbar,.safe-area')).toHaveCount(0);
   const frame=await page.locator('.app-shell').evaluate(el=>({width:el.getBoundingClientRect().width,radius:getComputedStyle(el).borderRadius}));
   expect(frame.width).toBe(width);expect(frame.radius).toBe('0px');
   for(const img of await page.locator('img').all()){expect(await img.evaluate(el=>el.complete&&el.naturalWidth>0),`${screen.path}: image`).toBeTruthy();}
  }
  expect(errors).toEqual([]);
 });
}
test('name validation, menu search, split selection, checkout and receipt',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/');
 await page.getByLabel('Como podemos te chamar?').fill('');await page.getByRole('button',{name:'Entrar na mesa'}).click();await expect(page.getByText('Digite seu nome para continuar.')).toBeVisible();
 await page.getByLabel('Como podemos te chamar?').fill('Allander');await page.getByRole('button',{name:'Entrar na mesa'}).click();await expect(page.getByRole('heading',{name:'Oi, Allander!'})).toBeVisible();
 await page.getByRole('button',{name:'Explorar cardápio'}).click();await page.getByRole('textbox',{name:'Buscar no cardápio'}).fill('risoto');await expect(page.getByRole('heading',{name:'Não achamos “risoto”.'})).toBeVisible();await page.getByRole('button',{name:'Limpar busca',exact:true}).last().click();
 await page.getByRole('button',{name:/IDEAL PARA RACHAR/}).click();await page.getByRole('button',{name:'Escolher com quem rachar'}).click();await page.getByRole('button',{name:/Continuar/}).click();await page.getByRole('button',{name:'Enviar convites'}).click();await expect(page.getByRole('heading',{name:'Falta só um ok.'})).toBeVisible();
 await page.goto('/#/convite');await page.getByRole('button',{name:'Aceitar · R$ 12,00'}).click();await page.getByRole('button',{name:/Enviar pedido/}).click();await page.getByRole('button',{name:'Acompanhar pedido'}).click();await expect(page.getByRole('heading',{name:'Já está no capricho.'})).toBeVisible();
 await page.getByRole('button',{name:'Comanda',exact:true}).click();await page.getByRole('button',{name:/Ir para pagamento/}).click();await page.getByRole('button',{name:'Pagar R$ 59,40'}).click();await expect(page.getByRole('heading',{name:'Conta paga. Tudo certo!'})).toBeVisible();await page.getByRole('button',{name:'Ver comanda encerrada'}).click();await expect(page.getByRole('heading',{name:'Foi bom ter você aqui.'})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Salvar comprovante'}).click();expect((await download).suggestedFilename()).toContain('comprovante');
});
