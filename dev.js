// ====== تعديل البرنامج من داخل الموقع عبر Claude ======
// الفكرة: المستخدم يكتب طلباً → Claude يقترح تعديلات على ملفات الكود → يُعرض الملخص →
// عند الموافقة تُفحص الملفات ثم تُرفع إلى GitHub في commit واحد → Render ينشرها تلقائياً.
// يمكن التراجع عن أي تعديل (العودة إلى ما قبله).
// هذا الملف وصفحة /updates محميّان: لا يستطيع Claude تعديلهما حتى يبقى زر التراجع يعمل دائماً.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const mongoose = require('mongoose');

const API_KEY = () => process.env.ANTHROPIC_API_KEY;
const GH_TOKEN = () => process.env.GITHUB_TOKEN;
const REPO = () => process.env.GITHUB_REPO || 'ahmedezzt647-lang/kindergarten-app';
const BRANCH = () => process.env.GITHUB_BRANCH || 'main';
const MODEL = () => process.env.CLAUDE_MODEL || 'claude-opus-5-5';

// الملفات التي يُسمح بتعديلها (dev.js و updates.html مستثنيان عمداً)
const EDITABLE = /^(app\.js|package\.json|shared\/[\w-]+\.js|public\/[\w-]+\.(js|css)|views\/(?!updates\.html)[\w-]+\.html)$/;

const DevChange = mongoose.model('DevChange', new mongoose.Schema({
  id: String, request: String, summary: String, files: [String],
  commitSha: String, parentSha: String, status: String, // applied | reverted | revert
  revertOf: String, date: String,
}, { timestamps: true }));

const jobs = new Map(); // اقتراحات قيد التحضير أو جاهزة (في الذاكرة)

