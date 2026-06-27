import {
  deleteFirebaseAccount,
  getCurrentFirebaseUser,
  getFirebaseAuthMessage,
  loginWithEmail,
  logoutFirebase,
  signUpWithEmail,
  updateFirebaseProfileName,
  watchAuthState,
} from "./auth.js";

import {
  backupUserState,
  createInitialUserState,
  deleteUserBackup,
  deleteUserState,
  loadUserBackup,
  loadUserState,
  saveUserState,
} from "./database.js";

const STORAGE_KEY = "moa-money-v3";
const USER_DATA_PREFIX = "moa-money-user-v1";
const AUTH_ACCOUNTS_KEY = "moa-auth-accounts-v1";
const AUTH_SESSION_KEY = "moa-auth-session-v1";
const LEGACY_MIGRATION_KEY = "moa-legacy-data-owner-v1";
const USER_BACKUP_PREFIX = "moa-money-backup-v1";
const PENDING_SIGNUP_PROFILE_PREFIX = "moa-pending-signup-profile-v1";
const TODAY = new Date("2026-06-27T12:00:00+09:00");

const TYPE_META = {
  income: { label: "수입", sign: "+", icon: "↙", className: "income" },
  expense: { label: "지출", sign: "−", icon: "↗", className: "expense" },
  saving: { label: "저축", sign: "", icon: "✦", className: "saving" },
  debt: { label: "부채", sign: "", icon: "◇", className: "debt" },
  stock: { label: "주식", sign: "", icon: "↗", className: "stock" },
  realEstate: { label: "부동산", sign: "", icon: "⌂", className: "real-estate" },
  transfer: { label: "계좌이체", sign: "", icon: "⇄", className: "transfer" },
};

const MANAGEMENT_ITEMS = {
  income: { label: "수입", desc: "월급, 부수입 등 들어오는 돈", icon: "↙", tone: "mint", type: "income", categoryLabel: "수입" },
  variableExpense: { label: "변동비", desc: "식비, 교통, 쇼핑 등 매달 달라지는 지출", icon: "↗", tone: "peach", type: "expense", group: "variable", categoryLabel: "변동비" },
  fixedExpense: { label: "고정비", desc: "월세, 보험, 통신비 등 정기 지출", icon: "⌂", tone: "sky", type: "expense", group: "fixed", categoryLabel: "고정비" },
  subscription: { label: "구독 서비스", desc: "영상, 음악, 클라우드 등의 정기 결제", icon: "▶", tone: "lilac", type: "expense", group: "subscription", categoryLabel: "구독" },
  saving: { label: "저축", desc: "적금, 비상금, 목표 저축", icon: "✦", tone: "sage", type: "saving", categoryLabel: "저축" },
  debt: { label: "부채", desc: "대출, 카드값과 상환 내역", icon: "◇", tone: "rose", type: "debt", categoryLabel: "부채" },
  stock: { label: "주식", desc: "국내외 주식과 ETF 투자", icon: "↗", tone: "yellow", type: "stock", categoryLabel: "주식" },
  realEstate: { label: "부동산", desc: "보증금, 주택 등 부동산 자산", icon: "⌂", tone: "sky", type: "realEstate", categoryLabel: "부동산" },
};

const MANAGEMENT_PRESETS = {
  starter: {
    income: true,
    variableExpense: true,
    fixedExpense: true,
    subscription: true,
    saving: true,
    debt: false,
    stock: false,
    realEstate: false,
  },
  full: {
    income: true,
    variableExpense: true,
    fixedExpense: true,
    subscription: true,
    saving: true,
    debt: true,
    stock: true,
    realEstate: true,
  },
};

const TRANSACTION_TYPE_ORDER = ["expense", "income", "saving", "debt", "stock", "realEstate", "transfer"];

const RECURRING_META = {
  income: { label: "수입", target: "recurringIncomeList" },
  fixed: { label: "고정비", target: "recurringFixedList" },
  subscription: { label: "구독", target: "recurringSubscriptionList" },
};

const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "토스뱅크", "카카오뱅크", "농협은행", "기업은행", "기타"];
const CATEGORY_ICONS = ["🍚", "🚌", "🏠", "🛍", "🎬", "🏥", "💰", "💼", "🐾", "📚", "✦", "☕"];
const CATEGORY_COLORS = ["sage", "sky", "peach", "lilac", "yellow", "rose"];

let activePage = "dashboard";
let transactionType = "expense";
let transactionFilter = "all";
let categoryFilter = "all";
let recurringType = "income";
let viewedMonth = "2026-06";
let authMode = "login";
let currentUser = null;
let state = createDefaultState();
let expandedMonthlyCard = "";
let expandedWeeklyCard = "";

