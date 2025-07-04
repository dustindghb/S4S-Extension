# AI-Powered Video & Screen Analysis Chrome Extension

A Chrome extension that can record your screen or analyze uploaded videos using **OpenAI's Vision API** and **Ollama's Llama 3.2 Vision** to provide detailed insights about what's happening in the video. Compare cloud and local AI analysis for comprehensive results.

## Features

### 🎬 Screen Recording
- Record your entire screen or specific windows
- Automatic frame extraction at configurable rates
- **Dual AI analysis**: OpenAI GPT-4 Vision (cloud) + Ollama Llama 3.2 Vision (local)
- **Grayscale processing** for improved efficiency
- Detailed content analysis including:
  - Website names and URLs
  - Visible text content
  - User interactions and actions
  - Chronological flow of activities

### 📹 Video Upload & Analysis
- Upload WebM, MP4, AVI, or MOV video files
- Automatic frame extraction using Canvas API
- **Side-by-side AI analysis** with OpenAI and Ollama
- **Grayscale conversion** option for faster processing
- Detailed analysis of video content including:
  - Frame-by-frame descriptions
  - Website identification
  - Text content reading
  - User interaction tracking
  - Chronological summaries

### 🤖 Dual AI Analysis
- **OpenAI GPT-4 Vision**: Cloud-based analysis with high accuracy
- **Ollama Vision Models**: Local analysis with multiple models (LLaVA, Llama 3.2 Vision, etc.)
- **Multi-model support**: Use multiple Ollama models simultaneously
- **Comparison view**: Side-by-side results for comprehensive insights
- **Independent prompts**: Customize analysis prompts for each model
- **Parallel processing**: All models analyze simultaneously

### ⚙️ Configuration Options
- Adjustable frame rate (0.1 to 5 frames per second)
- Custom analysis prompts for both OpenAI and Ollama
- OpenAI API key management
- Ollama server configuration
- Grayscale processing toggle
- Auto-analysis toggle

## Installation

### Prerequisites
- Chrome browser
- OpenAI API key with Vision API access
- **Ollama** (optional, for local AI analysis)

### Ollama Setup (Optional)

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Install Vision models**
   ```bash
   # Install LLaVA (recommended)
   ollama pull llava:latest
   
   # Install Llama 3.2 Vision
   ollama pull llama3.2-vision:latest
   
   # Optional: Install other vision models
   ollama pull bakllava:latest
   ollama pull llava-llama3:latest
   ```

3. **Start Ollama server**
   ```bash
   ollama serve
   ```
   The server runs on `http://localhost:11434` by default.

