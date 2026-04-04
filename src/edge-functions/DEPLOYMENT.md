# نشر Edge Functions إلى Supabase

## المتطلبات الأساسية

1. **تثبيت Deno**:
```bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```

2. **إعداد متغير البيئة**:
```bash
# في Windows
set GEMINI_API_KEY=your_api_key_here

# في Linux/Mac
export GEMINI_API_KEY=your_api_key_here
```

## طريقة النشر

### الطريقة 1: استخدام npm.cmd (موصى به)
```bash
npm.cmd run deploy:edge
```

### الطريقة 2: استخدام npm عادي
```bash
npm run deploy:edge
```

### الطريقة 3: نشر مباشر باستخدام Deno
```bash
deno deploy --project=your-supabase-project src/edge-functions/index.ts
```

## الاختبار المحلي

### تشغيل الخادم المحلي
```bash
deno run --allow-net --allow-env src/edge-functions/index.ts
```

### اختبار الـ Edge Function
```bash
# في نافذة جديدة
deno run --allow-net --allow-env src/edge-functions/test-local.ts

# أو استخدام curl لل اختبار
curl -X POST http://localhost:8000/vision-analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"base64_data","mimeType":"image/jpeg","lang":"en"}'
```

## التحقق من الصحة

```bash
curl http://localhost:8000/health
```

## ملاحظات هامة

1. **مفتاح API**: تأكد من وضع `GEMINI_API_KEY` في متغيرات البيئة
2. **الشبكة**: يتطلب اتصال بالإنترنت لـ Gemini API
3. **الـ Logs**: تحقق من الـ console logs للتشخيص
4. **CORS**: تم إعداده للعمل مع تطبيق APAS
5. **الأمان**: جميع الطلبات يتم التحقق منها صحتها

## استكشاف الأخطاء

### خطأ شائع: "GEMINI_API_KEY is not configured"
**الحل**: تأكد من إعداد متغير البيئة بشكل صحيح

### خطأ شائع: Rate limited
**الحل**: انتظر بعض الوقت ثم حاول مرة أخرى

### خطأ شائع: API quota exceeded  
**الحل**: تحقق من حصة API في Google Cloud Console

## التوافق مع التطبيق

الـ Edge Functions متوافقة تماماً مع تطبيق APAS الحالي:

- ✅ نفس بنية JSON
- ✅ نفس حقول CORS  
- ✅ دعم العربية والإنجليزية
- ✅ تحليل فيزيائي متقدم
- ✅ معاملات إضافية (drag, Reynolds, etc.)

## التحديثات المستقبلية

لتحديث الـ Edge Functions:

1. عدّل الملفات في `src/edge-functions/`
2. اختبر محلياً باستخدام `deno run`
3. انشر مرة أخرى باستخدام `npm run deploy:edge`
