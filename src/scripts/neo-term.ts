// Behaviour for <NeoTerm> explanations (hover, focus, tap, Escape). Loaded once by NeoMyco.astro.
export {};
  const close = (el: Element) => { el.classList.remove('is-open'); el.querySelector('button')?.setAttribute('aria-expanded', 'false'); };
  document.querySelectorAll('[data-neo-term]').forEach((el) => {
    const btn = el.querySelector('button')!;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !el.classList.contains('is-open');
      document.querySelectorAll('[data-neo-term].is-open').forEach(close);
      if (open) { el.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', () => document.querySelectorAll('[data-neo-term].is-open').forEach(close));
  // Escape hides the explanation even while the term is hovered or focused, until the pointer or focus leaves it.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-neo-term]').forEach((el) => { close(el); if (el.matches(':hover, :focus-within')) el.classList.add('is-dismissed'); });
  });
  document.querySelectorAll('[data-neo-term]').forEach((el) => {
    const undismiss = () => { if (!el.matches(':hover, :focus-within')) el.classList.remove('is-dismissed'); };
    el.addEventListener('mouseleave', undismiss);
    el.addEventListener('focusout', () => setTimeout(undismiss));
    el.querySelector('button')!.addEventListener('click', () => el.classList.remove('is-dismissed'));
  });
