const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const Finance = require('./shared/finance');

const app = express();
app.use(express.json({ limit: '5mb' }));

// ====== الإعدادات من متغيرات البيئة ======
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ متغير MONGO_URI غير موجود. أضفه في إعدادات Render > Environment');
  process.exit(1);
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const INITIAL_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(async () => { console.log('✅ MongoDB متصل'); await migrate(); })
  .catch(err => console.error('❌ خطأ في الاتصال:', err.message));

// ====== النماذج ======
const S = mongoose.Schema;
const opt = { timestamps: true };

const Settings = mongoose.model('Settings', new S({
  key: { type: String, default: 'main', unique: true },
  schoolName: { type: String, default: 'روضة نور ومكة' },
  phone: String, address: String, vatNumber: String,
  currency: { type: String, default: 'ر.س' },
  halfMonthAfterDay: { type: Number, default: 10 },
  classes: [{ name: String, teacher: String, capacity: Number, tracks: [String] }], // tracks: مستويات الخطة الدراسية للصف
  partners: { type: [{ name: String, share: Number }], default: [{ name: 'احمد', share: 50 }, { name: 'عبدالله', share: 50 }] },
  expenseCategories: { type: [String], default: ['رواتب', 'إيجار', 'شراء كتب', 'كهرباء وماء', 'أدوات تعليمية', 'صيانة', 'مواصلات', 'أخرى'] },
  passwordHash: String,
  receiptCounter: { type: Number, default: 1000 },
  migrations: [String],
  appearance: { type: S.Types.Mixed, default: {} },
  openingCash: { type: Number, default: 0 }, // رصيد الصندوق الافتتاحي
  academic: { start: { type: String, default: '2026-09-06' }, weeks: { type: Number, default: 34 } }, // أول أحد في العام الدراسي وعدد أسابيع الدراسة // الألوان والخط والوضع الليلي وأرقام نسخ الصور
}, opt));

// ====== القسم التعليمي ======
// إنجاز المعلم لمهمة اليوم (مادة واحدة لمستوى واحد في يوم واحد)
const TeachLog = mongoose.model('TeachLog', new S({ date: { type: String, index: true }, track: String, subject: String, done: Boolean, note: String }, opt));
// تعديل موضوع أسبوع في الخطة (يتقدم على الخطة المقترحة في shared/curriculum.js)
// تقييم طالب: درجة الامتحان الأسبوعي ومستواه في مادة لأسبوع معيّن
const Assessment = mongoose.model('Assessment', new S({ studentId: { type: String, index: true }, track: String, subject: String, week: Number,
  score: Number, max: { type: Number, default: 10 }, level: String, note: String, date: String }, opt));
const PlanEdit = mongoose.model('PlanEdit', new S({ track: String, subject: String, week: Number, topic: String }, opt));

// ====== المستخدمون والصلاحيات ======
// المدير يدخل بكلمة المرور الرئيسية (ADMIN_PASSWORD) وله كل الصلاحيات. بقية الأفراد حسابات يضيفها المدير بصلاحيات محددة.
const PERMS = ['attendance', 'students', 'teach', 'finance', 'reports', 'staff', 'comms', 'develop', 'settings', 'delete'];
// ====== الحسابات والتطوير ======
// إيرادات أخرى غير الرسوم والكتب (تسجيل، فعاليات، مواصلات، تبرع…)
const Income = mongoose.model('Income', new S({ id: { type: String, index: true }, title: String, category: String, amount: Number, date: String, method: String, note: String }, opt));
// مسحوبات الشركاء من الأرباح
const Draw = mongoose.model('Draw', new S({ id: { type: String, index: true }, partner: String, amount: Number, date: String, note: String }, opt));
// خطة تطوير العمل والمكان
const Improvement = mongoose.model('Improvement', new S({ id: { type: String, index: true }, title: String, area: String, status: { type: String, default: 'idea' },
  priority: { type: String, default: 'mid' }, cost: Number, due: String, owner: String, note: String, doneDate: String }, opt));
const User = mongoose.model('User', new S({ id: { type: String, unique: true }, name: String, username: { type: String, unique: true },
  passwordHash: String, perms: [String], active: { type: Boolean, default: true } }, opt));

// صور الموقع (الشعار، صورة الرئيسية، خلفية الدخول) — تُخزَّن في القاعدة حتى لا تضيع مع إعادة النشر
const IMAGE_KEYS = ['logo', 'banner', 'loginBg'];
const Asset = mongoose.model('Asset', new S({ key: { type: String, unique: true }, mime: String, data: Buffer }, opt));

const Student = mongoose.model('Student', new S({
  id: { type: String, index: true },
  name: String, grade: String, gender: String, birth_date: String,
  parent_name: String, parent_phone: String, parent_phone2: String,
  join_date: String, monthlyFee: String, discount: { type: String, default: '0' },
  oneTimeDiscount: { type: String, default: '0' }, oneTimeDiscountNote: String,
  paid: { type: String, default: '0' }, // قديم — للترحيل فقط
  status: { type: String, default: 'active' }, inactive_date: String,
  allergies: String, medical_notes: String, emergency_contact: String, authorized_pickup: String,
  notes: String, portalToken: String,
  level: String, // مستوى الطالب في الخطة الدراسية عند وجود أكثر من مستوى في الصف (مثل kg1 / kg2)
}, opt));

