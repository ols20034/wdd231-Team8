// notify.js: the "Saved!" confirmation after the shelf form is submitted.
// Wide screens get a toast in the top-right corner; small screens (phones) get a
// dialog in the center with a View Shelf button. Both close themselves after a few
// seconds. The gold countdown bar's animation ends -> the message closes.

const SMALL_SCREEN = window.matchMedia('(max-width: 639px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOAST_MS = 5000;
const DIALOG_MS = 6000;

// Call fn when the countdown bar finishes. With reduced motion the bar doesn't animate,
// so use a plain timer instead.
function whenTimerEnds(timerEl, ms, fn) {
  timerEl.style.setProperty('--notify-duration', `${ms}ms`);
  if (REDUCED_MOTION.matches) {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  }
  timerEl.addEventListener('animationend', fn, { once: true });
  return () => timerEl.removeEventListener('animationend', fn);
}

/* ---------- Toast ---------- */
function toastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite'); // screen readers announce new toasts
    document.body.append(region);
  }
  return region;
}

function showToast({ title, message, linkHref, linkText }) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="notify-icon" aria-hidden="true">✓</span>
    <div class="toast-body">
      <p class="toast-title"></p>
      <p class="toast-message"></p>
      <a class="toast-link"></a>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss">&times;</button>
    <span class="notify-timer" aria-hidden="true"></span>`;
  // textContent so book titles can't inject HTML
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-message').textContent = message;
  const link = toast.querySelector('.toast-link');
  link.href = linkHref;
  link.textContent = linkText;

  const dismiss = () => {
    if (toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    // remove after the slide-out animation (or right away with reduced motion)
    setTimeout(() => toast.remove(), REDUCED_MOTION.matches ? 0 : 250);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  whenTimerEnds(toast.querySelector('.notify-timer'), TOAST_MS, dismiss);
  toastRegion().append(toast);
}

/* ---------- Dialog ---------- */
let dialog;
let stopTimer = () => {};

function buildDialog() {
  dialog = document.createElement('dialog');
  dialog.className = 'save-dialog';
  dialog.setAttribute('aria-labelledby', 'save-dialog-title');
  dialog.setAttribute('aria-describedby', 'save-dialog-message');
  dialog.innerHTML = `
    <span class="notify-icon" aria-hidden="true">✓</span>
    <h2 id="save-dialog-title"></h2>
    <p id="save-dialog-message"></p>
    <div class="save-dialog-actions">
      <a class="btn btn-primary save-dialog-link"></a>
      <button type="button" class="btn btn-ghost save-dialog-close">Keep browsing</button>
    </div>
    <span class="notify-timer" aria-hidden="true"></span>`;

  dialog.querySelector('.save-dialog-close').addEventListener('click', () => dialog.close());
  // Clicking the dark backdrop closes it too
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // If the user starts interacting, don't close it out from under them
  const hold = () => {
    dialog.classList.add('is-held');
    stopTimer();
  };
  dialog.addEventListener('pointerdown', hold);
  dialog.addEventListener('keydown', hold);
  dialog.addEventListener('close', stopTimer);

  document.body.append(dialog);
}

function showDialog({ title, message, linkHref, linkText }) {
  if (!dialog) buildDialog();
  dialog.querySelector('#save-dialog-title').textContent = title;
  dialog.querySelector('#save-dialog-message').textContent = message;
  const link = dialog.querySelector('.save-dialog-link');
  link.href = linkHref;
  link.textContent = linkText;

  // Restart the countdown bar from full
  stopTimer();
  dialog.classList.remove('is-held');
  const oldTimer = dialog.querySelector('.notify-timer');
  const timer = oldTimer.cloneNode();
  oldTimer.replaceWith(timer);
  stopTimer = whenTimerEnds(timer, DIALOG_MS, () => dialog.close());

  if (!dialog.open) dialog.showModal();
}

// One call for the page: picks the toast or the dialog based on screen width.
export function showSaved(details) {
  if (SMALL_SCREEN.matches) showDialog(details);
  else showToast(details);
}
