import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Play,
  Star,
  Bot,
  Users,
  BookOpen,
  Route,
  Clapperboard,
  ClipboardCheck,
  Layers,
  GraduationCap,
  Briefcase,
  Rocket,
  LucideIcon,
  Linkedin,
  Youtube,
  Instagram,
  Award,
  Quote,
  ExternalLink,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Typewriter } from "@/components/marketing/Typewriter";
import { HeroMedia } from "@/components/HeroMedia";
import { CourseThumb } from "@/components/CourseThumb";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { PROFESSOR } from "@/lib/professor";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { ROLES, Role } from "@/lib/types";
import { seedCourses } from "@/lib/mock/seed";
import { formatINR } from "@/lib/utils";

const roleIconMap: Record<Role, LucideIcon> = {
  student: GraduationCap,
  professional: Briefcase,
  entrepreneur: Rocket,
};

const stats = [
  { icon: Users, value: "6+", label: "Expert Mentors" },
  { icon: BookOpen, value: "40+", label: "Coaching Topics" },
  { icon: Route, value: "3", label: "Learning Paths" },
  { icon: Sparkles, value: "AI", label: "Enhanced Learning" },
];

const features = [
  {
    icon: Clapperboard,
    title: "AI Avatar Lessons",
    body: "Studio-quality, avatar-led lessons that stream instantly — learn from a digital mentor, anytime.",
  },
  {
    icon: Bot,
    title: "LEAP AI Tutor",
    body: "A context-aware AI tutor on every video, grounded strictly in that lesson — summarize, quiz, or go deeper.",
  },
  {
    icon: ClipboardCheck,
    title: "AI-Graded Assessments",
    body: "Checkpoints every two lessons with instant, personalized feedback that helps you actually improve.",
  },
  {
    icon: Layers,
    title: "Structured Tracks",
    body: "Role-specific roadmaps spanning leading self, people, peers, cultures and organizations.",
  },
];

const steps = [
  { n: "01", title: "Choose your path", body: "Tell us if you're a student, professional, or entrepreneur — your catalog adapts." },
  { n: "02", title: "Learn with AI", body: "Watch avatar lessons with a personal tutor and class notes beside every video." },
  { n: "03", title: "Prove it & level up", body: "Pass AI-graded checkpoints, earn credits, and unlock the next stage." },
];

const featured = [...seedCourses]
  .filter((c) => c.published)
  .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
  .slice(0, 3);

