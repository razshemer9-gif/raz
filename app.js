'use strict';

// ─── Default parameters ────────────────────────────────────────────────────
const DEFAULT_PARAMS = [
  'שלט כניסה נגישה',
  'כניסה נגישה למבנה',
  'כניסה לבעלי כלבי שירות',
  'כפתור חירום / קריאת עזרה',
  'מלתחה / חדר הלבשה',
  'מרחב ממוגן נגיש',
  'לולאת השראה (hearing loop)',
  'ריהוט ומושבים לפי תקן',
  'מעלית / גישה לכל קומות',
  'חניית נכים',
  'רמפה / משטח גישה',
  'שירותים נגישים',
  'ידיות ומעקות',
  'רצפה ומסלולי הנחיה',
  'תאורה מספקת',
  'שילוט ברייל',
];

const BUILT_IN_TEMPLATES = [
  { id: 'public_new', name: 'בניין ציבורי חדש', params: DEFAULT_PARAMS.slice() },
  { id: 'public_old', name: 'בניין ציבורי ישן', params: [
    'כניסה נגישה למבנה','כפתור חירום / קריאת עזרה',
    'מרחב ממוגן נגיש','שירותים נגישים','ידיות ומעקות','תאורה מספקת','חניית נכים',
  ]},
  { id: 'business', name: 'עסק / מסחר', params: [
    'שלט כניסה נגישה','כניסה נגישה למבנה','כניסה לבעלי כלבי שירות',
    'ריהוט ומושבים לפי תקן','שירותים נגישים','חניית נכים','רמפה / משטח גישה',
  ]},
];

// ─── State ─────────────────────────────────────────────────────────────────
const state = {
  cover: { business:'', client:'', address:'', date:'', consultant:'', license:'', notes:'' },
  photo: null,
  params: [],
  editingIdx: null,
  paramStatus: 'ok',
  draftId: null,
};

// ─── Storage helpers ────────────────────────────────────────────────────────
function store(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}
function getDrafts()          { return load('acc_drafts', []); }
function getUserTemplates()   { return load('acc_templates', []); }

function saveDraft(draft) {
  const all = getDrafts();
  const i = all.findIndex(d => d.id === draft.id);
  i >= 0 ? (all[i] = draft) : all.unshift(draft);
  store('acc_drafts', all);
}
function deleteDraft(id)    { store('acc_drafts', getDrafts().filter(d => d.id !== id)); }
function saveTemplate(t)    {
  const all = getUserTemplates();
  const i = all.findIndex(x => x.id === t.id);
  i >= 0 ? (all[i] = t) : all.unshift(t);
  store('acc_templates', all);
}
function deleteTemplate(id) { store('acc_templates', getUserTemplates().filter(t => t.id !== id)); }

// ─── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

// ─── Utils ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtMoney(n) {
  try { return Number(n).toLocaleString('he-IL'); } catch(e) { return String(n); }
}
function fmtDate(s) {
  if (!s) return '';
  try { return new Date(s + 'T00:00:00').toLocaleDateString('he-IL', {year:'numeric',month:'long',day:'numeric'}); }
  catch(e) { return s; }
}
function statusLabel(s) {
  return s === 'ok' ? 'תקין' : s === 'nok' ? 'לא תקין' : 'לא רלוונטי';
}
function $ (id) { return document.getElementById(id); }

// ─── Tab navigation ─────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(s => {
    s.classList.toggle('active', s.id === 'tab-' + name);
  });
  if (name === 'preview') renderPreview();
}

// ─── Cover form ─────────────────────────────────────────────────────────────
function syncCover() {
  state.cover.business    = $('field-business').value;
  state.cover.client      = $('field-client').value;
  state.cover.address     = $('field-address').value;
  state.cover.date        = $('field-date').value;
  state.cover.consultant  = $('field-consultant').value;
  state.cover.license     = $('field-license').value;
  state.cover.notes       = $('field-notes').value;
}
function fillCover() {
  $('field-business').value   = state.cover.business   || '';
  $('field-client').value     = state.cover.client     || '';
  $('field-address').value    = state.cover.address    || '';
  $('field-date').value       = state.cover.date       || '';
  $('field-consultant').value = state.cover.consultant || '';
  $('field-license').value    = state.cover.license    || '';
  $('field-notes').value      = state.cover.notes      || '';
  refreshPhoto();
}

