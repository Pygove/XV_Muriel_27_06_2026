// Tests para despues-12.html — invitación al baile (post-medianoche) de XV.
// Estructura distinta a la invitación completa: sin Itinerario, sin Galería,
// sin campo de restricciones alimentarias, y el payload del RSVP debe llevar
// teen_adulto = 'despues-12' (override basado en la presencia de #heroKickerD12).

const { test, expect } = require('@playwright/test');

async function dismissGate(page) {
  await page.click('#entryBtn');
  await page.waitForSelector('#entryGate', { state: 'detached', timeout: 3000 });
}

async function fillForm(page, { nombre, apellido, asistencia, mensaje = '' }) {
  await page.locator('#rsvpForm').scrollIntoViewIfNeeded();
  if (nombre)    await page.fill('#nombre', nombre);
  if (apellido)  await page.fill('#apellido', apellido);
  if (asistencia) await page.selectOption('#asistencia', asistencia);
  if (mensaje)   await page.fill('#mensaje', mensaje);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/webhook/**', route =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' })
  );
  await page.goto('/despues-12.html');
  await dismissGate(page);
});

// ── Estructura de la página ──────────────────────────────────────────────────
test.describe('Estructura — despues-12', () => {
  test('no contiene la sección de Itinerario', async ({ page }) => {
    await expect(page.locator('#itinerarioTitle')).toHaveCount(0);
  });

  test('no contiene la sección de Galería', async ({ page }) => {
    await expect(page.locator('#gallerySection')).toHaveCount(0);
    await expect(page.locator('#galleryGrid')).toHaveCount(0);
  });

  test('no contiene el campo de restricciones alimentarias', async ({ page }) => {
    await expect(page.locator('#dietaField')).toHaveCount(0);
  });

  test('el hero kicker está hardcodeado y no es sobreescrito por app.js', async ({ page }) => {
    // Si alguien renombra heroKickerD12 a heroKicker, app.js lo sobreescribiría
    // con "Mis Quince Años" o "Los invitan a celebrar".
    await expect(page.locator('#heroKickerD12')).toHaveText('Después de las 12');
    await expect(page.locator('#heroKicker')).toHaveCount(0);
  });
});

// ── Validaciones (sin dieta) ─────────────────────────────────────────────────
test.describe('Validaciones — despues-12', () => {
  test('no envía sin nombre', async ({ page }) => {
    await fillForm(page, { apellido: 'Pérez', asistencia: 'Sí' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('no envía sin apellido', async ({ page }) => {
    await fillForm(page, { nombre: 'Juan', asistencia: 'Sí' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('no envía sin seleccionar asistencia', async ({ page }) => {
    await fillForm(page, { nombre: 'Juan', apellido: 'Pérez' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('envía con asiste="Sí" sin tildar restricciones (no existen acá)', async ({ page }) => {
    // En la invitación completa esto sería bloqueado por el check custom de dieta;
    // acá debe pasar porque no hay #dietaField.
    await fillForm(page, { nombre: 'Juan', apellido: 'Pérez', asistencia: 'Sí' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).toHaveClass(/show/, { timeout: 5000 });
  });
});

// ── Payload ──────────────────────────────────────────────────────────────────
test.describe('Payload — despues-12', () => {
  async function submitAndCapture(page, data) {
    let payload;
    await page.route('**/webhook/**', async route => {
      payload = JSON.parse(route.request().postData());
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' });
    });
    await fillForm(page, data);
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).toHaveClass(/show/, { timeout: 5000 });
    return payload;
  }

  test('asiste="Sí" → teen_adulto="despues-12", sin Restricciones', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'María',
      apellido: 'López',
      asistencia: 'Sí',
    });
    expect(payload['Nombre']).toBe('María');
    expect(payload['Apellido']).toBe('López');
    expect(payload['¿Asistirás? ']).toBe('Sí');
    expect(payload['teen_adulto']).toBe('despues-12');
    expect(payload['Restricciones Alimenticias']).toBeUndefined();
  });

  test('asiste="No" → teen_adulto="despues-12" igual', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      asistencia: 'No',
    });
    expect(payload['¿Asistirás? ']).toBe('No');
    expect(payload['teen_adulto']).toBe('despues-12');
    expect(payload['Restricciones Alimenticias']).toBeUndefined();
  });

  test('observaciones se envían', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Ana',
      apellido: 'González',
      asistencia: 'Sí',
      mensaje: 'Nos vemos en la pista.',
    });
    expect(payload['mensaje']).toBe('Nos vemos en la pista.');
  });
});

// ── Error de red ─────────────────────────────────────────────────────────────
test.describe('Manejo de errores — despues-12', () => {
  test('muestra mensaje de error si el envío falla', async ({ page }) => {
    await page.route('**/webhook/**', route => route.fulfill({ status: 500 }));
    await fillForm(page, { nombre: 'Test', apellido: 'Error', asistencia: 'Sí' });
    await page.click('.btn-submit');
    await expect(page.locator('.form-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });
});
