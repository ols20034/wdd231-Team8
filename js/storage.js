// storage.js: everything that reads or writes localStorage lives here.
//
// TODO (after checkpoint):
// const KEY = 'shelfwise-books';
//
// export function getShelf() {
//   // return JSON.parse(localStorage.getItem(KEY)) || [];
// }
//
// export function saveBook(book) {
//   // book looks like { id, title, author, shelf, rating, dateStarted, dateFinished, notes, favorite }
//   // replace it if the id already exists, otherwise add it, then setItem
// }
//
// export function removeBook(id) {
//   // filter it out and save the new array
// }
// storage.js: everything that reads or writes localStorage lives here.

const KEY = 'shelfwise-books';
const SORT_KEY = 'shelfwise-sort';

export const SHELF_NAMES = {
  'to-read': 'Want to Read',
  reading: 'Currently Reading',
  finished: 'Finished',
};

// Returns an array of saved books. Bad or missing data gives an empty array.
export function getShelf() {
  try {
    const books = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(books) ? books : [];
  } catch {
    return [];
  }
}

function setShelf(books) {
  localStorage.setItem(KEY, JSON.stringify(books));
}

export function getSavedBook(id) {
  return getShelf().find((book) => book.id === id) || null;
}

// book looks like { id, title, author, coverId, shelf, rating, dateStarted, dateFinished, notes, favorite }
// If the book is already saved it gets replaced, otherwise it's added.
export function saveBook(book) {
  const books = getShelf().filter((saved) => saved.id !== book.id);
  books.unshift({ ...book, savedAt: new Date().toISOString() });
  setShelf(books);
}

export function removeBook(id) {
  setShelf(getShelf().filter((book) => book.id !== id));
}

// Remember how the user likes search results sorted.
export function getSortPreference() {
  return localStorage.getItem(SORT_KEY) || 'relevance';
}

export function setSortPreference(value) {
  localStorage.setItem(SORT_KEY, value);
}

// Remember the last search for this browser tab (sessionStorage), so coming back
// from a book page or the My Shelves page brings the same results back.
const SEARCH_KEY = 'shelfwise-last-search';

export function getLastSearch() {
  try {
    return JSON.parse(sessionStorage.getItem(SEARCH_KEY));
  } catch {
    return null;
  }
}

export function setLastSearch(query, type) {
  sessionStorage.setItem(SEARCH_KEY, JSON.stringify({ query, type }));
}

export function clearLastSearch() {
  sessionStorage.removeItem(SEARCH_KEY);
}
