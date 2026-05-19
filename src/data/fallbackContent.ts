import type { ContentItem } from '@/hooks/useContent';

const sampleVideos = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
];

type CatalogSeed = {
  title: string;
  description: string;
  genres: string[];
  year: number;
  rating: string;
  duration: string;
};

const movieSeeds: CatalogSeed[] = [
  { title: 'Toshkent Tunlari', description: 'Zamonaviy shahar ritmida kechadigan kriminal drama va oilaviy sirlar.', genres: ['Drama', 'Crime'], year: 2026, rating: '16+', duration: '1h 48m' },
  { title: 'Samarqand Soyasi', description: 'Qadimiy shaharda yoqolgan meros ortidan boshlangan sarguzasht.', genres: ['Adventure', 'Mystery'], year: 2025, rating: '12+', duration: '1h 57m' },
  { title: 'Yulduzlar Orti', description: 'Kosmik ekspeditsiya insoniyat uchun yangi uy izlaydi.', genres: ['Sci-Fi', 'Adventure'], year: 2026, rating: '12+', duration: '2h 04m' },
  { title: 'Sukutdagi Qasr', description: 'Toglar orasidagi mehmonxonada bir kechada hamma narsa ozgaradi.', genres: ['Thriller', 'Mystery'], year: 2024, rating: '16+', duration: '1h 42m' },
  { title: 'Bahor Qaytadi', description: 'Ikki avlod orasidagi muhabbat, kechirim va qaytish haqida iliq drama.', genres: ['Drama', 'Romance'], year: 2025, rating: 'PG', duration: '1h 36m' },
  { title: 'Metro 7', description: 'Yarim tunda toxtagan poyezd yoqolgan odamlar sirini ochadi.', genres: ['Action', 'Thriller'], year: 2026, rating: '16+', duration: '1h 50m' },
  { title: 'Qora Quti', description: 'Bir jurnalist siyosiy fitna va raqamli izlar ichida haqiqat qidiradi.', genres: ['Thriller', 'Drama'], year: 2025, rating: '16+', duration: '1h 55m' },
  { title: 'Dengizdan Xat', description: 'Yoqlikka ketgan kema kundaligi butun oilaning taqdirini ozgartiradi.', genres: ['Drama', 'Adventure'], year: 2023, rating: 'PG', duration: '1h 41m' },
  { title: 'Oltin Vodiy', description: 'Fermerlar, startapchilar va eski qarashlar toqnashgan komediya.', genres: ['Comedy', 'Family'], year: 2026, rating: 'PG', duration: '1h 32m' },
  { title: 'Oxirgi Reys', description: 'Soatga qarshi ketgan qutqaruv operatsiyasi.', genres: ['Action', 'Drama'], year: 2024, rating: '12+', duration: '1h 46m' },
  { title: 'Jadid', description: 'Ilm, jasorat va ozlik haqida tarixiy badiiy film.', genres: ['History', 'Drama'], year: 2025, rating: '12+', duration: '2h 10m' },
  { title: 'Kocha Chiroqlari', description: 'Musiqa orqali hayotini qayta topgan yosh ijodkorlar hikoyasi.', genres: ['Music', 'Drama'], year: 2024, rating: 'PG', duration: '1h 38m' },
  { title: 'Lola va Robot', description: 'Bolalar uchun mehr, texnologiya va dostlik haqidagi sarguzasht.', genres: ['Kids', 'Sci-Fi'], year: 2026, rating: 'G', duration: '1h 24m' },
  { title: 'Chegara 24', description: 'Bir sutka ichida hal qilinishi kerak bolgan xavfli missiya.', genres: ['Action', 'Crime'], year: 2025, rating: '16+', duration: '1h 44m' },
  { title: 'Zumrad Kod', description: 'Kiberxavfsizlik mutaxassisi butun tarmoqni toxtatadigan virusni quvadi.', genres: ['Tech', 'Thriller'], year: 2026, rating: '12+', duration: '1h 53m' },
  { title: 'Yomgir Hidi', description: 'Bolalikdagi dostlar yillar otib yana bir mahallada uchrashadi.', genres: ['Romance', 'Drama'], year: 2023, rating: 'PG', duration: '1h 34m' },
  { title: 'Katta Sahna', description: "Teatr ortidagi kulgu, raqobat va ijodiy g'alaba.", genres: ['Comedy', 'Drama'], year: 2024, rating: 'PG', duration: '1h 39m' },
  { title: 'Choqqi', description: 'Alpinistlar guruhi tabiat va oz qorquvlari bilan yuzlashadi.', genres: ['Adventure', 'Survival'], year: 2025, rating: '12+', duration: '1h 49m' },
  { title: 'Qaytish Nuqtasi', description: 'Detektiv bir ishni yopdim deb oylaydi, ammo dalillar qayta jonlanadi.', genres: ['Crime', 'Mystery'], year: 2026, rating: '16+', duration: '1h 58m' },
  { title: 'Shahar Simfoniyasi', description: 'Bir kun ichida kesishgan taqdirlar va katta shahar ovozi.', genres: ['Drama', 'Music'], year: 2025, rating: 'PG', duration: '1h 43m' },
  { title: 'Vaqt Darvozasi', description: 'Ilmiy tajriba otmish va kelajak orasida xavfli yol ochadi.', genres: ['Sci-Fi', 'Action'], year: 2026, rating: '12+', duration: '2h 01m' },
  { title: 'Nurli Uy', description: 'Oilaviy mehmonxona merosi atrofida kechadigan iliq komediya.', genres: ['Family', 'Comedy'], year: 2024, rating: 'G', duration: '1h 31m' },
  { title: 'Soyadagi Ovoza', description: 'Podkast boshlovchisi eski ishni qayta ochib, sirli tarmoqqa duch keladi.', genres: ['Mystery', 'Thriller'], year: 2025, rating: '16+', duration: '1h 47m' },
  { title: 'Beshinchi Fasl', description: 'Tabiat ozgarishlari fonida insoniy tanlovlar haqida poetik drama.', genres: ['Drama', 'Documentary'], year: 2023, rating: 'PG', duration: '1h 28m' },
  { title: 'Qizil Dala', description: 'Sport jamoasi kichik shahardan katta finalgacha boradi.', genres: ['Sports', 'Drama'], year: 2026, rating: 'PG', duration: '1h 45m' },
  { title: 'Labirint 88', description: 'Eski zavoddagi qochish oyini real xavfga aylanadi.', genres: ['Thriller', 'Action'], year: 2024, rating: '16+', duration: '1h 40m' },
  { title: 'Safar Daftari', description: 'Ota va qizning yoldagi suhbati butun oilani yarashtiradi.', genres: ['Family', 'Drama'], year: 2025, rating: 'PG', duration: '1h 37m' },
  { title: 'Kometa', description: 'Osmondagi hodisa kichik shaharchadagi odamlarni birlashtiradi.', genres: ['Sci-Fi', 'Drama'], year: 2026, rating: '12+', duration: '1h 52m' },
  { title: 'Soat 03:17', description: 'Bir daqiqa takrorlanishi ichida qamalgan qahramon vaqtni yengishi kerak.', genres: ['Sci-Fi', 'Thriller'], year: 2025, rating: '12+', duration: '1h 35m' },
  { title: 'Atlas', description: 'Hunarmandlar oilasi qadim kasbni zamonaviy moda bilan boglaydi.', genres: ['Drama', 'Lifestyle'], year: 2024, rating: 'PG', duration: '1h 33m' },
  { title: 'Qorongu Efir', description: 'Tungi radio dasturiga kelgan qongiroq shahar sirini ochadi.', genres: ['Mystery', 'Horror'], year: 2025, rating: '16+', duration: '1h 29m' },
  { title: 'Parvoz', description: 'Yosh uchuvchi orzusi uchun ham oilasi, ham ozidan otishi kerak.', genres: ['Adventure', 'Drama'], year: 2026, rating: 'PG', duration: '1h 51m' },
  { title: 'Bir Kunlik Qirol', description: 'Oddiy talaba tasodifan katta kompaniya rahbariga oxshab qoladi.', genres: ['Comedy', 'Family'], year: 2024, rating: 'PG', duration: '1h 27m' },
  { title: 'Meros', description: 'Katta mulk talashida yashirin hujjat va eski vada topiladi.', genres: ['Drama', 'Mystery'], year: 2025, rating: '12+', duration: '1h 56m' },
  { title: 'Reset', description: 'Suniy intellekt yordamchisi inson hislarini tushunishni organadi.', genres: ['Tech', 'Sci-Fi'], year: 2026, rating: '12+', duration: '1h 48m' },
  { title: 'Deraza', description: 'Bir uy, bir mahalla va turli avlodlarning kuzatilmagan hikoyalari.', genres: ['Drama', 'Family'], year: 2023, rating: 'PG', duration: '1h 30m' },
];

