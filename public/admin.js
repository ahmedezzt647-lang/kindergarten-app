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
const money = n => `<span class="amt"><span class="num">${fmt(n)}</span> ${cur()}</span>`;
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
const BOOK_BUY = 'شراء كتب';
const isBookBuy = e => e.category === BOOK_BUY;
// ما دُفع من ثمن الكتب خلال شهر (كل دفعة بتاريخها)
const bookPaysIn = m => D.books.flatMap(b => (b.pays || []).filter(p => !m || monthOf(p.date) === m));
function booksSummary(m) {
  const sold = sumBy(D.books.filter(b => !m || monthOf(b.date) === m), b => b.price);
  const collected = sumBy(bookPaysIn(m), p => p.amount);
  const bought = sumBy(D.expenses.filter(e => isBookBuy(e) && (!m || monthOf(e.date) === m)), e => e.amount);
  const unpaid = sumBy(D.books, b => N(b.price) - N(b.paidAmount));
  return { sold, collected, bought, unpaid };
}
function monthFin(m) {
  const fees = sumBy(D.payments.filter(p => monthOf(p.date) === m), p => p.amount);
  const books = sumBy(bookPaysIn(m), p => p.amount);
  const out = sumBy(D.expenses.filter(e => monthOf(e.date) === m), e => e.amount);
  const booksOut = sumBy(D.expenses.filter(e => isBookBuy(e) && monthOf(e.date) === m), e => e.amount);
  const other = sumBy((D.incomes || []).filter(x => monthOf(x.date) === m), x => x.amount);
  const inc = fees + books + other;
  return { m, fees, books, other, inc, out, booksOut, net: inc - out };
}
function activeMonths() {
  const ms = new Set([...D.payments.map(p => monthOf(p.date)), ...D.expenses.map(e => monthOf(e.date)), ...bookPaysIn().map(p => monthOf(p.date)), ...(D.incomes || []).map(x => monthOf(x.date)), monthOf(D.today)].filter(Boolean));
  return [...ms].sort();
}
const sumBy = (arr, f) => arr.reduce((a, x) => a + N(f(x)), 0);

/* ---------- التنقّل ---------- */
document.getElementById('nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v);
});
function go(v) { VIEW = v; location.hash = v; render(); $('#view').focus({ preventScroll: true }); window.scrollTo(0, 0); }
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== VIEW && VIEWS[v]) { VIEW = v; render(); } });

/* ---------- الصلاحيات ---------- */
const ME = () => D.me || { admin: true, perms: [] };
const can = p => ME().admin || (ME().perms || []).includes(p);
const canFin = () => can('finance') || can('reports');
const VIEW_PERM = { attendance: 'attendance', students: 'students', teach: 'teach', finance: 'finance', staff: 'staff', comms: 'comms', reports: 'reports', accounts: 'reports', develop: 'develop', appearance: 'settings' };
const viewAllowed = v => !VIEW_PERM[v] || can(VIEW_PERM[v]);
const PERM_LABELS = { attendance: '✅ الحضور', students: '👧 الطلاب (إضافة وتعديل)', teach: '📚 التعليم والدرجات', finance: '💰 المالية (دفعات، مصروفات، كتب)',
  reports: '📊 التقارير ونصيب الشركاء', staff: '🧑‍🏫 الموظفون والرواتب', comms: '📣 التواصل (إعلانات وملاحظات)', develop: '🚀 خطة التطوير', settings: '⚙️ الإعدادات والمظهر', delete: '🗑️ الحذف' };

