/* سجل شروحات الدروس: كل ملف في هذا المجلد يضيف دروس مستوى واحد.
   الشكل: LESSONS[track][subject][عنوان الوحدة كما في curriculum.js] = {
     goals: [], materials: [], steps: [[عنوان الخطوة, نص الشرح للمعلم]], qa: [[سؤال, جواب]],
     quiz: [{ q: 'السؤال', o: ['خيار', ...] أو null للسؤال المفتوح, a: 'الإجابة الصحيحة' }], hw: 'الواجب' } */
(function (root) {
  root.LESSONS = root.LESSONS || {};
  root.addLessons = (track, subject, map) => { ((root.LESSONS[track] ||= {})[subject] ||= {}); Object.assign(root.LESSONS[track][subject], map); };
  root.getLesson = (track, subject, unit) => root.LESSONS[track]?.[subject]?.[unit] || null;
})(typeof window !== 'undefined' ? window : globalThis);
