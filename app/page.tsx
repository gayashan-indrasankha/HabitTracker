import Link from 'next/link';
import { ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, FileText, Trophy } from 'lucide-react';
import { LandingPreview } from '@/components/landing/landing-preview';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

const features = [
  { icon: CheckCircle2, title: 'TRACK YOUR HABITS', description: 'Keep every daily habit in one clear view.' },
  { icon: BarChart3, title: 'AUTO DASHBOARD', description: 'See your progress and insights update.' },
  { icon: CalendarDays, title: 'WEEKLY & MONTHLY VIEW', description: 'Spot patterns and stay motivated.' },
  { icon: Trophy, title: 'STAY CONSISTENT', description: 'Build routines that last.' },
];

export default async function RootPage() {
  if (await getCurrentUser()) redirect('/today');
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-white text-[#07112d]">
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-dots" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1500px] px-6 pb-12 pt-5 sm:px-9 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="HabitFlow home">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1043d6] text-xl font-black italic tracking-tighter text-white shadow-[0_6px_18px_rgba(17,70,210,.18)]">HF</span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-black uppercase tracking-[.19em] sm:text-xl">HABIT <span className="text-[#1145d5]">FLOW</span></span>
              <span className="text-[9px] font-semibold uppercase tracking-[.22em] text-slate-500">BUILD BETTER. EVERY DAY.</span>
            </span>
          </Link>
          <Link href="/login" className="rounded-full border border-[#cdd8fa] bg-white/80 px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#1746be] shadow-sm transition hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Log in</Link>
        </header>

        <div className="landing-layout mt-8 grid items-center gap-8 lg:mt-4 lg:grid-cols-[minmax(330px,35%)_minmax(0,65%)] lg:gap-0">
          <section className="relative z-10 max-w-[490px] pb-4 lg:pt-7">
            <p className="inline-flex rounded-full border border-[#2453d2] px-4 py-1 text-xs font-bold uppercase tracking-[.12em] text-[#1748cf]">HabitFlow habit tracker</p>
            <h1 className="mt-4 text-[clamp(2.7rem,3.7vw,3.6rem)] font-black leading-[.99] tracking-[-.055em] text-[#06102a]">Build Better Habits.<br />Stay Consistent.</h1>
            <p className="mt-5 max-w-[390px] text-base leading-7 text-[#596273]">A simple and effective habit tracker to help you stay on track and achieve your goals.</p>
            <ul className="mt-7 space-y-4" aria-label="HabitFlow features">
              {features.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e7ecf6] bg-white text-[#1043d6] shadow-[0_4px_13px_rgba(26,49,100,.13)]"><Icon className="h-5 w-5" strokeWidth={2.7} aria-hidden="true" /></span>
                  <span className="flex flex-col gap-0.5"><strong className="text-xs font-extrabold tracking-wide text-[#1946bf]">{title}</strong><span className="text-xs text-slate-600">{description}</span></span>
                </li>
              ))}
            </ul>
            <Link href="/today" className="mt-7 inline-flex min-h-12 w-full max-w-[340px] items-center justify-center gap-3 rounded-lg bg-[#1043d6] px-6 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_7px_18px_rgba(16,67,214,.2)] transition hover:bg-[#0a35b5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><FileText className="h-4 w-4" aria-hidden="true" /> Open HabitFlow <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" /></Link>
            <p className="mt-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.12em] text-slate-500"><Check className="h-3 w-3 text-[#1748cf]" aria-hidden="true" /> Personal progress <span aria-hidden="true">·</span> Easy to use</p>
          </section>
          <LandingPreview />
        </div>
      </div>
    </main>
  );
}
