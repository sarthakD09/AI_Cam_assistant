'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Client } from "@gradio/client";

type Detection = {
  label: string
  confidence: number
  box: number[] // [x1, y1, x2, y2]
}

export const CameraComponent = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [caption, setCaption] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [flash, setFlash] = useState(false)
  const [useRear, setUseRear] = useState(true)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  
  // Zoom state
  const [zoom, setZoom] = useState(1)
  const [minZoom, setMinZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(3)
  const [supportsZoom, setSupportsZoom] = useState(false)
  const [isPinching, setIsPinching] = useState(false)

  // Start camera
  useEffect(() => {
    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [useRear])

  const startCamera = async () => {
    try {
      // Stop previous stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: useRear ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        
        // Wait for video to be ready to check zoom capabilities
        videoRef.current.onloadedmetadata = () => {
          checkZoomCapabilities(newStream)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
    }
  }

  // Check if zoom is supported and get capabilities
  const checkZoomCapabilities = async (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      const capabilities = videoTrack.getCapabilities?.() as any
      
      if (capabilities?.zoom) {
        setSupportsZoom(true)
        setMinZoom(capabilities.zoom.min || 1)
        setMaxZoom(capabilities.zoom.max || 3)
        
        // Reset zoom to 1 when camera starts
        setZoom(1)
        await applyZoom(1)
      }
    }
  }

  // Apply zoom to camera
  const applyZoom = useCallback(async (newZoom: number) => {
    if (!stream) return
    
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack && videoTrack.applyConstraints) {
      try {
        const constraints: any = {
          advanced: [{ zoom: newZoom }]
        }
        await videoTrack.applyConstraints(constraints)
        setZoom(newZoom)
      } catch (err) {
        console.error('Failed to apply zoom:', err)
      }
    }
  }, [stream])

  // Handle pinch-to-zoom on mobile
  useEffect(() => {
    const container = imageContainerRef.current
    if (!container || !supportsZoom) return

    let initialDistance = 0
    let initialZoom = zoom

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        initialDistance = Math.sqrt(dx * dx + dy * dy)
        initialZoom = zoom
        setIsPinching(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)
        
        // Calculate zoom change based on pinch gesture
        const scale = currentDistance / initialDistance
        const newZoom = Math.min(maxZoom, Math.max(minZoom, initialZoom * scale))
        
        applyZoom(newZoom)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setIsPinching(false)
        initialDistance = 0
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [supportsZoom, zoom, minZoom, maxZoom, applyZoom])

  const reset = () => {
    setPrediction(null)
    setDetections([])
    setExplanation(null)
    setConfidence(null)
    setCapturedImage(null)
    setCaption(null)
    setImageDimensions({ width: 0, height: 0 })
    
    // Reset zoom when returning to camera
    if (zoom !== 1) {
      applyZoom(1)
    }
    
    startCamera()
  }

  const captureAndPredict = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setPrediction(null)
    setDetections([])
    setExplanation(null)
    setConfidence(null)
    setCaption(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg')
    setCapturedImage(imageData)
    setImageDimensions({ width: canvas.width, height: canvas.height })

    stream?.getTracks().forEach(track => track.stop());

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg')
    )

    if (!blob) return

    // Flash animation
    setFlash(true)
    setTimeout(() => setFlash(false), 120)

    setScanning(true)
    setLoading(true)

    try {
      const client = await Client.connect("Novion10/yolo_api");
      const result = await client.predict("/process", [blob]) as { data: Array<any> };
      
      if (!result || !result.data || result.data.length === 0) {
        throw new Error("No data received from prediction");
      }
      
      const data = result.data[0] || {};
      
      // console.log("Prediction data:", data);
      
      setCaption(data.caption || "No description available");

      if (data.mode === "classification") {
        setPrediction(data.prediction || null);
        setConfidence(data.confidence || null);
        setExplanation(data.explanation || null);
        if (data.detections) {
          setDetections(data.detections);
        }
      } else if (data.detections) {
        setDetections(data.detections);
      }

    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  // Calculate bounding box position relative to displayed image
  const getBoxStyle = (box: number[], containerWidth: number, containerHeight: number) => {
    if (!imageDimensions.width || !imageDimensions.height) return null;

    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (containerWidth - imageDimensions.width * scale) / 2;
    const offsetY = (containerHeight - imageDimensions.height * scale) / 2;

    const [x1, y1, x2, y2] = box;

    return {
      left: `${offsetX + x1 * scale}px`,
      top: `${offsetY + y1 * scale}px`,
      width: `${(x2 - x1) * scale}px`,
      height: `${(y2 - y1) * scale}px`,
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 text-white p-2 sm:p-4 min-h-screen bg-[#0a0a0a36] ">
      {/* CAMERA AREA - Full width on mobile */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl" ref={imageContainerRef}>
        {/* Image/Video Container with larger aspect ratio on mobile */}
        <div className="relative bg-black aspect-[3/4] sm:aspect-video">
          {capturedImage ? (
            <>
              <motion.img
                src={capturedImage}
                initial={{ scale: 1 }}
                animate={{ scale: scanning ? 0.98 : 1 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-contain"
                alt="Captured"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImageDimensions({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                  });
                }}
              />
              
              {/* Bounding Boxes */}
              {detections.map((det, i) => {
                if (!imageContainerRef.current || !det.box) return null;
                
                const container = imageContainerRef.current;
                const style = getBoxStyle(
                  det.box, 
                  container.clientWidth, 
                  container.clientHeight
                );
                
                if (!style) return null;

                return (
                  <div
                    key={i}
                    className="absolute border-2 border-green-500 pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                    style={style}
                  >
                    <div className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-t-md whitespace-nowrap font-medium shadow-lg">
                      {det.label} {(det.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Zoom indicator - shown when zooming */}
              {supportsZoom && zoom !== 1 && !isPinching && (
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm border border-white/20">
                  {zoom.toFixed(1)}x
                </div>
              )}
              
              {/* Zoom hint on first use */}
              {supportsZoom && !isPinching && zoom === 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs sm:text-sm border border-white/20 animate-pulse">
                  👆 Pinch to zoom
                </div>
              )}
            </>
          )}

          {/* Flash */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Scan overlay */}
          {scanning && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="absolute inset-0 bg-black/50 pointer-events-none"
              />
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="scan-line"></div>
              </div>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* ZOOM CONTROLS - Only show if supported and camera is active */}
      {supportsZoom && !capturedImage && (
        <div className="w-full max-w-md px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">0.5x</span>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.1}
              value={zoom}
              onChange={(e) => applyZoom(parseFloat(e.target.value))}
              title="Camera zoom level"
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
            />
            <span className="text-white/60 text-sm">{maxZoom.toFixed(1)}x</span>
          </div>
          <div className="text-center mt-1 text-white/40 text-xs">
            Current: {zoom.toFixed(1)}x
          </div>
        </div>
      )}

      {/* BUTTONS - Stack vertically on mobile */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-4">
        <button
          type="button"
          onClick={captureAndPredict}
          disabled={loading}
          className="flex-1 px-6 py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:scale-95 text-base sm:text-lg"
        >
          <span className="text-2xl">📸</span> 
          <span className="font-semibold">Capture & Analyze</span>
        </button>

        <button
          type="button"
          onClick={() => setUseRear(prev => !prev)}
          disabled={loading}
          className="px-6 py-4 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg border border-white/10 active:scale-95 text-base sm:text-lg"
        >
          <span className="text-2xl">🔄</span>
          <span className="font-semibold">Switch Camera</span>
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
          <p className="text-white/80 font-medium animate-pulse bg-black/30 px-6 py-3 rounded-full backdrop-blur-sm">
            AI is analyzing your image...
          </p>
        </div>
      )}

      {/* RESULTS SECTION */}
      <AnimatePresence mode="wait">
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl space-y-4 mt-4 px-4"
          >
            {/* CAPTION */}
            {caption && (
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm shadow-xl border border-white/20">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-base sm:text-lg">
                  <span>🧠</span> AI Caption
                </h3>
                <p className="text-white/90 leading-relaxed text-sm sm:text-base">
                  {caption}
                </p>
              </div>
            )}

            {/* CLASSIFICATION RESULT */}
            {prediction && (
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-2">
                  {prediction}
                </h2>

                {confidence !== null && (
                  <>
                    <div className="w-full bg-white/10 rounded-full h-3 mt-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidence * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                      />
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-white/60">
                      Confidence: {(confidence * 100).toFixed(2)}%
                    </p>
                  </>
                )}

                {explanation && (
                  <p className="mt-4 text-white/80 leading-relaxed border-t border-white/10 pt-4 text-sm sm:text-base">
                    {explanation}
                  </p>
                )}
              </div>
            )}

            {/* DETECTION RESULT */}
            {detections.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
                <h2 className="text-lg sm:text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <span>🔍</span> Detected Objects ({detections.length})
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {detections.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-2 sm:px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30 text-xs sm:text-sm hover:bg-blue-500/30 transition-colors text-center sm:text-left"
                    >
                      <span className="font-medium block sm:inline">{d.label}</span>
                      <span className="text-blue-400/70 ml-0 sm:ml-1 block sm:inline text-xs">
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* RESET BUTTON */}
            {(prediction || detections.length > 0 || caption) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                type="button"
                onClick={reset}
                className="w-full mt-4 px-6 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition font-medium border border-white/20 flex items-center justify-center gap-2 group text-base sm:text-lg"
              >
                <span className="text-xl sm:text-2xl group-hover:rotate-180 transition-transform duration-500">
                  🔄
                </span>
                Take New Photo
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan animation styles */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(255, 255, 255, 0.8),
            rgba(255, 255, 255, 0.8),
            transparent
          );
          filter: blur(4px);
          animation: scan 1.8s ease-in-out infinite;
          pointer-events: none;
          z-index: 40;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }

        .scan-line::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: inherit;
          filter: blur(8px);
          opacity: 0.5;
        }

        /* Custom range input styling */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        input[type=range]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}