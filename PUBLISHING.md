# Як опублікувати SubControl в App Store і Google Play

Код, збірка, сайт, тексти й скріншоти готові. Лишилися кроки, які за вас ніхто не зробить: акаунти, оплата й анкети магазинів. Ідіть по порядку, кожен крок спирається на попередній.

Збірки робляться кнопкою на GitHub. Компʼютер знадобиться рівно один раз, для сертифікатів Apple.

## 0. Тестова версія на Android

Пряме посилання на файл: https://github.com/Denis0958724/SubControl/releases/download/android-test/SubControl-test.apk

Або сторінка завантажень: https://github.com/Denis0958724/SubControl/releases. Там реліз «SubControl для Android (тестова збірка)», внизу розділ Assets, файл `SubControl-test.apk`. Відкрийте з телефона, завантажте, встановіть. Android попросить дозволу ставити застосунки з браузера, це нормально.

Нова тестова збірка: вкладка **Actions** → «Тестовий APK для Android» → **Run workflow**. Хвилин за 40 файл за тим самим посиланням оновиться.

## 1. Акаунти

| Що | Ціна | Де |
|---|---|---|
| Apple Developer Program | 99 $ на рік | developer.apple.com/programs |
| Google Play Console | 25 $ один раз | play.google.com/console |
| Expo (збирає застосунок) | безкоштовно | expo.dev |
| RevenueCat (оплата Pro) | безкоштовно до 2 500 $ доходу на місяць | revenuecat.com |

Apple перевіряє особу кілька днів, Google теж. Почніть з них, поки робите решту.

## 2. Пошта для звʼязку

Без неї магазини не приймуть застосунок. На GitHub відкрийте файл `src/lib/links.ts`, натисніть олівець, впишіть пошту в рядок

```ts
export const CONTACT_EMAIL = 'ваша@пошта';
```

і натисніть Commit changes. Сайт оновиться сам за хвилину-дві, у застосунку пошта зʼявиться в наступній збірці. Те саме допишіть у кінець `PRIVACY.md`.

## 3. Як додавати секрети на GitHub

Далі часто буде «додайте секрет». Це завжди одне й те саме місце: репозиторій → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name пишете точно як у таблиці, Secret це саме значення. Секрети ніхто не бачить, навіть ви після збереження.

| Секрет | Звідки взяти | Для чого |
|---|---|---|
| `EXPO_TOKEN` | expo.dev → Account settings → Access tokens → Create | будь-яка збірка |
| `REVENUECAT_ANDROID_KEY` | RevenueCat → Project settings → API keys, ключ `goog_…` | Android |
| `REVENUECAT_IOS_KEY` | там само, ключ `appl_…` | iPhone |
| `ASC_API_KEY_P8` | App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → «+», роль App Manager. Відкрийте завантажений `.p8` у блокноті й вставте весь текст | iPhone |
| `ASC_KEY_ID` | там само, колонка Key ID | iPhone |
| `ASC_ISSUER_ID` | там само, Issuer ID над таблицею | iPhone |
| `ASC_APP_ID` | App Store Connect → ваш застосунок → App Information → Apple ID (число) | відправка в TestFlight |
| `APPLE_TEAM_ID` | developer.apple.com → Membership → Team ID | iPhone |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | необовʼязково, див. крок 5.7 | автовідправка в Google Play |

## 4. Expo і RevenueCat

1. Зареєструйтесь на expo.dev, створіть токен, додайте секрет `EXPO_TOKEN`. Проєкт Expo створиться сам при першій збірці.
2. На revenuecat.com створіть проєкт **SubControl** і додайте два застосунки:
   - **Play Store**: package `ua.subcontrol.app`.
   - **App Store**: bundle ID `ua.subcontrol.app`.
3. Project settings → API keys: скопіюйте `goog_…` і `appl_…` у секрети `REVENUECAT_ANDROID_KEY` і `REVENUECAT_IOS_KEY`. Ці ключі не таємні, вони однаково потрапляють у застосунок.
4. **Entitlements** → New → identifier `pro`.
5. **Offerings** → `default` (позначте як Current) → два пакети: **Monthly** і **Annual**. Товари в них додасте, коли створите підписки в магазинах (кроки 5.4 і 6.5).

Без ключів RevenueCat кнопка збірки зупиниться і скаже, чого бракує. Це навмисно: застосунок, у якому не працює оплата, Apple однаково відхилить.

## 5. Google Play

1. **Play Console → Create app.** Назва SubControl, мова українська, App, Free. Погодьтеся з правилами.
2. **Перша збірка.** На GitHub: Actions → «Збірка для App Store і Google Play» → Run workflow → platform `android`. Expo збирає в черзі, буває від 15 хвилин до кількох годин на безкоштовному плані.
3. **Завантажте файл вручну.** Releases → «Google Play: файл для завантаження (.aab)» → `SubControl-google-play.aab`. У Play Console: Testing → Internal testing → Create new release → Upload. Google вимагає, щоб перша версія потрапила туди руками. Ключ підпису Expo створив і зберігає сам, Play App Signing увімкніть, як запропонують.
4. **Підписки.** Monetize → Products → Subscriptions. Що створити, написано в [`STORE.md`](STORE.md), розділ Google Play. Для продажу потрібен ще payments profile: Settings → Payments profile.
5. **RevenueCat ↔ Google.** RevenueCat має перевіряти покупки в Google. У RevenueCat, у застосунку Play Store, є інструкція «Service Account credentials»: створюєте сервісний акаунт у Google Cloud, даєте йому доступ у Play Console і завантажуєте JSON у RevenueCat. Потім Products → Import, і додайте `subcontrol_pro_monthly:monthly` у пакет Monthly, `subcontrol_pro_yearly:yearly` у Annual, обидва в entitlement `pro`.
6. **Анкети й сторінка.** Store presence і Policy → App content. Усі відповіді й тексти в [`STORE.md`](STORE.md), картинки в `store/android/`.
7. **Необовʼязково: автовідправка.** Той самий JSON сервісного акаунта (або окремий) вставте в секрет `GOOGLE_SERVICE_ACCOUNT_JSON`. Тоді кнопка збірки сама кластиме нові версії в Internal testing.
8. **Закрите тестування.** Нові особисті акаунти Google пускає в продакшн лише після закритого тесту: щонайменше 12 тестувальників 14 днів поспіль. Testing → Closed testing, додайте пошти друзів, дайте їм посилання. Після 14 днів Dashboard → Apply for production. Точні умови показує сама консоль, вони інколи змінюються.

