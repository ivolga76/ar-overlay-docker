// Rules page — tournament rules from Google Doc
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';

export const metadata: Metadata = {
  title: 'Правила турниров — AR Overlay',
  description: 'Правила турниров Arc Raiders «Битва за Респект». Формат, контракты, протоколы, усложнения, награды.',
};

export default function RulesPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Правила турниров"
        subtitle="Турниры по Arc Raiders 1×1 и 2×2 «Битва за Респект» от Денис Блим. Вся информация о формате, правилах и наградах."
        backHref="/"
        backLabel="На главную"
      />

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="flex flex-col gap-6">

          {/* Основная информация */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Основная информация</h2>
            <p className="text-text-body text-sm leading-relaxed mb-3">
              Турниры по Arc Raiders 1×1, 2×2: «Битва за Респект» от Денис Блим.
            </p>
            <p className="text-xs text-text-muted">
              Статус турнира: <span className="text-accent-green font-bold">Действующий</span>. Дата последнего обновления документа: 22 июня, 2026.
            </p>
          </DarkPanel>

          {/* Описание турнира */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Описание турнира</h2>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-4 mb-2">Турниры в Arc Raiders? Что это?</h3>
            <p className="text-text-body text-sm leading-relaxed">
              «Битва за Респект» — это серия эпических турниров по Arc Raiders, которые Денис Блим проводит в прямом эфире на Twitch и YouTube.
            </p>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Где я могу посмотреть турнир?</h3>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
              <li>Twitch</li>
              <li>YouTube</li>
            </ul>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Где я могу предложить свои идеи и обсудить турнир?</h3>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
              <li>Boosty</li>
              <li>Discord</li>
              <li>Telegram</li>
            </ul>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Где я могу посмотреть рейтинговую таблицу турнира?</h3>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
              <li>Сезон 2: Рейтинг 1×1</li>
              <li>Сезон 2: Рейтинг 2×2</li>
            </ul>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Где я могу посмотреть записи прошедших матчей?</h3>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
              <li>Сезон 2: Матчи 1×1</li>
              <li>Сезон 2: Матчи 2×2</li>
            </ul>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Где я могу посмотреть составы команд 2×2?</h3>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
              <li>Сезон 2: Команды 2×2</li>
            </ul>

            <p className="text-sm text-accent-primary mt-4 p-3 bg-bg-primary/50 rounded-lg">
              <strong>Новинка:</strong> Теперь вы можете выбирать карту, предлагать билды, придумывать задания и добавлять свои усложнения. Доступно только для Boosty подписчиков.
            </p>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Как проходит турнир?</h3>
            <p className="text-text-body text-sm leading-relaxed">
              Турниры проходят в формате: 1×1 и 2×2. Каждый турнир состоит из 1 раунда. Один раунд — это один рейд. Участники турнира участвуют в раундах по очереди. Средняя продолжительность турнира: 30 минут.
            </p>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Что происходит до начала турнира?</h3>
            <ul className="text-text-body text-sm space-y-2 list-disc list-inside">
              <li>Участники турнира пишут свой Embark ID в чат трансляции или самостоятельно добавляют организатора в друзья: twitch.denisblim#0157</li>
              <li>Каждый участник турнира пишет в чат трансляции количество часов в игре и свое лобби в последних матчах: PvP, PvE, PvPvE (смешанное). На основе этой информации зрители турнира могут выбрать себе фаворита и сделать прогноз на исход турнира, чтобы заработать баллы канала.</li>
              <li>Только для зрителей Twitch: Открывается прием прогнозов на исход турнира через баллы канала: зрители делают прогнозы какой игрок или команда одержит победу в турнире. Если ваша ставка сыграет, вы получите свои баллы назад, а также все баллы, которые зрители поставили на противоположную команду.</li>
              <li>Начинается важнейший этап: случайное распределение контрактов и активных протоколов среди участников турнира.</li>
            </ul>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Как проходят раунды?</h3>
            <p className="text-text-body text-sm leading-relaxed">
              Организатор приглашает участника турнира или команду из двух игроков в группу и запускает рейд. Задача участников — набрать как можно больше баллов в раунде. Баллы начисляются за успешное выполнение основных заданий раунда, контракты, контракты противника и легендарные контракты. Задания бывают разные: PvP, PvE или PvPvE (смешанные).
            </p>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Что такое основные задания раунда?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Основные задания раунда — это главные задания в раунде. Обычно их успешное выполнение дает наибольшее количество баллов в раунде.
            </p>
            <ul className="text-text-body text-sm space-y-2 list-disc list-inside">
              <li>Участники турнира получают одинаковые основные задания раунда.</li>
              <li>Основные задания раунда зависят от типа игроков участвующих в турнире. Если в этом турнире участвуют PvP игроки, то основные задания раунда будут способствовать PvP. Если PvE, то PvE. Если PvPvE, то PvPvE.</li>
              <li>Некоторые игроки предпочитают выполнять основные задания раунда в последнюю очередь, отдавая предпочтения контрактам и контрактам противника для получения первых баллов в раунде.</li>
            </ul>
          </DarkPanel>

          {/* Контракты */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Контракты</h2>

            <h3 className="text-sm font-heading font-bold text-text-primary mb-2">Что такое контракты?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Контракты — это отличная возможность набрать дополнительные баллы в раунде.
            </p>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside mb-4">
              <li>Участники получают по два случайных контракта перед началом раунда.</li>
              <li>Участники турнира могут выполнять контракты друг друга. Если один из участников не выполнил свой контракт, но его выполнил его противник, то он получит 1 балл за выполнение контракта противника.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-primary uppercase tracking-wider mt-5 mb-3">Контракты от подписчиков Boosty (2 балла)</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside">
              <li>«Архитектор Арены» | Ex_Gamer_MtFk: «Смешарики»: Найдите и отметьте с помощью Химических фонарей 10 шарообразных объектов.</li>
              <li>«Советник Арены» | Red_Buddy: «Нелегальный оборот»: Добудьте 3 разных предмета Эпического Качества.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-green uppercase tracking-wider mt-5 mb-3">PvE-контракты (2 балла)</h4>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside columns-1 sm:columns-2 gap-x-6">
              <li>«Осиное Гнездо»: Найдите и уничтожьте 5 Ос.</li>
              <li>«Охота на Шершней»: Найдите и уничтожьте 5 Шершней.</li>
              <li>«Сапёр»: Найдите и уничтожьте 5 Взрывоботов.</li>
              <li>«Пожарная Бригада»: Найдите и уничтожьте 5 Огнешаров.</li>
              <li>«Чистильщик»: Найдите и уничтожьте 10 Клещей.</li>
              <li>«Железный дозор»: Найдите и уничтожьте 3 Турели.</li>
              <li>«Последний наблюдатель»: Найдите и уничтожьте 1 Наблюдателя.</li>
              <li>«Истребление»: Уничтожьте 10 Наземных Роботов.</li>
              <li>«Жужжащая угроза»: Найдите и уничтожьте 10 Летающих Роботов.</li>
              <li>«Мастер-ключ»: Взломайте 3 Закрытые Двери.</li>
              <li>«Полевой ботаник»: Соберите 10 Коровяк.</li>
              <li>«Топливный кризис»: Найдите 1 Синтезированные Топливо.</li>
              <li>«Чуткий сигнал»: Найдите 5 Датчиков.</li>
              <li>«Падающая звезда»: Добудьте Запальное Устройство «Кометы».</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-cyan uppercase tracking-wider mt-5 mb-3">PvPvE-контракты (2 балла)</h4>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside columns-1 sm:columns-2 gap-x-6">
              <li>«Следы активности»: Найдите и уничтожьте роботов в каждой Желтой Зоне.</li>
              <li>«Маршрут через риск»: Посетите каждую Желтую и Красную зону на карте.</li>
              <li>«Вооружение»: Найдите Новое Оружие.</li>
              <li>«Падающая звезда»: Добудьте Воспламенитель «Комета».</li>
              <li>«На вершине мира»: Заберитесь на самую высокую точку на карте.</li>
              <li>«Точный бросок»: Уничтожьте Турель с Гранаты.</li>
              <li>«Вандализм»: Разбейте 3 Камеры Видеонаблюдения с помощью Кирки.</li>
              <li>«До последнего рейдера»: Вызовите Эвакуацию и продержитесь до завершения Эвакуации.</li>
              <li>«Ритм выживания»: Изготовьте Маракас из подручных средств.</li>
              <li>«Самодельный огнемёт»: Изготовьте Пламенный Баллончик из подручных средств.</li>
              <li>«Громче всех»: Изготовьте Шумелку из подручных средств.</li>
              <li>«Полевая медицина»: Изготовьте 2 Травяных Бинта из подручных средств.</li>
              <li>«Витаминный запас»: Изготовьте Фруктовый Микс из подручных средств.</li>
              <li>«Сладкая добыча»: Изготовьте Сок Агавы из подручных средств.</li>
              <li>«Не стреляйте!»: Изготовьте Белый Флаг из подручных средств.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-gold uppercase tracking-wider mt-5 mb-3">PvP-контракты (2 балла)</h4>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside columns-1 sm:columns-2 gap-x-6">
              <li>«Голыми руками»: Нокаутируйте игрока с помощью кулака.</li>
              <li>«Быстрый старт»: Нанесите урон в первые 3 минуты рейда.</li>
              <li>«Без права на ошибку»: Не получайте урон в течение 3 минут после попадания по противнику.</li>
              <li>«Щитолом»: Сломайте щит двум противникам.</li>
              <li>«Первый выстрел»: Сбейте с ног рейдера в первые 5 минут рейда.</li>
              <li>«Горячая эвакуация»: Нанесите урон противнику возле Эвакуации.</li>
              <li>«Подручные средства»: Нанесите урон по противнику с помощью инструмента рейдера.</li>
              <li>«Контроль высоты»: Захватите и удерживайте верхний этаж в Желтой Зоне.</li>
              <li>«Царь горы»: Захватите и удерживайте верхний этаж в Красной Зоне.</li>
            </ul>
          </DarkPanel>

          {/* Легендарные контракты */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Легендарные контракты</h2>

            <h3 className="text-sm font-heading font-bold text-text-primary mb-2">Что такое легендарные контракты?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Легендарные контракты — это что-то невероятное, недостижимое, что-то что под силу выполнить только самым лучшим игрокам турнира. Они отличаются от обычных контрактов тем, что их можно выполнить в любое время и в любом турнире.
            </p>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside mb-4">
              <li>Любой игрок может выполнить любой легендарный контракт в любом турнире.</li>
              <li>За выполнение легендарного контракта выдается уникальная роль в Discord-канале и в документ вносится ник игрока, которому удалось выполнить этот контракт. После этого контракт больше не будет доступен для выполнения.</li>
              <li>За выполнение легендарного контракта начисляется 10 баллов.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-gold uppercase tracking-wider mt-5 mb-3">Легендарные контракты Boosty (10 баллов)</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside">
              <li>«Архитектор Арены» | Ex_Gamer_MtFk: «Легендарный Гренадер»: Уничтожьте Бастиона или Бомбардира используя только Легкие и Самонаводящиеся гранаты.</li>
              <li>«Советник Арены» | Red_Buddy: «Массакра»: Убейте 3 Команды в одном месте не дальше 20 метров друг от друга.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-gold uppercase tracking-wider mt-5 mb-3">Легендарные PvE-контракты (10 баллов)</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside">
              <li>«Коллекционер»: Найдите 3 Дубликата Чертежей за один рейд.</li>
              <li>«Охотник за знаниями»: Найдите 5 Чертежей за один рейд.</li>
              <li>«Полевой исследователь»: Обыщите 10 ARC Зондов за один рейд. <span className="text-xs text-accent-green">ВЫПОЛНЕН 24.06.2026 командой «СЛУЧАЙНЫЕ ПАССАЖИРЫ» (MAKAR, JENIFER_POPEZ)</span></li>
              <li>«Пацифист»: Выполните все задания раунда без использования оружия.</li>
              <li>«Фул Хаус»: Закончите рейд с Бурей, Рысью и Вулканом в одном рейде.</li>
              <li>«Железный запас»: Закончите рейд с 5 Наковальнями в одном рейде.</li>
              <li>«Взломщик Корпусов»: Закончите рейд с 3 Бронеломами в одном рейде.</li>
              <li>«Большой куш»: Закончите рейд с ценностью снаряжения свыше 250.000+.</li>
              <li>«Сердце Матриарха»: Закончите рейд с 3 Ядрами Матриарха в одном рейде.</li>
              <li>«Сердце Королевы»: Закончите рейд с 3 Ядрами Королевы в одном рейде.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-gold uppercase tracking-wider mt-5 mb-3">Легендарные PvP-контракты (10 баллов)</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside">
              <li>«Чистое убийство»: Убейте рейдера, не получив урона.</li>
              <li>«Ниндзя»: Убейте рейдера с помощью кирки.</li>
              <li>«Снайпер»: Убейте рейдера с расстояния более 200 метров.</li>
              <li>«Разрушитель»: Уничтожьте эвакуационный корабль противника.</li>
              <li>«Король ринга»: Убейте рейдера с помощью кулаков (без оружия и гранат).</li>
            </ul>
          </DarkPanel>

          {/* Активные протоколы */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Активные протоколы</h2>

            <h3 className="text-sm font-heading font-bold text-text-primary mb-2">Что такое активные протоколы?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Активные протоколы — это ограничения, накладываемые на участников турнира. Они делают турнир сложнее и интереснее. Каждый участник получает случайный активный протокол перед началом раунда.
            </p>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside mb-4">
              <li>Штраф за нарушение активного протокола: 60 секунд (игрок должен стоять на месте).</li>
              <li>Нарушения фиксируются организатором турнира и зрителями в чате.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-primary uppercase tracking-wider mt-5 mb-3">Список активных протоколов</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside columns-1 sm:columns-2 gap-x-6">
              <li>Не использовать укрытия.</li>
              <li>Не использовать аптечки.</li>
              <li>Не использовать гранаты.</li>
              <li>Не использовать усилители.</li>
              <li>Не использовать способности щита.</li>
              <li>Не подбирать оружие с земли.</li>
              <li>Не использовать быстрое перемещение.</li>
              <li>Не заходить в здания.</li>
              <li>Не использовать транспорт.</li>
              <li>Не приседать.</li>
              <li>Не прыгать.</li>
              <li>Не использовать веревку.</li>
              <li>Не использовать фонари.</li>
              <li>Не использовать рейдерскую ракету.</li>
              <li>Не убивать роботов определенного типа.</li>
              <li>Не использовать определенный тип оружия.</li>
            </ul>
          </DarkPanel>

          {/* Усложнения */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Усложнения</h2>

            <h3 className="text-sm font-heading font-bold text-text-primary mb-2">Что такое усложнения?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Усложнения — это дополнительные условия, которые делают раунд сложнее для обоих участников. В отличие от активных протоколов, усложнения применяются ко всем участникам турнира одновременно.
            </p>
            <ul className="text-text-body text-sm space-y-1 list-disc list-inside mb-4">
              <li>Усложнения предлагаются зрителями через Boosty.</li>
              <li>Организатор выбирает несколько усложнений на турнир.</li>
            </ul>

            <h4 className="text-xs font-heading font-bold text-accent-primary uppercase tracking-wider mt-5 mb-3">Примеры усложнений</h4>
            <ul className="text-text-body text-sm space-y-1.5 list-disc list-inside columns-1 sm:columns-2 gap-x-6">
              <li>Запрет на использование определенного оружия.</li>
              <li>Обязательное использование определенного оружия.</li>
              <li>Запрет на лутинг контейнеров.</li>
              <li>Запрет на использование карты.</li>
              <li>Обязательное посещение всех зон карты.</li>
              <li>Ограничение по времени на выполнение заданий.</li>
              <li>Обязательное убийство определенного босса.</li>
              <li>Запрет на использование способностей.</li>
            </ul>
          </DarkPanel>

          {/* Награды и развитие */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Что происходит после турнира?</h2>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              По окончанию турнира, организатор заносит результаты встречи в турнирную таблицу, участники турнира получают или теряют очки MMR, в зависимости от результата. Все игроки навсегда вписывают свое имя в историю игры Arc Raiders, получают любовь и поддержку в чате, выбирают награду и получают уникальную роль в нашем Discord-сервере.
            </p>

            <h3 className="text-sm font-heading font-bold text-text-primary mt-5 mb-2">Какие бывают награды за победу и за участие?</h3>
            <p className="text-text-body text-sm leading-relaxed mb-2">
              Любые чертежи или оружие или редкие ключи. Из общего призового фонда первым награду выбирает победитель турнира или победившая команда. После этого награду выбирает проигравший участник турнира или команда. Подарки получают и победители и проигравшие.
            </p>

            <div className="mt-4 p-4 bg-bg-primary/50 rounded-lg border border-[rgba(96,128,255,0.15)]">
              <p className="text-sm text-text-primary mb-2"><strong>Важно:</strong></p>
              <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
                <li>За участие на турнире игрок получает роль <span className="text-accent-cyan font-bold">«Гладиатор»</span> и особый цвет ника в нашем Discord-сервере.</li>
                <li>За победу в турнире игрок получает роль <span className="text-accent-gold font-bold">«Чемпион»</span> и особый цвет ника.</li>
              </ul>
            </div>
          </DarkPanel>

          {/* FAQ */}
          <DarkPanel className="p-6">
            <h2 className="heading-label mb-4">Популярные вопросы</h2>

            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">Как правильно выполнять задания?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Это вам решать. Участник турнира имеет полную свободу действий и полную песочницу. Вы можете использовать все свои навыки и знания для выполнения заданий и для победы в раунде. Покажите свой стиль игры и удивите всех.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А что если я только PvE игрок?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Если вы PvE игрок, то ваш оппонент в турнире будет тоже PvE игрок. Все задания в таком случае будут чисто PvE. Без какой-либо PvP составляющей.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А можно обыскивать контейнеры/людей и лутаться?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Да, в раунде участникам можно лутаться без ограничений. Если организатор анонсировал частичный или полный запрет на лутинг в раунде, то лутаться запрещено.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А можно использовать голосовой чат?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Участник турнира может использовать голосовой чат без ограничений. Например, для решения игровых ситуаций внутри рейда через дипломатию.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А можно использовать ключи рейдера?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Ключи рейдера можно использовать, но только если вы сами их скрафтили внутри рейда. Приносить ключи рейдера с собой в раунд нельзя.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">На каких картах проходит турнир?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Турнирные матчи проходят на всех картах и на всех условиях на карте. Например: Космопорт, Погребенный Город (Город Птиц) или на карте Стелла Монтис (Ночь).
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">На каком билде проходит турнир?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Билд участников турнира определяет организатор турнира: Денис Блим — @denisblim.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">Что можно взять с собой в раунд?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Участник турнира может взять с собой в раунд только два предмета: любой Усилитель и любой Щит. Только эти два предмета. Выбирайте комбинацию усилителя и щита под свой стиль игры для наилучшего результата в раунде.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А что насчет остального билда?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Оружие, патроны, бинты, гранаты и все необходимое для выполнения заданий раунда участник турнира получит от организатора в начале рейда. Взять с собой можно только усилитель и щит.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">Как понять кто выиграл?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Кто наберет больше баллов в раунде, тот и выиграл.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">Как записаться и принять участие в турнире?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Чтобы принять участие достаточно написать в чат трансляции (на Twitch или YouTube), что вы сегодня хотите поучаствовать в турнире. Если турнир в этот день еще не начался, не проходил и есть свободные места, то Денис скажет, что теперь вы являетесь участником турнира. Еще вы можете записаться на турнир заранее в текстовом канале «запись на турнир» в нашем Discord-сервере.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-heading font-bold text-text-primary mb-1">А где ответ на мой вопрос?</h3>
                <p className="text-text-body text-sm leading-relaxed">
                  Если ответа на ваш вопрос пока здесь нет, то задайте ваш вопрос в чате на стриме или в нашем Discord-сервере и я с радостью на него отвечу и помогу вам.
                </p>
              </div>
            </div>
          </DarkPanel>

          {/* Footer note */}
          <p className="text-center text-text-muted text-xs mt-4">
            Организатор: Денис Блим · twitch.tv/denisblim · Документ обновлён 22 июня 2026
          </p>

        </div>
      </section>
    </main>
  );
}
