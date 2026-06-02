// ============================================================
// 申告準備ノート（高齢者向け）
//  - 医療費・経費・収入の記録
//  - 年間まとめ
//  - 申告準備チェックリスト
//  ※ 税務相談の代わりにはなりません
// ============================================================

const STORAGE_KEY = "kakutei-senior.v1";

// 年金は種類を調べなくてよいよう、枠を用意（足りなければ年金5・6へ）
const INCOME_TYPES = [
  { id: "kokumin", label: "国民年金", group: "pension" },
  { id: "kosei", label: "厚生年金", group: "pension" },
  { id: "pension3", label: "年金3", group: "pension" },
  { id: "pension4", label: "年金4", group: "pension" },
  { id: "pension5", label: "年金5", group: "pension" },
  { id: "pension6", label: "年金6", group: "pension" },
  { id: "parttime", label: "アルバイト・パート", group: "other" },
  { id: "other", label: "その他の収入", group: "other" }
];

const PENSION_TYPE_IDS = INCOME_TYPES.filter((t) => t.group === "pension").map((t) => t.id);

const EXPENSE_TYPES = [
  { id: "lifeins", label: "生命保険・介護保険" },
  { id: "earthquake", label: "地震保険" },
  { id: "socialins", label: "国民年金・健康保険" },
  { id: "donation", label: "寄付・ふるさと納税" },
  { id: "work", label: "仕事の経費（アルバイト等）" },
  { id: "other", label: "その他" }
];

const CHECKLIST = [
  { id: "hoken", text: "健康保険・介護保険の控除証明", desc: "市役所や保険者から届く書類" },
  { id: "nenkin", text: "年金の源泉徴収票など", desc: "届いた書類ごとに、国民年金・厚生年金・年金3〜6へ記録したメモと照合" },
  { id: "iryou", text: "医療費の領収書・明細", desc: "このアプリの記録と照合" },
  { id: "keihi", text: "保険料・寄付の控除証明書", desc: "生命保険、地震保険、ふるさと納税など" },
  { id: "bank", text: "銀行の残高・利息の証明", desc: "銀行から届く源泉徴収票など" },
  { id: "myNumber", text: "マイナンバーカード", desc: "e-Tax（ネット申告）を使う場合" },
  { id: "family", text: "家族に相談・確認", desc: "分からないことは一人で判断しない" }
];

// ---- 状態 ----
let state = loadState();
let currentPage = "home";

// ---- 要素 ----
const main = document.getElementById("main");
const yearSelect = document.getElementById("yearSelect");

// ---- ストレージ ----
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.expenses) s.expenses = [];
      return s;
    }
  } catch (e) {}
  return defaultState();
}

