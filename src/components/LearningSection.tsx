import { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { supabase, Course, Lesson } from '../lib/supabase';
import { LessonViewer } from './LessonViewer';

export function LearningSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourse(data[0]);
      }
    }
    setLoading(false);
  };

  const loadLessons = async (courseId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setLessons(data);
      if (data.length > 0 && !selectedLesson) {
        setSelectedLesson(data[0]);
      }
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'expert': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      case 'expert': return 'Expert';
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Chargement des cours...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
      <div className="col-span-3 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Parcours d'apprentissage</h2>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          {courses.map((course) => (
            <div key={course.id} className="mb-3">
              <button
                onClick={() => setSelectedCourse(course)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedCourse?.id === course.id
                    ? 'bg-gradient-to-br from-red-600/20 to-red-700/10 border-red-500/60 shadow-lg shadow-red-600/20'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm leading-tight">{course.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>
              </button>

              {selectedCourse?.id === course.id && (
                <div className="mt-2 ml-2 space-y-1 border-l-2 border-red-500/30 pl-2">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 text-sm transition-all group ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-slate-700 text-white shadow-md'
                          : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
                      }`}
                    >
                      {selectedLesson?.id === lesson.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-red-400 transition-colors" />
                      )}
                      <span className="flex-1 truncate">{lesson.title}</span>
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                        selectedLesson?.id === lesson.id ? 'text-red-400 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                      }`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-9">
        {selectedLesson ? (
          <LessonViewer lesson={selectedLesson} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <ChevronRight className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-lg">Sélectionnez une leçon pour commencer</p>
              <p className="text-slate-500 text-sm mt-2">Choisissez un cours dans le menu à gauche</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