function uid(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  const accounts = [
    { id: "acc-salary", name: "월급 통장", bank: "국민은행", balance: 4820000, initialBalance: 2320000, primary: true },
    { id: "acc-daily", name: "생활비 통장", bank: "토스뱅크", balance: 1245700, initialBalance: 2100000, primary: false },
    { id: "acc-saving", name: "차곡차곡 저축", bank: "카카오뱅크", balance: 12600000, initialBalance: 12000000, primary: false },
  ];

  const categories = [
    { id: "cat-salary", name: "월급", type: "income", group: "", budget: 0, accountId: "acc-salary", icon: "💼", color: "sage" },
    { id: "cat-extra", name: "부수입", type: "income", group: "", budget: 0, accountId: "acc-salary", icon: "✦", color: "sky" },
    { id: "cat-food", name: "식비", type: "expense", group: "variable", budget: 450000, accountId: "acc-daily", icon: "🍚", color: "peach" },
    { id: "cat-traffic", name: "교통", type: "expense", group: "variable", budget: 120000, accountId: "acc-daily", icon: "🚌", color: "sky" },
    { id: "cat-house", name: "주거", type: "expense", group: "fixed", budget: 780000, accountId: "acc-salary", icon: "🏠", color: "sage" },
    { id: "cat-life", name: "생활", type: "expense", group: "variable", budget: 250000, accountId: "acc-daily", icon: "🛍", color: "yellow" },
    { id: "cat-culture", name: "문화·여가", type: "expense", group: "variable", budget: 180000, accountId: "acc-daily", icon: "🎬", color: "lilac" },
    { id: "cat-health", name: "건강", type: "expense", group: "variable", budget: 150000, accountId: "acc-daily", icon: "🏥", color: "rose" },
    { id: "cat-subscription", name: "구독 서비스", type: "expense", group: "subscription", budget: 50000, accountId: "acc-daily", icon: "▶", color: "lilac" },
    { id: "cat-saving", name: "정기 저축", type: "saving", group: "", budget: 700000, accountId: "acc-saving", icon: "💰", color: "lilac" },
    { id: "cat-emergency", name: "비상금", type: "saving", group: "", budget: 200000, accountId: "acc-saving", icon: "✦", color: "sage" },
    { id: "cat-loan", name: "대출 상환", type: "debt", group: "", budget: 0, accountId: "acc-salary", icon: "🏦", color: "rose" },
    { id: "cat-card-debt", name: "카드값", type: "debt", group: "", budget: 0, accountId: "acc-salary", icon: "💳", color: "peach" },
    { id: "cat-domestic-stock", name: "국내 주식", type: "stock", group: "", budget: 0, accountId: "acc-saving", icon: "📈", color: "yellow" },
    { id: "cat-etf", name: "ETF", type: "stock", group: "", budget: 0, accountId: "acc-saving", icon: "▥", color: "sky" },
    { id: "cat-deposit", name: "전월세 보증금", type: "realEstate", group: "", budget: 0, accountId: "acc-saving", icon: "🏠", color: "sage" },
    { id: "cat-property", name: "보유 부동산", type: "realEstate", group: "", budget: 0, accountId: "acc-saving", icon: "🏢", color: "sky" },
  ];

  const transactions = [
    { id: "tx-01", type: "income", categoryId: "cat-salary", accountId: "acc-salary", targetAccountId: "", amount: 3250000, memo: "6월 월급", date: "2026-06-25", createdAt: 1 },
    { id: "tx-02", type: "expense", categoryId: "cat-food", accountId: "acc-daily", targetAccountId: "", amount: 12800, memo: "동네 마트 장보기", date: "2026-06-27", createdAt: 8 },
    { id: "tx-03", type: "expense", categoryId: "cat-traffic", accountId: "acc-daily", targetAccountId: "", amount: 1450, memo: "출근 버스", date: "2026-06-27", createdAt: 7 },
    { id: "tx-04", type: "expense", categoryId: "cat-culture", accountId: "acc-daily", targetAccountId: "", amount: 17000, memo: "넷플릭스", date: "2026-06-26", createdAt: 6 },
    { id: "tx-05", type: "saving", categoryId: "cat-saving", accountId: "acc-saving", targetAccountId: "", amount: 600000, memo: "이번 달 정기 저축", date: "2026-06-25", createdAt: 5 },
    { id: "tx-06", type: "expense", categoryId: "cat-food", accountId: "acc-daily", targetAccountId: "", amount: 9500, memo: "점심 샐러드", date: "2026-06-24", createdAt: 4 },
    { id: "tx-07", type: "expense", categoryId: "cat-house", accountId: "acc-salary", targetAccountId: "", amount: 650000, memo: "6월 월세", date: "2026-06-05", createdAt: 3 },
    { id: "tx-08", type: "expense", categoryId: "cat-life", accountId: "acc-daily", targetAccountId: "", amount: 84200, memo: "생활용품", date: "2026-06-18", createdAt: 2 },
    { id: "tx-09", type: "income", categoryId: "cat-extra", accountId: "acc-salary", targetAccountId: "", amount: 320000, memo: "디자인 외주", date: "2026-06-14", createdAt: 1 },
  ];

  const recurring = [
    { id: "rec-01", type: "income", name: "월급", amount: 3250000, day: 25, accountId: "acc-salary", active: true },
    { id: "rec-02", type: "fixed", name: "월세", amount: 650000, day: 5, accountId: "acc-salary", active: true },
    { id: "rec-03", type: "fixed", name: "통신비", amount: 69000, day: 12, accountId: "acc-daily", active: true },
    { id: "rec-04", type: "fixed", name: "건강보험", amount: 112000, day: 10, accountId: "acc-salary", active: true },
    { id: "rec-05", type: "subscription", name: "넷플릭스", amount: 17000, day: 26, accountId: "acc-daily", active: true },
    { id: "rec-06", type: "subscription", name: "유튜브 프리미엄", amount: 14900, day: 28, accountId: "acc-daily", active: true },
    { id: "rec-07", type: "subscription", name: "iCloud+", amount: 4400, day: 30, accountId: "acc-daily", active: true },
  ];

  return {
    schemaVersion: 4,
    profile: {
      name: "",
      email: "",
    },
    accounts,
    categories,
    transactions,
    recurring,
    settings: {
      showSummary: true,
      showRatios: true,
      showMonthly: true,
      showWeekly: true,
      showRecent: true,
      showUpcoming: true,
      amountDisplay: "full",
      startPage: "dashboard",
      targetSavingAmount: 0,
      targetSavingRate: 20,
      reduceMotion: false,
      analysisBaseMonth: TODAY.toISOString().slice(0, 7),
      analysisCompareMonth: shiftMonthKey(TODAY.toISOString().slice(0, 7), -1),
      analysisThirdMonth: shiftMonthKey(TODAY.toISOString().slice(0, 7), -2),
      monthlyCompareCustomized: false,
      monthlyThirdCustomized: false,
      analysisWeekMonth: TODAY.toISOString().slice(0, 7),
      analysisWeekBaseMonth: TODAY.toISOString().slice(0, 7),
      analysisWeekCompareMonth: shiftMonthKey(TODAY.toISOString().slice(0, 7), -1),
      analysisWeekBase: "",
      analysisWeekCompare: "",
      managementPreset: "starter",
      enabledManagement: { ...MANAGEMENT_PRESETS.starter },
    },
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function userDataKey(email) {
  return `${USER_DATA_PREFIX}:${encodeURIComponent(normalizeEmail(email))}`;
}

function userBackupKey(email) {
  return `${USER_BACKUP_PREFIX}:${encodeURIComponent(normalizeEmail(email))}`;
}

function pendingSignupProfileKey(email) {
  return `${PENDING_SIGNUP_PROFILE_PREFIX}:${encodeURIComponent(normalizeEmail(email))}`;
}

function rememberPendingSignupProfile(email, name) {
  const cleanEmail = normalizeEmail(email);
  const cleanName = cleanProfileName(name);
  if (!cleanEmail || !cleanName) return;

  localStorage.setItem(
    pendingSignupProfileKey(cleanEmail),
    JSON.stringify({ name: cleanName, email: cleanEmail, savedAt: Date.now() })
  );
}

function readPendingSignupProfile(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  try {
    const raw = localStorage.getItem(pendingSignupProfileKey(cleanEmail));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const name = cleanProfileName(parsed?.name);
    if (!name) return null;
    return { name, email: cleanEmail };
  } catch {
    return null;
  }
}

function clearPendingSignupProfile(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;
  localStorage.removeItem(pendingSignupProfileKey(cleanEmail));
}


function cleanProfileName(value) {
  return String(value || "").trim();
}

function resolveProfileName(...names) {
  const cleaned = names.map(cleanProfileName).filter(Boolean);
  return cleaned.find((name) => name !== "사용자") || cleaned[0] || "사용자";
}

function createBlankState(profile = state.profile || currentUser || {}) {
  const defaults = createDefaultState();
  return {
    ...defaults,
    profile: {
      name: resolveProfileName(profile.name, currentUser?.name),
      email: profile.email || currentUser?.email || "",
    },
    accounts: [],
    categories: [],
    transactions: [],
    recurring: [],
    settings: {
      ...defaults.settings,
      targetSavingAmount: 0,
      targetSavingRate: 20,
      enabledManagement: { ...MANAGEMENT_PRESETS.starter },
    },
  };
}

function backupCurrentState() {
  const user = getCurrentFirebaseUser();
  if (!user) return;

  backupUserState(user.uid, state).catch((error) => {
    console.error("Firebase 백업 실패:", error);
    showToast("Firebase 백업 중 문제가 생겼어요.");
  });
}

async function readBackupState() {
  const user = getCurrentFirebaseUser();
  if (!user) return null;

  try {
    return await loadUserBackup(user.uid);
  } catch (error) {
    console.error("Firebase 백업 불러오기 실패:", error);
    showToast("Firebase 백업 불러오기 중 문제가 생겼어요.");
    return null;
  }
}

function resetRuntimeFilters() {
  transactionType = "expense";
  transactionFilter = "all";
  categoryFilter = "all";
  recurringType = "income";
  viewedMonth = TODAY.toISOString().slice(0, 7);
}


function loadState(email) {
  try {
    let saved = localStorage.getItem(userDataKey(email));
    const legacyOwner = localStorage.getItem(LEGACY_MIGRATION_KEY);
    if (!saved && !legacyOwner) {
      saved = localStorage.getItem(STORAGE_KEY);
      if (saved) localStorage.setItem(LEGACY_MIGRATION_KEY, normalizeEmail(email));
    }
    if (!saved) return createDefaultState();
    const parsed = JSON.parse(saved);
    const defaults = createDefaultState();
    const parsedCategories = Array.isArray(parsed.categories) ? parsed.categories : defaults.categories;
    const migratedCategories = parsed.schemaVersion === 4
      ? parsedCategories
      : [
          ...parsedCategories,
          ...defaults.categories.filter((category) => !parsedCategories.some((savedCategory) => savedCategory.id === category.id)),
        ];
    migratedCategories.forEach((category) => {
      if (category.type === "expense" && !category.group) {
        category.group = category.id === "cat-house" ? "fixed" : "variable";
      }
      category.group ||= "";
      category.enabled = category.enabled !== false;
    });

    return {
      ...defaults,
      ...parsed,
      schemaVersion: 4,
      profile: {
        ...defaults.profile,
        ...(parsed.profile || {}),
      },
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaults.accounts,
      categories: migratedCategories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : defaults.transactions,
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : defaults.recurring,
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
        enabledManagement: {
          ...defaults.settings.enabledManagement,
          ...(parsed.settings?.enabledManagement || {}),
        },
      },
    };
  } catch {
    return createDefaultState();
  }
}

async function loadStateFromFirebase(user) {
  const defaults = createDefaultState();
  const data = await loadUserState(user.uid);

  const pendingProfile = readPendingSignupProfile(user.email);

  if (!data) {
    const profileName = resolveProfileName(pendingProfile?.name, user.displayName);
    const freshState = createBlankState({
      name: profileName,
      email: user.email || pendingProfile?.email || "",
    });
    freshState.profile = {
      name: profileName,
      email: user.email || pendingProfile?.email || "",
    };
    await createInitialUserState(user.uid, freshState);
    return freshState;
  }

  const parsedCategories = Array.isArray(data.categories) ? data.categories : defaults.categories;
  const migratedCategories = data.schemaVersion === 4
    ? parsedCategories
    : [
        ...parsedCategories,
        ...defaults.categories.filter((category) => !parsedCategories.some((savedCategory) => savedCategory.id === category.id)),
      ];

  migratedCategories.forEach((category) => {
    if (category.type === "expense" && !category.group) {
      category.group = category.id === "cat-house" ? "fixed" : "variable";
    }
    category.group ||= "";
    category.enabled = category.enabled !== false;
  });

  const profileName = resolveProfileName(pendingProfile?.name, user.displayName, data.profile?.name);

  return {
    ...defaults,
    ...data,
    schemaVersion: 4,
    profile: {
      ...defaults.profile,
      ...(data.profile || {}),
      name: profileName,
      email: user.email || "",
    },
    accounts: Array.isArray(data.accounts) ? data.accounts : defaults.accounts,
    categories: migratedCategories,
    transactions: Array.isArray(data.transactions) ? data.transactions : defaults.transactions,
    recurring: Array.isArray(data.recurring) ? data.recurring : defaults.recurring,
    settings: {
      ...defaults.settings,
      ...(data.settings || {}),
      enabledManagement: {
        ...defaults.settings.enabledManagement,
        ...(data.settings?.enabledManagement || {}),
      },
    },
  };
}

async function saveStateToFirebase() {
  const user = getCurrentFirebaseUser();
  if (!user) return;

  await saveUserState(user.uid, {
    ...state,
    ownerUid: user.uid,
    profile: {
      ...(state.profile || {}),
      name: resolveProfileName(state.profile?.name, user.displayName),
      email: user.email || "",
    },
  });
}

function saveState() {
  saveStateToFirebase().catch((error) => {
    console.error("Firebase 저장 실패:", error);
    showToast("Firebase 저장 중 문제가 생겼어요.");
  });
}

function readAuthAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || "[]");
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function writeAuthAccounts(accounts) {
  localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function hashPassword(password) {
  if (!window.crypto?.subtle) throw new Error("이 브라우저에서는 안전한 비밀번호 처리를 지원하지 않아요.");
  const bytes = new TextEncoder().encode(`moa-local-auth:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setAuthHint(message, isError = false) {
  const target = document.getElementById("authFormHint");
  target.textContent = message;
  target.classList.toggle("error", isError);
}

function showAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "login";
  const isSignup = authMode === "signup";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === authMode);
  });
  document.getElementById("authNameField").classList.toggle("hidden", !isSignup);
  document.getElementById("authNameInput").required = isSignup;
  document.getElementById("authPasswordInput").autocomplete = isSignup ? "new-password" : "current-password";
  document.getElementById("authTitle").textContent = isSignup ? "처음 만나는 모아예요" : "다시 만나서 반가워요";
  document.getElementById("authDescription").textContent = isSignup
    ? "이메일, 이름, 비밀번호만으로 시작할 수 있어요."
    : "이메일과 비밀번호로 로그인해주세요.";
  document.getElementById("authSubmitBtn").textContent = isSignup ? "회원가입하고 시작하기" : "로그인";
  document.getElementById("authSwitchText").textContent = isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?";
  document.getElementById("authSwitchBtn").textContent = isSignup ? "로그인" : "회원가입";
  document.getElementById("authNameInput").value = "";
  document.getElementById("authPasswordInput").value = "";
  setAuthHint("");
}

function setAuthBusy(busy) {
  const button = document.getElementById("authSubmitBtn");
  button.disabled = busy;
  if (busy) button.textContent = authMode === "signup" ? "계정을 만들고 있어요…" : "확인하고 있어요…";
  else button.textContent = authMode === "signup" ? "회원가입하고 시작하기" : "로그인";
}

async function openAppForFirebaseUser(user) {
  const pendingProfile = readPendingSignupProfile(user.email);

  currentUser = {
    uid: user.uid,
    name: resolveProfileName(pendingProfile?.name, user.displayName),
    email: user.email || pendingProfile?.email || "",
  };

  state = await loadStateFromFirebase(user);
  const profileName = resolveProfileName(pendingProfile?.name, user.displayName, state.profile?.name, currentUser.name);
  currentUser.name = profileName;
  state.profile = {
    ...(state.profile || {}),
    name: profileName,
    email: currentUser.email,
  };

  if (profileName && profileName !== "사용자") {
    await saveStateToFirebase();
    clearPendingSignupProfile(currentUser.email);
  }

  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  renderAll();

  const hashPage = window.location.hash.slice(1);
  showPage(document.getElementById(`${hashPage}Page`) ? hashPage : state.settings.startPage || "dashboard");
}

async function logout() {
  try {
    await logoutFirebase();
  } catch (error) {
    console.error("Firebase 로그아웃 실패:", error);
    showToast("로그아웃 중 문제가 생겼어요.");
  }
}

async function deleteAccount() {
  const user = getCurrentFirebaseUser();
  if (!user) {
    showToast("로그인 정보를 찾을 수 없어요.");
    return;
  }

  const firstConfirm = window.confirm(
    "정말 회원탈퇴할까요? Firebase 계정과 저장된 가계부 데이터가 모두 삭제되며 복구할 수 없어요."
  );
  if (!firstConfirm) return;

  const typed = window.prompt("마지막 확인이에요. 회원탈퇴를 입력하면 계정 삭제를 진행합니다.");
  if (typed !== "회원탈퇴") {
    showToast("회원탈퇴가 취소됐어요.");
    return;
  }

  try {
    await deleteUserState(user.uid);
    await deleteUserBackup(user.uid);
    await deleteFirebaseAccount();

    currentUser = null;
    state = createDefaultState();
    resetRuntimeFilters();
    setProfilePopover(false);
    showToast("회원탈퇴가 완료됐어요.");
  } catch (error) {
    console.error("회원탈퇴 실패:", error);
    showToast(getFirebaseAuthMessage(error));
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("authNameInput").value.trim();
  const emailInput = document.getElementById("authEmailInput");
  const email = normalizeEmail(emailInput.value);
  const password = document.getElementById("authPasswordInput").value;
  const isSignup = authMode === "signup";

  if (isSignup && !name) {
    setAuthHint("본인 이름을 입력해주세요.", true);
    return;
  }
  if (!email || !emailInput.checkValidity()) {
    setAuthHint("올바른 이메일 주소를 입력해주세요.", true);
    return;
  }
  if (password.length < 8) {
    setAuthHint("비밀번호는 8자 이상 입력해주세요.", true);
    return;
  }

  setAuthBusy(true);
  try {
    if (isSignup) {
      rememberPendingSignupProfile(email, name);
      const user = await signUpWithEmail({ name, email, password });

      currentUser = { uid: user.uid, name, email };
      state = createBlankState({ name, email });
      state.profile = { name, email };
      await saveStateToFirebase();
      clearPendingSignupProfile(email);
      showToast(`${name}님, 모아에 오신 걸 환영해요.`);
      return;
    }

    const user = await loginWithEmail({ email, password });
    showToast(`${resolveProfileName(user.displayName)}님, 다시 만나서 반가워요.`);
  } catch (error) {
    console.error("Firebase 인증 실패:", error);
    setAuthHint(getFirebaseAuthMessage(error), true);
  } finally {
    setAuthBusy(false);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatWon(value, forceFull = false) {
  const amount = Number(value || 0);
  if (!forceFull && state.settings.amountDisplay === "compact") {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(abs % 100000000 ? 1 : 0)}억원`;
    if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatSignedWon(value) {
  const amount = Number(value || 0);
  if (amount === 0) return "0원";
  return `${amount > 0 ? "+" : "−"}${formatWon(Math.abs(amount))}`;
}

function formatDate(dateString, options = {}) {
  const date = new Date(`${dateString}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", options).format(date);
}

function formatMonth(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function getAccount(id) {
  return state.accounts.find((account) => account.id === id);
}

function getCategory(id) {
  return state.categories.find((category) => category.id === id);
}

function categoryManagementKey(category) {
  if (!category) return "";
  if (category.type === "expense") {
    if (category.group === "fixed") return "fixedExpense";
    if (category.group === "subscription") return "subscription";
    return "variableExpense";
  }
  return category.type;
}

function isManagementEnabled(key) {
  return Boolean(state.settings.enabledManagement?.[key]);
}

function isCategoryEnabled(category) {
  return category?.enabled !== false && isManagementEnabled(categoryManagementKey(category));
}

function enabledTransactionTypes() {
  const types = new Set(["transfer"]);
  Object.entries(MANAGEMENT_ITEMS).forEach(([key, item]) => {
    if (isManagementEnabled(key)) types.add(item.type);
  });
  return TRANSACTION_TYPE_ORDER.filter((type) => types.has(type));
}

function isTransactionEnabled(transaction) {
  if (transaction.type === "transfer") return true;
  const category = getCategory(transaction.categoryId);
  if (category) return isCategoryEnabled(category);
  return Object.entries(MANAGEMENT_ITEMS).some(([key, item]) => item.type === transaction.type && isManagementEnabled(key));
}

function managementLabelForCategory(category) {
  return MANAGEMENT_ITEMS[categoryManagementKey(category)]?.categoryLabel || TYPE_META[category?.type]?.label || "기타";
}

function recurringManagementKey(type) {
  return type === "fixed" ? "fixedExpense" : type;
}

function monthTransactions(month = viewedMonth) {
  return state.transactions.filter((transaction) => transaction.date.startsWith(month));
}

function sumByType(type, month = viewedMonth) {
  return monthTransactions(month)
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function sumVisibleByType(type, month = viewedMonth) {
  return monthTransactions(month)
    .filter((transaction) => transaction.type === type && isTransactionEnabled(transaction))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function shiftMonthKey(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyFlow(month) {
  const income = sumVisibleByType("income", month);
  const expense = sumVisibleByType("expense", month);
  const saving = sumVisibleByType("saving", month);
  const budget = totalExpenseBudget();
  return {
    month,
    income,
    expense,
    saving,
    budget,
    expenseRate: income ? Math.round((expense / income) * 100) : 0,
    savingRate: income ? Math.round((saving / income) * 100) : 0,
    remaining: income - expense - saving,
    budgetRate: budget ? Math.round((expense / budget) * 100) : 0,
    budgetRemaining: budget - expense,
  };
}

function totalAssets() {
  return state.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
}

function totalSavings() {
  return state.transactions
    .filter((transaction) => transaction.type === "saving")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function totalExpenseBudget() {
  return state.categories
    .filter((category) => category.type === "expense" && isCategoryEnabled(category))
    .reduce((sum, category) => sum + Number(category.budget || 0), 0);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

function setHint(id, message, isError = false) {
  const target = document.getElementById(id);
  target.textContent = message;
  target.classList.toggle("error", isError);
  if (message) setTimeout(() => {
    if (target.textContent === message) target.textContent = "";
  }, 3200);
}

function optionHtml(value, label, selected = false) {
  return `<option value="${escapeHtml(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderAccountOptions() {
  const primary = state.accounts.find((account) => account.primary) || state.accounts[0];
  const accountOptions = state.accounts
    .map((account) => optionHtml(account.id, `${account.name} · ${account.bank}`, account.id === primary?.id))
    .join("");
  const accountOptionsWithNone = `<option value="">연결 안 함</option>${state.accounts
    .map((account) => optionHtml(account.id, `${account.name} · ${account.bank}`))
    .join("")}`;

  ["transactionAccountInput", "transactionTargetAccountInput", "recurringAccountInput"].forEach((id) => {
    const select = document.getElementById(id);
    const current = select.value;
    select.innerHTML = accountOptions || `<option value="">계좌를 먼저 추가해주세요</option>`;
    if (state.accounts.some((account) => account.id === current)) select.value = current;
  });

  const categoryAccountInput = document.getElementById("categoryAccountInput");
  const currentCategoryAccount = categoryAccountInput.value;
  categoryAccountInput.innerHTML = accountOptionsWithNone;
  if (state.accounts.some((account) => account.id === currentCategoryAccount)) {
    categoryAccountInput.value = currentCategoryAccount;
  }
}

function renderDashboard() {
  const dashboardMonth = TODAY.toISOString().slice(0, 7);
  const income = sumVisibleByType("income", dashboardMonth);
  const expense = sumVisibleByType("expense", dashboardMonth);
  const savings = sumVisibleByType("saving", dashboardMonth);
  const budget = totalExpenseBudget();
  const budgetRate = budget ? Math.round((expense / budget) * 100) : 0;
  const targetSavingAmount = Number(state.settings.targetSavingAmount || 0);
  const targetSavingRate = Number(state.settings.targetSavingRate || 0);
  const targetSavingByRate = income && targetSavingRate ? Math.round(income * (targetSavingRate / 100)) : 0;
  const activeSavingTarget = targetSavingAmount || targetSavingByRate;
  const savingRate = activeSavingTarget
    ? Math.round((savings / activeSavingTarget) * 100)
    : income ? Math.round((savings / income) * 100) : 0;

  document.getElementById("totalAsset").textContent = formatWon(totalAssets());
  document.getElementById("totalSavings").textContent = formatWon(totalSavings());
  document.getElementById("monthlyIncome").textContent = formatWon(income);
  document.getElementById("monthlyExpense").textContent = formatWon(expense);

  document.getElementById("budgetRate").textContent = `${budgetRate}%`;
  document.getElementById("budgetSpent").textContent = formatWon(expense);
  document.getElementById("budgetTotal").textContent = formatWon(budget);
  document.getElementById("budgetDonut").style.setProperty("--progress", `${Math.min(budgetRate, 100) * 3.6}deg`);
  document.getElementById("budgetGuide").textContent = budgetRate > 100
    ? `예산보다 ${formatWon(expense - budget)} 더 사용했어요.`
    : `예산이 ${formatWon(Math.max(budget - expense, 0))} 남았어요.`;
  document.getElementById("budgetStatusBadge").textContent = budgetRate >= 100 ? "초과" : budgetRate >= 80 ? "주의" : "안정적";
  document.getElementById("budgetStatusBadge").classList.toggle("warning", budgetRate >= 80);

  document.getElementById("savingRate").textContent = `${savingRate}%`;
  document.getElementById("monthlySavings").textContent = formatWon(savings);
  document.getElementById("savingCompareLabel").textContent = activeSavingTarget
    ? targetSavingAmount ? "목표 저축액" : `월 목표 ${targetSavingRate}%`
    : "이번 달 수입";
  document.getElementById("savingIncome").textContent = formatWon(activeSavingTarget || income);
  document.getElementById("savingDonut").style.setProperty("--progress", `${Math.min(savingRate, 100) * 3.6}deg`);
  document.getElementById("savingGuide").textContent = activeSavingTarget
    ? savings >= activeSavingTarget
      ? `목표보다 ${formatWon(savings - activeSavingTarget)} 더 저축했어요.`
      : `목표까지 ${formatWon(activeSavingTarget - savings)} 남았어요.`
    : savingRate >= 20
      ? `권장 저축 비율 20%를 ${savingRate - 20}%p 넘었어요.`
      : `권장 저축 비율 20%까지 ${20 - savingRate}%p 남았어요.`;
  document.getElementById("savingStatusBadge").textContent = activeSavingTarget
    ? savings >= activeSavingTarget ? "목표 달성" : "목표 진행"
    : savingRate >= 20 ? "좋은 흐름" : "조금 더";

  renderMonthlyCards();
  renderWeeklyCards();
  renderRecentTransactions();
  renderUpcoming();
  applyDashboardVisibility();
  applyManagementVisibility();
}

function renderMonthlyCards() {
  const target = document.getElementById("monthlyCards");
  const currentMonth = TODAY.toISOString().slice(0, 7);
  const baseMonth = state.settings.analysisBaseMonth || currentMonth;
  const defaultCompareMonth = shiftMonthKey(baseMonth, -1);
  const defaultThirdMonth = shiftMonthKey(baseMonth, -2);
  const compareMonth = state.settings.monthlyCompareCustomized
    ? (state.settings.analysisCompareMonth || defaultCompareMonth)
    : defaultCompareMonth;
  const thirdMonth = state.settings.monthlyThirdCustomized
    ? (state.settings.analysisThirdMonth || defaultThirdMonth)
    : defaultThirdMonth;
  state.settings.analysisBaseMonth = baseMonth;
  state.settings.analysisCompareMonth = compareMonth;
  state.settings.analysisThirdMonth = thirdMonth;
  document.getElementById("monthlyBaseInput").value = baseMonth;
  document.getElementById("monthlyCompareInput").value = compareMonth;
  document.getElementById("monthlyThirdInput").value = thirdMonth;

  const periods = [
    { month: baseMonth, role: "1번째 월" },
    { month: compareMonth, role: "2번째 월" },
    { month: thirdMonth, role: "3번째 월" },
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.month === item.month) === index);

  if (expandedMonthlyCard && !periods.some((period) => period.month === expandedMonthlyCard)) {
    expandedMonthlyCard = "";
  }

  const detailPeriod = periods.find((period) => period.month === expandedMonthlyCard);
  const detailHtml = detailPeriod ? monthlyDetailPanelHtml(detailPeriod.month) : "";
  target.innerHTML = `${periods.map((period) => monthlyCardHtml(period.month, period.role)).join("")}${detailHtml}`;
}

function monthlyDetailPanelHtml(month) {
  const flow = monthlyFlow(month);
  return `
    <div class="period-detail-panel monthly-detail-panel">
      ${periodDetailHtml({
        label: formatMonth(month),
        income: flow.income,
        expense: flow.expense,
        saving: flow.saving,
        budget: flow.budget,
        budgetRemaining: flow.budgetRemaining,
        transactions: monthTransactions(month).filter(isTransactionEnabled),
      })}
    </div>
  `;
}

function monthlyCardHtml(month, role) {
  const flow = monthlyFlow(month);
  const currentMonth = TODAY.toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const ringBase = flow.income || flow.expense + flow.saving;
  const expenseEnd = ringBase ? Math.min((flow.expense / ringBase) * 360, 360) : 0;
  const savingEnd = ringBase ? Math.min(expenseEnd + (flow.saving / ringBase) * 360, 360) : 0;
  const hasData = flow.income + flow.expense + flow.saving > 0;
  const expenseRateLabel = flow.income ? `${flow.expenseRate}%` : "—";
  const savingRateLabel = flow.income ? `${flow.savingRate}%` : "—";
  const expanded = expandedMonthlyCard === month;
  return `
    <article class="monthly-flow-card ${month === currentMonth ? "current" : ""} ${hasData ? "" : "empty"} ${expanded ? "expanded" : ""}">
      <button class="period-card-toggle" type="button" data-month-card="${month}" aria-expanded="${expanded}" aria-label="${year}년 ${monthNumber}월 상세 보기">
        <div class="monthly-card-head">
          <div><span>${year}년</span><strong>${monthNumber}월</strong></div>
          <em>${escapeHtml(role)}${month === currentMonth ? " · 이번 달" : ""}</em>
        </div>
        <div class="monthly-ring" style="--expense-end:${expenseEnd}deg; --saving-end:${savingEnd}deg">
          <div class="monthly-ring-center">
            <small>전체 수입</small>
            <strong>${formatWon(flow.income)}</strong>
          </div>
        </div>
        <div class="monthly-flow-values">
          <div><span><i class="expense-dot"></i>지출 <b>${expenseRateLabel}</b></span><strong>${formatWon(flow.expense)}</strong></div>
          <div><span><i class="saving-dot"></i>저축 <b>${savingRateLabel}</b></span><strong>${formatWon(flow.saving)}</strong></div>
        </div>
        <div class="period-budget-progress">
          <div><span>월 예산 사용</span><strong>${formatWon(flow.expense)} / ${formatWon(flow.budget)}</strong></div>
          <div class="progress-track"><i class="${flow.budgetRate >= 100 ? "over" : ""}" style="width:${Math.min(flow.budgetRate, 100)}%"></i></div>
        </div>
        <div class="monthly-card-foot ${flow.budgetRemaining < 0 ? "negative" : ""}">
          <span>남은 월 예산</span><strong>${formatWon(flow.budgetRemaining)}</strong>
        </div>
        <span class="period-expand-label">${expanded ? "상세 닫기" : "상세 보기"}</span>
      </button>
    </article>
  `;
}

function getMonthWeeks(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const weeks = [];
  let startDay = 1;
  let index = 1;

  while (startDay <= daysInMonth) {
    const startDate = new Date(year, monthNumber - 1, startDay);
    const daysSinceMonday = (startDate.getDay() + 6) % 7;
    const endDay = Math.min(startDay + (6 - daysSinceMonday), daysInMonth);
    weeks.push({
      key: `${month}-w${index}`,
      index,
      month,
      startDay,
      endDay,
      days: endDay - startDay + 1,
      daysInMonth,
      startDate: `${month}-${String(startDay).padStart(2, "0")}`,
      endDate: `${month}-${String(endDay).padStart(2, "0")}`,
      label: `${index}주차`,
      dateLabel: `${monthNumber}월 ${startDay}일 – ${endDay}일`,
    });
    startDay = endDay + 1;
    index += 1;
  }
  return weeks;
}

function weeklyFlow(month, week) {
  const transactions = state.transactions.filter((item) =>
    item.date >= week.startDate && item.date <= week.endDate && isTransactionEnabled(item)
  );
  const sum = (type) => transactions
    .filter((item) => item.type === type)
    .reduce((total, item) => total + Number(item.amount), 0);
  const income = sum("income");
  const expense = sum("expense");
  const saving = sum("saving");
  const budget = Math.round(totalExpenseBudget() * (week.days / week.daysInMonth));
  return {
    ...week,
    transactions,
    income,
    expense,
    saving,
    budget,
    budgetRate: budget ? Math.round((expense / budget) * 100) : 0,
    budgetRemaining: budget - expense,
  };
}

function getDefaultWeekKey(month, preferredIndex = null) {
  const weeks = getMonthWeeks(month);
  const todayKey = TODAY.toISOString().slice(0, 10);
  const currentWeek = weeks.find((week) => todayKey >= week.startDate && todayKey <= week.endDate);
  if (preferredIndex) return weeks.find((week) => week.index === preferredIndex)?.key || weeks.at(-1)?.key || "";
  if (month === TODAY.toISOString().slice(0, 7) && currentWeek) return currentWeek.key;
  return weeks.at(-1)?.key || "";
}

function weekOptionsHtml(month) {
  return getMonthWeeks(month).map((week) => optionHtml(week.key, `${week.label} · ${week.dateLabel}`)).join("");
}

function renderWeeklyCards() {
  const currentMonth = TODAY.toISOString().slice(0, 7);
  const legacyMonth = state.settings.analysisWeekMonth || currentMonth;
  const baseMonth = state.settings.analysisWeekBaseMonth || legacyMonth;
  const compareMonth = state.settings.analysisWeekCompareMonth || shiftMonthKey(baseMonth, -1);
  const baseWeeks = getMonthWeeks(baseMonth);
  const compareWeeks = getMonthWeeks(compareMonth);

  let baseKey = state.settings.analysisWeekBase;
  if (!baseWeeks.some((week) => week.key === baseKey)) baseKey = getDefaultWeekKey(baseMonth);
  const baseWeek = baseWeeks.find((week) => week.key === baseKey) || baseWeeks.at(-1);

  let compareKey = state.settings.analysisWeekCompare;
  if (!compareWeeks.some((week) => week.key === compareKey)) compareKey = getDefaultWeekKey(compareMonth, baseWeek?.index);
  const compareWeek = compareWeeks.find((week) => week.key === compareKey) || compareWeeks.at(-1);

  state.settings.analysisWeekMonth = baseMonth;
  state.settings.analysisWeekBaseMonth = baseMonth;
  state.settings.analysisWeekCompareMonth = compareMonth;
  state.settings.analysisWeekBase = baseWeek?.key || "";
  state.settings.analysisWeekCompare = compareWeek?.key || "";

  document.getElementById("weeklyBaseMonthInput").value = baseMonth;
  document.getElementById("weeklyCompareMonthInput").value = compareMonth;
  document.getElementById("weeklyBaseInput").innerHTML = weekOptionsHtml(baseMonth);
  document.getElementById("weeklyCompareInput").innerHTML = weekOptionsHtml(compareMonth);
  document.getElementById("weeklyBaseInput").value = state.settings.analysisWeekBase;
  document.getElementById("weeklyCompareInput").value = state.settings.analysisWeekCompare;

  const selected = [
    { month: baseMonth, week: baseWeek, role: "기준 주" },
    { month: compareMonth, week: compareWeek, role: "비교 주" },
  ].filter((item) => item.week);

  if (expandedWeeklyCard && !selected.some((item) => `${item.month}:${item.week.key}` === expandedWeeklyCard)) {
    expandedWeeklyCard = "";
  }

  const detail = selected.find(({ month, week }) => `${month}:${week.key}` === expandedWeeklyCard);
  const detailHtml = detail ? weeklyDetailPanelHtml(detail.month, detail.week) : "";
  document.getElementById("weeklyCards").innerHTML = `${selected
    .map(({ month, week, role }) => weeklyCardHtml(month, week, role))
    .join("")}${detailHtml}`;
}

function weeklyDetailPanelHtml(month, week) {
  const flow = weeklyFlow(month, week);
  return `
    <div class="period-detail-panel weekly-detail-panel">
      ${periodDetailHtml({
        label: `${formatMonth(month)} ${week.label}`,
        income: flow.income,
        expense: flow.expense,
        saving: flow.saving,
        budget: flow.budget,
        budgetRemaining: flow.budgetRemaining,
        transactions: flow.transactions,
      })}
    </div>
  `;
}

function weeklyCardHtml(month, week, role) {
  const flow = weeklyFlow(month, week);
  const isCurrent = TODAY.toISOString().slice(0, 10) >= week.startDate && TODAY.toISOString().slice(0, 10) <= week.endDate;
  const expanded = expandedWeeklyCard === `${month}:${week.key}`;
  return `
    <article class="weekly-flow-card ${isCurrent ? "current" : ""} ${expanded ? "expanded" : ""}">
      <button class="period-card-toggle" type="button" data-week-card="${escapeHtml(week.key)}" data-week-month="${escapeHtml(month)}" aria-expanded="${expanded}">
        <div class="weekly-card-head">
          <div><span>${escapeHtml(role)}${isCurrent ? " · 이번 주" : ""}</span><h3>${escapeHtml(week.label)}</h3><p>${escapeHtml(week.dateLabel)}</p></div>
          <i>${expanded ? "상세 닫기" : "상세 보기 →"}</i>
        </div>
        <div class="weekly-metrics">
          <div><span>수입</span><strong class="income">${formatWon(flow.income)}</strong></div>
          <div><span>지출</span><strong class="expense">${formatWon(flow.expense)}</strong></div>
          <div><span>저축</span><strong class="saving">${formatWon(flow.saving)}</strong></div>
        </div>
        <div class="weekly-budget-main">
          <div><span>이번 주 배정 예산</span><strong>${formatWon(flow.budget)}</strong></div>
          <div class="progress-track"><i class="${flow.budgetRate >= 100 ? "over" : ""}" style="width:${Math.min(flow.budgetRate, 100)}%"></i></div>
          <div class="weekly-budget-labels"><span>${flow.budgetRate}% 사용</span><span>${formatWon(flow.expense)} 지출</span></div>
        </div>
        <div class="weekly-remaining ${flow.budgetRemaining < 0 ? "negative" : ""}">
          <span>남은 주 예산</span><strong>${formatWon(flow.budgetRemaining)}</strong>
        </div>
      </button>
    </article>
  `;
}

function periodDetailHtml(period) {
  const expenseItems = period.transactions.filter((item) => item.type === "expense");
  const grouped = new Map();

  expenseItems.forEach((item) => {
    const category = getCategory(item.categoryId);
    const key = category?.id || "uncategorized";
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: category?.name || "기타",
        icon: category?.icon || "•",
        color: category?.color || "sage",
        group: category ? managementLabelForCategory(category) : "지출",
        amount: 0,
      });
    }
    grouped.get(key).amount += Number(item.amount);
  });

  const categories = [...grouped.values()].sort((a, b) => b.amount - a.amount);
  const expenseRate = period.income ? Math.round((period.expense / period.income) * 100) : 0;
  const savingRate = period.income ? Math.round((period.saving / period.income) * 100) : 0;

  const rows = categories.length
    ? categories.map((category) => {
        const rate = period.expense ? Math.round((category.amount / period.expense) * 100) : 0;
        return `
          <div class="period-detail-category-row">
            <span class="category-dot ${escapeHtml(category.color)}">${escapeHtml(category.icon)}</span>
            <div class="period-detail-category-copy">
              <div><p><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.group)}</small></p><p><strong>${formatWon(category.amount)}</strong><small>${rate}%</small></p></div>
              <div class="progress-track"><i style="width:${Math.min(rate, 100)}%"></i></div>
            </div>
          </div>
        `;
      }).join("")
    : emptyState("이 기간에는 등록된 지출이 없어요.");

  return `
    <div class="period-inline-detail">
      <div class="period-detail-head">
        <div><p class="eyebrow">Detail</p><h3>${escapeHtml(period.label)} 상세</h3></div>
        <strong class="expense">${formatWon(period.expense)}</strong>
      </div>
      <div class="period-detail-summary">
        <div class="income-summary"><span>↙</span><p><small>수입</small><strong>${formatWon(period.income)}</strong></p></div>
        <div class="expense-summary"><span>↗</span><p><small>지출${period.income ? ` · 수입 대비 ${expenseRate}%` : ""}</small><strong>${formatWon(period.expense)}</strong></p></div>
        <div class="saving-summary"><span>✦</span><p><small>저축${period.income ? ` · 수입 대비 ${savingRate}%` : ""}</small><strong>${formatWon(period.saving)}</strong></p></div>
        <div class="budget-summary"><span>₩</span><p><small>남은 예산</small><strong>${formatWon(period.budgetRemaining)}</strong></p></div>
      </div>
      <div class="period-detail-breakdown-head">
        <h4>카테고리별 지출</h4>
        <p>선택한 카드 안에서 상세 내역을 바로 확인해요.</p>
      </div>
      <div class="period-detail-category-list">${rows}</div>
    </div>
  `;
}

