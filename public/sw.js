// عامل الخدمة: يجعل البرنامج قابلاً للتثبيت كتطبيق ويفتح بسرعة.
// - ملفات التصميم والبرنامج: من الإنترنت دائماً، مع نسخة محفوظة احتياطاً.
// - الصفحات وبيانات /api: من الإنترنت دائماً (البيانات لا تُخزَّن على الجهاز).
// - بدون إنترنت: صفحة تخبر المستخدم بذلك.
const VERSION = 'rawda-v6';
const SHELL = ['/assets/style.css', '/assets/admin.css', '/assets/admin.js', '/shared/finance.js', '/assets/theme.js', '/assets/icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const OFFLINE = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>لا يوجد اتصال</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,Tahoma,sans-serif;background:#145741;color:#fff;text-align:center;padding:24px}
.c{background:#fff;color:#1B2A3A;border-radius:20px;padding:28px;max-width:340px}button{margin-top:14px;padding:10px 22px;border:0;border-radius:12px;background:#1F7A5C;color:#fff;font:inherit;font-weight:700}</style></head>
<body><div class="c"><h2>لا يوجد اتصال بالإنترنت</h2><p>البرنامج يحتاج الإنترنت لعرض بيانات الروضة وحفظها. تأكد من الاتصال ثم حاول مرة أخرى.</p><button onclick="location.reload()">إعادة المحاولة</button></div></body></html>`;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // الصفحات: من الإنترنت، وعند انقطاعه صفحة "لا يوجد اتصال"
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    return;
  }
  // ملفات التصميم والبرنامج: أحدث نسخة من الإنترنت، والنسخة المحفوظة احتياطاً فقط
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/shared/')) {
    e.respondWith(caches.open(VERSION).then(c =>
      fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })
        .catch(async () => (await c.match(req)) || Response.error())));
  }
  // /api وغيرها: بدون تدخل (من الإنترنت مباشرة)
});