export default function Home() {
  return (
    <div className="min-h-screen bg-cream-50">
      <SiteNav overlay />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-44 h-80 w-80 rounded-full bg-navy-600/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] sm:text-base">
              <span className="text-cream-100/90">L·E·A·P</span>
              <span className="mx-2 text-gold-400">—</span>
              <Typewriter text="Leadership Excellence and Authentic Performance" className="text-gold-500" />
            </p>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.08] text-balance sm:text-5xl lg:text-[3.4rem]">
              <span className="text-white">Scaling </span>
              <span className="text-gradient-gold">Human Wisdom</span>
              <span className="text-white"> through </span>
              <span className="text-gradient-gold">High Performance Stars</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream-100/75">
              AI-enhanced, avatar-led coaching for students, professionals, and entrepreneurs —
              structured topics, a personal AI tutor on every video, and assessments that actually
              teach.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Start Your Journey <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/courses"
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: "border-white/30 bg-transparent text-white hover:bg-white/10",
                })}
              >
                Explore Topics
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {PROFESSOR.heroStats.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-cream-200 bg-white px-3 py-1.5 shadow-sm"
                >
                  <span className="font-heading text-sm font-bold text-navy-800">{s.value}</span>
                  <span className="text-xs text-ink-soft">{s.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Professor / avatar-video card */}
          <div className="relative">
            <div
              className="absolute -right-2 bottom-14 z-10 hidden animate-float rounded-2xl bg-white p-3 shadow-card sm:flex"
              style={{ animationDelay: "1.6s" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50 text-navy-700">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-heading text-sm font-bold text-navy-800">LEAP AI</p>
                  <p className="text-xs text-ink-faint">Tutor on every lesson</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 to-navy-900 p-7 shadow-navy ring-1 ring-white/10">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-500/20 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <ProfessorPhoto className="h-16 w-16 ring-4 ring-white/10" position="top" />
                <div>
                  <p className="font-heading text-lg font-bold text-white">Prof. Vishal Gupta</p>
                  <p className="text-sm text-cream-100/70">Professor, IIM Ahmedabad</p>
                </div>
              </div>

              <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 ring-1 ring-white/10">
                <HeroMedia className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-900/20 to-transparent" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-500 text-navy-900 shadow-gold transition-transform hover:scale-105">
                    <Play className="ml-0.5 h-6 w-6 fill-navy-900" />
                  </span>
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  AI Avatar Lesson
                </span>
              </div>

              <p className="mt-5 text-pretty italic text-cream-100/90">
                &ldquo;Lead from your values, not from fear of judgement.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-cream-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-9 sm:px-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cream-100 text-gold-600">
                <s.icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-heading text-2xl font-bold text-navy-800">{s.value}</p>
                <p className="text-sm text-ink-soft">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Learning paths ── */}
      <section id="paths" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="gold">Three Learning Paths</Badge>
          <h2 className="mt-4 font-heading text-3xl font-bold text-navy-800 sm:text-4xl">
            Built for who you are right now
          </h2>
          <p className="mt-3 text-ink-soft">
            Your dashboard, catalog, and recommendations adapt to your path from the moment you join.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ROLES.map((role, i) => {
            const Icon = roleIconMap[role.id];
            return (
              <Link
                key={role.id}
                href="/signup"
                className="group relative overflow-hidden rounded-2xl border border-cream-200 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 ${
                    i === 0 ? "bg-navy-600" : i === 1 ? "bg-gold-500" : "bg-gradient-to-r from-gold-500 to-navy-600"
                  }`}
                />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cream-100 text-navy-700 transition-colors group-hover:bg-gold-100 group-hover:text-gold-600">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-bold text-navy-800">{role.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{role.tagline}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600">
                  Explore path
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="how" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="navy">How it Works</Badge>
            <h2 className="mt-4 font-heading text-3xl font-bold text-navy-800 sm:text-4xl">
              Everything you need to actually learn
            </h2>
            <p className="mt-3 text-ink-soft">
              Not just videos — a complete system that teaches, tutors, and tests.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-cream-200 bg-cream-50 p-6 transition-colors hover:border-gold-200"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 shadow-gold">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-navy-800">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-6 rounded-3xl bg-navy-900 p-8 sm:grid-cols-3 sm:p-10">
            {steps.map((s) => (
              <div key={s.n}>
                <p className="font-heading text-3xl font-bold text-gold-400">{s.n}</p>
                <h4 className="mt-2 font-heading text-lg font-semibold text-white">{s.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-cream-100/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured programs ── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="gold">Featured Programs</Badge>
            <h2 className="mt-4 font-heading text-3xl font-bold text-navy-800 sm:text-4xl">
              Learn from the best minds
            </h2>
          </div>
          <Link href="/courses" className={buttonClasses({ variant: "outline", size: "md" })}>
            View all topics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featured.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="relative">
                <CourseThumb accent={c.accent} category={c.category} className="aspect-[16/9]" />
                {c.trending && (
                  <span className="absolute right-3 top-3">
                    <Badge variant="trending">🔥 Trending</Badge>
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-ink-faint">
                  <Avatar name={c.instructorName} size={22} />
                  {c.instructorName}
                </div>
                <h3 className="mt-2.5 font-heading text-lg font-bold leading-snug text-navy-800 group-hover:text-gold-600">
                  {c.title}
                </h3>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 font-medium text-navy-700">
                    <Star className="h-4 w-4 fill-gold-500 text-gold-500" /> {c.rating.toFixed(1)}
                  </span>
                  <span className="font-heading font-bold text-navy-800">
                    {c.price === 0 ? "Free" : formatINR(c.price)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── About the professor ── */}
      <section id="about" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Portrait */}
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-gold-200 to-navy-100 opacity-60 blur-xl" />
              <div className="overflow-hidden rounded-3xl border border-cream-200 shadow-card">
                <ProfessorPhoto className="aspect-[4/5] w-full" rounded="rounded-none" position="top" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Badge variant="navy">Meet your mentor</Badge>
              <h2 className="mt-4 font-heading text-3xl font-bold text-navy-800 sm:text-4xl">
                Learn directly from Prof. Vishal Gupta
              </h2>
              <p className="mt-1.5 font-medium text-gold-700">{PROFESSOR.title}</p>
              <p className="mt-4 leading-relaxed text-ink-soft">{PROFESSOR.bio}</p>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {PROFESSOR.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-navy-700">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> {h}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {[
                  { Icon: Linkedin, href: PROFESSOR.links.linkedin },
                  { Icon: Youtube, href: PROFESSOR.links.youtube },
                  { Icon: Instagram, href: PROFESSOR.links.instagram },
                ].map(({ Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-cream-200 bg-white text-navy-700 transition-colors hover:border-gold-300 hover:text-gold-600"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
                <a
                  href={PROFESSOR.links.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "outline", size: "sm", className: "ml-1" })}
                >
                  Visit full profile <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Achievement stats */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PROFESSOR.stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-cream-200 bg-cream-50 p-4 text-center">
                <p className="font-heading text-2xl font-bold text-navy-800">{s.value}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quote band */}
          <div className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 p-8 shadow-gold sm:p-10">
            <Quote className="absolute right-6 top-6 h-16 w-16 text-white/20" />
            <p className="relative max-w-3xl font-heading text-2xl font-semibold leading-snug text-navy-900 sm:text-3xl">
              &ldquo;The work of a leader is to lead from values — not from fear of judgement.&rdquo;
            </p>
            <p className="relative mt-4 font-heading font-bold text-navy-900">— Prof. Vishal Gupta</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-navy-600/40 blur-3xl" />
          <h2 className="relative font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to become a high performance star?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-cream-100/75">
            Join Leap Coach today and start your first AI-led lesson in minutes.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className={buttonClasses({ variant: "outline", size: "lg", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
