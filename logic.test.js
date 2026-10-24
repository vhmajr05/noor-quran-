// Tests de logique exécutés dans Node avec DOM, IndexedDB et réseau SIMULÉS.
// Les textes "arabes" ci-dessous sont des mots factices (lettres d'abjad), PAS des versets.
const fs=require('fs'),vm=require('vm'),assert=require('assert').strict;
const src=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const el=()=>({style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},addEventListener(){},insertAdjacentHTML(){},setAttribute(){},removeAttribute(){},click(){},set innerHTML(v){},hidden:false,textContent:'',dataset:{}});
const ls={};const idbStore={};
const indexedDB={open(){const r={};setTimeout(()=>{r.result={createObjectStore(){},transaction(){const t={};t.objectStore=()=>({get:k=>({result:idbStore[k]===undefined?undefined:structuredClone(idbStore[k])}),put:(v,k)=>{idbStore[k]=structuredClone(v);return{}}});setTimeout(()=>t.oncomplete&&t.oncomplete());return t}};r.onupgradeneeded&&r.onupgradeneeded();r.onsuccess&&r.onsuccess()});return r}};
const fakeNA=new Proxy({l:{},calls:[],state:{playWhenReady:true,index:0,count:3,positionMs:500,durationMs:1000}},{get(t,k){if(k in t)return t[k];if(k==='addListener')return(n,f)=>{t.l[n]=f;return Promise.resolve({remove(){}})};return o=>{t.calls.push([k,o]);return Promise.resolve(k==='getState'?t.state:{})}}});
const BS='ٱبْجَدْ',REST='هَوَّزْ';let online=true,calls=[];
const ok=data=>({ok:true,json:async()=>({code:200,status:'OK',data})});
const ay=(base,txts)=>({ayahs:txts.map((t,i)=>({number:base+i,numberInSurah:i+1,text:t}))});
async function fetch(u){calls.push(u);if(!online)throw new TypeError('offline');
 if(u.endsWith('/v1/surah'))return ok([1,2].map(n=>({number:n,name:'S'+n,englishName:'S'+n,englishNameTranslation:'t',numberOfAyahs:3,revelationType:'X'})));
 let m=u.match(/surah\/(\d)\/editions/);
 if(m){const n=+m[1],a=n===1?[BS,'ابجد','هوز']:[BS+'ـ '+REST,'حطي','كلمن'];return ok([ay(n*10,a),ay(n*10,['t1','t2','t3'])])}
 if(/surah\/\d\/ar\./.test(u))return ok({ayahs:[1,2,3].map(i=>({numberInSurah:i,audio:'http://cdn.example/'+i+'.mp3'}))});
 if(/search\/zzz/.test(u))return{ok:false,status:404,json:async()=>({code:404,status:'Not Found',data:'No match'})};
 return ok([{identifier:'fr.hamidullah',name:'Tr'},{identifier:'ar.alafasy',englishName:'R1'},{identifier:'ar.x',englishName:'R2'}])}
const ctx=vm.createContext({document:{querySelector:()=>el(),querySelectorAll:()=>[],documentElement:el()},window:{scrollTo(){},Capacitor:{isNativePlatform:()=>true,Plugins:{NoorAudio:fakeNA}}},location:{hash:''},
 navigator:{},localStorage:{getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=String(v)}},indexedDB,fetch,crypto:require('crypto').webcrypto,TextEncoder,AbortController,
 IntersectionObserver:class{observe(){}},Audio:class{play(){return Promise.resolve()}pause(){}removeAttribute(){}load(){}addEventListener(){}},setTimeout,clearTimeout,setInterval,alert(){},confirm:()=>true,addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false}),console,structuredClone,URL:{createObjectURL:()=>'blob:x'}});
