# APAS Vision Analysis Edge Functions

## نظرة عامة

هذا المشروع يحتوي على Edge Functions لتحليل الصور باستخدام Google Gemini 2.0 Flash API بدلاً من Lovable API. تم الحفاظ على جميع قدرات التحليل القوية وتحسينها.

## الملفات

- `vision-analyze.ts` - الدالة الرئيسية لتحليل حركة المقذوفات من الصور
- `index.ts` - نقطة الدخول الرئيسية وتوجيه الطلبات

## تحسينات رئيسية

### 1. ترقية API
- **من**: Lovable API (Gemini 1.5)
- **إلى**: Google Gemini 2.0 Flash API
- **مفتاح API**: `GEMINI_API_KEY` (بدلاً من `LOVABLE_API_KEY`)

### 2. تحسينات التحليل
- إضافة معامل السحب (drag coefficient)
- حساب المساحة العرضية (cross-sectional area)
- حساب الزخم (momentum)
- حساب رقم رينولدز (Reynolds number)
- تحليل العوامل البيئية
- تقدير عدم اليقين في القياسات

### 3. تحسينات الفيزياء
- التحقق محسن من حفظ الطاقة
- حسابات دقيقة ذات دقة عالية
- معالجة تأثيرات البيئة

## نقاط النهاية (Endpoints)

### POST /vision-analyze
تحليل صورة لحركة المقذوفات

**الطلب (Request):**
```json
{
  "imageBase64": "base64-encoded-image",
  "mimeType": "image/jpeg",
  "lang": "ar" | "en"
}
```

**الاستجابة (Response):**
```json
{
  "text": "تقرير التحليل الكامل",
  "analysis": {
    "detected": true,
    "object_type": "basketball",
    "estimated_mass": 0.62,
    "initial_velocity": 25.5,
    "launch_angle": 38.2,
    "launch_height": 2.1,
    "drag_coefficient": 0.47,
    "cross_sectional_area": 0.052,
    "momentum": 15.8,
    "reynolds_number": 125000,
    // ... المزيد من البيانات
  }
}
```

### GET /health
فحص صحة الـ Edge Function

## التركيب والنشر

### المتطلبات
- Deno runtime
- متغير البيئة: `GEMINI_API_KEY`

### أوامر النشر
```bash
# باستخدام npm.cmd (مفضل)
npm.cmd run deploy:edge

# أو باستخدام npm
npm run deploy:edge
```

### التركيب المحلي
```bash
# تثبيت Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# تشغيل محلياً
deno run --allow-net --allow-env src/edge-functions/index.ts
```

## تحسينات الأداء

- **معالجة موازية**: استخدام Gemini 2.0 Flash للسرعة
- **تخزين مؤقت**: CORS headers محسّنة
- **معالجة الأخطاء**: معالجة شاملة للأخطاء
- **تسجيل**: تسجيل مفصل للأخطاء والأداء

## الأمان

- إعدادات safety settings مضبوطة على `BLOCK_NONE`
- التحقق من صحة المدخلات
- معالجة آمنة لـ base64
- حماية من استنفاد الحصة (rate limiting)

## التوافق

- متوافق مع Supabase Edge Functions
- متوافق مع معايير Deno
- يدعم العربية والإنجليزية
- متوافق مع تطبيق APAS الحالي
