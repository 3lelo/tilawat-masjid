# قاعدة بيانات مشروع تلاوات المسجد الكبير (Supabase Database)

تحتوي هذه الحزمة على هيكل قاعدة البيانات الكاملة (PostgreSQL) الخاصة بتطبيق تلاوات المسجد الكبير ولوحة التحكم.

## المكونات الرئيسية

1. **الامتدادات (Extensions):**
   - `ltree`: لإدارة شجرة المجلدات المتداخلة بأي عمق والبحث السريع داخل المجلدات المتفرعة.
   - `pg_trgm`: للبحث الفوري السريع وعالي الدقة بواسطة Trigrams.

2. **الجداول (Tables):**
   - `profiles`: ملفات المستخدمين والأدوار (`user` / `admin`).
   - `folders`: المجلدات المتداخلة مع دعم نوع `year_month` للترتيب التلقائي حسب الأشهر.
   - `audio_files`: التسجيلات الصوتية المعالجة ومسارها في Cloudflare R2 وحالتها (`processing` / `ready` / `failed`).
   - `reels`: المقاطع المرئية القصيرة (YouTube Shorts, Instagram, TikTok, Facebook).
   - `favourites`: المفضلة للمستخدمين المسجلين.
   - `playback_progress`: حفظ موضع الاستماع للمزامنة بين الأجهزة.

3. **أمان البيانات (Row Level Security - RLS):**
   - القراءة متاحة للجميع بدون تسجيل حساب للمحتوى الجاهز.
   - التعديل والإضافة والحذف محصور فقط للمدراء (`is_admin()`).
   - المفضلة وموضع الاستماع خاص بكل مستخدم مسجل.

4. **دالة البحث (Search RPC):**
   - `search_content(query, scope_path, limit, offset)`: تبحث في العناوين والشيوخ وأسماء المجلدات مع تطبيع كامل للغة العربية ومطابقة تشابه Trigrams.

## تطبيق المخطط (Schema Migration)

يمكن تطبيق ملف التهيئة مباشرة من لوحة تحكم Supabase في تبويب **SQL Editor** بنسخ ولصق محتوى:
- `migrations/20240101000000_initial_schema.sql`
- ثم تشغيل `seed.sql` لإضافة مجلدات وتسجيلات تجريبية.

## ترقية مستخدم إلى مدير (Admin Role)

لتحديد مستخدم كمسؤول في لوحة التحكم بعد تسجيل دخوله بحساب Google:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL@gmail.com');
```
