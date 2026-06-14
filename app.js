/* =====================================================
   FORGE AI — App Logic (Vercel Backend)
   ===================================================== */

// ── State ──────────────────────────────────────────────
let currentMode = 'plan';
let currentPlanData = null;
let activeDay = null;

const DAYS_PL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

const LOADING_MESSAGES = [
  'Analizuję Twoje parametry...',
  'Dobieranie optymalnych ćwiczeń...',
  'AI układa Twój plan...',
  'Obliczam objętość treningową...',
  'Finalizuję plan...',
];

const LOADING_DIET_MESSAGES = [
  'Obliczam podstawową przemianę materii...',
  'Przeliczam zapotrzebowanie kaloryczne...',
  'Dostosowuję makroskładniki do celu...',
  'AI komponuje plan posiłków...',
  'Finalizuję plan diety...',
];

// ── Mode Switcher ──────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;

  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  document.getElementById('planForm').classList.toggle('active', mode === 'plan');
  document.getElementById('dietForm').classList.toggle('active', mode === 'diet');

  if (mode === 'plan') {
    document.getElementById('formTitle').textContent = 'Skonfiguruj Plan Treningowy';
    document.getElementById('formSubtitle').textContent = 'Wypełnij poniższe parametry, a AI ułoży dla Ciebie optymalny plan';
  } else {
    document.getElementById('formTitle').textContent = 'Skonfiguruj Plan Diety';
    document.getElementById('formSubtitle').textContent = 'Podaj swoje dane, a AI wyliczy idealne makroskładniki dla Twojego celu';
  }

  resetResults();
}

// ── Toggle Groups ──────────────────────────────────────
function initToggleGroups() {
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  document.querySelectorAll('.card-select').forEach(group => {
    group.querySelectorAll('.card-option').forEach(option => {
      option.addEventListener('click', () => {
        group.querySelectorAll('.card-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
      });
    });
  });

  document.querySelectorAll('.tag-select').forEach(group => {
    group.querySelectorAll('.tag-btn').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('active'));
    });
  });

  document.querySelectorAll('.level-select').forEach(group => {
    group.querySelectorAll('.level-option').forEach(option => {
      option.addEventListener('click', () => {
        group.querySelectorAll('.level-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
      });
    });
  });

  document.querySelectorAll('.split-select').forEach(group => {
    group.querySelectorAll('.split-option').forEach(option => {
      option.addEventListener('click', () => {
        group.querySelectorAll('.split-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
      });
    });
  });

  document.querySelectorAll('.activity-select').forEach(group => {
    group.querySelectorAll('.activity-option').forEach(option => {
      option.addEventListener('click', () => {
        group.querySelectorAll('.activity-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
      });
    });
  });
}

// ── Read Form Values ───────────────────────────────────
function getPlanFormValues() {
  return {
    trainDays: getActiveToggleValue('#trainDaysGroup'),
    goal: getActiveCardValue('#goalGroup'),
    time: getActiveToggleValue('#timeGroup'),
    muscles: getActiveTagValues('#muscleGroup'),
    injuries: getActiveTagValues('#injuryGroup'),
    level: getActiveSingleValue('.level-option'),
    split: getActiveSingleValue('.split-option'),
    equipment: getActiveTagValues('#equipGroup'),
  };
}

function getDietFormValues() {
  return {
    gender: getActiveCardValue('#genderGroup'),
    age: document.getElementById('ageInput').value,
    weight: document.getElementById('weightInput').value,
    height: document.getElementById('heightInput').value,
    activity: getActiveSingleValue('.activity-option'),
    goal: getActiveCardValue('#dietGoalGroup'),
  };
}

function getActiveToggleValue(groupSelector) {
  const el = document.querySelector(groupSelector + ' .toggle-btn.active');
  return el ? el.dataset.val : '';
}

function getActiveCardValue(groupSelector) {
  const el = document.querySelector(groupSelector + ' .card-option.active');
  return el ? el.dataset.val : '';
}

function getActiveTagValues(groupSelector) {
  return Array.from(document.querySelectorAll(groupSelector + ' .tag-btn.active'))
    .map(e => e.dataset.val);
}

function getActiveSingleValue(selector) {
  const el = document.querySelector(selector + '.active');
  return el ? el.dataset.val : '';
}

// ── Loading Cycle ──────────────────────────────────────
let loadingInterval;

function startLoading(isDiet = false) {
  const msgs = isDiet ? LOADING_DIET_MESSAGES : LOADING_MESSAGES;
  let i = 0;
  document.getElementById('loadingMessage').textContent = msgs[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % msgs.length;
    document.getElementById('loadingMessage').textContent = msgs[i];
  }, 2000);
}

function stopLoading() { clearInterval(loadingInterval); }

// ── Show/Hide States ───────────────────────────────────
function showLoading(isDiet) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('planResults').classList.add('hidden');
  document.getElementById('dietResults').classList.add('hidden');
  startLoading(isDiet);
}

