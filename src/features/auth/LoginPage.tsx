import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const DEMO = [
  ["admin@tdd.local", "Admin"], ["developer@tdd.local", "Developer"],
  ["reviewer@tdd.local", "Reviewer"], ["po@tdd.local", "Product Owner"],
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("developer@tdd.local");
  const [password, setPassword] = useState("Passw0rd!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (e) {
      setError((e as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-6">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="surface-elevated w-full max-w-md p-8">
        <Link to="/" className="font-display text-lg font-semibold text-[var(--color-primary)]">TDD Intelligence</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-[var(--color-text-secondary)]">Access your TDD orchestration workspace.</p>

        <div className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button onClick={submit} loading={loading} className="w-full">Sign in</Button>
        </div>

        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <p className="mb-2 text-xs text-[var(--color-text-secondary)]">Demo accounts (password: Passw0rd!)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map(([mail, label]) => (
              <button key={mail} onClick={() => setEmail(mail)}
                className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-orange)] hover:text-[var(--color-primary)]">
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
