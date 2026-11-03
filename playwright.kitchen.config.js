import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'kitchen.spec.js',workers:1,
 use:{baseURL:'http://127.0.0.1:5175',headless:true,launchOptions:process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{}},
 webServer:{command:'npx vite --host 127.0.0.1 --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:false,env:{...process.env,VITE_APP_MODE:'api'}}
});
