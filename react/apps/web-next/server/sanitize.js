// Mirrors app.js's sanitizeMessage(): DOMPurify running against a JSDOM
// window, same allowed tags/attrs, so messages stored by either app are
// sanitized identically.
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeMessage(message) {
  const withBreaks = (message || '').replace(/\n/g, '<br>');
  return DOMPurify.sanitize(withBreaks, {
    ALLOWED_TAGS: ['div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'br', 'img', 'a', 'span', 'p', 'pre'],
    ALLOWED_ATTR: ['data-excel-formula', 'data-excel-value', 'data-excel-type', 'src', 'href'],
  });
}

module.exports = { sanitizeMessage };