function renderRecentTransactions() {
  const target = document.getElementById("recentTransactions");
  const items = [...state.transactions]
    .filter(isTransactionEnabled)
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 5);

  if (!items.length) {
    target.innerHTML = emptyState("아직 등록된 거래가 없어요.");
    return;
  }

  target.innerHTML = items.map((item) => {
    const category = getCategory(item.categoryId);
    const account = getAccount(item.accountId);
    const type = TYPE_META[item.type] || TYPE_META.expense;
    const amountClass = type.className;
    const sign = item.type === "income" ? "+" : item.type === "expense" ? "−" : "";
    return `
      <div class="compact-item">
        <span class="category-dot ${escapeHtml(category?.color || "sage")}">${escapeHtml(category?.icon || type.icon)}</span>
        <div class="compact-copy">
          <strong>${escapeHtml(item.memo || category?.name || type.label)}</strong>
          <small>${escapeHtml(category?.name || type.label)} · ${escapeHtml(account?.name || "계좌 없음")}</small>
        </div>
        <div class="compact-amount">
          <strong class="${amountClass}">${sign}${formatWon(item.amount)}</strong>
          <small>${formatDate(item.date, { month: "short", day: "numeric" })}</small>
        </div>
      </div>
    `;
  }).join("");
}

function renderUpcoming() {
  const target = document.getElementById("upcomingList");
  const todayDay = TODAY.getDate();
  const upcoming = state.recurring
    .filter((item) => isManagementEnabled(recurringManagementKey(item.type)) && item.active && Number(item.day || 0) >= todayDay)
    .sort((a, b) => Number(a.day || 99) - Number(b.day || 99))
    .slice(0, 4);

  if (!upcoming.length) {
    target.innerHTML = emptyState("이번 달 남은 자동이체가 없어요.");
    return;
  }

  target.innerHTML = upcoming.map((item) => `
    <div class="upcoming-item">
      <div class="calendar-tile"><small>6월</small><strong>${escapeHtml(item.day)}</strong></div>
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(RECURRING_META[item.type]?.label || "")} · ${escapeHtml(getAccount(item.accountId)?.name || "계좌 없음")}</small></div>
      <strong class="${item.type === "income" ? "income" : "expense"}">${item.type === "income" ? "+" : "−"}${formatWon(item.amount)}</strong>
    </div>
  `).join("");
}

