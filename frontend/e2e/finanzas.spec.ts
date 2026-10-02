import { expect, test, type Locator, type Page } from '@playwright/test';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Cuenta = {
  id: number;
  nombre: string;
  tipo: string;
  saldoActual: number;
  moneda: string;
  activo: boolean;
  institucionFinanciera?: string | null;
  cashbackPorcentaje?: number | null;
  cashbackLimiteMensual?: number | null;
  limiteCredito?: number | null;
  diaCorte?: number | null;
  diaPago?: number | null;
};

type Transaccion = {
  id: number;
  cuentaId: number | null;
  cuentaDestinoId: number | null;
  tipo: string;
  monto: number;
  montoDestino: number | null;
  tasaCambio: number | null;
  moneda: string;
  monedaDestino: string | null;
  descripcion: string;
  notas: string | null;
  cashbackAutomatico?: boolean;
};

async function apiGet<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  expect(token).not.toBeNull();
  const response = await page.request.get(`http://localhost:18080/api${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const body = (await response.json()) as ApiResponse<T>;
  expect(body.success, body.message).toBeTruthy();
  return body.data;
}

async function apiDelete(page: Page, path: string): Promise<number> {
  const token = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  expect(token).not.toBeNull();
  const response = await page.request.delete(`http://localhost:18080/api${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.status();
}

