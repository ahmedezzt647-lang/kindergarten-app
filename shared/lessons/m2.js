/* ثاني متوسط (المسار السعودي) — شروحات الدروس (الأسبوعان 6 و7) — رياضيات وإنجليزي فقط */
addLessons('m2', 'الرياضيات', {
  'القوى والجذور التربيعية': {
    goals: ['يكتب الطالب حاصل الضرب المتكرر على صورة قوة (أساس وأس)', 'يحسب قيمة القوى ومنها القوى الصفرية: أ⁰ = 1', 'يعرف المربع الكامل ويجد الجذر التربيعي له', 'يقدّر الجذر التربيعي لعدد ليس مربعاً كاملاً بين عددين صحيحين'],
    materials: ['ورق مربعات لرسم مربعات (3×3، 4×4، 5×5)', 'جدول المربعات الكاملة من 1 إلى 15', 'خط أعداد على السبورة', 'آلة حاسبة للتحقق'],
    steps: [
      ['الأحد: التمهيد — القوى', 'اكتب: 2 × 2 × 2 × 2 × 2. اسأل: هل توجد طريقة أقصر للكتابة؟ ← 2⁵ (تُقرأ: 2 أُس 5). الأساس 2 هو العدد المكرر، والأس 5 هو عدد مرات التكرار. أمثلة: 3⁴ = 3 × 3 × 3 × 3 = 81 — 10³ = 1000. القوى الخاصة: أي عدد أسّه 1 يساوي نفسه (7¹ = 7)، وأي عدد (غير الصفر) أسّه صفر يساوي 1 (5⁰ = 1). القوى السالبة للأساس: (−2)² = 4 بينما −2² = −4 (الأقواس مهمة).'],
      ['الإثنين: المربعات الكاملة والجذر التربيعي', 'على ورق المربعات ارسم مربعاً طول ضلعه 4 ← مساحته 16. إذن 4² = 16، و16 مربع كامل. العملية العكسية: ما طول ضلع مربع مساحته 16؟ ← 4، ونكتب √16 = 4. كل عدد موجب له جذران: 4 و −4 لأن (−4)² = 16 أيضاً، ونكتب ±√16 = ±4، أما √16 وحدها فتعني الجذر الموجب. احفظوا المربعات الكاملة: 1، 4، 9، 16، 25، 36، 49، 64، 81، 100، 121، 144، 169، 196، 225.'],
      ['الثلاثاء: تقدير الجذور — نشاط عملي', 'كيف نقدّر √30؟ نبحث عن مربعين كاملين يقع بينهما 30: 25 < 30 < 36، إذن 5 < √30 < 6، وهو أقرب إلى 5 لأن 30 أقرب إلى 25. ضع ذلك على خط الأعداد. نشاط ثنائي: كل زوج يأخذ 6 بطاقات (√20، √50، √75، √90، √130، √8) ويحدد العددين الصحيحين ويضع البطاقة على خط الأعداد الكبير، ثم يتحققون بالآلة الحاسبة.'],
      ['الأربعاء: التطبيق في الكتاب', 'حل تمارين الكتاب: اكتب على صورة قوة، احسب القيمة، أوجد الجذر، قدّر الجذر. مسألة حياتية: حديقة مربعة مساحتها 144 م². ما طول ضلعها؟ √144 = 12 م. وكم متراً نحتاج لتسويرها؟ 4 × 12 = 48 م.'],
      ['الخميس: المراجعة والاختبار الأسبوعي', 'مراجعة سريعة للمربعات الكاملة (سؤال وجواب سريع)، ثم الاختبار الأسبوعي وتصحيحه. أخطاء شائعة: 3² = 6 (الصحيح 9)، و5⁰ = 0 (الصحيح 1).'],
    ],
    qa: [
      ['اكتب على صورة قوة: 7 × 7 × 7', '7³'],
      ['في 2⁵ ما الأساس وما الأس؟', 'الأساس 2 والأس 5'],
      ['احسب: 3⁴', '81'],
      ['احسب: 9⁰', '1'],
      ['أوجد: √81', '9'],
      ['أوجد: ±√49', '±7'],
      ['بين أي عددين صحيحين يقع √40؟', 'بين 6 و 7 (لأن 36 < 40 < 49)'],
      ['ما الفرق بين (−3)² و −3²؟', '(−3)² = 9 أما −3² = −9'],
    ],
    quiz: [
      { q: 'الصورة الأُسية لـ 5 × 5 × 5 × 5:', o: ['5⁴', '4⁵', '20'], a: '5⁴' },
      { q: 'قيمة 2⁶ تساوي:', o: ['12', '64', '32'], a: '64' },
      { q: 'قيمة 12⁰ تساوي:', o: ['0', '12', '1'], a: '1' },
      { q: '√121 = ', o: ['11', '12', '60.5'], a: '11' },
      { q: 'أيّ الأعداد التالية مربع كامل؟', o: ['50', '64', '80'], a: '64' },
      { q: '√55 يقع بين:', o: ['5 و 6', '7 و 8', '6 و 7'], a: '7 و 8' },
      { q: 'غرفة مربعة الشكل مساحة أرضيتها 81 م². أوجد طول ضلعها ومحيطها.', o: null, a: 'طول الضلع = √81 = 9 م، والمحيط = 4 × 9 = 36 م' },
      { q: 'احسب: 2³ + √36 − 4⁰', o: null, a: '8 + 6 − 1 = 13' },
    ],
    hw: 'حل تمارين الكتاب، واحفظ المربعات الكاملة من 1² إلى 15²، وقدّر √10 و √70 و √150 بين عددين صحيحين.',
  },
});

