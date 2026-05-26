// ─── CONFIGURACIÓN DEL EVENTO ────────────────────────────────────────────────
const CONFIG = {
  tipo: 'xv',                    // 'xv' | 'casamiento'
  // Para XV la variante teen/adulto NO se setea acá: cada variante tiene su
  // propio HTML (teen.html / adulto.html) servido en una URL distinta, y
  // app.js detecta cuál se cargó por el marker en el DOM (ver initForm).

  // Identidad
  nombre: 'Muriel',   // Para casamiento: 'Nombre & Nombre'
  fechaTexto: '27 · Junio · 2026',

  // Countdown target
  fechaISO: '2026-06-27T21:00:00-03:00',

  // Lugar
  salon: 'Salón Los Jesuitas - La Aventura',
  direccion: 'Av. Zapiola 965 - Posadas, Misiones',
  googleMapsUrl: 'https://maps.app.goo.gl/ZkdUe86bkT1dpZ8d8',

  // Música (bumpear ?v= si se reemplaza el archivo después de deploy)
  musicUrl: 'music.mp3',

  // Galería: lista de fotos. Vacía → sección oculta.
  gallery: [
    { src: 'fotos/01.webp'},
    { src: 'fotos/02.webp'},
    { src: 'fotos/03.webp'},
    { src: 'fotos/04.webp'},
    { src: 'fotos/05.webp'},
    { src: 'fotos/06.webp'},
    { src: 'fotos/07.webp'},
  ],

  // Webhook de n8n (appendea cada submission a la planilla del evento)
  webhookUrl: 'https://n8n.srv1189101.hstgr.cloud/webhook/ae3cacd0-d6d9-41f0-91a0-fcf94f2ae339',
  eventId: '1gJ-YxITbdFgRvR3wLK1NawutRI-7APLh8e1cCnIaOcY',

  // Dress code
  dresscode: 'Elegante<br>Por favor evitar el color dorado, azul y sus tonalidades',

  // Regalos
  alias: 'Jolie - Bolívar 1912 casi Colón',
  cbu: 'Garcia Joyas - Bolivar 2045',
  banco: 'Queen Juana- Cordoba 2123',
};
// ─────────────────────────────────────────────────────────────────────────────

/* ── Insertar textos dinámicos desde CONFIG ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('gateTitle',    CONFIG.nombre);
  set('heroName',     CONFIG.nombre);
  set('heroDate',     CONFIG.fechaTexto);
  set('footerName',   CONFIG.nombre);
  set('footerDate',   CONFIG.fechaTexto);
  set('lugarSalon',   CONFIG.salon);
  set('lugarDir',     CONFIG.direccion);
  const dresscodeEl = document.getElementById('dresscodeText');
  if (dresscodeEl) dresscodeEl.innerHTML = CONFIG.dresscode;
  set('regalosAlias', CONFIG.alias);
  set('regalosCbu',   CONFIG.cbu);
  set('regalosBanco', CONFIG.banco);

  // Kicker según tipo
  const kicker = document.getElementById('heroKicker');
  if (kicker) {
    kicker.textContent = CONFIG.tipo === 'xv' ? 'Mis Quince Años' : 'Los invitan a celebrar';
  }

  // Año en la portada (solo en las invitaciones completas; save-the-date y
  // despues-12 usan un sub fijo distinto).
  const gateYear = document.getElementById('gateYear');
  if (gateYear && CONFIG.fechaISO) {
    gateYear.textContent = new Date(CONFIG.fechaISO).getFullYear();
  }

  // Botón Google Maps
  const btnMaps = document.getElementById('btnMaps');
  if (btnMaps) {
    btnMaps.addEventListener('click', () => {
      window.open(CONFIG.googleMapsUrl, '_blank', 'noopener');
    });
  }

  // Título de la página: en el save-the-date no incluimos la fecha
  // para no spoilear (la fecha también queda oculta en el preview).
  const isSaveTheDate = !document.getElementById('rsvpForm');
  document.title = isSaveTheDate
    ? CONFIG.nombre
    : `${CONFIG.nombre} · ${CONFIG.fechaTexto}`;

  initCountdown();
  initScrollReveal();
  initGallery();
  initDietaToggle();
  initForm();
  initMusic();
  initGate();
});

/* ── Galería ────────────────────────────────────────────────────────────── */
function initGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const section = document.getElementById('gallerySection');
  if (!CONFIG.gallery || CONFIG.gallery.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }
  grid.innerHTML = CONFIG.gallery.map(({ src, alt = '' }) =>
    `<div class="gallery-tile"><img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy"></div>`
  ).join('');
}

/* ── Countdown ──────────────────────────────────────────────────────────── */
function initCountdown() {
  const target = new Date(CONFIG.fechaISO).getTime();
  const els = {
    d: document.getElementById('days'),
    h: document.getElementById('hours'),
    m: document.getElementById('minutes'),
    s: document.getElementById('seconds'),
    msg: document.getElementById('countdownMsg'),
  };
  if (!els.d) return;

  const pad = n => String(n).padStart(2, '0');
  const last = { d: '', h: '', m: '', s: '' };

  function setIfChanged(el, key, val) {
    if (last[key] === val) return;
    last[key] = val;
    el.textContent = val;
    el.classList.remove('flip');
    void el.offsetWidth;
    el.classList.add('flip');
  }

  let timer;

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '00';
      if (els.msg) els.msg.style.display = 'block';
      clearInterval(timer);
      return;
    }
    setIfChanged(els.d, 'd', pad(Math.floor(diff / 86400000)));
    setIfChanged(els.h, 'h', pad(Math.floor((diff % 86400000) / 3600000)));
    setIfChanged(els.m, 'm', pad(Math.floor((diff % 3600000) / 60000)));
    setIfChanged(els.s, 's', pad(Math.floor((diff % 60000) / 1000)));
  }

  tick();
  timer = setInterval(tick, 1000);
}

