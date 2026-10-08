'use strict';
(() => {
 const data=window.TAB_SCORE, measures=data.measures, video=document.querySelector('#video');
 const $=id=>document.getElementById(id);
 const roots={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,F:5,'E#':5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
 const names=['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
 const fretValues=measures.flatMap(m=>m.notes.filter(n=>!n.rest).map(n=>n.fret));
 const minShift=-Math.min(...fretValues),maxShift=24-Math.max(...fretValues);
 let semitones=1,offset=0,active=-1,raf=0,noticeTimer,compact=innerWidth<900,lastScroll=-1,objectURL=null;
 let nodes=[],heads=[],caps=[];
 const beatSeconds=60/data.sync.bpm;
 const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const format=t=>`${Math.floor(Math.max(0,t)/60)}:${String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}`;
 const transposeChord=(ch,shift)=>ch.split('/').map(part=>{const m=part.match(/^([A-G](?:#|b)?)(.*)$/);return m?names[((roots[m[1]]+shift)%12+12)%12]+m[2]:part;}).join('/');
 const start=i=>measures[i].startSeconds+offset;
 const end=i=>measures[i].endSeconds+offset;
 function currentIndex(t){t+=.00001;if(t<start(0)||t>=end(measures.length-1))return -1;let low=0,high=measures.length-1;while(low<=high){const mid=(low+high)>>1;if(t<start(mid))high=mid-1;else if(t>=end(mid))low=mid+1;else return mid;}return -1;}
 function announce(message){$('notice').textContent=message;$('notice').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('show'),1700);}
 function save(){try{localStorage.setItem('tab-studio-v1',JSON.stringify({semitones,offset,follow:$('follow').checked}));}catch{}}
 try{const saved=JSON.parse(localStorage.getItem('tab-studio-v1'));if(saved){if(Number.isInteger(saved.semitones))semitones=Math.max(minShift,Math.min(maxShift,saved.semitones));if(Number.isFinite(saved.offset))offset=Math.max(-2,Math.min(2,saved.offset));$('follow').checked=saved.follow!==false;}}catch{}
 function seek(i){i=Math.max(0,Math.min(measures.length-1,i));if(!Number.isFinite(video.duration)){announce('영상이 준비되면 다시 눌러주세요.');return;}video.currentTime=Math.max(0,Math.min(video.duration,start(i)));update(true);announce(`${i+1}마디 · ${format(start(i))}`);}
 function rows(){if(compact){return Array.from({length:Math.ceil(measures.length/2)},(_,i)=>[i*2,i*2+1].filter(x=>x<measures.length));}const count=measures.length,n5=count%4,n4=(count-5*n5)/4;let ix=0;return [...Array(n4).fill(4),...Array(n5).fill(5)].map(n=>Array.from({length:n},()=>ix++));}
 function draw(){
  const savedActive=active;const host=$('score');host.replaceChildren();nodes=[];heads=[];caps=[];
  const labels={Intro:'인트로','Verse / tacet':'벌스 · 리드 쉼','Lead arpeggio I':'아르페지오 I','Lead arpeggio II':'아르페지오 II','Sustained melody':'브리지','Lead theme':'리드 테마','Lead arpeggio III':'아르페지오 III','Lead arpeggio IV':'아르페지오 IV',Break:'브레이크','Outro lead':'아웃트로','Final phrase':'마지막 프레이즈','Ending / tacet':'엔딩'};
  for(const indices of rows()){
   const system=document.createElement('div');system.className='system';
   const section=indices.map(i=>measures[i].section).filter(Boolean).map(s=>labels[s]||s).join(' / ');
   const label=document.createElement('div');label.className='system-label';label.innerHTML=`<span class="system-range">${String(indices[0]+1).padStart(2,'0')}—${String(indices.at(-1)+1).padStart(2,'0')}</span>${section?`<span class="section-name">${escape(section)}</span>`:''}`;system.append(label);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${210*indices.length} 168`);svg.classList.add('staff-svg');svg.setAttribute('aria-label',`${indices[0]+1}~${indices.at(-1)+1}마디`);
   const parts=[];
   for(let col=0;col<indices.length;col++){
    const i=indices[col],m=measures[i],x0=col*210,x1=x0+210,top=66,stem=142,pos=u=>x0+23+u*168/8;
    const line=(x,y,xx,yy,cl='music')=>`<line class="${cl}" x1="${x}" y1="${y}" x2="${xx}" y2="${yy}"/>`;
    const txt=(x,y,s,cl,extra='')=>`<text class="${cl}" x="${x}" y="${y}" ${extra}>${escape(s)}</text>`;
    const curve=(x,y,xx,yy,rise=7)=>`<path class="music" d="M${x},${y} C${x+(xx-x)*.25},${y-rise} ${x+(xx-x)*.75},${yy-rise} ${xx},${yy}"/>`;
    const xs=[],ys=[],onsets=[];let u=0;for(const n of m.notes){xs.push(pos(u));ys.push(top+(n.string?n.string-1:2)*10.5);onsets.push(u);u+=n.duration;}
    let out=`<g class="measure" data-measure="${i+1}" role="button" tabindex="0" aria-label="${i+1}마디, ${format(start(i))}로 이동"><title>${i+1}마디 · ${format(start(i))}</title><rect class="hitbox" x="${x0+1}" y="1" width="208" height="162" rx="6"/>`;
    out+=txt(x0+7,43,i+1,'measure-number');out+=txt(x1-7,43,format(start(i)),'seek-time');
    for(const ch of m.chords)out+=txt(pos(ch.beat*2)-5,19,transposeChord(ch.name,semitones),'chord',`data-original-chord="${escape(ch.name)}"`);
    for(let string=0;string<6;string++)out+=line(x0+1,top+string*10.5,x1-1,top+string*10.5,'tab-line');
    out+=line(x0+1,top,x0+1,top+52.5,'barline');if(col===indices.length-1)out+=line(x1-1,top,x1-1,top+52.5,'barline');
    if(i===measures.length-1)out+=line(x1-5,top,x1-5,top+52.5,'barline');
    if(m.let_ring){out+=`<line x1="${x0+5}" y1="53" x2="${x1-5}" y2="53" stroke="#7b9890" stroke-width=".6" stroke-dasharray="2 3"/>`;if(col===0)out+=`<rect x="${x0+20}" y="46" width="36" height="11" fill="white"/>`+txt(x0+22,54,'let ring','measure-number','style="font-size:8px;font-style:italic"');}
    for(let j=0;j<m.notes.length;j++){
     const n=m.notes[j],x=xs[j],y=ys[j];
     if(n.rest){if(n.duration>=4){const yy=top+(n.whole?10.5:21);out+=line(x-6,yy,x+6,yy)+`<rect x="${x-4}" y="${n.whole?yy:yy-4}" width="8" height="4" fill="#233a43"/>`;}else{out+=`<circle cx="${x-1}" cy="${top+20}" r="2" fill="#233a43"/><path class="music" d="M${x},${top+21} Q${x+8},${top+10} ${x+4},${top+23} L${x-1},${top+35}"/>`;}continue;}
     if(n.duration<8)out+=line(x,y+5,x,stem);
     if(n.duration===6)out+=`<circle cx="${x+5}" cy="${stem-2}" r="1.4" fill="#233a43"/>`;
    }
    for(let group=0;group<4;group++){
     const ix=m.notes.map((n,j)=>({n,j})).filter(({n,j})=>n.duration===1&&onsets[j]>=group*2&&onsets[j]<group*2+2).map(o=>o.j);
     if(ix.length===2)out+=line(xs[ix[0]],stem,xs[ix[1]],stem,'beam');
     else if(ix.length===1&&!m.notes[ix[0]].rest){const x=xs[ix[0]];out+=`<path class="music" d="M${x},${stem} C${x+8},${stem-2} ${x+7},${stem-9} ${x+3},${stem-14}"/>`;}
    }
    for(const [a,b] of m.ties||[]){
     if(a==='prev'){if(col===0)out+=curve(x0+1,ys[b]-8,xs[b]-3,ys[b]-8,4);}
     else if(b==='next')out+=curve(xs[a]+3,ys[a]-8,col<indices.length-1?x1+20:x1-1,ys[a]-8,6);
     else{const low=m.notes[a].string>=4,dy=low?9:-8;out+=curve(xs[a]+3,ys[a]+dy,xs[b]-3,ys[b]+dy,low?-6:6);}
    }
    for(let j=0;j<m.notes.length;j++){
     const n=m.notes[j];if(n.rest)continue;const x=xs[j],y=ys[j],f=n.fret+semitones,text=n.ghost?`(${f})`:String(f),width=text.length*6.3+2;
     out+=`<rect class="number-bg" x="${x-width/2}" y="${y-7}" width="${width}" height="14"/>`+txt(x,y+4.2,text,'number',`data-source-fret="${n.fret}" data-fret="${f}" data-string="${n.string}"`);
     if(n.duration>=4)out+=`<ellipse class="music" cx="${x}" cy="${y}" rx="${width/2+1}" ry="9"/>`;
    }
    for(const j of m.slide||[])out+=line(xs[j]-13,ys[j]+5,xs[j]-6,ys[j]-2);
    for(const [a,b] of m.vibrato||[]){const from=xs[a]+3,to=b==='end'?x1-7:xs[b]-7,count=Math.max(2,Math.floor((to-from)/4));let d=`M${from},49`;for(let k=1;k<=count*2;k++)d+=` L${from+(to-from)*k/(count*2)},${49+(k%2?2:-2)}`;out+=`<path class="music" style="stroke-width:.75" d="${d}"/>`;}
    for(const bend of m.bends||[]){const a=bend.start,b=bend.peak,d=bend.release,peak=b===d?(xs[a]+xs[b])/2:xs[b];out+=curve(xs[a],top-8,peak,top-29,5);out+=`<path d="M${peak},${top-29} l-2.5,5 h5 z" fill="#233a43"/>`;out+=curve(peak+1,top-29,xs[d],top-8,3);out+=txt(peak,top-32,bend.amount==='1/2'?'½':bend.amount,'measure-number','text-anchor="middle" style="font-size:9px;fill:#233a43"');}
    out+=`<line class="playhead" style="display:none" x1="0" x2="0" y1="57" y2="153"/><path class="playhead-cap" style="display:none" d="M-3,53 h6 l-3,4z"/></g>`;parts.push(out);
   }
   svg.innerHTML=parts.join('');system.append(svg);host.append(system);
  }
  nodes=[...host.querySelectorAll('.measure')];heads=nodes.map(n=>n.querySelector('.playhead'));caps=nodes.map(n=>n.querySelector('.playhead-cap'));
  for(const node of nodes){node.addEventListener('click',()=>seek(+node.dataset.measure-1));node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();seek(+node.dataset.measure-1);}});}
  active=-1;updateKeyUI();update(true);if(savedActive>=0&&video.paused)nodes[savedActive]?.classList.toggle('active',currentIndex(video.currentTime)===savedActive);
 }
 function updateKeyUI(){$('transpose').textContent=semitones>0?`+${semitones}`:String(semitones);$('fretRange').textContent=`프렛 ${Math.min(...fretValues)+semitones}–${Math.max(...fretValues)+semitones}`;$('down').disabled=semitones<=minShift;$('up').disabled=semitones>=maxShift;$('reset').disabled=semitones===0;$('offset').textContent=`${offset>0?'+':''}${offset.toFixed(2)}초`;}
 function setShift(n){if(!Number.isInteger(n))return;semitones=Math.max(minShift,Math.min(maxShift,n));draw();save();}
 function chordAt(i,t){if(i<0)return '—';const beat=(t-start(i))/beatSeconds;let chord='—';for(let n=i;n>=0;n--){const matches=measures[n].chords.filter(c=>n<i||c.beat<=beat+.005);if(matches.length){chord=matches.at(-1).name;break;}}return chord==='—'?chord:transposeChord(chord,semitones);}
 function update(force=false){const t=video.currentTime||0,i=currentIndex(t);$('currentTime').textContent=format(t);$('currentChord').textContent=chordAt(i,t);if(i!==active||force){if(active>=0){nodes[active]?.classList.remove('active');heads[active]?.style.setProperty('display','none');caps[active]?.style.setProperty('display','none');}active=i;$('activeMeasure').textContent=i>=0?String(i+1).padStart(2,'0'):'—';if(i>=0){nodes[i].classList.add('active');if($('follow').checked&&!video.paused&&i!==lastScroll){const sys=nodes[i].closest('.system'),r=sys.getBoundingClientRect();if(r.top<15||r.bottom>innerHeight-35)sys.scrollIntoView({behavior:'smooth',block:'center'});lastScroll=i;}}}
  if(i>=0){const node=nodes[i],x0=+node.querySelector('.hitbox').getAttribute('x')-1,f=Math.max(0,Math.min(1,(t-start(i))/(end(i)-start(i)))),x=x0+23+f*168;heads[i].setAttribute('x1',x);heads[i].setAttribute('x2',x);heads[i].style.display='';caps[i].setAttribute('transform',`translate(${x},0)`);caps[i].style.display='';}
 }
 function tick(){update();if(!video.paused&&!video.ended)raf=requestAnimationFrame(tick);}
 async function playPause(){if(video.paused){try{await video.play();}catch{announce('영상 재생 버튼을 다시 눌러주세요.');}}else video.pause();}
 video.addEventListener('play',()=>{$('playLabel').textContent='일시정지';$('play').setAttribute('aria-label','영상 일시정지');$('playIcon').innerHTML='<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';cancelAnimationFrame(raf);tick();});
 const paused=()=>{$('playLabel').textContent='재생';$('play').setAttribute('aria-label','영상 재생');$('playIcon').innerHTML='<path d="m8 5 11 7-11 7z"/>';cancelAnimationFrame(raf);update();};
 video.addEventListener('pause',paused);video.addEventListener('ended',paused);video.addEventListener('timeupdate',()=>update());video.addEventListener('seeked',()=>update(true));const mediaReady=()=>{$('duration').textContent=format(video.duration);$('videoError').hidden=true;if(video.currentTime===0)video.currentTime=Math.max(0,start(0));update(true);};video.addEventListener('loadedmetadata',mediaReady);video.addEventListener('error',()=>{$('videoError').hidden=false;});
 $('videoFile').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);video.src=objectURL;video.load();});
 $('play').addEventListener('click',playPause);$('prev').addEventListener('click',()=>seek(active<0?0:active-1));$('next').addEventListener('click',()=>seek(active<0?0:active+1));$('down').addEventListener('click',()=>setShift(semitones-1));$('up').addEventListener('click',()=>setShift(semitones+1));$('reset').addEventListener('click',()=>setShift(0));$('follow').addEventListener('change',()=>{lastScroll=-1;save();});
 const setOffset=n=>{offset=Math.round(Math.max(-2,Math.min(2,n))*100)/100;draw();save();};$('earlier').addEventListener('click',()=>setOffset(offset-.05));$('later').addEventListener('click',()=>setOffset(offset+.05));$('resetOffset').addEventListener('click',()=>setOffset(0));
 document.addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea,button,video,summary,.measure')||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key===' '){event.preventDefault();playPause();}else if(event.key==='ArrowLeft'){event.preventDefault();seek(active<0?0:active-1);}else if(event.key==='ArrowRight'){event.preventDefault();seek(active<0?0:active+1);}else if(event.key==='+'||event.key==='=')setShift(semitones+1);else if(event.key==='-')setShift(semitones-1);});
 addEventListener('resize',()=>{const next=innerWidth<900;if(next!==compact){compact=next;draw();}});
 draw();if(video.readyState>=1)mediaReady();
 // Read-only state is useful for regression checks and integrations; UI actions remain native.
 window.tabPlayer={getState:()=>({semitones,offset,activeMeasure:active+1,time:video.currentTime,paused:video.paused,limits:[minShift,maxShift]}),getMeasureTime:n=>start(n-1),transposeChord};
})();
