// ui.js: functions that build HTML from data and put it on the page.

import { coverUrl } from './api.js';
import { SHELF_NAMES } from './storage.js';
import { bookUrl } from './url.js';

// Text from the API goes inside our HTML, so escape it first.
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Pick one of the six placeholder colors (.cover-1 to .cover-6) based on the id,
// so the same book always gets the same color.
function placeholderClass(id) {
  let total = 0;
  for (const char of id) total += char.charCodeAt(0);
  return `cover-${(total % 6) + 1}`;
}

function placeholderCover(book, extraClass = '') {
  return `<div class="cover ${placeholderClass(book.id)} ${extraClass}" aria-hidden="true"><span>${escapeHtml(book.title)}</span></div>`;
}

// Real cover image if Open Library has one, otherwise a colored placeholder.
// alt is empty on cards because the title is right underneath it.
// priority = true for the first few cards so they load right away (helps Lighthouse LCP).
function coverMarkup(book, size, extraClass = '', alt = '', priority = false) {
  if (!book.coverId) return placeholderCover(book, extraClass);

  return `<img
    class="cover cover-img ${extraClass}"
    src="${coverUrl(book.coverId, size)}"
    srcset="
      ${coverUrl(book.coverId, 'S')} 80w,
      ${coverUrl(book.coverId, 'M')} 180w
    "
    sizes="(max-width: 768px) 80px, 180px"
    alt="${escapeHtml(alt)}"
    width="180"
    height="270"
    loading="${priority ? 'eager' : 'lazy'}"
    fetchpriority="${priority ? 'high' : 'auto'}"
    decoding="async"
    data-id="${escapeHtml(book.id)}"
    data-title="${escapeHtml(book.title)}">`;
}


// If a cover image fails to load, swap it for the placeholder.
function handleBrokenCovers(container) {
  container.querySelectorAll('img.cover-img').forEach((img) => {
    img.addEventListener('error', () => {
      const extra = [...img.classList].filter((c) => c !== 'cover' && c !== 'cover-img').join(' ');
      img.outerHTML = placeholderCover({ id: img.dataset.id, title: img.dataset.title }, extra);
    }, { once: true });
  });
}

// Loading spinner / error / empty messages share one style.
export function showMessage(container, text, type = 'info') {
  const spinner = type === 'loading' ? '<span class="spinner" aria-hidden="true"></span>' : '';
  container.innerHTML = `<li class="message message-${type}">${spinner}${escapeHtml(text)}</li>`;
}

// Home page: one card per search result. Each card links to book.html?id=... (URL parameter).
export function renderBookCards(books, container) {
  container.innerHTML = books.map((book, index) => `
    <li class="book-card" style="--delay: ${index * 60}ms">
      <a href="${bookUrl(book.id)}">
        ${coverMarkup(book, 'M', '', '', index < 4)}
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <p class="book-year">${book.year ?? 'Year unknown'}</p>
      </a>
    </li>`).join('');
  handleBrokenCovers(container);
}

// Book page: fill in the <article> with the book's details.
export function renderBookDetail(book, article) {
  const description = book.description
    // keep the first paragraph and strip Markdown links like [text](url) down to "text"
    ? escapeHtml(book.description.trim().split(/\n\s*\n/)[0].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))
    : 'No description available for this book.';

  const subjects = book.subjects.length
    ? `<ul class="tag-list" aria-label="Subjects">${book.subjects.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';

  article.innerHTML = `
    ${coverMarkup(book, 'L', 'cover-large', `Cover of ${book.title}`)}
    <div class="book-info">
      <h1>${escapeHtml(book.title)}</h1>
      <p class="book-author">by ${escapeHtml(book.author)}</p>
      <dl class="book-meta">
        <div><dt>First published</dt><dd>${escapeHtml(book.firstPublished || 'Unknown')}</dd></div>
        <div><dt>Open Library ID</dt><dd>${escapeHtml(book.id)}</dd></div>
      </dl>
      <p class="book-description">${description}</p>
      ${subjects}
    </div>`;
  handleBrokenCovers(article);
}

function stars(rating) {
  if (!rating) return '';
  const n = Number(rating);
  return `<span class="rating" aria-label="Rated ${n} out of 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

// My Shelves page: one row per saved book, each with a Remove button.
export function renderShelfList(books, container) {
  container.innerHTML = books.map((book, index) => `
    <li class="shelf-item" style="--delay: ${index * 60}ms">
      ${coverMarkup(book, 'S', 'cover-small')}
      <div class="shelf-item-info">
        <h2 class="book-title"><a href="${bookUrl(book.id)}">${escapeHtml(book.title)}</a></h2>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <p>
          <span class="badge badge-${book.shelf}">${SHELF_NAMES[book.shelf]}</span>
          ${stars(book.rating)}
          ${book.favorite ? '<span class="favorite" aria-label="Favorite">♥</span>' : ''}
        </p>
      </div>
      <button type="button" class="btn btn-ghost" data-remove="${escapeHtml(book.id)}"
        aria-label="Remove ${escapeHtml(book.title)} from shelf">Remove</button>
    </li>`).join('');
  handleBrokenCovers(container);
}

// The three number boxes at the top of My Shelves.
export function renderStats(books, container) {
  const count = (shelf) => books.filter((b) => b.shelf === shelf).length;
  container.innerHTML = `
    <li><span class="stat-num">${count('to-read')}</span> Want to Read</li>
    <li><span class="stat-num">${count('reading')}</span> Reading</li>
    <li><span class="stat-num">${count('finished')}</span> Finished</li>`;
}
