"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

interface ImageCompareDebugProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
  onError?: (error: string) => void;
}

export function ImageCompareDebug({
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
  className,
  aspectRatio = "16/9",
  onError,
}: ImageCompareDebugProps) {
  const { dict } = useLocale();

  // 使用国际化的默认标签
  const finalBeforeLabel = beforeLabel || dict.image.beforeDehaze;
  const finalAfterLabel = afterLabel || dict.image.afterDehaze;

  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState({ before: false, after: false });
  const [hasError, setHasError] = useState({ before: false, after: false });
  const [imageInfo, setImageInfo] = useState({
    before: { width: 0, height: 0 },
    after: { width: 0, height: 0 }
  });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleImageLoad = (type: 'before' | 'after', event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    console.log(`Image loaded: ${type}`, {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: img.width,
      height: img.height
    });

    setImageInfo(prev => ({
      ...prev,
      [type]: { width: img.naturalWidth, height: img.naturalHeight }
    }));

    setIsLoaded(prev => {
      const newState = { ...prev, [type]: true };
      console.log('Load state updated:', newState);
      return newState;
    });
  };

  const handleImageError = (type: 'before' | 'after', src: string) => {
    console.error(`Failed to load ${type} image:`, src);
    onError?.(`Failed to load ${type} image: ${src}`);
    setHasError(prev => ({ ...prev, [type]: true }));
    setIsLoaded(prev => ({ ...prev, [type]: true }));
  };

  const allImagesLoaded = useMemo(() => isLoaded.before && isLoaded.after, [isLoaded]);
  const hasAnyError = useMemo(() => hasError.before || hasError.after, [hasError]);

  return (
    <div className="space-y-4">
      {/* 调试信息 */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm space-y-2">
        <h3 className="font-semibold">调试信息:</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>去雾前图片:</strong></p>
            <p>URL: {beforeImage}</p>
            <p>加载状态: {isLoaded.before ? '✅ 已加载' : '⏳ 加载中'}</p>
            <p>错误状态: {hasError.before ? '❌ 加载失败' : '✅ 正常'}</p>
            <p>尺寸: {imageInfo.before.width} × {imageInfo.before.height}</p>
          </div>
          <div>
            <p><strong>去雾后图片:</strong></p>
            <p>URL: {afterImage}</p>
            <p>加载状态: {isLoaded.after ? '✅ 已加载' : '⏳ 加载中'}</p>
            <p>错误状态: {hasError.after ? '❌ 加载失败' : '✅ 正常'}</p>
            <p>尺寸: {imageInfo.after.width} × {imageInfo.after.height}</p>
          </div>
        </div>
        <p><strong>滑块位置:</strong> {sliderPosition.toFixed(1)}%</p>
        <p><strong>拖拽状态:</strong> {isDragging ? '拖拽中' : '静止'}</p>
        <p><strong>容器宽高比:</strong> {aspectRatio}</p>
      </div>

      {/* 图片对比组件 */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full overflow-hidden rounded-lg bg-muted border-2 border-dashed border-gray-300",
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
            className="w-full h-full object-contain bg-gray-200"
            draggable={false}
            onLoad={(e) => handleImageLoad('after', e)}
            onError={() => handleImageError('after', afterImage)}
          />
          {/* 去雾后标签 */}
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium">
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
            className="w-full h-full object-contain bg-gray-200"
            draggable={false}
            onLoad={(e) => handleImageLoad('before', e)}
            onError={() => handleImageError('before', beforeImage)}
          />
          {/* 去雾前标签 */}
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium">
            {finalBeforeLabel}
          </div>
        </div>

        {/* 分割线和拖拽手柄 */}
        {allImagesLoaded && !hasAnyError && (
          <>
            {/* 分割线 */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-lg z-10"
              style={{ left: `${sliderPosition}%` }}
            />

            {/* 拖拽手柄 */}
            <div
              className={cn(
                "absolute top-1/2 w-10 h-10 -mt-5 -ml-5 z-20",
                "bg-yellow-400 rounded-full shadow-lg border-2 border-white",
                "flex items-center justify-center cursor-ew-resize",
                "hover:bg-yellow-300 transition-colors",
                isDragging && "bg-yellow-300 scale-110"
              )}
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* 拖拽图标 */}
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-white rounded-full" />
                <div className="w-0.5 h-4 bg-white rounded-full" />
              </div>
            </div>
          </>
        )}

        {/* 加载状态 */}
        {!allImagesLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-700">加载中...</div>
              <div className="text-sm text-gray-500 mt-2">
                去雾前: {isLoaded.before ? '✅' : '⏳'} | 去雾后: {isLoaded.after ? '✅' : '⏳'}
              </div>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {hasAnyError && allImagesLoaded && (
          <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {hasError.before && "去雾前图片加载失败"}
            {hasError.before && hasError.after && " | "}
            {hasError.after && "去雾后图片加载失败"}
          </div>
        )}

        {/* 使用说明 */}
        {allImagesLoaded && !hasAnyError && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-md text-xs">
            拖拽黄色滑块来对比图像
          </div>
        )}
      </div>
    </div>
  );
}