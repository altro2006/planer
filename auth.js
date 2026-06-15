/* =====================================================
   FORGE AI — Auth (Supabase)
   ===================================================== */

// ── Supabase init ───────────────────────────────────────
// Wstaw tutaj swoje dane z Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://uekuqxjbftnkbyirbtct.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M9ofqItywB3xdO7HYTulYQ_iVhC_Fxg';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ── Init on load ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) handleUserLoggedIn(session.user);

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      handleUserLoggedIn(session.user);
    } else if (event === 'SIGNED_OUT') {
      handleUserLoggedOut();
    }
  });
});

// ── Login ───────────────────────────────────────────────
async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');

  if (!email || !password) { showAuthError(errEl, 'Wypełnij email i hasło'); return; }

  const btn = event.currentTarget;
  setAuthLoading(btn, true);

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  setAuthLoading(btn, false);

  if (error) {
    const msg = error.message.includes('Invalid login') ? 'Nieprawidłowy email lub hasło' : error.message;
    showAuthError(errEl, msg);
    return;
  }

  closeAuthModal();
  showToast('Zalogowano pomyślnie! Witaj z powrotem 👋');
}

// ── Register ────────────────────────────────────────────
async function register() {
  const name     = document.getElementById('registerName').value.trim();
  const email    = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const errEl    = document.getElementById('registerError');

  if (!name)                    { showAuthError(errEl, 'Wpisz swoje imię'); return; }
  if (!email)                   { showAuthError(errEl, 'Wpisz adres email'); return; }
  if (password.length < 6)      { showAuthError(errEl, 'Hasło musi mieć min. 6 znaków'); return; }

  const btn = event.currentTarget;
  setAuthLoading(btn, true);

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  setAuthLoading(btn, false);

  if (error) {
    const msg = error.message.includes('already registered') ? 'Ten email jest już zarejestrowany' : error.message;
    showAuthError(errEl, msg);
    return;
  }

  closeAuthModal();
  showToast('Konto utworzone! Sprawdź email w celu potwierdzenia 📧');
}

// ── Logout ──────────────────────────────────────────────
async function logout() {
  await sb.auth.signOut();
  showToast('Wylogowano pomyślnie');
  switchMode('plan');
}

// ── UI: user logged in ──────────────────────────────────
function handleUserLoggedIn(user) {
  currentUser = user;
  const name = user.user_metadata?.full_name || user.email.split('@')[0];
  const initials = name.charAt(0).toUpperCase();

  // Header: replace login button with user avatar
  const authEl = document.getElementById('headerAuth');
  if (authEl) {
    authEl.innerHTML = `
      <div class="user-chip" onclick="switchMode('profile')">
        <div class="user-avatar">${initials}</div>
        <span class="user-name">${name}</span>
      </div>`;
  }

  // Show profile tab
  const tab = document.getElementById('profileTab');
  if (tab) tab.classList.remove('hidden');

  // Fill profile page
  fillProfilePage(user);
}

// ── UI: user logged out ─────────────────────────────────
function handleUserLoggedOut() {
  currentUser = null;

  const authEl = document.getElementById('headerAuth');
  if (authEl) {
    authEl.innerHTML = `<button class="auth-btn" onclick="openAuthModal('login')">Zaloguj się</button>`;
  }

  const tab = document.getElementById('profileTab');
  if (tab) tab.classList.add('hidden');

  // Hide profile page if active
  const profilePage = document.getElementById('profilePage');
  if (profilePage && !profilePage.classList.contains('hidden')) {
    profilePage.classList.add('hidden');
    document.getElementById('formPanel').classList.remove('hidden');
    document.querySelector('.results-panel').classList.remove('hidden');
    switchMode('plan');
  }
}

// ── Fill profile data ───────────────────────────────────
function fillProfilePage(user) {
  const name    = user.user_metadata?.full_name || user.email.split('@')[0];
  const initials = name.charAt(0).toUpperCase();
  const created  = new Date(user.created_at);
  const now      = new Date();
  const daysSince = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('profileAvatar', initials);
  set('profileName',   name);
  set('profileEmail',  user.email);
  set('profileSince',  `Z nami od ${created.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  set('infoName',      name);
  set('infoEmail',     user.email);
  set('infoCreated',   created.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }));
  set('statDays',      daysSince);

  // Load stats from localStorage
  const plans = parseInt(localStorage.getItem(`forge_plans_${user.id}`) || '0');
  const diets = parseInt(localStorage.getItem(`forge_diets_${user.id}`) || '0');
  set('statPlans', plans);
  set('statDiets', diets);
}

// ── Track generations ───────────────────────────────────
function trackGeneration(type) {
  if (!currentUser) return;
  const key = `forge_${type}s_${currentUser.id}`;
  const current = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, current + 1);

  // Update displayed counter
  const el = document.getElementById(type === 'plan' ? 'statPlans' : 'statDiets');
  if (el) el.textContent = current + 1;
}

// ── Modal helpers ───────────────────────────────────────
function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.remove('hidden');
  switchAuthTab(tab);
  // Clear errors
  ['loginError','registerError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
}

function closeAuthModal(e) {
  if (!e || e.target === document.getElementById('authModal')) {
    document.getElementById('authModal').classList.add('hidden');
  }
}

function switchAuthTab(tab) {
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

function showAuthError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setAuthLoading(btn, loading) {
  if (!btn) return;
  const textEl = btn.querySelector('.btn-text');
  if (textEl) textEl.textContent = loading ? 'Ładowanie...' : (btn.id === 'loginBtn' ? 'Zaloguj się' : 'Utwórz konto');
  btn.disabled = loading;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
}

// ── switchMode override for profile ────────────────────
// (app.js switchMode calls this after its own logic)
function showProfilePage(show) {
  const profilePage  = document.getElementById('profilePage');
  const formPanel    = document.getElementById('formPanel');
  const resultsPanel = document.querySelector('.results-panel');

  if (show) {
    profilePage.classList.remove('hidden');
    formPanel.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    if (currentUser) fillProfilePage(currentUser);
  } else {
    profilePage.classList.add('hidden');
    formPanel.classList.remove('hidden');
    resultsPanel.classList.remove('hidden');
  }
}
