"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PresentLogo, { PresentLogoIcon } from "@/components/icons/present-logo"

interface LandingPageProps {
  onNavigate: (page: "login" | "landing") => void
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
        {/* Navigation Header */}
        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <PresentLogo size={40} showText={true} />
              <div className="hidden gap-8 md:flex">
                <a
                    href="#features"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </a>
                <a
                    href="#benefits"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Benefits
                </a>
                <a
                    href="#contact"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </div>
              <Button
                  onClick={() => onNavigate("login")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Login
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center mb-8">
              <PresentLogoIcon className="w-24 h-24" />
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Welcome to PRESENT
            </h1>
            <p className="mt-6 text-lg text-muted-foreground text-balance">
              A modern learning management system designed for seamless education. Connect, learn, and grow with PRESENT.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                  onClick={() => onNavigate("login")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
              >
                Get Started
              </Button>
              <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted px-8 py-6 text-lg bg-transparent"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-border/40 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">Powerful Features</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Intuitive Dashboard", desc: "Clean, organized interface for all users" },
                { title: "Real-time Updates", desc: "Stay connected with instant notifications" },
                { title: "QR Attendance", desc: "Quick and reliable attendance tracking" },
                { title: "Task Management", desc: "Submit and track assignments easily" },
                { title: "Grade Tracking", desc: "Monitor your academic progress" },
                { title: "Secure Communication", desc: "Direct messaging between students and teachers" },
              ].map((feature, i) => (
                  <Card key={i} className="bg-card border-border/40 hover:border-border/80 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-foreground text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.desc}</p>
                    </CardContent>
                  </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="border-t border-border/40 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 bg-card/30">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">Why Choose PRESENT?</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {[
                {
                  title: "For Students",
                  desc: "Streamlined learning experience with easy access to all your courses and grades",
                },
                { title: "For Teachers", desc: "Efficient classroom management and student progress tracking" },
                { title: "For Admins", desc: "Comprehensive system oversight and user management" },
                { title: "For Everyone", desc: "Secure, reliable, and always available when you need it" },
              ].map((benefit, i) => (
                  <div key={i} className="p-6 bg-background rounded-lg border border-border/40 shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.desc}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="border-t border-border/40 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of educators and students using PRESENT today.</p>
            <Button
                onClick={() => onNavigate("login")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
            >
              Login Now
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-background/50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <PresentLogo size={32} showText={true} />
              <p className="text-sm text-muted-foreground">© 2025 PRESENT. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
  )
}