function renderTransactionComposer() {
  const availableTypes = enabledTransactionTypes();
  if (!availableTypes.includes(transactionType)) {
    transactionType = availableTypes.find((type) => type !== "transfer") || "transfer";
  }
  if (transactionFilter !== "all" && !availableTypes.includes(transactionFilter)) transactionFilter = "all";

  document.getElementById("transactionTypeSegment").innerHTML = availableTypes.map((type) => {
    const meta = TYPE_META[type];
    return `<button class="${type === transactionType ? "active" : ""}" type="button" data-type="${escapeHtml(type)}"><span>${escapeHtml(meta.icon)}</span> ${escapeHtml(meta.label)}</button>`;
  }).join("");

  document.getElementById("transactionFilters").innerHTML = [
    `<button class="${transactionFilter === "all" ? "active" : ""}" type="button" data-filter="all">전체</button>`,
    ...availableTypes.map((type) => `<button class="${transactionFilter === type ? "active" : ""}" type="button" data-filter="${escapeHtml(type)}">${escapeHtml(TYPE_META[type].label)}</button>`),
  ].join("");

  const categoryInput = document.getElementById("transactionCategoryInput");
  const currentCategory = categoryInput.value;
  const matchingCategories = state.categories.filter((category) => category.type === transactionType && isCategoryEnabled(category));

  if (transactionType === "transfer") {
    categoryInput.innerHTML = `<option value="">내 계좌 간 이동</option>`;
    categoryInput.disabled = true;
  } else {
    categoryInput.disabled = false;
    categoryInput.innerHTML = matchingCategories.length
      ? matchingCategories.map((category) => optionHtml(
          category.id,
          category.type === "expense" ? `${category.name} · ${managementLabelForCategory(category)}` : category.name,
        )).join("")
      : `<option value="">카테고리를 먼저 추가해주세요</option>`;
    if (matchingCategories.some((category) => category.id === currentCategory)) categoryInput.value = currentCategory;
  }

  document.getElementById("targetAccountField").classList.toggle("hidden", transactionType !== "transfer");
  syncAccountFromCategory();
}

