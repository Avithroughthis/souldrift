(() => {
  
  let currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    alert("You are not logged in!");
    window.location.href = '/auth/auth.html';
  }

  
  const STORAGE_KEY = `vintage_daily_v1_${currentUser}`;

  
  function xpForCompletion(difficulty){
    return Math.round(10 * difficulty);
  }
  function thresholdFor(level){
    return Math.round(100 * Math.pow(level,1.35));
  }
  function xpToLevel(xp){
    let level = 1;
    let needed = thresholdFor(level);
    while(xp >= needed){
      level++;
      xp -= needed;
      needed = thresholdFor(level);
    }
    return {level, remaining: xp, needed};
  }

  
  const $ = id => document.getElementById(id);
  function uid(){return Math.random().toString(36).slice(2,9)}

  
  const allGoals = [
    {text:"Smile at a stranger", difficulty:1},
    {text:"Go for a walk", difficulty:1.5},
    {text:"Drink water", difficulty:1},
    {text:"Meditate 10 min", difficulty:2},
    {text:"Read 10 pages", difficulty:1.5},
    {text:"Stretch 5 min", difficulty:1},
    {text:"Compliment someone", difficulty:1},
    {text:"No phone 1 hour", difficulty:2},
    {text:"Write 3 gratitudes", difficulty:1.5},
    {text:"Plan tomorrow", difficulty:1}
  ];

  
  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        const state = {goals: rotateGoals(), xp:0, created: Date.now()};
        save(state);
        return state;
      }
      return JSON.parse(raw);
    }catch(e){
      const state = {goals: rotateGoals(), xp:0, created: Date.now()};
      save(state);
      return state;
    }
  }
  function save(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  
  function rotateGoals(){
    const day = new Date().getDate();
    const shuffled = allGoals
      .map((g,i)=>({g, rand: ((i+day)*13)%101 }))
      .sort((a,b)=>b.rand - a.rand)
      .slice(0,4)
      .map(g=>({id: uid(), ...g.g, completions: [], created: Date.now()}));
    return shuffled;
  }

  
  function currentStreak(){
    const state = load();
    let streak=0;
    for(let i=1;i<365;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const dayStr = d.toDateString();
      const completed = state.goals.some(g=>(g.completions||[]).some(t=>new Date(t).toDateString()===dayStr));
      if(completed) streak++; else break;
    }
    return streak;
  }
  function consistency(){
    const state = load();
    const start = new Date(state.created);
    const days = Math.floor((new Date() - start)/(24*3600000)) + 1;
    let doneDays = 0;
    for(let i=0;i<days;i++){
      const d = new Date(); d.setDate(d.getDate()-i);
      const dayStr = d.toDateString();
      const completed = state.goals.some(g=>(g.completions||[]).some(t=>new Date(t).toDateString()===dayStr));
      if(completed) doneDays++;
    }
    return days ? doneDays/days : 0;
  }
  function daysTracked(){
    const state = load();
    const start = new Date(state.created);
    return Math.floor((new Date() - start)/(24*3600000)) + 1;
  }

  
  function scoreGoal(goal){
    const now = Date.now();
    const completions = goal.completions||[];
    let streak=0;
    const days = new Set(completions.map(t=> new Date(t).toDateString()));
    for(let i=1;i<30;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      if(days.has(d.toDateString())) streak++; else break;
    }
    const last = completions.length ? Math.max(...completions) : 0;
    const hoursSince = last ? (now-last)/3600000 : 9999;
    const freq = completions.filter(t=> now - t <= 14*24*3600000).length;
    return (streak*1.8) + (Math.max(0,8-hoursSince/3)*1.2) + (Math.log(1+freq)*1.5) - (goal.difficulty-1)*1.5;
  }
  function suggest(goals, n=4){
    const scored = goals.map(g=>({g,score:scoreGoal(g)}));
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0,n).map(s=>s.g);
  }

  
  const state = load();
  const goalsEl = $('goals');
  const suggestedEl = $('suggestedList');
  const levelEl = $('level');
  const xpEl = $('xp');
  const xpFill = $('xpFill');

  function render(){
    goalsEl.innerHTML=''; suggestedEl.innerHTML='';

    
    for(const g of state.goals){
      const li=document.createElement('li'); li.className='goalItem';
      const left=document.createElement('div'); left.className='goalLeft';
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=isCompletedToday(g);
      cb.addEventListener('change', ()=> toggleComplete(g.id, cb.checked));
      const txt=document.createElement('div'); txt.className='goalText'; txt.textContent=g.text;
      if(isCompletedToday(g)) txt.classList.add('complete');
      left.appendChild(cb); left.appendChild(txt);
      li.appendChild(left);
      goalsEl.appendChild(li);
    }

    
    const sug = suggest(state.goals,4);
    for(const g of sug){
      const li = document.createElement('li'); li.className='goalItem';
      const left = document.createElement('div'); left.className='goalLeft';
      const txt = document.createElement('div'); txt.className='goalText'; txt.textContent = g.text;
      const badge = document.createElement('div'); badge.className='suggestBadge'; badge.textContent='Suggested';
      left.appendChild(txt);
      li.appendChild(left);
      li.appendChild(badge);
      suggestedEl.appendChild(li);
    }

    
    const info = xpToLevel(state.xp||0);
    levelEl.textContent = info.level;
    xpEl.textContent = state.xp||0;
    const fillPct = Math.round(100*(info.remaining/info.needed));
    xpFill.style.width = Math.min(100,fillPct)+'%';

    
    $('profileUsername').textContent='@'+currentUser;
    $('statLevel').textContent = info.level;
    $('statXP').textContent = state.xp||0;
    $('statStreak').textContent = currentStreak();
    $('statCons').textContent = Math.round(consistency()*100)+'%';
    $('statDays').textContent = daysTracked();
  }

  function isCompletedToday(goal){
    if(!goal.completions || !goal.completions.length) return false;
    const today = new Date().toDateString();
    return goal.completions.some(t=> new Date(t).toDateString()===today);
  }

  function toggleComplete(id, completed){
    const g = state.goals.find(x=>x.id===id); if(!g) return;
    if(completed){
      g.completions = g.completions||[];
      g.completions.push(Date.now());
      state.xp = (state.xp||0)+xpForCompletion(g.difficulty);
      save(state); render(); celebrate();
    } else {
      const today = new Date().toDateString();
      g.completions = (g.completions||[]).filter(t=> new Date(t).toDateString()!==today);
      save(state); render();
    }
  }

  function celebrate(){
    const el = document.createElement('div');
    el.textContent = '✨ +XP!';
    el.style.position='fixed'; el.style.right='20px'; el.style.bottom='20px';
    el.style.padding='10px 14px'; el.style.borderRadius='10px';
    el.style.background='var(--pink1)'; el.style.border='2px solid var(--deep)'; el.style.fontWeight=700;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1200);
  }

  document.addEventListener('DOMContentLoaded', render);

  
  window.vintageDaily = {state, save, load, suggest, xpToLevel};

})();
