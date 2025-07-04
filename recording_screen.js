const fetchBlob = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64 = await convertBlobToBase64(blob);
  return base64;
};

const convertBlobToBase64 = (blob) => new Promise(resolve => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => resolve(reader.result);
});

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Improved extractFrames: waits for video to be seekable, handles short/corrupt videos, logs more info
const extractFrames = async (videoBlob, frameRate = 1) => {
  return new Promise((resolve, reject) => {
    console.log('=== extractFrames started ===');
    console.log('Video blob size:', videoBlob.size, 'bytes');
    console.log('Frame rate:', frameRate);
    
    if (!videoBlob || videoBlob.size === 0) {
      console.error('extractFrames: Video blob is empty!');
      reject(new Error('Video blob is empty'));
      return;
    }

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames = [];

    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let loadedMeta = false;
    let extractionTimedOut = false;
    let extractionTimeout = null;

    const cleanup = () => {
      if (video.src) URL.revokeObjectURL(video.src);
      if (extractionTimeout) clearTimeout(extractionTimeout);
      video.remove();
      canvas.remove();
    };

    const onError = (error) => {
      if (extractionTimedOut) return; // Prevent double reject
      console.error('Frame extraction error:', error);
      cleanup();
      reject(error);
    };

    video.addEventListener('error', (e) => {
      console.error('Video error event:', e);
      onError(new Error('Video failed to load'));
    });

    video.addEventListener('loadedmetadata', async () => {
      console.log('Video loadedmetadata event fired');
      console.log('Video duration:', video.duration);
      console.log('Video width:', video.videoWidth, 'height:', video.videoHeight);
      
      loadedMeta = true;
      
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
          const estimatedDuration = Math.max(10, Math.min(300, videoBlob.size / 100000)); // 10-300 seconds
          duration = estimatedDuration;
          console.log('Using estimated duration:', duration, 'seconds');
        }

        canvas.width = Math.min(video.videoWidth, 1920);
        canvas.height = Math.min(video.videoHeight, 1080);

        const interval = 1 / frameRate;
        const totalFrames = Math.max(1, Math.floor(duration * frameRate));

        console.log(`Video metadata loaded: ${duration}s, ${video.videoWidth}x${video.videoHeight}`);
        console.log(`Extracting ${totalFrames} frames at ${frameRate} fps`);

        // Wait for video to be seekable
        if (video.readyState < 2) {
          await new Promise(res => video.addEventListener('canplay', res, { once: true }));
        }

        for (let i = 0; i < totalFrames; i++) {
          const currentTime = i * interval;
          if (currentTime >= duration) break;

          try {
            await new Promise((resolveFrame, rejectFrame) => {
              let seeked = false;
              const timeout = setTimeout(() => {
                if (!seeked) {
                  video.removeEventListener('seeked', onSeeked);
                  rejectFrame(new Error(`Seek timeout at ${currentTime}s`));
                }
              }, 5000);

              const onSeeked = () => {
                seeked = true;
                clearTimeout(timeout);
                try {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const frameData = canvas.toDataURL('image/jpeg', 0.6);
                  frames.push({ timestamp: currentTime, data: frameData });
                  console.log(`Extracted frame ${i + 1}/${totalFrames} at ${currentTime.toFixed(2)}s`);
                  resolveFrame();
                } catch (drawError) {
                  console.error('Error drawing frame:', drawError);
                  rejectFrame(drawError);
                }
              };

              video.addEventListener('seeked', onSeeked, { once: true });
              video.currentTime = currentTime;
            });

            await new Promise(r => setTimeout(r, 50));
          } catch (frameError) {
            console.warn(`Frame extraction failed at ${currentTime}s:`, frameError.message);
            // Continue with next frame instead of failing completely
          }
        }

        if (frames.length === 0) {
          throw new Error('No frames were successfully extracted.');
        }

        console.log(`Frame extraction complete: ${frames.length} frames`);
        cleanup();
        resolve(frames);

      } catch (extractionError) {
        console.error('Frame extraction failed:', extractionError);
        onError(extractionError);
      }
    });

    video.src = URL.createObjectURL(videoBlob);
    video.load();

    // Timeout: If loadedmetadata never fires
    extractionTimeout = setTimeout(() => {
      if (!loadedMeta) {
        extractionTimedOut = true;
        onError(new Error('Video metadata loading timeout'));
      }
    }, 15000);
  });
};

