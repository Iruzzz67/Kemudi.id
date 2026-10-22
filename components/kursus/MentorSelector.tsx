import React, { useState } from 'react';
import { MENTORS } from '@/data/mockData';
import { Mentor, VehicleType } from '@/types/ui';
import { Star, Award, Users, MapPin, Check, Shield } from 'lucide-react';

interface MentorSelectorProps {
  selectedMentor: Mentor | null;
  onSelectMentor: (mentor: Mentor) => void;
}

export const MentorSelector: React.FC<MentorSelectorProps> = ({
  selectedMentor,
  onSelectMentor,
}) => {
  const [filterType, setFilterType] = useState<string>('semua');

  const filteredMentors = MENTORS.filter((m) => {
    if (filterType === 'semua') return true;
    return m.vehicleTypes.includes(filterType as VehicleType);
  });

  return (
    <div className="space-y-6 pt-12 border-t border-slate-200 dark:border-neutral-800">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Instruktur Tersertifikasi
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Pilih Mentor Pendamping
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
            Instruktur ramah dan bersertifikat BNSP yang siap mendampingi sesi praktik lapangan Anda.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 self-start sm:self-auto">
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'mobil', label: 'Mobil' },
            { id: 'motor', label: 'Motor' },
            { id: 'truk', label: 'Truk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMentors.map((mentor) => {
          const isSelected = selectedMentor?.id === mentor.id;
          return (
            <div
              key={mentor.id}
              className={`rounded-2xl border p-6 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-600'
                  : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  {/* Avatar */}
                  <div
                    className={`w-14 h-14 rounded-2xl ${mentor.avatarBg} text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0`}
                  >
                    {mentor.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {mentor.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="tabular-nums">{mentor.rating}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({mentor.reviewCount})
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {mentor.title}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-neutral-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{mentor.location}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed mb-4">
                  &ldquo;{mentor.bio}&rdquo;
                </p>

                {/* Badges metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs py-3 px-3 rounded-xl bg-slate-50 dark:bg-neutral-950/80 border border-slate-100 dark:border-neutral-800/80 mb-5">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      Pengalaman: <strong className="text-slate-800 dark:text-neutral-200">{mentor.experienceYears} Tahun</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Lulusan: <strong className="text-slate-800 dark:text-neutral-200">{mentor.graduatesCount}+ Siswa</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectMentor(mentor)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mentor Terpilih</span>
                  </>
                ) : (
                  <span>Pilih {mentor.name.split(' ')[0]} Sebagai Mentor</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
