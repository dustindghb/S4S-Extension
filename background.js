// Background script for screen recording only

// Screen Recording Functions
const startRecording = async () => {
  await chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true}, async function (tabs) {
    // Get current tab to focus on it after start recording on recording screen tab
    const currentTab = tabs[0];

    // Create recording screen tab
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('recording_screen.html'),
      pinned: true,
      active: true,
    });

    // Store recording tab ID for later reference
    chrome.storage.local.set({ recordingTabId: tab.id });

    // Wait for recording screen tab to be loaded and send message to it with the currentTab
    chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        await chrome.tabs.sendMessage(tabId, {
          name: 'startRecordingOnBackground',
          body: {
            currentTab: currentTab,
          },
        });
      }
    });
  });
};

const stopRecording = async () => {
  try {
    // First try to get recording tab ID from storage
    const result = await chrome.storage.local.get(['recordingTabId']);
    let recordingTab = null;

    if (result.recordingTabId) {
      try {
        recordingTab = await chrome.tabs.get(result.recordingTabId);
        console.log('Found recording tab from storage:', recordingTab);
      } catch (error) {
        console.log('Recording tab from storage not found, searching manually');
      }
    }

    // If not found in storage, search manually
    if (!recordingTab) {
      const tabs = await chrome.tabs.query({});
      recordingTab = tabs.find(tab => tab.url && tab.url.includes('recording_screen.html'));
      console.log('Manual search result:', recordingTab);
    }
    
    if (recordingTab) {
      console.log('Found recording tab, sending stop message...');
      await chrome.tabs.sendMessage(recordingTab.id, {
        name: 'stopRecording'
      });
      console.log('Stop message sent successfully');
      
      // Clear the stored tab ID
      chrome.storage.local.remove(['recordingTabId']);
    } else {
      console.log('No recording tab found');
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
  }
};

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request.name, 'from:', sender);
  
  if (request.name === 'startRecording') {
    console.log('Starting recording...');
    startRecording();
  } else if (request.name === 'stopRecording') {
    console.log('Stopping recording...');
    stopRecording();
  } else if (request.name === 'recordingProcessing') {
    console.log('Recording is processing...');
  } else if (request.name === 'recordingStopped') {
    console.log('Recording stopped...');
  }
});

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Set default settings
    chrome.storage.local.set({
      frameRate: 0.5,
      autoAnalyze: true,
      openaiApiKey: ''
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});