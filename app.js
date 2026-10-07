const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

let students = [];
let expenses = [];
let paymentsHistory = [];
let attendance = [];
let bookSales = []; // سجل مبيعات الكتب

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة ومحاسبة الروضة الشامل</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      body { 
        font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; 
        background-color: #f1f5f9; 
        margin: 0; 
        padding: 24px 16px; 
        color: #1e293b; 
      }
      .container { 
        max-width: 1300px; 
        margin: 0 auto; 
        background: #ffffff; 
        padding: 30px; 
        border-radius: 16px; 
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); 
      }
      .header-title { text-align: center; margin-bottom: 30px; }
      .header-title h1 { color: #0f172a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; }
      .header-title p { color: #64748b; font-size: 14px; margin: 0; }
      
      .stats-cards { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
        gap: 16px; 
        margin-bottom: 30px; 
      }
      .card { 
        padding: 20px 16px; 
        background: #ffffff; 
        border-radius: 14px; 
        text-align: center; 
        border: 1px solid #e2e8f0; 
        transition: all 0.25s ease; 
        cursor: pointer; 
        position: relative;
        overflow: hidden;
      }
      .card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08); }
      .card::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 4px; }
      .card.blue::before { background: #3b82f6; }
      .card.teal::before { background: #0d9488; }
      .card.orange::before { background: #f59e0b; }
      .card.green::before { background: #10b981; }
      .card.red::before { background: #ef4444; }
      .card.purple::before { background: #8b5cf6; }

      .card h3 { margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 500; }
      .card .number { font-size: 22px; font-weight: 700; color: #0f172a; }
      .card .hint { font-size: 11px; color: #94a3b8; margin-top: 6px; }

      .section-title { 
        font-size: 16px; 
        margin: 32px 0 16px 0; 
        padding-bottom: 8px; 
        border-bottom: 2px solid #e2e8f0; 
        color: #0f172a; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        font-weight: 700; 
      }
      .section-title.red { border-bottom-color: #fca5a5; color: #dc2626; }
      .section-title.green { border-bottom-color: #6ee7b7; color: #059669; }
      .section-title.teal { border-bottom-color: #99f6e4; color: #0d9488; }
      .section-title.orange { border-bottom-color: #fde68a; color: #d97706; }

      .form-group { 
        display: flex; 
        gap: 12px; 
        margin-bottom: 20px; 
        flex-wrap: wrap; 
        background: #f8fafc; 
        padding: 18px; 
        border-radius: 12px; 
        border: 1px solid #f1f5f9; 
      }
      input, select { 
        padding: 11px 14px; 
        border: 1px solid #cbd5e1; 
        border-radius: 8px; 
        font-size: 13px; 
        font-family: inherit;
        background: #ffffff;
        flex: 1;
        min-width: 140px;
        outline: none;
      }
      input:focus, select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }

      button { 
        padding: 11px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-family: inherit;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      button.btn-primary { background: #3b82f6; color: #ffffff; }
      button.btn-expense { background: #ef4444; color: #ffffff; }
      button.btn-success { background: #10b981; color: #ffffff; }
      button.btn-orange { background: #f59e0b; color: #ffffff; }
      button.btn-pay { background: #059669; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-absent { background: #f43f5e; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-delete { background: #94a3b8; color: #ffffff; padding: 5px 10px; font-size: 11px; }
      button.btn-toggle { background: #f1f5f9; color: #475569; font-size: 12px; padding: 6px 12px; border: 1px solid #e2e8f0; }

      .table-responsive { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 12px; }
      table { width: 100%; border-collapse: collapse; background: #ffffff; }
      th, td { padding: 12px 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
      th { background-color: #f8fafc; color: #475569; font-weight: 600; }

      .badge-danger { color: #dc2626; font-weight: 700; background: #fef2f2; padding: 4px 8px; border-radius: 6px; }
      .badge-success { color: #059669; font-weight: 700; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; }
      .fee-breakdown { font-size: 11px; color: #64748b; display: block; margin-top: 3px; }
      
      .details-box { background: #ffffff; padding: 22px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px; display: none; }
      .details-box.active { display: block; }

      .print-receipt { display: none; padding: 30px; border: 2px dashed #0f172a; margin-top: 20px; background: #fff; border-radius: 12px; }
      @media print {
        body * { visibility: hidden; }
        .print-receipt, .print-receipt * { visibility: visible; }
        .print-receipt { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-title">
        <h1>🏫 نظام إدارة ومحاسبة الروضة</h1>
        <p>لوحة التحكم الشاملة لإدارة الطلاب والرسوم والمصروفات والكتب</p>
      </div>
      
      <div class="stats-cards">
        <div class="card blue" onclick="showBox('students-details-box')">
          <h3>إجمالي الأطفال 🔍</h3>
          <div class="number" id="total-students">0</div>
          <div class="hint">عرض التسجيل والطلاب</div>
        </div>

        <div class="card teal" onclick="showBox('classes-details-box')">
          <h3>الصفوف والشعب 🔍</h3>
          <div class="number" id="total-classes">0</div>
          <div class="hint">إحصاء الأرباح حسب الصف</div>
        </div>

        <div class="card orange" onclick="showBox('books-details-box')">
          <h3>مبيعات الكتب 🔍</h3>
          <div class="number" id="total-books-sales">0 ر.س</div>
          <div class="hint">الكتب الآجلة على الطلاب</div>
        </div>
        
        <div class="card green" onclick="showBox('revenue-details-box')">
          <h3>الإيرادات المقبوضة 🔍</h3>
          <div class="number" id="total-revenue">0 ر.س</div>
          <div class="hint">سجل التحصيل المالي</div>
        </div>
        
        <div class="card red" onclick="showBox('expense-details-box')">
          <h3>إجمالي المصروفات 🔍</h3>
          <div class="number" id="total-expenses">0 ر.س</div>
          <div class="hint">سجل النفقات التشغيلية</div>
        </div>

        <div class="card purple" onclick="showBox('profit-details-box')">
          <h3>صافي النتيجة 🔍</h3>
          <div class="number" id="net-profit">0 ر.س</div>
          <div class="hint">التقرير المالي النهائي</div>
        </div>
      </div>

      <!-- 1. تفاصيل سجل مبيعات الكتب -->
      <div id="books-details-box" class="details-box">
        <div class="section-title orange">
          <span>📚 سجل مبيعات الكتب المضافة على رسوم الطلاب</span>
          <button class="btn-toggle" onclick="hideBox('books-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>#</th><th>اسم الطالب</th><th>اسم الكتاب</th><th>السعر</th><th>تاريخ البيع</th><th>حذف</th></tr>
            </thead>
            <tbody id="books-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 2. تفاصيل الصفوف وإيراداتها -->
      <div id="classes-details-box" class="details-box">
        <div class="section-title teal">
          <span>🏫 تحليل إيرادات وأعداد كل صف دراسي</span>
          <button class="btn-toggle" onclick="hideBox('classes-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>اسم الصف / المستوى</th>
                <th>عدد الطلاب</th>
                <th>إجمالي المستحق</th>
                <th>الإيرادات المقبوضة</th>
                <th>المتبقي للتحصيل</th>
              </tr>
            </thead>
            <tbody id="classes-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 3. تفاصيل الحضور والغياب -->
      <div id="attendance-details-box" class="details-box">
        <div class="section-title">
          <span>📅 سجل الحضور والغياب اليومي</span>
          <button class="btn-toggle" onclick="hideBox('attendance-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>اسم الطفل</th><th>الصف</th><th>حالة الحضور</th><th>وقت التسجيل</th><th>تسجيل الحضور</th></tr>
            </thead>
            <tbody id="attendance-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 4. تفاصيل الطلاب -->
      <div id="students-details-box" class="details-box">
        <div class="section-title">
          <span>👶 قائمة الطلاب التفصيلية</span>
          <button class="btn-toggle" onclick="hideBox('students-details-box')">إغلاق ✖</button>
        </div>
        <div class="form-group">
          <input type="text" id="search-std" onkeyup="filterStudents()" placeholder="🔍 ابحث باسم الطالب أو الصف...">
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>تفصيل الرسوم والكتب</th><th>المستحق الكلي</th><th>المدفوع</th><th>المتبقي</th><th>إجراءات</th></tr>
            </thead>
            <tbody id="students-table-detail"></tbody>
          </table>
        </div>
      </div>

      <!-- 5. تفاصيل الإيرادات -->
      <div id="revenue-details-box" class="details-box">
        <div class="section-title green">
          <span>💰 سجل المقبوضات والإيرادات</span>
          <button class="btn-toggle" onclick="hideBox('revenue-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>#</th><th>رقم الإيصال</th><th>اسم الطالب</th><th>المبلغ المحصل</th><th>التاريخ</th><th>طباعة إيصال</th></tr>
            </thead>
            <tbody id="revenue-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 6. تفاصيل المصروفات -->
      <div id="expense-details-box" class="details-box">
        <div class="section-title red">
          <span>📋 البيان التفصيلي للمصروفات</span>
          <button class="btn-toggle" onclick="hideBox('expense-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>#</th><th>بند المصروف</th><th>المبلغ</th><th>التاريخ</th><th>حذف</th></tr>
            </thead>
            <tbody id="expenses-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 7. التقرير المالي -->
      <div id="profit-details-box" class="details-box">
        <div class="section-title">
          <span>📊 التقرير المالي الختامي</span>
          <button class="btn-toggle" onclick="hideBox('profit-details-box')">إغلاق ✖</button>
        </div>
        <div style="display:flex; justify-content:space-around; background:#f8fafc; padding:20px; border-radius:12px; border: 1px solid #e2e8f0;">
          <div><h4 style="margin:0 0 6px 0; color:#64748b;">المقبوضات</h4><p style="color:#059669; font-weight:700; font-size:20px; margin:0;" id="rep-rev">0 ر.س</p></div>
          <div><h4 style="margin:0 0 6px 0; color:#64748b;">المصروفات</h4><p style="color:#dc2626; font-weight:700; font-size:20px; margin:0;" id="rep-exp">0 ر.س</p></div>
          <div><h4 style="margin:0 0 6px 0; color:#64748b;">صافي الأرباح</h4><p style="color:#8b5cf6; font-weight:700; font-size:20px; margin:0;" id="rep-net">0 ر.س</p></div>
        </div>
      </div>

      <!-- قسم بيع كتاب لطالب بآجل التسديد -->
      <div class="section-title orange"><span>📚 بيع / إضافة كتاب لحساب طالب (سداد مؤجل مع الرسوم)</span></div>
      <div class="form-group">
        <select id="book-student-select">
          <option value="">اختر الطالب لربط الكتاب بحسابه...</option>
        </select>
        <input type="text" id="book-title" placeholder="اسم الكتاب (مثال: كتاب القراءة)">
        <input type="number" id="book-price" placeholder="سعر الكتاب (ر.س)">
        <button class="btn-orange" onclick="addBookToStudent()">📖 إضافة الكتاب لحساب الطالب</button>
      </div>

      <!-- نموذج تسجيل مصروف -->
      <div class="section-title red"><span>💸 تسجيل مصروف جديد</span></div>
      <div class="form-group">
        <input type="text" id="exp-title" placeholder="بند المصروف (إيجار، رواتب، نظافة)">
        <input type="number" id="exp-amount" placeholder="المبلغ (ر.س)">
        <input type="date" id="exp-date">
        <button class="btn-expense" onclick="addExpense()">إضافة المصروف</button>
      </div>

      <!-- نموذج إضافة طالب -->
      <div class="section-title green"><span>👶 إضافة طالب جديد وحساب الرسوم</span></div>
      <div class="form-group">
        <input type="text" id="std-name" placeholder="اسم الطفل ثلاثي">
        <input type="text" id="std-class" placeholder="الصف (تمهيدي، روضة 1، حضانة)">
        <input type="text" id="std-phone" placeholder="رقم هاتف الولي">
        <input type="date" id="std-join-date" title="تاريخ الالتحاق">
        <input type="number" id="std-monthly-fee" placeholder="الرسم الشهري">
        <input type="number" id="std-discount" placeholder="خصم شهري (إن وجد)">
        <input type="number" id="std-paid" placeholder="الدفعة الأولى">
        <button class="btn-success" onclick="addStudent()">تسجيل الطالب</button>
      </div>

      <!-- قسم تحليل الصفوف المباشر -->
      <div class="section-title teal"><span>📊 إحصائيات وصفوف الروضة</span></div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>اسم الصف</th>
              <th>عدد الطلاب</th>
              <th>إجمالي المستحق</th>
              <th>الإيرادات المقبوضة</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody id="classes-table-main"></tbody>
        </table>
      </div>

      <!-- جدول الطلاب الرئيسي -->
      <div class="section-title"><span>📜 جدول الطلاب الرئيسي وإدارة السداد والكتب</span></div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>تفصيل الرسوم والكتب</th><th>المستحق الكلي</th><th>المدفوع</th><th>المتبقي</th><th>حضور اليوم</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="students-table-main"></tbody>
        </table>
      </div>

      <!-- قالب الإيصال المخصص للطباعة -->
      <div id="receipt-print-area" class="print-receipt">
        <h2 style="text-align:center; color:#0f172a; margin-bottom: 20px;">إيصال استلام نقدية - روضة الأطفال</h2>
        <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-bottom:20px;">
        <p style="font-size:16px;"><strong>رقم الإيصال:</strong> <span id="rec-id"></span></p>
        <p style="font-size:16px;"><strong>التاريخ:</strong> <span id="rec-date"></span></p>
        <p style="font-size:16px;"><strong>استلمنا من الطالب/ة:</strong> <span id="rec-name"></span></p>
        <p style="font-size:18px; color:#059669;"><strong>مبلغ وقدره:</strong> <span id="rec-amount"></span> ر.س</p>
        <br><br>
        <div style="display:flex; justify-content:space-between; font-size:15px;">
          <p>توقيع المحاسب: ....................</p>
          <p>ختم الروضة: ....................</p>
        </div>
      </div>

    </div>

    <script>
      document.getElementById('exp-date').valueAsDate = new Date();
      document.getElementById('std-join-date').valueAsDate = new Date();

      let allExpenses = [];
      let allStudents = [];
      let allPayments = [];
      let allAttendance = [];
      let allBookSales = [];

      function calculateMonths(joinDateStr) {
        const joinDate = new Date(joinDateStr);
        const now = new Date();
        let months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()) + 1;
        return months > 0 ? months : 1;
      }

      function showBox(boxId) {
        document.querySelectorAll('.details-box').forEach(box => box.classList.remove('active'));
        document.getElementById(boxId).classList.add('active');
      }

      function hideBox(boxId) {
        document.getElementById(boxId).classList.remove('active');
      }

      async function fetchData() {
        const resExp = await fetch('/api/expenses');
        allExpenses = await resExp.json();
        
        const resStd = await fetch('/api/students');
        allStudents = await resStd.json();

        const resPay = await fetch('/api/payments');
        allPayments = await resPay.json();

        const resAtt = await fetch('/api/attendance');
        allAttendance = await resAtt.json();

        const resBooks = await fetch('/api/books');
        allBookSales = await resBooks.json();
        
        renderExpenses(allExpenses);
        renderStudents(allStudents);
        renderRevenue(allPayments);
        renderClasses(allStudents);
        renderAttendance(allStudents, allAttendance);
        renderBookSales(allBookSales);
        populateStudentSelect(allStudents);
        updateStats(allExpenses, allStudents, allPayments, allBookSales);
      }

      function populateStudentSelect(students) {
        const select = document.getElementById('book-student-select');
        select.innerHTML = '<option value="">اختر الطالب لربط الكتاب بحسابه...</option>' + 
          students.map(s => \`<option value="\${s.id}">\${s.name} - (\${s.className || 'بدون صف'})\</option>\`).join('');
      }

      function getStudentBooksTotal(studentId) {
        return allBookSales
          .filter(b => b.studentId === studentId)
          .reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
      }

      function renderBookSales(books) {
        const tbody = document.getElementById('books-table');
        if(books.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">لا توجد مبيعات كتب مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = books.map((b, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>\${b.studentName}</b></td>
          <td>\${b.title}</td>
          <td style="color:#d97706; font-weight:bold;">\${b.price} ر.س</td>
          <td>\${b.date}</td>
          <td><button class="btn-delete" onclick="deleteBookSale('\${b.id}')">حذف</button></td>
        </tr>\`).join('');
      }

      function renderClasses(students) {
        const classesMap = {};

        students.forEach(s => {
          const className = (s.className && s.className.trim()) ? s.className.trim() : 'غير محدد';
          const months = calculateMonths(s.joinDate || new Date());
          const discount = parseFloat(s.discount) || 0;
          const monthlyFee = (parseFloat(s.monthlyFee) || 0) - discount;
          const booksTotal = getStudentBooksTotal(s.id);
          const due = (monthlyFee * months) + booksTotal;
          const paid = parseFloat(s.paid) || 0;

          if (!classesMap[className]) {
            classesMap[className] = { count: 0, totalDue: 0, totalPaid: 0 };
          }
          classesMap[className].count += 1;
          classesMap[className].totalDue += due;
          classesMap[className].totalPaid += paid;
        });

        const keys = Object.keys(classesMap);
        if (keys.length === 0) {
          const emptyRow = '<tr><td colspan="5">لا توجد صفوف مسجلة حتى الآن</td></tr>';
          document.getElementById('classes-table').innerHTML = emptyRow;
          document.getElementById('classes-table-main').innerHTML = emptyRow;
          document.getElementById('total-classes').innerText = 0;
          return;
        }

        document.getElementById('total-classes').innerText = keys.length;

        const rows = keys.map(cName => {
          const item = classesMap[cName];
          const remaining = item.totalDue - item.totalPaid;
          return \`<tr>
            <td><b>\${cName}</b></td>
            <td>\${item.count} طفل</td>
            <td>\${item.totalDue} ر.س</td>
            <td style="color:#059669; font-weight:bold;">\${item.totalPaid} ر.س</td>
            <td style="color:#dc2626; font-weight:bold;">\${remaining} ر.س</td>
          </tr>\`;
        }).join('');

        document.getElementById('classes-table').innerHTML = rows;
        document.getElementById('classes-table-main').innerHTML = rows;
      }

      function renderExpenses(data) {
        const tbody = document.getElementById('expenses-table');
        if(data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5">لا توجد مصروفات مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = data.map((e, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>\${e.title}</b></td>
          <td style="color:#dc2626; font-weight:bold;">\${e.amount} ر.س</td>
          <td>\${e.date || '-'}</td>
          <td><button class="btn-delete" onclick="deleteExpense('\${e.id}')">حذف</button></td>
        </tr>\`).join('');
      }

      function renderRevenue(payments) {
        const tbody = document.getElementById('revenue-table');
        if(payments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">لا توجد عمليات دفع مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = payments.map((p, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>#\${p.id || index + 1001}</b></td>
          <td>\${p.studentName}</td>
          <td style="color:#059669; font-weight:bold;">\${p.amount} ر.س</td>
          <td>\${p.date}</td>
          <td><button class="btn-pay" onclick="printReceipt('\${p.id || index + 1001}', '\${p.studentName}', '\${p.amount}', '\${p.date}')">🖨️ طباعة</button></td>
        </tr>\`).join('');
      }

      function renderAttendance(students, attendance) {
        const today = new Date().toISOString().split('T')[0];
        const tbody = document.getElementById('attendance-table');
        
        tbody.innerHTML = students.map(s => {
          const rec = attendance.find(a => a.studentId === s.id && a.date === today);
          const statusText = rec ? (rec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'لم يسجل';
          return \`<tr>
            <td>\${s.name}</td>
            <td>\${s.className}</td>
            <td><b>\${statusText}</b></td>
            <td>\${rec ? rec.time : '-'}</td>
            <td>
              <button class="btn-pay" onclick="markAttendance('\${s.id}', 'present')">حاضر</button>
              <button class="btn-absent" onclick="markAttendance('\${s.id}', 'absent')">غائب</button>
            </td>
          </tr>\`;
        }).join('');
      }

      function renderStudents(data) {
        const today = new Date().toISOString().split('T')[0];
        const rows = data.map(s => {
          const months = calculateMonths(s.joinDate || new Date());
          const discount = parseFloat(s.discount) || 0;
          const monthlyFee = parseFloat(s.monthlyFee) || 0;
          const monthlyAfterDiscount = monthlyFee - discount;
          
          const booksTotal = getStudentBooksTotal(s.id);
          const totalDue = (monthlyAfterDiscount * months) + booksTotal;
          
          const paid = parseFloat(s.paid) || 0;
          const remaining = totalDue - paid;
          const remainingClass = remaining > 0 ? 'badge-danger' : 'badge-success';

          const attRec = allAttendance.find(a => a.studentId === s.id && a.date === today);
          const attStatus = attRec ? (attRec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'غير مسجل';

          const breakdown = \`اشتراك: \${monthlyFee} | كتب: \${booksTotal} ر.س\`;

          return \`<tr>
            <td><b>\${s.name}</b></td>
            <td>\${s.className}</td>
            <td><a href="tel:\${s.phone}" style="color:#3b82f6; text-decoration:none;">\${s.phone}</a></td>
            <td>\${s.joinDate || '-'}</td>
            <td>\${months} شهر</td>
            <td>
              <span>\${monthlyFee} ر.س</span>
              <span class="fee-breakdown">📚 كتب: <b>\${booksTotal} ر.س</b></span>
            </td>
            <td><b>\${totalDue} ر.س</b></td>
            <td>\${paid} ر.س</td>
            <td><span class="\${remainingClass}">\${remaining} ر.س</span></td>
            <td>\${attStatus}</td>
            <td>
              <button class="btn-pay" onclick="payExtra('\${s.id}', '\${s.name}')">+ دفعة</button>
              <button class="btn-delete" onclick="deleteStudent('\${s.id}')">حذف</button>
            </td>
          </tr>\`;
        }).join('');

        document.getElementById('students-table-main').innerHTML = rows;
        document.getElementById('students-table-detail').innerHTML = rows;
      }

      function updateStats(expenses, students, payments, books) {
        document.getElementById('total-students').innerText = students.length;
        
        const totalExp = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const totalRev = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const totalBooksSales = books.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

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
        
        if(!studentId || !title || !price) {
          return alert('يرجى اختيار الطالب، وإدخال اسم الكتاب وسعره');
        }

        const student = allStudents.find(s => s.id === studentId);

        await fetch('/api/books', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            studentId, 
            studentName: student ? student.name : '', 
            title, 
            price,
            date: new Date().toISOString().split('T')[0]
          })
        });

        document.getElementById('book-title').value = '';
        document.getElementById('book-price').value = '';
        fetchData();
        showBox('books-details-box');
      }

      async function addExpense() {
        const title = document.getElementById('exp-title').value;
        const amount = document.getElementById('exp-amount').value;
        const date = document.getElementById('exp-date').value;
        if(!title || !amount) return alert('يرجى كتابة بند المصروف والمبلغ');

        await fetch('/api/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ title, amount, date })
        });
        document.getElementById('exp-title').value = '';
        document.getElementById('exp-amount').value = '';
        fetchData();
      }

      async function addStudent() {
        const name = document.getElementById('std-name').value;
        const className = document.getElementById('std-class').value;
        const phone = document.getElementById('std-phone').value;
        const joinDate = document.getElementById('std-join-date').value;
        const monthlyFee = document.getElementById('std-monthly-fee').value;
        const discount = document.getElementById('std-discount').value;
        const paid = document.getElementById('std-paid').value;
        if(!name || !monthlyFee) return alert('يرجى كتابة اسم الطفل والرسم الشهري');

        await fetch('/api/students', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, className, phone, joinDate, monthlyFee, discount, paid })
        });
        document.getElementById('std-name').value = '';
        document.getElementById('std-monthly-fee').value = '';
        document.getElementById('std-paid').value = '';
        fetchData();
      }

      async function payExtra(id, studentName) {
        const amount = prompt('أدخل مبلغ الدفعة الجديدة (ر.س):');
        if(!amount || isNaN(amount)) return;

        await fetch('/api/students/pay', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, amount, studentName })
        });
        fetchData();
      }

      async function markAttendance(studentId, status) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ studentId, status })
        });
        fetchData();
      }

      async function deleteStudent(id) {
        if(!confirm('هل أنت تأكد من حذف هذا الطالب؟')) return;
        await fetch('/api/students/' + id, { method: 'DELETE' });
        fetchData();
      }

      async function deleteExpense(id) {
        if(!confirm('هل أنت تأكد من حذف هذا المصروف؟')) return;
        await fetch('/api/expenses/' + id, { method: 'DELETE' });
        fetchData();
      }

      async function deleteBookSale(id) {
        if(!confirm('هل أنت تأكد من إلغاء وتراجع عن شراء هذا الكتاب؟')) return;
        await fetch('/api/books/' + id, { method: 'DELETE' });
        fetchData();
      }

      function printReceipt(id, name, amount, date) {
        document.getElementById('rec-id').innerText = id;
        document.getElementById('rec-name').innerText = name;
        document.getElementById('rec-amount').innerText = amount;
        document.getElementById('rec-date').innerText = date;
        window.print();
      }

      fetchData();
    </script>
  </body>
  </html>
  `);
});

app.get('/api/students', (req, res) => res.json(students));
app.post('/api/students', (req, res) => {
  const student = { id: Date.now().toString(), ...req.body };
  students.push(student);
  if (parseFloat(req.body.paid) > 0) {
    paymentsHistory.push({
      id: Math.floor(1000 + Math.random() * 9000),
      studentName: req.body.name,
      amount: parseFloat(req.body.paid),
      date: new Date().toISOString().split('T')[0]
    });
  }
  res.json(student);
});
app.delete('/api/students/:id', (req, res) => {
  students = students.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/payments', (req, res) => res.json(paymentsHistory));
app.post('/api/students/pay', (req, res) => {
  const { id, amount, studentName } = req.body;
  const student = students.find(s => s.id === id);
  if (student) {
    student.paid = (parseFloat(student.paid) || 0) + parseFloat(amount);
    paymentsHistory.push({
      id: Math.floor(1000 + Math.random() * 9000),
      studentName: studentName || student.name,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0]
    });
    res.json(student);
  } else {
    res.status(404).json({ error: 'غير موجود' });
  }
});

app.get('/api/expenses', (req, res) => res.json(expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  expenses.push(expense);
  res.json(expense);
});
app.delete('/api/expenses/:id', (req, res) => {
  expenses = expenses.filter(e => e.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/attendance', (req, res) => res.json(attendance));
app.post('/api/attendance', (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ar-EG');
  
  attendance = attendance.filter(a => !(a.studentId === studentId && a.date === today));
  attendance.push({ studentId, status, date: today, time });
  res.json({ success: true });
});

app.get('/api/books', (req, res) => res.json(bookSales));
app.post('/api/books', (req, res) => {
  const book = { id: Date.now().toString(), ...req.body };
  bookSales.push(book);
  res.json(book);
});
app.delete('/api/books/:id', (req, res) => {
  bookSales = bookSales.filter(b => b.id !== req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
