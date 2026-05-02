// ═══════════════════════════════════════
// USUARIOS Y AUTENTICACIÓN
// ═══════════════════════════════════════
const USERS = {
  'maria.lopez@coopera.ni': {
    password: 'Socio2026!',
    role: 'socio',
    name: 'María López',
    initials: 'ML',
    avatar_color: '#2E7D32',
    cuenta: 'CTA-0042-8812',
    saldo: 'C$ 24,850.00',
    notificaciones: [
      { icon:'💵', msg:'Recibiste C$ 1,500 de Carlos Mendoza', time:'Hoy 09:14 AM', tipo:'success' },
      { icon:'✅', msg:'Pago de energía DISNORTE confirmado (C$ 420)', time:'Ayer 02:30 PM', tipo:'success' },
      { icon:'ℹ️', msg:'LAFISE OBL V1: Sistema operativo al 99.2%', time:'Hoy 06:00 AM', tipo:'info' },
    ]
  },
  'operador@coopera.ni': {
    password: 'Admin2026!',
    role: 'admin',
    name: 'Operador COOPERA',
    initials: 'OP',
    avatar_color: '#3182CE',
    notificaciones: [
      { icon:'⚠️', msg:'3 discrepancias en conciliación del 25 Abr', time:'Hoy 08:00 AM', tipo:'warn' },
      { icon:'👤', msg:'7 socios pendientes de revisión KYC manual', time:'Hoy 07:30 AM', tipo:'warn' },
      { icon:'🔌', msg:'API LAFISE: latencia elevada (1,840ms) en KYC', time:'Hoy 10:32 AM', tipo:'error' },
    ]
  }
};

let currentUser = null;
let currentTxType = 'propia';
let selectedSvcData = null;
let onbStep = 1;
const TOTAL_STEPS = 6;

// ═══════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════
function doLogin() {
  const email = document.getElementById('inp-email').value.trim().toLowerCase();
  const pass = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  const user = USERS[email];
  if (!user || user.password !== pass) {
    errEl.style.display = 'block';
    document.getElementById('inp-pass').style.borderColor = 'var(--c-red)';
    setTimeout(() => {
      document.getElementById('inp-pass').style.borderColor = 'var(--c-border)';
    }, 2000);
    return;
  }

  currentUser = { ...user, email };
  setupApp();
  showView('v-app');
  navTo(user.role === 'admin' ? 'sc-admin-dash' : 'sc-dashboard');
  showToast(`Bienvenido/a, ${user.name.split(' ')[0]} 👋`, 'success');
}

document.getElementById('inp-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('inp-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('inp-pass').focus();
});