function syncAccountFromCategory() {
  if (transactionType === "transfer") return;
  const category = getCategory(document.getElementById("transactionCategoryInput").value);
  if (category?.accountId && getAccount(category.accountId)) {
    document.getElementById("transactionAccountInput").value = category.accountId;
  }
}

function renderTransactionHistory() {
  const target = document.getElementById("transactionHistory");
  const list = monthTransactions(viewedMonth)
    .filter(isTransactionEnabled)
    .filter((item) => transactionFilter === "all" || item.type === transactionFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.createdAt || 0) - Number(a.createdAt || 0));

  const income = sumVisibleByType("income", viewedMonth);
  const expenses = sumVisibleByType("expense", viewedMonth);
  const savings = sumVisibleByType("saving", viewedMonth);
  document.getElementById("transactionMonthLabel").textContent = formatMonth(viewedMonth);
  document.getElementById("monthNetTotal").textContent = formatSignedWon(income - expenses - savings);

  if (!list.length) {
    target.innerHTML = emptyState("이 달에는 조건에 맞는 거래가 없어요.");
    return;
  }

  const grouped = list.reduce((groups, item) => {
    (groups[item.date] ||= []).push(item);
    return groups;
  }, {});

  target.innerHTML = Object.entries(grouped).map(([date, items]) => `
    <section class="date-group">
      <div class="date-divider">
        <span>${formatDate(date, { month: "long", day: "numeric", weekday: "long" })}</span>
        <i></i>
        <strong>${formatSignedWon(items.reduce((sum, item) => {
          if (item.type === "income") return sum + Number(item.amount);
          if (item.type === "expense" || item.type === "saving") return sum - Number(item.amount);
          return sum;
        }, 0))}</strong>
      </div>
      <div class="transaction-table">
        <div class="transaction-table-head">
          <span>날짜</span><span>카테고리</span><span>사용 통장</span><span>사용 내역</span><span>금액</span><span></span>
        </div>
        ${items.map(transactionRowHtml).join("")}
      </div>
    </section>
  `).join("");
}

function transactionRowHtml(item) {
  const category = getCategory(item.categoryId);
  const account = getAccount(item.accountId);
  const targetAccount = getAccount(item.targetAccountId);
  const meta = TYPE_META[item.type] || TYPE_META.expense;
  const sign = meta.sign || "";
  const transferLabel = item.type === "transfer" && targetAccount ? ` → ${targetAccount.name}` : "";
  return `
    <div class="transaction-row">
      <span class="cell date-cell">${formatDate(item.date, { month: "2-digit", day: "2-digit" })}</span>
      <span class="cell category-cell"><i class="category-mini ${escapeHtml(category?.color || "sage")}">${escapeHtml(category?.icon || meta.icon)}</i><b>${escapeHtml(category?.name || meta.label)}</b></span>
      <span class="cell account-cell">${escapeHtml(account?.name || "계좌 없음")}${escapeHtml(transferLabel)}</span>
      <span class="cell memo-cell"><b>${escapeHtml(item.memo || meta.label)}</b><small>${escapeHtml(meta.label)}</small></span>
      <strong class="cell row-amount ${meta.className}">${sign}${formatWon(item.amount)}</strong>
      <button class="row-delete" type="button" data-delete-transaction="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.memo)} 거래 삭제">×</button>
    </div>
  `;
}

function addTransaction() {
  const date = document.getElementById("transactionDateInput").value;
  const categoryId = document.getElementById("transactionCategoryInput").value;
  const accountId = document.getElementById("transactionAccountInput").value;
  const targetAccountId = document.getElementById("transactionTargetAccountInput").value;
  const memo = document.getElementById("transactionMemoInput").value.trim();
  const amount = Number(document.getElementById("transactionAmountInput").value);

  if (!date || !accountId || !memo || !amount || amount <= 0) {
    setHint("transactionFormHint", "날짜, 사용 통장, 사용 내역과 금액을 모두 입력해주세요.", true);
    return;
  }
  if (transactionType !== "transfer" && !categoryId) {
    setHint("transactionFormHint", "거래에 맞는 카테고리를 선택해주세요.", true);
    return;
  }
  if (transactionType === "transfer" && (!targetAccountId || targetAccountId === accountId)) {
    setHint("transactionFormHint", "서로 다른 보내는 통장과 받는 통장을 선택해주세요.", true);
    return;
  }

  state.transactions.push({
    id: uid("tx"),
    type: transactionType,
    categoryId: transactionType === "transfer" ? "" : categoryId,
    accountId,
    targetAccountId: transactionType === "transfer" ? targetAccountId : "",
    amount,
    memo,
    date,
    createdAt: Date.now(),
  });

  const source = getAccount(accountId);
  if (source && transactionType === "income") source.balance += amount;
  if (source && transactionType === "expense") source.balance -= amount;
  if (source && transactionType === "transfer") source.balance -= amount;
  if (transactionType === "transfer") {
    const target = getAccount(targetAccountId);
    if (target) target.balance += amount;
  }

  saveState();
  viewedMonth = date.slice(0, 7);
  document.getElementById("transactionMemoInput").value = "";
  document.getElementById("transactionAmountInput").value = "";
  renderAll();
  showPage("transactions");
  showToast("거래를 기록했어요.");
}

