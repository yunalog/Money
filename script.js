const STORAGE_KEY = "personal-budget-demo-v2";
const CURRENT_MONTH = "2026-06";
const RING_CIRCUMFERENCE = 2 * Math.PI * 58;

const modules = {
  income: { label: "수입", required: true, desc: "월급, 부수입 등" },
  expense: { label: "변동비", required: true, desc: "식비, 교통, 쇼핑 등" },
  fixedExpense: { label: "고정비", required: false, desc: "월세, 관리비, 통신비" },
  subscription: { label: "구독서비스", required: false, desc: "넷플릭스, 유튜브 등" },
  saving: { label: "저축", required: false, desc: "적금, 비상금, 청약" },
  debt: { label: "부채", required: false, desc: "대출, 카드값, 할부" },
  stock: { label: "주식", required: false, desc: "국내주식, 해외주식, ETF" },
  realEstate: { label: "부동산", required: false, desc: "보증금, 월세, 자산" },
};

const defaultCategories = {
  income: ["월급", "부수입", "용돈", "기타수입"],
  expense: ["식비", "교통", "쇼핑", "생활", "의료", "문화"],
  fixedExpense: ["월세", "관리비", "통신비", "보험료"],
  subscription: ["넷플릭스", "유튜브", "쿠팡와우", "음악", "클라우드"],
  saving: ["비상금", "적금", "청약"],
  debt: ["대출", "카드값", "할부"],
  stock: ["국내주식", "해외주식", "ETF"],
  realEstate: ["보증금", "월세", "부동산자산"],
};

