// Copie les fichiers de la PWA dans www/ (dossier lu par Capacitor).
// Seul index.html est obligatoire ; les autres fichiers (icônes, manifeste, sw.js) sont facultatifs.
const fs=require('fs'),path=require('path'),root=__dirname,out=path.join(root,'www');
if(!fs.existsSync(path.join(root,'index.html'))||fs.statSync(path.join(root,'index.html')).size===0){console.error('ERREUR : index.html est absent ou vide.');process.exit(1)}
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const copied=[],skipped=[];
for(const f of ['index.html','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','confidentialite.html']){
  const src=path.join(root,f);
  if(fs.existsSync(src)&&fs.statSync(src).size>0){fs.copyFileSync(src,path.join(out,f));copied.push(f)}else skipped.push(f)}
console.log('www/ prêt :',copied.join(', '));
if(skipped.length)console.log('Fichiers facultatifs absents ou vides (ignorés) :',skipped.join(', '));
