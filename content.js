// Enhanced content.js - Improved analysis display with better UI and formatting

const createNotification = (title, message, type = 'info', duration = 5000) => {
  // Remove any existing notifications
  const existing = document.getElementById('screen-recorder-notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'screen-recorder-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(8px);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px 12px;
    font-weight: 600;
    font-size: 15px;
    color: #1f2937;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
  `;
  closeButton.onmouseover = () => closeButton.style.backgroundColor = '#f3f4f6';
  closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
  closeButton.onclick = () => notification.remove();
  
  header.appendChild(titleSpan);
  header.appendChild(closeButton);
  
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 0 20px 16px;
    font-size: 14px;
    color: #4b5563;
    line-height: 1.5;
  `;
  content.textContent = message;
  
  notification.appendChild(header);
  notification.appendChild(content);
  
  // Add improved animation keyframes
  if (!document.getElementById('screen-recorder-styles')) {
    const style = document.createElement('style');
    style.id = 'screen-recorder-styles';
    style.textContent = `
      @keyframes slideIn {
        from { 
          transform: translateX(100%) scale(0.9); 
          opacity: 0; 
        }
        to { 
          transform: translateX(0) scale(1); 
          opacity: 1; 
        }
      }
      @keyframes slideOut {
        from { 
          transform: translateX(0) scale(1); 
          opacity: 1; 
        }
        to { 
          transform: translateX(100%) scale(0.9); 
          opacity: 0; 
        }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }
  
  return notification;
};

const displayAnalysisResult = (data) => {
  if (data.hasAnalysis && data.analysis) {
    // Create an enhanced notification for successful analysis
    const notification = createNotification(
      '🎯 AI Analysis Complete',
      `Processed ${data.frameCount} frames with detailed insights ready to view.`,
      'success',
      0 // Don't auto-hide
    );
    
    // Add action buttons container
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      padding: 0 20px 16px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    `;
    
    // View Analysis button
    const viewButton = document.createElement('button');
    viewButton.textContent = '📊 View Analysis';
    viewButton.style.cssText = `
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 120px;
    `;
    
    viewButton.onmouseover = () => {
      viewButton.style.transform = 'translateY(-1px)';
      viewButton.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    };
    viewButton.onmouseout = () => {
      viewButton.style.transform = 'translateY(0)';
      viewButton.style.boxShadow = 'none';
    };
    
    viewButton.onclick = () => {
      showEnhancedAnalysisModal(data.analysis, data.frameCount);
      notification.remove();
    };
    
    // Quick Preview button
    const previewButton = document.createElement('button');
    previewButton.textContent = '👁️ Quick Preview';
    previewButton.style.cssText = `
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 120px;
    `;
    
    previewButton.onmouseover = () => {
      previewButton.style.transform = 'translateY(-1px)';
      previewButton.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
    };
    previewButton.onmouseout = () => {
      previewButton.style.transform = 'translateY(0)';
      previewButton.style.boxShadow = 'none';
    };
    
    previewButton.onclick = () => {
      showQuickPreview(data.analysis);
    };
    
    actionsContainer.appendChild(viewButton);
    actionsContainer.appendChild(previewButton);
    notification.appendChild(actionsContainer);
    
  } else if (data.error) {
    createNotification(
      '❌ Analysis Failed',
      `Processing error: ${data.error}. Check your API key and try again.`,
      'error',
      8000
    );
  } else if (!data.hasAnalysis && data.message) {
    createNotification(
      '⚙️ Setup Required',
      data.message,
      'info',
      8000
    );
  }
};

const showQuickPreview = (analysis) => {
  // Remove existing preview
  const existing = document.getElementById('analysis-preview');
  if (existing) {
    existing.remove();
  }
  
  const preview = document.createElement('div');
  preview.id = 'analysis-preview';
  preview.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 500px;
    max-height: 400px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    z-index: 10002;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const title = document.createElement('h3');
  title.textContent = '🔍 Quick Analysis Preview';
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
  `;
  closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#f3f4f6';
  closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
  closeBtn.onclick = () => preview.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    max-height: 300px;
    overflow-y: auto;
    line-height: 1.6;
    color: #374151;
    font-size: 14px;
  `;
  
  // Show only first 300 characters for quick preview
  const previewText = analysis.length > 300 ? 
    analysis.substring(0, 300) + '...' : 
    analysis;
  content.textContent = previewText;
  
  if (analysis.length > 300) {
    const viewFullBtn = document.createElement('button');
    viewFullBtn.textContent = 'View Full Analysis →';
    viewFullBtn.style.cssText = `
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 12px;
      transition: all 0.2s ease;
    `;
    
    viewFullBtn.onclick = () => {
      preview.remove();
      showEnhancedAnalysisModal(analysis, null);
    };
    
    content.appendChild(viewFullBtn);
  }
  
  preview.appendChild(header);
  preview.appendChild(content);
  
  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.3);
    z-index: 10001;
    animation: fadeIn 0.3s ease;
  `;
  backdrop.onclick = () => preview.remove();
  
  // Add pop-in animation
  if (!document.getElementById('popup-animations')) {
    const style = document.createElement('style');
    style.id = 'popup-animations';
    style.textContent = `
      @keyframes popIn {
        from { 
          transform: translate(-50%, -50%) scale(0.8); 
          opacity: 0; 
        }
        to { 
          transform: translate(-50%, -50%) scale(1); 
          opacity: 1; 
        }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(backdrop);
  document.body.appendChild(preview);
  
  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      preview.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
};

const showEnhancedAnalysisModal = (analysis, frameCount) => {
  // Remove existing modal
  const existing = document.getElementById('analysis-modal');
  if (existing) {
    existing.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'analysis-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 16px;
    max-width: 800px;
    max-height: 90vh;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 25px 75px rgba(0,0,0,0.15);
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 24px 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  const icon = document.createElement('div');
  icon.innerHTML = '🎯';
  icon.style.cssText = `
    font-size: 24px;
    background: rgba(255,255,255,0.2);
    padding: 8px;
    border-radius: 10px;
  `;
  
  const titleInfo = document.createElement('div');
  
  const title = document.createElement('h2');
  title.textContent = 'AI Analysis Results';
  title.style.cssText = `
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  `;
  
  const subtitle = document.createElement('div');
  subtitle.textContent = frameCount ? `${frameCount} frames analyzed` : 'Screen recording analysis';
  subtitle.style.cssText = `
    font-size: 14px;
    opacity: 0.9;
    margin-top: 4px;
  `;
  
  titleInfo.appendChild(title);
  titleInfo.appendChild(subtitle);
  titleContainer.appendChild(icon);
  titleContainer.appendChild(titleInfo);
  
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;
  
  const copyBtn = document.createElement('button');
  copyBtn.innerHTML = '📋';
  copyBtn.title = 'Copy to clipboard';
  copyBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    color: white;
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
  `;
  copyBtn.onmouseover = () => copyBtn.style.background = 'rgba(255,255,255,0.3)';
  copyBtn.onmouseout = () => copyBtn.style.background = 'rgba(255,255,255,0.2)';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(analysis);
    copyBtn.innerHTML = '✓';
    setTimeout(() => copyBtn.innerHTML = '📋', 2000);
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.2s ease;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  closeBtn.onclick = () => modal.remove();
  
  actions.appendChild(copyBtn);
  actions.appendChild(closeBtn);
  header.appendChild(titleContainer);
  header.appendChild(actions);
  
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 28px;
    max-height: calc(90vh - 100px);
    overflow-y: auto;
    line-height: 1.7;
    color: #374151;
    font-size: 15px;
  `;
  
  // Format the analysis text with better structure
  const formattedAnalysis = formatAnalysisText(analysis);
  content.innerHTML = formattedAnalysis;
  
  // Add slide-up animation
  if (!document.getElementById('modal-animations')) {
    const style = document.createElement('style');
    style.id = 'modal-animations';
    style.textContent = `
      @keyframes slideUp {
        from { 
          transform: translateY(30px); 
          opacity: 0; 
        }
        to { 
          transform: translateY(0); 
          opacity: 1; 
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  modalContent.appendChild(header);
  modalContent.appendChild(content);
  modal.appendChild(modalContent);
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  document.body.appendChild(modal);
};

const formatAnalysisText = (text) => {
  // Enhanced text formatting for better readability
  let formatted = text;
  
  // Convert numbered lists to HTML
  formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; font-weight: 600; color: #3b82f6;">•</span>$1</div>');
  
  // Convert bullet points to HTML
  formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; font-weight: 600; color: #10b981;">•</span>$1</div>');
  
  // Make headings bold
  formatted = formatted.replace(/^(.+):$/gm, '<h4 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">$1</h4>');
  
  // Convert double line breaks to paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.7;">');
  
  // Wrap in paragraph tags
  formatted = '<p style="margin: 16px 0; line-height: 1.7;">' + formatted + '</p>';
  
  // Clean up empty paragraphs
  formatted = formatted.replace(/<p[^>]*><\/p>/g, '');
  
  return formatted;
};



// Listen for messages from the recording script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name === 'endedRecording') {
    console.log('Recording ended, received data:', message.body);
    
    // Show enhanced completion notification
    createNotification(
      '✅ Recording Complete',
      `Successfully saved ${message.body.filename}`,
      'success',
      4000
    );
    
    // Show analysis results with enhanced display
    if (message.body) {
      displayAnalysisResult(message.body);
    }
    
    sendResponse({ received: true });
  }
  
  return true; // Keep message channel open
});