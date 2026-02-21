import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Brain, 
  Search, 
  Bell, 
  LineChart, 
  Download, 
  Flame, 
  Menu, 
  X, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Clock, 
  Moon, 
  Droplets, 
  Utensils, 
  Gauge, 
  AlertCircle,
  CheckCircle2,
  Apple,
  Link as LinkIcon,
  Zap,
  Target,
  BarChart3,
  ArrowRightLeft
} from 'lucide-react';

interface DailyEntry {
  id: string;
  date: string;
  timestamp: number;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sleepDuration: number;
  sleepQuality: number;
  stressLevel: number;
  mealWindowStart: string;
  mealWindowEnd: string;
  waterIntake: number;
}

interface PlateauPeriod {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  avgWeight: number;
  variance: number;
  type: 'plateau' | 'breakthrough';
  weightChange?: number;
}

interface CorrelationFactor {
  variable: string;
  coefficient: number;
  significance: number;
  impactScore: number;
  direction: 'positive' | 'negative';
}

interface Insight {
  id: string;
  type: 'sleep' | 'stress' | 'nutrition' | 'timing' | 'hydration';
  message: string;
  metric: string;
  confidence: number;
  timestamp: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  variableConsistency: Record<string, number>;
  lastSevenDays: boolean[];
}

interface ForensicComparison {
  variable: string;
  plateauAvg: number;
  breakthroughAvg: number;
  difference: number;
  unit: string;
}

const DashboardPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    entries: DailyEntry[];
    plateaus: PlateauPeriod[];
    correlations: CorrelationFactor[];
    insights: Insight[];
    streaks: StreakData;
    forensics: ForensicComparison[];
  } | null>(null);

  const [loggerForm, setLoggerForm] = useState<Partial<DailyEntry>>({
    date: new Date().toISOString().split('T')[0],
    weight: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sleepDuration: 7,
    sleepQuality: 7,
    stressLevel: 5,
    waterIntake: 2000,
    mealWindowStart: '08:00',
    mealWindowEnd: '20:00'
  });

  const [selectedTrendVars, setSelectedTrendVars] = useState({
    primary: 'weight',
    secondary: 'sleepDuration',
    lagDays: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/data');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loggerForm)
      });
      if (response.ok) {
        fetchDashboardData();
        setLoggerForm({
          date: new Date().toISOString().split('T')[0],
          weight: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sleepDuration: 7,
          sleepQuality: 7,
          stressLevel: 5,
          waterIntake: 2000,
          mealWindowStart: '08:00',
          mealWindowEnd: '20:00'
        });
      }
    } catch (err) {
      console.error('Failed to log entry:', err);
    }
  };

  const exportCSV = async (type: 'apple' | 'myfitnesspal' | 'whoop') => {
    try {
      const response = await fetch(`/api/export?platform=${type}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plateau-breaker-export-${type}.csv`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'logger', label: 'Daily Logger', icon: Plus },
    { id: 'plateaus', label: 'Plateau Detection', icon: Target },
    { id: 'correlations', label: 'Correlation Engine', icon: Brain },
    { id: 'forensics', label: 'Breakthrough Forensics', icon: Search },
    { id: 'insights', label: 'Insight Generator', icon: Bell },
    { id: 'trends', label: 'Trend Overlay', icon: LineChart },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'compliance', label: 'Compliance Tracker', icon: Flame },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Current Weight</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.entries[data.entries.length - 1]?.weight.toFixed(1) || '--'} lbs
          </div>
          <div className="text-xs text-emerald-400 mt-1">↓ 1.2 lbs from last week</div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Active Plateaus</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.plateaus.filter(p => p.type === 'plateau').length || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Last detected 3 days ago</div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Top Correlation</span>
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {data?.correlations[0]?.variable || 'Sleep Duration'}
          </div>
          <div className="text-xs text-emerald-400 mt-1">r = {data?.correlations[0]?.coefficient.toFixed(2) || '0.84'}</div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Current Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data?.streaks.currentStreak || 12} days</div>
          <div className="text-xs text-slate-400 mt-1">Best: {data?.streaks.longestStreak || 45} days</div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Recent Insights
        </h3>
        <div className="space-y-3">
          {data?.insights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="mt-0.5">
                {insight.type === 'sleep' && <Moon className="w-4 h-4 text-indigo-400" />}
                {insight.type === 'stress' && <Gauge className="w-4 h-4 text-red-400" />}
                {insight.type === 'nutrition' && <Utensils className="w-4 h-4 text-emerald-400" />}
                {insight.type === 'timing' && <Clock className="w-4 h-4 text-blue-400" />}
                {insight.type === 'hydration' && <Droplets className="w-4 h-4 text-cyan-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-200">{insight.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{insight.metric}</span>
                  <span className="text-xs px-2 py-0.5 bg-slate-600 rounded-full text-slate-300">
                    {insight.confidence}% confidence
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLogger = () => (
    <div className="max-w-4xl">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cyan-400" />
          Multi-Variable Daily Entry
        </h3>
        
        <form onSubmit={handleLogSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date
              </label>
              <input
                type="date"
                value={loggerForm.date}
                onChange={(e) => setLoggerForm({...loggerForm, date: e.target.value})}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Weight (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                value={loggerForm.weight || ''}
                onChange={(e) => setLoggerForm({...loggerForm, weight: parseFloat(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Flame className="w-4 h-4" /> Calories
              </label>
              <input
                type="number"
                value={loggerForm.calories || ''}
                onChange={(e) => setLoggerForm({...loggerForm, calories: parseInt(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Protein (g)</label>
                <input
                  type="number"
                  value={loggerForm.protein || ''}
                  onChange={(e) => setLoggerForm({...loggerForm, protein: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Carbs (g)</label>
                <input
                  type="number"
                  value={loggerForm.carbs || ''}
                  onChange={(e) => setLoggerForm({...loggerForm, carbs: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Fat (g)</label>
                <input
                  type="number"
                  value={loggerForm.fat || ''}
                  onChange={(e) => setLoggerForm({...loggerForm, fat: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Moon className="w-4 h-4" /> Sleep Duration (hrs)
              </label>
              <input
                type="number"
                step="0.5"
                value={loggerForm.sleepDuration || ''}
                onChange={(e) => setLoggerForm({...loggerForm, sleepDuration: parseFloat(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Sleep Quality (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={loggerForm.sleepQuality}
                onChange={(e) => setLoggerForm({...loggerForm, sleepQuality: parseInt(e.target.value)})}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span className="text-cyan-400 font-semibold">{loggerForm.sleepQuality}</span>
                <span>10</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Stress Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={loggerForm.stressLevel}
                onChange={(e) => setLoggerForm({...loggerForm, stressLevel: parseInt(e.target.value)})}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Low</span>
                <span className="text-rose-400 font-semibold">{loggerForm.stressLevel}</span>
                <span>High</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Droplets className="w-4 h-4" /> Water (ml)
              </label>
              <input
                type="number"
                step="100"
                value={loggerForm.waterIntake || ''}
                onChange={(e) => setLoggerForm({...loggerForm, waterIntake: parseInt(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Eating Window Start
                </label>
                <input
                  type="time"
                  value={loggerForm.mealWindowStart}
                  onChange={(e) => setLoggerForm({...loggerForm, mealWindowStart: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Eating Window End
                </label>
                <input
                  type="time"
                  value={loggerForm.mealWindowEnd}
                  onChange={(e) => setLoggerForm({...loggerForm, mealWindowEnd: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Log Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPlateaus = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            Detected Plateaus
          </h3>
          <div className="space-y-3">
            {data?.plateaus.filter(p => p.type === 'plateau').map((plateau) => (
              <div key={plateau.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {plateau.startDate} → {plateau.endDate}
                    </div>
                    <div className="text-xs text-slate-400">{plateau.durationDays} days stagnation</div>
                  </div>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
                    Plateau
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">Avg: <span className="text-white">{plateau.avgWeight.toFixed(1)} lbs</span></span>
                  <span className="text-slate-400">Variance: <span className="text-white">±{plateau.variance.toFixed(1)} lbs</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Breakthrough Days
          </h3>
          <div className="space-y-3">
            {data?.plateaus.filter(p => p.type === 'breakthrough').map((breakthrough) => (
              <div key={breakthrough.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{breakthrough.startDate}</div>
                    <div className="text-xs text-slate-400">Sudden drop detected</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                    Breakthrough
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  -{breakthrough.weightChange?.toFixed(1)} lbs
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Algorithm Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Plateau Threshold</div>
            <div className="text-lg font-semibold text-white">7+ days</div>
            <div className="text-xs text-slate-500">Within 1 lb variance</div>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Breakthrough Threshold</div>
            <div className="text-lg font-semibold text-white">1.5+ lbs</div>
            <div className="text-xs text-slate-500">Single day drop</div>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Analysis Window</div>
            <div className="text-lg font-semibold text-white">90 days</div>
            <div className="text-xs text-slate-500">Historical data</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCorrelations = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Pearson/Spearman Correlation Analysis
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Variable</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Coefficient</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Significance (p)</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Impact Score</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Direction</th>
              </tr>
            </thead>
            <tbody>
              {data?.correlations.map((corr, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-sm text-white font-medium">{corr.variable}</td>
                  <td className="py-3 px-4 text-sm text-slate-300">{corr.coefficient.toFixed(3)}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      corr.significance < 0.05 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-400'
                    }`}>
                      {corr.significance.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500"
                          style={{ width: `${corr.impactScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{corr.impactScore.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      corr.direction === 'positive' 
                        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' 
                        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    }`}>
                      {corr.direction === 'positive' ? '↑ Positive' : '↓ Negative'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Strongest Positive Correlation</h4>
          <div className="text-2xl font-bold text-rose-400 mb-1">
            {data?.correlations.find(c => c.direction === 'positive')?.variable || 'Stress Level'}
          </div>
          <div className="text-sm text-slate-400">
            r = {data?.correlations.find(c => c.direction === 'positive')?.coefficient.toFixed(2) || '0.72'}
          </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Strongest Negative Correlation</h4>
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {data?.correlations.find(c => c.direction === 'negative')?.variable || 'Sleep Duration'}
          </div>
          <div className="text-sm text-slate-400">
            r = {data?.correlations.find(c => c.direction === 'negative')?.coefficient.toFixed(2) || '-0.68'}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForensics = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          Breakthrough Forensics
        </h3>
        <p className="text-sm text-slate-400 mb-6">Differential analysis between plateau days and breakthrough days</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Plateau Averages</h4>
            {data?.forensics.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-300">{item.variable}</span>
                <span className="text-sm font-mono text-slate-400">
                  {item.plateauAvg.toFixed(1)} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Breakthrough Averages</h4>
            {data?.forensics.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-300">{item.variable}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-emerald-400">
                    {item.breakthroughAvg.toFixed(1)} {item.unit}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.difference > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {item.difference > 0 ? '+' : ''}{item.difference.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h4 className="text-sm font