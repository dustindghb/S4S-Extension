// Simplified Viewport Capture for LinkedIn Feed Analysis
console.log('S4S Tool viewport capture script loaded successfully');

class ViewportCapture {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.html2canvasLoaded = false;
  }

  // Load html2canvas if not already loaded
  async loadHtml2Canvas() {
    if (this.html2canvasLoaded || typeof html2canvas !== 'undefined') {
      this.html2canvasLoaded = true;
      return;
    }

    try {
      console.log('Loading html2canvas...');
      // html2canvas should already be loaded via manifest
      if (typeof html2canvas !== 'undefined') {
        this.html2canvasLoaded = true;
        console.log('html2canvas loaded successfully');
      } else {
        throw new Error('html2canvas not available');
      }
    } catch (error) {
      console.error('Failed to load html2canvas:', error);
      throw error;
    }
  }

  // Capture the current visible viewport
  async captureCurrentViewport() {
    return new Promise(async (resolve) => {
      try {
        console.log('Capturing current viewport...');
        
        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
          await this.loadHtml2Canvas();
        }
        
        if (typeof html2canvas === 'undefined') {
          throw new Error('html2canvas not available');
        }
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;
        
        console.log(`Viewport: ${viewportWidth}x${viewportHeight}, Scroll: ${scrollX},${scrollY}`);
        
        // Try multiple capture strategies
        let canvas = null;
        let captureMethod = '';
        
        // Strategy 1: Try capturing document.body with viewport dimensions and scroll
        try {
          console.log('Strategy 1: Capturing document.body with viewport dimensions and scroll...');
          canvas = await html2canvas(document.body, {
            width: viewportWidth,
            height: viewportHeight,
            scrollX: scrollX,
            scrollY: scrollY,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: 1,
            logging: false,
            foreignObjectRendering: false,
            removeContainer: false,
            ignoreElements: (element) => {
              // Ignore fixed position elements that might interfere
              const style = window.getComputedStyle(element);
              if (style.position === 'fixed' && element !== document.body) {
                return true;
              }
              return false;
            }
          });
          captureMethod = 'document.body with viewport dimensions and scroll';
        } catch (error1) {
          console.log('Strategy 1 failed:', error1.message);
        }
        
        // Strategy 2: Try capturing without scroll parameters (let html2canvas handle it)
        if (!canvas) {
          try {
            console.log('Strategy 2: Capturing without scroll parameters...');
            canvas = await html2canvas(document.body, {
              width: viewportWidth,
              height: viewportHeight,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              scale: 1,
              logging: false,
              foreignObjectRendering: false,
              removeContainer: false,
              ignoreElements: (element) => {
                // Ignore fixed position elements that might interfere
                const style = window.getComputedStyle(element);
                if (style.position === 'fixed' && element !== document.body) {
                  return true;
                }
                return false;
              }
            });
            captureMethod = 'document.body without scroll parameters';
          } catch (error2) {
            console.log('Strategy 2 failed:', error2.message);
          }
        }
        
        // Strategy 3: Try capturing document.documentElement
        if (!canvas) {
          try {
            console.log('Strategy 3: Capturing document.documentElement...');
            canvas = await html2canvas(document.documentElement, {
              width: viewportWidth,
              height: viewportHeight,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              scale: 1,
              logging: false,
              foreignObjectRendering: false,
              removeContainer: false
            });
            captureMethod = 'document.documentElement';
          } catch (error3) {
            console.log('Strategy 3 failed:', error3.message);
          }
        }
        
        // Strategy 4: Try capturing without any specific dimensions
        if (!canvas) {
          try {
            console.log('Strategy 4: Capturing without any specific dimensions...');
            canvas = await html2canvas(document.body, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              scale: 1,
              logging: false,
              foreignObjectRendering: false,
              removeContainer: false
            });
            captureMethod = 'document.body without dimensions';
          } catch (error4) {
            console.log('Strategy 4 failed:', error4.message);
          }
        }
        
        // If all strategies failed, create a fallback canvas
        if (!canvas) {
          console.log('All capture strategies failed, creating fallback canvas...');
          canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewportWidth;
          canvas.height = viewportHeight;
          
          // Fill with light blue background to indicate it's a fallback
          ctx.fillStyle = '#e3f2fd';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add text indicating this is a fallback
          ctx.fillStyle = '#1976d2';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Viewport Capture Fallback', canvas.width / 2, canvas.height / 2 - 20);
          
          ctx.fillStyle = '#666666';
          ctx.font = '14px Arial';
          ctx.fillText(`Scroll Position: ${scrollY}px`, canvas.width / 2, canvas.height / 2 + 10);
          ctx.fillText(`Viewport: ${viewportWidth}x${viewportHeight}`, canvas.width / 2, canvas.height / 2 + 30);
          
          captureMethod = 'fallback canvas';
        }
        
        console.log(`✅ Viewport capture successful using ${captureMethod}: ${canvas.width}x${canvas.height}`);
        
        // Verify the canvas has content (but don't fail if it doesn't)
        const quality = this.analyzeImageQuality(canvas);
        console.log('Viewport quality:', quality);
        
        if (quality.contentRatio < 0.01 && captureMethod !== 'fallback canvas') {
          console.warn('Viewport appears to be mostly white - capture may have failed');
        }
        
        resolve(canvas);
        
      } catch (error) {
        console.error('Viewport capture failed completely:', error);
        
        // Create a basic error canvas instead of returning null
        const errorCanvas = document.createElement('canvas');
        const ctx = errorCanvas.getContext('2d');
        errorCanvas.width = window.innerWidth;
        errorCanvas.height = window.innerHeight;
        
        // Fill with error background
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
        
        // Add error text
        ctx.fillStyle = '#d32f2f';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Viewport Capture Failed', errorCanvas.width / 2, errorCanvas.height / 2 - 20);
        ctx.fillText('Please refresh and try again', errorCanvas.width / 2, errorCanvas.height / 2 + 10);
        
        resolve(errorCanvas);
      }
    });
  }

  // Wait for DOM mutation in the feed container after scroll (observe all mutation types)
  async waitForFeedMutationOrTimeout(timeoutMs = 2000) {
    return new Promise((resolve) => {
      const feedSelectors = [
        'main[role="main"]',
        '[data-test-id="feed"]',
        '.scaffold-finite-scroll__content',
        '.feed',
        '.core-rail',
        '.application-outlet',
        'body'
      ];
      let feed = null;
      for (const sel of feedSelectors) {
        feed = document.querySelector(sel);
        if (feed) break;
      }
      if (!feed) feed = document.body;

      let mutationDetected = false;
      const observer = new MutationObserver((mutationsList) => {
        if (mutationsList.length > 0) {
          mutationDetected = true;
          observer.disconnect();
          // Wait a bit longer for rendering
          setTimeout(() => resolve(true), 400);
        }
      });
      observer.observe(feed, { childList: true, subtree: true, attributes: true, characterData: true });

      setTimeout(() => {
        if (!mutationDetected) {
          observer.disconnect();
          resolve(false);
        }
      }, timeoutMs);
    });
  }

  // Compare two canvases by hashing a sample of their pixels
  canvasHash(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    // Sample a 10x10 grid
    let hash = '';
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const px = ctx.getImageData(Math.floor((x + 0.5) * w / 10), Math.floor((y + 0.5) * h / 10), 1, 1).data;
        hash += ((px[0] + px[1] + px[2]) > 384 ? '1' : '0');
      }
    }
    return hash;
  }

  // Capture full feed by scrolling and capturing viewport on each step
  async captureFullFeedByViewportScroll(maxHeight = 50000) {
    console.log('=== Starting captureFullFeedByViewportScroll ===');
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const originalScrollTop = window.pageYOffset;
    const capturedDataUrls = [];
    let captureCount = 0;
    
    try {
      // Start from the top
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer initial wait
      
      while (true) {
        console.log(`\n--- Capture ${captureCount + 1} ---`);
        console.log(`Current scroll position: ${window.pageYOffset}px, Content height: ${document.body.scrollHeight}`);

        // Capture the current viewport
        console.log('Requesting visible tab screenshot from background...');
        let dataUrl;
        try {
          dataUrl = await this.captureVisibleTab();
        } catch (err) {
          console.error('Failed to capture visible tab:', err);
          break;
        }

        // Export the screenshot as PNG
        await this.exportDataUrlImage(dataUrl, `viewport-scroll-${captureCount}`);
        capturedDataUrls.push(dataUrl);
        console.log(`✅ Exported viewport screenshot ${captureCount + 1} at scroll position ${window.pageYOffset}`);

        // Check for stop flag
        const stopResult = await new Promise(resolve => {
          chrome.storage.local.get(['viewportCaptureStop'], resolve);
        });
        if (stopResult.viewportCaptureStop) {
          console.log('Stop flag detected. Ending capture loop.');
          await chrome.storage.local.remove(['viewportCaptureStop']);
          break;
        }

        // Simple approach: scroll down by one viewport and wait for LinkedIn to load more content
        console.log('Scrolling down by one viewport to trigger content loading...');
        const beforeScrollHeight = document.body.scrollHeight;
        const currentScrollY = window.pageYOffset;
        
        // Scroll down by one viewport height
        const nextScrollY = currentScrollY + viewportHeight;
        console.log(`Scrolling from ${currentScrollY} to ${nextScrollY} (one viewport down)`);
        window.scrollTo(0, nextScrollY);
        
        // Wait longer for LinkedIn to load more content naturally
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds for content to load
        window.dispatchEvent(new Event('mousemove'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.dispatchEvent(new Event('scroll'));
        await new Promise(resolve => setTimeout(resolve, 2000)); // Additional wait
        
        // If we're near the bottom, scroll to bottom to trigger infinite scroll
        if (nextScrollY >= document.body.scrollHeight - viewportHeight) {
          console.log('Near bottom, scrolling to bottom to trigger infinite scroll...');
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait longer for infinite scroll
          window.dispatchEvent(new Event('mousemove'));
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check if new content was loaded (for logging only)
        const afterScrollHeight = document.body.scrollHeight;
        console.log(`Height before scroll: ${beforeScrollHeight}, after scroll: ${afterScrollHeight}`);
        
        if (afterScrollHeight > beforeScrollHeight) {
          console.log(`✅ New content loaded! Height increased from ${beforeScrollHeight} to ${afterScrollHeight}`);
        } else {
          console.log(`⏳ No new content loaded yet, continuing to wait...`);
        }

        // No need to scroll back up - we're already at the right position for the next capture
        console.log(`Ready for next capture at position: ${window.pageYOffset}px`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief wait before next capture

        captureCount++;
        console.log(`Completed ${captureCount} captures so far...`);
      }
      
      if (capturedDataUrls.length === 0) {
        console.warn('No viewport images captured. The page may not be scrollable or capture failed.');
        return { success: false, error: 'No viewport images captured' };
      } else {
        console.log(`Captured ${capturedDataUrls.length} viewport images`);
        
        // After loop: stitch all capturedDataUrls vertically and export as PNG
        if (capturedDataUrls.length > 0) {
          console.log('Stitching all captured screenshots...');
          const stitched = await this.stitchDataUrlImagesVertically(capturedDataUrls);
          await this.exportDataUrlImage(stitched, 'viewport-scroll-stitched');
          console.log('✅ Exported stitched image!');
        }
        
        // Restore original scroll position
        window.scrollTo(0, originalScrollTop);
        
        return { success: true, count: capturedDataUrls.length };
      }
    } catch (error) {
      console.error('Error in captureFullFeedByViewportScroll:', error);
      return { success: false, error: error.message };
    }
  }

  // Stitch viewport images together vertically
  async stitchViewportImages(viewportImages) {
    console.log(`Stitching ${viewportImages.length} viewport images...`);
    
    if (viewportImages.length === 0) {
      throw new Error('No viewport images to stitch');
    }
    
    if (viewportImages.length === 1) {
      console.log('Only one viewport image, returning as-is');
      return viewportImages[0].canvas;
    }
    
    // All viewport images should have the same width
    const width = viewportImages[0].canvas.width;
    const viewportHeight = viewportImages[0].canvas.height;
    
    // Calculate total height (no overlap, just stack them)
    const totalHeight = viewportImages.length * viewportHeight;
    
    console.log(`Creating stitched canvas: ${width}x${totalHeight}`);
    
    // Create the stitched canvas
    const stitchedCanvas = document.createElement('canvas');
    const stitchedCtx = stitchedCanvas.getContext('2d');
    stitchedCanvas.width = width;
    stitchedCanvas.height = totalHeight;
    
    // Fill with white background
    stitchedCtx.fillStyle = '#ffffff';
    stitchedCtx.fillRect(0, 0, width, totalHeight);
    
    // Draw each viewport image in sequence
    let currentY = 0;
    for (let i = 0; i < viewportImages.length; i++) {
      const viewportImage = viewportImages[i];
      const canvas = viewportImage.canvas;
      
      console.log(`Drawing viewport ${i + 1} at Y=${currentY}`);
      
      stitchedCtx.drawImage(
        canvas,
        0, 0, width, viewportHeight,
        0, currentY, width, viewportHeight
      );
      
      currentY += viewportHeight;
    }
    
    console.log(`✅ Stitching complete: ${stitchedCanvas.width}x${stitchedCanvas.height}`);
    return stitchedCanvas;
  }

  // Wait for scroll to settle and content to load
  async waitForScrollSettle() {
    return new Promise((resolve) => {
      // Wait a bit for any scroll animations to complete
      setTimeout(() => {
        // Additional wait for any lazy-loaded content
        setTimeout(resolve, 300);
      }, 200);
    });
  }

  // Check if viewport content has changed (simple check)
  hasViewportContentChanged(previousScrollY) {
    const currentScrollY = window.pageYOffset;
    const scrollDifference = Math.abs(currentScrollY - previousScrollY);
    
    // If scroll position changed significantly, content likely changed
    if (scrollDifference > 50) {
      return true;
    }
    
    // Additional check: look for new content in the viewport
    const viewportElements = document.elementsFromPoint(
      window.innerWidth / 2, 
      window.innerHeight / 2
    );
    
    // If we find elements that weren't there before, content changed
    return viewportElements.length > 0;
  }

  // Export image for debugging
  async exportImage(canvas, filename) {
    try {
      console.log('Exporting image for debugging...');
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('Image exported successfully:', link.download);
      }, 'image/png');
      
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  }

  // Analyze the quality of the captured image
  analyzeImageQuality(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalPixels = 0;
    let nonWhitePixels = 0;
    let textLikePixels = 0;
    
    // Sample pixels to analyze content
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalPixels++;
      
      // Check if pixel is not white
      if (r < 250 || g < 250 || b < 250) {
        nonWhitePixels++;
        
        // Check if pixel looks like text (dark colors)
        if (r < 100 && g < 100 && b < 100) {
          textLikePixels++;
        }
      }
    }
    
    const contentRatio = nonWhitePixels / totalPixels;
    const textRatio = textLikePixels / totalPixels;
    
    return {
      width: canvas.width,
      height: canvas.height,
      contentRatio: contentRatio.toFixed(3),
      textRatio: textRatio.toFixed(3),
      quality: contentRatio > 0.1 ? 'Good' : 'Poor',
      hasText: textRatio > 0.01 ? 'Yes' : 'No'
    };
  }

  // Test single viewport capture
  async testSingleViewport() {
    try {
      console.log('=== Testing Single Viewport ===');
      
      const canvas = await this.captureCurrentViewport();
      
      if (canvas) {
        console.log('✅ Single viewport capture successful');
        console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
        
        // Export the result
        await this.exportImage(canvas, 'single-viewport-test');
        
        return {
          success: true,
          canvas: canvas,
          width: canvas.width,
          height: canvas.height
        };
      } else {
        console.error('❌ Single viewport capture failed - no canvas returned');
        return { success: false, error: 'No canvas returned' };
      }
      
    } catch (error) {
      console.error('❌ Single viewport capture test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Test the viewport scroll capture method
  async testViewportScrollCapture() {
    try {
      console.log('=== Testing Viewport Scroll Capture ===');
      
      // First, test a single viewport capture
      console.log('Testing single viewport capture first...');
      const singleViewport = await this.captureCurrentViewport();
      
      if (singleViewport) {
        console.log('✅ Single viewport capture successful');
        await this.exportImage(singleViewport, 'single-viewport-test');
      } else {
        console.error('❌ Single viewport capture failed');
        return { success: false, error: 'Single viewport capture failed' };
      }
      
      console.log('Starting viewport scroll capture test...');
      const result = await this.captureFullFeedByViewportScroll(); // No limit - will scroll until stopped or max height reached
      
      if (result) {
        console.log('✅ Viewport scroll capture test successful');
        console.log(`Result canvas: ${result.width}x${result.height}`);
        
        // Export the result
        await this.exportImage(result, 'viewport-scroll-test-result');
        
        return {
          success: true,
          canvas: result,
          width: result.width,
          height: result.height
        };
      } else {
        console.error('❌ Viewport scroll capture test failed - no result');
        return { success: false, error: 'No result returned' };
      }
      
    } catch (error) {
      console.error('❌ Viewport scroll capture test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Capture the visible tab using the background script
  async captureVisibleTab() {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ name: 'captureVisibleTab' }, (response) => {
          if (response && response.success && response.dataUrl) {
            resolve(response.dataUrl);
          } else {
            reject(response && response.error ? response.error : 'Unknown error capturing visible tab');
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Export a data URL image as a PNG file
  async exportDataUrlImage(dataUrl, filename) {
    try {
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('Image exported successfully:', link.download);
    } catch (error) {
      console.error('Error exporting data URL image:', error);
    }
  }

  // Stitch an array of data URLs vertically into one image
  async stitchDataUrlImagesVertically(dataUrls) {
    // Load all images
    const images = await Promise.all(dataUrls.map(url => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    })));
    const width = Math.max(...images.map(img => img.width));
    const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    let y = 0;
    for (const img of images) {
      ctx.drawImage(img, 0, y, img.width, img.height);
      y += img.height;
    }
    return canvas.toDataURL('image/png');
  }
}

// Export for use in other scripts
window.ViewportCapture = ViewportCapture; 