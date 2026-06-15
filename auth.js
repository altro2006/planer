/* =====================================================
   FORGE AI — Auth (Supabase)
   ===================================================== */

const SUPABASE_URL = 'https://uekuqxjbftnkbyirbtct.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M9ofqItywB3xdO7HYTulYQ_iVhC_Fxg';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    handleUserLoggedIn(session.user);
  }
  // else: auth screen is already visible by default

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) handleUserLoggedIn(session.user);
    else if (event === 'SIGNED_OUT') handleUserLoggedOut();
  });
});

// ── Login ───────────────────────────────────────────────
async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');

  clearAuthError('loginError');
  if (!email || !password) { showAuthError(errEl, 'Wypełnij email i hasło'); return; }

  const btn = document.getElementById('loginBtn');
  setAuthLoading(btn, true, 'Logowanie...');

  const { error } = await sb.auth.signInWithPassword({ email, password });
  setAuthLoading(btn, false, 'Zaloguj się');

  if (error) {
    showAuthError(errEl, error.message.includes('Invalid login') ? 'Nieprawidłowy email lub hasło' : error.message);
  }
  // success handled by onAuthStateChange
}

// ── Register ────────────────────────────────────────────
async function register() {
  const name     = document.getElementById('registerName').value.trim();
  const email    = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const errEl    = document.getElementById('registerError');

  clearAuthError('registerError');
  if (!name)               { showAuthError(errEl, 'Wpisz swoje imię'); return; }
  if (!email)              { showAuthError(errEl, 'Wpisz adres email'); return; }
  if (password.length < 6) { showAuthError(errEl, 'Hasło musi mieć min. 6 znaków'); return; }

  const btn = document.getElementById('registerBtn');
  setAuthLoading(btn, true, 'Tworzenie konta...');

  const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name } },
  });
  setAuthLoading(btn, false, 'Utwórz konto');

  if (error) {
    showAuthError(errEl, error.message.includes('already registered') ? 'Ten email jest już zarejestrowany' : error.message);
    return;
  }

  showAuthError(document.getElementById('registerError'), '✅ Sprawdź email — wyśliliśmy link potwierdzający!');
  document.getElementById('registerError').style.color = 'var(--success)';
  document.getElementById('registerError').style.borderColor = 'rgba(0,229,160,0.3)';
  document.getElementById('registerError').style.background = 'rgba(0,229,160,0.08)';
  document.getElementById('registerError').classList.remove('hidden');
}

// ── Logout ──────────────────────────────────────────────
async function logout() {
  await sb.auth.signOut();
}

// ── Logged In ───────────────────────────────────────────
function handleUserLoggedIn(user) {
  currentUser = user;
  const name     = user.user_metadata?.full_name || user.email.split('@')[0];
  const initials = name.charAt(0).toUpperCase();

  // Switch screens
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  // Fill header chip
  setEl('userAvatar', initials);
  setEl('userName', name);
  setEl('pdAvatar', initials);
  setEl('pdName', name);
  setEl('pdEmail', user.email);

  // Fill profile page
  fillProfilePage(user);

  // Show home
  showPage('home');

  // Set greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';
  setEl('homeGreeting', `${greeting}, ${name}! 👋`);
}

// ── Logged Out ──────────────────────────────────────────
function handleUserLoggedOut() {
  currentUser = null;
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  // Reset auth form
  switchAuthTab('login');
  ['loginEmail','loginPassword','registerName','registerEmail','registerPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── Profile ─────────────────────────────────────────────
function fillProfilePage(user) {
  const name    = user.user_metadata?.full_name || user.email.split('@')[0];
  const created = new Date(user.created_at);
  const days    = Math.floor((new Date() - created) / 86400000);

  setEl('profileAvatar', name.charAt(0).toUpperCase());
  setEl('profileName', name);
  setEl('profileEmail', user.email);
  setEl('profileSince', `Z nami od ${created.toLocaleDateString('pl-PL', { year:'numeric', month:'long', day:'numeric' })}`);
  setEl('infoName', name);
  setEl('infoEmail', user.email);
  setEl('infoCreated', created.toLocaleDateString('pl-PL', { year:'numeric', month:'long', day:'numeric' }));
  setEl('statDays', days);
  setEl('statPlans', localStorage.getItem(`forge_plans_${user.id}`) || '0');
  setEl('statDiets', localStorage.getItem(`forge_diets_${user.id}`) || '0');
}

function trackGeneration(type) {
  if (!currentUser) return;
  const key = `forge_${type}s_${currentUser.id}`;
  const val = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, val);
  setEl(type === 'plan' ? 'statPlans' : 'statDiets', val);
}

// ── Page routing ─────────────────────────────────────────
function showPage(page) {
  // Hide all pages
  ['homePage','planerPage','trackerPage','profilePage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Hide/show nav
  const nav = document.getElementById('mainNav');
  if (nav) nav.style.visibility = page === 'planer' ? 'visible' : 'hidden';

  // Show target
  const target = document.getElementById(page + 'Page');
  if (target) target.classList.remove('hidden');

  // Close dropdown
  closeProfileDropdown();

  // Init sliders when entering planer
  if (page === 'planer' && typeof initSliders === 'function') initSliders();
}

function goHome() {
  showPage('home');
  closeProfileDropdown();
}

// ── Dropdown ─────────────────────────────────────────────
function toggleProfileDropdown() {
  const dd = document.getElementById('profileDropdown');
  if (dd) dd.classList.toggle('hidden');
}

function closeProfileDropdown() {
  const dd = document.getElementById('profileDropdown');
  if (dd) dd.classList.add('hidden');
}

document.addEventListener('click', e => {
  const chip = document.getElementById('userChip');
  const dd   = document.getElementById('profileDropdown');
  if (dd && chip && !chip.contains(e.target)) closeProfileDropdown();
});

// ── Auth UI helpers ──────────────────────────────────────
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

function clearAuthError(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.add('hidden'); el.style = ''; }
}

function setAuthLoading(btn, loading, text) {
  if (!btn) return;
  const t = btn.querySelector('.btn-text');
  if (t) t.textContent = text;
  btn.disabled = loading;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