// Enhanced analyze frames function with dual model support
const analyzeFrames = async (frames, apiKey, prompt = "You are an expert LinkedIn content analyst and data extractor. Your task is to analyze EACH FRAME individually and extract comprehensive information about LinkedIn posts visible in that specific frame.") => {
  try {
    console.log(`Starting analysis of ${frames.length} frames`);
    
    // Get all settings
    const settings = await chrome.storage.local.get([
      'analysisPrompt',
      'enableOllama',
      'ollamaUrl',
      'ollamaModel',
      'ollamaPrompt',
      'enableGrayscale'
    ]);
    
    const analysisPrompt = settings.analysisPrompt || prompt;
    const enableOllama = settings.enableOllama || false;
    const ollamaUrl = settings.ollamaUrl || 'http://localhost:11435';
    const ollamaModel = settings.ollamaModel || 'llava:latest,llama3.2-vision:latest';
    const ollamaPrompt = settings.ollamaPrompt || 'Analyze this sequence of frames from a video recording and provide a detailed description of what is happening.';
    const enableGrayscale = settings.enableGrayscale !== false; // Default true
    
    // Limit frames for API efficiency (max 20 frames)
    const maxFrames = 20;
    const frameStep = Math.max(1, Math.floor(frames.length / maxFrames));
    const framesToAnalyze = frames.filter((_, index) => index % frameStep === 0).slice(0, maxFrames);
    
    console.log(`Analyzing ${framesToAnalyze.length} frames (reduced from ${frames.length})`);
    console.log('Analysis prompt being used:', analysisPrompt.substring(0, 200) + '...');
    
    // Process frames (convert to grayscale if enabled)
    const processedFrames = await processFramesForAnalysis(framesToAnalyze, enableGrayscale);
    
    // Run analyses in parallel
    const analysisPromises = [];
    const analysisResults = {};
    
    // Define models array for use in storage
    const models = enableOllama ? ollamaModel.split(',').map(m => m.trim()).filter(m => m) : [];
    
    // OpenAI analysis - individual frame analysis
    analysisPromises.push(
      (async () => {
        const frameAnalyses = [];
        
        // Analyze each frame individually
        for (let i = 0; i < processedFrames.length; i++) {
          console.log(`Analyzing frame ${i + 1}/${processedFrames.length} with OpenAI...`);
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `${analysisPrompt}\n\nExtract the following information from this LinkedIn post:\n\n1. **Person's Name**: The full name of the person who wrote the post\n2. **Company**: The company or organization they work for\n3. **Post Content**: What is written in the post\n\nIf any information is not visible, write "Not visible". Keep the response concise and focused.`
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/jpeg;base64,${processedFrames[i].data}`,
                        detail: "high"
                      }
                    }
                  ]
                }
              ],
              max_tokens: 1500,
              temperature: 0.3
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenAI API error for frame ${i + 1}:`, errorText);
            frameAnalyses.push(`**Frame ${i + 1} Analysis Error**: ${response.status} - ${errorText}`);
            continue;
          }

          const result = await response.json();
          const analysis = result.choices[0].message.content;
          
          frameAnalyses.push(`## Frame ${i + 1} Analysis (${processedFrames[i].timestamp.toFixed(1)}s)\n\n${analysis}\n\n---\n`);
          
          // Add a small delay between requests to avoid rate limiting
          if (i < processedFrames.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        analysisResults.openai = frameAnalyses.join('\n');
        console.log('OpenAI individual frame analysis completed');
      })()
    );
    
    // Ollama analysis (if enabled)
    if (enableOllama) {
      for (const model of models) {
        analysisPromises.push(
          analyzeFramesWithOllama(processedFrames, ollamaUrl, model, ollamaPrompt)
            .then(result => {
              analysisResults[`ollama_${model.replace(/[:.]/g, '_')}`] = result;
              console.log(`Ollama analysis completed for ${model}`);
            })
            .catch(error => {
              console.error(`Ollama analysis failed for ${model}:`, error);
              // Provide a helpful error message for the user
              if (error.message.includes('403')) {
                analysisResults[`ollama_${model.replace(/[:.]/g, '_')}`] = `Error: API format issue with Ollama model '${model}'. This might be due to incorrect API format or model configuration. Try testing with the test page first.`;
              } else if (error.message.includes('Failed to fetch')) {
                analysisResults[`ollama_${model.replace(/[:.]/g, '_')}`] = `Error: Cannot connect to Ollama server at ${ollamaUrl}. Make sure Ollama is running and the server URL is correct.`;
              } else {
                analysisResults[`ollama_${model.replace(/[:.]/g, '_')}`] = `Error: ${error.message}`;
              }
            })
        );
      }
    }
    
    // Wait for all analyses to complete
    await Promise.all(analysisPromises);
    
    console.log('All analyses complete');
    return analysisResults;
    
  } catch (error) {
    console.error('Error analyzing frames:', error);
    throw error;
  }
};

