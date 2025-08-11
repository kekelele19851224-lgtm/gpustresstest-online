# GPU Stress Test Online

**Free online GPU stress testing tool for graphics card performance benchmarking**

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fgpustresstest.online)](https://gpustresstest.online)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-blue.svg)](https://www.khronos.org/webgl/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)](https://threejs.org/)

## 🚀 **Live Demo**

Visit [gpustresstest.online](https://gpustresstest.online) to test your graphics card performance instantly!

## 📖 **Overview**

GPU Stress Test Online is a comprehensive, browser-based graphics card testing tool that helps users evaluate their GPU performance safely and efficiently. Built with WebGL and Three.js, it provides professional-grade stress testing with real-time monitoring and fallback compatibility for all devices.

## ✨ **Key Features**

### 🎯 **Performance Testing**
- **4 Test Levels**: Light (50 objects), Medium (150 objects), Heavy (300 objects), Extreme (500 objects)
- **Real-time FPS Monitoring**: Live performance metrics with interactive charts
- **Temperature Simulation**: GPU thermal monitoring and throttling detection
- **Stability Testing**: Extended stress tests to ensure GPU reliability

### 🖥️ **Cross-Platform Compatibility**
- **3D WebGL Mode**: Full Three.js rendering for modern browsers
- **2D CSS Fallback**: Automatic fallback for older devices or WebGL-incompatible browsers
- **Mobile Optimized**: Responsive design with touch-friendly interface
- **Multi-CDN Loading**: Robust Three.js loading with multiple fallback sources

### 📊 **Advanced Monitoring**
- **Real-time Charts**: FPS performance graphs with Chart.js
- **Performance Scoring**: 0-100 point scoring system with ratings
- **Results History**: Local storage of previous test results
- **System Detection**: Automatic GPU and device type detection

### 🔧 **Technical Excellence**
- **No Downloads Required**: Runs entirely in your browser
- **SEO Optimized**: Complete structured data and meta tags
- **Social Sharing**: Built-in result sharing for Twitter, Facebook, LinkedIn
- **PWA Ready**: Installable as a progressive web app

## 🛠️ **Tech Stack**

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **3D Graphics**: Three.js r128, WebGL 2.0
- **Charts**: Chart.js 3.9.1
- **Build**: No build process - pure vanilla implementation
- **Deployment**: Static hosting compatible (Netlify, GitHub Pages, etc.)

## 🎮 **How to Use**

1. **Visit the Website**: Go to [gpustresstest.online](https://gpustresstest.online)
2. **Click "Start GPU Test"**: Begin the testing process
3. **Choose Test Level**: Select from Light, Medium, Heavy, or Extreme
4. **Monitor Performance**: Watch real-time FPS, temperature, and stability metrics
5. **View Results**: Get detailed performance scores and comparisons
6. **Share Results**: Post your GPU performance on social media

## 📋 **Test Levels**

| Level | Objects | Duration | Best For |
|-------|---------|----------|----------|
| 🟢 **Light** | 50 | 30s | Basic testing, older hardware |
| 🟡 **Medium** | 150 | 30s | Standard testing, modern GPUs |
| 🟠 **Heavy** | 300 | 30s | Intensive testing, high-end cards |
| 🔴 **Extreme** | 500 | 30s | Maximum stress, professional GPUs |

## 🏗️ **Local Development**

### Prerequisites
- Modern web browser with WebGL support
- Python 3.x (for local server) or any static file server

### Setup
```bash
# Clone the repository
git clone https://github.com/kekelele1985I224-Igtm/gpustresstest-online.git
cd gpustresstest-online

# Start local development server
python -m http.server 8000

# Open in browser
# Visit: http://localhost:8000
```

### Project Structure
```
gpustresstest-online/
├── index.html              # Main HTML structure
├── main.js                 # Core application logic
├── style.css               # Responsive styling
├── robots.txt              # SEO robots configuration
├── sitemap.xml             # XML sitemap for search engines
├── _headers                # Netlify headers configuration
├── _redirects              # Netlify redirects configuration
├── README-ThreeJS-Backup.md # Three.js local backup guide
└── README.md               # This file
```

## 🔧 **Browser Compatibility**

### ✅ **Fully Supported**
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### ⚠️ **Fallback Mode**
- Internet Explorer 11 (2D CSS animations)
- Chrome 60-69 (limited WebGL)
- Firefox 50-64 (basic functionality)
- Mobile browsers (optimized experience)

## 🎯 **Performance Benchmarks**

Expected FPS ranges for different hardware:

| Hardware Tier | Light Test | Medium Test | Heavy Test | Extreme Test |
|---------------|------------|-------------|------------|--------------|
| **Entry Level** | 45-60 FPS | 25-35 FPS | 15-25 FPS | 8-15 FPS |
| **Mid-Range** | 60+ FPS | 45-60 FPS | 30-45 FPS | 18-30 FPS |
| **High-End** | 60+ FPS | 60+ FPS | 50-60 FPS | 30-50 FPS |
| **Professional** | 60+ FPS | 60+ FPS | 60+ FPS | 45-60 FPS |

## 🛡️ **Safety Features**

- **Automatic Safety Limits**: Prevents hardware damage
- **Temperature Monitoring**: Simulated thermal tracking
- **Graceful Degradation**: Falls back to safe modes if needed
- **User Control**: Stop test at any time
- **No System Access**: Runs in browser sandbox

## 🔍 **Debugging & Development**

### Debug Functions (Browser Console)
```javascript
// Test button functionality
debugButtonTest()

// Check application state
debugAppState()

// Force level selection display
debugShowLevelSelection()

// Emergency event binding
debugForceEventBinding()
```

### Development Features
- Comprehensive console logging
- Error handling and reporting
- Performance profiling
- Cross-browser compatibility checks

## 🌐 **Deployment**

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Build settings: None required (static site)
3. Deploy directory: Root (/)
4. Custom headers and redirects are pre-configured

### GitHub Pages
1. Go to repository Settings → Pages
2. Select "Deploy from a branch"
3. Choose "main" branch, root folder
4. Your site will be available at `username.github.io/gpustresstest-online`

### Other Platforms
Compatible with any static hosting service:
- Vercel
- Surge.sh
- Firebase Hosting
- Amazon S3 + CloudFront

## 📈 **SEO & Analytics**

- **Google Analytics Ready**: Replace `GA_MEASUREMENT_ID` in index.html
- **Structured Data**: JSON-LD schema for rich snippets
- **Open Graph**: Social media preview optimization
- **Twitter Cards**: Enhanced sharing experience
- **Sitemap & Robots.txt**: Complete search engine optimization

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Areas for Contribution
- Additional GPU detection methods
- More graphics benchmarks
- UI/UX improvements
- Mobile optimization
- Accessibility enhancements
- Translation support

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- [Three.js](https://threejs.org/) - 3D graphics library
- [Chart.js](https://www.chartjs.org/) - Performance charts
- [WebGL](https://www.khronos.org/webgl/) - Graphics API
- Community feedback and contributions

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/kekelele1985I224-Igtm/gpustresstest-online/issues)
- **Documentation**: This README and inline comments
- **Website**: [gpustresstest.online](https://gpustresstest.online)

## 🔗 **Links**

- **Live Site**: [gpustresstest.online](https://gpustresstest.online)
- **Repository**: [GitHub](https://github.com/kekelele1985I224-Igtm/gpustresstest-online)
- **Documentation**: [Three.js Docs](https://threejs.org/docs/)
- **WebGL Support**: [Can I Use WebGL](https://caniuse.com/webgl)

---

**⭐ If you found this useful, please consider giving it a star on GitHub!**

Made with ❤️ for the developer and gaming community.