/* ---------- GitHub ---------- */
async function gh(method, url, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO()}${url}`, {
    method,
    headers: { Authorization: `Bearer ${GH_TOKEN()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'rawda-app' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${d.message || 'خطأ'}`);
  return d;
}
async function headSha() { return (await gh('GET', `/git/ref/heads/${BRANCH()}`)).object.sha; }
async function readRepoFiles() {
  const sha = await headSha();
  const tree = await gh('GET', `/git/trees/${sha}?recursive=1`);
  const files = {};
  for (const f of tree.tree.filter(t => t.type === 'blob' && EDITABLE.test(t.path))) {
    const blob = await gh('GET', `/git/blobs/${f.sha}`);
    files[f.path] = Buffer.from(blob.content, 'base64').toString('utf8');
  }
  return { sha, files };
}
async function commitFiles(baseSha, changed, message) {
  const base = await gh('GET', `/git/commits/${baseSha}`);
  const tree = await gh('POST', '/git/trees', {
    base_tree: base.tree.sha,
    tree: Object.entries(changed).map(([p, content]) => ({ path: p, mode: '100644', type: 'blob', content })),
  });
  const commit = await gh('POST', '/git/commits', { message, tree: tree.sha, parents: [baseSha] });
  await gh('PATCH', `/git/refs/heads/${BRANCH()}`, { sha: commit.sha, force: false });
  return commit.sha;
}

/* ---------- Claude ---------- */
const SYSTEM = `أنت مطوّر تعدّل برنامج إدارة روضة أطفال صغير اسمه "روضة نور ومكة".
البنية: خادم Node.js (Express + Mongoose) في app.js، وحساب الرسوم في shared/finance.js (يُستخدم في الخادم والمتصفح)،
وواجهة عربية RTL بجافاسكربت عادي في public/admin.js و public/admin.css و public/style.css و views/*.html.
المستخدم صاحب الروضة وليس مبرمجاً؛ يكتب طلبه بالعامية.

القواعد:
- نفّذ أصغر تعديل يحقق الطلب بدقة، ولا تغيّر ما لم يُطلب. لا تعِد كتابة ملفات كاملة إلا للضرورة.
- لا تحذف ميزات قائمة، ولا تكسر تسجيل الدخول أو بوابة ولي الأمر أو حماية /api.
- لا تحذف بيانات ولا تغيّر أسماء حقول قاعدة البيانات الموجودة؛ الإضافة مسموحة.
- حافظ على أسلوب الواجهة: عربي، RTL، نفس الألوان والمتغيرات في :root، ونفس دوال المساعدة (esc, money, fmt, modal, act, api).
- استخدم esc() لأي نص من المستخدم داخل HTML.
- استخدم الأداة propose_changes دائماً. في edits استخدم old_string منسوخاً حرفياً من الملف ويكون فريداً فيه، و new_string البديل.
  لإنشاء ملف جديد أو استبداله كاملاً ضع content بدلاً من old_string/new_string.
- إذا كان الطلب غامضاً، أو هو إدخال بيانات وليس تعديل برنامج (مثل "أضف طالب" أو "سجّل دفعة")، أو قد يضر البيانات،
  فلا تقترح تعديلات: اترك edits فارغة واكتب سؤالك أو توضيحك في question.
- summary: اشرح للمستخدم بالعربية البسيطة وبجمل قصيرة ماذا سيتغير في الشاشة، بدون مصطلحات برمجية.`;

const TOOL = {
  name: 'propose_changes',
  description: 'اقتراح تعديلات على ملفات البرنامج',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'شرح عربي بسيط لما سيتغير' },
      question: { type: 'string', description: 'سؤال توضيحي إذا لم تُقترح تعديلات' },
      edits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' },
            content: { type: 'string', description: 'محتوى الملف كاملاً (لملف جديد أو استبدال كامل)' },
          },
          required: ['path'],
        },
      },
    },
    required: ['summary', 'edits'],
  },
};

async function callClaude(messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 32000, system: SYSTEM, tools: [TOOL], tool_choice: { type: 'tool', name: TOOL.name }, messages }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Claude ${r.status}: ${d.error?.message || 'خطأ'}`);
  const use = (d.content || []).find(c => c.type === 'tool_use');
  if (!use) throw new Error('لم يصل رد صالح من Claude');
  return { use, content: d.content };
}

function applyEdits(files, edits) {
  const out = {}; const get = p => (p in out ? out[p] : files[p]);
  for (const e of edits) {
    if (!EDITABLE.test(e.path)) throw new Error(`لا يُسمح بتعديل الملف ${e.path}`);
    if (typeof e.content === 'string') { out[e.path] = e.content; continue; }
    const cur = get(e.path);
    if (cur === undefined) throw new Error(`الملف ${e.path} غير موجود`);
    if (!e.old_string) throw new Error(`تعديل ${e.path} بدون old_string`);
    const n = cur.split(e.old_string).length - 1;
    if (n !== 1) throw new Error(`النص المطلوب استبداله في ${e.path} ${n === 0 ? 'غير موجود' : 'مكرر ' + n + ' مرات'}: ${e.old_string.slice(0, 80)}`);
    out[e.path] = cur.replace(e.old_string, () => e.new_string ?? '');
  }
  return out;
}

function validate(changed) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-'));
  try {
    for (const [p, content] of Object.entries(changed)) {
      if (p.endsWith('.js')) {
        const f = path.join(dir, p.replace(/\//g, '_'));
        fs.writeFileSync(f, content);
        try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
        catch (e) { throw new Error(`خطأ في كود ${p}: ${String(e.stderr || e.message).split('\n').slice(0, 5).join(' ')}`); }
      }
      if (p === 'package.json') { try { JSON.parse(content); } catch { throw new Error('package.json غير صالح'); } }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function describe(files, changed) {
  return Object.entries(changed).map(([p, nw]) => {
    const old = files[p] || '';
    const a = old.split('\n'), b = nw.split('\n');
    const setA = new Set(a), setB = new Set(b);
    return { path: p, added: b.filter(l => !setA.has(l)).length, removed: a.filter(l => !setB.has(l)).length, isNew: !(p in files) };
  });
}

async function runJob(job) {
  try {
    job.stage = 'قراءة ملفات البرنامج';
    const { sha, files } = await readRepoFiles();
    job.baseSha = sha; job.files = files;
    const listing = Object.entries(files).map(([p, c]) => `<file path="${p}">\n${c}\n</file>`).join('\n\n');
    const messages = [{ role: 'user', content: `ملفات البرنامج الحالية:\n\n${listing}\n\nطلب المستخدم:\n${job.request}` }];
    for (let attempt = 1; attempt <= 3; attempt++) {
      job.stage = attempt === 1 ? 'Claude يجهّز التعديل' : `Claude يصحّح التعديل (محاولة ${attempt})`;
      const { use, content } = await callClaude(messages);
      const inp = use.input || {};
      if (!inp.edits || !inp.edits.length) {
        Object.assign(job, { status: 'question', summary: inp.summary, question: inp.question || inp.summary }); return;
      }
      try {
        const changed = applyEdits(files, inp.edits);
        validate(changed);
        Object.assign(job, { status: 'ready', summary: inp.summary, changed, diff: describe(files, changed) });
        return;
      } catch (e) {
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: use.id, is_error: true, content: `لم يُطبَّق التعديل: ${e.message}. صحّح وأعد استدعاء الأداة.` }] });
        job.lastError = e.message;
      }
    }
    throw new Error(`تعذّر تجهيز تعديل سليم: ${job.lastError}`);
  } catch (e) {
    job.status = 'error'; job.error = e.message;
  }
}

/* ---------- المسارات ---------- */
module.exports = function mountDev(app, wrap, newId, today) {
  app.get('/updates', (req, res) => res.sendFile(path.join(__dirname, 'views', 'updates.html')));

  app.get('/api/dev/status', (req, res) => res.json({ claude: !!API_KEY(), github: !!GH_TOKEN(), model: MODEL() }));

  app.get('/api/dev/history', wrap(async (req, res) => {
    res.json(await DevChange.find().sort({ createdAt: -1 }).limit(50));
  }));

  app.post('/api/dev/propose', wrap(async (req, res) => {
    if (!API_KEY() || !GH_TOKEN()) return res.status(400).json({ error: 'يجب إضافة ANTHROPIC_API_KEY و GITHUB_TOKEN في إعدادات Render أولاً' });
    const request = String(req.body.request || '').trim();
    if (request.length < 5) return res.status(400).json({ error: 'اكتب طلبك بوضوح' });
    for (const [k, j] of jobs) if (Date.now() - j.created > 3 * 3600e3) jobs.delete(k);
    const id = crypto.randomBytes(8).toString('hex');
    const job = { id, request, status: 'working', stage: 'بدء', created: Date.now() };
    jobs.set(id, job);
    runJob(job);
    res.json({ id });
  }));

  app.get('/api/dev/job/:id', (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: 'انتهت صلاحية هذا الطلب، أعد كتابته' });
    res.json({ id: j.id, request: j.request, status: j.status, stage: j.stage, summary: j.summary, question: j.question, error: j.error, diff: j.diff });
  });

  app.post('/api/dev/apply/:id', wrap(async (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j || j.status !== 'ready') return res.status(400).json({ error: 'لا يوجد تعديل جاهز للتطبيق' });
    const head = await headSha();
    if (head !== j.baseSha) return res.status(409).json({ error: 'تغيّر البرنامج منذ تجهيز هذا التعديل. أعد كتابة الطلب ليُجهَّز على النسخة الحالية.' });
    const sha = await commitFiles(head, j.changed, `تعديل من داخل البرنامج: ${j.request.slice(0, 60)}\n\n${j.summary}`);
    await DevChange.create({ id: newId(), request: j.request, summary: j.summary, files: Object.keys(j.changed), commitSha: sha, parentSha: head, status: 'applied', date: today() });
    j.status = 'applied';
    res.json({ ok: true, sha });
  }));

  app.post('/api/dev/revert/:id', wrap(async (req, res) => {
    const c = await DevChange.findOne({ id: req.params.id });
    if (!c || !c.parentSha) return res.status(404).json({ error: 'التعديل غير موجود' });
    const head = await headSha();
    const target = await gh('GET', `/git/commits/${c.parentSha}`);
    const commit = await gh('POST', '/git/commits', { message: `تراجع إلى ما قبل: ${c.request.slice(0, 60)}`, tree: target.tree.sha, parents: [head] });
    await gh('PATCH', `/git/refs/heads/${BRANCH()}`, { sha: commit.sha, force: false });
    const later = await DevChange.find({ status: 'applied', createdAt: { $gte: c.createdAt } });
    await DevChange.updateMany({ _id: { $in: later.map(x => x._id) } }, { $set: { status: 'reverted' } });
    await DevChange.create({ id: newId(), request: `تراجع: ${c.request}`, summary: 'رجوع البرنامج إلى ما قبل هذا التعديل', files: [], commitSha: commit.sha, parentSha: head, status: 'revert', revertOf: c.id, date: today() });
    res.json({ ok: true });
  }));
};
module.exports._internal = { applyEdits, validate, EDITABLE };
