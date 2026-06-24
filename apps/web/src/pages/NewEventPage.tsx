import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { Button, Card, Input, Textarea } from "../components/ui";

export default function NewEventPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{ data: { id: string } }>(
        "/api/events",
        {
          method: "POST",
          body: JSON.stringify({ title, description }),
        },
        session.access_token
      );
      navigate(`/dashboard/events/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-white/50 hover:text-white text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to dashboard
      </Link>

      <h1 className="font-display text-3xl mb-2">New event</h1>
      <p className="text-white/50 text-sm mb-8">
        Create a wedding or event for your living photo experience
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Priya & Arjun — Wedding"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short note about this event..."
            rows={3}
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading}>
            Create event
          </Button>
        </form>
      </Card>
    </div>
  );
}
