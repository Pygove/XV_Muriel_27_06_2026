// Tests para teen.html — variante teen de la invitación XV.
// Misma estructura que adulto.html (cubierto por form.spec.js); acá solo
// verificamos que el marker del DOM esté presente y que el payload del RSVP
// lleve teen_adulto = 'teen'.

const { test, expect } = require('@playwright/test');

async function dismissGate(page) {
  await page.click('#entryBtn');
  await page.waitForSelector('#entryGate', { state: 'detached', timeout: 3000 });
}

async function fillForm(page, { nombre, apellido, asistencia, mensaje = '' }) {
  await page.locator('#rsvpForm').scrollIntoViewIfNeeded();
  if (nombre)     await page.fill('#nombre', nombre);
  if (apellido)   await page.fill('#apellido', apellido);
  if (asistencia) await page.selectOption('#asistencia', asistencia);
  if (mensaje)    await page.fill('#mensaje', mensaje);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/webhook/**', route =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' })
  );
  await page.goto('/teen.html');
  await dismissGate(page);
});

test.describe('Estructura — teen', () => {
  test('el hero kicker está hardcodeado y no es sobreescrito por app.js', async ({ page }) => {
    // Si alguien renombra heroKickerTeen a heroKicker, app.js lo sobreescribiría
    // y además el payload perdería teen_adulto='teen'.
    await expect(page.locator('#heroKickerTeen')).toHaveCount(1);
    await expect(page.locator('#heroKicker')).toHaveCount(0);
    await expect(page.locator('#heroKickerAdulto')).toHaveCount(0);
  });
});

test.describe('Payload — teen', () => {
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

  test('asiste="No" → teen_adulto="teen"', async ({ page }) => {
    const payload = await submitAndCapture(page, {
      nombre: 'Lucía',
      apellido: 'Martínez',
      asistencia: 'No',
    });
    expect(payload['teen_adulto']).toBe('teen');
  });
});
