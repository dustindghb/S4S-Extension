// Enhanced popup.js for both screen recording and video analysis

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
    console.log('Starting OpenAI analysis with', frames.length, 'frames...');
    
    // Prepare content for OpenAI Vision API
    const content = [
      {
        type: 'text',
        text: analysisPrompt
      }
    ];
    
    // Add each frame as an image
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${frame.data}`
        }
      });
    }
    
    console.log('Sending request to OpenAI API...');
    
    // Send to OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 2000
      })
    });
    
    console.log('OpenAI API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log('OpenAI API response received successfully');
    return data.choices[0].message.content;
    
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
  // Set recording state before starting
  await chrome.storage.local.set({ isRecording: true });
  chrome.runtime.sendMessage({ name: 'startRecording' });
  updateUI('recording');
};

const stopRecording = async () => {
  console.log('Stop recording button clicked');
  
  // Set processing state
  await chrome.storage.local.set({ isRecording: false, isProcessing: true });
  
  chrome.runtime.sendMessage({ name: 'stopRecording' }, (response) => {
    console.log('Stop recording message sent, response:', response);
  });
  
  updateUI('processing');
  
  // Keep popup open briefly to ensure message is sent
  setTimeout(() => {
    window.close();
  }, 500);
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

  fileName.textContent = `Name: ${file.name}`;
  fileSize.textContent = `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  fileInfo.style.display = 'block';
  analyzeButton.disabled = true; // Disable until duration is loaded

  // Get video duration
  const video = document.createElement('video');
  video.preload = 'metadata';
  
  video.onloadedmetadata = () => {
    console.log('File selection - Video duration detected:', video.duration);
    
    // Handle invalid duration (Infinity, NaN, or very large values)
    if (!video.duration || isNaN(video.duration) || !isFinite(video.duration) || video.duration <= 0 || video.duration > 3600) {
      console.log('Invalid duration detected, using fallback estimation');
      
      // Estimate duration based on file size (rough approximation)
      // Assume average bitrate of 2 Mbps for screen recordings
      const estimatedDuration = Math.min((file.size * 8) / (2 * 1024 * 1024), 300); // Max 5 minutes
      
      console.log('Estimated duration from file size:', estimatedDuration, 's');
      
      if (estimatedDuration < 1) {
        alert('Video file appears to be too small or corrupted. Please select a different video file.');
        selectedFile = null;
        fileInfo.style.display = 'none';
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
    const estimatedDuration = Math.min((file.size * 8) / (2 * 1024 * 1024), 300);
    
    if (estimatedDuration < 1) {
      alert('Error loading video file. Please select a different video file.');
      selectedFile = null;
      fileInfo.style.display = 'none';
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
    console.log('Starting frame extraction...');
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded, duration:', video.duration);
      
      // Use the duration from file selection (which may be estimated)
      const duration = videoDuration || video.duration;
      
      // Validate duration
      if (!duration || duration <= 0 || duration > 3600) {
        reject(new Error(`Invalid video duration: ${duration}s. Please check if the video file is valid.`));
        return;
      }
      
      console.log('Using duration for frame extraction:', duration, 's');
      
      const frameInterval = 1.0 / frameRate;
      const frames = [];
      let currentTime = 0;
      let maxFrames = Math.ceil(duration * frameRate);
      
      // Limit maximum frames to prevent excessive processing
      if (maxFrames > 50) {
        console.log(`Limiting frames from ${maxFrames} to 50 for performance`);
        maxFrames = 50;
      }
      
      console.log(`Will extract up to ${maxFrames} frames over ${duration}s duration`);
      
      const extractFrame = () => {
        // Check if we've reached the end or exceeded max frames
        if (currentTime >= duration || frames.length >= maxFrames) {
          console.log('Frame extraction completed, extracted', frames.length, 'frames');
          resolve(frames);
          return;
        }
        
        console.log('Extracting frame at time:', currentTime, 's (frame', frames.length + 1, 'of', maxFrames, ')');
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              frames.push({
                time: currentTime,
                data: base64
              });
              
              console.log('Frame extracted at', currentTime, 's, total frames:', frames.length);
              currentTime += frameInterval;
              
              // Add a small delay to prevent overwhelming the system
              setTimeout(extractFrame, 50);
            };
            reader.onerror = (error) => {
              console.error('Error reading frame blob:', error);
              reject(new Error('Failed to read frame data'));
            };
            reader.readAsDataURL(blob);
          }, 'image/jpeg', 0.8);
        };
        
        video.onerror = (error) => {
          console.error('Error seeking to time:', currentTime, error);
          reject(new Error('Failed to seek video to time: ' + currentTime));
        };
      };
      
      extractFrame();
    };
    
    video.onerror = (error) => {
      console.error('Error loading video:', error);
      reject(new Error('Failed to load video: ' + error.message));
    };
    
    console.log('Setting video source...');
    video.src = URL.createObjectURL(videoFile);
  });
};

