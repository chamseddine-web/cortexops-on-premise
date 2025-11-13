import { useState } from 'react';
import { Lesson } from '../lib/supabase';
import { BookOpen, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonViewerProps {
  lesson: Lesson;
}

export function LessonViewer({ lesson }: LessonViewerProps) {
  const [showCode, setShowCode] = useState(true);

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
          <div className="p-2 bg-red-600/20 rounded-lg">
            <BookOpen className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert prose-slate max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-slate-700">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-200 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-slate-300 mb-4 leading-relaxed text-[15px]">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300 ml-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-300 ml-2">{children}</ol>,
                li: ({ children }) => <li className="text-slate-300 text-[15px]">{children}</li>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="bg-slate-900/80 text-red-400 px-2 py-0.5 rounded text-sm font-mono border border-slate-700/50">{children}</code>;
                  }
                  return (
                    <code className="block bg-slate-900/80 text-slate-300 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-slate-700/50">
                      {children}
                    </code>
                  );
                },
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              }}
            >
              {lesson.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {lesson.example_playbook && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-600/20 rounded-lg">
                <Code className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm font-semibold text-white">Exemple de Playbook</span>
            </div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-xs px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-slate-300 rounded-lg transition-all font-medium shadow-sm"
            >
              {showCode ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          {showCode && (
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm text-slate-300 font-mono">
                <code>{lesson.example_playbook}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