// ─── Photo ──────────────────────────────────────────────────────────────────
function refreshPhoto() {
  const img  = $('cover-photo-preview');
  const ph   = $('photo-placeholder');
  const rmbtn = $('btn-remove-photo');
  if (state.photo) {
    img.src = state.photo;
    img.style.display = 'block';
    ph.style.display  = 'none';
    rmbtn.style.display = '';
  } else {
    img.style.display   = 'none';
    ph.style.display    = '';
    rmbtn.style.display = 'none';
  }
}

// ─── Checklist ──────────────────────────────────────────────────────────────
function renderChecklist() {
  const container = $('checklist-items');
  if (!state.params.length) {
    container.innerHTML = '<div class="empty-state">אין פרמטרים — לחץ "+ הוסף פרמטר" או "טען תבנית"</div>';
  } else {
    container.innerHTML = state.params.map((p, i) => {
      const s = p.status || 'na';
      return `<div class="param-item status-${s}">
        <div class="param-header">
          <span class="param-title">${esc(p.title)}</span>
          <span class="param-status-badge">${statusLabel(s)}</span>
        </div>
        ${p.notes ? `<div class="param-notes">${esc(p.notes)}</div>` : ''}
        ${p.cost && s === 'nok' ? `<div class="param-cost">עלות משוערת: ₪${fmtMoney(p.cost)}</div>` : ''}
        <div class="param-actions">
          <button class="btn-secondary" onclick="openParamModal(${i})">עריכה</button>
          <button class="btn-ghost btn-danger" onclick="deleteParam(${i})">מחק</button>
        </div>
      </div>`;
    }).join('');
  }
  updateSummary();
}

function updateSummary() {
  const ok  = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const cost = state.params
    .filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);
  $('summary-ok').textContent   = 'תקין: ' + ok;
  $('summary-nok').textContent  = 'לא תקין: ' + nok;
  $('summary-cost').textContent = 'עלות: ₪' + fmtMoney(cost);
}

function deleteParam(idx) {
  state.params.splice(idx, 1);
  renderChecklist();
}

// ─── Param modal ─────────────────────────────────────────────────────────────
function openParamModal(idx) {
  state.editingIdx = (idx !== null && idx !== undefined) ? idx : null;
  const p = state.editingIdx !== null
    ? state.params[state.editingIdx]
    : { title:'', status:'ok', notes:'', cost:'' };

  $('param-title').value = p.title || '';
  $('param-notes').value = p.notes || '';
  $('param-cost').value  = p.cost  || '';
  state.paramStatus = p.status || 'ok';
  refreshStatusBtns();
  $('modal-param').style.display = 'flex';
  setTimeout(() => $('param-title').focus(), 100);
}

function closeParamModal() {
  $('modal-param').style.display = 'none';
}

function refreshStatusBtns() {
  ['ok','nok','na'].forEach(v => {
    const btn = $('sbtn-' + v);
    if (btn) btn.classList.toggle('active', v === state.paramStatus);
  });
  $('cost-group').style.display = state.paramStatus === 'nok' ? '' : 'none';
}

function saveParam() {
  const title = $('param-title').value.trim();
  if (!title) { toast('נא להזין שם פרמטר', 'error'); return; }
  const param = {
    title,
    status: state.paramStatus,
    notes:  $('param-notes').value.trim(),
    cost:   state.paramStatus === 'nok' ? $('param-cost').value : '',
  };
  if (state.editingIdx !== null) {
    state.params[state.editingIdx] = param;
  } else {
    state.params.push(param);
  }
  renderChecklist();
  closeParamModal();
  toast('הפרמטר נשמר', 'success');
}