// Enhanced analysis report creation with dual model support
const createAnalysisReport = async (analysis, frames, filename) => {
  const settings = await chrome.storage.local.get(['enableGrayscale', 'enableOllama', 'ollamaModel']);
  const enableGrayscale = settings.enableGrayscale !== false;
  const enableOllama = settings.enableOllama || false;
  const ollamaModel = settings.ollamaModel || 'llava:latest,llama3.2-vision:latest';
  const models = enableOllama ? ollamaModel.split(',').map(m => m.trim()).filter(m => m) : [];
  
  const analysisData = {
    filename: filename,
    timestamp: new Date().toISOString(),
    frameCount: frames.length,
    duration: frames.length > 0 ? frames[frames.length - 1].timestamp : 0,
    analysis: analysis,
    grayscale: enableGrayscale,
    models: enableOllama ? ['openai', ...models] : ['openai']
  };
  
  // Store the analysis data for popup access
  await chrome.storage.local.set({ lastAnalysis: analysisData });
  
  const report = {
    recording: analysisData,
    frames: frames.map(frame => ({
      timestamp: frame.timestamp,
      hasImage: true
    }))
  };
  
  const reportBlob = new Blob([JSON.stringify(report, null, 2)], { 
    type: 'application/json' 
  });
  
  const reportFilename = filename.replace('.webm', '-analysis.json');
  downloadBlob(reportBlob, reportFilename);
  
  // Create a readable text report
  let textReport = `Screen Recording Analysis Report
Generated: ${new Date().toLocaleString()}
Recording: ${filename}
Frames Analyzed: ${frames.length}${enableGrayscale ? ' (Grayscale)' : ''}
Duration: ${Math.round(analysisData.duration)}s
Models Used: ${analysisData.models.join(', ').toUpperCase()}

`;

  // Add analysis content based on available models
  if (analysis.openai) {
    textReport += `OPENAI GPT-4 VISION ANALYSIS:
${analysis.openai}

`;
  }
  
  // Handle multiple Ollama models
  const ollamaModels = Object.keys(analysis).filter(key => key.startsWith('ollama_'));
  ollamaModels.forEach(modelKey => {
    const modelName = modelKey.replace('ollama_', '').replace(/_/g, ':');
    textReport += `OLLAMA ${modelName.toUpperCase()} ANALYSIS:
${analysis[modelKey]}

`;
  });
  
  // Fallback for old format
  if (typeof analysis === 'string') {
    textReport += `ANALYSIS:
${analysis}`;
  }
  
  const textBlob = new Blob([textReport], { type: 'text/plain' });
  const textFilename = filename.replace('.webm', '-analysis.txt');
  downloadBlob(textBlob, textFilename);
  
  return analysisData;
};

let mediaRecorder = null;
let stream = null;
let chunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Recording screen received message:', message);
  
  if (message.name === 'startRecordingOnBackground') {
    startRecording(message);
    sendResponse({ success: true });
  } else if (message.name === 'stopRecording') {
    console.log('Stop recording message received');
    stopRecording();
    sendResponse({ success: true });
  }
  
  return true;
});

const startRecording = (message) => {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window'],
    function (streamId) {
      if (streamId == null) {
        return;
      }

      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
          }
        }
      }).then(mediaStream => {
        stream = mediaStream;
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = function(e) {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = async function(e) {
          await handleRecordingStop();
        };

        mediaRecorder.start();
        chrome.runtime.sendMessage({ name: 'recordingStarted' });
        
      }).finally(async () => {
        await chrome.tabs.update(message.body.currentTab.id, { active: true, selected: true });
      });
    });
};

const stopRecording = () => {
  console.log('stopRecording called, mediaRecorder state:', mediaRecorder?.state);
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    console.log('Stopping media recorder...');
    mediaRecorder.stop();
  } else if (mediaRecorder) {
    console.log('MediaRecorder exists but not recording, state:', mediaRecorder.state);
    if (mediaRecorder.state === 'inactive' && chunks.length > 0) {
      handleRecordingStop();
    }
  } else {
    console.log('No mediaRecorder found');
  }
};

