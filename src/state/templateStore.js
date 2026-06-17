const TEMPLATE_KEY = 'battle-for-respect:templates:v2';

const DEFAULT_TEMPLATES = {
  tasks: [
    // --- Задания от подписчиков Boosty (2 балла) ---
    { id: 'tpl-task-01', text: 'Ex_Gamer_MtFk | «Архитектор Арены»: Убейте 5 Клещей с помощью Инструмента Рейдера (кирки).', points: 2 },
    { id: 'tpl-task-02', text: 'Red_Buddy | «Советник Арены»: Взорвите Клеща или Измельчителя с помощью мины Дедлайн.', points: 2 },
    { id: 'tpl-task-03', text: 'Golyb_Genadyi | «Страж Арены»: Получите любой предмет в подарок от незнакомого Рейдера.', points: 2 },
    { id: 'tpl-task-04', text: 'Xjocker88 | «Страж Арены»: Убейте 1 Рейдера и поставьте на его место Белый Флаг.', points: 2 },

    // --- Остальные задания (1 балл) — PvE ---
    { id: 'tpl-task-05', text: 'Уничтожьте 1 Часового и полностью его обыщите.', points: 1 },
    { id: 'tpl-task-06', text: 'Уничтожьте 2 Турели и полностью их обыщите.', points: 1 },
    { id: 'tpl-task-07', text: 'Уничтожьте 4 Осы и полностью их обыщите.', points: 1 },
    { id: 'tpl-task-08', text: 'Уничтожьте 4 Шершня и полностью их обыщите.', points: 1 },
    { id: 'tpl-task-09', text: 'Уничтожьте 4 Огнешара и полностью их обыщите.', points: 1 },
    { id: 'tpl-task-10', text: 'Уничтожьте 4 Взрывобота и полностью их обыщите.', points: 1 },
    { id: 'tpl-task-11', text: 'Уничтожьте 4 Клеща и полностью их обыщите.', points: 1 },

    // --- Остальные задания (1 балл) — PvP ---
    { id: 'tpl-task-12', text: 'Обыщите рейдера (сбивать с ног или нокаутировать не обязательно).', points: 1 },
    { id: 'tpl-task-13', text: 'Нанесите урон по игроку в первые 5 минут раунда (сбивать с ног или нокаутировать не обязательно).', points: 1 },
    { id: 'tpl-task-14', text: 'Нанесите урон по 2 разным игрокам в одном раунде (сбивать с ног или нокаутировать не обязательно).', points: 1 },
    { id: 'tpl-task-15', text: 'Выживите после PvP-контакта в течение 1 минуты (сбивать с ног или нокаутировать не обязательно).', points: 1 },

    // --- Остальные задания (2 балла) — PvE ---
    { id: 'tpl-task-16', text: 'Уничтожьте 2 Светлячка и полностью их обыщите.', points: 2 },
    { id: 'tpl-task-17', text: 'Уничтожьте 2 Кометы и полностью их обыщите.', points: 2 },
    { id: 'tpl-task-18', text: 'Уничтожьте 2 Измельчителя и полностью их обыщите.', points: 2 },
    { id: 'tpl-task-19', text: 'Уничтожьте 3 Наводчика и полностью их обыщите.', points: 2 },
    { id: 'tpl-task-20', text: 'Уничтожьте 3 Стукача и полностью их обыщите.', points: 2 },

    // --- Остальные задания (2 балла) — PvP ---
    { id: 'tpl-task-21', text: 'Нанесите урон по игроку в первые 3 минуты раунда (сбивать с ног или нокаутировать не обязательно).', points: 2 },
    { id: 'tpl-task-22', text: 'Выживите после PvP-контакта в течение 3 минут.', points: 2 },
    { id: 'tpl-task-23', text: 'Убейте 1 рейдера: сбейте с ног и добейте.', points: 2 },
    { id: 'tpl-task-24', text: 'Обыщите 3 рейдера (сбивать с ног или нокаутировать не обязательно).', points: 2 },
    { id: 'tpl-task-25', text: 'Нанесите урон по 3 разным игрокам в одном раунде (сбивать с ног или нокаутировать не обязательно).', points: 2 },
  ],

  complications: [
    // --- Усложнения от подписчиков Boosty ---
    { id: 'tpl-comp-01', text: 'Ex_Gamer_MtFk | «Архитектор Арены»: Ваши оппоненты вызывают на дуэль Светлячка. При контакте со Светлячком нужно бросить приманку под ноги и не перемещаться 5 секунд.' },
    { id: 'tpl-comp-02', text: 'Red_Buddy | «Советник Арены»: Ваши оппоненты боятся Клещей, Огнешаров и Взрывоботов и не могут их убивать.' },

    // --- Остальные усложнения ---
    { id: 'tpl-comp-03', text: 'Ваши оппоненты начинают рейд с выстрела и запуска одной Рейдерской Ракеты.' },
    { id: 'tpl-comp-04', text: 'Ваши оппоненты начинают рейд с Первого Задания Раунда.' },
    { id: 'tpl-comp-05', text: 'Ваши оппоненты начинают рейд с половиной Патронов.' },
    { id: 'tpl-comp-06', text: 'Ваши оппоненты не могут использовать Фонарик.' },
    { id: 'tpl-comp-07', text: 'Ваши оппоненты не могут использовать Колесо Эмоций.' },
    { id: 'tpl-comp-08', text: 'Ваши оппоненты всегда с включенным Фонариком.' },
    { id: 'tpl-comp-09', text: 'Ваши оппоненты не могут обыскивать Шкафчики Безопасности.' },
    { id: 'tpl-comp-10', text: 'Ваши оппоненты не могут обыскивать Оружейные Ящики.' },
    { id: 'tpl-comp-11', text: 'Ваши оппоненты не могут обыскивать Ящики с Гранатами.' },
    { id: 'tpl-comp-12', text: 'Ваши оппоненты не могут обыскивать Медицинские Сумки.' },
    { id: 'tpl-comp-13', text: 'Ваши оппоненты могут ломать Камеры, Сигнализации, Металлодетекторы только в ближнем бою.' },
    { id: 'tpl-comp-14', text: 'Ваши оппоненты не могут пользоваться Желтыми Вертикальными Лестницами.' },
    { id: 'tpl-comp-15', text: 'Ваши оппоненты не могут пользоваться Зиплайнами.' },
    { id: 'tpl-comp-16', text: 'Ваши оппоненты не могут вызывать и обыскивать Припасы с Воздуха.' },
  ],
};

