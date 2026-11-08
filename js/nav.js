// nav.js: the hamburger drop-down menu used on small screens.
// On wide screens CSS hides the button and always shows the links.

export function setupNav() {
  const button = document.querySelector('.nav-toggle');
  const menu = document.getElementById('main-nav');
  if (!button || !menu) return;

  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
  }

  button.addEventListener('click', () => {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });

  // Escape closes the menu and puts focus back on the button.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('open')) {
      setOpen(false);
      button.focus();
    }
  });

  // Clicking anywhere outside the header closes it too.
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) setOpen(false);
  });
}