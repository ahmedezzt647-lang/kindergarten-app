/* ====== روضة نور ومكة — لوحة الإدارة ====== */
let D = null;                 // كل البيانات
let VIEW = 'home';
const UI = { finTab: 'payments', attDate: null, attClass: '', stQ: '', stClass: '', stStatus: 'active', repMonth: null, expMonth: '', commTab: 'ann' };

/* ---------- أدوات ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmt = n => (Math.round(N(n) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const cur = () => D?.settings?.currency || 'ر.س';
const money = n => `<span class="num">${fmt(n)}</span> ${cur()}`;
const initial = name => (String(name || '؟').trim()[0] || '؟');
const fmtDate = d => { if (!d) return '—'; const [y, m, dd] = String(d).split('-'); return dd ? `${+dd}/${+m}/${y}` : d; };
const monthOf = d => String(d || '').slice(0, 7);
const monthName = m => { if (!m) return ''; const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' }); };
const STATUS = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غائب بعذر' };
const STATUS_TAG = { present: 'ok', absent: 'bad', late: 'warn', excused: 'info' };
const NOTE_TYPES = ['عام', 'سلوك', 'تعلّم', 'وجبات', 'نوم', 'صحة'];
const MOODS = ['', 'سعيد', 'نشيط', 'هادئ', 'متعب', 'منزعج'];

function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 2800);
}
async function api(method, url, body) {
  try {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { location.href = '/login'; return null; }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast(d.error || 'تعذر تنفيذ العملية', true); return null; }
    return d;
  } catch { toast('لا يوجد اتصال بالخادم، تحقق من الإنترنت', true); return null; }
}
let lastSig = '', lastLoad = 0;
async function load() {
  const d = await api('GET', '/api/all');
  if (d) { D = d; lastSig = JSON.stringify(d); lastLoad = Date.now(); UI.attDate ||= d.today; UI.repMonth ||= monthOf(d.today); render(); }
}
// تحديث تلقائي: كل دقيقة وعند الرجوع للتطبيق، بدون إزعاج من يكتب أو يملأ نموذجاً
function canRefresh() {
  const a = document.activeElement;
  return D && document.visibilityState === 'visible' && !$('#modal').open && !document.querySelector('details[open]')
    && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
async function softRefresh() {
  if (!canRefresh()) return;
  try {
    const r = await fetch('/api/all');
    if (r.status === 401) { location.href = '/login'; return; }
    if (!r.ok) return;
    const txt = await r.text(); lastLoad = Date.now();
    if (txt === lastSig || !canRefresh()) return; // لا جديد
    D = JSON.parse(txt); lastSig = txt;
    const y = window.scrollY; render(); window.scrollTo(0, y);
  } catch { /* بدون إنترنت: نحاول لاحقاً */ }
}
setInterval(softRefresh, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - lastLoad > 15 * 1000) softRefresh();
  navigator.serviceWorker?.getRegistration().then(r => r && r.update()).catch(() => {});
});
window.addEventListener('online', softRefresh);
async function act(method, url, body, okMsg) {
  const r = await api(method, url, body);
  if (r) { if (okMsg) toast(okMsg); await load(); }
  return r;
}

// واتساب: تحويل الأرقام السعودية 05xxxxxxxx إلى 9665xxxxxxxx
function waNumber(p) {
  let d = String(p || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('05')) d = '966' + d.slice(1);
  else if (d.startsWith('5') && d.length === 9) d = '966' + d;
  return d;
}
const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
const portalUrl = s => `${location.origin}/p/${s.portalToken}`;

/* ---------- حسابات ---------- */
const opts = () => ({ halfMonthAfterDay: D.settings.halfMonthAfterDay || 10 });
const bal = s => Finance.studentBalance(s, D.payments, D.books, opts());
const active = () => D.students.filter(s => s.status !== 'inactive');
const classes = () => {
  const names = (D.settings.classes || []).map(c => c.name);
  D.students.forEach(s => { if (s.grade && !names.includes(s.grade)) names.push(s.grade); });
  return names;
};
const attOf = (id, date) => D.attendance.find(a => a.studentId === id && a.date === date);
const studentById = id => D.students.find(s => s.id === id);
function lastMonths(n) {
  const out = []; const [y, m] = D.today.split('-').map(Number);
  for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  return out;
}
const partners = () => (D.settings.partners && D.settings.partners.length ? D.settings.partners : [{ name: 'احمد', share: 50 }, { name: 'عبدالله', share: 50 }]);
function monthFin(m) {
  const inc = sumBy(D.payments.filter(p => monthOf(p.date) === m), p => p.amount);
  const out = sumBy(D.expenses.filter(e => monthOf(e.date) === m), e => e.amount);
  return { m, inc, out, net: inc - out };
}
function activeMonths() {
  const ms = new Set([...D.payments.map(p => monthOf(p.date)), ...D.expenses.map(e => monthOf(e.date)), monthOf(D.today)].filter(Boolean));
  return [...ms].sort();
}
const sumBy = (arr, f) => arr.reduce((a, x) => a + N(f(x)), 0);

/* ---------- التنقّل ---------- */
document.getElementById('nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v);
});
function go(v) { VIEW = v; location.hash = v; render(); $('#view').focus({ preventScroll: true }); window.scrollTo(0, 0); }
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== VIEW && VIEWS[v]) { VIEW = v; render(); } });

