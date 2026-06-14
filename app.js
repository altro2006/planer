/* =====================================================
   FORGE AI — App Logic v2
   ===================================================== */

let currentMode = 'plan';
let currentPlanData = null;
let activeDay = null;

const DAYS_PL  = ['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'];
const DAYS_SHORT = ['Pon','Wt','Śr','Czw','Pt','Sob','Nd'];

const LOADING_MSGS = [
  'Analizuję Twoje parametry...',
  'Dobieranie optymalnych ćwiczeń...',
  'AI układa Twój plan...',
  'Obliczam objętość treningową...',
  'Finalizuję plan...',
];
const LOADING_DIET_MSGS = [
  'Obliczam podstawową przemianę materii...',
  'Przeliczam zapotrzebowanie kaloryczne...',
  'Dostosowuję makroskładniki do celu...',
  'AI komponuje plan posiłków...',
  'Finalizuję plan diety...',
];

// ── Mode Switcher ───────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('planForm').classList.toggle('active', mode === 'plan');
  document.getElementById('dietForm').classList.toggle('active', mode === 'diet');
  document.getElementById('formTitle').textContent    = mode === 'plan' ? 'Skonfiguruj Plan Treningowy' : 'Skonfiguruj Plan Diety';
  document.getElementById('formSubtitle').textContent = mode === 'plan'
    ? 'Wypełnij poniższe parametry, a AI ułoży dla Ciebie optymalny plan'
    : 'Podaj swoje dane, a AI wyliczy idealne makroskładniki dla Twojego celu';
  resetResults();
}

// ── Toggle Groups Init ──────────────────────────────────
function initToggleGroups() {
  // single-select toggle buttons
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // single-select card options
  document.querySelectorAll('.card-select').forEach(group => {
    group.querySelectorAll('.card-option').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.card-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });

  // multi-select tags
  document.querySelectorAll('.tag-select').forEach(group => {
    group.querySelectorAll('.tag-btn').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('active'));
    });
  });

  // single-select level
  document.querySelectorAll('.level-select').forEach(group => {
    group.querySelectorAll('.level-option').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.level-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });

  // single-select split
  document.querySelectorAll('.split-select').forEach(group => {
    group.querySelectorAll('.split-option').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.split-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });

  // single-select activity
  document.querySelectorAll('.activity-select').forEach(group => {
    group.querySelectorAll('.activity-option').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.activity-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  });
}


// ── Slider Logic ────────────────────────────────────────
const LEVEL_VALS = ['początkujący', 'średnio zaawansowany', 'zaawansowany'];
const LEVEL_LABELS = ['Początkujący', 'Średnio zaawansowany', 'Zaawansowany'];

function updateSlider(type) {
  if (type === 'trainDays') {
    const sl = document.getElementById('trainDaysSlider');
    const val = parseInt(sl.value);
    document.getElementById('trainDaysVal').textContent = val;
    const pct = ((val - 2) / (6 - 2)) * 100;
    sl.style.setProperty('--pct', pct + '%');
    sl.dataset.active = '1';
  } else if (type === 'time') {
    const sl = document.getElementById('timeSlider');
    const val = parseInt(sl.value);
    document.getElementById('timeVal').textContent = val;
    const pct = ((val - 30) / (120 - 30)) * 100;
    sl.style.setProperty('--pct', pct + '%');
    sl.dataset.active = '1';
  } else if (type === 'level') {
    const sl = document.getElementById('levelSlider');
    const idx = parseInt(sl.value);
    document.getElementById('levelVal').textContent = LEVEL_LABELS[idx];
    const pct = (idx / 2) * 100;
    sl.style.setProperty('--pct', pct + '%');
    sl.dataset.active = '1';
  }
}

function getSliderVal(type) {
  if (type === 'trainDays') {
    const sl = document.getElementById('trainDaysSlider');
    return sl ? sl.value : null;
  } else if (type === 'time') {
    const sl = document.getElementById('timeSlider');
    return sl ? sl.value : null;
  } else if (type === 'level') {
    const sl = document.getElementById('levelSlider');
    return sl ? LEVEL_VALS[parseInt(sl.value)] : null;
  }
  return null;
}

