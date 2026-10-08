import { Check } from 'lucide-react';

const habits = [
  ['Wake up early', 30], ['No snoozing', 30], ['Drink water', 30],
  ['Gym workout', 20], ['Stretching', 30], ['Read 10 pages', 30],
  ['Meditation', 30], ['Walk 7k steps', 25], ['Skincare routine', 30],
] as const;
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function checked(row: number, day: number) {
  return (row * 5 + day * 3) % 11 < (row === 3 ? 7 : 9);
}

function PreviewCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`preview-card ${className}`}><div className="preview-band">{title}</div>{children}</div>;
}

export function LandingPreview() {
  return (
    <div className="landing-preview relative min-w-0" role="img" aria-label="Preview of a monthly habit tracker with daily checkboxes, progress charts, top habits, and notes">
      <div className="preview-tracker ml-auto w-[min(100%,760px)] overflow-hidden rounded-md border border-[#d9e1f1] bg-white shadow-[0_15px_38px_rgba(22,42,95,.14)]" aria-hidden="true">
        <div className="preview-grid bg-[#103dc8] text-[9px] font-extrabold uppercase text-white">
          <span className="px-4 py-2.5">Daily habits</span><span className="border-l border-white/20 px-1 py-2.5 text-center">Goals</span><span className="col-span-7 border-l border-white/20 py-2.5 text-center">Week 1</span><span className="col-span-7 border-l border-white/20 py-2.5 text-center">Week 2</span>
        </div>
        <div className="preview-grid border-b border-[#e5e9f2] bg-[#f7f9fe] text-[8px] font-semibold text-[#1d2740]">
          <span /><span />{days.map((day, index) => <span key={index} className="border-l border-[#e9edf5] py-1.5 text-center"><span className="block">{day}</span><span className="block text-[7px] text-slate-500">{index + 1}</span></span>)}
        </div>
        {habits.map(([habit, goal], row) => <div key={habit} className="preview-grid border-b border-[#eef1f6] text-[9px] last:border-b-0">
          <span className="truncate px-4 py-1.5 font-medium text-[#192238]">{habit}</span><span className="border-l border-[#e9edf5] py-1.5 text-center tabular-nums">{goal}</span>
          {days.map((_, day) => <span key={day} className="flex items-center justify-center border-l border-[#eef1f6] py-1"><span className={`flex h-[13px] w-[13px] items-center justify-center rounded-[2px] border ${checked(row, day) ? 'border-[#1144d0] bg-[#1144d0] text-white' : 'border-[#a8b3c8] bg-white'}`}>{checked(row, day) && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span></span>)}
        </div>)}
      </div>

      <div className="preview-dashboard relative z-10 mt-[-10px] grid w-full max-w-[900px] grid-cols-[minmax(125px,1.2fr)_minmax(220px,3fr)_minmax(115px,1.15fr)] gap-2.5 lg:ml-[-15%] lg:mt-[-18px] lg:w-[115%]" aria-hidden="true">
        <div className="flex flex-col gap-2.5">
          <PreviewCard title="Habit tracker"><div className="px-3 py-4 text-center text-[10px] font-medium">January 2026 <span className="pl-2 text-slate-500">⌄</span></div></PreviewCard>
          <PreviewCard title="Overall progress" className="flex-1"><div className="p-3 text-center"><strong className="text-2xl font-extrabold text-[#1647d5]">78%</strong><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce5fb]"><div className="h-full w-[78%] rounded-full bg-[#1346d4]" /></div></div></PreviewCard>
        </div>
        <div className="preview-card min-w-0"><div className="px-3 pb-1 pt-2 text-[9px] font-extrabold uppercase text-[#17213c]">Daily progress</div><svg className="h-[140px] w-full px-3 pb-3" viewBox="0 0 360 128" preserveAspectRatio="none"><defs><linearGradient id="preview-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#2f67dd" stopOpacity=".29" /><stop offset="1" stopColor="#2f67dd" stopOpacity=".05" /></linearGradient></defs>{[27, 54, 81, 108].map(y => <line key={y} x1="18" x2="350" y1={y} y2={y} stroke="#e6ebf3" strokeWidth="1" />)}<path d="M18 35 L38 32 L58 39 L78 38 L98 69 L118 72 L138 43 L158 35 L178 54 L198 41 L218 50 L238 82 L258 74 L278 62 L298 85 L318 79 L338 69 L350 70 L350 113 L18 113 Z" fill="url(#preview-fill)" /><path d="M18 35 L38 32 L58 39 L78 38 L98 69 L118 72 L138 43 L158 35 L178 54 L198 41 L218 50 L238 82 L258 74 L278 62 L298 85 L318 79 L338 69 L350 70" fill="none" stroke="#1547d1" strokeWidth="2" strokeLinejoin="round" /><text x="18" y="125" fontSize="8" fill="#667287">Jan 1</text><text x="167" y="125" fontSize="8" fill="#667287">Jan 15</text><text x="320" y="125" fontSize="8" fill="#667287">Jan 29</text></svg></div>
        <PreviewCard title="Completion overview"><div className="flex h-[146px] flex-col items-center justify-center gap-2"><div className="preview-donut"><div className="flex h-[45px] w-[45px] items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#143fc1]">78%</div></div><p className="text-[8px] font-semibold text-slate-500">Completed <span className="text-[#1647d5]">●</span> &nbsp; Remaining <span className="text-[#ced9f8]">●</span></p></div></PreviewCard>
        <PreviewCard title="Top 5 habits"><div className="space-y-2 p-3">{['Drink water', 'Gym workout', 'Read 10 pages', 'Skincare', 'Walk 7k steps'].map((name, index) => <div key={name} className="flex items-center gap-2 text-[8px]"><span className="w-[65px] truncate">{index + 1}. {name}</span><span className="h-1 flex-1 rounded-full bg-[#dce5fb]"><span className="block h-1 rounded-full bg-[#1647d5]" style={{ width: `${90 - index * 10}%` }} /></span></div>)}</div></PreviewCard>
        <PreviewCard title="Weekly progress"><div className="grid h-[110px] grid-cols-5 items-end gap-2 px-4 pb-4">{[85,92,76,68,80].map((value, index) => <div key={index} className="flex h-full flex-col items-center justify-end gap-1"><div className="flex h-[68px] w-full items-end gap-[2px]">{[0,1,2,3].map(bar => <span key={bar} className="w-1/4 bg-[#174ad7]" style={{ height: `${Math.max(19, value - bar * 8 + ((index + bar) % 3) * 9)}%` }} />)}</div><span className="text-[8px] font-bold">{value}%</span></div>)}</div></PreviewCard>
        <PreviewCard title="Notes"><div className="space-y-2 p-3 text-[8px] text-[#273148]"><p>○ &nbsp;Keep going!</p><p>○ &nbsp;Consistency is the key.</p><p>○ &nbsp;Small habits, big changes.</p></div></PreviewCard>
      </div>
    </div>
  );
}
