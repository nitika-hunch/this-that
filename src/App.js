import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

export default function App() {
  const [myImg, setMyImg] = useState(null);
  const [otherImg, setOtherImg] = useState(null);
  const [otherName, setOtherName] = useState('');
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const previewRef = useRef();

  const clearAll = () => {
    setMyImg(null);
    setOtherImg(null);
    setOtherName('');
    setQuestion('');
    setOption1('');
    setOption2('');
  };

  const handleImg = (e, setImg) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Highlight only quoted content as pink, but remove quotes from display
  const renderOption = (text) => {
    if (!text) return '';
    const parts = [];
    const regex = /"([^"]+)"/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span className="opt-black" key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<span className="opt-pink" key={key++}>{match[1]}</span>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span className="opt-black" key={key++}>{text.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, {backgroundColor: null, useCORS: true, scrollY: -window.scrollY});
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `you-and-${otherName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const readyToDownload = myImg && otherImg && otherName && question && option1 && option2;

  return (
    <div className="app-root">
      <div className="form-section">
        <label>My Image <input type="file" accept="image/*" onChange={e => handleImg(e, setMyImg)} /></label>
        <label>Other User's Image <input type="file" accept="image/*" onChange={e => handleImg(e, setOtherImg)} /></label>
        <label>Other User Name <input type="text" value={otherName} onChange={e => setOtherName(e.target.value)} /></label>
        <label>Question <input type="text" value={question} onChange={e => setQuestion(e.target.value)} /></label>
        <label>Option 1 <input type="text" value={option1} onChange={e => setOption1(e.target.value)} /></label>
        <label>Option 2 <input type="text" value={option2} onChange={e => setOption2(e.target.value)} /></label>
        <div className="form-buttons">
          <button onClick={readyToDownload ? handleDownload : undefined} disabled={!readyToDownload}>Download Image</button>
          <button type="button" className="clear" onClick={clearAll}>Clear</button>
        </div>
      </div>
      <div className="preview-section">
        <div className="mock-card" ref={previewRef}>
          <div className="mock-header">
            <div className="mock-title">You &amp; {otherName || '_____'}</div>
            <div className="mock-byhunch">by <span>hunch</span></div>
          </div>
          <div className="mock-question">
            {question || <span style={{opacity:0.4}}>Your question?</span>}
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
      </div>
    </div>
  );
}