function load() {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return structuredClone(DEFAULT_TEMPLATES);
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_TEMPLATES.tasks,
      complications: Array.isArray(parsed.complications) ? parsed.complications : DEFAULT_TEMPLATES.complications,
    };
  } catch {
    return structuredClone(DEFAULT_TEMPLATES);
  }
}

function save(templates) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

export function getTemplates() {
  return load();
}

export function addTaskTemplate(text, points = 1) {
  const templates = load();
  templates.tasks.push({ id: `tpl-task-${crypto.randomUUID().slice(0, 8)}`, text, points });
  save(templates);
  return templates;
}

export function updateTaskTemplate(id, updates) {
  const templates = load();
  templates.tasks = templates.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  save(templates);
  return templates;
}

export function removeTaskTemplate(id) {
  const templates = load();
  templates.tasks = templates.tasks.filter((t) => t.id !== id);
  save(templates);
  return templates;
}

export function addComplicationTemplate(text) {
  const templates = load();
  templates.complications.push({ id: `tpl-comp-${crypto.randomUUID().slice(0, 8)}`, text });
  save(templates);
  return templates;
}

export function updateComplicationTemplate(id, text) {
  const templates = load();
  templates.complications = templates.complications.map((c) => (c.id === id ? { ...c, ...text } : c));
  save(templates);
  return templates;
}

export function removeComplicationTemplate(id) {
  const templates = load();
  templates.complications = templates.complications.filter((c) => c.id !== id);
  save(templates);
  return templates;
}

export function resetTemplates() {
  save(structuredClone(DEFAULT_TEMPLATES));
  return structuredClone(DEFAULT_TEMPLATES);
}