const analyzeVideo = async () => {
  if (!selectedFile) {
    alert('Please select a video file first');
    return;
  }

  try {
    // Set processing state
    await chrome.storage.local.set({ isProcessing: true });
    updateUI('processing');

    console.log('Starting video analysis for:', selectedFile.name);
    console.log('File size:', selectedFile.size, 'bytes');
    console.log('File type:', selectedFile.type);
    
    // Get settings from storage
    const settings = await chrome.storage.local.get([
      'frameRate',
      'openaiApiKey',
      'analysisPrompt',
      'enableGrayscale'
    ]);
    
    const frameRate = settings.frameRate || 0.5;
    const apiKey = settings.openaiApiKey;
    const analysisPrompt = settings.analysisPrompt || 'Analyze this sequence of frames from a video recording and provide a detailed description of what is happening.';
    const enableGrayscale = settings.enableGrayscale !== false; // Default true
    
    console.log('Settings loaded - Frame rate:', frameRate, 'API key present:', !!apiKey, 'Grayscale:', enableGrayscale);
    
    if (!apiKey || !apiKey.trim()) {
      throw new Error('OpenAI API key not configured. Please set it in the options page.');
    }
    
    // Add timeout to prevent getting stuck
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Video analysis timed out after 3 minutes. Please try with a shorter video or lower frame rate.'));
      }, 180000); // 3 minutes timeout
    });
    
    // Extract frames from video
    console.log('Starting frame extraction...');
    const frames = await Promise.race([
      extractFramesFromVideo(selectedFile, frameRate),
      timeoutPromise
    ]);
    
    if (frames.length === 0) {
      throw new Error('No frames could be extracted from the video.');
    }
    
    console.log(`Successfully extracted ${frames.length} frames from video`);
    
    // Process frames (convert to grayscale if enabled)
    const processedFrames = await processFramesForAnalysis(frames, enableGrayscale);
    
    // Run analysis
    const analysisResult = await analyzeFramesWithOpenAI(processedFrames, apiKey, analysisPrompt);
    
    console.log('Video analysis completed successfully');
    
    // Store analysis result
    await chrome.storage.local.set({
      lastAnalysis: {
        filename: selectedFile.name,
        frameCount: frames.length,
        duration: videoDuration,
        analysis: { openai: analysisResult },
        timestamp: Date.now(),
        grayscale: enableGrayscale
      },
      isProcessing: false
    });

    updateUI('ready');
    updateSettings(); // Refresh to show new analysis button if available
    
    // Show analysis result in modal
    showAnalysisModal({
      filename: selectedFile.name,
      frameCount: frames.length,
      duration: videoDuration,
      analysis: { openai: analysisResult },
      timestamp: Date.now(),
      grayscale: enableGrayscale
    });

  } catch (error) {
    console.error('Error analyzing video:', error);
    alert('Error analyzing video: ' + error.message);
    await chrome.storage.local.set({ isProcessing: false });
    updateUI('ready');
  }
};

const openOptions = () => {
  chrome.runtime.openOptionsPage();
};

const viewLastAnalysis = async () => {
  try {
    const result = await chrome.storage.local.get(['lastAnalysis']);
    if (result.lastAnalysis) {
      showAnalysisModal(result.lastAnalysis);
    } else {
      alert('No analysis available. Make sure you have recorded something or analyzed a video and have an OpenAI API key configured.');
    }
  } catch (error) {
    console.error('Error loading last analysis:', error);
    alert('Error loading analysis.');
  }
};

