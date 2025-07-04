// Environment variable loader for Chrome extension
// This script loads environment variables from config.env file

class EnvLoader {
  constructor() {
    this.envVars = {};
    this.loaded = false;
  }

  // Load environment variables from config.env file
  async loadEnvFile() {
    try {
      const response = await fetch(chrome.runtime.getURL('config.env'));
      const envContent = await response.text();
      
      // Parse the .env file content
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') {
          continue;
        }
        
        // Parse key=value pairs
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          const value = line.substring(equalIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          
          this.envVars[key] = cleanValue;
        }
      }
      
      this.loaded = true;
      console.log('Environment variables loaded:', Object.keys(this.envVars));
      
    } catch (error) {
      console.error('Error loading environment file:', error);
      // Set default values if env file is not available
      this.envVars = {
        OPENAI_API_KEY: '',
        OLLAMA_URL: 'http://localhost:11434',
        OLLAMA_MODEL: 'llava:latest'
      };
      this.loaded = true;
    }
  }

  // Get environment variable value
  get(key, defaultValue = '') {
    return this.envVars[key] || defaultValue;
  }

  // Get OpenAI API key
  getOpenAIKey() {
    return this.get('OPENAI_API_KEY');
  }

  // Get Ollama URL
  getOllamaUrl() {
    return this.get('OLLAMA_URL', 'http://localhost:11434');
  }

  // Get Ollama model
  getOllamaModel() {
    return this.get('OLLAMA_MODEL', 'llava:latest');
  }

  // Check if environment is loaded
  isLoaded() {
    return this.loaded;
  }

  // Get all environment variables
  getAll() {
    return { ...this.envVars };
  }
}

// Create global instance
window.envLoader = new EnvLoader();

// Auto-load environment variables when script loads
window.envLoader.loadEnvFile(); 