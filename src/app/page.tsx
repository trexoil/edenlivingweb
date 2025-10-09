import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-primary/5 to-accent/5 animate-gradient-shift bg-400%" />
      
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-3xl">E</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">Eden Living</h1>
              <p className="text-muted-foreground text-sm">Smart Care, Seamless Living</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild size="lg" variant="premium">
              <Link href="/login">Resident Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-8 py-24 md:py-32 text-center">
        <div className="max-w-5xl mx-auto animate-in">
          <h2 className="text-5xl md:text-7xl font-extrabold text-foreground mb-8 leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Experience the Future of
            <span className="text-primary block mt-4 animate-pulse">Senior Living Care</span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-16 max-w-3xl mx-auto leading-relaxed font-light">
            Revolutionary service requests, instant approvals, and seamless department coordination - all at your fingertips.
          </p>
          
          {/* Key Service Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer animate-gentle-float" style={{ animationDelay: '0s' }}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">⚡</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">Instant Service Approval</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Auto-approval with smart credit management</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer animate-gentle-float" style={{ animationDelay: '0.5s' }}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📱</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors duration-300">QR Code Verification</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Secure service start & completion tracking</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer animate-gentle-float" style={{ animationDelay: '1s' }}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🏢</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">Department Coordination</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Seamless inter-department service delivery</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Workflow Showcase */}
          <div className="mb-20">
            <h3 className="text-3xl font-bold text-foreground mb-12">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl text-primary-foreground font-bold">1</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Request Service</h4>
                <p className="text-sm text-muted-foreground">Submit your service request instantly</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl text-primary-foreground font-bold">2</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Auto-Approval</h4>
                <p className="text-sm text-muted-foreground">Get approved based on your credit limit</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl text-primary-foreground font-bold">3</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">QR Verification</h4>
                <p className="text-sm text-muted-foreground">Staff scans QR to start/complete service</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl text-primary-foreground font-bold">4</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Auto-Invoice</h4>
                <p className="text-sm text-muted-foreground">Receive invoice automatically after completion</p>
              </div>
            </div>
          </div>

          {/* Enhanced Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🏡</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">Luxury Residences</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Elegantly crafted homes</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🍴</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors duration-300">Gourmet Dining</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Culinary excellence daily</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">💎</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">Concierge Care</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Personalized support 24/7</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🌟</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors duration-300">Vibrant Community</h3>
                <p className="text-sm text-muted-foreground mt-2 group-hover:text-foreground transition-colors duration-300">Engaging social life</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" variant="premium" asChild className="text-lg px-10 py-4 shadow-xl hover:scale-105 transition-transform duration-300 animate-pulse-slow">
              <Link href="/login">Experience Smart Living</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 py-4 border-2 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
              Schedule a Visit
            </Button>
          </div>
        </div>
      </main>

      {/* Enhanced Stats Section */}
      <section className="bg-muted/20 py-20 border-y border-border/50">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-5xl font-bold text-primary">98%</div>
              <div className="text-lg text-muted-foreground font-medium">Resident Satisfaction</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold text-accent">24/7</div>
              <div className="text-lg text-muted-foreground font-medium">Smart Service Support</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold text-primary">500+</div>
              <div className="text-lg text-muted-foreground font-medium">Monthly Service Requests</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold text-accent">5★</div>
              <div className="text-lg text-muted-foreground font-medium">Automated Excellence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Showcase */}
      <section className="py-20">
        <div className="container mx-auto px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">Powered by Smart Technology</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our advanced workflow system ensures seamless service delivery with real-time tracking and automated processes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">AI-Powered Approvals</h4>
                <p className="text-muted-foreground">Intelligent credit limit checking and automatic service approvals based on resident profiles.</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">Real-Time Analytics</h4>
                <p className="text-muted-foreground">Live tracking of service requests, department performance, and resident satisfaction metrics.</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">Secure & Compliant</h4>
                <p className="text-muted-foreground">Bank-level security for all transactions and HIPAA-compliant data handling.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted text-foreground py-16">
        <div className="container mx-auto px-8 text-center">
          <p className="text-2xl mb-6 font-light">Experience the future of senior living care.</p>
          <p className="text-lg opacity-80">© 2025 Eden Living. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
