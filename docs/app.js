(function(){
'use strict';
var DEF={work:25,short:5,long:15,sound:true};
var NAMES={work:'さぎょう',short:'ちょっと休けい',long:'ゆっくり休けい'};
var wake=null;
var mode='work',endAt=0,leftMs=0,timer=0,running=false,audio=null,streak=0;
var $=function(id){return document.getElementById(id)};
var cfg={work:DEF.work,short:DEF.short,long:DEF.long,sound:true};
var stat={date:'',today:0,total:0};

function load(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function today(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
var c=load('tt-cfg');if(c){['work','short','long'].forEach(function(k){var n=+c[k];if(n>=1&&n<=180)cfg[k]=Math.floor(n)});if(c.sound===false)cfg.sound=false}
var s=load('tt-stat');if(s&&typeof s.total==='number'){stat=s}
function rollDate(){if(stat.date!==today()){stat.date=today();stat.today=0;stat.min=0;save('tt-stat',stat)}}

function total(){return cfg[mode]*60000}
function fmt(ms){var t=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(t/60),r=t%60;return (m<10?'0':'')+m+':'+(r<10?'0':'')+r}

// 丸い面(残り時間)。上から時計回りに消えていく
function wedge(f){
  var p=$('wedge');
  if(f<=0){p.setAttribute('d','');return}
  if(f>=0.9999){p.setAttribute('d','M0 -104A104 104 0 1 1 0 104A104 104 0 1 1 0 -104Z');return}
  var a=(1-f)*2*Math.PI,x=104*Math.sin(a),y=-104*Math.cos(a);
  p.setAttribute('d','M0 0L'+x.toFixed(2)+' '+y.toFixed(2)+'A104 104 0 '+(f>0.5?1:0)+' 1 0 -104Z');
}
function saveRun(){save('tt-run',{mode:mode,running:running,endAt:endAt,leftMs:leftMs,streak:streak})}
function msg(t){$('msg').textContent=t}
function render(){
  var left=running?Math.max(0,endAt-Date.now()):leftMs;
  $('time').textContent=fmt(left);
  wedge(left/total());
  document.title=(running?fmt(left)+' ':'')+'机タイム 集中タイマー';
  if(running&&left<=0)finish(false);
}
function tick(){render()}

function beep(){
  if(!cfg.sound||!audio)return;
  try{
    var t=audio.currentTime;
    [0,0.35,0.7].forEach(function(d){
      var o=audio.createOscillator(),g=audio.createGain();
      o.type='sine';o.frequency.value=d===0.7?880:660;
      g.gain.setValueAtTime(0.0001,t+d);g.gain.exponentialRampToValueAtTime(0.4,t+d+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.3);
      o.connect(g);g.connect(audio.destination);o.start(t+d);o.stop(t+d+0.32);
    });
  }catch(e){}
  try{if(navigator.vibrate)navigator.vibrate([200,100,200])}catch(e){}
}

function lockScreen(){
  try{
    if(!running||!navigator.wakeLock||wake)return;
    navigator.wakeLock.request('screen').then(function(l){
      wake=l;l.addEventListener('release',function(){wake=null});
      if(!running)unlockScreen();
    }).catch(function(){});
  }catch(e){}
}
function unlockScreen(){try{if(wake){wake.release();wake=null}}catch(e){}}
function setRunning(r){
  running=r;
  if(r)lockScreen();else unlockScreen();
  $('start').textContent=r?'ひと休み':(leftMs<total()?'つづける':'はじめる');
  if(r){if(!timer)timer=setInterval(tick,250)}else{clearInterval(timer);timer=0}
}
function unlockAudio(){
  try{
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!audio&&AC)audio=new AC();
    if(audio&&audio.state==='suspended')audio.resume();
  }catch(e){}
}
// 更新・再訪問のあとでも、画面のどこかをさわれば終わりの音が鳴るようにする
document.addEventListener('pointerdown',unlockAudio,{passive:true});
function start(){
  unlockAudio();
  document.body.classList.remove('done');
  $('next').hidden=true;
  if(leftMs<=0)leftMs=total();
  endAt=Date.now()+leftMs;
  setRunning(true);saveRun();
  msg(mode==='work'?'がんばっているね。丸が小さくなっていきます':'ゆっくり休みましょう');
  render();
}
function pause(){leftMs=Math.max(0,endAt-Date.now());setRunning(false);saveRun();msg('ひと休み中です');render()}
function reset(){setRunning(false);$('next').hidden=true;leftMs=total();document.body.classList.remove('done');msg('ボタンをおすと はじまります');$('start').textContent='はじめる';saveRun();render()}
function setMode(m,keepMsg){
  mode=m;document.body.dataset.mode=m;
  Array.prototype.forEach.call(document.querySelectorAll('.modes button'),function(b){b.setAttribute('aria-selected',b.dataset.mode===m?'true':'false')});
  reset();
}
function finish(quiet){
  setRunning(false);leftMs=0;render();
  document.body.classList.add('done');
  if(!quiet)beep();
  var next;
  if(mode==='work'){
    rollDate();stat.today++;stat.total++;stat.min=(stat.min||0)+cfg.work;save('tt-stat',stat);showCount();
    streak++;next=(streak%4===0)?'long':'short';
    msg('おつかれさま!「'+NAMES[next]+'」にしました');
    $('next').hidden=false;
  }else{next='work';msg('休けい おわり。できそうなら つぎも どうぞ')}
  mode=next;document.body.dataset.mode=next;
  Array.prototype.forEach.call(document.querySelectorAll('.modes button'),function(b){b.setAttribute('aria-selected',b.dataset.mode===next?'true':'false')});
  leftMs=total();
  $('start').textContent='はじめる';
  document.title='おわり! 机タイム 集中タイマー';
  $('time').textContent=fmt(0);
  saveRun();
}
function showCount(){rollDate();$('today').textContent=stat.today;$('mins').textContent=stat.min||0;$('total').textContent=stat.total}

$('start').addEventListener('click',function(){running?pause():start()});
$('reset').addEventListener('click',reset);
Array.prototype.forEach.call(document.querySelectorAll('.modes button'),function(b){b.addEventListener('click',function(){
  if(b.dataset.mode===mode)return;
  if(running){var ok=true;try{ok=window.confirm('いまのタイマーをやめて、切りかえますか?')}catch(e){}if(!ok)return}
  setMode(b.dataset.mode)})});
['work','short','long'].forEach(function(k){
  var el=$('set-'+k);el.value=cfg[k];
  el.addEventListener('change',function(){
    var n=Math.floor(+el.value),max=k==='work'?180:60;
    if(!(n>=1))n=DEF[k];if(n>max)n=max;
    el.value=n;cfg[k]=n;save('tt-cfg',cfg);
    if(k===mode&&!running){leftMs=total();render()}
  });
});
$('try-sound').addEventListener('click',function(){
  try{var AC=window.AudioContext||window.webkitAudioContext;if(!audio&&AC)audio=new AC();if(audio&&audio.state==='suspended')audio.resume()}catch(e){}
  var was=cfg.sound;cfg.sound=true;beep();cfg.sound=was;
});
$('set-sound').checked=cfg.sound;
$('set-sound').addEventListener('change',function(){cfg.sound=this.checked;save('tt-cfg',cfg)});
document.addEventListener('visibilitychange',function(){if(running){render();lockScreen()}});

// 目盛り(5分割)
(function(){var g=document.querySelector('.ticks'),ns='http://www.w3.org/2000/svg';
  for(var i=0;i<12;i++){var a=i*Math.PI/6,l=document.createElementNS(ns,'line');
    l.setAttribute('x1',(88*Math.sin(a)).toFixed(1));l.setAttribute('y1',(-88*Math.cos(a)).toFixed(1));
    l.setAttribute('x2',(100*Math.sin(a)).toFixed(1));l.setAttribute('y2',(-100*Math.cos(a)).toFixed(1));g.appendChild(l)}})();

showCount();
(function(){
  var r=load('tt-run');
  if(!r||!/^(work|short|long)$/.test(r.mode)||typeof r.leftMs!=='number'){reset();return}
  mode=r.mode;document.body.dataset.mode=mode;streak=+r.streak||0;
  Array.prototype.forEach.call(document.querySelectorAll('.modes button'),function(b){b.setAttribute('aria-selected',b.dataset.mode===mode?'true':'false')});
  if(r.running&&typeof r.endAt==='number'){
    if(r.endAt>Date.now()){leftMs=r.leftMs;endAt=r.endAt;setRunning(true);msg('つづきから、がんばっているね');render()}
    else{running=true;endAt=r.endAt;finish(true)}
  }else if(r.leftMs>0&&r.leftMs<total()){leftMs=r.leftMs;setRunning(false);msg('ひと休み中です');render()}
  else reset();
})();
})();
