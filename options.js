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
  const apiKey = document.getElementById('apiKey').value.trim();
  const analysisPrompt = document.getElementById('analysisPrompt').value.trim();
  const frameRate = parseFloat(document.getElementById('frameRate').value);
  const autoAnalyze = document.getElementById('autoAnalyze').checked;
  const saveFrames = document.getElementById('saveFrames').checked;
  const cleanupTemp = document.getElementById('cleanupTemp').checked;
  const enableGrayscale = document.getElementById('enableGrayscale').checked;
  
  if (!apiKey) {
    showStatus('Please enter your OpenAI API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showStatus('API key should start with "sk-"', 'error');
    return;
  }
  
  try {
    await chrome.storage.local.set({
      openaiApiKey: apiKey,
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
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter your API key first', 'error');
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
      showStatus('❌ Invalid OpenAI API key. Please check your key.', 'error');
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
      'openaiApiKey',
      'analysisPrompt', 
      'frameRate',
      'autoAnalyze',
      'saveFrames',
      'cleanupTemp',
      'enableGrayscale',
    ]);
    
    // Load saved values or set defaults
    document.getElementById('apiKey').value = result.openaiApiKey || '';
    document.getElementById('analysisPrompt').value = result.analysisPrompt || 
      'Analyze this sequence of frames from a video recording and provide a detailed description of what is happening. Focus on user actions, UI changes, applications being used, and any workflows or processes being demonstrated.';
    document.getElementById('frameRate').value = result.frameRate || 0.5;
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
  
  // Save on Enter key in API key field
  document.getElementById('apiKey').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveOptions();
    }
  });
  
  // Auto-save certain settings
  document.getElementById('frameRate').addEventListener('change', saveOptions);
  document.getElementById('autoAnalyze').addEventListener('change', saveOptions);
  document.getElementById('saveFrames').addEventListener('change', saveOptions);
  document.getElementById('cleanupTemp').addEventListener('change', saveOptions);
  document.getElementById('enableGrayscale').addEventListener('change', saveOptions);
});