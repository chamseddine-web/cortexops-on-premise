import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Mail, User, Phone, Users, Briefcase, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EnterpriseDemoProps {
  onClose: () => void;
}

export function EnterpriseDemo({ onClose }: EnterpriseDemoProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    jobTitle: '',
    teamSize: '',
    useCase: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { error: dbError } = await supabase
        .from('contact_requests')
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            company: formData.company,
            phone: formData.phone,
            job_title: formData.jobTitle,
            team_size: formData.teamSize,
            use_case: formData.useCase,
            message: formData.message,
            request_type: 'enterprise_demo',
            status: 'new'
          }
        ]);

      if (dbError) throw dbError;

      setIsSuccess(true);

      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (err: any) {
      console.error('Error submitting demo request:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-800"
        >
          {!isSuccess ? (
            <>
              <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-400" />
                    Demander une démo Enterprise
                  </h2>
                  <p className="text-slate-400 mt-1">
                    Découvrez comment CortexOps peut transformer votre infrastructure
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="Jean"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="Dupont"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email professionnel *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="jean.dupont@entreprise.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Building2 className="w-4 h-4 inline mr-2" />
                      Entreprise *
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Briefcase className="w-4 h-4 inline mr-2" />
                      Fonction
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      placeholder="CTO, DevOps Lead, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Taille de l'équipe *
                    </label>
                    <select
                      name="teamSize"
                      value={formData.teamSize}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="1-10">1-10 personnes</option>
                      <option value="11-50">11-50 personnes</option>
                      <option value="51-200">51-200 personnes</option>
                      <option value="201-1000">201-1000 personnes</option>
                      <option value="1000+">1000+ personnes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cas d'usage principal *
                    </label>
                    <select
                      name="useCase"
                      value={formData.useCase}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="automation">Automatisation infrastructure</option>
                      <option value="compliance">Conformité et sécurité</option>
                      <option value="cloud-migration">Migration cloud</option>
                      <option value="devops">DevOps / CI/CD</option>
                      <option value="disaster-recovery">Disaster recovery</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Message (optionnel)
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition resize-none"
                    placeholder="Parlez-nous de vos besoins spécifiques..."
                  />
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    {error}
                  </div>
                )}

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-white font-semibold mb-2">Ce qui vous attend :</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      Démonstration personnalisée de 45 minutes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      Analyse de vos besoins spécifiques
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      POC gratuit de 30 jours
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      Support dédié pendant l'évaluation
                    </li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Demander une démo'}
                  </button>
                </div>

                <p className="text-center text-slate-400 text-sm">
                  En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe commerciale.
                </p>
              </form>
            </>
          ) : (
            <div className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              <h3 className="text-2xl font-bold text-white mb-4">
                Demande reçue !
              </h3>
              <p className="text-slate-300 mb-6">
                Notre équipe vous contactera dans les 24 heures pour planifier votre démonstration personnalisée.
              </p>
              <p className="text-slate-400 text-sm">
                Vérifiez votre boîte mail (et les spams) pour notre confirmation.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
