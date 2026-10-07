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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

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
      .kids-avatars { display: flex; justify-content: center; gap: 14px; margin-bottom: 12px; }
      .kid-photo { width: 75px; height: 75px; border-radius: 50%; object-fit: cover; border: 3px solid #38bdf8; box-shadow: 0 4px 8px rgba(0,0,0,0.25); background: #ffffff; }
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
      button.btn-delete { background: #94a3b8; color: #ffffff; padding: 6px 12px; font-size: 12px; } button.btn
