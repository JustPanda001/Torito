// UI text for the calendar area, in every site language. Merged into the main
// table by lib/i18n.js; a key missing here falls back to English.
//
// Keys ending One/Few/Many/Other are plural forms, picked with pluralForm()
// from lib/season.js: Russian uses all four, English and Georgian One/Other,
// Chinese only Other.
const strings = {
  en: {
    'cal.prevMonth': 'Previous month',
    'cal.nextMonth': 'Next month',
    'cal.today': 'Today',
    'cal.pastDay': 'This day has passed',
    'cal.unavailable': 'Not available on this day',
    'cal.rangeBlockedOne': 'This activity takes {n} day in a row, and one of those days is not available',
    'cal.rangeBlockedOther': 'This activity takes {n} days in a row, and one of those days is not available',
    'cal.daysOne': '{n} day',
    'cal.daysOther': '{n} days',
    'cal.rangeLabel': '{range} · {days}',
    'cal.pickStartOne': 'Tap the day you start. We mark all {n} day for you.',
    'cal.pickStartOther': 'Tap the day you start. We mark all {n} days for you.',
  },
  ka: {
    'cal.prevMonth': 'წინა თვე',
    'cal.nextMonth': 'შემდეგი თვე',
    'cal.today': 'დღეს',
    'cal.pastDay': 'ეს დღე უკვე გავიდა',
    'cal.unavailable': 'ამ დღეს ხელმისაწვდომი არ არის',
    'cal.rangeBlockedOne': 'აქტივობა ზედიზედ {n} დღე გრძელდება და ერთ-ერთი დღე ხელმისაწვდომი არ არის',
    'cal.rangeBlockedOther': 'აქტივობა ზედიზედ {n} დღე გრძელდება და ერთ-ერთი დღე ხელმისაწვდომი არ არის',
    'cal.daysOne': '{n} დღე',
    'cal.daysOther': '{n} დღე',
    'cal.rangeLabel': '{range} · {days}',
    'cal.pickStartOne': 'აირჩიე დაწყების დღე — ყველა {n} დღეს ჩვენ მოვნიშნავთ.',
    'cal.pickStartOther': 'აირჩიე დაწყების დღე — ყველა {n} დღეს ჩვენ მოვნიშნავთ.',
  },
  ru: {
    'cal.prevMonth': 'Предыдущий месяц',
    'cal.nextMonth': 'Следующий месяц',
    'cal.today': 'Сегодня',
    'cal.pastDay': 'Этот день уже прошёл',
    'cal.unavailable': 'В этот день недоступно',
    'cal.rangeBlockedOne': 'Поездка занимает {n} день подряд, а один из этих дней недоступен',
    'cal.rangeBlockedFew': 'Поездка занимает {n} дня подряд, а один из этих дней недоступен',
    'cal.rangeBlockedMany': 'Поездка занимает {n} дней подряд, а один из этих дней недоступен',
    'cal.rangeBlockedOther': 'Поездка занимает {n} дня подряд, а один из этих дней недоступен',
    'cal.daysOne': '{n} день',
    'cal.daysFew': '{n} дня',
    'cal.daysMany': '{n} дней',
    'cal.daysOther': '{n} дня',
    'cal.rangeLabel': '{range} · {days}',
    'cal.pickStartOne': 'Выберите день начала — мы отметим весь {n} день.',
    'cal.pickStartFew': 'Выберите день начала — мы отметим все {n} дня.',
    'cal.pickStartMany': 'Выберите день начала — мы отметим все {n} дней.',
    'cal.pickStartOther': 'Выберите день начала — мы отметим все {n} дня.',
  },
  zh: {
    'cal.prevMonth': '上个月',
    'cal.nextMonth': '下个月',
    'cal.today': '今天',
    'cal.pastDay': '这一天已经过去',
    'cal.unavailable': '当天不可预订',
    'cal.rangeBlockedOther': '该活动需连续 {n} 天，其中有一天不可预订',
    'cal.daysOther': '{n} 天',
    'cal.rangeLabel': '{range} · {days}',
    'cal.pickStartOther': '请选择出发日期，我们会为您标出全部 {n} 天。',
  },
};

export default strings;
