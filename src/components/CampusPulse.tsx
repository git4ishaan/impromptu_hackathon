import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, Volume2, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

export const CampusPulse: React.FC = () => {
  const stats = [
    {
      title: 'Library Occupancy',
      value: '68%',
      subtitle: 'Moderate capacity • 142 seats available',
      trend: '+12% from last hour',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      chartType: 'ring',
      percent: 68,
    },
    {
      title: 'Active Study Sessions',
      value: '24',
      subtitle: 'Across 4 library wings',
      trend: '6 started in last 30m',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      chartType: 'bars',
      bars: [30, 45, 60, 40, 75, 90, 80, 95],
    },
    {
      title: 'Quiet Study Zones',
      value: '8 / 10',
      subtitle: 'Avg noise: 21 dB (Whisper quiet)',
      trend: 'Optimal for deep focus',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      chartType: 'noise',
      noiseLevel: 21,
    },
    {
      title: 'Students Syncing Live',
      value: '142',
      subtitle: 'Active now in StudySpot',
      trend: 'Peak expected 6:30 PM',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      chartType: 'pulse',
    },
  ];

  const zoneAcoustics = [
    { floor: 'Floor 1', name: 'Collaborative Hub', noise: '42 dB', status: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { floor: 'Floor 2', name: 'Silent Focus Deck', noise: '18 dB', status: 'Ultra Quiet', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { floor: 'Floor 3', name: 'Engineering Wing', noise: '28 dB', status: 'Quiet', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { floor: 'Floor 4', name: 'Research Lab Desks', noise: '20 dB', status: 'Ultra Quiet', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  return (
    <section id="pulse" className="py-12 px-4 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Campus Telemetry</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white headline-font tracking-tight">
            Campus Pulse
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time acoustics, occupancy rates, and peer velocity across MIT-WPU study spaces.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Updated 30s ago
        </div>
      </div>

      {/* 4 Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`p-6 rounded-2xl bg-slate-900/75 border ${stat.borderColor} shadow-xl backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
                <span>{stat.title}</span>
                <span className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  {stat.chartType === 'ring' && <Users className={`w-3.5 h-3.5 ${stat.color}`} />}
                  {stat.chartType === 'bars' && <TrendingUp className={`w-3.5 h-3.5 ${stat.color}`} />}
                  {stat.chartType === 'noise' && <Volume2 className={`w-3.5 h-3.5 ${stat.color}`} />}
                  {stat.chartType === 'pulse' && <Sparkles className={`w-3.5 h-3.5 ${stat.color}`} />}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-extrabold headline-font tracking-tight ${stat.color}`}>
                  {stat.value}
                </span>
                {stat.chartType === 'ring' && (
                  <div className="relative w-8 h-8 ml-auto">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-indigo-500"
                        strokeDasharray={`${stat.percent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                )}
                {stat.chartType === 'bars' && (
                  <div className="flex items-end gap-1 h-6 ml-auto">
                    {stat.bars?.map((h, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${h}%` }}
                        className="w-1 bg-emerald-500/80 rounded-full"
                      ></div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                {stat.subtitle}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Acoustic & Floor telemetry breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
        {zoneAcoustics.map((zone) => (
          <div
            key={zone.floor}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                {zone.floor}
              </span>
              <p className="text-xs font-bold text-slate-200 truncate">{zone.name}</p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${zone.bg} ${zone.color}`}>
                {zone.noise}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{zone.status}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
