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
      reader.onloadend = () => setImg(reader.result);
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
      // Wait for all images to load
      const images = previewRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
            setTimeout(resolve, 1000); // Timeout after 1 second
          });
        })
      );

      // Use html-to-image to convert to JPG
      const dataUrl = await toJpeg(previewRef.current, {
        backgroundColor: '#ffffff',
        quality: 0.95, // JPG quality (0-1)
        pixelRatio: 2 // High resolution
      });

      // Download as JPG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'hunch-card.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              {myImg ? (<img src={myImg} alt="Left" />) : (<div className="mock-placeholder">Image 1</div>)}
              <div className="img-pill-caption">
                {renderOption(option1)}
              </div>
            </div>
            <div className="mock-img-right">
              {otherImg ? (<img src={otherImg} alt="Right" />) : (<div className="mock-placeholder">Image 2</div>)}
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
