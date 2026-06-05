import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  FileItem, 
  ImageResizeConfig, 
  ResizeMode,
  HistoryItem
} from '../types';
import { 
  calculateTargetSize, 
  resizeImageCanvas, 
  formatBytes 
} from '../utils/imageUtils';
import { 
  Image as ImageIcon, 
  Download, 
  Maximize2, 
  Sliders, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ImageResizerProps {
  onAddHistory: (item: HistoryItem) => void;
}

export default function ImageResizer({ onAddHistory }: ImageResizerProps) {
  const [selectedFileItem, setSelectedFileItem] = useState<FileItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Resizing Configuration State
  const [config, setConfig] = useState<ImageResizeConfig>({
    mode: 'percentage',
    percentage: 80,
    widthPx: 1920,
    heightPx: 1080,
    widthCm: 15.0,
    heightCm: 10.0,
    dpi: 300,
    maintainAspectRatio: true,
    format: 'original',
    quality: 0.85
  });

  // Preview Result State
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string>('');
  const [resizedSize, setResizedSize] = useState<number | null>(null);
  const [resizedWidth, setResizedWidth] = useState<number>(0);
  const [resizedHeight, setResizedHeight] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Drag comparison offset percentage (0 to 100)
  const [compareOffset, setCompareOffset] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSlidingRef = useRef<boolean>(false);

  // Load a sample imagery preset instantly for testing
  const loadPresetSample = async (url: string, prefixName: string) => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${prefixName}_sample.jpg`, { type: 'image/jpeg' });
      handleSelectedFile(file);
    } catch (e) {
      setErrorMsg('Failed to pre-load sample image. Please upload your own.');
      setIsProcessing(false);
    }
  };

  const handleSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    const srcUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const fileItem: FileItem = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        type: 'image',
        sizeBytes: file.size,
        originalWidth: img.width,
        originalHeight: img.height,
        aspectRatio: img.width / img.height,
        srcUrl,
        state: 'idle'
      };

      // Set initial values in resizer configuration
      setConfig(prev => ({
        ...prev,
        widthPx: img.width,
        heightPx: img.height,
        widthCm: parseFloat(((img.width * 2.54) / 300).toFixed(1)),
        heightCm: parseFloat(((img.height * 2.54) / 300).toFixed(1))
      }));

      setSelectedFileItem(fileItem);
      setErrorMsg('');
      setIsProcessing(false);
    };
    img.onerror = () => {
      setErrorMsg('Failed to decode image pixels.');
      setIsProcessing(false);
    };
    img.src = srcUrl;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  // Drag Slider comparison logic
  const handleMouseMove = (e: MouseEvent) => {
    if (!isSlidingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const offset = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setCompareOffset(offset);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSlidingRef.current || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const offset = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setCompareOffset(offset);
  };

  const handleMouseUp = () => {
    isSlidingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
  };

  const handleMouseDown = () => {
    isSlidingRef.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  // Run the canvas compression triggered by config updates
  useEffect(() => {
    if (!selectedFileItem) return;

    let isSubscribed = true;
    const originalWidth = selectedFileItem.originalWidth || 100;
    const originalHeight = selectedFileItem.originalHeight || 100;

    // Calculate intended target widths
    const target = calculateTargetSize(
      originalWidth,
      originalHeight,
      config.mode,
      {
        percentage: config.percentage,
        widthPx: config.widthPx,
        heightPx: config.heightPx,
        widthCm: config.widthCm,
        heightCm: config.heightCm,
        dpi: config.dpi
      },
      config.maintainAspectRatio
    );

    setResizedWidth(target.width);
    setResizedHeight(target.height);

    const mType = config.format === 'original' ? selectedFileItem.file.type : config.format;

    const generatePreview = async () => {
      try {
        setIsProcessing(true);
        const blob = await resizeImageCanvas(
          selectedFileItem.srcUrl,
          target.width,
          target.height,
          mType,
          config.quality,
          config.dpi
        );

        if (isSubscribed) {
          if (resizedUrl) {
            URL.revokeObjectURL(resizedUrl);
          }
          setResizedBlob(blob);
          setResizedUrl(URL.createObjectURL(blob));
          setResizedSize(blob.size);
          setErrorMsg('');
        }
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMsg(err.message || 'Error occurred during resizing operation.');
        }
      } finally {
        if (isSubscribed) {
          setIsProcessing(false);
        }
      }
    };

    // Debounce the preview update to avoid high canvas load during slider movement
    const delayDebounceFn = setTimeout(() => {
      startTransition(() => {
        generatePreview();
      });
    }, 120);

    return () => {
      isSubscribed = false;
      clearTimeout(delayDebounceFn);
    };
  }, [config, selectedFileItem]);

  // Clean object URLs
  useEffect(() => {
    return () => {
      if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    };
  }, [resizedUrl]);

  // Download Trigger
  const handleDownload = () => {
    if (!resizedBlob || !selectedFileItem) return;
    
    // Determine target extension
    let extension = 'jpg';
    if (config.format === 'image/png') extension = 'png';
    else if (config.format === 'image/webp') extension = 'webp';
    else {
      const parts = selectedFileItem.name.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || 'jpg';
      }
    }

    const baseName = selectedFileItem.name.substring(0, selectedFileItem.name.lastIndexOf('.')) || selectedFileItem.name;
    const finalFilename = `${baseName}_resized_${resizedWidth}x${resizedHeight}.${extension}`;

    const link = document.createElement('a');
    link.href = resizedUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save to history storage
    if (resizedSize) {
      onAddHistory({
        id: Math.random().toString(36).substring(2, 9),
        name: selectedFileItem.name,
        type: 'image',
        originalSize: selectedFileItem.sizeBytes,
        newSize: resizedSize,
        savingsPercent: Math.max(0, Math.round(((selectedFileItem.sizeBytes - resizedSize) / selectedFileItem.sizeBytes) * 100)),
        timestamp: Date.now()
      });
    }
  };

  const handleConfigChange = (key: keyof ImageResizeConfig, val: any) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: val };

      // Re-adjust corresponding fields for pixels vs physical vs keep lock
      if (selectedFileItem) {
        const ratio = (selectedFileItem.originalWidth || 1) / (selectedFileItem.originalHeight || 1);
        if (prev.maintainAspectRatio && key === 'widthPx') {
          updated.heightPx = Math.max(1, Math.round(val / ratio));
        } else if (prev.maintainAspectRatio && key === 'heightPx') {
          updated.widthPx = Math.max(1, Math.round(val * ratio));
        } else if (prev.maintainAspectRatio && key === 'widthCm') {
          updated.heightCm = parseFloat((val / ratio).toFixed(2));
        } else if (prev.maintainAspectRatio && key === 'heightCm') {
          updated.widthCm = parseFloat((val * ratio).toFixed(2));
        }
      }
      return updated;
    });
  };

  const setResizeMode = (mode: ResizeMode) => {
    setConfig(prev => ({ ...prev, mode }));
  };

  const triggerReset = () => {
    setSelectedFileItem(null);
    setResizedBlob(null);
    setResizedSize(null);
    setErrorMsg('');
  };

  // Helper labels for compression quality representation
  const getQualityLabel = (val: number) => {
    if (val >= 0.9) return 'Excellent (High Resolution)';
    if (val >= 0.75) return 'Good Quality (Recommended Balance)';
    if (val >= 0.5) return 'Medium Quality (Web Compress)';
    return 'Low Quality (Draft Compact File)';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="image-resizer-module">
      {/* Upload Zone & Interactive Form Preview Section */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Dropzone Area or Compact Image Card */}
        {!selectedFileItem ? (
          <div 
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 relative overflow-hidden backdrop-blur-xl cursor-pointer ${
              isDragging 
                ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.03]'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            id="image-dropzone"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center justify-center space-y-5">
              <div className="p-4 bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 rounded-2xl border border-white/10 shadow-xl text-indigo-400 animate-pulse">
                <ImageIcon className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white font-display">
                  Drag and drop your photo here
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed font-semibold">
                  Lossless in-memory compression for <span className="text-zinc-200 font-mono">JPEG</span>, <span className="text-zinc-200 font-mono">PNG</span>, <span className="text-zinc-200 font-mono">WEBP</span>, <span className="text-zinc-200 font-mono">BMP</span>, and <span className="text-zinc-200 font-mono">GIF</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 py-1">
                <div className="h-px w-8 bg-white/10" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-550">or</span>
                <div className="h-px w-8 bg-white/10" />
              </div>

              <label className="px-6 py-3 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-550 active:scale-95 text-xs text-white font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-650/20 cursor-pointer transition-all duration-250">
                Browse Files
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={onFileChange} 
                />
              </label>

              {/* Sample Mock Presets for Instant Demo Verification */}
              <div className="pt-4">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 font-bold">No photos? Try sample templates</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button 
                    onClick={() => loadPresetSample('https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop', 'artistic_portrait')} 
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold rounded-lg text-zinc-300 transition-colors duration-200 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Renaissance Art</span>
                  </button>
                  <button 
                    onClick={() => loadPresetSample('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200auto=format&fit=crop', 'landscape_valley')} 
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold rounded-lg text-zinc-300 transition-colors duration-200 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>Yosemite Valley</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Image View */
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="max-w-[150px] sm:max-w-xs md:max-w-md">
                  <p className="text-sm font-semibold text-white truncate font-display">{selectedFileItem.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Original dimensions: <strong className="font-mono text-indigo-300">{selectedFileItem.originalWidth}x{selectedFileItem.originalHeight} px</strong> • Size: <strong className="font-mono text-indigo-300">{formatBytes(selectedFileItem.sizeBytes)}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={triggerReset}
                className="px-3.5 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 hover:text-red-400 text-zinc-350 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer"
              >
                Change Image
              </button>
            </div>

            {/* Split Drag Comparison Preview */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-semibold text-zinc-450">
                <span>Visual Comparison (Slide cursor over photo to compare quality)</span>
                <span className="font-mono bg-[#0d0e1b] border border-white/5 px-2 py-0.5 rounded text-zinc-400">Split: {Math.round(compareOffset)}%</span>
              </div>
              
              <div 
                ref={containerRef}
                className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden bg-black/30 border border-white/10 select-none cursor-ew-resize shadow-inner"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                {/* original image (Background/Left-side representation) */}
                <img 
                  src={selectedFileItem.srcUrl} 
                  alt="Original" 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                
                {/* Split line layout labels */}
                <span className="absolute top-4 left-4 px-2.5 py-1 bg-[#0d0e1b]/80 text-white font-mono text-[9px] rounded-lg border border-white/10 backdrop-blur-md font-extrabold tracking-widest uppercase z-20">
                  Original
                </span>

                {/* Resized rendering (Right-side container overlays original based on clipPath) */}
                {resizedUrl && (
                  <div 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ clipPath: `polygon(${compareOffset}% 0, 100% 0, 100% 100%, ${compareOffset}% 100%)` }}
                  >
                    <img 
                      src={resizedUrl} 
                      alt="Resized" 
                      className="absolute inset-0 w-full h-full object-contain bg-[#070813]/60 backdrop-blur-sm"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-4 right-4 px-2.5 py-1 bg-gradient-to-r from-violet-650 to-indigo-600 text-white font-mono text-[9px] rounded-lg border border-white/10 backdrop-blur-md font-extrabold tracking-widest uppercase z-20">
                      Resized
                    </span>
                  </div>
                )}

                {/* Vertical Divider handle */}
                <div 
                  className="absolute top-0 bottom-0 w-[1.5px] bg-white/40 z-30 pointer-events-none"
                  style={{ left: `${compareOffset}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-650/95 text-white shadow-xl flex items-center justify-center border border-white/20">
                    <Maximize2 className="w-3.5 h-3.5 rotate-45" />
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-40">
                    <div className="flex flex-col items-center space-y-2.5 text-white">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                      <span className="text-xs font-bold tracking-wider font-mono bg-[#0d0e1b] border border-white/10 px-3 py-1.5 rounded-xl uppercase">Compacting Canvas...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Error Output alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-2xl flex items-start space-x-3 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-105" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Resize Preferences Form Side Panel */}
      <div className="lg:col-span-5 bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-white/10">
          <Sliders className="w-5 h-5 text-indigo-400 font-bold" />
          <h2 className="text-xs font-extrabold text-zinc-100 uppercase tracking-widest font-display">Resize Configuration</h2>
        </div>        {/* Tab Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block font-sans">Resize Method</label>
          <div className="grid grid-cols-3 gap-1 bg-[#0d0e1b] p-1 rounded-xl border border-white/5">
            {(['percentage', 'pixels', 'physical'] as ResizeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setResizeMode(mode)}
                className={`py-2 text-[11.5px] font-semibold rounded-lg capitalize transition-all duration-200 cursor-pointer ${
                  config.mode === mode 
                    ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white font-bold shadow-md shadow-indigo-550/15' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'percentage' ? 'Percentage' : mode === 'pixels' ? 'Pixels' : 'Print Scale'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Inputs according to the selected mode */}
        <div className="space-y-4">
          
          {config.mode === 'percentage' && (
            <div className="space-y-3 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              <div className="flex justify-between items-center whitespace-nowrap">
                <span className="text-xs font-semibold text-zinc-350">Set Percentage Scale</span>
                <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">{config.percentage}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={config.percentage}
                onChange={(e) => handleConfigChange('percentage', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[9px] text-zinc-450 font-mono font-bold">
                <span>1% (Draft)</span>
                <span>100% (Original)</span>
                <span>300% (Scale)</span>
              </div>
            </div>
          )}          {config.mode === 'pixels' && (
            <div className="space-y-4 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Width (px)</label>
                  <input 
                    type="number" 
                    value={config.widthPx} 
                    onChange={(e) => handleConfigChange('widthPx', Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!selectedFileItem}
                    className="w-full px-3 py-2 text-xs font-semibold font-mono bg-[#0d0e1b] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-250 disabled:opacity-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Height (px)</label>
                  <input 
                    type="number" 
                    value={config.heightPx} 
                    onChange={(e) => handleConfigChange('heightPx', Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!selectedFileItem}
                    className="w-full px-3 py-2 text-xs font-semibold font-mono bg-[#0d0e1b] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-250 disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 border-t border-white/5">
                <button
                  onClick={() => handleConfigChange('maintainAspectRatio', !config.maintainAspectRatio)}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                    config.maintainAspectRatio 
                      ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' 
                      : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                  title="Lock Aspect Ratio"
                >
                  {config.maintainAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <span className="text-[11px] text-zinc-400 font-semibold">
                  {config.maintainAspectRatio ? 'Aspect ratio is locked' : 'Aspect ratio is unlocked'}
                </span>
              </div>
            </div>
          )}

          {config.mode === 'physical' && (
            <div className="space-y-4 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              <p className="text-[10px] text-zinc-450 leading-relaxed font-semibold font-sans">
                Define the printing specifications in Centimeters (cm) and Dots Per Inch (DPI):
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Width (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={config.widthCm} 
                    onChange={(e) => handleConfigChange('widthCm', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    disabled={!selectedFileItem}
                    className="w-full px-3 py-2 text-xs font-semibold font-mono bg-[#0d0e1b] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-250 disabled:opacity-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Height (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={config.heightCm} 
                    onChange={(e) => handleConfigChange('heightCm', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    disabled={!selectedFileItem}
                    className="w-full px-3 py-2 text-xs font-semibold font-mono bg-[#0d0e1b] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-250 disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1 border-t border-white/5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Print Resolution (DPI)</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="number" 
                    value={config.dpi} 
                    onChange={(e) => handleConfigChange('dpi', Math.max(72, parseInt(e.target.value) || 72))}
                    className="w-24 px-3 py-2 text-xs font-semibold font-mono bg-[#0d0e1b] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-250"
                  />
                  <div className="flex-1 flex gap-1 bg-[#0d0e1b] p-1 rounded-xl border border-white/5">
                    {[72, 150, 300, 600].map(val => (
                      <button
                        key={val}
                        onClick={() => handleConfigChange('dpi', val)}
                        className={`flex-1 py-1 text-[10px] font-mono rounded cursor-pointer transition-all ${
                          config.dpi === val 
                            ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white font-bold' 
                            : 'text-zinc-455 hover:text-zinc-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Quality Preference Slider (JPEG/WebP only) */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/10 rounded-xl">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">Compression Quality</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{Math.round(config.quality * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={Math.round(config.quality * 100)}
            onChange={(e) => handleConfigChange('quality', parseFloat((parseInt(e.target.value) / 100).toFixed(2)))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
          />
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between font-medium">
            <span>Compact size</span>
            <span>{getQualityLabel(config.quality)}</span>
          </p>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Convert Output Format</label>
          <div className="grid grid-cols-4 gap-1.5 bg-[#0d0e1b] p-1 rounded-xl border border-white/5">
            {[
              { id: 'original', label: 'Match' },
              { id: 'image/jpeg', label: 'JPEG' },
              { id: 'image/png', label: 'PNG' },
              { id: 'image/webp', label: 'WebP' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleConfigChange('format', item.id)}
                className={`py-2 text-[11px] font-semibold rounded-lg transition-all duration-150 ${
                  config.format === item.id 
                    ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white font-bold shadow-md shadow-indigo-500/10' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Output Comparison Details & Savings indicator */}
        {selectedFileItem && resizedSize && (
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3.5 backdrop-blur-md">
            <h4 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider font-sans">Estimated File Impact</h4>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-zinc-400 font-sans">Target Resolution</span>
              <span className="text-xs font-bold text-zinc-200 font-mono bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                {resizedWidth} × {resizedHeight} px
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-400 font-semibold font-sans">Size Change</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-500 line-through font-mono">
                  {formatBytes(selectedFileItem.sizeBytes)}
                </span>
                <span className="text-xs text-[#2b2e53]">→</span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-white font-extrabold font-mono">
                  {formatBytes(resizedSize)}
                </span>
              </div>
            </div>

            {selectedFileItem.sizeBytes > resizedSize && (
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-extrabold text-emerald-400 font-sans">
                <span className="flex items-center gap-1 uppercase tracking-wider font-sans text-[10px]">
                  <Sparkles className="w-3.5 h-3.5" /> Optimize Status
                </span>
                <span>
                  Saved {Math.max(0, Math.round(((selectedFileItem.sizeBytes - resizedSize) / selectedFileItem.sizeBytes) * 100))}% off file size!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Download Output Controller action */}
        <button
          onClick={handleDownload}
          disabled={!selectedFileItem || isProcessing || !resizedBlob}
          className="w-full py-4 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-550 hover:to-indigo-550 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl shadow-xl shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-200"
        >
          <Download className="w-5 h-5 font-bold" />
          <span>Save &amp; Download Photo</span>
        </button>

      </div>
    </div>
  );
}
