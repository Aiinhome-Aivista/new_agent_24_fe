import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { WorkflowViz } from "@/components/workflow/WorkflowViz";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { fadeUp, stagger } from "@/styles/motion";
import {
  Brain, ShieldCheck, PlayCircle, FileCheck2, Network, Database,
  Eye, Boxes, ArrowRight,
} from "lucide-react";

const SECTIONS = [
  { icon: Brain, title: "Requirement-first testing", body: "Every test traces back to a requirement and acceptance criterion — generated before implementation can hide the gaps." },
  { icon: FileCheck2, title: "AI test generation", body: "Specialist agents draft positive, negative, boundary, validation and error scenarios, each tagged AI Generated until a human reviews it." },
  { icon: PlayCircle, title: "Deterministic execution", body: "API tests run through Bruno/Postman adapters. Status, timing and assertions come from real execution — never from the model." },
  { icon: ShieldCheck, title: "Human-in-the-loop governance", body: "Mandatory checkpoints for test review, evidence review and ALM attachment. Nothing is written back without approval." },
  { icon: Database, title: "Project-aware RAG", body: "Retrieval scoped by project, story, type and version — with recorded source lineage on every generated artifact." },
  { icon: Eye, title: "Observability", body: "OpenTelemetry spans across orchestrator, agents, tools and integrations, tagged with workflow, task and model metadata." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-lg font-semibold text-[var(--color-primary)]">TDD Intelligence</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)]">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-16 pt-14 text-center">
        <motion.div initial="initial" animate="animate" variants={stagger}>
          <motion.p variants={fadeUp} className="mb-4 inline-block rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            AI proposes · Deterministic tools execute · Humans approve
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-5xl font-semibold leading-tight text-[var(--color-text-primary)] sm:text-6xl">
            From User Story to<br /><span className="text-[var(--color-primary)]">Verified Evidence.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg text-[var(--color-text-secondary)]">
            AI-assisted TDD orchestration for requirement analysis, test generation, deterministic API execution, evidence creation, and enterprise ALM.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-button)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]">
              Start Building <ArrowRight size={16} />
            </Link>
            <a href="#workflow" className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-orange)]">
              Explore the Workflow
            </a>
          </motion.div>
        </motion.div>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl px-6 py-12">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          The agentic pipeline
        </p>
        <WorkflowViz />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4 }}
              className="surface p-6">
              <s.icon size={20} className="mb-3 text-[var(--color-primary)]" />
              <h3 className="mb-1.5 font-display text-base font-semibold text-[var(--color-text-primary)]">{s.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Network size={28} className="mx-auto mb-4 text-[var(--color-primary)]" />
        <h2 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
          A control center for AI-assisted testing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-secondary)]">
          Enterprise developer platform, AI operations console, test management, and governance system — as one coherent product.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link to="/login" className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-button)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
            Start Building <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-6 py-8 text-center text-xs text-[var(--color-text-secondary)]">
        <Boxes size={16} className="mx-auto mb-2 text-[var(--color-primary)]" />
        TDD Intelligence — AI-Assisted TDD Test Case Generator &amp; Evidence Automation Platform
      </footer>
    </div>
  );
}
