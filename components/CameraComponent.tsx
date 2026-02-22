'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SMART_URL } from '@/lib/api'

type Detection = {
  label: string
  confidence: number
}

export const CameraComponent = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])

  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [flash, setFlash] = useState(false)
  const [useRear, setUseRear] = useState(true)

  // Start camera
  useEffect(() => {
    startCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((t) => t.stop())
      }
    }
  }, [useRear])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useRear ? 'environment' : 'user' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      console.error('Camera error:', err)
    }
  }

  const captureAndPredict = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setPrediction(null)
    setDetections([])
    setExplanation(null)
    setConfidence(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg')
    setCapturedImage(imageData)

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg')
    )

    if (!blob) return

    // Flash animation
    setFlash(true)
    setTimeout(() => setFlash(false), 120)

    setScanning(true)
    setLoading(true)

    const formData = new FormData()
    formData.append('image', blob)

    try {
      const res = await fetch(SMART_URL, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.mode === 'classification') {
        setPrediction(data.prediction)
        setConfidence(data.confidence)
        setExplanation(data.explanation)
      } else {
        setDetections(data.detections || [])
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }

  const reset = () => {
    setCapturedImage(null)
    setPrediction(null)
    setConfidence(null)
    setExplanation(null)
    setDetections([])
    setScanning(false)
    setLoading(false)
    startCamera()
  }

  return (
    <div className="flex flex-col items-center gap-6 text-white">

      {/* CAMERA AREA */}
      <div className="relative w-full max-w-lg">

        {capturedImage ? (
          <motion.img
            src={capturedImage}
            initial={{ scale: 1 }}
            animate={{ scale: scanning ? 0.98 : 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl shadow-2xl"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            className="rounded-2xl shadow-2xl"
          />
        )}

        {/* Flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-white rounded-2xl"
            />
          )}
        </AnimatePresence>

        {/* Scan overlay */}
        {scanning && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              className="absolute inset-0 bg-black rounded-2xl"
            />

            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="scan-line"></div>
            </div>
          </>
        )}

      </div>

      <canvas ref={canvasRef} hidden />

      {/* BUTTONS */}
      <div className="flex gap-4">
        <button
          onClick={captureAndPredict}
          className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition"
        >
          📸 Capture
        </button>

        <button
          onClick={() => setUseRear(prev => !prev)}
          className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition"
        >
          🔄 Switch
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/70 animate-pulse">Analyzing...</p>
        </div>
      )}

      {/* CLASSIFICATION RESULT */}
      {prediction && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl max-w-lg w-full"
        >
          <h2 className="text-2xl font-semibold text-green-400">
            {prediction}
          </h2>

          <div className="w-full bg-white/10 rounded-full h-2 mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence! * 100}%` }}
              transition={{ duration: 0.8 }}
              className="h-2 rounded-full bg-white"
            />
          </div>

          <p className="mt-3 text-sm text-white/70">
            Confidence: {(confidence! * 100).toFixed(2)}%
          </p>

          <p className="mt-4 text-white/80 leading-relaxed">
            {explanation}
          </p>
        </motion.div>
      )}

      {/* DETECTION RESULT */}
      {detections.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl max-w-lg w-full"
        >
          <h2 className="text-xl font-semibold text-blue-400 mb-4">
            Detected Objects
          </h2>

          <div className="flex flex-wrap gap-2">
            {detections.map((d, i) => (
              <div
                key={i}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30"
              >
                {d.label} — {(d.confidence * 100).toFixed(1)}%
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* RESET */}
      {(prediction || detections.length > 0) && (
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition"
        >
          🔄 Reset
        </button>
      )}

      {/* Apple scan animation */}
      <style jsx>{`
        @keyframes appleScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255,255,255,0.9),
            transparent
          );
          animation: appleScan 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