function defaultState() {
  const y = new Date().getFullYear();
  return {
    year: y,
    medical: [],
    expenses: [],
    income: [],
    checklist: {}
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtYen(n) {
  return Number(n).toLocaleString("ja-JP") + "円";
}

function fmtDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- 集計 ----
function sumMedical() {
  return state.medical.reduce((a, r) => a + Number(r.amount || 0), 0);
}

function sumIncome(type) {
  return state.income
    .filter((r) => !type || r.type === type)
    .reduce((a, r) => a + Number(r.amount || 0), 0);
}

function sumExpense(type) {
  return state.expenses
    .filter((r) => !type || r.type === type)
    .reduce((a, r) => a + Number(r.amount || 0), 0);
}

function incomeTypeLabel(id) {
  if (id === "pension") return "年金（以前の記録）";
  return (INCOME_TYPES.find((t) => t.id === id) || {}).label || id;
}

function sumPension() {
  const ids = [...PENSION_TYPE_IDS, "pension"];
  return state.income
    .filter((r) => ids.includes(r.type))
    .reduce((a, r) => a + Number(r.amount || 0), 0);
}

function expenseTypeLabel(id) {
  return (EXPENSE_TYPES.find((t) => t.id === id) || {}).label || id;
}

// ---- 年選択 ----
function initYearSelect() {
  const now = new Date().getFullYear();
  yearSelect.innerHTML = "";
  for (let y = now; y >= now - 5; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y + "年";
    if (y === state.year) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  yearSelect.addEventListener("change", () => {
    state.year = Number(yearSelect.value);
    saveState();
    render();
  });
}

// ---- ページ描画 ----
function render() {
  switch (currentPage) {
    case "home": renderHome(); break;
    case "medical": renderMedical(); break;
    case "expense": renderExpense(); break;
    case "income": renderIncome(); break;
    case "summary": renderSummary(); break;
    case "checklist": renderChecklist(); break;
  }
}

function renderHome() {
  const medTotal = sumMedical();
  const expTotal = sumExpense();
  const incTotal = sumIncome();
  main.innerHTML = `
    <h2 class="page-title">${state.year}年の状況</h2>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">医療費</div>
        <div class="stat-value">${fmtYen(medTotal)}</div>
      </div>
      <div class="stat-box accent">
        <div class="stat-label">収入</div>
        <div class="stat-value">${fmtYen(incTotal)}</div>
      </div>
      <div class="stat-box" style="grid-column:1/-1;background:#fefcbf">
        <div class="stat-label">経費（保険・寄付など）</div>
        <div class="stat-value">${fmtYen(expTotal)}</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <p class="hint" style="margin:0">このアプリの使い方</p>
      <ol style="font-size:18px;padding-left:1.4em;margin:10px 0 0">
        <li><strong>医療費</strong> … 病院・薬局の支出</li>
        <li><strong>経費</strong> … 保険料・寄付・仕事の経費</li>
        <li><strong>収入</strong> … 国民年金・厚生年金・年金3〜6など</li>
        <li><strong>まとめ</strong> … 申告用の数字を確認</li>
        <li><strong>準備</strong> … 必要な書類をチェック</li>
      </ol>
    </div>
    <div class="card">
      <p class="summary-note">
        💡 <strong>家族の方へ</strong><br>
        お年寄りの代わりに入力・確認できます。
        データはこのスマホ（ブラウザ）内に保存されます。
      </p>
    </div>
  `;
}

function renderMedical() {
  const items = [...state.medical].sort((a, b) => b.date.localeCompare(a.date));
  main.innerHTML = `
    <h2 class="page-title">医療費の記録</h2>
    <p class="hint">病院・薬局・介護など、医療に使ったお金を記録します。</p>
    <div class="card">
      <form id="medForm">
        <div class="form-group">
          <label for="medDate">日付</label>
          <input type="date" id="medDate" required />
        </div>
        <div class="form-group">
          <label for="medPlace">病院・薬局の名前</label>
          <input type="text" id="medPlace" placeholder="例：〇〇病院" required />
        </div>
        <div class="form-group">
          <label for="medAmount">金額（円）</label>
          <input type="number" id="medAmount" inputmode="numeric" placeholder="例：3000" min="0" required />
        </div>
        <div class="form-group">
          <label for="medMemo">メモ（任意）</label>
          <input type="text" id="medMemo" placeholder="例：診察・薬代" />
        </div>
        <button type="submit" class="btn btn-primary">＋ 追加する</button>
      </form>
    </div>
    <div class="card">
      <p style="font-size:18px;font-weight:800;margin:0 0 10px">記録一覧（${items.length}件）</p>
      ${items.length === 0
        ? '<p class="empty-msg">まだ記録がありません</p>'
        : items.map((r) => `
          <div class="list-item">
            <div class="list-main">
              <div class="list-date">${fmtDate(r.date)}</div>
              <div class="list-title">${escapeHtml(r.place)}</div>
              ${r.memo ? `<div style="font-size:16px;color:var(--muted)">${escapeHtml(r.memo)}</div>` : ""}
            </div>
            <div class="list-amount">${fmtYen(r.amount)}</div>
            <button class="btn btn-danger" data-del-med="${r.id}" style="width:auto">削除</button>
          </div>
        `).join("")}
      ${items.length > 0 ? `<p style="text-align:right;font-size:22px;font-weight:800;margin:14px 0 0">合計 ${fmtYen(sumMedical())}</p>` : ""}
    </div>
  `;

  document.getElementById("medForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.medical.push({
      id: uid(),
      date: document.getElementById("medDate").value,
      place: document.getElementById("medPlace").value.trim(),
      amount: Number(document.getElementById("medAmount").value),
      memo: document.getElementById("medMemo").value.trim()
    });
    saveState();
    renderMedical();
  });

  main.querySelectorAll("[data-del-med]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("この記録を削除しますか？")) {
        state.medical = state.medical.filter((r) => r.id !== btn.dataset.delMed);
        saveState();
        renderMedical();
      }
    });
  });
}

