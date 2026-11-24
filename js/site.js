/* Shared, dependency-free interactions. Public identity is rendered in HTML. */
(function () {
  'use strict';
  const navbar = document.getElementById('dg-navbar');
  const toggle = document.getElementById('dg-mobile-toggle');
  const links = document.getElementById('dg-nav-links');
  if (navbar && toggle && links) {
    navbar.classList.add('is-enhanced');
    toggle.hidden = false;
    const setOpen = function (open) {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-list', !open);
        icon.classList.toggle('bi-x', open);
      }
    };
    toggle.addEventListener('click', function () { setOpen(!links.classList.contains('open')); });
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && links.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (event) {
      if (!navbar.contains(event.target)) setOpen(false);
    });
    navbar.addEventListener('focusout', function (event) {
      if (event.relatedTarget && !navbar.contains(event.relatedTarget)) setOpen(false);
    });
    window.matchMedia('(min-width: 992px)').addEventListener('change', function () { setOpen(false); });
    const updateShadow = function () { navbar.classList.toggle('scrolled', window.scrollY > 50); };
    window.addEventListener('scroll', updateShadow, { passive: true });
    updateShadow();
  }
  document.querySelectorAll('[data-current-year]').forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });
  const status = document.getElementById('copy-status');
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', async function () {
      const value = button.dataset.copy;
      if (status) status.textContent = '';
      try {
        if (!window.isSecureContext || !navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value);
        if (status) status.textContent = 'Copied: ' + value;
      } catch {
        if (status) status.textContent = 'Copy unavailable. Select and copy the contact shown on the page.';
        // Visible feedback also provides a selectable value if the browser denies clipboard permission.
        let fallback = button.closest('article').querySelector('.dg-copy-fallback');
        if (!fallback) {
          fallback = document.createElement('p');
          fallback.className = 'dg-copy-fallback';
          button.closest('article').appendChild(fallback);
        }
        fallback.textContent = 'Select and copy: ' + value;
      }
    });
  });
})();