const expenseBudgetCategories = [
  "식비", "교통", "쇼핑", "생활", "의료", "문화", "월세", "관리비", "통신비", "보험료", "넷플릭스", "유튜브", "쿠팡와우", "음악", "클라우드"
];

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  return {
    user: null,
    settings: {
      enabledModules: {
        income: true,
        expense: true,
        fixedExpense: true,
        subscription: true,
        saving: true,
        debt: false,
        stock: false,
        realEstate: false,
      },
      categories: structuredClone(defaultCategories),
      categoryBudgets: {
        "식비": 300000,
        "교통": 100000,
        "쇼핑": 200000,
        "생활": 200000,
        "월세": 500000,
        "관리비": 80000,
        "통신비": 70000,
        "넷플릭스": 17000,
        "유튜브": 14900,
      },
    },
    accounts: [
      { id: crypto.randomUUID(), name: "현금", balance: 120000 },
      { id: crypto.randomUUID(), name: "입출금통장", balance: 1430000 },
      { id: crypto.randomUUID(), name: "저축통장", balance: 800000 },
    ],
    transactions: [
      tx("income", "월급", 2500000, "6월 월급", "2026-06-01"),
      tx("expense", "식비", 12000, "점심", "2026-06-02"),
      tx("expense", "교통", 6800, "지하철", "2026-06-03"),
      tx("fixedExpense", "월세", 500000, "원룸 월세", "2026-06-05"),
      tx("subscription", "넷플릭스", 17000, "정기결제", "2026-06-07"),
      tx("subscription", "유튜브", 14900, "정기결제", "2026-06-08"),
      tx("saving", "적금", 300000, "월 저축", "2026-06-10"),
      tx("expense", "쇼핑", 49000, "생활용품", "2026-06-12"),
      tx("expense", "식비", 28000, "저녁", "2026-06-15"),
      tx("expense", "생활", 64000, "소모품", "2026-06-18"),
    ],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function tx(type, category, amount, memo, date) {
  return { id: crypto.randomUUID(), type, category, amount, memo, date };
}

function won(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function compactWon(value) {
  const num = Number(value || 0);
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${Math.round(num / 10000)}만`;
  return num.toLocaleString("ko-KR");
}

function isExpenseType(type) {
  return ["expense", "fixedExpense", "subscription"].includes(type);
}

function isIncomeType(type) {
  return type === "income";
}

function monthTransactions() {
  return state.transactions.filter((item) => item.date.startsWith(CURRENT_MONTH));
}

function monthlyIncome() {
  return monthTransactions().filter((item) => isIncomeType(item.type)).reduce((sum, item) => sum + Number(item.amount), 0);
}

function monthlyExpense() {
  return monthTransactions().filter((item) => isExpenseType(item.type)).reduce((sum, item) => sum + Number(item.amount), 0);
}

function totalCategoryBudget() {
  return Object.values(state.settings.categoryBudgets).reduce((sum, value) => sum + Number(value || 0), 0);
}

function totalAsset() {
  const accountTotal = state.accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const plusAssets = state.transactions
    .filter((item) => ["saving", "stock", "realEstate"].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const debts = state.transactions
    .filter((item) => item.type === "debt")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  return accountTotal + plusAssets - debts;
}

function categorySpent(category) {
  return monthTransactions()
    .filter((item) => isExpenseType(item.type) && item.category === category)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function renderDashboard() {
  const income = monthlyIncome();
  const expense = monthlyExpense();
  const budget = totalCategoryBudget();
  const remaining = Math.max(budget - expense, 0);
  const rate = budget > 0 ? Math.round((expense / budget) * 100) : 0;
  const cappedRate = Math.min(rate, 100);

  document.getElementById("totalAsset").textContent = won(totalAsset());
  document.getElementById("monthlyIncome").textContent = won(income);
  document.getElementById("monthlyExpense").textContent = won(expense);
  document.getElementById("remainingBudget").textContent = won(remaining);
  document.getElementById("budgetStatusText").textContent = `예산 사용률 ${rate}%`;
  document.getElementById("totalBudgetRate").textContent = `${rate}%`;
  document.getElementById("ringPercent").textContent = `${rate}%`;
  document.getElementById("budgetUsedText").textContent = `${won(expense)} 사용`;
  document.getElementById("budgetTotalText").textContent = `전체 예산 ${won(budget)}`;

  const ring = document.getElementById("budgetRing");
  ring.style.strokeDasharray = RING_CIRCUMFERENCE;
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * cappedRate) / 100;
  ring.style.stroke = rate >= 100 ? "var(--red)" : "var(--blue)";

  renderCategoryBudgetList();
  renderDailyChart();
  renderTransactionList("recentList", [...state.transactions].reverse().slice(0, 6));
}

function renderCategoryBudgetList() {
  const target = document.getElementById("categoryBudgetList");
  target.innerHTML = "";

  const entries = Object.entries(state.settings.categoryBudgets).filter(([, budget]) => Number(budget) > 0);

  if (!entries.length) {
    target.innerHTML = `<p class="desc">설정에서 카테고리별 예산을 먼저 입력해주세요.</p>`;
    return;
  }

  entries.forEach(([category, budget]) => {
    const spent = categorySpent(category);
    const rate = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const capped = Math.min(rate, 100);
    const item = document.createElement("div");
    item.className = "category-budget-item";
    item.innerHTML = `
      <div class="category-budget-top">
        <strong>${category}</strong>
        <span>${won(spent)} / ${won(budget)} · ${rate}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${rate >= 100 ? "danger" : ""}" style="width:${capped}%"></div>
      </div>
    `;
    target.appendChild(item);
  });
}

function renderDailyChart() {
  const target = document.getElementById("dailyBarChart");
  target.innerHTML = "";

  const grouped = {};
  monthTransactions().forEach((item) => {
    const day = Number(item.date.slice(-2));
    const label = `${day}일`;
    grouped[label] ??= { income: 0, expense: 0, net: 0 };

    if (isIncomeType(item.type)) grouped[label].income += Number(item.amount);
    if (isExpenseType(item.type)) grouped[label].expense += Number(item.amount);
    grouped[label].net = grouped[label].income - grouped[label].expense;
  });

  const rows = Object.entries(grouped).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const max = Math.max(...rows.flatMap(([, v]) => [v.income, v.expense, Math.abs(v.net)]), 1);

  rows.forEach(([day, value]) => {
    const wrap = document.createElement("div");
    wrap.className = "chart-day";

    const incomeH = Math.max((value.income / max) * 100, value.income ? 4 : 0);
    const expenseH = Math.max((value.expense / max) * 100, value.expense ? 4 : 0);
    const netH = Math.max((Math.abs(value.net) / max) * 100, value.net ? 4 : 0);

    wrap.innerHTML = `
      <div class="chart-bars" title="${day} 수입 ${won(value.income)} / 지출 ${won(value.expense)} / 순금액 ${won(value.net)}">
        <div class="vbar income" style="height:${incomeH}%"></div>
        <div class="vbar expense" style="height:${expenseH}%"></div>
        <div class="vbar net" style="height:${netH}%"></div>
      </div>
      <div class="chart-label">${day}<br><span>${compactWon(value.income + value.expense)}</span></div>
    `;
    target.appendChild(wrap);
  });
}

function renderTransactionList(targetId, list) {
  const target = document.getElementById(targetId);
  target.innerHTML = "";

  if (!list.length) {
    target.innerHTML = `<p class="desc">거래내역이 없습니다.</p>`;
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "transaction-item";
    const sign = isIncomeType(item.type) ? "+" : isExpenseType(item.type) ? "-" : "";
    div.innerHTML = `
      <div>
        <strong>${item.memo || item.category}</strong>
        <small>${item.date} · ${modules[item.type]?.label || item.type} · ${item.category}</small>
      </div>
      <strong class="amount ${item.type}">${sign}${won(item.amount)}</strong>
    `;
    target.appendChild(div);
  });
}

function renderTransactionPage() {
  renderTransactionList("transactionList", [...state.transactions].reverse());
}

function renderAddPage() {
  const typeInput = document.getElementById("typeInput");
  typeInput.innerHTML = "";

  Object.entries(state.settings.enabledModules)
    .filter(([, enabled]) => enabled)
    .forEach(([key]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = modules[key].label;
      typeInput.appendChild(option);
    });

  updateCategoryOptions();
}

function updateCategoryOptions() {
  const type = document.getElementById("typeInput").value;
  const target = document.getElementById("categoryInput");
  target.innerHTML = "";

  (state.settings.categories[type] || []).forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    target.appendChild(option);
  });
}

function renderSettings() {
  const moduleTarget = document.getElementById("moduleSettings");
  moduleTarget.innerHTML = "";

  Object.entries(modules).forEach(([key, module]) => {
    const row = document.createElement("label");
    row.className = "module-toggle";
    row.innerHTML = `
      <div>
        <strong>${module.label}</strong>
        <small>${module.desc}</small>
      </div>
      <input type="checkbox" data-module="${key}" ${state.settings.enabledModules[key] ? "checked" : ""} ${module.required ? "disabled" : ""} />
    `;
    moduleTarget.appendChild(row);
  });

  moduleTarget.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.dataset.module;
      state.settings.enabledModules[key] = event.target.checked;
      saveState();
      renderAll();
    });
  });

  const budgetTarget = document.getElementById("categoryBudgetSettings");
  budgetTarget.innerHTML = "";

  const enabledExpenseCategories = Object.entries(state.settings.categories)
    .filter(([type]) => isExpenseType(type) && state.settings.enabledModules[type])
    .flatMap(([, categories]) => categories)
    .filter((category, index, arr) => arr.indexOf(category) === index)
    .filter((category) => expenseBudgetCategories.includes(category));

  enabledExpenseCategories.forEach((category) => {
    const row = document.createElement("label");
    row.className = "budget-setting-row";
    row.innerHTML = `
      <span>${category}</span>
      <input type="number" data-budget-category="${category}" value="${state.settings.categoryBudgets[category] || 0}" />
    `;
    budgetTarget.appendChild(row);
  });
}

function renderAll() {
  renderDashboard();
  renderTransactionPage();
  renderAddPage();
  renderSettings();
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => page.classList.add("hidden"));
  document.getElementById(`${pageName}Page`).classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
}

function init() {
  document.getElementById("todayLabel").textContent = "2026년 6월";
  document.getElementById("dateInput").value = "2026-06-27";

  document.getElementById("loginBtn").addEventListener("click", () => {
    const email = document.getElementById("emailInput").value.trim();
    if (!email) return alert("이메일을 입력해주세요.");

    state.user = { email, nickname: email.split("@")[0] };
    saveState();
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("mainPage").classList.remove("hidden");
    document.getElementById("welcomeText").textContent = `안녕하세요, ${state.user.nickname}님`;
    renderAll();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    state.user = null;
    saveState();
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("mainPage").classList.add("hidden");
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.getElementById("typeInput").addEventListener("change", updateCategoryOptions);

  document.getElementById("addTransactionBtn").addEventListener("click", () => {
    const type = document.getElementById("typeInput").value;
    const category = document.getElementById("categoryInput").value;
    const amount = Number(document.getElementById("amountInput").value);
    const memo = document.getElementById("memoInput").value.trim();
    const date = document.getElementById("dateInput").value;

    if (!amount || amount <= 0 || !date) return alert("금액과 날짜를 입력해주세요.");

    state.transactions.push(tx(type, category, amount, memo, date));
    saveState();
    document.getElementById("amountInput").value = "";
    document.getElementById("memoInput").value = "";
    renderAll();
    showPage("dashboard");
  });

  document.getElementById("saveCategoryBudgetsBtn").addEventListener("click", () => {
    document.querySelectorAll("[data-budget-category]").forEach((input) => {
      state.settings.categoryBudgets[input.dataset.budgetCategory] = Number(input.value || 0);
    });
    saveState();
    renderAll();
    alert("카테고리별 예산이 저장되었습니다.");
  });

  if (state.user) {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("mainPage").classList.remove("hidden");
    document.getElementById("welcomeText").textContent = `안녕하세요, ${state.user.nickname}님`;
    renderAll();
  }
}

init();