function renderExpense() {
  const items = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
  main.innerHTML = `
    <h2 class="page-title">経費の記録</h2>
    <p class="hint">保険料・寄付・仕事の経費など、控除に関係する支出を記録します。</p>
    <div class="card">
      <form id="expForm">
        <div class="form-group">
          <label for="expType">種類</label>
          <select id="expType" required>
            ${EXPENSE_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label for="expDate">日付</label>
          <input type="date" id="expDate" required />
        </div>
        <div class="form-group">
          <label for="expName">内容</label>
          <input type="text" id="expName" placeholder="例：生命保険料、交通費" required />
        </div>
        <div class="form-group">
          <label for="expAmount">金額（円）</label>
          <input type="number" id="expAmount" inputmode="numeric" placeholder="例：50000" min="0" required />
        </div>
        <div class="form-group">
          <label for="expMemo">メモ（任意）</label>
          <input type="text" id="expMemo" placeholder="例：〇〇生命、1年分" />
        </div>
        <button type="submit" class="btn btn-primary">＋ 追加する</button>
      </form>
    </div>
    <div class="card">
      <p style="font-size:18px;font-weight:800;margin:0 0 10px">記録一覧（${items.length}件）</p>
      ${items.length === 0
        ? '<p class="empty-msg">まだ記録がありません</p>'
        : items.map((r) => `
          <div class="list-item">
            <div class="list-main">
              <div class="list-date">${fmtDate(r.date)} · ${expenseTypeLabel(r.type)}</div>
              <div class="list-title">${escapeHtml(r.name)}</div>
              ${r.memo ? `<div style="font-size:16px;color:var(--muted)">${escapeHtml(r.memo)}</div>` : ""}
            </div>
            <div class="list-amount">${fmtYen(r.amount)}</div>
            <button class="btn btn-danger" data-del-exp="${r.id}" style="width:auto">削除</button>
          </div>
        `).join("")}
      ${items.length > 0 ? `
        <div style="margin-top:14px;font-size:18px">
          ${EXPENSE_TYPES.map((t) => {
            const s = sumExpense(t.id);
            return s > 0 ? `<div>${t.label}：${fmtYen(s)}</div>` : "";
          }).join("")}
          <div style="font-size:22px;font-weight:800;margin-top:8px">合計 ${fmtYen(sumExpense())}</div>
        </div>
      ` : ""}
    </div>
    <div class="card">
      <p class="summary-note" style="margin:0">
        💡 生命保険やふるさと納税などは、届いた<strong>控除証明書</strong>の数字を申告時に使います。
        このアプリはメモ用です。
      </p>
    </div>
  `;

  document.getElementById("expForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.expenses.push({
      id: uid(),
      type: document.getElementById("expType").value,
      date: document.getElementById("expDate").value,
      name: document.getElementById("expName").value.trim(),
      amount: Number(document.getElementById("expAmount").value),
      memo: document.getElementById("expMemo").value.trim()
    });
    saveState();
    renderExpense();
  });

  main.querySelectorAll("[data-del-exp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("この記録を削除しますか？")) {
        state.expenses = state.expenses.filter((r) => r.id !== btn.dataset.delExp);
        saveState();
        renderExpense();
      }
    });
  });
}

