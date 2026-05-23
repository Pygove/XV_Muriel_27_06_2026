/* ═══════════════════════════════════════════════════════════════════════════
   theme-warp.js — Viaje por las estrellas al ingresar
   ───────────────────────────────────────────────────────────────────────────
   Engancha el click en el botón "Hacé clic para ingresar" (lo detecta por
   texto, sin necesidad de tocar el HTML). Al hacer click:
     1) Previene la acción original.
     2) Crea un overlay full-screen con ~140 estrellas-streak que estallan
        desde el centro (efecto warp / hyperspace).
     3) Después de ~2s con un flash blanco final, ejecuta nuevamente la
        acción original del botón (link, click handler, etc).

   Cómo incluirlo en el HTML: agregar UNA línea antes de </body>:
       <script src="theme-warp.js" defer></script>
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Configuración ────────────────────────────────────────────────────────
  const TRIGGER_TEXT_RE = /ingresar|entrar|abrir invitaci/i; // texto del botón

  // Detección de mobile para versión liviana (Android sufre con muchos streaks
  // animados + filters al mismo tiempo).
  const isMobile = window.matchMedia('(max-width: 820px)').matches
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // En Android específicamente bajamos aún más (los Chrome móviles sufren
  // con muchas animaciones DOM simultáneas).
  const isAndroid = /Android/i.test(navigator.userAgent);

  const STREAK_COUNT = isAndroid ? 35 : (isMobile ? 55 : 140);
  const WARP_DURATION_MS = 2000;                             // duración del viaje
  const FLASH_AT_MS = 1700;                                  // cuándo arranca el flash blanco

  // Respetar prefers-reduced-motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Helper: ¿este elemento es el "botón de ingresar"? ────────────────────
  function isGateButton(el) {
    if (!el) return false;
    // Si el target está dentro de un <a> o <button>, considerar ese padre
    const btn = el.closest('a, button, .celestial-btn, [role="button"]');
    if (!btn) return false;
    const txt = (btn.textContent || '').trim();
    return TRIGGER_TEXT_RE.test(txt);
  }

  // ── Construir el overlay del warp ────────────────────────────────────────
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'warp-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Núcleo central pulsante
    const core = document.createElement('div');
    core.className = 'warp-core';
    overlay.appendChild(core);

    // Flash blanco final
    const flash = document.createElement('div');
    flash.className = 'warp-flash';
    overlay.appendChild(flash);

    // Streaks
    const frag = document.createDocumentFragment();
    for (let i = 0; i < STREAK_COUNT; i++) {
      const s = document.createElement('div');
      s.className = 'warp-streak' + (Math.random() < 0.12 ? ' bright' : '');
      // Ángulo aleatorio (0-360°)
      s.style.setProperty('--angle', (Math.random() * 360).toFixed(2) + 'deg');
      // Delay negativo aleatorio: las estrellas ya están "en vuelo" cuando
      // arranca el efecto (así no esperamos al inicio del ciclo).
      const delay = -(Math.random() * 1.6).toFixed(2);
      s.style.setProperty('--delay', delay + 's');
      // Duración variable (más corta = más rápida = más cerca del observador)
      const dur = (1.0 + Math.random() * 1.8).toFixed(2);
      s.style.setProperty('--duration', dur + 's');
      // Profundidad / brillo: estrellas más lejanas son más tenues
      const depth = (0.45 + Math.random() * 0.55).toFixed(2);
      s.style.setProperty('--depth', depth);
      // Distancia máxima (algunas vuelan más lejos para sensación 3D)
      const dist = (70 + Math.random() * 40).toFixed(0);
      s.style.setProperty('--max-dist', dist + 'vmax');
      frag.appendChild(s);
    }
    overlay.appendChild(frag);

    return overlay;
  }

  // ── Disparar el efecto ───────────────────────────────────────────────────
  let warpInFlight = false;

  function triggerWarp(onComplete) {
    if (warpInFlight) return;
    warpInFlight = true;

    if (reduceMotion) {
      // Fallback sin animación: pequeño retraso y se ejecuta el callback
      document.body.classList.add('warp-active');
      setTimeout(() => {
        document.body.classList.remove('warp-active');
        warpInFlight = false;
        onComplete();
      }, 350);
      return;
    }

    const overlay = buildOverlay();
    document.body.appendChild(overlay);
    // Forzar reflow para que la transición de opacity arranque
    // eslint-disable-next-line no-unused-expressions
    overlay.offsetHeight;
    document.body.classList.add('warp-active');

    // Flash blanco al final
    setTimeout(() => {
      document.body.classList.add('warp-ending');
    }, FLASH_AT_MS);

    // Fin del viaje: ejecutar callback, luego reveal suave, luego limpiar
    setTimeout(() => {
      onComplete();
      // Pequeño wait para que el flash blanco esté en pleno (overlap visual)
      setTimeout(() => {
        // 1. Freeze: el overlay aún cubre todo mientras swapeamos animaciones
        //    Agregamos warp-reveal ANTES de remover warp-active para que no
        //    haya frame en blanco entre una animación y la otra.
        document.body.classList.add('warp-reveal');
        document.body.classList.remove('warp-active');
        document.body.classList.remove('warp-ending');
        overlay.remove();

        // 2. Después de que el reveal-animation termine, limpiamos todo
        setTimeout(() => {
          document.body.classList.remove('warp-reveal');
          warpInFlight = false;
        }, 600); // ~duración de warpReveal (0.55s) + margen
      }, 150);
    }, WARP_DURATION_MS);
  }

  // ── Interceptar el click en el botón ─────────────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('a, button, .celestial-btn, [role="button"]');
    if (!btn) return;
    if (!isGateButton(btn)) return;
    if (btn.dataset.warpDone === '1') return; // ya disparado, dejar pasar

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    triggerWarp(function () {
      // Re-emitir el click sobre el botón, marcado como "ya hecho", para
      // que el handler original ejecute la transición al gate.
      btn.dataset.warpDone = '1';
      // Si es un link, navegar al href; si no, click sintético
      if (btn.tagName === 'A' && btn.getAttribute('href')) {
        // Click sintético respeta event listeners y target=_blank
        btn.click();
      } else {
        btn.click();
      }
    });
  }, true); // capture-phase: interceptamos ANTES que el handler original

  // ── API pública opcional (por si querés dispararlo manualmente) ──────────
  window.themeWarp = {
    trigger: triggerWarp,
    isActive: function () { return warpInFlight; }
  };
})();
