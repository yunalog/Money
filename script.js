const STORAGE_KEY = "moa-money-v3";
const TODAY = new Date("2026-06-27T12:00:00+09:00");

const TYPE_META = {
  income: { label: "수입", sign: "+", icon: "↙", className: "income" },
  expense: { label: "지출", sign: "−", icon: "↗", className: "expense" },
  saving: { label: "저축", sign: "", icon: "✦", className: "saving" },
  transfer: { label: "계좌이체", sign: "", icon: "⇄", className: "transfer" },
};

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
let state = loadState();

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
    { id: "cat-salary", name: "월급", type: "income", budget: 0, accountId: "acc-salary", icon: "💼", color: "sage" },
    { id: "cat-extra", name: "부수입", type: "income", budget: 0, accountId: "acc-salary", icon: "✦", color: "sky" },
    { id: "cat-food", name: "식비", type: "expense", budget: 450000, accountId: "acc-daily", icon: "🍚", color: "peach" },
    { id: "cat-traffic", name: "교통", type: "expense", budget: 120000, accountId: "acc-daily", icon: "🚌", color: "sky" },
    { id: "cat-house", name: "주거", type: "expense", budget: 780000, accountId: "acc-salary", icon: "🏠", color: "sage" },
    { id: "cat-life", name: "생활", type: "expense", budget: 250000, accountId: "acc-daily", icon: "🛍", color: "yellow" },
    { id: "cat-culture", name: "문화·여가", type: "expense", budget: 180000, accountId: "acc-daily", icon: "🎬", color: "lilac" },
    { id: "cat-health", name: "건강", type: "expense", budget: 150000, accountId: "acc-daily", icon: "🏥", color: "rose" },
    { id: "cat-saving", name: "정기 저축", type: "saving", budget: 700000, accountId: "acc-saving", icon: "💰", color: "lilac" },
    { id: "cat-emergency", name: "비상금", type: "saving", budget: 200000, accountId: "acc-saving", icon: "✦", color: "sage" },
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
    accounts,
    categories,
    transactions,
    recurring,
    settings: {
      showSummary: true,
      showRatios: true,
      showRecent: true,
      showUpcoming: true,
      amountDisplay: "full",
      startPage: "dashboard",
      reduceMotion: false,
    },
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultState();
    const parsed = JSON.parse(saved);
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...parsed,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaults.accounts,
      categories: Array.isArray(parsed.categories) ? parsed.categories : defaults.categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : defaults.transactions,
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : defaults.recurring,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function monthTransactions(month = viewedMonth) {
  return state.transactions.filter((transaction) => transaction.date.startsWith(month));
}

function sumByType(type, month = viewedMonth) {
  return monthTransactions(month)
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
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
    .filter((category) => category.type === "expense")
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
  const income = sumByType("income", dashboardMonth);
  const expense = sumByType("expense", dashboardMonth);
  const savings = sumByType("saving", dashboardMonth);
  const budget = totalExpenseBudget();
  const budgetRate = budget ? Math.round((expense / budget) * 100) : 0;
  const savingRate = income ? Math.round((savings / income) * 100) : 0;

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
  document.getElementById("savingIncome").textContent = formatWon(income);
  document.getElementById("savingDonut").style.setProperty("--progress", `${Math.min(savingRate, 100) * 3.6}deg`);
  document.getElementById("savingGuide").textContent = savingRate >= 20
    ? `권장 저축 비율 20%를 ${savingRate - 20}%p 넘었어요.`
    : `권장 저축 비율 20%까지 ${20 - savingRate}%p 남았어요.`;
  document.getElementById("savingStatusBadge").textContent = savingRate >= 20 ? "좋은 흐름" : "조금 더";

  renderRecentTransactions();
  renderUpcoming();
  applyDashboardVisibility();
}