function renderIncome() {
  const items = [...state.income].sort((a, b) => b.date.localeCompare(a.date));
  const pensionOpts = INCOME_TYPES.filter((t) => t.group === "pension")
    .map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
  const otherOpts = INCOME_TYPES.filter((t) => t.group === "other")
    .map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
  main.innerHTML = `
    <h2 class="page-title">収入の記録</h2>
    <p class="hint">年金の種類が分からなくても大丈夫。届いた書類ごとに「国民年金」「厚生年金」「年金3」…へ記録してください。</p>
    <div class="card">
      <form id="incForm">
        <div class="form-group">
          <label for="incType">種類</label>
          <select id="incType" required>
            <optgroup label="年金（複数あれば年金3〜6も使う）">
              ${pensionOpts}
            </optgroup>
            <optgroup label="その他">
              ${otherOpts}
            </optgroup>
          </select>
        </div>
        <div class="form-group">
          <label for="incDate">日付</label>
          <input type="date" id="incDate" required />
        </div>
        <div class="form-group">
          <label for="incAmount">金額（円）</label>
          <input type="number" id="incAmount" inputmode="numeric" placeholder="例：150000" min="0" required />
        </div>
        <div class="form-group">
          <label for="incMemo">メモ（任意）</label>
          <input type="text" id="incMemo" placeholder="例：〇月分、企業年金、共済年金など" />
        </div>
        <button type="submit" class="btn btn-primary">＋ 追加する</button>
      </form>
    </div>
    <div class="card">
      <p style="font-size:18px;font-weight:800;margin:0 0 10px">記録一覧（${items.length}件）</p>
      ${items.length === 0
        ? '<p class="empty-msg">まだ記録がありません</p>'
        : items.map((r) => `
          <div class="list-item">
            <div class="list-main">
              <div class="list-date">${fmtDate(r.date)} · ${incomeTypeLabel(r.type)}</div>
              <div class="list-title">${r.memo ? escapeHtml(r.memo) : incomeTypeLabel(r.type)}</div>
            </div>
            <div class="list-amount">${fmtYen(r.amount)}</div>
            <button class="btn btn-danger" data-del-inc="${r.id}" style="width:auto">削除</button>
          </div>
        `).join("")}
      ${items.length > 0 ? `
        <div style="margin-top:14px;font-size:18px">
          ${PENSION_TYPE_IDS.map((id) => {
            const s = sumIncome(id);
            return s > 0 ? `<div>${incomeTypeLabel(id)}：${fmtYen(s)}</div>` : "";
          }).join("")}
          ${sumIncome("pension") > 0 ? `<div>${incomeTypeLabel("pension")}：${fmtYen(sumIncome("pension"))}</div>` : ""}
          ${sumPension() > 0 ? `<div style="font-weight:800">年金 小計：${fmtYen(sumPension())}</div>` : ""}
          ${["parttime", "other"].map((id) => {
            const s = sumIncome(id);
            return s > 0 ? `<div>${incomeTypeLabel(id)}：${fmtYen(s)}</div>` : "";
          }).join("")}
          <div style="font-size:22px;font-weight:800;margin-top:8px">合計 ${fmtYen(sumIncome())}</div>
        </div>
      ` : ""}
    </div>
  `;

  document.getElementById("incForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.income.push({
      id: uid(),
      type: document.getElementById("incType").value,
      date: document.getElementById("incDate").value,
      amount: Number(document.getElementById("incAmount").value),
      memo: document.getElementById("incMemo").value.trim()
    });
    saveState();
    renderIncome();
  });

  main.querySelectorAll("[data-del-inc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("この記録を削除しますか？")) {
        state.income = state.income.filter((r) => r.id !== btn.dataset.delInc);
        saveState();
        renderIncome();
      }
    });
  });
}

