# روضة نور ومكة — ملاحظات للمطوّر

برنامج إدارة روضة (عربي RTL) على https://rawda-app.onrender.com — Node.js + Express + Mongoose، قاعدة MongoDB Atlas (قاعدة `kindergarten`).
البرنامج يبقى مستيقظاً عبر `.github/workflows/keep-awake.yml` (كل 10 دقائق، مجاني لأن المستودع عام). الواجهة تتحدث تلقائياً كل دقيقة (`softRefresh`).
النشر تلقائي من فرع `main` إلى خدمة Render `rawda-app` (srv-db2gnegae00c73a9p4t0). لا تضع أي كلمة مرور في الكود؛ الأسرار في متغيرات Render:
`MONGO_URI`, `ADMIN_PASSWORD`, `SESSION_SECRET` (واختيارياً `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`).

## الملفات
- `app.js` الخادم والنماذج ومسارات `/api` (كلها خلف تسجيل الدخول عدا `/api/login` و `/api/portal/:token`).
- `shared/finance.js` حساب الرسوم (خادم + متصفح).
- `public/admin.js` كل شاشات اللوحة (`VIEWS.*`) — مساعدات: `esc`, `money`, `fmt`, `modal`, `act`, `api`.
- `views/portal.html` بوابة ولي الأمر. التطبيق (PWA): `public/manifest.webmanifest` و `public/sw.js` (يُقدَّم من `/sw.js`) و `public/icons/`. `dev.js` + `views/updates.html` تعديل البرنامج من الداخل (لا تُعدَّل ذاتياً).

## قواعد الحساب (اتفق عليها صاحب الروضة)
- الالتحاق حتى يوم 10 = شهر كامل. بعده بالأيام: الرسم ÷ 30 × (30 − يوم الالتحاق). مثال: يوم 11 ورسم 300 = 190.
- كل شهر بعده رسم كامل، والشهر الحالي يُحسب مقدماً. المنقطع يتوقف احتسابه من تاريخ انقطاعه.
- المستحق = الرسوم + الكتب − `oneTimeDiscount`. المدفوع = مجموع إيصالاته. لا تقريب للكسور (212.5 تبقى كما هي).
- التقارير: المقبوض الشهري حسب تاريخ الدفع؛ رسوم كل شهر يُوزَّع عليها المدفوع من الأقدم للأحدث.
- الشركاء: احمد 50٪ وعبدالله 50٪ من (المقبوض − كل المصروفات) لكل شهر (`settings.partners`).

## إدخال بيانات مباشرة في القاعدة
- طالب: `id` فريد (نص)، `portalToken` عشوائي، `join_date` بصيغة YYYY-MM-DD، `monthlyFee` نص، `status: active`.
- دفعة: `studentId`, `studentName`, `amount` رقم, `receiptNo` متسلسل ثم `$max` على `settings.receiptCounter`.
- صف جديد: أضفه إلى `settings.classes`.

## ملف المشروع الكامل
مستند "روضة نور ومكة — ملف المشروع" في Claude (الروابط، الطلاب، الحالات الخاصة، سجل التغييرات).
