import { Suspense } from 'react'
import Link from 'next/link'
import { 
  Activity, 
  Brain, 
  Database, 
  TrendingUp, 
  Zap, 
  Clock, 
  Menu, 
  X, 
  ChevronRight,
  BarChart3,
  Shield,
  Smartphone
} from 'lucide-react'

interface Feature {
  id: string
  title: string
  description: string
  icon: string
}

interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted?: boolean
}

const iconMap: Record<string, React.ComponentType<{className?: string}>> = {
  activity: Activity,
  brain: Brain,
  database: Database,
  trending: TrendingUp,
  zap: Zap,
  clock: Clock,
  chart: BarChart3,
  shield: Shield,
  mobile: Smartphone
}

async function getFeatures(): Promise<Feature[]> {
  try {
    const res = await fetch('/api/features', { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Failed to fetch features')
    return res.json()
  } catch {
    return [
      {
        id: '1',
        title: 'Multi-Variable Logger',
        description: 'Timestamped tracking for weight, macros, sleep quality, stress levels, meal timing, and water intake with streak-based compliance scoring.',
        icon: 'database'
      },
      {
        id: '2',
        title: 'Plateau Detection AI',
        description: 'Automated algorithms identify stagnation periods (7+ days within 1lb variance) and flag breakthrough days with sudden 1.5lb+ drops.',
        icon: 'activity'
      },
      {
        id: '3',
        title: 'Correlation Engine',
        description: 'Pearson/Spearman statistical analysis calculating significance between lifestyle variables and weight velocity, ranked by impact coefficient.',
        icon: 'brain'
      }
    ]
  }
}

async function getPricing(): Promise<PricingTier[]> {
  try {
    const res = await fetch('/api/pricing', { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Failed to fetch pricing')
    return res.json()
  } catch {
    return [
      {
        id: '1',
        name: 'Starter',
        price: '$0',
        period: 'month',
        description: 'Break your first plateau with essential analytics',
        features: ['30-day data history', 'Basic correlation metrics', 'Mobile app access', 'CSV export'],
        highlighted: false
      },
      {
        id: '2',
        name: 'Pro',
        price: '$19',
        period: 'month',
        description: 'Forensic-grade insights for serious data-driven dieters',
        features: ['Unlimited history', 'Advanced forensics dashboard', 'API webhooks (Apple Health, Whoop)', 'Lag pattern detection', 'Priority insight notifications'],
        highlighted: true
      },
      {
        id: '3',
        name: 'Elite',
        price: '$49',
        period: 'month',
        description: 'Real-time metabolic analytics for coaches and athletes',
        features: ['Everything in Pro', 'Coach dashboard', 'Custom variable tracking', 'Real-time sync', 'White-label reports', '24/7 priority support'],
        highlighted: false
      }
    ]
  }
}

function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <span className="text-xl font-bold text-white">PlateauBreaker</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-slate-300 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="/auth" className="text-slate-300 hover:text-white transition-colors">Sign In</Link>
            <Link 
              href="/auth" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden">
            <label htmlFor="menu-toggle" className="cursor-pointer block text-slate-300 hover:text-white">
              <Menu className="h-6 w-6" />
            </label>
          </div>
        </div>
      </div>
      
      <input type="checkbox" id="menu-toggle" className="hidden peer" />
      <div className="hidden peer-checked:block md:hidden bg-[#0F172A] border-b border-slate-800">
        <div className="px-4 pt-2 pb-6 space-y-2">
          <Link href="#features" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Features</Link>
          <Link href="#pricing" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Pricing</Link>
          <Link href="/auth" className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Sign In</Link>
          <Link 
            href="/auth" 
            className="block px-3 py-2 text-emerald-400 font-medium hover:text-emerald-300"
          >
            Get Started Free →
          </Link>
        </div>
      </div>
    </nav>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = iconMap[feature.icon] || Activity
  return (
    <div className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-[#0F172A] mb-3">{feature.title}</h3>
        <p className="text-slate-600 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div className={`relative rounded-2xl p-8 ${tier.highlighted ? 'bg-[#0F172A] text-white shadow-2xl scale-105 border-2 border-emerald-500' : 'bg-white border border-slate-200 shadow-sm'}`}>
      {tier.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${tier.highlighted ? 'text-emerald-400' : 'text-slate-900'}`}>
          {tier.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-[#0F172A]'}`}>
            {tier.price}
          </span>
          <span className={`text-sm ${tier.highlighted ? 'text-slate-400' : 'text-slate-500'}`}>
            /{tier.period}
          </span>
        </div>
        <p className={`mt-2 text-sm ${tier.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
          {tier.description}
        </p>
      </div>
      <ul className="space-y-4 mb-8">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Zap className={`h-5 w-5 flex-shrink-0 mt-0.5 ${tier.highlighted ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm ${tier.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/auth"
        className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors ${tier.highlighted ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-[#0F172A]'}`}
      >
        {tier.highlighted ? 'Start Free Trial' : 'Get Started'}
      </Link>
    </div>
  )
}

export default async function HomePage() {
  const features = await getFeatures()
  const pricing = await getPricing()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 bg-[#0F172A] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0F172A] to-[#0F172A]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2310b981%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></