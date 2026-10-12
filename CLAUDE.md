# روضة نور ومكة — ملاحظات للمطوّر

برنامج إدارة روضة (عربي RTL) على https://rawda-app.onrender.com — Node.js + Express + Mongoose، قاعدة MongoDB Atlas (قاعدة `kindergarten`).
البرنامج يبقى مستيقظاً عبر `.github/workflows/keep-awake.yml` (كل 10 دقائق، مجاني لأن المستودع عام). الواجهة تتحدث تلقائياً كل دقيقة (`softRefresh`).
النشر تلقائي من فرع `main` إلى خدمة Render `rawda-app` (srv-db2gnegae00c73a9p4t0). لا تضع أي كلمة مرور في الكود؛ الأسرار في متغيرات Render:
`MONGO_URI`, `ADMIN_PASSWORD`, `SESSION_SECRET` (واختيارياً `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`).

## الملفات
- `app.js` الخادم والنماذج ومسارات `/api` (كلها خلف تسجيل الدخول عدا `/api/login` و `/api/portal/:token`).
- `shared/finance.js` حساب الرسوم (خادم + متصفح).
- `public/admin.js` كل شاشات اللوحة (`VIEWS.*`) — مساعدات: `esc`, `money`, `fmt`, `modal`, `act`, `api`.
- `public/theme.js` المظهر (ألوان/حجم خط `--fs`/خط/وضع ليلي/صور) من `settings.appearance`، والصور في مجموعة `assets` وتُقدَّم من `/img/<logo|banner|loginBg>`.
- `shared/curriculum.js` الخطة الدراسية المقترحة لكل مستوى (kg1, kg2, g1, g2, g3 مصري؛ m1, m2 سعودي) وربط الصفوف بالمستويات. تعديلات الأسابيع في `planedits`، وإنجاز المعلم في `teachlogs`، وبداية العام في `settings.academic`. شاشة `VIEWS.teach`.
- `shared/lessons/<track>.js` الشرح الكامل لكل درس عبر `addLessons(track, subject, {عنوان الوحدة كما في curriculum: {goals, materials, steps[5 أيام], qa, quiz[{q,o|null,a}], hw}})`. المكتوب حالياً: الأسبوعان 6 و7 لكل المستويات (الباقي يُكتب على دفعات). المسار السعودي (m1, m2) رياضيات وإنجليزي فقط. الامتحان الأسبوعي يُطبع من `quiz` (درجتان لكل سؤال + نموذج إجابة)، والدرجات في `assessments` وتظهر في بوابة ولي الأمر. مستوى الطالب في الصف متعدد المستويات في `student.level`.
- `shared/activities.js` فعاليات الخميس الترفيهية التعليمية: 34 فعالية لكل فئة (`kg` روضة، `pri` ابتدائي، `mid` متوسط) + `OCCASIONS` مناسبات تظهر تلقائياً بتاريخها. تظهر يوم الخميس في مهام اليوم (إنجازها في `teachlogs` بمسار `act-<band>` ومادة "فعالية الخميس") وفي تبويب "فعاليات الخميس"، ومعها مسابقة مراجعة تُبنى من `qa` دروس الأسبوع.
- `views/portal.html` بوابة ولي الأمر. التطبيق (PWA): `public/manifest.webmanifest` و `public/sw.js` (يُقدَّم من `/sw.js`) و `public/icons/`. `dev.js` + `views/updates.html` تعديل البرنامج من الداخل (لا تُعدَّل ذاتياً).

## الحسابات والتطوير
- `VIEWS.accounts` (صلاحية reports): قائمة الأرباح والخسائر لفترة (سنة دراسية سبتمبر–أغسطس / سنة ميلادية / فترة مخصصة) — `plData`، الأشهر، الشركاء والمسحوبات (`draws`، للمدير)، الصندوق (`settings.openingCash` + كل المقبوض − المصروفات − المسحوبات)، إيرادات أخرى (`incomes`، صلاحية finance وتدخل في `monthFin`).
- `VIEWS.develop` (صلاحية develop): مؤشرات الأداء `kpis()`، خطة تطوير بثلاث حالات (`improvements`: idea/doing/done)، ومكتبة أفكار مقترحة `IDEAS`.
- لوحة الحضور حُذفت من الرئيسية بطلب صاحب الروضة (باقية في صفحة الحضور).

## المستخدمون والصلاحيات
- المدير يدخل بكلمة المرور الرئيسية فقط (اسم المستخدم فارغ) وله كل شيء. بقية الأفراد في مجموعة `users` (`username` بحروف صغيرة، `perms`، `active`) ويضيفهم المدير من الإعدادات.
- الصلاحيات `PERMS` في app.js: attendance, students, teach, finance, reports, staff, comms, develop, settings, delete. التحقق في الخادم (`permGuard` + `RULES`)؛ أي DELETE يحتاج `delete`. للمدير فقط: /updates و /api/dev و /api/users و /api/backup و /api/draws ونسب الشركاء والرصيد الافتتاحي.
- من لا يملك finance أو reports لا تصله المبالغ في /api/all. في الواجهة: `can(p)` و `canFin()` و `D.me`، وأزرار الحذف تُخفى بـ `body.no-delete`.

## قواعد الحساب (اتفق عليها صاحب الروضة)
- الالتحاق حتى يوم 10 = شهر كامل. بعده بالأيام: الرسم ÷ 30 × (30 − يوم الالتحاق). مثال: يوم 11 ورسم 300 = 190.
- كل شهر بعده رسم كامل، والشهر الحالي يُحسب مقدماً. المنقطع يتوقف احتسابه من تاريخ انقطاعه.
- المستحق = الرسوم − `oneTimeDiscount` (الكتب منفصلة: لكل كتاب `pays[]` و `paidAmount` و `paid`، وشراء الكتب مصروف بند "شراء كتب"). المدفوع = مجموع إيصالاته. لا تقريب للكسور (212.5 تبقى كما هي).
- التقارير: المقبوض الشهري حسب تاريخ الدفع؛ رسوم كل شهر يُوزَّع عليها المدفوع من الأقدم للأحدث.
- المقبوض = دفعات الرسوم + ما حُصّل من الكتب (بتاريخ كل دفعة). المصروفات تشمل شراء الكتب.
- الشركاء: احمد 50٪ وعبدالله 50٪ من (المقبوض − كل المصروفات) لكل شهر (`settings.partners`).

## إدخال بيانات مباشرة في القاعدة
- طالب: `id` فريد (نص)، `portalToken` عشوائي، `join_date` بصيغة YYYY-MM-DD، `monthlyFee` نص، `status: active`.
- دفعة: `studentId`, `studentName`, `amount` رقم, `receiptNo` متسلسل ثم `$max` على `settings.receiptCounter`.
- صف جديد: أضفه إلى `settings.classes`.

## ملف المشروع الكامل
مستند "روضة نور ومكة — ملف المشروع" في Claude (الروابط، الطلاب، الحالات الخاصة، سجل التغييرات).