const Payment = mongoose.model('Payment', new S({
  id: String, receiptNo: Number, studentId: String, studentName: String,
  amount: Number, method: { type: String, default: 'نقدي' }, note: String, date: String,
}, opt));

const Expense = mongoose.model('Expense', new S({
  id: String, title: String, category: { type: String, default: 'أخرى' },
  amount: Number, date: String, note: String, staffId: String, month: String,
}, opt));

const Attendance = mongoose.model('Attendance', new S({
  studentId: { type: String, index: true }, status: String, date: { type: String, index: true },
  time: String, checkIn: String, checkOut: String, pickedUpBy: String, note: String,
}, opt));

const Book = mongoose.model('Book', new S({
  id: String, studentId: String, studentName: String, title: String, price: String, date: String,
  // سداد ثمن الكتاب منفصل عن الرسوم: كل دفعة بتاريخها حتى تُحسب في شهرها
  pays: [{ amount: Number, date: String, method: String }],
  paidAmount: { type: Number, default: 0 }, paid: { type: Boolean, default: false }, paidDate: String,
}, opt));

const Staff = mongoose.model('Staff', new S({
  id: String, name: String, role: String, phone: String, salary: Number,
  join_date: String, status: { type: String, default: 'active' }, classes: String, notes: String,
}, opt));

const Note = mongoose.model('Note', new S({
  id: String, studentId: String, date: String,
  type: { type: String, default: 'عام' }, // سلوك، وجبات، نوم، تعلّم، صحة، عام
  text: String, mood: String, shared: { type: Boolean, default: true },
}, opt));

const Announcement = mongoose.model('Announcement', new S({
  id: String, title: String, body: String, date: String, eventDate: String,
  audience: { type: String, default: 'all' }, // all أو اسم صف
}, opt));

// ====== أدوات ======
const newId = () => Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().split('T')[0]; // توقيت السعودية
const nowTime = () => new Date().toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' });
const token = () => crypto.randomBytes(12).toString('base64url');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}
async function getSettings() {
  let s = await Settings.findOne({ key: 'main' });
  if (!s) s = await Settings.create({ key: 'main', passwordHash: hashPassword(INITIAL_PASSWORD) });
  if (!s.passwordHash) { s.passwordHash = hashPassword(INITIAL_PASSWORD); await s.save(); }
  return s;
}
async function nextReceiptNo() {
  const s = await Settings.findOneAndUpdate({ key: 'main' }, { $inc: { receiptCounter: 1 } }, { new: true, upsert: true });
  return s.receiptCounter;
}

// جلسة موقّعة في كوكي (بدون مكتبات إضافية)
function sign(v) { return crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url'); }
function makeSession(uid = 'admin') {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const v = `${uid}.${exp}`;
  return `${v}.${sign(v)}`;
}
// يعيد هوية صاحب الجلسة ('admin' أو 'u-<id>') أو null
function validSession(cookie) {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const v = `${parts[0]}.${parts[1]}`;
  const good = sign(v);
  if (good.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(parts[2]))) return null;
  return Number(parts[1]) > Date.now() ? parts[0] : null;
}
function readCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
const isSecure = req => req.headers['x-forwarded-proto'] === 'https';
async function requireAuth(req, res, next) {
  const uid = validSession(readCookie(req, 'sid'));
  try {
    if (uid === 'admin') { req.user = { admin: true, name: 'المدير', perms: PERMS }; return next(); }
    if (uid && uid.startsWith('u-')) {
      const u = await User.findOne({ id: uid.slice(2), active: true });
      if (u) { req.user = { admin: false, id: u.id, name: u.name, username: u.username, perms: u.perms || [] }; return next(); }
    }
  } catch (e) { return next(e); }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  return res.redirect('/login');
}
const can = (req, p) => req.user && (req.user.admin || req.user.perms.includes(p));
// الصلاحية المطلوبة لكل مسار. الحذف (DELETE) يحتاج صلاحية "الحذف" بالإضافة لصلاحية القسم.
const RULES = [
  [/^\/(updates|api\/dev|api\/users|api\/backup|api\/settings\/password|api\/draws)/, 'admin'],
  [/^\/api\/incomes/, 'finance'], [/^\/api\/improvements/, 'develop'],
  [/^\/api\/students/, 'students'], [/^\/api\/(payments|expenses|books)/, 'finance'], [/^\/api\/attendance/, 'attendance'],
  [/^\/api\/staff/, 'staff'], [/^\/api\/(notes|announcements)/, 'comms'],
  [/^\/api\/(teach|assessments|plan|academic)/, 'teach'], [/^\/api\/(settings|appearance|assets)/, 'settings'],
];
function permGuard(req, res, next) {
  if (req.user.admin) return next();
  const rule = RULES.find(([re]) => re.test(req.path));
  const deny = msg => req.path.startsWith('/api/') ? res.status(403).json({ error: msg }) : res.redirect('/');
  if (rule && (rule[1] === 'admin' || !can(req, rule[1]))) return deny('ليس لديك صلاحية لهذا القسم. اطلبها من المدير');
  if (req.method === 'DELETE' && !req.path.startsWith('/api/assets') && !can(req, 'delete')) return deny('ليس لديك صلاحية الحذف. اطلبها من المدير');
  next();
}
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// محاولات الدخول: حد بسيط لمنع التخمين
const attempts = new Map();
function tooMany(ip) {
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60 * 1000) { a.n = 0; a.t = Date.now(); }
  return a;
}