function renderRecentTransactions() {
  const target = document.getElementById("recentTransactions");
  const items = [...state.transactions]
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
    const amountClass = item.type === "income" ? "income" : item.type === "expense" ? "expense" : "saving";
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
    .filter((item) => item.active && Number(item.day || 0) >= todayDay)
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
  document.querySelectorAll("#transactionTypeSegment button").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === transactionType);
  });

  const categoryInput = document.getElementById("transactionCategoryInput");
  const currentCategory = categoryInput.value;
  const matchingCategories = state.categories.filter((category) => category.type === transactionType);

  if (transactionType === "transfer") {
    categoryInput.innerHTML = `<option value="">내 계좌 간 이동</option>`;
    categoryInput.disabled = true;
  } else {
    categoryInput.disabled = false;
    categoryInput.innerHTML = matchingCategories.length
      ? matchingCategories.map((category) => optionHtml(category.id, category.name)).join("")
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
    .filter((item) => transactionFilter === "all" || item.type === transactionFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.createdAt || 0) - Number(a.createdAt || 0));

  const income = sumByType("income", viewedMonth);
  const expenses = sumByType("expense", viewedMonth);
  const savings = sumByType("saving", viewedMonth);
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
  const sign = item.type === "income" ? "+" : item.type === "expense" ? "−" : "";
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
  const items = state.categories.filter((category) => categoryFilter === "all" || category.type === categoryFilter);
  const target = document.getElementById("categoryList");
  const expense = sumByType("expense", TODAY.toISOString().slice(0, 7));
  const budget = totalExpenseBudget();

  document.getElementById("categoryCount").textContent = state.categories.length;
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
          <div><span class="type-label ${escapeHtml(category.type)}">${escapeHtml(TYPE_META[category.type]?.label)}</span><h3>${escapeHtml(category.name)}</h3></div>
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
  const type = document.getElementById("categoryTypeInput").value;
  const budget = Number(document.getElementById("categoryBudgetInput").value || 0);
  const accountId = document.getElementById("categoryAccountInput").value;

  if (!name || budget < 0) {
    setHint("categoryFormHint", "카테고리 이름과 올바른 예산을 입력해주세요.", true);
    return;
  }
  if (state.categories.some((category) => category.type === type && category.name === name)) {
    setHint("categoryFormHint", "같은 종류에 이미 같은 이름의 카테고리가 있어요.", true);
    return;
  }

  state.categories.push({
    id: uid("cat"),
    name,
    type,
    budget,
    accountId,
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
  document.getElementById("recurringCount").textContent = state.recurring.length;
  Object.entries(RECURRING_META).forEach(([type, meta]) => {
    const target = document.getElementById(meta.target);
    const items = state.recurring
      .filter((item) => item.type === type)
      .sort((a, b) => Number(a.day || 99) - Number(b.day || 99));
    target.innerHTML = items.length ? items.map(recurringItemHtml).join("") : emptyState("등록된 일정이 없어요.");
  });

  document.querySelectorAll("#recurringTypeSegment button").forEach((button) => {
    button.classList.toggle("active", button.dataset.recurringType === recurringType);
  });
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

function renderSettings() {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(state.settings[input.dataset.setting]);
  });
  document.getElementById("amountDisplaySetting").value = state.settings.amountDisplay;
  document.getElementById("startPageSetting").value = state.settings.startPage;
  document.getElementById("reduceMotionSetting").checked = state.settings.reduceMotion;
  document.body.classList.toggle("reduce-motion", state.settings.reduceMotion);
}

function applyDashboardVisibility() {
  document.getElementById("summaryGrid").classList.toggle("hidden", !state.settings.showSummary);
  document.getElementById("ratioSection").classList.toggle("hidden", !state.settings.showRatios);
  document.getElementById("recentSection").classList.toggle("hidden", !state.settings.showRecent);
  document.getElementById("upcomingSection").classList.toggle("hidden", !state.settings.showUpcoming);
  const bottom = document.querySelector(".dashboard-bottom");
  bottom.classList.toggle("single-column", !state.settings.showRecent || !state.settings.showUpcoming);
  bottom.classList.toggle("hidden", !state.settings.showRecent && !state.settings.showUpcoming);
}

function emptyState(message) {
  return `<div class="empty-state"><span>✦</span><p>${escapeHtml(message)}</p></div>`;
}

function renderAll() {
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

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });
  document.querySelectorAll("[data-page-link]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.pageLink));
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
  document.getElementById("reduceMotionSetting").addEventListener("change", (event) => {
    state.settings.reduceMotion = event.target.checked;
    saveState();
    renderSettings();
  });
  document.getElementById("resetDataBtn").addEventListener("click", () => {
    const confirmed = window.confirm("추가하거나 수정한 데이터를 모두 지우고 처음 상태로 되돌릴까요?");
    if (!confirmed) return;
    state = createDefaultState();
    saveState();
    transactionType = "expense";
    transactionFilter = "all";
    categoryFilter = "all";
    recurringType = "income";
    viewedMonth = "2026-06";
    renderAll();
    showPage("dashboard");
    showToast("처음 상태로 되돌렸어요.");
  });
}

function init() {
  const hour = TODAY.getHours();
  document.getElementById("greetingText").textContent = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "편안한 저녁이에요";
  document.getElementById("currentMonthText").textContent = `${TODAY.getMonth() + 1}월`;
  document.getElementById("todayLabel").textContent = formatDate(TODAY.toISOString().slice(0, 10), { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  document.getElementById("transactionDateInput").value = TODAY.toISOString().slice(0, 10);

  document.getElementById("accountBankInput").innerHTML = BANKS.map((bank) => optionHtml(bank, bank)).join("");
  document.getElementById("recurringDayInput").innerHTML = `<option value="">미정 (선택 사항)</option>${Array.from({ length: 31 }, (_, index) => optionHtml(index + 1, `매월 ${index + 1}일`)).join("")}`;

  bindEvents();
  renderAll();
  const hashPage = window.location.hash.slice(1);
  showPage(document.getElementById(`${hashPage}Page`) ? hashPage : state.settings.startPage || "dashboard");
}

init();
