import React, { useState, useEffect } from 'react';
import ImageResizer from './components/ImageResizer';
import PDFResizer from './components/PDFResizer';
import { HistoryItem } from './types';
import { formatBytes } from './utils/imageUtils';
import { 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  History, 
  TrendingDown, 
  Info,
  HelpCircle,
  Clock,
  Layers,
  Smartphone,
  Check
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'image' | 'pdf'>('image');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome was: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Load history stats on startup
  useEffect(() => {
    const saved = localStorage.getItem('resizer_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // Clear corrupt history
        localStorage.removeItem('resizer_history');
      }
    }
  }, []);

  // Update history items to storage
  const handleAddHistory = (item: HistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev].slice(0, 30); // Keep last 30 entries
      localStorage.setItem('resizer_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem('resizer_history');
    setHistory([]);
  };

  // Compute stats metrics
  const totalFilesCompressed = history.length;
  const totalOriginalBytes = history.reduce((acc, item) => acc + item.originalSize, 0);
  const totalSavedBytes = history.reduce((acc, item) => acc + (item.originalSize - item.newSize), 0);
  const averageSavings = totalOriginalBytes > 0 
    ? Math.round((totalSavedBytes / totalOriginalBytes) * 100) 
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#070813] text-zinc-100 font-sans antialiased selection:bg-indigo-500/35 selection:text-indigo-200 relative overflow-hidden">
      
      {/* Decorative premium floating neon orbs to create depth behind the frosted glass panels */}
      <div className="absolute top-[-100px] left-[-5%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/12 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[20%] w-[450px] h-[450px] rounded-full bg-fuchsia-600/10 blur-[110px] pointer-events-none z-0" />

      {/* Glassomorphic subtle dotted grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none z-0" />
      
      {/* Header Bar */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          
          {/* Logo vector and description */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 p-px shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0d0e1b] rounded-[9px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-indigo-405 rotate-12" />
              </div>
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-indigo-300 bg-clip-text text-transparent font-display font-bold">
                Photo &amp; PDF Resizer
              </h1>
              <p className="text-[10px] text-zinc-440 font-mono uppercase tracking-wider">Client-Side Compression Workspace</p>
            </div>
          </div>

          {/* Privacy badge and status */}
          <div className="flex items-center space-x-2 bg-emerald-500/8 border border-emerald-500/20 px-4 py-2 rounded-full text-[11px] font-semibold text-emerald-400 backdrop-blur-sm shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">100% Secure • Files never leave your web browser</span>
            <span className="inline sm:hidden">Local Sandboxed Processing</span>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Hero with stats summary card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px] text-indigo-300 font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" /> PWA Workspace Active
              </div>
              {deferredPrompt && (
                <button
                  id="pwa-install-banner-btn"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-[11px] uppercase tracking-wider px-3 py-1 rounded-md transition-all duration-300 shadow-md shadow-indigo-600/20 border border-violet-400/20 animate-pulse cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Install App
                </button>
              )}
              {isInstalled && (
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] text-emerald-400 font-bold uppercase tracking-wider backdrop-blur-md">
                  <Check className="w-3.5 h-3.5" /> Standalone Active
                </div>
              )}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
              Scale photos and documents, offline.
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed font-semibold">
              Adjust pixel counts, download custom DPI JPEGs, convert formats, or fit multiple PDF pages into corporate print configurations. File operations compile instantly inside high-performance client-side browser engines.
            </p>
          </div>          {/* Interactive Stats Dashboard mini widget */}
          {totalFilesCompressed > 0 && (
            <div className="w-full md:w-auto p-4 bg-white/[0.03] border border-white/10 hover:border-white/15 rounded-2xl flex items-center gap-4 shadow-xl backdrop-blur-xl transition-all duration-300">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <TrendingDown className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-baseline space-x-2">
                  <span className="text-lg font-extrabold text-white font-mono">
                    {formatBytes(totalSavedBytes)}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Savings</span>
                </div>
                <p className="text-[11px] text-zinc-350">
                  Compressed <strong>{totalFilesCompressed} files</strong> with <strong>{averageSavings}% saved</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher buttons */}
        <div className="flex border-b border-white/10 pb-px">
          <div className="flex space-x-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center space-x-2.5 px-6 py-3.5 text-xs sm:text-xs tracking-wider uppercase font-extrabold rounded-xl transition-all duration-300 cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-650 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Resize Photos &amp; Images</span>
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center space-x-2.5 px-6 py-3.5 text-xs sm:text-xs tracking-wider uppercase font-extrabold rounded-xl transition-all duration-300 cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Resize PDF Documents</span>
            </button>
          </div>
        </div>

        {/* Core Workspace Switch Panel */}
        <div className="py-2" id="resizer-control-desk">
          {activeTab === 'image' ? (
            <ImageResizer onAddHistory={handleAddHistory} />
          ) : (
            <PDFResizer onAddHistory={handleAddHistory} />
          )}
        </div>

        {/* Local Storage History logs section */}
        {history.length > 0 && (
          <div className="border border-white/10 bg-white/[0.03] rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-display">Compression Audit History</h3>
              </div>
              <button 
                onClick={handleClearHistory} 
                className="flex items-center space-x-1.5 px-3 py-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 hover:text-red-400 text-zinc-300 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History Logs</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-white/5 text-zinc-300 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">File Name</th>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Format</th>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Original Size</th>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Compressed Size</th>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Savings Yield</th>
                    <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Processed Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-zinc-100 truncate max-w-[200px]">{item.name}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${
                          item.type === 'image' 
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-400">{formatBytes(item.originalSize)}</td>
                      <td className="px-5 py-4 font-mono text-white font-bold">{formatBytes(item.newSize)}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                          -{item.savingsPercent}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-zinc-400 flex items-center justify-end space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Technical Explanations Context block for design depth */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
          <div className="space-y-2.5 p-5 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-xl hover:border-white/15 transition-all duration-300">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Info className="w-4 h-4 text-indigo-400" />
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">What is DPI &amp; PPI?</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
              DPI (Dots Per Inch) is physical print metadata that guides industrial lasers on how tightly to packing pixels when drawing on photographic paper. <strong>300 DPI JPEGs</strong> are standard for medical, legal, identity registry and high-quality photo prints to avoid pixel grid visibility.
            </p>
          </div>

          <div className="space-y-2.5 p-5 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-xl hover:border-white/15 transition-all duration-300">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Info className="w-4 h-4 text-emerald-400" />
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">A4 vs US Letter Dimensions</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
              USA corporate templates primarily print on <strong>Letter (8.5&quot; × 11&quot; or 612 × 792pt)</strong> paper, while International structures standardize page ratios with <strong>A4 (210mm × 297mm or 595.3 × 841.9pt)</strong>. Our compiler stretches layouts flawlessly to meet global scales.
            </p>
          </div>

          <div className="space-y-2.5 p-5 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-xl hover:border-white/15 transition-all duration-300">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200">Local Isolation Privacy</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
              This application has no backend, database, or network tracking tunnels. All processes execute directly inside isolated client memory arrays via <strong>HTML Canvas API</strong> and web structures. Files are completely safe and never uploaded.
            </p>
          </div>
        </div>

      </main>

      {/* Footer disclaimer lines */}
      <footer className="border-t border-white/10 py-8 bg-transparent relative z-10 font-sans">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-xs text-zinc-500 font-semibold tracking-wide">
            Photo &amp; PDF Resizer Workspace • Licensed under Apache-2.0
          </p>
          <p className="text-[11px] text-zinc-400 font-semibold">
            Made with love by <span className="text-indigo-400 font-bold">Saurabh Panchal</span>
          </p>
          <div className="flex justify-center space-x-4 text-[10px] text-zinc-650 font-mono uppercase tracking-wider">
            <span>No Cookies Trackers</span>
            <span>•</span>
            <span>Web Assembly Speed</span>
            <span>•</span>
            <span>Fully Client-Side Utility</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