function togglePass() {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function confirmLogout() {
  openModal('modal-logout');
}

function executeLogout() {
  currentUser = null;
  document.getElementById('inp-pass').value = '';
  
  // Limpiar modales
  closeModal('modal-logout');
  
  // Limpiar capas del sidebar (crítico para móviles/tablets)
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
  
  showView('v-login');
  showToast('Sesión cerrada correctamente', 'info');
}

// ═══════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════
function setupApp() {
  const isAdmin = currentUser.role === 'admin';
  const nav = isAdmin ? [
    { section: 'Monitoreo' },
    { label: 'Dashboard', icon: '📊', screen: 'sc-admin-dash' },
    { section: 'Operaciones' },
    { label: 'Gestión Socios', icon: '👥', screen: 'sc-admin-users' },
    { label: 'Conciliación', icon: '⚖️', screen: 'sc-admin-recon' },
    { label: 'Auditoría', icon: '🔍', screen: 'sc-admin-audit' },
  ] : [
    { section: 'Principal' },
    { label: 'Inicio', icon: '🏠', screen: 'sc-dashboard' },
    { section: 'Operaciones' },
    { label: 'Transferencias', icon: '⬆', screen: 'sc-transfer' },
    { label: 'Pago de Servicios', icon: '⚡', screen: 'sc-payments' },
    { label: 'Mis Movimientos', icon: '📊', screen: 'sc-account' },
  ];

  let html = '';
  nav.forEach(item => {
    if (item.section) {
      html += `<div class="nav-section">${item.section}</div>`;
    } else {
      html += `<div class="nav-item" onclick="navTo('${item.screen}')" data-screen="${item.screen}"><span class="icon">${item.icon}</span>${item.label}</div>`;
    }
  });
  document.getElementById('sidebar-nav').innerHTML = html;
  document.getElementById('sidebar-sub').textContent = isAdmin ? 'Panel Administrativo' : 'Portal Socio';
  document.getElementById('sidebar-username').textContent = currentUser.name;
  document.getElementById('sidebar-avatar').textContent = currentUser.initials;
  document.getElementById('sidebar-avatar').style.background = currentUser.avatar_color;
  document.getElementById('topbar-avatar').textContent = currentUser.initials;
  document.getElementById('topbar-avatar').style.background = currentUser.avatar_color;

  setTimeout(() => {
    if (!isAdmin) renderWeekChart();
    renderAdminCharts();
  }, 150);
}

// ═══════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════
const SCREEN_TITLES = {
  'sc-dashboard': 'Inicio',
  'sc-transfer': 'Transferencias',
  'sc-payments': 'Pago de Servicios',
  'sc-account': 'Mis Movimientos',
  'sc-admin-dash': 'Panel de Control',
  'sc-admin-users': 'Gestión de Socios',
  'sc-admin-audit': 'Auditoría & Logs',
  'sc-admin-recon': 'Conciliación',
};

function navTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(screen);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const ni = document.querySelector(`.nav-item[data-screen="${screen}"]`);
  if (ni) ni.classList.add('active');
  document.getElementById('topbar-title').textContent = SCREEN_TITLES[screen] || 'COOPERA';
  
  if (window.innerWidth <= 1024) {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  }
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════
function initOnboarding() {
  onbStep = 1;
  renderPills();
  document.querySelectorAll('.onb-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-1').classList.add('active');
  showView('v-onboarding');
}

function renderPills() {
  let html = '';
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const cls = i < onbStep ? 'done' : i === onbStep ? 'active' : '';
    html += `<div class="step-pill ${cls}"></div>`;
  }
  document.getElementById('step-pills').innerHTML = html;
}

