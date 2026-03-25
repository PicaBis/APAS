import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Eye, Layers, BarChart3, Globe, Zap, GraduationCap, Users, Sparkles, ChevronDown, Box, Camera, Calculator, BookOpen, Moon, Sun, Info, Volume2, VolumeX, LogIn, UserPlus, Shield, LogOut, Download, Monitor, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DevPrivilegesButton from '@/components/auth/DevPrivilegesButton';

import AboutModal from '@/components/apas/AboutModal';
const ComprehensiveGuideModal = lazy(() => import('@/components/apas/ComprehensiveGuideModal'));
import BugReportButton from '@/components/apas/BugReportButton';
import ApasLogo from '@/components/apas/ApasLogo';
import SplashScreen from '@/components/apas/SplashScreen';
import PageTransition from '@/components/apas/PageTransition';
import WindParticlesBackground from '@/components/apas/WindParticlesBackground';
import TestimonialsSection from '@/components/apas/TestimonialsSection';
import ProfessionalFooter from '@/components/apas/ProfessionalFooter';
import { playPageTransition, playLandingNav, playThemeToggle, playLangSwitch } from '@/utils/sound';
import { Smartphone } from 'lucide-react';
import { PWAInstallPrompt } from '@/components/mobile';

type Lang = 'ar' | 'en' | 'fr';

interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface LangData {
  dir: 'rtl' | 'ltr';
  heroTitle: string;
  heroSubtitle: string;
  heroDesc: string;
  enterSim: string;
  enterClassroom: string;
  whyTitle: string;
  whySubtitle: string;
  features: FeatureItem[];
  compTitle: string;
  compHeaders: string[];
  compRows: (string | boolean)[][];
  ctaTitle: string;
  ctaBtn: string;
  downloadTitle: string;
  downloadSubtitle: string;
  downloadBtn: string;
  downloadBtnLinux: string;
  downloadNote: string;
  downloadNav: string;
  classroomTitle: string;
  classroomDesc: string;
  classroomBtn: string;
  footer: string;
}