// ── Read Values ─────────────────────────────────────────
function getToggleVal(groupId)   { const el = document.querySelector(`#${groupId} .toggle-btn.active`);  return el ? el.dataset.val : null; }
function getCardVal(groupId)     { const el = document.querySelector(`#${groupId} .card-option.active`); return el ? el.dataset.val : null; }
function getTagVals(groupId)     { return Array.from(document.querySelectorAll(`#${groupId} .tag-btn.active`)).map(e => e.dataset.val); }
function getSplitVal()           { const el = document.querySelector('.split-option.active');  return el ? el.dataset.val : null; }
function getActivityVal()        { const el = document.querySelector('.activity-option.active'); return el ? el.dataset.val : null; }

function getPlanFormValues() {
  return {
    trainDays : getSliderVal('trainDays'),
    goal      : getCardVal('goalGroup'),
    time      : getSliderVal('time'),
    muscles   : getTagVals('muscleGroup'),
    injuries  : getTagVals('injuryGroup'),
    level     : getSliderVal('level'),
    split     : getSplitVal(),
    equipment : getTagVals('equipGroup'),
  };
}

function getDietFormValues() {
  return {
    gender   : getCardVal('genderGroup'),
    age      : document.getElementById('ageInput').value.trim(),
    weight   : document.getElementById('weightInput').value.trim(),
    height   : document.getElementById('heightInput').value.trim(),
    activity : getActivityVal(),
    goal     : getCardVal('dietGoalGroup'),
  };
}

// ── Validation ──────────────────────────────────────────
function validatePlan(v) {
  if (!v.trainDays) return 'Wybierz liczbę treningów w tygodniu';
  if (!v.goal)      return 'Wybierz cel treningowy';
  if (!v.time)      return 'Wybierz czas treningu';
  if (!v.muscles.length) return 'Wybierz co najmniej jedną partię mięśniową';
  if (!v.level)     return 'Wybierz poziom zaawansowania';
  if (!v.split)     return 'Wybierz preferowany split';
  if (!v.equipment.length) return 'Wybierz dostępny sprzęt';
  return null;
}

function validateDiet(v) {
  if (!v.gender)   return 'Wybierz płeć';
  if (!v.age)      return 'Wpisz wiek';
  if (!v.weight)   return 'Wpisz wagę';
  if (!v.height)   return 'Wpisz wzrost';
  if (!v.activity) return 'Wybierz poziom aktywności';
  if (!v.goal)     return 'Wybierz cel diety';
  return null;
}

// ── Loading ─────────────────────────────────────────────
let loadingInterval;

function startLoading(isDiet) {
  const msgs = isDiet ? LOADING_DIET_MSGS : LOADING_MSGS;
  let i = 0;
  const el = document.getElementById('loadingMessage');
  if (el) el.textContent = msgs[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % msgs.length;
    const el = document.getElementById('loadingMessage');
    if (el) el.textContent = msgs[i];
  }, 2000);
}

function stopLoading() { clearInterval(loadingInterval); }

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

// ── Generate Plan ───────────────────────────────────────
async function generatePlan() {
  const vals = getPlanFormValues();
  const err  = validatePlan(vals);
  if (err) { showToast(err); return; }

  showLoading(false);
  try {
    const raw  = await callAPI(buildPlanPrompt(vals));
    const data = parseJSON(raw);
    if (!data || !Array.isArray(data.days)) throw new Error('Nieprawidłowa odpowiedź AI — spróbuj ponownie.');
    currentPlanData = data;
    renderPlanResults(data, vals);
    showPlanResults();
  } catch (e) {
    stopLoading();
    showError(e.message);
  }
}

