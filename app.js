/* ===== Accessibility Survey App ===== */

// ---- Default checklist parameters ----
const DEFAULT_PARAMS = [
  { title: 'שלט כניסה נגישה' },
  { title: 'כניסה נגישה למבנה' },
  { title: 'כניסה לבעלי כלבי שירות' },
  { title: 'כפתור חירום / קריאת עזרה' },
  { title: 'מלתחה / חדר הלבשה' },
  { title: 'מרחב ממוגן נגיש' },
  { title: 'לולאת השראה (hearing loop)' },
  { title: 'ריהוט ומושבים לפי תקן' },
  { title: 'מעלית / גישה לכל קומות' },
  { title: 'חניית נכים' },
  { title: 'רמפה / משטח גישה' },
  { title: 'שירותים נגישים' },
  { title: 'ידיות ומעקות' },
  { title: 'רצפה ומסלולי הנחיה' },
  { title: 'תאורה מספקת' },
  { title: 'שילוט ברייל' },
];

const BUILT_IN_TEMPLATES = [
  {
    id: 'public_new',
    name: 'בניין ציבורי חדש',
    params: DEFAULT_PARAMS.map(p => p.title),
  },
  {
    id: 'public_old',
    name: 'בניין ציבורי ישן',
    params: [
      'כניסה נגישה למבנה', 'כפתור חירום / קריאת עזרה',
      'מרחב ממוגן נגיש', 'שירותים נגישים', 'ידיות ומעקות',
      'תאורה מספקת', 'חניית נכים',
    ],
  },
  {
    id: 'business',
    name: 'עסק / מסחר',
    params: [
      'שלט כניסה נגישה', 'כניסה נגישה למבנה', 'כניסה לבעלי כלבי שירות',
      'ריהוט ומושבים לפי תקן', 'שירותים נגישים', 'חניית נכים', 'רמפה / משטח גישה',
    ],
  },
];

// ---- State ----
const state = {
  cover: {
    business: '', client: '', address: '', date: '', consultant: '', license: '', notes: ''
  },
  photo: null, // base64
  params: [],
  editingParamIdx: null,
  paramStatus: 'ok',
};

// ---- LocalStorage ----
function saveToStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function loadFromStorage(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}

function getDrafts() { return loadFromStorage('drafts') || []; }
function saveDraft(draft) {
  const drafts = getDrafts();
  const idx = drafts.findIndex(d => d.id === draft.id);
  if (idx >= 0) drafts[idx] = draft; else drafts.unshift(draft);
  saveToStorage('drafts', drafts);
}
function deleteDraft(id) {
  const drafts = getDrafts().filter(d => d.id !== id);
  saveToStorage('drafts', drafts);
}

function getUserTemplates() { return loadFromStorage('templates') || []; }
function saveUserTemplate(tpl) {
  const tpls = getUserTemplates();
  const idx = tpls.findIndex(t => t.id === tpl.id);
  if (idx >= 0) tpls[idx] = tpl; else tpls.unshift(tpl);
  saveToStorage('templates', tpls);
}
function deleteUserTemplate(id) {
  const tpls = getUserTemplates().filter(t => t.id !== id);
  saveToStorage('templates', tpls);
}

// ---- Toast ----
let toastTimer;
function toast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = type ? `show ${type}` : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2500);
}

