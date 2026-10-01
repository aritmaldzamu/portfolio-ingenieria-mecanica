// Prueba de punta a punta: carga la extensión real en Chromium, sirve el
// formulario simulado bajo un dominio *.myworkdayjobs.com (resuelto a
// localhost) y verifica lo que se llenó.
//
//   node tests/run-e2e.mjs            (requiere playwright instalado)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright')));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.resolve(here, '..');
const PORT = 8765;
const HOST = 'acme.wd5.myworkdayjobs.com';

const server = http
  .createServer((req, res) => {
    const file = path.join(here, req.url === '/' ? 'fixture-workday.html' : req.url.split('?')[0]);
    if (!file.startsWith(here) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    const type = file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` }).end(fs.readFileSync(file));
  })
  .listen(PORT);

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdaf-'));
const ctx = await chromium.launchPersistentContext(userDir, {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, `--host-resolver-rules=MAP ${HOST} 127.0.0.1`],
});

const failures = [];
const expect = (name, actual, wanted) => {
  const ok = wanted instanceof RegExp ? wanted.test(String(actual)) : actual === wanted;
  console.log(`${ok ? '✔' : '✘'} ${name}: ${JSON.stringify(actual)}${ok ? '' : `  (esperado ${wanted})`}`);
  if (!ok) failures.push(name);
};

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  // esperar a que onInstalled cargue el perfil de ejemplo y agregar un CV de prueba
  await sw.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const { profile } = await chrome.storage.local.get('profile');
      if (profile) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await chrome.storage.local.set({ resumes: [{ name: 'CV_Prueba.pdf', type: 'application/pdf', size: 8, dataB64: btoa('%PDF-1.4') }] });
  });

  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('[page error]', m.text()));
  page.on('pageerror', (e) => console.log('[page exception]', e.message));
  await page.goto(`http://${HOST}:${PORT}/`);

  // botón flotante (Shadow DOM; Playwright lo atraviesa)
  await page.locator('#wdaf-root .fab').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#wdaf-root .fab').click();
  await page.locator('#wdaf-root .card .stats').waitFor({ timeout: 90000 });

  const val = (sel) => page.$eval(sel, (el) => (el.tagName === 'BUTTON' ? el.textContent.trim() : el.value));
  const pills = (sel) => page.$$eval(`${sel} [data-automation-id="selectedItem"]`, (els) => els.map((e) => e.textContent.trim()));

  expect('Cómo te enteraste', (await pills('[data-automation-id="formField-source"]')).join(), 'LinkedIn');
  expect('Trabajó antes (radio No)', await page.$eval('#prev-no', (e) => e.checked), true);
  expect('País', await val('#country--country'), 'Mexico');
  expect('Nombre', await val('#name--legalName--firstName'), 'Arith');
  expect('Apellido (paterno, porque hay campo materno)', await val('#name--legalName--lastName'), 'Maldonado');
  expect('Apellido materno', await val('#name--legalName--secondaryLastName'), 'Zamudio');
  expect('Calle (re-render tras país)', await val('#address--addressLine1'), 'C. San Simón');
  expect('Número exterior', await val('#address--addressLine2'), '1214');
  expect('Colonia', await val('#address--addressLine4'), 'Balcones de Santo Domingo');
  expect('Ciudad', await val('#address--city'), 'San Nicolás de los Garza');
  expect('Municipio', await val('#address--regionSubdivision1'), 'San Nicolás de los Garza');
  expect('Estado', await val('#address--countryRegion'), 'Nuevo León');
  expect('CP', await val('#address--postalCode'), '66446');
  expect('Correo', await val('#email'), 'maldonado.zamudio.arith@gmail.com');
  expect('Tipo de teléfono', await val('#phoneNumber--phoneType'), 'Mobile');
  expect('Lada país', (await pills('[data-automation-id="formField-countryPhoneCode"]')).join(), 'Mexico (+52)');
  expect('Teléfono', await val('#phoneNumber--phoneNumber'), '2219744717');
  expect('Extensión vacía', await val('#phoneNumber--extension'), '');

  expect('Experiencia: puesto', await val('[id$="--jobTitle"]'), /Technical Specialist/);
  expect('Experiencia: empresa', await val('[id$="--companyName"]'), 'Punto Focal Equipo Médico');
  expect('Experiencia: mes inicio', await val('[id$="--startDate-dateSectionMonth-input"]'), '07');
  expect('Experiencia: año inicio', await val('[id$="--startDate-dateSectionYear-input"]'), '2024');
  expect('Experiencia: mes fin', await val('[id$="--endDate-dateSectionMonth-input"]'), '12');
  expect('Experiencia: descripción', await val('[id$="--roleDescription"]'), /ultrasound/);

  const eduCount = await page.$$eval('[id$="--schoolName"]', (els) => els.length);
  expect('Educación: 2 entradas agregadas', eduCount, 2);
  expect('Educación 1: escuela', await page.$$eval('[id$="--schoolName"]', (e) => e[0].value), 'Universidad Iberoamericana Puebla');
  expect('Educación 1: título', await page.$$eval('[id$="--degree"]', (e) => e[0].textContent.trim()), "Bachelor's Degree");
  expect('Educación 1: carrera', await page.$$eval('[data-automation-id="formField-fieldOfStudy"]', (e) => e[0].querySelector('[data-automation-id="selectedItem"]')?.textContent), 'Mechatronics');
  expect('Educación 2: carrera', await page.$$eval('[data-automation-id="formField-fieldOfStudy"]', (e) => e[1].querySelector('[data-automation-id="selectedItem"]')?.textContent), 'Biomedical Engineering');
  expect('Educación 2: año inicio', await page.$$eval('[id$="--firstYearAttended-dateSectionYear-input"]', (e) => e[1].value), '2020');
  expect('Educación 1: año fin', await page.$$eval('[id$="--lastYearAttended-dateSectionYear-input"]', (e) => e[0].value), '2026');
  expect('Educación: promedio', await page.$$eval('[id$="--gradeAverage"]', (e) => e[0].value), '9.1');

  expect('Idiomas: 3 entradas', await page.$$eval('[id$="--language"]', (e) => e.length), 3);
  expect('Idioma 1', await page.$$eval('[id$="--language"]', (e) => e[0].textContent.trim()), 'Spanish');
  expect('Idioma 1 nativo', await page.$$eval('[id$="--native"]', (e) => e[0].checked), true);
  expect('Idioma 2 nivel lectura', await page.$$eval('[id$="--languageProficiency-0"]', (e) => e[1].textContent.trim()), '3 - Advanced');
  expect('Idioma 3 nivel', await page.$$eval('[id$="--languageProficiency-1"]', (e) => e[2].textContent.trim()), '1 - Beginner');

  expect('Sitios web', await page.$$eval('[id$="--url"]', (e) => e.map((x) => x.value).join(' ')), /github\.io.*github\.com/);
  const skills = await pills('[data-automation-id="formField-skills"]');
  expect('Skills (≥10 del catálogo)', skills.length >= 10, true);
  console.log('   skills:', skills.join(', '));
  expect('CV subido', await page.textContent('#resume-name'), /CV_Prueba\.pdf/);
  expect('LinkedIn', await val('#socialNetworkAccounts--linkedInAccount'), /linkedin\.com\/in\//);

  expect('Pregunta: autorizado en México', await val('#q1'), 'Yes');
  expect('Pregunta: cambiar de residencia (Sí)', await page.$eval('#q2y', (e) => e.checked), true);
  expect('Salario vacío (sin dato)', await val('#q3'), '');
  expect('Licencia sin responder', await val('#q4'), 'Select One');
  expect('Máximo nivel de estudios (<select>)', await page.$eval('#q5', (e) => e.options[e.selectedIndex].text), "Bachelor's Degree");
  expect('Estado civil NO confundido con Estado', await val('#q6'), '');
  expect('Nunca dio clic en Next', await page.evaluate(() => window.__nextClicks), 0);

  const panelText = await page.locator('#wdaf-root .card').innerText();
  console.log('\n--- panel ---\n' + panelText + '\n-------------');
  expect('Panel lista el salario como pendiente', panelText, /salary expectation/i);
  expect('Panel lista la licencia como no reconocida', panelText, /driver/i);

  // Segunda pasada: no debe duplicar entradas ni pisar valores
  await page.locator('#wdaf-root [data-a="again"]').click();
  await page.waitForTimeout(500);
  await page.locator('#wdaf-root .card .stats').waitFor({ timeout: 90000 });
  expect('Re-llenar no duplica educación', await page.$$eval('[id$="--schoolName"]', (els) => els.length), 2);

  await page.screenshot({ path: path.join(here, 'e2e-result.png'), fullPage: true });

  // ---------- Escenario 2: español, layout antiguo, dirección de Puebla ----------
  console.log('\n=== Escenario ES / layout antiguo / dirección Puebla ===');
  await sw.evaluate(() => chrome.storage.local.set({ settings: { activeAddress: 1, uploadResume: false } }));
  const es = await ctx.newPage();
  es.on('pageerror', (e) => console.log('[page exception]', e.message));
  await es.goto(`http://${HOST}:${PORT}/fixture-es.html`);
  await es.locator('#wdaf-root .fab').click();
  await es.locator('#wdaf-root .card .stats').waitFor({ timeout: 90000 });
  const v = (sel) => es.$eval(sel, (el) => (el.tagName === 'BUTTON' ? el.textContent.trim() : el.value));
  const all = (sel) => es.$$eval(sel, (els) => els.map((el) => (el.tagName === 'BUTTON' ? el.textContent.trim() : el.value)));
  expect('ES ¿Cómo te enteraste? (lista)', await v('#how'), 'Bolsa de trabajo - LinkedIn');
  expect('ES trabajó antes = No', await es.$eval('#prev-no', (e) => e.checked), true);
  expect('ES País', await v('#pais'), 'México');
  expect('ES Nombre(s)', await v('#n1'), 'Arith');
  expect('ES Apellido paterno', await v('#n2'), 'Maldonado');
  expect('ES Apellido materno', await v('#n3'), 'Zamudio');
  expect('ES Ciudad (Puebla)', await v('#a2'), 'Heroica Puebla de Zaragoza');
  expect('ES Estado (Puebla, lista virtualizada de 32)', await v('#a3'), 'Puebla');
  expect('ES Tratamiento sin tocar', await v('#tt'), 'Seleccione un valor');
  expect('ES Dirección línea 1 (Puebla)', await v('#a1'), 'C. 29 37');
  expect('ES Código postal (Puebla)', await v('#a4'), '72190');
  expect('ES Tipo de teléfono', await v('#t1'), 'Móvil');
  expect('ES Código de país', await es.$eval('[data-automation-id="formField-t2"] [data-automation-id="selectedItem"]', (e) => e.textContent), 'México (+52)');
  expect('ES Teléfono', await v('#t3'), '2219744717');
  expect('ES Cargo', (await all('.cargo')).join('|'), /Technical Specialist/);
  expect('ES Fechas experiencia', (await all('[data-automation-id="dateSectionMonth-input"], [data-automation-id="dateSectionYear-input"]')).join('/'), '07/2024/12/2024');
  expect('ES Educación (2)', (await all('.uni')).length, 2);
  expect('ES Título', (await all('.titulo')).join('|'), 'Licenciatura|Licenciatura');
  expect('ES Carrera', (await all('.carrera')).join('|'), 'Mechatronics Engineering|Biomedical Engineering');
  expect('ES Idiomas', (await all('.idioma')).join('|'), 'Español|Inglés|Alemán');
  expect('ES Niveles', (await all('.nivel')).join('|'), 'Nativo|Avanzado|Básico');
  expect('ES Mayor de edad', await v('#q'), 'Sí');
  const esPanel = await es.locator('#wdaf-root .card').innerText();
  console.log('--- panel ---\n' + esPanel + '\n-------------');
  expect('ES panel sin pendientes de dirección', /Dirección|Código postal/.test(esPanel), false);
  await es.screenshot({ path: path.join(here, 'e2e-result-es.png'), fullPage: true });

  // ---------- Popup y opciones cargan sin errores ----------
  const extId = sw.url().split('/')[2];
  for (const pg of ['src/popup/popup.html', 'src/options/options.html']) {
    const p2 = await ctx.newPage();
    const errs = [];
    p2.on('pageerror', (e) => errs.push(e.message));
    await p2.goto(`chrome-extension://${extId}/${pg}`);
    await p2.waitForTimeout(600);
    expect(`${pg} sin errores`, errs.join(' | '), '');
    if (pg.includes('popup')) expect('Popup muestra direcciones', await p2.$$eval('#address option', (o) => o.map((x) => x.textContent).join('|')), 'Monterrey|Puebla');
    if (pg.includes('options')) {
      expect('Opciones: editor con perfil', await p2.$eval('#editor', (e) => JSON.parse(e.value).personal.firstName), 'Arith');
      expect('Opciones: Puebla completa', /Puebla/.test(await p2.textContent('#warnings')), false);
      await p2.setViewportSize({ width: 1000, height: 900 });
      await p2.screenshot({ path: path.join(here, 'e2e-options.png') });
    }
  }
} catch (e) {
  console.error(e);
  failures.push(String(e));
} finally {
  await ctx.close();
  server.close();
}

console.log(failures.length ? `\n${failures.length} FALLA(S)` : '\nTODO OK');
process.exit(failures.length ? 1 : 0);
