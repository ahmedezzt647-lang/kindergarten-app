// حساب الرسوم المستحقة للطالب — يُستخدم في الخادم وفي المتصفح
// القاعدة:
// - يوم الالتحاق <= حد اليوم (افتراضي 10) => شهر الالتحاق رسم كامل، وإلا نصف رسم
// - كل شهر بعده يُحسب رسماً كاملاً، والشهر الحالي يُحسب مقدماً
// - الطالب المنقطع يتوقف احتساب رسومه عند شهر انقطاعه
(function (root) {
  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

  function calcTuition(s, opts) {
    opts = opts || {};
    const cutoff = opts.halfMonthAfterDay || 10;
    if (!s.join_date) return { tuition: 0, months: 0, desc: 'لا يوجد تاريخ التحاق' };
    const join = new Date(s.join_date + 'T00:00:00');
    let end = opts.now ? new Date(opts.now) : new Date();
    if (s.status === 'inactive' && s.inactive_date) {
      const stop = new Date(s.inactive_date + 'T00:00:00');
      if (stop < end) end = stop;
    }
    const net = Math.max(0, num(s.monthlyFee) - num(s.discount));
    if (end < join) return { tuition: 0, months: 0, desc: 'لم يبدأ بعد' };

    const firstFactor = join.getDate() <= cutoff ? 1 : 0.5;
    const firstLabel = firstFactor === 1 ? 'شهر الالتحاق كامل' : 'نصف شهر الالتحاق';
    const monthsAfter = (end.getFullYear() - join.getFullYear()) * 12 + (end.getMonth() - join.getMonth());
    const tuition = Math.round(net * firstFactor + Math.max(0, monthsAfter) * net);
    const desc = monthsAfter <= 0 ? firstLabel : `${firstLabel} + ${monthsAfter} شهر`;
    return { tuition, months: firstFactor + Math.max(0, monthsAfter), desc, net };
  }

  function studentBalance(s, payments, books, opts) {
    const t = calcTuition(s, opts);
    const booksTotal = (books || []).filter(b => b.studentId === s.id).reduce((a, b) => a + num(b.price), 0);
    const paid = (payments || []).filter(p => p.studentId === s.id).reduce((a, p) => a + num(p.amount), 0);
    const totalDue = t.tuition + booksTotal;
    return { tuition: t.tuition, desc: t.desc, net: t.net, booksTotal, totalDue, paid, remaining: totalDue - paid };
  }

  const api = { calcTuition, studentBalance, num };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Finance = api;
})(this);
