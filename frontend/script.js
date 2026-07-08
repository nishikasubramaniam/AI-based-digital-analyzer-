// ============================================================
// Config — same server serves frontend + backend now, so this
// stays empty (relative URLs). Adhu wrong nu therinjaal mattum
// full URL potukanga, per: "http://127.0.0.1:5000"
// ============================================================
const API_BASE = "";

// ============================================================
// Auth (demo-level, localStorage based)
// ============================================================
function register() {
  const username = document.getElementById("newUser").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("newPass").value;

  if (!username || !email || !password) {
    document.getElementById("msg").textContent = "Please fill all fields.";
    return;
  }
  localStorage.setItem("username", username);
  localStorage.setItem("password", password);
  alert("Registration successful — please log in.");
  window.location.href = "login.html";
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const savedUser = localStorage.getItem("username");
  const savedPass = localStorage.getItem("password");

  if (username === savedUser && password === savedPass) {
    localStorage.setItem("loggedIn", "true");
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("msg").textContent = "Invalid username or password.";
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

function guardPage() {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

// ============================================================
// Backend status stamp (dashboard + crud pages)
// ============================================================
async function checkHealth() {
  const stamp = document.getElementById("statusStamp");
  if (!stamp) return;
  try {
    const r = await fetch(`${API_BASE}/api/health`);
    if (!r.ok) throw new Error();
    stamp.textContent = "live";
    stamp.classList.add("live");
    return true;
  } catch (e) {
    stamp.textContent = "offline";
    stamp.classList.remove("live");
    return false;
  }
}

// ============================================================
// Toast helper
// ============================================================
function showToast(msg, isErr = false) {
  const t = document.getElementById("toast");
  if (!t) { alert(msg); return; }
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => (t.className = "toast"), 2600);
}

// ============================================================
// Dashboard page
// ============================================================
async function initDashboard() {
  guardPage();
  await checkHealth();
  await loadDashboardSummary();
}

async function loadDashboardSummary() {
  const box = document.getElementById("summaryBox");
  if (!box) return;
  try {
    const r = await fetch(`${API_BASE}/data`);
    const j = await r.json();
    if (!j.data || j.data.length === 0) {
      box.innerHTML = `<div class="stat-strip">
        <div class="stat-tile"><div class="num">0</div><div class="label">Records</div></div>
        <div class="stat-tile"><div class="num">0</div><div class="label">Columns</div></div>
      </div>`;
      return;
    }
    box.innerHTML = `<div class="stat-strip">
      <div class="stat-tile"><div class="num">${j.total_rows}</div><div class="label">Records</div></div>
      <div class="stat-tile"><div class="num">${j.columns.length}</div><div class="label">Columns</div></div>
    </div>`;
  } catch (e) {
    box.innerHTML = `<p class="hint">Could not reach backend. Make sure app.py is running.</p>`;
  }
}

async function dashboardUpload() {
  const fileInput = document.getElementById("csvFile");
  const statusEl = document.getElementById("uploadStatus");
  if (!fileInput.files.length) { showToast("Choose a CSV file first.", true); return; }

  const fd = new FormData();
  fd.append("file", fileInput.files[0]);
  try {
    const r = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Upload failed");
    statusEl.textContent = `Uploaded — ${j.rows} rows, columns: ${j.columns.join(", ")}`;
    statusEl.style.color = "var(--ok-green)";
    await loadDashboardSummary();
  } catch (e) {
    statusEl.textContent = e.message;
    statusEl.style.color = "var(--danger)";
  }
}

// ============================================================
// CRUD page
// ============================================================
let state = { columns: [], data: [], page: 1, limit: 8, total: 0, filtered: false };

async function initCrud() {
  guardPage();
  await checkHealth();
  await loadData();
}

async function loadData() {
  try {
    const r = await fetch(`${API_BASE}/data?page=${state.page}&limit=${state.limit}`);
    const j = await r.json();
    if (!j.data || j.data.length === 0) { renderEmpty(); return; }

    state.columns = j.columns;
    state.data = j.data;
    state.total = j.total_rows;
    state.filtered = false;

    document.getElementById("addCard").style.display = "block";
    document.getElementById("filterCard").style.display = "block";
    document.getElementById("statsCard").style.display = "block";

    buildAddForm();
    buildFilterOptions();
    renderTable();
  } catch (e) {
    showToast("Could not reach backend.", true);
  }
}

function renderEmpty() {
  document.getElementById("tableWrap").innerHTML = `
    <div class="empty-state">
      <div class="glyph">§</div>
      <p>No entries yet. Go to Dashboard and upload a CSV to open the ledger.</p>
    </div>`;
  document.getElementById("pager").style.display = "none";
  document.getElementById("ledgerMeta").textContent = "—";
}

function buildAddForm() {
  const wrap = document.getElementById("addFields");
  wrap.innerHTML = state.columns
    .map(col => `<label for="add_${col}">${col}</label><input type="text" id="add_${col}" placeholder="${col}">`)
    .join("");
}

function buildFilterOptions() {
  document.getElementById("filterCol").innerHTML =
    state.columns.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderTable() {
  const rows = state.data, cols = state.columns;
  document.getElementById("ledgerTitle").textContent = state.filtered ? "Search results" : "The Ledger";
  document.getElementById("ledgerMeta").textContent = `${state.total} total entr${state.total === 1 ? "y" : "ies"}`;

  let html = `<table><thead><tr><th class="margin-col">№</th>`;
  cols.forEach(c => (html += `<th>${c}</th>`));
  html += `<th></th></tr></thead><tbody>`;

  rows.forEach(row => {
    const id = row._id;
    html += `<tr><td class="margin-col">${id}</td>`;
    cols.forEach(c => {
      const val = row[c] !== undefined && row[c] !== null ? row[c] : "";
      html += `<td contenteditable="true" data-col="${c}" onblur="cellEdited(this, ${id})">${val}</td>`;
    });
    html += `<td class="action-col"><button class="btn-void btn-small" onclick="deleteRow(${id})">Void</button></td></tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById("tableWrap").innerHTML = html;

  if (!state.filtered) {
    document.getElementById("pager").style.display = "flex";
    const start = (state.page - 1) * state.limit + 1;
    const end = Math.min(state.page * state.limit, state.total);
    document.getElementById("pageInfo").textContent = `Showing ${start}–${end} of ${state.total}`;
    document.getElementById("prevBtn").disabled = state.page <= 1;
    document.getElementById("nextBtn").disabled = state.page * state.limit >= state.total;
  } else {
    document.getElementById("pager").style.display = "none";
  }
}

async function cellEdited(el, id) {
  const col = el.getAttribute("data-col");
  const val = el.textContent.trim();
  try {
    const r = await fetch(`${API_BASE}/data/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [col]: val }),
    });
    if (!r.ok) throw new Error("Update failed");
    showToast(`Entry ${id} amended.`);
  } catch (e) {
    showToast(e.message, true);
  }
}

