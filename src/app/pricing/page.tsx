'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Check, 
  X, 
  Menu, 
  ChevronDown, 
  Zap, 
  Users, 
  Building2, 
  Activity,
  TrendingUp,
  Database,
  Shield,
  Download,
  Bell
} from 'lucide-react'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For casual trackers getting started with data-driven weight loss.',
    icon: Activity,
    features: [
      'Daily variable logging (weight, calories, sleep)',
      '30-day data history',
      'Basic trend visualization',
      'CSV export (last 30 days only)',
      'Community support',
      'Mobile app access'
    ],
    notIncluded: [
      'Correlation engine',
      'Plateau detection',
      'API webhooks',
      'Insight notifications'
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For serious biohackers ready to break through plateaus with forensic precision.',
    icon: Zap,
    features: [
      'Everything in Free, plus:',
      'Unlimited data history',
      'Pearson/Spearman correlation engine',
      'Automated plateau detection (7+ days)',
      'Breakthrough forensics dashboard',
      'Dual-variable trend overlays',
      'Push notification insights',
      'API webhooks (Apple Health, MyFitnessPal, Whoop)',
      'Priority email support',
      'Advanced CSV exports'
    ],
    notIncluded: [],
    cta: 'Start Free Trial',
    href: '/signup?plan=pro',
    highlighted: true
  },
  {
    name: 'Business',
    price: '$49',
    period: '/month',
    description: 'For coaches and clinics managing multiple clients and data streams.',
    icon: Building2,
    features: [
      'Everything in Pro, plus:',
      'Multi-client dashboard (up to 50)',
      'Client progress analytics',
      'White-label PDF reports',
      'Team collaboration tools',
      'Custom integration support',
      'Dedicated account manager',
      'SLA guarantee (99.9% uptime)',
      'HIPAA-compliant data handling'
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false
  }
]

const comparisonFeatures = [
  { name: 'Daily Logging Variables', free: 'Basic (4)', pro: 'Advanced (8+)', business: 'Custom' },
  { name: 'Data History', free: '30 days', pro: 'Unlimited', business: 'Unlimited' },
  { name: 'Correlation Analysis', free: false, pro: 'Full statistical engine', business: 'Full statistical engine' },
  { name: 'Plateau Detection', free: false, pro: 'Automated + Alerts', business: 'Automated + Alerts' },
  { name: 'Breakthrough Forensics', free: false, pro: true, business: true },
  { name: 'Trend Overlays', free: 'Single variable', pro: 'Dual variable', business: 'Multi-variable' },
  { name: 'Data Export', free: 'CSV (limited)', pro: 'CSV + API', business: 'CSV + API + White-label' },
  { name: 'Integrations', free: 'Manual entry', pro: 'Apple Health, MyFitnessPal, Whoop', business: 'Custom webhooks' },
  { name: 'Client Management', free: false, pro: false, business: 'Up to 50 clients' },
  { name: 'Support', free: 'Community', pro: 'Priority email', business: 'Dedicated manager' }
]

