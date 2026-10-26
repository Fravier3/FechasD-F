import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {VERSION as baseVersion} from '../core.js';
const modules=['app.js','core.js','updates.js','access.js','media.js','media-core.js','covers.js','config.js','styles.css'];
const sources=['index.html',...modules,'sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const hash=createHash('sha256');for(const name of sources){hash.update(name);hash.update(await readFile(name));}
const version=baseVersion+'-'+hash.digest('hex').slice(0,10);
const output='_site',release=`releases/${version}`,icons=`icons/${version}`;
await mkdir(`${output}/${release}`,{recursive:true});await mkdir(`${output}/${icons}`,{recursive:true});
for(const name of modules){
 let content=await readFile(name,'utf8');
 if(name==='core.js')content=content.replace(`VERSION = '${baseVersion}'`,`VERSION = '${version}'`).replace("ICON_URL = './icon-192.png'",`ICON_URL = './${icons}/icon-192.png'`);
 await writeFile(`${output}/${release}/${name}`,content);
}
for(const size of [180,192,512]){await cp(`icon-${size}.png`,`${output}/${icons}/icon-${size}.png`);await cp(`icon-${size}.png`,`${output}/icon-${size}.png`);}
let html=await readFile('index.html','utf8');
html=html.replace('<html lang="es">',`<html lang="es" data-app-version="${version}">`)
 .replace(/\.\/styles\.css\?v=[^"']+/g,`./${release}/styles.css`)
 .replace(/\.\/app\.js\?v=[^"']+/g,`./${release}/app.js`)
 .replaceAll('./icon-180.png',`./${icons}/icon-180.png`).replaceAll('./icon-192.png',`./${icons}/icon-192.png`)
 .replace('href="./manifest.webmanifest"',`href="./manifest.webmanifest?v=${version}"`);
await writeFile(`${output}/index.html`,html);
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));manifest.icons.forEach(icon=>icon.src=`./${icons}/${icon.src.split('/').pop()}`);
await writeFile(`${output}/manifest.webmanifest`,JSON.stringify(manifest,null,2));
await writeFile(`${output}/version.json`,JSON.stringify({version,baseVersion,release,icons}));
const shell=['./index.html','./manifest.webmanifest',...modules.map(n=>`./${release}/${n}`),...[180,192,512].map(n=>`./${icons}/icon-${n}.png`)];
let worker=await readFile('sw.js','utf8');worker=worker.replace('__DF_VERSION__',version).replace('/*__DF_SHELL__*/[]',JSON.stringify(shell));await writeFile(`${output}/sw.js`,worker);
await writeFile(`${output}/.nojekyll`,'');
const files=await readdir(output);if(!files.includes('index.html')||!html.includes(release))throw Error('Incomplete release');
console.log('Release preparada:',version);
