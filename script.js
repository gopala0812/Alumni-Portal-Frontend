// script.js - single file for all pages
const backendURL = "https://alumni-portal-backend-qasy.onrender.com";

const FETCH_TIMEOUT = 10000;

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }
function setStatus(id, msg) { const el = $(id); if (el) el.textContent = msg; }
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// fetch with timeout
async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  opts.signal = ctrl.signal;
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, opts);
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

// ---------- sidebar & theme ----------
const sidebar = $('sidebar');
const hamburger = $('hamburger');
const closeSidebarBtn = $('closeSidebar');
const themeToggle = $('themeToggle');

function showSidebar() { sidebar.classList.remove('hidden'); sidebar.classList.add('visible'); }
function hideSidebar() { sidebar.classList.add('hidden'); sidebar.classList.remove('visible'); }
function toggleSidebar() { if (sidebar.classList.contains('visible')) hideSidebar(); else showSidebar(); }
function closeSidebarIfMobile() { if (window.innerWidth <= 900) hideSidebar(); }

// Sidebar toggle + hamburger visibility
hamburger?.addEventListener('click', () => {
  toggleSidebar();
  // hide hamburger when sidebar visible
  if (sidebar.classList.contains('visible')) {
    hamburger.style.display = 'none';
  }
});

closeSidebarBtn?.addEventListener('click', () => {
  hideSidebar();
  hamburger.style.display = 'block'; // show back when closed
});

document.querySelectorAll('.nav-link').forEach(a =>
  a.addEventListener('click', () => {
    closeSidebarIfMobile();
    hamburger.style.display = 'block';
  })
);

// hide hamburger permanently on large screens (desktop)
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    hamburger.style.display = 'none';
    showSidebar();
  } else {
    hamburger.style.display = 'block';
    hideSidebar();
  }
});

// initial load behavior
if (window.innerWidth > 900) {
  hamburger.style.display = 'none';
  showSidebar();
} else {
  hamburger.style.display = 'block';
  hideSidebar();
}

function loadTheme() {
  const t = localStorage.getItem('theme') || 'light';
  if (t === 'dark') document.body.classList.add('dark');
}
function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}
themeToggle?.addEventListener('click', toggleTheme);
loadTheme();

// ---------- modal ----------
function openModal(html) { const m = $('modal'); $('modalBody').innerHTML = html; m.classList.remove('hidden'); }
function closeModal() { const m = $('modal'); m.classList.add('hidden'); $('modalBody').innerHTML = ''; }
$('modalClose')?.addEventListener('click', closeModal);
$('modal')?.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// ---------- search ----------
let _searchTimer = null;
const SEARCH_DEBOUNCE_MS = 300;

async function _doSearch(paramsStr) {
  try {
    const res = await fetchWithTimeout(`${backendURL}/search?${paramsStr}`);
    if (!res.ok) throw new Error('Server ' + res.status);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error('Invalid JSON array from server');
    renderSearchResults(data);
    setStatus('searchStatus', data.length > 0 ? `Found ${data.length} result(s).` : 'No results found.');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('search error', err);
    setStatus('searchStatus', 'No results found.');
    try { renderSearchResults([]); } catch (e) {}
  } finally {
    _searchTimer = null;
  }
}

async function searchPageSearch() {
  const id = $('s_id')?.value.trim() || '';
  const name = $('s_name')?.value.trim() || '';
  const department = $('s_department')?.value.trim() || '';
  const year = $('s_year')?.value.trim() || '';
  const company = $('s_company')?.value.trim() || '';
  const location = $('s_location')?.value.trim() || '';

  if (!id && !name && !department && !year && !company && !location) {
    renderSearchResults([]);
    setStatus('searchStatus', '');
    return;
  }

  setStatus('searchStatus', '🔄 Searching...');
  const params = new URLSearchParams();
  if (id) params.append('id', id);
  if (name) params.append('name', name);
  if (department) params.append('department', department);
  if (year) params.append('year', year);
  if (company) params.append('company', company);
  if (location) params.append('location', location);

  if (_searchTimer) clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _doSearch(params.toString()), SEARCH_DEBOUNCE_MS);
}

