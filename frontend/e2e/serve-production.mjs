import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Servidor exclusivamente local para probar el artefacto compilado con el backend real.
const root=path.resolve('dist/frontend/browser');
if(!fs.existsSync(path.join(root,'index.html'))) throw new Error('Ejecuta npm run build antes de probar producción.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/api'||url.pathname.startsWith('/api/')) {
    const proxy=http.request({host:'127.0.0.1',port:18080,path:request.url,method:request.method,
      headers:{...request.headers,host:'localhost:18080'}},upstream=>{
        response.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(response);
      });
    proxy.on('error',()=>{response.writeHead(502);response.end();});request.pipe(proxy);return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)) {response.writeHead(403);response.end();return;}
  const resolved=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
  response.writeHead(200,{'Content-Type':mime[path.extname(resolved)]??'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(resolved).pipe(response);
}).listen(Number(process.env.E2E_FRONTEND_PORT ?? '14200'),'localhost');