function showPlanResults() {
  stopLoading();
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('planResults').classList.remove('hidden');
}

function showDietResults() {
  stopLoading();
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('dietResults').classList.remove('hidden');
}

function resetResults() {
  stopLoading();
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('planResults').classList.add('hidden');
  document.getElementById('dietResults').classList.add('hidden');
  currentPlanData = null;
  activeDay = null;
}

// ── Generate Plan ──────────────────────────────────────
async function generatePlan() {
  const vals = getPlanFormValues();

  if (!vals.muscles.length) {
    showToast('Wybierz co najmniej jedną partię mięśniową');
    return;
  }

  showLoading(false);

  try {
    const result = await callAPI(buildPlanPrompt(vals));
    const data = parseJSON(result);
    if (!data) throw new Error('Błąd parsowania odpowiedzi AI. Spróbuj ponownie.');
    currentPlanData = data;
    renderPlanResults(data, vals);
    showPlanResults();
  } catch (err) {
    stopLoading();
    showError(err.message);
  }
}

// ── Generate Diet ──────────────────────────────────────
async function generateDiet() {
  const vals = getDietFormValues();

  if (!vals.age || !vals.weight || !vals.height) {
    showToast('Uzupełnij wiek, wagę i wzrost');
    return;
  }

  showLoading(true);

  try {
    const result = await callAPI(buildDietPrompt(vals));
    const data = parseJSON(result);
    if (!data) throw new Error('Błąd parsowania odpowiedzi AI. Spróbuj ponownie.');
    renderDietResults(data, vals);
    showDietResults();
  } catch (err) {
    stopLoading();
    showError(err.message);
  }
}

// ── Backend API Call (klucz ukryty na serwerze) ────────
async function callAPI(prompt) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      systemPrompt: 'Jesteś ekspertem fitness i dietetykiem. Zawsze odpowiadaj TYLKO w formacie JSON, bez żadnych dodatkowych komentarzy, bez markdown, bez backticks. Twoje odpowiedzi muszą być kompletne i szczegółowe.',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `Błąd serwera: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch { return null; } }
    return null;
  }
}

// ── Prompts ────────────────────────────────────────────
function buildPlanPrompt(vals) {
  return `Stwórz szczegółowy plan treningowy na siłownię dla osoby z następującymi parametrami:

- Liczba treningów w tygodniu: ${vals.trainDays}
- Cel: ${vals.goal}
- Czas treningu: ${vals.time}
- Partie mięśniowe: ${vals.muscles.join(', ')}
- Kontuzje/ograniczenia: ${vals.injuries.length ? vals.injuries.join(', ') : 'brak'}
- Poziom: ${vals.level}
- Split: ${vals.split}
- Dostępny sprzęt: ${vals.equipment.join(', ')}

Odpowiedz TYLKO w JSON według poniższego schematu:

{
  "summary": "Krótki opis planu (2-3 zdania)",
  "split_name": "Nazwa splitu",
  "total_weeks": "Zalecana liczba tygodni stosowania planu",
  "days": [
    {
      "day_name": "Poniedziałek",
      "is_rest": false,
      "muscle_focus": "Klatka i Triceps",
      "estimated_time": "60 minut",
      "exercises": [
        {
          "number": 1,
          "name": "Wyciskanie sztangi na ławce płaskiej",
          "target_muscle": "Klatka piersiowa",
          "sets": 4,
          "reps": "8-10",
          "rir": "2 (2 powtórzenia w zapasie)",
          "rest_seconds": 120,
          "notes": "Łokcie pod kątem 45°, pełny zakres ruchu"
        }
      ]
    },
    {
      "day_name": "Wtorek",
      "is_rest": true,
      "muscle_focus": "Odpoczynek",
      "estimated_time": null,
      "exercises": []
    }
  ],
  "tips": ["Wskazówka 1", "Wskazówka 2", "Wskazówka 3"]
}

Stwórz dokładnie ${vals.trainDays} dni treningowych i odpowiednią liczbę dni odpoczynku, łącznie 7 dni (pełny tydzień). Każdy dzień treningowy powinien mieć 5-8 ćwiczeń. Uwzględnij kontuzje i dostępny sprzęt.`;
}

function buildDietPrompt(vals) {
  return `Stwórz szczegółowy plan diety dla osoby z następującymi parametrami:

- Płeć: ${vals.gender}
- Wiek: ${vals.age} lat
- Waga: ${vals.weight} kg
- Wzrost: ${vals.height} cm
- Aktywność: ${vals.activity}
- Cel: ${vals.goal}