function render() {
  if (!D) return;
  if (!viewAllowed(VIEW)) VIEW = 'home';
  document.querySelectorAll('#nav [data-v]').forEach(b => { b.hidden = !viewAllowed(b.dataset.v); });
  document.querySelectorAll('#nav .navlink').forEach(a => { a.hidden = !ME().admin; });
  document.body.classList.toggle('no-delete', !can('delete'));
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
  const mf = monthFin(m), income = mf.inc, spent = mf.out;
  const debtors = D.students.map(s => ({ s, b: bal(s) })).filter(x => x.b.remaining > 0).sort((a, b) => b.b.remaining - a.b.remaining);
  const owed = sumBy(debtors, x => x.b.remaining);
  const upcoming = D.announcements.filter(a => a.eventDate && a.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate)).slice(0, 4);
  const hour = new Date().getHours();

  const banner = window.APPEARANCE?.images?.banner;
  return `
  ${banner ? `<div class="banner"><img src="/img/banner?v=${banner}" alt=""></div>` : ''}
  <div class="head"><div><h1>${hour < 12 ? 'صباح الخير' : 'مساء الخير'}</h1><p>${dayName(today)} · ${hijri(today)}</p></div>
    <div class="actions">${installPrompt && !isInstalled() ? '<button class="btn" onclick="installApp()">📲 تثبيت التطبيق</button>' : ''}${can('students') ? '<button class="btn primary" onclick="studentForm()">+ طالب جديد</button>' : ''}${can('finance') ? '<button class="btn" onclick="paymentForm()">+ تسجيل دفعة</button>' : ''}</div></div>
  ${!ME().admin ? `<p class="muted" style="margin-top:-6px">مرحباً ${esc(ME().name)} 👋</p>` : ''}
  <div class="figures"${canFin() ? '' : ' style="grid-template-columns:1fr"'}>
    <button class="fig" onclick="go('attendance')"><span>حضور اليوم</span><b class="num">${present} / ${act_.length}</b><small>${marked < act_.length ? `بقي ${act_.length - marked} بدون تسجيل` : 'اكتمل التسجيل'}</small></button>
    ${canFin() ? `<button class="fig" onclick="UI.finTab='payments';go('finance')"><span>المقبوض هذا الشهر</span><b class="num money-ok">${fmt(income)}</b><small>${mf.books || mf.other ? `رسوم ${fmt(mf.fees)}${mf.books ? ` · كتب ${fmt(mf.books)}` : ''}${mf.other ? ` · أخرى ${fmt(mf.other)}` : ''}` : cur()}</small></button>
    <button class="fig" onclick="UI.finTab='debts';go('finance')"><span>مبالغ متأخرة</span><b class="num money-bad">${fmt(owed)}</b><small>${debtors.length} طالب</small></button>
    <button class="fig" onclick="go('reports')"><span>صافي الشهر</span><b class="num">${fmt(income - spent)}</b><small>${partners().map(p => `${esc(p.name)}: ${fmt((income - spent) * N(p.share) / 100)}`).join(' · ')}</small></button>` : ''}
  </div>

  <div class="cols">
    <div>
      ${canFin() ? `<section class="panel"><h2>أعلى المتأخرين في السداد ${debtors.length > 5 ? `<button class="btn sm ghost" onclick="UI.finTab='debts';go('finance')">عرض الكل</button>` : ''}</h2>
        ${debtors.length ? debtors.slice(0, 5).map(({ s, b }) => `<div class="list-row"><div><b>${esc(s.name)}</b><div class="muted">${esc(s.grade || '')}</div></div><div class="actions"><span class="money-bad">${money(b.remaining)}</span>${s.parent_phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${reminderLink(s, b)}">تذكير</a>` : ''}</div></div>`).join('') : '<p class="empty">لا توجد مبالغ متأخرة 🎉</p>'}
      </section>` : ''}
      ${can('teach') && teachClasses().length && dayIdx(D.today) <= 4 ? `<section class="panel"><h2>التعليم اليوم <button class="btn sm ghost" onclick="UI.teachTab='today';UI.teachDate=D.today;go('teach')">فتح المهام</button></h2>
        ${teachClasses().map(c => { const s = dayStats(c, D.today); return `<div class="list-row"><span>${esc(c)}</span><span class="tag ${s.done === s.total && s.total ? 'ok' : s.done ? 'warn' : 'mute'}">${s.done}/${s.total} مهمة</span></div>`; }).join('')}
        ${dayIdx(D.today) === 4 ? `<div class="note-box" style="margin-top:8px">🎉 اليوم خميس: فعالية ترفيهية تعليمية جاهزة لكل صف في صفحة التعليم.</div>` : ''}</section>` : ''}
    </div>
    <div>
      ${canFin() ? `<section class="panel"><h2>الدخل والمصروف — آخر 6 أشهر</h2>${chart6()}
        <div class="board-legend" style="margin-top:10px"><span><i style="background:var(--palm)"></i>مقبوضات</span><span><i style="background:var(--rose)"></i>مصروفات</span></div></section>` : ''}
      <section class="panel"><h2>فعاليات قادمة ${can('comms') ? '<button class="btn sm ghost" onclick="annForm()">+ فعالية</button>' : ''}</h2>
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
  if (!can('attendance')) return toast('ليس لديك صلاحية تسجيل الحضور', true);
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
    <div class="actions">${canFin() ? '<button class="btn" onclick="exportStudents()">تصدير Excel</button>' : ''}${can('students') ? '<button class="btn primary" onclick="studentForm()">+ طالب جديد</button>' : ''}</div></div>
  <div class="filters">
    <input type="search" placeholder="ابحث بالاسم أو اسم ولي الأمر أو الجوال" value="${esc(UI.stQ)}" oninput="UI.stQ=this.value;clearTimeout(window._q);window._q=setTimeout(()=>{render();const i=document.querySelector('.filters input');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)" aria-label="بحث">
    <select onchange="UI.stClass=this.value;render()" aria-label="الصف"><option value="">كل الصفوف</option>${classes().map(c => `<option ${c === UI.stClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <select onchange="UI.stStatus=this.value;render()" aria-label="الحالة">${[['active', 'المستمرون'], ['inactive', 'المنقطعون'], ['all', 'الكل']].map(([v, l]) => `<option value="${v}" ${v === UI.stStatus ? 'selected' : ''}>${l}</option>`).join('')}</select>
  </div>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>الاسم</th><th>الصف</th><th>تاريخ الالتحاق</th><th>ولي الأمر</th>${canFin() ? '<th>الرسم الشهري</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th>' : ''}<th>اليوم</th></tr></thead><tbody>
  ${studentRows(list)}
  </tbody></table></div></section>`;
};

// صفوف جدول الطلاب مجمّعة حسب الصف، تحت كل صف سطر إجمالي، وفي النهاية الإجمالي العام
function studentRows(list) {
  if (!list.length) return `<tr><td colspan="9" class="empty">${D.students.length ? 'لا يوجد طلاب بهذه المواصفات' : 'لم تسجّل أي طالب بعد<br><button class="btn primary" onclick="studentForm()">أضف أول طالب</button>'}</td></tr>`;
  const order = classes();
  const groups = {};
  list.forEach(s => (groups[s.grade || 'بدون صف'] ||= []).push(s));
  const keys = Object.keys(groups).sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999) || a.localeCompare(b, 'ar'));
  const T = { n: 0, fee: 0, due: 0, paid: 0, rem: 0 };
  const row = s => { const b = bal(s); const a = attOf(s.id, D.today);
    return `<tr class="click ${s.status === 'inactive' ? 'dim' : ''}" onclick="openStudent('${s.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openStudent('${s.id}')">
      <td><b>${esc(s.name)}</b>${s.status === 'inactive' ? ' <span class="tag warn">منقطع</span>' : ''}</td>
      <td>${esc(s.grade || '—')}</td><td class="num" style="white-space:nowrap">${esc(fmtDate(s.join_date))}</td><td>${esc(s.parent_name || '')}<div class="muted num">${esc(s.parent_phone || '')}</div></td>
      ${canFin() ? `<td>${money(N(s.monthlyFee) - N(s.discount))}${N(s.discount) ? `<div class="muted">خصم ${fmt(s.discount)}</div>` : ''}</td>
      <td>${money(b.totalDue)}</td><td class="money-ok">${money(b.paid)}</td>
      <td class="${b.remaining > 0 ? 'money-bad' : 'money-ok'}">${money(b.remaining)}</td>` : ''}
      <td>${s.status === 'inactive' ? '—' : a ? `<span class="tag ${STATUS_TAG[a.status]}">${STATUS[a.status]}</span>` : '<span class="tag mute">—</span>'}</td></tr>`; };
  const sumRow = (label, t, cls) => !canFin() ? `<tr class="${cls}"><td colspan="5"><b>${label}</b> <span class="muted">${t.n} طالب</span></td></tr>` : `<tr class="${cls}"><td colspan="4"><b>${label}</b> <span class="muted">${t.n} طالب</span></td>
    <td><b>${money(t.fee)}</b></td><td><b>${money(t.due)}</b></td><td class="money-ok"><b>${money(t.paid)}</b></td>
    <td class="${t.rem > 0.009 ? 'money-bad' : 'money-ok'}"><b>${money(t.rem)}</b></td><td></td></tr>`;
  let html = '';
  for (const k of keys) {
    const ss = groups[k].sort((a, b) => String(a.join_date || '9999').localeCompare(String(b.join_date || '9999')) || String(a.name).localeCompare(String(b.name), 'ar'));
    const t = { n: ss.length, fee: 0, due: 0, paid: 0, rem: 0 };
    ss.forEach(s => { const b = bal(s); t.fee += N(s.monthlyFee) - N(s.discount); t.due += b.totalDue; t.paid += b.paid; t.rem += b.remaining; });
    Object.keys(T).forEach(x => T[x] += t[x]);
    html += ss.map(row).join('') + sumRow(`إجمالي ${esc(k)}`, t, 'subtotal');
  }
  if (keys.length > 1) html += sumRow('الإجمالي العام', T, 'grandtotal');
  return html;
}

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

    ${canFin() ? `<div class="figures" style="grid-template-columns:repeat(3,1fr)">
      <div class="fig"><span>المستحق</span><b>${fmt(b.totalDue)}</b><small>${esc(b.desc)}${b.booksTotal ? ` + كتب ${fmt(b.booksTotal)}` : ''}${b.oneTime ? ` − خصم ${fmt(b.oneTime)}${s.oneTimeDiscountNote ? ' (' + esc(s.oneTimeDiscountNote) + ')' : ''}` : ''}</small></div>
      <div class="fig"><span>المدفوع</span><b class="money-ok">${fmt(b.paid)}</b><small>${pays.length} دفعة</small></div>
      <div class="fig"><span>المتبقي</span><b class="${b.remaining > 0 ? 'money-bad' : 'money-ok'}">${fmt(b.remaining)}</b><small>${rate !== null ? `حضور ${rate}٪` : ''}</small></div>
    </div>` : rate !== null ? `<p class="muted">نسبة الحضور: ${rate}٪</p>` : ''}

    <div class="actions" style="margin-bottom:16px">
      ${can('finance') ? `<button type="button" class="btn primary" onclick="paymentForm('${id}')">+ دفعة</button>
      <button type="button" class="btn" onclick="bookForm('${id}')">+ بيع كتاب</button>` : ''}
      ${can('comms') ? `<button type="button" class="btn" onclick="noteForm('${id}')">+ ملاحظة يومية</button>` : ''}
      ${can('students') ? `<button type="button" class="btn" onclick="studentForm('${id}')">تعديل البيانات</button>` : ''}
      ${canFin() ? `<button type="button" class="btn" onclick="statement('${id}')">كشف حساب</button>` : ''}
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

    ${canFin() ? `<fieldset><legend>الدفعات</legend>
      ${pays.length ? pays.map(p => `<div class="list-row"><div>إيصال <b class="num">${p.receiptNo}</b> <span class="muted">· ${esc(p.date)} · ${esc(p.method)}</span></div><div class="actions"><b>${money(p.amount)}</b><button type="button" class="btn sm" onclick="printReceipt('${p.id}')">طباعة</button></div></div>`).join('') : '<p class="muted">لا توجد دفعات</p>'}</fieldset>` : ''}
    ${books.length ? `<fieldset><legend>الكتب (منفصلة عن الرسوم)</legend>${books.map(x => `<div class="list-row"><span>${esc(x.title)} <span class="muted">${esc(fmtDate(x.date))}</span> ${x.paid ? '<span class="tag ok">سدّد</span>' : N(x.paidAmount) ? `<span class="tag warn">باقي ${fmt(N(x.price) - N(x.paidAmount))}</span>` : '<span class="tag bad">لم يسدّد</span>'}</span>
      <span class="actions"><b>${money(x.price)}</b>${x.paid ? '' : `<button type="button" class="btn sm primary" onclick="bookPay('${x.id}')">سداد</button>`}</span></div>`).join('')}</fieldset>` : ''}
    ${(() => { const gs = D.assessments.filter(g => g.studentId === id).sort((a, b) => b.week - a.week).slice(0, 12);
      return gs.length ? `<fieldset><legend>آخر التقييمات</legend>${gs.map(g => `<div class="list-row"><span>${esc(g.subject)} <span class="muted">الأسبوع ${g.week}</span>${g.level ? ` <span class="tag info">${esc(g.level)}</span>` : ''}</span><b>${g.score ?? '—'} / ${g.max || 10}</b></div>`).join('')}</fieldset>` : ''; })()}
    ${notes.length ? `<fieldset><legend>آخر الملاحظات</legend>${notes.map(n => `<div class="list-row"><span><span class="tag mute">${esc(n.type)}</span> ${esc(n.text)}</span><span class="muted">${esc(n.date)}</span></div>`).join('')}</fieldset>` : ''}

    <div class="modal-actions">
      <button class="btn" value="cancel">إغلاق</button>
      ${!can('students') ? '' : s.status === 'inactive' ? `<button type="button" class="btn" onclick="setStatus('${id}','active')">إعادة تفعيل</button>` : `<button type="button" class="btn" onclick="setStatus('${id}','inactive')">لم يعد يأتي</button>`}
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
      <label class="f">المستوى الدراسي (للصفوف متعددة المستويات)<select name="level"><option value="">—</option>${Object.entries(Curriculum.TRACKS).map(([k, T]) => `<option value="${k}" ${s.level === k ? 'selected' : ''}>${esc(T.name)}</option>`).join('')}</select></label>
    </div></fieldset>
    <fieldset><legend>ولي الأمر</legend><div class="grid g2">
      <label class="f">اسم ولي الأمر<input name="parent_name" value="${v('parent_name')}"></label>
      <label class="f">الجوال (واتساب)<input name="parent_phone" inputmode="tel" value="${v('parent_phone')}" placeholder="05xxxxxxxx"></label>
    </div></fieldset>
    ${!can('finance') ? `<input type="hidden" name="join_date" value="${v('join_date') || D.today}">` : `<fieldset><legend>الرسوم</legend><div class="grid g3">
      <label class="f">تاريخ الالتحاق<input type="date" name="join_date" value="${v('join_date') || D.today}"></label>
      <label class="f">الرسم الشهري *<input type="number" min="0" name="monthlyFee" required value="${v('monthlyFee')}"></label>
      <label class="f">خصم شهري<input type="number" min="0" name="discount" value="${v('discount') || 0}"></label>
      <label class="f">خصم لمرة واحدة<input type="number" min="0" step="any" name="oneTimeDiscount" value="${v('oneTimeDiscount') || 0}"></label>
      <label class="f">سبب الخصم<input name="oneTimeDiscountNote" value="${v('oneTimeDiscountNote')}" placeholder="مثال: تسوية أيام سبتمبر"></label>
      ${id ? '' : `<label class="f">الدفعة الأولى<input type="number" min="0" name="firstPayment" value="0"></label>
      <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label>`}
    </div><p class="muted">الالتحاق حتى يوم ${D.settings.halfMonthAfterDay || 10} من الشهر يُحسب شهراً كاملاً، وبعده يُحسب بالأيام (الرسم ÷ 30 × الأيام المتبقية من الشهر).</p></fieldset>`}
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
    const bk = booksSummary();
    const list = D.books.slice().sort((a, b) => (a.paid - b.paid) || String(b.date).localeCompare(String(a.date)));
    const buys = D.expenses.filter(isBookBuy);
    return `<div class="figures">
      <div class="fig"><span>اشترينا كتباً بـ</span><b class="money-bad">${fmt(bk.bought)}</b><small>${buys.length} فاتورة شراء</small></div>
      <div class="fig"><span>بعنا كتباً بـ</span><b>${fmt(bk.sold)}</b><small>${D.books.length} كتاب</small></div>
      <div class="fig"><span>تم تحصيل</span><b class="money-ok">${fmt(bk.collected)}</b><small>غير مسدّد: ${fmt(bk.unpaid)}</small></div>
      <div class="fig"><span>ربح الكتب</span><b class="${bk.sold - bk.bought < 0 ? 'money-bad' : ''}">${fmt(bk.sold - bk.bought)}</b><small>المبيع − الشراء</small></div>
    </div>
    <section class="panel"><h2>الكتب المباعة للطلاب <span class="actions"><button class="btn sm primary" onclick="bookForm()">+ كتاب لطالب</button><button class="btn sm" onclick="csv('books')">تصدير Excel</button></span></h2>
    <div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الكتاب</th><th>السعر</th><th>المدفوع</th><th>السداد</th><th>التاريخ</th><th></th></tr></thead><tbody>
    ${list.map(b => { const paid = N(b.paidAmount), left = N(b.price) - paid;
      return `<tr><td><b>${esc(b.studentName)}</b></td><td>${esc(b.title)}</td><td>${money(b.price)}</td><td class="${paid ? 'money-ok' : ''}">${money(paid)}</td>
      <td>${b.paid ? `<span class="tag ok">سدّد${b.paidDate ? ' ' + esc(fmtDate(b.paidDate)) : ''}</span>` : paid > 0 ? `<span class="tag warn">باقي ${fmt(left)}</span>` : '<span class="tag bad">لم يسدّد</span>'}</td>
      <td class="num">${esc(fmtDate(b.date))}</td>
      <td class="actions">${b.paid ? `<button class="btn sm ghost" onclick="bookUnpay('${b.id}')">إلغاء السداد</button>` : `<button class="btn sm primary" onclick="bookPay('${b.id}')">تسجيل السداد</button>`}<button class="btn sm danger" onclick="del('books','${b.id}','هذا الكتاب')">حذف</button></td></tr>`; }).join('')
      || '<tr><td colspan="7" class="empty">لم تبِع أي كتاب بعد</td></tr>'}
    </tbody></table></div><p class="muted">الكتب منفصلة عن الرسوم الشهرية: لا تُضاف لمستحقات الطالب، ولها سدادها الخاص. ما يُحصَّل منها يدخل في إيراد الشهر.</p></section>

    <section class="panel"><h2>شراء الكتب <button class="btn sm" onclick="bookBuyForm()">+ شراء كتب</button></h2>
      ${buys.map(e => `<div class="list-row"><span>${esc(e.title)} <span class="muted">${esc(fmtDate(e.date))}</span></span><span class="actions"><b class="money-bad">${money(e.amount)}</b><button class="btn sm danger" onclick="del('expenses','${e.id}','فاتورة الشراء هذه')">حذف</button></span></div>`).join('') || '<p class="empty">لم تسجّل شراء كتب بعد</p>'}
      <p class="muted">شراء الكتب يُسجَّل كمصروف في بند "شراء كتب" ويدخل في إجمالي المصروفات.</p></section>`;
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
function expenseForm(pre = {}) {
  modal(`<h2>تسجيل مصروف</h2><div class="grid g2">
    <label class="f">البند *<input name="title" required placeholder="مثال: فاتورة الكهرباء" value="${esc(pre.title || '')}"></label>
    <label class="f">التصنيف<select name="category">${(D.settings.expenseCategories || []).map(c => `<option ${c === pre.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required value="${pre.amount || ''}"></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f" style="grid-column:1/-1">ملاحظة<input name="note" value="${esc(pre.note || '')}"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ المصروف</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/expenses', data, 'تم تسجيل المصروف')));
}
function bookForm(sid) {
  modal(`<h2>بيع كتاب لطالب</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">الطالب *<select name="studentId" required><option value="">اختر الطالب…</option>${studentOptions(sid)}</select></label>
    <label class="f">اسم الكتاب *<input name="title" required placeholder="مثال: كتاب الحروف"></label>
    <label class="f">سعر البيع *<input type="number" min="0" step="any" name="price" required></label>
    <label class="f" style="grid-column:1/-1">هل سدّد ثمن الكتاب؟ *<select name="paid" required onchange="document.getElementById('bk-part').hidden=this.value!=='part'">
      <option value="">اختر…</option><option value="yes">نعم، سدّد كاملاً</option><option value="no">لم يسدّد بعد</option><option value="part">سدّد جزءاً</option></select></label>
    <label class="f" id="bk-part" hidden>المبلغ المدفوع<input type="number" min="0" step="any" name="paidAmount"></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ الكتاب</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      if (data.paid === 'part' && !(N(data.paidAmount) > 0)) { toast('اكتب المبلغ المدفوع', true); return false; }
      return !!(await act('POST', '/api/books', data, data.paid === 'no' ? 'تم حفظ الكتاب — غير مسدّد' : 'تم حفظ الكتاب'));
    });
}
function bookPay(id) {
  const b = D.books.find(x => x.id === id); const left = N(b.price) - N(b.paidAmount);
  modal(`<h2>سداد ثمن كتاب</h2><p class="muted" style="margin-top:0">${esc(b.studentName)} — ${esc(b.title)} · السعر ${money(b.price)}${N(b.paidAmount) ? ` · دفع سابقاً ${money(b.paidAmount)}` : ''}</p><div class="grid g3">
    <label class="f">المبلغ<input type="number" min="0" step="any" name="amount" value="${left}" required></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">تسجيل السداد</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('PUT', `/api/books/${id}/pay`, { amount: N(data.amount), date: data.date, method: data.method }, 'تم تسجيل سداد الكتاب')));
}
async function bookUnpay(id) {
  if (!confirm('إلغاء سداد هذا الكتاب وإرجاعه غير مسدّد؟')) return;
  await act('PUT', `/api/books/${id}/pay`, { unpay: true }, 'أصبح الكتاب غير مسدّد');
}
function bookBuyForm() {
  modal(`<h2>شراء كتب</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">البيان *<input name="title" required placeholder="مثال: 20 كتاب حروف من المكتبة"></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ الشراء</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/expenses', { ...data, category: BOOK_BUY }, 'تم تسجيل شراء الكتب')));
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
    ${b.oneTime ? `<tr><td>خصم${s.oneTimeDiscountNote ? ': ' + esc(s.oneTimeDiscountNote) : ''}</td><td></td><td>${fmt(b.oneTime)}</td><td></td></tr>` : ''}
    ${pays.map(p => `<tr><td>دفعة — إيصال ${p.receiptNo}</td><td></td><td>${fmt(p.amount)}</td><td>${esc(p.date)}</td></tr>`).join('')}
    <tr><th>الإجمالي</th><th>${fmt(b.tuition)}</th><th>${fmt(b.paid + b.oneTime)}</th><th></th></tr></table>
    ${books.length ? `<h2 style="margin-top:22px">الكتب</h2><table><tr><th>الكتاب</th><th>السعر</th><th>المدفوع</th><th>الباقي</th><th>التاريخ</th></tr>
    ${books.map(x => `<tr><td>${esc(x.title)}</td><td>${fmt(x.price)}</td><td>${fmt(x.paidAmount)}</td><td>${fmt(N(x.price) - N(x.paidAmount))}</td><td>${esc(x.date)}</td></tr>`).join('')}</table>` : ''}
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
  return Math.round((upto(m) - upto(prevMonth(m))) * 100) / 100;
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
  const mf = monthFin(m), inc = mf.inc, out = mf.out, net = mf.net, bk = booksSummary(m);
  const byMethod = {}; [...pays, ...bookPaysIn(m)].forEach(p => byMethod[p.method || 'نقدي'] = (byMethod[p.method || 'نقدي'] || 0) + N(p.amount));
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
    <div class="fig"><span>المقبوض في ${monthName(m)}</span><b class="money-ok">${fmt(inc)}</b><small>رسوم ${fmt(mf.fees)} · كتب ${fmt(mf.books)}${mf.other ? ` · أخرى ${fmt(mf.other)}` : ''}</small></div>
    <div class="fig"><span>مصروفات ${monthName(m)}</span><b class="money-bad">${fmt(out)}</b><small>${mf.booksOut ? `منها شراء كتب ${fmt(mf.booksOut)}` : exps.length + ' بند'}</small></div>
    <div class="fig"><span>صافي ${monthName(m)}</span><b>${fmt(net)}</b><small>${cur()}</small></div>
    <div class="fig"><span>نصيب الشركاء</span><b style="font-size:19px">${P.map(p => `${esc(p.name)}: ${fmt(net * N(p.share) / 100)}`).join('<br>')}</b><small>${P.map(p => fmt(p.share) + '٪').join(' / ')}</small></div>
  </div>

  <section class="panel"><h2>رسوم ${monthName(m)} <span class="muted">المستحق ${fmt(dueT)} · المحصّل منه ${fmt(covT)} · المتبقي ${fmt(dueT - covT)} ${cur()}</span></h2>
    <div class="tbl-wrap"><table><thead><tr><th>الصف</th><th>الطلاب</th><th>رسوم الشهر</th><th>المحصّل منها</th><th>المتبقي</th><th>نسبة التحصيل</th></tr></thead><tbody>
    ${Object.entries(cls).map(([k, c]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${c.n}</td><td>${money(c.due)}</td><td class="money-ok">${money(c.covered)}</td><td class="${c.due - c.covered > 0.009 ? 'money-bad' : 'money-ok'}">${money(c.due - c.covered)}</td><td><span class="tag ${c.due && c.covered / c.due >= .9 ? 'ok' : 'warn'}">${c.due ? Math.round(c.covered / c.due * 100) : 100}٪</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">لا يوجد</td></tr>'}
    </tbody></table></div>
    <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;color:var(--palm-ink)">تفاصيل كل طالب في ${monthName(m)} (${rows.length})</summary>
    <div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الصف</th><th>رسوم الشهر</th><th>المحصّل منها</th><th>المتبقي</th><th>دفعه خلال الشهر</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="click" onclick="openStudent('${r.s.id}')"><td><b>${esc(r.s.name)}</b>${monthOf(r.s.join_date) === m ? ` <span class="tag info">التحق ${esc(fmtDate(r.s.join_date))}</span>` : ''}</td><td>${esc(r.s.grade || '')}</td><td>${money(r.due)}</td><td class="money-ok">${money(r.covered)}</td><td class="${r.left > 0 ? 'money-bad' : 'money-ok'}">${money(r.left)}</td><td>${r.paidIn ? money(r.paidIn) : '—'}</td></tr>`).join('')}
    </tbody></table></div></details>
    <p class="muted">المدفوع يُوزَّع على الأشهر من الأقدم للأحدث: أي دفعة تسدّد الشهر الأقدم أولاً. "المقبوض في الشهر" أعلاه هو ما دخل الصندوق فعلاً خلاله.</p>
  </section>

  <section class="panel"><h2>كتب ${monthName(m)} <button class="btn sm ghost" onclick="UI.finTab='books';go('finance')">إدارة الكتب</button></h2>
    <div class="list-row"><span>اشترينا كتباً بـ</span><b class="money-bad">${money(bk.bought)}</b></div>
    <div class="list-row"><span>بعنا كتباً بـ</span><b>${money(bk.sold)}</b></div>
    <div class="list-row"><span>حصّلنا من ثمن الكتب</span><b class="money-ok">${money(bk.collected)}</b></div>
    <div class="list-row"><span>ربح الكتب (المبيع − الشراء)</span><b class="${bk.sold - bk.bought < 0 ? 'money-bad' : ''}">${money(bk.sold - bk.bought)}</b></div>
    <p class="muted">المحصّل من الكتب داخل في "المقبوض" أعلاه، وشراء الكتب داخل في "المصروفات".</p></section>

  <div class="cols">
    <section class="panel"><h2>مصروفات ${monthName(m)}</h2>${exps.map(e => `<div class="list-row"><span>${esc(e.title)} <span class="muted">${esc(fmtDate(e.date))}</span></span><b class="money-bad">${money(e.amount)}</b></div>`).join('') || '<p class="empty">لا توجد مصروفات في هذا الشهر</p>'}</section>
    <div><section class="panel"><h2>المقبوض حسب طريقة الدفع</h2>${kv(byMethod)}</section><section class="panel"><h2>المصروفات حسب البند</h2>${kv(byCat)}</section>
    <section class="panel"><h2>حركة الطلاب</h2><div class="list-row"><span>التحق في ${monthName(m)}</span><b>${joined}</b></div></section></div>
  </div>

  ${partnersPanel()}
  <section class="panel"><h2>تصدير ونسخ احتياطي</h2><div class="actions">
    <button class="btn" onclick="exportStudents()">الطلاب (Excel)</button><button class="btn" onclick="csv('payments')">الدفعات (Excel)</button><button class="btn" onclick="csv('expenses')">المصروفات (Excel)</button><button class="btn" onclick="csv('books')">الكتب (Excel)</button>
    <a class="btn primary" href="/api/backup" download>تنزيل نسخة احتياطية كاملة</a></div>
    <p class="muted">ننصح بتنزيل نسخة احتياطية مرة كل شهر وحفظها في مكان آمن.</p></section>`;
};
function partnersPanel() {
  const P = partners(), ms = activeMonths();
  const rows = ms.map(monthFin);
  const tot = { fees: sumBy(rows, r => r.fees), books: sumBy(rows, r => r.books), other: sumBy(rows, r => r.other), inc: sumBy(rows, r => r.inc), out: sumBy(rows, r => r.out) }; tot.net = tot.inc - tot.out;
  const share = (net, p) => net * (N(p.share) / 100);
  return `<section class="panel"><h2>ملخص كل الأشهر ونصيب الشركاء <span class="muted">${P.map(p => `${esc(p.name)} ${fmt(p.share)}٪`).join(' · ')}</span></h2>
  <div class="tbl-wrap"><table><thead><tr><th>الشهر</th><th>رسوم</th><th>كتب</th><th>أخرى</th><th>إجمالي المقبوض</th><th>المصروفات</th><th>الصافي</th>${P.map(p => `<th>نصيب ${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(r => `<tr${r.m === UI.repMonth ? ' style="background:var(--palm-2)"' : ''}><td><b>${monthName(r.m)}</b></td><td>${money(r.fees)}</td><td>${money(r.books)}</td><td>${money(r.other)}</td><td class="money-ok">${money(r.inc)}</td><td class="money-bad">${money(r.out)}</td><td><b>${money(r.net)}</b></td>${P.map(p => `<td><b class="${r.net < 0 ? 'money-bad' : ''}">${money(share(r.net, p))}</b></td>`).join('')}</tr>`).join('')}
  <tr style="border-top:2px solid var(--line)"><td><b>الإجمالي</b></td><td><b>${money(tot.fees)}</b></td><td><b>${money(tot.books)}</b></td><td><b>${money(tot.other)}</b></td><td class="money-ok"><b>${money(tot.inc)}</b></td><td class="money-bad"><b>${money(tot.out)}</b></td><td><b>${money(tot.net)}</b></td>${P.map(p => `<td><b>${money(share(tot.net, p))}</b></td>`).join('')}</tr>
  </tbody></table></div><p class="muted">المقبوض (رسوم + ما حُصّل من الكتب) يُحسب حسب تاريخ الدفع، والصافي = المقبوض − كل المصروفات (ومنها شراء الكتب). تعديل الأسماء والنسب من الإعدادات.</p></section>`;
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
  else if (kind === 'books') downloadCsv('الكتب', [['الطالب', 'الكتاب', 'السعر', 'المدفوع', 'الباقي', 'الحالة', 'تاريخ البيع', 'تاريخ السداد'], ...D.books.map(b => [b.studentName, b.title, b.price, N(b.paidAmount), N(b.price) - N(b.paidAmount), b.paid ? 'سدّد' : N(b.paidAmount) ? 'سدّد جزءاً' : 'لم يسدّد', b.date, b.paidDate || ''])]);
  else downloadCsv('المصروفات', [['البند', 'التصنيف', 'المبلغ', 'التاريخ', 'ملاحظة'], ...D.expenses.map(e => [e.title, e.category, e.amount, e.date, e.note])]);
}

/* ---------- التعليم: الخطة الدراسية ومهام المعلم اليومية ---------- */
const TEACH_DAYS = ['تمهيد وشرح', 'تدريب موجّه', 'نشاط عملي', 'تطبيق في الكتاب والكراسة', 'مراجعة وتقييم قصير'];
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
// أنشطة مقترحة لكل نوع مادة ولكل يوم من أيام الأسبوع (الأحد → الخميس)
const ACTIVITIES = {
  arabic: [['اعرض صورة أو قصة قصيرة تمهّد للموضوع', 'اشرح بنطق واضح وأمثلة من كلمات يعرفها الأطفال'], ['تدريب جماعي ثم فردي على النطق والقراءة', 'بطاقات الكلمات والحروف'], ['لعبة: ابحث عن الحرف/الكلمة في الصور', 'تشكيل الحرف بالصلصال أو الكتابة على الرمل'], ['حل تدريبات الكتاب', 'نسخ في الكراسة مع متابعة مسك القلم'], ['إملاء أو قراءة قصيرة لكل طالب', 'سجّل من يحتاج متابعة في الملاحظات اليومية']],
  math: [['ابدأ بموقف من الحياة (عدّ أشياء في الفصل)', 'اشرح المفهوم بالمكعبات أو الأصابع'], ['أمثلة على السبورة يحلها الطلاب معك', 'تدريب شفهي سريع'], ['لعبة حسابية جماعية أو مسابقة فرق', 'استخدام أدوات محسوسة (أعواد، خرز، نقود)'], ['حل تمارين الكتاب', 'واجب قصير في الكراسة'], ['اختبار قصير من 3–5 أسئلة', 'إعادة شرح لمن أخطأ']],
  english: [['Warm-up song or chant', 'Introduce new words with flashcards / pictures'], ['Listen and repeat, then pair practice', 'Point-and-say game'], ['Game: Simon says / memory cards', 'Role-play a short dialogue'], ['Student book and workbook exercises', 'Trace / write the new words'], ['Quick oral quiz', 'Review the week’s words with a song']],
  discover: [['سؤال مثير للتفكير عن موضوع الأسبوع', 'عرض صور أو فيديو قصير'], ['نقاش جماعي وربط الموضوع بحياة الطفل', 'قراءة نص الكتاب معاً'], ['تجربة بسيطة أو نشاط فني (رسم، تلوين، مجسّم)', 'العمل في مجموعات صغيرة'], ['أنشطة الكتاب وورقة عمل', 'تقديم كل مجموعة لما صنعته'], ['أسئلة تقييم شفهية', 'ركن عرض أعمال الأطفال']],
  science: [['سؤال استقصائي يفتح الدرس', 'شرح المفاهيم بالرسوم والنماذج'], ['قراءة الدرس ومناقشة الأفكار الرئيسة', 'خريطة مفاهيم على السبورة'], ['تجربة عملية أو عرض توضيحي', 'تسجيل الملاحظات والنتائج'], ['حل أسئلة الكتاب وكراسة النشاط', 'ربط الدرس بالحياة اليومية'], ['تقويم قصير', 'مراجعة المفاهيم الصعبة']],
  quran: [['قراءة المعلم للآيات/الموضوع قراءة نموذجية', 'شرح المعنى بأسلوب مبسط'], ['ترديد جماعي ثم فردي', 'تصحيح النطق والتجويد'], ['نشاط: قصة أو تمثيل للقيمة المستفادة', 'مسابقة حفظ بين المجموعات'], ['تطبيق أسئلة الكتاب', 'كتابة القيمة المستفادة'], ['تسميع فردي', 'تسجيل مستوى الحفظ لكل طالب']],
  islamic: [['تمهيد بموقف أو قصة', 'شرح الدرس وأدلته'], ['مناقشة وأسئلة توجيهية', 'استخراج الأحكام والفوائد'], ['نشاط تطبيقي أو تمثيل عملي', 'عمل جماعي'], ['حل أسئلة الكتاب', 'تلخيص الدرس'], ['تقويم قصير', 'ربط الدرس بالسلوك اليومي']],
  social: [['تمهيد بخريطة أو صورة', 'شرح الأفكار الرئيسة'], ['قراءة ومناقشة', 'استخراج المفاهيم'], ['نشاط: خريطة صمّاء أو خط زمني', 'بحث قصير في مجموعات'], ['حل أسئلة الكتاب', 'تلخيص بالخرائط الذهنية'], ['تقويم قصير', 'مراجعة']],
  digital: [['شرح المهارة على جهاز العرض', 'خطوات مكتوبة على السبورة'], ['تطبيق موجّه خطوة بخطوة', 'متابعة كل طالب'], ['مهمة عملية على الجهاز', 'العمل في ثنائيات'], ['أسئلة الكتاب', 'حفظ العمل وتنظيم الملفات'], ['تقييم عملي قصير', 'عرض أفضل الأعمال']],
};
const acad = () => ({ start: '2026-09-06', weeks: 34, ...(D.settings.academic || {}) });
function weekOf(date) {
  const a = acad(); const d = new Date(date + 'T12:00:00'), s = new Date(a.start + 'T12:00:00');
  return Math.floor((d - s) / (7 * 864e5)) + 1;
}
const dayIdx = date => new Date(date + 'T12:00:00').getDay(); // 0 الأحد … 6 السبت
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
function nextSchoolDay(date, dir) { let d = date; do { d = addDays(d, dir); } while (dayIdx(d) > 4); return d; }
function tracksFor(cls) {
  const c = (D.settings.classes || []).find(x => x.name === cls);
  return (c && c.tracks && c.tracks.length ? c.tracks : Curriculum.DEFAULT_CLASS_TRACKS[cls]) || [];
}
const teachClasses = () => classes().filter(c => tracksFor(c).length);
function topicFor(track, subject, week) {
  const e = D.planEdits.find(p => p.track === track && p.subject === subject && p.week === week);
  if (e) return { text: e.topic, edited: true };
  const sub = Curriculum.TRACKS[track].subjects.find(s => s.name === subject);
  return { text: Curriculum.unitForWeek(sub.units, week, acad().weeks) || '—', edited: false };
}
const logOf = (date, track, subject) => D.teachLogs.find(l => l.date === date && l.track === track && l.subject === subject);
function dayStats(cls, date) {
  if (dayIdx(date) > 4) return { done: 0, total: 0 };
  let done = 0, total = 0;
  tracksFor(cls).forEach(t => Curriculum.TRACKS[t].subjects.forEach(s => { total++; if (logOf(date, t, s.name)?.done) done++; }));
  if (dayIdx(date) === 4) bandsFor(cls).forEach(b => { total++; if (logOf(date, 'act-' + b, ACT_SUBJ)?.done) done++; });
  return { done, total };
}

VIEWS.teach = () => {
  const tabs = [['today', 'مهام اليوم'], ['plan', 'الخطة السنوية'], ['exams', 'الامتحانات الأسبوعية'], ['grades', 'التقييمات'], ['fun', '🎉 فعاليات الخميس'], ['progress', 'متابعة الإنجاز'], ['setup', 'إعداد العام الدراسي']];
  UI.teachTab ||= 'today';
  return `<div class="head"><div><h1>التعليم</h1><p>الخطة الدراسية ومهام المعلمين اليومية</p></div>
    <div class="actions"><button class="btn" onclick="print()">طباعة</button></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${UI.teachTab === k}" onclick="UI.teachTab='${k}';render()">${l}</button>`).join('')}</div>
  ${TEACH[UI.teachTab]()}`;
};
const TEACH = {
  today() {
    const list = teachClasses();
    if (!list.length) return '<section class="panel"><p class="empty">لا توجد صفوف مربوطة بخطة دراسية. اربطها من الإعدادات ← الصفوف.</p></section>';
    let date = UI.teachDate || D.today;
    if (dayIdx(date) > 4) date = nextSchoolDay(date, 1);
    UI.teachDate = date;
    if (!list.includes(UI.teachClass)) UI.teachClass = list[0];
    const cls = UI.teachClass, week = weekOf(date), di = dayIdx(date), a = acad();
    const st = dayStats(cls, date);
    const head = `<div class="filters" style="align-items:center">
      <button class="btn" style="flex:0" onclick="UI.teachDate=nextSchoolDay(UI.teachDate,-1);render()" aria-label="اليوم السابق">→</button>
      <input type="date" value="${date}" onchange="UI.teachDate=this.value;render()" aria-label="التاريخ">
      <button class="btn" style="flex:0" onclick="UI.teachDate=nextSchoolDay(UI.teachDate,1);render()" aria-label="اليوم التالي">←</button>
      ${date !== D.today ? `<button class="btn" style="flex:0" onclick="UI.teachDate=D.today;render()">اليوم</button>` : ''}
    </div>
    <div class="tabs" role="tablist">${list.map(c => { const s = dayStats(c, date); return `<button role="tab" aria-selected="${c === cls}" onclick="UI.teachClass='${esc(c)}';render()">${esc(c)} <span class="tag ${s.done === s.total && s.total ? 'ok' : 'mute'}">${s.done}/${s.total}</span></button>`; }).join('')}</div>`;
    if (week < 1 || week > a.weeks) return head + `<section class="panel"><p class="empty">هذا التاريخ خارج العام الدراسي (يبدأ ${fmtDate(a.start)} لمدة ${a.weeks} أسبوعاً). عدّل البداية من "إعداد العام الدراسي".</p></section>`;
    return head + `<section class="panel"><h2>${esc(cls)} — ${DAY_NAMES[di]} ${fmtDate(date)} <span class="muted">الأسبوع ${week} من ${a.weeks} · ${TEACH_DAYS[di]}</span></h2>
      <div style="height:10px;background:var(--mist);border-radius:99px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:${st.total ? st.done / st.total * 100 : 0}%;background:var(--palm)"></div></div>
      <p class="muted" style="margin:0">أنجزت ${st.done} من ${st.total} مهمة اليوم</p></section>
    ${di === 4 ? funSection(cls, date, week) : ''}
    ${tracksFor(cls).map(t => { const T = Curriculum.TRACKS[t];
      return `<section class="panel"><h2>${esc(T.name)} <span class="tag mute">منهج ${esc(T.system)}</span></h2>
      ${T.subjects.map(s => { const tp = topicFor(t, s.name, week), lg = logOf(date, t, s.name), acts = (ACTIVITIES[s.type] || ACTIVITIES.discover)[di];
        return `<div class="task ${lg?.done ? 'done' : ''}">
          <label class="chk"><input type="checkbox" ${lg?.done ? 'checked' : ''} onchange="teachDone('${t}','${esc(s.name)}',this.checked)"><span></span></label>
          <div class="body"><div class="subj">${esc(s.name)}</div>
            <div class="topic">${esc(tp.text)}${tp.edited ? ' <span class="tag info">معدّل</span>' : ''}</div>
            <div class="what"><b>مهمة اليوم: ${TEACH_DAYS[di]}</b><ul>${acts.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
              <div class="actions" style="margin-top:8px"><button class="btn sm primary" onclick="openLesson('${t}','${esc(s.name)}',${week})">📖 الشرح الكامل والأسئلة</button>${di === 4 ? `<button class="btn sm" onclick="openExam('${t}','${esc(s.name)}',${week})">📝 امتحان الأسبوع</button><button class="btn sm" onclick="UI.teachTab='grades';UI.grTrack='${t}';UI.grSubject='${esc(s.name)}';UI.grWeek=${week};render()">إدخال الدرجات</button>` : ''}</div></div>
            <input class="note" placeholder="ملاحظة المعلم (اختياري): ماذا تم؟ من يحتاج متابعة؟" value="${esc(lg?.note || '')}" onchange="teachNote('${t}','${esc(s.name)}',this.value)">
          </div></div>`; }).join('')}
      </section>`; }).join('')}`;
  },
  plan() {
    const tracks = Object.keys(Curriculum.TRACKS);
    UI.planTrack ||= tracksFor(teachClasses()[0] || '')[0] || tracks[0];
    const t = UI.planTrack, T = Curriculum.TRACKS[t], a = acad(), cw = weekOf(D.today);
    return `<div class="filters"><select onchange="UI.planTrack=this.value;render()" aria-label="المستوى">${tracks.map(k => `<option value="${k}" ${k === t ? 'selected' : ''}>${esc(Curriculum.TRACKS[k].name)}</option>`).join('')}</select></div>
    <section class="panel"><h2>الخطة السنوية — ${esc(T.name)} <span class="muted">اضغط على أي موضوع لتعديله</span></h2>
    <div class="tbl-wrap"><table class="plan"><thead><tr><th>الأسبوع</th>${T.subjects.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>
    ${Array.from({ length: a.weeks }, (_, i) => i + 1).map(w => `<tr${w === cw ? ' class="now"' : ''}><td class="num"><b>${w}</b><div class="muted">${fmtDate(addDays(a.start, (w - 1) * 7))}</div></td>
      ${T.subjects.map(s => { const tp = topicFor(t, s.name, w); return `<td class="click-cell${tp.edited ? ' edited' : ''}" onclick="editTopic('${t}','${esc(s.name)}',${w})">${esc(tp.text)}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>
    <p class="muted">خطة مقترحة مبنية على هيكل المنهج ${esc(T.system === 'سعودي' ? 'السعودي' : 'المصري')} ومقسّمة على ${a.weeks} أسبوعاً. طابِقها مع توزيع الوزارة وعدّل ما يلزم؛ الموضوعات المعدّلة مظللة.</p></section>`;
  },
  exams() {
    const list = teachClasses(); if (!list.length) return '<p class="empty">لا توجد صفوف مربوطة بخطة.</p>';
    const a = acad(); UI.exWeek ||= Math.max(1, Math.min(a.weeks, weekOf(D.today)));
    const w = UI.exWeek;
    return `<div class="filters"><select onchange="UI.exWeek=+this.value;render()" aria-label="الأسبوع">${Array.from({ length: a.weeks }, (_, i) => i + 1).map(x => `<option value="${x}" ${x === w ? 'selected' : ''}>الأسبوع ${x}${x === weekOf(D.today) ? ' (الحالي)' : ''}</option>`).join('')}</select></div>
    ${list.map(c => `<section class="panel"><h2>${esc(c)}</h2>${tracksFor(c).map(t => Curriculum.TRACKS[t].subjects.map(s => { const u = baseUnit(t, s.name, w), L = getLesson(t, s.name, u);
      return `<div class="list-row"><div><b>${esc(Curriculum.TRACKS[t].short)} — ${esc(s.name)}</b><div class="muted">${esc(u)}</div></div>
      <div class="actions">${L && L.quiz && L.quiz.length ? `<span class="tag ok">${L.quiz.length} سؤال</span><button class="btn sm primary" onclick="openExam('${t}','${esc(s.name)}',${w})">طباعة الامتحان</button>` : '<span class="tag mute">لم يُكتب بعد</span>'}
      <button class="btn sm" onclick="UI.teachTab='grades';UI.grTrack='${t}';UI.grSubject='${esc(s.name)}';UI.grWeek=${w};render()">الدرجات</button></div></div>`; }).join('')).join('')}</section>`).join('')}`;
  },
  grades() {
    const tracks = Object.keys(Curriculum.TRACKS), a = acad();
    UI.grTrack ||= tracksFor(teachClasses()[0] || '')[0] || tracks[0];
    const t = UI.grTrack, T = Curriculum.TRACKS[t];
    if (!T.subjects.some(s => s.name === UI.grSubject)) UI.grSubject = T.subjects[0].name;
    UI.grWeek ||= Math.max(1, Math.min(a.weeks, weekOf(D.today)));
    const sub = UI.grSubject, w = UI.grWeek;
    const studs = studentsOfTrack(t);
    const L = getLesson(t, sub, baseUnit(t, sub, w)); const max = L?.quiz?.length ? L.quiz.length * 2 : 10;
    return `<div class="filters">
      <select onchange="UI.grTrack=this.value;render()" aria-label="المستوى">${tracks.map(k => `<option value="${k}" ${k === t ? 'selected' : ''}>${esc(Curriculum.TRACKS[k].name)}</option>`).join('')}</select>
      <select onchange="UI.grSubject=this.value;render()" aria-label="المادة">${T.subjects.map(s => `<option ${s.name === sub ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <select onchange="UI.grWeek=+this.value;render()" aria-label="الأسبوع">${Array.from({ length: a.weeks }, (_, i) => i + 1).map(x => `<option value="${x}" ${x === w ? 'selected' : ''}>الأسبوع ${x}</option>`).join('')}</select></div>
    <form class="panel" onsubmit="saveGrades(event,'${t}','${esc(sub)}',${w})"><h2>درجات ${esc(sub)} — الأسبوع ${w} <span class="muted">${esc(baseUnit(t, sub, w))}</span></h2>
    ${studs.length ? `<div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>الدرجة</th><th>من</th><th>المستوى</th><th>ملاحظة</th></tr></thead><tbody>
    ${studs.map(s => { const g = D.assessments.find(x => x.studentId === s.id && x.track === t && x.subject === sub && x.week === w) || {};
      return `<tr><td><b>${esc(s.name)}</b>${!s.level && tracksFor(s.grade).length > 1 ? ' <span class="tag warn" title="حدد مستوى الطالب من تعديل بياناته">بدون مستوى</span>' : ''}</td>
      <td><input type="number" name="score_${s.id}" min="0" step="0.5" value="${g.score ?? ''}" style="width:90px"></td>
      <td><input type="number" name="max_${s.id}" min="1" value="${g.max || max}" style="width:80px"></td>
      <td><select name="level_${s.id}" style="min-width:130px">${['', ...LEVELS].map(l => `<option ${g.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input name="note_${s.id}" value="${esc(g.note || '')}" placeholder="اختياري"></td></tr>`; }).join('')}
    </tbody></table></div><div class="actions" style="margin-top:12px"><button class="btn primary">حفظ الدرجات</button>${L?.quiz?.length ? `<button type="button" class="btn" onclick="openExam('${t}','${esc(sub)}',${w})">طباعة الامتحان</button>` : ''}</div>`
      : '<p class="empty">لا يوجد طلاب في هذا المستوى. حدد مستوى الطلاب من صفحة الطلاب ← تعديل البيانات.</p>'}
    </form>
    ${studs.length ? `<section class="panel"><h2>ملخص ${esc(sub)} لكل طالب</h2><div class="tbl-wrap"><table><thead><tr><th>الطالب</th><th>عدد الامتحانات</th><th>المتوسط</th><th>آخر مستوى</th></tr></thead><tbody>
      ${studs.map(s => { const gs = D.assessments.filter(x => x.studentId === s.id && x.track === t && x.subject === sub && x.score !== null && x.score !== undefined).sort((a, b) => b.week - a.week);
        const avg = gs.length ? Math.round(gs.reduce((a, g) => a + g.score / (g.max || 10), 0) / gs.length * 100) : null;
        return `<tr><td>${esc(s.name)}</td><td class="num">${gs.length}</td><td>${avg === null ? '—' : `<span class="tag ${avg >= 85 ? 'ok' : avg >= 60 ? 'warn' : 'bad'}">${avg}٪</span>`}</td><td>${esc(gs[0]?.level || '—')}</td></tr>`; }).join('')}
      </tbody></table></div></section>` : ''}`;
  },
  progress() {
    const list = teachClasses(); const days = []; let d = dayIdx(D.today) > 4 ? nextSchoolDay(D.today, -1) : D.today;
    for (let i = 0; i < 10; i++) { days.unshift(d); d = nextSchoolDay(d, -1); }
    return `<section class="panel"><h2>إنجاز المهام في آخر 10 أيام دراسية</h2><div class="tbl-wrap"><table><thead><tr><th>الصف</th>${days.map(x => `<th class="num">${DAY_NAMES[dayIdx(x)].slice(0, 3)}<div class="muted">${fmtDate(x).slice(0, -5)}</div></th>`).join('')}<th>النسبة</th></tr></thead><tbody>
    ${list.map(c => { let dn = 0, tt = 0; const cells = days.map(x => { const s = dayStats(c, x); dn += s.done; tt += s.total; const r = s.total ? s.done / s.total : 0;
        return `<td><span class="tag ${r === 1 ? 'ok' : r > 0 ? 'warn' : 'mute'}">${s.done}/${s.total}</span></td>`; }).join('');
      return `<tr><td><b>${esc(c)}</b></td>${cells}<td><b>${tt ? Math.round(dn / tt * 100) : 0}٪</b></td></tr>`; }).join('')}
    </tbody></table></div></section>
    <section class="panel"><h2>آخر ملاحظات المعلمين</h2>${D.teachLogs.filter(l => l.note).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(l => `<div class="list-row"><div><b>${esc(Curriculum.TRACKS[l.track]?.short || l.track)} — ${esc(l.subject)}</b><div>${esc(l.note)}</div></div><span class="muted">${esc(fmtDate(l.date))}</span></div>`).join('') || '<p class="empty">لا توجد ملاحظات بعد</p>'}</section>`;
  },
  setup() {
    const a = acad();
    return `<form class="panel" onsubmit="saveAcademic(event)"><h2>العام الدراسي</h2><div class="grid g2" style="max-width:520px">
      <label class="f">أول يوم دراسة (يُفضّل يوم أحد)<input type="date" name="start" value="${a.start}" required></label>
      <label class="f">عدد أسابيع الدراسة في السنة<input type="number" name="weeks" min="10" max="52" value="${a.weeks}" required></label></div>
      <p class="muted">الأسبوع الحالي حسب هذا الإعداد: <b>${weekOf(D.today)}</b>. إذا تأخرتم أو تقدمتم في الخطة، غيّر تاريخ البداية حتى يطابق الأسبوع الحالي ما تدرّسونه.</p>
      <div class="actions"><button class="btn primary">حفظ</button></div></form>
    <section class="panel"><h2>الصفوف ومستوياتها</h2>${classes().map(c => `<div class="list-row"><b>${esc(c)}</b><span>${tracksFor(c).map(t => `<span class="tag info">${esc(Curriculum.TRACKS[t].name)}</span>`).join(' ') || '<span class="muted">غير مربوط بخطة</span>'}</span></div>`).join('')}
    <p class="muted">لتغيير مستويات صف: الإعدادات ← الصفوف ← تعديل.</p></section>`;
  },
};
/* ---------- فعاليات الخميس الترفيهية التعليمية ---------- */
const ACT_SUBJ = 'فعالية الخميس';
const bandsFor = cls => [...new Set(tracksFor(cls).map(t => Activities.BAND_OF[t]).filter(Boolean))];
const thursdayOf = week => addDays(acad().start, (week - 1) * 7 + (4 - dayIdx(acad().start) + 7) % 7);
function occasionBox(date) {
  const oc = Activities.occasionsNear(date);
  return oc.length ? `<div class="note-box">📅 مناسبة هذا الأسبوع: ${oc.map(o => `<b>${esc(o.name)}</b> — ${esc(o.idea)}`).join('<br>')}</div>` : '';
}
function funSection(cls, date, week) {
  return `<section class="panel fun"><h2>🎉 فعالية الخميس الترفيهية التعليمية</h2>${occasionBox(date)}
    ${bandsFor(cls).map(b => { const A = Activities.activityFor(b, week); if (!A) return ''; const lg = logOf(date, 'act-' + b, ACT_SUBJ);
      return `<div class="task ${lg?.done ? 'done' : ''}">
        <label class="chk"><input type="checkbox" ${lg?.done ? 'checked' : ''} onchange="teachDone('act-${b}',ACT_SUBJ,this.checked)"><span></span></label>
        <div class="body"><div class="subj">${esc(Activities.BANDS[b])} · ${esc(A.k)} · ${esc(A.time)}</div>
          <div class="topic">${esc(A.t)}</div>
          <div class="what">${esc(A.goal)}
            <div class="actions" style="margin-top:8px"><button class="btn sm primary" onclick="openActivity('${b}',${week},'${esc(cls)}')">🎉 خطوات الفعالية ومسابقة المراجعة</button></div></div>
          <input class="note" placeholder="كيف كانت الفعالية؟ (اختياري)" value="${esc(lg?.note || '')}" onchange="teachNote('act-${b}',ACT_SUBJ,this.value)">
        </div></div>`; }).join('')}</section>`;
}
// أسئلة مسابقة المراجعة: من أسئلة وأجوبة دروس هذا الأسبوع لمستويات الفئة
function reviewQuestions(band, week, cls) {
  const tracks = (cls ? tracksFor(cls) : Object.keys(Curriculum.TRACKS)).filter(t => Activities.BAND_OF[t] === band);
  const out = [];
  tracks.forEach(t => Curriculum.TRACKS[t].subjects.forEach(s => { const L = getLesson(t, s.name, baseUnit(t, s.name, week));
    (L?.qa || []).forEach(([q, a]) => out.push({ lvl: Curriculum.TRACKS[t].short, sub: s.name, q, a })); }));
  return out;
}
function activityHtml(band, week, cls) {
  const A = Activities.activityFor(band, week); if (!A) return '<p class="empty">لا توجد فعالية</p>';
  const qs = reviewQuestions(band, week, cls), th = thursdayOf(week);
  const list = (title, arr, tag = 'ul') => `<fieldset><legend>${title}</legend><${tag} class="lesson-ul">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</${tag}></fieldset>`;
  return `<h2>🎉 ${esc(A.t)}</h2><p class="muted" style="margin-top:-10px">${esc(Activities.BANDS[band])}${cls ? ' · ' + esc(cls) : ''} · الأسبوع ${week} · خميس ${fmtDate(th)} · ${esc(A.k)} · ⏱️ ${esc(A.time)}</p>
    ${occasionBox(th)}
    <fieldset><legend>🎯 الهدف التعليمي</legend><p>${esc(A.goal)}</p></fieldset>
    ${list('🧰 الأدوات', A.mat)}${list('👣 خطوات التنفيذ', A.steps, 'ol')}
    ${A.tip ? `<fieldset><legend>💡 نصيحة للمعلم</legend><p>${esc(A.tip)}</p></fieldset>` : ''}
    ${qs.length ? `<fieldset><legend>🏆 مسابقة مراجعة الأسبوع (${qs.length} سؤالاً من دروس هذا الأسبوع)</legend>
      <p class="muted">قسّم الطلاب فريقين، وكل إجابة صحيحة = نقطة. تصلح لآخر 10 دقائق من الفعالية.</p>
      ${qs.map((x, i) => `<details class="qa"><summary>${i + 1}. <span class="tag mute">${esc(x.lvl)} · ${esc(x.sub)}</span> <bdi>${esc(x.q)}</bdi></summary><p>✅ <bdi>${esc(x.a)}</bdi></p></details>`).join('')}</fieldset>` : ''}`;
}
function openActivity(band, week, cls) {
  modal(`<div class="lesson">${activityHtml(band, week, cls)}</div>
    <div class="modal-actions"><button class="btn" value="cancel">إغلاق</button><button type="button" class="btn primary" onclick="printActivity('${band}',${week},'${esc(cls || '')}')">طباعة</button></div>`);
}
function printActivity(band, week, cls) {
  printDoc('فعالية الخميس', `<div class="lesson">${activityHtml(band, week, cls)}</div>
    <style>fieldset{border:1px solid #DCE5E3;border-radius:10px;margin:12px 0;padding:10px 14px}legend{font-weight:700;color:#145741}.tag{background:#EEF3F2;border-radius:6px;padding:1px 6px;font-size:12px}.note-box{background:#FFF7E0;border-radius:8px;padding:8px 12px;margin:8px 0}details p{margin:4px 0 0}</style>
    <script>document.querySelectorAll('details').forEach(d=>d.open=true)<\/script>`);
}
TEACH.fun = () => {
  const a = acad(), cw = weekOf(D.today), bands = [...new Set(teachClasses().flatMap(bandsFor))];
  const all = Object.keys(Activities.BANDS);
  if (!all.includes(UI.funBand)) UI.funBand = bands[0] || all[0];
  const b = UI.funBand;
  return `<div class="filters">${all.map(x => `<button class="btn ${x === b ? 'primary' : ''}" onclick="UI.funBand='${x}';render()">${esc(Activities.BANDS[x])}</button>`).join('')}</div>
  <section class="panel"><h2>فعاليات الخميس — ${esc(Activities.BANDS[b])} <span class="muted">فعالية جاهزة لكل أسبوع مع مسابقة مراجعة من دروس الأسبوع</span></h2>
  <div class="tbl-wrap"><table class="plan"><thead><tr><th>الأسبوع</th><th>الخميس</th><th>الفعالية</th><th>النوع</th><th></th></tr></thead><tbody>
  ${Array.from({ length: a.weeks }, (_, i) => i + 1).map(w => { const A = Activities.activityFor(b, w), th = thursdayOf(w), oc = Activities.occasionsNear(th);
    return `<tr${w === cw ? ' class="now"' : ''}><td class="num"><b>${w}</b></td><td>${fmtDate(th)}</td><td><b>${esc(A.t)}</b>${oc.length ? `<div class="muted">📅 ${oc.map(o => esc(o.name)).join('، ')}</div>` : ''}</td><td>${esc(A.k)}</td>
    <td><button class="btn sm" onclick="openActivity('${b}',${w},'')">التفاصيل</button></td></tr>`; }).join('')}
  </tbody></table></div></section>`;
};
const LEVELS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'يحتاج متابعة'];
// عنوان الوحدة الأصلي للأسبوع (الشرح مربوط به حتى لو عُدّل اسم الموضوع)
function baseUnit(track, subject, week) {
  const sub = Curriculum.TRACKS[track].subjects.find(s => s.name === subject);
  return Curriculum.unitForWeek(sub.units, week, acad().weeks) || '';
}
// طلاب مستوى معيّن: من صفوف هذا المستوى، ومن حُدد مستواه به (أو لم يُحدد إن كان الصف متعدد المستويات)
function studentsOfTrack(track) {
  return active().filter(s => { const tr = tracksFor(s.grade); if (!tr.includes(track)) return false; return tr.length === 1 || !s.level || s.level === track; })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
}
function lessonHtml(track, subject, week, L) {
  const T = Curriculum.TRACKS[track], u = baseUnit(track, subject, week), tp = topicFor(track, subject, week);
  if (!L) return `<h2>${esc(subject)} — ${esc(tp.text)}</h2><p class="muted">${esc(T.name)} · الأسبوع ${week}</p>
    <div class="note-box">لم يُكتب الشرح الكامل لهذا الدرس بعد. استخدم الأنشطة المقترحة في مهمة اليوم، أو اطلب كتابته.</div>`;
  const list = (title, arr) => arr && arr.length ? `<fieldset><legend>${title}</legend><ul class="lesson-ul">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></fieldset>` : '';
  return `<h2>${esc(subject)} — ${esc(u)}</h2><p class="muted" style="margin-top:-10px">${esc(T.name)} · الأسبوع ${week}${tp.edited ? ` · الموضوع المعدّل: ${esc(tp.text)}` : ''}</p>
    ${list('🎯 أهداف الدرس', L.goals)}${list('🧰 الأدوات والوسائل', L.materials)}
    <fieldset><legend>👩‍🏫 الشرح خطوة بخطوة</legend>${(L.steps || []).map(([h, txt], i) => `<div class="step"><b>${i + 1}. ${esc(h)}</b><p>${esc(txt).replace(/\n/g, '<br>')}</p></div>`).join('')}</fieldset>
    ${L.qa && L.qa.length ? `<fieldset><legend>❓ أسئلة وأجوبة للمناقشة</legend>${L.qa.map(([q, a]) => `<details class="qa"><summary><bdi>${esc(q)}</bdi></summary><p>✅ <bdi>${esc(a)}</bdi></p></details>`).join('')}</fieldset>` : ''}
    ${L.quiz && L.quiz.length ? `<fieldset><legend>📝 أسئلة التقييم (${L.quiz.length})</legend>${L.quiz.map((x, i) => `<div class="step"><b>${i + 1}. <bdi>${esc(x.q)}</bdi></b>${x.o ? `<div class="muted">${x.o.map(o => `<bdi>${esc(o)}</bdi>`).join(' · ')}</div>` : ''}<div class="money-ok">الإجابة: <bdi>${esc(x.a)}</bdi></div></div>`).join('')}</fieldset>` : ''}
    ${L.hw ? `<fieldset><legend>🏠 الواجب</legend><p>${esc(L.hw)}</p></fieldset>` : ''}`;
}
function openLesson(track, subject, week) {
  const L = getLesson(track, subject, baseUnit(track, subject, week));
  modal(`<div class="lesson">${lessonHtml(track, subject, week, L)}</div>
    <div class="modal-actions"><button class="btn" value="cancel">إغلاق</button>${L ? `<button type="button" class="btn" onclick="printLesson('${track}','${esc(subject)}',${week})">طباعة الشرح</button>` : ''}${L?.quiz?.length ? `<button type="button" class="btn primary" onclick="openExam('${track}','${esc(subject)}',${week})">📝 امتحان الأسبوع</button>` : ''}</div>`);
}
function printLesson(track, subject, week) {
  const L = getLesson(track, subject, baseUnit(track, subject, week));
  printDoc(`شرح درس — ${subject}`, `<div class="lesson">${lessonHtml(track, subject, week, L)}</div>
    <style>fieldset{border:1px solid #DCE5E3;border-radius:10px;margin:12px 0;padding:10px 14px}legend{font-weight:700;color:#145741}.step{margin:8px 0}details{margin:6px 0}details p{margin:4px 0 0}</style>
    <script>document.querySelectorAll('details').forEach(d=>d.open=true)<\/script>`);
}
function openExam(track, subject, week) {
  const T = Curriculum.TRACKS[track], u = baseUnit(track, subject, week), L = getLesson(track, subject, u);
  if (!L || !L.quiz || !L.quiz.length) return toast('لا توجد أسئلة لهذا الدرس بعد', true);
  const per = 2, total = L.quiz.length * per;
  const qs = L.quiz.map((x, i) => `<div class="q" dir="auto"><b>${i + 1}. ${esc(x.q)}</b> <span class="pts">(${per} درجة)</span>
    ${x.o ? `<div class="opts">${x.o.map(o => `<span>◯ ${esc(o)}</span>`).join('')}</div>` : '<div class="line"></div><div class="line"></div>'}</div>`).join('');
  printDoc(`امتحان الأسبوع ${week} — ${subject}`, `
    <table><tr><th>اسم الطالب</th><td style="width:45%"></td><th>الصف</th><td>${esc(T.name)}</td></tr>
    <tr><th>الدرس</th><td dir="auto">${esc(u)}</td><th>الدرجة</th><td>&nbsp;&nbsp;&nbsp;&nbsp;/ ${total}</td></tr></table>
    ${qs}
    <div style="page-break-before:always"></div>
    <h2>نموذج الإجابة — للمعلم</h2>
    <table>${L.quiz.map((x, i) => `<tr><th style="width:40px">${i + 1}</th><td dir="auto">${esc(x.q)}</td><td dir="auto"><b>${esc(x.a)}</b></td></tr>`).join('')}</table>
    <style>.q{margin:16px 0;page-break-inside:avoid}.pts{color:#7D8B99;font-size:13px}.opts{display:flex;flex-wrap:wrap;gap:22px;margin-top:8px}.line{border-bottom:1px dotted #999;height:28px}</style>`);
}
async function saveGrades(e, track, subject, week) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const rows = studentsOfTrack(track).map(s => ({ studentId: s.id, score: d['score_' + s.id], max: d['max_' + s.id], level: d['level_' + s.id], note: d['note_' + s.id] }));
  await act('POST', '/api/assessments', { track, subject, week, rows }, 'تم حفظ الدرجات');
}
async function teachDone(track, subject, done) {
  const date = UI.teachDate, l = logOf(date, track, subject);
  if (l) l.done = done; else D.teachLogs.push({ date, track, subject, done });
  render();
  await api('POST', '/api/teach/log', { date, track, subject, done });
}
async function teachNote(track, subject, note) {
  const date = UI.teachDate, l = logOf(date, track, subject);
  if (l) l.note = note; else D.teachLogs.push({ date, track, subject, note });
  if (await api('POST', '/api/teach/log', { date, track, subject, note })) toast('تم حفظ الملاحظة');
}
function editTopic(track, subject, week) {
  const tp = topicFor(track, subject, week);
  const v = prompt(`${Curriculum.TRACKS[track].name} — ${subject}\nموضوع الأسبوع ${week}:\n(اتركه فارغاً للرجوع للخطة المقترحة)`, tp.text);
  if (v === null) return;
  act('PUT', '/api/plan/edit', { track, subject, week, topic: v }, v.trim() ? 'تم تعديل موضوع الأسبوع' : 'رجع للخطة المقترحة');
}
async function saveAcademic(e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  await act('PUT', '/api/academic', d, 'تم حفظ العام الدراسي');
}

/* ---------- المظهر ---------- */
VIEWS.appearance = () => {
  const a = { ...Theme.DEFAULTS, ...(window.APPEARANCE || {}) };
  const pressed = c => `aria-pressed="${!!c}"`;
  const imgs = a.images || {};
  const slot = (key, title, hint, cls) => `<div class="imgslot">
    <div class="pv ${cls || ''}">${imgs[key] ? `<img src="/img/${key}?v=${imgs[key]}" alt="">` : 'لا توجد صورة'}</div>
    <div class="info"><b>${title}</b><div class="muted">${hint}</div></div>
    <div class="actions"><label class="btn sm primary" style="cursor:pointer">${imgs[key] ? 'تغيير الصورة' : 'رفع صورة'}<input type="file" accept="image/*" hidden onchange="uploadImage('${key}', this)"></label>
    ${imgs[key] ? `<button class="btn sm danger" onclick="removeImage('${key}')">حذف</button>` : ''}</div></div>`;
  return `<div class="head"><div><h1>المظهر</h1><p>التغييرات تظهر فوراً وتُحفظ لك ولشريكك على كل الأجهزة</p></div>
    <div class="actions"><button class="btn" onclick="resetAppearance()">رجوع للمظهر الأصلي</button></div></div>

  <section class="panel"><h2>الألوان</h2>
    <div class="swatches">${Theme.PALETTES.map(p => `<button class="swatch" ${pressed(a.palette === p.id)} onclick="setAppearance({palette:'${p.id}'})"><i><b style="background:${p.primary}"></b><b style="background:${p.accent}"></b></i>${p.name}</button>`).join('')}
      <button class="swatch" ${pressed(a.palette === 'custom')} onclick="setAppearance({palette:'custom'})"><i><b style="background:${a.primary}"></b><b style="background:${a.accent}"></b></i>ألوان خاصة</button></div>
    ${a.palette === 'custom' ? `<div class="grid g2" style="margin-top:14px;max-width:420px">
      <label class="f">اللون الأساسي<input type="color" value="${a.primary}" style="height:46px;padding:4px" onchange="setAppearance({primary:this.value})"></label>
      <label class="f">لون التمييز<input type="color" value="${a.accent}" style="height:46px;padding:4px" onchange="setAppearance({accent:this.value})"></label></div>` : ''}
  </section>

  <section class="panel"><h2>الشاشة</h2>
    <p class="muted" style="margin:0 0 8px">الوضع</p>
    <div class="opts"><button class="opt" ${pressed(!a.dark)} onclick="setAppearance({dark:false})">☀️ فاتح</button><button class="opt" ${pressed(a.dark)} onclick="setAppearance({dark:true})">🌙 داكن (ليلي)</button></div>
    <p class="muted" style="margin:16px 0 8px">حجم الخط</p>
    <div class="opts">${Theme.SIZES.map(z => `<button class="opt" ${pressed(a.size === z.id)} onclick="setAppearance({size:'${z.id}'})" style="font-size:${Math.round(15 * z.fs)}px">${z.name}</button>`).join('')}</div>
    <p class="muted" style="margin:16px 0 8px">نوع الخط</p>
    <div class="opts">${Theme.FONTS.map(f => `<button class="opt" ${pressed(a.font === f.id)} onclick="setAppearance({font:'${f.id}'})" style="font-family:${f.family}">${f.name}</button>`).join('')}</div>
  </section>

  <section class="panel"><h2>صور الموقع</h2>
    ${slot('logo', 'شعار الروضة', 'يظهر في القائمة الجانبية وصفحة الدخول وبوابة ولي الأمر. يفضّل صورة مربعة.', 'logo')}
    ${slot('banner', 'صورة الصفحة الرئيسية', 'صورة عريضة تظهر أعلى الصفحة الرئيسية، مثل صورة الروضة أو الأطفال.')}
    ${slot('loginBg', 'خلفية صفحة الدخول', 'تظهر خلف مربع كلمة المرور.')}
    <p class="muted">تُصغَّر الصور تلقائياً قبل الرفع حتى يبقى البرنامج سريعاً.</p>
  </section>`;
};
let appearanceSave = null;
function setAppearance(patch) {
  const a = Theme.apply({ ...(window.APPEARANCE || {}), ...patch });
  render();
  clearTimeout(appearanceSave);
  appearanceSave = setTimeout(async () => { const r = await api('PUT', '/api/appearance', a); if (r) toast('تم حفظ المظهر'); }, 400);
}
async function resetAppearance() {
  if (!confirm('الرجوع للألوان والخط الأصلية؟ (الصور تبقى كما هي)')) return;
  const r = await api('PUT', '/api/appearance', { reset: true });
  if (r) { Theme.apply(r); render(); toast('رجع المظهر الأصلي'); }
}
// تصغير الصورة في المتصفح قبل رفعها
function shrinkImage(file, maxW, maxH, type) {
  return new Promise((ok, fail) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxW / img.width, maxH / img.height);
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d');
      if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL(type, 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('تعذر قراءة الصورة')); };
    img.src = url;
  });
}
async function uploadImage(key, input) {
  const file = input.files && input.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) return toast('اختر ملف صورة', true);
  toast('جارٍ رفع الصورة…');
  try {
    const dataUrl = key === 'logo' ? await shrinkImage(file, 512, 512, 'image/png') : await shrinkImage(file, 1600, 1000, 'image/jpeg');
    const r = await api('POST', `/api/assets/${key}`, { dataUrl });
    if (r) { Theme.apply(r); render(); toast('تم رفع الصورة'); }
  } catch (e) { toast(e.message, true); }
}
async function removeImage(key) {
  if (!confirm('حذف هذه الصورة؟')) return;
  const r = await api('DELETE', `/api/assets/${key}`);
  if (r) { Theme.apply(r); render(); toast('تم حذف الصورة'); }
}

/* ---------- الإعدادات ---------- */
VIEWS.settings = () => {
  const s = D.settings;
  const head = `<div class="head"><div><h1>${can('settings') ? 'الإعدادات' : 'حسابي'}</h1><p>مسجّل الدخول باسم: <b>${esc(ME().name)}</b>${ME().admin ? ' (المدير)' : ''}</p></div><div class="actions"><button class="btn danger logout" onclick="logout()">تسجيل الخروج</button></div></div>
  ${installPanel()}`;
  const myPw = `<form class="panel" onsubmit="changePassword(event)"><h2>تغيير كلمة المرور</h2><div class="grid g3">
    <label class="f">الحالية<input type="password" name="current" required autocomplete="current-password"></label>
    <label class="f">الجديدة<input type="password" name="next" required minlength="6" autocomplete="new-password"></label>
    <label class="f">تأكيد الجديدة<input type="password" name="confirm" required minlength="6" autocomplete="new-password"></label>
  </div><div class="actions" style="margin-top:14px"><button class="btn primary">تغيير كلمة المرور</button></div></form>`;
  if (!can('settings')) return head + `<section class="panel"><h2>صلاحياتك</h2><div class="opts">${(ME().perms || []).map(p => `<span class="tag info">${PERM_LABELS[p] || p}</span>`).join(' ') || '<span class="muted">عرض فقط</span>'}</div><p class="muted">لتعديل صلاحياتك تواصل مع المدير.</p></section>` + myPw;
  return head + `${ME().admin ? usersPanel() : ''}
  <form class="panel" onsubmit="saveSettings(event)"><h2>بيانات الروضة</h2><div class="grid g2">
    <label class="f">اسم الروضة<input name="schoolName" value="${esc(s.schoolName)}"></label>
    <label class="f">جوال الروضة (واتساب)<input name="phone" value="${esc(s.phone || '')}"></label>
    <label class="f">العنوان<input name="address" value="${esc(s.address || '')}"></label>
    <label class="f">الرقم الضريبي (يظهر في الإيصال)<input name="vatNumber" value="${esc(s.vatNumber || '')}"></label>
    <label class="f">العملة<input name="currency" value="${esc(s.currency || 'ر.س')}"></label>
    <label class="f">الالتحاق حتى يوم كم يُحسب شهراً كاملاً؟ (بعده بالأيام)<input type="number" min="1" max="28" name="halfMonthAfterDay" value="${s.halfMonthAfterDay || 10}"></label>
    <label class="f" style="grid-column:1/-1">بنود المصروفات (افصل بفاصلة)<input name="expenseCategories" value="${esc((s.expenseCategories || []).join('، '))}"></label>
  </div><div class="actions" style="margin-top:14px"><button class="btn primary">حفظ</button></div></form>

  ${!ME().admin ? '' : `<form class="panel" onsubmit="savePartners(event)"><h2>الشركاء ونسبة كل شريك</h2>
    <div class="grid g2">${partners().map((p, i) => `<label class="f">اسم الشريك ${i + 1}<input name="n${i}" value="${esc(p.name)}" required></label><label class="f">النسبة ٪<input type="number" min="0" max="100" step="any" name="s${i}" value="${p.share}" required></label>`).join('')}</div>
    <div class="actions" style="margin-top:14px"><button class="btn primary">حفظ</button></div></form>`}

  <section class="panel"><h2>الصفوف <button class="btn sm primary" onclick="classForm()">+ صف</button></h2>
    ${(s.classes || []).map((c, i) => { const n = active().filter(x => x.grade === c.name).length;
      return `<div class="list-row"><div><b>${esc(c.name)}</b> <span class="muted">${n} طالب${c.capacity ? ` من ${c.capacity}` : ''}${c.teacher ? ` · المعلمة: ${esc(c.teacher)}` : ''}</span></div>
      <div class="actions"><button class="btn sm" onclick="classForm(${i})">تعديل</button><button class="btn sm danger" onclick="removeClass(${i})">حذف</button></div></div>`; }).join('') || '<p class="empty">لم تضف صفوفاً بعد</p>'}
  </section>
  ${myPw}`;
};
/* ---------- المستخدمون والصلاحيات (للمدير) ---------- */
let USERS = null;
async function loadUsers() { USERS = await api('GET', '/api/users') || []; if (VIEW === 'settings') render(); }
function usersPanel() {
  if (USERS === null) { loadUsers(); return '<section class="panel"><h2>المستخدمون والصلاحيات</h2><p class="muted">جارٍ التحميل…</p></section>'; }
  return `<section class="panel"><h2>المستخدمون والصلاحيات <button class="btn sm primary" onclick="userForm()">+ مستخدم</button></h2>
    <p class="muted" style="margin-top:0">أنت المدير ولك كل الصلاحيات. أضف حساباً لكل معلمة أو موظف، واختر ما يستطيع رؤيته وفعله. الحذف لا يظهر إلا لمن أعطيته صلاحية "الحذف".</p>
    ${USERS.length ? USERS.map(u => `<div class="list-row"><div><b>${esc(u.name)}</b> <span class="muted num">@${esc(u.username)}</span>${u.active ? '' : ' <span class="tag warn">موقوف</span>'}
      <div class="opts" style="margin-top:4px">${(u.perms || []).map(p => `<span class="tag ${p === 'delete' ? 'bad' : 'info'}">${PERM_LABELS[p] || p}</span>`).join(' ') || '<span class="tag mute">عرض فقط</span>'}</div></div>
      <div class="actions"><button class="btn sm" onclick="userForm('${u.id}')">تعديل</button><button class="btn sm danger" onclick="delUser('${u.id}')">حذف</button></div></div>`).join('')
      : '<p class="empty">لا يوجد مستخدمون غيرك بعد</p>'}
    <p class="muted">يدخل المستخدم من صفحة الدخول باسم المستخدم وكلمة المرور. أنت تدخل بكلمة المرور فقط (اترك اسم المستخدم فارغاً).</p></section>`;
}
const PRESETS = { teacher: ['attendance', 'teach', 'comms'], accountant: ['finance', 'reports', 'students'], all: PERMS_ALL() };
function PERMS_ALL() { return Object.keys(PERM_LABELS); }
function userForm(id) {
  const u = id ? USERS.find(x => x.id === id) : { perms: ['attendance', 'teach'], active: true };
  modal(`<h2>${id ? 'تعديل ' + esc(u.name) : 'مستخدم جديد'}</h2><div class="grid g2">
    <label class="f">الاسم *<input name="name" required value="${esc(u.name || '')}" placeholder="مثال: أ. سارة"></label>
    <label class="f">اسم المستخدم (للدخول) *<input name="username" required ${id ? 'disabled' : ''} value="${esc(u.username || '')}" placeholder="مثال: sara" autocapitalize="off" autocomplete="off"></label>
    <label class="f">${id ? 'كلمة مرور جديدة (اتركها فارغة بدون تغيير)' : 'كلمة المرور *'}<input name="password" type="text" ${id ? '' : 'required'} minlength="6" autocomplete="new-password"></label>
    <label class="f">الحالة<select name="active"><option value="1" ${u.active ? 'selected' : ''}>فعّال</option><option value="0" ${u.active ? '' : 'selected'}>موقوف (لا يستطيع الدخول)</option></select></label></div>
    <fieldset style="margin-top:12px"><legend>الصلاحيات</legend>
      <div class="actions" style="margin-bottom:8px"><button type="button" class="btn sm" onclick="presetPerms('teacher')">معلمة</button><button type="button" class="btn sm" onclick="presetPerms('accountant')">محاسب</button><button type="button" class="btn sm" onclick="presetPerms('all')">كل الصلاحيات</button><button type="button" class="btn sm ghost" onclick="presetPerms('none')">إلغاء الكل</button></div>
      <div class="perm-grid">${PERMS_ALL().map(p => `<label class="opt perm"><input type="checkbox" name="p_${p}" ${(u.perms || []).includes(p) ? 'checked' : ''}><span>${PERM_LABELS[p]}</span></label>`).join('')}</div>
      <p class="muted" style="margin-bottom:0">بدون صلاحية "المالية" أو "التقارير" لا يرى المستخدم أي مبالغ. نسب الشركاء وإدارة المستخدمين والنسخة الاحتياطية للمدير فقط.</p></fieldset>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      const body = { name: data.name, perms: PERMS_ALL().filter(p => data['p_' + p] === 'on'), active: data.active === '1' };
      if (data.password) body.password = data.password;
      if (!id) body.username = data.username;
      const r = await api(id ? 'PUT' : 'POST', id ? `/api/users/${id}` : '/api/users', body);
      if (r) { toast(id ? 'تم حفظ المستخدم' : `تم إنشاء المستخدم. اسم الدخول: ${r.username}`); await loadUsers(); }
      return !!r;
    });
}
function presetPerms(k) {
  const set = k === 'none' ? [] : PRESETS[k];
  PERMS_ALL().forEach(p => { const i = document.querySelector(`#modal-form [name=p_${p}]`); if (i) i.checked = set.includes(p); });
}
async function delUser(id) {
  const u = USERS.find(x => x.id === id);
  if (!confirm(`حذف حساب ${u.name}؟ لن يستطيع الدخول بعد الآن.`)) return;
  if (await api('DELETE', `/api/users/${id}`)) { toast('تم حذف المستخدم'); await loadUsers(); }
}
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
    <fieldset style="margin-top:14px"><legend>مستويات الخطة الدراسية لهذا الصف</legend><div class="opts">
      ${Object.entries(Curriculum.TRACKS).map(([k, T]) => `<label class="opt" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="tr_${k}" ${(i !== undefined ? tracksFor(c.name) : []).includes(k) ? 'checked' : ''} style="width:auto">${esc(T.name)}</label>`).join('')}</div></fieldset>
    ${i !== undefined ? '<p class="muted">تغيير اسم الصف يُحدّث أسماء صفوف الطلاب تلقائياً.</p>' : ''}
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => {
      const list = [...(D.settings.classes || [])];
      const item = { name: data.name.trim(), teacher: data.teacher, capacity: +data.capacity || undefined, tracks: Object.keys(Curriculum.TRACKS).filter(k => data['tr_' + k] === 'on') };
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
  if (await api('PUT', ME().admin ? '/api/settings/password' : '/api/me/password', d)) { toast('تم تغيير كلمة المرور'); e.target.reset(); }
}
async function logout() { await api('POST', '/api/logout'); location.href = '/login'; }

/* ---------- الحسابات: الأرباح والخسائر ---------- */
const ACC_TABS = [['pl', 'الأرباح والخسائر'], ['months', 'الأشهر'], ['partners', 'الشركاء والمسحوبات'], ['cash', 'الصندوق'], ['other', 'إيرادات أخرى']];
const acadYearOf = d => { const [y, m] = d.split('-').map(Number); return m >= 9 ? y : y - 1; }; // السنة الدراسية من سبتمبر إلى أغسطس
function periodMonths(from, to) {
  const out = []; let [y, m] = from.split('-').map(Number); const [ty, tm] = to.split('-').map(Number);
  while ((y < ty || (y === ty && m <= tm)) && out.length < 120) { out.push(`${y}-${String(m).padStart(2, '0')}`); if (++m > 12) { m = 1; y++; } }
  return out;
}
function accPeriod() {
  UI.accP ||= 'ay:' + acadYearOf(D.today);
  const [k, a, b] = UI.accP.split(':');
  if (k === 'ay') return { label: `السنة الدراسية ${a}/${+a + 1}`, from: `${a}-09`, to: `${+a + 1}-08` };
  if (k === 'cy') return { label: `سنة ${a}`, from: `${a}-01`, to: `${a}-12` };
  return { label: `من ${monthName(a)} إلى ${monthName(b)}`, from: a, to: b };
}
function periodSelect() {
  const months = activeMonths(); const y0 = +months[0].slice(0, 4), y1 = +D.today.slice(0, 4);
  const opts_ = [];
  for (let y = acadYearOf(D.today); y >= acadYearOf(months[0] + '-01'); y--) opts_.push([`ay:${y}`, `السنة الدراسية ${y}/${y + 1}`]);
  for (let y = y1; y >= y0; y--) opts_.push([`cy:${y}`, `السنة الميلادية ${y}`]);
  const isCustom = UI.accP.startsWith('rg:');
  const [, a, b] = isCustom ? UI.accP.split(':') : [, months[0], monthOf(D.today)];
  return `<div class="filters" style="align-items:center">
    <select onchange="UI.accP=this.value==='rg'?'rg:${a}:${b}':this.value;render()" aria-label="الفترة">${opts_.map(([v, l]) => `<option value="${v}" ${v === UI.accP ? 'selected' : ''}>${l}</option>`).join('')}<option value="rg" ${isCustom ? 'selected' : ''}>فترة مخصصة…</option></select>
    ${isCustom ? `<label class="muted" style="display:flex;gap:6px;align-items:center">من <input type="month" value="${a}" onchange="UI.accP='rg:'+this.value+':${b}';render()"></label>
    <label class="muted" style="display:flex;gap:6px;align-items:center">إلى <input type="month" value="${b}" onchange="UI.accP='rg:${a}:'+this.value;render()"></label>` : ''}</div>`;
}
function plData(P) {
  const ms = periodMonths(P.from, P.to); const inM = d => ms.includes(monthOf(d));
  const add = (o, k, v) => { o[k || 'أخرى'] = (o[k || 'أخرى'] || 0) + N(v); };
  const fees = sumBy(D.payments.filter(p => inM(p.date)), p => p.amount);
  const books = sumBy(bookPaysIn().filter(p => inM(p.date)), p => p.amount);
  const others = {}; (D.incomes || []).filter(x => inM(x.date)).forEach(x => add(others, x.category, x.amount));
  const exp = {}; D.expenses.filter(e => inM(e.date)).forEach(e => add(exp, e.category, e.amount));
  const otherT = Object.values(others).reduce((a, v) => a + v, 0), out = Object.values(exp).reduce((a, v) => a + v, 0);
  const inc = fees + books + otherT, net = inc - out;
  // الرسوم المستحقة عن أشهر الفترة التي حلّت حتى الآن (أساس الاستحقاق)
  const dueMs = ms.filter(m => m <= monthOf(D.today));
  const due = sumBy(D.students, s => sumBy(dueMs.filter(m => s.join_date && m >= monthOf(s.join_date)), m => monthDue(s, m)));
  const months = ms.map(monthFin);
  const draws = (D.draws || []).filter(x => inM(x.date));
  return { ms, fees, books, others, otherT, exp, inc, out, net, due, months, draws };
}
const plTag = v => v >= 0 ? `<span class="tag ok">ربح</span>` : `<span class="tag bad">خسارة</span>`;
const signed = v => `<b class="${v < 0 ? 'money-bad' : 'money-ok'}">${v < 0 ? '(' + fmt(-v) + ')' : fmt(v)}</b>`;

VIEWS.accounts = () => {
  UI.accTab ||= 'pl';
  const P = accPeriod(), d = plData(P);
  return `<div class="head"><div><h1>الحسابات</h1><p>الأرباح والخسائر والإيرادات والمصروفات — ${esc(P.label)}</p></div>
    <div class="actions"><button class="btn" onclick="printPL()">طباعة قائمة الدخل</button><button class="btn" onclick="exportPL()">تصدير Excel</button></div></div>
  ${periodSelect()}
  <div class="tabs" role="tablist">${ACC_TABS.map(([k, l]) => `<button role="tab" aria-selected="${UI.accTab === k}" onclick="UI.accTab='${k}';render()">${l}</button>`).join('')}</div>
  ${ACC[UI.accTab](P, d)}`;
};
function statementHtml(P, d) {
  const pr = partners();
  const line = (label, v, cls = '', note = '') => `<tr class="${cls}"><td>${label}${note ? ` <span class="muted">${note}</span>` : ''}</td><td class="num">${typeof v === 'string' ? v : money(v)}</td></tr>`;
  const expRows = Object.entries(d.exp).sort((a, b) => b[1] - a[1]);
  return `<table class="stmt">
    <tr class="sec"><td colspan="2">الإيرادات</td></tr>
    ${line('الرسوم الدراسية المحصّلة', d.fees)}
    ${line('مبيعات الكتب المحصّلة', d.books)}
    ${Object.entries(d.others).map(([k, v]) => line('إيرادات أخرى: ' + esc(k), v)).join('')}
    ${line('<b>إجمالي الإيرادات</b>', `<b>${money(d.inc)}</b>`, 'tot')}
    <tr class="sec"><td colspan="2">المصروفات</td></tr>
    ${expRows.map(([k, v]) => line(esc(k), v, '', d.out ? Math.round(v / d.out * 100) + '٪' : '')).join('') || line('لا توجد مصروفات', 0)}
    ${line('<b>إجمالي المصروفات</b>', `<b>${money(d.out)}</b>`, 'tot')}
    <tr class="net ${d.net < 0 ? 'loss' : ''}"><td>${d.net < 0 ? 'صافي الخسارة' : 'صافي الربح'}</td><td class="num">${money(Math.abs(d.net))}</td></tr>
    <tr class="sec"><td colspan="2">توزيع ${d.net < 0 ? 'الخسارة' : 'الربح'} على الشركاء</td></tr>
    ${pr.map(p => line(`${esc(p.name)} (${fmt(p.share)}٪)`, signed(d.net * N(p.share) / 100))).join('')}
  </table>`;
}
const ACC = {
  pl(P, d) {
    const margin = d.inc ? Math.round(d.net / d.inc * 100) : 0;
    const best = [...d.months].sort((a, b) => b.net - a.net)[0], worst = [...d.months].filter(m => m.inc || m.out).sort((a, b) => a.net - b.net)[0];
    const live = d.months.filter(m => m.inc || m.out).length || 1;
    const topExp = Object.entries(d.exp).sort((a, b) => b[1] - a[1])[0];
    const max = Math.max(1, ...d.months.map(m => Math.max(m.inc, m.out)));
    return `<div class="figures">
      <div class="fig"><span>إجمالي الإيرادات</span><b class="money-ok">${fmt(d.inc)}</b><small>رسوم ${fmt(d.fees)} · كتب ${fmt(d.books)}${d.otherT ? ` · أخرى ${fmt(d.otherT)}` : ''}</small></div>
      <div class="fig"><span>إجمالي المصروفات</span><b class="money-bad">${fmt(d.out)}</b><small>${Object.keys(d.exp).length} بند</small></div>
      <div class="fig"><span>${d.net < 0 ? 'صافي الخسارة' : 'صافي الربح'}</span><b class="${d.net < 0 ? 'money-bad' : 'money-ok'}">${fmt(Math.abs(d.net))}</b><small>${plTag(d.net)} ${cur()}</small></div>
      <div class="fig"><span>هامش الربح</span><b>${margin}٪</b><small>الربح ÷ الإيرادات</small></div></div>
    <div class="cols">
      <section class="panel"><h2>قائمة الدخل (الأرباح والخسائر)</h2><p class="muted" style="margin-top:0">${esc(P.label)} · على أساس ما دخل الصندوق وخرج منه فعلاً</p>${statementHtml(P, d)}</section>
      <div>
        <section class="panel"><h2>الإيراد والمصروف شهرياً</h2><div class="chart${d.months.length > 6 ? ' many' : ''}">${d.months.map(m => `<div class="m"><div class="bars">
          <div class="bar in" style="height:${m.inc / max * 100}%" title="إيرادات ${fmt(m.inc)}"></div><div class="bar out" style="height:${m.out / max * 100}%" title="مصروفات ${fmt(m.out)}"></div></div>
          <label>${new Date(m.m + '-15').toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' })}</label></div>`).join('')}</div>
          <div class="board-legend" style="margin-top:10px"><span><i style="background:var(--palm)"></i>إيرادات</span><span><i style="background:var(--rose)"></i>مصروفات</span></div></section>
        <section class="panel"><h2>مؤشرات الفترة</h2>
          <div class="list-row"><span>الرسوم المستحقة حتى اليوم (عن أشهر الفترة)</span><b>${money(d.due)}</b></div>
          <div class="list-row"><span>الرسوم المحصّلة خلال الفترة</span><b class="money-ok">${money(d.fees)}</b></div>
          <div class="list-row"><span>نسبة التحصيل</span><b>${d.due ? Math.round(d.fees / d.due * 100) : 100}٪</b></div>
          <div class="list-row"><span>متوسط الربح الشهري</span>${signed(d.net / live)}</div>
          ${best && (best.inc || best.out) ? `<div class="list-row"><span>أفضل شهر</span><b>${monthName(best.m)} (${fmt(best.net)})</b></div>` : ''}
          ${worst ? `<div class="list-row"><span>أضعف شهر</span><b>${monthName(worst.m)} (${fmt(worst.net)})</b></div>` : ''}
          ${topExp ? `<div class="list-row"><span>أكبر بند مصروفات</span><b>${esc(topExp[0])} (${d.out ? Math.round(topExp[1] / d.out * 100) : 0}٪)</b></div>` : ''}
          <p class="muted">الإيرادات والمصروفات حسب تاريخ الدفع. "المستحق" يوضح ما كان يجب تحصيله عن الأشهر التي مرّت من الفترة؛ الفرق بينه وبين المحصّل هو المتأخرات.</p></section>
      </div></div>`;
  },
  months(P, d) {
    let cum = 0;
    return `<section class="panel"><h2>الأرباح والخسائر شهراً بشهر — ${esc(P.label)}</h2><div class="tbl-wrap"><table><thead><tr><th>الشهر</th><th>رسوم</th><th>كتب</th><th>أخرى</th><th>الإيرادات</th><th>المصروفات</th><th>الصافي</th><th>التراكمي</th></tr></thead><tbody>
    ${d.months.map(m => { cum += m.net; const empty = !m.inc && !m.out; return `<tr${empty ? ' class="dim"' : ''}><td><b>${monthName(m.m)}</b></td><td>${money(m.fees)}</td><td>${money(m.books)}</td><td>${money(m.other)}</td><td class="money-ok">${money(m.inc)}</td><td class="money-bad">${money(m.out)}</td><td>${empty ? '—' : signed(m.net) + ' ' + plTag(m.net)}</td><td>${signed(cum)}</td></tr>`; }).join('')}
    <tr class="grandtotal"><td><b>الإجمالي</b></td><td><b>${money(d.fees)}</b></td><td><b>${money(d.books)}</b></td><td><b>${money(d.otherT)}</b></td><td class="money-ok"><b>${money(d.inc)}</b></td><td class="money-bad"><b>${money(d.out)}</b></td><td>${signed(d.net)} ${plTag(d.net)}</td><td></td></tr>
    </tbody></table></div></section>`;
  },
  partners(P, d) {
    const pr = partners();
    return `<section class="panel"><h2>حساب الشركاء — ${esc(P.label)} ${ME().admin ? '<button class="btn sm primary" onclick="drawForm()">+ تسجيل سحب</button>' : ''}</h2>
    <div class="tbl-wrap"><table><thead><tr><th>الشريك</th><th>النسبة</th><th>نصيبه من ${d.net < 0 ? 'الخسارة' : 'الربح'}</th><th>ما سحبه</th><th>المتبقي له</th></tr></thead><tbody>
    ${pr.map(p => { const share = d.net * N(p.share) / 100, took = sumBy(d.draws.filter(x => x.partner === p.name), x => x.amount);
      return `<tr><td><b>${esc(p.name)}</b></td><td>${fmt(p.share)}٪</td><td>${signed(share)}</td><td class="money-bad">${money(took)}</td><td>${signed(share - took)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="muted">"المتبقي له" = نصيبه من صافي ربح الفترة − ما سحبه خلالها. السحب لا يُعدّ مصروفاً ولا يغيّر الربح، لكنه يُنقص رصيد الصندوق.</p></section>
    <section class="panel"><h2>المسحوبات خلال الفترة</h2>
    ${d.draws.map(x => `<div class="list-row"><span><b>${esc(x.partner)}</b> <span class="muted">${esc(fmtDate(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</span></span><span class="actions"><b class="money-bad">${money(x.amount)}</b>${ME().admin ? `<button class="btn sm danger" onclick="del('draws','${x.id}','هذا السحب')">حذف</button>` : ''}</span></div>`).join('') || '<p class="empty">لا توجد مسحوبات في هذه الفترة</p>'}</section>`;
  },
  cash() {
    const all = { fees: sumBy(D.payments, p => p.amount), books: sumBy(bookPaysIn(), p => p.amount), other: sumBy(D.incomes || [], x => x.amount),
      out: sumBy(D.expenses, e => e.amount), draws: sumBy(D.draws || [], x => x.amount) };
    const open = N(D.settings.openingCash);
    const bal_ = open + all.fees + all.books + all.other - all.out - all.draws;
    return `<section class="panel"><h2>رصيد الصندوق الآن</h2>
      <table class="stmt">
        <tr><td>الرصيد الافتتاحي ${ME().admin ? '<button class="btn sm ghost" onclick="openingForm()">تعديل</button>' : ''}</td><td class="num">${money(open)}</td></tr>
        <tr><td>+ الرسوم المحصّلة (كل الفترات)</td><td class="num">${money(all.fees)}</td></tr>
        <tr><td>+ المحصّل من الكتب</td><td class="num">${money(all.books)}</td></tr>
        <tr><td>+ إيرادات أخرى</td><td class="num">${money(all.other)}</td></tr>
        <tr><td>− المصروفات</td><td class="num money-bad">${money(all.out)}</td></tr>
        <tr><td>− مسحوبات الشركاء</td><td class="num money-bad">${money(all.draws)}</td></tr>
        <tr class="net ${bal_ < 0 ? 'loss' : ''}"><td>الرصيد المفترض في الصندوق والبنك</td><td class="num">${money(bal_)}</td></tr>
      </table>
      <p class="muted">قارن هذا الرقم بما هو موجود فعلاً (نقداً وفي الحساب البنكي). إذا اختلف فهناك دفعة أو مصروف لم يُسجّل.</p></section>`;
  },
  other(P, d) {
    const ms = d.ms, list = (D.incomes || []).filter(x => ms.includes(monthOf(x.date)));
    return `<section class="panel"><h2>إيرادات أخرى — ${esc(P.label)} <span class="money-ok">${money(d.otherT)}</span> ${can('finance') ? '<button class="btn sm primary" onclick="incomeForm()">+ إيراد</button>' : ''}</h2>
    <p class="muted" style="margin-top:0">أي دخل غير الرسوم الشهرية والكتب: رسوم تسجيل، مواصلات، زي مدرسي، فعاليات ورحلات، دعم أو تبرع…</p>
    ${list.map(x => `<div class="list-row"><span><b>${esc(x.title)}</b> <span class="tag mute">${esc(x.category || 'أخرى')}</span> <span class="muted">${esc(fmtDate(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</span></span><span class="actions"><b class="money-ok">${money(x.amount)}</b><button class="btn sm danger" onclick="del('incomes','${x.id}','هذا الإيراد')">حذف</button></span></div>`).join('') || '<p class="empty">لا توجد إيرادات أخرى في هذه الفترة</p>'}</section>`;
  },
};
const INCOME_CATS = ['رسوم تسجيل', 'مواصلات', 'زي مدرسي', 'رحلات وفعاليات', 'دعم وتبرعات', 'أخرى'];
function incomeForm() {
  modal(`<h2>تسجيل إيراد آخر</h2><div class="grid g2">
    <label class="f">البيان *<input name="title" required placeholder="مثال: رسوم تسجيل 3 طلاب"></label>
    <label class="f">التصنيف<select name="category">${INCOME_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f">طريقة الدفع<select name="method">${['نقدي', 'تحويل بنكي', 'مدى', 'STC Pay'].map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="f">ملاحظة<input name="note"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/incomes', data, 'تم تسجيل الإيراد')));
}
function drawForm() {
  modal(`<h2>تسجيل سحب شريك من الأرباح</h2><div class="grid g2">
    <label class="f">الشريك *<select name="partner" required>${partners().map(p => `<option>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="f">المبلغ *<input type="number" min="1" step="any" name="amount" required></label>
    <label class="f">التاريخ<input type="date" name="date" value="${D.today}"></label>
    <label class="f">ملاحظة<input name="note" placeholder="مثال: أرباح شهر أكتوبر"></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('POST', '/api/draws', data, 'تم تسجيل السحب')));
}
function openingForm() {
  modal(`<h2>الرصيد الافتتاحي للصندوق</h2><p class="muted" style="margin-top:0">المبلغ الذي كان في الصندوق والبنك قبل أول دفعة سُجّلت في البرنامج.</p>
    <label class="f">المبلغ<input type="number" step="any" name="openingCash" value="${N(D.settings.openingCash)}"></label>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act('PUT', '/api/settings', { openingCash: data.openingCash }, 'تم الحفظ')));
}
function printPL() {
  const P = accPeriod(), d = plData(P);
  printDoc('قائمة الأرباح والخسائر', `<h2>${esc(P.label)}</h2>${statementHtml(P, d)}
    <h3>ملخص الأشهر</h3><table><tr><th>الشهر</th><th>الإيرادات</th><th>المصروفات</th><th>الصافي</th></tr>
    ${d.months.filter(m => m.inc || m.out).map(m => `<tr><td>${monthName(m.m)}</td><td>${money(m.inc)}</td><td>${money(m.out)}</td><td>${m.net < 0 ? '(' + money(-m.net) + ')' : money(m.net)}</td></tr>`).join('')}</table>
    <div class="sig"><div>المدير</div><div>الشريك</div></div>
    <style>.stmt td{padding:7px 9px}.stmt .sec td{background:#EEF3F2;font-weight:700}.stmt .tot td{border-top:2px solid #145741}.stmt .net td{font-weight:700;font-size:18px;color:#145741;border-top:3px double #145741}.stmt .net.loss td{color:#B4314C}.amt{white-space:nowrap}.muted{color:#7D8B99;font-size:12px}</style>`);
}
function exportPL() {
  const P = accPeriod(), d = plData(P);
  downloadCsv('الأرباح-والخسائر', [['الشهر', 'رسوم', 'كتب', 'أخرى', 'الإيرادات', 'المصروفات', 'الصافي'],
    ...d.months.map(m => [monthName(m.m), m.fees, m.books, m.other, m.inc, m.out, m.net]), ['الإجمالي', d.fees, d.books, d.otherT, d.inc, d.out, d.net],
    [], ['المصروفات حسب البند', ''], ...Object.entries(d.exp).map(([k, v]) => [k, v])]);
}

/* ---------- التطوير: مؤشرات الأداء وخطة تطوير العمل والمكان ---------- */
const AREAS = ['المكان والبيئة', 'التعليم', 'أولياء الأمور والتسويق', 'الإدارة والمالية', 'الموظفون', 'الصحة والسلامة'];
const IMP_STATUS = [['idea', '💡 أفكار'], ['doing', '🔨 قيد التنفيذ'], ['done', '✅ تم']];
const PRIO = { high: ['عالية', 'bad'], mid: ['متوسطة', 'warn'], low: ['منخفضة', 'mute'] };
// مكتبة أفكار مقترحة لتطوير الروضة: [المجال، العنوان، الشرح، تكلفة تقديرية بالريال]
const IDEAS = [
  ['المكان والبيئة', 'ركن قراءة مريح في كل فصل', 'رف كتب منخفض، وسائد، سجادة وإضاءة دافئة. يرفع حب القراءة ويعطي الطفل مكاناً هادئاً.', 800],
  ['المكان والبيئة', 'تقسيم الفصل إلى أركان تعلم', 'ركن الفن، ركن العلوم، ركن البناء والمكعبات، ركن التمثيل. الطفل يتعلم باللعب ويتنقل بين الأركان.', 1500],
  ['المكان والبيئة', 'تظليل الساحة وعشب صناعي وألعاب آمنة', 'مظلات، عشب صناعي، زحليقة وأرجوحة بأرضية مطاطية. أهم ما يجذب الأهالي في الزيارة الأولى.', 8000],
  ['المكان والبيئة', 'جداريات تعليمية بالعربي والإنجليزي', 'الحروف، الأرقام، الألوان، الأيام، على الجدران والممرات بألوان مبهجة.', 600],
  ['المكان والبيئة', 'ركن عرض أعمال الأطفال عند المدخل', 'لوحة تتغير كل أسبوع بأعمال الأطفال، يراها الأهالي يومياً.', 300],
  ['المكان والبيئة', 'حديقة صغيرة يزرعها الأطفال', 'أصص وبذور يتابعها الأطفال أسبوعياً، مرتبطة بدروس العلوم.', 400],
  ['المكان والبيئة', 'تحسين الإضاءة والتهوية والتكييف', 'إضاءة بيضاء كافية، تنظيف وصيانة المكيفات قبل الصيف.', 3000],
  ['التعليم', 'شاشة تفاعلية أو بروجكتر لكل فصل', 'لعرض القصص والأناشيد والفيديوهات التعليمية القصيرة.', 2500],
  ['التعليم', 'تقرير مهارات لكل طفل كل شهرين', 'تقييم القراءة والحساب والسلوك يُرسل لولي الأمر (الدرجات موجودة في البرنامج).', 0],
  ['التعليم', 'رحلة تعليمية كل فصل دراسي', 'مزرعة، مكتبة عامة، متحف، مركز علوم — بموافقة الأهالي ورسوم رمزية.', 1500],
  ['التعليم', 'حقيبة نشاط منزلية أسبوعية', 'ورقة نشاط ممتعة يعملها الطفل مع أهله في الإجازة الأسبوعية.', 500],
  ['التعليم', 'نادي روبوت وبرمجة مبسطة للكبار', 'ساعة أسبوعية بألعاب برمجة بدون شاشة ثم بتطبيقات بسيطة.', 2000],
  ['أولياء الأمور والتسويق', 'حساب انستقرام/سناب للروضة', 'صور الفعاليات والإنجازات (بموافقة الأهالي) — أقوى تسويق مجاني.', 0],
  ['أولياء الأمور والتسويق', 'يوم مفتوح للتسجيل', 'جولة للأهالي وأنشطة للأطفال وخصم لمن يسجّل في نفس اليوم.', 500],
  ['أولياء الأمور والتسويق', 'برنامج "رشّح صديقاً"', 'خصم شهر أو نصف شهر لولي الأمر الذي يجلب طالباً جديداً.', 0],
  ['أولياء الأمور والتسويق', 'استبيان رضا أولياء الأمور', 'استبيان قصير كل فصل (نموذج جوجل) لمعرفة ما يحبونه وما يزعجهم.', 0],
  ['أولياء الأمور والتسويق', 'لوحة خارجية وموقع على خرائط جوجل', 'لوحة واضحة بالاسم والجوال، وتسجيل الروضة في خرائط جوجل مع صور.', 1200],
  ['أولياء الأمور والتسويق', 'مجلس أمهات شهري', 'لقاء قصير لعرض ما تعلمه الأطفال وسماع الاقتراحات.', 200],
  ['الإدارة والمالية', 'خصم للدفع الفصلي أو السنوي مقدماً', 'مثلاً 5٪ للدفع عن فصل كامل — يحسّن السيولة ويقلل المتأخرات.', 0],
  ['الإدارة والمالية', 'جهاز مدى للدفع', 'يسهّل الدفع على الأهالي ويقلل النقد في الروضة.', 0],
  ['الإدارة والمالية', 'هدف ربح شهري ومتابعته', 'حدد هدفاً من صفحة الحسابات وراجع الأرباح والخسائر أول كل شهر.', 0],
  ['الإدارة والمالية', 'تذكير المتأخرات أول كل شهر', 'زر التذكير بالواتساب موجود في المالية ← المتأخرات.', 0],
  ['الإدارة والمالية', 'مراجعة الفواتير والمشتريات شهرياً', 'الكهرباء والماء والمشتريات: أين يمكن التوفير؟', 0],
  ['الموظفون', 'دورة تدريبية للمعلمات', 'التعلم باللعب وإدارة الصف والتعامل مع الطفل كثير الحركة.', 1000],
  ['الموظفون', 'حافز شهري للمعلمة المتميزة', 'مكافأة رمزية وشهادة، حسب إنجاز المهام في قسم التعليم.', 300],
  ['الموظفون', 'اجتماع أسبوعي 20 دقيقة', 'مراجعة خطة الأسبوع والأطفال الذين يحتاجون متابعة.', 0],
  ['الموظفون', 'وصف مهام مكتوب لكل موظف', 'يوضح المسؤوليات ويقلل الخلافات.', 0],
  ['الصحة والسلامة', 'حقيبة إسعافات وتدريب المعلمات', 'حقيبة مكتملة ودورة إسعافات أولية للمعلمات.', 600],
  ['الصحة والسلامة', 'كاميرات في الممرات والساحة', 'تزيد ثقة الأهالي وتحمي الأطفال والمعلمات.', 2500],
  ['الصحة والسلامة', 'خطة إخلاء وطفايات حريق', 'لوحات خروج، طفايات صالحة، وتدريب إخلاء مرة كل فصل.', 800],
  ['الصحة والسلامة', 'حماية الزوايا والمقابس وتثبيت الأثاث', 'واقيات زوايا وأغطية مقابس وتثبيت الرفوف في الجدار.', 300],
  ['الصحة والسلامة', 'سجل استلام الأطفال', 'تسجيل من استلم الطفل يومياً وأسماء المصرح لهم فقط.', 0],
];
function kpis() {
  const act_ = active(), cap = sumBy(D.settings.classes || [], c => c.capacity);
  const since = addDays(D.today, -30), att = D.attendance.filter(a => a.date >= since);
  const attRate = att.length ? Math.round(att.filter(a => ['present', 'late'].includes(a.status)).length / att.length * 100) : null;
  const newM = D.students.filter(s => monthOf(s.join_date) === monthOf(D.today)).length;
  const left = D.students.filter(s => s.status === 'inactive').length;
  const out = [
    ['الطلاب المستمرون', act_.length, cap ? `من طاقة ${cap} مقعد (${Math.round(act_.length / cap * 100)}٪ إشغال)` : 'حدد سعة كل صف من الإعدادات لمعرفة نسبة الإشغال', cap && act_.length / cap < .7 ? 'warn' : 'ok'],
    ['التحقوا هذا الشهر', newM, 'هدف مقترح: 3 طلاب جدد شهرياً', newM >= 3 ? 'ok' : 'warn'],
    ['نسبة الحضور (30 يوماً)', attRate === null ? '—' : attRate + '٪', attRate === null ? 'سجّل الحضور يومياً لتظهر النسبة' : attRate < 85 ? 'أقل من 85٪: تواصل مع أهالي كثيري الغياب' : 'ممتازة', attRate !== null && attRate < 85 ? 'warn' : 'ok'],
    ['المنقطعون', left, D.students.length ? `${Math.round(left / D.students.length * 100)}٪ من كل المسجلين — اسأل عن سبب الانقطاع` : '', left ? 'warn' : 'ok'],
  ];
  if (canFin()) {
    const b = D.students.map(bal), due = sumBy(b, x => x.totalDue), paid = sumBy(b, x => x.paid);
    const lm = prevMonth(monthOf(D.today)), f = monthFin(lm);
    out.push(['نسبة التحصيل', (due ? Math.round(paid / due * 100) : 100) + '٪', paid < due ? `المتأخر ${fmt(due - paid)} ${cur()}` : 'لا متأخرات', due && paid / due < .9 ? 'warn' : 'ok']);
    if (act_.length) out.push(['ربح الطالب الواحد شهرياً', fmt((f.inc - f.out) / act_.length), `في ${monthName(lm)}: إيراد الطالب ${fmt(f.inc / act_.length)} − تكلفته ${fmt(f.out / act_.length)}`, f.inc >= f.out ? 'ok' : 'bad']);
  }
  return out;
}
VIEWS.develop = () => {
  const items = D.improvements || [];
  const open_ = items.filter(x => x.status !== 'done');
  UI.ideaArea ||= AREAS[0];
  const card = x => { const pr = PRIO[x.priority] || PRIO.mid; const nx = { idea: 'doing', doing: 'done' }[x.status];
    return `<div class="imp-card"><div class="imp-top"><b>${esc(x.title)}</b><span class="tag ${pr[1]}">${pr[0]}</span></div>
      <div class="muted">${esc(x.area || '')}${x.cost ? ` · ${money(x.cost)}` : ''}${x.due ? ` · قبل ${esc(fmtDate(x.due))}` : ''}${x.owner ? ` · ${esc(x.owner)}` : ''}</div>
      ${x.note ? `<p class="imp-note">${esc(x.note)}</p>` : ''}
      <div class="actions">${nx ? `<button class="btn sm primary" onclick="impMove('${x.id}','${nx}')">${nx === 'doing' ? 'ابدأ التنفيذ ←' : 'تم ✓'}</button>` : `<span class="muted">${x.doneDate ? 'أُنجز ' + esc(fmtDate(x.doneDate)) : ''}</span>`}
      ${x.status === 'done' && x.cost && can('finance') ? `<button class="btn sm" onclick="expenseForm({title:'${esc(x.title).replace(/'/g, '')}',amount:${N(x.cost)},note:'من خطة التطوير'})">سجّل التكلفة كمصروف</button>` : ''}
      <button class="btn sm ghost" onclick="impForm('${x.id}')">تعديل</button><button class="btn sm danger" onclick="del('improvements','${x.id}','هذه الفكرة')">حذف</button></div></div>`; };
  return `<div class="head"><div><h1>التطوير</h1><p>مؤشرات الأداء وخطة تطوير العمل والمكان</p></div>
    <div class="actions"><button class="btn primary" onclick="impForm()">+ فكرة تطوير</button></div></div>
  <section class="panel"><h2>مؤشرات الأداء</h2><div class="kpis">${kpis().map(([t, v, h, c]) => `<div class="kpi ${c}"><span>${t}</span><b>${v}</b><small>${esc(h)}</small></div>`).join('')}</div></section>
  <section class="panel"><h2>خطة التطوير <span class="muted">${open_.length} مفتوحة${sumBy(open_, x => x.cost) ? ` · الميزانية التقديرية ${fmt(sumBy(open_, x => x.cost))} ${cur()}` : ''}</span></h2>
    <div class="kanban">${IMP_STATUS.map(([k, l]) => { const xs = items.filter(x => (x.status || 'idea') === k).sort((a, b) => ['high', 'mid', 'low'].indexOf(a.priority) - ['high', 'mid', 'low'].indexOf(b.priority));
      return `<div class="kcol"><h3>${l} <span class="tag mute">${xs.length}</span></h3>${xs.map(card).join('') || '<p class="empty">لا يوجد</p>'}</div>`; }).join('')}</div></section>
  <section class="panel"><h2>💡 أفكار مقترحة لتطوير الروضة <span class="muted">اضغط "أضف للخطة" لنقل الفكرة إلى خطتك وتعديلها</span></h2>
    <div class="tabs" role="tablist">${AREAS.map(a => `<button role="tab" aria-selected="${UI.ideaArea === a}" onclick="UI.ideaArea='${a}';render()">${a}</button>`).join('')}</div>
    ${IDEAS.filter(i => i[0] === UI.ideaArea).map(([a, t, d, c], i) => { const has = items.some(x => x.title === t);
      return `<div class="list-row"><div><b>${t}</b><div class="muted">${d}${c ? ` · تكلفة تقديرية ${money(c)}` : ' · بدون تكلفة تقريباً'}</div></div>
      ${has ? '<span class="tag ok">في الخطة ✓</span>' : `<button class="btn sm primary" onclick="addIdea(${IDEAS.findIndex(x => x[1] === t)})">أضف للخطة</button>`}</div>`; }).join('')}
    <p class="muted">التكاليف تقديرية بالريال للتوجيه فقط.</p></section>`;
};
async function addIdea(i) { const [area, title, note, cost] = IDEAS[i]; await act('POST', '/api/improvements', { area, title, note, cost, status: 'idea', priority: 'mid' }, 'أُضيفت للخطة'); }
async function impMove(id, status) { await act('PUT', `/api/improvements/${id}`, { status }, status === 'done' ? 'أحسنت! تم الإنجاز 🎉' : 'بدأ التنفيذ'); }
function impForm(id) {
  const x = id ? D.improvements.find(i => i.id === id) : { status: 'idea', priority: 'mid', area: AREAS[0] };
  modal(`<h2>${id ? 'تعديل فكرة التطوير' : 'فكرة تطوير جديدة'}</h2><div class="grid g2">
    <label class="f" style="grid-column:1/-1">العنوان *<input name="title" required value="${esc(x.title || '')}" placeholder="مثال: تظليل الساحة"></label>
    <label class="f">المجال<select name="area">${AREAS.map(a => `<option ${a === x.area ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
    <label class="f">الحالة<select name="status">${IMP_STATUS.map(([k, l]) => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">الأولوية<select name="priority">${Object.entries(PRIO).map(([k, [l]]) => `<option value="${k}" ${k === x.priority ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f">التكلفة التقديرية<input type="number" min="0" step="any" name="cost" value="${x.cost || ''}"></label>
    <label class="f">الموعد المستهدف<input type="date" name="due" value="${esc(x.due || '')}"></label>
    <label class="f">المسؤول<input name="owner" value="${esc(x.owner || '')}" list="staff-list"><datalist id="staff-list">${D.staff.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist></label>
    <label class="f" style="grid-column:1/-1">تفاصيل<textarea name="note">${esc(x.note || '')}</textarea></label></div>
    <div class="modal-actions"><button class="btn primary" value="ok">حفظ</button><button class="btn" value="cancel" formnovalidate>إلغاء</button></div>`,
    async data => !!(await act(id ? 'PUT' : 'POST', id ? `/api/improvements/${id}` : '/api/improvements', data, 'تم الحفظ')));
}

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
