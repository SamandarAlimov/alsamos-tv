UPDATE public.content
SET
  title = 'Qochqin',
  description = 'Adolat izlab qochqinga aylangan yigitning hayoti haqida dramatik triller.',
  video_url = 'https://www.youtube.com/watch?v=lA2Tg_QuPVQ',
  thumbnail_url = 'https://i.ytimg.com/vi/lA2Tg_QuPVQ/hqdefault.jpg',
  backdrop_url = 'https://i.ytimg.com/vi/lA2Tg_QuPVQ/sddefault.jpg',
  release_year = 2015,
  duration_seconds = 6474,
  rating = COALESCE(rating, 'PG-13'),
  genres = ARRAY['Drama', 'Triller', 'O''zbek kino'],
  updated_at = now()
WHERE
  lower(title) = 'qochqin'
  OR lower(title) LIKE 'qochqin %'
  OR video_url ILIKE '%AsuRRiXB0nU%'
  OR thumbnail_url ILIKE '%AsuRRiXB0nU%'
  OR backdrop_url ILIKE '%AsuRRiXB0nU%';
