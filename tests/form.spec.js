const { test, expect } = require('@playwright/test');

const RESTRICTIONS = [
  'Vegetariano/a',
  'Celíaco/a',
  'Intolerante a la lactosa',
  'Vegano/a',
  'Intolerante a los frutos secos',
];
const NO_PREF = 'No tengo preferencias';

// Combinaciones de restricciones a probar (además de ninguna y todas)
const RESTRICTION_COMBOS = [
  ...RESTRICTIONS.map(r => [r]),                    // cada una por separado
  ['Vegetariano/a', 'Celíaco/a'],                   // combinación parcial
  ['Celíaco/a', 'Intolerante a la lactosa', 'Vegano/a'],
  RESTRICTIONS,                                      // todas las "reales"
  [NO_PREF],                                         // opt-out
];

async function dismissGate(page) {
  await page.click('#entryBtn');
  await page.waitForSelector('#entryGate', { state: 'detached', timeout: 3000 });
}

async function fillForm(page, { nombre, apellido, asistencia, restricciones = [], mensaje = '' }) {
  await page.locator('#rsvpForm').scrollIntoViewIfNeeded();
  if (nombre)   await page.fill('#nombre', nombre);
  if (apellido) await page.fill('#apellido', apellido);
  if (asistencia) await page.selectOption('#asistencia', asistencia);
  for (const r of restricciones) {
    await page.check(`input[value="${r}"]`);
  }
  if (mensaje) {
    await page.fill('#mensaje', mensaje);
  }
}

// ── Setup compartido ─────────────────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  // Interceptar Google Sheets para que no haya requests reales
  await page.route('**/webhook/**', route =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' })
  );
  await page.goto('/adulto.html');
  await dismissGate(page);
});

// ── Comportamiento de UI ─────────────────────────────────────────────────────
test.describe('Visibilidad de restricciones alimentarias', () => {
  test('ocultas por defecto', async ({ page }) => {
    await expect(page.locator('#dietaField')).toBeHidden();
  });

  test('visibles al seleccionar Sí', async ({ page }) => {
    await page.selectOption('#asistencia', 'Sí');
    await expect(page.locator('#dietaField')).toBeVisible();
  });

  test('se ocultan al cambiar de Sí a No', async ({ page }) => {
    await page.selectOption('#asistencia', 'Sí');
    await page.selectOption('#asistencia', 'No');
    await expect(page.locator('#dietaField')).toBeHidden();
  });
});

// ── Exclusividad mutua de "No tengo preferencias" ────────────────────────────
test.describe('Mutua exclusividad — No tengo preferencias', () => {
  test.beforeEach(async ({ page }) => {
    await page.selectOption('#asistencia', 'Sí');
  });

  test('marcar "No tengo preferencias" destilda las demás', async ({ page }) => {
    await page.check(`input[value="Vegetariano/a"]`);
    await page.check(`input[value="Celíaco/a"]`);
    await page.check(`input[value="${NO_PREF}"]`);
    await expect(page.locator(`input[value="Vegetariano/a"]`)).not.toBeChecked();
    await expect(page.locator(`input[value="Celíaco/a"]`)).not.toBeChecked();
    await expect(page.locator(`input[value="${NO_PREF}"]`)).toBeChecked();
  });

  test('marcar una restricción real destilda "No tengo preferencias"', async ({ page }) => {
    await page.check(`input[value="${NO_PREF}"]`);
    await page.check(`input[value="Vegano/a"]`);
    await expect(page.locator(`input[value="${NO_PREF}"]`)).not.toBeChecked();
    await expect(page.locator(`input[value="Vegano/a"]`)).toBeChecked();
  });
});

// ── Validaciones del formulario ──────────────────────────────────────────────
test.describe('Validaciones', () => {
  test('no envía sin nombre', async ({ page }) => {
    await fillForm(page, { apellido: 'Pérez', asistencia: 'No' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('no envía sin apellido', async ({ page }) => {
    await fillForm(page, { nombre: 'Juan', asistencia: 'No' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('no envía sin seleccionar asistencia', async ({ page }) => {
    await fillForm(page, { nombre: 'Juan', apellido: 'Pérez' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('no envía con asiste="Sí" y ninguna restricción tildada', async ({ page }) => {
    await fillForm(page, { nombre: 'Juan', apellido: 'Pérez', asistencia: 'Sí' });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });
});

// ── Envíos válidos — no asiste ───────────────────────────────────────────────
test.describe('Envío — No asiste', () => {
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

  test('sin observaciones', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      asistencia: 'No',
    });
    expect(payload['Nombre']).toBe('Carlos');
    expect(payload['Apellido']).toBe('Rodríguez');
    expect(payload['¿Asistirás? ']).toBe('No');
    expect(payload['Restricciones Alimenticias']).toBeFalsy();
    expect(payload['teen_adulto']).toBe('adulto');
  });

  test('con observaciones', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Ana',
      apellido: 'González',
      asistencia: 'No',
      mensaje: 'Muchas gracias por la invitación.',
    });
    expect(payload['mensaje']).toBe('Muchas gracias por la invitación.');
  });
});

// ── Envíos válidos — asiste ──────────────────────────────────────────────────
test.describe('Envío — Asiste', () => {
  async function submitAndCapture(page, data) {
    let payload;
    await page.route('**/webhook/**', async route => {
      payload = JSON.parse(route.request().postData());
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' });
    });
    await fillForm(page, { asistencia: 'Sí', ...data });
    await page.click('.btn-submit');
    await expect(page.locator('#formSuccess')).toHaveClass(/show/, { timeout: 5000 });
    return payload;
  }

  for (const combo of RESTRICTION_COMBOS) {
    test(`restricciones: ${combo.join(' + ')}`, async ({ page }) => {
      const payload = await submitAndCapture(page, {
        nombre: 'María',
        apellido: 'López',
        restricciones: combo,
      });
      const enviadas = payload['Restricciones Alimenticias'].split(', ');
      expect(enviadas).toEqual(expect.arrayContaining(combo));
      expect(enviadas).toHaveLength(combo.length);
    });
  }

  test('todas las restricciones reales con observaciones', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Sofía',
      apellido: 'Fernández',
      restricciones: RESTRICTIONS,
      mensaje: 'Alérgica también al maní.',
    });
    expect(payload['Restricciones Alimenticias']).toBe(RESTRICTIONS.join(', '));
    expect(payload['mensaje']).toBe('Alérgica también al maní.');
  });
});

// ── Error de red ─────────────────────────────────────────────────────────────
test.describe('Manejo de errores', () => {
  test('muestra mensaje de error si el envío falla', async ({ page }) => {
    await page.route('**/webhook/**', route => route.fulfill({ status: 500 }));
    await fillForm(page, { nombre: 'Test', apellido: 'Error', asistencia: 'No' });
    await page.click('.btn-submit');
    await expect(page.locator('.form-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#formSuccess')).not.toHaveClass(/show/);
  });

  test('el botón vuelve a estar activo después de un error', async ({ page }) => {
    await page.route('**/webhook/**', route => route.fulfill({ status: 500 }));
    await fillForm(page, { nombre: 'Test', apellido: 'Error', asistencia: 'No' });
    await page.click('.btn-submit');
    await expect(page.locator('.btn-submit')).toBeEnabled({ timeout: 5000 });
  });
});
