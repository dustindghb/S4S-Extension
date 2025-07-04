

// Global variables for the popup
let selectedFile = null;
let videoDuration = 0;

// Utility function to convert image to grayscale
const convertToGrayscale = (imageData) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;     // red
        data[i + 1] = gray; // green
        data[i + 2] = gray; // blue
        // alpha stays the same
      }
      
      // Put the grayscale data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to base64
      const grayscaleBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      resolve(grayscaleBase64);
    };
    
    img.src = `data:image/jpeg;base64,${imageData}`;
  });
};

// Function to analyze frames with OpenAI Vision API
const analyzeFramesWithOpenAI = async (frames, apiKey, analysisPrompt) => {
  try {
    console.log('Starting individual frame analysis with OpenAI for', frames.length, 'frames...');
    
    // Get API key from environment if not provided
    let openaiApiKey = apiKey;
    if (!openaiApiKey && window.envLoader && window.envLoader.isLoaded()) {
      openaiApiKey = window.envLoader.getOpenAIKey();
    }
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found. Please add your API key to config.env file or in the extension settings.');
    }
    
    // Prepare the prompt for individual frame analysis
    const prompt = analysisPrompt || 'Extract the following information from this LinkedIn post:\n\n1. **Person\'s Name**: The full name of the person who wrote the post\n2. **Company**: The company or organization they work for\n3. **Post Content**: What is written in the post\n\nIf any information is not visible, write "Not visible". Keep the response concise and focused.';
    
    const frameAnalyses = [];
    
    // Analyze each frame individually
    for (let i = 0; i < frames.length; i++) {
      console.log(`Analyzing frame ${i + 1}/${frames.length}...`);
      
      const content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${frames[i].data}`
          }
        }
      ];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`OpenAI API error for frame ${i + 1}:`, errorData);
        frameAnalyses.push(`**Frame ${i + 1} Analysis Error**: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      frameAnalyses.push(`## Frame ${i + 1} Analysis\n\n${analysis}\n\n---\n`);
      
      // Add a small delay between requests to avoid rate limiting
      if (i < frames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('All frame analyses completed successfully');
    return frameAnalyses.join('\n');
    
  } catch (error) {
    console.error('Error analyzing frames with OpenAI:', error);
    throw error;
  }
};

// Enhanced frame processing with grayscale option
const processFramesForAnalysis = async (frames, enableGrayscale) => {
  if (!enableGrayscale) {
    return frames;
  }
  
  console.log('Converting frames to grayscale for efficiency...');
  const processedFrames = [];
  
  for (let i = 0; i < frames.length; i++) {
    const grayscaleData = await convertToGrayscale(frames[i].data);
    processedFrames.push({
      ...frames[i],
      data: grayscaleData
    });
  }
  
  console.log(`Converted ${frames.length} frames to grayscale`);
  return processedFrames;
};

// Screen Recording Functions
const startRecording = async () => {
  console.log('=== startRecording called ===');
  try {
    // Set recording state before starting
    console.log('Setting recording state to true');
    await chrome.storage.local.set({ isRecording: true });
    console.log('Sending startRecording message to background');
    chrome.runtime.sendMessage({ name: 'startRecording' });
    updateUI('recording');
  } catch (error) {
    console.error('Error in startRecording:', error);
  }
};

const stopRecording = async () => {
  console.log('=== stopRecording called ===');
  
  try {
    // Set processing state
    console.log('Setting processing state to true');
    await chrome.storage.local.set({ isRecording: false, isProcessing: true });
    
    console.log('Sending stopRecording message to background');
    chrome.runtime.sendMessage({ name: 'stopRecording' }, (response) => {
      console.log('Stop recording message sent, response:', response);
    });
    
    updateUI('processing');
    
    // Keep popup open briefly to ensure message is sent
    setTimeout(() => {
      console.log('Closing popup after stop recording');
      window.close();
    }, 500);
  } catch (error) {
    console.error('Error in stopRecording:', error);
  }
};

// Video Upload Functions
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Check if it's a video file
  const videoTypes = ['video/webm', 'video/mp4', 'video/avi', 'video/quicktime'];
  if (!videoTypes.includes(file.type) && !file.name.match(/\.(webm|mp4|avi|mov)$/i)) {
    alert('Please select a valid video file (WebM, MP4, AVI, or MOV)');
    return;
  }

  selectedFile = file;
  
  // Display file info
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const fileDuration = document.getElementById('fileDuration');
  const analyzeButton = document.getElementById('analyzeButton');
  const analysisButton = document.getElementById('analysisButton');

  fileName.textContent = `Name: ${file.name}`;
  fileSize.textContent = `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  fileInfo.style.display = 'block';
  
  // Show analyze button and hide view last analysis button for new file
  analyzeButton.style.display = 'block';
  analyzeButton.disabled = true; // Disable until duration is loaded
  analysisButton.style.display = 'none'; // Hide view last analysis button

  // Get video duration
  const video = document.createElement('video');
  video.preload = 'metadata';
  
  video.onloadedmetadata = () => {
    console.log('File selection - Video duration detected:', video.duration);
    
    // Handle invalid duration (Infinity, NaN, or very large values)
    if (!video.duration || isNaN(video.duration) || !isFinite(video.duration) || video.duration <= 0 || video.duration > 3600) {
      console.log('Invalid duration detected, using fallback estimation');
      
      // Estimate duration based on file size (rough approximation)
      // For WebM screen recordings, use more conservative bitrate estimate
      const estimatedDuration = Math.min((file.size * 8) / (1.5 * 1024 * 1024), 120); // Max 2 minutes, 1.5 Mbps
      
      console.log('Estimated duration from file size:', estimatedDuration, 's');
      
      if (estimatedDuration < 1) {
        alert('Video file appears to be too small or corrupted. Please select a different video file.');
        selectedFile = null;
        fileInfo.style.display = 'none';
        analyzeButton.style.display = 'none';
        analyzeButton.disabled = true;
        return;
      }
      
      videoDuration = estimatedDuration;
      fileDuration.textContent = `Duration: ~${Math.round(estimatedDuration)}s (estimated)`;
      analyzeButton.disabled = false;
      
      console.log('Video file validated with estimated duration');
    } else {
      videoDuration = video.duration;
      fileDuration.textContent = `Duration: ${Math.round(video.duration)}s`;
      analyzeButton.disabled = false;
      
      console.log('Video file validated successfully');
    }
  };
  
  video.onerror = (error) => {
    console.error('Error loading video metadata:', error);
    
    // Try fallback estimation even if metadata fails
    console.log('Metadata loading failed, using fallback estimation');
    const estimatedDuration = Math.min((file.size * 8) / (1.5 * 1024 * 1024), 120);
    
    if (estimatedDuration < 1) {
      alert('Error loading video file. Please select a different video file.');
      selectedFile = null;
      fileInfo.style.display = 'none';
      analyzeButton.style.display = 'none';
      analyzeButton.disabled = true;
      return;
    }
    
    videoDuration = estimatedDuration;
    fileDuration.textContent = `Duration: ~${Math.round(estimatedDuration)}s (estimated)`;
    analyzeButton.disabled = false;
    
    console.log('Video file validated with fallback duration');
  };
  
  video.src = URL.createObjectURL(file);
};

// Function to extract frames from video using Canvas API
const extractFramesFromVideo = async (videoFile, frameRate) => {
  return new Promise((resolve, reject) => {
    console.log('=== Starting frame extraction ===');
    console.log('Frame rate:', frameRate);
    console.log('File size:', videoFile.size, 'bytes');
    
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames = [];
    
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    
    let loadedMetadata = false;
    let extractionTimeout = null;
    
    const cleanup = () => {
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
      if (extractionTimeout) {
        clearTimeout(extractionTimeout);
      }
      video.remove();
      canvas.remove();
    };
    
    const onError = (error) => {
      console.error('Frame extraction error:', error);
      cleanup();
      reject(error);
    };
    
    video.addEventListener('error', (e) => {
      console.error('Video error event:', e);
      onError(new Error('Video failed to load'));
    });
    
    video.addEventListener('loadedmetadata', async () => {
      console.log('Video metadata loaded');
      console.log('Video duration:', video.duration);
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      loadedMetadata = true;
      
      try {
        // Validate video properties
        if (!video.videoWidth || !video.videoHeight) {
          throw new Error('Invalid video dimensions');
        }
        
        // Handle infinite duration (common with WebM files)
        let duration = video.duration;
        if (!duration || !isFinite(duration) || duration <= 0) {
          console.log('Invalid duration detected, using fallback duration');
          // Estimate duration based on file size (rough approximation)
          // For WebM screen recordings, use a more conservative estimate
          const estimatedDuration = Math.max(5, Math.min(120, videoFile.size / 200000)); // 5-120 seconds, more conservative
          duration = estimatedDuration;
          console.log('Using estimated duration:', duration, 'seconds');
        } else {
          console.log('Using actual video duration:', duration, 'seconds');
        }
        
        // Additional validation to prevent excessive frame extraction
        if (duration > 300) {
          console.warn('Duration seems too long, capping at 300 seconds');
          duration = 300;
        }
        
        // Set canvas dimensions
        canvas.width = Math.min(video.videoWidth, 1920);
        canvas.height = Math.min(video.videoHeight, 1080);
        
        console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);
        
        const interval = 1 / frameRate;
        const totalFrames = Math.max(1, Math.floor(duration * frameRate));
        
        console.log(`Extracting ${totalFrames} frames at ${frameRate} fps from ${duration}s video`);
        console.log(`Frame interval: ${interval}s, total frames: ${totalFrames}`);
        
        // Validate that we're not trying to extract too many frames
        if (totalFrames > 100) {
          console.warn(`Too many frames requested (${totalFrames}), limiting to 100 frames`);
          const adjustedInterval = duration / 100;
          console.log(`Adjusted interval: ${adjustedInterval.toFixed(2)}s`);
        }
        
        // Wait for video to be ready
        if (video.readyState < 2) {
          await new Promise(resolve => {
            video.addEventListener('canplay', resolve, { once: true });
          });
        }
        
        // Extract frames sequentially with better seeking
        for (let i = 0; i < totalFrames; i++) {
          const currentTime = i * interval;
          
          // Safety check to prevent going beyond video duration
          if (currentTime >= duration) {
            console.log(`Reached video duration limit (${duration}s), stopping frame extraction at frame ${i}`);
            break;
          }
          
          // Additional safety check for very long times
          if (currentTime > 600) { // 10 minutes max
            console.warn(`Frame time too long (${currentTime}s), stopping extraction`);
            break;
          }
          
          try {
            await new Promise((resolveFrame, rejectFrame) => {
              let seeked = false;
              let attempts = 0;
              const maxAttempts = 3;
              
              const frameTimeout = setTimeout(() => {
                if (!seeked) {
                  video.removeEventListener('seeked', onSeeked);
                  rejectFrame(new Error(`Frame extraction timeout at ${currentTime}s after ${maxAttempts} attempts`));
                }
              }, 8000); // Increased timeout
              
              const onSeeked = () => {
                const actualTime = video.currentTime;
                console.log(`Seeked to ${currentTime}s, actual time: ${actualTime.toFixed(2)}s`);
                
                // Check if we're close enough to the target time
                if (Math.abs(actualTime - currentTime) > 0.5) {
                  attempts++;
                  if (attempts < maxAttempts) {
                    console.log(`Seek not accurate enough, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
                    video.currentTime = currentTime;
                    return;
                  } else {
                    console.warn(`Could not seek accurately to ${currentTime}s, using current time ${actualTime.toFixed(2)}s`);
                  }
                }
                
                seeked = true;
                clearTimeout(frameTimeout);
                
                try {
                  // Draw the current frame to canvas
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  // Convert to base64 (reduced quality for better performance)
                  const frameData = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  
                  // Check for duplicate frames
                  const isDuplicate = frames.some(frame => Math.abs(frame.timestamp - actualTime) < 0.1);
                  if (isDuplicate) {
                    console.warn(`Duplicate frame detected at ${actualTime.toFixed(2)}s, skipping`);
                    resolveFrame();
                    return;
                  }
                  
                  frames.push({
                    timestamp: actualTime,
                    data: frameData
                  });
                  
                  console.log(`Extracted frame ${i + 1}/${totalFrames} at ${actualTime.toFixed(2)}s`);
                  resolveFrame();
                } catch (drawError) {
                  console.error('Error drawing frame:', drawError);
                  rejectFrame(drawError);
                }
              };
              
              video.addEventListener('seeked', onSeeked, { once: true });
              
              // Set the time and log it
              console.log(`Seeking to ${currentTime.toFixed(2)}s for frame ${i + 1}`);
              video.currentTime = currentTime;
            });
            
            // Longer delay between frames to ensure proper seeking
            await new Promise(resolve => setTimeout(resolve, 150));
            
          } catch (frameError) {
            console.error(`Failed to extract frame at ${currentTime}s:`, frameError.message);
            console.error('Stopping frame extraction due to failure');
            // Stop extraction completely after first failure
            break;
          }
        }
        
        console.log(`Frame extraction completed: ${frames.length} frames extracted`);
        
        if (frames.length === 0) {
          throw new Error('No frames were successfully extracted');
        } else if (frames.length < totalFrames) {
          console.warn(`Only extracted ${frames.length}/${totalFrames} frames due to extraction failures`);
        }
        
        cleanup();
        resolve(frames);
        
      } catch (extractionError) {
        console.error('Frame extraction failed:', extractionError);
        onError(extractionError);
      }
    });
    
    // Set video source and load
    video.src = URL.createObjectURL(videoFile);
    video.load();
    
    // Timeout for metadata loading
    extractionTimeout = setTimeout(() => {
      if (!loadedMetadata) {
        onError(new Error('Video metadata loading timeout'));
      }
    }, 10000);
  });
};

