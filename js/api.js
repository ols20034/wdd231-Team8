// api.js: everything that talks to the Open Library API lives here.
// Docs: https://openlibrary.org/developers/api

const BASE = 'https://openlibrary.org';
// editions.* + lang=en asks Open Library for the best English edition of each work,
// so we can show "The Castle" instead of the original "Das Schloß".
const SEARCH_FIELDS = 'key,title,author_name,first_publish_year,cover_i,editions,editions.title,editions.language';

// Shared helper: fetch a URL and return the parsed JSON, or throw a readable error.
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library returned ${response.status}`);
  }
  return response.json();
}

// "/works/OL45804W" -> "OL45804W"
export function workIdFromKey(key) {
  return key.split('/').pop();
}

// Use the English edition's title when the work's title is in another language.
// If they only differ by capitalization, keep the work's title (it's usually cleaner).
function englishTitle(doc) {
  const edition = doc.editions && doc.editions.docs && doc.editions.docs[0];
  const isEnglish = edition && edition.title && (edition.language || []).includes('eng');
  if (isEnglish && edition.title.toLowerCase() !== doc.title.toLowerCase()) {
    return edition.title;
  }
  return doc.title;
}

// Turn one raw search result into the small object the rest of the app uses.
function toBookSummary(doc) {
  return {
    id: workIdFromKey(doc.key),
    title: englishTitle(doc),
    author: doc.author_name ? doc.author_name[0] : 'Unknown author',
    year: doc.first_publish_year || null,
    coverId: doc.cover_i || null,
  };
}

// type is "title", "author", or "subject" (the values in the Search by drop-down).
export async function searchBooks(query, type = 'title', limit = 12) {
  const allowed = ['title', 'author', 'subject'];
  const field = allowed.includes(type) ? type : 'title';
  const url = `${BASE}/search.json?${field}=${encodeURIComponent(query)}&limit=${limit}&lang=en&fields=${SEARCH_FIELDS}`;
  const data = await getJson(url);
  return data.docs.map(toBookSummary);
}

// Books shown on the home page before the user searches.
export async function getPopularBooks() {
  const featuredTitles = [
    'The Hobbit',
    'Dune',
    'To Kill a Mockingbird',
    '1984',
    'Pride and Prejudice',
    'The Great Gatsby',
    'The Catcher in the Rye',
    'The Lord of the Rings',
    'Jane Eyre',
    'Fahrenheit 451',
    'The Book Thief',
    'Brave New World'
  ];

  const results = await Promise.all(
    featuredTitles.map(title =>
      searchBooks(title, 'title', 1)
    )
  );

  return results
    .flat()
    .filter(book => book);
}


// Full details for one work, plus its author names (they come from a separate endpoint).
export async function getBook(workId) {
  // Ask for the work and its English title at the same time.
  const [work, titleResult] = await Promise.all([
    getJson(`${BASE}/works/${encodeURIComponent(workId)}.json`),
    getJson(`${BASE}/search.json?q=key:/works/${encodeURIComponent(workId)}&lang=en&fields=key,title,first_publish_year,editions,editions.title,editions.language`)
      .catch(() => null), // if this fails we just use the original title
  ]);
  const searchDoc = titleResult && titleResult.docs[0];

  const authorKeys = (work.authors || []).slice(0, 2).map((a) => a.author.key);
  const authors = await Promise.all(
    authorKeys.map((key) =>
      getJson(`${BASE}${key}.json`)
        .then((author) => author.name)
        .catch(() => null) // one missing author shouldn't break the page
    )
  );

  // description is sometimes a string and sometimes { type, value }
  let description = '';
  if (typeof work.description === 'string') {
    description = work.description;
  } else if (work.description && work.description.value) {
    description = work.description.value;
  }

  return {
    id: workId,
    title: searchDoc ? englishTitle(searchDoc) : work.title,
    author: authors.filter(Boolean).join(', ') || 'Unknown author',
    description,
    // the search index's year is more reliable than the work record's date
    firstPublished: (searchDoc && searchDoc.first_publish_year) || work.first_publish_date || null,
    subjects: (work.subjects || []).slice(0, 6),
    coverId: work.covers ? work.covers.find((id) => id > 0) || null : null,
  };
}

// size: "S", "M", or "L". default=false makes a missing cover return 404 so we can show our placeholder.
export function coverUrl(coverId, size = 'M') {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}
