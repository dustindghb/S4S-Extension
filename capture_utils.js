// capture_utils.js
// Utility functions for viewport capture

// Scroll to a specific position
async function scrollToPosition(targetPosition) {
  window.scrollTo({ top: targetPosition, behavior: 'smooth' });
  await new Promise(resolve => setTimeout(resolve, 800));
  // Confirm scroll
  return Math.abs(window.scrollY - targetPosition) < 10;
}

// Get current scroll position
function getCurrentScrollPosition() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

// Check if there is more content to scroll
function hasMoreContent() {
  return window.innerHeight + window.scrollY < document.body.scrollHeight - 10;
}

// Stitch screenshots together vertically
async function stitchScreenshots(screenshots) {
  if (!screenshots.length) return null;
  const width = screenshots[0].image.width;
  const totalHeight = screenshots.reduce((sum, shot) => sum + shot.image.height, 0);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  let y = 0;
  for (const shot of screenshots) {
    ctx.drawImage(shot.image, 0, y);
    y += shot.image.height;
  }
  return canvas;
}

export { scrollToPosition, getCurrentScrollPosition, hasMoreContent, stitchScreenshots }; 