// ---- Tab Navigation ----
function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${name}`));
  if (name === 'preview') renderPreview();
}

// ---- Cover Page Form ----
function syncCoverFromForm() {
  state.cover.business = document.getElementById('field-business').value;
  state.cover.client = document.getElementById('field-client').value;
  state.cover.address = document.getElementById('field-address').value;
  state.cover.date = document.getElementById('field-date').value;
  state.cover.consultant = document.getElementById('field-consultant').value;
  state.cover.license = document.getElementById('field-license').value;
  state.cover.notes = document.getElementById('field-notes').value;
}

function populateCoverForm() {
  document.getElementById('field-business').value = state.cover.business || '';
  document.getElementById('field-client').value = state.cover.client || '';
  document.getElementById('field-address').value = state.cover.address || '';
  document.getElementById('field-date').value = state.cover.date || '';
  document.getElementById('field-consultant').value = state.cover.consultant || '';
  document.getElementById('field-license').value = state.cover.license || '';
  document.getElementById('field-notes').value = state.cover.notes || '';
  updateCoverPhoto();
}

// ---- Photo ----
function updateCoverPhoto() {
  const preview = document.getElementById('cover-photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  const removeBtn = document.getElementById('btn-remove-photo');
  if (state.photo) {
    preview.src = state.photo;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display = '';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = '';
    removeBtn.style.display = 'none';
  }
}

// ---- Checklist Rendering ----
function statusLabel(s) {
  if (s === 'ok') return 'תקין';
  if (s === 'nok') return 'לא תקין';
  return 'לא רלוונטי';
}

function renderChecklist() {
  const container = document.getElementById('checklist-items');
  if (state.params.length === 0) {
    container.innerHTML = '<div class="empty-state">אין פרמטרים. לחץ "+ הוסף פרמטר" או טען תבנית.</div>';
  } else {
    container.innerHTML = state.params.map((p, i) => `
      <div class="param-item status-${p.status || 'na'}">
        <div class="param-header">
          <span class="param-title">${escHtml(p.title)}</span>
          <span class="param-status-badge">${statusLabel(p.status || 'na')}</span>
        </div>
        ${p.notes ? `<div class="param-notes">${escHtml(p.notes)}</div>` : ''}
        ${p.cost && p.status === 'nok' ? `<div class="param-cost">עלות משוערת: ₪${Number(p.cost).toLocaleString('he-IL')}</div>` : ''}
        <div class="param-actions">
          <button class="btn-secondary" onclick="openParamModal(${i})">עריכה</button>
          <button class="btn-ghost btn-danger" onclick="deleteParam(${i})">מחק</button>
        </div>
      </div>
    `).join('');
  }
  updateSummary();
}

function updateSummary() {
  const ok = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const cost = state.params.filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);
  document.getElementById('summary-ok').textContent = `תקין: ${ok}`;
  document.getElementById('summary-nok').textContent = `לא תקין: ${nok}`;
  document.getElementById('summary-cost').textContent = `עלות משוערת: ₪${cost.toLocaleString('he-IL')}`;
}

function deleteParam(idx) {
  state.params.splice(idx, 1);
  renderChecklist();
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Param Modal ----
function openParamModal(idx) {
  const modal = document.getElementById('modal-param');
  const isEdit = idx !== undefined && idx !== null;
  state.editingParamIdx = isEdit ? idx : null;

  const p = isEdit ? state.params[idx] : { title: '', status: 'ok', notes: '', cost: '' };
  document.getElementById('param-title').value = p.title || '';
  document.getElementById('param-notes').value = p.notes || '';
  document.getElementById('param-cost').value = p.cost || '';

  state.paramStatus = p.status || 'ok';
  updateStatusButtons();

  modal.style.display = 'flex';
  document.getElementById('param-title').focus();
}

function closeParamModal() {
  document.getElementById('modal-param').style.display = 'none';
}

function updateStatusButtons() {
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === state.paramStatus);
  });
  const costGroup = document.getElementById('cost-group');
  costGroup.style.display = state.paramStatus === 'nok' ? '' : 'none';
}

function saveParam() {
  const title = document.getElementById('param-title').value.trim();
  if (!title) { toast('נא להזין שם פרמטר', 'error'); return; }
  const param = {
    title,
    status: state.paramStatus,
    notes: document.getElementById('param-notes').value.trim(),
    cost: state.paramStatus === 'nok' ? document.getElementById('param-cost').value : '',
  };
  if (state.editingParamIdx !== null) {
    state.params[state.editingParamIdx] = param;
  } else {
    state.params.push(param);
  }
  renderChecklist();
  closeParamModal();
  toast('הפרמטר נשמר', 'success');
}

// ---- Templates ----
function openLoadTemplateModal() {
  const all = [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
  const list = document.getElementById('load-template-list');
  if (all.length === 0) {
    list.innerHTML = '<div class="empty-state">אין תבניות שמורות</div>';
  } else {
    list.innerHTML = all.map(t => `
      <div class="template-item">
        <div>
          <div class="template-item-name">${escHtml(t.name)}</div>
          <div class="template-item-meta">${t.params.length} פרמטרים</div>
        </div>
        <div class="template-item-actions">
          <button class="btn-secondary" onclick="loadTemplate('${t.id}')">טען</button>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('modal-load-template').style.display = 'flex';
}