// ====== ترحيل البيانات القديمة ======
async function migrate() {
  await Settings.updateOne({ key: 'main', expenseCategories: { $ne: 'شراء كتب' } }, { $push: { expenseCategories: { $each: ['شراء كتب'], $position: 2 } } });
  const s = await getSettings();
  if (!s.migrations.includes('v2-payments')) {
    const students = await Student.find();
    for (const st of students) {
      // ربط الدفعات القديمة بالطالب عن طريق الاسم
      await Payment.updateMany({ studentId: { $in: [null, ''] }, studentName: st.name }, { $set: { studentId: st.id } });
      const pays = await Payment.find({ studentId: st.id });
      const sum = pays.reduce((a, p) => a + (p.amount || 0), 0);
      const legacy = parseFloat(st.paid) || 0;
      if (legacy > sum) {
        await Payment.create({ id: newId(), receiptNo: await nextReceiptNo(), studentId: st.id, studentName: st.name,
          amount: legacy - sum, method: 'رصيد سابق', note: 'ترحيل من النظام القديم', date: st.join_date || today() });
      }
      if (!st.portalToken) st.portalToken = token();
      if (st.grade) st.grade = st.grade.trim();
      await st.save();
    }
    // أرقام إيصالات للدفعات القديمة
    for (const p of await Payment.find({ receiptNo: null })) { p.receiptNo = await nextReceiptNo(); await p.save(); }
    // الصفوف من بيانات الطلاب
    const grades = [...new Set(students.map(x => (x.grade || '').trim()).filter(Boolean))];
    for (const g of grades) if (!s.classes.find(c => c.name === g)) s.classes.push({ name: g });
    s.migrations.push('v2-payments');
    await s.save();
    console.log('✅ تم ترحيل البيانات إلى الإصدار الثاني');
  }
}

// ====== الصفحات العامة ======
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use('/assets', express.static(path.join(__dirname, 'public')));
// تطبيق قابل للتثبيت (PWA): عامل الخدمة يجب أن يُقدَّم من الجذر
app.get('/sw.js', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'public', 'sw.js')); });
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/p/:token', (req, res) => res.sendFile(path.join(__dirname, 'views', 'portal.html')));
app.get('/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

// المظهر والصور: عامة لأن صفحة الدخول وبوابة ولي الأمر تحتاجها
app.get('/api/appearance', wrap(async (req, res) => {
  const s = await getSettings();
  res.json({ ...(s.appearance || {}), schoolName: s.schoolName });
}));
app.get('/img/:key', wrap(async (req, res) => {
  if (!IMAGE_KEYS.includes(req.params.key)) return res.sendStatus(404);
  const a = await Asset.findOne({ key: req.params.key });
  if (!a) return res.sendStatus(404);
  res.setHeader('Content-Type', a.mime); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // الرابط يتغير مع كل رفع (?v=)
  res.send(a.data);
}));

app.post('/api/login', wrap(async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const a = tooMany(ip);
  if (a.n >= 10) return res.status(429).json({ error: 'محاولات كثيرة، حاول بعد 15 دقيقة' });
  const username = String(req.body.username || '').trim().toLowerCase();
  const pw = String(req.body.password || '');
  let uid = null;
  if (!username || ['admin', 'المدير', 'مدير'].includes(username)) {
    const s = await getSettings();
    if (checkPassword(pw, s.passwordHash)) uid = 'admin';
  } else {
    const u = await User.findOne({ username, active: true });
    if (u && checkPassword(pw, u.passwordHash)) uid = 'u-' + u.id;
  }
  if (!uid) {
    a.n++; attempts.set(ip, a);
    return res.status(401).json({ error: username ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'كلمة المرور غير صحيحة' });
  }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', `sid=${makeSession(uid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${isSecure(req) ? '; Secure' : ''}`);
  res.json({ ok: true });
}));
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'sid=; Path=/; HttpOnly; Max-Age=0');
  res.json({ ok: true });
});

