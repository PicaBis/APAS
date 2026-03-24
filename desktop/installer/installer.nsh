; ============================================================
; APAS Professional Custom NSIS Installer
; Professional UI with custom welcome/finish pages
; ============================================================

!macro customHeader
  ; Finish page configuration - only define what's not already set
  !ifndef MUI_FINISHPAGE_NOAUTOCLOSE
    !define MUI_FINISHPAGE_NOAUTOCLOSE
  !endif
  !ifndef MUI_FINISHPAGE_RUN_TEXT
    !define MUI_FINISHPAGE_RUN_TEXT "تشغيل APAS الآن"
  !endif
  !ifndef MUI_FINISHPAGE_LINK
    !define MUI_FINISHPAGE_LINK "زيارة الموقع الرسمي"
  !endif
  !ifndef MUI_FINISHPAGE_LINK_LOCATION
    !define MUI_FINISHPAGE_LINK_LOCATION "https://a-p-a-s.vercel.app"
  !endif
!macroend

!macro customInit
  ; Nothing extra needed
!macroend

!macro customInstallMode
  !define INSTALL_MODE_PER_ALL_USERS
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "مرحباً بك في APAS"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "AI Projectile Analysis System$\r$\n$\r$\nنظام تحليل المقذوفات بالذكاء الاصطناعي$\r$\n$\r$\nسيقوم المعالج بتثبيت APAS v1.0.0 على جهازك.$\r$\nيُوصى بإغلاق جميع التطبيقات الأخرى قبل المتابعة.$\r$\n$\r$\nانقر على التالي للمتابعة."
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "تم التثبيت بنجاح!"
  !define MUI_FINISHPAGE_TITLE_3LINES
  !define MUI_FINISHPAGE_TEXT "تم تثبيت APAS بنجاح على جهازك.$\r$\n$\r$\nيمكنك الآن تشغيل التطبيق من سطح المكتب أو قائمة البداية.$\r$\n$\r$\nشكراً لاختيارك APAS!"
!macroend

!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TITLE "إزالة تثبيت APAS"
  !define MUI_UNWELCOMEPAGE_TITLE_3LINES
  !define MUI_UNWELCOMEPAGE_TEXT "سيتم إزالة APAS من جهازك.$\r$\nتأكد من إغلاق التطبيق قبل المتابعة."
!macroend
