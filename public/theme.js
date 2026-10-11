/* ====== مظهر البرنامج: الألوان، حجم الخط، نوع الخط، الوضع الليلي، الصور ======
   يُطبَّق على كل الصفحات. الإعدادات في settings.appearance والصور في /img/<key>.
   يُحفظ آخر مظهر في المتصفح حتى يظهر فوراً قبل تحميل البيانات. */
(function () {
  const PALETTES = [
    { id: 'palm', name: 'أخضر النخيل', primary: '#1F7A5C', accent: '#F2B33D' },
    { id: 'blue', name: 'أزرق', primary: '#2563A8', accent: '#F2B33D' },
    { id: 'teal', name: 'فيروزي', primary: '#0E7C86', accent: '#F4A63A' },
    { id: 'purple', name: 'بنفسجي', primary: '#6A4BA6', accent: '#F4B740' },
    { id: 'pink', name: 'وردي', primary: '#B8456F', accent: '#F6C343' },
    { id: 'orange', name: 'برتقالي', primary: '#B9581C', accent: '#3A7BD5' },
    { id: 'slate', name: 'رمادي', primary: '#3F4C59', accent: '#E0A526' },
  ];
  const FONTS = [
    { id: 'plex', name: 'آي بي إم بلكس (الافتراضي)', family: "'IBM Plex Sans Arabic'", url: 'IBM+Plex+Sans+Arabic:wght@400;500;600;700' },
    { id: 'tajawal', name: 'تجوال', family: "'Tajawal'", url: 'Tajawal:wght@400;500;700;800' },
    { id: 'cairo', name: 'القاهرة', family: "'Cairo'", url: 'Cairo:wght@400;500;600;700' },
    { id: 'almarai', name: 'المراعي', family: "'Almarai'", url: 'Almarai:wght@400;700;800' },
    { id: 'noto', name: 'نوتو كوفي', family: "'Noto Kufi Arabic'", url: 'Noto+Kufi+Arabic:wght@400;500;600;700' },
  ];
  const SIZES = [
    { id: 'normal', name: 'عادي', fs: 1 },
    { id: 'large', name: 'كبير', fs: 1.12 },
    { id: 'xlarge', name: 'كبير جداً', fs: 1.25 },
    { id: 'huge', name: 'ضخم', fs: 1.4 },
  ];
  const DEFAULTS = { palette: 'palm', primary: '#1F7A5C', accent: '#F2B33D', size: 'large', font: 'plex', dark: false, images: {}, v: 0 };

  // مزج لونين: t = نسبة اللون الثاني
  function hex(c) { c = String(c || '').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return isNaN(n) ? [0, 0, 0] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

  function apply(a) {
    a = Object.assign({}, DEFAULTS, a || {});
    const pal = PALETTES.find(p => p.id === a.palette);
    const primary = a.palette === 'custom' || !pal ? a.primary : pal.primary;
    const accent = a.palette === 'custom' || !pal ? a.accent : pal.accent;
    const dark = !!a.dark;
    const r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
    const bg = dark ? '#18222C' : '#FFFFFF';
    set('--palm', primary);
    set('--palm-3', mix(primary, '#000000', dark ? .35 : .3));
    set('--palm-2', mix(primary, bg, dark ? .78 : .87));
    set('--palm-ink', dark ? mix(primary, '#FFFFFF', .45) : mix(primary, '#000000', .3));
    set('--ok', dark ? mix(primary, '#FFFFFF', .35) : primary);
    set('--sun', accent);
    set('--sun-2', mix(accent, bg, dark ? .8 : .84));
    set('--warn-ink', dark ? mix(accent, '#FFFFFF', .3) : mix(accent, '#000000', .45));
    if (dark) {
      set('--ink', '#E7EDF2'); set('--ink-2', '#BAC6D1'); set('--ink-3', '#93A2B0');
      set('--mist', '#0F161C'); set('--paper', '#18222C'); set('--line', '#2C3A47'); set('--hover', '#1E2A35');
      set('--rose', '#F0776F'); set('--rose-2', '#3A2428'); set('--sky', '#7FB2EA'); set('--sky-2', '#1D2C3D');
    } else ['--ink', '--ink-2', '--ink-3', '--mist', '--paper', '--line', '--hover', '--rose', '--rose-2', '--sky', '--sky-2'].forEach(k => r.style.removeProperty(k));
    r.dataset.theme = dark ? 'dark' : 'light';
    r.style.colorScheme = dark ? 'dark' : 'light';
    set('--fs', (SIZES.find(s => s.id === a.size) || SIZES[1]).fs);
    // الخط
    const f = FONTS.find(x => x.id === a.font) || FONTS[0];
    set('--sans', `${f.family}, system-ui, sans-serif`);
    if (f.id !== 'plex' && !document.getElementById('font-' + f.id)) {
      const l = document.createElement('link'); l.id = 'font-' + f.id; l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${f.url}&display=swap`; document.head.appendChild(l);
    }
    const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = mix(primary, '#000000', .3);
    // الصور
    const img = k => a.images && a.images[k] ? `/img/${k}?v=${a.images[k]}` : '';
    document.querySelectorAll('.crest').forEach(el => {
      const src = img('logo');
      if (src) { el.innerHTML = `<img src="${src}" alt="">`; el.classList.add('has-logo'); }
      else if (el.classList.contains('has-logo')) { el.textContent = 'ن'; el.classList.remove('has-logo'); }
    });
    set('--login-bg', img('loginBg') ? `url("${img('loginBg')}")` : 'none');
    window.APPEARANCE = a;
    try { localStorage.setItem('rawda-appearance', JSON.stringify(a)); } catch {}
    return a;
  }

  // تطبيق فوري من آخر مظهر محفوظ، ثم من الخادم
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem('rawda-appearance') || 'null'); } catch {}
  apply(cached);
  document.addEventListener('DOMContentLoaded', () => apply(window.APPEARANCE));
  fetch('/api/appearance').then(r => r.ok ? r.json() : null).then(a => { if (a) apply(a); }).catch(() => {});

  window.Theme = { apply, PALETTES, FONTS, SIZES, DEFAULTS, mix };
})();
