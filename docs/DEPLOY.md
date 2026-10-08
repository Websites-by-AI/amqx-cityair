# راهنمای راه‌اندازی CityAir (گام‌به‌گام)

این سند دقیقاً همان کاری است که انجام شده و همان کاری که برای **دیپلوی واقعی** باقی مانده است.
همه‌چیز آماده و تست‌شده است؛ فقط توکن تازه‌ی Cloudflare لازم است.

---

## ۱) وضعیت فعلی (چه چیزی آماده است)

| بخش | وضعیت |
| --- | --- |
| کد سایت (React + TS + Tailwind) | ✅ ساخته شد، تایپ‌چک پاک، بیلد موفق |
| ۲۴ صفحه/روت (۱۲ صفحه + جزئیات شهر + داشبورد و …) | ✅ |
| موتور امتیازدهی + مدل اطمینان (Confidence) | ✅ |
| کتاب دانش (Knowledge Base) ۷۱ چانک | ✅ ساخته و روی Hugging Face آپلود شد |
| دیتاست Hugging Face | ✅ `sosa123454321/amqx-cityair-kb` |
| اسپیس استاتیک HF (آینه‌ی سایت) | ✅ `sosa123454321/amqx-cityair` |
| Worker کلودفلر (API + RAG + وبهوک تلگرام + سرو سایت) | ✅ کد آماده، بیلد dry-run موفق (۱۱۱KB) |
| ربات تلگرام جدید `@AQMX_cityair_tracker_bot` | ✅ توکن تست شد، فعال است |
| دیپلوی روی Cloudflare | ⛔ **متوقف** — توکن داده‌شده منقضی است |
| دامنه `aqmx.atikova.com` | ⛔ نیاز به توکن + بررسی اینکه زون در همین اکانت است |

**نکته‌ی مهم درباره‌ی توکن Cloudflare:**
توکن `cfat_SSjG…` که فرستادید یک توکن یک‌روزه بود و در `2026-10-07 23:59 UTC`
منقضی شده است. خروجی تست:

```json
{"result":{"status":"expired","expires_on":"2026-10-07T23:59:59Z"},
 "errors":[{"code":10003,"message":"This API Token was expired at 2026-10-07 23:59:59+00"}]}
```

و تست دوم روی یک اندپوینت واقعی: `{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}`

---

## ۲) توکن جدید Cloudflare را چطور بسازید

1. وارد داشبورد Cloudflare شوید → اکانت **morning-truth-6d9b**
   (Account ID: `88b6e2481cef2473409fdf549c56a54d`)
2. `My Profile` → `API Tokens` → **Create Token** → `Create Custom Token`
3. نام: `cityair-deploy`
4. **TTL**: حتماً یک تاریخ انقضا بگذارید (مثلاً ۳۰ روز) — نه ۱ روز!
5. دسترسی‌ها (Permissions) را دقیقاً این‌ها بگذارید:

| Type | Resource | Level |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Account | Workers KV Storage | Edit |
| Account | D1 | Edit |
| Account | Workers AI | Read |
| Account | Cloudflare Pages | Edit *(اگر Pages هم می‌خواهید)* |
| Zone | Workers Routes | Edit |
| Zone | Zone Settings | Read |
| Zone | DNS | Edit |

   - **Account Resources**: همان اکانت `morning-truth-6d9b`
   - **Zone Resources**: `atikova.com` (اگر زون در این اکانت است)

6. توکن ساخته‌شده (`cfat_...` یا توکن جدید ۴۰ کاراکتری) را کپی کنید و بفرستید.

> ⚠️ بررسی مهم: زون `atikova.com` روی نیم‌سرورهای Cloudflare است
> (`amalia.ns.cloudflare.com`, `neil.ns.cloudflare.com`) اما ممکن است در اکانت **قدیمی**
> (`elasa2next`) باشد. اگر در اکانت جدید نیست، دو راه دارید:
> **(الف)** از اکانت قدیمی هم یک توکن بدهید تا دامنه را همان‌جا وصل کنم، یا
> **(ب)** زون را به اکانت جدید منتقل کنیم (با تغییر نیم‌سرورها). تا آن زمان سایت روی
> `amqx-cityair.<subdomain>.workers.dev` کاملاً کار می‌کند.

### توکن Hugging Face (اختیاری، برای بخش «مدل»)

توکن‌های HF که دادید دسترسی `repo.write` دارند (آپلود ✅) اما **اجازه‌ی صدا زدن
Inference Providers را ندارند**:

```json
{"error":"This authentication method does not have sufficient permissions
 to call Inference Providers on behalf of user sosa123454321"}
```

برای فعال شدن مدل HF (در کنار Workers AI):

1. https://huggingface.co/settings/tokens → **Create new token** → `Fine-grained`
2. تیک بزنید: **Make calls to Inference Providers** + `Write` access to your repos
3. نام: `cityair-inference`
4. توکن را بفرستید تا به‌عنوان سکرت `HF_TOKEN` روی Worker ست شود.

اگر هم این را ندهید، همه‌چیز کار می‌کند: موتور پاسخ‌دهی روی **Cloudflare Workers AI**
اجرا می‌شود و اگر آن هم نبود، دستیار به حالت «بازیابی متن» (retrieval-only) برمی‌گردد و
هیچ‌وقت جواب جعلی نمی‌سازد.

---

## ۳) دستور دیپلوی (یک خط)

بعد از گرفتن توکن جدید، فقط این را اجرا می‌کنم (یا خودتان اجرا کنید):