function loadTemplate(id) {
  const all = [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
  const tpl = all.find(t => t.id === id);
  if (!tpl) return;
  state.params = tpl.params.map(title => ({ title, status: 'ok', notes: '', cost: '' }));
  renderChecklist();
  document.getElementById('modal-load-template').style.display = 'none';
  toast(`תבנית "${tpl.name}" נטענה`, 'success');
}

function openSaveTemplateModal() {
  document.getElementById('template-name-input').value = '';
  document.getElementById('modal-save-template').style.display = 'flex';
}

function confirmSaveTemplate() {
  const name = document.getElementById('template-name-input').value.trim();
  if (!name) { toast('נא להזין שם תבנית', 'error'); return; }
  const tpl = {
    id: 'user_' + Date.now(),
    name,
    params: state.params.map(p => p.title),
  };
  saveUserTemplate(tpl);
  document.getElementById('modal-save-template').style.display = 'none';
  toast('התבנית נשמרה', 'success');
}

// ---- Manage Templates Modal ----
function openTemplatesModal() {
  renderTemplatesModal();
  document.getElementById('modal-templates').style.display = 'flex';
}

function renderTemplatesModal() {
  const tpls = getUserTemplates();
  const list = document.getElementById('template-list');
  if (tpls.length === 0) {
    list.innerHTML = '<div class="empty-state">אין תבניות מותאמות אישית</div>';
  } else {
    list.innerHTML = tpls.map(t => `
      <div class="template-item">
        <div>
          <div class="template-item-name">${escHtml(t.name)}</div>
          <div class="template-item-meta">${t.params.length} פרמטרים</div>
        </div>
        <div class="template-item-actions">
          <button class="btn-ghost btn-danger" onclick="confirmDeleteTemplate('${t.id}')">מחק</button>
        </div>
      </div>
    `).join('');
  }
}

function confirmDeleteTemplate(id) {
  if (confirm('למחוק תבנית זו?')) {
    deleteUserTemplate(id);
    renderTemplatesModal();
    toast('התבנית נמחקה');
  }
}

// ---- Drafts ----
function saveDraftNow() {
  syncCoverFromForm();
  const draft = {
    id: state.draftId || ('draft_' + Date.now()),
    savedAt: new Date().toISOString(),
    business: state.cover.business || 'ללא שם',
    cover: { ...state.cover },
    photo: state.photo,
    params: JSON.parse(JSON.stringify(state.params)),
  };
  state.draftId = draft.id;
  saveDraft(draft);
  toast('הטיוטה נשמרה', 'success');
}

function openReportsModal() {
  renderReportsModal();
  document.getElementById('modal-reports').style.display = 'flex';
}

function renderReportsModal() {
  const drafts = getDrafts();
  const list = document.getElementById('reports-list');
  if (drafts.length === 0) {
    list.innerHTML = '<div class="empty-state">אין דוחות שמורים</div>';
  } else {
    list.innerHTML = drafts.map(d => `
      <div class="template-item">
        <div>
          <div class="template-item-name">${escHtml(d.business)}</div>
          <div class="template-item-meta">${new Date(d.savedAt).toLocaleDateString('he-IL')}</div>
        </div>
        <div class="template-item-actions">
          <button class="btn-secondary" onclick="loadDraft('${d.id}')">פתח</button>
          <button class="btn-ghost btn-danger" onclick="confirmDeleteDraft('${d.id}')">מחק</button>
        </div>
      </div>
    `).join('');
  }
}

function loadDraft(id) {
  const draft = getDrafts().find(d => d.id === id);
  if (!draft) return;
  state.cover = { ...draft.cover };
  state.photo = draft.photo || null;
  state.params = JSON.parse(JSON.stringify(draft.params || []));
  state.draftId = draft.id;
  populateCoverForm();
  renderChecklist();
  document.getElementById('modal-reports').style.display = 'none';
  showTab('cover');
  toast('הדוח נטען', 'success');
}

function confirmDeleteDraft(id) {
  if (confirm('למחוק דוח זה?')) {
    deleteDraft(id);
    renderReportsModal();
    toast('הדוח נמחק');
  }
}

// ---- Preview ----
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return dateStr; }
}

