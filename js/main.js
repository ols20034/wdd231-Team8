// main.js: entry point loaded by every page (type="module").
// Figures out which page it is on and runs the matching setup code.
//
// TODO (after checkpoint):
// import { searchBooks, getBook } from './api.js';
// import { getShelf, saveBook, removeBook } from './storage.js';
// import { renderBookCards, renderBookDetail, renderShelfList } from './ui.js';
//
// const page = document.body.dataset.page;  // or check location.pathname
// if (page === 'home')    { /* listen for search form submit, fetch, render cards */ }
// if (page === 'book')    { /* read ?id= with URLSearchParams, fetch the book, set up form validation */ }
// if (page === 'shelves') { /* load saved books from localStorage, render, handle filter and Remove */ }
// main.js: entry point loaded by every page (type="module").
// Sets up the menu, then runs the code for whichever page we're on (<body data-page="...">).

import { searchBooks, getPopularBooks, getBook } from './api.js';
import {
  getShelf, getSavedBook, saveBook, removeBook,
  getSortPreference, setSortPreference, SHELF_NAMES,
} from './storage.js';
import {
  renderBookCards, renderBookDetail, renderShelfList, renderStats, showMessage,
} from './ui.js';
import { validateForm, liveValidate, readForm, fillForm } from './form.js';
import { setupNav } from './nav.js';

setupNav();

const page = document.body.dataset.page;
if (page === 'home') initHome();
if (page === 'book') initBook();
if (page === 'shelves') initShelves();

/* ---------- Home / search page ---------- */
async function initHome() {
  const grid = document.querySelector('.book-grid');
  const heading = document.getElementById('results-heading');
  const status = document.getElementById('results-status');
  const sortSelect = document.getElementById('sort-results');
  const queryInput = document.getElementById('search-query');
  const typeSelect = document.getElementById('search-type');

  // The search form submits with method="get", so the search ends up in the URL:
  // index.html?q=dune&type=title. Reading it back here means results can be bookmarked
  // and the Back button works.
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();
  const type = params.get('type') || 'title';
  queryInput.value = query;
  if (['title', 'author', 'subject'].includes(type)) typeSelect.value = type;

  sortSelect.value = getSortPreference();
  let books = [];

  const draw = () => renderBookCards(sortBooks(books, sortSelect.value), grid);

  sortSelect.addEventListener('change', () => {
    setSortPreference(sortSelect.value);
    if (books.length) draw();
  });

  heading.textContent = query ? `Results for "${query}"` : 'Popular classics';
  showMessage(grid, 'Loading books…', 'loading');

  try {
    books = query ? await searchBooks(query, type) : await getPopularBooks();
    if (books.length === 0) {
      showMessage(grid, `No books found for "${query}". Try a different spelling or search by author.`);
      status.textContent = 'No results found.';
      return;
    }
    draw();
    status.textContent = `${books.length} books loaded.`;
  } catch (error) {
    console.error(error);
    showMessage(grid, "Couldn't reach Open Library. Check your connection and try again.", 'error');
    status.textContent = 'Error loading books.';
  }
}

function sortBooks(books, sortBy) {
  const copy = [...books];
  const year = (b) => b.year ?? 0;
  if (sortBy === 'new') copy.sort((a, b) => year(b) - year(a));
  if (sortBy === 'old') copy.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  if (sortBy === 'title') copy.sort((a, b) => a.title.localeCompare(b.title));
  return copy; // "relevance" keeps the API's order
}

/* ---------- Book detail page ---------- */
async function initBook() {
  const article = document.querySelector('.book-detail');
  const formSection = document.querySelector('.shelf-form-section');
  const form = document.getElementById('shelf-form');
  const success = form.querySelector('.success-msg');

  // URL parameter: book.html?id=OL45804W
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id || !/^OL\d+W$/.test(id)) {
    article.innerHTML = '<p class="message message-error">No book selected. <a href="index.html">Search for a book</a> to see its details.</p>';
    return;
  }

  let book;
  try {
    book = await getBook(id);
  } catch (error) {
    console.error(error);
    article.innerHTML = '<p class="message message-error">Sorry, we couldn\'t load this book. <a href="index.html">Back to search</a></p>';
    return;
  }

  renderBookDetail(book, article);
  document.title = `${book.title} | Shelfwise`;

  // Show the form now that we have a book to save
  formSection.hidden = false;
  form.bookId.value = book.id;
  liveValidate(form);

  const saved = getSavedBook(book.id);
  if (saved) {
    fillForm(form, saved);
    form.querySelector('button[type="submit"]').textContent = 'Update shelf';
    document.getElementById('form-heading').textContent = `On your ${SHELF_NAMES[saved.shelf]} shelf`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.dataset.submitted = 'true';
    success.hidden = true;
    if (!validateForm(form)) return;

    const entry = { id: book.id, title: book.title, author: book.author, coverId: book.coverId, ...readForm(form) };
    saveBook(entry);

    // Link straight to the shelf it was saved on (another URL parameter)
    success.innerHTML = `Saved to ${SHELF_NAMES[entry.shelf]}! <a href="shelves.html?shelf=${entry.shelf}">View that shelf</a>`;
    success.hidden = false;
    form.querySelector('button[type="submit"]').textContent = 'Update shelf';
    document.getElementById('form-heading').textContent = `On your ${SHELF_NAMES[entry.shelf]} shelf`;
  });
}

/* ---------- My Shelves page ---------- */
function initShelves() {
  const list = document.querySelector('.shelf-list');
  const stats = document.querySelector('.shelf-stats');
  const empty = document.querySelector('.empty-state');
  const emptyText = empty.querySelector('p');
  const filter = document.getElementById('shelf-filter');
  const status = document.getElementById('shelf-status');
  const heading = document.querySelector('.shelves-header h1');

  // URL parameter: shelves.html?shelf=finished opens with that filter chosen
  const startShelf = new URLSearchParams(window.location.search).get('shelf');
  if (startShelf && SHELF_NAMES[startShelf]) filter.value = startShelf;

  function render() {
    const all = getShelf();
    const shown = filter.value === 'all' ? all : all.filter((b) => b.shelf === filter.value);

    renderStats(all, stats);
    renderShelfList(shown, list);
    list.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    emptyText.textContent = all.length === 0
      ? 'Your shelves are empty. Search for a book and save it to get started.'
      : `No books on your ${SHELF_NAMES[filter.value]} shelf yet.`;
  }

  filter.addEventListener('change', () => {
    // Keep the URL in sync so the filtered view can be bookmarked or shared
    const url = new URL(window.location);
    if (filter.value === 'all') url.searchParams.delete('shelf');
    else url.searchParams.set('shelf', filter.value);
    history.replaceState(null, '', url);
    render();
  });

  // One listener on the list handles every Remove button (event delegation)
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const book = getSavedBook(button.dataset.remove);
    removeBook(button.dataset.remove);
    render();
    status.textContent = `Removed ${book ? book.title : 'book'} from your shelf.`;
    heading.focus(); // the button is gone, so move keyboard focus somewhere sensible
  });

  render();
}
