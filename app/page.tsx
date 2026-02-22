'use client'

import { useState } from 'react'
import { UploadComponent } from '@/components/UploadComponent'
import { CameraComponent } from '@/components/CameraComponent'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [inputMode, setInputMode] = useState<'choice' | 'upload' | 'camera'>('choice')

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  }

  if (inputMode === 'upload' || inputMode === 'camera') {
    const Component = inputMode === 'upload' ? UploadComponent : CameraComponent
    const title = inputMode === 'upload' ? 'Upload Image' : 'Capture Photo'
    const icon = inputMode === 'upload' ? '🖼️' : '📷'

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      >
        <div className="container mx-auto px-4 py-8">
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ x: -5 }}
            onClick={() => setInputMode('choice')}
            className="group mb-8 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg 
              className="w-5 h-5 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to options</span>
          </motion.button>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="text-4xl">{icon}</div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{title}</h2>
                  <p className="text-white/60 mt-1">
                    {inputMode === 'upload' 
                      ? 'Choose an image from your device' 
                      : 'Use your camera to capture an image'}
                  </p>
                </div>
              </div>
              
              <Component />
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
              className="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-full mb-6"
            >
              <span className="text-3xl">🤖</span>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              AI Camera
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text"> Assistant</span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Upload or capture an image. Our AI will analyze it automatically and provide instant insights.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div 
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6 mb-12"
          >
            {[
              {
                icon: "⚡",
                title: "Instant Analysis",
                description: "Get AI-powered insights in seconds"
              },
              {
                icon: "🔍",
                title: "Detailed Results",
                description: "Comprehensive analysis with key findings"
              },
              {
                icon: "🛡️",
                title: "Privacy First",
                description: "Your images are processed securely"
              },
              {
                icon: "🎯",
                title: "High Accuracy",
                description: "State-of-the-art AI model for precise results"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/40 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInputMode('camera')}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">📷</span>
                Click Photo
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800"
                initial={{ x: "100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInputMode('upload')}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">🖼️</span>
                Upload from Gallery
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700"
                initial={{ x: "100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>

          {/* Trust badge */}
          <motion.div 
            variants={itemVariants}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full">
              <span className="text-yellow-400">⭐</span>
              <span className="text-white/60 text-sm">Powered by YOLO + MobileNetV2 + LLM
</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}