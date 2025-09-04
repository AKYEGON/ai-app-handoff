
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BarChart3, Users, Package2, ShoppingCart, TrendingUp, Shield, Wifi, Star } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      {/* Professional Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/bf4819d1-0c68-4a73-9c6e-6597615e7931.png" 
              alt="DukaFiti Logo" 
              className="w-12 h-12 rounded-xl shadow-lg"
            />
            <div>
              <span className="text-3xl font-bold text-foreground tracking-tight">
                DukaFiti
              </span>
              <p className="brand-tagline text-xs">DUKAFITI NI DUKABORA</p>
            </div>
          </div>
          <Button asChild className="dukafiti-button-primary">
            <Link to="/signin">
              <Star className="w-4 h-4" />
              Anza Sasa
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16 animate-brand-entrance">
          <h1 className="brand-title mb-6">
            Jua Duka Yako
            <span className="block mt-2">
              DukaFiti Ni DukaBora
            </span>
          </h1>
          <p className="brand-subtitle mb-8 max-w-3xl mx-auto">
            Mfumo wa kisasa zaidi wa usimamizi wa maduka nchini Kenya. 
            Uongozaji wa hisa, ufuatiliaji wa wateja, na uunganishaji wa M-Pesa - 
            umejengwa kwa ajili ya wafanyabiashara wa Kenya.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Button size="lg" asChild className="dukafiti-button-primary w-full sm:w-auto text-base px-8 py-4">
              <Link to="/signup">
                <TrendingUp className="w-5 h-5" />
                Jaribio la Bure la Siku 14
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-base px-8 py-4 border-primary/20 hover:bg-primary/5">
              <Link to="/signin">
                <Shield className="w-5 h-5" />
                Ingia Akaunti
              </Link>
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" strokeWidth={2} />
              <span>Salama 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" strokeWidth={2} />
              <span>Inafanya Kazi Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" strokeWidth={2} />
              <span>Imetumiwa na Maduka 10,000+</span>
            </div>
          </div>
        </div>

        {/* Features Grid - Professional Layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="dukafiti-card bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
                <Package2 className="h-7 w-7 text-primary" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Usimamizi wa Hisa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Fuatilia viwango vya hisa, weka arifa za hisa ya chini, na simamia bidhaa zako bila shida.
              </p>
            </CardContent>
          </Card>

          <Card className="dukafiti-card bg-success/5 border-success/20">
            <CardHeader>
              <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center mb-4 border border-success/20">
                <ShoppingCart className="h-7 w-7 text-success" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Usimamizi wa Mauzo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Chakata mauzo haraka na njia nyingi za malipo pamoja na uunganishaji wa M-Pesa.
              </p>
            </CardContent>
          </Card>

          <Card className="dukafiti-card bg-chart-4/5 border-chart-4/20">
            <CardHeader>
              <div className="w-14 h-14 bg-chart-4/10 rounded-xl flex items-center justify-center mb-4 border border-chart-4/20">
                <Users className="h-7 w-7 text-chart-4" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Ufuatiliaji wa Wateja</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Jenga mahusiano ya wateja na fuatilia historia ya ununuzi kwa huduma bora.
              </p>
            </CardContent>
          </Card>

          <Card className="dukafiti-card bg-warning/5 border-warning/20">
            <CardHeader>
              <div className="w-14 h-14 bg-warning/10 rounded-xl flex items-center justify-center mb-4 border border-warning/20">
                <BarChart3 className="h-7 w-7 text-warning" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Uchanganuzi wa Biashara</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Pata maarifa kuhusu utendaji wa biashara yako na ripoti za kina.
              </p>
            </CardContent>
          </Card>

          <Card className="dukafiti-card bg-chart-2/5 border-chart-2/20">
            <CardHeader>
              <div className="w-14 h-14 bg-chart-2/10 rounded-xl flex items-center justify-center mb-4 border border-chart-2/20">
                <TrendingUp className="h-7 w-7 text-chart-2" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Ufuatiliaji wa Faida</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Fuatilia faida zako kwa wakati halisi na fanya maamuzi ya biashara kulingana na data.
              </p>
            </CardContent>
          </Card>

          <Card className="dukafiti-card bg-destructive/5 border-destructive/20">
            <CardHeader>
              <div className="w-14 h-14 bg-destructive/10 rounded-xl flex items-center justify-center mb-4 border border-destructive/20">
                <Wifi className="h-7 w-7 text-destructive" strokeWidth={2} />
              </div>
              <CardTitle className="text-xl font-bold">Msaada wa Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Endelea kufanya kazi hata bila intaneti - data itasawazishwa ukiwa mtandaoni tena.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/5 to-success/5 rounded-3xl p-12 border border-primary/10">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Uko Tayari Kubadilisha Biashara Yako?
          </h2>
          <p className="brand-subtitle mb-8">
            Jiunge na maelfu ya wafanyabiashara wa Kenya wanaotumia DukaFiti.
          </p>
          <p className="brand-tagline mb-6">DUKAFITI NI DUKABORA</p>
          <Button size="lg" asChild className="dukafiti-button-primary text-lg px-12 py-4">
            <Link to="/signup">
              <Star className="w-6 h-6" />
              Anza Jaribio Lako la Bure
            </Link>
          </Button>
        </div>
      </main>

      {/* Professional Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-border mt-16">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/lovable-uploads/bf4819d1-0c68-4a73-9c6e-6597615e7931.png" 
              alt="DukaFiti Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold text-foreground">DukaFiti</span>
          </div>
          <p className="brand-tagline mb-2">DUKAFITI NI DUKABORA</p>
          <p className="text-muted-foreground">&copy; 2025 DukaFiti. Umejengwa kwa ajili ya wafanyabiashara wa Kenya.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
