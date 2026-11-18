# Cloudflare Worker: Keep-Alive لـ Supabase

تتوقف مشاريع Supabase المجانية تلقائياً عن العمل بعد 7 أيام من عدم وجود طلبات. هذه الخدمة البسيطة (Cloudflare Worker) تعمل مجاناً 100% وتقوم بإرسال طلب خفيف (Cron Trigger) كل 6 ساعات إلى Supabase لضمان بقاء قاعدة البيانات نشطة دائماً دون توقف.

## طريقة التفعيل (طريقتان سهلتان)

### الطريقة الأولى: من لوحة تحكم Cloudflare بدون برامج (الأسهل للمبتدئ)
1. سجل دخولك إلى [Cloudflare Dashboard](https://dash.cloudflare.com).
2. من القائمة الجانبية، اختر **Workers & Pages** ثم اضغط **Create application** > **Create Worker**.
3. قم بتسمية العامل مثلاً `tilawat-keep-alive` واضغط **Deploy**.
4. اضغط على **Edit code** واستبدل الكود الموجود بمحتوى ملف `src/index.ts` (أو محتوى JavaScript المترجم) واضغط **Save and Deploy**.
5. اذهب إلى **Settings** > **Variables and Secrets**:
   - أضف متغير `SUPABASE_URL` بقيمة رابط مشروعك (مثال: `https://xyz.supabase.co`).
   - أضف سراً (Secret) باسم `SUPABASE_ANON_KEY` بقيمة المفتاح العام لمشروعك (anon public key).
6. اذهب إلى **Triggers** > **Cron Triggers** > **Add Cron Trigger**:
   - حدد التكرار: `0 */6 * * *` (كل 6 ساعات) ثم اضغط حفظ.

### الطريقة الثانية: عبر سطر الأوامر (CLI)
```bash
cd workers/keep-alive
npx wrangler login
npx wrangler secret put SUPABASE_ANON_KEY # الصق المفتاح عند طلبه
npx wrangler deploy
```

يمكنك اختبار العامل بزيارة الرابط الخاص به في المتصفح: `https://tilawat-keep-alive.<your-subdomain>.workers.dev/health` وسيعيد حالة الاتصال مع Supabase بالمللي ثانية.