### Extension Setup

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd ScreenRecord
   ```

2. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `ScreenRecord` folder

3. **Configure AI Services**
   - Click the extension icon in your toolbar
   - Click the "Options" button
   - **OpenAI Configuration**:
     - Enter your OpenAI API key
     - Customize analysis prompt
   - **Ollama Configuration** (optional):
     - Enable Ollama analysis
     - Set Ollama server URL (default: http://localhost:11434)
     - Set model names (default: llava:latest,llama3.2-vision:latest)
     - Multiple models can be specified, separated by commas
     - Customize Ollama analysis prompt
   - **Processing Settings**:
     - Enable grayscale conversion for efficiency
     - Set frame extraction rate
     - Configure auto-analysis
   - Save the settings

## Usage

### Screen Recording
1. Click the extension icon in your Chrome toolbar
2. Click "Start Recording" to begin screen capture
3. Perform the actions you want to analyze
4. Click "Stop Recording" when finished
5. The extension will automatically analyze the recording with both AI models (if enabled)

### Video Upload & Analysis
1. Click the extension icon in your Chrome toolbar
2. Click "Choose File" and select a video file
3. Click "Analyze Video" to process the file
4. View the detailed analysis results from both models

### Viewing Analysis Results
- Click "View Last Analysis" to see the most recent analysis
- **Side-by-side comparison** of OpenAI and Ollama results
- Analysis results include:
  - Frame-by-frame descriptions
  - Website identification
  - Text content details
  - User interaction summaries
  - Chronological flow
  - Processing information (grayscale, models used)

## Technical Details

### Frame Extraction
- Uses Canvas API to extract frames from videos
- Configurable frame rate (default: 0.5 frames per second)
- **Grayscale conversion** option for improved efficiency
- Supports WebM, MP4, AVI, and MOV formats

### AI Analysis
- **OpenAI GPT-4 Vision API**: Cloud-based analysis
- **Ollama Vision Models**: Local analysis via HTTP API (supports multiple models)
- Sends extracted frames as base64 images
- Processes multiple frames in a single API call
- **Parallel processing** for faster results
- Provides detailed content analysis

### Grayscale Processing
- Converts frames to grayscale before analysis
- Reduces processing time and API costs
- Maintains analysis quality for most use cases
- Can be disabled for full-color analysis

### Storage
- Analysis results stored locally in Chrome storage
- Settings persisted across browser sessions
- No data sent to external servers except OpenAI API
- Ollama analysis runs entirely locally

## Configuration

### Frame Rate
- Controls how many frames are extracted per second
- Higher rates provide more detail but increase processing time
- Recommended: 0.5-1.0 frames per second

### Analysis Prompts
- **OpenAI Prompt**: Customize the prompt sent to GPT-4 Vision
- **Ollama Prompt**: Customize the prompt sent to all Ollama vision models
- Different prompts can be used to get varied perspectives
- Default prompts focus on detailed content analysis

### Grayscale Processing
- **Enabled by default** for efficiency
- Reduces frame size and processing time
- Can be disabled for full-color analysis
- Recommended for most use cases

### Auto-Analysis
- Toggle automatic analysis after recording
- When disabled, recordings are saved without analysis
- Manual analysis can be performed later

## Troubleshooting

### Common Issues

**"API Key Required" error**
- Make sure you've entered your OpenAI API key in the options
- Ensure the API key has Vision API access

**"Cannot connect to Ollama server" error**
- Ensure Ollama is installed and running
- Check that the server URL is correct (default: http://localhost:11434)
- Verify the model is installed: `ollama list`

**"No frames could be extracted" error**
- Check that the video file is not corrupted
- Try a different video format (WebM recommended)
- Ensure the video has valid content

**Analysis fails**
- Check your internet connection (for OpenAI)
- Verify OpenAI API key is valid
- Check Ollama server is running (for Ollama analysis)
- Check browser console for detailed error messages

### Performance Tips
- Use lower frame rates for longer videos
- Enable grayscale processing for faster analysis
- Close unnecessary browser tabs during recording
- Ensure stable internet connection for OpenAI analysis
- Use local Ollama for privacy-sensitive content

## Development

### Project Structure
```
ScreenRecord/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality with dual AI support
├── background.js         # Background service worker
├── content.js            # Content script for recording
├── options.html          # Settings page with Ollama config
├── options.js            # Settings functionality
├── recording_screen.html # Recording interface
├── recording_screen.js   # Recording logic with dual AI support
└── README.md            # This file
```

### Key Components

**background.js**
- Handles video frame extraction using Canvas API
- Manages OpenAI Vision API communication
- Processes video files and coordinates analysis

**popup.js**
- Manages user interface interactions
- Handles file uploads and recording controls
- Displays dual analysis results with comparison view
- Supports grayscale processing

**content.js**
- Captures screen content during recording
- Manages recording state and data collection

**options.js**
- Manages both OpenAI and Ollama configuration
- Handles grayscale processing settings
- Tests connections to both AI services

## Limitations

- Video processing is done client-side using Canvas API
- Large video files may take longer to process
- Requires OpenAI API key and internet connection for cloud analysis
- Ollama requires local installation and sufficient hardware resources
- Frame extraction quality depends on video format and browser support

## Future Enhancements

- Server-side video processing for better performance
- Support for more video formats
- Advanced frame filtering and selection
- Integration with other AI services
- Export analysis results to various formats
- Real-time analysis during recording
- Custom model support for Ollama

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions, please open an issue on the project repository. 