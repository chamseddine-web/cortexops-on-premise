import {
  Zap,
  Shield,
  Code2,
  GitBranch,
  CheckCircle,
  ArrowRight,
  Play,
  Users,
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Award,
  Target,
  ChevronDown,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Twitter,
  Github
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <img
                  src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
                  alt="CortexOps"
                  className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-xl font-bold text-white transition-colors group-hover:text-blue-400">CortexOps</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Fonctionnalités</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Tarifs</a>
              <a href="#faq" className="text-slate-300 hover:text-white transition-colors">FAQ</a>
              <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors">Témoignages</a>
              <a href="#about" className="text-slate-300 hover:text-white transition-colors">À propos</a>
              <button
                onClick={onGetStarted}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
              >
                Connexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-blue-900/20"></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Essai gratuit 7 jours • Sans carte bancaire</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Du langage naturel au code de production
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8">
              CortexOps automatise vos playbooks Ansible en un clic grâce à l'intelligence artificielle
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                Essayer gratuitement
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#demo"
                className="px-8 py-4 bg-slate-800 border border-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Voir la démo
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Configuration en 2 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Support français</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
              Démonstration rapide
            </h2>
            <p className="text-slate-400 text-center mb-12 text-lg">
              Générez un playbook Ansible professionnel en quelques secondes
            </p>

            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-slate-400 text-sm">CortexOps Generator</span>
                </div>
              </div>
              <div className="p-8">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Décrivez votre infrastructure en langage naturel :
                  </label>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-300 font-mono text-sm">
                    "Installe Nginx avec SSL sur Ubuntu, configure un reverse proxy vers le port 3000, et active le firewall"
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6 text-slate-400">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Généré en 3 secondes</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Playbook Ansible généré :
                  </label>
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
{`---
- name: "Deploy Nginx with SSL and reverse proxy"
  hosts: all
  become: yes

  tasks:
    - name: "Install Nginx"
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: "Configure reverse proxy"
      template:
        src: nginx-proxy.conf.j2
        dest: /etc/nginx/sites-available/default
      notify: restart nginx

    - name: "Enable UFW firewall"
      ufw:
        state: enabled
        rule: allow
        port: '80,443'`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Fonctionnalités clés
            </h2>
            <p className="text-slate-400 text-lg">
              Une plateforme complète pour automatiser votre infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-red-600 transition-all">
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Génération IA multi-rôles
              </h3>
              <p className="text-slate-400">
                IA avancée comprenant les architectures complexes et les bonnes pratiques DevOps
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-600 transition-all">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Validation YAML instantanée
              </h3>
              <p className="text-slate-400">
                Détection automatique des erreurs de syntaxe avec suggestions de correction
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-green-600 transition-all">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Sécurité DevSecOps intégrée
              </h3>
              <p className="text-slate-400">
                Pipeline de sécurité automatique avec Vault, fail2ban et monitoring
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-600 transition-all">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Structure prête production
              </h3>
              <p className="text-slate-400">
                Architecture de rôles professionnelle avec inventaire et variables
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-red-900/20 to-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">95%</div>
              <div className="text-slate-400">Temps gagné</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">3 sec</div>
              <div className="text-slate-400">Génération moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">YAML valide</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-slate-400">Support disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why CortexOps */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
              Pourquoi CortexOps ?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Gain de temps</h3>
                <p className="text-slate-400">
                  Réduisez de 95% le temps de rédaction de vos playbooks. Ce qui prenait des heures prend maintenant quelques secondes.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Fiabilité</h3>
                <p className="text-slate-400">
                  Code validé et testé automatiquement. Zéro erreur de syntaxe, respect des bonnes pratiques.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Conformité</h3>
                <p className="text-slate-400">
                  Respecte automatiquement les standards de sécurité et les réglementations DevSecOps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Ce que disent nos utilisateurs
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-4">
                "En 2 jours, CortexOps m'a fait gagner une semaine de travail. L'IA comprend parfaitement mes besoins et génère du code production-ready."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                <div>
                  <div className="font-semibold text-white">Thomas D.</div>
                  <div className="text-sm text-slate-400">Consultant DevOps</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-4">
                "Idéal pour enseigner Ansible sans erreurs de syntaxe. Mes étudiants peuvent se concentrer sur la logique plutôt que sur le YAML."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full"></div>
                <div>
                  <div className="font-semibold text-white">Marie L.</div>
                  <div className="text-sm text-slate-400">Formatrice Linux</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-4">
                "L'API nous a permis d'intégrer la génération de playbooks directement dans notre pipeline CI/CD. Game changer!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full"></div>
                <div>
                  <div className="font-semibold text-white">David M.</div>
                  <div className="text-sm text-slate-400">Lead DevOps, ESN</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-slate-400 text-lg">
              Choisissez le plan adapté à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="text-sm font-semibold text-green-400 mb-2">FREE</div>
              <div className="text-3xl font-bold text-white mb-1">0€</div>
              <div className="text-slate-400 text-sm mb-6">Pour commencer</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>5 playbooks / mois</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Export YAML basique</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Support communauté</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Commencer
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-blue-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                POPULAIRE
              </div>
              <div className="text-sm font-semibold text-blue-400 mb-2">PRO DEVOPS</div>
              <div className="text-3xl font-bold text-white mb-1">19,90€</div>
              <div className="text-slate-400 text-sm mb-6">/mois</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>Playbooks illimités</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>Export Git intégré</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>IA avancée</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>Vault IA intégré</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
              >
                Essayer 7 jours
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-purple-700">
              <div className="text-sm font-semibold text-purple-400 mb-2">TEAM</div>
              <div className="text-3xl font-bold text-white mb-1">49€</div>
              <div className="text-slate-400 text-sm mb-6">/mois</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span>5 utilisateurs inclus</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span>Collaboration temps réel</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span>Jenkins/GitLab CI</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <span>Historique complet</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Commencer
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-xl p-6 border border-red-700">
              <div className="text-sm font-semibold text-red-400 mb-2">ENTERPRISE</div>
              <div className="text-3xl font-bold text-white mb-1">149€</div>
              <div className="text-slate-400 text-sm mb-6">/mois</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>API privée complète</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>Marque blanche</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>Formation sur mesure</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
              >
                Nous contacter
              </button>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
            >
              Voir la comparaison détaillée
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <h3 className="text-center text-slate-400 mb-8">Technologies compatibles</h3>
          <div className="flex flex-wrap items-center justify-center gap-12 max-w-5xl mx-auto">
            <div className="text-slate-400 font-semibold text-lg">Ansible</div>
            <div className="text-slate-400 font-semibold text-lg">Docker</div>
            <div className="text-slate-400 font-semibold text-lg">Kubernetes</div>
            <div className="text-slate-400 font-semibold text-lg">GitLab</div>
            <div className="text-slate-400 font-semibold text-lg">Jenkins</div>
            <div className="text-slate-400 font-semibold text-lg">HashiCorp Vault</div>
            <div className="text-slate-400 font-semibold text-lg">Prometheus</div>
            <div className="text-slate-400 font-semibold text-lg">Terraform</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-red-900/20 to-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Prêt à automatiser votre infrastructure ?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Rejoignez les centaines de DevOps qui font confiance à CortexOps
            </p>
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-xl inline-flex items-center gap-2"
            >
              Créer un compte gratuit
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-slate-400 mt-4">
              Essai gratuit 7 jours • Sans carte bancaire • Annulation à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Questions Fréquentes
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Tout ce que vous devez savoir sur CortexOps
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "Qu'est-ce que CortexOps ?",
                answer: "CortexOps est une plateforme d'IA qui génère automatiquement des playbooks Ansible professionnels à partir de descriptions en langage naturel. Plus besoin d'écrire du code YAML manuellement !"
              },
              {
                question: "Comment fonctionne la génération de playbooks ?",
                answer: "Décrivez simplement ce que vous voulez automatiser en français, et notre IA analyse votre demande, détecte le contexte et génère un playbook Ansible complet avec les bonnes pratiques intégrées."
              },
              {
                question: "Ai-je besoin de connaissances en Ansible ?",
                answer: "Non ! CortexOps est conçu pour être accessible aux débutants tout en offrant des fonctionnalités avancées pour les experts. Notre IA génère du code optimisé et inclut des explications détaillées."
              },
              {
                question: "Puis-je personnaliser les playbooks générés ?",
                answer: "Absolument ! Tous les playbooks générés sont entièrement modifiables. Vous pouvez les télécharger, les modifier et les adapter à vos besoins spécifiques."
              },
              {
                question: "Quels types d'infrastructures sont supportés ?",
                answer: "CortexOps supporte une large gamme d'infrastructures : Linux, Windows, Docker, Kubernetes, AWS, Azure, GCP, et bien plus. Notre IA s'adapte automatiquement à votre environnement."
              },
              {
                question: "L'essai gratuit nécessite-t-il une carte bancaire ?",
                answer: "Non ! Profitez de 7 jours d'essai gratuit complet sans avoir à saisir de carte bancaire. Annulez à tout moment, aucun engagement."
              },
              {
                question: "Comment fonctionne la tarification ?",
                answer: "Nous proposons trois plans : Starter (gratuit limité), Pro (19€/mois) et Enterprise (sur mesure). Tous les plans incluent des générations illimitées et le support."
              },
              {
                question: "Puis-je utiliser CortexOps pour mon entreprise ?",
                answer: "Oui ! Notre plan Enterprise offre des fonctionnalités avancées comme le support prioritaire, l'intégration SSO, les environnements dédiés et un SLA garanti."
              },
              {
                question: "Les playbooks sont-ils sécurisés ?",
                answer: "La sécurité est notre priorité. Tous les playbooks suivent les meilleures pratiques de sécurité Ansible, incluant la gestion sécurisée des secrets et des permissions minimales."
              },
              {
                question: "Proposez-vous une API ?",
                answer: "Oui ! Tous les plans payants incluent un accès API complet pour intégrer CortexOps dans vos workflows CI/CD et vos outils existants."
              }
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold text-white text-lg pr-8">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-slate-300 leading-relaxed border-t border-slate-700/50 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-400 mb-4">Vous avez d'autres questions ?</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Contactez notre équipe
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <a href="/" className="flex items-center gap-2 mb-4 group w-fit">
                <div className="relative">
                  <img
                    src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy.png"
                    alt="CortexOps"
                    className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <span className="font-bold text-white text-xl transition-colors group-hover:text-blue-400">CortexOps</span>
              </a>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                La plateforme d'IA qui transforme vos descriptions en playbooks Ansible professionnels.
                Automatisez votre infrastructure en quelques secondes.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <a href="mailto:contact@spectraconsulting.com" className="hover:text-white transition-colors">
                    contact@spectraconsulting.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <a href="tel:+33123456789" className="hover:text-white transition-colors">
                    +33 1 23 45 67 89
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>Paris, France</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://twitter.com/cortexops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700 transition-all"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com/company/cortexops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700 transition-all"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/cortexops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700 transition-all"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Produit */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Produit</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/docs" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/api" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    API
                  </a>
                </li>
                <li>
                  <a href="/changelog" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Changelog
                  </a>
                </li>
                <li>
                  <a href="/roadmap" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Entreprise</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#about" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    À propos
                  </a>
                </li>
                <li>
                  <a href="/careers" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Carrières
                  </a>
                </li>
                <li>
                  <a href="/partners" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Partenaires
                  </a>
                </li>
                <li>
                  <a href="/education" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Éducation
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Contact
                  </a>
                </li>
                <li>
                  <a href="/press" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Presse
                  </a>
                </li>
                <li>
                  <a href="/blog" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Légal</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/legal" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    CGU
                  </a>
                </li>
                <li>
                  <a href="/cookies" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Cookies
                  </a>
                </li>
                <li>
                  <a href="/security" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="/compliance" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Conformité
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-400">
                <p>© 2025 CortexOps by <span className="text-white font-semibold">SPECTRA CONSULTING</span> - Tous droits réservés</p>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-green-500" />
                  Hébergé en France
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  RGPD Compliant
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  99.9% Uptime
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
