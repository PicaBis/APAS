import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Users, GraduationCap, Trash2, Eye, Clock, Beaker, ChevronDown, ChevronUp, Home } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';
import PageTransition from '@/components/apas/PageTransition';
import { playPageTransition } from '@/utils/sound';

type Lang = 'ar' | 'en' | 'fr';
type Role = 'none' | 'teacher' | 'student';

interface ExperimentSubmission {
  id: string;
  studentName: string;
  timestamp: number;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  range: number;
  maxHeight: number;
  flightTime: number;
  notes: string;
}

interface ClassroomData {
  id: string;
  code: string;
  teacherName: string;
  createdAt: number;
  submissions: ExperimentSubmission[];
}

const STORAGE_KEY = 'apas_classrooms';
const ROLE_KEY = 'apas_classroom_role';
const CURRENT_CLASS_KEY = 'apas_current_class';
const STUDENT_NAME_KEY = 'apas_student_name';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadClassrooms(): ClassroomData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveClassrooms(data: ClassroomData[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

const T = {
  ar: {
    dir: 'rtl' as const,
    title: '\u0646\u0638\u0627\u0645 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0635\u0648\u0644',
    subtitle: '\u0627\u0644\u0623\u0633\u062a\u0627\u0630 \u064a\u0646\u0634\u0626 \u0641\u0635\u0644\u0627\u064b \u2014 \u0627\u0644\u0637\u0644\u0627\u0628 \u064a\u0631\u0641\u0639\u0648\u0646 \u062a\u062c\u0627\u0631\u0628\u0647\u0645',
    iAmTeacher: '\u0623\u0646\u0627 \u0623\u0633\u062a\u0627\u0630',
    iAmStudent: '\u0623\u0646\u0627 \u0637\u0627\u0644\u0628',
    createClass: '\u0625\u0646\u0634\u0627\u0621 \u0641\u0635\u0644 \u062c\u062f\u064a\u062f',
    teacherName: '\u0627\u0633\u0645 \u0627\u0644\u0623\u0633\u062a\u0627\u0630',
    className: '\u0627\u0633\u0645 \u0627\u0644\u0641\u0635\u0644',
    create: '\u0625\u0646\u0634\u0627\u0621',
    classCode: '\u0631\u0645\u0632 \u0627\u0644\u0641\u0635\u0644',
    copyCode: '\u0646\u0633\u062e \u0627\u0644\u0631\u0645\u0632',
    copied: '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!',
    studentSubmissions: '\u062a\u062c\u0627\u0631\u0628 \u0627\u0644\u0637\u0644\u0627\u0628',
    noSubmissions: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062c\u0627\u0631\u0628 \u0628\u0639\u062f',
    joinClass: '\u0627\u0646\u0636\u0645 \u0644\u0641\u0635\u0644',
    enterCode: '\u0623\u062f\u062e\u0644 \u0631\u0645\u0632 \u0627\u0644\u0641\u0635\u0644',
    studentName: '\u0627\u0633\u0645\u0643',
    join: '\u0627\u0646\u0636\u0645',
    submitExperiment: '\u0631\u0641\u0639 \u062a\u062c\u0631\u0628\u0629',
    velocity: '\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u064a\u0629 (m/s)',
    angle: '\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 (\u00b0)',
    height: '\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0623\u0648\u0644\u064a (m)',
    gravity: '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 (m/s\u00b2)',
    airRes: '\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621',
    mass: '\u0627\u0644\u0643\u062a\u0644\u0629 (kg)',
    range: '\u0627\u0644\u0645\u062f\u0649 (m)',
    maxH: '\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 (m)',
    flightTime: '\u0632\u0645\u0646 \u0627\u0644\u062a\u062d\u0644\u064a\u0642 (s)',
    notes: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a',
    submit: '\u0631\u0641\u0639',
    submitted: '\u062a\u0645 \u0627\u0644\u0631\u0641\u0639 \u0628\u0646\u062c\u0627\u062d!',
    back: '\u0631\u062c\u0648\u0639',
    home: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    simulator: '\u0627\u0644\u0645\u062d\u0627\u0643\u064a',
    deleteClass: '\u062d\u0630\u0641 \u0627\u0644\u0641\u0635\u0644',
    deleteConfirm: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f\u061f',
    invalidCode: '\u0631\u0645\u0632 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d',
    parameters: '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a',
    results: '\u0627\u0644\u0646\u062a\u0627\u0626\u062c',
    myClasses: '\u0641\u0635\u0648\u0644\u064a',
    changeRole: '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062f\u0648\u0631',
    totalStudents: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u062c\u0627\u0631\u0628',
  },
  en: {
    dir: 'ltr' as const,
    title: 'Classroom Management',
    subtitle: 'Teachers create classrooms \u2014 Students submit experiments',
    iAmTeacher: "I'm a Teacher",
    iAmStudent: "I'm a Student",
    createClass: 'Create New Classroom',
    teacherName: 'Teacher Name',
    className: 'Classroom Name',
    create: 'Create',
    classCode: 'Class Code',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    studentSubmissions: 'Student Submissions',
    noSubmissions: 'No submissions yet',
    joinClass: 'Join a Classroom',
    enterCode: 'Enter class code',
    studentName: 'Your Name',
    join: 'Join',
    submitExperiment: 'Submit Experiment',
    velocity: 'Initial Velocity (m/s)',
    angle: 'Launch Angle (\u00b0)',
    height: 'Initial Height (m)',
    gravity: 'Gravity (m/s\u00b2)',
    airRes: 'Air Resistance',
    mass: 'Mass (kg)',
    range: 'Range (m)',
    maxH: 'Max Height (m)',
    flightTime: 'Flight Time (s)',
    notes: 'Notes',
    submit: 'Submit',
    submitted: 'Successfully submitted!',
    back: 'Back',
    home: 'Home',
    simulator: 'Simulator',
    deleteClass: 'Delete Class',
    deleteConfirm: 'Are you sure?',
    invalidCode: 'Invalid code',
    parameters: 'Parameters',
    results: 'Results',
    myClasses: 'My Classes',
    changeRole: 'Change Role',
    totalStudents: 'Total Submissions',
  },
  fr: {
    dir: 'ltr' as const,
    title: 'Gestion de Classe',
    subtitle: "Les enseignants cr\u00e9ent des classes \u2014 Les \u00e9tudiants soumettent leurs exp\u00e9riences",
    iAmTeacher: 'Je suis Enseignant',
    iAmStudent: 'Je suis \u00c9tudiant',
    createClass: 'Cr\u00e9er une Classe',
    teacherName: "Nom de l'Enseignant",
    className: 'Nom de la Classe',
    create: 'Cr\u00e9er',
    classCode: 'Code de Classe',
    copyCode: 'Copier le Code',
    copied: 'Copi\u00e9 !',
    studentSubmissions: 'Soumissions des \u00c9tudiants',
    noSubmissions: 'Aucune soumission',
    joinClass: 'Rejoindre une Classe',
    enterCode: 'Entrez le code',
    studentName: 'Votre Nom',
    join: 'Rejoindre',
    submitExperiment: "Soumettre l'Exp\u00e9rience",
    velocity: 'Vitesse Initiale (m/s)',
    angle: "Angle de Lancement (\u00b0)",
    height: 'Hauteur Initiale (m)',
    gravity: 'Gravit\u00e9 (m/s\u00b2)',
    airRes: "R\u00e9sistance de l'Air",
    mass: 'Masse (kg)',
    range: 'Port\u00e9e (m)',
    maxH: 'Hauteur Max (m)',
    flightTime: 'Temps de Vol (s)',
    notes: 'Notes',
    submit: 'Soumettre',
    submitted: 'Soumis avec succ\u00e8s !',
    back: 'Retour',
    home: 'Accueil',
    simulator: 'Simulateur',
    deleteClass: 'Supprimer la Classe',
    deleteConfirm: '\u00cates-vous s\u00fbr ?',
    invalidCode: 'Code invalide',
    parameters: 'Param\u00e8tres',
    results: 'R\u00e9sultats',
    myClasses: 'Mes Classes',
    changeRole: 'Changer de R\u00f4le',
    totalStudents: 'Total des Soumissions',
  },
};

const Classroom: React.FC = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('apas_lang') as Lang) || 'ar'; } catch { return 'ar'; }
  });
  const [role, setRole] = useState<Role>(() => {
    try { return (localStorage.getItem(ROLE_KEY) as Role) || 'none'; } catch { return 'none'; }
  });
  const [classrooms, setClassrooms] = useState<ClassroomData[]>(loadClassrooms);
  const [currentClassId, setCurrentClassId] = useState<string | null>(() => {
    try { return localStorage.getItem(CURRENT_CLASS_KEY); } catch { return null; }
  });
  const [teacherName, setTeacherName] = useState('');
  const [studentName, setStudentName] = useState(() => {
    try { return localStorage.getItem(STUDENT_NAME_KEY) || ''; } catch { return ''; }
  });
  const [joinCode, setJoinCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const [expForm, setExpForm] = useState({
    velocity: 20, angle: 45, height: 0, gravity: 9.81,
    airResistance: 0, mass: 1, range: 0, maxHeight: 0, flightTime: 0, notes: '',
  });

  const t = T[lang];

  useEffect(() => {
    try { localStorage.setItem(ROLE_KEY, role); } catch { /* silent */ }
  }, [role]);

  useEffect(() => {
    try { localStorage.setItem(CURRENT_CLASS_KEY, currentClassId || ''); } catch { /* silent */ }
  }, [currentClassId]);

  useEffect(() => {
    try { localStorage.setItem(STUDENT_NAME_KEY, studentName); } catch { /* silent */ }
  }, [studentName]);

  useEffect(() => {
    try { localStorage.setItem('apas_lang', lang); } catch { /* silent */ }
  }, [lang]);

  const updateClassrooms = useCallback((data: ClassroomData[]) => {
    setClassrooms(data);
    saveClassrooms(data);
  }, []);

  const handleCreateClass = () => {
    if (!teacherName.trim()) return;
    const newClass: ClassroomData = {
      id: generateId(),
      code: generateCode(),
      teacherName: teacherName.trim(),
      createdAt: Date.now(),
      submissions: [],
    };
    const updated = [...classrooms, newClass];
    updateClassrooms(updated);
    setCurrentClassId(newClass.id);
    setTeacherName('');
  };

  const handleDeleteClass = (id: string) => {
    const updated = classrooms.filter(c => c.id !== id);
    updateClassrooms(updated);
    if (currentClassId === id) setCurrentClassId(null);
  };

  const handleJoinClass = () => {
    if (!joinCode.trim() || !studentName.trim()) return;
    const found = classrooms.find(c => c.code === joinCode.trim().toUpperCase());
    if (!found) { setCodeError(true); return; }
    setCurrentClassId(found.id);
    setCodeError(false);
    setJoinCode('');
  };

  const handleSubmitExperiment = () => {
    if (!currentClassId || !studentName.trim()) return;
    const submission: ExperimentSubmission = {
      id: generateId(),
      studentName: studentName.trim(),
      timestamp: Date.now(),
      velocity: expForm.velocity,
      angle: expForm.angle,
      height: expForm.height,
      gravity: expForm.gravity,
      airResistance: expForm.airResistance,
      mass: expForm.mass,
      range: expForm.range,
      maxHeight: expForm.maxHeight,
      flightTime: expForm.flightTime,
      notes: expForm.notes,
    };
    const updated = classrooms.map(c =>
      c.id === currentClassId ? { ...c, submissions: [...c.submissions, submission] } : c
    );
    updateClassrooms(updated);
    setSubmitSuccess(true);
    setShowSubmitForm(false);
    setTimeout(() => setSubmitSuccess(false), 3000);
    setExpForm({ velocity: 20, angle: 45, height: 0, gravity: 9.81, airResistance: 0, mass: 1, range: 0, maxHeight: 0, flightTime: 0, notes: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const currentClass = classrooms.find(c => c.id === currentClassId);

  const renderRoleSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <ApasLogo size={64} />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-4">{t.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={() => setRole('teacher')}
          className="group px-8 py-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-w-[200px]">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">{t.iAmTeacher}</span>
        </button>
        <button onClick={() => setRole('student')}
          className="group px-8 py-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-3 min-w-[200px]">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Users className="w-7 h-7 text-blue-500" />
          </div>
          <span className="text-base font-semibold text-foreground">{t.iAmStudent}</span>
        </button>
      </div>
    </div>
  );

  const renderTeacherView = () => (
    <div className="space-y-6">
      {/* Create new classroom */}
      {!currentClassId && (
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t.createClass}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="teacher-name" className="sr-only">{t.teacherName}</label>
            <input id="teacher-name" name="teacher-name" type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)}
              placeholder={t.teacherName}
              className="flex-1 px-4 py-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            <button onClick={handleCreateClass} disabled={!teacherName.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {t.create}
            </button>
          </div>
        </div>
      )}

      {/* Current classroom dashboard */}
      {currentClass && (
        <div className="space-y-4">
          {/* Class info header */}
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{currentClass.teacherName}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(currentClass.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2">
                  <span className="text-xs text-muted-foreground">{t.classCode}:</span>
                  <span className="text-lg font-bold font-mono text-primary tracking-widest">{currentClass.code}</span>
                  <button onClick={() => copyToClipboard(currentClass.code)}
                    className="p-1 rounded hover:bg-primary/20 transition-colors">
                    <Copy className="w-4 h-4 text-primary" />
                  </button>
                  {codeCopied && <span className="text-xs text-green-500">{t.copied}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="px-3 py-1.5 bg-secondary/50 rounded-lg text-xs">
                <span className="text-muted-foreground">{t.totalStudents}: </span>
                <span className="font-semibold text-foreground">{currentClass.submissions.length}</span>
              </div>
              <button onClick={() => { setCurrentClassId(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t.back}
              </button>
              <button onClick={() => handleDeleteClass(currentClass.id)}
                className="text-xs text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> {t.deleteClass}
              </button>
            </div>
          </div>

          {/* Submissions list */}
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              {t.studentSubmissions}
            </h3>
            {currentClass.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t.noSubmissions}</p>
            ) : (
              <div className="space-y-3">
                {currentClass.submissions.slice().reverse().map((sub) => (
                  <div key={sub.id} className="border border-border/30 rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {sub.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-start">
                          <p className="text-sm font-medium text-foreground">{sub.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(sub.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">V={sub.velocity} | \u03b8={sub.angle}\u00b0</span>
                        {expandedSubmission === sub.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {expandedSubmission === sub.id && (
                      <div className="px-4 pb-4 border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.velocity}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.velocity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.angle}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.angle}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.height}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.height}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.gravity}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.gravity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.mass}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.mass}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.airRes}</p>
                            <p className="text-sm font-mono font-semibold text-foreground">{sub.airResistance}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/20">
                          <div className="text-center bg-green-500/5 rounded-lg py-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.range}</p>
                            <p className="text-sm font-mono font-bold text-green-600 dark:text-green-400">{sub.range}</p>
                          </div>
                          <div className="text-center bg-blue-500/5 rounded-lg py-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.maxH}</p>
                            <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{sub.maxHeight}</p>
                          </div>
                          <div className="text-center bg-purple-500/5 rounded-lg py-2">
                            <p className="text-[10px] text-muted-foreground mb-0.5">{t.flightTime}</p>
                            <p className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">{sub.flightTime}</p>
                          </div>
                        </div>
                        {sub.notes && (
                          <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                            <p className="text-[10px] text-muted-foreground mb-1">{t.notes}:</p>
                            <p className="text-xs text-foreground">{sub.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List of classrooms */}
      {!currentClassId && classrooms.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">{t.myClasses}</h3>
          <div className="space-y-2">
            {classrooms.map(c => (
              <button key={c.id} onClick={() => setCurrentClassId(c.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-start">
                    <p className="text-sm font-medium text-foreground">{c.teacherName}</p>
                    <p className="text-[10px] text-muted-foreground">{t.classCode}: {c.code} | {c.submissions.length} {t.totalStudents.toLowerCase()}</p>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStudentView = () => (
    <div className="space-y-6">
      {/* Join classroom or show current */}
      {!currentClassId && (
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {t.joinClass}
          </h3>
          <div className="space-y-3">
            <label htmlFor="student-name" className="sr-only">{t.studentName}</label>
            <input id="student-name" name="student-name" type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
              placeholder={t.studentName}
              className="w-full px-4 py-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            <div className="flex gap-3">
              <label htmlFor="join-code" className="sr-only">{t.enterCode}</label>
              <input id="join-code" name="join-code" type="text" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setCodeError(false); }}
                placeholder={t.enterCode} maxLength={6}
                className={`flex-1 px-4 py-2.5 rounded-lg bg-secondary/50 border text-foreground text-sm font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none text-center ${codeError ? 'border-red-500' : 'border-border/50 focus:border-primary/50'}`} />
              <button onClick={handleJoinClass} disabled={!joinCode.trim() || !studentName.trim()}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {t.join}
              </button>
            </div>
            {codeError && <p className="text-xs text-red-500">{t.invalidCode}</p>}
          </div>
        </div>
      )}

      {/* Current class & submit experiment */}
      {currentClass && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{currentClass.teacherName}</h3>
                <p className="text-xs text-muted-foreground">{t.classCode}: {currentClass.code}</p>
              </div>
              <button onClick={() => setCurrentClassId(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.back}</button>
            </div>
          </div>

          {submitSuccess && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t.submitted}</p>
            </div>
          )}

          {!showSubmitForm ? (
            <button onClick={() => setShowSubmitForm(true)}
              className="w-full py-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              {t.submitExperiment}
            </button>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-primary" />
                {t.submitExperiment}
              </h3>
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">{t.parameters}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'velocity', label: t.velocity, val: expForm.velocity },
                    { key: 'angle', label: t.angle, val: expForm.angle },
                    { key: 'height', label: t.height, val: expForm.height },
                    { key: 'gravity', label: t.gravity, val: expForm.gravity },
                    { key: 'airResistance', label: t.airRes, val: expForm.airResistance },
                    { key: 'mass', label: t.mass, val: expForm.mass },
                  ].map(({ key, label, val }) => (
                    <div key={key}>
                      <label htmlFor={`param-${key}`} className="text-[10px] text-muted-foreground block mb-1">{label}</label>
                      <input id={`param-${key}`} name={key} type="number" value={val}
                        onChange={e => setExpForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm font-mono focus:outline-none focus:border-primary/50" />
                    </div>
                  ))}
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-2">{t.results}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'range', label: t.range, val: expForm.range },
                    { key: 'maxHeight', label: t.maxH, val: expForm.maxHeight },
                    { key: 'flightTime', label: t.flightTime, val: expForm.flightTime },
                  ].map(({ key, label, val }) => (
                    <div key={key}>
                      <label htmlFor={`result-${key}`} className="text-[10px] text-muted-foreground block mb-1">{label}</label>
                      <input id={`result-${key}`} name={key} type="number" value={val}
                        onChange={e => setExpForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm font-mono focus:outline-none focus:border-primary/50" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">{t.notes}</label>
                  <textarea value={expForm.notes} onChange={e => setExpForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSubmitExperiment}
                    className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
                    {t.submit}
                  </button>
                  <button onClick={() => setShowSubmitForm(false)}
                    className="px-4 py-2.5 bg-secondary/50 text-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors">
                    {t.back}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const navigateWithSound = useCallback((path: string) => {
    playPageTransition(false);
    setTimeout(() => navigate(path), 120);
  }, [navigate]);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background text-foreground" dir={t.dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-3">
            <ApasLogo size={28} />
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">APAS</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateWithSound('/home')} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground nav-btn-animate" title={t.home}>
              <Home className="w-4 h-4" />
            </button>
            <button onClick={() => navigateWithSound('/simulator')} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors nav-btn-animate">
              {t.simulator}
            </button>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
              {(['ar', 'en', 'fr'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${lang === l ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {l === 'ar' ? '\u0639' : l === 'en' ? 'EN' : 'FR'}
                </button>
              ))}
            </div>
            {role !== 'none' && (
              <button onClick={() => { setRole('none'); setCurrentClassId(null); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                {t.changeRole}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {role === 'none' && renderRoleSelection()}
        {role === 'teacher' && renderTeacherView()}
        {role === 'student' && renderStudentView()}
      </main>
    </div>
    </PageTransition>
  );
};

export default Classroom;
