// url.js: everything that reads or writes URL parameters lives here.
// Our pages pass data through the URL:
//   index.html?q=dune&type=title   the current search
//   book.html?id=OL45804W          which book to show
//   shelves.html?shelf=finished    which shelf to filter to

// Read one parameter from the current page's URL. Returns null if it isn't there.
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Change the current URL's parameters without reloading the page or adding a
// Back-button step. Pass null or '' to remove a parameter.
//   updateParams({ shelf: 'finished' })     -> shelves.html?shelf=finished
//   updateParams({ q: null, type: null })   -> index.html
export function updateParams(changes) {
  const url = new URL(window.location);
  for (const [name, value] of Object.entries(changes)) {
    if (value === null || value === '') url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  history.replaceState(null, '', url);
}

// Links to our own pages, so the parameter names are only written in one place.
export function bookUrl(id) {
  return `book.html?id=${encodeURIComponent(id)}`;
}

export function shelfUrl(shelf) {
  return `shelves.html?shelf=${encodeURIComponent(shelf)}`;
}
