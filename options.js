// options.js - Handle extension options and API key management for video analysis

const showStatus = (message, type = 'info') => {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
};

const saveOptions = async () => {
  const analysisPrompt = document.getElementById('analysisPrompt').value.trim();
  const frameRate = parseFloat(document.getElementById('frameRate').value);
  const autoAnalyze = document.getElementById('autoAnalyze').checked;
  const saveFrames = document.getElementById('saveFrames').checked;
  const cleanupTemp = document.getElementById('cleanupTemp').checked;
  const enableGrayscale = document.getElementById('enableGrayscale').checked;

  try {
    await chrome.storage.local.set({
      analysisPrompt: analysisPrompt || 'Analyze this sequence of frames from a video recording and provide a detailed description of what is happening.',
      frameRate: frameRate,
      autoAnalyze: autoAnalyze,
      saveFrames: saveFrames,
      cleanupTemp: cleanupTemp,
      enableGrayscale: enableGrayscale,
    });
    
    showStatus('Settings saved successfully!', 'success');
    
    // Disable save button briefly to indicate success
    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;
    setTimeout(() => {
      saveButton.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error saving options:', error);
    showStatus('Error saving settings. Please try again.', 'error');
  }
};

const testApiConnection = async () => {
  // Get API key from environment
  let apiKey = '';
  
  // Try to get from environment loader if available
  if (window.envLoader && window.envLoader.isLoaded()) {
    apiKey = window.envLoader.getOpenAIKey();
  }
  
  if (!apiKey) {
    showStatus('No OpenAI API key found. Please add your API key to the config.env file.', 'error');
    return;
  }
  
  const testButton = document.getElementById('testButton');
  testButton.disabled = true;
  testButton.textContent = 'Testing...';
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const hasGPT4Vision = data.data.some(model => 
        model.id.includes('gpt-4') && (model.id.includes('vision') || model.id.includes('gpt-4o'))
      );
      
      if (hasGPT4Vision) {
        showStatus('✓ OpenAI API key is valid and has access to vision models!', 'success');
      } else {
        showStatus('⚠ OpenAI API key is valid but may not have access to GPT-4 Vision', 'info');
      }
    } else if (response.status === 401) {
      showStatus('❌ Invalid OpenAI API key. Please check your key in config.env.', 'error');
    } else if (response.status === 429) {
      showStatus('⚠ Rate limit exceeded. OpenAI API key is valid but you\'ve hit usage limits.', 'info');
    } else {
      showStatus(`❌ OpenAI API error: ${response.status}`, 'error');
    }
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
    showStatus('❌ OpenAI connection error. Check your internet connection.', 'error');
  } finally {
    testButton.disabled = false;
    testButton.textContent = 'Test API Connection';
  }
};

const loadOptions = async () => {
  try {
    const result = await chrome.storage.local.get([
      'analysisPrompt', 
      'frameRate',
      'autoAnalyze',
      'saveFrames',
      'cleanupTemp',
      'enableGrayscale',
    ]);
    
    // Load saved values or set defaults
    document.getElementById('analysisPrompt').value = result.analysisPrompt || 
      'Extract the following information from this LinkedIn post:\n\n1. **Person\'s Name**: The full name of the person who wrote the post\n2. **Company**: The company or organization they work for\n3. **Post Content**: What is written in the post\n\nIf any information is not visible, write "Not visible". Keep the response concise and focused.';
    document.getElementById('frameRate').value = result.frameRate || 1.0;
    document.getElementById('autoAnalyze').checked = result.autoAnalyze !== false; // Default true
    document.getElementById('saveFrames').checked = result.saveFrames || false;
    document.getElementById('cleanupTemp').checked = result.cleanupTemp !== false; // Default true
    document.getElementById('enableGrayscale').checked = result.enableGrayscale !== false; // Default false
    
  } catch (error) {
    console.error('Error loading options:', error);
    showStatus('Error loading settings', 'error');
  }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadOptions();
  
  document.getElementById('saveButton').addEventListener('click', saveOptions);
  document.getElementById('testButton').addEventListener('click', testApiConnection);
  

  
  // Auto-save certain settings
  document.getElementById('frameRate').addEventListener('change', saveOptions);
  document.getElementById('autoAnalyze').addEventListener('change', saveOptions);
  document.getElementById('saveFrames').addEventListener('change', saveOptions);
  document.getElementById('cleanupTemp').addEventListener('change', saveOptions);
  document.getElementById('enableGrayscale').addEventListener('change', saveOptions);

});