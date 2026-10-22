import React from 'react';
import { TheoryModule } from '@/types/ui';
import { TrafficSignSvg } from './TrafficSignSvg';
import { X, Clock, Play, BookOpen, CheckCircle, Lightbulb } from 'lucide-react';

interface ModuleDetailModalProps {
  module: TheoryModule | null;
  onClose: () => void;
  onTestInSimulator: () => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({
  module,
  onClose,
  onTestInSimulator,
}) => {
  if (!module) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {module.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{module.readTimeMinutes} menit baca</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1 leading-relaxed">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {module.title}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-950/70 p-4 rounded-2xl border border-slate-100 dark:border-neutral-800">
              {module.summary}
            </p>
          </div>

          {/* Sections */}
          {module.sections.map((sec, idx) => (
            <div key={idx} className="space-y-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {sec.heading}
              </h3>

              <div className="space-y-2 text-sm text-slate-700 dark:text-neutral-300">
                {sec.content.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* Traffic Signs Showcase if any */}
              {sec.signs && sec.signs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {sec.signs.map((sign) => (
                    <div
                      key={sign.code}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/60 flex flex-col items-center text-center"
                    >
                      <div className="my-2">
                        <TrafficSignSvg type={sign.svgType} size={56} />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {sign.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 line-clamp-3">
                        {sign.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Practical Tips Callout */}
              {sec.tips && sec.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Tips Praktik Instruktur</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/90 pl-6 list-disc">
                    {sec.tips.map((tip, tIdx) => (
                      <li key={tIdx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-neutral-400 text-center sm:text-left">
            Selesai membaca? Latih pemahaman rambu ini di lintasan simulasi 3D.
          </div>
          <button
            onClick={() => {
              onClose();
              onTestInSimulator();
            }}
            className="w-full sm:w-auto py-2.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Uji Materi di Simulator 3D</span>
          </button>
        </div>
      </div>
    </div>
  );
};