/* ── Scroll reveal ──────────────────────────────────────────────────────── */
function initScrollReveal() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

/* ── Dieta toggle ───────────────────────────────────────────────────────── */
function initDietaToggle() {
  const asistencia = document.getElementById('asistencia');
  const dietaField = document.getElementById('dietaField');
  if (!asistencia || !dietaField) return;

  asistencia.addEventListener('change', () => {
    dietaField.style.display = asistencia.value === 'Sí' ? 'block' : 'none';
  });

  // Mutual exclusivity: "No tengo preferencias" cancela las demás y viceversa
  const dietaCheckboxes = dietaField.querySelectorAll('input[name="Restricciones Alimenticias"]');
  const noPreferencias  = dietaField.querySelector('input[value="No tengo preferencias"]');
  if (!noPreferencias) return;

  dietaCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb === noPreferencias && cb.checked) {
        dietaCheckboxes.forEach(other => { if (other !== noPreferencias) other.checked = false; });
      } else if (cb !== noPreferencias && cb.checked) {
        noPreferencias.checked = false;
      }
    });
  });
}

/* ── Formulario RSVP ────────────────────────────────────────────────────── */
function initForm() {
  const form    = document.getElementById('rsvpForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validación nativa del browser corre antes de este handler (form sin novalidate).
    // Acá solo el chequeo custom: si asiste, exigir al menos una restricción tildada.
    const asistenciaEl = form.querySelector('#asistencia');
    const dietaField   = document.getElementById('dietaField');
    const dietaError   = document.getElementById('dietaError');
    const asiste = asistenciaEl && asistenciaEl.value === 'Sí';
    if (asiste && dietaField) {
      const checked = form.querySelectorAll('input[name="Restricciones Alimenticias"]:checked');
      const box = dietaField.querySelector('.checkboxes');
      if (checked.length === 0) {
        if (box) box.style.outline = '1px solid #c0392b';
        if (dietaError) dietaError.hidden = false;
        dietaField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (box) box.style.outline = '';
      if (dietaError) dietaError.hidden = true;
    }

    const submitBtn  = form.querySelector('.btn-submit');
    const origLabel  = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.textContent = 'Enviando...'; submitBtn.disabled = true; }

    // Construir payload: dieta como string separado por comas
    const fd = new FormData(form);
    const payload = {};
    const dieta   = [];
    fd.forEach((val, key) => {
      if (key === 'Restricciones Alimenticias') dieta.push(val);
      else payload[key] = val;
    });
    if (dieta.length) payload['Restricciones Alimenticias'] = dieta.join(', ');

    // Campos fijos inyectados desde CONFIG (no existen en el DOM como hidden inputs).
    payload['event_id']   = CONFIG.eventId;
    payload['event_name'] = CONFIG.nombre;
    if (CONFIG.tipo === 'xv') {
      // La variante se infiere del marker del DOM presente en cada HTML:
      //   heroKickerD12    → despues-12 (post-medianoche, sin menú de cena)
      //   heroKickerTeen   → teen
      //   heroKickerAdulto → adulto
      // El casamiento no setea este campo (usa index.html sin marker).
      if      (document.getElementById('heroKickerD12'))    payload['teen_adulto'] = 'despues-12';
      else if (document.getElementById('heroKickerTeen'))   payload['teen_adulto'] = 'teen';
      else if (document.getElementById('heroKickerAdulto')) payload['teen_adulto'] = 'adulto';
    }

    let ok = false;
    try {
      const res = await fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      ok = res.ok;
    } catch (_) {}

    if (!ok) {
      if (submitBtn) { submitBtn.textContent = origLabel; submitBtn.disabled = false; }
      let errEl = form.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'form-error';
        form.appendChild(errEl);
      }
      errEl.textContent = 'Hubo un error al enviar. Por favor intentá de nuevo.';
      return;
    }

    form.style.display = 'none';
    if (success) {
      success.classList.add('show');
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* ── Música ─────────────────────────────────────────────────────────────── */
let audio, musicPlaying = false;

function initMusic() {
  audio = new Audio(CONFIG.musicUrl);
  audio.loop    = true;
  audio.volume  = 0.7;

  const btn = document.getElementById('musicToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (musicPlaying) {
      audio.pause();
      musicPlaying = false;
      btn.classList.add('muted');
      btn.setAttribute('aria-label', 'Activar música');
    } else {
      audio.play().then(() => {
        musicPlaying = true;
        btn.classList.remove('muted');
        btn.setAttribute('aria-label', 'Silenciar música');
      }).catch(err => console.warn('audio.play() rechazado:', err));
    }
  });
}

/* ── Entry gate ─────────────────────────────────────────────────────────── */
function initGate() {
  const gate = document.getElementById('entryGate');
  if (!gate) return;

  function enter() {
    if (audio) {
      audio.play().then(() => {
        musicPlaying = true;
        const musicBtn = document.getElementById('musicToggle');
        if (musicBtn) {
          musicBtn.classList.remove('muted');
          musicBtn.setAttribute('aria-label', 'Silenciar música');
        }
      }).catch(err => console.warn('audio.play() rechazado:', err));
    }
    gate.classList.add('fade-out');
    document.body.classList.remove('gate-active');
    setTimeout(() => gate.remove(), 580);
  }

  // Click en cualquier parte de la portada (no solo el botón) la cierra.
  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
  });
}
