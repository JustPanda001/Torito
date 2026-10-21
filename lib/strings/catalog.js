// UI text for the catalog area (activities listing, filters, trip cards), in
// every site language. Merged into the main table by lib/i18n.js, after the
// base table, so a key here wins over the same key there. A key missing here
// falls back to English.
const strings = {
  en: {
    'listing.title': 'Activities',
    'listing.count': 'Activities · {n} available',
    'listing.none': 'No activities match those filters. Try a wider date range or clear the filters.',
    'listing.allYear': 'All year',
    'listing.badgeTop': 'TOP',
    'listing.badgeNew': 'NEW',

    'filter.group.ski': 'On snow',
    'filter.any.ski': 'Everything winter',
    'filter.winter.lessons': 'Instructors & schools',
    'filter.winter.freeride': 'Freeride',
    'filter.winter.freestyle': 'Freestyle',
    'filter.winter.snowmobile': 'Snowmobile rides',
    'filter.winter.paragliding': 'Paragliding',

    'filter.group.difficulty': 'Difficulty',
    'filter.any.difficulty': 'Any difficulty',
    'filter.diff.easy': 'Easy',
    'filter.diff.intermediate': 'Intermediate',
    'filter.diff.hard': 'Hard',

    'filter.group.length': 'Trip length',
    'filter.any.length': 'Any length',
    'filter.len.short': '1 – 2 days',
    'filter.len.mid': '3 – 4 days',
    'filter.len.long': '5+ days',

    'filter.group.size': 'Group size',
    'filter.any.size': 'Any group size',
    'filter.size.small': '1 – 2 people',
    'filter.size.mid': '3 – 5 people',
    'filter.size.large': '5+ people',
  },

  ka: {
    'listing.title': 'აქტივობები',
    'listing.count': 'აქტივობები · ხელმისაწვდომია {n}',
    'listing.none': 'ამ ფილტრებით აქტივობა ვერ მოიძებნა. სცადეთ უფრო ფართო პერიოდი ან გაასუფთავეთ ფილტრები.',
    'listing.allYear': 'მთელი წელი',
    'listing.badgeTop': 'ტოპი',
    'listing.badgeNew': 'ახალი',

    'filter.group.ski': 'თოვლზე',
    'filter.any.ski': 'მთელი ზამთარი',
    'filter.winter.lessons': 'ინსტრუქტორები და სკოლები',
    'filter.winter.freeride': 'ფრირაიდი',
    'filter.winter.freestyle': 'ფრისტაილი',
    'filter.winter.snowmobile': 'თოვლმავლით გასეირნება',
    'filter.winter.paragliding': 'პარაგლაიდინგი',

    'filter.group.difficulty': 'სირთულე',
    'filter.any.difficulty': 'ნებისმიერი სირთულე',
    'filter.diff.easy': 'მარტივი',
    'filter.diff.intermediate': 'საშუალო',
    'filter.diff.hard': 'რთული',

    'filter.group.length': 'ხანგრძლივობა',
    'filter.any.length': 'ნებისმიერი ხანგრძლივობა',
    'filter.len.short': '1 – 2 დღე',
    'filter.len.mid': '3 – 4 დღე',
    'filter.len.long': '5+ დღე',

    'filter.group.size': 'ჯგუფის ზომა',
    'filter.any.size': 'ნებისმიერი ზომა',
    'filter.size.small': '1 – 2 ადამიანი',
    'filter.size.mid': '3 – 5 ადამიანი',
    'filter.size.large': '5+ ადამიანი',
  },

  ru: {
    'listing.title': 'Активности',
    'listing.count': 'Активности · доступно: {n}',
    'listing.none': 'По этим фильтрам ничего не найдено. Попробуйте выбрать более широкий период или сбросьте фильтры.',
    'listing.allYear': 'Круглый год',
    'listing.badgeTop': 'ТОП',
    'listing.badgeNew': 'НОВОЕ',

    'filter.group.ski': 'На снегу',
    'filter.any.ski': 'Вся зима',
    'filter.winter.lessons': 'Инструкторы и школы',
    'filter.winter.freeride': 'Фрирайд',
    'filter.winter.freestyle': 'Фристайл',
    'filter.winter.snowmobile': 'Прогулки на снегоходах',
    'filter.winter.paragliding': 'Параплан',

    'filter.group.difficulty': 'Сложность',
    'filter.any.difficulty': 'Любая сложность',
    'filter.diff.easy': 'Лёгкий',
    'filter.diff.intermediate': 'Средний',
    'filter.diff.hard': 'Сложный',

    'filter.group.length': 'Длительность',
    'filter.any.length': 'Любая длительность',
    'filter.len.short': '1–2 дня',
    'filter.len.mid': '3–4 дня',
    'filter.len.long': '5+ дней',

    'filter.group.size': 'Размер группы',
    'filter.any.size': 'Любой размер группы',
    'filter.size.small': '1–2 человека',
    'filter.size.mid': '3–5 человек',
    'filter.size.large': '5+ человек',
  },

  zh: {
    'listing.title': '活动',
    'listing.count': '活动 · 共 {n} 项可选',
    'listing.none': '没有符合这些筛选条件的活动。请试试更宽的日期范围，或清除筛选。',
    'listing.allYear': '全年',
    'listing.badgeTop': '热门',
    'listing.badgeNew': '新上线',

    'filter.group.ski': '雪上项目',
    'filter.any.ski': '全部冬季项目',
    'filter.winter.lessons': '教练与学校',
    'filter.winter.freeride': '野雪',
    'filter.winter.freestyle': '自由式',
    'filter.winter.snowmobile': '雪地摩托',
    'filter.winter.paragliding': '滑翔伞',

    'filter.group.difficulty': '难度',
    'filter.any.difficulty': '任意难度',
    'filter.diff.easy': '轻松',
    'filter.diff.intermediate': '中等',
    'filter.diff.hard': '较难',

    'filter.group.length': '行程天数',
    'filter.any.length': '任意天数',
    'filter.len.short': '1–2 天',
    'filter.len.mid': '3–4 天',
    'filter.len.long': '5 天以上',

    'filter.group.size': '团队人数',
    'filter.any.size': '任意人数',
    'filter.size.small': '1–2 人',
    'filter.size.mid': '3–5 人',
    'filter.size.large': '5 人以上',
  },
};

export default strings;