function renderSummary() {
  const medTotal = sumMedical();
  main.innerHTML = `
    <h2 class="page-title">${state.year}年 申告用まとめ</h2>
    <p class="hint">確定申告の準備用です。正式な申告は税務署・e-Tax等で行ってください。</p>
    <div class="card">
      <h3 style="font-size:22px;margin:0 0 12px">💴 収入</h3>
      <p style="font-size:16px;color:var(--muted);margin:0 0 10px">年金（国民・厚生・年金3〜6）</p>
      ${PENSION_TYPE_IDS.map((id) => {
        const s = sumIncome(id);
        return s > 0 ? `<div class="summary-row"><span>${incomeTypeLabel(id)}</span><span>${fmtYen(s)}</span></div>` : "";
      }).join("")}
      ${sumIncome("pension") > 0 ? `<div class="summary-row"><span>${incomeTypeLabel("pension")}</span><span>${fmtYen(sumIncome("pension"))}</span></div>` : ""}
      ${sumPension() > 0 ? `<div class="summary-row" style="font-weight:800"><span>年金 小計</span><span>${fmtYen(sumPension())}</span></div>` : ""}
      ${["parttime", "other"].map((id) => {
        const s = sumIncome(id);
        return s > 0 ? `<div class="summary-row"><span>${incomeTypeLabel(id)}</span><span>${fmtYen(s)}</span></div>` : "";
      }).join("")}
      <div class="summary-row total"><span>収入 合計</span><span>${fmtYen(sumIncome())}</span></div>
    </div>
    <div class="card">
      <h3 style="font-size:22px;margin:0 0 12px">📝 経費（保険・寄付など）</h3>
      ${EXPENSE_TYPES.map((t) => {
        const s = sumExpense(t.id);
        return s > 0 ? `<div class="summary-row"><span>${t.label}</span><span>${fmtYen(s)}</span></div>` : "";
      }).join("")}
      <div class="summary-row total"><span>経費 合計</span><span>${fmtYen(sumExpense())}</span></div>
      <p class="summary-note" style="margin-top:14px">
        控除証明書（生命保険、地震保険、ふるさと納税など）が届いたら、
        その数字と照合してください。
      </p>
    </div>
    <div class="card">
      <h3 style="font-size:22px;margin:0 0 12px">💊 医療費</h3>
      <div class="summary-row"><span>記録した医療費 合計</span><span>${fmtYen(medTotal)}</span></div>
      <div class="summary-row"><span>記録件数</span><span>${state.medical.length}件</span></div>
      <p class="summary-note" style="margin-top:14px">
        医療費控除は条件があります（自己負担の合計、所得による上限など）。
        この数字をそのまま申告額としないでください。
      </p>
    </div>
    <div class="card">
      <h3 style="font-size:22px;margin:0 0 12px">📝 申告時に使うメモ</h3>
      <p style="font-size:18px;margin:0;line-height:1.8">
        ・年金の「源泉徴収票」等の正式な数字を優先<br>
        ・このアプリは<strong>日々のメモ</strong>です<br>
        ・分からないことは税務署（<strong>#3110</strong>）や家族に相談
      </p>
    </div>
  `;
}

function renderChecklist() {
  main.innerHTML = `
    <h2 class="page-title">申告の準備チェック</h2>
    <p class="hint">届いた書類や準備ができたらチェックを入れましょう。</p>
    <div class="card">
      ${CHECKLIST.map((item) => {
        const checked = !!state.checklist[item.id];
        return `
          <label class="check-item">
            <input type="checkbox" data-check="${item.id}" ${checked ? "checked" : ""} />
            <div>
              <div class="check-text">${checked ? "✅ " : ""}${escapeHtml(item.text)}</div>
              <div class="check-desc">${escapeHtml(item.desc)}</div>
            </div>
          </label>
        `;
      }).join("")}
    </div>
    <div class="card">
      <p class="summary-note">
        確定申告の時期（だいたい2月〜3月）に、
        チェックリストを見ながら書類を揃えましょう。
      </p>
    </div>
  `;

  main.querySelectorAll("[data-check]").forEach((cb) => {
    cb.addEventListener("change", () => {
      state.checklist[cb.dataset.check] = cb.checked;
      saveState();
      renderChecklist();
    });
  });
}

// ---- ナビ ----
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentPage = btn.dataset.page;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    render();
    window.scrollTo(0, 0);
  });
});

// ---- 初期化 ----
initYearSelect();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