// بوابة ولي الأمر (قراءة فقط عبر رابط خاص)
app.get('/api/portal/:token', wrap(async (req, res) => {
  const st = await Student.findOne({ portalToken: req.params.token });
  if (!st || !req.params.token) return res.status(404).json({ error: 'الرابط غير صالح' });
  const s = await getSettings();
  const [payments, books, attendance, notes, ann, grades] = await Promise.all([
    Payment.find({ studentId: st.id }).sort({ date: -1 }),
    Book.find({ studentId: st.id }),
    Attendance.find({ studentId: st.id }).sort({ date: -1 }).limit(60),
    Note.find({ studentId: st.id, shared: true }).sort({ date: -1, createdAt: -1 }).limit(30),
    Announcement.find({ audience: { $in: ['all', st.grade] } }).sort({ date: -1 }).limit(10),
    Assessment.find({ studentId: st.id }).sort({ week: -1 }).limit(40),
  ]);
  const bal = Finance.studentBalance(st, payments, books, { halfMonthAfterDay: s.halfMonthAfterDay });
  res.json({
    school: { name: s.schoolName, phone: s.phone, currency: s.currency },
    student: { name: st.name, grade: st.grade, join_date: st.join_date, status: st.status },
    balance: bal,
    payments: payments.map(p => ({ receiptNo: p.receiptNo, amount: p.amount, date: p.date, method: p.method })),
    books: books.map(b => ({ title: b.title, price: b.price, date: b.date, paid: !!b.paid, paidAmount: b.paidAmount || 0 })),
    attendance: attendance.map(a => ({ date: a.date, status: a.status, checkIn: a.checkIn, checkOut: a.checkOut })),
    notes: notes.map(n => ({ date: n.date, type: n.type, text: n.text, mood: n.mood })),
    announcements: ann.map(a => ({ title: a.title, body: a.body, date: a.date, eventDate: a.eventDate })),
    grades: grades.map(g => ({ subject: g.subject, week: g.week, score: g.score, max: g.max, level: g.level, note: g.note })),
  });
}));

// ====== كل ما بعد هذا يحتاج تسجيل دخول ======
app.use(requireAuth);
app.use(permGuard);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));

// ---- المستخدمون (للمدير فقط — محمي في permGuard) ----
const userOut = u => ({ id: u.id, name: u.name, username: u.username, perms: u.perms, active: u.active, createdAt: u.createdAt });
const cleanPerms = p => (Array.isArray(p) ? p : []).filter(x => PERMS.includes(x));
app.get('/api/users', wrap(async (req, res) => res.json((await User.find().sort({ createdAt: 1 })).map(userOut))));
app.post('/api/users', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim(), username = String(req.body.username || '').trim().toLowerCase(), pw = String(req.body.password || '');
  if (!name || !username) return res.status(400).json({ error: 'الاسم واسم المستخدم مطلوبان' });
  if (!/^[a-z0-9_.\u0600-\u06ff-]{3,30}$/.test(username) || ['admin', 'المدير', 'مدير'].includes(username)) return res.status(400).json({ error: 'اسم المستخدم غير صالح (3 أحرف على الأقل، بدون مسافات)' });
  if (pw.length < 6) return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' });
  if (await User.findOne({ username })) return res.status(400).json({ error: 'اسم المستخدم مستعمل، اختر اسماً آخر' });
  const u = await User.create({ id: newId(), name, username, passwordHash: hashPassword(pw), perms: cleanPerms(req.body.perms), active: req.body.active !== false });
  res.json(userOut(u));
}));
app.put('/api/users/:id', wrap(async (req, res) => {
  const u = await User.findOne({ id: req.params.id });
  if (!u) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if ('name' in req.body) u.name = String(req.body.name).trim() || u.name;
  if ('perms' in req.body) u.perms = cleanPerms(req.body.perms);
  if ('active' in req.body) u.active = !!req.body.active;
  if (req.body.password) {
    if (String(req.body.password).length < 6) return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' });
    u.passwordHash = hashPassword(String(req.body.password));
  }
  await u.save(); res.json(userOut(u));
}));
app.delete('/api/users/:id', wrap(async (req, res) => { await User.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));
// تغيير كلمة مرور المستخدم لنفسه
app.put('/api/me/password', wrap(async (req, res) => {
  if (req.user.admin) return res.status(400).json({ error: 'المدير يغيّر كلمة المرور من الإعدادات' });
  const u = await User.findOne({ id: req.user.id });
  if (!checkPassword(String(req.body.current || ''), u.passwordHash)) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  if (String(req.body.next || '').length < 6) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  u.passwordHash = hashPassword(String(req.body.next)); await u.save();
  res.json({ ok: true });
}));

// تعديل البرنامج من الداخل عبر Claude (صفحة /updates)
require('./dev')(app, wrap, newId, today);

// تحميل كل البيانات دفعة واحدة
app.get('/api/all', wrap(async (req, res) => {
  const s = await getSettings();
  const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const [students, payments, expenses, attendance, books, staff, notes, announcements, teachLogs, planEdits, assessments, incomes, draws, improvements] = await Promise.all([
    Student.find().sort({ name: 1 }), Payment.find().sort({ date: -1, createdAt: -1 }),
    Expense.find().sort({ date: -1, createdAt: -1 }),
    Attendance.find({ date: { $gte: new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10) } }),
    Book.find().sort({ date: -1 }), Staff.find().sort({ name: 1 }),
    Note.find().sort({ date: -1, createdAt: -1 }).limit(500), Announcement.find().sort({ date: -1 }),
    TeachLog.find({ date: { $gte: since } }), PlanEdit.find(), Assessment.find(),
    Income.find().sort({ date: -1 }), Draw.find().sort({ date: -1 }), Improvement.find().sort({ createdAt: 1 }),
  ]);
  const settings = s.toObject(); delete settings.passwordHash;
  const me = { admin: req.user.admin, name: req.user.name, username: req.user.username || 'admin', perms: req.user.perms };
  // من لا يملك صلاحية المالية أو التقارير لا تصله المبالغ
  const fin = can(req, 'finance') || can(req, 'reports');
  const MONEY = ['monthlyFee', 'discount', 'oneTimeDiscount', 'oneTimeDiscountNote', 'paid'];
  const studs = fin ? students : students.map(x => { const o = x.toObject(); MONEY.forEach(k => delete o[k]); return o; });
  if (!fin) { delete settings.partners; delete settings.openingCash; }
  res.json({ me, settings, students: studs, payments: fin ? payments : [], expenses: fin ? expenses : [], books: fin ? books : [],
    attendance, staff: can(req, 'staff') ? staff : staff.map(x => ({ id: x.id, name: x.name, role: x.role })),
    notes, announcements, teachLogs, planEdits, assessments, today: today(),
    incomes: fin ? incomes : [], draws: fin ? draws : [], improvements: can(req, 'develop') ? improvements : [] });
}));

