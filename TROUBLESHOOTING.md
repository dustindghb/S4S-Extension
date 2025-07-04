# 🔧 Troubleshooting Guide - Ollama Integration

## Common Issues and Solutions

### 1. 403 Forbidden Error

**Problem:** `Ollama API error: 403 Forbidden`

**Causes:**
- Model doesn't support vision capabilities
- Incorrect API request format
- Model not properly installed

**Solutions:**

#### A. Check Model Capabilities
```bash
# List installed models
ollama list

# Check if your model supports vision
ollama show llama3.2-vision
```

#### B. Install a Vision-Capable Model
```bash
# Install LLaVA (recommended)
ollama pull llava

# Or install BakLLaVA
ollama pull bakllava

# Or install LLaVA with Llama 3
ollama pull llava-llama3
```

#### C. Update Extension Settings
1. Open extension options
2. Change model name to `llava` or `bakllava`
3. Test the connection

### 2. Connection Issues

**Problem:** `Cannot connect to Ollama server`

**Solutions:**
```bash
# Start Ollama server
ollama serve

# Check if server is running
curl http://localhost:11434/api/tags
```

### 3. Model Not Found

**Problem:** `Model 'llama3.2-vision' not found`

**Solutions:**
```bash
# Install the model
ollama pull llama3.2-vision

# Or use an alternative
ollama pull llava
```

## Testing Your Setup

### 1. Use the Test Page
Open `test_ollama.html` in your browser and run the tests:

1. **Test Connection** - Verifies Ollama server is running
2. **List Models** - Shows available models
3. **Model Info** - Shows model capabilities
4. **Test Simple Chat** - Tests basic text generation
5. **Test Vision Chat** - Tests vision capabilities

### 2. Command Line Testing
```bash
# Test basic chat
ollama run llava "Hello, how are you?"

# Test vision (if you have an image)
ollama run llava "Describe this image" --image path/to/image.jpg
```

## Recommended Models

### For Vision Analysis:
1. **LLaVA** (`llava`) - Most reliable and widely supported
2. **BakLLaVA** (`bakllava`) - Good alternative
3. **LLaVA-Llama3** (`llava-llama3`) - Latest version

### Installation Commands:
```bash
# Install LLaVA (recommended)
ollama pull llava

# Install BakLLaVA
ollama pull bakllava

# Install LLaVA with Llama 3
ollama pull llava-llama3
```

## Extension Configuration

### 1. Update Model Name
In extension options, set the model name to one of:
- `llava` (recommended)
- `bakllava`
- `llava-llama3`

### 2. Verify Server URL
Default: `http://localhost:11434`

### 3. Test Connection
Use the "Test Ollama Connection" button in options.

## Debug Information

### Check Browser Console
Open Developer Tools (F12) and check the Console tab for detailed error messages.

### Common Error Messages:

**403 Forbidden:**
- Model doesn't support vision
- Try a different model like `llava`

**Failed to fetch:**
- Ollama server not running
- Wrong server URL
- Network connectivity issues

**Unexpected end of JSON input:**
- Empty response from server
- Model not responding properly

## Performance Tips

### 1. Model Selection
- **LLaVA**: Good balance of speed and accuracy
- **BakLLaVA**: Faster but slightly less accurate
- **LLaVA-Llama3**: Most accurate but slower

### 2. Hardware Requirements
- **Minimum**: 8GB RAM, decent CPU
- **Recommended**: 16GB+ RAM, GPU acceleration
- **GPU**: CUDA-compatible GPU for better performance

### 3. Frame Processing
- Enable grayscale processing for faster analysis
- Reduce frame rate for longer videos
- Limit number of frames sent to API

## Getting Help

### 1. Check Ollama Documentation
- [Ollama Official Docs](https://ollama.ai/docs)
- [Model Library](https://ollama.ai/library)

### 2. Community Resources
- [Ollama GitHub](https://github.com/ollama/ollama)
- [LLaVA GitHub](https://github.com/haotian-liu/LLaVA)

### 3. Extension Issues
- Check browser console for errors
- Verify all settings in extension options
- Test with the provided test page

## Quick Fix Checklist

- [ ] Ollama server is running (`ollama serve`)
- [ ] Vision model is installed (`ollama pull llava`)
- [ ] Model name is correct in extension settings
- [ ] Server URL is correct (`http://localhost:11434`)
- [ ] Extension has localhost permissions
- [ ] Test connection works in options page
- [ ] Browser console shows no errors

If all steps are completed and issues persist, try:
1. Restart Ollama server
2. Reload the extension
3. Clear browser cache
4. Try a different vision model 