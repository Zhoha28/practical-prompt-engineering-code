// Prompt Library JS: localStorage-backed, render, delete, theme toggle
const STORAGE_KEY = 'promptLibrary.prompts';
const THEME_KEY = 'promptLibrary.theme';

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
    prompts = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Failed to read prompts from localStorage', e);
    prompts = [];
  }
}

function savePrompts(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function makeId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function previewText(text, maxWords = 12){
  const words = text.trim().split(/\s+/);
  if(words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
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

    const left = document.createElement('div'); left.className = 'prompt-left';
    const badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = p.title ? p.title[0].toUpperCase() : 'P';

    const info = document.createElement('div'); info.className = 'prompt-info';
    const h3 = document.createElement('h3'); h3.className = 'prompt-title'; h3.title = p.title; h3.textContent = p.title || 'Untitled';
    const preview = document.createElement('div'); preview.className = 'prompt-preview'; preview.textContent = previewText(p.content || '');

    info.appendChild(h3); info.appendChild(preview);
    left.appendChild(badge); left.appendChild(info);

    const actions = document.createElement('div'); actions.className = 'card-actions';
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

    actions.appendChild(viewBtn);
    actions.appendChild(delBtn);

    card.appendChild(left);
    card.appendChild(actions);
    frag.appendChild(card);
  });

  promptsList.appendChild(frag);
}

function addPrompt(title, content){
  const newPrompt = { id: makeId(), title: title.trim(), content: content.trim(), createdAt: Date.now() };
  prompts.push(newPrompt);
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