// Function to analyze video
const analyzeVideo = async () => {
  if (!selectedFile) {
    alert('Please select a video file first');
    return;
  }
  
  try {
    console.log('Starting video analysis for:', selectedFile.name);
    console.log('File size:', selectedFile.size, 'bytes');
    console.log('File type:', selectedFile.type);
    
    // Get settings
    const result = await chrome.storage.local.get(['frameRate', 'openaiApiKey', 'analysisPrompt', 'enableGrayscale']);
    const frameRate = result.frameRate || 1.0;
    let apiKey = result.openaiApiKey;
    const analysisPrompt = result.analysisPrompt;
    const enableGrayscale = result.enableGrayscale !== false;
    
    // Try to get API key from environment if not in storage
    if (!apiKey && window.envLoader && window.envLoader.isLoaded()) {
      apiKey = window.envLoader.getOpenAIKey();
    }
    
    if (!apiKey) {
      alert('Please add your OpenAI API key to the config.env file or set it in the extension options');
      return;
    }
    
    // Update UI
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Analyzing...';
    
    // Extract frames
    console.log('Extracting frames...');
    const frames = await extractFramesFromVideo(selectedFile, frameRate);
    console.log(`Extracted ${frames.length} frames`);
    
    // Process frames (convert to grayscale if enabled)
    const processedFrames = await processFramesForAnalysis(frames, enableGrayscale);
    
    // Analyze frames
    console.log('Analyzing frames with OpenAI...');
    const analysis = await analyzeFramesWithOpenAI(processedFrames, apiKey, analysisPrompt);
    
    // Store analysis results
    const analysisData = {
      timestamp: new Date().toISOString(),
      filename: selectedFile.name,
      frameCount: frames.length,
      analysis: analysis
    };
    
    await chrome.storage.local.set({ lastAnalysis: analysisData });
    
    // Show results
    showAnalysisModal(analysisData);
    
  } catch (error) {
    console.error('Error analyzing video:', error);
    alert(`Error analyzing video: ${error.message}`);
  } finally {
    // Reset UI
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.disabled = false;
    analyzeButton.textContent = 'Analyze Video with AI';
  }
};

