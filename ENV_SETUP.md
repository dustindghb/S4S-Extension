# Environment Configuration Setup

This Chrome extension now supports environment variables for secure API key management.

## Setup Instructions

### 1. Configure Your API Keys

Edit the `config.env` file in the extension directory and add your OpenAI API key:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Optional: Other API configurations
# OLLAMA_URL=http://localhost:11434
# OLLAMA_MODEL=llava:latest
```

### 2. Security Best Practices

- **Never commit your API keys to version control**
- Add `config.env` to your `.gitignore` file
- Keep your API keys secure and don't share them
- Consider using environment variables in production environments

### 3. How It Works

The extension will automatically:
1. Load environment variables from `config.env` when the extension starts
2. Use the API key from the environment file if available
3. Fall back to the extension settings if no environment key is found
4. Display appropriate status messages based on key availability

### 4. Priority Order

The extension checks for API keys in this order:
1. Environment variable from `config.env` file
2. Extension settings (if configured in options)
3. Shows error if no key is found

### 5. Troubleshooting

If you see "API Key Required" status:
1. Check that `config.env` exists in the extension directory
2. Verify your API key is correctly formatted (starts with `sk-`)
3. Reload the extension after making changes
4. Check the browser console for any loading errors

### 6. File Structure

```
S4S-Tool/
├── config.env          # Your API keys (create this)
├── env-loader.js       # Environment loader utility
├── popup.js           # Updated to use env vars
├── recording_screen.js # Updated to use env vars
└── ... other files
```

### 7. Example config.env

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef

# Optional: Ollama configuration (for local AI)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llava:latest
```

## Benefits

- **Security**: API keys are not hardcoded in the extension
- **Flexibility**: Easy to switch between different API keys
- **Development**: Separate keys for development and production
- **Sharing**: Safe to share code without exposing sensitive data 