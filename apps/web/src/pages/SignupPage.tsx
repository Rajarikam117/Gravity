import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input, Logo } from "../components/ui";

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await signUp(email, password, fullName);
      setSuccess(true);
      if (data.session) {
        setHasSession(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="justify-center mb-6" />
          <h1 className="font-display text-3xl mb-2">Create your studio</h1>
          <p className="text-white/50 text-sm">Start creating living photos today</p>
        </div>

        <Card>
          {success ? (
            <div className="text-center py-4">
              <p className="text-gravity-300 mb-2">Account created!</p>
              {hasSession ? (
                <p className="text-white/50 text-sm">Redirecting to dashboard...</p>
              ) : (
                <p className="text-white/50 text-sm">
                  Please check your inbox to verify your email address before signing in.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                Create account
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-white/50 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-gravity-400 hover:text-gravity-300">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
