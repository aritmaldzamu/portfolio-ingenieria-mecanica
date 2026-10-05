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
  args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, `--host-resolver-rules=MAP ${HOST} 127.0.0.1, MAP careers.acme-example.com 127.0.0.1, MAP blog.example.org 127.0.0.1, MAP efds.fa.em5.oraclecloud.com 127.0.0.1`],
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
  const pills = (sel) => page.$$eval(`${sel} [data-automation-id="promptSelectionLabel"]`, (els) => els.map((e) => e.textContent.trim()));

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
  expect('Educación 1: carrera', await page.$$eval('[data-automation-id="formField-fieldOfStudy"]', (e) => e[0].querySelector('[data-automation-id="promptSelectionLabel"]')?.textContent), 'Mechatronics');
  expect('Educación 2: carrera', await page.$$eval('[data-automation-id="formField-fieldOfStudy"]', (e) => e[1].querySelector('[data-automation-id="promptSelectionLabel"]')?.textContent), 'Biomedical Engineering');
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
  expect('Re-llenar no desmarca skills', (await pills('[data-automation-id="formField-skills"]')).length, skills.length);
  expect('Re-llenar mantiene "Cómo te enteraste"', (await pills('[data-automation-id="formField-source"]')).join(), 'LinkedIn');
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
  expect('ES Código de país', await es.$eval('[data-automation-id="formField-t2"] [data-automation-id="promptSelectionLabel"]', (e) => e.textContent), 'México (+52)');
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

  // ---------- Escenario 3: formulario propio de empresa (no Workday) + aprendizaje ----------
  console.log('\n=== Escenario sitio de empresa (genérico) + aprendizaje ===');
  await sw.evaluate(() => chrome.storage.local.set({ settings: { activeAddress: 0, uploadResume: true }, learned: {} }));
  const gen = await ctx.newPage();
  gen.on('pageerror', (e) => console.log('[page exception]', e.message));
  const GURL = `http://careers.acme-example.com:${PORT}/fixture-generic.html`;
  await gen.goto(GURL);
  await gen.locator('#wdaf-root .fab').waitFor({ state: 'visible', timeout: 10000 });
  await gen.locator('#wdaf-root .fab').click();
  await gen.locator('#wdaf-root .card .stats').waitFor({ timeout: 90000 });
  const g = (sel) => gen.$eval(sel, (el) => el.value);
  expect('GEN Nombre completo', await g('#fullname'), 'Arith Maldonado Zamudio');
  expect('GEN Correo (etiqueta suelta)', await g('#mail'), 'maldonado.zamudio.arith@gmail.com');
  expect('GEN Teléfono con lada', await g('#tel'), '+52 2219744717');
  expect('GEN Ubicación (autocompletar)', await g('#loc'), 'San Nicolás de los Garza, Nuevo León, México');
  expect('GEN Universidad (react-select)', await gen.textContent('.rs .select__single-value'), 'Universidad Iberoamericana Puebla');
  expect('GEN Carrera', await g('#carrera'), 'Mechatronics Engineering');
  expect('GEN Graduación (type=month)', await g('#grad'), '2026-12');
  expect('GEN Empresa actual', await g('#emp'), 'Punto Focal Equipo Médico');
  expect('GEN LinkedIn', await g('#li'), /linkedin\.com\/in\//);
  expect('GEN CV subido', await gen.textContent('#cv-name'), /CV_Prueba\.pdf/);
  expect('GEN Inglés (radio ARIA)', await gen.$eval('[aria-label="Avanzado"]', (e) => e.getAttribute('aria-checked')), 'true');
  expect('GEN Cómo te enteraste (lista Google Forms)', await gen.$eval('#gf [aria-selected="true"]', (e) => e.textContent), 'LinkedIn');
  expect('GEN Ciudad (Shadow DOM)', await gen.$eval('#xcity', (x) => x.shadowRoot.querySelector('input').value), 'San Nicolás de los Garza');
  expect('GEN Aviso de privacidad sin marcar', await gen.$eval('#priv', (e) => e.getAttribute('aria-checked')), 'false');
  expect('GEN Licencia sin responder (pregunta nueva)', await g('#lic'), '');
  expect('GEN Nunca envió', await gen.evaluate(() => window.__sent), 0);
  const genPanel = await gen.locator('#wdaf-root .card').innerText();
  console.log('--- panel ---\n' + genPanel + '\n-------------');

  // el usuario contesta a mano las preguntas nuevas y da "Enviar"
  await gen.selectOption('#lic', 'Sí');
  await gen.fill('#why', 'Me interesa aplicar diseño mecánico y automatización en manufactura.');
  await gen.click('#priv');
  await gen.click('#send');
  await gen.waitForTimeout(800);
  const learned = await sw.evaluate(async () => (await chrome.storage.local.get('learned')).learned || {});
  console.log('   aprendido:', Object.values(learned).map((v) => `${v.label} = ${JSON.stringify(v.value)}`).join(' | '));
  expect('Aprendió licencia', Object.values(learned).some((v) => /licencia/.test(v.label) && v.value === 'Sí'), true);
  expect('Aprendió "por qué"', Object.values(learned).some((v) => /por que quieres|por qué quieres/i.test(v.label)), true);
  expect('NO aprendió aviso de privacidad', Object.values(learned).some((v) => /privacidad/i.test(v.label)), false);
  expect('NO aprendió datos del perfil (correo)', Object.values(learned).some((v) => /correo/i.test(v.label)), false);

  // en otra visita (otro formulario), lo aprendido se llena solo
  await gen.goto(GURL);
  await gen.locator('#wdaf-root .fab').click();
  await gen.locator('#wdaf-root .card .stats').waitFor({ timeout: 90000 });
  expect('Usa lo aprendido: licencia', await g('#lic'), 'Sí');
  expect('Usa lo aprendido: por qué', await g('#why'), /diseño mecánico/);
  expect('Aviso de privacidad sigue sin marcar', await gen.$eval('#priv', (e) => e.getAttribute('aria-checked')), 'false');
  await gen.screenshot({ path: path.join(here, 'e2e-result-generic.png'), fullPage: true });

  // ---------- Escenario Oracle Recruiting Cloud (Ford) ----------
  console.log('\n=== Escenario Oracle Recruiting Cloud (Ford) ===');
  const orc = await ctx.newPage();
  orc.on('pageerror', (e) => console.log('[page exception]', e.message));
  await orc.goto(`http://efds.fa.em5.oraclecloud.com:${PORT}/fixture-oracle.html`);
  await orc.locator('#wdaf-root .fab').waitFor({ state: 'visible', timeout: 10000 });
  await orc.locator('#wdaf-root .fab').click();
  await orc.locator('#wdaf-root .card .stats').waitFor({ timeout: 120000 });
  const o = (sel) => orc.$eval(sel, (el) => el.value);
  const tiles = (id) => orc.$$eval(`#${id} .tile`, (t) => t.map((x) => x.textContent));
  expect('ORC First Name', await o('#firstName-1'), 'Arith');
  expect('ORC Last Name (ambos apellidos)', await o('#lastName-2'), 'Maldonado Zamudio');
  expect('ORC Country Code', await o('#cc-4'), '+52 Mexico');
  expect('ORC Phone', await o('#phone-5'), '2219744717');
  expect('ORC Country', await o('#ctry-6'), 'Mexico');
  expect('ORC Address Line 1', await o('#addr1-7'), 'C. San Simón 1214');
  expect('ORC City', await o('#city-9'), 'San Nicolás de los Garza');
  expect('ORC State', await o('#st-10'), 'Nuevo León');
  expect('ORC ZIP', await o('#zip-11'), '66446');
  const expT = await tiles('exp-block');
  console.log('   experiencia:', expT.join(' || '));
  expect('ORC Experiencia guardada (1)', expT.length, 1);
  expect('ORC Experiencia con fechas mm/dd/yyyy', expT[0] || '', /Punto Focal.*07\/01\/2024.*12\/01\/2024/);
  const eduT = await tiles('edu-block');
  console.log('   educación:', eduT.join(' || '));
  expect('ORC Educación guardada (2)', eduT.length, 2);
  expect('ORC Educación: Mecatrónica y Biomédica', eduT.join(' '), /Mechatronics.*Biomedical/);
  expect('ORC Educación fecha MM/YYYY', eduT.join(' '), /12\/2026/);
  expect('ORC CV', await orc.textContent('#res-name'), /CV_Prueba\.pdf/);
  const pressed = (id) => orc.$eval(`#${id} [aria-pressed="true"]`, (b) => b.textContent).catch(() => '');
  expect('ORC Autorizado en México = Yes', await pressed('q1'), 'Yes');
  expect('ORC Trabajó antes en Ford = No', await pressed('q2'), 'No');
  expect('ORC Reubicarse = Yes', await pressed('q3'), 'Yes');
  expect('ORC Firma (nombre completo)', await o('#sig-14'), 'Arith Maldonado Zamudio');
  expect('ORC Términos sin marcar', await orc.$eval('#agree', (e) => e.checked), false);
  expect('ORC Botón ♥ intacto', await orc.$eval('.job-fav', (e) => e.getAttribute('aria-pressed')), 'false');
  expect('ORC Nunca envió', await orc.evaluate(() => window.__submitted), 0);
  console.log('--- panel ---\n' + (await orc.locator('#wdaf-root .card').innerText()) + '\n-------------');
  await orc.screenshot({ path: path.join(here, 'e2e-result-oracle.png'), fullPage: true });
  // volver a llenar no debe duplicar tarjetas
  await orc.locator('#wdaf-root [data-a="again"]').click();
  await orc.waitForTimeout(500);
  await orc.locator('#wdaf-root .card .stats').waitFor({ timeout: 120000 });
  expect('ORC Re-llenar no duplica experiencia', (await tiles('exp-block')).length, 1);
  expect('ORC Re-llenar no duplica educación', (await tiles('edu-block')).length, 2);

  // ---------- Escenario 4: página que NO es de empleo ----------
  const blog = await ctx.newPage();
  await blog.goto(`http://blog.example.org:${PORT}/fixture-blog.html`);
  await blog.waitForTimeout(2500);
  expect('Blog: sin botón flotante', await blog.locator('#wdaf-root .fab').isVisible().catch(() => false), false);
  await blog.fill('#c', 'Qué rico pastel');
  await blog.click('#go');
  await blog.waitForTimeout(800);
  const learned2 = await sw.evaluate(async () => (await chrome.storage.local.get('learned')).learned || {});
  expect('Blog: no aprende nada', Object.values(learned2).some((v) => /comentario/i.test(v.label)), false);

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
      expect('Opciones: lista respuestas aprendidas', await p2.textContent('#learned'), /licencia/i);
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