// ── Generate Diet ───────────────────────────────────────
async function generateDiet() {
  const vals = getDietFormValues();
  const err  = validateDiet(vals);
  if (err) { showToast(err); return; }

  showLoading(true);
  try {
    const raw  = await callAPI(buildDietPrompt(vals));
    const data = parseJSON(raw);
    if (!data || !data.target_kcal) throw new Error('Nieprawidłowa odpowiedź AI — spróbuj ponownie.');
    renderDietResults(data, vals);
    showDietResults();
  } catch (e) {
    stopLoading();
    showError(e.message);
  }
}

// ── API Call ────────────────────────────────────────────
async function callAPI(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `Błąd serwera: ${res.status}`);
  }
  const d = await res.json();
  return d.result;
}

function parseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch { return null; }
    return null;
  }
}

// ── Prompts ─────────────────────────────────────────────
function buildPlanPrompt(v) {
  const injuryNote = v.injuries.length
    ? `KONTUZJE (BEZWZGLĘDNIE unikaj ćwiczeń obciążających te partie): ${v.injuries.join(', ')}.`
    : 'Brak kontuzji.';

  return `Jesteś doświadczonym trenerem personalnym. Stwórz SZCZEGÓŁOWY plan treningowy według poniższych wymagań.

=== WYMAGANIA (MUSISZ ICH PRZESTRZEGAĆ) ===
SPLIT: "${v.split}" — każdy dzień treningowy MUSI być zgodny z tym splitem.
  - Jeśli "Full Body": każdy dzień treningowy = ćwiczenia na CAŁE ciało (klatka+plecy+nogi+barki w jednym treningu)
  - Jeśli "Push/Pull/Legs": Push = klatka+barki+triceps, Pull = plecy+biceps, Legs = nogi
  - Jeśli "Upper/Lower": Upper = górna połowa ciała, Lower = dolna połowa ciała
  - Jeśli "Bro Split": każdy dzień = JEDNA partia mięśniowa
LICZBA DNI TRENINGOWYCH: dokładnie ${v.trainDays} (reszta z 7 to dni odpoczynku)
CEL: ${v.goal}
CZAS TRENINGU: ${v.time} minut
PARTIE DO TRENOWANIA: ${v.muscles.join(', ')} — używaj TYLKO tych partii
${injuryNote}
POZIOM: ${v.level}
SPRZĘT: ${v.equipment.join(', ')} — używaj TYLKO tego sprzętu

=== FORMAT ODPOWIEDZI ===
Odpowiedz WYŁĄCZNIE w JSON, zero komentarzy poza JSON:

{
  "split_name": "nazwa splitu",
  "summary": "krótki opis planu",
  "days": [
    {
      "day_name": "Poniedziałek",
      "is_rest": false,
      "muscle_focus": "Klatka + Triceps",
      "estimated_time": "60",
      "exercises": [
        {
          "number": 1,
          "name": "Wyciskanie sztangi na ławce płaskiej",
          "target_muscle": "Klatka piersiowa",
          "sets": 4,
          "reps": "8-10",
          "rir": 2,
          "rest_seconds": 120,
          "notes": "Łokcie pod kątem 45°"
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
  "tips": ["wskazówka 1", "wskazówka 2", "wskazówka 3"]
}

WAŻNE:
- "rir" to LICZBA (integer), np. 2, nie tekst
- Łącznie DOKŁADNIE 7 elementów w "days" (${v.trainDays} treningów + ${7 - parseInt(v.trainDays)} odpoczynki)
- Każdy trening: 5-8 ćwiczeń
- Ćwiczenia muszą być realistyczne dla podanego sprzętu`;
}

