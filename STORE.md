# Тексти й відповіді для App Store і Google Play

Усе, що треба вставити в анкети магазинів. Скріншоти й графіка лежать у [`store/`](store).

Посилання (працюють після першої публікації сайту):

- Головна: https://denis0958724.github.io/SubControl/
- Підтримка: https://denis0958724.github.io/SubControl/support.html
- Політика конфіденційності: https://denis0958724.github.io/SubControl/privacy.html

## Спільне для обох магазинів

**Назва:** SubControl. Якщо зайнята, то «SubControl: підписки».

**Категорія:** Фінанси (Finance). Додаткова в App Store: Продуктивність.

**Повний опис:**

```
Netflix, Spotify, YouTube, MEGOGO, iCloud, ChatGPT. Підписки набігають непомітно, а списання приходять у найневдаліший момент. SubControl збирає їх в одному місці й показує, скільки ви насправді платите.

• Сума на місяць і на рік у гривнях. Долари й євро перераховуються за курсом monobank або НБУ.
• Циферблат місяця: одразу видно, скільки вже списано і що ще попереду.
• Нагадування за день до списання. «Продовжую» чи «Скасувати» просто зі сповіщення.
• Покрокові інструкції, як скасувати кожну підписку, і посилання на потрібну сторінку.
• Українські й світові сервіси, а також будь-який свій.

SubControl Pro:
• Автопошук підписок у виписці monobank, ПриватБанку та інших банків.
• «Платимо разом»: скільки з кожного, якщо ділите підписку з родиною.
• Нагадування за 3 дні або за тиждень.
• Скільки завгодно підписок і експорт у таблицю.

Pro коштує 79 ₴ на місяць або 690 ₴ на рік. Зараз акція: перші 3 місяці по 75 ₴. Підписка продовжується автоматично, скасувати можна будь-коли в налаштуваннях App Store чи Google Play.

Ваші дані зберігаються лише на телефоні. Виписки читаються там само й нікуди не надсилаються. Реклами й трекерів немає. SubControl не має доступу до ваших грошей і нічого не списує сам.
```

## App Store Connect

| Поле | Що вписати |
|---|---|
| Subtitle (30) | `Усі підписки під контролем` |
| Promotional Text (170) | `Акція: Pro за 75 ₴ на місяць перші 3 місяці. Знайдіть забуті підписки у виписці банку й перестаньте платити за те, чим давно не користуєтесь.` |
| Keywords (100) | `підписки,списання,нагадування,бюджет,витрати,скасувати,гроші,фінанси,облік,виписка,платежі` |
| Support URL | посилання на підтримку вище |
| Marketing URL | головна вище |
| Privacy Policy URL | політика вище |
| Copyright | `2026 <ваше імʼя>` |
| Скріншоти iPhone 6.9" | `store/ios/1-home.png` … `5-home.png` (1320×2868) |
| Іконка | береться зі збірки сама, запасна `store/ios/icon-1024.png` |

Назв чужих сервісів у Keywords немає навмисно: Apple за таке відхиляє (правило 2.3.7). В описі вони можна, бо це правда про функції.

**Age Rating:** на всі питання «No» / «None». Unrestricted Web Access: No (застосунок відкриває лише сторінки скасування конкретних сервісів). Вийде 4+.

**App Privacy:**
- Do you or your third-party partners collect data? **Yes**.
- Тип: **Purchases → Purchase History**.
- Linked to the user's identity: **No**. Used for tracking: **No**. Purpose: **App Functionality**.
- Більше нічого не збирається. Список підписок і виписки лишаються на телефоні, а те, що не покидає пристрій, Apple не вважає збором даних.

**Підписки (In-App Purchases → Subscriptions):** група `SubControl Pro`.