// Function to open options page
const openOptions = () => {
  chrome.runtime.openOptionsPage();
};

// Function to view last analysis
const viewLastAnalysis = async () => {
  const result = await chrome.storage.local.get(['lastAnalysis']);
  if (result.lastAnalysis) {
    showAnalysisModal(result.lastAnalysis);
  } else {
    alert('No previous analysis found');
  }
};

// Function to show analysis modal
const showAnalysisModal = (analysisData) => {
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 80%;
    max-height: 80%;
    overflow-y: auto;
    position: relative;
  `;
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  `;
  
  const title = document.createElement('h2');
  title.textContent = `Analysis Results - ${analysisData.filename}`;
  title.style.marginBottom = '15px';
  
  const content = document.createElement('div');
  content.innerHTML = analysisData.analysis.replace(/\n/g, '<br>');
  content.style.cssText = `
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.4;
  `;
  
  modalContent.appendChild(closeButton);
  modalContent.appendChild(title);
  modalContent.appendChild(content);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close modal handlers
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeButton.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  const escapeHandler = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escapeHandler);
  
  // Clean up event listener when modal closes
  modal.addEventListener('remove', () => {
    document.removeEventListener('keydown', escapeHandler);
  });
};

// UI update function
const updateUI = (state) => {
  const status = document.getElementById('status');
  const startButton = document.getElementById('startRecordingButton');
  const stopButton = document.getElementById('stopRecordingButton');
  const analyzeButton = document.getElementById('analyzeButton');
  
  switch (state) {
    case 'recording':
      status.innerHTML = '<span class="status-indicator recording"></span>Recording...';
      status.className = 'status recording';
      startButton.disabled = true;
      stopButton.disabled = false;
      if (analyzeButton) analyzeButton.style.display = 'none';
      break;
      
    case 'processing':
      status.innerHTML = '<span class="status-indicator processing"></span>Processing recording...';
      status.className = 'status processing';
      startButton.disabled = true;
      stopButton.disabled = true;
      if (analyzeButton) analyzeButton.style.display = 'none';
      break;
      
    case 'ready':
    default:
      status.innerHTML = '<span class="status-indicator ready"></span>Ready to record or analyze';
      status.className = '';
      if (analyzeButton) analyzeButton.style.display = 'block';
      break;
  }
};

