// linkedin_selectors.js
// LinkedIn-specific selector logic for feed detection

// Common LinkedIn feed selectors (most specific to least)
const FEED_SELECTORS = [
  'main[role="main"]',
  '[data-test-id="feed"]',
  '.scaffold-finite-scroll__content',
  '.feed-shared-update-v2',
  '.feed-shared-text',
  '.feed-shared-update-v2__content',
  '.feed-identity-module',
  '[data-test-id="feed-identity-module"]',
  '.main-content',
  '.feed'
];

function findLinkedInFeedElement() {
  console.log('Searching for LinkedIn feed element...');
  for (const selector of FEED_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found LinkedIn feed element with selector:', selector);
      console.log('Element dimensions:', element.offsetWidth, 'x', element.offsetHeight);
      console.log('Element scroll dimensions:', element.scrollWidth, 'x', element.scrollHeight);
      return element;
    }
  }
  // Try to find by common LinkedIn patterns
  console.log('No specific selector found, searching by patterns...');
  const possibleFeeds = document.querySelectorAll('div[class*="feed"], div[class*="post"], div[class*="update"], main, [role="main"]');
  console.log('Found', possibleFeeds.length, 'potential feed elements');
  for (const element of possibleFeeds) {
    console.log('Checking element:', element.className, 'dimensions:', element.offsetWidth, 'x', element.offsetHeight);
    if (element.textContent.length > 100 && element.offsetHeight > 200) {
      console.log('Found potential feed element by pattern matching');
      return element;
    }
  }
  return null;
}

export { findLinkedInFeedElement }; 