Oblicz BMR metodą Mifflin-St Jeor, następnie TDEE z odpowiednim mnożnikiem aktywności, a potem dostosuj kalorie do celu.

Odpowiedz TYLKO w JSON według poniższego schematu:

{
  "bmr": 1800,
  "tdee": 2500,
  "target_kcal": 2800,
  "protein_g": 170,
  "fat_g": 80,
  "carbs_g": 320,
  "goal_description": "Krótki opis strategii (2-3 zdania)",
  "meals": [
    {
      "meal_number": 1,
      "meal_name": "Śniadanie",
      "suggested_time": "07:00",
      "kcal": 650,
      "protein_g": 40,
      "fat_g": 20,
      "carbs_g": 75,
      "example_foods": ["Owsianka 80g", "Białko jaj 4 sztuki", "Banan 1 sztuka", "Orzechy włoskie 20g"]
    }
  ],
  "hydration_ml": 3000,
  "supplements": ["Kreatyna 5g/dzień", "Witamina D3 2000 IU"],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Stwórz 5 posiłków na dzień. Upewnij się, że suma kalorii posiłków odpowiada target_kcal.`;
}

// ── Render Plan ────────────────────────────────────────
function renderPlanResults(data, vals) {
  document.getElementById('planMeta').textContent =
    `${data.split_name} • ${vals.trainDays}x/tydzień • Cel: ${vals.goal}`;

  const nav = document.getElementById('daysNav');
  nav.innerHTML = '';
  data.days.forEach((day, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (day.is_rest ? ' rest' : '');
    btn.textContent = DAYS_SHORT[i] || day.day_name.slice(0, 3);
    if (!day.is_rest) btn.addEventListener('click', () => selectDay(i, data));
    nav.appendChild(btn);
  });

  const firstTraining = data.days.findIndex(d => !d.is_rest);
  if (firstTraining >= 0) selectDay(firstTraining, data);
}

function selectDay(index, data) {
  activeDay = index;
  const day = data.days[index];

  document.querySelectorAll('.day-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  const content = document.getElementById('dayContent');

  if (day.is_rest) {
    content.innerHTML = `
      <div class="rest-day-card">
        <div class="rest-icon">😴</div>
        <h3>DZIEŃ ODPOCZYNKU</h3>
        <p>Daj mięśniom czas na regenerację. Możesz spacerować lub wykonać lekkie stretching.</p>
      </div>`;
    return;
  }

  let rows = '';
  day.exercises.forEach((ex, i) => {
    rows += `
      <tr>
        <td><div class="ex-num">${ex.number || i + 1}</div></td>
        <td>
          <div class="ex-name">${ex.name}</div>
          <div class="ex-muscle">${ex.target_muscle || ''}</div>
        </td>
        <td><span class="ex-badge">${ex.sets} serie</span></td>
        <td><span class="ex-badge">${ex.reps} powt.</span></td>
        <td><span class="ex-badge rpe">${ex.rir || 'RIR 2'}</span></td>
        <td><span class="ex-badge">${formatRest(ex.rest_seconds)}</span></td>
      </tr>`;
    if (ex.notes) {
      rows += `<tr class="rest-row"><td colspan="6" style="text-align:left;padding:8px 16px;font-size:12px;color:var(--text-muted)">💡 ${ex.notes}</td></tr>`;
    }
  });

  content.innerHTML = `
    <div class="day-info">
      <div class="day-title">${DAYS_PL[activeDay] || day.day_name} — ${day.muscle_focus || ''}</div>
      <div class="day-duration">⏱ ${day.estimated_time || '~60 min'}</div>
    </div>
    <table class="exercise-table">
      <thead>
        <tr>
          <th>#</th><th>Ćwiczenie</th><th>Serie</th><th>Powtórzenia</th><th>Zapas (RIR)</th><th>Przerwa</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderTips(currentPlanData.tips, index === data.days.findIndex(d => !d.is_rest))}`;
}

function formatRest(seconds) {
  if (!seconds) return '90s';
  return seconds >= 60 ? Math.round(seconds / 60) + ' min' : seconds + 's';
}

function renderTips(tips, show) {
  if (!show || !tips?.length) return '';
  return `
    <div class="advice-grid" style="margin-top:20px">
      ${tips.map(tip => `
        <div class="advice-card">
          <div class="advice-icon">💡</div>
          <div class="advice-text">${tip}</div>
        </div>`).join('')}
    </div>`;
}

