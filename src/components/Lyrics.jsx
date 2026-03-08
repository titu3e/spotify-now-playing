import { useRef, useEffect } from 'react';
import './Lyrics.css';

export default function Lyrics({ lines, activeIndex, isSynced }) {
  const listRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!lines || lines.length === 0) {
    return (
      <div className="lyrics-empty">
        <p>No lyrics available for this track</p>
      </div>
    );
  }

  return (
    <div className="lyrics-wrapper">
      <div className="lyrics-fade lyrics-fade-top" />
      <ul className="lyrics-list" ref={listRef}>
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;

          return (
            <li
              key={i}
              ref={isActive ? activeRef : null}
              className={[
                'lyrics-line',
                isActive ? 'active' : '',
                isPast ? 'past' : '',
                !line.text ? 'lyrics-spacer' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {line.text || '\u00A0'}
            </li>
          );
        })}
      </ul>
      <div className="lyrics-fade lyrics-fade-bottom" />
      {!isSynced && (
        <p className="lyrics-plain-note">Plain lyrics (no timestamps available)</p>
      )}
    </div>
  );
}
