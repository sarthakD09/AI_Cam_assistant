'use client'

import { Info, Trash } from 'phosphor-react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { Upload, UploadBody, UploadFooter, UploadIcon, UploadText } from 'keep-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Client } from "@gradio/client";

type Detection = {
  label: string
  confidence: number
  box: number[] // [x1, y1, x2, y2]
}

export const UploadComponent = () => {
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const [prediction, setPrediction] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [caption, setCaption] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const reset = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setFiles([])
    setPreview(null)
    setPrediction(null)
    setConfidence(null)
    setExplanation(null)
    setDetections([])
    setResultImage(null)
    setCaption(null)
    setImageDimensions({ width: 0, height: 0 })
    setShowDeleteConfirm(false)
  }

  // Calculate bounding box position relative to displayed image
  const getBoxStyle = (box: number[], containerWidth: number, containerHeight: number) => {
    if (!imageDimensions.width || !imageDimensions.height) return null;

    // Calculate scaling between original image and displayed image
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;

    // Use the smaller scale to maintain aspect ratio (letterboxing)
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offset for letterboxing
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return

    const file = acceptedFiles[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setFiles(acceptedFiles)

    // Clean up previous preview
    if (preview) {
      URL.revokeObjectURL(preview)
    }

    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    setPrediction(null)
    setConfidence(null)
    setExplanation(null)
    setDetections([])
    setResultImage(null)
    setCaption(null)

    try {
      setLoading(true)
      setStatus('🖼️ Analyzing image...')
      await new Promise(r => setTimeout(r, 400))

      setStatus('🔍 Detecting objects...')
      await new Promise(r => setTimeout(r, 400))

      setStatus('🧠 Understanding scene...')

      const client = await Client.connect("Novion10/yolo_api");
      const result = await client.predict("/process", {
        image: file
      });

      const data = (Array.isArray(result.data) ? result.data[0] : result.data) || {};

      console.log("API Response:", data);

      setCaption(data.caption || null);

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

      if (data.result_image) {
        setResultImage(data.result_image);
      }

    } catch (err) {
      console.error('Upload error:', err)
      setPrediction('Error analyzing image')
    } finally {
      setLoading(false)
      setStatus('')
    }
  }, [preview])

  const removeFile = (fileName: string) => {
    setFiles(files.filter(f => f.name !== fileName))
    if (preview) {
      URL.revokeObjectURL(preview)
      setPreview(null)
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Upload options={{ onDrop }} className="bg-[#0a0a0a36] border-2 border-dashed border-white/10 rounded-2xl hover:border-white/20 transition-colors">
        <UploadBody className="p-8">
          <UploadIcon>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Image
                src="/file.svg"
                alt="folder"
                height={32}
                width={32}
                className="opacity-50"
              />
            </div>
          </UploadIcon>

          <UploadText>
            <p className="text-xl font-semibold text-gray-400 mb-2">
              Drag & Drop or Choose File
            </p>
            <p className="text-sm text-gray-400">
              Upload an image (JPG, PNG, GIF - max 10MB)
            </p>
          </UploadText>
        </UploadBody>

        <UploadFooter isFileExists={files.length > 0}>
          <AnimatePresence mode="wait">
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 space-y-6"
              >
                {/* FILE LIST */}
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
                    <Info size={16} />
                    Uploaded File
                  </p>

                  <ul className="space-y-2">
                    {files.map((file) => (
                      <motion.li
                        key={file.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/10"
                      >
                        <span className="text-white/80 text-sm truncate flex-1">
                          {file.name}
                        </span>
                        <div className="relative">
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <Trash size={18} className="text-red-400" />
                          </button>
                          
                          {/* Delete confirmation */}
                          <AnimatePresence>
                            {showDeleteConfirm && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-2 p-3 bg-[#1A1A1A] rounded-xl border border-white/10 shadow-xl z-50 w-48"
                              >
                                <p className="text-sm text-white/80 mb-3">Remove file?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => removeFile(file.name)}
                                    className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* IMAGE PREVIEW */}
                {preview && !loading && (
                  <div 
                    ref={imageContainerRef}
                    className="relative rounded-xl overflow-hidden bg-black/50 border border-white/10"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        onLoadingComplete={(img) => {
                          setImageDimensions({
                            width: img.naturalWidth,
                            height: img.naturalHeight
                          });
                        }}
                      />
                    </div>

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
                          <div className="absolute -top-7 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded-t-md whitespace-nowrap font-medium shadow-lg">
                            {det.label} {(det.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* LOADING STATE */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6 py-8"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🔍</span>
                      </div>
                    </div>
                    <p className="text-white/80 font-medium bg-white/5 px-6 py-3 rounded-full backdrop-blur-sm">
                      {status}
                    </p>
                  </motion.div>
                )}

                {/* RESULTS */}
                {!loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* CAPTION */}
                    {caption && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm border border-white/20">
                        <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-lg">
                          <span>🧠</span> AI Caption
                        </h3>
                        <p className="text-white/90 leading-relaxed text-sm md:text-base">
                          {caption}
                        </p>
                      </div>
                    )}

                    {/* CLASSIFICATION RESULT */}
                    {prediction && (
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h2 className="text-2xl font-bold text-green-400 mb-2">
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
                            <p className="mt-2 text-sm text-white/60">
                              Confidence: {(confidence * 100).toFixed(2)}%
                            </p>
                          </>
                        )}

                        {explanation && (
                          <p className="mt-4 text-white/80 leading-relaxed border-t border-white/10 pt-4 text-sm">
                            {explanation}
                          </p>
                        )}
                      </div>
                    )}

                    {/* DETECTION RESULT */}
                    {detections.length > 0 && (
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                          <span>🔍</span> Detected Objects ({detections.length})
                        </h2>

                        <div className="grid grid-cols-2 gap-2">
                          {detections.map((d, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30 text-sm hover:bg-blue-500/30 transition-colors"
                            >
                              <span className="font-medium">{d.label}</span>
                              <span className="text-blue-400/70 ml-1">
                                {(d.confidence * 100).toFixed(0)}%
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        {resultImage && (
                          <div className="mt-6 rounded-xl overflow-hidden border border-white/10">
                            <Image
                              src={`data:image/jpeg;base64,${resultImage}`}
                              width={500}
                              height={500}
                              alt="Detection result"
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* RESET BUTTON */}
                    {(prediction || detections.length > 0 || caption) && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={reset}
                        className="w-full mt-4 px-6 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition font-medium border border-white/20 flex items-center justify-center gap-2 group"
                      >
                        <span className="text-xl group-hover:rotate-180 transition-transform duration-500">
                          🔄
                        </span>
                        Upload New Image
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </UploadFooter>
      </Upload>
    </div>
  )
}