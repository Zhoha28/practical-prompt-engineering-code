// Prompt Library JS: localStorage-backed, render, delete, theme toggle, ratings
const STORAGE_KEY = 'promptLibrary.prompts';
const THEME_KEY = 'promptLibrary.theme';
const USER_KEY = 'promptLibrary.userId';
const USER_ID = getOrCreateUserId();

// DOM elements
const form = document.getElementById('prompt-form');
const titleInput = document.getElementById('prompt-title');
const contentInput = document.getElementById('prompt-content');
const promptsList = document.getElementById('prompts-list');
const themeToggle = document.getElementById('theme-toggle');
const clearFormBtn = document.getElementById('clear-form');

let prompts = [];

// Helpers
function loadPrompts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    prompts = list.map(normalizePrompt);
  }catch(e){
    console.error('Failed to read prompts from localStorage', e);
    prompts = [];
  }
}

function savePrompts(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function normalizePrompt(raw){
  const userRatings = {};
  if(raw && typeof raw.userRatings === 'object'){
    Object.entries(raw.userRatings).forEach(([userId, rating]) => {
      const numeric = Number(rating);
      if(Number.isFinite(numeric)){
        const clamped = Math.min(5, Math.max(1, Math.round(numeric)));
        userRatings[userId] = clamped;
      }
    });
  }

  const prompt = {
    id: raw?.id || makeId(),
    title: raw?.title || 'Untitled',
    content: raw?.content || '',
    createdAt: raw?.createdAt || Date.now(),
    userRatings,
    averageRating: 0,
    totalRatings: 0
  };

  updatePromptAggregate(prompt);
  return prompt;
}

function updatePromptAggregate(prompt){
  const ratings = Object.values(prompt.userRatings || {});
  if(ratings.length === 0){
    prompt.averageRating = 0;
    prompt.totalRatings = 0;
    return;
  }

  const sum = ratings.reduce((acc, value) => acc + value, 0);
  prompt.averageRating = Number((sum / ratings.length).toFixed(2));
  prompt.totalRatings = ratings.length;
}

function makeId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function getOrCreateUserId(){
  let id = localStorage.getItem(USER_KEY);
  if(!id){
    id = makeId();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

function previewText(text, maxWords = 12){
  const words = text.trim().split(/\s+/);
  if(words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

function truncateText(text, maxChars = 150){
  if(!text) return '';
  const trimmed = text.trim();
  if(trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).trimEnd() + '...';
}

function renderPrompts(){
  promptsList.innerHTML = '';
  if(prompts.length === 0){
    promptsList.innerHTML = '<div class="prompt-card" style="justify-content:center"><div style="color:var(--muted)">No prompts saved yet</div></div>';
    return;
  }

  const frag = document.createDocumentFragment();
  prompts.slice().reverse().forEach(p => {
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.setAttribute('data-id', p.id);

    const header = document.createElement('div');
    header.className = 'prompt-header';

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = p.title ? p.title[0].toUpperCase() : 'P';

    const info = document.createElement('div');
    info.className = 'prompt-info';
    const h3 = document.createElement('h3');
    h3.className = 'prompt-title';
    h3.title = p.title;
    h3.textContent = p.title || 'Untitled';
    const preview = document.createElement('div');
    preview.className = 'prompt-preview';
    preview.textContent = previewText(p.content || '');
    info.appendChild(h3);
    info.appendChild(preview);

    header.appendChild(badge);
    header.appendChild(info);

    const promptLabel = document.createElement('div');
    promptLabel.className = 'prompt-label';
    promptLabel.textContent = 'Prompt';

    const promptText = document.createElement('p');
    promptText.className = 'prompt-text';
    const fullText = p.content || '';
    promptText.textContent = fullText ? truncateText(fullText, 150) : 'No prompt text yet.';

    const actions = document.createElement('div');
    actions.className = 'prompt-actions';
    const buttons = document.createElement('div');
    buttons.className = 'prompt-buttons';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'icon-btn'; viewBtn.title = 'Copy full prompt'; viewBtn.innerHTML = '📋';
    viewBtn.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(p.content).then(()=>{
        viewBtn.textContent = '✅';
        setTimeout(()=> viewBtn.textContent = '📋', 1200);
      }).catch(()=>{
        viewBtn.textContent = '📋';
      });
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn'; delBtn.title = 'Delete prompt'; delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', ()=> deletePrompt(p.id));

    const rating = createRatingControl(p);
    buttons.appendChild(viewBtn);
    buttons.appendChild(delBtn);

    actions.appendChild(rating);
    actions.appendChild(buttons);

    card.appendChild(header);
    card.appendChild(promptLabel);
    card.appendChild(promptText);
    card.appendChild(actions);
    frag.appendChild(card);
  });

  promptsList.appendChild(frag);
}

function createRatingControl(prompt){
  const wrapper = document.createElement('div');
  wrapper.className = 'rating';
  wrapper.dataset.promptId = prompt.id;
  wrapper.setAttribute('role','radiogroup');
  wrapper.setAttribute('aria-label', `Rate ${prompt.title}`);

  const userRating = prompt.userRatings?.[USER_ID] || 0;

  for(let i = 1; i <= 5; i++){
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.dataset.value = String(i);
    const isFilled = i <= userRating;
    starBtn.className = 'rating-star' + (isFilled ? ' filled' : '');
    starBtn.textContent = isFilled ? '★' : '☆';
    starBtn.setAttribute('role','radio');
    starBtn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
    starBtn.setAttribute('aria-checked', userRating === i ? 'true' : 'false');
    starBtn.addEventListener('click', () => ratePrompt(prompt.id, i));
    starBtn.addEventListener('keydown', handleRatingKeydown);
    wrapper.appendChild(starBtn);
  }

  const ratingStats = document.createElement('span');
  ratingStats.className = 'rating-count';
  ratingStats.textContent = prompt.totalRatings
    ? `${prompt.averageRating.toFixed(1)} · ${prompt.totalRatings} rating${prompt.totalRatings > 1 ? 's' : ''}`
    : 'No ratings yet';
  wrapper.appendChild(ratingStats);

  return wrapper;
}

function handleRatingKeydown(event){
  const currentStar = event.currentTarget;
  const key = event.key;
  const container = currentStar.parentElement;
  if(!container) return;

  if(key === 'ArrowLeft' || key === 'ArrowDown'){
    event.preventDefault();
    const prev = currentStar.previousElementSibling;
    if(prev && prev.classList.contains('rating-star')){
      prev.focus();
    }
    return;
  }

  if(key === 'ArrowRight' || key === 'ArrowUp'){
    event.preventDefault();
    const next = currentStar.nextElementSibling;
    if(next && next.classList.contains('rating-star')){
      next.focus();
    }
    return;
  }

  if(key === ' ' || key === 'Enter'){
    event.preventDefault();
    const promptId = container.dataset.promptId;
    const value = Number(currentStar.dataset.value);
    if(promptId && Number.isFinite(value)){
      ratePrompt(promptId, value);
    }
  }
}

function addPrompt(title, content){
  const newPrompt = { 
    id: makeId(), 
    title: title.trim(), 
    content: content.trim(), 
    createdAt: Date.now(),
    averageRating: 0,
    totalRatings: 0,
    userRatings: {}
  };
  prompts.push(newPrompt);
  savePrompts();
  renderPrompts();
}

function ratePrompt(promptId, stars) {
  const prompt = prompts.find(p => p.id === promptId);
  if (!prompt || !Number.isFinite(stars)) return;

  const sanitized = Math.min(5, Math.max(1, Math.round(stars)));
  if(!prompt.userRatings){
    prompt.userRatings = {};
  }

  prompt.userRatings[USER_ID] = sanitized;
  updatePromptAggregate(prompt);

  savePrompts();
  renderPrompts();
}

function deletePrompt(id){
  const idx = prompts.findIndex(p => p.id === id);
  if(idx === -1) return;
  prompts.splice(idx, 1);
  savePrompts();
  renderPrompts();
}

// Theme
function applyTheme(theme){
  if(theme === 'light'){
    document.body.setAttribute('data-theme','light');
    themeToggle.textContent = '☀️';
    themeToggle.setAttribute('aria-pressed','true');
  }else{
    document.body.setAttribute('data-theme','dark');
    themeToggle.textContent = '🌙';
    themeToggle.setAttribute('aria-pressed','false');
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// Events
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if(!content){
    contentInput.focus();
    return;
  }
  addPrompt(title || 'Untitled', content);
  form.reset();
  titleInput.focus();
});

clearFormBtn.addEventListener('click', ()=> form.reset());

themeToggle.addEventListener('click', toggleTheme);

// Init
(function init(){
  // load prompts
  loadPrompts();
  renderPrompts();

  // theme
  const storedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(storedTheme);
})();
