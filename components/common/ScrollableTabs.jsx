import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Wrapper para abas com scrollbar horizontal sempre visível.
 * Resolve o problema do macOS que esconde scrollbars por overlay.
 */
function ScrollableTabs({ children, className = '' }) {
  const containerRef = useRef(null);
  const thumbRef = useRef(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);

  const updateThumb = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const ratio = el.clientWidth / el.scrollWidth;
    const width = Math.max(ratio * 100, 10);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollRatio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    const left = scrollRatio * (100 - width);
    setThumbWidth(width);
    setThumbLeft(left);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateThumb();
    el.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);
    return () => {
      el.removeEventListener('scroll', updateThumb);
      window.removeEventListener('resize', updateThumb);
    };
  }, [updateThumb]);

  const handleThumbMouseDown = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = containerRef.current.scrollLeft;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const el = containerRef.current;
      if (!el) return;
      const dx = e.clientX - dragStartX.current;
      const trackWidth = el.clientWidth;
      el.scrollLeft = dragStartScrollLeft.current + (dx / trackWidth) * el.scrollWidth;
    };
    const handleMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleTrackClick = (e) => {
    if (e.target === thumbRef.current) return;
    const el = containerRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  };

  return (
    <div className={`scrollable-tabs-wrapper ${className}`}>
      <div
        ref={containerRef}
        className="scrollable-tabs-inner"
      >
        {children}
      </div>
      <div className="scrollable-tabs-track" onClick={handleTrackClick}>
        <div
          ref={thumbRef}
          className="scrollable-tabs-thumb"
          style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
    </div>
  );
}

export default ScrollableTabs;