// ── Render Diet ────────────────────────────────────────
function renderDietResults(data, vals) {
  document.getElementById('dietMeta').textContent =
    `${vals.gender} • ${vals.age} lat • ${vals.weight} kg • Cel: ${vals.goal}`;

  const content = document.getElementById('dietContent');

  let mealRows = '';
  (data.meals || []).forEach(meal => {
    const foods = Array.isArray(meal.example_foods) ? meal.example_foods.join(', ') : '';
    mealRows += `
      <tr>
        <td>
          <div class="meal-name">${meal.meal_name}</div>
          <div class="meal-time">⏰ ${meal.suggested_time || ''}</div>
        </td>
        <td class="meal-kcal">${meal.kcal} kcal</td>
        <td class="meal-macro">${meal.protein_g}g</td>
        <td class="meal-macro">${meal.fat_g}g</td>
        <td class="meal-macro">${meal.carbs_g}g</td>
      </tr>
      ${foods ? `<tr style="background:rgba(255,255,255,0.01)"><td colspan="5" style="padding:6px 14px 12px;font-size:12px;color:var(--text-muted)">🍽 ${foods}</td></tr>` : ''}`;
  });

  const supplements = (data.supplements || [])
    .map(s => `<span class="tag-btn active" style="cursor:default">${s}</span>`).join('');

  content.innerHTML = `
    <div class="diet-macros">
      <div class="macro-card kcal">
        <div class="macro-icon">⚡</div>
        <div class="macro-label">Kalorie</div>
        <div class="macro-value">${data.target_kcal}</div>
        <div class="macro-unit">kcal / dzień</div>
      </div>
      <div class="macro-card protein">
        <div class="macro-icon">🥩</div>
        <div class="macro-label">Białko</div>
        <div class="macro-value">${data.protein_g}</div>
        <div class="macro-unit">g / dzień</div>
      </div>
      <div class="macro-card fat">
        <div class="macro-icon">🥑</div>
        <div class="macro-label">Tłuszcze</div>
        <div class="macro-value">${data.fat_g}</div>
        <div class="macro-unit">g / dzień</div>
      </div>
      <div class="macro-card carbs">
        <div class="macro-icon">🌾</div>
        <div class="macro-label">Węglowodany</div>
        <div class="macro-value">${data.carbs_g}</div>
        <div class="macro-unit">g / dzień</div>
      </div>
    </div>

    <div class="advice-card" style="margin-bottom:24px">
      <div class="advice-icon">🎯</div>
      <div class="advice-title">Strategia</div>
      <div class="advice-text">${data.goal_description || ''}</div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px">
      <div class="advice-card" style="flex:1">
        <div class="advice-icon">🔥</div>
        <div class="advice-title">BMR</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent);margin:4px 0">${data.bmr} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">kcal</span></div>
      </div>
      <div class="advice-card" style="flex:1">
        <div class="advice-icon">📊</div>
        <div class="advice-title">TDEE</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent);margin:4px 0">${data.tdee} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">kcal</span></div>
      </div>
      <div class="advice-card" style="flex:1">
        <div class="advice-icon">💧</div>
        <div class="advice-title">Nawodnienie</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent);margin:4px 0">${data.hydration_ml ? (data.hydration_ml/1000).toFixed(1) : '2.5'} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">L</span></div>
      </div>
    </div>

    <div class="meal-section">
      <div class="meal-section-title">Plan posiłków na dzień</div>
      <table class="meal-table">
        <thead>
          <tr><th>Posiłek</th><th>Kalorie</th><th>Białko</th><th>Tłuszcze</th><th>Węgle</th></tr>
        </thead>
        <tbody>${mealRows}</tbody>
      </table>
    </div>

    ${supplements ? `
    <div class="meal-section">
      <div class="meal-section-title">Suplementacja</div>
      <div class="tag-select">${supplements}</div>
    </div>` : ''}

    ${data.tips?.length ? `
    <div class="meal-section">
      <div class="meal-section-title">Wskazówki</div>
      <div class="advice-grid">
        ${data.tips.map(tip => `
          <div class="advice-card">
            <div class="advice-icon">💡</div>
            <div class="advice-text">${tip}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

// ── Error / Toast ──────────────────────────────────────
function showError(message) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('loadingState').classList.add('hidden');
  const panel = document.getElementById('planResults');
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <div class="error-title">Ups! Coś poszło nie tak</div>
      <div class="error-text">${message}</div>
      <div style="margin-top:16px">
        <button class="reset-btn" onclick="resetResults()" style="margin:0 auto">↺ Wróć i spróbuj ponownie</button>
      </div>
    </div>`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#1E1E2E;border:1px solid rgba(255,77,0,0.4);
    color:#E8E8F0;padding:12px 20px;border-radius:10px;
    font-size:14px;font-weight:600;font-family:Inter,sans-serif;
    box-shadow:0 8px 30px rgba(0,0,0,0.5);animation:slideIn 0.3s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initToggleGroups();
  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }`;
  document.head.appendChild(style);
});
