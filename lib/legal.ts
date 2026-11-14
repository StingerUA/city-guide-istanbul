// Единственное место, где нужно что-то поменять вручную: CONTACT_EMAIL.
// Этот адрес показывается на страницах /privacy и /delete-account.
export const OPERATOR = 'City Guide İstanbul';
export const CONTACT_EMAIL = 'CONTACT_EMAIL_NOT_SET@example.com';
export const POLICY_UPDATED = '2026-11-10';

export type LegalLang = 'ru' | 'tr' | 'en';
export type PolicySection = { h: string; p?: string[]; ul?: string[] };
export type PolicyCopy = { title: string; updated: string; sections: PolicySection[]; deleteLink: string; back: string };

// {email} и {operator} подставляются на странице.
export const policy: Record<LegalLang, PolicyCopy> = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    deleteLink: 'Delete my account',
    back: 'Back to the app',
    sections: [
      { h: '1. Who we are', p: ['{operator} (“City Guide”, “we”) operates the City Guide mobile and web app for visitors and partner businesses in İstanbul and other cities. Contact: {email}.'] },
      { h: '2. What data we collect', ul: [
        'Account data: your email address and name. If you sign in with Google, we receive your name and email from Google. Passwords are handled by our authentication provider; we do not store them in readable form.',
        'Profile data you choose to add: phone number, accommodation address, preferred language.',
        'Bookings: the name, phone number, dates, number of guests and note you enter, and the place you booked. Bookings in this version are test requests: no payment card details are requested and no money is charged.',
        'Content you submit: reviews, favorites and feedback messages.',
        'Partner accounts: place listings, opening hours, addresses, contact details, locations and photos you upload.',
        'Technical data: secure sign-in cookies; language, theme and city preferences stored on your device; and standard server logs (such as IP address and request time) processed by our hosting provider for security and reliability.',
      ] },
      { h: '3. What we do not collect', ul: [
        'We do not access your device’s precise location, contacts, camera or microphone.',
        'We do not collect payment card data and do not use advertising identifiers or third-party advertising or analytics trackers.',
      ] },
      { h: '4. How we use data', ul: [
        'To provide the app: sign-in, your profile, bookings, favorites, reviews and partner listings.',
        'To show your booking details (name, phone, date, guests, note) to the place you booked.',
        'To keep the service secure, prevent abuse, moderate content and respond to support requests.',
      ] },
      { h: '5. Who processes data on our behalf', p: ['We do not sell personal data. We use these service providers:'], ul: [
        'Supabase — database, authentication and storage of uploaded photos.',
        'Cloudflare — hosting and delivery of the app.',
        'Google — only if you choose “Sign in with Google”.',
        'OpenStreetMap — map tiles are loaded directly from OpenStreetMap servers when you open a map, so they receive your IP address and the map area you view.',
        'MET Norway (weather) and open.er-api.com (exchange rates) — requested by our server using approximate city coordinates or no user data at all; they do not receive your account data.',
      ] },
      { h: '6. Retention and deletion', p: [
        'We keep your data while your account is active. You can delete your account at any time in the app: Settings → Data & privacy → Delete account, or at /delete-account. If you cannot sign in, email {email} from your account address and we will delete it.',
      ], ul: [
        'Deleted immediately: your sign-in account, profile, bookings, reviews, feedback, favorites and uploaded photos.',
        'Partner accounts: your listings are unpublished (archived) and their phone number and website are removed.',
        'Copies kept by our infrastructure providers in backups may persist for a limited period before they are overwritten. We may keep minimal records where the law requires.',
      ] },
      { h: '7. Your rights', p: ['Depending on where you live (including under the Turkish Personal Data Protection Law, KVKK, and the GDPR), you may ask to access, correct, export, delete or restrict the use of your data, and to object to processing. You can edit your profile and export your data in Settings, delete your account as described above, or contact {email}. You may also complain to your local data protection authority (in Türkiye, the KVKK Board).'] },
      { h: '8. Security', p: ['The app uses HTTPS, secure HTTP-only sign-in cookies, access controls on stored data and optional two-factor authentication. No system is perfectly secure, but we work to protect your data.'] },
      { h: '9. Children', p: ['The app is not intended for children under 16 and we do not knowingly collect their data. If you believe a child has given us data, contact {email}.'] },
      { h: '10. Changes', p: ['We may update this policy. The date at the top shows the latest version; significant changes will be announced in the app.'] },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Обновлено',
    deleteLink: 'Удалить мой аккаунт',
    back: 'Вернуться в приложение',
    sections: [
      { h: '1. Кто мы', p: ['{operator} («City Guide», «мы») разрабатывает мобильное и веб-приложение City Guide для гостей и партнёров-заведений в Стамбуле и других городах. Контакты: {email}.'] },
      { h: '2. Какие данные мы собираем', ul: [
        'Данные аккаунта: адрес электронной почты и имя. При входе через Google мы получаем от Google ваше имя и email. Пароли обрабатывает сервис аутентификации; мы не храним их в читаемом виде.',
        'Данные профиля, которые вы добавляете сами: телефон, адрес проживания, язык.',
        'Бронирования: имя, телефон, даты, число гостей и комментарий, которые вы указываете, а также выбранное заведение. В этой версии заявки тестовые: данные банковских карт не запрашиваются, деньги не списываются.',
        'Контент, который вы отправляете: отзывы, избранное, сообщения обратной связи.',
        'Аккаунты партнёров: карточки заведений, часы работы, адреса, контакты, расположение и загруженные фотографии.',
        'Технические данные: защищённые cookie для входа; настройки языка, темы и города на вашем устройстве; стандартные серверные журналы (например, IP-адрес и время запроса), которые обрабатывает хостинг-провайдер для безопасности и стабильности.',
      ] },
      { h: '3. Чего мы не собираем', ul: [
        'Мы не получаем точную геолокацию устройства, контакты, доступ к камере и микрофону.',
        'Мы не собираем данные банковских карт и не используем рекламные идентификаторы, сторонние рекламные и аналитические трекеры.',
      ] },
      { h: '4. Как мы используем данные', ul: [
        'Для работы приложения: вход, профиль, бронирования, избранное, отзывы и карточки партнёров.',
        'Чтобы показать данные заявки (имя, телефон, дату, число гостей, комментарий) заведению, которое вы выбрали.',
        'Для безопасности сервиса, борьбы со злоупотреблениями, модерации и ответов на обращения.',
      ] },
      { h: '5. Кто обрабатывает данные по нашему поручению', p: ['Мы не продаём персональные данные. Мы используем следующих поставщиков:'], ul: [
        'Supabase — база данных, аутентификация и хранение загруженных фотографий.',
        'Cloudflare — хостинг и доставка приложения.',
        'Google — только если вы выбираете «Войти через Google».',
        'OpenStreetMap — при открытии карты фрагменты карты загружаются напрямую с серверов OpenStreetMap, поэтому они получают ваш IP-адрес и просматриваемую область карты.',
        'MET Norway (погода) и open.er-api.com (курсы валют) — запросы делает наш сервер с приблизительными координатами города или без данных пользователя; данные вашего аккаунта они не получают.',
      ] },
      { h: '6. Хранение и удаление', p: [
        'Мы храним данные, пока ваш аккаунт активен. Вы можете удалить аккаунт в любой момент в приложении: Настройки → Данные и конфиденциальность → Удалить аккаунт, либо на странице /delete-account. Если вы не можете войти, напишите на {email} с адреса вашего аккаунта, и мы удалим его.',
      ], ul: [
        'Удаляется сразу: аккаунт для входа, профиль, бронирования, отзывы, обратная связь, избранное и загруженные фотографии.',
        'Аккаунты партнёров: карточки заведений снимаются с публикации (архивируются), телефон и сайт в них удаляются.',
        'Копии в резервных копиях у наших поставщиков инфраструктуры могут сохраняться ограниченное время, пока не будут перезаписаны. Минимально необходимые записи мы можем хранить, если этого требует закон.',
      ] },
      { h: '7. Ваши права', p: ['В зависимости от вашей страны (включая турецкий закон о защите персональных данных KVKK и GDPR) вы можете запросить доступ к данным, исправление, экспорт, удаление или ограничение использования, а также возразить против обработки. Профиль можно изменить и данные экспортировать в Настройках, аккаунт удалить способом, описанным выше, или написать на {email}. Вы также можете обратиться в орган по защите данных вашей страны (в Турции — Совет KVKK).'] },
      { h: '8. Безопасность', p: ['Приложение использует HTTPS, защищённые HTTP-only cookie для входа, ограничения доступа к данным и необязательную двухфакторную аутентификацию. Абсолютной защиты не существует, но мы стараемся защищать ваши данные.'] },
      { h: '9. Дети', p: ['Приложение не предназначено для детей младше 16 лет, и мы сознательно не собираем их данные. Если вы считаете, что ребёнок передал нам данные, напишите на {email}.'] },
      { h: '10. Изменения', p: ['Мы можем обновлять политику. Актуальная версия обозначена датой вверху страницы; о существенных изменениях мы сообщим в приложении.'] },
    ],
  },
  tr: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme',
    deleteLink: 'Hesabımı sil',
    back: 'Uygulamaya dön',
    sections: [
      { h: '1. Biz kimiz', p: ['{operator} (“City Guide”, “biz”), İstanbul ve diğer şehirlerdeki ziyaretçiler ve iş ortağı işletmeler için City Guide mobil ve web uygulamasını işletir. İletişim: {email}.'] },
      { h: '2. Hangi verileri topluyoruz', ul: [
        'Hesap verileri: e-posta adresiniz ve adınız. Google ile giriş yaparsanız adınızı ve e-postanızı Google’dan alırız. Parolalar kimlik doğrulama sağlayıcımız tarafından işlenir; okunabilir biçimde saklamayız.',
        'Kendi isteğinizle eklediğiniz profil verileri: telefon numarası, konaklama adresi, tercih edilen dil.',
        'Rezervasyonlar: girdiğiniz ad, telefon, tarihler, kişi sayısı ve not ile seçtiğiniz mekan. Bu sürümdeki rezervasyonlar test amaçlıdır: kart bilgisi istenmez ve ücret alınmaz.',
        'Gönderdiğiniz içerikler: yorumlar, favoriler ve geri bildirim mesajları.',
        'İş ortağı hesapları: mekan kayıtları, çalışma saatleri, adresler, iletişim bilgileri, konumlar ve yüklediğiniz fotoğraflar.',
        'Teknik veriler: güvenli oturum çerezleri; cihazınızda saklanan dil, tema ve şehir tercihleri; güvenlik ve kararlılık için barındırma sağlayıcımızın işlediği standart sunucu kayıtları (IP adresi ve istek zamanı gibi).',
      ] },
      { h: '3. Neleri toplamıyoruz', ul: [
        'Cihazınızın hassas konumuna, rehberine, kamerasına veya mikrofonuna erişmeyiz.',
        'Ödeme kartı verisi toplamayız; reklam kimlikleri ile üçüncü taraf reklam veya analiz izleyicileri kullanmayız.',
      ] },
      { h: '4. Verileri nasıl kullanıyoruz', ul: [
        'Uygulamayı sunmak için: giriş, profil, rezervasyonlar, favoriler, yorumlar ve iş ortağı kayıtları.',
        'Rezervasyon bilgilerinizi (ad, telefon, tarih, kişi sayısı, not) seçtiğiniz mekana göstermek için.',
        'Hizmetin güvenliği, kötüye kullanımın önlenmesi, içerik denetimi ve destek talepleri için.',
      ] },
      { h: '5. Verileri bizim adımıza kimler işliyor', p: ['Kişisel verileri satmayız. Şu hizmet sağlayıcıları kullanıyoruz:'], ul: [
        'Supabase — veritabanı, kimlik doğrulama ve yüklenen fotoğrafların depolanması.',
        'Cloudflare — uygulamanın barındırılması ve sunumu.',
        'Google — yalnızca “Google ile giriş yap” seçeneğini kullanırsanız.',
        'OpenStreetMap — harita açtığınızda harita parçaları doğrudan OpenStreetMap sunucularından yüklenir; bu nedenle IP adresinizi ve görüntülediğiniz harita alanını alırlar.',
        'MET Norway (hava durumu) ve open.er-api.com (döviz kurları) — sunucumuz tarafından yaklaşık şehir koordinatlarıyla veya hiç kullanıcı verisi olmadan istenir; hesap verilerinizi almazlar.',
      ] },
      { h: '6. Saklama ve silme', p: [
        'Verilerinizi hesabınız etkin olduğu sürece saklarız. Hesabınızı istediğiniz zaman uygulamada silebilirsiniz: Ayarlar → Veriler ve gizlilik → Hesabı sil veya /delete-account sayfası. Giriş yapamıyorsanız hesap adresinizden {email} adresine yazın, hesabınızı silelim.',
      ], ul: [
        'Hemen silinenler: giriş hesabınız, profiliniz, rezervasyonlarınız, yorumlarınız, geri bildirimleriniz, favorileriniz ve yüklediğiniz fotoğraflar.',
        'İş ortağı hesapları: mekan kayıtlarınız yayından kaldırılır (arşivlenir) ve telefon ile web sitesi bilgileri silinir.',
        'Altyapı sağlayıcılarımızın yedeklerindeki kopyalar üzerine yazılana kadar sınırlı bir süre kalabilir. Kanunen gerekiyorsa asgari kayıtları saklayabiliriz.',
      ] },
      { h: '7. Haklarınız', p: ['Bulunduğunuz ülkeye göre (6698 sayılı KVKK ve GDPR dahil) verilerinize erişim, düzeltme, dışa aktarma, silme veya kullanımın kısıtlanmasını talep etme ve işlemeye itiraz etme hakkına sahip olabilirsiniz. Profilinizi düzenleyebilir ve verilerinizi Ayarlar’dan dışa aktarabilir, hesabınızı yukarıda anlatıldığı gibi silebilir veya {email} adresine yazabilirsiniz. Ayrıca ülkenizdeki veri koruma otoritesine (Türkiye’de KVKK Kurulu) şikâyette bulunabilirsiniz.'] },
      { h: '8. Güvenlik', p: ['Uygulama HTTPS, güvenli HTTP-only oturum çerezleri, saklanan verilerde erişim denetimleri ve isteğe bağlı iki faktörlü doğrulama kullanır. Hiçbir sistem tamamen güvenli değildir, ancak verilerinizi korumak için çalışırız.'] },
      { h: '9. Çocuklar', p: ['Uygulama 16 yaşından küçük çocuklara yönelik değildir ve onların verilerini bilerek toplamayız. Bir çocuğun bize veri verdiğini düşünüyorsanız {email} adresine yazın.'] },
      { h: '10. Değişiklikler', p: ['Bu politikayı güncelleyebiliriz. Sayfanın üstündeki tarih en son sürümü gösterir; önemli değişiklikleri uygulama içinde duyururuz.'] },
    ],
  },
};
