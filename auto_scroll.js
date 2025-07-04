// Simple auto-scroll at 0.1 pixels per millisecond

class AutoScroll {
  constructor() {
    this.isScrolling = false;
    this.scrollSpeed = 0.1; // pixels per millisecond
    this.animationId = null;
    this.startTime = null;
    this.startPosition = 0;
    this.lastFrameTime = null;
  }

  // Initialize keyboard shortcuts
  init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (this.isScrolling) {
          this.stop();
        } else {
          this.start();
        }
      }
    });
    console.log('Auto-scroll initialized - Ctrl+Shift+S to start/stop');
  }

  // Start scrolling
  start() {
    if (this.isScrolling) return;
    
    this.isScrolling = true;
    this.startTime = performance.now();
    this.startPosition = window.pageYOffset || document.documentElement.scrollTop;
    this.lastFrameTime = null;
    
    this.scroll();
    console.log('Auto-scroll started at 0.1 pixels/ms');
  }

  // Main scroll function
  scroll() {
    if (!this.isScrolling) return;

    const currentTime = performance.now();
    
    // Calculate incremental movement since last frame
    if (this.lastFrameTime) {
      const deltaTime = currentTime - this.lastFrameTime;
      const deltaDistance = this.scrollSpeed * deltaTime;
      
      // Get current position and add incremental movement
      const currentPosition = window.pageYOffset || document.documentElement.scrollTop;
      const newPosition = currentPosition + deltaDistance;

      // Check if we've reached the bottom
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (newPosition >= maxScroll) {
        // Instead of stopping, reset to top and continue
        window.scrollTo(0, 0);
      } else {
        // Scroll to new position with instant behavior
        window.scrollTo({
          top: newPosition,
          behavior: 'instant'
        });
      }
    }
    
    this.lastFrameTime = currentTime;

    // Continue scrolling
    this.animationId = requestAnimationFrame(() => this.scroll());
  }

  // Stop scrolling
  stop() {
    if (!this.isScrolling) return;
    
    this.isScrolling = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    const duration = (performance.now() - this.startTime) / 1000;
    const distance = this.scrollSpeed * (performance.now() - this.startTime);
    console.log(`Auto-scroll stopped - ${distance.toFixed(1)}px in ${duration.toFixed(1)}s`);
  }



  // Get current status
  getStatus() {
    return {
      isScrolling: this.isScrolling,
      speed: this.scrollSpeed
    };
  }
}

// Initialize auto-scroll
const autoScroll = new AutoScroll();
autoScroll.init();

// Export for use in other scripts
window.autoScroll = autoScroll;
