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
let paymentsHistory = []; // سجل دفعات الإيرادات التفصيلي

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>نظام إدارة ومحاسبة الروضة</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { text-align: center; color: #2c3e50; }
      
      .stats-cards { display: flex; gap: 10px; margin-bottom: 25px; }
      .card { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; border: 1px solid #ddd; transition: all 0.2s ease; cursor: pointer; }
      .card:hover { transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
      .card.blue { border-color: #2980b9; background-color: #ebf5fb; }
      .card.green { border-color: #27ae60; background-color: #eafaf1; }
      .card.red { border-color: #e74c3c; background-color: #fdf2e9; }
      .card.purple { border-color: #8e44ad; background-color: #f5eeed; }
      .card h3 { margin: 0 0 5px 0; font-size: 14px; color: #555; }
      .card .number { font-size: 20px; font-weight: bold; color: #2c3e50; }
      .card .hint { font-size: 11px; color: #777; margin-top: 4px; }

      .section-title { font-size: 18px; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #27ae60; color: #27ae60; display: flex; justify-content: space-between; align-items: center; }
      .section-title.red { border-bottom-color: #e74c3c; color: #e74c3c; }

      .form-group { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
      input, select, button { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
      input { flex: 1; min-width: 130px; }
      button { background: #27ae60; color: white; border: none; cursor: pointer; font-weight: bold; }
      button.btn-expense { background: #e74c3c; }
      button.btn-pay { background: #2980b9; padding: 5px 10px; font-size: 12px; }
      button.btn-toggle { background: #7f8c8d; font-size: 12px; padding: 5px 10px; }
      button:hover { opacity: 0.9; }

      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 14px; }
      th { background-color: #f2f2f2; }
      .badge-danger { color: #e74c3c; font-weight: bold; }
      .badge-success { color: #27ae60; font-weight: bold; }
      
      .details-box { background: #fff; padding: 15px; border: 1px solid #ccc; border-radius: 6px; margin-bottom: 25px; display: none; }
      .details-box.active { display: block; }
      
      .summary-report { display: flex; justify-content: space-around; background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 10px; }
      .summary-item { text-align: center; }
      .summary-item h4 { margin: 0; color: #666; font-size: 14px; }
      .summary-item p { margin: 5px 0 0 0; font-size: 18px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>نظام إدارة ومحاسبة الروضة</h1>
      
      <!-- الكروت التفاعلية -->
      <div class="stats-cards">
        <div class="card blue" onclick="showBox('students-details-box')" title="اضغط لمشاهدة تفاصيل الطلاب">
          <h3>إجمالي الطلاب 🔍</h3>
          <div class="number" id="total-students">0</div>
          <div class="hint">اضغط لعرض القائمة</div>
        </div>
        
        <div class="card green" onclick="showBox('revenue-details-box')" title="اضغط لمشاهدة سجل المقبوضات والإيرادات">
          <h3>إجمالي الإيرادات 🔍</h3>
          <div class="number" id="total-revenue">0 ر.س</div>
          <div class="hint">اضغط لسجل الدفعات</div>
        </div>
        
        <div class="card red" onclick="showBox('expense-details-box')" title="اضغط لمشاهدة تفاصيل المصروفات">
          <h3>إجمالي المصروفات 🔍</h3>
          <div class="number" id="total-expenses">0 ر.س</div>
          <div class="hint">اضغط لسجل المصروفات</div>
        </div>

        <div class="card purple" onclick="showBox('profit-details-box')" title="اضغط لمشاهدة التقرير المالي الشامل">
          <h3>صافي الربح / الخسارة 🔍</h3>
          <div class="number" id="net-profit">0 ر.س</div>
          <div class="hint">اضغط للتقرير المالي</div>
        </div>
      </div>

      <!-- 1. صندوق تفاصيل الطلاب -->
      <div id="students-details-box" class="details-box">
        <div class="section-title">
          <span>👶 بيان وقائمة الطلاب المسجلين</span>
          <button class="btn-toggle" onclick="hideBox('students-details-box')">إغلاق ✖</button>
        </div>
        <div class="form-group">
          <input type="text" id="search-std" onkeyup="filterStudents()" placeholder="🔍 ابحث باسم الطالب أو الصف...">
        </div>
        <table>
          <thead>
            <tr>
              <th>الاسم</th><th>الصف</th><th>رقم الولي</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>الرسم الشهري</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="students-table-detail"></tbody>
        </table>
      </div>

      <!-- 2. صندوق تفاصيل الإيرادات -->
      <div id="revenue-details-box" class="details-box">
        <div class="section-title" style="border-bottom-color:#27ae60; color:#27ae60;">
          <span>💰 سجل تحصيل الإيرادات والدفعات التفصيلي</span>
          <button class="btn-toggle" onclick="hideBox('revenue-details-box')">إغلاق ✖</button>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>اسم الطالب</th><th>المبلغ المحصل</th><th>تاريخ الدفع</th></tr>
          </thead>
          <tbody id="revenue-table"></tbody>
        </table>
      </div>

      <!-- 3. صندوق تفاصيل المصروفات -->
      <div id="expense-details-box" class="details-box">
        <div class="section-title red">
          <span>📋 البيان التفصيلي للمصروفات والسجلات</span>
          <button class="btn-toggle" onclick="hideBox('expense-details-box')">إغلاق ✖</button>
        </div>
        <div class="form-group">
          <input type="text" id="search-exp" onkeyup="filterExpenses()" placeholder="🔍 ابحث باسم البند...">
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>بند المصروفات</th><th>المبلغ</th><th>التاريخ</th></tr>
          </thead>
          <tbody id="expenses-table"></tbody>
        </table>
      </div>

      <!-- 4. صندوق التقرير المالي (الربح والخسارة) -->
      <div id="profit-details-
