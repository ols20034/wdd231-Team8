// main.js: entry point loaded by every page (type="module").
// Sets up the menu, then runs the code for whichever page we're on (<body data-page="...">).

import { searchBooks, getPopularBooks, getBook } from './api.js';
import {
  getShelf, getSavedBook, saveBook, removeBook,
  getSortPreference, setSortPreference, SHELF_NAMES,
  getLastSearch, setLastSearch, clearLastSearch,
} from './storage.js';
import {
  renderBookCards, renderBookDetail, renderShelfList, renderStats, showMessage,
} from './ui.js';
import { validateForm, liveValidate, readForm, fillForm } from './form.js';
import { setupNav } from './nav.js';
import { getParam, updateParams, shelfUrl } from './url.js';
import { showSaved } from './notify.js';

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

  const clearButton = document.querySelector('.search-clear');

  // The search form submits with method="get", so the search ends up in the URL:
  // index.html?q=dune&type=title. Reading it back here means results can be bookmarked
  // and the Back button works.
  let query;
  let type;
  if (getParam('q') !== null) {
    // A search was just submitted. A blank search means "show me everything" (popular books).
    query = getParam('q').trim();
    type = getParam('type') || 'title';
    if (query) setLastSearch(query, type);
    else clearLastSearch();
  } else {
    // Came back to Search from another page: bring back the last search, if there was one.
    const last = getLastSearch();
    query = last ? last.query : '';
    type = last ? last.type : 'title';
    if (query) updateParams({ q: query, type });
  }
  if (!['title', 'author', 'subject'].includes(type)) type = 'title';
  queryInput.value = query;
  typeSelect.value = type;

  sortSelect.value = getSortPreference();
  let books = [];

  const draw = () => renderBookCards(sortBooks(books, sortSelect.value), grid);

  sortSelect.addEventListener('change', () => {
    setSortPreference(sortSelect.value);
    if (books.length) draw();
  });

  // Clear shows only while there's something to clear
  const updateClearButton = () => {
    clearButton.hidden = !queryInput.value.trim() && !query;
  };
  queryInput.addEventListener('input', updateClearButton);

  // Clear resets the search box, forgets the saved search, and goes back to popular books
  clearButton.addEventListener('click', () => {
    clearLastSearch();
    query = '';
    queryInput.value = '';
    typeSelect.value = 'title';
    updateParams({ q: null, type: null });
    updateClearButton();
    queryInput.focus();
    loadResults('', 'title');
  });

  async function loadResults(searchQuery, searchType) {
    heading.textContent = searchQuery ? `Results for "${searchQuery}"` : 'Popular Reads';
    showMessage(grid, 'Loading books…', 'loading');
    books = [];
    try {
      books = searchQuery ? await searchBooks(searchQuery, searchType) : await getPopularBooks();
      if (books.length === 0) {
        showMessage(grid, `No books found for "${searchQuery}". Try a different spelling or search by author.`);
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

  updateClearButton();
  loadResults(query, type);
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

  // URL parameter: book.html?id=OL45804W
  const id = getParam('id');
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
    if (!validateForm(form)) return;

    const isUpdate = Boolean(getSavedBook(book.id));
    const entry = { id: book.id, title: book.title, author: book.author, coverId: book.coverId, ...readForm(form) };
    saveBook(entry);

    // Toast (wide screens) or dialog (phones) with a link straight to that shelf (URL parameter)
    showSaved({
      title: isUpdate ? 'Shelf updated' : 'Saved!',
      message: `"${book.title}" is on your ${SHELF_NAMES[entry.shelf]} shelf.`,
      linkHref: shelfUrl(entry.shelf),
      linkText: `View ${SHELF_NAMES[entry.shelf]} shelf`,
    });
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
  const startShelf = getParam('shelf');
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
    updateParams({ shelf: filter.value === 'all' ? null : filter.value });
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