function buildDietPrompt(v) {
  return `Jesteś dietetykiem sportowym. Oblicz plan diety dla:
Płeć: ${v.gender}, Wiek: ${v.age} lat, Waga: ${v.weight} kg, Wzrost: ${v.height} cm
Aktywność: ${v.activity}, Cel: ${v.goal}

Oblicz BMR (Mifflin-St Jeor), TDEE i docelowe kalorie:
- masa: TDEE + 300 kcal
- redukcja: TDEE - 500 kcal
- utrzymanie: TDEE

Odpowiedz WYŁĄCZNIE w JSON:
{
  "bmr": 1800,
  "tdee": 2500,
  "target_kcal": 2800,
  "protein_g": 170,
  "fat_g": 80,
  "carbs_g": 320,
  "goal_description": "opis strategii",
  "meals": [
    {
      "meal_number": 1,
      "meal_name": "Śniadanie",
      "suggested_time": "07:00",
      "kcal": 650,
      "protein_g": 40,
      "fat_g": 20,
      "carbs_g": 75,
      "example_foods": ["Owsianka 80g", "4 jajka", "Banan"]
    }
  ],
  "hydration_ml": 3000,
  "supplements": ["Kreatyna 5g/dzień"],
  "tips": ["tip 1", "tip 2", "tip 3"]
}
Stwórz 5 posiłków. Suma kcal posiłków = target_kcal.`;
}

// ── Render Plan ─────────────────────────────────────────
function renderPlanResults(data, vals) {
  const metaEl = document.getElementById('planMeta');
  if (metaEl) metaEl.textContent = `${data.split_name || vals.split} • ${vals.trainDays}x/tydzień • ${vals.goal}`;

  const nav = document.getElementById('daysNav');
  nav.innerHTML = '';
  data.days.forEach((day, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (day.is_rest ? ' rest' : '');
    btn.textContent = DAYS_SHORT[i] || `D${i+1}`;
    btn.title = day.is_rest ? 'Odpoczynek' : (day.muscle_focus || '');
    if (!day.is_rest) btn.addEventListener('click', () => selectDay(i, data));
    nav.appendChild(btn);
  });

  const first = data.days.findIndex(d => !d.is_rest);
  if (first >= 0) selectDay(first, data);
}

function selectDay(index, data) {
  activeDay = index;
  const day = data.days[index];

  document.querySelectorAll('.day-btn').forEach((b, i) => b.classList.toggle('active', i === index));

  const content = document.getElementById('dayContent');
  if (!content) return;

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
  (day.exercises || []).forEach((ex, i) => {
    // RIR: wyciągamy tylko liczbę
    const rirRaw = ex.rir !== undefined && ex.rir !== null ? ex.rir : 2;
    const rirNum = typeof rirRaw === 'number' ? rirRaw : parseInt(String(rirRaw).match(/\d+/)?.[0] ?? '2');

    rows += `
      <tr>
        <td><div class="ex-num">${ex.number || i+1}</div></td>
        <td>
          <div class="ex-name">${ex.name || ''}</div>
          <div class="ex-muscle">${ex.target_muscle || ''}</div>
        </td>
        <td><span class="ex-badge">${ex.sets || 3} serie</span></td>
        <td><span class="ex-badge">${ex.reps || '8-12'}</span></td>
        <td><span class="ex-badge rpe">RIR ${rirNum}</span></td>
        <td><span class="ex-badge">${formatRest(ex.rest_seconds)}</span></td>
      </tr>`;
    if (ex.notes) {
      rows += `<tr><td colspan="6" style="padding:4px 16px 10px;font-size:12px;color:var(--text-muted)">💡 ${ex.notes}</td></tr>`;
    }
  });

  const firstTrainingIdx = data.days.findIndex(d => !d.is_rest);
  const showTips = index === firstTrainingIdx;

  content.innerHTML = `
    <div class="day-info">
      <div class="day-title">${DAYS_PL[index] || day.day_name} — ${day.muscle_focus || ''}</div>
      <div class="day-duration">⏱ ${day.estimated_time ? day.estimated_time + ' min' : '~60 min'}</div>
    </div>
    <table class="exercise-table">
      <thead>
        <tr><th>#</th><th>Ćwiczenie</th><th>Serie</th><th>Powtórzenia</th><th>Zapas</th><th>Przerwa</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${showTips && currentPlanData?.tips?.length ? `
    <div class="advice-grid" style="margin-top:20px">
      ${currentPlanData.tips.map(t => `
        <div class="advice-card">
          <div class="advice-icon">💡</div>
          <div class="advice-text">${t}</div>
        </div>`).join('')}
    </div>` : ''}`;
}