async function apiPost(page: Page, path: string, data: unknown): Promise<number> {
  const token = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  expect(token).not.toBeNull();
  const response = await page.request.post(`http://localhost:18080/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data
  });
  return response.status();
}

/**
 * Elige la opción que contenga el fragmento dado. Hay dos clases de control en la
 * app: los <select> nativos y el selector de cuentas propio, que abre una lista.
 */
async function selectOptionContaining(page: Page, select: Locator, fragment: string): Promise<void> {
  if (await select.evaluate(node => node.tagName === 'SELECT')) {
    const valor = await select.evaluate((node, texto) => {
      const opciones = Array.from((node as HTMLSelectElement).options);
      return opciones.find(opcion => opcion.textContent?.includes(texto))?.value ?? null;
    }, fragment);
    expect(valor, `Ninguna opción contiene "${fragment}"`).not.toBeNull();
    await select.selectOption(valor!);
    return;
  }

  await select.click();
  const selectId = await select.getAttribute('id');
  const opciones = selectId
    ? page.locator(`#${selectId}-opciones`)
    : select.locator('xpath=following-sibling::*[@role="listbox"]');
  const opcion = opciones.getByRole('option').filter({ hasText: fragment }).first();
  await expect(opcion).toBeVisible();
  await opcion.click();
  // Al elegir, la lista se cierra y el botón queda con la cuenta nueva.
  await expect(opciones).toHaveCount(0);
}

/**
 * El selector muestra un solo mosaico con lo elegido. Hay que abrirlo para ver
 * la rejilla completa, y ahi es donde aparecen Nueva y Editar.
 */
async function selectCategory(page: Page, name: string): Promise<void> {
  const selector = page.locator('#categoriaId');
  await expect(selector).toBeVisible();
  await selector.click();
  const option = page.locator('#categoriaId-opciones [role=option]').filter({ hasText: name });
  await expect(option.locator('app-categoria-icono')).toBeVisible();
  await option.locator('button').click();
  // Al elegir, el menu se cierra y solo queda el mosaico con esa categoria.
  await expect(page.locator('#categoriaId-opciones')).toHaveCount(0);
  await expect(selector).toContainText(name);
}

/**
 * El dashboard ya no tiene un boton "Nuevo Movimiento": cada operacion abre el
 * formulario con su tipo puesto desde las acciones rapidas.
 */
async function openMovementDialog(page: Page, tipo: 'Gasto' | 'Ingreso' | 'Transf.' = 'Gasto'): Promise<Locator> {
  await page.getByRole('group', { name: 'Acciones rápidas para registrar un movimiento' })
    .getByRole('button').filter({ hasText: tipo })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Registrar Movimiento' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function budgetCard(page: Page, category: string): Locator {
  return page.getByRole('heading', { name: category, exact: true })
    .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');
}

function movementText(page: Page, text: string): Locator {
  return page.locator(
    '[role="region"][aria-label^="Movimientos"]:visible, ' +
    '[role="region"][aria-label^="Últimos movimientos"]:visible, ' +
    '[aria-label="Lista de movimientos"]:visible, ' +
    '[aria-label="Lista de últimos movimientos"]:visible'
  ).getByText(text);
}

test('auth, cuentas, monedas, movimientos, presupuestos, categorías y analítica', async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/cuentas');
  await expect(page).toHaveURL(/\/login$/);

  await page.setViewportSize({ width: 320, height: 740 });
  const loginHeaderLink = page.getByRole('link', { name: 'Iniciar Sesión', exact: true });
  const registerHeaderLink = page.getByRole('link', { name: 'Crear Cuenta' });
  await expect(loginHeaderLink).toBeHidden();
  await expect(registerHeaderLink).toBeHidden();
  const guestBrandBounds = await page.getByRole('link', { name: 'Kaptal - ir al inicio' }).boundingBox();
  expect(guestBrandBounds).not.toBeNull();
  expect(Math.abs(guestBrandBounds!.x + guestBrandBounds!.width / 2 - 160)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(loginHeaderLink).toBeVisible();
  await expect(registerHeaderLink).toBeVisible();
  const guestActionsBounds = await page.getByRole('link', { name: 'Iniciar Sesión', exact: true }).boundingBox();
  const topHeaderBounds = await page.locator('app-navbar header').boundingBox();
  expect(guestActionsBounds).not.toBeNull();
  expect(topHeaderBounds).not.toBeNull();
  expect(topHeaderBounds!.height).toBeGreaterThanOrEqual(80);
  expect(guestActionsBounds!.y + guestActionsBounds!.height / 2)
    .toBeGreaterThanOrEqual(topHeaderBounds!.y + topHeaderBounds!.height / 2 - 10);
  expect(guestActionsBounds!.y + guestActionsBounds!.height / 2)
    .toBeLessThanOrEqual(topHeaderBounds!.y + topHeaderBounds!.height / 2 + 10);
  await page.setViewportSize({ width: 320, height: 740 });

  await page.goto('/registro');
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const email = `e2e-${Date.now()}@example.test`;
  await page.getByLabel('Nombre Completo').fill('Usuario E2E');
  await page.locator('#email').fill('correo-invalido');
  await page.locator('#password').fill('A!23456');
  await expect(page.getByText(/correo v.lido con @/)).toBeVisible();
  await expect(page.getByText(/debe tener entre 8 y 20 caracteres/)).toBeVisible();
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel(/Contraseña/).fill('A!234567');
  await page.getByRole('button', { name: 'Crear mi Cuenta' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Resumen Financiero' })).toBeVisible();
  const mobileNav = page.getByRole('navigation', { name: 'Navegación principal' });
  await mobileNav.getByRole('button', { name: 'Más destinos' }).click();
  await expect(page.getByRole('navigation', { name: 'Más destinos' }).getByRole('link', { name: 'Libro diario' })).toBeVisible();
  await mobileNav.getByRole('button', { name: 'Más destinos' }).click();
  // Ingresos y gastos van en dos columnas dentro de la tarjeta unica de control financiero.
  const mobileDashboardSummary = page.getByRole('region', { name: 'Control Financiero' });
  const mobileDashboardIncomeCard = mobileDashboardSummary.getByText('Ingresos mes').locator('xpath=ancestor::div[1]');
  const mobileDashboardExpenseCard = mobileDashboardSummary.getByText('Gastos mes').locator('xpath=ancestor::div[1]');
  const [mobileIncomeBounds, mobileExpenseBounds] = await Promise.all([
    mobileDashboardIncomeCard.boundingBox(),
    mobileDashboardExpenseCard.boundingBox()
  ]);
  expect(mobileIncomeBounds).not.toBeNull();
  expect(mobileExpenseBounds).not.toBeNull();
  // A 320px caben los dos lado a lado, no apilados.
  expect(Math.abs(mobileIncomeBounds!.y - mobileExpenseBounds!.y)).toBeLessThanOrEqual(2);
  expect(mobileExpenseBounds!.x).toBeGreaterThan(mobileIncomeBounds!.x + mobileIncomeBounds!.width);
  // El saldo no se repite: el monto grande y la linea de disponible son cosas distintas.
  await expect(mobileDashboardSummary.getByText('Total balance:')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByText('Hola, Usuario E2E.')).toBeVisible();
  const dashboardDate = page.getByLabel('Fecha actual');
  await expect(dashboardDate).toBeVisible();
  await expect(dashboardDate).toContainText(/\d{1,2} de [a-záéíóú]+ de \d{4}/i);
  await expect(page.getByRole('button', { name: 'Actualizar resumen financiero' })).toHaveCount(0);
  await expect(page.getByText('Personal', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Navegación de escritorio' }).getByRole('link', { name: 'Configuración' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Perfil' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible();
  await expect(page.getByText('Conectado como')).toBeVisible();
  const desktopNavigation = page.getByRole('navigation', { name: 'Navegación de escritorio' });
  await expect(desktopNavigation.getByRole('link', { name: 'Asistente IA' })).toBeVisible();
  await desktopNavigation.getByRole('button', { name: 'Más' }).click();
  await expect(desktopNavigation.getByRole('link', { name: 'Libro diario' })).toBeVisible();
  await expect(desktopNavigation.getByRole('link', { name: 'Transacciones' })).toBeVisible();
  await expect(page.getByText(/Consulta tus finanzas y solicita movimientos o presupuestos/)).toHaveCount(0);
  const recentTransactionsSection = page.getByRole('region', { name: 'Últimos movimientos' });
  const recentHeadingBounds = await recentTransactionsSection.getByRole('heading', { name: 'Últimos movimientos' }).boundingBox();
  const viewMoreBounds = await recentTransactionsSection.getByRole('button', { name: 'Ver más' }).boundingBox();
  expect(recentHeadingBounds).not.toBeNull();
  expect(viewMoreBounds).not.toBeNull();
  expect(Math.abs(recentHeadingBounds!.y + recentHeadingBounds!.height / 2 - (viewMoreBounds!.y + viewMoreBounds!.height / 2)))
    .toBeLessThanOrEqual(2);
  await page.screenshot({ path: 'test-results/capturas/dashboard-transacciones-recientes.png', fullPage: true });
  await expect(page.getByText('Disponible', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver asistente' })).toHaveCount(0);
  await desktopNavigation.getByRole('link', { name: 'Asistente IA' }).click();
  await expect(page.getByRole('heading', { name: 'Asistente IA' })).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText('Conectando con Gemini');
  await expect(page.getByRole('status')).toContainText(
    /Gemini está listo|No se pudo verificar Gemini|Gemini no está configurado/
  );
  await page.screenshot({ path: 'test-results/capturas/asistente-ia-escritorio.png', fullPage: true });
  await page.getByRole('link', { name: 'Panel General' }).click();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(page).toHaveURL(/\/transacciones$/);
  await expect(page.getByRole('heading', { name: 'Transacciones recientes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo Movimiento' })).toBeVisible();
  await page.getByRole('link', { name: 'Inicio' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen Financiero' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBrand = page.getByRole('link', { name: 'Kaptal - ir al inicio' }).boundingBox();
  const mobileProfile = page.getByRole('link', { name: 'Perfil' }).boundingBox();
  const mobileLogout = page.getByRole('button', { name: 'Salir' }).boundingBox();
  const [brandBounds, profileBounds, logoutBounds] = await Promise.all([mobileBrand, mobileProfile, mobileLogout]);
  expect(brandBounds).not.toBeNull();
  expect(profileBounds).not.toBeNull();
  expect(logoutBounds).not.toBeNull();
  expect(brandBounds!.x).toBeLessThan(24);
  expect(profileBounds!.y).toBe(logoutBounds!.y);
  expect(profileBounds!.x).toBeGreaterThan(brandBounds!.x + brandBounds!.width / 2);
  expect(profileBounds!.y).toBeLessThan(80);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const movementDialog = await openMovementDialog(page, 'Gasto');
  await expect.poll(() => movementDialog.evaluate(element => getComputedStyle(element).animationName))
    .toBe('none');
  await expect.poll(() => movementDialog.getByRole('button', { name: 'Cancelar' })
    .evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  const movementDialogBounds = await movementDialog.boundingBox();
  expect(movementDialogBounds).not.toBeNull();
  expect(movementDialogBounds!.x).toBeGreaterThanOrEqual(0);
  expect(movementDialogBounds!.x + movementDialogBounds!.width).toBeLessThanOrEqual(390);
  expect(movementDialogBounds!.height).toBeLessThanOrEqual(844);
  const cancelButtonBounds = await movementDialog.getByRole('button', { name: 'Cancelar' }).boundingBox();
  const saveButtonBounds = await movementDialog.getByRole('button', { name: 'Guardar Movimiento' }).boundingBox();
  expect(cancelButtonBounds).not.toBeNull();
  expect(saveButtonBounds).not.toBeNull();
  expect(Math.abs(cancelButtonBounds!.width - saveButtonBounds!.width)).toBeLessThan(1);
  const focusables = movementDialog.locator('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
  const firstFocusable = focusables.first();
  const lastFocusable = focusables.last();
  await expect.poll(() => movementDialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
  await firstFocusable.focus();
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => lastFocusable.evaluate(element => element === document.activeElement)).toBeTruthy();
  await page.keyboard.press('Tab');
  await expect.poll(() => firstFocusable.evaluate(element => element === document.activeElement)).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(movementDialog).toBeHidden();
  // El foco vuelve a la accion que abrio el formulario, no a un boton que ya no existe.
  await expect(
    page.getByRole('group', { name: 'Acciones rápidas para registrar un movimiento' })
      .getByRole('button').filter({ hasText: 'Gasto' })
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const mobileNavigation = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation).toHaveCSS('position', 'fixed');
  await expect(mobileNavigation.locator('svg use')).toHaveCount(5);
  await expect(mobileNavigation.getByRole('link', { name: 'Inicio' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Asistente IA' })).toBeVisible();
  await expect(mobileNavigation.getByRole('button', { name: 'Más destinos' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Categorías' })).toHaveCount(0);
  const mobileNavLinks = await mobileNavigation.locator('a, button').evaluateAll(links =>
    links.map(link => {
      const bounds = link.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, width: bounds.width };
    })
  );
  expect(mobileNavLinks).toHaveLength(5);
  expect(mobileNavLinks.every(link => link.width > 0 && link.left >= 0 && link.right <= 390)).toBeTruthy();
  expect(mobileNavLinks[0].left).toBeLessThan(mobileNavLinks[1].left);
  expect(mobileNavLinks[1].left).toBeLessThan(mobileNavLinks[2].left);
  expect(mobileNavLinks[2].left).toBeLessThan(mobileNavLinks[3].left);
  expect(mobileNavLinks[3].left).toBeLessThan(mobileNavLinks[4].left);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await mobileNavigation.getByRole('link', { name: 'Cuentas' }).click();
  await expect(page.getByRole('heading', { name: 'Mis cuentas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await mobileNavigation.getByRole('link', { name: 'Inicio' }).click();
  await mobileNavigation.getByRole('link', { name: 'Asistente IA' }).click();
  await expect(page.getByRole('heading', { name: 'Asistente IA' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Asistente IA' }))
    .toHaveCSS('color', 'rgb(5, 150, 105)');
  await page.screenshot({ path: 'test-results/capturas/asistente-ia-movil.png', fullPage: true });
  await mobileNavigation.getByRole('link', { name: 'Inicio' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileRecentHeader = page.getByRole('region', { name: 'Últimos movimientos' });
  await expect(mobileRecentHeader.getByRole('heading', { name: 'Últimos movimientos' })).toBeVisible();
  await expect(mobileRecentHeader.getByRole('button', { name: 'Ver más' })).toBeVisible();
  await expect.poll(async () => {
    const [titleBounds, viewMoreBounds] = await Promise.all([
      mobileRecentHeader.getByRole('heading', { name: 'Últimos movimientos' }).boundingBox(),
      mobileRecentHeader.getByRole('button', { name: 'Ver más' }).boundingBox()
    ]);
    if (!titleBounds || !viewMoreBounds) return Number.POSITIVE_INFINITY;
    return Math.abs(titleBounds.y + titleBounds.height / 2 - (viewMoreBounds.y + viewMoreBounds.height / 2));
  }).toBeLessThanOrEqual(2);
  await page.screenshot({ path: 'test-results/capturas/dashboard-transacciones-recientes-movil.png', fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(mobileNavigation).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuración', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Respaldo de tus datos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar respaldo' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Oscuro' }).click();
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('link', { name: 'Administrar categorías' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('A!234567');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Claro' }).click();
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('link', { name: 'Panel General' }).click();

  let cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.some(cuenta => cuenta.nombre === 'Billetera / Efectivo' && cuenta.moneda === 'MXN')).toBeTruthy();

  await page.getByRole('link', { name: 'Cuentas' }).click();
  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await expect(page.getByLabel('Tipo de cuenta').locator('option')).toContainText([
    'Tarjeta de Crédito',
    'Cuenta de Ahorro'
  ]);
  await expect(page.getByLabel('Tipo de cuenta').locator('option', { hasText: 'Débito' })).toHaveCount(0);
  await page.getByLabel('Banco o institución (opcional)').selectOption('bbva');
  await expect(page.getByLabel('Nombre')).toHaveValue('BBVA México');
  await expect(page.getByText('Identificador BBVA incluido en la tarjeta de cuenta.')).toBeVisible();
  await page.getByLabel('Nombre').fill('E2E Ahorro USD');
  await selectOptionContaining(page, page.getByLabel('Tipo de cuenta'), 'Ahorro');
  await page.getByLabel('Saldo inicial').fill('100');
  await selectOptionContaining(page, page.getByLabel('Moneda'), 'USD');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const cuentaUsdCardCheck = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await expect(cuentaUsdCardCheck).toBeVisible();
  await expect(cuentaUsdCardCheck.getByLabel('Identificador de BBVA México')).toBeVisible();

  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await page.getByLabel('Nombre').fill('E2E Cuenta MXN');
  await selectOptionContaining(page, page.getByLabel('Tipo de cuenta'), 'Inversión');
  await page.getByLabel('Saldo inicial').fill('50');
  await selectOptionContaining(page, page.getByLabel('Moneda'), 'MXN');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'E2E Cuenta MXN' })).toBeVisible();

  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  const cuentaUsd = cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD');
  const cuentaMxn = cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN');
  expect(cuentaUsd?.saldoActual).toBe(100);
  expect(cuentaUsd?.institucionFinanciera).toBe('bbva');
  expect(cuentaMxn?.saldoActual).toBe(50);

  const cuentaUsdCard = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await cuentaUsdCard.getByRole('button', { name: 'Editar' }).click();
  await selectOptionContaining(page, page.getByLabel('Moneda'), 'CAD');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('alert')).toContainText('No se puede cambiar la moneda');
  await selectOptionContaining(page, page.getByLabel('Moneda'), 'USD');
  await page.getByLabel('Descripción (opcional)').fill('Cuenta de prueba E2E');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cuenta de prueba E2E')).toBeVisible();

  const movimientosIniciales = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  expect(movimientosIniciales).toContainEqual(expect.objectContaining({
    tipo: 'SALDO_INICIAL',
    monto: 100,
    moneda: 'USD',
    descripcion: 'Saldo inicial'
  }));

  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Historial de movimientos' })).toHaveCount(0);
  const sessionToken = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  expect(sessionToken).not.toBeNull();
  const respaldoResponse = await page.request.get('http://localhost:18080/api/perfil/respaldo', {
    headers: { Authorization: `Bearer ${sessionToken}` }
  });
  expect(respaldoResponse.ok()).toBeTruthy();
  expect(respaldoResponse.headers()['cache-control']).toContain('no-store');
  const respaldo = await respaldoResponse.json() as {
    perfil: Record<string, unknown>;
    transacciones: Transaccion[];
    historialMovimientos: Array<{ accion: string }>;
    libroDiario: Array<{ tipoEvento: string; lineas: Array<{ moneda: string; lado: string }> }>;
  };
  expect(respaldo.transacciones.length).toBeGreaterThan(0);
  expect(respaldo.historialMovimientos.length).toBeGreaterThan(0);
  expect(respaldo.libroDiario.length).toBeGreaterThan(0);
  expect(respaldo.libroDiario[0].lineas.length).toBeGreaterThanOrEqual(2);
  expect(JSON.stringify(respaldo.perfil)).not.toContain('password');
  const [respaldoDescargado] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar respaldo' }).click()
  ]);
  expect(respaldoDescargado.suggestedFilename()).toMatch(/^kaptal-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const desktopLedgerNavigation = page.getByRole('navigation', { name: 'Navegación de escritorio' });
  await desktopLedgerNavigation.getByRole('button', { name: 'Más' }).click();
  await desktopLedgerNavigation.getByRole('link', { name: 'Libro diario', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Libro diario', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Asientos contables' })).toContainText('Saldo inicial');
  await expect(page.getByRole('table').first().getByRole('columnheader', { name: 'Debe' })).toBeVisible();
  await page.getByText('Historial anterior', { exact: true }).click();
  await page.getByRole('button', { name: 'Revisar historial' }).click();
  await expect(page.getByText('Ya contabilizados', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Movimiento', exact: true }).selectOption('SALDO_INICIAL');
  await page.getByRole('combobox', { name: 'Evento contable', exact: true }).selectOption('SALDO_INICIAL');
  const cuentasDiario = await apiGet<Cuenta[]>(page, '/cuentas');
  const cuentaDiario = cuentasDiario.find(cuenta => cuenta.nombre.startsWith('E2E '));
  expect(cuentaDiario).toBeDefined();
  await page.getByRole('combobox', { name: 'Cuenta', exact: true }).selectOption(String(cuentaDiario!.id));
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('region', { name: 'Asientos contables' })).toContainText('Saldo inicial');
  await page.getByRole('button', { name: 'Limpiar' }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('textbox', { name: 'Desde', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await page.getByRole('link', { name: 'Administrar categorías' }).click();
  await page.getByRole('button', { name: '+ Nueva categoría' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('E2E Pruebas');
  await page.getByLabel('Tipo', { exact: true }).selectOption('GASTO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Pruebas' })).toBeVisible();

  await page.getByRole('link', { name: 'Panel General' }).click();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFilters = page.getByRole('button', { name: 'Filtros avanzados' });
  await expect(mobileFilters).toHaveAttribute('aria-expanded', 'false');
  await mobileFilters.click();
  await expect(page.locator('#filtros-avanzados-movimientos')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Nuevo Movimiento' }).click();
  await page.locator('#categoriaId').click();
  await page.getByRole('button', { name: 'Nueva', exact: true }).click();
  const quickCategoryEditor = page.locator('.quick-category-editor');
  const movementDialogContent = page.getByRole('dialog', { name: 'Registrar Movimiento' });
  await expect(quickCategoryEditor).toBeVisible();
  await expect(page.locator('#categoriaId-opciones')).toHaveCount(0);
  const categoryEditorBounds = await quickCategoryEditor.boundingBox();
  expect(categoryEditorBounds).not.toBeNull();
  expect(categoryEditorBounds!.x).toBeGreaterThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const customEmojiField = quickCategoryEditor.getByLabel('Icono o emoji');
  await customEmojiField.scrollIntoViewIfNeeded();
  await expect(customEmojiField).toBeVisible();
  const emojiBounds = await customEmojiField.boundingBox();
  expect(emojiBounds).not.toBeNull();
  expect(emojiBounds!.x).toBeGreaterThanOrEqual(0);
  expect(emojiBounds!.x + emojiBounds!.width).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  expect(await quickCategoryEditor.evaluate(element => getComputedStyle(element).backgroundColor))
    .toBe('rgb(15, 15, 15)');
  await quickCategoryEditor.getByLabel('Nombre').fill('E2E categoría rápida');
  await quickCategoryEditor.getByRole('button', { name: 'Guardar' }).click();
  const darkToast = page.locator('.toast-notification').filter({ hasText: 'Categoría creada.' }).last();
  await expect(darkToast).toBeVisible();
  await expect(darkToast).toHaveCSS('background-color', 'rgb(15, 15, 15)');
  await expect(darkToast.locator('.toast-notification__title')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(darkToast.locator('.toast-notification__message')).toHaveCSS('color', 'rgb(161, 161, 170)');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await selectCategory(page, 'E2E categoría rápida');
  await page.locator('#categoriaId').click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#categoriaId-opciones').locator('button[aria-label^=Editar]').last().click();
  await quickCategoryEditor.getByLabel('Nombre').fill('E2E movimiento categoría editada');
  await quickCategoryEditor.getByRole('button', { name: 'Guardar' }).click();
  await selectCategory(page, 'E2E movimiento categoría editada');

  // Editar ofrece eliminar; al confirmar, la categoria sale del mosaico y se
  // olvida como preferida, asi que el formulario ya no puede abrir en ella.
  await page.locator('#categoriaId').click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#categoriaId-opciones').locator('button[aria-label^=Eliminar]').last().click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).last().click();
  await expect(page.locator('#categoriaId')).not.toContainText('E2E Pruebas');
  await expect(page.locator('#categoriaId')).not.toContainText('Elige una categoría');
  await page.locator('#categoriaId').click();
  await expect(page.getByRole('option', { name: 'E2E movimiento categoría editada' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await selectCategory(page, 'E2E Pruebas');
  // Categoría colapsada a todo el ancho del modal, debajo de la cuenta.
  const categoryPosition = await movementDialogContent.locator('#categoriaId').boundingBox();
  const accountPosition = await movementDialogContent.locator('#cuentaId').boundingBox();
  const datePosition = await movementDialogContent.locator('#fecha').boundingBox();
  const notesPosition = await movementDialogContent.locator('#notas').boundingBox();
  expect(categoryPosition).not.toBeNull();
  expect(accountPosition).not.toBeNull();
  expect(datePosition).not.toBeNull();
  expect(notesPosition).not.toBeNull();
  expect(categoryPosition!.y).toBeGreaterThan(accountPosition!.y + accountPosition!.height);
  // La categoría ocupa el ancho completo: es el ancho de la fila, no la mitad.
  const modalWidth = await page.locator('[role="dialog"] form').evaluate(
    form => form.getBoundingClientRect().width - parseFloat(getComputedStyle(form).paddingLeft)
  );
  expect(categoryPosition!.width).toBeGreaterThan(modalWidth * 0.9);
  // Fecha y notas comparten la fila inferior, a la mitad cada una.
  expect(Math.abs(categoryPosition!.y - datePosition!.y)).toBeGreaterThan(categoryPosition!.height - 4);
  expect(Math.abs(datePosition!.y - notesPosition!.y)).toBeLessThanOrEqual(4);
  expect(datePosition!.x + datePosition!.width).toBeLessThanOrEqual(notesPosition!.x + 1);
  // Ningún rótulo de campo queda a la vista.
  const visibleFieldLabels = await page
    .locator('[role="dialog"] form label:not(.sr-only), [role="dialog"] form span[id$="-label"]:not(.sr-only)')
    .allTextContents();
  const joined = visibleFieldLabels.join(' | ');
  expect(joined).not.toContain('Monto a registrar');
  expect(joined).not.toContain('Cuenta');
  expect(joined).not.toContain('Fecha');
  await page.screenshot({ path: 'test-results/transaccion-categoria-monto.png' });
  await page.locator('#monto').fill('15');
  await selectOptionContaining(page, movementDialogContent.locator('#cuentaId'), 'E2E Cuenta MXN');
  await expect(page.locator('#monto')).toBeVisible();
  // La moneda va pegada al monto, dentro de la misma tarjeta y sin salirse.
  const amountLayout = await page.locator('#monto').evaluate(input => {
    const card = input.closest('div.rounded-2xl')!;
    const symbol = card.querySelector('span')!.getBoundingClientRect();
    const field = input.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    return { symbolLeft: symbol.left, fieldRight: field.right, cardLeft: cardBox.left, cardRight: cardBox.right };
  });
  expect(amountLayout.symbolLeft).toBeGreaterThanOrEqual(amountLayout.cardLeft);
  expect(amountLayout.fieldRight).toBeLessThanOrEqual(amountLayout.cardRight);
  await selectCategory(page, 'E2E Pruebas');
  await page.locator('#notas').fill('E2E gasto MXN');
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegación de escritorio' }).getByRole('button', { name: 'Más' }).click();
  await page.getByRole('navigation', { name: 'Navegación de escritorio' }).getByRole('link', { name: 'Libro diario' }).click();
  const enlaceMovimientoOriginal = page.getByRole('link', { name: 'Ver movimiento original' }).first();
  await expect(enlaceMovimientoOriginal).toBeVisible();
  await enlaceMovimientoOriginal.click();
  await expect(page).toHaveURL(/movimientoId=\d+/);
  await expect(page.getByRole('heading', { name: 'Transacciones recientes' })).toBeVisible();
  await expect(page.getByText(/Movimiento del libro diario #\d+/)).toBeVisible();
  await expect(page.getByRole('table').first()).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Libro diario', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Transacciones recientes' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileExpenseCard = page.locator('app-movimiento-mobile-card').filter({ hasText: 'E2E gasto MXN' }).first();
  await expect(mobileExpenseCard).toBeVisible();
  await expect(mobileExpenseCard.getByLabel('Fecha y tipo de movimiento'))
    .toContainText(/\d{1,2} [a-záéíóúñ]+\.? \d{4}/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const mobileEditAction = mobileExpenseCard.locator('button[aria-label="Editar movimiento E2E Pruebas"]');
  await expect(mobileEditAction).toBeDisabled();
  await mobileExpenseCard.getByRole('button', { name: 'Mostrar acciones para E2E Pruebas' }).click();
  await expect(mobileEditAction).toBeEnabled();
  await mobileExpenseCard.getByRole('button', { name: 'Ocultar acciones para E2E Pruebas' }).click();
  await mobileExpenseCard.locator('.swipe-actions__content').evaluate(content => {
    const host = content.closest('.swipe-actions') as HTMLElement;
    Object.defineProperty(host, 'setPointerCapture', { value: () => {} });
    const title = content.querySelector('h3')!;
    title.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientX: 200, clientY: 200
    }));
    title.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientX: 202, clientY: 275
    }));
  });
  await expect(mobileEditAction).toBeDisabled();
  await mobileExpenseCard.locator('.swipe-actions__content').evaluate(content => {
    const host = content.closest('.swipe-actions') as HTMLElement;
    const title = content.querySelector('h3')!;
    title.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientX: 200, clientY: 200
    }));
    title.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId: 1, isPrimary: true, button: 0, clientX: 125, clientY: 202
    }));
  });
  await expect(mobileEditAction).toBeEnabled();
  await mobileEditAction.click();
  await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await mobileExpenseCard.getByRole('button', { name: 'Mostrar acciones para E2E Pruebas' }).click();
  await mobileExpenseCard.getByRole('button', { name: 'Eliminar movimiento E2E Pruebas' }).click();
  const mobileDeleteDialog = page.getByRole('dialog');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(mobileDeleteDialog).toBeVisible();
  await expect(mobileDeleteDialog).toHaveCSS('background-color', 'rgb(15, 15, 15)');
  await expect(mobileDeleteDialog.locator('.confirm-dialog-card__message'))
    .toHaveCSS('color', 'rgb(161, 161, 170)');
  await mobileDeleteDialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  const expenseRow = page.getByRole('row').filter({ hasText: 'E2E gasto MXN' });
  await expenseRow.getByRole('button', { name: 'Editar movimiento E2E Pruebas' }).click();
  await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
  await page.locator('#monto').fill('18');
  await page.locator('#notas').fill('E2E gasto corregido');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E gasto corregido')).toBeVisible();
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(32);
  await page.getByRole('row').filter({ hasText: 'E2E gasto corregido' })
    .getByRole('button', { name: 'Editar movimiento E2E Pruebas' }).click();
  await page.locator('#monto').fill('15');
  await page.locator('#notas').fill('E2E gasto MXN');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await page.getByRole('link', { name: 'Panel General' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('group', { name: 'Acciones rápidas para registrar un movimiento' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Control Financiero' }))
    .toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('#dashboard-analytics-content')).toHaveCSS('display', 'none');
  await expect(page.getByRole('button', { name: 'Analítica financiera' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Ver más' })).toBeVisible();
  await expect(page.getByLabel('Lista de últimos movimientos')).toBeVisible();
  const navBounds = await mobileNavigation.boundingBox();
  const toastBounds = await page.locator('app-toast-container > div').boundingBox();
  expect(navBounds).not.toBeNull();
  expect(toastBounds).not.toBeNull();
  expect(toastBounds!.y + toastBounds!.height).toBeLessThanOrEqual(navBounds!.y);
  await page.screenshot({ path: 'test-results/capturas/kaptal-mobile-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Analítica financiera' }).click();
  await expect(page.locator('#dashboard-analytics-content')).toBeVisible();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(page).toHaveURL(/\/transacciones$/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })
    .getByRole('button', { name: 'Editar movimiento E2E Pruebas' }).click();
  await expect(page).toHaveURL(/\/transacciones$/);
  await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
  await page.locator('#notas').fill('E2E gasto historial editado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E gasto historial editado')).toBeVisible();
  await page.getByRole('link', { name: 'Panel General' }).click();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await page.getByRole('row').filter({ hasText: 'E2E gasto historial editado' })
    .getByRole('button', { name: 'Editar movimiento E2E Pruebas' }).click();
  await expect(page.getByRole('heading', { name: 'Editar Movimiento' })).toBeVisible();
  await page.locator('#notas').fill('E2E gasto MXN');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await page.getByRole('link', { name: 'Panel General' }).click();

  await openMovementDialog(page, 'Ingreso');
  await page.locator('#monto').fill('20');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Ahorro USD');
  await expect(page.getByRole('spinbutton', { name: 'Monto a registrar en USD' })).toBeVisible();
  await selectCategory(page, 'Salario');
  await page.locator('#notas').fill('E2E ingreso USD');
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E ingreso USD')).toBeVisible();

  // La memoria es por tipo: un ingreso no puede ser el gasto que se recuerda,
  // aunque se acaba de elegir. Y al volver a gasto debe reaparecer su categoria.
  await openMovementDialog(page, 'Ingreso');
  await expect(page.locator('#categoriaId')).toContainText('Salario');
  await page.locator('#categoriaId').click();
  await expect(page.getByRole('option', { name: 'E2E Pruebas', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar formulario de movimiento' }).click();

  await openMovementDialog(page, 'Gasto');
  await expect(page.locator('#categoriaId')).toContainText('E2E Pruebas');
  await page.getByRole('button', { name: 'Cerrar formulario de movimiento' }).click();

  await openMovementDialog(page, 'Transf.');
  await page.locator('#monto').fill('10');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Ahorro USD');
  await expect(page.locator('#monto')).toBeVisible();
  await selectOptionContaining(page, page.locator('#cuentaDestinoId'), 'E2E Cuenta MXN');
  // "De" y "Para" en una sola fila: origen antes que destino, sin montarse encima.
  const origenBox = await page.locator('#cuentaId').boundingBox();
  const destinoBox = await page.locator('#cuentaDestinoId').boundingBox();
  expect(origenBox).not.toBeNull();
  expect(destinoBox).not.toBeNull();
  expect(destinoBox!.x).toBeGreaterThanOrEqual(origenBox!.x + origenBox!.width);
  // La flecha vive entre ambas, sin invadir ninguno de los dos botones.
  const arrowBox = await page.locator('[role="dialog"] form svg.mt-5').boundingBox();
  expect(arrowBox).not.toBeNull();
  expect(arrowBox!.x).toBeGreaterThanOrEqual(origenBox!.x + origenBox!.width);
  expect(arrowBox!.x + arrowBox!.width).toBeLessThanOrEqual(destinoBox!.x);
  // El boton muestra solo el nombre; el saldo vive en el desplegable.
  await expect(page.locator('#cuentaId')).not.toContainText('MXN');
  await page.locator('#cuentaId').click();
  const panelCuentas = await page.locator('#cuentaId-opciones').boundingBox();
  expect(panelCuentas).not.toBeNull();
  // A todo el ancho de la fila, no a la mitad: si no, los nombres se salen.
  expect(panelCuentas!.width).toBeGreaterThan(origenBox!.width + destinoBox!.width);
  await expect(page.locator('#cuentaId-opciones')).toContainText('MXN');
  await page.keyboard.press('Escape');
  await expect(page.locator('#cuentaId-opciones')).toHaveCount(0);
  await expect(page.getByLabel(/Tasa de cambio/)).toBeVisible();
  await page.getByLabel(/Tasa de cambio/).fill('17.5');
  await page.locator('#notas').fill('E2E cambio USD a MXN');
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E cambio USD a MXN')).toBeVisible();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(page).toHaveURL(/\/transacciones$/);
  const editableTransferRow = page.getByRole('row').filter({ hasText: 'E2E cambio USD a MXN' });
  await editableTransferRow.getByRole('button', { name: 'Editar movimiento Transferencia' }).click();
  await page.locator('#monto').fill('12');
  await page.getByLabel(/Tasa de cambio/).fill('17');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E cambio USD a MXN')).toBeVisible();
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD')?.saldoActual).toBe(108);
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(239);
  await page.getByRole('row').filter({ hasText: 'E2E cambio USD a MXN' })
    .getByRole('button', { name: 'Editar movimiento Transferencia' }).click();
  await page.locator('#monto').fill('10');
  await page.getByLabel(/Tasa de cambio/).fill('17.5');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(movementText(page, 'E2E cambio USD a MXN')).toBeVisible();

  await page.getByRole('link', { name: 'Panel General' }).click();
  await openMovementDialog(page, 'Transf.');
  await page.locator('#monto').fill('5');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Cuenta MXN');
  await selectOptionContaining(page, page.locator('#cuentaDestinoId'), 'Efectivo');
  await page.locator('#notas').fill('E2E transferencia misma moneda');
  await expect(page.getByLabel(/Tasa de cambio/)).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E transferencia misma moneda')).toBeVisible();

  const transacciones = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  const transferencia = transacciones.find(item => item.notas === 'E2E cambio USD a MXN');
  expect(transferencia).toMatchObject({
    tipo: 'TRANSFERENCIA',
    monto: 10,
    montoDestino: 175,
    tasaCambio: 17.5,
    moneda: 'USD',
    monedaDestino: 'MXN'
  });
  const transferenciaMismaMoneda = transacciones.find(item => item.notas === 'E2E transferencia misma moneda');
  expect(transferenciaMismaMoneda).toMatchObject({
    tipo: 'TRANSFERENCIA',
    monto: 5,
    montoDestino: 5,
    tasaCambio: 1,
    moneda: 'MXN',
    monedaDestino: 'MXN'
  });
  expect(transferenciaMismaMoneda?.cuentaDestinoId).not.toBe(transferenciaMismaMoneda?.cuentaId);
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(205);
  expect(cuentas.find(cuenta => cuenta.nombre === 'Billetera / Efectivo')?.saldoActual).toBe(5);

  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(page).toHaveURL(/\/transacciones$/);
  await page.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await expect(movementText(page, 'E2E ingreso USD')).toHaveCount(0);
  const search = page.getByPlaceholder('Buscar por categoría o notas...');
  await search.fill('E2E gasto MXN');
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await search.fill('no existe');
  await expect(page.getByText('No se encontraron movimientos')).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Este mes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await page.getByRole('button', { name: 'Últimos 30 días', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toBeVisible();
  await page.getByRole('button', { name: 'Todo el historial', exact: true }).click();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await selectOptionContaining(page, page.getByRole('combobox', { name: 'Cuenta' }), 'E2E Ahorro USD');
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await selectOptionContaining(page, page.locator('select').first(), 'E2E Pruebas');
  await expect(page.getByRole('row').filter({ hasText: 'E2E gasto MXN' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'E2E ingreso USD' })).toHaveCount(0);
  const categoriasExportables = await apiGet<Array<{ id: number; nombre: string }>>(page, '/categorias/mias');
  const exportCategoryId = categoriasExportables.find(categoria => categoria.nombre === 'E2E Pruebas')?.id;
  expect(exportCategoryId).toBeDefined();
  const exportToken = await page.evaluate(() => localStorage.getItem('finanzas_token'));
  if (!exportToken) {
    throw new Error('An authenticated session is required to test the CSV export endpoint.');
  }
  const csvResponse = await page.request.get(
    `http://localhost:18080/api/transacciones/exportar?categoriaId=${exportCategoryId}`,
    { headers: { Authorization: `Bearer ${exportToken}` } }
  );
  expect(csvResponse.ok(), `CSV export returned ${csvResponse.status()}: ${await csvResponse.text()}`).toBeTruthy();
  expect(csvResponse.headers()['content-type']).toContain('text/csv');
  expect(csvResponse.headers()['content-disposition']).toContain('attachment; filename=');
  const csvContent = await csvResponse.text();
  expect(csvContent).toContain('\uFEFFID,Fecha,Tipo,Descripción');
  expect(csvContent).toContain('E2E gasto MXN');
  expect(csvContent).not.toContain('E2E ingreso USD');
  const exportDate = new Date().toISOString().slice(0, 10);
  await page.locator('input[type="date"]').nth(0).fill(exportDate);
  await page.locator('input[type="date"]').nth(1).fill(exportDate);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const csvDownload = await downloadPromise;
  expect(csvDownload.suggestedFilename()).toBe(`movimientos_${exportDate}_a_${exportDate}.csv`);
  const invalidDateRange = await page.request.get(
    'http://localhost:18080/api/transacciones/exportar?fechaInicio=2026-09-27&fechaFin=2026-09-26',
    { headers: { Authorization: `Bearer ${exportToken}` } }
  );
  expect(invalidDateRange.status()).toBe(400);
  const invalidCategory = await page.request.get(
    'http://localhost:18080/api/transacciones/exportar?categoriaId=no-es-numero',
    { headers: { Authorization: `Bearer ${exportToken}` } }
  );
  expect(invalidCategory.status()).toBe(400);
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();

  let summary = await apiGet<{
    resumenPorMoneda: Array<{ moneda: string; balanceTotal: number; ingresosMes: number; gastosMes: number }>;
  }>(page, '/dashboard/resumen');
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'USD')).toMatchObject({
    balanceTotal: 110,
    ingresosMes: 20
  });
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'MXN')).toMatchObject({
    balanceTotal: 210,
    gastosMes: 15
  });

  const analytics = await apiGet<{
    gastosPorCategoria: Array<{ categoriaNombre: string; monto: number; moneda: string }>;
  }>(page, '/dashboard/analitica');
  expect(analytics.gastosPorCategoria).toContainEqual(
    expect.objectContaining({ categoriaNombre: 'E2E Pruebas', monto: 15, moneda: 'MXN' })
  );

  await page.getByRole('link', { name: 'Panel General' }).click();
  await expect(page.getByRole('img', { name: /Distribución de gastos en MXN/ })).toBeVisible();
  const dashboardMovementDialog = await openMovementDialog(page, 'Gasto');
  const dashboardDialogBounds = await dashboardMovementDialog.boundingBox();
  expect(dashboardDialogBounds).not.toBeNull();
  expect(Math.abs(dashboardDialogBounds!.x + dashboardDialogBounds!.width / 2 - 640)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Cerrar formulario de movimiento' }).click();
  await expect(dashboardMovementDialog).toBeHidden();
  await page.getByLabel('Moneda de la analítica').selectOption('USD');
  await expect(page.getByText('No hay gastos registrados este mes.')).toBeVisible();
  await page.getByLabel('Moneda de la analítica').selectOption('MXN');
  const monthlyAnalyticsTable = page.getByRole('table', {
    name: /Ingresos y gastos de los últimos seis meses/
  });
  await expect(monthlyAnalyticsTable.getByRole('row')).toHaveCount(7);
  await page.screenshot({ path: 'test-results/capturas/dashboard-analitica.png', fullPage: true });

  await page.getByRole('link', { name: 'Presupuestos' }).click();
  await page.getByRole('button', { name: 'Fijar Presupuesto' }).click();
  await selectOptionContaining(page, page.getByLabel('Categoría', { exact: true }), 'E2E Pruebas');
  await selectOptionContaining(page, page.getByLabel('Moneda del presupuesto'), 'MXN');
  await page.getByLabel(/Monto límite mensual/).fill('100');
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();
  await expect(page.getByText('E2E Pruebas')).toBeVisible();
  const budgetSummary = await apiGet<{
    presupuestos: Array<{ moneda: string; montoLimite: number; montoGastado: number }>;
  }>(
    page,
    `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
  );
  expect(budgetSummary.presupuestos.find(item => item.moneda === 'MXN')).toMatchObject({
    moneda: 'MXN',
    montoLimite: 100,
    montoGastado: 15
  });
  await budgetCard(page, 'E2E Pruebas').getByTitle('Modificar límite').click();
  await page.getByLabel(/Monto límite mensual/).fill('120');
  await page.getByRole('button', { name: 'Actualizar Meta' }).click();
  await expect.poll(async () => {
    const updated = await apiGet<{ presupuestos: Array<{ montoLimite: number }> }>(
      page,
      `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
    );
    return updated.presupuestos[0]?.montoLimite;
  }).toBe(120);
  await page.getByRole('button', { name: 'Fijar Presupuesto' }).click();
  await page.getByLabel('Categoría', { exact: true }).selectOption({ label: 'Transporte' });
  await selectOptionContaining(page, page.getByLabel('Moneda del presupuesto'), 'USD');
  await page.getByLabel(/Monto límite mensual/).fill('50');
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();
  const mixedCurrencyBudgetSummary = await apiGet<{
    presupuestos: Array<{ categoriaNombre: string; moneda: string; montoGastado: number }>;
    resumenPorMoneda: Array<{ moneda: string; totalPresupuestado: number; totalGastado: number }>;
  }>(
    page,
    `/presupuestos?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`
  );
  expect(mixedCurrencyBudgetSummary.presupuestos.find(item => item.categoriaNombre === 'Transporte'))
    .toMatchObject({ moneda: 'USD', montoGastado: 0 });
  expect(mixedCurrencyBudgetSummary.resumenPorMoneda).toContainEqual(
    expect.objectContaining({ moneda: 'MXN', totalPresupuestado: 120, totalGastado: 15 })
  );
  expect(mixedCurrencyBudgetSummary.resumenPorMoneda).toContainEqual(
    expect.objectContaining({ moneda: 'USD', totalPresupuestado: 50, totalGastado: 0 })
  );

  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await page.getByRole('link', { name: 'Administrar categorías' }).click();
  const categoryCard = page.getByRole('article').filter({ hasText: 'E2E Pruebas' });
  await categoryCard.getByRole('button', { name: 'Editar E2E Pruebas' }).click();
  await page.getByLabel('Tipo', { exact: true }).selectOption('INGRESO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('No se puede cambiar el tipo');
  await page.getByLabel('Tipo', { exact: true }).selectOption('GASTO');
  await page.getByLabel('Nombre', { exact: true }).fill('E2E Categoría editada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar E2E Categoría editada', exact: true }).click();
  const nombreLargo = 'CategoriaConNombreExtensoSinEspaciosParaProbarElDesbordamiento';
  await page.getByLabel('Nombre', { exact: true }).fill(nombreLargo);
  await page.getByRole('button', { name: 'Icono Compras' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  const tarjetaCategoriaLarga = page.getByRole('article').filter({ hasText: nombreLargo });
  await expect(tarjetaCategoriaLarga).toBeVisible();
  await expect(tarjetaCategoriaLarga.locator('app-categoria-icono svg')).toBeVisible();
  await expect(tarjetaCategoriaLarga.locator('app-categoria-icono use'))
    .toHaveAttribute('href', 'category-icons.svg#shopping-cart');
  const spriteResponse = await page.request.get(new URL('category-icons.svg', page.url()).href);
  expect(spriteResponse.ok()).toBeTruthy();
  expect(await spriteResponse.text()).toContain('id="shopping-cart"');
  const desbordamiento = await tarjetaCategoriaLarga.evaluate(element => {
    const icono = element.querySelector('span')!;
    const nombre = element.querySelector('h2')!;
    const caja = element.getBoundingClientRect();
    return {
      iconoDentroDeTarjeta: icono.getBoundingClientRect().right <= caja.right,
      nombreRecortado: nombre.scrollWidth > nombre.clientWidth,
      contenidoDentroDeTarjeta: Array.from(element.children).every(child => {
        const contenido = child.getBoundingClientRect();
        return contenido.left >= caja.left && contenido.right <= caja.right;
      })
    };
  });
  expect(desbordamiento).toEqual({
    iconoDentroDeTarjeta: true,
    nombreRecortado: true,
    contenidoDentroDeTarjeta: true
  });
  await tarjetaCategoriaLarga.getByRole('button', { name: `Editar ${nombreLargo}` }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('E2E Categoría editada');
  await page.getByRole('button', { name: 'Icono Servicios' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();
  await page.getByRole('button', { name: 'Archivar E2E Categoría editada' }).click();
  await page.getByRole('button', { name: 'Archivadas' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'E2E Categoría editada' }) })
    .getByRole('button', { name: 'Restaurar' }).click();
  await page.getByRole('button', { name: 'Activas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada' })).toBeVisible();

  await page.getByRole('link', { name: 'Cuentas' }).click();
  const inactiveAccountCard = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await inactiveAccountCard.getByRole('button', { name: 'Desactivar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Desactivar', exact: true }).click();
  await page.getByRole('button', { name: 'Inactivas' }).click();
  const archivedAccount = page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' });
  await expect(archivedAccount).toBeVisible();
  await archivedAccount.getByRole('button', { name: 'Reactivar' }).click();
  await page.getByRole('button', { name: 'Activas', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'E2E Ahorro USD' })).toBeVisible();

  await page.getByRole('link', { name: 'Panel General' }).click();
  await page.getByRole('button', { name: 'Ver más' }).click();
  await page.getByRole('button', { name: 'Gastos', exact: true }).click();
  await expect(movementText(page, 'E2E gasto MXN')).toBeVisible();
  await expect(movementText(page, 'E2E ingreso USD')).toHaveCount(0);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: 'Transferencias' }).click();
  const transferRow = page.getByRole('row').filter({ hasText: 'E2E cambio USD a MXN' });
  await expect(transferRow).toBeVisible();
  await transferRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(movementText(page, 'E2E cambio USD a MXN')).toHaveCount(0);
  const sameCurrencyRow = page.getByRole('row').filter({ hasText: 'E2E transferencia misma moneda' });
  await sameCurrencyRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(movementText(page, 'E2E transferencia misma moneda')).toHaveCount(0);

  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD')?.saldoActual).toBe(120);
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cuenta MXN')?.saldoActual).toBe(35);
  summary = await apiGet(page, '/dashboard/resumen');
  expect(summary.resumenPorMoneda.find(item => item.moneda === 'USD')?.balanceTotal).toBe(120);

  await page.getByRole('button', { name: 'Ingresos', exact: true }).click();
  const incomeRow = page.getByRole('row').filter({ hasText: 'E2E ingreso USD' });
  await incomeRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(movementText(page, 'E2E ingreso USD')).toHaveCount(0);
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Ahorro USD')?.saldoActual).toBe(100);

  await page.getByRole('link', { name: 'Presupuestos' }).click();
  await budgetCard(page, 'E2E Categoría editada').getByTitle('Eliminar meta de presupuesto').click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Categoría editada', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Cuentas' }).click();
  await page.getByRole('button', { name: '+ Agregar cuenta' }).click();
  await selectOptionContaining(page, page.getByLabel('Tipo de cuenta'), 'Crédito');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const cashbackSettings = page.locator('.cashback-benefit-panel');
  expect(await cashbackSettings.evaluate(element => getComputedStyle(element).backgroundColor))
    .toBe('rgb(15, 15, 15)');
  await page.getByLabel('Nombre').fill('E2E Cashback');
  await selectOptionContaining(page, page.getByLabel('Banco o institución (opcional)'), 'Santander');
  const creditCardSettings = page.locator('.credit-card-settings');
  expect(await creditCardSettings.evaluate(element => getComputedStyle(element).backgroundColor))
    .toBe('rgb(15, 15, 15)');
  await page.getByLabel('Límite de crédito').fill('1000');
  await page.getByLabel('Deuda actual').fill('0');
  await page.getByLabel('Día de corte').fill('10');
  await page.getByLabel('Día de pago').fill('1');
  await page.getByLabel('Cashback (%)').fill('2');
  await page.getByLabel('Límite mensual (opcional)').fill('1');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const cashbackAccountCard = page.getByRole('article').filter({ hasText: 'E2E Cashback' });
  await expect(cashbackAccountCard).toContainText('Cashback 2%');
  await expect(cashbackAccountCard).toContainText('Límite');
  await expect(cashbackAccountCard).toContainText('Corte día 10');
  await expect(cashbackAccountCard).toContainText('Pago día 1');
  const creditAccount = (await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true'))
    .find(cuenta => cuenta.nombre === 'E2E Cashback');
  expect(creditAccount).toMatchObject({
    tipo: 'CREDITO',
    institucionFinanciera: 'santander',
    cashbackPorcentaje: 2,
    cashbackLimiteMensual: 1,
    limiteCredito: 1000,
    diaCorte: 10,
    diaPago: 1,
    saldoActual: 0
  });

  await cashbackAccountCard.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByLabel('Cashback (%)')).toHaveValue('2');
  await expect(page.getByLabel('Límite mensual (opcional)')).toHaveValue('1');
  await expect(page.getByLabel('Límite de crédito')).toHaveValue('1000');
  await expect(page.getByLabel('Día de corte')).toHaveValue('10');
  await expect(page.getByLabel('Día de pago')).toHaveValue('1');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const updatedCreditAccount = (await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true'))
    .find(cuenta => cuenta.nombre === 'E2E Cashback');
  expect(updatedCreditAccount).toMatchObject({
    cashbackPorcentaje: 2,
    cashbackLimiteMensual: 1,
    limiteCredito: 1000,
    diaCorte: 10,
    diaPago: 1
  });

  const secondCreditAccountStatus = await apiPost(page, '/cuentas', {
    nombre: 'E2E Credito destino',
    tipo: 'CREDITO',
    limiteCredito: 1000,
    saldoInicial: 0,
    diaCorte: 10,
    diaPago: 20,
    moneda: 'MXN'
  });
  expect(secondCreditAccountStatus).toBe(201);
  await page.getByRole('link', { name: 'Panel General' }).click();
  await openMovementDialog(page, 'Transf.');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Cashback');
  // Otra tarjeta de credito no puede ser destino: se comprueba en la lista abierta.
  await page.locator('#cuentaDestinoId').click();
  const destinationList = page.locator('#cuentaDestinoId-opciones');
  await expect(destinationList).toBeVisible();
  await expect(destinationList.getByRole('option', { name: /E2E Credito destino/ })).toHaveCount(0);
  await page.locator('#cuentaDestinoId').press('Escape');
  const creditAccounts = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  const creditSource = creditAccounts.find(cuenta => cuenta.nombre === 'E2E Cashback')!;
  const creditDestination = creditAccounts.find(cuenta => cuenta.nombre === 'E2E Credito destino')!;
  expect(await apiPost(page, '/transacciones', {
    cuentaId: creditSource.id,
    cuentaDestinoId: creditDestination.id,
    tipo: 'TRANSFERENCIA',
    monto: 10,
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: 'Transferencia inválida entre créditos'
  })).toBe(400);
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await page.getByRole('link', { name: 'Panel General' }).click();
  await openMovementDialog(page, 'Gasto');
  await page.locator('#monto').fill('80');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Cashback');
  await page.getByLabel('Notas adicionales (Opcional)').fill('E2E cashback compra');
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E cashback compra')).toBeVisible();

  await page.getByRole('link', { name: 'Panel General' }).click();
  // La deuda de tarjetas ya no tiene tarjeta propia: se lee en la linea de disponible.
  const controlFinanciero = page.getByRole('region', { name: 'Control Financiero' });
  await expect(controlFinanciero.getByText('Deuda en tarjetas', { exact: true })).toHaveCount(0);
  await page.goto('/transacciones');

  let cashbackMovements = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  const cashback = cashbackMovements.find(movement => movement.cashbackAutomatico);
  expect(cashback).toMatchObject({
    tipo: 'INGRESO',
    monto: 1,
    cashbackAutomatico: true
  });
  expect(cashback?.descripcion).toMatch(/^Cashback · /);
  const cashbackExpense = cashbackMovements.find(movement => movement.notas === 'E2E cashback compra');
  expect(cashbackExpense).toMatchObject({ tipo: 'GASTO', cashbackAutomatico: false });
  const cashbackRow = page.getByRole('row').filter({ hasText: cashback!.descripcion });
  await expect(cashbackRow).toBeVisible();
  await expect(cashbackRow.getByTitle('Eliminar movimiento')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const cashbackMobileCard = page.locator('app-movimiento-mobile-card').filter({ hasText: cashback!.descripcion });
  await expect(cashbackMobileCard).toBeVisible();
  await expect(cashbackMobileCard.getByRole('button', { name: /acciones para/ })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await apiDelete(page, `/transacciones/${cashback!.id}`)).toBe(400);
  await page.getByRole('link', { name: 'Panel General' }).click();
  await openMovementDialog(page, 'Gasto');
  await page.locator('#monto').fill('20');
  await selectOptionContaining(page, page.locator('#cuentaId'), 'E2E Cashback');
  await page.getByLabel('Notas adicionales (Opcional)').fill('E2E cashback segundo');
  await page.getByRole('dialog').getByRole('button', { name: /^(Registrar|Guardar Movimiento)$/ }).click();
  await expect(movementText(page, 'E2E cashback segundo')).toBeVisible();
  cashbackMovements = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  expect(cashbackMovements.filter(movement => movement.cashbackAutomatico)).toHaveLength(1);
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cashback')?.saldoActual).toBe(-99);

  await page.goto('/transacciones');
  const cashbackExpenseRow = page.getByRole('row').filter({ hasText: 'E2E cashback compra' });
  await cashbackExpenseRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E cashback compra' })).toHaveCount(0);
  cashbackMovements = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  const cashbackLiberado = cashbackMovements.find(movement => movement.cashbackAutomatico);
  expect(cashbackLiberado).toMatchObject({ monto: 0.4, tipo: 'INGRESO' });
  expect(cashbackMovements.some(movement => movement.notas === 'E2E cashback compra')).toBeFalsy();
  const cashbackExpenseSecondRow = page.getByRole('row').filter({ hasText: 'E2E cashback segundo' });
  await cashbackExpenseSecondRow.getByTitle('Eliminar movimiento').click({ force: true });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'E2E cashback segundo' })).toHaveCount(0);
  cashbackMovements = await apiGet<Transaccion[]>(page, '/transacciones/recientes');
  expect(cashbackMovements.some(movement => movement.cashbackAutomatico)).toBeFalsy();
  cuentas = await apiGet<Cuenta[]>(page, '/cuentas?incluirInactivas=true');
  expect(cuentas.find(cuenta => cuenta.nombre === 'E2E Cashback')?.saldoActual).toBe(0);

  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('A!234567');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Hola, Usuario E2E.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