## 6. App Store

1. **Угоди й гроші.** App Store Connect → Business: підпишіть Paid Apps Agreement, заповніть податки (для України це форма W-8BEN) і банк. Без цього підписки не продаються. Подайте заявку в App Store Small Business Program: комісія 15% замість 30%.
2. **Сертифікати, один раз з компʼютера.** Apple не дозволяє створити їх без входу в Apple ID, а входити в CI не можна. Потрібен будь-який компʼютер з [Node.js](https://nodejs.org) 22:
   ```bash
   git clone https://github.com/Denis0958724/SubControl.git
   cd SubControl
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest credentials -p ios
   ```
   Оберіть профіль `production` і пункт, що налаштовує всі credentials для збірки. Увійдіть в Apple ID, коли спитає, і погоджуйтесь на все, що EAS пропонує створити. Сертифікати знадобляться для двох частин: самого застосунку (`ua.subcontrol.app`) і віджета з Dynamic Island (`ua.subcontrol.app.ExpoWidgetsTarget`). Спільну App Group `group.ua.subcontrol.app` і дозвіл на Time Sensitive сповіщення EAS увімкне сам. Далі компʼютер не потрібен.
3. **Створіть застосунок.** App Store Connect → Apps → «+» → New App: iOS, назва SubControl, мова Ukrainian, bundle ID `ua.subcontrol.app`, SKU `subcontrol`.
4. **Ключ API.** Додайте секрети `ASC_API_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_APP_ID`, `APPLE_TEAM_ID` (таблиця в кроці 3).
5. **Підписки.** Monetization → Subscriptions, група `SubControl Pro`, два товари й акція, як у [`STORE.md`](STORE.md). Потім у RevenueCat, у застосунку App Store: завантажте In-App Purchase Key (App Store Connect → Users and Access → Integrations → In-App Purchase → «+»), Products → Import, і додайте товари в пакети Monthly і Annual та entitlement `pro`.
6. **Збірка.** Actions → «Збірка для App Store і Google Play» → Run workflow → platform `ios`. Готова збірка сама поїде в TestFlight. Купівлю перевірте з тестовим Sandbox-акаунтом (Users and Access → Sandbox): гроші не списуються.
7. **Анкети й сторінка.** Тексти, ключові слова, App Privacy, Age Rating і нотатки для перевірки в [`STORE.md`](STORE.md), скріншоти в `store/ios/`. У версії оберіть збірку з TestFlight, внизу в розділі In-App Purchases and Subscriptions додайте обидві підписки, Add for Review.
8. **Країни.** Для старту найпростіше лише Україна. Для країн ЄС Apple вимагає статус «трейдера» за DSA з публічною адресою й телефоном. Це можна додати пізніше.

Перевірка Apple зазвичай займає від доби до кількох днів. Якщо відхилять, у листі буде номер правила. Скиньте його мені.

## 7. Нові версії

1. У `app.json` змініть `"version"`, наприклад з `1.0.0` на `1.0.1`. Номер збірки Expo підніме сам.
2. Actions → «Збірка для App Store і Google Play» → Run workflow → `all`.
3. iPhone: нова версія в App Store Connect, оберіть збірку, на перевірку. Android: якщо є `GOOGLE_SERVICE_ACCOUNT_JSON`, вона вже в Internal testing, лишилося просунути в продакшн. Якщо ні, завантажте .aab з Releases руками.

## 8. Якщо щось пішло не так

| Що бачите | Що робити |
|---|---|
| «Не вистачає секретів» | у повідомленні написано, яких саме. Додайте й запустіть знову |
| Помилка про credentials, сертифікат чи provisioning profile на iPhone | не зроблено крок 6.2 |
| Збірка Android пройшла, а відправка в Google Play ні | перша версія має бути завантажена руками (крок 5.3), або сервісному акаунту бракує доступу в Play Console |
| У застосунку «Магазин зараз не відповідає» | у RevenueCat немає Current offering з пакетами Monthly і Annual, або товари ще не схвалені магазином |
| Сайт не відкривається | Settings → Pages → Source: Deploy from a branch, branch `gh-pages`, папка `/ (root)` |

## Що де лежить

- [`STORE.md`](STORE.md): тексти й відповіді для анкет.
- [`store/`](store): скріншоти, іконки, банер. Перегенерувати: `scripts/make-store-assets.py`.
- [`site/`](site): сайт з політикою й підтримкою, публікується сам при змінах.
- `.github/workflows/`: три кнопки в Actions: тестовий APK, збірка для магазинів, сайт.
