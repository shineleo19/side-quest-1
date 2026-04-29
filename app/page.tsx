"use client";

import React, { useId, useState, useEffect, useCallback, useRef } from "react";

type FloatingGif = {
  top: string;
  left: string;
  size: number;
  url: string;
};

const createFloatingGifs = (): FloatingGif[] => {
  return [
    {
      top: "57%",
      left: "40%",
      size: 252,
      url: "/glitch_2-o.gif",
    },
    {
      top: "19%",
      left: "82%",
      size: 212,
      url: "/glitch_1-o.gif",
    },
    {
      top: "5%",
      left: "49.8%",
      size: 156,
      url: "/glitch_3-o.gif",
    },
    {
      top: "5%",
      left: "25%",
      size: 218,
      url: "/glitch_4-o.gif",
    },
  ];
};

export default function CTFLightPosterGenerator() {
  const [prompt, setPrompt] = useState("");
  const [imageSource, setImageSource] = useState<"upload" | "url">("upload");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageUrlError, setImageUrlError] = useState("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [copyStatus, setCopyStatus] = useState("Copy (C)");
  const [theme, setTheme] = useState("PIXEL_ART");
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterImg, setPosterImg] = useState(""); 
  const posterId = useId().replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "CTF001";
  const [clockText, setClockText] = useState("--:-- --");
  const [dateText, setDateText] = useState("--/--/--");
  const [floatingGifs] = useState<FloatingGif[]>(() => createFloatingGifs());
  const [uploadedObjectUrl, setUploadedObjectUrl] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Mouse tracking state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const themes = ["PIXEL_ART", "DITHER_PUNK", "WIREFRAME", "RAW_HEX"];

  // Track mouse coordinates globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }).toUpperCase());
      setDateText(now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }));
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseDown = () => document.body.classList.add("cursor-clicked");
    const handleMouseUp = () => document.body.classList.remove("cursor-clicked");

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("cursor-clicked");
    };
  }, []);

  const handleExecute = async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setGenerationError("Enter a prompt before generating a poster.");
      return;
    }

    setGenerationError("");
    setDownloadError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-poster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          theme,
          designerName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Generation failed (${response.status})`);
      }

      const payload = (await response.json()) as { imageDataUrl?: string };
      if (!payload.imageDataUrl) {
        throw new Error("Gemini did not return an image");
      }

      setPosterImg(payload.imageDataUrl);
    } catch (error) {
      console.error("Error generating poster:", error);
      setGenerationError(error instanceof Error ? error.message : "Could not generate poster.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
     if (uploadedObjectUrl) {
      URL.revokeObjectURL(uploadedObjectUrl);
      setUploadedObjectUrl(null);
    }
    setPrompt("");
    setImageUrlInput("");
    setImageUrlError("");
    setGenerationError("");
    setIsUrlLoading(false);
    setPosterImg("");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadFromUrl = async () => {
    let trimmedUrl = imageUrlInput.trim();
    setImageUrlError("");

    if (!trimmedUrl) {
      setImageUrlError("Please enter an image URL.");
      return;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = "https://" + trimmedUrl;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setImageUrlError("Invalid URL format.");
      return;
    }

    if (uploadedObjectUrl) {
      URL.revokeObjectURL(uploadedObjectUrl);
      setUploadedObjectUrl(null);
    }

    setIsUrlLoading(true);

    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image data"));
        reader.readAsDataURL(blob);
      });

    try {
      const localProxyUrl = `/api/image-proxy?url=${encodeURIComponent(trimmedUrl)}`;
      const response = await fetch(localProxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy request failed (${response.status})`);
      }

      const blob = await response.blob();
      const contentType = blob.type || "";
      if (!contentType.startsWith("image/")) {
        throw new Error("URL did not return an image");
      }

      const base64data = await blobToDataUrl(blob);
      setPosterImg(base64data);
      setIsGenerating(false);
      setIsUrlLoading(false);
      setImageUrlError("");
    } catch (error) {
      console.error("Error loading image:", error);
      setIsUrlLoading(false);
      setImageUrlError("Could not load image from URL. Try another direct file URL or upload a local image.");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert local file to Base64 string
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setPosterImg(base64data);
      setIsGenerating(false);
      setImageUrlError("");
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = useCallback(async () => {
    try {
      if (!posterRef.current) {
        setCopyStatus("Failed");
        window.setTimeout(() => setCopyStatus("Copy (C)"), 1200);
        return;
      }

      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        setCopyStatus("Unsupported");
        window.setTimeout(() => setCopyStatus("Copy (C)"), 1600);
        return;
      }

      const waitForPosterAssets = async (element: HTMLElement) => {
        const imageNodes = Array.from(element.querySelectorAll("img"));
        await Promise.all(
          imageNodes.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) {
                  resolve();
                  return;
                }

                const done = () => {
                  img.removeEventListener("load", done);
                  img.removeEventListener("error", done);
                  resolve();
                };

                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              }),
          ),
        );

        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
      };

      const element = posterRef.current;
      await waitForPosterAssets(element);

      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(element, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: "#ffffff",
      });

      if (!blob) {
        throw new Error("Unable to render poster blob");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      setCopyStatus("Copied PNG");
      window.setTimeout(() => setCopyStatus("Copy (C)"), 1400);
    } catch {
      setCopyStatus("Failed");
      window.setTimeout(() => setCopyStatus("Copy (C)"), 1200);
    }
  }, []);

  const handleDownload = useCallback(async (e?: React.MouseEvent | KeyboardEvent) => {
    if (e) e.preventDefault();

    if (!posterRef.current) return;

    try {
      setDownloadError("");

      const waitForPosterAssets = async (element: HTMLElement) => {
        const imageNodes = Array.from(element.querySelectorAll("img"));
        await Promise.all(
          imageNodes.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) {
                  resolve();
                  return;
                }

                const done = () => {
                  img.removeEventListener("load", done);
                  img.removeEventListener("error", done);
                  resolve();
                };

                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              }),
          ),
        );

        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
      };

      await waitForPosterAssets(posterRef.current);

      const element = posterRef.current;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `poster-${designerName || "CTF"}-${posterId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate poster image:", err);
      setDownloadError("Download failed. Wait for the image preview to fully render, then try again.");
    }
  }, [posterId, designerName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (isTypingTarget) return;

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        void handleCopy();
      }

      if (key === "d") {
        handleDownload(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopy, handleDownload]);

  return (
    <div 
      className="relative flex min-h-screen w-full overflow-x-hidden bg-[#f4f4f4] font-mono text-black selection:bg-[#aef133] selection:text-black"
      style={{
        backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }}
    >
      {/* Patterned background inspired by the provided pixel poster reference */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {floatingGifs.map((gif, index) => (
          <div
            key={`${gif.url}-${index}`}
            className="absolute overflow-hidden"
            style={{
              top: gif.top,
              left: gif.left,
              width: gif.size,
              height: gif.size,
              backgroundImage: `url(${gif.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.65,
            }}
            aria-hidden="true"
          />
        ))}
        <div className="pattern-cluster pattern-cluster-top" aria-hidden="true">
          
        </div>
        <div className="pattern-cluster pattern-cluster-bottom" aria-hidden="true">
          <div className="pattern-block pattern-dither" />
          <div className="pattern-block pattern-black" />
          <div className="pattern-block pattern-grid" />
          <div className="pattern-block pattern-lime" />
        </div>
      </div>
      
      {/* ================= TOP RIGHT COORDINATES ================= */}
      <div className="absolute right-8 top-8 z-50 border border-black/20 bg-white/80 px-4 py-3 text-right text-xs leading-relaxed tracking-widest text-black backdrop-blur-[2px]">
        <div className="flex justify-end gap-6">
          <span className="w-20 text-left">{mousePos.x.toFixed(2)}</span>
          <span className="text-gray-500">MODE</span>
        </div>
        <div className="flex justify-end gap-6">
          <span className="w-20 text-left">{mousePos.y.toFixed(2)}</span>
          <span>{"// :ACTIVE"}</span>
        </div>
        <div className="mt-2 text-gray-500">
          {clockText} {dateText}
        </div>
      </div>

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="relative z-10 flex w-[40%] flex-col p-12 pl-16">
        <div className="relative z-20 mb-12 w-fit">
          <h1 className="text-5xl font-bold tracking-tight">Poster</h1>
        </div>

        <div className="flex-1 max-w-md">
          <div className="mb-6">
            <label className="mb-2 block text-[10px] tracking-widest text-gray-500">IMAGE_SOURCE</label>
            <div className="mb-3 flex border border-black bg-white">
              <button
                type="button"
                onClick={() => {
                  setImageSource("upload");
                  setImageUrlError("");
                }}
                className={`border-r border-black px-4 py-3 text-xs font-bold tracking-widest transition-colors ${
                  imageSource === "upload" ? "bg-[#aef133]" : "hover:bg-gray-100"
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageSource("url");
                  setImageUrlError("");
                }}
                className={`px-4 py-3 text-xs font-bold tracking-widest transition-colors ${
                  imageSource === "url" ? "bg-[#aef133]" : "hover:bg-gray-100"
                }`}
              >
                URL
              </button>
            </div>

            {imageSource === "upload" ? (
              <button
                type="button"
                onClick={handleUploadClick}
                className="w-full border border-black bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100"
              >
                Upload Image
              </button>
            ) : (
              <div className="flex border border-black bg-white">
                <input
                  id="image-url"
                  type="url"
                  className="w-full border-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-[#aef133]/20"
                  value={imageUrlInput}
                  onChange={(e) => {
                    setImageUrlInput(e.target.value);
                    if (imageUrlError) setImageUrlError("");
                  }}
                  placeholder="https://example.com/image.png"
                />
                <button
                  type="button"
                  onClick={handleLoadFromUrl}
                  disabled={isUrlLoading}
                  className="border-l border-black px-4 py-3 text-xs font-bold tracking-widest transition-colors hover:bg-gray-100"
                >
                  {isUrlLoading ? "Loading..." : "Load URL"}
                </button>
              </div>
            )}
            {imageSource === "url" && imageUrlError ? (
              <p className="mt-2 text-xs text-red-600">{imageUrlError}</p>
            ) : null}
          </div>

          {/* Target Input */}
          <div className="mb-8">
            <div className="border border-black bg-white">
              <textarea
                className="w-full resize-none border-none bg-transparent p-4 text-sm text-black outline-none placeholder:text-gray-400 focus:bg-[#aef133]/20 transition-colors"
                rows={4}
                placeholder="DEFINE_VISUAL_PAYLOAD..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="designer-name" className="mb-2 block text-[10px] tracking-widest text-gray-500">DESIGNER_NAME</label>
            <input
              id="designer-name"
              type="text"
              className="w-full border border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-[#aef133]/20"
              value={designerName}
              onChange={(e) => setDesignerName(e.target.value)}
              placeholder="Enter designer name"
              maxLength={40}
            />
          </div>

          {/* Module Selection */}
          <div className="mb-8 flex gap-2">
             {themes.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`border border-black px-3 py-2 text-xs transition-all ${
                    theme === t 
                      ? "bg-[#aef133] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px] translate-x-[-2px]" 
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
          </div>

          {/* Execute Command */}
          <div className="flex gap-0 border border-black bg-white w-fit">
            <button type="button" onClick={handleClear} className="px-6 py-3 text-sm hover:bg-gray-100 transition-colors border-r border-black">
              Clear
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isGenerating}
              className="px-6 py-3 text-sm hover:bg-[#aef133] transition-colors font-bold flex items-center gap-2"
            >
              {isGenerating ? "Processing..." : "→ Generate"}
            </button>
          </div>
          {generationError ? <p className="mt-2 text-xs text-red-600">{generationError}</p> : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="mt-3 flex gap-0 border border-black bg-white w-fit">
            <button
              type="button"
              onClick={handleDownload}
              className="border-r border-black px-4 py-2 text-xs font-bold tracking-widest transition-colors hover:bg-gray-100"
            >
              Download (D)
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-bold tracking-widest transition-colors hover:bg-[#aef133]"
            >
              {copyStatus}
            </button>
          </div>
          {downloadError ? <p className="mt-2 text-xs text-red-600">{downloadError}</p> : null}
        </div>
      </aside>

      {/* ================= RIGHT MAIN (SCALED POSTER OUTPUT) ================= */}
      <main className="relative flex flex-1 items-center justify-center p-8 z-10">
        
        {/* Decorative Blocks behind the poster */}
        <div className="absolute top-[20%] left-[15%] h-24 w-24 bg-black"></div>
        <div className="absolute top-[28%] left-[22%] h-24 w-24 bg-[#aef133]"></div>
        <div className="absolute bottom-[20%] right-[20%] h-32 w-32 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-gray-200 border-2 border-black mix-blend-multiply opacity-50"></div>

        {/* Scaled Poster Frame Wrapper */}
        <div className="relative flex flex-col items-center z-20">
          {/* Scaled Poster Frame (Window Sized) */}
          <div ref={posterRef} className="relative flex h-[70vh] max-h-[650px] aspect-[2/3] flex-col bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
          
          {/* CTF Corner Brackets */}
          <div className="absolute -top-4 -left-4 text-gray-400 text-2xl font-light">⌜</div>
          <div className="absolute -top-4 -right-4 text-gray-400 text-2xl font-light">⌝</div>
          <div className="absolute -bottom-4 -left-4 text-gray-400 text-2xl font-light">⌞</div>
          <div className="absolute -bottom-4 -right-4 text-gray-400 text-2xl font-light">⌟</div>

          {/* Plus Corner Markers */}
          <div className="absolute  text-black text-xl leading-none">+</div>
          <div className="absolute  text-black text-xl leading-none">+</div>
          <div className="absolute  text-black text-xl leading-none">+</div>
          <div className="absolute  text-black text-xl leading-none">+</div>

          {/* Main Image Area */}
          <div className="flex-1 relative overflow-hidden bg-[#f9f9f9] border-b-2 border-black flex items-center justify-center">
             {isGenerating ? (
               <div className="flex flex-col items-center gap-4">
                 <div className="text-[#aef133] bg-black p-2 animate-pulse">⚑</div>
                 <div className="text-xs uppercase tracking-widest font-bold">Rendering...</div>
               </div>
             ) : posterImg ? (
                <img 
                  src={posterImg} 
                  alt="Generated Poster" 
                  className="h-full w-full object-contain" 
                />
             ) : (
                <div className="text-gray-400 text-xs text-center border border-dashed border-gray-300 w-full h-full flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZWVlIiAvPgo8L3N2Zz4=')]">
                  [ OUTPUT BUFFER ]
                </div>
             )}
          </div>

          {/* Bottom Info Block */}
          <div className="h-24 w-full bg-white p-4 flex flex-col justify-between text-[10px] uppercase tracking-widest">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-gray-400 mb-1">DESIGNER</span>
                <span className="font-bold">{designerName || "UNKNOWN"}</span>
              </div>
              <div className="text-right">
                <span className="block text-gray-400 mb-1">THEME</span>
                <span className="font-bold">{theme}</span>
              </div>
            </div>
            <div className="flex items-end">
              <span className="text-gray-400">ID: {posterId}</span>
            </div>
          </div>
        </div>

        <div className="ml-18 mt-12 -mb-18 text-[10px] uppercase tracking-widest text-black-500 text-center">
          * Best fit image size: 2:3 ratio (e.g., 1000x1500px) to avoid cropping
        </div>
      </div>
      </main>
    </div>
  );
}