async function deleteRow(id) {
  if (!confirm(`Void entry ${id}? This cannot be undone.`)) return;
  try {
    const r = await fetch(`${API_BASE}/data/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Delete failed");
    showToast(`Entry ${id} voided.`);
    await loadData();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function addRow() {
  const payload = {};
  state.columns.forEach(c => {
    const v = document.getElementById(`add_${c}`).value;
    if (v !== "") payload[c] = v;
  });
  if (Object.keys(payload).length === 0) { showToast("Fill in at least one field.", true); return; }
  try {
    const r = await fetch(`${API_BASE}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Add failed");
    showToast("New entry recorded.");
    state.columns.forEach(c => (document.getElementById(`add_${c}`).value = ""));
    await loadData();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function applyFilter() {
  const col = document.getElementById("filterCol").value;
  const val = document.getElementById("filterVal").value;
  if (!val) { showToast("Type something to search for.", true); return; }
  try {
    const r = await fetch(`${API_BASE}/data/filter?column=${encodeURIComponent(col)}&value=${encodeURIComponent(val)}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Search failed");
    state.data = j.data;
    state.filtered = true;
    state.total = j.matched_rows;
    renderTable();
  } catch (e) {
    showToast(e.message, true);
  }
}

function clearFilter() {
  document.getElementById("filterVal").value = "";
  state.page = 1;
  loadData();
}

async function loadStats() {
  try {
    const r = await fetch(`${API_BASE}/data/stats`);
    const j = await r.json();
    const grid = document.getElementById("statsGrid");
    if (j.message) { grid.innerHTML = `<div class="hint">${j.message}</div>`; return; }
    grid.innerHTML = Object.entries(j)
      .map(
        ([col, s]) => `
      <div class="stat-box">
        <div class="col-name">${col}</div>
        <div class="row"><span>mean</span><span>${s.mean}</span></div>
        <div class="row"><span>min</span><span>${s.min}</span></div>
        <div class="row"><span>max</span><span>${s.max}</span></div>
        <div class="row"><span>sum</span><span>${s.sum}</span></div>
      </div>`
      )
      .join("");
  } catch (e) {
    showToast("Could not load figures.", true);
  }
}

function downloadCSV(e) {
  e.preventDefault();
  window.open(`${API_BASE}/data/download`, "_blank");
}

function changePage(delta) {
  state.page += delta;
  loadData();
}
