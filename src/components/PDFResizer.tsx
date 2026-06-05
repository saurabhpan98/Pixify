import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  FileItem, 
  PDFResizeConfig, 
  PDFPresetType, 
  PDFResizeMode, 
  HistoryItem 
} from '../types';
import { formatBytes } from '../utils/imageUtils';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Sliders, 
  AlertCircle, 
  Check, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  Layout,
  FileCode,
  Scale
} from 'lucide-react';

interface PDFResizerProps {
  onAddHistory: (item: HistoryItem) => void;
}

export default function PDFResizer({ onAddHistory }: PDFResizerProps) {
  const [selectedFileItem, setSelectedFileItem] = useState<FileItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // PDF configuration state
  const [config, setConfig] = useState<PDFResizeConfig>({
    mode: 'scale',
    scale: 0.75, // default to 75% scale to save space
    preset: 'A4',
    compressImages: true,
    quality: 0.75
  });

  const [pageCount, setPageCount] = useState<number>(0);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number; displayLabel: string } | null>(null);

  // Output States
  const [resizedPdfBlob, setResizedPdfBlob] = useState<Blob | null>(null);
  const [resizedPdfUrl, setResizedPdfUrl] = useState<string>('');
  const [resizedSize, setResizedSize] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleSelectedFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF document.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg(false);
    
    try {
      const srcUrl = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      setPageCount(pageCount);

      if (pageCount > 0) {
        const firstPage = pdfDoc.getPages()[0];
        const { width, height } = firstPage.getSize();
        
        // Convert Adobe points (1/72 inch) to physical sizes inside cm and inches
        const wCm = (width * 2.54) / 72;
        const hCm = (height * 2.54) / 72;
        
        let label = 'Custom Size';
        // Check popular dimension approximations
        if (Math.abs(width - 595.27) < 5 && Math.abs(height - 841.89) < 5) label = 'A4 Page';
        else if (Math.abs(width - 612) < 5 && Math.abs(height - 792) < 5) label = 'US Letter';
        else if (Math.abs(width - 612) < 5 && Math.abs(height - 1008) < 5) label = 'Legal Page';
        else if (Math.abs(width - 841.89) < 5 && Math.abs(height - 1190.55) < 5) label = 'A3 Page';

        setOriginalDimensions({
          width,
          height,
          displayLabel: `${label} (${wCm.toFixed(1)} x ${hCm.toFixed(1)} cm)`
        });
      }

      const fileItem: FileItem = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        type: 'pdf',
        sizeBytes: file.size,
        srcUrl,
        state: 'idle'
      };

      setSelectedFileItem(fileItem);
      // Clean up previous URLs
      if (resizedPdfUrl) URL.revokeObjectURL(resizedPdfUrl);
      setResizedPdfBlob(null);
      setResizedPdfUrl('');
      setResizedSize(null);
    } catch (e: any) {
      setErrorMsg('Failed to parse and decode PDF page structures. Note: Encrypted/password-protected PDFs are not supported for safety.');
    } finally {
      setIsProcessing(false);
    }
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

  // Main pdf-lib scaling and output compilation engine
  const handleProcessPDF = async () => {
    if (!selectedFileItem) return;

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg(false);

    try {
      const fileArrayBuffer = await selectedFileItem.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileArrayBuffer);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();

        if (config.mode === 'scale') {
          // Scale page dimensions directly
          page.scale(config.scale, config.scale);
        } else if (config.mode === 'preset') {
          // Map preset configurations accurately (points dimensions)
          let targetWidth = width;
          let targetHeight = height;

          switch (config.preset) {
            case 'A4':
              targetWidth = 595.27; // 210mm x 297mm
              targetHeight = 841.89;
              break;
            case 'Letter':
              targetWidth = 612; // 8.5" x 11"
              targetHeight = 792;
              break;
            case 'A3':
              targetWidth = 841.89; // 297mm x 420mm
              targetHeight = 1190.55;
              break;
            case 'A5':
              targetWidth = 419.53; // 148mm x 210mm
              targetHeight = 595.27;
              break;
            case 'Legal':
              targetWidth = 612; // 8.5" x 14"
              targetHeight = 1008;
              break;
          }

          const scaleX = targetWidth / width;
          const scaleY = targetHeight / height;
          page.scale(scaleX, scaleY);
        }
      }

      // Save the output PDF Document bytes
      const pdfBytes = await pdfDoc.save();
      const resizedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      if (resizedPdfUrl) {
        URL.revokeObjectURL(resizedPdfUrl);
      }
      
      const newUrl = URL.createObjectURL(resizedBlob);
      setResizedPdfBlob(resizedBlob);
      setResizedPdfUrl(newUrl);
      setResizedSize(resizedBlob.size);
      setSuccessMsg(true);

      // Add to Global App History tracker
      onAddHistory({
        id: Math.random().toString(36).substring(2, 9),
        name: selectedFileItem.name,
        type: 'pdf',
        originalSize: selectedFileItem.sizeBytes,
        newSize: resizedBlob.size,
        savingsPercent: Math.max(0, Math.round(((selectedFileItem.sizeBytes - resizedBlob.size) / selectedFileItem.sizeBytes) * 100)),
        timestamp: Date.now()
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred while scaling and restructuring the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick download helper
  const handleDownload = () => {
    if (!resizedPdfBlob || !selectedFileItem) return;

    const baseName = selectedFileItem.name.substring(0, selectedFileItem.name.lastIndexOf('.')) || selectedFileItem.name;
    const extraTag = config.mode === 'scale' ? `${Math.round(config.scale * 100)}p` : config.preset.toLowerCase();
    const finalFilename = `${baseName}_resized_${extraTag}.pdf`;

    const link = document.createElement('a');
    link.href = resizedPdfUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadSamplePDF = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      // Create a mock PDF on-the-fly dynamically using pdf-lib! No network requests to break.
      // This is incredibly robust!
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.27, 841.89]); // Standard A4 page
      const { width, height } = page.getSize();
      
      // Draw standard placeholder information
      page.drawText('PHOTO & PDF ONLINE RESIZER LABS', {
        x: 50,
        y: height - 100,
        size: 20
      });
      page.drawText('Document Sample Demonstration File', {
        x: 50,
        y: height - 140,
        size: 14
      });
      page.drawText('This sample PDF is created programmatically inside your browser using client-side libraries. You can now adjust its dimensions, upscale, or compress its contents seamlessly using the control side panel!', {
        x: 50,
        y: height - 200,
        size: 11,
        maxWidth: width - 100,
        lineHeight: 18
      });

      page.drawRectangle({
        x: 50,
        y: 150,
        width: width - 100,
        height: 250,
        borderColor: undefined,
        borderWidth: 0,
        color: undefined // draw nice border coordinates line
      });

      // Add simple pages
      const page2 = pdfDoc.addPage([595.27, 841.89]);
      page2.drawText('Page 2: Supplemental Report Data', {
        x: 50,
        y: height - 100,
        size: 16
      });
      page2.drawText('Vector points, texts, geometries, and grids scale synchronously without pixel blurring.', {
        x: 50,
        y: height - 140,
        size: 11
      });

      const pdfBytes = await pdfDoc.save();
      const mockFile = new File([pdfBytes], 'Resizer_Demo_Sample.pdf', { type: 'application/pdf' });
      handleSelectedFile(mockFile);
    } catch (e: any) {
      setErrorMsg('Failed to construct sample PDF: ' + e.message);
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setSelectedFileItem(null);
    setResizedPdfBlob(null);
    setResizedPdfUrl('');
    setResizedSize(null);
    setErrorMsg('');
    setSuccessMsg(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in" id="pdf-resizer-module">
      
      {/* Upload zone and Preview Pane */}
      <div className="lg:col-span-7 space-y-6">
        {!selectedFileItem ? (
          <div 
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 relative overflow-hidden backdrop-blur-xl cursor-pointer ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.03]'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            id="pdf-dropzone"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center justify-center space-y-5">
              <div className="p-4 bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 rounded-2xl border border-white/10 shadow-xl text-indigo-400 animate-pulse">
                <FileText className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <p className="text-lg font-bold text-white font-display">
                  Drag and drop your PDF document
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Adjust page configurations, crop coordinates, and points metrics offline
                </p>
              </div>

              <div className="flex items-center space-x-3 py-1">
                <div className="h-px w-8 bg-white/10" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-550">or</span>
                <div className="h-px w-8 bg-white/10" />
              </div>

              <label className="px-6 py-3 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-550 hover:to-indigo-550 active:scale-95 text-xs text-white font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-650/20 cursor-pointer transition-all duration-200">
                Choose PDF Document
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,application/pdf" 
                  onChange={onFileChange} 
                />
              </label>

              {/* Sample PDF launcher */}
              <div className="pt-4">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 font-semibold">No PDFs? Create a dynamic sample</p>
                <button 
                  onClick={loadSamplePDF}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl text-zinc-300 transition-colors duration-250 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Build Programmatic Sample PDF</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Loaded Document overview */
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
            
            {/* Header document card */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3.5 truncate">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate max-w-[150px] sm:max-w-xs md:max-w-lg">
                  <p className="text-sm font-semibold text-white truncate font-display">{selectedFileItem.name}</p>
                  <p className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-2.5">
                    <span>Pages: <strong className="font-mono text-indigo-400 font-bold">{pageCount} Pages</strong></span>
                    <span className="text-zinc-650">•</span>
                    <span>Original Size: <strong className="font-mono text-zinc-300">{formatBytes(selectedFileItem.sizeBytes)}</strong></span>
                  </p>
                </div>
              </div>
              
              <button 
                onClick={resetAll}
                className="px-3.5 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 hover:text-red-400 text-zinc-300 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer"
              >
                Change PDF
              </button>
            </div>

            {/* Print and layout specifications */}
            {originalDimensions && (
              <div className="grid grid-cols-2 gap-4 bg-black/20 p-3.5 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-500 block">Page Grid bounds</span>
                  <p className="text-xs font-semibold text-zinc-200">{originalDimensions.displayLabel}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-500 block">Coordinates Metric</span>
                  <p className="text-xs font-semibold text-zinc-200">
                    {originalDimensions.width.toFixed(0)} × {originalDimensions.height.toFixed(0)}pt (72 DPI)
                  </p>
                </div>
              </div>
            )}

            {/* Document Iframe Embedding for Instant Visual Page Previews */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest block">Document Preview Pane</label>
              
              <div className="relative h-96 w-full rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                {resizedPdfUrl ? (
                  <iframe 
                    src={`${resizedPdfUrl}#toolbar=1&navpanes=0`}
                    className="w-full h-full border-0 bg-transparent" 
                    title="Resized PDF Preview"
                  />
                ) : (
                  <iframe 
                    src={`${selectedFileItem.srcUrl}#toolbar=0&navpanes=0`} 
                    className="w-full h-full border-0 bg-transparent opacity-50" 
                    title="Original PDF Preview"
                  />
                )}

                {!resizedPdfUrl && (
                  <div className="absolute inset-x-0 bottom-0 py-3 bg-[#0d0e1b]/95 border-t border-white/5 text-center text-zinc-300 text-xs font-semibold backdrop-blur-md">
                    Displaying original document source. Configure options and click &quot;Resize &amp; Compile&quot; below.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-2xl flex items-start space-x-3 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Control side parameters */}
      <div className="lg:col-span-5 bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-white/10">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xs font-extrabold text-zinc-100 uppercase tracking-widest font-display">PDF Scale Settings</h2>
        </div>

        {/* Option toggles */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-455 uppercase tracking-widest block">Scaling Pattern</label>
          <div className="grid grid-cols-2 gap-1 bg-[#0d0e1b] p-1 rounded-xl border border-white/5">
            {(['scale', 'preset'] as PDFResizeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setConfig(prev => ({ ...prev, mode }))}
                className={`py-2.5 text-[11px] font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  config.mode === mode 
                    ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white font-bold shadow-md shadow-indigo-500/10' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'scale' ? 'Percentage Scale' : 'Page Presets Fit'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic configuration options */}
        <div className="space-y-4">
          {config.mode === 'scale' ? (
            <div className="space-y-3 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              <div className="flex justify-between items-center bg-transparent">
                <span className="text-xs font-semibold text-zinc-300">Page Multiplier</span>
                <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                  {Math.round(config.scale * 100)}%
                </span>
              </div>
              <input 
                type="range" 
                min="30" 
                max="200" 
                step="5"
                value={Math.round(config.scale * 100)}
                onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat((parseInt(e.target.value) / 100).toFixed(2)) }))}
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[9px] text-zinc-450 font-mono font-bold">
                <span>30% (Compact)</span>
                <span>100% (Normal)</span>
                <span>200% (Large)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-white/[0.02] border border-white/10 p-4 rounded-xl">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Fit All Page Containers to Presets</label>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'A4', label: 'A4 Page Standard' },
                  { value: 'Letter', label: 'US Letter Page' },
                  { value: 'A3', label: 'A3 Presentation' },
                  { value: 'A5', label: 'A5 Pamphlet' },
                  { value: 'Legal', label: 'Legal Sheet' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setConfig(prev => ({ ...prev, preset: item.value as PDFPresetType }))}
                    className={`p-2.5 text-xs text-left cursor-pointer transition-all border rounded-xl font-bold ${
                      config.preset === item.value
                        ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-bold'
                        : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Processing and feedback buttons */}
        {selectedFileItem && (
          <div className="space-y-4">
            
            <button
              onClick={handleProcessPDF}
              disabled={isProcessing}
              className="w-full py-4 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-550 hover:to-indigo-550 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl shadow-xl shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-200"
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Scale className="w-5 h-5" />
              )}
              <span>{isProcessing ? 'Processing PDF Coordinates...' : 'Resize & Compile PDF'}</span>
            </button>

            {successMsg && resizedSize && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs rounded-2xl space-y-3.5 backdrop-blur-md">
                <div className="flex items-center space-x-2 font-bold text-emerald-300">
                  <Check className="w-4 h-4 font-bold" />
                  <span>Success! PDF scaling completed securely.</span>
                </div>
                
                <p className="leading-relaxed text-zinc-350 font-semibold text-[11px]">
                  Resulting document scaled successfully. Output file size is <strong className="font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-white font-extrabold">{formatBytes(resizedSize)}</strong> (Savings: {Math.max(0, Math.round(((selectedFileItem.sizeBytes - resizedSize) / selectedFileItem.sizeBytes) * 100))}%).
                </p>

                <button
                  onClick={handleDownload}
                  className="w-full py-3 bg-[#0d0e1b] border border-white/10 hover:border-white/15 hover:bg-white/5 hover:text-white text-emerald-400 font-extrabold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  <Download className="w-4 h-4 font-bold" />
                  <span>Download Scaled Document</span>
                </button>
              </div>
            )}

          </div>
        )}

        {!selectedFileItem && (
          <div className="p-4 bg-[#0d0e1b] text-zinc-500 text-xs rounded-2xl text-center border border-white/5 font-semibold">
            Upload or select a sample document to configure parameters.
          </div>
        )}

      </div>
    </div>
  );
}