```bash
CLOUDFLARE_API_TOKEN="<توکن جدید>" \
CF_ACCOUNT_ID="88b6e2481cef2473409fdf549c56a54d" \
TELEGRAM_BOT_TOKEN="8857578316:AAE4JbbSNg-K4tnJYZMUyUmac0nBkfr25r8" \
DOMAIN="aqmx.atikova.com" \
WITH_D1=1 WITH_KV=1 \
bash tools/deploy-cloudflare.sh
```

این اسکریپت به‌ترتیب انجام می‌دهد:

1. اعتبار توکن را چک می‌کند (اگر منقضی باشد همان‌جا خطا می‌دهد).
2. کتاب دانش را از داده‌ها بازتولید و سایت را بیلد می‌کند.
3. وابستگی‌های Worker را نصب می‌کند.
4. Bindingها را ست می‌کند: `AI` (Workers AI)، و در صورت درخواست `KV` و `D1`.
5. سکرت‌ها را آپلود می‌کند: `TELEGRAM_BOT_TOKEN`، `TELEGRAM_WEBHOOK_SECRET` (تصادفی)،
   `ADMIN_KEY` (تصادفی) و در صورت وجود `HF_TOKEN`.
6. **دیپلوی** می‌کند (سایت + API در یک Worker).
7. **وبهوک تلگرام** را روی `/api/telegram/webhook` ثبت می‌کند (با توکن سکرت).
8. دامنه‌ی `aqmx.atikova.com` را به Worker وصل می‌کند.

در پایان، `ADMIN_KEY` را چاپ می‌کند — آن را نگه دارید.

---

## ۴) آپلود روی Hugging Face

```bash
HF_TOKEN="hf_..." bash tools/upload-hf.sh "https://amqx-cityair.<subdomain>.workers.dev"
```

سه چیز آپلود می‌شود:

| مخزن | محتوا | نقش |
| --- | --- | --- |
| `datasets/sosa123454321/amqx-cityair-kb` | ۷۱ چانک دانش + `cities.csv` + داده‌ی خام | «دیتابیس» دستیار |
| `spaces/sosa123454321/amqx-cityair` | بیلد استاتیک سایت | آینه‌ی سایت |
| `spaces/sosa123454321/amqx-cityair-rag` | اپ Gradio با RAG | مدل + دیتاست در HF |

> ⚠️ اکانت HF شما سهمیه‌ی `cpu-basic` را پر کرده (`Quota exceeded … current=0, limit=0`)،
> پس اسپیس Gradio تا آزاد شدن سهمیه «Paused» می‌ماند. **سایت و دستیار روی Cloudflare
> هیچ ارتباطی به این سهمیه ندارند و کاملاً کار می‌کنند.**

---

## ۵) آپلود روی GitHub

```bash
GITHUB_TOKEN="ghp_MdUi..." bash tools/push-github.sh
```

- ریپوی تمیز جدید: **`Websites-by-AI/amqx-cityair`** (اصلی)
- ریپوی قدیمی `Amqx-suggest-d-new-...` هم با همین کد به‌روز می‌شود
  (اگر نمی‌خواهید: `ONLY_NEW=1 bash tools/push-github.sh`)

از توکن‌های GitHub که فرستادید فقط **دومی** (`ghp_MdUixg…` → کاربر `SBZ-EDU`) معتبر است و
دسترسی admin روی سازمان `Websites-by-AI` دارد. دو توکن دیگر `Bad credentials` می‌دهند.

---

## ۶) تنظیمات اختیاری

- **اشتراک روزانه تلگرام** (`/subscribe`): نیاز به D1 دارد → با `WITH_D1=1` فعال می‌شود.
- **Rate limit روی چت**: نیاز به KV دارد → با `WITH_KV=1` فعال می‌شود (۶۰ پیام در ساعت به‌ازای IP).
- **R2**: برای این پروژه لازم نیست (بیلد سایت چند صد کیلوبایت است و کتاب دانش داخل Worker
  باندل می‌شود). اگر بعداً خواستید فایل‌های بزرگ/آرشیو بگذارید، همان کلیدهای S3 که دادید
  (فقط با ساخت یک توکن R2 معتبر) به کار می‌آید.
- **مدل متفاوت**: `AI_MODEL` (پیش‌فرض `@cf/meta/llama-3.1-8b-instruct`) یا `HF_MODEL`
  (پیش‌فرض `Qwen/Qwen2.5-7B-Instruct`) را در `worker/wrangler.jsonc` عوض کنید.

---

## ۷) تست‌های انجام‌شده (محلی)

سرور محلی همان Worker (سایت + API) بالا آمد و این‌ها تست شدند:

```bash
GET  /                    → 200 (سایت سرو می‌شود)
GET  /cities/istanbul     → 200 (deep-link روی SPA)
GET  /api/health          → kbChunks:71 ، providers/telegram/subscribers
GET  /api/aqi?city=Istanbul → {"pm25":40.2,"pm10":47.3,"europeanAqi":55,...}  ← داده‌ی زنده‌ی واقعی
POST /api/chat            → provider: extractive-retrieval ، منابع درست
GET  /api/nope            → 404 JSON
```

هنگام دیپلوی، binding `AI` فعال می‌شود و `provider` جواب تبدیل به
`cloudflare-workers-ai:@cf/meta/llama-3.1-8b-instruct` خواهد شد.

---

## ۸) چه چیزی هنوز از شما لازم است

1. **توکن جدید Cloudflare** (با TTL چند‌روزه) ← بلوک‌کننده‌ی اصلی
2. بررسی اینکه زون `atikova.com` در همین اکانت است یا نه
3. (اختیاری) توکن HF با دسترسی Inference Providers
4. (اختیاری) اگر می‌خواهید ربات قدیمی آیکان هم منتقل شود: توکن جدید BotFather برای آن ربات