// ---- التعليم ----
app.post('/api/teach/log', wrap(async (req, res) => {
  const { date, track, subject } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !track || !subject) return res.status(400).json({ error: 'بيانات المهمة ناقصة' });
  const set = {};
  if (typeof req.body.done === 'boolean') set.done = req.body.done;
  if (typeof req.body.note === 'string') set.note = req.body.note.slice(0, 500);
  const doc = await TeachLog.findOneAndUpdate({ date, track, subject }, { $set: set }, { upsert: true, new: true });
  res.json(doc);
}));
app.post('/api/assessments', wrap(async (req, res) => {
  const { track, subject } = req.body, week = parseInt(req.body.week), rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!track || !subject || !(week >= 1)) return res.status(400).json({ error: 'بيانات ناقصة' });
  for (const r of rows) {
    if (!r.studentId) continue;
    const score = r.score === '' || r.score === null || r.score === undefined ? null : parseFloat(r.score);
    if ((score === null || isNaN(score)) && !r.level && !r.note) { await Assessment.deleteOne({ studentId: r.studentId, track, subject, week }); continue; }
    await Assessment.updateOne({ studentId: r.studentId, track, subject, week },
      { $set: { score: isNaN(score) ? null : score, max: parseFloat(r.max) || 10, level: r.level || '', note: String(r.note || '').slice(0, 300), date: today() } }, { upsert: true });
  }
  res.json({ ok: true });
}));
app.delete('/api/assessments/:id', wrap(async (req, res) => { if (mongoose.isValidObjectId(req.params.id)) await Assessment.deleteOne({ _id: req.params.id }); res.json({ ok: true }); }));
app.put('/api/plan/edit', wrap(async (req, res) => {
  const { track, subject } = req.body, week = parseInt(req.body.week);
  if (!track || !subject || !(week >= 1)) return res.status(400).json({ error: 'بيانات ناقصة' });
  const topic = String(req.body.topic || '').trim();
  if (!topic) { await PlanEdit.deleteOne({ track, subject, week }); return res.json({ ok: true, reset: true }); }
  res.json(await PlanEdit.findOneAndUpdate({ track, subject, week }, { $set: { topic: topic.slice(0, 300) } }, { upsert: true, new: true }));
}));
app.put('/api/academic', wrap(async (req, res) => {
  const s = await getSettings();
  const start = String(req.body.start || ''), weeks = parseInt(req.body.weeks);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return res.status(400).json({ error: 'تاريخ غير صالح' });
  s.academic = { start, weeks: weeks >= 10 && weeks <= 52 ? weeks : 34 }; await s.save();
  res.json(s.academic);
}));

// ---- المظهر ----
const PALETTE_IDS = ['palm', 'blue', 'teal', 'purple', 'pink', 'orange', 'slate', 'custom'];
const isColor = c => /^#[0-9a-fA-F]{6}$/.test(String(c || ''));
app.put('/api/appearance', wrap(async (req, res) => {
  const s = await getSettings();
  const cur = { ...(s.appearance || {}) }, b = req.body || {};
  if (PALETTE_IDS.includes(b.palette)) cur.palette = b.palette;
  if (isColor(b.primary)) cur.primary = b.primary;
  if (isColor(b.accent)) cur.accent = b.accent;
  if (['normal', 'large', 'xlarge', 'huge'].includes(b.size)) cur.size = b.size;
  if (['plex', 'tajawal', 'cairo', 'almarai', 'noto'].includes(b.font)) cur.font = b.font;
  if (typeof b.dark === 'boolean') cur.dark = b.dark;
  if (b.reset) { Object.keys(cur).forEach(k => k !== 'images' && delete cur[k]); }
  s.appearance = cur; s.markModified('appearance'); await s.save();
  res.json(cur);
}));
app.post('/api/assets/:key', wrap(async (req, res) => {
  const key = req.params.key;
  if (!IMAGE_KEYS.includes(key)) return res.status(400).json({ error: 'نوع صورة غير معروف' });
  const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(String(req.body.dataUrl || ''));
  if (!m) return res.status(400).json({ error: 'الملف ليس صورة صالحة' });
  const data = Buffer.from(m[3], 'base64');
  if (data.length > 2.5 * 1024 * 1024) return res.status(400).json({ error: 'الصورة كبيرة جداً' });
  await Asset.updateOne({ key }, { $set: { key, mime: m[1], data } }, { upsert: true });
  const s = await getSettings();
  const ap = { ...(s.appearance || {}) }; ap.images = { ...(ap.images || {}), [key]: Date.now() };
  s.appearance = ap; s.markModified('appearance'); await s.save();
  res.json(ap);
}));
app.delete('/api/assets/:key', wrap(async (req, res) => {
  await Asset.deleteOne({ key: req.params.key });
  const s = await getSettings();
  const ap = { ...(s.appearance || {}) }; ap.images = { ...(ap.images || {}) }; delete ap.images[req.params.key];
  s.appearance = ap; s.markModified('appearance'); await s.save();
  res.json(ap);
}));