// ─── Templates ───────────────────────────────────────────────────────────────
function openLoadTemplateModal() {
  const all = [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
  const list = $('load-template-list');
  list.innerHTML = all.length ? all.map(t =>
    `<div class="template-item">
      <div>
        <div class="template-item-name">${esc(t.name)}</div>
        <div class="template-item-meta">${t.params.length} פרמטרים</div>
      </div>
      <div class="template-item-actions">
        <button class="btn-secondary" onclick="loadTemplate('${t.id}')">טען</button>
      </div>
    </div>`
  ).join('') : '<div class="empty-state">אין תבניות</div>';
  $('modal-load-template').style.display = 'flex';
}

function loadTemplate(id) {
  const all = [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
  const tpl = all.find(t => t.id === id);
  if (!tpl) return;
  state.params = tpl.params.map(title => ({ title, status:'ok', notes:'', cost:'' }));
  renderChecklist();
  $('modal-load-template').style.display = 'none';
  toast('תבנית "' + tpl.name + '" נטענה', 'success');
}

function openSaveTemplateModal() {
  $('template-name-input').value = '';
  $('modal-save-template').style.display = 'flex';
  setTimeout(() => $('template-name-input').focus(), 100);
}

function confirmSaveTemplate() {
  const name = $('template-name-input').value.trim();
  if (!name) { toast('נא להזין שם', 'error'); return; }
  saveTemplate({ id: 'user_' + Date.now(), name, params: state.params.map(p => p.title) });
  $('modal-save-template').style.display = 'none';
  toast('התבנית נשמרה', 'success');
}

function openTemplatesModal() {
  const tpls = getUserTemplates();
  $('template-list').innerHTML = tpls.length ? tpls.map(t =>
    `<div class="template-item">
      <div>
        <div class="template-item-name">${esc(t.name)}</div>
        <div class="template-item-meta">${t.params.length} פרמטרים</div>
      </div>
      <div class="template-item-actions">
        <button class="btn-ghost btn-danger" onclick="confirmDeleteTemplate('${t.id}')">מחק</button>
      </div>
    </div>`
  ).join('') : '<div class="empty-state">אין תבניות מותאמות אישית</div>';
  $('modal-templates').style.display = 'flex';
}

function confirmDeleteTemplate(id) {
  if (!confirm('למחוק תבנית זו?')) return;
  deleteTemplate(id);
  openTemplatesModal();
  toast('התבנית נמחקה');
}

// ─── Drafts ───────────────────────────────────────────────────────────────────
function saveDraftNow() {
  syncCover();
  const draft = {
    id: state.draftId || ('draft_' + Date.now()),
    savedAt: new Date().toISOString(),
    business: state.cover.business || 'ללא שם',
    cover: Object.assign({}, state.cover),
    photo: state.photo,
    params: JSON.parse(JSON.stringify(state.params)),
  };
  state.draftId = draft.id;
  saveDraft(draft);
  toast('הטיוטה נשמרה', 'success');
}

function openReportsModal() {
  const drafts = getDrafts();
  $('reports-list').innerHTML = drafts.length ? drafts.map(d =>
    `<div class="template-item">
      <div>
        <div class="template-item-name">${esc(d.business)}</div>
        <div class="template-item-meta">${new Date(d.savedAt).toLocaleDateString('he-IL')}</div>
      </div>
      <div class="template-item-actions">
        <button class="btn-secondary" onclick="loadDraft('${d.id}')">פתח</button>
        <button class="btn-ghost btn-danger" onclick="confirmDeleteDraft('${d.id}')">מחק</button>
      </div>
    </div>`
  ).join('') : '<div class="empty-state">אין דוחות שמורים</div>';
  $('modal-reports').style.display = 'flex';
}

function loadDraft(id) {
  const draft = getDrafts().find(d => d.id === id);
  if (!draft) return;
  state.cover   = Object.assign({}, draft.cover);
  state.photo   = draft.photo || null;
  state.params  = JSON.parse(JSON.stringify(draft.params || []));
  state.draftId = draft.id;
  fillCover();
  renderChecklist();
  $('modal-reports').style.display = 'none';
  showTab('cover');
  toast('הדוח נטען', 'success');
}

function confirmDeleteDraft(id) {
  if (!confirm('למחוק דוח זה?')) return;
  deleteDraft(id);
  openReportsModal();
  toast('הדוח נמחק');
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function renderPreview() {
  syncCover();
  const c = state.cover;
  const ok  = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const na  = state.params.filter(p => p.status === 'na').length;
  const cost = state.params.filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);

  const photoHtml = state.photo
    ? `<img class="cover-photo" src="${state.photo}" alt="תמונת שער">`
    : '';

  const itemsHtml = state.params.length ? state.params.map(p => {
    const s = p.status || 'na';
    return `<div class="preview-checklist-item ${s}">
      <div class="preview-item-title">${esc(p.title)}</div>
      <div class="preview-item-status">${statusLabel(s)}</div>
      ${p.notes ? `<div class="preview-item-notes">${esc(p.notes)}</div>` : ''}
      ${p.cost && s === 'nok' ? `<div class="preview-item-cost">עלות משוערת: ₪${fmtMoney(p.cost)}</div>` : ''}
    </div>`;
  }).join('') : '<div class="empty-state">לא הוגדרו פרמטרים</div>';

  $('pdf-preview').innerHTML = `
    <div class="preview-page">
      <div class="preview-header-bar">
        <div class="preview-logo-area">נגישות</div>
        <div class="preview-page-title">סקר נגישות מתו"ס</div>
      </div>
      <div class="cover-business-name">${esc(c.business) || 'שם העסק'}</div>
      <div class="cover-subtitle">סקר נגישות מתו"ס</div>
      ${photoHtml}
      <table class="cover-details-table">
        ${c.client     ? `<tr><td>לקוח:</td><td>${esc(c.client)}</td></tr>` : ''}
        ${c.address    ? `<tr><td>כתובת:</td><td>${esc(c.address)}</td></tr>` : ''}
        ${c.date       ? `<tr><td>תאריך הסקר:</td><td>${fmtDate(c.date)}</td></tr>` : ''}
        ${c.consultant ? `<tr><td>יועץ נגישות:</td><td>${esc(c.consultant)}</td></tr>` : ''}
        ${c.license    ? `<tr><td>מספר רישיון:</td><td>${esc(c.license)}</td></tr>` : ''}
        ${c.notes      ? `<tr><td>הערות:</td><td>${esc(c.notes)}</td></tr>` : ''}
      </table>
      <div class="preview-footer-bar">
        <span>סקר נגישות מתו"ס</span><span>${fmtDate(c.date)}</span>
      </div>
    </div>

    <div class="preview-page">
      <div class="preview-header-bar">
        <div class="preview-logo-area">נגישות</div>
        <div class="preview-page-title">סיכום ממצאים</div>
      </div>
      <div class="preview-section-title">סיכום</div>
      <div class="summary-box">
        <div class="summary-stat"><span class="summary-stat-num" style="color:#198754">${ok}</span><span class="summary-stat-label">תקין</span></div>
        <div class="summary-stat"><span class="summary-stat-num" style="color:#dc3545">${nok}</span><span class="summary-stat-label">לא תקין</span></div>
        <div class="summary-stat"><span class="summary-stat-num">${na}</span><span class="summary-stat-label">לא רלוונטי</span></div>
        <div class="summary-stat"><span class="summary-stat-num" style="color:#856404">₪${fmtMoney(cost)}</span><span class="summary-stat-label">עלות משוערת</span></div>
      </div>
      <div class="preview-section-title">פרמטרי נגישות</div>
      ${itemsHtml}
      <div class="preview-footer-bar">
        <span>${esc(c.business)}</span><span>יועץ: ${esc(c.consultant)}</span>
      </div>
    </div>`;
}

// ─── PDF Generation ───────────────────────────────────────────────────────────
function generatePDF() {
  if (window._jspdfFailed || !window.jspdf) {
    toast('ספריית PDF לא נטענה — יש להשתמש בדפדפן עם חיבור אינטרנט', 'error');
    return;
  }
  syncCover();
  const c = state.cover;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = 210, H = 297, margin = 18;
  const cW = W - margin * 2;
  let y = 0;

  function rgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  const blue     = rgb('#1a4fa0');
  const bluePale = rgb('#e8f0fb');
  const green    = rgb('#198754');
  const red      = rgb('#dc3545');
  const gray     = rgb('#6c757d');

  function font(size, style, color) {
    doc.setFontSize(size);
    doc.setFont('helvetica', style || 'normal');
    doc.setTextColor(...(color || [30,30,30]));
  }

  function header(title) {
    doc.setFillColor(...blue);
    doc.rect(0, 0, W, 18, 'F');
    font(11, 'bold', [255,255,255]);
    doc.text('סקר נגישות מתו"ס', W - margin, 11, { align:'right' });
    doc.text(title, margin, 11, { align:'left' });
    y = 24;
  }

  function footer(n) {
    doc.setFillColor(...bluePale);
    doc.rect(0, H - 14, W, 14, 'F');
    font(9, 'normal', blue);
    doc.text('סקר נגישות | ' + (c.business || ''), W - margin, H - 5, { align:'right' });
    doc.text('עמוד ' + n, margin, H - 5, { align:'left' });
  }

  function newPage(title, n) {
    doc.addPage();
    header(title);
    footer(n);
    y = 24;
  }

  function checkPage(need, title, n) {
    if (y + need > H - 20) newPage(title, n);
  }

  // Page 1: Cover
  header('עמוד שער');
  footer(1);
  font(22, 'bold', blue);
  doc.text(c.business || 'שם העסק', W / 2, y + 8, { align:'center' });
  y += 18;
  font(13, 'normal', gray);
  doc.text('סקר נגישות מתו"ס', W / 2, y, { align:'center' });
  y += 10;

  if (state.photo) {
    try {
      doc.addImage(state.photo, 'JPEG', margin, y, cW, 60, undefined, 'MEDIUM');
      y += 68;
    } catch(e) {}
  }

  doc.setDrawColor(...bluePale);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 6;

  [['לקוח', c.client],['כתובת', c.address],['תאריך הסקר', fmtDate(c.date)],
   ['יועץ נגישות', c.consultant],['מספר רישיון', c.license],
   ...(c.notes ? [['הערות', c.notes]] : [])
  ].filter(r => r[1]).forEach(([label, val]) => {
    font(10, 'bold', blue);
    doc.text(label + ':', W - margin, y, { align:'right' });
    font(10, 'normal', [30,30,30]);
    doc.text(String(val), W - margin - 36, y, { align:'right' });
    y += 8;
  });

  // Page 2+: Checklist
  let pageNum = 2;
  newPage('ממצאים וסיכום', pageNum);

  const ok  = state.params.filter(p => p.status === 'ok').length;
  const nok = state.params.filter(p => p.status === 'nok').length;
  const na  = state.params.filter(p => p.status === 'na').length;
  const totalCost = state.params.filter(p => p.status === 'nok' && p.cost)
    .reduce((s, p) => s + Number(p.cost), 0);

  doc.setFillColor(...bluePale);
  doc.roundedRect(margin, y, cW, 24, 3, 3, 'F');
  font(10, 'bold', blue);
  doc.text('סיכום ממצאים', W - margin - 2, y + 6, { align:'right' });
  [
    { label:'תקין',       val: ok,                       color: green },
    { label:'לא תקין',    val: nok,                      color: red },
    { label:'לא רלוונטי', val: na,                       color: gray },
    { label:'עלות משוערת',val: '₪' + fmtMoney(totalCost), color:[133,100,4] },
  ].forEach((item, i) => {
    const x = W - margin - 30 - i * 42;
    font(14, 'bold', item.color);
    doc.text(String(item.val), x, y + 14, { align:'center' });
    font(8, 'normal', gray);
    doc.text(item.label, x, y + 20, { align:'center' });
  });
  y += 30;

  font(12, 'bold', blue);
  doc.text('פרמטרי נגישות', W - margin, y, { align:'right' });
  y += 6;
  doc.setDrawColor(...bluePale);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 6;

  const sColors = { ok: green, nok: red, na: gray };
  const sLabels = { ok:'תקין', nok:'לא תקין', na:'לא רלוונטי' };

  state.params.forEach(p => {
    const s     = p.status || 'na';
    const color = sColors[s];
    const notesLines = p.notes ? doc.splitTextToSize(p.notes, cW - 10) : [];
    const itemH = 14 + notesLines.length * 5 + (p.cost && s === 'nok' ? 5 : 0);

    checkPage(itemH, 'ממצאים (המשך)', pageNum);

    const bgColor = s === 'ok' ? [240,250,245] : s === 'nok' ? [255,245,245] : [248,249,250];
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, y, cW - 3, itemH - 2, 2, 2, 'F');
    doc.setFillColor(...color);
    doc.rect(W - margin, y, 3, itemH - 2, 'F');

    font(10, 'bold', [30,30,30]);
    doc.text(p.title, W - margin - 5, y + 6, { align:'right' });
    font(9, 'bold', color);
    doc.text(sLabels[s], margin + 38, y + 6, { align:'left' });

    let iy = y + 12;
    notesLines.forEach(line => {
      font(9, 'normal', gray);
      doc.text(line, W - margin - 5, iy, { align:'right' });
      iy += 5;
    });
    if (p.cost && s === 'nok') {
      font(9, 'bold', [133,100,4]);
      doc.text('עלות משוערת: ₪' + fmtMoney(p.cost), margin + 5, iy);
    }
    y += itemH;
  });

  const filename = 'סקר_נגישות_' + (c.business || 'דוח').replace(/\s+/g, '_') + '.pdf';
  doc.save(filename);
  toast('הורד בהצלחה!', 'success');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Set today's date
  const df = $('field-date');
  if (df && !df.value) {
    df.value = new Date().toISOString().split('T')[0];
    state.cover.date = df.value;
  }

  // Load default params
  state.params = DEFAULT_PARAMS.map(title => ({ title, status:'ok', notes:'', cost:'' }));
  renderChecklist();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() { showTab(this.dataset.tab); });
  });

  // Photo
  const photoInput = $('photo-input');
  $('photo-area').addEventListener('click', function() { photoInput.click(); });
  $('btn-pick-photo').addEventListener('click', function(e) { e.stopPropagation(); photoInput.click(); });
  photoInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) { state.photo = ev.target.result; refreshPhoto(); };
    reader.readAsDataURL(file);
  });
  $('btn-remove-photo').addEventListener('click', function(e) {
    e.stopPropagation();
    state.photo = null;
    photoInput.value = '';
    refreshPhoto();
  });

  // Cover tab actions
  $('btn-save-draft').addEventListener('click', saveDraftNow);

  // Checklist tab actions
  $('btn-add-param').addEventListener('click', function() { openParamModal(null); });
  $('btn-load-template').addEventListener('click', openLoadTemplateModal);
  $('btn-save-template').addEventListener('click', openSaveTemplateModal);
  $('btn-go-preview').addEventListener('click', function() { showTab('preview'); });

  // Preview tab actions
  $('btn-refresh-preview').addEventListener('click', renderPreview);
  $('btn-download-pdf').addEventListener('click', generatePDF);

  // Header actions
  $('btn-reports').addEventListener('click', openReportsModal);
  $('btn-templates').addEventListener('click', openTemplatesModal);

  // Param modal
  $('btn-param-save').addEventListener('click', saveParam);
  $('btn-param-cancel').addEventListener('click', closeParamModal);
  ['ok','nok','na'].forEach(v => {
    const btn = $('sbtn-' + v);
    if (btn) btn.addEventListener('click', function() {
      state.paramStatus = v;
      refreshStatusBtns();
    });
  });

  // Template modals
  $('btn-load-template-close').addEventListener('click', function() {
    $('modal-load-template').style.display = 'none';
  });
  $('btn-confirm-save-template').addEventListener('click', confirmSaveTemplate);
  $('btn-cancel-save-template').addEventListener('click', function() {
    $('modal-save-template').style.display = 'none';
  });
  $('btn-templates-close').addEventListener('click', function() {
    $('modal-templates').style.display = 'none';
  });
  $('btn-reports-close').addEventListener('click', function() {
    $('modal-reports').style.display = 'none';
  });

  // Backdrop clicks close modals
  ['backdrop-param','backdrop-load-tpl','backdrop-save-tpl','backdrop-tpl-mgr','backdrop-reports'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', function() {
      this.closest('.modal').style.display = 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
