import { Link } from "react-router-dom";
import { ArrowRight, Camera, Sparkles, Zap } from "lucide-react";
import { Button, Logo } from "../components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-gravity-300 mb-8">
            <Sparkles className="w-4 h-4 text-gravity-gold" />
            Living Photo AR for weddings
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-tight mb-6">
            Your photos,
            <br />
            <span className="text-gradient">come alive</span>
          </h1>

          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform printed wedding photographs into cinematic AR experiences.
            No app. No QR code. Just point and watch the magic unfold.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg">
                Start free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/demo">
            <Button variant="secondary" size="lg">
              Try AR demo
            </Button>
          </Link>
          </div>
        </section>

        <section className="px-6 py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "Photo is the trigger",
                desc: "Guests scan the actual printed photo. No markers, no QR codes.",
              },
              {
                icon: Zap,
                title: "Instant in browser",
                desc: "Works on any smartphone browser. No app download required.",
              },
              {
                icon: Sparkles,
                title: "Premium experience",
                desc: "Cinematic video overlays that feel magical and emotional.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-gravity-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-gravity-400" />
                </div>
                <h3 className="font-display text-xl mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 text-center">
          <p className="text-white/40 text-sm">
            Built for wedding photographers in Hyderabad &amp; across India
          </p>
        </section>
      </main>
    </div>
  );
}
