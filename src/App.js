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
        console.error('Error reading file: ', reader.error);
        alert('Error loading image. Please try again. ');
      };
      reader.readAsDataURL(file);
    }
  };

    // Highlight text between underscores as pink, rest as black (remove underscores, replace closing underscore with space)
  const renderOption = (text) => {
    if (!text) return '';
    const parts = [];
    // Match text between two underscores: _text_
    const regex = /_([^_]+)_/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    let foundMatch = false;
    
    while ((match = regex.exec(text)) !== null) {
      foundMatch = true;
      // Add text before the opening underscore
      if (match.index > lastIndex) {
        parts.push(<span className="opt-black" key={key++} style={{ color: '#222' }}>{text.slice(lastIndex, match.index)}</span>);
      }
      // Add underscored content in pink (no underscores) - use inline style to ensure it works on mobile
      parts.push(<span className="opt-pink" key={key++} style={{ color: '#ba0865' }}>{match[1]}</span>);
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text after the last underscore (with leading space if there was a match)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      // If we found a match and there's remaining text, add space at start if not already present
      const needsLeadingSpace = foundMatch && remainingText.length > 0 && !remainingText.startsWith(' ');
      const textToAdd = needsLeadingSpace ? ' ' + remainingText : remainingText;
      parts.push(<span className="opt-black" key={key++} style={{ color: '#222' }}>{textToAdd}</span>);
    }
    
    // If no underscores found, return all text as black
    if (parts.length === 0) {
      return <span className="opt-black" style={{ color: '#222' }}>{text}</span>;
    }
    
    // Wrap in a span to preserve inline flow (spaces between inline elements)
    return <span style={{ whiteSpace: 'normal', wordBreak: 'normal', display: 'inline' }}>{parts}</span>;
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
      await new Promise(resolve => setTimeout(resolve, isMobileDevice ? 1000 : 200));

      // Get the element to capture
      const element = previewRef.current;
      
      // On mobile, use pixelRatio of 1 to match exact rendering (avoid scaling issues)
      // Desktop can use higher pixelRatio for better quality
      const pixelRatio = isMobileDevice ? 1 : 2;
      
      // Wait for fonts to load before capture to ensure text renders correctly
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 200)); // Additional delay after fonts load
      }
      
      // Fix text container widths to prevent canvas rendering differences
      // Canvas measures text slightly differently, so we ensure containers have explicit widths
      const textContainers = element.querySelectorAll('.img-pill-caption');
      textContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        // Ensure width is explicitly set to match actual rendered width
        if (rect.width > 0) {
          container.style.width = rect.width + 'px';
        }
        // Also fix the inner text wrapper
        const textWrapper = container.querySelector('span');
        if (textWrapper) {
          const textRect = textWrapper.getBoundingClientRect();
          if (textRect.width > 0) {
            // Don't set width on wrapper, let it flow naturally but ensure parent has fixed width
          }
        }
      });
      
      // Small delay to let style changes apply
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Use html-to-image to convert to JPG with options to handle images
      const dataUrl = await toJpeg(element, {
        backgroundColor: '#ffffff',
        quality: 0.95,
        pixelRatio: pixelRatio,
        cacheBust: true,
        includeQueryParams: true,
        filter: (node) => {
          // Don't filter out any nodes - include everything
          return true;
        },
      });
      
      // Restore original widths after capture
      textContainers.forEach(container => {
        container.style.width = '';
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
          // iOS: Display image in current page with instructions
          // Create a modal/overlay to show the image
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
          
          const instructions = document.createElement('div');
          instructions.style.cssText = 'color:white;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;margin-bottom:20px;font-weight:600;';
          instructions.textContent = 'Tap and hold the image, then tap "Save to Photos"';
          
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = 'hunch-card';
          img.style.cssText = 'max-width:100%;height:auto;border-radius:12px;';
          
          const closeBtn = document.createElement('button');
          closeBtn.textContent = 'Close';
          closeBtn.style.cssText = 'margin-top:20px;padding:10px 20px;background:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;';
          closeBtn.onclick = () => document.body.removeChild(overlay);
          
          overlay.appendChild(instructions);
          overlay.appendChild(img);
          overlay.appendChild(closeBtn);
          document.body.appendChild(overlay);
          
          // Also try to open in new tab as backup
          setTimeout(() => {
            const newWindow = window.open();
            if (newWindow) {
              const htmlContent = '<!DOCTYPE html><html><head>' +
                '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">' +
                '<title>Save Image</title>' +
                '<style>body{margin:0;padding:20px;background:#000;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh}' +
                'img{max-width:100%;height:auto;border-radius:12px}' +
                '.instructions{color:white;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;margin-bottom:20px;font-weight:600}' +
                '</style></head><body>' +
                '<div class="instructions">Tap and hold the image, then tap "Save to Photos"</div>' +
                '<img src="' + dataUrl + '" alt="hunch-card" />' +
                '</body></html>';
              newWindow.document.write(htmlContent);
              newWindow.document.close();
            }
          }, 100);
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
      </div>
    </div>
  );
}