const catalogCities = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Xiva', 'Andijon', 'Fargona', 'Namangan', 'Nukus',
  'Qarshi', 'Termiz', 'Jizzax', 'Guliston', 'Navoiy', 'Zarafshon', 'Chirchiq', 'Kokand',
  'Urganch', 'Shahrisabz', 'Margilon', 'Angren',
];

const catalogWorlds: Omit<CatalogSeed, 'title' | 'year' | 'duration' | 'rating'>[] = [
  { description: 'kechgan tezkor operatsiya shahar hayotidagi yashirin tizimni ochib beradi.', genres: ['Action', 'Crime'] },
  { description: 'fonida oilaviy sirlar, eski maktublar va yangi qarorlar bir nuqtada tutashadi.', genres: ['Drama', 'Family'] },
  { description: 'manzaralarida yosh ixtirochilar katta texnologik tanlovga tayyorlanadi.', genres: ['Tech', 'Drama'] },
  { description: 'kochalari orasida sirli iz qidirgan detektiv kutilmagan haqiqatga yaqinlashadi.', genres: ['Mystery', 'Thriller'] },
  { description: 'sahnalarida kulgu, dostlik va raqobat bilan tola yangi hikoya boshlanadi.', genres: ['Comedy', 'Family'] },
  { description: 'stadionida kichik jamoa katta orzu uchun oxirigacha kurashadi.', genres: ['Sports', 'Drama'] },
  { description: 'tungi ritmida musiqachilar, raqqoslar va rejissyorlar bitta katta premyeraga yigiladi.', genres: ['Music', 'Drama'] },
  { description: 'tog va vodiylari orasida yoqolgan xarita ortidan xavfli safar boshlanadi.', genres: ['Adventure', 'Mystery'] },
  { description: 'kelajagida suniy intellekt bilan inson tanlovi orasidagi chegaralar sinovdan otadi.', genres: ['Sci-Fi', 'Tech'] },
  { description: 'mahallasida bolalar tasavvuri butun oilani birlashtiradigan sarguzashtga aylanadi.', genres: ['Kids', 'Adventure'] },
  { description: 'osmonida kometa korinishi bilan butun shahar hayoti bir kechada ozgaradi.', genres: ['Sci-Fi', 'Drama'] },
  { description: 'bozorida oddiy savdo kuni yirik komedik chalkashlikka sabab boladi.', genres: ['Comedy', 'Lifestyle'] },
];

