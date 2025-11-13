import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Rocket, Shield, Zap, Cloud, Server, Terminal,
  Check, ArrowRight, Users, Lock, Database,
  Clock, TrendingUp, Award, Globe, Star
} from 'lucide-react';
import { EnterpriseDemo } from './EnterpriseDemo';
import { useNavigate } from 'react-router-dom';

export function MarketingLanding() {
  const [showDemoForm, setShowDemoForm] = useState(false);
  const navigate = useNavigate();

  const handleFreeTrial = () => {
    navigate('/auth?mode=signup&trial=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <HeroSection onFreeTrial={handleFreeTrial} onRequestDemo={() => setShowDemoForm(true)} />
      <TrustBar />
      <FeaturesSection />
      <DeploymentModes />
      <SecuritySection />
      <BenefitsSection />
      <PricingSection onFreeTrial={handleFreeTrial} />
      <TestimonialsSection />
      <CTASection onFreeTrial={handleFreeTrial} onRequestDemo={() => setShowDemoForm(true)} />
      <Footer />

      {showDemoForm && (
        <EnterpriseDemo onClose={() => setShowDemoForm(false)} />
      )}
    </div>
  );
}

function HeroSection({ onFreeTrial, onRequestDemo }: { onFreeTrial: () => void; onRequestDemo: () => void }) {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full border border-blue-500/30 mb-8">
            <Rocket className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Trusted by 1000+ DevOps Teams</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Générez vos playbooks Ansible
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              en 5 secondes
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
            Automatisez votre infrastructure avec l'IA. Compatible On-Premise & Cloud.
            <br />
            API • Docker • CLI • VSCode Extension
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFreeTrial}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-blue-500/50 transition-all flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Essayer gratuit 14 jours
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRequestDemo}
              className="px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold text-lg border-2 border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Demander une démo Enterprise
            </motion.button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              Sans carte bancaire
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              Installation en 2 minutes
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              Support prioritaire
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
        >
          <div className="bg-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-slate-400 text-sm font-mono">cortexops generate</span>
            </div>
            <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm">
              <div className="text-blue-400">$ cortexops generate "Deploy PostgreSQL HA cluster"</div>
              <div className="text-green-400 mt-2">✓ Analyzing requirements...</div>
              <div className="text-green-400">✓ Generating playbook...</div>
              <div className="text-green-400">✓ Validating configuration...</div>
              <div className="text-white mt-2">Generated: postgres-ha.yml (342 lines)</div>
              <div className="text-slate-400 mt-4"># Ready to deploy in production</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="py-12 px-4 border-y border-slate-800">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-slate-400 mb-8">Ils nous font confiance</p>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
          {['Enterprise Corp', 'Tech Startup', 'Finance Group', 'Healthcare Inc', 'Retail Chain'].map((company) => (
            <div key={company} className="text-slate-500 font-semibold text-lg">
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: 'Génération Instantanée',
      description: 'Créez des playbooks complexes en quelques secondes avec l\'IA'
    },
    {
      icon: Shield,
      title: 'Sécurité Enterprise-Grade',
      description: 'Conformité CIS, GDPR, SOC2. Audit complet et chiffrement end-to-end'
    },
    {
      icon: Cloud,
      title: 'Multi-Cloud Ready',
      description: 'AWS, Azure, GCP, DigitalOcean, bare metal. Partout où vous êtes'
    },
    {
      icon: Terminal,
      title: '3 Modes de Déploiement',
      description: 'API REST, Docker, CLI, Extension VSCode. Choisissez votre workflow'
    },
    {
      icon: Lock,
      title: 'Zero Data Retention',
      description: 'Vos données ne sont jamais stockées. Privacy by design'
    },
    {
      icon: Database,
      title: 'On-Premise Compatible',
      description: 'Déployez dans votre datacenter. Contrôle total de vos données'
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-xl text-slate-400">
            Une plateforme complète pour votre automatisation
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 hover:border-blue-500/50 transition-all"
            >
              <feature.icon className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeploymentModes() {
  const modes = [
    {
      icon: Cloud,
      name: 'API Cloud',
      description: 'SaaS géré, mise à jour automatique',
      features: ['99.9% uptime SLA', 'CDN global', 'Auto-scaling'],
      badge: 'Populaire'
    },
    {
      icon: Server,
      name: 'On-Premise',
      description: 'Votre infrastructure, votre contrôle',
      features: ['Données privées', 'Conformité totale', 'Air-gapped'],
      badge: 'Enterprise'
    },
    {
      icon: Terminal,
      name: 'CLI + Docker',
      description: 'Développeur-friendly, CI/CD ready',
      features: ['npm install -g', 'docker run', 'GitLab/GitHub'],
      badge: 'DevOps'
    }
  ];

  return (
    <section className="py-24 px-4 bg-slate-800/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            3 modes de déploiement
          </h2>
          <p className="text-xl text-slate-400">
            Choisissez le mode qui correspond à vos besoins
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {modes.map((mode, index) => (
            <motion.div
              key={mode.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800 rounded-xl p-8 border border-slate-700 relative overflow-hidden group hover:border-blue-500/50 transition-all"
            >
              {mode.badge && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {mode.badge}
                </div>
              )}

              <mode.icon className="w-16 h-16 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">{mode.name}</h3>
              <p className="text-slate-400 mb-6">{mode.description}</p>

              <ul className="space-y-3">
                {mode.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const securityFeatures = [
    'Chiffrement AES-256 end-to-end',
    'Conformité SOC2 Type II',
    'Audit logs complets',
    'RBAC & SSO Enterprise',
    'Zero Data Retention Policy',
    'Penetration tests réguliers'
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-12 border border-slate-700">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 rounded-full border border-green-500/30 mb-6">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">Enterprise-Grade Security</span>
              </div>

              <h2 className="text-4xl font-bold text-white mb-4">
                Sécurité de niveau bancaire
              </h2>
              <p className="text-slate-400 mb-8">
                Vos données et votre infrastructure sont protégées par les standards
                de sécurité les plus stricts de l'industrie.
              </p>

              <ul className="space-y-4">
                {securityFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-slate-900 rounded-xl p-8 border border-slate-700">
                <Lock className="w-16 h-16 text-blue-400 mb-6 mx-auto" />
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span>TLS 1.3 Encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Zero-Trust Architecture</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Multi-Factor Auth</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Data Encryption at Rest</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Regular Security Audits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    { icon: Clock, title: '10x Plus Rapide', description: 'Réduisez vos délais de 90%' },
    { icon: TrendingUp, title: 'ROI Immédiat', description: 'Rentabilisé en 2 semaines' },
    { icon: Users, title: 'Équipe Productive', description: 'Concentrez-vous sur la valeur' },
    { icon: Award, title: 'Qualité Garantie', description: 'Best practices automatiques' }
  ];

  return (
    <section className="py-24 px-4 bg-slate-800/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Des résultats mesurables
          </h2>
          <p className="text-xl text-slate-400">
            Nos clients voient des résultats dès la première semaine
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <benefit.icon className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{benefit.title}</h3>
              <p className="text-slate-400">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onFreeTrial }: { onFreeTrial: () => void }) {
  const plans = [
    {
      name: 'Starter',
      price: 'Gratuit',
      description: '14 jours gratuits, sans carte bancaire',
      features: [
        '50 générations / mois',
        'API & CLI access',
        'Support communautaire',
        'Tous les templates'
      ],
      cta: 'Commencer gratuitement',
      highlighted: false
    },
    {
      name: 'Professional',
      price: '49€',
      period: '/ mois',
      description: 'Pour les équipes DevOps',
      features: [
        'Générations illimitées',
        'API & CLI & VSCode',
        'Support prioritaire 24/7',
        'Git integration',
        'Analytics avancés',
        'Multi-utilisateurs'
      ],
      cta: 'Essayer 14 jours',
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Sur mesure',
      description: 'Pour les grandes organisations',
      features: [
        'Tout Professional +',
        'On-Premise deployment',
        'SSO & SAML',
        'SLA 99.95%',
        'Dedicated support',
        'Formation personnalisée'
      ],
      cta: 'Contacter les ventes',
      highlighted: false
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tarifs transparents
          </h2>
          <p className="text-xl text-slate-400">
            Commencez gratuitement, évoluez selon vos besoins
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-400 shadow-xl shadow-blue-500/20 scale-105'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {plan.highlighted && (
                <div className="text-center mb-4">
                  <span className="px-4 py-1 bg-white/20 text-white text-sm font-semibold rounded-full">
                    Le plus populaire
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-slate-300">{plan.period}</span>}
              </div>
              <p className={`mb-8 ${plan.highlighted ? 'text-blue-100' : 'text-slate-400'}`}>
                {plan.description}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      plan.highlighted ? 'text-white' : 'text-green-400'
                    }`} />
                    <span className={plan.highlighted ? 'text-white' : 'text-slate-300'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onFreeTrial}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Jean Dupont',
      role: 'DevOps Lead',
      company: 'TechCorp',
      content: 'CortexOps nous a fait gagner 80% de temps sur la création de playbooks. Un outil indispensable.',
      rating: 5
    },
    {
      name: 'Marie Martin',
      role: 'CTO',
      company: 'StartupXYZ',
      content: 'La qualité des playbooks générés est exceptionnelle. Notre équipe est beaucoup plus productive.',
      rating: 5
    },
    {
      name: 'Pierre Bernard',
      role: 'Infrastructure Architect',
      company: 'FinanceGroup',
      content: 'Le mode on-premise nous permet de respecter nos contraintes de conformité tout en bénéficiant de l\'IA.',
      rating: 5
    }
  ];

  return (
    <section className="py-24 px-4 bg-slate-800/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ce qu'ils en disent
          </h2>
          <p className="text-xl text-slate-400">
            Rejoignez des centaines d'équipes satisfaites
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800 rounded-xl p-8 border border-slate-700"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-300 mb-6">{testimonial.content}</p>
              <div>
                <div className="font-semibold text-white">{testimonial.name}</div>
                <div className="text-sm text-slate-400">{testimonial.role} • {testimonial.company}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onFreeTrial, onRequestDemo }: { onFreeTrial: () => void; onRequestDemo: () => void }) {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à transformer votre DevOps ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des milliers d'équipes qui automatisent déjà leur infrastructure
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFreeTrial}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Démarrer l'essai gratuit
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRequestDemo}
              className="px-8 py-4 bg-blue-900/50 text-white rounded-xl font-semibold text-lg border-2 border-white/30 hover:bg-blue-900/70 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Planifier une démo
            </motion.button>
          </div>

          <p className="text-blue-100 mt-6">
            14 jours gratuits • Sans carte bancaire • Support inclus
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-400" />
              CortexOps
            </h3>
            <p className="text-slate-400 text-sm">
              Automatisez votre infrastructure avec l'IA
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">API</a></li>
              <li><a href="#" className="hover:text-white transition">CLI</a></li>
              <li><a href="#" className="hover:text-white transition">VSCode Extension</a></li>
              <li><a href="#" className="hover:text-white transition">Docker</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition">Guides</a></li>
              <li><a href="#" className="hover:text-white transition">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-white transition">À propos</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
              <li><a href="#" className="hover:text-white transition">Sécurité</a></li>
              <li><a href="#" className="hover:text-white transition">Confidentialité</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-slate-400 text-sm">
          <p>&copy; 2025 CortexOps. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
