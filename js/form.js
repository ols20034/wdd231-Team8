// form.js: validation for the "Add to my shelf" form on book.html.
// The form has novalidate, so these checks replace the browser's pop-ups
// with messages written next to each field.

function today() {
  // yyyy-mm-dd in the user's own time zone, to compare with <input type="date"> values
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// Each rule returns an error message, or '' if the field is fine.
const rules = {
  shelf: (form) => (form.shelf.value ? '' : 'Please choose a shelf.'),

  dateStarted: (form) => {
    const started = form.dateStarted.value;
    if (started && started > today()) return "Start date can't be in the future.";
    return '';
  },

  dateFinished: (form) => {
    const started = form.dateStarted.value;
    const finished = form.dateFinished.value;
    if (!finished) {
      return form.shelf.value === 'finished' ? 'Add the date you finished the book.' : '';
    }
    if (finished > today()) return "Finish date can't be in the future.";
    if (started && finished < started) return 'Finish date must be on or after the start date.';
    if (form.shelf.value === 'to-read') return 'Books on "Want to Read" can\'t have a finish date.';
    return '';
  },

  notes: (form) => (form.notes.value.length > 500 ? 'Notes must be 500 characters or fewer.' : ''),
};

function showError(form, name, message) {
  const field = form.elements[name];
  const errorEl = document.getElementById(field.getAttribute('aria-describedby')?.split(' ')[0]);
  field.classList.toggle('is-invalid', Boolean(message));
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) errorEl.textContent = message;
}

// Check every field. Returns true if the whole form is valid.
export function validateForm(form) {
  let firstInvalid = null;
  for (const [name, rule] of Object.entries(rules)) {
    const message = rule(form);
    showError(form, name, message);
    if (message && !firstInvalid) firstInvalid = form.elements[name];
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// After the first submit attempt, re-check fields as the user fixes them.
export function liveValidate(form) {
  form.addEventListener('change', () => {
    if (!form.dataset.submitted) return;
    for (const [name, rule] of Object.entries(rules)) showError(form, name, rule(form));
  });

  // Character counter for notes
  const counter = document.getElementById('notes-count');
  const update = () => { counter.textContent = `${form.notes.value.length} / 500 characters`; };
  form.notes.addEventListener('input', update);
  update();

  // Date pickers can't go past today
  form.dateStarted.max = today();
  form.dateFinished.max = today();
}

// Read the form into a plain object for storage.js
export function readForm(form) {
  return {
    shelf: form.shelf.value,
    rating: form.rating.value ? Number(form.rating.value) : null,
    dateStarted: form.dateStarted.value,
    dateFinished: form.dateFinished.value,
    notes: form.notes.value.trim(),
    favorite: form.favorite.checked,
  };
}

// Put saved values back in the form when the book is already on a shelf.
export function fillForm(form, saved) {
  form.shelf.value = saved.shelf;
  if (saved.rating) form.querySelector(`input[name="rating"][value="${saved.rating}"]`).checked = true;
  form.dateStarted.value = saved.dateStarted || '';
  form.dateFinished.value = saved.dateFinished || '';
  form.notes.value = saved.notes || '';
  form.favorite.checked = Boolean(saved.favorite);
  form.notes.dispatchEvent(new Event('input'));
}