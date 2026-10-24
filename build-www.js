// Copie les fichiers de la PWA dans www/ (dossier lu par Capacitor). La PWA à la racine reste intacte.
const fs=require('fs'),path=require('path'),root=__dirname,out=path.join(root,'www');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const f of ['index.html','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png']){
  fs.copyFileSync(path.join(root,f),path.join(out,f));}
console.log('www/ prêt :',fs.readdirSync(out).join(', '));
