const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// الاتصال بقاعدة البيانات السحابية Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة روضة نور ومكة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Tajawal', sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b; font-size: 15px; display: flex; min-height: 100vh; }
      .sidebar { width: 280px; background: #0f172a; color: #ffffff; padding: 24px 16px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; }
      .sidebar-logo { text-align: center; padding-bottom: 16px; border-bottom: 1px solid #334155; }
      .kids-avatars { display: flex; justify-content: center; gap: 12px; margin-bottom: 10px; }
      .kids-avatars svg { width: 65px; height: 65px; border-radius: 50%; background: #ffffff; padding: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
      .sidebar-logo h2 { font-size: 20px; margin: 8px 0 0 0; color: #f8fafc; font-weight: 800; }
      .sidebar-menu { display: flex; flex-direction: column; gap: 8px; }
      .menu-btn { background: transparent; color: #cbd5e1; border: none; padding: 12px 16px; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; text-align: right; cursor: pointer; transition: 0.2s; }
      .menu-btn:hover { background: #3b82f6; color: #ffffff; }
      .menu-btn.red:hover { background: #ef4444; }
      .menu-btn.green:hover { background: #10b981; }
      .menu-btn.orange:hover { background: #f59e0b; }
      .main-content { flex: 1; padding: 30px; overflow-y: auto; }
      .container { max-width: 1200px; margin: 0 auto; }
      .header-banner { background: #ffffff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; margin-bottom: 25px; }
      .header-banner h1 { margin: 0; color: #0f172a; font-size: 26px; font-weight: 800; }
      .header-banner p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
      .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
      .card { padding: 20px 16px; background: #ffffff; border-radius: 16px; text-align: center; border: 1px solid #e2e8f0; cursor: pointer; position: relative; overflow: hidden; }
      .card::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 5px; }
      .card.blue::before { background: #3b82f6; } .card.teal::before { background: #0d9488; } .card.orange::before { background: #f59e0b; }
      .card.green::before { background: #10b981; } .card.red::before { background: #ef4444; } .card.purple::before { background: #8b5cf6; }
      .card h3 { margin: 0 0 8px 0; font-size: 14px; color: #64748b; font-weight: 600; }
      .card .number { font-size: 26px; font-weight: 800; color: #0f172a; }
      .card .hint { font-size: 12px; color: #94a3b8; margin-top: 6px; }
      .section-title { font-size: 18px; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; color: #0f172a; display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
      .section-title.red { border-bottom-color: #fca5a5; color: #dc2626; }
      .section-title.green { border-bottom-color: #6ee7b7; color: #059669; }
      .section-title.teal { border-bottom-color: #99f6e4; color: #0d9488; }
      .section-title.orange { border-bottom-color: #fde68a; color: #d97706; }
      .form-group { display: flex; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; background: #ffffff; padding: 22px; border-radius: 14px; border: 1px solid #e2e8f0; }
      input, select { padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; font-family: inherit; background: #ffffff; flex: 1; min-width: 160px; outline: none; }
      button { padding: 12px 20px; border-radius: 10px; font-size: 15px; font-family: inherit; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
      button.btn-success { background: #10b981; color: #ffffff; } button.btn-expense { background: #ef4444; color: #ffffff; } button.btn-orange { background: #f59e0b; color: #ffffff; }
      button.btn-pay { background: #059669; color: #ffffff; padding: 7px 14px; font-size: 13px; } button.btn-absent { background: #f43f5e; color: #ffffff; padding: 7px 14px; font-size: 13px; }
      button.btn-delete { background: #94a3b8; color: #ffffff; padding: 6px 12px; font-size: 12px; } button.btn-toggle { background: #f1f5f9; color: #475569; font-size: 13px; padding: 8px 14px; border: 1px solid #e2e8f0; }
      .table-responsive { overflow-x: auto; border-radius: 14px; border: 1px solid #e2e8f0; margin-top: 14px; background: #ffffff; }
      table { width: 100%; border-collapse: collapse; background: #ffffff; }
      th, td { padding: 14px 12px; text-align: center; font-size: 15px; border-bottom: 1px solid #f1f5f9; }
      th { background-color: #f8fafc; color: #475569; font-weight: 700; }
      .badge-danger { color: #dc2626; font-weight: 800; background: #fef2f2; padding: 5px 10px; border-radius: 8px; font-size: 14px; }
      .badge-success { color: #059669; font-weight: 800; background: #ecfdf5; padding: 5px 10px; border-radius: 8px; font-size: 14px; }
      .fee-breakdown { font-size: 12px; color: #64748b; display: block; margin-top: 4px; }
      .details-box { background: #ffffff; padding: 26px; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 28px; display: none; }
      .details-box.active { display: block; }
      .print-receipt { display: none; padding: 35px; border: 2px dashed #0f172a; margin-top: 20px; background: #fff; border-radius: 14px; }
      @media print { body * { visibility: hidden; } .print-receipt, .print-receipt * { visibility: visible; } .print-receipt { position: absolute; left: 0; top: 0; width: 100%; display: block !important; } }
      @media (max-width: 850px) { body { flex-direction: column; } .sidebar { width: 100%; } }
    </style>
  </head>
  <body>
    <div class="sidebar">
      <div class="sidebar-logo">
        <div class="kids-avatars">
          <!-- رسمة تعبيرية لطيفة للبنت الأولى (نور) -->
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#fbcfe8"/>
            <circle cx="50" cy="45" r="22" fill="#fde047"/>
            <path d="M 28 45 Q 50 15 72 45" fill="#3b82f6"/>
            <circle cx="43" cy="43" r="3" fill="#1e293b"/>
            <circle cx="57" cy="43" r="3" fill="#1e293b"/>
            <path d="M 43 55 Q 50 62 57 55" stroke="#ef4444" stroke-width="2" fill="none"/>
          </svg>
          <!-- رسمة تعبيرية لطيفة للبنت الثانية (مكة) -->
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#fed7aa"/>
            <circle cx="50" cy="45" r="22" fill="#fde047"/>
            <path d="M 28 45 Q 50 15 72 45" fill="#ec4899"/>
            <circle cx="43" cy="43" r="3" fill="#1e293b"/>
            <circle cx="57" cy="43" r="3" fill="#1e293b"/>
            <path d="M 43 55 Q 50 62 57 55" stroke="#ef4444" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <h2>روضة نور ومكة</h2>
      </div>
      <div class="sidebar-menu">
        <button class="menu-btn green" onclick="scrollToSection('sec-add-student')">👶 إضافة طالب جديد</button>
        <button class="menu-btn orange" onclick="scrollToSection('sec-add-book')">📚 إضافة كتاب لطالب</button>
        <button class="menu-btn red" onclick="scrollToSection('sec-add-expense')">💸 تسجيل مصروف جديد</button>
        <button class="menu-btn" onclick="scrollToSection('sec-classes')">📊 إحصائيات الصفوف</button>
        <button class="menu-btn" onclick="scrollToSection('sec-students-list')">📜 جدول الطلاب الرئيسي</button>
        <button class="menu-btn" onclick="showBox('revenue-details-box')">💰 سجل التحصيل المالي</button>
        <button class="menu-btn" onclick="showBox('attendance-details-box')">📅 سجل الحضور اليومي</button>
      </div>
    </div>

    <div class="main-content">
      <div class="container">
        <div class="header-banner">
          <h1>🏫 روضة نور ومكة</h1>
          <p>لوحة التحكم والإدارة المالية والتعليمية الشاملة</p>
        </div>

        <div class="stats-cards">
          <div class="card blue" onclick="showBox('students-details-box')"><h3>إجمالي الأطفال 🔍</h3><div class="number" id="total-students">0</div><div class="hint">عرض الطلاب</div></div>
          <div class="card teal" onclick="showBox('classes-details-box')"><h3>الصفوف 🔍</h3><div class="number" id="total-classes">0</div><div class="hint">حسب الصف</div></div>
          <div class="card orange" onclick="showBox('books-details-box')"><h3>مبيعات الكتب 🔍</h3><div class="number" id="total-books-sales">0 ر.س</div><div class="hint">الكتب الآجلة</div></div>
          <div class="card green" onclick="showBox('revenue-details-box')"><h3>المقبوضات 🔍</h3><div class="number" id="total-revenue">0 ر.س</div><div class="hint">سجل التحصيل</div></div>
          <div class="card red" onclick="showBox('expense-details-box')"><h3>المصروفات 🔍</h3><div class="number" id="total-expenses">0 ر.س</div><div class="hint">سجل النفقات</div></div>
          <div class="card purple" onclick="showBox('profit-details-box')"><h3>صافي الربح 🔍</h3><div class="number" id="net-profit">0 ر.س</div><div class="hint">التقرير المالي</div></div>
        </div>

        <div id="books-details-box" class="details-box"><div class="section-title orange"><span>📚 سجل مبيعات الكتب</span><button class="btn-toggle" onclick="hideBox('books-details-box')">إغلاق ✖</button></div><div class="table-responsive"><table><thead><tr><th>#</th><th>اسم الطالب</th><th>الكتاب</th><th>السعر</th><th>التاريخ</th><th>حذف</th></tr></thead><tbody id="books-table"></tbody></table></div></div>
        <div id="classes-details-box" class="details-box"><div class="section-title teal"><span>🏫 تحليل إيرادات الصفوف</span><button class="btn-toggle" onclick="hideBox('classes-details-box')">إغلاق ✖</button></div><div class="table-responsive"><table><thead><tr><th>اسم الصف</th><th>عدد الطلاب</th><th>المستحق</th><th>المقبوض</th><th>المتبقي</th></tr></thead><tbody id="classes-table"></tbody></table></div></div>
        <div id="attendance-details-box" class="details-box"><div class="section-title"><span>📅 سجل الحضور والغياب اليومي</span><button class="btn-toggle" onclick="hideBox('attendance-details-box')">إغلاق ✖</button></div><div class="table-responsive"><table><thead><tr><th>اسم الطفل</th><th>الصف</th><th>حالة الحضور</th><th>وقت التسجيل</th><th>تسجيل</th></tr></thead><tbody id="attendance-table"></tbody></table></div></div>
        <div id="students-details-box" class="details-box"><div class="section-title"><span>👶 قائمة الطلاب</span><button class="btn-toggle" onclick="hideBox('students-details-box')">إغلاق ✖</button></div><div class="form-group"><input type="text" id="search-std" onkeyup="filterStudents()" placeholder="🔍 ابحث..."></div><div class="table-responsive"><table><thead><tr><th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>تفصيل الرسوم</th><th>المستحق الكلي</th><th>المدفوع</th><th>المتبقي</th><th>إجراءات</th></tr></thead><tbody id="students-table-detail"></tbody></table></div></div>
        <div id="revenue-details-box" class="details-box"><div class="section-title green"><span>💰 سجل المقبوضات الإيرادات</span><button class="btn-toggle" onclick="hideBox('revenue-details-box')">إغلاق ✖</button></div><div class="table-responsive"><table><thead><tr><th>#</th><th>رقم الإيصال</th><th>اسم الطالب</th><th>المبلغ</th><th>التاريخ</th><th>طباعة</th></tr></thead><tbody id="revenue-table"></tbody></table></div></div>
        <div id="expense-details-box" class="details-box"><div class="section-title red"><span>📋 البيان التفصيلي للمصروفات</span><button class="btn-toggle" onclick="hideBox('expense-details-box')">إغلاق ✖</button></div><div class="table-responsive"><table><thead><tr><th>#</th><th>البند</th><th>المبلغ</th><th>التاريخ</th><th>حذف</th></tr></thead><tbody id="expenses-table"></tbody></table></div></div>

        <div id="profit-details-box" class="details-box">
          <div class="section-title"><span>📊 التقرير المالي</span><button class="btn-toggle" onclick="hideBox('profit-details-box')">إغلاق ✖</button></div>
          <div style="display:flex; justify-content:space-around; background:#f8fafc; padding:22px; border-radius:14px; border:1px solid #e2e8f0;">
            <div><h4>المقبوضات</h4><p style="color:#059669; font-weight:800; font-size:24px; margin:0;" id="rep-rev">0 ر.س</p></div>
            <div><h4>المصروفات</h4><p style="color:#dc2626; font-weight:800; font-size:24px; margin:0;" id="rep-exp">0 ر.س</p></div>
            <div><h4>صافي الأرباح</h4><p style="color:#8b5cf6; font-weight:800; font-size:24px; margin:0;" id="rep-net">0 ر.س</p></div>
          </div>
        </div>

        <div id="sec-add-student" class="section-title green"><span>👶 إضافة طالب جديد</span></div>
        <div class="form-group">
          <input type="text" id="std-name" placeholder="اسم الطفل ثلاثي">
          <input type="text" id="std-class" placeholder="الصف (تمهيدي، روضة 1)">
          <input type="text" id="std-phone" placeholder="رقم هاتف الولي">
          <input type="date" id="std-join-date">
          <input type="number" id="std-monthly-fee" placeholder="الرسم الشهري">
          <input type="number" id="std-discount" placeholder="خصم شهري (إن وجد)">
          <input type="number" id="std-paid" placeholder="الدفعة الأولى">
          <button class="btn-success" onclick="addStudent()">تسجيل الطالب</button>
        </div>

        <div id="sec-add-book" class="section-title orange"><span>📚 بيع / إضافة كتاب لطالب</span></div>
        <div class="form-group">
          <select id="book-student-select"><option value="">اختر الطالب...</option></select>
          <input type="text" id="book-title" placeholder="اسم الكتاب">
          <input type="number" id="book-price" placeholder="سعر الكتاب">
          <button class="btn-orange" onclick="addBookToStudent()">📖 إضافة الكتاب</button>
        </div>

        <div id="sec-add-expense" class="section-title red"><span>💸 تسجيل مصروف جديد</span></div>
        <div class="form-group">
          <input type="text" id="exp-title" placeholder="بند المصروف (إيجار، رواتب)">
          <input type="number" id="exp-amount" placeholder="المبلغ">
          <input type="date" id="exp-date">
          <button class="btn-expense" onclick="addExpense()">إضافة المصروف</button>
        </div>

        <div id="sec-classes" class="section-title teal"><span>📊 إحصائيات وصفوف الروضة</span></div>
        <div class="table-responsive"><table><thead><tr><th>اسم الصف</th><th>عدد الطلاب</th><th>المستحق</th><th>المقبوض</th><th>المتبقي</th></tr></thead><tbody id="classes-table-main"></tbody></table></div>

        <div id="sec-students-list" class="section-title"><span>📜 جدول الطلاب الرئيسي</span></div>
        <div class="table-responsive"><table><thead><tr><th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>تفصيل الرسوم والكتب</th><th>المستحق الكلي</th><th>المدفوع</th><th>المتبقي</th><th>حضور اليوم</th><th>إجراءات</th></tr></thead><tbody id="students-table-main"></tbody></table></div>

        <div id="receipt-print-area" class="print-receipt">
          <h2 style="text-align:center;">إيصال استلام نقدية - روضة نور ومكة</h2>
          <hr><p><strong>رقم الإيصال:</strong> <span id="rec-id"></span></p><p><strong>التاريخ:</strong> <span id="rec-date"></span></p><p><strong>اسم الطالب:</strong> <span id="rec-name"></span></p><p style="color:#059669;"><strong>المبلغ:</strong> <span id="rec-amount"></span> ر.س</p>
        </div>
      </div>
    </div>

    <script>
      document.getElementById('exp-date').valueAsDate = new Date();
      document.getElementById('std-join-date').valueAsDate = new Date();

      let allExpenses = []; let allStudents = []; let allPayments = []; let allAttendance = []; let allBookSales = [];

      function scrollToSection(secId) { document.getElementById(secId).scrollIntoView({ behavior: 'smooth' }); }
      function calculateMonths(joinDateStr) { const joinDate = new Date(joinDateStr); const now = new Date(); let months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()) + 1; return months > 0 ? months : 1; }
      function showBox(boxId) { document.querySelectorAll('.details-box').forEach(box => box.classList.remove('active')); const targetBox = document.getElementById(boxId); targetBox.classList.add('active'); targetBox.scrollIntoView({ behavior: 'smooth' }); }
      function hideBox(boxId) { document.getElementById(boxId).classList.remove('active'); }

      async function fetchData() {
        const [resExp, resStd, resPay, resAtt, resBooks] = await Promise.all([
          fetch('/api/expenses'), fetch('/api/students'), fetch('/api/payments'), fetch('/api/attendance'), fetch('/api/books')
        ]);
        allExpenses = await resExp.json(); allStudents = await resStd.json(); allPayments = await resPay.json(); allAttendance = await resAtt.json(); allBookSales = await resBooks.json();
        renderExpenses(allExpenses); renderStudents(allStudents); renderRevenue(allPayments); renderClasses(allStudents); renderAttendance(allStudents, allAttendance); renderBookSales(allBookSales); populateStudentSelect(allStudents); updateStats(allExpenses, allStudents, allPayments, allBookSales);
      }

      function populateStudentSelect(students) {
        document.getElementById('book-student-select').innerHTML = '<option value="">اختر الطالب...</option>' + students.map(s => \`<option value="\${s.id}">\${s.name} - (\${s.className || 'بدون صف'})\</option>\`).join('');
      }
      function getStudentBooksTotal(studentId) { return allBookSales.filter(b => b.studentId === studentId).reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0); }

      function renderBookSales(books) {
        document.getElementById('books-table').innerHTML = books.length === 0 ? '<tr><td colspan="6">لا توجد مبيعات كتب حتى الآن</td></tr>' : books.map((b, i) => \`<tr><td>\${i+1}</td><td><b>\${b.studentName}</b></td><td>\${b.title}</td><td style="color:#d97706; font-weight:bold;">\${b.price} ر.س</td><td>\${b.date}</td><td><button class="btn-delete" onclick="deleteBookSale('\${b.id}')">حذف</button></td></tr>\`).join('');
      }

      function renderClasses(students) {
        const classesMap = {};
        students.forEach(s => {
          const className = (s.className && s.className.trim()) ? s.className.trim() : 'غير محدد';
          const months = calculateMonths(s.joinDate || new Date());
          const due = (((parseFloat(s.monthlyFee) || 0) - (parseFloat(s.discount) || 0)) * months) + getStudentBooksTotal(s.id);
          const paid = parseFloat(s.paid) || 0;
          if (!classesMap[className]) classesMap[className] = { count: 0, totalDue: 0, totalPaid: 0 };
          classesMap[className].count++; classesMap[className].totalDue += due; classesMap[className].totalPaid += paid;
        });
        const keys = Object.keys(classesMap);
        if (keys.length === 0) {
          document.getElementById('classes-table').innerHTML = '<tr><td colspan="5">لا توجد صفوف</td></tr>'; document.getElementById('classes-table-main').innerHTML = '<tr><td colspan="5">لا توجد صفوف</td></tr>'; return;
        }
        document.getElementById('total-classes').innerText = keys.length;
        const rows = keys.map(cName => {
          const item = classesMap[cName];
          return \`<tr><td><b>\${cName}</b></td><td>\${item.count} طفل</td><td>\${item.totalDue} ر.س</td><td style="color:#059669; font-weight:bold;">\${item.totalPaid} ر.س</td><td style="color:#dc2626; font-weight:bold;">\${item.totalDue - item.totalPaid} ر.س</td></tr>\`;
        }).join('');
        document.getElementById('classes-table').innerHTML = rows; document.getElementById('classes-table-main').innerHTML = rows;
      }

      function renderExpenses(data) {
        document.getElementById('expenses-table').innerHTML = data.length === 0 ? '<tr><td colspan="5">لا توجد مصروفات</td></tr>' : data.map((e, i) => \`<tr><td>\${i+1}</td><td><b>\${e.title}</b></td><td style="color:#dc2626; font-weight:bold;">\${e.amount} ر.س</td><td>\${e.date || '-'}</td><td><button class="btn-delete" onclick="deleteExpense('\${e.id}')">حذف</button></td></tr>\`).join('');
      }

      function renderRevenue(payments) {
        document.getElementById('revenue-table').innerHTML = payments.length === 0 ? '<tr><td colspan="6">لا توجد عمليات دفع</td></tr>' : payments.map((p, i) => \`<tr><td>\${i+1}</td><td><b>#\${p.id || i + 1001}</b></td><td>\${p.studentName}</td><td style="color:#059669; font-weight:bold;">\${p.amount} ر.س</td><td>\${p.date}</td><td><button class="btn-pay" onclick="printReceipt('\${p.id || i + 1001}', '\${p.studentName}', '\${p.amount}', '\${p.date}')">🖨️ طباعة</button></td></tr>\`).join('');
      }

      function renderAttendance(students, attendance) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendance-table').innerHTML = students.map(s => {
          const rec = attendance.find(a => a.studentId === s.id && a.date === today);
          return \`<tr><td>\${s.name}</td><td>\${s.className}</td><td><b>\${rec ? (rec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'لم يسجل'}</b></td><td>\${rec ? rec.time : '-'}</td><td><button class="btn-pay" onclick="markAttendance('\${s.id}', 'present')">حاضر</button> <button class="btn-absent" onclick="markAttendance('\${s.id}', 'absent')">غائب</button></td></tr>\`;
        }).join('');
      }

      function renderStudents(data) {
        const today = new Date().toISOString().split('T')[0];
        const rows = data.map(s => {
          const months = calculateMonths(s.joinDate || new Date());
          const monthlyFee = parseFloat(s.monthlyFee) || 0;
          const booksTotal = getStudentBooksTotal(s.id);
          const totalDue = ((monthlyFee - (parseFloat(s.discount) || 0)) * months) + booksTotal;
          const paid = parseFloat(s.paid) || 0;
          const remaining = totalDue - paid;
          const attRec = allAttendance.find(a => a.studentId === s.id && a.date === today);
          return \`<tr>
            <td><b>\${s.name}</b></td><td>\${s.className}</td><td><a href="tel:\${s.phone}" style="color:#3b82f6; text-decoration:none;">\${s.phone}</a></td><td>\${s.joinDate || '-'}</td><td>\${months} شهر</td>
            <td><span>\${monthlyFee} ر.س</span><span class="fee-breakdown">📚 كتب: <b>\${booksTotal} ر.س</b></span></td>
            <td><b>\${totalDue} ر.س</b></td><td>\${paid} ر.س</td><td><span class="\${remaining > 0 ? 'badge-danger' : 'badge-success'}">\${remaining} ر.س</span></td>
            <td>\${attRec ? (attRec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'غير مسجل'}</td>
            <td><button class="btn-pay" onclick="payExtra('\${s.id}', '\${s.name}')">+ دفعة</button> <button class="btn-delete" onclick="deleteStudent('\${s.id}')">حذف</button></td>
          </tr>\`;
        }).join('');
        document.getElementById('students-table-main').innerHTML = rows; document.getElementById('students-table-detail').innerHTML = rows;
      }

      function updateStats(expenses, students, payments, books) {
        document.getElementById('total-students').innerText = students.length;
        const totalExp = expenses.reduce((acc, c) => acc + Number(c.amount || 0), 0);
        const totalRev = payments.reduce((acc, c) => acc + Number(c.amount || 0), 0);
        const totalBooksSales = books.reduce((acc, c) => acc + Number(c.price || 0), 0);
        document.getElementById('total-expenses').innerText = totalExp + ' ر.س';
        document.getElementById('total-revenue').innerText = totalRev + ' ر.س';
        document.getElementById('total-books-sales').innerText = totalBooksSales + ' ر.س';
        document.getElementById('net-profit').innerText = (totalRev - totalExp) + ' ر.س';
        document.getElementById('rep-rev').innerText = totalRev + ' ر.س';
        document.getElementById('rep-exp').innerText = totalExp + ' ر.س';
        document.getElementById('rep-net').innerText = (totalRev - totalExp) + ' ر.س';
      }

      async function addBookToStudent() {
        const studentId = document.getElementById('book-student-select').value;
        const title = document.getElementById('book-title').value;
        const price = document.getElementById('book-price').value;
        if(!studentId || !title || !price) return alert('يرجى اختيار الطالب، وإدخال اسم الكتاب وسعره');
        const student = allStudents.find(s => s.id === studentId);
        await fetch('/api/books', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ studentId, studentName: student ? student.name : '', title, price, date: new Date().toISOString().split('T')[0] }) });
        document.getElementById('book-title').value = ''; document.getElementById('book-price').value = ''; fetchData(); showBox('books-details-box');
      }

      async function addExpense() {
        const title = document.getElementById('exp-title').value; const amount = document.getElementById('exp-amount').value; const date = document.getElementById('exp-date').value;
        if(!title || !amount) return alert('يرجى كتابة البند والمبلغ');
        await fetch('/api/expenses', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title, amount, date }) });
        document.getElementById('exp-title').value = ''; document.getElementById('exp-amount').value = ''; fetchData();
      }

      async function addStudent() {
        const name = document.getElementById('std-name').value; const className = document.getElementById('std-class').value; const phone = document.getElementById('std-phone').value; const joinDate = document.getElementById('std-join-date').value; const monthlyFee = document.getElementById('std-monthly-fee').value; const discount = document.getElementById('std-discount').value; const paid = document.getElementById('std-paid').value;
        if(!name || !monthlyFee) return alert('يرجى كتابة اسم الطفل والرسم الشهري');
        await fetch('/api/students', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, className, phone, joinDate, monthlyFee, discount, paid }) });
        document.getElementById('std-name').value = ''; document.getElementById('std-monthly-fee').value = ''; document.getElementById('std-paid').value = ''; fetchData();
      }

      async function payExtra(id, studentName) {
        const amount = prompt('أدخل مبلغ الدفعة الجديدة (ر.س):'); if(!amount || isNaN(amount)) return;
        await fetch('/api/students/pay', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, amount, studentName }) }); fetchData();
      }

      async function markAttendance(studentId, status) {
        await fetch('/api/attendance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ studentId, status }) }); fetchData();
      }

      async function deleteStudent(id) { if(!confirm('حذف هذا الطالب؟')) return; await fetch('/api/students/' + id, { method: 'DELETE' }); fetchData(); }
      async function deleteExpense(id) { if(!confirm('حذف هذا المصروف؟')) return; await fetch('/api/expenses/' + id, { method: 'DELETE' }); fetchData(); }
      async function deleteBookSale(id) { if(!confirm('إلغاء شراء هذا الكتاب؟')) return; await fetch('/api/books/' + id, { method: 'DELETE' }); fetchData(); }

      function printReceipt(id, name, amount, date) {
        document.getElementById('rec-id').innerText = id; document.getElementById('rec-name').innerText = name; document.getElementById('rec-amount').innerText = amount; document.getElementById('rec-date').innerText = date; window.print();
      }

      fetchData();
    </script>
  </body>
  </html>
  `);
});

// APIs المربوطة بالسحابة Supabase أو المؤقتة
app.get('/api/students', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('students').select('*');
    return res.json(data || []);
  }
  res.json(students);
});

app.post('/api/students', async (req, res) => {
  const student = { id: Date.now().toString(), ...req.body };
  if (supabase) {
    await supabase.from('students').insert([student]);
    if (parseFloat(req.body.paid) > 0) {
      await supabase.from('payments').insert([{ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: req.body.name, amount: parseFloat(req.body.paid), date: new Date().toISOString().split('T')[0] }]);
    }
  } else {
    students.push(student);
  }
  res.json(student);
});

app.delete('/api/students/:id', async (req, res) => {
  if (supabase) await supabase.from('students').delete().eq('id', req.params.id);
  students = students.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/payments', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('payments').select('*');
    return res.json(data || []);
  }
  res.json(paymentsHistory);
});

app.post('/api/students/pay', async (req, res) => {
  const { id, amount, studentName } = req.body;
  if (supabase) {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    if (data) {
      const newPaid = (parseFloat(data.paid) || 0) + parseFloat(amount);
      await supabase.from('students').update({ paid: newPaid }).eq('id', id);
      await supabase.from('payments').insert([{ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: studentName || data.name, amount: parseFloat(amount), date: new Date().toISOString().split('T')[0] }]);
    }
  } else {
    const student = students.find(s => s.id === id);
    if (student) student.paid = (parseFloat(student.paid) || 0) + parseFloat(amount);
  }
  res.json({ success: true });
});

app.get('/api/expenses', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('expenses').select('*');
    return res.json(data || []);
  }
  res.json(expenses);
});

app.post('/api/expenses', async (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  if (supabase) await supabase.from('expenses').insert([expense]);
  else expenses.push(expense);
  res.json(expense);
});

app.delete('/api/expenses/:id', async (req, res) => {
  if (supabase) await supabase.from('expenses').delete().eq('id', req.params.id);
  expenses = expenses.filter(e => e.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/attendance', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('attendance').select('*');
    return res.json(data || []);
  }
  res.json(attendance);
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ar-EG');
  if (supabase) {
    await supabase.from('attendance').delete().eq('studentId', studentId).eq('date', today);
    await supabase.from('attendance').insert([{ studentId, status, date: today, time }]);
  } else {
    attendance = attendance.filter(a => !(a.studentId === studentId && a.date === today));
    attendance.push({ studentId, status, date: today, time });
  }
  res.json({ success: true });
});

app.get('/api/books', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('books').select('*');
    return res.json(data || []);
  }
  res.json(bookSales);
});

app.post('/api/books', async (req, res) => {
  const book = { id: Date.now().toString(), ...req.body };
  if (supabase) await supabase.from('books').insert([book]);
  else bookSales.push(book);
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  if (supabase) await supabase.from('books').delete().eq('id', req.params.id);
  bookSales = bookSales.filter(b => b.id !== req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