const showAnalysisModal = (analysisData) => {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 8px;
    max-width: 1200px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 18px;
    cursor: pointer;
    z-index: 10001;
  `;
  
  closeButton.onclick = () => {
    document.body.removeChild(modalOverlay);
  };
  
  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid #dee2e6;
  `;
  
  const grayscaleInfo = analysisData.grayscale ? ' (Grayscale)' : '';
  
  modalHeader.innerHTML = `
    <h2 style="margin: 0 0 10px 0; color: #333;">AI Analysis Report</h2>
    <p style="margin: 5px 0;"><strong>File:</strong> ${analysisData.filename || 'Unknown'}</p>
    <p style="margin: 5px 0;"><strong>Frames:</strong> ${analysisData.frameCount || 0}${grayscaleInfo}</p>
    <p style="margin: 5px 0;"><strong>Duration:</strong> ${Math.round(analysisData.duration || 0)}s</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(analysisData.timestamp || Date.now()).toLocaleString()}</p>
  `;
  
  // Create modal body with side-by-side analysis
  const modalBody = document.createElement('div');
  modalBody.style.cssText = `
    padding: 20px;
    line-height: 1.6;
  `;
  
  modalBody.innerHTML = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
      <h3 style="margin: 0 0 15px 0; color: #333;">OpenAI GPT-4 Vision Analysis</h3>
      <div style="white-space: pre-wrap; line-height: 1.6; font-size: 14px; max-height: 600px; overflow-y: auto;">
        ${analysisData.analysis.openai}
      </div>
    </div>
  `;
  
  // Assemble modal
  modalContent.appendChild(closeButton);
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalOverlay.appendChild(modalContent);
  
  // Add to page
  document.body.appendChild(modalOverlay);
  
  // Close on overlay click
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  };
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modalOverlay);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
};

const updateUI = (state) => {
  const startButton = document.getElementById('startRecordingButton');
  const stopButton = document.getElementById('stopRecordingButton');
  const analyzeButton = document.getElementById('analyzeButton');
  const status = document.getElementById('status');
  const analysisButton = document.getElementById('analysisButton');

  switch(state) {
    case 'recording':
      startButton.disabled = true;
      stopButton.disabled = false;
      analyzeButton.disabled = true;
      status.innerHTML = '<span class="status-indicator recording"></span>Recording in progress...';
      status.className = 'recording';
      if (analysisButton) analysisButton.style.display = 'none';
      break;
    case 'processing':
      startButton.disabled = true;
      stopButton.disabled = true;
      analyzeButton.disabled = true;
      status.innerHTML = '<span class="status-indicator processing"></span>Processing and analyzing...';
      status.className = 'processing';
      if (analysisButton) analysisButton.style.display = 'none';
      break;
    case 'ready':
    default:
      startButton.disabled = false;
      stopButton.disabled = true;
      analyzeButton.disabled = !selectedFile;
      status.innerHTML = '<span class="status-indicator ready"></span>Ready to record or analyze';
      status.className = '';
      if (analysisButton) analysisButton.style.display = 'block';
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
    const frameRate = result.frameRate || 0.5;
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
    const hasApiKey = result.openaiApiKey && result.openaiApiKey.trim().length > 0;
    
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
    
    // Show/hide analysis button based on whether we have a last analysis
    const analysisButton = document.getElementById('analysisButton');
    if (result.lastAnalysis && result.lastAnalysis.analysis) {
      analysisButton.style.display = 'block';
      analysisButton.textContent = `View Last Analysis (${result.lastAnalysis.frameCount || 0} frames)`;
    } else {
      analysisButton.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Listen for messages from background script about recording status
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.name === 'recordingStarted') {
    await chrome.storage.local.set({ isRecording: true, isProcessing: false });
    updateUI('recording');
  } else if (message.name === 'recordingStopped') {
    await chrome.storage.local.set({ isRecording: false, isProcessing: false });
    updateUI('ready');
    updateSettings(); // Refresh to show new analysis button if available
  } else if (message.name === 'recordingProcessing') {
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