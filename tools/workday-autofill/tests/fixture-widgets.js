// Simulación de widgets de Workday compartida por los fixtures de prueba.
  // ---------- datos de catálogos ----------
  const TREES = {
    source: { 'Job Board': ['LinkedIn', 'Indeed', 'OCC Mundial'], 'Social Media': ['Facebook', 'Instagram'], 'Company Website': ['Acme Careers'] },
    phone: { '': ['United States of America (+1)', 'Mexico (+52)', 'Canada (+1)', 'Germany (+49)'] },
    skills: { '': ['SolidWorks', 'Creo Parametric', 'Finite Element Analysis (FEA)', 'Computer-Aided Design (CAD)', 'Python (Programming Language)', 'MATLAB', 'OpenCV', 'Arduino', 'Microsoft Excel', 'Microsoft Power BI', 'Rapid Prototyping', '3D Printing', 'Metrology', 'Design for Manufacturing'] },
    degree: { '': ["Associate's Degree", "Bachelor's Degree", "Master's Degree", 'PhD'] },
    ...(window.EXTRA_TREES || {}),
  };
  window.__nextClicks = 0;
  document.getElementById('next')?.addEventListener('click', () => window.__nextClicks++);

  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let openPopup = null;
  function closePopup() { openPopup?.remove(); openPopup = null; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });
  document.addEventListener('mousedown', (e) => { if (openPopup && !openPopup.contains(e.target) && !e.target.closest('[aria-haspopup], .prompt')) closePopup(); });

  function popupNear(el) {
    closePopup();
    const p = document.createElement('div');
    p.setAttribute('data-automation-popup', '');
    const r = el.getBoundingClientRect();
    p.style.left = r.left + scrollX + 'px';
    p.style.top = r.bottom + scrollY + 'px';
    document.body.appendChild(p);
    openPopup = p;
    return p;
  }

  // ---------- listas desplegables tipo botón ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[aria-haspopup="listbox"]');
    if (!btn) return;
    const p = popupNear(btn);
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'listbox');
    ul.id = btn.id + '-listbox';
    btn.setAttribute('aria-controls', ul.id);
    for (const o of btn.dataset.options.split('|')) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.innerHTML = `<div>${o}</div>`;
      li.addEventListener('click', () => {
        btn.textContent = o;
        btn.dispatchEvent(new CustomEvent('wd-change', { bubbles: true, detail: o }));
        closePopup();
      });
      ul.appendChild(li);
    }
    p.appendChild(ul);
  });

  // ---------- prompts con búsqueda ----------
  function addPill(prompt, value) {
    const pill = document.createElement('div');
    pill.setAttribute('data-automation-id', 'selectedItem');
    pill.textContent = value;
    prompt.prepend(pill);
  }
  function showPrompt(input, entries, onPick) {
    const p = popupNear(input);
    for (const ent of entries) {
      const d = document.createElement('div');
      d.setAttribute('data-automation-id', 'promptOption');
      d.setAttribute('data-automation-label', ent.label);
      d.setAttribute('role', 'option');
      d.textContent = ent.label;
      d.addEventListener('click', () => onPick(ent));
      p.appendChild(d);
    }
  }
  function wirePrompt(prompt) {
    const input = prompt.querySelector('input');
    const tree = TREES[prompt.dataset.tree];
    const single = prompt.dataset.tree !== 'skills';
    const pick = (ent) => {
      if (ent.children) return showPrompt(input, ent.children.map((c) => ({ label: c })), pick);
      if (single) prompt.querySelectorAll('[data-automation-id="selectedItem"]').forEach((x) => x.remove());
      addPill(prompt, ent.label);
      input.value = '';
      closePopup();
    };
    input.addEventListener('click', () => {
      if (input.value) return;
      const cats = Object.entries(tree).flatMap(([cat, kids]) => (cat ? [{ label: cat, children: kids }] : kids.map((k) => ({ label: k }))));
      showPrompt(input, cats, pick);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = strip(input.value.trim());
      const leaves = Object.values(tree).flat().filter((l) => strip(l).includes(q));
      showPrompt(input, leaves.map((l) => ({ label: l })), pick);
    });
  }
  document.querySelectorAll('.prompt').forEach(wirePrompt);

  // ---------- dirección (se re-renderiza al cambiar país, como Workday) ----------
  function renderAddress(country) {
    const box = document.getElementById('address-block');
    if (country === 'Mexico') {
      box.innerHTML = `
        <div data-automation-id="formField-addressLine1"><label for="address--addressLine1">Street*</label><input id="address--addressLine1"></div>
        <div data-automation-id="formField-addressLine2"><label for="address--addressLine2">Exterior Number*</label><input id="address--addressLine2"></div>
        <div data-automation-id="formField-addressLine3"><label for="address--addressLine3">Interior Number</label><input id="address--addressLine3"></div>
        <div data-automation-id="formField-addressLine4"><label for="address--addressLine4">Neighborhood*</label><input id="address--addressLine4"></div>
        <div data-automation-id="formField-city"><label for="address--city">City*</label><input id="address--city"></div>
        <div data-automation-id="formField-regionSubdivision1"><label for="address--regionSubdivision1">Municipality</label><input id="address--regionSubdivision1"></div>
        <div data-automation-id="formField-countryRegion"><label for="address--countryRegion">State*</label>
          <button type="button" id="address--countryRegion" aria-haspopup="listbox" data-options="Jalisco|Nuevo León|Puebla|Ciudad de México">Select One</button></div>
        <div data-automation-id="formField-postalCode"><label for="address--postalCode">Postal Code*</label><input id="address--postalCode"></div>`;
    } else {
      box.innerHTML = `
        <div data-automation-id="formField-addressLine1"><label for="address--addressLine1">Address Line 1*</label><input id="address--addressLine1"></div>
        <div data-automation-id="formField-city"><label for="address--city">City*</label><input id="address--city"></div>
        <div data-automation-id="formField-postalCode"><label for="address--postalCode">Postal Code*</label><input id="address--postalCode"></div>`;
    }
  }
  if (document.getElementById('address-block')) {
    renderAddress('United States of America');
    document.getElementById('country--country').addEventListener('wd-change', (e) => setTimeout(() => renderAddress(e.detail), 300));
  }

  // ---------- secciones repetibles ----------
  let seq = 20;
  const dateField = (id, label) => `<div data-automation-id="formField-${id}"><label>${label}</label>
      <div data-automation-id="dateInputWrapper"><input id="${id}-dateSectionMonth-input" data-automation-id="dateSectionMonth-input" placeholder="MM" size="2"><input id="${id}-dateSectionYear-input" data-automation-id="dateSectionYear-input" placeholder="YYYY" size="4"></div></div>`;
  const TEMPLATES = {
    workExperience: (n, i) => `<div role="group" aria-labelledby="h-${n}"><h4 id="h-${n}">Work Experience ${i}</h4>
      <div data-automation-id="formField-jobTitle"><label for="workExperience-${n}--jobTitle">Job Title*</label><input id="workExperience-${n}--jobTitle"></div>
      <div data-automation-id="formField-companyName"><label for="workExperience-${n}--companyName">Company*</label><input id="workExperience-${n}--companyName"></div>
      <div data-automation-id="formField-location"><label for="workExperience-${n}--location">Location</label><input id="workExperience-${n}--location"></div>
      <div data-automation-id="formField-currentlyWorkHere"><input type="checkbox" id="workExperience-${n}--currentlyWorkHere"><label for="workExperience-${n}--currentlyWorkHere">I currently work here</label></div>
      ${dateField(`workExperience-${n}--startDate`, 'From*')}
      ${dateField(`workExperience-${n}--endDate`, 'To*')}
      <div data-automation-id="formField-roleDescription"><label for="workExperience-${n}--roleDescription">Role Description</label><textarea id="workExperience-${n}--roleDescription"></textarea></div></div>`,
    education: (n, i) => `<div role="group" aria-labelledby="h-${n}"><h4 id="h-${n}">Education ${i}</h4>
      <div data-automation-id="formField-schoolName"><label for="education-${n}--schoolName">School or University*</label><input id="education-${n}--schoolName"></div>
      <div data-automation-id="formField-degree"><label for="education-${n}--degree">Degree*</label><button type="button" id="education-${n}--degree" aria-haspopup="listbox" data-options="Associate's Degree|Bachelor's Degree|Master's Degree|PhD">Select One</button></div>
      <div data-automation-id="formField-fieldOfStudy"><label>Field of Study</label><div class="prompt" data-tree="fos"><div data-automation-id="multiselectInputContainer"><input data-automation-id="searchBox" id="education-${n}--fieldOfStudy"></div></div></div>
      <div data-automation-id="formField-gradeAverage"><label for="education-${n}--gradeAverage">Overall Result (GPA)</label><input id="education-${n}--gradeAverage"></div>
      <div data-automation-id="formField-firstYearAttended"><label>From</label><input id="education-${n}--firstYearAttended-dateSectionYear-input" data-automation-id="dateSectionYear-input" placeholder="YYYY"></div>
      <div data-automation-id="formField-lastYearAttended"><label>To (Actual or Expected)</label><input id="education-${n}--lastYearAttended-dateSectionYear-input" data-automation-id="dateSectionYear-input" placeholder="YYYY"></div></div>`,
    language: (n, i) => `<div role="group" aria-labelledby="h-${n}"><h4 id="h-${n}">Languages ${i}</h4>
      <div data-automation-id="formField-language"><label for="language-${n}--language">Language*</label><button type="button" id="language-${n}--language" aria-haspopup="listbox" data-options="English|French|German|Spanish">Select One</button></div>
      <div data-automation-id="formField-native"><input type="checkbox" id="language-${n}--native"><label for="language-${n}--native">I am fluent in this language.</label></div>
      <div data-automation-id="formField-languageProficiency-0"><label for="language-${n}--languageProficiency-0">Reading Proficiency*</label><button type="button" id="language-${n}--languageProficiency-0" aria-haspopup="listbox" data-options="1 - Beginner|2 - Intermediate|3 - Advanced|4 - Fluent|5 - Native">Select One</button></div>
      <div data-automation-id="formField-languageProficiency-1"><label for="language-${n}--languageProficiency-1">Speaking Proficiency*</label><button type="button" id="language-${n}--languageProficiency-1" aria-haspopup="listbox" data-options="1 - Beginner|2 - Intermediate|3 - Advanced|4 - Fluent|5 - Native">Select One</button></div></div>`,
    webAddress: (n, i) => `<div role="group" aria-labelledby="h-${n}"><h4 id="h-${n}">Websites ${i}</h4>
      <div data-automation-id="formField-url"><label for="webAddress-${n}--url">URL*</label><input id="webAddress-${n}--url"></div></div>`,
  };
  TREES.fos = { '': ['Biomedical Engineering', 'Mechanical Engineering', 'Mechatronics', 'Electrical Engineering'] };
  document.querySelectorAll('button[data-kind]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entries = btn.parentElement.querySelector('.entries');
      const i = entries.children.length + 1;
      setTimeout(() => {
        entries.insertAdjacentHTML('beforeend', (window.FIXTURE_TEMPLATES || TEMPLATES)[btn.dataset.kind](seq++, i));
        entries.lastElementChild.querySelectorAll('.prompt').forEach(wirePrompt);
        btn.textContent = 'Add Another';
      }, 200);
    });
  });

  // ---------- CV ----------
  document.getElementById('resume-input')?.addEventListener('change', (e) => {
    document.getElementById('resume-name').textContent = [...e.target.files].map((f) => `${f.name} (${f.size} bytes)`).join(', ');
  });
