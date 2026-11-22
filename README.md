# Shelfwise (WDD 231 Team 8)

Search for books with the Open Library API and save them to your own shelves: Want to Read, Currently Reading, and Finished.

**Team:** Sam Smoot & Michelle Olsen
**Live site:** https://ols20034.github.io/wdd231-Team8/

## Pages
- `index.html`: search form and results (popular classics before you search)
- `book.html?id=OL…W`: book details and the "Add to my shelf" form
- `shelves.html?shelf=…`: your saved books, with counts and a filter

## JavaScript modules (`js/`)
| File | What it does |
|---|---|
| `main.js` | Entry point. Reads `data-page` on `<body>` and runs that page's setup |
| `api.js` | All `fetch` calls to Open Library (search, work details, authors, cover URLs) |
| `storage.js` | All `localStorage` reads/writes (saved books, sort preference) |
| `ui.js` | Builds HTML from data (book cards, detail view, shelf list, stats) |
| `form.js` | Validation rules for the shelf form |
| `nav.js` | Hamburger drop-down menu on small screens |
| `notify.js` | The "Saved!" toast (wide screens) or dialog (phones) after saving a book |
| `url.js` | Reads and updates URL parameters, and builds links to `book.html?id=` and `shelves.html?shelf=` |

## Requirements checklist
| Requirement | Where |
|---|---|
| Detailed, validated form | `book.html` shelf form + `form.js` (required shelf, date rules, notes limit) |
| Local storage | `storage.js`: saved shelves and sort preference |
| Fetch from API | `api.js`: Open Library search, works, and authors endpoints |
| Drop-down menu | Hamburger nav on small screens (`nav.js`, `css/header.css`) |
| CSS animation | Card fade-up, hover lift, menu slide-down, hamburger → X, loading spinner |
| Responsive design | Mobile-first CSS with breakpoints at 640px, 768px, 960px |
| UX & accessibility | Skip link, labels, `aria-live` messages, focus styles, reduced-motion support |
| URL parameters | `index.html?q=&type=`, `book.html?id=`, `shelves.html?shelf=` (all handled in `url.js`) |
| Modules | `type="module"` with `import`/`export` across eight files |

## Run locally
Open with VS Code Live Server. Modules won't load from `file://`.