const generatedMovieSeeds: CatalogSeed[] = catalogCities.flatMap((city, cityIndex) =>
  catalogWorlds.map((world, worldIndex) => {
    const minutes = 84 + ((cityIndex * 7 + worldIndex * 5) % 52);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return {
      title: `${city}: ${['Signal', 'Meros', 'Parvoz', 'Sir', 'Final', 'Kod'][worldIndex % 6]} ${worldIndex + 1}`,
      description: `${city} ${world.description}`,
      genres: world.genres,
      year: 2020 + ((cityIndex + worldIndex) % 7),
      rating: worldIndex % 5 === 0 ? '16+' : worldIndex % 3 === 0 ? '12+' : 'PG',
      duration: `${hours}h ${mins.toString().padStart(2, '0')}m`,
    };
  })
);

const allMovieSeeds = [...movieSeeds, ...generatedMovieSeeds];

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

export const fallbackContent: ContentItem[] = allMovieSeeds.map((item, index) => {
  const slug = slugify(item.title);
  const imageSeed = `alsamos-${slug}-${index}`;

  return {
    id: `demo-${slug}`,
    title: item.title,
    description: item.description,
    thumbnail: `https://picsum.photos/seed/${imageSeed}/520/780`,
    backdrop: `https://picsum.photos/seed/${imageSeed}-wide/1400/788`,
    year: item.year,
    rating: item.rating,
    duration: item.duration,
    genres: item.genres,
    type: 'movie',
    cast: ['Alsamos Studio', 'Yangi avlod aktyorlari'],
    director: 'Alsamos Creative',
    aiScore: 72 + (index % 27),
    isOriginal: index % 5 === 0,
    isNew: item.year >= 2026,
    isTrending: index % 3 === 0,
    videoUrl: sampleVideos[index % sampleVideos.length],
  };
});