function removeTransaction(id) {
  const item = state.transactions.find((transaction) => transaction.id === id);
  if (!item) return;

  const source = getAccount(item.accountId);
  if (source && item.type === "income") source.balance -= Number(item.amount);
  if (source && item.type === "expense") source.balance += Number(item.amount);
  if (source && item.type === "transfer") source.balance += Number(item.amount);
  if (item.type === "transfer") {
    const target = getAccount(item.targetAccountId);
    if (target) target.balance -= Number(item.amount);
  }

  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  saveState();
  renderAll();
  showToast("거래를 삭제했어요.");
}

function renderAccounts() {
  document.getElementById("accountCount").textContent = state.accounts.length;
  const target = document.getElementById("accountList");
  if (!state.accounts.length) {
    target.innerHTML = emptyState("등록된 계좌가 없어요. 첫 계좌를 추가해보세요.");
    return;
  }

  target.innerHTML = state.accounts.map((account, index) => `
    <article class="account-card ${account.primary ? "primary-account" : ""}">
      <div class="account-accent accent-${index % 4}"></div>
      <div class="account-card-top">
        <span class="bank-symbol">${escapeHtml(account.bank.slice(0, 1))}</span>
        <div class="account-actions">
          ${account.primary ? `<span class="primary-label">주 사용</span>` : `<button type="button" data-primary-account="${escapeHtml(account.id)}">주 사용으로</button>`}
          <button class="more-delete" type="button" data-delete-account="${escapeHtml(account.id)}" aria-label="${escapeHtml(account.name)} 삭제">×</button>
        </div>
      </div>
      <div class="account-info">
        <p>${escapeHtml(account.bank)}</p>
        <h3>${escapeHtml(account.name)}</h3>
        <strong>${formatWon(account.balance)}</strong>
        <small>등록 기본 잔액 ${formatWon(account.initialBalance ?? account.balance)}</small>
      </div>
    </article>
  `).join("");
}

function addAccount() {
  const name = document.getElementById("accountNameInput").value.trim();
  const bank = document.getElementById("accountBankInput").value;
  const balance = Number(document.getElementById("accountBalanceInput").value || 0);
  const primary = document.getElementById("accountPrimaryInput").checked || state.accounts.length === 0;

  if (!name || !bank || balance < 0) {
    setHint("accountFormHint", "계좌 이름과 은행, 올바른 기본 잔액을 입력해주세요.", true);
    return;
  }
  if (primary) state.accounts.forEach((account) => { account.primary = false; });
  state.accounts.push({ id: uid("acc"), name, bank, balance, initialBalance: balance, primary });
  saveState();
  document.getElementById("accountNameInput").value = "";
  document.getElementById("accountBalanceInput").value = "";
  document.getElementById("accountPrimaryInput").checked = false;
  renderAll();
  showToast("새 계좌를 추가했어요.");
}

function setPrimaryAccount(id) {
  state.accounts.forEach((account) => { account.primary = account.id === id; });
  saveState();
  renderAll();
  showToast("주 사용 계좌를 변경했어요.");
}

function removeAccount(id) {
  if (state.accounts.length <= 1) {
    showToast("계좌는 최소 한 개가 필요해요.");
    return;
  }
  const used = state.transactions.some((item) => item.accountId === id || item.targetAccountId === id);
  if (used) {
    showToast("거래 내역이 연결된 계좌는 삭제할 수 없어요.");
    return;
  }
  const wasPrimary = getAccount(id)?.primary;
  state.accounts = state.accounts.filter((account) => account.id !== id);
  state.categories.forEach((category) => {
    if (category.accountId === id) category.accountId = "";
  });
  state.recurring.forEach((item) => {
    if (item.accountId === id) item.accountId = "";
  });
  if (wasPrimary && state.accounts[0]) state.accounts[0].primary = true;
  saveState();
  renderAll();
  showToast("계좌를 삭제했어요.");
}

function renderCategories() {
  const enabledKeys = Object.keys(MANAGEMENT_ITEMS).filter(isManagementEnabled);
  if (categoryFilter !== "all" && !enabledKeys.includes(categoryFilter)) categoryFilter = "all";

  const categoryTypeInput = document.getElementById("categoryTypeInput");
  const currentTypeOption = categoryTypeInput.value;
  categoryTypeInput.innerHTML = enabledKeys.length
    ? enabledKeys.map((key) => optionHtml(key, MANAGEMENT_ITEMS[key].categoryLabel)).join("")
    : `<option value="">설정에서 관리 항목을 먼저 선택해주세요</option>`;
  if (enabledKeys.includes(currentTypeOption)) categoryTypeInput.value = currentTypeOption;

  document.getElementById("categoryTabs").innerHTML = [
    `<button class="${categoryFilter === "all" ? "active" : ""}" type="button" data-category-filter="all">전체</button>`,
    ...enabledKeys.map((key) => `<button class="${categoryFilter === key ? "active" : ""}" type="button" data-category-filter="${escapeHtml(key)}">${escapeHtml(MANAGEMENT_ITEMS[key].categoryLabel)}</button>`),
  ].join("");

  const visibleCategories = state.categories.filter(isCategoryEnabled);
  const items = visibleCategories.filter((category) => categoryFilter === "all" || categoryManagementKey(category) === categoryFilter);
  const target = document.getElementById("categoryList");
  const expense = sumVisibleByType("expense", TODAY.toISOString().slice(0, 7));
  const budget = totalExpenseBudget();

  document.getElementById("categoryCount").textContent = visibleCategories.length;
  document.getElementById("categoryBudgetTotal").textContent = formatWon(budget);
  document.getElementById("categorySpentTotal").textContent = formatWon(expense);
  document.getElementById("categoryRemainingTotal").textContent = formatWon(Math.max(budget - expense, 0));

  if (!items.length) {
    target.innerHTML = emptyState("이 종류의 카테고리가 아직 없어요.");
    return;
  }

  target.innerHTML = items.map((category) => {
    const spent = state.transactions
      .filter((item) => item.date.startsWith(TODAY.toISOString().slice(0, 7)) && item.categoryId === category.id)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const rate = category.budget ? Math.round((spent / category.budget) * 100) : 0;
    return `
      <article class="category-card">
        <div class="category-card-top">
          <span class="category-large ${escapeHtml(category.color)}">${escapeHtml(category.icon)}</span>
          <div><span class="type-label ${escapeHtml(category.type)}">${escapeHtml(managementLabelForCategory(category))}</span><h3>${escapeHtml(category.name)}</h3></div>
          <button class="more-delete" type="button" data-delete-category="${escapeHtml(category.id)}" aria-label="${escapeHtml(category.name)} 삭제">×</button>
        </div>
        <div class="category-card-body">
          <label><span>월 예산</span><div class="mini-input"><input type="number" min="0" step="1000" value="${Number(category.budget || 0)}" data-category-budget="${escapeHtml(category.id)}" /><b>원</b></div></label>
          <label><span>연결 계좌</span><select data-category-account="${escapeHtml(category.id)}">
            <option value="">연결 안 함</option>
            ${state.accounts.map((account) => optionHtml(account.id, account.name, account.id === category.accountId)).join("")}
          </select></label>
        </div>
        <div class="category-progress">
          <div><span>이번 달 ${category.type === "expense" ? "사용" : "누적"}</span><strong>${formatWon(spent)} ${category.budget ? `· ${rate}%` : ""}</strong></div>
          <div class="progress-track"><i style="width:${Math.min(rate, 100)}%" class="${rate >= 100 ? "over" : ""}"></i></div>
        </div>
      </article>
    `;
  }).join("");
}

function addCategory() {
  const name = document.getElementById("categoryNameInput").value.trim();
  const managementKey = document.getElementById("categoryTypeInput").value;
  const managementItem = MANAGEMENT_ITEMS[managementKey];
  const budget = Number(document.getElementById("categoryBudgetInput").value || 0);
  const accountId = document.getElementById("categoryAccountInput").value;

  if (!name || !managementItem || !isManagementEnabled(managementKey) || budget < 0) {
    setHint("categoryFormHint", "카테고리 이름과 올바른 예산을 입력해주세요.", true);
    return;
  }
  if (state.categories.some((category) => categoryManagementKey(category) === managementKey && category.name === name)) {
    setHint("categoryFormHint", "같은 종류에 이미 같은 이름의 카테고리가 있어요.", true);
    return;
  }

  state.categories.push({
    id: uid("cat"),
    name,
    type: managementItem.type,
    group: managementItem.group || "",
    budget,
    accountId,
    enabled: true,
    icon: CATEGORY_ICONS[state.categories.length % CATEGORY_ICONS.length],
    color: CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length],
  });
  saveState();
  document.getElementById("categoryNameInput").value = "";
  document.getElementById("categoryBudgetInput").value = "";
  renderAll();
  showToast("새 카테고리를 추가했어요.");
}

function removeCategory(id) {
  if (state.transactions.some((item) => item.categoryId === id)) {
    showToast("거래 내역이 연결된 카테고리는 삭제할 수 없어요.");
    return;
  }
  state.categories = state.categories.filter((category) => category.id !== id);
  saveState();
  renderAll();
  showToast("카테고리를 삭제했어요.");
}

function updateCategorySetting(id, field, value) {
  const category = getCategory(id);
  if (!category) return;
  category[field] = field === "budget" ? Number(value || 0) : value;
  saveState();
  renderDashboard();
  renderCategories();
}

function renderRecurring() {
  const availableTypes = Object.keys(RECURRING_META).filter((type) => isManagementEnabled(recurringManagementKey(type)));
  if (!availableTypes.includes(recurringType)) recurringType = availableTypes[0] || "income";
  document.getElementById("recurringCount").textContent = state.recurring.filter((item) => availableTypes.includes(item.type)).length;

  Object.entries(RECURRING_META).forEach(([type, meta]) => {
    const target = document.getElementById(meta.target);
    const items = state.recurring
      .filter((item) => item.type === type)
      .sort((a, b) => Number(a.day || 99) - Number(b.day || 99));
    target.innerHTML = items.length ? items.map(recurringItemHtml).join("") : emptyState("등록된 일정이 없어요.");
  });

  document.querySelectorAll("#recurringTypeSegment button").forEach((button) => {
    button.classList.toggle("hidden", !availableTypes.includes(button.dataset.recurringType));
    button.classList.toggle("active", button.dataset.recurringType === recurringType);
  });
  document.getElementById("recurringIncomeGroup").classList.toggle("hidden", !availableTypes.includes("income"));
  document.getElementById("recurringFixedGroup").classList.toggle("hidden", !availableTypes.includes("fixed"));
  document.getElementById("recurringSubscriptionGroup").classList.toggle("hidden", !availableTypes.includes("subscription"));
  document.getElementById("addRecurringBtn").disabled = availableTypes.length === 0;
}

function recurringItemHtml(item) {
  const meta = RECURRING_META[item.type];
  return `
    <div class="recurring-item ${item.active ? "" : "paused"}">
      <div class="recurring-date"><strong>${item.day ? item.day : "—"}</strong><small>${item.day ? "매월" : "미정"}</small></div>
      <div class="recurring-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(getAccount(item.accountId)?.name || "연결 계좌 없음")}</small></div>
      <div class="recurring-price"><strong>${item.type === "income" ? "+" : "−"}${formatWon(item.amount)}</strong><small>${escapeHtml(meta.label)}</small></div>
      <label class="mini-toggle" title="자동이체 활성화">
        <input type="checkbox" data-toggle-recurring="${escapeHtml(item.id)}" ${item.active ? "checked" : ""} />
        <i></i>
      </label>
      <button class="more-delete" type="button" data-delete-recurring="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} 삭제">×</button>
    </div>
  `;
}

