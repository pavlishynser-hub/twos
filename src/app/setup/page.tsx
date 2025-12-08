'use client'

import { useState, useEffect } from 'react'
import { generateAuthenticatorSecret, generateAuthenticatorURI } from '@/lib/duelEngine'
import { currentUser } from '@/data/mock'
import Link from 'next/link'

export default function SetupPage() {
  const [secret, setSecret] = useState<string>('')
  const [qrUrl, setQrUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    // Generate secret on mount
    const newSecret = generateAuthenticatorSecret()
    setSecret(newSecret)
    
    // Generate QR code URL (using Google Charts API for simplicity)
    const uri = generateAuthenticatorURI(newSecret, currentUser.username)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
    setQrUrl(qrApiUrl)
  }, [])

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Setup Authenticator</h1>
          <p className="text-gray-400">Connect Google Authenticator to participate in duels</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${step >= s 
                  ? 'bg-accent-primary text-white' 
                  : 'bg-dark-700 text-gray-500'}
              `}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-2 rounded ${step > s ? 'bg-accent-primary' : 'bg-dark-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Download App */}
        {step === 1 && (
          <div className="card-base animate-fadeIn">
            <h2 className="text-xl font-bold text-white mb-4">Step 1: Download App</h2>
            <p className="text-gray-400 mb-6">
              Download Google Authenticator on your phone if you don't have it already.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <a 
                href="https://apps.apple.com/app/google-authenticator/id388497605"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors group"
              >
                <div className="text-3xl mb-2">🍎</div>
                <p className="font-medium text-white group-hover:text-accent-primary transition-colors">
                  App Store
                </p>
                <p className="text-xs text-gray-500">iOS</p>
              </a>
              
              <a 
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors group"
              >
                <div className="text-3xl mb-2">🤖</div>
                <p className="font-medium text-white group-hover:text-accent-primary transition-colors">
                  Google Play
                </p>
                <p className="text-xs text-gray-500">Android</p>
              </a>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full btn-primary"
            >
              I have the app →
            </button>
          </div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 2 && (
          <div className="card-base animate-fadeIn">
            <h2 className="text-xl font-bold text-white mb-4">Step 2: Add Account</h2>
            <p className="text-gray-400 mb-6">
              Open Google Authenticator, tap <strong>+</strong> and scan this QR code:
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-2xl">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Manual Entry */}
            <div className="p-4 bg-dark-700 rounded-xl mb-6">
              <p className="text-sm text-gray-400 mb-2">Or enter this code manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-dark-600 rounded-lg font-mono text-accent-primary text-center tracking-wider">
                  {secret}
                </code>
                <button 
                  onClick={copySecret}
                  className="px-4 py-3 bg-dark-600 rounded-lg hover:bg-dark-500 transition-colors"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 btn-secondary"
              >
                ← Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="flex-1 btn-primary"
              >
                I've added it →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 3 && (
          <div className="card-base animate-fadeIn">
            <h2 className="text-xl font-bold text-white mb-4">Step 3: Ready!</h2>
            
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-accent-success/20 flex items-center justify-center">
                <span className="text-5xl">✓</span>
              </div>
              <p className="text-xl font-bold text-accent-success mb-2">Setup Complete!</p>
              <p className="text-gray-400">
                You're now ready to participate in TOTP duels.
              </p>
            </div>

            {/* How it works */}
            <div className="p-4 bg-dark-700 rounded-xl mb-6">
              <h3 className="font-medium text-white mb-3">How duels work:</h3>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="text-accent-primary">1.</span>
                  When a duel starts, you have 10 seconds to enter your code
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-primary">2.</span>
                  Both players enter their current 6-digit TOTP code
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-primary">3.</span>
                  <strong className="text-white">Higher code wins!</strong> Equal codes = Draw
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 btn-secondary"
              >
                ← Back
              </button>
              <Link href="/" className="flex-1 btn-primary text-center">
                Start Playing! 🎮
              </Link>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="card-base">
            <h3 className="font-medium text-white mb-2">🎲 Why TOTP?</h3>
            <p className="text-sm text-gray-400">
              Each player's code comes from their own device. 
              No one can predict or manipulate the outcome — pure chance!
            </p>
          </div>
          
          <div className="card-base">
            <h3 className="font-medium text-white mb-2">🤝 What's a Draw?</h3>
            <p className="text-sm text-gray-400">
              If both players enter the same code (1 in 1,000,000 chance), 
              it's a draw and stakes are returned.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

