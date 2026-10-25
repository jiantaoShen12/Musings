(() => {
  const canvas = document.getElementById('trajectoryCanvas');
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('timeSlider');
  const out = document.getElementById('timeOutput');
  const play = document.getElementById('playButton');
  const note = document.getElementById('vizNote');
  const modes = [...document.querySelectorAll('[data-mode]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'human';
  let t = Number(slider.value) / 100;
  let playing = !reduced;
  let frame = 0, lastTime = 0, logicalWidth = 700, logicalHeight = 570;
  const colors = ['#dcecc6','#a3d2b0','#e5bc8c','#90b8af','#a9a4c4','#d6a8a2','#859e73'];
  const lines = [
    { b: .20, slope: .37, a: .085, phase: .2, bend: .18 },
    { b: .70, slope:-.39, a: .087, phase: 1.8, bend: -.06 },
    { b: .39, slope:.18, a: .110, phase: 2.1, bend: .12 },
    { b: .80, slope:-.55, a: .068, phase: 3.0, bend: -.07 },
    { b: .16, slope:.62, a: .080, phase: 3.9, bend: .08 },
    { b: .57, slope:-.12, a: .105, phase: 5.1, bend: .06 },
    { b: .36, slope:.27, a: .07, phase: 4.7, bend: -.15 }
  ];
  function location(i, s) {
    const q = lines[i];
    const offset = mode === 'cell' ? .044*Math.sin(s*10 + i*.8) : 0;
    const y = q.b + q.slope*s + q.a*Math.sin(s*6.6 + q.phase) + q.bend*Math.sin(s*Math.PI*2.0) + offset;
    return { x: .10 + .81*s, y: Math.min(.91,Math.max(.095,y)) };
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio||1,2);
    logicalWidth = r.width; logicalHeight = r.height;
    canvas.width = Math.max(1,Math.round(r.width*dpr));
    canvas.height = Math.max(1,Math.round(r.height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    render();
  }
  function render() {
    const w=logicalWidth, h=logicalHeight;
    ctx.clearRect(0,0,w,h);
    const top=55, bottom=h-155, realH=Math.max(120,bottom-top);
    const point = (p) => ({x:p.x*w,y:top+p.y*realH});
    // A highlighted present, drawn as a faint vertical cross-section.
    const tx=(.10+.81*t)*w;
    ctx.strokeStyle='rgba(198,226,174,.22)';ctx.lineWidth=1;ctx.setLineDash([3,6]);
    ctx.beginPath();ctx.moveTo(tx,top);ctx.lineTo(tx,bottom);ctx.stroke();ctx.setLineDash([]);
    ctx.font='10px sans-serif';ctx.fillStyle='rgba(176,204,172,.55)';ctx.fillText('NOW',Math.min(tx+9,w-44),top+4);
    lines.forEach((line,i)=>{
      const count=130;
      // Future is intentionally translucent: inference, not an observed fate.
      for(let pass=0;pass<2;pass++){
        const start=pass===0?0:t, end=pass===0?t:1;
        ctx.beginPath();
        for(let j=0;j<=count;j++){
          const s=start+(end-start)*j/count;
          const p=point(location(i,s));
          j===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);
        }
        ctx.lineWidth=pass===0?(i===0?2.8:1.6):1.1;
        ctx.globalAlpha=pass===0?.83:.15;
        ctx.strokeStyle=colors[i];ctx.stroke();
      }
      ctx.globalAlpha=1;
      const p=point(location(i,t));
      const radius=i===0?4.5:3;
      const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,15);
      glow.addColorStop(0,colors[i]+'77');glow.addColorStop(1,colors[i]+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
    // Occasional crossings become important only because the paths continue after them.
    const marks=mode==='cell'?[.27,.54,.74]:[.21,.43,.68];
    marks.forEach((s,k)=>{
      if(s>t) return;
      const p=point(location([0,2,5][k],s));
      ctx.strokeStyle='rgba(210,236,189,.25)';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.stroke();
    });
  }
  function setTime(value) {t=Math.max(0,Math.min(1,value));slider.value=Math.round(t*100);out.textContent=`${Math.round(t*100)}%`;render();}
  function setPlaying(value) {playing=value;play.textContent=value?'Ⅱ':'▶';play.setAttribute('aria-label',value?'暂停轨迹动画':'播放轨迹动画');}
  slider.addEventListener('input',()=>{setTime(Number(slider.value)/100);setPlaying(false);});
  play.addEventListener('click',()=>setPlaying(!playing));
  modes.forEach(b=>b.addEventListener('click',()=>{
    mode=b.dataset.mode;
    modes.forEach(m=>{const active=m===b;m.classList.toggle('active',active);m.setAttribute('aria-pressed',String(active));});
    note.textContent=mode==='human'?'相遇是一个瞬间，影响却可能沿着未来的轨迹延伸。':'观察只是时间的切片；真实的细胞命运需要动态与谱系证据。';
    render();
  }));
  function tick(now) {
    if(playing && lastTime) setTime(t+Math.min(50,now-lastTime)*0.000028 > 1 ? 0 : t+Math.min(50,now-lastTime)*0.000028);
    lastTime=now; frame=requestAnimationFrame(tick);
  }
  window.addEventListener('resize',resize,{passive:true});resize();frame=requestAnimationFrame(tick);
  document.addEventListener('visibilitychange',()=>{lastTime=0;});
  const progress=document.getElementById('scrollProgress');
  window.addEventListener('scroll',()=>{const remaining=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=`${remaining>0?100*window.scrollY/remaining:0}%`;},{passive:true});
  const toast=document.getElementById('toast');let toastTimer;
  function showToast(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2300);}
  async function share(){
    const url=location.href.split('#')[0];
    try {await navigator.clipboard.writeText(url);showToast('文章链接已复制，可以分享给朋友。');}
    catch(e){if(navigator.share){try{await navigator.share({title:document.title,url});}catch(_){}}else showToast('请复制浏览器地址栏中的链接。');}
  }
  document.getElementById('shareTop').addEventListener('click',share);
  document.getElementById('shareBottom').addEventListener('click',share);
})();