addLessons('m2', 'English (Super Goal)', {
  'Unit 2: Sports and hobbies': {
    goals: ['يتعلم الطالب مفردات الرياضات والهوايات: football, swimming, cycling, reading, drawing, collecting stamps, playing chess', 'يستخدم play / go / do مع الرياضات بشكل صحيح', 'يعبّر عن الحب والكره: like / love / enjoy / hate + verb-ing', 'يستخدم ظروف التكرار: always, usually, often, sometimes, never'],
    materials: ['صور رياضات وهوايات', 'جدول play / go / do على السبورة', 'استبيان (survey) مطبوع', 'كتاب الطالب Super Goal والتسجيل الصوتي'],
    steps: [
      ['الأحد: Vocabulary — الرياضات والهوايات', 'اعرض الصور واسأل: "What\'s this sport?" وردّد الكلمات مع الطلاب. اكتب المفردات ومعناها: football كرة القدم، basketball كرة السلة، swimming السباحة، cycling ركوب الدراجة، horse riding ركوب الخيل، karate الكاراتيه، reading القراءة، drawing الرسم، collecting stamps جمع الطوابع، playing chess الشطرنج. اسأل: "What\'s your hobby?" ويجيب كل طالب: "My hobby is ..."'],
      ['الإثنين: Grammar — play / go / do + verb-ing', 'اشرح القاعدة بالعربي: play مع ألعاب الكرة والألعاب ذات الفريق: play football, play tennis, play chess. go مع الأنشطة المنتهية بـ ing: go swimming, go cycling, go running. do مع الرياضات الفردية والفنون القتالية: do karate, do gymnastics, do judo. ثم: بعد like / love / enjoy / hate نضيف ing للفعل: I love swimming. She enjoys reading. He hates running. ظروف التكرار تأتي قبل الفعل: I always play football on Friday. She never goes cycling.'],
      ['الثلاثاء: Speaking — Class survey', 'وزّع استبياناً: يسأل كل طالب 4 زملاء: "Do you like swimming? How often do you play football?" ويسجّل الإجابات. ثم يقدّم النتائج: "Three students love football. Saad never goes swimming." اختم بلعبة "Mime": طالب يمثّل رياضة والباقي يقولون الجملة الصحيحة: "He is playing basketball / He goes cycling".'],
      ['الأربعاء: Reading & Writing — الكتاب', 'اقرأ نص الوحدة مع التسجيل وأجب عن أسئلة الفهم. Writing: فقرة 5–6 جمل بعنوان "My free time": "In my free time I enjoy ... I usually ... on Fridays. I never ... because ..." صحّح الأخطاء الشائعة: I like swim ← I like swimming، play swimming ← go swimming.'],
      ['الخميس: Review & Weekly Quiz', 'مراجعة سريعة لجدول play / go / do، ثم الاختبار الأسبوعي ومناقشة الإجابات.'],
    ],
    qa: [
      ['Which verb do we use with "football": play, go or do?', 'play'],
      ['Which verb do we use with "swimming"?', 'go'],
      ['Which verb do we use with "karate"?', 'do'],
      ['Correct the mistake: I like read books.', 'I like reading books.'],
      ['Put "always" in the right place: I play football on Friday.', 'I always play football on Friday.'],
      ['What does "hobby" mean?', 'هواية'],
    ],
    quiz: [
      { q: 'Choose: My brother ... tennis every week.', o: ['goes', 'plays', 'does'], a: 'plays' },
      { q: 'Choose: We ... cycling in the park.', o: ['go', 'play', 'do'], a: 'go' },
      { q: 'Choose: She ... judo at the club.', o: ['plays', 'goes', 'does'], a: 'does' },
      { q: 'Choose: I enjoy ... stamps.', o: ['collect', 'collecting', 'to collecting'], a: 'collecting' },
      { q: 'Choose the correct sentence:', o: ['He never goes swimming.', 'He goes never swimming.', 'Never he goes swimming.'], a: 'He never goes swimming.' },
      { q: '"Chess" is a ...', o: ['sport you play', 'sport you go', 'food'], a: 'sport you play' },
      { q: 'Write two sentences about your hobbies using "love" and "usually".', o: null, a: 'e.g. I love drawing. I usually play football with my friends on Friday.' },
      { q: 'Translate: أختي تحب القراءة.', o: null, a: 'My sister likes / loves reading.' },
    ],
    hw: 'Write a paragraph (6 sentences) about "My free time" using play / go / do and two adverbs of frequency.  (اكتب فقرة عن وقت فراغك).',
  },
});