const handleRecordingStop = async () => {
  console.log('=== handleRecordingStop started ===');
  console.log('Chunks array length:', chunks.length);
  console.log('MediaRecorder state:', mediaRecorder?.state);
  
  try {
    // Notify that we're processing
    console.log('Sending recordingProcessing message...');
    chrome.runtime.sendMessage({ name: 'recordingProcessing' });
    
    const blobFile = new Blob(chunks, { type: "video/webm" });
    console.log('Video blob created, size:', blobFile.size, 'type:', blobFile.type);
    
    if (!blobFile || blobFile.size === 0) {
      throw new Error('Recorded video is empty. Nothing to process.');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `linkedin-recording-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.webm`;
    
    // Download the original video file
    downloadBlob(blobFile, filename);
    console.log('Video file downloaded');
    
    // Get settings
    console.log('Loading settings from storage...');
    const settings = await chrome.storage.local.get(['frameRate', 'autoAnalyze', 'openaiApiKey', 'saveFrames']);
    const frameRate = settings.frameRate || 0.5;
    const autoAnalyze = settings.autoAnalyze !== false;
    const saveFrames = settings.saveFrames || false;
    
    // Try to get API key from environment if not in storage
    console.log('Checking for API key...');
    let apiKey = settings.openaiApiKey;
    if (!apiKey && window.envLoader && window.envLoader.isLoaded()) {
      console.log('Loading API key from environment...');
      apiKey = window.envLoader.getOpenAIKey();
    }
    
    console.log('Settings loaded:', { frameRate, autoAnalyze, hasApiKey: !!apiKey, saveFrames });
    
    // Always try to extract frames for basic info
    console.log('=== Starting frame extraction ===');
    console.log('Frame rate:', frameRate);
    let frames = [];
    try {
      console.log('Calling extractFrames function...');
      frames = await extractFrames(blobFile, frameRate);
      console.log(`Frame extraction completed: ${frames.length} frames`);
    } catch (frameError) {
      console.error('Frame extraction failed:', frameError);
      console.error('Frame error stack:', frameError.stack);
      frames = [];
    }
    
    // Save individual frames if requested
    if (saveFrames && frames.length > 0) {
      console.log('Saving individual frames...');
      frames.forEach((frame, index) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            const frameFilename = filename.replace('.webm', `-frame-${String(index + 1).padStart(3, '0')}.jpg`);
            downloadBlob(blob, frameFilename);
          }, 'image/jpeg', 0.8);
        };
        
        img.src = frame.data;
      });
    }
    
    if (apiKey && autoAnalyze && frames.length > 0) {
      console.log('=== Starting analysis ===');
      console.log('API key available:', !!apiKey);
      console.log('Auto-analyze enabled:', autoAnalyze);
      console.log('Frames available:', frames.length);
      try {
        const analysis = await analyzeFrames(frames, apiKey, settings.analysisPrompt);
        console.log('Analysis completed successfully');
      } catch (analysisError) {
        console.error('Analysis failed:', analysisError);
        console.error('Analysis error stack:', analysisError.stack);
      }
      
      // Create and download analysis report, store for popup
      const analysisData = await createAnalysisReport(analysis, frames, filename);
      
      // Send analysis to content script with enhanced notification
      const hasOpenAI = analysis.openai && !analysis.openai.startsWith('Error:');
      const hasOllama = analysis.ollama && !analysis.ollama.startsWith('Error:');
      
      let analysisMessage = '';
      if (hasOpenAI && hasOllama) {
        analysisMessage = `Dual analysis complete! ${frames.length} frames processed with OpenAI and Ollama. Click the extension icon to compare results.`;
      } else if (hasOpenAI) {
        analysisMessage = `OpenAI analysis complete! ${frames.length} frames processed. Click the extension icon to view the analysis.`;
      } else if (hasOllama) {
        analysisMessage = `Ollama analysis complete! ${frames.length} frames processed. Click the extension icon to view the analysis.`;
      } else {
        analysisMessage = `Analysis attempted but failed. Check console for errors.`;
      }
      
      notifyContentScript(filename, {
        analysis,
        frameCount: frames.length,
        hasAnalysis: hasOpenAI || hasOllama,
        message: analysisMessage
      });
      
    } else if (!apiKey) {
      console.log('No OpenAI API key found, skipping analysis');
      notifyContentScript(filename, {
        frameCount: frames.length,
        hasAnalysis: false,
        message: 'Recording saved! Add OpenAI API key to config.env file or set it in extension options to enable AI analysis.'
      });
      
    } else if (!autoAnalyze) {
      console.log('Auto-analysis disabled');
      notifyContentScript(filename, {
        frameCount: frames.length,
        hasAnalysis: false,
        message: 'Recording saved! Enable auto-analysis in settings to get AI insights.'
      });
      
    } else {
      console.log('No frames extracted for analysis');
      notifyContentScript(filename, {
        frameCount: 0,
        hasAnalysis: false,
        message: 'Recording saved but frame extraction failed. Check console for errors.'
      });
    }
    
  } catch (error) {
    console.error('=== Error during processing ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Send error info to content script
    notifyContentScript('recording.webm', {
      hasAnalysis: false,
      error: error.message,
      message: `Error: ${error.message}`
    });
  }

  // Cleanup and finalize
  console.log('=== Starting finalization ===');
  await finalizeRecording();
};

