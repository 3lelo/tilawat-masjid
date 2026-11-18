# دليل الإعداد الشامل خطوة بخطوة - تلاوات المسجد الكبير
# Complete Setup Guide: Tilawat Almasjid Alkabeer

جميع الخدمات المستخدمة في هذا النظام **مجانية 100% مدى الحياة** دون الحاجة إلى بطاقة بنكية مدفوعة:
1. **Supabase** (قاعدة البيانات + المصادقة + تخزين البيانات)
2. **Cloudflare R2** (تخزين الملفات الصوتية دون أي رسوم نقل بيانات Egress)
3. **Cloudflare Workers** (منبه تلقائي لتنشيط Supabase المجاني)
4. **Google Cloud Console** (تسجيل الدخول بحساب Google للتطبيق والموقع)
5. **Vercel** (استضافة لوحة التحكم الإدارية مجاناً على نطاق `*.vercel.app`)
6. **GitHub Actions** (معالجة وتحويل الصوتيات عبر FFmpeg مجاناً على المستودع العام)
7. **Expo EAS** (بناء تطبيق الأندرويد بصيغة APK)

---

## الفهرس
1. [إعداد مشروع Supabase وتطبيق المخطط](#1-إعداد-مشروع-supabase)
2. [إعداد Google Cloud Console للمصادقة](#2-إعداد-google-cloud-console)
3. [إعداد Cloudflare R2 لتخزين الصوتيات وضبط CORS](#3-إعداد-cloudflare-r2)
4. [إعداد Cloudflare Worker لمنع توقف Supabase](#4-إعداد-cloudflare-worker)
5. [إعداد مستودع GitHub وأسرار Actions](#5-إعداد-مستودع-github-والأسرار)
6. [نشر لوحة التحكم على Vercel](#6-نشر-لوحة-التحكم-على-vercel)
7. [بناء تطبيق أندرويد (APK) باستخدام Expo EAS](#7-بناء-تطبيق-أندرويد)
8. [ترقية حساب المدير (Admin Role)](#8-ترقية-حساب-المدير)

---

## 1. إعداد مشروع Supabase

1. توجه إلى [supabase.com](https://supabase.com) وسجل الدخول مجاناً بحساب GitHub أو بريدك.
2. اضغط على **New Project**:
   - الاسم: `tilawat-masjid`
   - كلمة مرور قاعدة البيانات (Database Password): اختر كلمة مرور قوية واحفظها.
   - المنطقة (Region): اختر أقرب منطقة للمسجد (مثلاً: Frankfurt أو London أو Bahrain إن توفرت).
   - خطة التسعير: **Free Plan ($0/month)**.
3. انتظر دقيقتين حتى تكتمل تهيئة المشروع.
4. اذهب إلى **Project Settings** > **API**:
   - انسخ **Project URL** (مثل: `https://abcdefgh.supabase.co`).
   - انسخ **anon public key**.
   - انسخ **service_role secret key** (هذا المفتاح سري جداً ويوضع فقط في خوادم Vercel و GitHub Secrets، ولا يوضع في التطبيق أبداً).
5. اذهب إلى القائمة الجانبية واختر **SQL Editor** > **New Query**:
   - انسخ محتوى الملف `supabase/migrations/20240101000000_initial_schema.sql` والصقه في المحرر.
   - اضغط **Run** لإنشاء الجداول والدوال والفهارس وقواعد الأمان.
   - كرر الأمر مع ملف `supabase/seed.sql` لإدراج المجلدات والتسجيلات التجريبية.

---

## 2. إعداد Google Cloud Console

لتفعيل تسجيل الدخول بحساب Google في كل من التطبيق ولوحة الإدارة:

1. ادخل إلى [Google Cloud Console](https://console.cloud.google.com).
2. أنشئ مشروعاً جديداً باسم `Tilawat Masjid`.
3. من القائمة الجانبية، اذهب إلى **APIs & Services** > **OAuth consent screen**:
   - اختر **External** ثم **Create**.
   - أدخل اسم التطبيق: `تلاوات المسجد الكبير`.
   - أدخل بريدك الإلكتروني للدعم.
   - في خطوة النطاقات (Scopes)، اترك الافتراضي (`email`, `profile`, `openid`).
   - احفظ الإعدادات وانشر شاشة الموافقة (**Publish App** إلى وضع الإنتاج حتى لا تنتهي الجلسات).
4. اذهب إلى **Credentials** > **Create Credentials** > **OAuth client ID**:
   - **العميل الأول (لوحة الويب Web Client ID):**
     - Application type: **Web application**.
     - Name: `Tilawat Web Admin & Auth`.
     - في قسم **Authorized redirect URIs** أضف الرابط التالي من مشروعك في Supabase:
       `https://<YOUR-PROJECT-ID>.supabase.co/auth/v1/callback`
     - اضغط **Create**. انسخ الـ **Client ID** والـ **Client Secret**.
     - ارجع إلى لوحة **Supabase** > **Authentication** > **Providers** > **Google**:
       - فعّل Google.
       - الصق الـ Client ID و Client Secret واحفظ التغييرات.
   - **العميل الثاني (تطبيق أندرويد Android Client ID):**
     - Application type: **Android**.
     - Name: `Tilawat Android App`.
     - Package name: `com.tilawat.masjid`
     - SHA-1 certificate fingerprint:
       - إذا كنت تبني عبر EAS: نفذ `npx eas-cli credentials` في مجلد التطبيق أو أنشئ مفتاحك واحصل على بصمة SHA-1.
       - للتجربة المحلية أو التطوير السريع، استخرج بصمة SHA-1 لـ keystore الافتراضي:
         ```bash
         keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
         ```
       - الصق بصمة SHA-1 واضغط **Create**.

---

## 3. إعداد Cloudflare R2

تخزين Cloudflare R2 متوافق مع بروتوكول S3 ومجاني لـ 10 غيغابايت ولا يفرض أي رسوم على تحميل وتنزيل الصوتيات (Zero Egress Fees):

1. سجل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com).
2. من القائمة الجانبية اختر **R2 Object Storage**.
3. اضغط **Create bucket**:
   - اسم السلة (Bucket name): `tilawat-audio`
   - الموقع: تلقائي (Automatic).
   - اضغط **Create Bucket**.
4. اضغط على السلة `tilawat-audio` ثم توجه إلى تبويب **Settings**:
   - **CORS Policy (مهم جداً لتشغيل الصوت ورفع الملفات من المتصفح):** اضغط **Add CORS policy** وأدخل التالي:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   - **Public Access (الرابط العام للقراءة):**
     - في قسم **Public Access** اضغط **Allow Access** ثم فعّل النطاق المجاني `r2.dev` (أو اربط نطاقك المخصص إن وجد).
     - انسخ الرابط العام (مثال: `https://pub-xxxxxx.r2.dev`).
   - **Lifecycle Rule (حذف الملفات المؤقتة تلقائياً):**
     - اضغط **Add lifecycle rule**.
     - اسم القاعدة: `Delete incoming temp files`.
     - البادئة (Prefix): `incoming/`.
     - اختر حذف الكائنات بعد: **1 day** (يوم واحد).
5. إنشاء مفاتيح الوصول (API Tokens):
   - ارجع إلى صفحة R2 الرئيسية واضغط **Manage R2 API Tokens** في اليمين.
   - اضغط **Create API token**:
     - الصلاحيات: **Object Read & Write**.
     - السلة: حدد `tilawat-audio`.
   - اضغط **Create API Token**.
   - احفظ القيم الثلاث في مكان آمن فوراً (لن تظهر مجدداً):
     - **Access Key ID**
     - **Secret Access Key**
     - **Account ID** (أو Endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

---

## 4. إعداد Cloudflare Worker لمنع توقف Supabase

مشاريع Supabase المجانية تتوقف إذا لم يصلها أي طلب لمدة 7 أيام. يقوم هذا العامل بإرسال طلب فحص كل 6 ساعات:

1. من لوحة Cloudflare، اذهب إلى **Workers & Pages** > **Create application** > **Create Worker**.
2. سمّ العامل: `tilawat-keep-alive` واضغط **Deploy**.
3. اضغط **Edit code**، والصق كود ملف `workers/keep-alive/src/index.ts` ثم اضغط **Save and Deploy**.
4. اذهب إلى **Settings** > **Variables and Secrets**:
   - أضف متغير: `SUPABASE_URL` = `https://<YOUR-PROJECT-ID>.supabase.co`.
   - أضف سراً (Secret): `SUPABASE_ANON_KEY` = `<المفتاح العام Anon Key>`.
5. اذهب إلى **Triggers** > **Cron Triggers** > **Add Cron Trigger**:
   - أضف الجدول الزمني: `0 */6 * * *` (كل 6 ساعات).

---

## 5. إعداد مستودع GitHub والأسرار

لضمان عمل سير عمل تحويل الصوت التلقائي عبر FFmpeg في GitHub Actions مجاناً وبلا حدود للدقائق، يجب أن يكون المستودع **عاماً (Public)**. جميع المفاتيح الحساسة تُحفظ في **GitHub Secrets** ولا تظهر أبداً في الكود البرمجي:

1. أنشئ مستودعاً عاماً على حسابك في GitHub (مثلاً: `tilawat-masjid`).
2. ارفع الكود إلى المستودع:
   ```bash
   git add .
   git commit -m "feat: initial commit for Tilawat Almasjid Alkabeer"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/tilawat-masjid.git
   git push -u origin main
   ```
3. في صفحة المستودع على GitHub، اذهب إلى **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:
   - `SUPABASE_URL`: رابط مشروع Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: مفتاح service_role من Supabase.
   - `R2_ACCOUNT_ID`: معرف حساب Cloudflare.
   - `R2_ACCESS_KEY_ID`: مفتاح وصول R2.
   - `R2_SECRET_ACCESS_KEY`: المفتاح السري لـ R2.
   - `R2_BUCKET_NAME`: اسم السلة (`tilawat-audio`).
   - `R2_PUBLIC_URL`: رابط الوصول العام للسلة (مثال: `https://pub-xxxxxx.r2.dev`).
4. أنشئ مفتاح صلاحيات GitHub لتشغيل سير العمل من لوحة Vercel:
   - اذهب إلى إعدادات حسابك في GitHub: [Personal Access Tokens (Fine-grained)](https://github.com/settings/tokens?type=beta).
   - اضغط **Generate new token**.
   - اختر المستودع `tilawat-masjid`.
   - الصلاحيات: **Actions** -> **Read and Write**.
   - انسخ الرمز (ستحتاجه في لوحة Vercel كـ `GITHUB_DISPATCH_TOKEN`).

---

## 6. نشر لوحة التحكم على Vercel

لوحة التحكم مبنية بواسطة React / Next.js وتدعم الأجهزة المحمولة والحواسيب:

1. سجل الدخول إلى [Vercel](https://vercel.com) بحساب GitHub الخاص بك.
2. اضغط **Add New** > **Project**، واختر مستودع `tilawat-masjid`.
3. في إعدادات المشروع (Project Settings):
   - **Root Directory**: اضغط Edit واختر مجلد `admin-web`.
   - **Framework Preset**: يكتشف تلقائياً (Next.js أو Vite).
4. في قسم **Environment Variables**، أضف المتغيرات التالية:
   - `NEXT_PUBLIC_SUPABASE_URL`: رابط Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: المفتاح العام Anon لـ Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: المفتاح السري service_role لـ Supabase.
   - `R2_ACCOUNT_ID`: معرف حساب Cloudflare.
   - `R2_ACCESS_KEY_ID`: مفتاح وصول R2.
   - `R2_SECRET_ACCESS_KEY`: المفتاح السري لـ R2.
   - `R2_BUCKET_NAME`: `tilawat-audio`
   - `NEXT_PUBLIC_R2_PUBLIC_URL`: رابط القراءة العام لـ R2.
   - `GITHUB_REPO_OWNER`: اسم المستخدم على GitHub.
   - `GITHUB_REPO_NAME`: اسم المستودع (مثال: `tilawat-masjid`).
   - `GITHUB_DISPATCH_TOKEN`: الرمز الشخصي لتشغيل سير العمل.
5. اضغط **Deploy**. سيتم نشر الموقع مجاناً برابط مثل `https://tilawat-admin.vercel.app`.

---

## 7. بناء تطبيق أندرويد (APK)

تطبيق الجوال مبني باستخدام React Native و Expo، ويدعم العمل في الخلفية وتشغيل الصوت بدون إنترنت:

### الطريقة الأولى: عبر السحابة مجاناً (Expo EAS Build)
1. سجل حساباً مجانياً على [expo.dev](https://expo.dev).
2. في الطرفية داخل مجلد `app`:
   ```bash
   cd app
   npm install -g eas-cli
   npx eas login
   npx eas build:configure
   ```
3. لبناء ملف APK مباشر جاهز للتثبيت على هواتف الأندرويد:
   ```bash
   npx eas build -p android --profile preview
   ```
4. ستقوم سحابة Expo ببناء التطبيق وإعطائك رابطاً مباشراً ورمز QR لتحميل ملف `tilawat.apk`.

### الطريقة الثانية: البناء محلياً على جهازك
```bash
cd app
npm install
npx expo prebuild -p android
cd android
./gradlew assembleRelease
```
ستجد ملف الـ APK النهائي في:
`app/android/app/build/outputs/apk/release/app-release.apk`

---

## 8. ترقية حساب المدير (Admin Role)

بعد نشر لوحة الإدارة وتسجيل دخول المسؤول للمرة الأولى بحساب Google:
1. افتح صفحة **SQL Editor** في Supabase.
2. نفذ الأمر التالي مع استبدال البريد ببريد المدير:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```
3. الآن، عندما يسجل هذا الحساب دخوله إلى رابط لوحة تحكم Vercel، ستفتح له لوحة الإدارة بصلاحيات الرفع والتعديل الكاملة!
