import { useEffect, useState, useRef } from 'react';
import { generateImagesBase64 } from './lib/geminiService';
import { DownloadIcon, SlidersHorizontal, Wand2, XIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import './types';

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const SIZES = ["1K", "2K", "4K"];
const MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Standard (Fast)" },
  { id: "gemini-3-pro-image-preview", label: "Studio (Quality)" }
];

export default function App() {
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState(true);

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageSize, setImageSize] = useState("1K");
  const [model, setModel] = useState("gemini-3-pro-image-preview");
  
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{id: string, base64: string}[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function checkKey() {
      // Check if running in AI Studio context
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeyReady(hasKey);
      } else {
        // Fallback for local env / standard web without AI Studio wrapper
        setApiKeyReady(true); 
      }
      setCheckingKey(false);
    }
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success as per docs to avoid race conditions
      setApiKeyReady(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const b64s = await generateImagesBase64(prompt, model, { aspectRatio, imageSize }, referenceImage || undefined);
      setGeneratedImages(b64s.map(b => ({ id: Math.random().toString(36).substring(7), base64: b })));
    } catch (err: any) {
      console.error(err);
      alert("Failed to generate: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (base64: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = `vibewall-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemix = (base64: string) => {
    setReferenceImage(base64);
    setSelectedImage(null);
    setGeneratedImages([]); // Clear previous to focus on remixing
  };

  if (checkingKey) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 px-4">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!apiKeyReady) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 shadow-inner overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 mix-blend-overlay"></div>
           <ImageIcon className="h-8 w-8 text-zinc-300" />
        </div>
        <h1 className="mb-3 font-display text-2xl font-semibold text-white">Welcome to VibeWall</h1>
        <p className="mb-10 max-w-sm text-sm text-zinc-400">
          Generate stunning mobile wallpapers powered by Gemini. You need an API key to access high-quality image models.
        </p>
        <button
          onClick={handleSelectKey}
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 active:scale-95"
        >
          <Wand2 className="h-4 w-4" />
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex relative h-[100dvh] w-full flex-col bg-zinc-950 overflow-hidden text-zinc-50 font-sans">
      
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-900 bg-zinc-950/80 px-4 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
            <Wand2 className="h-4 w-4 text-purple-400" />
          </div>
          <span className="font-display font-semibold tracking-tight">VibeWall</span>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${showSettings ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </header>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-900 bg-zinc-950/95 px-4 py-4 text-sm z-10 overflow-hidden flex flex-col gap-4"
          >
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400 uppercase tracking-wider">Model</label>
              <div className="grid grid-cols-2 gap-2">
                {MODELS.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${model === m.id ? 'border-purple-500/50 bg-purple-500/10 text-purple-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400 uppercase tracking-wider">Quality / Size</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <button 
                    key={s}
                    onClick={() => setImageSize(s)}
                    className={`rounded-full border px-4 py-1.5 transition ${imageSize === s ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400 uppercase tracking-wider">Aspect Ratio</label>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {ASPECT_RATIOS.map(ar => (
                  <button 
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={`shrink-0 rounded-full border px-4 py-1.5 transition ${aspectRatio === ar ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-36">
        {generatedImages.length === 0 && !generating ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
            <ImageIcon className="mb-4 h-12 w-12 text-zinc-700" />
            <p className="text-zinc-400">Describe a vibe to generate<br/>your perfect wallpaper.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {generatedImages.map((img, i) => (
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={img.id}
                  onClick={() => setSelectedImage(img.base64)}
                  className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 focus:outline-none"
                  style={{
                    aspectRatio: aspectRatio.replace(':', '/')
                  }}
                >
                  <img 
                    src={`data:image/png;base64,${img.base64}`} 
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" 
                    alt="Generated variation" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
                </motion.button>
              ))}
              
              {generating && (
                Array.from({ length: 4 }).map((_, i) => (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     key={`skeleton-${i}`} 
                     className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900/50"
                     style={{
                       aspectRatio: aspectRatio.replace(':', '/')
                     }}
                   >
                     <div className="absolute inset-0 flex items-center justify-center">
                       <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                     </div>
                   </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Bottom Input Area */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-900 bg-zinc-950/90 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        
        {referenceImage && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-2 pl-3">
             <div className="flex items-center gap-3">
                <img 
                  src={`data:image/png;base64,${referenceImage}`} 
                  className="h-10 w-10 rounded-md object-cover ring-1 ring-white/10" 
                  alt="Reference" 
                />
                <div className="text-xs font-medium text-purple-300/80 uppercase tracking-wider">
                  Remixing Reference
                </div>
             </div>
             <button 
               onClick={() => setReferenceImage(null)}
               className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
             >
               <XIcon className="h-4 w-4" />
             </button>
          </div>
        )}

        <div className="flex gap-2">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. rainy cyberpunk lo-fi"
            disabled={generating}
            className="h-12 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
          />
          <button 
            disabled={!prompt.trim() || generating}
            onClick={handleGenerate}
            className="flex h-12 items-center justify-center rounded-2xl bg-white px-5 font-medium text-black transition hover:bg-zinc-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
             {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Generate"}
          </button>
        </div>
      </div>

      {/* Full Screen Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bottom-0 left-0 right-0 top-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-end px-4">
               <button 
                 onClick={() => setSelectedImage(null)}
                 className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition hover:text-white hover:bg-zinc-800"
               >
                 <XIcon className="h-5 w-5" />
               </button>
            </div>
            
            <div className="flex-1 p-4 flex items-center justify-center relative min-h-0">
               <img 
                 src={`data:image/png;base64,${selectedImage}`} 
                 className="h-full w-full rounded-2xl object-contain drop-shadow-2xl" 
                 alt="Selected wallpaper" 
                 referrerPolicy="no-referrer"
               />
            </div>

            <div className="flex shrink-0 gap-3 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 border-t border-white/5">
                <button 
                  onClick={() => handleRemix(selectedImage)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 py-4 font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
                >
                  <Wand2 className="h-5 w-5" />
                  Remix
                </button>
                <button 
                  onClick={() => handleDownload(selectedImage)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-4 font-medium text-black transition hover:bg-zinc-200 active:scale-[0.98]"
                >
                  <DownloadIcon className="h-5 w-5" />
                  Download
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