const checkRecordingState = async () => {
  try {
    const result = await chrome.storage.local.get(['isRecording', 'isProcessing']);
    
    if (result.isProcessing) {
      updateUI('processing');
    } else if (result.isRecording) {
      updateUI('recording');
    } else {
      updateUI('ready');
    }
  } catch (error) {
    console.error('Error checking recording state:', error);
    updateUI('ready');
  }
};

const updateSettings = async () => {
  try {
    const result = await chrome.storage.local.get([
      'frameRate',
      'autoAnalyze',
      'openaiApiKey',
      'lastAnalysis'
    ]);
    
    // Update frame rate display
    const frameRate = result.frameRate || 1.0;
    const frameRateDisplay = document.getElementById('frameRateDisplay');
    if (frameRate >= 1) {
      frameRateDisplay.textContent = `${frameRate} per second`;
    } else {
      const interval = Math.round(1 / frameRate);
      frameRateDisplay.textContent = `1 per ${interval}s`;
    }
    
    // Update auto-analyze display
    const autoAnalyze = result.autoAnalyze !== false; // Default true
    const autoAnalyzeDisplay = document.getElementById('autoAnalyzeDisplay');
    autoAnalyzeDisplay.textContent = autoAnalyze ? 'Enabled' : 'Disabled';
    
    // Update feature status
    const featureStatus = document.getElementById('featureStatus');
    let hasApiKey = false;
    
    // Check environment variable for API key
    if (window.envLoader && window.envLoader.isLoaded()) {
      const envApiKey = window.envLoader.getOpenAIKey();
      hasApiKey = envApiKey && envApiKey.trim().length > 0;
    }
    
    if (hasApiKey && autoAnalyze) {
      featureStatus.textContent = '✓ AI Analysis Ready';
      featureStatus.className = 'feature-status enabled';
    } else if (hasApiKey && !autoAnalyze) {
      featureStatus.textContent = '○ AI Analysis Disabled';
      featureStatus.className = 'feature-status disabled';
    } else {
      featureStatus.textContent = '⚠ API Key Required';
      featureStatus.className = 'feature-status disabled';
    }
    
    // Show/hide analysis button based on whether we have a last analysis AND no new file is selected
    const analysisButton = document.getElementById('analysisButton');
    const analyzeButton = document.getElementById('analyzeButton');
    
    // Only show "View Last Analysis" if there's a last analysis AND no new file is selected
    if (result.lastAnalysis && result.lastAnalysis.analysis && !selectedFile) {
      analysisButton.style.display = 'block';
      analyzeButton.style.display = 'none';
      analysisButton.textContent = `View Last Analysis (${result.lastAnalysis.frameCount || 0} frames)`;
    } else if (selectedFile) {
      // If a new file is selected, show analyze button and hide view last analysis
      analysisButton.style.display = 'none';
      analyzeButton.style.display = 'block';
    } else {
      // No file selected and no last analysis
      analysisButton.style.display = 'none';
      analyzeButton.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Listen for messages from background script about recording status
chrome.runtime.onMessage.addListener(async (message) => {
  console.log('Popup received message:', message.name);
  
  if (message.name === 'recordingStarted') {
    console.log('Setting recording state to started');
    await chrome.storage.local.set({ isRecording: true, isProcessing: false });
    updateUI('recording');
  } else if (message.name === 'recordingStopped') {
    console.log('Setting recording state to stopped');
    await chrome.storage.local.set({ isRecording: false, isProcessing: false });
    updateUI('ready');
    updateSettings(); // Refresh to show new analysis button if available
  } else if (message.name === 'recordingProcessing') {
    console.log('Setting recording state to processing');
    await chrome.storage.local.set({ isRecording: false, isProcessing: true });
    updateUI('processing');
  }
});

// Listen for storage changes to update settings display
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    updateSettings();
    checkRecordingState();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  document.getElementById('startRecordingButton').addEventListener('click', startRecording);
  document.getElementById('stopRecordingButton').addEventListener('click', stopRecording);
  document.getElementById('videoFile').addEventListener('change', handleFileSelect);
  document.getElementById('analyzeButton').addEventListener('click', analyzeVideo);
  document.getElementById('optionsButton').addEventListener('click', openOptions);
  document.getElementById('analysisButton').addEventListener('click', viewLastAnalysis);
  
  // Initialize UI
  checkRecordingState();
  updateSettings();
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const startButton = document.getElementById('startRecordingButton');
      const stopButton = document.getElementById('stopRecordingButton');
      const analyzeButton = document.getElementById('analyzeButton');
      
      if (!startButton.disabled) {
        e.preventDefault();
        startRecording();
      } else if (!stopButton.disabled) {
        e.preventDefault();
        stopRecording();
      } else if (!analyzeButton.disabled) {
        e.preventDefault();
        analyzeVideo();
      }
    } else if (e.key === 'Escape') {
      window.close();
    }
  });
}); 