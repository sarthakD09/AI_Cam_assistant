'use client'

import { Info, Trash } from 'phosphor-react'
import { useCallback, useState } from 'react'
import { Upload, UploadBody, UploadFooter, UploadIcon, UploadText } from 'keep-react'
import Image from 'next/image'
import { SMART_URL } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

type Detection = {
  label: string
  confidence: number
}

export const UploadComponent = () => {
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<string | null>(null)

  const [prediction, setPrediction] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [resultImage, setResultImage] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return

    const file = acceptedFiles[0]
    setFiles(acceptedFiles)

    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    setPrediction(null)
    setConfidence(null)
    setExplanation(null)
    setDetections([])
    setResultImage(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      setLoading(true)

      setStatus('Analyzing image...')
      await new Promise(r => setTimeout(r, 400))

      setStatus('Detecting objects...')
      await new Promise(r => setTimeout(r, 400))

      setStatus('Understanding scene...')

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
        setResultImage(data.image)
      }

    } catch (err) {
      console.error(err)
      setPrediction('Error analyzing image')
    } finally {
      setLoading(false)
      setStatus('')
    }
  }, [])

  return (
    <Upload options={{ onDrop }}>
      <UploadBody>
        <UploadIcon>
          <Image
            src="../../public/file.svg"
            alt="folder"
            height={28}
            width={28}
          />
        </UploadIcon>

        <UploadText>
          <p className="text-lg font-semibold text-gray-300">Drag & Drop or Choose File</p>
          <p className="text-sm text-gray-500">
            Upload an image
          </p>
        </UploadText>
      </UploadBody>

      <UploadFooter isFileExists={files.length > 0}>

        {/* FILE LIST */}
        {files.length > 0 && (
          <>
            <p className="flex items-center gap-2 text-sm font-medium mt-4 text-gray-100">
              <Info size={16} />
              Uploaded File
            </p>

            <ul className="mt-2">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="flex justify-between px-4 py-2 bg-gray-100 rounded text-gray-500"
                >
                  {file.name}
                  <Trash size={16} color="red" />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* IMAGE PREVIEW */}
        {preview && !loading && (
          <div className="mt-6">
            <Image
              src={preview}
              alt="Preview"
              width={500}
              height={500}
              className="rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-600 font-medium animate-pulse">
              🤖 {status}
            </p>
          </motion.div>
        )}

        {/* CLASSIFICATION RESULT */}
        {prediction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-green-50 to-white border"
          >
            <h2 className="text-2xl font-bold text-green-600">
              {prediction}
            </h2>

            <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${confidence! * 100}%` }}
              />
            </div>

            <p className="mt-2 text-sm text-gray-600">
              Confidence: {(confidence! * 100).toFixed(2)}%
            </p>

            <p className="mt-4 text-gray-700 leading-relaxed">
              {explanation}
            </p>
          </motion.div>
        )}

        {/* DETECTION RESULT */}
        {detections.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 to-white border"
          >
            <h2 className="text-xl font-bold text-blue-600 mb-3">
              Detected Objects
            </h2>

            <div className="flex flex-wrap gap-2">
              {detections.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm"
                >
                  {d.label} — {(d.confidence * 100).toFixed(1)}%
                </div>
              ))}
            </div>

            {resultImage && (
              <div className="mt-6">
                <Image
                  src={`data:image/jpeg;base64,${resultImage}`}
                  width={500}
                  height={500}
                  alt="Detection result"
                  className="rounded-xl shadow-lg"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* RESET */}
        {(prediction || detections.length > 0) && (
          <button
            onClick={() => {
              setFiles([])
              setPreview(null)
              setPrediction(null)
              setDetections([])
              setResultImage(null)
            }}
            className="mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-black"
          >
            🔄 Reset
          </button>
        )}

      </UploadFooter>
    </Upload>
  )
}