const LANG_DATA: Record<Lang, LangData> = {
  ar: {
    dir: 'rtl',
    heroTitle: 'APAS',
    heroSubtitle: '\u0646\u0638\u0627\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    heroDesc: '\u0645\u0646 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0621 \u0627\u0644\u0643\u0644\u0627\u0633\u064a\u0643\u064a\u0629 \u0625\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u2014 \u0623\u062f\u0627\u0629 \u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629 \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u0644\u062a\u062d\u0644\u064a\u0644 \u0648\u0641\u0647\u0645 \u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a',
    enterSim: '\u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629',
    enterClassroom: '\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062f\u0631\u0627\u0633\u064a',
    whyTitle: '\u0644\u0645\u0627\u0630\u0627 APAS \u0623\u0641\u0636\u0644\u061f',
    whySubtitle: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0645\u0639 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u062a\u0642\u0644\u064a\u062f\u064a\u0629',
    features: [
      { icon: 'brain', title: '\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u062a\u0642\u062f\u0645', desc: '\u062a\u0646\u0628\u0624 \u0628\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a \u0628\u062f\u0642\u0629 99.7% \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0634\u0628\u0643\u0627\u062a \u0639\u0635\u0628\u064a\u0629 \u0648\u062e\u0648\u0627\u0631\u0632\u0645\u064a\u0627\u062a \u062a\u0639\u0644\u0645 \u0622\u0644\u064a' },
      { icon: 'eye', title: '\u0631\u0624\u064a\u0629 \u062d\u0627\u0633\u0648\u0628\u064a\u0629', desc: '\u0627\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0641\u064a\u062f\u064a\u0648 \u0644\u0623\u064a \u0645\u0642\u0630\u0648\u0641 \u2014 APAS \u064a\u0633\u062a\u062e\u0631\u062c \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b' },
      { icon: 'box', title: '\u0645\u062d\u0627\u0643\u0627\u0629 \u062b\u0644\u0627\u062b\u064a\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062f', desc: '\u062a\u0635\u0648\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u0641\u064a \u0628\u064a\u0626\u0629 3D \u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0645\u0639 \u0641\u064a\u0632\u064a\u0627\u0621 \u0648\u0627\u0642\u0639\u064a\u0629 \u0643\u0627\u0645\u0644\u0629' },
      { icon: 'layers', title: '3 \u0637\u0631\u0642 \u062a\u0643\u0627\u0645\u0644 \u0639\u062f\u062f\u064a', desc: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u064a\u0646 Euler \u0648 RK4 \u0648 AI APAS \u0644\u0641\u0647\u0645 \u0627\u0644\u0641\u0631\u0642 \u0628\u064a\u0646 \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u0633\u0631\u0639\u0629' },
      { icon: 'chart', title: '\u062a\u062d\u0644\u064a\u0644 \u0623\u062e\u0637\u0627\u0621 \u0627\u062d\u062a\u0631\u0627\u0641\u064a', desc: 'R\u00b2, MAE, RMSE \u2014 \u0645\u0642\u0627\u064a\u064a\u0633 \u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629 \u0644\u062a\u0642\u064a\u064a\u0645 \u062f\u0642\u0629 \u0643\u0644 \u0646\u0645\u0648\u0630\u062c \u062a\u0646\u0628\u0624\u064a' },
      { icon: 'globe', title: '\u0628\u064a\u0626\u0627\u062a \u0643\u0648\u0643\u0628\u064a\u0629 \u0645\u062a\u0639\u062f\u062f\u0629', desc: '\u062c\u0631\u0628 \u0625\u0637\u0644\u0627\u0642 \u0645\u0642\u0630\u0648\u0641 \u0639\u0644\u0649 \u0627\u0644\u0642\u0645\u0631 \u0623\u0648 \u0627\u0644\u0645\u0631\u064a\u062e \u0623\u0648 \u0627\u0644\u0645\u0634\u062a\u0631\u064a \u0628\u062c\u0627\u0630\u0628\u064a\u0629 \u062d\u0642\u064a\u0642\u064a\u0629' },
      { icon: 'camera', title: '\u062a\u0635\u0648\u064a\u0631 \u0633\u062a\u0631\u0648\u0628\u0648\u0633\u0643\u0648\u0628\u064a', desc: '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631 \u0645\u062a\u062a\u0627\u0628\u0639\u0629 \u0644\u0644\u0645\u0633\u0627\u0631 \u0645\u0639 \u062a\u062d\u0643\u0645 \u0628\u0632\u0645\u0646 \u0627\u0644\u062a\u0639\u0631\u064a\u0636 \u2014 \u0645\u062b\u0644 \u0627\u0644\u0645\u062e\u062a\u0628\u0631 \u0627\u0644\u062d\u0642\u064a\u0642\u064a' },
      { icon: 'calculator', title: '\u0645\u062d\u0631\u0643 \u0645\u0639\u0627\u062f\u0644\u0627\u062a \u062a\u0641\u0627\u0639\u0644\u064a', desc: '\u0623\u062f\u062e\u0644 \u0645\u0639\u0627\u062f\u0644\u0627\u062a\u0643 \u0627\u0644\u062e\u0627\u0635\u0629 \u0648\u0634\u0627\u0647\u062f \u0627\u0644\u0645\u0633\u0627\u0631 \u064a\u064f\u0631\u0633\u0645 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0634\u0627\u0634\u0629' },
    ],
    compTitle: 'APAS \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u062a\u0642\u0644\u064a\u062f\u064a\u0629',
    compHeaders: ['\u0627\u0644\u0645\u064a\u0632\u0629', 'APAS (\u0645\u0633\u062c\u0644)', 'APAS (\u0632\u0627\u0626\u0631)', 'PhET', 'GeoGebra', 'Excel'],
    compRows: [
      ['\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0644\u062a\u0646\u0628\u0624', true, false, false, false, false],
      ['\u0631\u0624\u064a\u0629 \u062d\u0627\u0633\u0648\u0628\u064a\u0629 (\u0635\u0648\u0631/\u0641\u064a\u062f\u064a\u0648)', true, false, false, false, false],
      ['\u0645\u062d\u0627\u0643\u0627\u0629 3D \u062a\u0641\u0627\u0639\u0644\u064a\u0629', true, true, false, true, false],
      ['\u062a\u062d\u0644\u064a\u0644 \u0623\u062e\u0637\u0627\u0621 R\u00b2/MAE/RMSE', true, true, false, false, true],
      ['\u0628\u064a\u0626\u0627\u062a \u0643\u0648\u0643\u0628\u064a\u0629 (\u0627\u0644\u0642\u0645\u0631/\u0627\u0644\u0645\u0631\u064a\u062e)', true, true, true, false, false],
      ['\u062a\u0635\u0648\u064a\u0631 \u0633\u062a\u0631\u0648\u0628\u0648\u0633\u0643\u0648\u0628\u064a', true, true, false, false, false],
      ['\u0646\u0638\u0627\u0645 \u0625\u062f\u0627\u0631\u0629 \u0641\u0635\u0648\u0644', true, false, false, false, false],
      ['\u062f\u0639\u0645 \u0627\u0644\u0639\u0631\u0628\u064a\u0629/\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629', true, true, false, false, false],
    ],
    ctaTitle: '\u062c\u0627\u0647\u0632 \u0644\u062a\u062c\u0631\u0628\u0629 \u0641\u064a\u0632\u064a\u0627\u0621 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a \u0628\u0637\u0631\u064a\u0642\u0629 \u062c\u062f\u064a\u062f\u0629\u061f',
    ctaBtn: '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646',
    downloadTitle: '\u062d\u0645\u0651\u0644 \u062a\u0637\u0628\u064a\u0642 APAS \u0644\u0633\u0637\u062d \u0627\u0644\u0645\u0643\u062a\u0628',
    downloadSubtitle: 'تطبيق سطح المكتب لنظام Windows و Linux — يحمّل دائماً آخر إصدار تلقائياً',
    downloadBtn: 'تحميل لـ Windows x64',
    downloadBtnLinux: 'تحميل لـ Linux x64',
    downloadNote: 'التطبيق يتصل بالإنترنت لتحميل آخر التحديثات تلقائياً',
    downloadNav: '\u062a\u062d\u0645\u064a\u0644',
    classroomTitle: '\u0646\u0638\u0627\u0645 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0635\u0648\u0644',
    classroomDesc: '\u0627\u0644\u0623\u0633\u062a\u0627\u0630 \u064a\u0646\u0634\u0626 \u0641\u0635\u0644\u0627\u064b\u060c \u0648\u0627\u0644\u0637\u0644\u0627\u0628 \u064a\u0631\u0641\u0639\u0648\u0646 \u062a\u062c\u0627\u0631\u0628\u0647\u0645 \u2014 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u062a\u0638\u0647\u0631 \u0645\u0628\u0627\u0634\u0631\u0629 \u0641\u064a \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    classroomBtn: '\u062f\u062e\u0648\u0644 \u0627\u0644\u0641\u0635\u0644',
    footer: 'APAS \u2014 \u062a\u0637\u0648\u064a\u0631 \u0645\u062c\u0627\u0647\u062f \u0639\u0628\u062f\u0627\u0644\u0647\u0627\u062f\u064a \u0648 \u0645\u0648\u0641\u0642 \u0627\u0628\u0631\u0627\u0647\u064a\u0645 \u2014 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u064a\u0627 \u0644\u0644\u0623\u0633\u0627\u062a\u0630\u0629 \u0628\u0627\u0644\u0623\u063a\u0648\u0627\u0637',
  },
  en: {
    dir: 'ltr',
    heroTitle: 'APAS',
    heroSubtitle: 'AI Projectile Analysis System',
    heroDesc: 'From classical physics to artificial intelligence \u2014 a comprehensive academic tool for analyzing projectile motion',
    enterSim: 'Start Simulation',
    enterClassroom: 'Classroom',
    whyTitle: 'Why APAS?',
    whySubtitle: 'Compared to traditional tools',
    features: [
      { icon: 'brain', title: 'Advanced AI', desc: '99.7% trajectory prediction using neural networks and ML algorithms' },
      { icon: 'eye', title: 'Computer Vision', desc: 'Upload any image or video \u2014 APAS extracts parameters automatically' },
      { icon: 'box', title: '3D Simulation', desc: 'Visualize trajectories in an interactive 3D environment with realistic physics' },
      { icon: 'layers', title: '3 Integration Methods', desc: 'Compare Euler, RK4, and AI APAS to understand accuracy vs speed tradeoffs' },
      { icon: 'chart', title: 'Professional Error Analysis', desc: 'R\u00b2, MAE, RMSE \u2014 academic metrics to evaluate each prediction model' },
      { icon: 'globe', title: 'Planetary Environments', desc: 'Launch projectiles on the Moon, Mars, or Jupiter with real gravity values' },
      { icon: 'camera', title: 'Stroboscopic Photography', desc: 'Capture sequential trajectory frames with exposure control \u2014 like a real lab' },
      { icon: 'calculator', title: 'Equation Engine', desc: 'Enter your own equations and watch the trajectory render live on canvas' },
    ],
    compTitle: 'APAS vs Traditional Tools',
    compHeaders: ['Feature', 'APAS (Registered)', 'APAS (Guest)', 'PhET', 'GeoGebra', 'Excel'],
    compRows: [
      ['AI-powered Prediction', true, false, false, false, false],
      ['Computer Vision (Photo/Video)', true, false, false, false, false],
      ['Interactive 3D Simulation', true, true, false, true, false],
      ['Error Analysis R\u00b2/MAE/RMSE', true, true, false, false, true],
      ['Planetary Environments', true, true, true, false, false],
      ['Stroboscopic Photography', true, true, false, false, false],
      ['Classroom Management', true, false, false, false, false],
      ['Arabic/French Support', true, true, false, false, false],
    ],
    ctaTitle: 'Ready to experience projectile physics in a new way?',
    ctaBtn: 'Start Now',
    downloadTitle: 'Download APAS Desktop App',
    downloadSubtitle: 'Desktop application for Windows & Linux — always loads the latest version automatically',
    downloadBtn: 'Download for Windows x64',
    downloadBtnLinux: 'Download for Linux x64',
    downloadNote: 'The app connects to the internet to load the latest updates automatically',
    downloadNav: 'Download',
    classroomTitle: 'Classroom Management',
    classroomDesc: 'Teachers create a classroom, students submit experiments \u2014 results appear instantly on the teacher dashboard',
    classroomBtn: 'Enter Classroom',
    footer: 'APAS \u2014 Developed by Medjahed Abdelhadi & Mouffok Ibrahim \u2014 ENS Laghouat',
  },
  fr: {
    dir: 'ltr',
    heroTitle: 'APAS',
    heroSubtitle: "Syst\u00e8me d'Analyse de Projectiles par IA",
    heroDesc: "De la physique classique \u00e0 l'intelligence artificielle \u2014 un outil acad\u00e9mique complet pour l'analyse du mouvement des projectiles",
    enterSim: 'D\u00e9marrer la Simulation',
    enterClassroom: 'Salle de Classe',
    whyTitle: 'Pourquoi APAS ?',
    whySubtitle: 'Compar\u00e9 aux outils traditionnels',
    features: [
      { icon: 'brain', title: 'IA Avanc\u00e9e', desc: 'Pr\u00e9diction de trajectoire \u00e0 99.7% avec r\u00e9seaux neuronaux et algorithmes ML' },
      { icon: 'eye', title: 'Vision par Ordinateur', desc: "T\u00e9l\u00e9chargez une image ou vid\u00e9o \u2014 APAS extrait les param\u00e8tres automatiquement" },
      { icon: 'box', title: 'Simulation 3D', desc: "Visualisez les trajectoires dans un environnement 3D interactif" },
      { icon: 'layers', title: "3 M\u00e9thodes d'Int\u00e9gration", desc: "Comparez Euler, RK4 et AI APAS pour comprendre pr\u00e9cision vs vitesse" },
      { icon: 'chart', title: "Analyse d'Erreurs Pro", desc: "R\u00b2, MAE, RMSE \u2014 m\u00e9triques acad\u00e9miques pour \u00e9valuer chaque mod\u00e8le" },
      { icon: 'globe', title: 'Environnements Plan\u00e9taires', desc: 'Lancez des projectiles sur la Lune, Mars ou Jupiter avec la gravit\u00e9 r\u00e9elle' },
      { icon: 'camera', title: 'Photographie Stroboscopique', desc: "Capturez des images s\u00e9quentielles de la trajectoire \u2014 comme un vrai labo" },
      { icon: 'calculator', title: "Moteur d'\u00c9quations", desc: "Entrez vos \u00e9quations et regardez la trajectoire se dessiner en direct" },
    ],
    compTitle: 'APAS vs Outils Traditionnels',
    compHeaders: ['Fonctionnalit\u00e9', 'APAS (Inscrit)', 'APAS (Visiteur)', 'PhET', 'GeoGebra', 'Excel'],
    compRows: [
      ['Pr\u00e9diction par IA', true, false, false, false, false],
      ['Vision par Ordinateur', true, false, false, false, false],
      ['Simulation 3D Interactive', true, true, false, true, false],
      ["Analyse d'Erreurs R\u00b2/MAE", true, true, false, false, true],
      ['Environnements Plan\u00e9taires', true, true, true, false, false],
      ['Photo Stroboscopique', true, true, false, false, false],
      ['Gestion de Classe', true, false, false, false, false],
      ['Support Arabe/Fran\u00e7ais', true, true, false, false, false],
    ],
    ctaTitle: 'Pr\u00eat \u00e0 d\u00e9couvrir la physique des projectiles autrement ?',
    ctaBtn: 'Commencer',
    downloadTitle: 'T\u00e9l\u00e9charger APAS Desktop',
    downloadSubtitle: 'Application de bureau pour Windows & Linux \u2014 charge toujours la derni\u00e8re version automatiquement',
    downloadBtn: 'T\u00e9l\u00e9charger pour Windows x64',
    downloadBtnLinux: 'T\u00e9l\u00e9charger pour Linux x64',
    downloadNote: "L'application se connecte \u00e0 Internet pour charger les derni\u00e8res mises \u00e0 jour",
    downloadNav: 'T\u00e9l\u00e9charger',
    classroomTitle: 'Gestion de Classe',
    classroomDesc: "L'enseignant cr\u00e9e une classe, les \u00e9tudiants soumettent leurs exp\u00e9riences \u2014 les r\u00e9sultats apparaissent instantan\u00e9ment",
    classroomBtn: 'Entrer en Classe',
    footer: 'APAS \u2014 D\u00e9velopp\u00e9 par Medjahed Abdelhadi & Mouffok Ibrahim \u2014 ENS Laghouat',
  },
};

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  brain: Brain, eye: Eye, box: Box, layers: Layers,
  chart: BarChart3, globe: Globe, camera: Camera, calculator: Calculator,
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isGuest, isAdmin, signOut, profile } = useAuth();
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('apas_lang') as Lang) || 'ar'; } catch { return 'ar'; }
  });
  const [nightMode, setNightMode] = useState(() => {
    try { return localStorage.getItem('apas_nightMode') === 'true'; } catch { return false; }
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showComprehensiveGuide, setShowComprehensiveGuide] = useState(false);
  const [showSplash] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('apas_landing_muted') === 'true'; } catch { return false; }
  });
  const [themeSwitching, setThemeSwitching] = useState(false);
  const t = LANG_DATA[lang];
  const isRTL = t.dir === 'rtl';

  // Scroll-triggered reveal
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  }, []);

  // Animated counter
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('apas_landing_muted', String(muted)); } catch { /* storage unavailable */ }
  }, [muted]);

  const navigateWithSound = useCallback((path: string) => {
    playPageTransition(muted);
    // Small delay to let the sound play before navigating
    setTimeout(() => navigate(path), 120);
  }, [navigate, muted]);

  const handleThemeToggle = useCallback(() => {
    playThemeToggle(muted, !nightMode);
    setThemeSwitching(true);
    setNightMode(!nightMode);
    setTimeout(() => setThemeSwitching(false), 500);
  }, [muted, nightMode]);

  const handleLangSwitch = useCallback((l: Lang) => {
    if (l !== lang) {
      playLangSwitch(muted);
      setLang(l);
    }
  }, [lang, muted]);

  useEffect(() => {
    try { localStorage.setItem('apas_lang', lang); } catch { /* silent */ }
  }, [lang]);

  useEffect(() => {
    if (nightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('apas_nightMode', String(nightMode)); } catch { /* silent */ }
  }, [nightMode]);

  if (showSplash) {
    return <SplashScreen lang={lang} onComplete={() => setShowSplash(false)} />;
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background text-foreground" dir={t.dir}>
      {/* Wind particles background */}
      <WindParticlesBackground />

      {/* Ambient background blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Nav bar - mobile optimized */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-6xl mx-auto px-2 sm:px-6 h-11 sm:h-14 flex items-center justify-end gap-1 sm:gap-4" dir="ltr">
          {/* Logo - compact on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 mr-auto shrink-0">
            <span className="text-[8px] sm:text-[10px] font-mono text-muted-foreground/70 border border-border/50 rounded px-1 py-0.5 hidden sm:inline">v1.1</span>
            <ApasLogo size={24} />
            <span className="text-sm sm:text-lg font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">APAS</span>
          </div>
          {/* Nav items - icons only on mobile, with labels on desktop */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Auth buttons */}
            {!user && !isGuest && (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
                  title="Log In"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline font-medium">Log In</span>
                </button>
                <button
                  onClick={() => navigate('/?mode=signup')}
                  className="group text-xs font-medium text-white bg-primary hover:bg-primary/90 p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1 nav-btn-animate shadow-sm"
                  title="Sign Up"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline font-medium">Sign Up</span>
                </button>
              </>
            )}
            {(user || isGuest) && (
              <>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
                    title="Admin Panel"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline font-medium">Admin</span>
                  </button>
                )}
                <DevPrivilegesButton lang={lang} />
                {user && (
                  <button
                    onClick={async () => { await signOut(); navigate('/'); }}
                    className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-destructive p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-destructive/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline font-medium">{profile?.display_name || 'Sign Out'}</span>
                  </button>
                )}
                {isGuest && (
                  <div className="flex items-center gap-0.5 sm:gap-1.5">
                    <button
                      onClick={() => { navigate('/?mode=signup'); }}
                      className="group text-xs font-medium text-primary hover:text-primary/80 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
                      title={lang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                    >
                      <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline font-medium">
                        {lang === 'ar' ? 'إنشاء حساب' : lang === 'fr' ? 'S\'inscrire' : 'Sign Up'}
                      </span>
                    </button>
                    <button
                      onClick={() => { navigate('/'); }}
                      className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
                      title={lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
                    >
                      <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline font-medium">
                        {lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Login'}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
            {/* Download */}
            <a
              href="#download-section"
              onClick={(e) => { e.preventDefault(); playLandingNav(muted); document.getElementById('download-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate cursor-pointer"
              title={t.downloadNav}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline font-medium">{t.downloadNav}</span>
            </a>
            {/* About */}
            <button
              onClick={() => { playLandingNav(muted); setShowAbout(true); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1 nav-btn-animate"
              title={lang === 'ar' ? 'حول التطبيق' : 'About'}
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline font-medium">
                {lang === 'ar' ? 'حول' : lang === 'fr' ? 'À Propos' : 'About'}
              </span>
            </button>
            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 sm:px-2 sm:py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 nav-btn-animate"
              title={nightMode ? 'Light Mode' : 'Dark Mode'}
            >
              <span className={themeSwitching ? 'theme-switch-animate' : ''}>
                {nightMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </span>
            </button>
            {/* Mute toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 nav-btn-animate"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            {/* Language switcher - compact */}
            <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
              {(['ar', 'en', 'fr'] as Lang[]).map((l) => (
                <button key={l} onClick={() => handleLangSwitch(l)}
                  className={`px-1.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 nav-btn-animate ${lang === l ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground dark:text-foreground hover:text-foreground'}`}>
                  {l === 'ar' ? 'عر' : l === 'en' ? 'EN' : 'FR'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero logo styles (outside section to avoid nth-child offset) */}
      <style>{`
        .hero-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-logo-glow {
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
          animation: heroGlowBreath 6s ease-in-out infinite;
        }
        @keyframes heroGlowBreath {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .hero-logo-arc {
          animation: heroArcSpin 20s linear infinite;
        }
        @keyframes heroArcSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hero-logo-breathe {
          animation: heroLogoBreathe 5s ease-in-out infinite;
        }
        @keyframes heroLogoBreathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.03) translateY(-4px); }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center hero-stagger">
        <div className="flex justify-center mb-6">
          <div className="relative hero-logo-container">
            {/* Ambient glow */}
            <div className="absolute -inset-8 rounded-full hero-logo-glow" />
            {/* Gradient arc ring */}
            <svg className="absolute -inset-4 hero-logo-arc" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="56" stroke="url(#heroArcGrad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="20 15 8 15" />
              <defs>
                <linearGradient id="heroArcGrad" x1="0" y1="0" x2="120" y2="120">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="hsl(42 70% 54%)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
            {/* Logo with subtle breathe */}
            <div className="hero-logo-breathe relative z-10">
              <ApasLogo size={100} animated />
            </div>
          </div>
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent mb-3 animate-gradient-text">
          {t.heroTitle}
        </h1>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground/90 mb-4">{t.heroSubtitle}</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">{t.heroDesc}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => navigateWithSound('/simulator')}
            className="group px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 nav-btn-animate animate-cta-glow">
            <Zap className="w-5 h-5" />
            {t.enterSim}
            <ArrowRight className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
          </button>
          <button onClick={() => navigateWithSound('/classroom')}
            className="group px-6 py-3 bg-secondary/80 text-foreground rounded-xl font-medium text-base border border-border/50 hover:border-primary/30 hover:bg-primary/10 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 nav-btn-animate">
            <GraduationCap className="w-5 h-5" />
            {t.enterClassroom}
          </button>
          <button onClick={() => navigateWithSound('/apas-new')}
            className="group px-6 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 nav-btn-animate">
            <Video className="w-5 h-5" />
            {lang === 'ar' ? 'APAS NEW' : lang === 'fr' ? 'APAS NEW' : 'APAS NEW'}
          </button>
        </div>
        <ChevronDown className="w-6 h-6 text-muted-foreground mx-auto mt-12 animate-bounce" />
      </section>

      {/* Animated Stats Counter Section */}
      <section ref={statsRef} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${statsVisible ? 'stat-stagger' : ''}`}>
          {[
            { value: '99.7%', label: lang === 'ar' ? 'دقة التنبؤ' : lang === 'fr' ? 'Précision IA' : 'AI Accuracy', color: 'text-emerald-500' },
            { value: '3', label: lang === 'ar' ? 'طرق تكامل' : lang === 'fr' ? 'Méthodes' : 'Integration Methods', color: 'text-blue-500' },
            { value: '8+', label: lang === 'ar' ? 'بيئة كوكبية' : lang === 'fr' ? 'Environnements' : 'Environments', color: 'text-purple-500' },
            { value: '3', label: lang === 'ar' ? 'لغات مدعومة' : lang === 'fr' ? 'Langues' : 'Languages', color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-5 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className={`text-3xl sm:text-4xl font-bold ${stat.color} mb-1`}>
                {statsVisible ? stat.value : '—'}
              </div>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section ref={addRevealRef} className="reveal-on-scroll relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-mono tracking-[0.2em] uppercase text-primary/70 mb-3">
            [ {lang === 'ar' ? 'المميزات' : lang === 'fr' ? 'FONCTIONNALITÉS' : 'FEATURES'} ]
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{t.whyTitle}</h2>
          <p className="text-muted-foreground">{t.whySubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 feature-stagger">
          {t.features.map((f, i) => {
            const Icon = iconMap[f.icon] || Sparkles;
            return (
              <div key={i} className="group p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                {/* Shimmer overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <div ref={addRevealRef} className="reveal-on-scroll">
        <TestimonialsSection lang={lang} />
      </div>

      {/* Comparison Table */}
      <section ref={addRevealRef} className="reveal-on-scroll relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <span className="block text-center text-xs font-mono tracking-[0.2em] uppercase text-primary/70 mb-3">
          [ {lang === 'ar' ? 'المقارنة' : lang === 'fr' ? 'COMPARAISON' : 'COMPARISON'} ]
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8">{t.compTitle}</h2>
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {t.compHeaders.map((h, i) => (
                  <th key={i} className={`py-3 px-4 font-semibold text-foreground ${i === 0 ? (isRTL ? 'text-right' : 'text-left') : 'text-center'} ${i === 1 ? 'bg-primary/10' : i === 2 ? 'bg-primary/5' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.compRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`py-2.5 px-4 ${ci === 0 ? (isRTL ? 'text-right' : 'text-left') + ' text-xs font-medium text-foreground' : 'text-center'} ${ci === 1 ? 'bg-primary/5' : ci === 2 ? 'bg-primary/[0.02]' : ''}`}>
                      {typeof cell === 'boolean' ? (
                        cell ? <span className="text-green-500 font-bold">&#10003;</span> : <span className="text-muted-foreground/40">&#8212;</span>
                      ) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Classroom Highlight */}
      <section ref={addRevealRef} className="reveal-on-scroll relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-secondary/30 backdrop-blur-sm p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-start">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center gap-2 justify-center md:justify-start">
              <GraduationCap className="w-6 h-6 text-primary" />
              {t.classroomTitle}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t.classroomDesc}</p>
            <button onClick={() => navigateWithSound('/classroom')}
              className="px-6 py-2.5 bg-primary/10 text-primary rounded-lg font-medium text-sm border border-primary/20 hover:bg-primary/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 mx-auto md:mx-0 nav-btn-animate">
              <BookOpen className="w-4 h-4" />
              {t.classroomBtn}
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={addRevealRef} className="reveal-on-scroll relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{t.ctaTitle}</h2>
        <button onClick={() => navigateWithSound('/simulator')}
          className="group px-10 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 mx-auto nav-btn-animate animate-cta-glow">
          <Sparkles className="w-5 h-5" />
          {t.ctaBtn}
          <ArrowRight className={`w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
        </button>
      </section>

      {/* Download Desktop App Section */}
      <section id="download-section" className="relative z-10 w-full">
        <div className="bg-gradient-to-b from-[#0a1628] to-[#0d1f3c] py-20 sm:py-28">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            {/* Badge */}
            <span className="inline-block text-xs font-mono tracking-[0.3em] uppercase text-primary/80 mb-6">
              [ {lang === 'ar' ? '\u062a\u0637\u0628\u064a\u0642 \u0633\u0637\u062d \u0627\u0644\u0645\u0643\u062a\u0628' : lang === 'fr' ? 'APPLICATION DESKTOP' : 'DESKTOP APP'} ]
            </span>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {t.downloadTitle}
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              {t.downloadSubtitle}
            </p>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href="https://github.com/PicaBis/APAS/releases/tag/v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Monitor className="w-5 h-5" />
                {t.downloadBtn}
                <Download className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="https://github.com/PicaBis/APAS/releases/tag/v1.0.1"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#E95420] to-[#77216F] text-white rounded-xl font-semibold text-base shadow-lg shadow-[#E95420]/25 hover:shadow-xl hover:shadow-[#E95420]/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Monitor className="w-5 h-5" />
                {t.downloadBtnLinux}
                <Download className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="https://github.com/PicaBis/APAS/releases/tag/v1.0.3"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#3DDC84] to-[#00BFA5] text-white rounded-xl font-semibold text-base shadow-lg shadow-[#3DDC84]/25 hover:shadow-xl hover:shadow-[#3DDC84]/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Smartphone className="w-5 h-5" />
                {lang === 'ar' ? 'تطبيق Android (APK)' : lang === 'fr' ? 'App Android (APK)' : 'Android App (APK)'}
                <Download className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
            </div>

            {/* Note */}
            <p className="text-sm text-gray-500">
              {t.downloadNote}
            </p>
          </div>

          {/* Decorative bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </section>

      {/* Professional Footer */}
      <ProfessionalFooter lang={lang} />

      {/* About Modal */}
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} lang={lang} onOpenComprehensiveGuide={() => setShowComprehensiveGuide(true)} />

      {/* Comprehensive Guide Modal */}
      <Suspense fallback={null}>
        <ComprehensiveGuideModal open={showComprehensiveGuide} onClose={() => setShowComprehensiveGuide(false)} lang={lang} />
      </Suspense>

      {/* Bug Report Button */}
      <BugReportButton lang={lang} />

      {/* PWA Install Prompt Banner */}
      <PWAInstallPrompt lang={lang} />
    </div>
    </PageTransition>
  );
};

export default LandingPage;