// ---------- render ----------
function _ensureResultsTable() {
  let table = $('resultsTable');
  let body = $('resultsBody');
  const container = $('results');

  if (!table || !body) {
    container.innerHTML = `
      <table id="resultsTable" class="results-table hidden" aria-live="polite">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Department</th><th>Year</th><th>Company</th><th>Action</th>
          </tr>
        </thead>
        <tbody id="resultsBody"></tbody>
      </table>
    `;
    table = $('resultsTable');
    body = $('resultsBody');
  }
  return { table, body, container };
}

function renderSearchResults(data) {
  const { table, body, container } = _ensureResultsTable();

  if (body) body.innerHTML = '';

  if (!data || data.length === 0) {
    if (table) table.classList.add('hidden');
    container.innerHTML = '<p>No results found.</p>';
    return;
  }

  const currentTable = $('resultsTable') || table;
  const currentBody = $('resultsBody') || body;

  currentTable.classList.remove('hidden');
  container.innerHTML = '';
  container.appendChild(currentTable);

  data.forEach(a => {
    const id = a.ID ?? a.id ?? '';
    const name = a.Name ?? a.name ?? '';
    const dept = a.Department ?? a.department ?? '';
    const yr = a.Year ?? a.year ?? '';
    const comp = a.Company ?? a.company ?? '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(id)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(dept)}</td>
      <td>${escapeHtml(yr)}</td>
      <td>${escapeHtml(comp)}</td>
      <td><button class="view-more-btn">View More</button></td>
    `;
    row.querySelector('.view-more-btn').addEventListener('click', () => showAlumniDetails(a));
    currentBody.appendChild(row);
  });
}

// ---------- details ----------
function showAlumniDetails(a) {
  const get = key => (a[key] ?? a[key.toLowerCase()] ?? '');
  const name = get('Name') || 'Alumni';

  let html = `<h3>${escapeHtml(name)}</h3><div class="alumni-details">`;
  const fields = ['ID', 'Name', 'Department', 'Year', 'Email', 'Phone', 'Address', 'Job', 'Company', 'CGPA'];
  fields.forEach(k => {
    html += `<p><strong>${k}:</strong> ${escapeHtml(get(k) || '—')}</p>`;
  });
  html += `</div>`;

  const email = get('Email');
  if (email) {
    const subject = encodeURIComponent(`Regarding Alumni Connect - ${name}`);
    html += `<p style="margin-top:10px;">
      <button class="contact-btn" onclick="window.location.href='mailto:${escapeHtml(email)}?subject=${subject}'">Contact Alumni</button>
    </p>`;
  }

  openModal(html);
}

// ---------- download (settings.html) ----------
async function downloadById(type = 'json') {
  const id = $('downloadId')?.value;
  const statusEl = $('downloadStatus');
  if (!id) { alert('Enter an Alumni ID'); return; }

  statusEl.textContent = 'Fetching data...';
  try {
    const res = await fetchWithTimeout(`${backendURL}/download?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Server ' + res.status);
    const data = await res.json();

    // Handle both array and single object responses
    const record = Array.isArray(data) ? data[0] : data;

    if (!record || Object.keys(record).length === 0) {
      statusEl.textContent = 'No record found';
      return;
    }

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `alumni_${id}.json`;
      a.click();
      statusEl.textContent = '✅ JSON downloaded';
    } else {
      if (!window.jspdf) {
        alert('PDF library not loaded');
        statusEl.textContent = 'PDF library missing';
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 12;

      for (const key of ['ID','Name','Department','Year','Email','Phone','Address','Job','Company','CGPA']) {
        const val = record[key] ?? record[key.toLowerCase()] ?? '';
        const line = `${key}: ${val}`;
        const lines = doc.splitTextToSize(line, 180);
        doc.text(lines, 10, y);
        y += lines.length * 7;
        if (y > 270) { doc.addPage(); y = 12; }
      }

      doc.save(`alumni_${id}.pdf`);
      statusEl.textContent = '✅ PDF downloaded';
    }
  } catch (err) {
    console.error('downloadById error', err);
    statusEl.textContent = '❌ Download failed. See console.';
  }
}

// ---------- init ----------
(function init() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  if (window.innerWidth <= 900) hideSidebar();
})();