function nextStep() { if (onbStep < TOTAL_STEPS) { onbStep++; switchStep(); } }
function prevStep() { if (onbStep > 1) { onbStep--; switchStep(); } }
function switchStep() {
  document.querySelectorAll('.onb-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + onbStep).classList.add('active');
  renderPills();
}

function markDoc(side) {
  const el = document.getElementById('doc-' + side);
  el.innerHTML = `✅<br/><br/><span style="font-size:13px;color:#065F46;font-weight:600;">${side === 'front' ? 'Frente' : 'Reverso'} capturado</span>`;
  document.getElementById('zone-' + side).style.borderColor = 'var(--c-green)';
  document.getElementById('zone-' + side).style.background = '#F0FDF4';
}

function captureSelfie() {
  document.getElementById('selfie-content').innerHTML = '✅<br/><br/><span style="font-size:13px;color:#065F46;font-weight:600;">Selfie capturada</span>';
}

let kycRunning = false;
function runKYC() {
  if (kycRunning) return;
  kycRunning = true;
  document.getElementById('kyc-btn-row').innerHTML = '';
  const delays = [1200, 1600, 2000, 2500];
  [0, 1, 2, 3].forEach((i, _, arr) => {
    const ci = document.getElementById('kc-' + i);
    const bi = document.getElementById('kb-' + i);
    const totalDelay = delays.slice(0, i).reduce((a, b) => a + b, 0);
    setTimeout(() => {
      ci.className = 'check-icon spin'; ci.textContent = '↻';
      bi.className = 'kyc-badge pending'; bi.textContent = 'Verificando…';
      setTimeout(() => {
        ci.className = 'check-icon ok'; ci.textContent = '✓';
        bi.className = 'kyc-badge ok'; bi.textContent = 'Aprobado';
        if (i === 3) setTimeout(() => { onbStep = 5; switchStep(); kycRunning = false; }, 600);
      }, delays[i]);
    }, totalDelay);
  });
}

// ═══════════════════════════════════════
// OTP
// ═══════════════════════════════════════
function otpNext(el, container) {
  if (el.value.length === 1) {
    const inputs = Array.from(container.querySelectorAll('.otp-box'));
    const idx = inputs.indexOf(el);
    if (idx < inputs.length - 1) inputs[idx + 1].focus();
  }
}

// ═══════════════════════════════════════
// TRANSFERENCIAS
// ═══════════════════════════════════════
const TX_LABELS = {
  propia: 'Entre cuentas propias LAFISE',
  tercero: 'A tercero LAFISE',
  interbancaria: 'Transferencia interbancaria'
};

function setTxType(type, el) {
  currentTxType = type;
  document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const destLabel = { propia: 'Cuenta Destino (propia)', tercero: 'Cuenta Destino (tercero LAFISE)', interbancaria: 'N° de Cuenta Destino' };
  document.getElementById('tx-dest-label').textContent = destLabel[type];
  document.getElementById('tx-bank-group').style.display = type === 'interbancaria' ? 'block' : 'none';
}

function showTxReview() {
  const dest = document.getElementById('tx-dest-input').value;
  const monto = document.getElementById('tx-amount-inp').value;
  const concepto = document.getElementById('tx-concepto').value;
  document.getElementById('cf-type').textContent = TX_LABELS[currentTxType];
  document.getElementById('cf-dest').textContent = dest;
  document.getElementById('cf-amount').textContent = 'C$ ' + monto;
  document.getElementById('cf-concepto').textContent = concepto;
  document.getElementById('cf-idem').textContent = genUUID();
  document.getElementById('tx-panel-form').style.display = 'none';
  document.getElementById('tx-panel-review').style.display = 'block';
  document.querySelectorAll('#tx-otp .otp-box').forEach(b => b.value = '');
  document.querySelector('#tx-otp .otp-box').focus();
}

function backTxForm() {
  document.getElementById('tx-panel-review').style.display = 'none';
  document.getElementById('tx-panel-form').style.display = 'block';
}

function execTransfer() {
  document.getElementById('tx-panel-review').style.display = 'none';
  document.getElementById('tx-panel-success').style.display = 'block';
  document.getElementById('tx-ref-out').textContent = 'LAF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  document.getElementById('tx-amount-out').textContent = 'C$ ' + document.getElementById('tx-amount-inp').value;
  document.getElementById('tx-ts-out').textContent = new Date().toLocaleString('es-NI');
  showToast('Transferencia procesada exitosamente', 'success');
}

function resetTransfer() {
  document.getElementById('tx-panel-success').style.display = 'none';
  document.getElementById('tx-panel-form').style.display = 'block';
}

// ═══════════════════════════════════════
// PAGOS DE SERVICIO
// ═══════════════════════════════════════
function selectSvc(el, name, prov, icon) {
  document.querySelectorAll('.service-item').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedSvcData = { name, prov, icon };
  setTimeout(() => {
    document.getElementById('pay-select').style.display = 'none';
    document.getElementById('pay-form').style.display = 'block';
    document.getElementById('pay-icon-show').textContent = icon;
    document.getElementById('pay-name-show').textContent = name;
    document.getElementById('pay-prov-show').textContent = prov;
  }, 200);
}

function backPaySelect() {
  document.getElementById('pay-form').style.display = 'none';
  document.getElementById('pay-select').style.display = 'block';
}

function execPayment() {
  const monto = document.getElementById('pay-monto').value;
  document.getElementById('pay-form').style.display = 'none';
  document.getElementById('pay-success').style.display = 'block';
  document.getElementById('pay-svc-out').textContent = selectedSvcData.name;
  document.getElementById('pay-prov-out').textContent = selectedSvcData.prov;
  document.getElementById('pay-monto-out').textContent = 'C$ ' + monto;
  document.getElementById('pay-folio-out').textContent = 'SVC-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  showToast('Pago realizado exitosamente', 'success');
}

function resetPayment() {
  document.getElementById('pay-success').style.display = 'none';
  document.getElementById('pay-select').style.display = 'block';
  selectedSvcData = null;
}

// ═══════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════
function filterTx(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  document.querySelectorAll('#users-table tr').forEach(row => {
    row.style.display = q === '' || row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ═══════════════════════════════════════
// ADMIN ACCIONES
// ═══════════════════════════════════════
function approveKyc(btn, name) {
  const row = btn.closest('.kyc-item');
  row.style.opacity = '0.4';
  row.style.pointerEvents = 'none';
  showToast(`KYC de ${name} aprobado ✓`, 'success');
}

function rejectKyc(btn, name) {
  const row = btn.closest('.kyc-item');
  row.style.opacity = '0.4';
  row.style.pointerEvents = 'none';
  showToast(`KYC de ${name} rechazado — notificación enviada`, 'error');
}

function showKycDetail(name) {
  document.getElementById('modal-kyc-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px;background:#FEF9C3;border-radius:10px;">
      <div class="kyc-avatar" style="width:52px;height:52px;font-size:18px;">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div>
        <div style="font-weight:700;font-size:16px;">${name}</div>
        <div style="font-size:13px;color:var(--c-muted);">Revisión manual requerida</div>
      </div>
    </div>
    <div style="font-size:14px;">
      <div class="confirm-row"><span class="label">BlacklistCheck</span><span class="badge green">✓ Aprobado</span></div>
      <div class="confirm-row"><span class="label">DocumentCheck</span><span class="badge green">✓ Aprobado</span></div>
      <div class="confirm-row"><span class="label">SelfieCheck</span><span class="badge red">✗ Confianza 64% (mín. 80%)</span></div>
      <div class="confirm-row"><span class="label">BiometricCheck</span><span class="badge yellow">⚠ Pendiente</span></div>
    </div>
    <div class="warn-box" style="margin-top:16px;">La selfie presentó baja confianza biométrica. Se requiere revisión manual del documento vs. captura facial.</div>
    <div class="nav-row" style="margin-top:8px;">
      <button class="btn-outline" onclick="closeModal('modal-kyc')">Cancelar</button>
      <button class="btn-primary-sm" onclick="closeModal('modal-kyc');showToast('KYC aprobado manualmente','success')">Aprobar manualmente ✓</button>
    </div>
  `;
  openModal('modal-kyc');
}

function showUserDetail(name, cedula, cuenta, saldo, kyc) {
  const kycBadge = kyc === 'Aprobado' ? '<span class="badge green">✓ Aprobado</span>' :
    kyc.includes('manual') ? '<span class="badge yellow">⚠ Revisión manual</span>' :
    '<span class="badge red">✗ ' + kyc + '</span>';
  document.getElementById('modal-user-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
      <div class="avatar" style="width:52px;height:52px;font-size:18px;">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div>
        <div style="font-weight:700;font-size:18px;">${name}</div>
        <div style="font-size:13px;color:var(--c-muted);">Cédula: ${cedula}</div>
      </div>
    </div>
    <div style="font-size:14px;">
      <div class="confirm-row"><span class="label">N° Cuenta LAFISE</span><span class="val monospace">${cuenta}</span></div>
      <div class="confirm-row"><span class="label">Saldo disponible</span><span class="val" style="color:var(--c-green)">${saldo !== '0' ? 'C$ ' + Number(saldo).toLocaleString() + '.00' : '—'}</span></div>
      <div class="confirm-row"><span class="label">Estado KYC</span><span class="val">${kycBadge}</span></div>
      <div class="confirm-row"><span class="label">Banco</span><span class="val">LAFISE Nicaragua</span></div>
      <div class="confirm-row"><span class="label">Moneda</span><span class="val">Córdoba (NIO)</span></div>
      <div class="confirm-row"><span class="label">Tipo de cuenta</span><span class="val">Cuenta Simplificada</span></div>
    </div>
    <div class="nav-row" style="margin-top:16px;">
      <button class="btn-outline" onclick="closeModal('modal-user')">Cerrar</button>
      <button class="btn-primary-sm" onclick="closeModal('modal-user');showToast('Acción registrada en auditoría','info')">Ver transacciones</button>
    </div>
  `;
  openModal('modal-user');
}

function runRecon() {
  showToast('Ejecutando conciliación COOPERA ↔ LAFISE...', 'info');
  setTimeout(() => showToast('Conciliación completada: 139/142 confirmadas, 3 discrepancias', 'success'), 2500);
}

// ═══════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════
function showNotifModal() {
  if (!currentUser) return;
  const notifs = currentUser.notificaciones || [];
  const tipoColor = { success: '#D1FAE5', warn: '#FEF9C3', error: '#FEE2E2', info: '#DBEAFE' };
  let html = '';
  notifs.forEach(n => {
    html += `<div style="display:flex;gap:14px;padding:14px;background:${tipoColor[n.tipo] || '#F8FAFC'};border-radius:10px;margin-bottom:10px;">
      <span style="font-size:22px;">${n.icon}</span>
      <div>
        <div style="font-size:14px;font-weight:600;">${n.msg}</div>
        <div style="font-size:12px;color:var(--c-muted);margin-top:3px;">${n.time}</div>
      </div>
    </div>`;
  });
  document.getElementById('modal-notif-content').innerHTML = html || '<p class="text-muted text-center">Sin notificaciones nuevas</p>';
  openModal('modal-notif');
}

// ═══════════════════════════════════════
// MODAL
// ═══════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
let toastTimeout;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  clearTimeout(toastTimeout);
  t.textContent = msg;
  t.className = `toast ${type} show`;
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════
let weekChart, adminTxnChart, adminTypeChart;
function renderWeekChart() {
  const ctx = document.getElementById('chart-week');
  if (!ctx) return;
  if (weekChart) weekChart.destroy();
  weekChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Transacciones',
        data: [2, 5, 4, 8, 6, 3, 5],
        backgroundColor: ['#2E7D32','#2E7D32','#2E7D32','#2E7D32','#2E7D32','#81C784','#81C784'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#F0F0F0' }, beginAtZero: true, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderAdminCharts() {
  const ctx1 = document.getElementById('chart-admin-txns');
  if (ctx1) {
    if (adminTxnChart) adminTxnChart.destroy();
    adminTxnChart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['10','12','14','16','18','20','22','24','25'],
        datasets: [{
          label: 'Transacciones',
          data: [55, 68, 60, 74, 66, 82, 78, 91, 85],
          borderColor: '#2E7D32', fill: true,
          backgroundColor: 'rgba(46,125,50,0.08)',
          tension: 0.4, pointBackgroundColor: '#2E7D32', pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#F0F0F0' }, beginAtZero: true }
        }
      }
    });
  }
  const ctx2 = document.getElementById('chart-admin-types');
  if (ctx2) {
    if (adminTypeChart) adminTypeChart.destroy();
    adminTypeChart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Transferencias', 'Pagos', 'Consultas', 'KYC'],
        datasets: [{
          data: [38, 24, 28, 10],
          backgroundColor: ['#2E7D32', '#3182CE', '#805AD5', '#D69E2E'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        cutout: '62%'
      }
    });
  }
}

// ═══════════════════════════════════════
// UTILS
// ═══════════════════════════════════════
function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
