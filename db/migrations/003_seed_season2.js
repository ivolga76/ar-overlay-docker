// Migration 003 seed: populate Season 2 contracts and protocols
// Data extracted from: https://docs.google.com/document/d/11nsXkIAs5Q-YG_erlTTK8PQDnSBX1kwO68syoH4Cqwc
import { randomUUID } from 'node:crypto';

function uid() {
  return randomUUID();
}

export async function up(db, helpers) {
  const { run } = helpers;

  // Check if Season 2 contracts already seeded
  const existing = db.exec("SELECT COUNT(*) as cnt FROM contracts WHERE season_id = 'season-2'");
  const count = existing[0]?.values[0]?.[0] ?? 0;
  if (count > 0) {
    console.log('[migrate:003] contracts already seeded, skipping');
    return;
  }

  console.log('[migrate:003] seeding Season 2 contracts and protocols...');

  // ── Regular Contracts (2 points) ─────────────────────────

  const regularContracts = [
    // Boosty
    { id: uid(), cat: 'boosty', text: '«Смешарики» (Архитектор Арены | Ex_Gamer_MtFk): Найдите и отметьте с помощью Химических фонарей 10 шарообразных объектов. (роботы ARC не учитываются)', author: 'Ex_Gamer_MtFk', legendary: 0 },
    { id: uid(), cat: 'boosty', text: '«Нелегальный оборот» (Советник Арены | Red_Buddy): Добудьте 3 разных предмета Эпического Качества.', author: 'Red_Buddy', legendary: 0 },

    // PvE (14)
    { id: uid(), cat: 'pve', text: '«Осиное Гнездо»: Найдите и уничтожьте 5 Ос.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Охота на Шершней»: Найдите и уничтожьте 5 Шершней.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Сапёр»: Найдите и уничтожьте 5 Взрывоботов.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Пожарная Бригада»: Найдите и уничтожьте 5 Огнешаров.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Чистильщик»: Найдите и уничтожьте 10 Клещей.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Железный дозор»: Найдите и уничтожьте 2 Турели.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Последний наблюдатель»: Найдите и уничтожьте 1 Наблюдателя.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Истребление»: Уничтожьте 10 Наземных Роботов.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Жужжащая угроза»: Найдите и уничтожьте 10 Летающих Роботов.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Мастер-ключ»: Взломайте 2 Закрытые Двери.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Полевой ботаник»: Соберите 5 Коровяк.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Топливный кризис»: Найдите 1 Синтезированное Топливо.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Чуткий сигнал»: Найдите 3 Датчика.', author: null, legendary: 0 },
    { id: uid(), cat: 'pve', text: '«Падающая звезда»: Добудьте Воспламенитель «Комета».', author: null, legendary: 0 },

    // PvPvE (15)
    { id: uid(), cat: 'pvpve', text: '«Следы активности»: Найдите и уничтожьте роботов в каждой Желтой Зоне.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Маршрут через риск»: Посетите каждую Желтую и Красную зону на карте.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Вооружение»: Найдите Новое Оружие.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Падающая звезда»: Добудьте Воспламенитель «Комета».', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«На вершине мира»: Заберитесь на самую высокую точку на карте.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Точный бросок»: Уничтожьте Турель с Гранаты.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Вандализм»: Разбейте 3 Камеры Видеонаблюдения с помощью Кирки.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«До последнего рейдера»: Вызовите Эвакуацию и продержитесь до завершения Эвакуации (нельзя отходить дальше чем на 100 метров от эвакуации).', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Ритм выживания»: Изготовьте Маракас из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Самодельный огнемёт»: Изготовьте Пламенный Баллончик из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Громче всех»: Изготовьте Шумелку из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Полевая медицина»: Изготовьте Травяной Бинт из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Витаминный запас»: Изготовьте Фруктовый Микс из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Сладкая добыча»: Изготовьте Сок Агавы из подручных средств.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvpve', text: '«Не стреляйте!»: Изготовьте Белый Флаг из подручных средств.', author: null, legendary: 0 },

    // PvP (9)
    { id: uid(), cat: 'pvp', text: '«Голыми руками»: Нокаутируйте игрока с помощью кулака.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Быстрый старт»: Нанесите урон в первые 3 минуты рейда.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Без права на ошибку»: Не получайте урон в течение 3 минут после попадания по противнику.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Щитолом»: Сломайте щит двум противникам.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Первый выстрел»: Сбейте с ног рейдера в первые 5 минут рейда.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Горячая эвакуация»: Нанесите урон противнику возле Эвакуации.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Подручные средства»: Нанесите урон по противнику с помощью инструмента рейдера.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Контроль высоты»: Захватите и удерживайте верхний этаж в Желтой Зоне, пока не уничтожите 10 роботов.', author: null, legendary: 0 },
    { id: uid(), cat: 'pvp', text: '«Царь горы»: Захватите и удерживайте верхний этаж в Красной Зоне, пока не уничтожите 5 роботов.', author: null, legendary: 0 },
  ];

  // ── Legendary Contracts (10 points, once per season) ─────

  const legendaryContracts = [
    // Boosty legendary
    { id: uid(), cat: 'boosty', text: '«Легендарный Гренадер» (Архитектор Арены | Ex_Gamer_MtFk): Уничтожьте Бастиона или Бомбардира используя для этого только Легкие и Самонаводящиеся гранаты (без посторонней помощи).', author: 'Ex_Gamer_MtFk', legendary: 1 },
    { id: uid(), cat: 'boosty', text: '«Массакра» (Советник Арены | Red_Buddy): Убейте 3 Рейдеров в одном месте не дальше 10 метров друг от друга.', author: 'Red_Buddy', legendary: 1 },

    // PvE legendary (10)
    { id: uid(), cat: 'pve', text: '«Коллекционер»: Найдите 3 Дубликата Чертежей за один рейд.', author: null, legendary: 1, completed_by: 'СЛУЧАЙНЫЕ ПАССАЖИРЫ (MAKAR, JENIFER_POPEZ)', completed_at: '2026-06-24' },
    { id: uid(), cat: 'pve', text: '«Охотник за знаниями»: Найдите 5 Чертежей за один рейд.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Полевой исследователь»: Обыщите 10 ARC Зондов за один рейд.', author: null, legendary: 1, completed_by: 'СЛУЧАЙНЫЕ ПАССАЖИРЫ (MAKAR, JENIFER_POPEZ)', completed_at: '2026-06-24' },
    { id: uid(), cat: 'pve', text: '«Пацифист»: Выполните все задания раунда без использования оружия.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Фул Хаус»: Закончите рейд с Бурей, Рысью и Вулканом в одном рейде.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Железный запас»: Закончите рейд с 5 Наковальнями в одном рейде.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Взломщик Корпусов»: Закончите рейд с 3 Бронеломами в одном рейде.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Большой куш»: Закончите рейд с ценностью снаряжения свыше 250.000+.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Сердце Матриарха»: Закончите рейд с 3 Ядрами Матриарха в одном рейде.', author: null, legendary: 1 },
    { id: uid(), cat: 'pve', text: '«Сердце Королевы»: Закончите рейд с 3 Ядрами Королевы в одном рейде.', author: null, legendary: 1 },

    // PvP legendary (10)
    { id: uid(), cat: 'pvp', text: '«Охотник на рейдеров»: Убейте 5 Рейдеров за один рейд.', author: null, legendary: 1, completed_by: 'BELL', completed_at: '2026-06-22' },
    { id: uid(), cat: 'pvp', text: '«Элитный Снайпер»: Убейте Рейдера с расстояния 200+ метров.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Василий Зайцев»: Убейте 3 Рейдеров из Снайперской Винтовки Ястреб.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Тихая смерть»: Убейте 4 Рейдеров из Глушителя.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Двойной разрыв»: Сделайте двойное убийство гранатой.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Импульс»: Убейте 2 Рейдера после переката.', author: null, legendary: 1, completed_by: 'GOLYB_GENADYI', completed_at: '2026-06-26' },
    { id: uid(), cat: 'pvp', text: '«Питер Паркер»: Убейте 2 Рейдера после спуска с Зиплайна.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Из тени в бой»: Убейте 2 Рейдера после использования Крюка-Кошки.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Малыш»: Убейте 2 разных Рейдеров с пистолета Заколка.', author: null, legendary: 1 },
    { id: uid(), cat: 'pvp', text: '«Яблоко Ньютона»: Убейте 2 разных Рейдеров после получения урона от падения с высоты.', author: null, legendary: 1 },
  ];

  // ── Protocols ────────────────────────────────────────────

  const protocols = [
    // Boosty protocols
    { id: uid(), text: '«Протокол: Шумная Компания» (Архитектор Арены | Ex_Gamer_MtFk): Вы должны использовать Колесо Эмоций каждые две минуты.', author: 'Ex_Gamer_MtFk' },
    { id: uid(), text: '«Протокол: Персона Нон Грата» (Советник Арены | Red_Buddy): Вы не можете приближаться к Эвакуации пока не останется 2 минуты до конца рейда.', author: 'Red_Buddy' },

    // Standard protocols
    { id: uid(), text: '«Протокол: Один Дома»: Вы не можете взламывать Двери.', author: null },
    { id: uid(), text: '«Протокол: Швейцар»: Вы не можете закрывать за собой Двери.', author: null },
    { id: uid(), text: '«Протокол: Отказ Системы»: Вы не можете обыскивать Роботов ARC.', author: null },
    { id: uid(), text: '«Протокол: Агент 47»: Вы не можете обыскивать Оружейные Ящики.', author: null },
    { id: uid(), text: '«Протокол: Тихая Гавань»: Вы не можете обыскивать Ящики с Гранатами.', author: null },
    { id: uid(), text: '«Протокол: Болевой Порог»: Вы не можете обыскивать Медицинские Сумки.', author: null },
    { id: uid(), text: '«Протокол: Ненадежное Крепление»: Вы не можете пользоваться Желтыми Вертикальными Лестницами.', author: null },
    { id: uid(), text: '«Протокол: Слепая зона»: Вы не можете ломать Сигнализацию, Камеры видеонаблюдения и Металлодетекторы.', author: null },
    { id: uid(), text: '«Протокол: Незваный Гость»: Вы не можете проникать в здание через Дверь.', author: null },
    { id: uid(), text: '«Протокол: Отсутствие Улик»: Вы не можете обыскивать Убитых Рейдеров.', author: null },
    { id: uid(), text: '«Протокол: План-Б»: Вы не можете прятаться в Кустах.', author: null },
    { id: uid(), text: '«Протокол: Боязнь Высоты»: Вы не можете выходить на крышу.', author: null },
  ];

  const seasonId = 'season-2';
  let insertedRegular = 0;
  let insertedLegendary = 0;
  let insertedProtocols = 0;

  // Insert regular contracts
  for (let i = 0; i < regularContracts.length; i++) {
    const c = regularContracts[i];
    run(
      `INSERT INTO contracts (id, season_id, category, text, points, is_legendary, boosty_author, sort_order)
       VALUES (?, ?, ?, ?, 2, 0, ?, ?)`,
      [c.id, seasonId, c.cat, c.text, c.author, i + 1]
    );
    insertedRegular++;
  }

  // Insert legendary contracts
  for (let i = 0; i < legendaryContracts.length; i++) {
    const c = legendaryContracts[i];
    run(
      `INSERT INTO contracts (id, season_id, category, text, points, is_legendary, boosty_author, completed_by, completed_at, sort_order)
       VALUES (?, ?, ?, ?, 10, 1, ?, ?, ?, ?)`,
      [c.id, seasonId, c.cat, c.text, c.author, c.completed_by || null, c.completed_at || null, i + 1]
    );
    insertedLegendary++;
  }

  // Insert protocols
  for (let i = 0; i < protocols.length; i++) {
    const p = protocols[i];
    run(
      `INSERT INTO protocols (id, season_id, text, penalty_seconds, boosty_author, sort_order)
       VALUES (?, ?, ?, 60, ?, ?)`,
      [p.id, seasonId, p.text, p.author, i + 1]
    );
    insertedProtocols++;
  }

  console.log(`[migrate:003] seeded: ${insertedRegular} regular contracts, ${insertedLegendary} legendary contracts, ${insertedProtocols} protocols`);
}
