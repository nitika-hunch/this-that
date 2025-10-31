import React, { useState, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import './App.css';

export default function App() {
  const [myImg, setMyImg] = useState(null);
  const [otherImg, setOtherImg] = useState(null);
  const [otherName, setOtherName] = useState('');
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const previewRef = useRef();
  // Refs for accessible file input triggers
  const myImgInputRef = useRef();
  const otherImgInputRef = useRef();

  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('App component mounted');
    console.log('myImg state:', myImg ? 'has image' : 'no image');
    console.log('otherImg state:', otherImg ? 'has image' : 'no image');
  }, [myImg, otherImg]);

  const clearAll = () => {
    setMyImg(null);
    setOtherImg(null);
    setOtherName('');
    setQuestion('');
    setOption1('');
    setOption2('');
    if (myImgInputRef.current) myImgInputRef.current.value = '';
    if (otherImgInputRef.current) otherImgInputRef.current.value = '';
  };

  const handleImg = (e, setImg) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImg(reader.result);
        } else {
          console.error('Failed to read image file');
          alert('Failed to load image. Please try again.');
        }
      };
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        alert('Error loading image. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

    // Highlight text between double quotes as pink, rest as black (remove quotes, replace closing quote with space)
  const renderOption = (text) => {
    if (!text) return '';
    const parts = [];
    const regex = /"([^"]+)"/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    let foundMatch = false;
    
    while ((match = regex.exec(text)) !== null) {
      foundMatch = true;
      // Add text before the opening quote
      if (match.index > lastIndex) {
        parts.push(<span className="opt-black" key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }
      // Add quoted content in pink (no quotes)
      parts.push(<span className="opt-pink" key={key++}>{match[1]}</span>);
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text after the last quote (with leading space if there was a quote)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      // If we found a match and there's remaining text, add space at start if not already present
      const needsLeadingSpace = foundMatch && remainingText.length > 0 && !remainingText.startsWith(' ');
      const textToAdd = needsLeadingSpace ? ' ' + remainingText : remainingText;
      parts.push(<span className="opt-black" key={key++}>{textToAdd}</span>);
    }
    
    // If no quotes found, return all text as black
    if (parts.length === 0) {
      return <span className="opt-black">{text}</span>;
    }
    
    // Wrap in a span to preserve inline flow (spaces between inline elements)
    return <span>{parts}</span>;
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;

    // Suppress CSS SecurityError warnings from html-to-image (cross-origin stylesheet access)
    const originalError = console.error;
    const suppressedErrors = [];
    console.error = (...args) => {
      const errorMsg = args.join(' ');
      // Only suppress SecurityError related to CSS rules (common with Google Fonts)
      if (errorMsg.includes('SecurityError') && errorMsg.includes('cssRules')) {
        suppressedErrors.push(args);
        return; // Suppress this error
      }
      originalError.apply(console, args); // Log other errors normally
    };

    try {
      // Wait for all images to load completely
      const images = previewRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          // If image is already loaded, verify it's valid
          if (img.complete && img.naturalHeight !== 0 && img.naturalWidth !== 0) {
            return Promise.resolve();
          }
          // Wait for image to load
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('Image load timeout:', img.src.substring(0, 50));
              resolve(); // Continue even if timeout
            }, 3000); // Increased timeout
            
            img.onload = () => {
              clearTimeout(timeout);
              // Double-check image is actually loaded
              if (img.complete && img.naturalHeight !== 0 && img.naturalWidth !== 0) {
                resolve();
              } else {
                console.warn('Image loaded but invalid dimensions');
                resolve(); // Continue anyway
              }
            };
            img.onerror = () => {
              clearTimeout(timeout);
              console.error('Image failed to load:', img.src.substring(0, 50));
              resolve(); // Continue even if image fails
            };
          });
        })
      );

      // Verify all images are actually loaded and have dimensions
      const imageChecks = Array.from(images).map((img) => {
        return new Promise((resolve) => {
          // For base64 images, they should load immediately
          if (img.src.startsWith('data:')) {
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              resolve(true);
            } else {
              // Wait a bit more for data URLs
              setTimeout(() => {
                resolve(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
              }, 200);
            }
          } else {
            // For external images
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              resolve(true);
            } else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              setTimeout(() => resolve(false), 2000);
            }
          }
        });
      });

      await Promise.all(imageChecks);
      
      // Detect mobile for timing adjustments
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Add a delay to ensure all rendering is complete (longer on mobile)
      await new Promise(resolve => setTimeout(resolve, isMobileDevice ? 500 : 200));

      
      // Use html-to-image to convert to JPG with options to handle images
      const dataUrl = await toJpeg(previewRef.current, {
        backgroundColor: '#ffffff',
        quality: 0.95, // JPG quality (0-1)
        pixelRatio: isMobileDevice ? 1.5 : 2, // Lower pixel ratio on mobile to avoid memory issues
        cacheBust: true, // Prevent caching issues
        // Ensure all images are included
        includeQueryParams: true,
        filter: (node) => {
          // Don't filter out any nodes - include everything
          return true;
        },
        // Mobile-specific options
        style: isMobileDevice ? {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        } : undefined,
      });

      // Download as JPG - handle mobile vs desktop differently
      const link = document.createElement('a');
      link.href = dataUrl;
      
      // Detect mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile browsers have limited download support
        if (isIOS) {
          // iOS: Open image in new window so user can long-press to save
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                  <title>Save Image</title>
                  <style>
                    body {
                      margin: 0;
                      padding: 20px;
                      background: #000;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      min-height: 100vh;
                    }
                    img {
                      max-width: 100%;
                      height: auto;
                      border-radius: 12px;
                    }
                    .instructions {
                      position: absolute;
                      top: 20px;
                      left: 20px;
                      right: 20px;
                      color: white;
                      text-align: center;
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                      font-size: 14px;
                    }
                  </style>
                </head>
                <body>
                  <div class="instructions">Long press the image to save it</div>
                  <img src="${dataUrl}" alt="hunch-card" />
                </body>
              </html>
            `);
            newWindow.document.close();
          } else {
            // Fallback: show image in current window
            alert('Please allow pop-ups, then long-press the image to save it.');
            window.location.href = dataUrl;
          }
        } else {
          // Android: Try download, fallback to opening
          try {
            link.download = 'hunch-card.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Also provide option to view
            setTimeout(() => {
              if (confirm('Image download started. Would you like to view it in a new tab?')) {
                window.open(dataUrl, '_blank');
              }
            }, 500);
          } catch (e) {
            // Fallback: open in new tab
            window.open(dataUrl, '_blank');
          }
        }
      } else {
        // Desktop: standard download
        link.download = 'hunch-card.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      originalError('Error generating image:', error);
      alert('Failed to download image: ' + (error.message || 'Unknown error'));
    } finally {
      // Restore original console.error
      console.error = originalError;
    }
  };

  const readyToDownload = myImg && otherImg && question && option1 && option2;

  return (
    <div className="app-root">
      <div className="form-section">
        <div className="input-group">
          <label htmlFor="myImgInput">My Image</label>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="myImgInput"
            ref={myImgInputRef}
            onChange={e => handleImg(e, setMyImg)}
            aria-label="Select your image"
          />
          <button
            type="button"
            className="img-upload-btn"
            onClick={() => myImgInputRef.current && myImgInputRef.current.click()}
            aria-label="Select your image"
          >
            Select Image
          </button>
        </div>
        <div className="input-group">
          <label htmlFor="otherImgInput">Other User's Image</label>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="otherImgInput"
            ref={otherImgInputRef}
            onChange={e => handleImg(e, setOtherImg)}
            aria-label="Select other user's image"
          />
          <button
            type="button"
            className="img-upload-btn"
            onClick={() => otherImgInputRef.current && otherImgInputRef.current.click()}
            aria-label="Select other user's image"
          >
            Select Image
          </button>
        </div>

        <label htmlFor="othernameinput">Other User Name
          <input id="othernameinput" type="text" value={otherName} onChange={e => setOtherName(e.target.value)} autoComplete="name" inputMode="text" placeholder="e.g., Dan" />
        </label>
        <label htmlFor="questioninput">Question
          <input id="questioninput" type="text" value={question} onChange={e => setQuestion(e.target.value)} autoComplete="off" inputMode="text" placeholder="Type your question" />
        </label>
        <label htmlFor="option1input">Option 1
          <input id="option1input" type="text" value={option1} onChange={e => setOption1(e.target.value)} autoComplete="off" inputMode="text" placeholder="Option 1" />
        </label>
        <label htmlFor="option2input">Option 2
          <input id="option2input" type="text" value={option2} onChange={e => setOption2(e.target.value)} autoComplete="off" inputMode="text" placeholder="Option 2" />
        </label>
        <div className="form-buttons">
          <button type="button" className="clear" onClick={clearAll}>Clear</button>
        </div>
      </div>
      <div className="preview-section">
        <div className="mock-card" ref={previewRef}>
          <div className="mock-header">
            <img src="/hunch-logo.png" alt="hunch" className="brand-hunch-logo" />
          </div>
          <div className="mock-question-container">
            <div className="mock-question">
              {question || <span style={{opacity:0.4}}>Your question?</span>}
            </div>
          </div>
          <div className="mock-img-row">
            <div className="mock-img-left">
              {myImg ? (
                <img 
                  src={myImg} 
                  alt="Left" 
                  onError={(e) => {
                    console.error('Image 1 failed to load:', myImg?.substring(0, 50));
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => console.log('Image 1 loaded successfully')}
                />
              ) : (
                <div className="mock-placeholder">Image 1</div>
              )}
              <div className="img-pill-caption">
                {renderOption(option1)}
              </div>
            </div>
            <div className="mock-img-right">
              {otherImg ? (
                <img 
                  src={otherImg} 
                  alt="Right" 
                  onError={(e) => {
                    console.error('Image 2 failed to load:', otherImg?.substring(0, 50));
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => console.log('Image 2 loaded successfully')}
                />
              ) : (
                <div className="mock-placeholder">Image 2</div>
              )}
              <div className="img-pill-caption">
                {renderOption(option2)}
              </div>
            </div>
          </div>
        </div>
        <button 
          type="button" 
          className="download-btn"
          onClick={handleDownload}
          disabled={!readyToDownload}
        >
          Download Image
        </button>
      </div>
    </div>
  );
}