function render() {
  if (!D) return;
  document.querySelectorAll('#nav button').forEach(b => b.dataset.v === VIEW ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  $('#brand-name').textContent = D.settings.schoolName || 'روضة نور ومكة';
  $('#brand-date').textContent = hijri(D.today);
  $('#view').innerHTML = (VIEWS[VIEW] || VIEWS.home)();
}
function hijri(d) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; }
}
function dayName(d) { return new Date(d + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' }); }

/* ====================== الصفحات ====================== */
const VIEWS = {};

/* ---------- الرئيسية ---------- */
VIEWS.home = () => {
  const act_ = active();
  const today = D.today, m = monthOf(today);
  const present = act_.filter(s => ['present', 'late'].includes(attOf(s.id, today)?.status)).length;
  const marked = act_.filter(s => attOf(s.id, today)).length;
  const income = sumBy(D.payments.filter(p => monthOf(p.date) === m), p => p.amount);
  const spent = sumBy(D.expenses.filter(e => monthOf(e.date) === m), e => e.amount);
  const debtors = D.students.map(s => ({ s, b: bal(s) })).filter(x => x.b.remaining > 0).sort((a, b) => b.b.remaining - a.b.remaining);
  const owed = sumBy(debtors, x => x.b.remaining);
  const upcoming = D.announcements.filter(a => a.eventDate && a.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate)).slice(0, 4);
  const hour = new Date().getHours();

  return `
  <div class="head"><div><h1>${hour < 12 ? 'صباح الخير' : 'مساء الخير'}</h1><p>${dayName(today)} · ${hijri(today)}</p></div>
    <div class="actions">${installPrompt && !isInstalled() ? '<button class="btn" onclick="installApp()">📲 تثبيت التطبيق</button>' : ''}<button class="btn primary" onclick="studentForm()">+ طالب جديد</button><button class="btn" onclick="paymentForm()">+ تسجيل دفعة</button></div></div>

  <div class="figures">
    <button class="fig" onclick="go('attendance')"><span>حضور اليوم</span><b class="num">${present} / ${act_.length}</b><small>${marked < act_.length ? `بقي ${act_.length - marked} بدون تسجيل` : 'اكتمل التسجيل'}</small></button>
    <button class="fig" onclick="UI.finTab='payments';go('finance')"><span>المقبوض هذا الشهر</span><b class="num money-ok">${fmt(income)}</b><small>${cur()}</small></button>
    <button class="fig" onclick="UI.finTab='debts';go('finance')"><span>مبالغ متأخرة</span><b class="num money-bad">${fmt(owed)}</b><small>${debtors.length} طالب</small></button>
    <button class="fig" onclick="go('reports')"><span>صافي الشهر</span><b class="num">${fmt(income - spent)}</b><small>${partners().map(p => `${esc(p.name)}: ${fmt((income - spent) * N(p.share) / 100)}`).join(' · ')}</small></button>
  </div>

  <div class="cols">
    <section class="panel"><h2>لوحة الحضور اليوم <span class="actions">${marked < act_.length ? `<button class="btn sm" onclick="markAllPresent()">تسجيل الباقين حاضرين</button>` : ''}</span></h2>
      ${attendanceBoard(today)}
    </section>
    <div>
      <section class="panel"><h2>أعلى المتأخرين في السداد ${debtors.length > 5 ? `<button class="btn sm ghost" onclick="UI.finTab='debts';go('finance')">عرض الكل</button>` : ''}</h2>
        ${debtors.length ? debtors.slice(0, 5).map(({ s, b }) => `<div class="list-row"><div><b>${esc(s.name)}</b><div class="muted">${esc(s.grade || '')}</div></div><div class="actions"><span class="money-bad">${money(b.remaining)}</span>${s.parent_phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${reminderLink(s, b)}">تذكير</a>` : ''}</div></div>`).join('') : '<p class="empty">لا توجد مبالغ متأخرة 🎉</p>'}
      </section>
      <section class="panel"><h2>الدخل والمصروف — آخر 6 أشهر</h2>${chart6()}
        <div class="board-legend" style="margin-top:10px"><span><i style="background:var(--palm)"></i>مقبوضات</span><span><i style="background:var(--rose)"></i>مصروفات</span></div></section>
      <section class="panel"><h2>فعاليات قادمة <button class="btn sm ghost" onclick="annForm()">+ فعالية</button></h2>
        ${upcoming.length ? upcoming.map(a => `<div class="list-row"><b>${esc(a.title)}</b><span class="tag info">${esc(a.eventDate)}</span></div>`).join('') : '<p class="empty">لا توجد فعاليات قادمة</p>'}
      </section>
    </div>
  </div>`;
};

function attendanceBoard(date, cls) {
  const list = active().filter(s => !cls || s.grade === cls);
  if (!list.length) return `<div class="empty">لا يوجد طلاب مستمرون بعد<br><button class="btn primary" onclick="studentForm()">أضف أول طالب</button></div>`;
  const groups = {};
  list.forEach(s => (groups[s.grade || 'بدون صف'] ||= []).push(s));
  return Object.keys(groups).sort().map(g => {
    const kids = groups[g];
    const p = kids.filter(s => ['present', 'late'].includes(attOf(s.id, date)?.status)).length;
    return `<div class="board-class"><h3>${/^[\d٠-٩]+$/.test(g) ? 'صف ' : ''}${esc(g)} <span class="tag mute">${p}/${kids.length}</span></h3><div class="board">
      ${kids.map(s => { const a = attOf(s.id, date); const st = a?.status || '';
        return `<button class="kid ${st}" onclick="cycleAtt('${s.id}','${date}')" title="اضغط لتغيير الحالة">
          <span class="av">${esc(initial(s.name))}</span><span class="nm">${esc(s.name)}</span>
          <span class="st">${st ? STATUS[st] + (a.checkIn ? ' ' + esc(a.checkIn) : '') : 'لم يُسجّل'}</span>
</button>`; }).join('')}
    </div></div>`;
  }).join('') + `<div class="board-legend"><span>اضغط على الطفل للتبديل:</span><span><i style="background:var(--palm)"></i>حاضر</span><span><i style="background:var(--rose)"></i>غائب</span><span><i style="background:var(--sun)"></i>متأخر</span><span><i style="background:var(--sky)"></i>بعذر</span></div>`;
}
const CYCLE = ['', 'present', 'absent', 'late', 'excused'];
async function cycleAtt(id, date) {
  const cur_ = attOf(id, date)?.status || '';
  const next = CYCLE[(CYCLE.indexOf(cur_) + 1) % CYCLE.length];
  // تحديث فوري في الواجهة ثم الحفظ
  const ix = D.attendance.findIndex(a => a.studentId === id && a.date === date);
  if (next) { if (ix >= 0) D.attendance[ix].status = next; else D.attendance.push({ studentId: id, date, status: next }); }
  else if (ix >= 0) D.attendance.splice(ix, 1);
  render();
  await act('POST', '/api/attendance', { studentId: id, date, status: next || 'clear' });
}
async function markAllPresent(date) {
  date = date || D.today;
  const ids = active().filter(s => !attOf(s.id, date) && (!UI.attClass || VIEW !== 'attendance' || s.grade === UI.attClass)).map(s => s.id);
  if (!ids.length) return;
  await act('POST', '/api/attendance/bulk', { studentIds: ids, date, status: 'present' }, `تم تسجيل ${ids.length} طالب حاضرين`);
}
function chart6() {
  const ms = lastMonths(6);
  const data = ms.map(m => ({ m, i: sumBy(D.payments.filter(p => monthOf(p.date) === m), p => p.amount), o: sumBy(D.expenses.filter(e => monthOf(e.date) === m), e => e.amount) }));
  const max = Math.max(1, ...data.map(d => Math.max(d.i, d.o)));
  return `<div class="chart">${data.map(d => `<div class="m"><div class="bars">
    <div class="bar in" style="height:${d.i / max * 100}%" title="مقبوضات ${fmt(d.i)}"></div>
    <div class="bar out" style="height:${d.o / max * 100}%" title="مصروفات ${fmt(d.o)}"></div></div>
    <label>${new Date(d.m + '-15').toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' })}</label></div>`).join('')}</div>`;
}

/* ---------- الحضور ---------- */
VIEWS.attendance = () => {
  const date = UI.attDate, cls = UI.attClass;
  const list = active().filter(s => !cls || s.grade === cls);
  const absents = list.filter(s => attOf(s.id, date)?.status === 'absent' && s.parent_phone);
  return `
  <div class="head"><div><h1>الحضور والانصراف</h1><p>${dayName(date)} · ${hijri(date)}</p></div>
    <div class="actions"><button class="btn primary" onclick="markAllPresent(UI.attDate)">تسجيل الباقين حاضرين</button></div></div>
  <div class="filters">
    <input type="date" value="${date}" max="${D.today}" onchange="UI.attDate=this.value;render()" aria-label="التاريخ">
    <select onchange="UI.attClass=this.value;render()" aria-label="الصف"><option value="">كل الصفوف</option>${classes().map(c => `<option ${c === cls ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
  </div>
  <section class="panel">${attendanceBoard(date, cls)}</section>

  <section class="panel"><h2>تفاصيل اليوم والانصراف</h2>
    <div class="tbl-wrap"><table><thead><tr><th>الطفل</th><th>الصف</th><th>الحالة</th><th>الدخول</th><th>الانصراف</th><th></th></tr></thead><tbody>
    ${list.map(s => { const a = attOf(s.id, date);
      return `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.grade || '')}</td>
      <td>${a ? `<span class="tag ${STATUS_TAG[a.status]}">${STATUS[a.status]}</span>` : '<span class="tag mute">لم يُسجّل</span>'}</td>
      <td class="num">${esc(a?.checkIn || '—')}</td><td class="num">${esc(a?.checkOut || '—')}${a?.pickedUpBy ? `<div class="muted">استلمه: ${esc(a.pickedUpBy)}</div>` : ''}</td>
      <td class="actions">${a && ['present', 'late'].includes(a.status) && !a.checkOut && date === D.today ? `<button class="btn sm" onclick="checkOut('${s.id}')">تسجيل انصراف</button>` : ''}
        ${a?.status === 'absent' && s.parent_phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${absenceLink(s, date)}">إبلاغ ولي الأمر</a>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">لا يوجد طلاب</td></tr>'}
    </tbody></table></div>
    ${absents.length > 1 ? `<p class="muted">يوجد ${absents.length} غائبين لديهم أرقام — استخدم زر "إبلاغ ولي الأمر" لكل واحد.</p>` : ''}
  </section>

  <section class="panel"><h2>تقرير الحضور الشهري — ${monthName(monthOf(date))}</h2>${monthlyAttendance(monthOf(date), list)}</section>`;
};
function monthlyAttendance(m, list) {
  const recs = D.attendance.filter(a => monthOf(a.date) === m);
  const days = [...new Set(recs.map(a => a.date))].length;
  if (!days) return '<p class="empty">لا توجد سجلات حضور لهذا الشهر</p>';
  return `<p class="muted">عدد أيام الدوام المسجلة: ${days}</p><div class="tbl-wrap"><table><thead><tr><th>الطفل</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>بعذر</th><th>نسبة الحضور</th></tr></thead><tbody>
  ${list.map(s => { const r = recs.filter(a => a.studentId === s.id); const c = k => r.filter(a => a.status === k).length;
    const rate = r.length ? Math.round((c('present') + c('late')) / r.length * 100) : null;
    return `<tr><td>${esc(s.name)}</td><td class="num">${c('present')}</td><td class="num">${c('late')}</td><td class="num">${c('absent')}</td><td class="num">${c('excused')}</td>
    <td>${rate === null ? '—' : `<span class="tag ${rate >= 85 ? 'ok' : rate >= 70 ? 'warn' : 'bad'}">${rate}٪</span>`}</td></tr>`; }).join('')}</tbody></table></div>`;
}
async function checkOut(id) {
  const s = studentById(id);
  const who = prompt(`من استلم ${s.name}؟`, s.parent_name || '');
  if (who === null) return;
  await act('POST', '/api/attendance', { studentId: id, checkOut: true, pickedUpBy: who }, 'تم تسجيل الانصراف');
}
function absenceLink(s, date) {
  return waLink(s.parent_phone, `السلام عليكم ${s.parent_name ? 'أ. ' + s.parent_name : 'ولي أمر الطالب'}،\nنود إبلاغكم بأن ${s.name} غائب اليوم ${dayName(date)}.\nنتمنى له دوام الصحة، ونرجو إبلاغنا بسبب الغياب.\n${D.settings.schoolName}`);
}

/* ---------- الطلاب ---------- */
VIEWS.students = () => {
  const q = UI.stQ.trim();
  const list = D.students.filter(s => (UI.stStatus === 'all' || (UI.stStatus === 'active' ? s.status !== 'inactive' : s.status === 'inactive'))
    && (!UI.stClass || s.grade === UI.stClass)
    && (!q || [s.name, s.parent_name, s.parent_phone].some(v => String(v || '').includes(q))))
    .sort((a, b) => String(a.join_date || '9999').localeCompare(String(b.join_date || '9999')) || String(a.name).localeCompare(String(b.name), 'ar'));
  return `
  <div class="head"><div><h1>الطلاب</h1><p>${active().length} مستمر · ${D.students.length - active().length} منقطع</p></div>
    <div class="actions"><button class="btn" onclick="exportStudents()">تصدير Excel</button><button class="btn primary" onclick="studentForm()">+ طالب جديد</button></div></div>
  <div class="filters">
    <input type="search" placeholder="ابحث بالاسم أو اسم ولي الأمر أو الجوال" value="${esc(UI.stQ)}" oninput="UI.stQ=this.value;clearTimeout(window._q);window._q=setTimeout(()=>{render();const i=document.querySelector('.filters input');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)" aria-label="بحث">
    <select onchange="UI.stClass=this.value;render()" aria-label="الصف"><option value="">كل الصفوف</option>${classes().map(c => `<option ${c === UI.stClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <select onchange="UI.stStatus=this.value;render()" aria-label="الحالة">${[['active', 'المستمرون'], ['inactive', 'المنقطعون'], ['all', 'الكل']].map(([v, l]) => `<option value="${v}" ${v === UI.stStatus ? 'selected' : ''}>${l}</option>`).join('')}</select>
  </div>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>الاسم</th><th>الصف</th><th>تاريخ الالتحاق</th><th>ولي الأمر</th><th>الرسم الشهري</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th>اليوم</th></tr></thead><tbody>
  ${list.map(s => { const b = bal(s); const a = attOf(s.id, D.today);
    return `<tr class="click ${s.status === 'inactive' ? 'dim' : ''}" onclick="openStudent('${s.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openStudent('${s.id}')">
      <td><b>${esc(s.name)}</b>${s.status === 'inactive' ? ' <span class="tag warn">منقطع</span>' : ''}</td>
      <td>${esc(s.grade || '—')}</td><td class="num" style="white-space:nowrap">${esc(fmtDate(s.join_date))}</td><td>${esc(s.parent_name || '')}<div class="muted num">${esc(s.parent_phone || '')}</div></td>
      <td>${money(N(s.monthlyFee) - N(s.discount))}${N(s.discount) ? `<div class="muted">خصم ${fmt(s.discount)}</div>` : ''}</td>
      <td>${money(b.totalDue)}</td><td class="money-ok">${money(b.paid)}</td>
      <td class="${b.remaining > 0 ? 'money-bad' : 'money-ok'}">${money(b.remaining)}</td>
      <td>${s.status === 'inactive' ? '—' : a ? `<span class="tag ${STATUS_TAG[a.status]}">${STATUS[a.status]}</span>` : '<span class="tag mute">—</span>'}</td></tr>`; }).join('')
    || `<tr><td colspan="9" class="empty">${D.students.length ? 'لا يوجد طلاب بهذه المواصفات' : 'لم تسجّل أي طالب بعد<br><button class="btn primary" onclick="studentForm()">أضف أول طالب</button>'}</td></tr>`}
  </tbody></table></div></section>`;
};

function openStudent(id) {
  const s = studentById(id); if (!s) return;
  const b = bal(s);
  const pays = D.payments.filter(p => p.studentId === id);
  const books = D.books.filter(x => x.studentId === id);
  const notes = D.notes.filter(n => n.studentId === id).slice(0, 8);
  const att = D.attendance.filter(a => a.studentId === id);
  const rate = att.length ? Math.round(att.filter(a => ['present', 'late'].includes(a.status)).length / att.length * 100) : null;
  modal(`
    <div class="profile-top"><div class="av">${esc(initial(s.name))}</div><div><h2 style="margin:0">${esc(s.name)}</h2>
      <div class="muted">${esc(s.grade || 'بدون صف')} · ملتحق ${esc(s.join_date || '—')}</div>
      ${s.status === 'inactive' ? `<span class="tag warn">منقطع منذ ${esc(s.inactive_date || '')}</span>` : '<span class="tag ok">مستمر</span>'}</div></div>

    <div class="figures" style="grid-template-columns:repeat(3,1fr)">
      <div class="fig"><span>المستحق</span><b>${fmt(b.totalDue)}</b><small>${esc(b.desc)}${b.booksTotal ? ` + كتب ${fmt(b.booksTotal)}` : ''}${b.oneTime ? ` − خصم ${fmt(b.oneTime)}${s.oneTimeDiscountNote ? ' (' + esc(s.oneTimeDiscountNote) + ')' : ''}` : ''}</small></div>
      <div class="fig"><span>المدفوع</span><b class="money-ok">${fmt(b.paid)}</b><small>${pays.length} دفعة</small></div>
      <div class="fig"><span>المتبقي</span><b class="${b.remaining > 0 ? 'money-bad' : 'money-ok'}">${fmt(b.remaining)}</b><small>${rate !== null ? `حضور ${rate}٪` : ''}</small></div>
    </div>

    <div class="actions" style="margin-bottom:16px">
      <button type="button" class="btn primary" onclick="paymentForm('${id}')">+ دفعة</button>
      <button type="button" class="btn" onclick="bookForm('${id}')">+ كتاب</button>
      <button type="button" class="btn" onclick="noteForm('${id}')">+ ملاحظة يومية</button>
      <button type="button" class="btn" onclick="studentForm('${id}')">تعديل البيانات</button>
      <button type="button" class="btn" onclick="statement('${id}')">كشف حساب</button>
    </div>

    <fieldset><legend>بوابة ولي الأمر</legend>
      <p class="muted" style="margin-top:0">رابط خاص يرى منه ولي الأمر الرسوم والحضور والملاحظات والإعلانات، بدون كلمة مرور.</p>
      <div class="actions">
        ${s.parent_phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(s.parent_phone, `السلام عليكم، هذا رابط متابعة ${s.name} في ${D.settings.schoolName}:\n${portalUrl(s)}`)}">إرسال الرابط بواتساب</a>` : ''}
        <button type="button" class="btn sm" onclick="navigator.clipboard.writeText('${portalUrl(s)}').then(()=>toast('تم نسخ الرابط'))">نسخ الرابط</button>
        <a class="btn sm" href="${portalUrl(s)}" target="_blank" rel="noopener">معاينة</a>
        <button type="button" class="btn sm ghost" onclick="resetPortal('${id}')">إلغاء الرابط وإنشاء جديد</button>
      </div></fieldset>

    <fieldset><legend>بيانات التواصل</legend><dl class="kv">
      <dt>ولي الأمر</dt><dd>${esc(s.parent_name || '—')}</dd>
      <dt>الجوال</dt><dd>${s.parent_phone ? `<a href="tel:${esc(s.parent_phone)}">${esc(s.parent_phone)}</a>` : '—'}</dd>
      ${s.notes ? `<dt>ملاحظات</dt><dd>${esc(s.notes)}</dd>` : ''}</dl></fieldset>

    <fieldset><legend>الدفعات</legend>
      ${pays.length ? pays.map(p => `<div class="list-row"><div>إيصال <b class="num">${p.receiptNo}</b> <span class="muted">· ${esc(p.date)} · ${esc(p.method)}</span></div><div class="actions"><b>${money(p.amount)}</b><button type="button" class="btn sm" onclick="printReceipt('${p.id}')">طباعة</button></div></div>`).join('') : '<p class="muted">لا توجد دفعات</p>'}</fieldset>
    ${books.length ? `<fieldset><legend>الكتب</legend>${books.map(x => `<div class="list-row"><span>${esc(x.title)} <span class="muted">${esc(x.date)}</span></span><b>${money(x.price)}</b></div>`).join('')}</fieldset>` : ''}
    ${notes.length ? `<fieldset><legend>آخر الملاحظات</legend>${notes.map(n => `<div class="list-row"><span><span class="tag mute">${esc(n.type)}</span> ${esc(n.text)}</span><span class="muted">${esc(n.date)}</span></div>`).join('')}</fieldset>` : ''}

    <div class="modal-actions">
      <button class="btn" value="cancel">إغلاق</button>
      ${s.status === 'inactive' ? `<button type="button" class="btn" onclick="setStatus('${id}','active')">إعادة تفعيل</button>` : `<button type="button" class="btn" onclick="setStatus('${id}','inactive')">لم يعد يأتي</button>`}
      <button type="button" class="btn danger" onclick="deleteStudent('${id}')">حذف نهائي</button>
    </div>`);
}

function studentForm(id) {
  const s = id ? studentById(id) : {};
  const v = k => esc(s[k] ?? '');
  modal(`<h2>${id ? 'تعديل بيانات ' + esc(s.name) : 'تسجيل طالب جديد'}</h2>
    <fieldset><legend>الطفل</legend><div class="grid g2">
      <label class="f">الاسم الثلاثي *<input name="name" required value="${v('name')}"></label>
      <label class="f">الصف<input name="grade" list="cls-list" value="${v('grade')}" placeholder="اختر أو اكتب صفاً"><datalist id="cls-list">${classes().map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
    </div></fieldset>
    <fieldset><legend>ولي الأمر</legend><div class="grid g2">
      <label class="f">اسم ولي الأمر<input name="parent_name" value="${v('parent_name')}"></label>
      <label class="f">الجوال (واتساب)<input name="parent_phone" inputmode="tel" value="${v('parent_phone')}" placeholder="05xxxxxxxx"></label>
    </div></fieldset>
    <fieldset><legend>الرسوم</legend><div class="grid g3">
      <label class="f">تاريخ الالتحاق<input type="date" name="join_date" value="${v('join_date') || D.today}"></label>
      <label class="f">الرسم الشهري *<input type="number" min="0" name="monthlyFee" required value="${v('monthlyFee')}"></label>
      <label class="f">خصم شهري<input type="number" min="0" name="discount" value="${v('discount') || 0}"></label>
      <label class="f">خصم لمرة واحدة<input type="number" min="0" step="any" name="oneTimeDiscount" value="${v('oneTimeDiscount') || 0}"></label>
      <label class="f">سبب الخصم<input name="oneTimeDiscountNote" value="${v('oneTimeDiscountNote')}" placeholder="مثال: تسوية أيام سبتمبر"></label>
      ${id ? '' : `<label class="f">الدفعة الأولى<input type="number" min="0" name="firstPayment" value="0"></label>
      <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label>`}
    </div><p class="muted">الالتحاق حتى يوم ${D.settings.halfMonthAfterDay || 10} من الشهر يُحسب شهراً كاملاً، وبعده يُحسب بالأيام (الرسم ÷ 30 × الأيام المتبقية من الشهر).</p></fieldset>
    <label class="f">ملاحظات<textarea name="notes">${v('notes')}</textarea></label>
    <div class="modal-actions"><button class="btn primary" value="ok">${id ? 'حفظ التعديلات' : 'تسجيل الطالب'}</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      const r = id ? await act('PUT', `/api/students/${id}`, data, 'تم حفظ التعديلات') : await act('POST', '/api/students', data, 'تم تسجيل الطالب');
      if (r && !id && r.payment) printReceipt(r.payment.id);
      return !!r;
    });
}
async function setStatus(id, status) {
  if (status === 'inactive' && !confirm('سيتوقف احتساب الرسوم الشهرية لهذا الطالب من اليوم، وتبقى مديونيته السابقة محفوظة. متابعة؟')) return;
  closeModal(); await act('PUT', `/api/students/${id}/status`, { status }, status === 'inactive' ? 'تم تحويل الطالب إلى منقطع' : 'تم إعادة تفعيل الطالب');
}
async function deleteStudent(id) {
  const s = studentById(id);
  if (prompt(`سيُحذف ${s.name} مع كل دفعاته وكتبه وحضوره نهائياً ولا يمكن التراجع.\nاكتب "حذف" للتأكيد:`) !== 'حذف') return;
  closeModal(); await act('DELETE', `/api/students/${id}`, null, 'تم حذف الطالب');
}
async function resetPortal(id) {
  if (!confirm('سيتوقف الرابط القديم عن العمل. متابعة؟')) return;
  const r = await act('PUT', `/api/students/${id}/portal`, null, 'تم إنشاء رابط جديد'); if (r) openStudent(id);
}

/* ---------- المالية ---------- */
VIEWS.finance = () => {
  const tabs = [['payments', 'الدفعات'], ['debts', 'المتأخرات'], ['expenses', 'المصروفات'], ['books', 'الكتب']];
  return `<div class="head"><div><h1>المالية</h1><p>المقبوضات والمتأخرات والمصروفات</p></div>
    <div class="actions"><button class="btn primary" onclick="paymentForm()">+ تسجيل دفعة</button><button class="btn" onclick="expenseForm()">+ مصروف</button></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${UI.finTab === k}" onclick="UI.finTab='${k}';render()">${l}</button>`).join('')}</div>
  ${FIN[UI.finTab]()}`;
};
const FIN = {
  payments() {
    const m = UI.payMonth ?? monthOf(D.today);
    const list = D.payments.filter(p => !m || monthOf(p.date) === m);
    return `<div class="filters"><select onchange="UI.payMonth=this.value;render()" aria-label="الشهر"><option value="" ${!m ? 'selected' : ''}>كل الأشهر</option>${activeMonths().reverse().map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${monthName(x)}</option>`).join('')}</select></div>
    <section class="panel"><h2>${m ? 'المقبوضات في ' + monthName(m) : 'كل المقبوضات'} <span class="money-ok">${money(sumBy(list, p => p.amount))}</span> <button class="btn sm" onclick="csv('payments')">تصدير Excel</button></h2><div class="tbl-wrap"><table><thead><tr><th>الإيصال</th><th>الطالب</th><th>المبلغ</th><th>الطريقة</th><th>التاريخ</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr><td class="num">#${p.receiptNo || '—'}</td><td>${esc(p.studentName)}</td><td class="money-ok">${money(p.amount)}</td><td>${esc(p.method || '')}</td><td class="num">${esc(p.date)}</td>
      <td class="actions"><button class="btn sm" onclick="printReceipt('${p.id}')">طباعة</button><button class="btn sm danger" onclick="del('payments','${p.id}','هذا الإيصال')">حذف</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">لا توجد دفعات في هذا الشهر</td></tr>'}
    </tbody></table></div></section>`;
  },
  debts() {
    const rows = D.students.map(s => ({ s, b: bal(s) })).filter(x => x.b.remaining > 0).sort((a, b) => b.b.remaining - a.b.remaining);
    return `<section class="panel"><h2>الطلاب المتأخرون في السداد <span class="money-bad">${money(sumBy(rows, x => x.b.remaining))}</span></h2>
    <p class="muted" style="margin-top:0">زر التذكير يفتح واتساب برسالة جاهزة فيها المبلغ ورابط المتابعة.</p>
    <div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الصف</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th></th></tr></thead><tbody>
    ${rows.map(({ s, b }) => `<tr class="${s.status === 'inactive' ? 'dim' : ''}"><td><b>${esc(s.name)}</b>${s.status === 'inactive' ? ' <span class="tag warn">منقطع</span>' : ''}</td><td>${esc(s.grade || '')}</td><td>${money(b.totalDue)}</td><td>${money(b.paid)}</td><td class="money-bad">${money(b.remaining)}</td>
      <td class="actions">${s.parent_phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${reminderLink(s, b)}">تذكير واتساب</a>` : '<span class="muted">لا يوجد رقم</span>'}<button class="btn sm" onclick="paymentForm('${s.id}')">+ دفعة</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">جميع الحسابات مسددة 🎉</td></tr>'}
    </tbody></table></div></section>`;
  },
  expenses() {
    const m = UI.expMonth;
    const list = D.expenses.filter(e => !m || monthOf(e.date) === m);
    const cats = {}; list.forEach(e => cats[e.category || 'أخرى'] = (cats[e.category || 'أخرى'] || 0) + N(e.amount));
    return `<div class="filters"><select onchange="UI.expMonth=this.value;render()" aria-label="الشهر"><option value="">كل الأشهر</option>${lastMonths(12).reverse().map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${monthName(x)}</option>`).join('')}</select></div>
    ${Object.keys(cats).length ? `<section class="panel"><h2>حسب البند</h2>${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="list-row"><span>${esc(c)}</span><b class="money-bad">${money(v)}</b></div>`).join('')}</section>` : ''}
    <section class="panel"><h2>المصروفات <span>${money(sumBy(list, e => e.amount))}</span></h2><div class="tbl-wrap"><table><thead><tr><th>البند</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th></th></tr></thead><tbody>
    ${list.map(e => `<tr><td><b>${esc(e.title)}</b>${e.note ? `<div class="muted">${esc(e.note)}</div>` : ''}</td><td><span class="tag mute">${esc(e.category || 'أخرى')}</span></td><td class="money-bad">${money(e.amount)}</td><td class="num">${esc(e.date)}</td>
      <td><button class="btn sm danger" onclick="del('expenses','${e.id}','هذا المصروف')">حذف</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">لا توجد مصروفات</td></tr>'}
    </tbody></table></div></section>`;
  },
  books() {
    return `<section class="panel"><h2>مبيعات الكتب <button class="btn sm" onclick="bookForm()">+ كتاب لطالب</button></h2><div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الكتاب</th><th>السعر</th><th>التاريخ</th><th></th></tr></thead><tbody>
    ${D.books.map(b => `<tr><td>${esc(b.studentName)}</td><td>${esc(b.title)}</td><td>${money(b.price)}</td><td class="num">${esc(b.date)}</td><td><button class="btn sm danger" onclick="del('books','${b.id}','هذا الكتاب')">حذف</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">لا توجد كتب مسجلة</td></tr>'}
    </tbody></table></div><p class="muted">سعر الكتاب يُضاف تلقائياً إلى مستحقات الطالب.</p></section>`;
  },
};
function reminderLink(s, b) {
  return waLink(s.parent_phone, `السلام عليكم ${s.parent_name ? 'أ. ' + s.parent_name : 'ولي أمر الطالب'}،\nنود تذكيركم بأن المبلغ المتبقي على ${s.name} هو ${fmt(b.remaining)} ${cur()}.\nيمكنكم متابعة التفاصيل من الرابط:\n${portalUrl(s)}\nشاكرين تعاونكم — ${D.settings.schoolName}`);
}
const studentOptions = sel => active().concat(D.students.filter(s => s.status === 'inactive'))
  .map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)} — ${esc(s.grade || '')}${s.status === 'inactive' ? ' (منقطع)' : ''}</option>`).join('');

function paymentForm(sid) {
  const remainingHint = id => { const s = studentById(id); return s ? `المتبقي عليه: ${fmt(bal(s).remaining)} ${cur()}` : ''; };
  modal(`<h2>تسجيل دفعة</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">الطالب *<select name="studentId" required onchange="document.getElementById('rh').textContent=(${remainingHint})(this.value)"><option value="">اختر الطالب…</option>${studentOptions(sid)}</select><small class="muted" id="rh">${sid ? remainingHint(sid) : ''}</small></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required></label>
    <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f">ملاحظة<input name="note" placeholder="مثال: رسوم شهر أكتوبر"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ وطباعة الإيصال</button><button class="btn" value="save">حفظ فقط</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async (data, btn) => { const r = await act('POST', '/api/payments', data, 'تم تسجيل الدفعة'); if (r && btn === 'ok') printReceipt(r.id); return !!r; });
}
function expenseForm() {
  modal(`<h2>تسجيل مصروف</h2><div class="grid g2">
    <label class="f">البند *<input name="title" required placeholder="مثال: فاتورة الكهرباء"></label>
    <label class="f">التصنيف<select name="category">${(D.settings.expenseCategories || []).map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f" style="grid-column:1/-1">ملاحظة<input name="note"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ المصروف</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/expenses', data, 'تم تسجيل المصروف')));
}
function bookForm(sid) {
  modal(`<h2>إضافة كتاب لطالب</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">الطالب *<select name="studentId" required><option value="">اختر الطالب…</option>${studentOptions(sid)}</select></label>
    <label class="f">اسم الكتاب *<input name="title" required></label>
    <label class="f">السعر *<input type="number" min="0" step="any" name="price" required></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">إضافة الكتاب</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/books', data, 'تمت إضافة الكتاب')));
}
async function del(kind, id, what) {
  if (!confirm(`حذف ${what}؟ لا يمكن التراجع.`)) return;
  await act('DELETE', `/api/${kind}/${id}`, null, 'تم الحذف');
}

/* الإيصال وكشف الحساب */
function printDoc(title, body) {
  const w = window.open('', '_blank');
  if (!w) return toast('اسمح بالنوافذ المنبثقة لطباعة الإيصال', true);
  const st = D.settings;
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Reem+Kufi:wght@600&display=swap" rel="stylesheet">
  <style>body{font-family:'IBM Plex Sans Arabic',sans-serif;color:#1B2A3A;max-width:720px;margin:24px auto;padding:0 20px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #145741;padding-bottom:14px;margin-bottom:18px}
  h1{font-family:'Reem Kufi',sans-serif;margin:0;font-size:26px;color:#145741} h2{margin:0 0 4px;font-size:20px}
  .muted{color:#7D8B99;font-size:13px} table{width:100%;border-collapse:collapse;margin:14px 0} td,th{padding:9px;border-bottom:1px solid #DCE5E3;text-align:right}
  th{background:#EEF3F2;font-size:13px} .big{font-size:28px;font-weight:700;color:#145741} .sig{display:flex;justify-content:space-between;margin-top:50px}
  .sig div{border-top:1px solid #7D8B99;width:200px;text-align:center;padding-top:6px;color:#4A5B6C;font-size:13px}
  @media print{button{display:none}}</style></head><body>
  <div class="top"><div><h1>${esc(st.schoolName)}</h1><div class="muted">${esc(st.address || '')}${st.phone ? ' · ' + esc(st.phone) : ''}${st.vatNumber ? '<br>الرقم الضريبي: ' + esc(st.vatNumber) : ''}</div></div>
  <div style="text-align:left"><h2>${esc(title)}</h2><div class="muted">${hijri(D.today)}</div></div></div>
  ${body}<p style="text-align:center"><button onclick="print()" style="padding:10px 24px;font:inherit;cursor:pointer">طباعة</button></p>
  <script>setTimeout(()=>print(),600)<\/script></body></html>`);
  w.document.close();
}
function printReceipt(pid) {
  const p = D.payments.find(x => x.id === pid); if (!p) return;
  const s = studentById(p.studentId); const b = s ? bal(s) : null;
  printDoc(`سند قبض رقم ${p.receiptNo}`, `
    <table><tr><th>استلمنا من ولي أمر الطالب</th><td><b>${esc(p.studentName)}</b>${s?.grade ? ` — ${esc(s.grade)}` : ''}</td></tr>
    <tr><th>مبلغ وقدره</th><td class="big">${fmt(p.amount)} ${cur()}</td></tr>
    <tr><th>طريقة الدفع</th><td>${esc(p.method || 'نقدي')}</td></tr>
    <tr><th>التاريخ</th><td>${esc(p.date)}</td></tr>
    ${p.note ? `<tr><th>البيان</th><td>${esc(p.note)}</td></tr>` : ''}
    ${b ? `<tr><th>المتبقي على الطالب بعد هذه الدفعة</th><td><b>${fmt(b.remaining)} ${cur()}</b></td></tr>` : ''}</table>
    <div class="sig"><div>المستلم</div><div>الختم</div></div>`);
}
function statement(id) {
  const s = studentById(id), b = bal(s);
  const pays = D.payments.filter(p => p.studentId === id).slice().reverse();
  const books = D.books.filter(x => x.studentId === id);
  printDoc('كشف حساب طالب', `<h2>${esc(s.name)} <span class="muted">${esc(s.grade || '')}</span></h2>
    <table><tr><th>البيان</th><th>مدين</th><th>دائن</th><th>التاريخ</th></tr>
    <tr><td>رسوم دراسية (${esc(b.desc)})</td><td>${fmt(b.tuition)}</td><td></td><td>منذ ${esc(s.join_date)}</td></tr>
    ${books.map(x => `<tr><td>كتاب: ${esc(x.title)}</td><td>${fmt(x.price)}</td><td></td><td>${esc(x.date)}</td></tr>`).join('')}
    ${b.oneTime ? `<tr><td>خصم${s.oneTimeDiscountNote ? ': ' + esc(s.oneTimeDiscountNote) : ''}</td><td></td><td>${fmt(b.oneTime)}</td><td></td></tr>` : ''}
    ${pays.map(p => `<tr><td>دفعة — إيصال ${p.receiptNo}</td><td></td><td>${fmt(p.amount)}</td><td>${esc(p.date)}</td></tr>`).join('')}
    <tr><th>الإجمالي</th><th>${fmt(b.tuition + b.booksTotal)}</th><th>${fmt(b.paid + b.oneTime)}</th><th></th></tr></table>
    <p class="big">الرصيد المتبقي: ${fmt(b.remaining)} ${cur()}</p>`);
}

/* ---------- الموظفون ---------- */
VIEWS.staff = () => {
  const m = monthOf(D.today);
  const list = D.staff;
  const total = sumBy(list.filter(x => x.status !== 'inactive'), x => x.salary);
  return `<div class="head"><div><h1>الموظفون والرواتب</h1><p>إجمالي الرواتب الشهرية: ${money(total)}</p></div>
    <div class="actions"><button class="btn primary" onclick="staffForm()">+ موظف</button></div></div>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الصفوف</th><th>الجوال</th><th>الراتب</th><th>راتب ${monthName(m)}</th><th></th></tr></thead><tbody>
  ${list.map(x => { const paid = D.expenses.find(e => e.staffId === x.id && e.month === m);
    return `<tr class="${x.status === 'inactive' ? 'dim' : ''}"><td><b>${esc(x.name)}</b></td><td>${esc(x.role || '')}</td><td>${esc(x.classes || '')}</td><td>${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : ''}</td><td>${money(x.salary)}</td>
    <td>${paid ? '<span class="tag ok">مصروف</span>' : x.status === 'inactive' ? '—' : `<button class="btn sm primary" onclick="paySalary('${x.id}')">صرف الراتب</button>`}</td>
    <td class="actions"><button class="btn sm" onclick="staffForm('${x.id}')">تعديل</button><button class="btn sm danger" onclick="del('staff','${x.id}','هذا الموظف')">حذف</button></td></tr>`; }).join('')
    || '<tr><td colspan="7" class="empty">لم تضف أي موظف بعد<br><button class="btn primary" onclick="staffForm()">أضف أول موظف</button></td></tr>'}
  </tbody></table></div><p class="muted">صرف الراتب يسجّله تلقائياً كمصروف في بند "رواتب".</p></section>`;
};
function staffForm(id) {
  const x = id ? D.staff.find(s => s.id === id) : {};
  const v = k => esc(x[k] ?? '');
  modal(`<h2>${id ? 'تعديل موظف' : 'إضافة موظف'}</h2><div class="grid g2">
    <label class="f">الاسم *<input name="name" required value="${v('name')}"></label>
    <label class="f">الوظيفة<input name="role" value="${v('role')}" list="roles"><datalist id="roles"><option value="معلمة"><option value="مساعدة معلمة"><option value="مديرة"><option value="سائق"><option value="عاملة نظافة"><option value="حارس"></datalist></label>
    <label class="f">الجوال<input name="phone" inputmode="tel" value="${v('phone')}"></label>
    <label class="f">الراتب الشهري<input type="number" min="0" name="salary" value="${v('salary')}"></label>
    <label class="f">الصفوف المسؤولة عنها<input name="classes" value="${v('classes')}"></label>
    <label class="f">تاريخ التعيين<input type="date" name="join_date" value="${v('join_date')}"></label>
    <label class="f">الحالة<select name="status"><option value="active">على رأس العمل</option><option value="inactive" ${x.status === 'inactive' ? 'selected' : ''}>منتهية خدمته</option></select></label>
    <label class="f">ملاحظات<input name="notes" value="${v('notes')}"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(id ? await act('PUT', `/api/staff/${id}`, data, 'تم الحفظ') : await act('POST', '/api/staff', data, 'تمت إضافة الموظف')));
}
async function paySalary(id) {
  const x = D.staff.find(s => s.id === id);
  const amt = prompt(`صرف راتب ${x.name} لشهر ${monthName(monthOf(D.today))}. المبلغ:`, x.salary || '');
  if (amt === null) return;
  await act('POST', `/api/staff/${id}/pay-salary`, { amount: amt }, 'تم صرف الراتب وتسجيله في المصروفات');
}

/* ---------- التواصل ---------- */
VIEWS.comms = () => {
  const tabs = [['ann', 'الإعلانات والفعاليات'], ['notes', 'الملاحظات اليومية'], ['bulk', 'رسالة جماعية']];
  return `<div class="head"><div><h1>التواصل مع أولياء الأمور</h1><p>كل ما تنشره هنا يظهر في بوابة ولي الأمر</p></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${UI.commTab === k}" onclick="UI.commTab='${k}';render()">${l}</button>`).join('')}</div>
  ${COMM[UI.commTab]()}`;
};
const COMM = {
  ann() {
    return `<section class="panel"><h2>الإعلانات <button class="btn sm primary" onclick="annForm()">+ إعلان أو فعالية</button></h2>
    ${D.announcements.map(a => `<div class="list-row"><div><b>${esc(a.title)}</b> ${a.audience && a.audience !== 'all' ? `<span class="tag mute">${esc(a.audience)}</span>` : ''}${a.eventDate ? ` <span class="tag info">${esc(a.eventDate)}</span>` : ''}${a.body ? `<div>${esc(a.body)}</div>` : ''}<div class="muted">${esc(a.date)}</div></div>
      <div class="actions"><button class="btn sm" onclick="bulkFor('${a.id}')">إرسال بواتساب</button><button class="btn sm danger" onclick="del('announcements','${a.id}','هذا الإعلان')">حذف</button></div></div>`).join('') || '<p class="empty">لا توجد إعلانات. أضف إعلاناً مثل: "رحلة إلى حديقة الحيوان يوم الخميس"</p>'}</section>`;
  },
  notes() {
    return `<section class="panel"><h2>الملاحظات اليومية <button class="btn sm primary" onclick="noteForm()">+ ملاحظة</button></h2>
    <p class="muted" style="margin-top:0">سجّل ملاحظة لطفل أو لصف كامل (مثال: "تعلّمنا اليوم حرف الباء"). تظهر لولي الأمر في البوابة.</p>
    ${D.notes.slice(0, 60).map(n => { const s = studentById(n.studentId); return `<div class="list-row"><div><b>${esc(s?.name || '—')}</b> <span class="tag mute">${esc(n.type)}</span>${n.mood ? ` <span class="tag info">${esc(n.mood)}</span>` : ''}<div>${esc(n.text)}</div></div>
      <div class="actions"><span class="muted">${esc(n.date)}</span><button class="btn sm danger" onclick="del('notes','${n.id}','هذه الملاحظة')">حذف</button></div></div>`; }).join('') || '<p class="empty">لا توجد ملاحظات بعد</p>'}</section>`;
  },
  bulk() {
    return `<section class="panel"><h2>رسالة جماعية لأولياء الأمور</h2>
    <div class="grid g2"><label class="f">الصف<select id="bulk-cls" onchange="bulkPreview()"><option value="">كل الصفوف</option>${classes().map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
    <label class="f" style="margin-top:12px">نص الرسالة<textarea id="bulk-text" oninput="bulkPreview()" placeholder="السلام عليكم، نذكّركم بأن غداً إجازة…"></textarea></label>
    <p class="muted">واتساب لا يسمح بالإرسال الجماعي التلقائي من المتصفح، لذلك يظهر زر لكل ولي أمر يفتح المحادثة والرسالة جاهزة.</p>
    <div id="bulk-list"></div></section>`;
  },
};
function bulkPreview() {
  const cls = $('#bulk-cls')?.value, text = $('#bulk-text')?.value || '';
  const list = active().filter(s => s.parent_phone && (!cls || s.grade === cls));
  $('#bulk-list').innerHTML = text.trim() ? list.map(s => `<div class="list-row"><span>${esc(s.parent_name || 'ولي أمر')} — ${esc(s.name)}</span><a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(s.parent_phone, text)}" onclick="this.classList.remove('wa');this.textContent='تم الفتح ✓'">إرسال</a></div>`).join('') || '<p class="empty">لا يوجد أولياء أمور لديهم أرقام في هذا الصف</p>' : '';
}
function bulkFor(aid) {
  const a = D.announcements.find(x => x.id === aid);
  UI.commTab = 'bulk'; render();
  if (a.audience && a.audience !== 'all') $('#bulk-cls').value = a.audience;
  $('#bulk-text').value = `📣 ${a.title}${a.body ? '\n' + a.body : ''}${a.eventDate ? '\nالموعد: ' + a.eventDate : ''}\n— ${D.settings.schoolName}`;
  bulkPreview();
}
function annForm() {
  modal(`<h2>إعلان أو فعالية جديدة</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">العنوان *<input name="title" required placeholder="مثال: حفل نهاية الفصل"></label>
    <label class="f" style="grid-column:1/-1">التفاصيل<textarea name="body"></textarea></label>
    <label class="f">موعد الفعالية (اختياري)<input type="date" name="eventDate"></label>
    <label class="f">موجّه إلى<select name="audience"><option value="all">جميع الصفوف</option>${classes().map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">نشر</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/announcements', data, 'تم نشر الإعلان')));
}
function noteForm(sid) {
  modal(`<h2>ملاحظة يومية</h2><div class="grid g2">
    <label class="f">${sid ? 'الطالب' : 'لمن؟'}<select name="target">${sid ? `<option value="s:${sid}">${esc(studentById(sid).name)}</option>` : `<optgroup label="صف كامل">${classes().map(c => `<option value="c:${esc(c)}">كل طلاب ${esc(c)}</option>`).join('')}</optgroup><optgroup label="طالب">${active().map(s => `<option value="s:${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`}</select></label>
    <label class="f">النوع<select name="type">${NOTE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
    <label class="f" style="grid-column:1/-1">الملاحظة *<textarea name="text" required placeholder="مثال: شارك اليوم في نشاط الرسم بحماس"></textarea></label>
    <label class="f">مزاج الطفل<select name="mood">${MOODS.map(m => `<option value="${m}">${m || '—'}</option>`).join('')}</select></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;grid-column:1/-1"><input type="checkbox" name="shared" checked style="width:auto"> تظهر لولي الأمر</label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ الملاحظة</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      const [k, v] = data.target.split(/:(.*)/s);
      const studentIds = k === 's' ? [v] : active().filter(s => s.grade === v).map(s => s.id);
      if (!studentIds.length) { toast('لا يوجد طلاب في هذا الصف', true); return false; }
      return !!(await act('POST', '/api/notes', { studentIds, type: data.type, text: data.text, mood: data.mood, date: data.date, shared: data.shared === 'on' }, `تم حفظ الملاحظة لـ ${studentIds.length} طالب`));
    });
}

/* ---------- التقارير ---------- */
// رسوم كل شهر لوحده لكل طالب، وتوزيع المدفوع على الأشهر من الأقدم للأحدث
const monthEnd = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0, 12); };
const prevMonth = m => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
function monthDue(s, m) {
  const upto = x => Finance.calcTuition(s, { ...opts(), now: monthEnd(x) }).tuition;
  const books = sumBy(D.books.filter(b => b.studentId === s.id && monthOf(b.date) === m), b => b.price);
  return Math.round((upto(m) - upto(prevMonth(m)) + books) * 100) / 100;
}
function allocation(s) {
  const ms = activeMonths().filter(m => s.join_date && m >= monthOf(s.join_date));
  let credit = sumBy(D.payments.filter(p => p.studentId === s.id), p => p.amount) + N(s.oneTimeDiscount);
  const out = {};
  for (const m of ms) { const due = monthDue(s, m); const covered = Math.max(0, Math.min(due, credit)); credit -= covered; out[m] = { due, covered, left: Math.round((due - covered) * 100) / 100 }; }
  return out;
}
VIEWS.reports = () => {
  const months = activeMonths();
  if (!months.includes(UI.repMonth)) UI.repMonth = months[months.length - 1];
  const m = UI.repMonth;
  const P = partners();
  const pays = D.payments.filter(p => monthOf(p.date) === m), exps = D.expenses.filter(e => monthOf(e.date) === m);
  const inc = sumBy(pays, p => p.amount), out = sumBy(exps, e => e.amount), net = inc - out;
  const byMethod = {}; pays.forEach(p => byMethod[p.method || 'نقدي'] = (byMethod[p.method || 'نقدي'] || 0) + N(p.amount));
  const byCat = {}; exps.forEach(e => byCat[e.category || 'أخرى'] = (byCat[e.category || 'أخرى'] || 0) + N(e.amount));
  // رسوم هذا الشهر لكل طالب
  const rows = D.students.map(s => { const a = allocation(s)[m]; return a && a.due > 0 ? { s, ...a, paidIn: sumBy(pays.filter(p => p.studentId === s.id), p => p.amount) } : null; }).filter(Boolean)
    .sort((a, b) => String(a.s.grade).localeCompare(String(b.s.grade), 'ar') || String(a.s.join_date).localeCompare(String(b.s.join_date)) || String(a.s.name).localeCompare(String(b.s.name), 'ar'));
  const cls = {}; rows.forEach(r => { const c = (cls[r.s.grade || 'بدون صف'] ||= { n: 0, due: 0, covered: 0 }); c.n++; c.due += r.due; c.covered += r.covered; });
  const dueT = sumBy(rows, r => r.due), covT = sumBy(rows, r => r.covered);
  const joined = D.students.filter(s => monthOf(s.join_date) === m).length;
  const kv = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="list-row"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('') || '<p class="empty">لا يوجد</p>';
  return `<div class="head"><div><h1>التقارير</h1><p>كل شهر لوحده</p></div>
    <div class="actions"><button class="btn" onclick="print()">طباعة التقرير</button></div></div>
  <div class="tabs" role="tablist">${months.map(x => `<button role="tab" aria-selected="${x === m}" onclick="UI.repMonth='${x}';render()">${monthName(x)}</button>`).join('')}</div>

  <h2 style="font-size:22px;margin:4px 0 14px">${monthName(m)}</h2>
  <div class="figures">
    <div class="fig"><span>المقبوض في ${monthName(m)}</span><b class="money-ok">${fmt(inc)}</b><small>${pays.length} إيصال</small></div>
    <div class="fig"><span>مصروفات ${monthName(m)}</span><b class="money-bad">${fmt(out)}</b><small>${exps.length} بند</small></div>
    <div class="fig"><span>صافي ${monthName(m)}</span><b>${fmt(net)}</b><small>${cur()}</small></div>
    <div class="fig"><span>نصيب الشركاء</span><b style="font-size:19px">${P.map(p => `${esc(p.name)}: ${fmt(net * N(p.share) / 100)}`).join('<br>')}</b><small>${P.map(p => fmt(p.share) + '٪').join(' / ')}</small></div>
  </div>

  <section class="panel"><h2>رسوم ${monthName(m)} <span class="muted">المستحق ${fmt(dueT)} · المحصّل منه ${fmt(covT)} · المتبقي ${fmt(dueT - covT)} ${cur()}</span></h2>
    <div class="tbl-wrap"><table><thead><tr><th>الصف</th><th>الطلاب</th><th>رسوم الشهر</th><th>المحصّل منها</th><th>المتبقي</th><th>نسبة التحصيل</th></tr></thead><tbody>
    ${Object.entries(cls).map(([k, c]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${c.n}</td><td>${money(c.due)}</td><td class="money-ok">${money(c.covered)}</td><td class="${c.due - c.covered > 0.009 ? 'money-bad' : 'money-ok'}">${money(c.due - c.covered)}</td><td><span class="tag ${c.due && c.covered / c.due >= .9 ? 'ok' : 'warn'}">${c.due ? Math.round(c.covered / c.due * 100) : 100}٪</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">لا يوجد</td></tr>'}
    </tbody></table></div>
    <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;color:var(--palm-3)">تفاصيل كل طالب في ${monthName(m)} (${rows.length})</summary>
    <div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الصف</th><th>رسوم الشهر</th><th>المحصّل منها</th><th>المتبقي</th><th>دفعه خلال الشهر</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="click" onclick="openStudent('${r.s.id}')"><td><b>${esc(r.s.name)}</b>${monthOf(r.s.join_date) === m ? ` <span class="tag info">التحق ${esc(fmtDate(r.s.join_date))}</span>` : ''}</td><td>${esc(r.s.grade || '')}</td><td>${money(r.due)}</td><td class="money-ok">${money(r.covered)}</td><td class="${r.left > 0 ? 'money-bad' : 'money-ok'}">${money(r.left)}</td><td>${r.paidIn ? money(r.paidIn) : '—'}</td></tr>`).join('')}
    </tbody></table></div></details>
    <p class="muted">المدفوع يُوزَّع على الأشهر من الأقدم للأحدث: أي دفعة تسدّد الشهر الأقدم أولاً. "المقبوض في الشهر" أعلاه هو ما دخل الصندوق فعلاً خلاله.</p>
  </section>

  <div class="cols">
    <section class="panel"><h2>مصروفات ${monthName(m)}</h2>${exps.map(e => `<div class="list-row"><span>${esc(e.title)} <span class="muted">${esc(fmtDate(e.date))}</span></span><b class="money-bad">${money(e.amount)}</b></div>`).join('') || '<p class="empty">لا توجد مصروفات في هذا الشهر</p>'}</section>
    <div><section class="panel"><h2>المقبوض حسب طريقة الدفع</h2>${kv(byMethod)}</section><section class="panel"><h2>المصروفات حسب البند</h2>${kv(byCat)}</section>
    <section class="panel"><h2>حركة الطلاب</h2><div class="list-row"><span>التحق في ${monthName(m)}</span><b>${joined}</b></div></section></div>
  </div>

  ${partnersPanel()}
  <section class="panel"><h2>تصدير ونسخ احتياطي</h2><div class="actions">
    <button class="btn" onclick="exportStudents()">الطلاب (Excel)</button><button class="btn" onclick="csv('payments')">الدفعات (Excel)</button><button class="btn" onclick="csv('expenses')">المصروفات (Excel)</button>
    <a class="btn primary" href="/api/backup" download>تنزيل نسخة احتياطية كاملة</a></div>
    <p class="muted">ننصح بتنزيل نسخة احتياطية مرة كل شهر وحفظها في مكان آمن.</p></section>`;
};
function partnersPanel() {
  const P = partners(), ms = activeMonths();
  const rows = ms.map(monthFin);
  const tot = { inc: sumBy(rows, r => r.inc), out: sumBy(rows, r => r.out) }; tot.net = tot.inc - tot.out;
  const share = (net, p) => net * (N(p.share) / 100);
  return `<section class="panel"><h2>ملخص كل الأشهر ونصيب الشركاء <span class="muted">${P.map(p => `${esc(p.name)} ${fmt(p.share)}٪`).join(' · ')}</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th>الشهر</th><th>المقبوض</th><th>المصروفات</th><th>الصافي</th>${P.map(p => `<th>نصيب ${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r => `<tr${r.m === UI.repMonth ? ' style="background:var(--palm-2)"' : ''}><td><b>${monthName(r.m)}</b></td><td class="money-ok">${money(r.inc)}</td><td class="money-bad">${money(r.out)}</td><td><b>${money(r.net)}</b></td>${P.map(p => `<td><b class="${r.net < 0 ? 'money-bad' : ''}">${money(share(r.net, p))}</b></td>`).join('')}</tr>`).join('')}
  <tr style="border-top:2px solid var(--line)"><td><b>الإجمالي</b></td><td class="money-ok"><b>${money(tot.inc)}</b></td><td class="money-bad"><b>${money(tot.out)}</b></td><td><b>${money(tot.net)}</b></td>${P.map(p => `<td><b>${money(share(tot.net, p))}</b></td>`).join('')}</tr>
  </tbody></table></div><p class="muted">المقبوض يُحسب حسب تاريخ الدفع، والصافي = المقبوض − كل المصروفات. تعديل الأسماء والنسب من الإعدادات.</p></section>`;
}
function downloadCsv(name, rows) {
  const body = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${D.today}.csv`; a.click();
}
function exportStudents() {
  downloadCsv('الطلاب', [['الاسم', 'الصف', 'ولي الأمر', 'الجوال', 'تاريخ الالتحاق', 'الرسم الشهري', 'الخصم', 'المستحق', 'المدفوع', 'المتبقي', 'الحالة'],
    ...D.students.map(s => { const b = bal(s); return [s.name, s.grade, s.parent_name, s.parent_phone, s.join_date, s.monthlyFee, s.discount, b.totalDue, b.paid, b.remaining, s.status === 'inactive' ? 'منقطع' : 'مستمر']; })]);
}
function csv(kind) {
  if (kind === 'payments') downloadCsv('الدفعات', [['رقم الإيصال', 'الطالب', 'المبلغ', 'الطريقة', 'التاريخ', 'ملاحظة'], ...D.payments.map(p => [p.receiptNo, p.studentName, p.amount, p.method, p.date, p.note])]);
  else downloadCsv('المصروفات', [['البند', 'التصنيف', 'المبلغ', 'التاريخ', 'ملاحظة'], ...D.expenses.map(e => [e.title, e.category, e.amount, e.date, e.note])]);
}

/* ---------- الإعدادات ---------- */
VIEWS.settings = () => {
  const s = D.settings;
  return `<div class="head"><div><h1>الإعدادات</h1></div><div class="actions"><button class="btn danger" onclick="logout()">تسجيل الخروج</button></div></div>
  ${installPanel()}
  <form class="panel" onsubmit="saveSettings(event)"><h2>بيانات الروضة</h2><div class="grid g2">
    <label class="f">اسم الروضة<input name="schoolName" value="${esc(s.schoolName)}"></label>
    <label class="f">جوال الروضة (واتساب)<input name="phone" value="${esc(s.phone || '')}"></label>
    <label class="f">العنوان<input name="address" value="${esc(s.address || '')}"></label>
    <label class="f">الرقم الضريبي (يظهر في الإيصال)<input name="vatNumber" value="${esc(s.vatNumber || '')}"></label>
    <label class="f">العملة<input name="currency" value="${esc(s.currency || 'ر.س')}"></label>
    <label class="f">الالتحاق حتى يوم كم يُحسب شهراً كاملاً؟ (بعده بالأيام)<input type="number" min="1" max="28" name="halfMonthAfterDay" value="${s.halfMonthAfterDay || 10}"></label>
    <label class="f" style="grid-column:1/-1">بنود المصروفات (افصل بفاصلة)<input name="expenseCategories" value="${esc((s.expenseCategories || []).join('، '))}"></label>
  </div><div class="actions" style="margin-top:14px"><button class="btn primary">حفظ</button></div></form>

  <form class="panel" onsubmit="savePartners(event)"><h2>الشركاء ونسبة كل شريك</h2>
    <div class="grid g2">${partners().map((p, i) => `<label class="f">اسم الشريك ${i + 1}<input name="n${i}" value="${esc(p.name)}" required></label><label class="f">النسبة ٪<input type="number" min="0" max="100" step="any" name="s${i}" value="${p.share}" required></label>`).join('')}</div>
    <div class="actions" style="margin-top:14px"><button class="btn primary">حفظ</button></div></form>

  <section class="panel"><h2>الصفوف <button class="btn sm primary" onclick="classForm()">+ صف</button></h2>
    ${(s.classes || []).map((c, i) => { const n = active().filter(x => x.grade === c.name).length;
      return `<div class="list-row"><div><b>${esc(c.name)}</b> <span class="muted">${n} طالب${c.capacity ? ` من ${c.capacity}` : ''}${c.teacher ? ` · المعلمة: ${esc(c.teacher)}` : ''}</span></div>
      <div class="actions"><button class="btn sm" onclick="classForm(${i})">تعديل</button><button class="btn sm danger" onclick="removeClass(${i})">حذف</button></div></div>`; }).join('') || '<p class="empty">لم تضف صفوفاً بعد</p>'}
  </section>

  <form class="panel" onsubmit="changePassword(event)"><h2>تغيير كلمة المرور</h2><div class="grid g3">
    <label class="f">الحالية<input type="password" name="current" required autocomplete="current-password"></label>
    <label class="f">الجديدة<input type="password" name="next" required minlength="6" autocomplete="new-password"></label>
    <label class="f">تأكيد الجديدة<input type="password" name="confirm" required minlength="6" autocomplete="new-password"></label>
  </div><div class="actions" style="margin-top:14px"><button class="btn primary">تغيير كلمة المرور</button></div></form>`;
};
async function savePartners(e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const list = partners().map((_, i) => ({ name: d['n' + i].trim(), share: +d['s' + i] }));
  const total = list.reduce((a, p) => a + p.share, 0);
  if (Math.abs(total - 100) > 0.01) return toast(`مجموع النسب ${total}٪ — يجب أن يكون 100٪`, true);
  await act('PUT', '/api/settings', { partners: list }, 'تم حفظ نسب الشركاء');
}
async function saveSettings(e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  d.expenseCategories = d.expenseCategories.split(/[،,]/).map(x => x.trim()).filter(Boolean);
  d.halfMonthAfterDay = +d.halfMonthAfterDay || 10;
  await act('PUT', '/api/settings', d, 'تم حفظ الإعدادات');
}
function classForm(i) {
  const c = i !== undefined ? D.settings.classes[i] : {};
  modal(`<h2>${i !== undefined ? 'تعديل صف' : 'صف جديد'}</h2><div class="grid g3">
    <label class="f">اسم الصف *<input name="name" required value="${esc(c.name || '')}" placeholder="مثال: روضة 1"></label>
    <label class="f">المعلمة<input name="teacher" value="${esc(c.teacher || '')}" list="teachers"><datalist id="teachers">${D.staff.map(x => `<option value="${esc(x.name)}">`).join('')}</datalist></label>
    <label class="f">السعة<input type="number" min="0" name="capacity" value="${c.capacity || ''}"></label></div>
    ${i !== undefined ? '<p class="muted">تغيير اسم الصف يُحدّث أسماء صفوف الطلاب تلقائياً.</p>' : ''}
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      const list = [...(D.settings.classes || [])];
      const item = { name: data.name.trim(), teacher: data.teacher, capacity: +data.capacity || undefined };
      const old = i !== undefined ? list[i].name : null;
      if (i !== undefined) list[i] = item; else list.push(item);
      const r = await api('PUT', '/api/settings', { classes: list });
      if (r && old && old !== item.name) for (const s of D.students.filter(x => x.grade === old)) await api('PUT', `/api/students/${s.id}`, { grade: item.name });
      if (r) { toast('تم حفظ الصف'); await load(); }
      return !!r;
    });
}
async function removeClass(i) {
  const c = D.settings.classes[i];
  if (active().some(s => s.grade === c.name)) return toast('انقل طلاب هذا الصف أولاً قبل حذفه', true);
  if (!confirm(`حذف صف ${c.name}؟`)) return;
  const list = D.settings.classes.filter((_, j) => j !== i);
  await act('PUT', '/api/settings', { classes: list }, 'تم حذف الصف');
}
async function changePassword(e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (d.next !== d.confirm) return toast('كلمتا المرور الجديدتان غير متطابقتين', true);
  if (await api('PUT', '/api/settings/password', d)) { toast('تم تغيير كلمة المرور'); e.target.reset(); }
}
async function logout() { await api('POST', '/api/logout'); location.href = '/login'; }

/* ---------- النوافذ ---------- */
let modalHandler = null;
function modal(html, onSubmit) {
  const dlg = $('#modal'), f = $('#modal-form');
  f.innerHTML = html; modalHandler = onSubmit || null;
  if (!dlg.open) dlg.showModal();
  f.querySelector('input:not([type=hidden]),select,textarea')?.focus();
  f.scrollTop = 0; dlg.scrollTop = 0;
}
function closeModal() { $('#modal').close(); }
$('#modal-form').addEventListener('submit', async e => {
  const btn = e.submitter?.value;
  if (btn === 'cancel' || !modalHandler) return; // يُغلق تلقائياً
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  e.submitter.disabled = true;
  const ok = await modalHandler(data, btn);
  if (e.submitter) e.submitter.disabled = false;
  if (ok) closeModal();
});

/* ---------- البدء ---------- */
/* ---------- التطبيق (PWA) ---------- */
let installPrompt = null;
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (D) render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('تم تثبيت التطبيق على جهازك'); if (D) render(); });
function installPanel() {
  if (isInstalled()) return '';
  if (installPrompt) return `<section class="panel"><h2>تثبيت البرنامج كتطبيق</h2><p class="muted" style="margin-top:0">أضف البرنامج إلى الشاشة الرئيسية ليفتح كتطبيق بملء الشاشة. مجاني ولا يحتاج متجر.</p><button class="btn primary" onclick="installApp()">تثبيت التطبيق</button></section>`;
  if (isIOS()) return `<section class="panel"><h2>تثبيت البرنامج كتطبيق على الآيفون</h2><ol style="margin:0;padding-inline-start:20px;line-height:2">
    <li>افتح البرنامج في متصفح <b>Safari</b></li><li>اضغط زر <b>المشاركة</b> (المربع والسهم ⬆️) في أسفل الشاشة</li><li>اختر <b>إضافة إلى الشاشة الرئيسية</b> ثم <b>إضافة</b></li></ol></section>`;
  return `<section class="panel"><h2>تثبيت البرنامج كتطبيق</h2><p class="muted" style="margin:0">على أندرويد: افتح البرنامج في <b>Chrome</b>، ثم القائمة ⋮ ← <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>. على الكمبيوتر: أيقونة التثبيت في شريط العنوان في Chrome أو Edge.</p></section>`;
}
async function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null; render();
}

VIEW = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'home';
load();
