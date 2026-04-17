"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
import useMeasure from 'react-use-measure';
import { Button } from '@/components/ui/button';
import { Undo, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Konva from 'konva';

interface MaskCanvasProps {
  imageUrl: string;
  onMaskChange: (lines: LineData[]) => void;
  className?: string;
}

export type LineData = {
  points: number[];
  brushSize: number;
};

// Custom hook to load an image for Konva
const useImage = (url: string) => {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.src = url;
    img.crossOrigin = 'Anonymous';
    img.onload = () => setImage(img);
  }, [url]);

  return image;
};

export const MaskCanvas = ({ imageUrl, onMaskChange, className }: MaskCanvasProps) => {
  const [ref, bounds] = useMeasure();
  const image = useImage(imageUrl);
  
  const [lines, setLines] = useState<LineData[]>([]);
  const isDrawing = useRef(false);
  const [brushSize, setBrushSize] = useState(20);
  const [showMask, setShowMask] = useState(true);

  // Scaled dimensions to fit container
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (image && bounds.width > 0 && bounds.height > 0) {
      const containerRatio = bounds.width / bounds.height;
      const imageRatio = image.width / image.height;

      let newWidth = bounds.width;
      let newHeight = bounds.height;

      if (containerRatio > imageRatio) {
        newWidth = bounds.height * imageRatio;
        newHeight = bounds.height;
      } else {
        newWidth = bounds.width;
        newHeight = bounds.width / imageRatio;
      }

      setImgSize({ width: newWidth, height: newHeight });
      setScale(newWidth / image.width);
    }
  }, [image, bounds]);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    // Normalize points based on scale so mask reflects actual image dimensions
    setLines([...lines, { points: [pos.x / scale, pos.y / scale], brushSize: brushSize / scale }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    let lastLine = lines[lines.length - 1];
    
    // Add point scaled back to un-scaled dimensions
    lastLine.points = lastLine.points.concat([point.x / scale, point.y / scale]);
    
    // Replace last
    const newLines = lines.slice(0, lines.length - 1).concat(lastLine);
    setLines(newLines);
    onMaskChange(newLines);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const undo = (e: React.MouseEvent) => {
    e.preventDefault();
    const newLines = lines.slice(0, -1);
    setLines(newLines);
    onMaskChange(newLines);
  };

  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    setLines([]);
    onMaskChange([]);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold capitalize text-muted-foreground">Brush Size</label>
        <input 
          type="range" 
          min="5" max="100" 
          value={brushSize} 
          onChange={(e) => setBrushSize(parseInt(e.target.value))} 
          className="w-32 accent-primary" 
        />
      </div>
      
      <div 
        ref={ref} 
        className="w-full aspect-square bg-black border border-border rounded-xl overflow-hidden relative flex items-center justify-center cursor-crosshair"
      >
        {image && imgSize.width > 0 ? (
          <Stage
            width={imgSize.width}
            height={imgSize.height}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              <KonvaImage 
                image={image}
                width={imgSize.width}
                height={imgSize.height}
              />
              {showMask && lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke="rgba(239,68,68,0.5)" // Red-500 semi transparent
                  strokeWidth={line.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  scaleX={scale}
                  scaleY={scale}
                  globalCompositeOperation="source-over"
                />
              ))}
            </Layer>
          </Stage>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse text-sm">
            Loading canvas...
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={undo} disabled={lines.length === 0} className="w-1/3">
          <Undo className="w-4 h-4 mr-2" /> Undo
        </Button>
        <Button variant="secondary" size="sm" onClick={clear} disabled={lines.length === 0} className="w-1/3 text-error hover:text-error hover:bg-error/10">
          <Trash2 className="w-4 h-4 mr-2" /> Clear
        </Button>
        <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); setShowMask(!showMask); }} className="w-1/3">
          {showMask ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showMask ? 'Hide' : 'Show'}
        </Button>
      </div>
    </div>
  );
};
