import { ArrowRight, Infinity as InfinityIcon, GitBranch, ShieldCheck, Mail, Zap, Code, Lock, Cloud, CheckCircle2, Users, TrendingUp, Clock, Server, Award, Target, Sparkles } from "lucide-react";
import { PrivacyBadge } from './PrivacyBanner';
import { useState } from "react";
import { ContactModal } from "./ContactModal";

const GlowOrb = ({ className = "" }) => (
  <div className={`pointer-events-none absolute blur-3xl opacity-30 ${className}`}>
    <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-500/40 to-blue-600/40" />
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-6 shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className}`}
  >
    {children}
  </div>
);

function Logo() {
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <img
          src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy copy.png"
          alt="CortexOps"
          className="w-12 h-12 object-contain transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white transition-colors group-hover:text-cyan-400">
        Cortex<span className="text-cyan-400">Ops</span>
      </h1>
    </div>
  );
}

interface ModernLandingProps {
  onGetStarted: () => void;
}

export default function ModernLanding({ onGetStarted }: ModernLandingProps) {
  const [showContactModal, setShowContactModal] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-200">
      <div className="absolute inset-0 z-0">
        <img
          src="/ChatGPT Image 12 nov. 2025, 16_18_10 copy copy copy copy.png"
          alt="Background"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/85 to-slate-950/90"></div>
      </div>

      <GlowOrb className="-top-16 -left-10 z-10" />
      <GlowOrb className="top-1/3 -right-24 z-10" />
      <GlowOrb className="bottom-0 left-1/2 -translate-x-1/2 z-10" />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Mail size={16} />
            Contact
          </button>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
          >
            Essayer 7 jours <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="relative z-20 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-12 pt-4 md:grid-cols-2 md:pb-20">
        <div>
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Propulse par l'IA</span>
          </div>

          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl animate-fade-in">
            Generateur de <span className="text-cyan-400">playbooks Ansible</span> avec IA
          </h2>
          <p className="mb-6 max-w-xl text-lg text-slate-300 leading-relaxed">
            Transformez votre langage naturel en playbooks Ansible prets pour la production. Generation automatique YAML, export Git, pipeline DevSecOps et automatisation complete de vos workflows DevOps.
          </p>

          <div className="mb-6">
            <PrivacyBadge />
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-cyan-500/20 hover:shadow-lg hover:bg-cyan-500 transition-all"
            >
              Commencer maintenant <ArrowRight size={18} />
            </button>
            <span className="text-xs text-slate-400 text-center">Essai gratuit 7 jours - Sans carte bancaire</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400" />
              <span>Installation en 2 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-400" />
              <span>Support 24/7</span>
            </div>
          </div>
        </div>

        <Card className="md:ml-auto w-full">
          <h3 className="mb-1 text-center text-2xl font-bold text-white">Connexion</h3>
          <p className="mb-6 text-center text-sm text-slate-400">Accedez a votre compte CortexOps</p>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onGetStarted(); }}>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-rose-600 py-3 font-semibold text-white hover:bg-rose-500 transition-all"
            >
              → Se connecter
            </button>
            <p className="text-center text-sm text-slate-400">
              Pas encore de compte ? <button type="button" onClick={onGetStarted} className="font-medium text-cyan-400 hover:underline">Creer un compte</button>
            </p>
          </form>
        </Card>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <InfinityIcon className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-base font-semibold text-white mb-1">Generation automatique YAML</p>
                <p className="text-sm text-slate-400">Playbooks Ansible fiables en secondes</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <GitBranch className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-base font-semibold text-white mb-1">Export Git automatique</p>
                <p className="text-sm text-slate-400">Integration GitHub, GitLab et GitOps</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <ShieldCheck className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-base font-semibold text-white mb-1">Pipeline DevSecOps</p>
                <p className="text-sm text-slate-400">Securite et bonnes pratiques integrees</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Pourquoi choisir CortexOps ?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Accelerez votre workflow DevOps avec une plateforme professionnelle pensee pour les equipes exigeantes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <Zap className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Gagnez du temps</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Reduisez de 80% le temps de redaction de vos playbooks. Generez du code production-ready en quelques secondes au lieu de plusieurs heures.
            </p>
          </Card>

          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <Code className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Code fiable</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Playbooks respectant les bonnes pratiques Ansible. Validation syntaxique automatique et gestion d'erreurs integree.
            </p>
          </Card>

          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <Lock className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Securite maximale</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Integrez automatiquement les standards DevSecOps. Hardening, audits de securite et conformite RGPD par defaut.
            </p>
          </Card>

          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <Cloud className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-cloud</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Support natif AWS, Azure, GCP et infrastructure on-premise. Orchestration Kubernetes et conteneurs Docker incluse.
            </p>
          </Card>

          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <Users className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Collaboration equipe</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Partagez vos playbooks, gerez les droits d'acces et travaillez en equipe avec un systeme de versioning integre.
            </p>
          </Card>

          <Card>
            <div className="mb-4 rounded-lg bg-cyan-500/10 p-3 w-fit">
              <TrendingUp className="text-cyan-400" size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analytics avances</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Suivez vos deployments, analysez les performances et detectez les anomalies avec des rapports detailles.
            </p>
          </Card>
        </div>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Cas d'usage professionnels</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Des solutions adaptees a tous vos besoins d'automatisation infrastructure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Server className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Deploiement d'infrastructure</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Automatisez le provisioning de serveurs Linux, configuration reseau, installation de packages et gestion des services systeme.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Linux</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Docker</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Nginx</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Target className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">CI/CD Pipeline</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Creez des pipelines complets avec tests automatises, deploiements blue-green et rollback automatique en cas d'erreur.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Jenkins</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">GitLab CI</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Tests</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Lock className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Hardening & Securite</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Appliquez les standards CIS, configurez les firewalls, gerez les certificats SSL et surveillez les vulnerabilites.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">CIS</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">SSL/TLS</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Firewall</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Cloud className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Orchestration Kubernetes</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Deployez et gerez vos clusters K8s, configurez les namespaces, deployments, services et ingress controllers.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">K8s</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Helm</span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Ingress</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Ils nous font confiance</h2>
          <p className="text-slate-400">Plus de 500+ entreprises utilisent CortexOps pour automatiser leur infrastructure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Award key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-3">
                "CortexOps a revolutionne notre workflow DevOps. Nous avons reduit nos delais de deploiement de 75%."
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                JD
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Jean Dupont</p>
                <p className="text-slate-400 text-xs">DevOps Lead @ TechCorp</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Award key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-3">
                "L'IA genere du code Ansible de qualite production. Plus d'erreurs de syntaxe, un gain de temps enorme."
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                SM
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Sophie Martin</p>
                <p className="text-slate-400 text-xs">CTO @ StartupInc</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Award key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-3">
                "La meilleure solution pour automatiser Ansible. Support reactif et fonctionnalites entreprise indispensables."
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                PL
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Pierre Leroy</p>
                <p className="text-slate-400 text-xs">SRE @ CloudSystems</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-4xl px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Questions frequentes</h2>
          <p className="text-slate-400">Tout ce que vous devez savoir sur CortexOps</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Comment generer un playbook Ansible automatiquement ?",
              a: "Il suffit de decrire votre besoin en langage naturel dans CortexOps. Notre IA analyse votre demande et genere un playbook Ansible complet, valide et pret pour la production en quelques secondes."
            },
            {
              q: "Les playbooks generes sont-ils conformes aux bonnes pratiques ?",
              a: "Oui, tous les playbooks respectent les standards Ansible officiels, incluent la gestion d'erreurs, l'idempotence et les bonnes pratiques de securite DevSecOps."
            },
            {
              q: "Puis-je exporter mes playbooks vers Git ?",
              a: "Absolument. CortexOps offre une integration native avec GitHub, GitLab et Bitbucket. Exportez vos playbooks en un clic avec historique de versions complet."
            },
            {
              q: "Quelles infrastructures sont supportees ?",
              a: "CortexOps supporte Linux (Ubuntu, CentOS, RHEL), conteneurs Docker, orchestration Kubernetes, ainsi que les clouds AWS, Azure et GCP."
            },
            {
              q: "Comment fonctionne le pipeline DevSecOps ?",
              a: "Chaque playbook genere inclut automatiquement des controles de securite, tests de validation, audits CIS et bonnes pratiques de hardening."
            },
            {
              q: "Y a-t-il un support technique ?",
              a: "Oui, notre equipe support est disponible 24/7 par email et chat. Les plans entreprise incluent un support telephonique prioritaire."
            }
          ].map((faq, index) => (
            <Card key={index} className="cursor-pointer" onClick={() => setFaqOpen(faqOpen === index ? null : index)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                  {faqOpen === index && (
                    <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                  )}
                </div>
                <ArrowRight
                  size={20}
                  className={`text-cyan-400 transition-transform ${faqOpen === index ? 'rotate-90' : ''}`}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-20 mx-auto w-full max-w-5xl px-6 pb-20">
        <Card className="text-center py-12 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20">
            <Clock className="text-cyan-400" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Pret a automatiser votre infrastructure ?</h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines d'equipes DevOps qui utilisent CortexOps pour generer leurs playbooks Ansible en quelques secondes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-8 py-4 text-lg font-semibold text-white hover:bg-cyan-500 shadow-xl shadow-cyan-500/20 transition-all"
            >
              Commencer gratuitement <ArrowRight size={20} />
            </button>
            <button
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-8 py-4 text-lg font-semibold text-white hover:bg-slate-800 transition-all"
            >
              <Mail size={20} />
              Demander une demo
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-6">Essai gratuit 7 jours - Sans engagement - Sans carte bancaire</p>
        </Card>
      </section>

      <footer className="relative z-20 border-t border-slate-800/70 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} CortexOps by SPECTRA CONSULTING — Tous droits reserves.
      </footer>

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </main>
  );
}
