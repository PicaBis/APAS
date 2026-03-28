import React, { useState } from 'react';
import { X, Shield, Lock, Trash2, CheckCircle, Eye, Database, Key, Loader2 } from 'lucide-react';

interface SecurityPrivacyProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  autoDeleteEnabled: boolean;
  onToggleAutoDelete: (enabled: boolean) => void;
}

const SecurityPrivacy: React.FC<SecurityPrivacyProps> = ({ open, onClose, lang, autoDeleteEnabled, onToggleAutoDelete }) => {

  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const clearAllData = () => {
    if (confirm(t('هل أنت متأكد من حذف جميع البيانات؟ سيتم مسح الإعدادات والتاريخ والجلسات.', 'Are you sure you want to delete all data? Settings, history, and sessions will be cleared.', 'Êtes-vous sûr de vouloir supprimer toutes les données ? Les paramètres, l\'historique et les sessions seront effacés.'))) {
      setIsClearing(true);
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  if (!open) return null;

  const securityFeatures = [
    {
      id: 'encryption',
      icon: <Lock className="w-4 h-4" />,
      title: t('تشفير البيانات', 'Data Encryption', 'Chiffrement des Données'),
      description: t(
        'جميع البيانات المخزنة في Supabase مشفرة باستخدام AES-256. الاتصالات محمية بـ TLS 1.2+',
        'All data stored in Supabase is encrypted using AES-256. Connections are secured with TLS 1.2+',
        'Toutes les données stockées dans Supabase sont chiffrées en AES-256. Les connexions sont sécurisées par TLS 1.2+'
      ),
      status: 'active',
      details: t(
        'تشفير البيانات أثناء الراحة (At Rest): يستخدم Supabase تشفير AES-256 لجميع البيانات المخزنة في قواعد البيانات والملفات.\n\nتشفير البيانات أثناء النقل (In Transit): جميع الاتصالات بين التطبيق وخوادم Supabase مشفرة باستخدام بروتوكول TLS 1.2 أو أعلى.\n\nإدارة المفاتيح: يتم إدارة مفاتيح التشفير تلقائياً بواسطة Supabase مع دوران منتظم للمفاتيح.',
        'Encryption at Rest: Supabase uses AES-256 encryption for all data stored in databases and file storage.\n\nEncryption in Transit: All connections between the app and Supabase servers are encrypted using TLS 1.2 or higher protocol.\n\nKey Management: Encryption keys are automatically managed by Supabase with regular key rotation.',
        'Chiffrement au repos: Supabase utilise le chiffrement AES-256 pour toutes les données stockées dans les bases de données et le stockage de fichiers.\n\nChiffrement en transit: Toutes les connexions entre l\'application et les serveurs Supabase sont chiffrées en utilisant le protocole TLS 1.2 ou supérieur.\n\nGestion des clés: Les clés de chiffrement sont gérées automatiquement par Supabase avec une rotation régulière des clés.'
      ),
    },
    {
      id: 'rls',
      icon: <Database className="w-4 h-4" />,
      title: t('أمان قاعدة البيانات', 'Database Security', 'Sécurité de la Base de Données'),
      description: t(
        'Row Level Security (RLS) مفعّل لحماية بيانات كل مستخدم بشكل منفصل',
        'Row Level Security (RLS) enabled to protect each user\'s data separately',
        'Sécurité au niveau des lignes (RLS) activée pour protéger les données de chaque utilisateur séparément'
      ),
      status: 'active',
      details: t(
        'أمان مستوى الصف (RLS): كل مستخدم يمكنه فقط الوصول إلى بياناته الخاصة. السياسات الأمنية تُطبّق على مستوى قاعدة البيانات.\n\nالمصادقة: يتم التحقق من هوية المستخدمين عبر Supabase Auth مع دعم المصادقة المتعددة العوامل.\n\nالتدقيق: جميع عمليات الوصول إلى البيانات مسجلة للمراجعة الأمنية.',
        'Row Level Security (RLS): Each user can only access their own data. Security policies are enforced at the database level.\n\nAuthentication: User identity is verified through Supabase Auth with support for multi-factor authentication.\n\nAuditing: All data access operations are logged for security review.',
        'Sécurité au niveau des lignes (RLS): Chaque utilisateur ne peut accéder qu\'à ses propres données. Les politiques de sécurité sont appliquées au niveau de la base de données.\n\nAuthentification: L\'identité des utilisateurs est vérifiée via Supabase Auth avec prise en charge de l\'authentification multi-facteurs.\n\nAudit: Toutes les opérations d\'accès aux données sont enregistrées pour examen de sécurité.'
      ),
    },
    {
      id: 'api',
      icon: <Key className="w-4 h-4" />,
      title: t('أمان API', 'API Security', 'Sécurité API'),
      description: t(
        'مفاتيح API محمية ومحدودة الصلاحيات مع حماية من هجمات CSRF وXSS',
        'API keys are protected with limited permissions and CSRF/XSS protection',
        'Les clés API sont protégées avec des permissions limitées et une protection CSRF/XSS'
      ),
      status: 'active',
      details: t(
        'حماية API: مفتاح Supabase المجهول (anon key) مضمّن في كود العميل حسب التصميم — صلاحياته محدودة بسياسات أمان الصف (RLS). المفاتيح الحساسة تُخزن على الخادم فقط.\n\nCORS: سياسات مشاركة الموارد عبر المصادر محددة بدقة.\n\nRate Limiting: حدود على عدد الطلبات لمنع الإساءة.',
        'API Protection: The Supabase anon key is included in client code by design — its permissions are restricted by Row Level Security (RLS) policies. Sensitive API keys are stored server-side only.\n\nCORS: Cross-Origin Resource Sharing policies are strictly configured.\n\nRate Limiting: Request limits are in place to prevent abuse.',
        'Protection API: La clé anonyme Supabase est incluse dans le code client par conception — ses permissions sont restreintes par les politiques de sécurité au niveau des lignes (RLS). Les clés API sensibles sont stockées côté serveur uniquement.\n\nCORS: Les politiques de partage de ressources cross-origin sont strictement configurées.\n\nLimitation de débit: Des limites de requêtes sont en place pour prévenir les abus.'
      ),
    },
    {
      id: 'privacy',
      icon: <Eye className="w-4 h-4" />,
      title: t('الخصوصية', 'Privacy', 'Confidentialité'),
      description: t(
        'لا يتم مشاركة بيانات المستخدمين مع أطراف ثالثة. البيانات تبقى في حساب المستخدم فقط',
        'User data is never shared with third parties. Data stays in user\'s account only',
        'Les données utilisateur ne sont jamais partagées avec des tiers. Les données restent uniquement dans le compte de l\'utilisateur'
      ),
      status: 'active',
      details: t(
        'سياسة الخصوصية:\n\n• لا يتم بيع أو مشاركة البيانات الشخصية\n• يمكن للمستخدم حذف حسابه وجميع بياناته في أي وقت\n• لا يتم تتبع المستخدمين بأدوات تتبع خارجية\n• البيانات التجريبية ملك المستخدم بالكامل',
        'Privacy Policy:\n\n• Personal data is never sold or shared\n• Users can delete their account and all data at any time\n• Users are not tracked with external tracking tools\n• Experimental data fully belongs to the user',
        'Politique de confidentialité:\n\n• Les données personnelles ne sont jamais vendues ou partagées\n• Les utilisateurs peuvent supprimer leur compte et toutes leurs données à tout moment\n• Les utilisateurs ne sont pas suivis par des outils de suivi externes\n• Les données expérimentales appartiennent entièrement à l\'utilisateur'
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-slideDown"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {t('الأمان والخصوصية', 'Security & Privacy', 'Sécurité et Confidentialité')}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Auto-delete toggle */}
          <div className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">
                    {t('حذف الفيديو تلقائياً', 'Auto-Delete Videos', 'Suppression Automatique des Vidéos')}
                  </span>
                  <button
                    onClick={() => onToggleAutoDelete(!autoDeleteEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                      autoDeleteEnabled ? 'bg-green-500' : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                        autoDeleteEnabled ? 'left-5.5 ltr:left-[22px] rtl:right-[22px]' : 'left-0.5 ltr:left-[2px] rtl:right-[2px]'
                      }`}
                      style={{ [lang === 'ar' ? 'right' : 'left']: autoDeleteEnabled ? '22px' : '2px' }}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {t(
                    'عند التفعيل، يتم حذف الفيديوهات المرفوعة تلقائياً من الخادم بعد معالجتها واستخراج البيانات. هذا يحافظ على خصوصيتك ويوفر مساحة التخزين.',
                    'When enabled, uploaded videos are automatically deleted from the server after processing and data extraction. This preserves your privacy and saves storage space.',
                    'Lorsqu\'activé, les vidéos téléchargées sont automatiquement supprimées du serveur après traitement et extraction des données. Cela préserve votre vie privée et économise l\'espace de stockage.'
                  )}
                </p>
                {autoDeleteEnabled && (
                  <div className="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-[10px] font-medium">
                      {t('الحذف التلقائي مُفعّل', 'Auto-delete enabled', 'Suppression auto activée')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security features */}
          {securityFeatures.map(feature => (
            <button
              key={feature.id}
              onClick={() => setShowDetails(showDetails === feature.id ? null : feature.id)}
              className="w-full text-left rtl:text-right bg-secondary/10 hover:bg-secondary/20 border border-border/30 rounded-xl p-3.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground">{feature.title}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                      {t('مُفعّل', 'Active', 'Actif')}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  {showDetails === feature.id && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                        {feature.details}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Wipe All Data Button */}
          <button
            onClick={clearAllData}
            disabled={isClearing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-all duration-300 font-bold text-xs"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('جاري الحذف...', 'Clearing...', 'Suppression...')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {t('مسح جميع البيانات المحلية', 'Clear All Local Data', 'Effacer toutes les données locales')}
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-border bg-secondary/10">
          <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>
              {t(
                'APAS يلتزم بأعلى معايير الأمان والخصوصية',
                'APAS adheres to the highest security and privacy standards',
                'APAS adhère aux normes les plus élevées de sécurité et de confidentialité'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPrivacy;