// ---- الإعدادات ----
app.put('/api/settings', wrap(async (req, res) => {
  const allowed = ['schoolName', 'phone', 'address', 'vatNumber', 'currency', 'halfMonthAfterDay', 'classes', 'expenseCategories', 'partners', 'openingCash'];
  const upd = {}; for (const k of allowed) if (k in req.body) upd[k] = req.body[k];
  if (!req.user.admin) { delete upd.partners; delete upd.openingCash; } // نسب الشركاء والرصيد الافتتاحي للمدير فقط
  if ('openingCash' in upd) upd.openingCash = parseFloat(upd.openingCash) || 0;
  await Settings.updateOne({ key: 'main' }, { $set: upd });
  res.json({ ok: true });
}));
app.put('/api/settings/password', wrap(async (req, res) => {
  const s = await getSettings();
  if (!checkPassword(String(req.body.current || ''), s.passwordHash)) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  if (String(req.body.next || '').length < 6) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  s.passwordHash = hashPassword(req.body.next); await s.save();
  res.json({ ok: true });
}));

// ---- الطلاب ----
const studentFields = ['level', 'name', 'grade', 'gender', 'birth_date', 'parent_name', 'parent_phone', 'parent_phone2', 'join_date',
  'monthlyFee', 'discount', 'oneTimeDiscount', 'oneTimeDiscountNote', 'allergies', 'medical_notes', 'emergency_contact', 'authorized_pickup', 'notes'];
const pick = (body, fields) => { const o = {}; for (const f of fields) if (f in body) o[f] = typeof body[f] === 'string' ? body[f].trim() : body[f]; return o; };

const MONEY_FIELDS = ['monthlyFee', 'discount', 'oneTimeDiscount', 'oneTimeDiscountNote'];
app.post('/api/students', wrap(async (req, res) => {
  const data = pick(req.body, studentFields);
  if (!can(req, 'finance')) { MONEY_FIELDS.forEach(k => delete data[k]); delete req.body.firstPayment; }
  if (!data.name) return res.status(400).json({ error: 'اسم الطالب مطلوب' });
  const st = await Student.create({ ...data, id: newId(), status: 'active', portalToken: token() });
  const first = parseFloat(req.body.firstPayment) || 0;
  let payment = null;
  if (first > 0) payment = await Payment.create({ id: newId(), receiptNo: await nextReceiptNo(), studentId: st.id, studentName: st.name, amount: first, method: req.body.method || 'نقدي', note: 'الدفعة الأولى', date: today() });
  res.json({ student: st, payment });
}));
app.put('/api/students/:id', wrap(async (req, res) => {
  const data = pick(req.body, studentFields);
  if (!can(req, 'finance')) MONEY_FIELDS.forEach(k => delete data[k]);
  await Student.updateOne({ id: req.params.id }, { $set: data });
  if (data.name) {
    await Payment.updateMany({ studentId: req.params.id }, { $set: { studentName: data.name } });
    await Book.updateMany({ studentId: req.params.id }, { $set: { studentName: data.name } });
  }
  res.json({ ok: true });
}));
app.put('/api/students/:id/status', wrap(async (req, res) => {
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  await Student.updateOne({ id: req.params.id }, { $set: { status, inactive_date: status === 'inactive' ? (req.body.date || today()) : null } });
  res.json({ ok: true });
}));
app.put('/api/students/:id/portal', wrap(async (req, res) => {
  const t = token();
  await Student.updateOne({ id: req.params.id }, { $set: { portalToken: t } });
  res.json({ portalToken: t });
}));
app.delete('/api/students/:id', wrap(async (req, res) => {
  const id = req.params.id;
  await Promise.all([Student.deleteOne({ id }), Payment.deleteMany({ studentId: id }), Book.deleteMany({ studentId: id }),
    Attendance.deleteMany({ studentId: id }), Note.deleteMany({ studentId: id }), Assessment.deleteMany({ studentId: id })]);
  res.json({ ok: true });
}));