function renderPreview() {
  syncCoverFromForm();
  const c = state.cover;
  const container = document.getElementById('pdf-preview');

  const ok = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const na = state.params.filter(p => p.status === 'na').length;
  const totalCost = state.params.filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);

  const photoHtml = state.photo
    ? `<img class="cover-photo" src="${state.photo}" alt="תמונת שער">`
    : '';

  const checklistHtml = state.params.length === 0
    ? '<div class="empty-state">לא הוגדרו פרמטרים</div>'
    : state.params.map(p => `
        <div class="preview-checklist-item ${p.status || 'na'}">
          <div class="preview-item-title">${escHtml(p.title)}</div>
          <div class="preview-item-status">${statusLabel(p.status || 'na')}</div>
          ${p.notes ? `<div class="preview-item-notes">${escHtml(p.notes)}</div>` : ''}
          ${p.cost && p.status === 'nok' ? `<div class="preview-item-cost">עלות משוערת: ₪${Number(p.cost).toLocaleString('he-IL')}</div>` : ''}
        </div>
      `).join('');

  container.innerHTML = `
    <!-- Cover Page -->
    <div class="preview-page">
      <div class="preview-header-bar">
        <div class="preview-logo-area">נגישות</div>
        <div class="preview-page-title">סקר נגישות מתו"ס</div>
      </div>

      <div class="cover-business-name">${escHtml(c.business) || 'שם העסק'}</div>
      <div class="cover-subtitle">סקר נגישות מתו"ס</div>

      ${photoHtml}

      <table class="cover-details-table">
        <tr><td>לקוח:</td><td>${escHtml(c.client)}</td></tr>
        <tr><td>כתובת:</td><td>${escHtml(c.address)}</td></tr>
        <tr><td>תאריך הסקר:</td><td>${formatDate(c.date)}</td></tr>
        <tr><td>יועץ נגישות:</td><td>${escHtml(c.consultant)}</td></tr>
        <tr><td>מספר רישיון:</td><td>${escHtml(c.license)}</td></tr>
        ${c.notes ? `<tr><td>הערות כלליות:</td><td>${escHtml(c.notes)}</td></tr>` : ''}
      </table>

      <div class="preview-footer-bar">
        <span>סקר נגישות מתו"ס</span>
        <span>${formatDate(c.date)}</span>
      </div>
    </div>

    <!-- Summary Page -->
    <div class="preview-page">
      <div class="preview-header-bar">
        <div class="preview-logo-area">נגישות</div>
        <div class="preview-page-title">סיכום ממצאים</div>
      </div>

      <div class="preview-section-title">סיכום ממצאים</div>
      <div class="summary-box">
        <div class="summary-stat"><span class="summary-stat-num" style="color:var(--green)">${ok}</span><span class="summary-stat-label">תקין</span></div>
        <div class="summary-stat"><span class="summary-stat-num" style="color:var(--red)">${nok}</span><span class="summary-stat-label">לא תקין</span></div>
        <div class="summary-stat"><span class="summary-stat-num">${na}</span><span class="summary-stat-label">לא רלוונטי</span></div>
        <div class="summary-stat"><span class="summary-stat-num" style="color:#856404">₪${totalCost.toLocaleString('he-IL')}</span><span class="summary-stat-label">עלות משוערת</span></div>
      </div>

      <div class="preview-section-title">פרמטרי נגישות</div>
      ${checklistHtml}

      <div class="preview-footer-bar">
        <span>סקר נגישות מתו"ס | ${escHtml(c.business)}</span>
        <span>יועץ: ${escHtml(c.consultant)}</span>
      </div>
    </div>
  `;
}