function formatRest(s) {
  if (!s) return '90s';
  return s >= 60 ? Math.round(s / 60) + ' min' : s + 's';
}

// ── Render Diet ─────────────────────────────────────────
function renderDietResults(data, vals) {
  const metaEl = document.getElementById('dietMeta');
  if (metaEl) metaEl.textContent = `${vals.gender} • ${vals.age} lat • ${vals.weight} kg • cel: ${vals.goal}`;

  const content = document.getElementById('dietContent');
  if (!content) return;

  let mealRows = '';
  (data.meals || []).forEach(m => {
    const foods = Array.isArray(m.example_foods) ? m.example_foods.join(', ') : '';
    mealRows += `
      <tr>
        <td>
          <div class="meal-name">${m.meal_name}</div>
          <div class="meal-time">⏰ ${m.suggested_time || ''}</div>
        </td>
        <td class="meal-kcal">${m.kcal} kcal</td>
        <td class="meal-macro">${m.protein_g}g</td>
        <td class="meal-macro">${m.fat_g}g</td>
        <td class="meal-macro">${m.carbs_g}g</td>
      </tr>
      ${foods ? `<tr><td colspan="5" style="padding:4px 14px 10px;font-size:12px;color:var(--text-muted)">🍽 ${foods}</td></tr>` : ''}`;
  });

  const supps = (data.supplements || []).map(s => `<span class="tag-btn active" style="cursor:default">${s}</span>`).join('');

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
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent)">${data.bmr} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">kcal</span></div>
      </div>
      <div class="advice-card" style="flex:1">
        <div class="advice-icon">📊</div>
        <div class="advice-title">TDEE</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent)">${data.tdee} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">kcal</span></div>
      </div>
      <div class="advice-card" style="flex:1">
        <div class="advice-icon">💧</div>
        <div class="advice-title">Nawodnienie</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:28px;color:var(--accent)">${data.hydration_ml ? (data.hydration_ml/1000).toFixed(1) : '2.5'} <span style="font-family:Inter,sans-serif;font-size:13px;color:var(--text-secondary)">L</span></div>
      </div>
    </div>

    <div class="meal-section">
      <div class="meal-section-title">Plan posiłków na dzień</div>
      <table class="meal-table">
        <thead><tr><th>Posiłek</th><th>Kalorie</th><th>Białko</th><th>Tłuszcze</th><th>Węgle</th></tr></thead>
        <tbody>${mealRows}</tbody>
      </table>
    </div>

    ${supps ? `<div class="meal-section"><div class="meal-section-title">Suplementacja</div><div class="tag-select">${supps}</div></div>` : ''}

    ${data.tips?.length ? `
    <div class="meal-section">
      <div class="meal-section-title">Wskazówki</div>
      <div class="advice-grid">
        ${data.tips.map(t => `<div class="advice-card"><div class="advice-icon">💡</div><div class="advice-text">${t}</div></div>`).join('')}
      </div>
    </div>` : ''}`;
}

// ── Error / Toast ───────────────────────────────────────
function showError(message) {
  stopLoading();
  ['emptyState','loadingState','planResults','dietResults'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const panel = document.getElementById('planResults');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <div class="error-title">Ups! Coś poszło nie tak</div>
      <div class="error-text">${message}</div>
      <div style="margin-top:16px">
        <button class="reset-btn" onclick="resetResults()">↺ Wróć i spróbuj ponownie</button>
      </div>
    </div>`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
    background:#1E1E2E;border:1px solid rgba(255,77,0,0.4);color:#E8E8F0;
    padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;
    font-family:Inter,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,0.5);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initToggleGroups();
  initSliders();
});

function initSliders() {
  // Set sliders to their minimum values and display them
  const trainSl = document.getElementById('trainDaysSlider');
  if (trainSl) { trainSl.value = 2; updateSlider('trainDays'); }

  const timeSl = document.getElementById('timeSlider');
  if (timeSl) { timeSl.value = 30; updateSlider('time'); }

  const levelSl = document.getElementById('levelSlider');
  if (levelSl) { levelSl.value = 0; updateSlider('level'); }
}