function addRecurring() {
  const name = document.getElementById("recurringNameInput").value.trim();
  const amount = Number(document.getElementById("recurringAmountInput").value);
  const dayValue = document.getElementById("recurringDayInput").value;
  const accountId = document.getElementById("recurringAccountInput").value;

  if (!isManagementEnabled(recurringManagementKey(recurringType))) {
    setHint("recurringFormHint", "설정에서 이 관리 항목을 먼저 켜주세요.", true);
    return;
  }
  if (!name || !amount || amount <= 0 || !accountId) {
    setHint("recurringFormHint", "이름, 금액과 연결 계좌를 입력해주세요.", true);
    return;
  }
  if (recurringType !== "income" && !dayValue) {
    setHint("recurringFormHint", "고정비와 구독 서비스는 결제일을 선택해주세요.", true);
    return;
  }

  state.recurring.push({
    id: uid("rec"),
    type: recurringType,
    name,
    amount,
    day: dayValue ? Number(dayValue) : null,
    accountId,
    active: true,
  });
  saveState();
  document.getElementById("recurringNameInput").value = "";
  document.getElementById("recurringAmountInput").value = "";
  renderAll();
  showToast("자동이체 일정을 추가했어요.");
}

function removeRecurring(id) {
  state.recurring = state.recurring.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast("자동이체 일정을 삭제했어요.");
}

function toggleRecurring(id, checked) {
  const item = state.recurring.find((entry) => entry.id === id);
  if (!item) return;
  item.active = checked;
  saveState();
  renderDashboard();
  renderRecurring();
}

function profileDisplayName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "사용자";
  if (!trimmed.includes(" ") && trimmed.length >= 3 && trimmed.length <= 4) return trimmed.slice(1);
  return trimmed.split(/\s+/)[0];
}

function profileAvatarText(name) {
  const displayName = profileDisplayName(name);
  return Array.from(displayName)[0] || "M";
}

function renderProfile() {
  const name = state.profile?.name?.trim() || "사용자";
  const email = state.profile?.email?.trim() || "";
  const avatar = profileAvatarText(name);

  document.getElementById("profileAvatar").textContent = avatar;
  document.getElementById("profileAvatarLarge").textContent = avatar;
  document.getElementById("profileHeaderName").textContent = name;
  document.getElementById("profileSummaryName").textContent = name;
  document.getElementById("dashboardProfileName").textContent = profileDisplayName(name);
  document.getElementById("profileNameInput").value = name;
  document.getElementById("profileEmailInput").value = email;
}

function setProfilePopover(open) {
  const popover = document.getElementById("profilePopover");
  const button = document.getElementById("profileMenuButton");
  popover.classList.toggle("hidden", !open);
  button.setAttribute("aria-expanded", String(open));
  if (open) {
    document.getElementById("profileNameInput").focus();
  }
}

async function saveProfile() {
  const name = document.getElementById("profileNameInput").value.trim();
  const email = currentUser?.email || document.getElementById("profileEmailInput").value.trim();

  if (!name) {
    setHint("profileFormHint", "표시할 이름을 입력해주세요.", true);
    return;
  }

  try {
    if (getCurrentFirebaseUser()) {
      await updateFirebaseProfileName(name);
    }
    state.profile = { name, email };
    currentUser = { ...(currentUser || {}), name, email };
    await saveStateToFirebase();
    renderProfile();
    setProfilePopover(false);
    showToast("프로필 정보를 저장했어요.");
  } catch (error) {
    console.error("프로필 저장 실패:", error);
    setHint("profileFormHint", "프로필 저장 중 문제가 생겼어요.", true);
  }
}

function renderSettings() {
  renderManagementItems();
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(state.settings[input.dataset.setting]);
  });
  document.getElementById("amountDisplaySetting").value = state.settings.amountDisplay;
  document.getElementById("startPageSetting").value = state.settings.startPage;
  document.getElementById("targetSavingSetting").value = Number(state.settings.targetSavingAmount || 0) || "";
  document.getElementById("targetSavingRateSetting").value = Number(state.settings.targetSavingRate || 0) || "";
  document.getElementById("reduceMotionSetting").checked = state.settings.reduceMotion;
  document.body.classList.toggle("reduce-motion", state.settings.reduceMotion);
}

function renderManagementItems() {
  const target = document.getElementById("managementItems");
  target.innerHTML = Object.entries(MANAGEMENT_ITEMS).map(([key, item]) => {
    const categories = state.categories.filter((category) => categoryManagementKey(category) === key);
    const choices = categories.map((category) => `
      <label class="category-choice ${category.enabled !== false ? "selected" : ""}">
        <input type="checkbox" data-management-category="${escapeHtml(category.id)}" ${category.enabled !== false ? "checked" : ""} ${isManagementEnabled(key) ? "" : "disabled"} />
        <span>${escapeHtml(category.name)}</span>
      </label>
    `).join("");
    return `
      <article class="management-item ${isManagementEnabled(key) ? "enabled" : ""}">
        <div class="management-item-top">
          <span class="management-icon ${escapeHtml(item.tone)}">${escapeHtml(item.icon)}</span>
          <div>
            <span class="management-kind">${item.type === "expense" ? "지출 하위" : "거래 유형"}</span>
            <h3>${escapeHtml(item.label)}</h3>
          </div>
          <label class="management-toggle" aria-label="${escapeHtml(item.label)} 사용">
            <input type="checkbox" data-management-key="${escapeHtml(key)}" ${isManagementEnabled(key) ? "checked" : ""} />
            <i></i>
          </label>
        </div>
        <p>${escapeHtml(item.desc)}</p>
        <div class="management-category-head"><span>사용할 카테고리</span><b>${categories.filter((category) => category.enabled !== false).length}/${categories.length}</b></div>
        <div class="management-categories">${choices || "<span class=\"no-category\">카테고리 설정에서 추가할 수 있어요.</span>"}</div>
      </article>
    `;
  }).join("");

  const activePreset = Object.entries(MANAGEMENT_PRESETS).find(([, preset]) =>
    Object.keys(MANAGEMENT_ITEMS).every((key) => Boolean(preset[key]) === isManagementEnabled(key))
  )?.[0] || "custom";
  state.settings.managementPreset = activePreset;
  document.querySelectorAll("#managementPresets button").forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === activePreset);
  });
}

function applyDashboardVisibility() {
  document.getElementById("summaryGrid").classList.toggle("hidden", !state.settings.showSummary);
  document.getElementById("ratioSection").classList.toggle("hidden", !state.settings.showRatios);
  document.getElementById("monthlySection").classList.toggle("hidden", !state.settings.showMonthly);
  document.getElementById("weeklySection").classList.toggle("hidden", !state.settings.showWeekly);
  document.getElementById("recentSection").classList.toggle("hidden", !state.settings.showRecent);
  document.getElementById("upcomingSection").classList.toggle("hidden", !state.settings.showUpcoming);
  const bottom = document.querySelector(".dashboard-bottom");
  bottom.classList.toggle("single-column", !state.settings.showRecent || !state.settings.showUpcoming);
  bottom.classList.toggle("hidden", !state.settings.showRecent && !state.settings.showUpcoming);
}

function applyManagementVisibility() {
  const hasExpense = ["variableExpense", "fixedExpense", "subscription"].some(isManagementEnabled);
  const hasSaving = isManagementEnabled("saving");
  document.getElementById("incomeMetricCard").classList.toggle("hidden", !isManagementEnabled("income"));
  document.getElementById("expenseMetricCard").classList.toggle("hidden", !hasExpense);
  document.getElementById("savingsMetricCard").classList.toggle("hidden", !hasSaving);
  document.getElementById("budgetRatioCard").classList.toggle("hidden", !hasExpense);
  document.getElementById("savingRatioCard").classList.toggle("hidden", !hasSaving);
  document.getElementById("ratioSection").classList.toggle("hidden", !state.settings.showRatios || (!hasExpense && !hasSaving));
}

function emptyState(message) {
  return `<div class="empty-state"><span>✦</span><p>${escapeHtml(message)}</p></div>`;
}

function renderAll() {
  renderProfile();
  renderAccountOptions();
  renderDashboard();
  renderTransactionComposer();
  renderTransactionHistory();
  renderAccounts();
  renderCategories();
  renderRecurring();
  renderSettings();
}

function showPage(pageName) {
  if (!document.getElementById(`${pageName}Page`)) pageName = "dashboard";
  activePage = pageName;
  document.querySelectorAll(".page").forEach((page) => page.classList.add("hidden"));
  document.getElementById(`${pageName}Page`).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
  if (window.location.hash !== `#${pageName}`) {
    window.history.replaceState(null, "", `#${pageName}`);
  }
  window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? "auto" : "smooth" });
}

function moveViewedMonth(offset) {
  const [year, month] = viewedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  viewedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  renderTransactionHistory();
}

