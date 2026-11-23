import React, { useState, useEffect, useRef } from 'react';

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  imageUrl,
  altText = 'Enlarged Image',
  onClose,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoomScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const nextScale = Math.max(prev - 0.5, 0.5);
      if (nextScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomScale === 1) {
      setZoomScale(2);
    } else {
      handleResetZoom();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setZoomScale((prev) => {
        const next = Math.max(prev - 0.25, 0.5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(imageUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-[#141418]/90 border border-[#27272a] p-2 rounded-2xl shadow-xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="w-9 h-9 flex items-center justify-center bg-[#1f1f24] hover:bg-[#27272a] text-white rounded-xl text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#27272a]"
        >
          🔍+
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="w-9 h-9 flex items-center justify-center bg-[#1f1f24] hover:bg-[#27272a] text-white rounded-xl text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#27272a]"
        >
          🔍-
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          title="Reset Zoom"
          className="px-2.5 h-9 flex items-center justify-center bg-[#1f1f24] hover:bg-[#27272a] text-xs font-semibold text-[#d4d4d8] rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#27272a]"
        >
          {Math.round(zoomScale * 100)}%
        </button>

        <div className="w-[1px] h-6 bg-[#27272a] mx-1" />

        <button
          type="button"
          onClick={handleDownload}
          title="Download Image"
          className="w-9 h-9 flex items-center justify-center bg-[#1f1f24] hover:bg-[#27272a] text-white rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#27272a]"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleOpenInNewTab}
          title="Open in new tab"
          className="w-9 h-9 flex items-center justify-center bg-[#1f1f24] hover:bg-[#27272a] text-white rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#27272a]"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          className="w-9 h-9 flex items-center justify-center bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-xl text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border border-[#f43f5e]"
        >
          ✕
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={altText}
          onClick={handleToggleZoom}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomScale})`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className={`max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl transition-shadow ${
            zoomScale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'
          }`}
        />
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-[#141418]/80 border border-[#27272a] px-4 py-2 rounded-full text-xs text-[#a1a1aa] pointer-events-none backdrop-blur-md">
        Click image to toggle zoom • Scroll or drag to pan • ESC to exit
      </div>
    </div>
  );
};
