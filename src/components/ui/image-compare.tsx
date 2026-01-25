"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

interface ImageCompareProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
  onError?: (error: string) => void;
}

export function ImageCompare({
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
  className,
  aspectRatio = "16/9",
  onError,
}: ImageCompareProps) {
  const { dict } = useLocale();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用国际化的默认标签
  const finalBeforeLabel = beforeLabel || dict.image.beforeDehaze;
  const finalAfterLabel = afterLabel || dict.image.afterDehaze;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden rounded-lg bg-muted",
        "select-none touch-none",
        className
      )}
      style={{ aspectRatio }}
    >
      {/* 去雾后图像 (背景层) */}
      <div className="absolute inset-0">
        <img
          src={afterImage}
          alt={finalAfterLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
        {/* 去雾后标签 */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
          {finalAfterLabel}
        </div>
      </div>

      {/* 去雾前图像 (前景层，通过clip-path裁剪) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
        }}
      >
        <img
          src={beforeImage}
          alt={finalBeforeLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
        {/* 去雾前标签 */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
          {finalBeforeLabel}
        </div>
      </div>

      {/* 分割线和拖拽手柄 */}
      {(
        <>
          {/* 分割线 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
            style={{ left: `${sliderPosition}%` }}
          />

          {/* 拖拽手柄 */}
          <div
            className={cn(
              "absolute top-1/2 w-8 h-8 -mt-4 -ml-4 z-20",
              "bg-white rounded-full shadow-lg border-2 border-gray-300",
              "flex items-center justify-center cursor-ew-resize",
              "hover:bg-gray-50 transition-colors",
              isDragging && "bg-gray-100"
            )}
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* 拖拽图标 */}
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </>
      )}

      {/* 加载状态 */}
      {/* {!allImagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      )} */}

      {/* 错误状态 */}
      {/* {hasAnyError && allImagesLoaded && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          {hasError.before && "去雾前图片加载失败"}
          {hasError.before && hasError.after && " | "}
          {hasError.after && "去雾后图片加载失败"}
        </div>
      )} */}

      {/* 使用说明 */}
      {(
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-md text-xs">
          {dict.image.dragSlider}
        </div>
      )}
    </div>
  );
}