function bindAuthEvents() {
  document.getElementById("authTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-mode]");
    if (button) showAuthMode(button.dataset.authMode);
  });
  document.getElementById("authSwitchBtn").addEventListener("click", () => {
    showAuthMode(authMode === "login" ? "signup" : "login");
  });
  document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);
  document.getElementById("togglePasswordBtn").addEventListener("click", () => {
    const input = document.getElementById("authPasswordInput");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    document.getElementById("togglePasswordBtn").textContent = show ? "숨기기" : "보기";
    document.getElementById("togglePasswordBtn").setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 보기");
    input.focus();
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });
  document.querySelectorAll("[data-page-link]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.pageLink));
  });

  document.getElementById("profileMenuButton").addEventListener("click", () => {
    const isOpen = document.getElementById("profileMenuButton").getAttribute("aria-expanded") === "true";
    setProfilePopover(!isOpen);
  });
  document.getElementById("closeProfileBtn").addEventListener("click", () => setProfilePopover(false));
  document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  ["profileNameInput", "profileEmailInput"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveProfile();
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".profile-menu-wrap")) setProfilePopover(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setProfilePopover(false);
      expandedMonthlyCard = "";
      expandedWeeklyCard = "";
      renderMonthlyCards();
      renderWeeklyCards();
    }
  });

  document.getElementById("monthlyCards").addEventListener("click", (event) => {
    const card = event.target.closest("[data-month-card]");
    if (!card) return;
    expandedMonthlyCard = expandedMonthlyCard === card.dataset.monthCard ? "" : card.dataset.monthCard;
    renderMonthlyCards();
  });
  document.getElementById("monthlyBaseInput").addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.settings.analysisBaseMonth = event.target.value;
    if (!state.settings.monthlyCompareCustomized || state.settings.analysisCompareMonth === event.target.value) {
      state.settings.analysisCompareMonth = shiftMonthKey(event.target.value, -1);
      state.settings.monthlyCompareCustomized = false;
    }
    if (!state.settings.monthlyThirdCustomized || state.settings.analysisThirdMonth === event.target.value) {
      state.settings.analysisThirdMonth = shiftMonthKey(event.target.value, -2);
      state.settings.monthlyThirdCustomized = false;
    }
    saveState();
    renderMonthlyCards();
  });
  document.getElementById("monthlyCompareInput").addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.settings.analysisCompareMonth = event.target.value;
    state.settings.monthlyCompareCustomized = true;
    if (state.settings.analysisBaseMonth === event.target.value) {
      state.settings.analysisBaseMonth = shiftMonthKey(event.target.value, 1);
    }
    saveState();
    renderMonthlyCards();
  });
  document.getElementById("monthlyThirdInput").addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.settings.analysisThirdMonth = event.target.value;
    state.settings.monthlyThirdCustomized = true;
    if (state.settings.analysisBaseMonth === event.target.value) {
      state.settings.analysisBaseMonth = shiftMonthKey(event.target.value, 1);
    }
    if (state.settings.analysisCompareMonth === event.target.value) {
      state.settings.analysisCompareMonth = shiftMonthKey(event.target.value, -1);
      state.settings.monthlyCompareCustomized = false;
    }
    saveState();
    renderMonthlyCards();
  });
  document.getElementById("weeklyBaseMonthInput").addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.settings.analysisWeekBaseMonth = event.target.value;
    state.settings.analysisWeekMonth = event.target.value;
    state.settings.analysisWeekBase = "";
    expandedWeeklyCard = "";
    saveState();
    renderWeeklyCards();
  });
  document.getElementById("weeklyCompareMonthInput").addEventListener("change", (event) => {
    if (!event.target.value) return;
    state.settings.analysisWeekCompareMonth = event.target.value;
    state.settings.analysisWeekCompare = "";
    expandedWeeklyCard = "";
    saveState();
    renderWeeklyCards();
  });
  document.getElementById("weeklyBaseInput").addEventListener("change", (event) => {
    state.settings.analysisWeekBase = event.target.value;
    expandedWeeklyCard = "";
    saveState();
    renderWeeklyCards();
  });
  document.getElementById("weeklyCompareInput").addEventListener("change", (event) => {
    state.settings.analysisWeekCompare = event.target.value;
    expandedWeeklyCard = "";
    saveState();
    renderWeeklyCards();
  });
  document.getElementById("weeklyCards").addEventListener("click", (event) => {
    const card = event.target.closest("[data-week-card]");
    if (!card) return;
    const cardKey = `${card.dataset.weekMonth}:${card.dataset.weekCard}`;
    expandedWeeklyCard = expandedWeeklyCard === cardKey ? "" : cardKey;
    renderWeeklyCards();
  });

  document.getElementById("transactionTypeSegment").addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    transactionType = button.dataset.type;
    renderTransactionComposer();
  });
  document.getElementById("transactionCategoryInput").addEventListener("change", syncAccountFromCategory);
  document.getElementById("sendTransactionBtn").addEventListener("click", addTransaction);
  document.getElementById("transactionAmountInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTransaction();
  });

  document.getElementById("transactionFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    transactionFilter = button.dataset.filter;
    document.querySelectorAll("#transactionFilters button").forEach((item) => item.classList.toggle("active", item === button));
    renderTransactionHistory();
  });
  document.getElementById("prevMonthBtn").addEventListener("click", () => moveViewedMonth(-1));
  document.getElementById("nextMonthBtn").addEventListener("click", () => moveViewedMonth(1));
  document.getElementById("transactionHistory").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-transaction]");
    if (button) removeTransaction(button.dataset.deleteTransaction);
  });

  document.getElementById("addAccountBtn").addEventListener("click", addAccount);
  document.getElementById("accountList").addEventListener("click", (event) => {
    const primaryButton = event.target.closest("[data-primary-account]");
    const deleteButton = event.target.closest("[data-delete-account]");
    if (primaryButton) setPrimaryAccount(primaryButton.dataset.primaryAccount);
    if (deleteButton) removeAccount(deleteButton.dataset.deleteAccount);
  });

  document.getElementById("addCategoryBtn").addEventListener("click", addCategory);
  document.getElementById("categoryTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-filter]");
    if (!button) return;
    categoryFilter = button.dataset.categoryFilter;
    document.querySelectorAll("#categoryTabs button").forEach((item) => item.classList.toggle("active", item === button));
    renderCategories();
  });
  document.getElementById("categoryList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-category]");
    if (button) removeCategory(button.dataset.deleteCategory);
  });
  document.getElementById("categoryList").addEventListener("change", (event) => {
    if (event.target.matches("[data-category-budget]")) {
      updateCategorySetting(event.target.dataset.categoryBudget, "budget", event.target.value);
    }
    if (event.target.matches("[data-category-account]")) {
      updateCategorySetting(event.target.dataset.categoryAccount, "accountId", event.target.value);
    }
  });

  document.getElementById("recurringTypeSegment").addEventListener("click", (event) => {
    const button = event.target.closest("[data-recurring-type]");
    if (!button) return;
    recurringType = button.dataset.recurringType;
    renderRecurring();
    document.getElementById("recurringNameInput").placeholder = recurringType === "income"
      ? "예: 월급"
      : recurringType === "fixed"
        ? "예: 월세, 보험료"
        : "예: 넷플릭스";
  });
  document.getElementById("addRecurringBtn").addEventListener("click", addRecurring);
  document.querySelector(".recurring-columns").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-recurring]");
    if (button) removeRecurring(button.dataset.deleteRecurring);
  });
  document.querySelector(".recurring-columns").addEventListener("change", (event) => {
    if (event.target.matches("[data-toggle-recurring]")) {
      toggleRecurring(event.target.dataset.toggleRecurring, event.target.checked);
    }
  });

  document.getElementById("managementItems").addEventListener("change", (event) => {
    const categoryId = event.target.dataset.managementCategory;
    if (categoryId) {
      const category = getCategory(categoryId);
      if (!category) return;
      category.enabled = event.target.checked;
      saveState();
      renderAll();
      showToast(`${category.name} 카테고리를 ${event.target.checked ? "사용해요" : "숨겼어요"}.`);
      return;
    }
    const key = event.target.dataset.managementKey;
    if (!key || !MANAGEMENT_ITEMS[key]) return;
    state.settings.enabledManagement[key] = event.target.checked;
    state.settings.managementPreset = "custom";
    saveState();
    renderAll();
    showToast(`${MANAGEMENT_ITEMS[key].label} 항목을 ${event.target.checked ? "표시해요" : "숨겼어요"}.`);
  });
  document.getElementById("managementPresets").addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    const preset = MANAGEMENT_PRESETS[button?.dataset.preset];
    if (!preset) return;
    state.settings.enabledManagement = { ...preset };
    state.settings.managementPreset = button.dataset.preset;
    saveState();
    renderAll();
    showToast(button.dataset.preset === "starter" ? "간편 관리 항목을 적용했어요." : "전체 자산 관리 항목을 적용했어요.");
  });

  document.getElementById("dashboardToggles").addEventListener("change", (event) => {
    if (!event.target.dataset.setting) return;
    state.settings[event.target.dataset.setting] = event.target.checked;
    saveState();
    applyDashboardVisibility();
  });
  document.getElementById("amountDisplaySetting").addEventListener("change", (event) => {
    state.settings.amountDisplay = event.target.value;
    saveState();
    renderAll();
  });
  document.getElementById("startPageSetting").addEventListener("change", (event) => {
    state.settings.startPage = event.target.value;
    saveState();
    showToast("첫 화면 설정을 저장했어요.");
  });
  document.getElementById("targetSavingSetting").addEventListener("change", (event) => {
    state.settings.targetSavingAmount = Math.max(0, Number(event.target.value || 0));
    saveState();
    renderDashboard();
    showToast(state.settings.targetSavingAmount ? "목표 저축 금액을 저장했어요." : "목표 저축 금액을 비웠어요.");
  });
  document.getElementById("targetSavingRateSetting").addEventListener("change", (event) => {
    const nextRate = Math.min(100, Math.max(0, Number(event.target.value || 0)));
    state.settings.targetSavingRate = nextRate;
    event.target.value = nextRate || "";
    saveState();
    renderDashboard();
    showToast(nextRate ? "월 저축 목표율을 저장했어요." : "월 저축 목표율을 비웠어요.");
  });
  document.getElementById("reduceMotionSetting").addEventListener("change", (event) => {
    state.settings.reduceMotion = event.target.checked;
    saveState();
    renderSettings();
  });
  document.getElementById("loadDemoDataBtn").addEventListener("click", () => {
    const confirmed = window.confirm("데모 데이터를 불러올까요? 현재 가계부는 자동으로 백업됩니다.");
    if (!confirmed) return;
    backupCurrentState();
    state = createDefaultState();
    state.profile = { ...currentUser };
    saveState();
    resetRuntimeFilters();
    renderAll();
    showPage("dashboard");
    showToast("데모 데이터를 불러왔어요.");
  });

  document.getElementById("startBlankBookBtn").addEventListener("click", () => {
    const confirmed = window.confirm("새 가계부를 시작할까요? 현재 가계부는 자동으로 백업되고, 화면은 빈 상태로 초기화됩니다.");
    if (!confirmed) return;
    backupCurrentState();
    state = createBlankState(currentUser);
    saveState();
    resetRuntimeFilters();
    renderAll();
    showPage("dashboard");
    showToast("새 가계부를 시작했어요.");
  });

  document.getElementById("restoreLastBookBtn").addEventListener("click", async () => {
    const backup = await readBackupState();
    if (!backup) {
      showToast("복원 가능한 마지막 가계부가 없어요.");
      return;
    }
    const confirmed = window.confirm("마지막으로 백업된 가계부를 복원할까요? 현재 화면의 데이터는 자동으로 다시 백업됩니다.");
    if (!confirmed) return;
    backupCurrentState();
    state = {
      ...createDefaultState(),
      ...backup,
      profile: { ...currentUser },
      settings: {
        ...createDefaultState().settings,
        ...(backup.settings || {}),
        enabledManagement: {
          ...MANAGEMENT_PRESETS.starter,
          ...(backup.settings?.enabledManagement || {}),
        },
      },
    };
    saveState();
    resetRuntimeFilters();
    renderAll();
    showPage("dashboard");
    showToast("마지막 가계부를 복원했어요.");
  });

  document.getElementById("deleteAccountBtn").addEventListener("click", deleteAccount);
}

function init() {
  const hour = TODAY.getHours();
  document.getElementById("greetingText").textContent = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "편안한 저녁이에요";
  document.getElementById("currentMonthText").textContent = `${TODAY.getMonth() + 1}월`;
  document.getElementById("todayLabel").textContent = formatDate(TODAY.toISOString().slice(0, 10), { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  document.getElementById("transactionDateInput").value = TODAY.toISOString().slice(0, 10);

  document.getElementById("accountBankInput").innerHTML = BANKS.map((bank) => optionHtml(bank, bank)).join("");
  document.getElementById("recurringDayInput").innerHTML = `<option value="">미정 (선택 사항)</option>${Array.from({ length: 31 }, (_, index) => optionHtml(index + 1, `매월 ${index + 1}일`)).join("")}`;

  bindAuthEvents();
  bindEvents();
  showAuthMode("login");

  document.getElementById("authPage").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");

  watchAuthState(async (user) => {
    if (!user) {
      currentUser = null;
      state = createDefaultState();
      expandedMonthlyCard = "";
      expandedWeeklyCard = "";
      setProfilePopover(false);
      document.getElementById("app").classList.add("hidden");
      document.getElementById("authPage").classList.remove("hidden");
      showAuthMode("login");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    try {
      await openAppForFirebaseUser(user);
    } catch (error) {
      console.error("Firebase 데이터 불러오기 실패:", error);
      setAuthHint("Firebase 데이터 불러오기 중 문제가 생겼어요. Firestore 설정을 확인해주세요.", true);
      document.getElementById("app").classList.add("hidden");
      document.getElementById("authPage").classList.remove("hidden");
    }
  });
}

init();
