// form.js: validation for the "Add to my shelf" form on book.html.
// The form has novalidate, so these checks replace the browser's pop-ups
// with messages written next to each field.

function today() {
  // yyyy-mm-dd in the user's own time zone, to compare with <input type="date"> values
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// Which optional fields each shelf uses:
//   Want to Read      -> planned start date only (it can be in the future)
//   Currently Reading -> start date only
//   Finished          -> rating, start date, and finish date
const SHELF_FIELDS = {
  '': [],
  'to-read': ['started'],
  reading: ['started'],
  finished: ['rating', 'started', 'finished'],
};

function uses(form, field) {
  return (SHELF_FIELDS[form.shelf.value] || []).includes(field);
}

// Each rule returns an error message, or '' if the field is fine.
const rules = {
  shelf: (form) => (form.shelf.value ? '' : 'Please choose a shelf.'),

  dateStarted: (form) => {
    const started = form.dateStarted.value;
    if (!uses(form, 'started') || !started) return '';
    // Want to Read can be planned ahead; the other shelves mean you've already started
    if (form.shelf.value !== 'to-read' && started > today()) return "Start date can't be in the future.";
    return '';
  },

  dateFinished: (form) => {
    if (!uses(form, 'finished')) return '';
    const started = form.dateStarted.value;
    const finished = form.dateFinished.value;
    if (!finished) return 'Add the date you finished the book.';
    if (finished > today()) return "Finish date can't be in the future.";
    if (started && finished < started) return 'Finish date must be on or after the start date.';
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

// Show only the fields that make sense for the chosen shelf, and adjust the start-date
// label and limits (Want to Read can have a planned start date in the future).
export function updateShelfFields(form) {
  const shelf = form.shelf.value;
  document.querySelector('.rating-field').hidden = !uses(form, 'rating');
  document.getElementById('started-field').hidden = !uses(form, 'started');
  document.getElementById('finished-field').hidden = !uses(form, 'finished');

  const startedLabel = form.querySelector('label[for="date-started"]');
  const startedHint = document.getElementById('started-hint');
  if (shelf === 'to-read') {
    startedLabel.textContent = 'Planned start date';
    startedHint.textContent = 'Optional. Pick a future date if you plan to start later.';
    form.dateStarted.removeAttribute('max');
  } else {
    startedLabel.textContent = 'Date started';
    startedHint.textContent = '';
    form.dateStarted.max = today();
  }
  form.dateFinished.max = today();

  // Clear old error messages on fields that are now hidden
  if (!uses(form, 'started')) showError(form, 'dateStarted', '');
  if (!uses(form, 'finished')) showError(form, 'dateFinished', '');
}

// After the first submit attempt, re-check fields as the user fixes them.
export function liveValidate(form) {
  form.shelf.addEventListener('change', () => updateShelfFields(form));
  updateShelfFields(form);

  form.addEventListener('change', () => {
    if (!form.dataset.submitted) return;
    for (const [name, rule] of Object.entries(rules)) showError(form, name, rule(form));
  });

  // Character counter for notes
  const counter = document.getElementById('notes-count');
  const update = () => { counter.textContent = `${form.notes.value.length} / 500 characters`; };
  form.notes.addEventListener('input', update);
  update();
}

// Read the form into a plain object for storage.js.
// Hidden fields are saved as empty so a Want to Read book never keeps an old rating.
export function readForm(form) {
  return {
    shelf: form.shelf.value,
    rating: uses(form, 'rating') && form.rating.value ? Number(form.rating.value) : null,
    dateStarted: uses(form, 'started') ? form.dateStarted.value : '',
    dateFinished: uses(form, 'finished') ? form.dateFinished.value : '',
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
  updateShelfFields(form);
}