// ---- PDF Generation ----
async function generatePDF(download = false) {
  syncCoverFromForm();
  const c = state.cover;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 0;

  // Helpers
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return [r, g, b];
  }

  const blue = hexToRgb('#1a4fa0');
  const bluePale = hexToRgb('#e8f0fb');
  const green = hexToRgb('#198754');
  const red = hexToRgb('#dc3545');
  const gray = hexToRgb('#6c757d');

  function setFont(size, style = 'normal', color = [30,30,30]) {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    // jsPDF has limited Hebrew support; we set font to helvetica for best compat
    doc.setFont('helvetica', style);
  }

  function headerBar(pageTitle) {
    doc.setFillColor(...blue);
    doc.rect(0, 0, W, 18, 'F');
    setFont(11, 'bold', [255,255,255]);
    doc.text('סקר נגישות מתו"ס', W - margin, 11, { align: 'right' });
    doc.text(pageTitle, margin, 11, { align: 'left' });
    y = 24;
  }

  function footerBar(pageNum) {
    doc.setFillColor(...bluePale);
    doc.rect(0, H - 14, W, 14, 'F');
    setFont(9, 'normal', blue);
    doc.text(`סקר נגישות מתו"ס | ${c.business || ''}`, W - margin, H - 5, { align: 'right' });
    doc.text(`עמוד ${pageNum}`, margin, H - 5, { align: 'left' });
  }

  function newPage(title, pageNum) {
    doc.addPage();
    headerBar(title);
    footerBar(pageNum);
    y = 24;
  }

  function checkNewPage(needed, title, pageNum) {
    if (y + needed > H - 20) {
      newPage(title, pageNum);
    }
  }

  // ======= PAGE 1: Cover =======
  headerBar('עמוד שער');
  footerBar(1);

  // Company name
  setFont(22, 'bold', blue);
  doc.text(c.business || 'שם העסק', W / 2, y + 8, { align: 'center' });
  y += 18;

  setFont(13, 'normal', gray);
  doc.text('סקר נגישות מתו"ס', W / 2, y, { align: 'center' });
  y += 10;

  // Cover photo
  if (state.photo) {
    try {
      const imgData = state.photo;
      const imgH = 60;
      doc.addImage(imgData, 'JPEG', margin, y, contentW, imgH, undefined, 'MEDIUM');
      y += imgH + 8;
    } catch(e) { /* skip if image fails */ }
  }

  // Divider
  doc.setDrawColor(...bluePale);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // Details table
  const rows = [
    ['לקוח', c.client],
    ['כתובת', c.address],
    ['תאריך הסקר', formatDate(c.date)],
    ['יועץ נגישות', c.consultant],
    ['מספר רישיון', c.license],
  ].filter(r => r[1]);

  if (c.notes) rows.push(['הערות כלליות', c.notes]);

  rows.forEach(([label, val]) => {
    if (!val) return;
    setFont(10, 'bold', blue);
    doc.text(label + ':', W - margin, y, { align: 'right' });
    setFont(10, 'normal', [30,30,30]);
    doc.text(String(val), W - margin - 38, y, { align: 'right' });
    y += 8;
  });

  // ======= PAGE 2+: Checklist =======
  const ok = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const na = state.params.filter(p => p.status === 'na').length;
  const totalCost = state.params.filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);

  let pageNum = 2;
  newPage('ממצאים וסיכום', pageNum);

  // Summary box
  doc.setFillColor(...bluePale);
  doc.roundedRect(margin, y, contentW, 24, 3, 3, 'F');
  setFont(10, 'bold', blue);
  doc.text('סיכום ממצאים', W - margin - 2, y + 6, { align: 'right' });

  const summaryItems = [
    { label: 'תקין', val: ok, color: green },
    { label: 'לא תקין', val: nok, color: red },
    { label: 'לא רלוונטי', val: na, color: gray },
    { label: 'עלות משוערת', val: `₪${totalCost.toLocaleString('he-IL')}`, color: [133, 100, 4] },
  ];

  summaryItems.forEach((item, i) => {
    const x = W - margin - 30 - i * 42;
    setFont(14, 'bold', item.color);
    doc.text(String(item.val), x, y + 14, { align: 'center' });
    setFont(8, 'normal', gray);
    doc.text(item.label, x, y + 20, { align: 'center' });
  });

  y += 30;

  // Section title
  setFont(12, 'bold', blue);
  doc.text('פרמטרי נגישות', W - margin, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(...bluePale);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // Checklist items
  state.params.forEach((p) => {
    const statusColors = { ok: green, nok: red, na: gray };
    const statusLabels = { ok: 'תקין', nok: 'לא תקין', na: 'לא רלוונטי' };
    const s = p.status || 'na';
    const color = statusColors[s];

    const lineH = 6;
    const notesLines = p.notes ? doc.splitTextToSize(p.notes, contentW - 10) : [];
    const itemH = 8 + lineH + (notesLines.length * 5) + (p.cost && s === 'nok' ? 5 : 0) + 4;

    checkNewPage(itemH, 'ממצאים וסיכום (המשך)', pageNum);

    // Left bar
    doc.setFillColor(...color);
    doc.rect(W - margin, y, 3, itemH - 4, 'F');

    // Background
    const bgColor = s === 'ok' ? [240, 250, 245] : s === 'nok' ? [255, 245, 245] : [248, 249, 250];
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, y, contentW - 3, itemH - 4, 2, 2, 'F');

    // Title
    setFont(10, 'bold', [30,30,30]);
    doc.text(p.title, W - margin - 5, y + 6, { align: 'right' });

    // Status badge
    setFont(9, 'bold', color);
    doc.text(statusLabels[s], margin + 40, y + 6, { align: 'left' });

    let itemY = y + 6 + lineH;

    if (notesLines.length > 0) {
      setFont(9, 'normal', gray);
      notesLines.forEach(line => {
        doc.text(line, W - margin - 5, itemY, { align: 'right' });
        itemY += 5;
      });
    }

    if (p.cost && s === 'nok') {
      setFont(9, 'bold', [133, 100, 4]);
      doc.text(`עלות משוערת: ₪${Number(p.cost).toLocaleString('he-IL')}`, margin + 5, itemY);
      itemY += 5;
    }

    y += itemH;
  });

  if (download) {
    const filename = `סקר_נגישות_${(c.business || 'דוח').replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    toast('הורד בהצלחה!', 'success');
  } else {
    return doc.output('datauristring');
  }
}

// ---- Event Wiring ----
function init() {
  // Set today's date as default
  const dateField = document.getElementById('field-date');
  if (!dateField.value) {
    dateField.value = new Date().toISOString().split('T')[0];
    state.cover.date = dateField.value;
  }

  // Load default params
  if (state.params.length === 0) {
    state.params = DEFAULT_PARAMS.map(p => ({ ...p, status: 'ok', notes: '', cost: '' }));
    renderChecklist();
  }

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Photo
  const photoInput = document.getElementById('photo-input');
  const photoArea = document.getElementById('photo-area');
  photoArea.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.photo = ev.target.result;
      updateCoverPhoto();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-remove-photo').addEventListener('click', e => {
    e.stopPropagation();
    state.photo = null;
    photoInput.value = '';
    updateCoverPhoto();
  });

  // Save draft
  document.getElementById('btn-save-draft').addEventListener('click', saveDraftNow);

  // Checklist toolbar
  document.getElementById('btn-add-param').addEventListener('click', () => openParamModal(null));
  document.getElementById('btn-load-template').addEventListener('click', openLoadTemplateModal);
  document.getElementById('btn-save-template').addEventListener('click', openSaveTemplateModal);

  // Generate PDF (from checklist tab)
  document.getElementById('btn-generate-pdf').addEventListener('click', () => {
    showTab('preview');
  });

  // Download PDF
  document.getElementById('btn-download-pdf').addEventListener('click', () => generatePDF(true));

  // Refresh preview
  document.getElementById('btn-refresh-preview').addEventListener('click', renderPreview);

  // Header buttons
  document.getElementById('btn-reports').addEventListener('click', openReportsModal);
  document.getElementById('btn-templates').addEventListener('click', openTemplatesModal);

  // Param modal buttons
  document.getElementById('btn-param-save').addEventListener('click', saveParam);
  document.getElementById('btn-param-cancel').addEventListener('click', closeParamModal);

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.paramStatus = btn.dataset.val;
      updateStatusButtons();
    });
  });

  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', () => {
      bd.closest('.modal').style.display = 'none';
    });
  });

  // Template modals
  document.getElementById('btn-templates-close').addEventListener('click', () => {
    document.getElementById('modal-templates').style.display = 'none';
  });
  document.getElementById('btn-load-template-close').addEventListener('click', () => {
    document.getElementById('modal-load-template').style.display = 'none';
  });
  document.getElementById('btn-reports-close').addEventListener('click', () => {
    document.getElementById('modal-reports').style.display = 'none';
  });
  document.getElementById('btn-confirm-save-template').addEventListener('click', confirmSaveTemplate);
  document.getElementById('btn-cancel-save-template').addEventListener('click', () => {
    document.getElementById('modal-save-template').style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', init);