const T=c=>vm.runInContext(c,ctx);let pass=0;
const t=async(n,f)=>{try{await f();pass++;console.log('✓',n)}catch(e){console.log('✗',n,'\n ',e.message);process.exitCode=1}};
(async()=>{
 vm.runInContext(src,ctx);await new Promise(r=>setTimeout(r,80));
 ctx.BS=BS;ctx.REST=REST;
 await t('réglages : valeurs par défaut sans préférence enregistrée',()=>{assert.equal(T('cfg.mode'),'auto');assert.equal(T('cfg.font'),'quran');assert.equal(T('cfg.size'),1.9)});
 await t('réglages : valeurs invalides corrigées, choix enregistré en localStorage',()=>{T("cfg.mode='zzz';cfg.size=99;cfg.font='x';clean()");assert.equal(T('cfg.mode'),'auto');assert.equal(T('cfg.size'),3.2);assert.equal(T('cfg.font'),'quran');T("cfg.mode='stop';saveCfg()");assert.equal(JSON.parse(ls['nq:cfg']).mode,'stop');T("cfg.mode='auto';saveCfg()")});
 await t('récitation « continuer » : versets enchaînés dans l’ordre, arrêt à la fin, sans double déclenchement',()=>{
  T("globalThis.started=[];start=async()=>{Q.done=false;started.push(Q.i)};cfg.mode='auto';Q={n:1,i:0,done:false,items:[{v:1},{v:2},{v:3}]}");
  T('onEnd();onEnd()');assert.equal(JSON.stringify(T('started')),'[1,2]');T('onEnd()');assert.equal(T('Q.done'),true);assert.equal(T('started.length'),2)});
 await t('récitation « arrêter » : le verset courant reste la référence, Lecture avance d’un seul verset, fin de sourate → recommence',()=>{
  T("started=[];cfg.mode='stop';Q={n:1,i:0,done:false,items:[{v:1},{v:2},{v:3}]};onEnd()");
  assert.equal(T('Q.i'),0);assert.equal(T('started.length'),0);assert.equal(T('Q.done'),true);
  T('onPlay()');assert.equal(T('Q.i'),1);assert.equal(JSON.stringify(T('started')),'[1]');
  T('onEnd();onPlay()');assert.equal(T('Q.i'),2);T('onEnd();onPlay()');assert.equal(T('Q.i'),0);T("cfg.mode='auto'")});
 await t('norm ignore diacritiques, tatweel, variantes d’alef',()=>assert.equal(T("norm('ٱبْجَدْ')"),T("norm('ابجد')")));
 await t('stripB retire la basmala (même avec tatweel) sans toucher la suite',()=>assert.equal(T("norm(stripB(BS+'ـ '+REST,BS))"),T("norm(REST)")));
 await t('stripB ne modifie rien si le début ne correspond pas',()=>assert.equal(T("stripB(REST,BS)"),REST));
 await t('liste des sourates chargée (META)',()=>assert.equal(T('META.length'),2));
 await t('loadSurah : 3 versets, contrôle OK',async()=>{const d=await T('loadSurah(2)');assert.equal(d.v.length,3);assert.equal(d.chk.length,0)});
 await t('basmala() lue depuis la sourate 1 et réutilisable',async()=>assert.equal(await T('basmala()'),BS));
 await t('verset 1 de la sourate 2 : basmala retirée, reste intact',async()=>{const d=await T('loadSurah(2)');assert.equal(T(`norm(stripB(${JSON.stringify(d.v[0].a)},BS))`),T('norm(REST)'))});
 await t('intégrité : nombre de versets incohérent détecté',async()=>{const m=await T("verify(2,[{v:1,a:'ا'},{v:2,a:'ب'}])");assert.ok(m.some(x=>/Nombre de versets/.test(x)))});
 await t('intégrité : texte altéré détecté via l’empreinte',async()=>{idbStore['t:2:fr.hamidullah'].v[1].a='ز';const d=await T('loadSurah(2)');assert.ok(d.chk.some(x=>/empreinte/i.test(x)))});
 await t('favoris : ajout puis retrait',()=>{assert.equal(T("toggle('fav',2,1)"),true);assert.equal(T("has('fav',2,1)"),true);assert.equal(T("toggle('fav',2,1)"),false)});
 await t('marque-page et progression persistés (localStorage)',()=>{T("toggle('bm',2,2);markRead(2,1);markRead(2,1);markRead(2,2)");assert.equal(JSON.stringify(JSON.parse(ls['nq:reads'])),'{"2":[1,2]}');assert.equal(JSON.parse(ls['nq:last']).v,2);assert.equal(JSON.parse(ls['nq:bm'])[0].v,2)});
 await t('audio : URLs http forcées en https',async()=>{const l=await T('audioList(1)');assert.ok(l.every(x=>x.url.startsWith('https://')))});
 await t('récitateur everyayah : URLs SSSAAA.mp3 construites localement',async()=>{T("cfg.rec='ea:Test_Folder'");const l=await T('audioList(2)');T("cfg.rec='ar.alafasy'");assert.equal(l.length,3);assert.equal(l[0].url,'https://everyayah.com/data/Test_Folder/002001.mp3');assert.equal(l[2].url,'https://everyayah.com/data/Test_Folder/002003.mp3')});
 await t('lecture continue : mode « auto » par défaut et verset suivant préchargé',async()=>{T("pre.src='';Q={n:1,i:0,done:false,items:[{v:1,url:'https://x/1.mp3'},{v:2,url:'https://x/2.mp3'}]}");await T('prefetch()');assert.equal(T('pre.src'),'https://x/2.mp3')});
 await t('Media Session : titre, récitateur, album et commandes (lecture, pause, précédent, suivant, stop)',()=>{ctx.navigator.mediaSession={h:{},setActionHandler(k,f){this.h[k]=f},playbackState:'',metadata:null};ctx.MediaMetadata=class{constructor(o){Object.assign(this,o)}};T("Q={n:2,i:0,done:false,items:[{v:1,url:'u'}]}");T('mediaMeta();mediaHandlers()');const m=ctx.navigator.mediaSession;assert.match(m.metadata.title,/S2/);assert.equal(m.metadata.album,'Noor Quran');assert.equal(Object.keys(m.h).sort().join(),'nexttrack,pause,play,previoustrack,stop')});
 await t('reprise : sourate, verset et récitateur sauvegardés',()=>{T("cfg.rec='ar.alafasy';Q={n:2,i:1,done:false,items:[{v:1},{v:2}]};savePos()");const np=JSON.parse(ls['nq:np']);assert.equal(np.n,2);assert.equal(np.v,2);assert.equal(np.rec,'ar.alafasy')});
 await t('minuteur de sommeil : pause une fois l’échéance passée, inactif sinon',()=>{T("globalThis.paused=0;au.pause=()=>{paused++};Q={n:1,i:0,done:false,items:[{v:1}]};sleepAt=0;onTime()");assert.equal(T('paused'),0);T('sleepAt=Date.now()-1;onTime()');assert.equal(T('sleepAt'),0);assert.equal(T('paused'),1)});
 await t('vitesse de lecture appliquée au lecteur',()=>{T("cfg.speed=1.5;applySpeed()");assert.equal(T('au.playbackRate'),1.5);T("cfg.speed=1;applySpeed()")});
 await t('erreur audio : échec signalé, bouton Réessayer disponible',()=>{T("Q={n:1,i:0,done:false,items:[{v:1}]};onErr()");assert.equal(T('Q.failed'),true)});
 await t('arrêt : file de lecture libérée',()=>{T('stopAll()');assert.equal(T('Q'),null)});
 await t('natif Android : file de lecture envoyée (versets dans l’ordre, vitesse, position de reprise)',async()=>{
  T("cfg.speed=1.25;cfg.mode='auto';Q={n:2,i:1,seek:3.5,done:false,items:[{v:1,url:'https://x/1.mp3'},{v:2,url:'https://x/2.mp3'},{v:3,url:'https://x/3.mp3'}]};Q.native=true");
  await T('nativeStart()');const c=fakeNA.calls.find(x=>x[0]==='setQueue')[1];
  assert.equal(c.items.map(x=>x.id).join(),'1,2,3');assert.equal(c.index,1);assert.equal(c.positionMs,3500);assert.equal(c.speed,1.25);assert.equal(c.pauseAtEnd,false);assert.equal(c.items[0].album,'Noor Quran');T('cfg.speed=1')});
 await t('natif : verset suivant signalé par Android → interface mise à jour',()=>{fakeNA.l.item({index:2});assert.equal(T('Q.i'),2)});
 await t('natif : « arrêter après chaque verset » puis Lecture',async()=>{fakeNA.calls.length=0;T('Q.i=0;Q.done=false');fakeNA.l.verseEnded({});assert.equal(T('Q.done'),true);await T('nPlay()');assert.ok(fakeNA.calls.some(x=>x[0]==='play'));assert.equal(T('Q.done'),false)});
 await t('natif : fin de sourate puis Lecture → retour au verset 1',async()=>{fakeNA.calls.length=0;T('Q.i=2;Q.done=true');await T('nPlay()');assert.equal(fakeNA.calls.find(x=>x[0]==='seek')[1].index,0);assert.equal(T('Q.i'),0)});
 await t('natif : Pause puis reprise selon l’état réel du lecteur',async()=>{fakeNA.calls.length=0;T('Q.done=false');fakeNA.state.playWhenReady=true;await T('nPlay()');assert.ok(fakeNA.calls.some(x=>x[0]==='pause'));fakeNA.state.playWhenReady=false;await T('nPlay()');assert.ok(fakeNA.calls.some(x=>x[0]==='play'))});
 await t('natif : retour au premier plan → resynchronisation sur le verset réellement joué',async()=>{T('Q.i=0');fakeNA.state.index=2;fakeNA.state.playWhenReady=true;await T('syncNative()');assert.equal(T('Q.i'),2)});
 await t('natif : erreur → bouton Réessayer',()=>{fakeNA.l.error({});assert.equal(T('Q.failed'),true)});
 await t('natif : suivant, précédent et arrêt envoyés au lecteur Android',async()=>{fakeNA.calls.length=0;T('goNext();goPrev();stopAll()');const k=fakeNA.calls.map(x=>x[0]).join();assert.match(k,/next/);assert.match(k,/previous/);assert.match(k,/stop/)});
 await t('API indisponible : getJ retombe sur le cache local',async()=>{online=false;const d=await T("getJ('meta','https://api.alquran.cloud/v1/surah')");assert.equal(d.length,2)});
 await t('API indisponible : sourate déjà en cache lisible hors ligne',async()=>{const d=await T('loadSurah(1)');assert.equal(d.v.length,3)});
 await t('API indisponible : sourate absente du cache → erreur propre',async()=>{delete idbStore['t:2:fr.hamidullah'];await assert.rejects(()=>T('loadSurah(2)'))});
 online=true;
 await t('erreur 404 de l’API : code exposé (recherche sans résultat)',async()=>{try{await T("fj('https://x/v1/search/zzz/all/e')");assert.fail('devait échouer')}catch(e){assert.equal(e.code,404)}});
 console.log(`\n${pass} tests réussis`);
})();