| Product ID | Тривалість | Ціна | Display name | Description |
|---|---|---|---|---|
| `subcontrol_pro_monthly` | 1 місяць | 79 ₴ | SubControl Pro на місяць | Автопошук у виписці, родинний розподіл, без обмежень |
| `subcontrol_pro_yearly` | 1 рік | 690 ₴ | SubControl Pro на рік | Автопошук у виписці, родинний розподіл, без обмежень |

- Для місячної: Subscription Prices → Introductory Offer → **Pay As You Go**, 75 ₴, **3 periods**, для нових підписників.
- Review screenshot для обох: `store/ios/iap-review-paywall.png`.
- Перші підписки відправляються на перевірку разом з першою версією застосунку. Окремо їх не перевірять.

**App Review Information → Notes:**

```
SubControl tracks the user's subscriptions locally on the device. No account or login is needed.

Pro (auto-renewable subscription) unlocks: finding subscriptions in a bank statement file, family cost sharing, earlier reminders, unlimited list, CSV export. Purchases go through StoreKit (RevenueCat SDK). Restore Purchases is on the Pro screen.

To try the statement search: Settings → "Знайти підписки у виписці" → ПриватБанк → "Обрати файл", and pick this sample file (made-up data):
https://github.com/Denis0958724/SubControl/raw/main/src/lib/statement/__tests__/fixtures/privat.xlsx

The monobank option asks for the user's personal read-only API token from api.monobank.ua. It is optional; the file option works without it.

The app does not move money and cannot cancel subscriptions by itself. It shows steps and opens the service's own cancellation page.
```

**Encryption:** відповідь уже в збірці (`ITSAppUsesNonExemptEncryption = NO`), питати не буде.

## Google Play Console

| Поле | Що вписати |
|---|---|
| App name (30) | `SubControl` |
| Short description (80) | `Підписки в гривнях і нагадування за день до списання. Без несподіванок.` |
| Full description | спільний опис вище |
| App icon | `store/android/icon-512.png` |
| Feature graphic | `store/android/feature-graphic.png` (1024×500) |
| Phone screenshots | `store/android/1-home.png` … `5-home.png` (1080×1920) |
| Contact email | ваша пошта (обовʼязково) |
| Website | головна вище |
| Privacy policy | політика вище |

**App content** (розділ Policy → App content):
- **App access:** All functionality is available without special access.
- **Ads:** No, my app does not contain ads.
- **Content rating:** категорія «All other app types», на всі питання «No». Вийде 3+ / Everyone.
- **Target audience:** 18 and over. Так не треба виконувати правила для дитячих застосунків.
- **News app:** No. **Government app:** No. **Health:** нічого не обирати.
- **Financial features:** застосунок не дає кредитів, не тримає гроші й не переказує їх. Якщо є пункт про облік особистих витрат чи бюджет, оберіть його. Якщо ні, «My app doesn't provide any financial features».
- **Data safety:**
  - Does your app collect or share user data? **Yes**.
  - Financial info → **Purchase history**: Collected, не Shared, обробка не ефемерна, обовʼязково (Required), мета **App functionality**.
  - Is all data encrypted in transit? **Yes**.
  - Do you provide a way for users to request deletion? **Yes**, через пошту підтримки.
  - Решта типів: не збираються. Виписки обробляються лише на пристрої, Google таке збором не вважає.

**Підписки (Monetize → Products → Subscriptions).** Зʼявляються лише після першого завантаженого .aab.

| Product ID | Base plan ID | Період | Ціна |
|---|---|---|---|
| `subcontrol_pro_monthly` | `monthly` | 1 місяць, auto-renewing | 79 ₴ |
| `subcontrol_pro_yearly` | `yearly` | 1 рік, auto-renewing | 690 ₴ |

Для `monthly` додайте offer `launch-75`: Eligibility «New customer acquisition», фаза **Discounted recurring payment**, 75 ₴, **3 billing periods**.

У RevenueCat ці товари на Android називаються `subcontrol_pro_monthly:monthly` і `subcontrol_pro_yearly:yearly`.
