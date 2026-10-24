// Installe la couche audio native dans le projet Android généré par « npx cap add android ».
// Idempotent : peut être relancé sans danger.
const fs=require('fs'),path=require('path');
const root=__dirname,android=process.env.ANDROID_DIR||path.join(root,'android'),PKG='com.noorquran.app';
if(!fs.existsSync(android)){console.error('Dossier android/ introuvable : lancez d’abord « npx cap add android ».');process.exit(1)}
const rw=(f,fn)=>{const o=fs.readFileSync(f,'utf8'),n=fn(o);if(n!==o)fs.writeFileSync(f,n)};
// 1. Sources Java
const jdir=path.join(android,'app/src/main/java',...PKG.split('.'));fs.mkdirSync(jdir,{recursive:true});
for(const f of fs.readdirSync(root).filter(x=>x.endsWith('.java')))fs.copyFileSync(path.join(root,f),path.join(jdir,f));
// 2. Manifeste : permissions minimales + service média
const mf=path.join(android,'app/src/main/AndroidManifest.xml');
rw(mf,x=>{
  for(const p of ['INTERNET','FOREGROUND_SERVICE','FOREGROUND_SERVICE_MEDIA_PLAYBACK','POST_NOTIFICATIONS','WAKE_LOCK'])
    if(!x.includes(`android.permission.${p}"`))x=x.replace('</manifest>',`    <uses-permission android:name="android.permission.${p}" />\n</manifest>`);
  if(!x.includes('NoorAudioService'))x=x.replace('</application>',`    <service android:name=".NoorAudioService" android:exported="true" android:foregroundServiceType="mediaPlayback">
            <intent-filter><action android:name="androidx.media3.session.MediaSessionService" /></intent-filter>
        </service>
    </application>`);
  return x});
// 3. Dépendances Media3
rw(path.join(android,'app/build.gradle'),x=>x.includes('androidx.media3')?x:x.replace(/dependencies\s*\{/,m=>`${m}\n    implementation "androidx.media3:media3-exoplayer:1.5.1"\n    implementation "androidx.media3:media3-session:1.5.1"`));
console.log('Couche audio native installée dans',android);