const faqs = [
  {
    question: 'How does the correlation engine determine which variables break plateaus?',
    answer: 'Our engine calculates Pearson (linear) and Spearman (rank) correlations between your logged variables and weight velocity. It controls for time-lagged effects (e.g., sleep affecting weight 48 hours later) and only surfaces insights with statistical significance (p < 0.05). The system requires minimum 14 days of consistent logging to ensure data density.'
  },
  {
    question: 'Can I import historical data from Apple Health or MyFitnessPal?',
    answer: 'Yes. Pro and Business users can connect via API webhooks or import CSV files. We automatically map common fields like weight, sleep, and nutrition data. Free users can manually import up to 30 days of historical data during onboarding.'
  },
  {
    question: 'What constitutes a "plateau" versus normal weight fluctuation?',
    answer: 'Our algorithm defines a plateau as 7+ consecutive days where daily weight measurements stay within a 1-pound variance (±0.5 lbs) despite maintained caloric deficit. We use a rolling 3-day average to smooth out water weight fluctuations. Breakthroughs are flagged as single-day drops of 1.5+ lbs following the plateau period.'
  },
  {
    question: 'Is my health data secure and private?',
    answer: 'Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are GDPR and CCPA compliant. Business tier includes HIPAA-compliant data handling for clinical use. We never sell your data to third parties.'
  },
  {
    question: 'Can I switch plans or cancel anytime?',
    answer: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Pro-rated refunds are available for annual plans within 30 days. Your data remains accessible for export for 90 days after cancellation.'
  }
]

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A]">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#0F172A]">PlateauBreaker</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:gap-8">
              <Link href="/features" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">Features</Link>
              <Link href="/pricing" className="text-sm font-medium text-[#0F172A]">Pricing</Link>
              <Link href="/science" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">The Science</Link>
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">Log in</Link>
                <Link 
                  href="/signup" 
                  className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="space-y-1 px-4 pb-3 pt-2">
              <Link href="/features" className="block rounded-lg px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-[#0F172A]">Features</Link>
              <Link href="/pricing" className="block rounded-lg px-3 py-2 text-base font-medium text-[#0F172A] bg-slate-50">Pricing</Link>
              <Link href="/science" className="block rounded-lg px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-[#0F172A]">The Science</Link>
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
                <Link href="/login" className="block rounded-lg px-3 py-2 text-center text-base font-medium text-slate-600 hover:bg-slate-50">Log in</Link>
                <Link href="/signup" className="block rounded-lg bg-[#0F172A] px-3 py-2 text-center text-base font-medium text-white hover:bg-slate-800">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
              Forensic analytics for
              <span className="block text-slate-500">data-driven dieters</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Stop guessing why your weight stalled. Our correlation engine identifies the specific lifestyle variables that actually drive breakthroughs.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="relative bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                  tier.highlighted 
                    ? 'ring-2 ring-[#0F172A] lg:scale-105 lg:z-10' 
                    : 'border border-slate-200'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#0F172A] px-4 py-1 text-xs font-medium text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tier.highlighted ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <tier.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">{tier.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold tracking-tight text-[#0F172A]">{tier.price}</span>
                    <span className="ml-1 text-sm font-medium text-slate-500">{tier.period}</span>
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                  {tier.notIncluded.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 opacity-50">
                      <X className="h-5 w-5 shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-400 line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`mt-auto block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-[#0F172A] text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Compare plans</h2>
            <p className="mt-4 text-slate-600">Full breakdown of forensic analytics capabilities</p>
          </div>

          <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-sm font-semibold text-[#0F172A]">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#0F172A]">Free</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#0F172A] bg-slate-100">Pro</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#0F172A]">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {comparisonFeatures.map((feature, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{feature.name}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {typeof feature.free === 'boolean' ? (
                          feature.free ? <Check className="mx-auto h-5 w-5 text-emerald-600" /> : <X className="mx-auto h-5 w-5 text-slate-300" />
                        ) : (
                          feature.free
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600 bg-slate-50/50">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? <Check className="mx-auto h-5 w-5 text-emerald-600" /> : <X className="mx-auto h-5 w-5 text-slate-300" />
                        ) : (
                          <span className="font-medium text-[#0F172A]">{feature.pro}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {typeof feature.business === 'boolean' ? (
                          feature.business ? <Check className="mx-auto h-5 w-5 text-emerald-600" /> : <X className="mx-auto h-5 w-5 text-slate-300" />
                        ) : (
                          feature.business
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Frequently asked questions</h2>
            <p className="mt-4 text-slate-600">Everything you need to know about forensic weight loss analytics</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#0F172A]">{faq.question}</span>
                  <ChevronDown 
                    className={`h-5 w-5 text-slate-500 transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#0F172A] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to break your plateau?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Join thousands of data-driven dieters who stopped guessing and started knowing what actually works for their body.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#0F172A] hover:bg-slate-100 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/demo" 
              className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              View Demo Data
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">No credit card required. 14-day free trial.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A]">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#0F172A]">PlateauBreaker</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-600">
              <Link href="/privacy" className="hover:text-[#0F172A]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
              <Link href="/api" className="hover:text-[#0F172A]">API Docs</Link>
              <Link href="/contact" className="hover:text-[#0F172A]">Contact</Link>
            </div>
            <div className="text-sm text-slate-500">
              © 2024 PlateauBreaker. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}