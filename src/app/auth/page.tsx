'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, Menu, X, Chrome, Github } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const router = useRouter()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isLogin ? 'login' : 'signup',
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setErrors({ 
        form: error instanceof Error ? error.message : 'An unexpected error occurred' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = (provider: string) => {
    console.log(`OAuth with ${provider}`)
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200">
      <nav className="border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0F172A]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">PlateauBreaker</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Home</a>
              <a href="/features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="/pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800">
            <div className="space-y-1 px-4 pb-3 pt-2">
              <a href="/" className="block rounded-md px-3 py-2 text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white">Home</a>
              <a href="/features" className="block rounded-md px-3 py-2 text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white">Features</a>
              <a href="/pricing" className="block rounded-md px-3 py-2 text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white">Pricing</a>
            </div>
          </div>
        )}
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setErrors({})
                setFormData({ email: '', password: '', confirmPassword: '' })
              }}
              className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900/50 px-4 py-8 shadow-xl ring-1 ring-white/10 sm:rounded-lg sm:px-10">
            <div className="flex rounded-lg bg-slate-800/50 p-1 mb-6">
              <button
                onClick={() => {
                  setIsLogin(true)
                  setErrors({})
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  isLogin 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false)
                  setErrors({})
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  !isLogin 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors.form && (
                <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
                  {errors.form}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-300">
                  Email address
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full rounded-md border-0 bg-slate-800 py-2.5 pl-10 pr-3 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-300">
                  Password
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    value={formData.password