// ---- المدفوعات ----
app.post('/api/payments', wrap(async (req, res) => {
  const st = await Student.findOne({ id: req.body.studentId });
  const amount = parseFloat(req.body.amount);
  if (!st || !(amount > 0)) return res.status(400).json({ error: 'اختر الطالب واكتب مبلغاً صحيحاً' });
  const p = await Payment.create({ id: newId(), receiptNo: await nextReceiptNo(), studentId: st.id, studentName: st.name,
    amount, method: req.body.method || 'نقدي', note: req.body.note || '', date: req.body.date || today() });
  res.json(p);
}));
app.delete('/api/payments/:id', wrap(async (req, res) => { await Payment.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- المصروفات ----
app.post('/api/expenses', wrap(async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!req.body.title || !(amount > 0)) return res.status(400).json({ error: 'اكتب البند والمبلغ' });
  const e = await Expense.create({ id: newId(), ...pick(req.body, ['title', 'category', 'date', 'note', 'staffId', 'month']), amount, date: req.body.date || today() });
  res.json(e);
}));
app.delete('/api/expenses/:id', wrap(async (req, res) => { await Expense.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- الكتب ----
app.post('/api/books', wrap(async (req, res) => {
  const st = await Student.findOne({ id: req.body.studentId });
  if (!st || !req.body.title) return res.status(400).json({ error: 'اختر الطالب واكتب اسم الكتاب' });
  const price = parseFloat(req.body.price) || 0;
  // paid: 'yes' سدّد كاملاً | 'no' لم يسدّد | 'part' سدّد جزءاً (paidAmount)
  const paidAmount = req.body.paid === 'yes' ? price : req.body.paid === 'part' ? Math.min(price, Math.max(0, parseFloat(req.body.paidAmount) || 0)) : 0;
  const date = req.body.date || today();
  const b = await Book.create({ id: newId(), studentId: st.id, studentName: st.name, title: String(req.body.title).trim(), price: String(price), date,
    pays: paidAmount > 0 ? [{ amount: paidAmount, date, method: req.body.method || 'نقدي' }] : [],
    paidAmount, paid: paidAmount >= price && price > 0, paidDate: paidAmount > 0 ? date : null });
  res.json(b);
}));
// سداد ثمن كتاب: amount = مبلغ مدفوع الآن (بدونه = سداد الباقي كاملاً)، unpay = إلغاء السداد
app.put('/api/books/:id/pay', wrap(async (req, res) => {
  const b = await Book.findOne({ id: req.params.id });
  if (!b) return res.status(404).json({ error: 'الكتاب غير موجود' });
  const price = parseFloat(b.price) || 0;
  if (req.body.unpay) b.pays = [];
  else {
    const left = price - (b.paidAmount || 0);
    const add = Math.min(left, req.body.amount !== undefined ? parseFloat(req.body.amount) : left);
    if (!(add > 0)) return res.status(400).json({ error: left > 0 ? 'اكتب مبلغاً صحيحاً' : 'هذا الكتاب مسدّد بالكامل' });
    b.pays.push({ amount: add, date: req.body.date || today(), method: req.body.method || 'نقدي' });
  }
  b.paidAmount = b.pays.reduce((a, p) => a + (p.amount || 0), 0);
  b.paid = b.paidAmount >= price && price > 0;
  b.paidDate = b.pays.length ? b.pays[b.pays.length - 1].date : null;
  await b.save();
  res.json(b);
}));
app.delete('/api/books/:id', wrap(async (req, res) => { await Book.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- الحضور ----
// body: { studentId, status: present|absent|late|excused|clear, date?, checkOut?, pickedUpBy? }
app.post('/api/attendance', wrap(async (req, res) => {
  const { studentId, status } = req.body;
  const date = req.body.date || today();
  if (status === 'clear') { await Attendance.deleteOne({ studentId, date }); return res.json({ ok: true }); }
  const existing = await Attendance.findOne({ studentId, date });
  const t = nowTime();
  if (req.body.checkOut) {
    if (!existing) return res.status(400).json({ error: 'سجّل حضور الطالب أولاً' });
    existing.checkOut = t; existing.pickedUpBy = req.body.pickedUpBy || ''; await existing.save();
    return res.json(existing);
  }
  const doc = existing || new Attendance({ studentId, date });
  doc.status = status;
  if (status === 'present' || status === 'late') { if (!doc.checkIn) doc.checkIn = t; }
  else { doc.checkIn = ''; doc.checkOut = ''; }
  doc.time = t; doc.note = req.body.note || doc.note;
  await doc.save();
  res.json(doc);
}));
app.post('/api/attendance/bulk', wrap(async (req, res) => {
  const date = req.body.date || today();
  const t = nowTime();
  const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
  for (const studentId of ids) {
    const ex = await Attendance.findOne({ studentId, date });
    if (ex) continue; // لا نغيّر من سُجّل مسبقاً
    await Attendance.create({ studentId, date, status: req.body.status || 'present', checkIn: t, time: t });
  }
  res.json({ ok: true });
}));

// ---- الموظفون ----
const staffFields = ['name', 'role', 'phone', 'salary', 'join_date', 'status', 'classes', 'notes'];
app.post('/api/staff', wrap(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'اسم الموظف مطلوب' });
  res.json(await Staff.create({ id: newId(), ...pick(req.body, staffFields) }));
}));
app.put('/api/staff/:id', wrap(async (req, res) => { await Staff.updateOne({ id: req.params.id }, { $set: pick(req.body, staffFields) }); res.json({ ok: true }); }));
app.delete('/api/staff/:id', wrap(async (req, res) => { await Staff.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));
app.post('/api/staff/:id/pay-salary', wrap(async (req, res) => {
  const st = await Staff.findOne({ id: req.params.id });
  if (!st) return res.status(404).json({ error: 'الموظف غير موجود' });
  const month = req.body.month || today().slice(0, 7);
  const dup = await Expense.findOne({ staffId: st.id, month });
  if (dup && !req.body.force) return res.status(409).json({ error: `راتب ${month} مسجّل مسبقاً لهذا الموظف` });
  const e = await Expense.create({ id: newId(), title: `راتب ${st.name} — ${month}`, category: 'رواتب', amount: parseFloat(req.body.amount) || st.salary || 0, date: today(), staffId: st.id, month });
  res.json(e);
}));

// ---- الملاحظات اليومية ----
app.post('/api/notes', wrap(async (req, res) => {
  const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds : [req.body.studentId];
  const out = [];
  for (const studentId of ids.filter(Boolean)) {
    out.push(await Note.create({ id: newId(), studentId, date: req.body.date || today(), type: req.body.type || 'عام', text: req.body.text, mood: req.body.mood || '', shared: req.body.shared !== false }));
  }
  res.json(out);
}));
app.delete('/api/notes/:id', wrap(async (req, res) => { await Note.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- الإعلانات والفعاليات ----
app.post('/api/announcements', wrap(async (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'عنوان الإعلان مطلوب' });
  res.json(await Announcement.create({ id: newId(), date: today(), ...pick(req.body, ['title', 'body', 'eventDate', 'audience']) }));
}));
app.delete('/api/announcements/:id', wrap(async (req, res) => { await Announcement.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- إيرادات أخرى ومسحوبات الشركاء ----
app.post('/api/incomes', wrap(async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!req.body.title || !(amount > 0)) return res.status(400).json({ error: 'اكتب البيان والمبلغ' });
  res.json(await Income.create({ id: newId(), ...pick(req.body, ['title', 'category', 'method', 'note']), amount, date: req.body.date || today() }));
}));
app.delete('/api/incomes/:id', wrap(async (req, res) => { await Income.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));
app.post('/api/draws', wrap(async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!req.body.partner || !(amount > 0)) return res.status(400).json({ error: 'اختر الشريك واكتب المبلغ' });
  res.json(await Draw.create({ id: newId(), ...pick(req.body, ['partner', 'note']), amount, date: req.body.date || today() }));
}));
app.delete('/api/draws/:id', wrap(async (req, res) => { await Draw.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- خطة التطوير ----
const impFields = ['title', 'area', 'status', 'priority', 'cost', 'due', 'owner', 'note'];
app.post('/api/improvements', wrap(async (req, res) => {
  const d = pick(req.body, impFields); if (!d.title) return res.status(400).json({ error: 'اكتب عنوان الفكرة' });
  d.cost = parseFloat(d.cost) || 0;
  res.json(await Improvement.create({ id: newId(), ...d }));
}));
app.put('/api/improvements/:id', wrap(async (req, res) => {
  const d = pick(req.body, impFields); if ('cost' in d) d.cost = parseFloat(d.cost) || 0;
  if (d.status === 'done') d.doneDate = today();
  await Improvement.updateOne({ id: req.params.id }, { $set: d }); res.json({ ok: true });
}));
app.delete('/api/improvements/:id', wrap(async (req, res) => { await Improvement.deleteOne({ id: req.params.id }); res.json({ ok: true }); }));

// ---- نسخة احتياطية ----
app.get('/api/backup', wrap(async (req, res) => {
  const [students, payments, expenses, attendance, books, staff, notes, announcements, settings, incomes, draws, improvements, assessments] = await Promise.all([
    Student.find(), Payment.find(), Expense.find(), Attendance.find(), Book.find(), Staff.find(), Note.find(), Announcement.find(), Settings.findOne({ key: 'main' }, { passwordHash: 0 }),
    Income.find(), Draw.find(), Improvement.find(), Assessment.find()]);
  res.setHeader('Content-Disposition', `attachment; filename="rawda-backup-${today()}.json"`);
  res.json({ exportedAt: new Date().toISOString(), settings, students, payments, expenses, attendance, books, staff, notes, announcements, incomes, draws, improvements, assessments });
}));

// ====== معالجة الأخطاء — لا يسقط الخادم ======
app.use((err, req, res, next) => {
  console.error('⚠️', req.method, req.path, err.message);
  const dbDown = mongoose.connection.readyState !== 1;
  res.status(500).json({ error: dbDown ? 'تعذر الاتصال بقاعدة البيانات، حاول بعد قليل' : 'حدث خطأ أثناء تنفيذ العملية' });
});
process.on('unhandledRejection', e => console.error('⚠️ unhandledRejection:', e && e.message));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
