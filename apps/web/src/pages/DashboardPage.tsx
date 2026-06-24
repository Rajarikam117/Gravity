import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Eye, Plus, ScanLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { AnalyticsSummary, Event } from "@gravity/shared";
import { Button, Card, Logo } from "../components/ui";

export default function DashboardPage() {
  const { session, signOut } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;

    Promise.all([
      apiFetch<{ data: Event[] }>("/api/events", {}, session.access_token),
      apiFetch<{ data: AnalyticsSummary }>(
        "/api/analytics/summary",
        {},
        session.access_token
      ),
    ])
      .then(([eventsRes, analyticsRes]) => {
        setEvents(eventsRes.data);
        setAnalytics(analyticsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/dashboard/events/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New event
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl mb-1">Dashboard</h1>
          <p className="text-white/50 text-sm">Manage your living photo experiences</p>
        </div>

        {analytics && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Events", value: analytics.total_events, icon: Eye },
              { label: "Published", value: analytics.published_events, icon: BarChart3 },
              { label: "Total scans", value: analytics.total_scans, icon: ScanLine },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gravity-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gravity-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="text-white/50 text-xs">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Your events</h2>
        </div>

        {loading ? (
          <div className="text-white/50 text-sm py-12 text-center">Loading...</div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-white/60 mb-4">No events yet</p>
            <Link to="/dashboard/events/new">
              <Button>Create your first event</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/dashboard/events/${event.id}`}
                className="block glass rounded-2xl p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-white/40 text-sm mt-0.5">
                      {event.scan_count} scans ·{" "}
                      {event.is_published ? (
                        <span className="text-green-400">Published</span>
                      ) : (
                        <span className="text-yellow-400">Draft</span>
                      )}
                    </p>
                  </div>
                  <div className="text-white/30 text-sm">
                    {event.photo_url ? "Ready" : "Needs upload"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
