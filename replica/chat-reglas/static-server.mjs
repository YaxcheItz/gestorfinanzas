import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('frontend/dist/frontend/browser');
const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.json':'application/json'};
createServer(async(req,res)=>{try{let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root)){res.writeHead(403).end();return;}let data;try{data=await readFile(path);}catch{path=resolve(root,'index.html');data=await readFile(path);}res.setHeader('Content-Type',mime[extname(path)]||'text/html');res.end(data);}catch{res.writeHead(500).end();}}).listen(14201,'127.0.0.1',()=>process.stdout.write('READY\n'));