const notifyContentScript = (filename, data) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        name: 'endedRecording',
        body: { filename, ...data }
      }).catch((error) => {
        console.log('Could not send message to content script:', error);
      });
    }
  });
};

const finalizeRecording = async () => {
  console.log('=== finalizeRecording started ===');
  
  try {
    // Notify popup that recording stopped
    console.log('Sending recordingStopped message...');
    chrome.runtime.sendMessage({ name: 'recordingStopped' });

    // Stop all tracks of stream
    console.log('Stopping media stream tracks...');
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.id);
        track.stop();
      });
    }
    
    // Clear the stored recording tab ID and processing state
    console.log('Clearing storage...');
    await chrome.storage.local.remove(['recordingTabId']);
    await chrome.storage.local.set({ isProcessing: false });
    
    console.log('=== Recording finalized successfully ===');
    console.log('Closing tab in 2 seconds...');
    
    // Close the recording tab after a short delay
    setTimeout(() => {
      console.log('Closing recording tab...');
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Error in finalizeRecording:', error);
    console.error('Error stack:', error.stack);
  }
};

// Enhanced recording_screen.js with Ollama integration and grayscale support

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

// Function to test Ollama connectivity and model availability
const testOllamaConnection = async (ollamaUrl, ollamaModel) => {
  try {
    console.log('Testing Ollama connection...');
    
    // First, test if the server is reachable
    const serverResponse = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!serverResponse.ok) {
      throw new Error(`Ollama server not accessible: ${serverResponse.status} ${serverResponse.statusText}`);
    }
    
    const serverData = await serverResponse.json();
    console.log('Available models:', serverData);
    
    // Check if the requested model is available
    const models = serverData.models || [];
    const modelExists = models.some(model => model.name === ollamaModel);
    
    if (!modelExists) {
      throw new Error(`Model '${ollamaModel}' not found. Available models: ${models.map(m => m.name).join(', ')}`);
    }
    
    console.log(`Model '${ollamaModel}' is available`);
    return true;
    
  } catch (error) {
    console.error('Ollama connection test failed:', error);
    throw error;
  }
};

// Function to analyze frames with Ollama Vision API
const analyzeFramesWithOllama = async (frames, ollamaUrl, ollamaModel, ollamaPrompt) => {
  try {
    console.log('Starting Ollama analysis with', frames.length, 'frames...');
    
    // Test connection and model availability first
    await testOllamaConnection(ollamaUrl, ollamaModel);
    
    // Llama 3.2 Vision expects: prompt + images array
    const images = frames.map(frame => frame.data);
    
    const requestBody = {
      model: ollamaModel,
      prompt: ollamaPrompt,
      images: images,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };
    
    console.log('Sending request to Ollama API...');
    
    // Send to Ollama API with the correct format for Llama 3.2 Vision
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Chrome-Extension/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Ollama API response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Ollama API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.error || 'Unknown error'}`;
      } catch (parseError) {
        // If JSON parsing fails, try to get text response
        try {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        } catch (textError) {
          errorMessage += ' - Unable to parse error response';
        }
      }
      throw new Error(errorMessage);
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      const responseText = await response.text();
      console.log('Ollama response text:', responseText);
      
      if (responseText.trim()) {
        data = JSON.parse(responseText);
      } else {
        throw new Error('Empty response from Ollama server');
      }
    } catch (parseError) {
      console.error('Error parsing Ollama response:', parseError);
      throw new Error(`Invalid JSON response from Ollama: ${parseError.message}`);
    }
    
    console.log('Ollama API response received successfully');
    
    // Check if the response has the expected structure
    if (data && data.response) {
      return data.response;
    } else if (data && data.message && data.message.content) {
      return data.message.content;
    } else {
      console.warn('Unexpected Ollama response structure:', data);
      return JSON.stringify(data);
    }
    
  } catch (error) {
    console.error('Error analyzing frames with Ollama:', error);
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