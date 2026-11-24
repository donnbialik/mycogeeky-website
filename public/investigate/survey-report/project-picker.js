/* Editable project combobox; keeps DOM focus in the input. */
window.initSurveyProjectPicker = function ({ input, list, status, search, onPick, onEdit }) {
  let items = [], active = -1, timer, generation = 0;
  const close = () => {
    clearTimeout(timer); generation++; active = -1;
    list.classList.add('hidden'); input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    [...list.children].forEach(el => el.setAttribute('aria-selected', 'false'));
  };
  const highlight = index => {
    active = index;
    list.classList.remove('hidden'); input.setAttribute('aria-expanded', 'true');
    [...list.children].forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    const option = list.children[active];
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  };
  const choose = index => {
    const project = items[index]; if (!project) return;
    input.value = project.title; onPick(project); close();
    status.textContent = `Selected project: ${project.title}.`;
  };
  input.addEventListener('input', () => {
    close(); items = []; list.replaceChildren(); onEdit();
    const query = input.value.trim(), request = generation;
    status.textContent = '';
    if (query.length < 2) return;
    timer = setTimeout(async () => {
      status.textContent = 'Searching projects…';
      try {
        const results = await search(query);
        if (request !== generation) return;
        items = results;
        list.replaceChildren(...items.map((project, i) => {
          const option = document.createElement('li');
          option.id = `${list.id}-option-${i}`; option.dataset.i = String(i);
          option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
          option.textContent = project.title; return option;
        }));
        list.classList.toggle('hidden', !items.length);
        input.setAttribute('aria-expanded', String(items.length > 0));
        status.textContent = items.length ? `${items.length} projects available. Use Up or Down Arrow, then Enter to select.` : 'No matching projects. Try another name.';
      } catch {
        if (request !== generation) return;
        close(); items = []; list.replaceChildren();
        status.textContent = 'Project search could not finish. Edit the name to try again.';
      }
    }, 250);
  });
  input.addEventListener('keydown', e => {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
      e.preventDefault();
      highlight(active < 0 ? (e.key === 'ArrowDown' ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); choose(active);
    } else if (e.key === 'Escape') {
      if (input.getAttribute('aria-expanded') === 'true') e.preventDefault();
      close(); status.textContent = '';
    } else if (e.key === 'Tab') { close(); status.textContent = ''; }
  });
  // Prevent mouse focus leaving the input before click; click also supports touch/AT activation.
  list.addEventListener('mousedown', e => { if (e.target.closest('[role="option"]')) e.preventDefault(); });
  list.addEventListener('click', e => {
    const option = e.target.closest('[role="option"]');
    if (option && list.contains(option)) { choose(Number(option.dataset.i)); input.focus(); }
  });
  input.addEventListener('blur', () => { close(); status.textContent = ''; });
  return { close };
};
