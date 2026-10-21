// UI text for the home area (home page, hot strip, footer, offline banner,
// dialog close buttons), in every site language. Merged into the main table by
// lib/i18n.js, after the base table, so a key here wins over the same key
// there. A key missing here falls back to English.
//
// Hikes, camping and climbs are shown but cannot be booked this season, so the
// copy about them describes the routes and never promises a booking.
const strings = {
  en: {
    'hero.sub': 'Ski & snowboard instructors, freeride, snowmobiles and paragliding in Gudauri, plus transfers and mountain routes across Georgia',

    'home.laterNote': 'Booking is closed this season. You can look at the routes and ask us about next time.',

    'home.winter.alt': 'Skiing in Gudauri',
    'home.winter.tag': 'Winter season',
    'home.winter.title': 'Winter in Gudauri',
    'home.winter.text': 'Certified ski and snowboard instructors and schools for a first week on snow, freeride guiding in the wide open bowls above Gudauri, snowmobile rides up toward the Cross Pass, and tandem paragliding flights over the slopes when the wind is right.',
    'home.winter.more': 'See winter activities',

    'home.hiking.alt': 'Hiking in the Georgian mountains',
    'home.hiking.tag': 'Guided treks',
    'home.hiking.title': 'Hiking',
    'home.hiking.text': 'Multi-day treks through Georgia’s high mountains, from alpine peaks and glaciers to ancient valleys, on the trails of Svaneti, Kazbegi, Tusheti and beyond.',
    'home.hiking.more': 'See the hikes',

    'home.camping.alt': 'Camping in the mountains',
    'home.camping.tag': 'Nights outside',
    'home.camping.title': 'Camping',
    'home.camping.text': 'Lakeside camps, canyon nights and high meadows, with the tents, the fire and the pitch taken care of.',
    'home.camping.more': 'See the camping trips',

    'home.climb.alt': 'Mount Kazbek',
    'home.climb.tag': 'Summer season',
    'home.climb.title': 'Mountaineering',
    'home.climb.text': 'Guided summits in the Caucasus, including Kazbek at 5,054 m, with acclimatisation days, glacier school and a reserve day built in.',
    'home.climb.more': 'See the climbs',

    'home.transfer.alt': 'Transfers across Georgia',
    'home.transfer.tag': 'Available now',
    'home.transfer.title': 'Transfer',
    'home.transfer.text': 'Airport pickups and transfers to the trailhead, the resort or the next region, for anything from a pair to a full minibus. Choose your route and book online.',
    'home.transfer.more': 'See transfers',

    'hot.kicker': 'Hot right now',
    'hot.title1': 'Experience',
    'hot.title2': 'Top Activities',
    'hot.in.winter': 'in Winter',
    'hot.in.spring': 'in Spring',
    'hot.in.summer': 'in Summer',
    'hot.in.autumn': 'in Autumn',
    'hot.lead.winter': 'Winter in Georgia is snow season. Gudauri and Bakuriani fill up with skiers and snowboarders, the passes turn white, and the mountain villages are at their quietest and most beautiful.',
    'hot.lead.spring': 'Spring is when Georgia turns green again. The lower trails open first, the valleys are full of wildflowers, and the wine country is warm long before the mountains are.',
    'hot.lead.summer': 'Summer in Georgia is a season of excitement and active fun. Long days in the high mountains, camping under clear skies, rivers to raft and ridge walks that stay open into the evening.',
    'hot.lead.autumn': 'Autumn is harvest season. The trails are empty and golden, the air is sharp in the mornings, and Kakheti is in the middle of the grape picking.',
    'hot.cta': 'Discover activities',
    'hot.views': '{n} views',

    'footer.tagline': 'Ski instructors, transfers and mountain activities in Georgia.',
    'footer.location': 'Tbilisi, Georgia',

    'offline.message': 'Not connected to the database. Signing in, creating an account and saving changes will not work — the trips shown are sample data.',
    'offline.dismiss': 'Dismiss',
    'site.close': 'Close',
  },

  ka: {
    'hero.sub': 'თხილამურისა და სნოუბორდის ინსტრუქტორები, ფრირაიდი, თოვლმავლები და პარაგლაიდინგი გუდაურში, ასევე ტრანსფერები და სამთო მარშრუტები მთელ საქართველოში',

    'home.laterNote': 'ამ სეზონზე ჯავშანი დახურულია. მარშრუტები შეგიძლიათ დაათვალიეროთ და მომავალზე გვკითხოთ.',

    'home.winter.alt': 'სრიალი გუდაურში',
    'home.winter.tag': 'ზამთრის სეზონი',
    'home.winter.title': 'ზამთარი გუდაურში',
    'home.winter.text': 'სერტიფიცირებული თხილამურისა და სნოუბორდის ინსტრუქტორები და სკოლები თოვლზე პირველი კვირისთვის, ფრირაიდი გიდთან ერთად გუდაურის ზემოთ ფართო ციცაბოებზე, თოვლმავლით გასეირნება ჯვრის უღელტეხილისკენ და ტანდემ პარაგლაიდინგი ფერდობებზე, როცა ქარი ხელს გვიწყობს.',
    'home.winter.more': 'ნახე ზამთრის აქტივობები',

    'home.hiking.alt': 'ლაშქრობა საქართველოს მთებში',
    'home.hiking.tag': 'გიდით ლაშქრობები',
    'home.hiking.title': 'ლაშქრობა',
    'home.hiking.text': 'მრავალდღიანი ლაშქრობები საქართველოს მაღალმთიანეთში: ალპური მწვერვალებიდან და მყინვარებიდან უძველეს ხეობებამდე, სვანეთის, ყაზბეგის, თუშეთისა და სხვა კუთხეების ბილიკებზე.',
    'home.hiking.more': 'ნახე ლაშქრობები',

    'home.camping.alt': 'კემპინგი მთაში',
    'home.camping.tag': 'ღამეები ღია ცის ქვეშ',
    'home.camping.title': 'კემპინგი',
    'home.camping.text': 'ბანაკები ტბის პირას, კანიონში და მაღალმთიან მდელოებზე — კარვებზე, ცეცხლსა და ადგილის არჩევაზე ჩვენ ვზრუნავთ.',
    'home.camping.more': 'ნახე კემპინგის ტურები',

    'home.climb.alt': 'ყაზბეგი',
    'home.climb.tag': 'ზაფხულის სეზონი',
    'home.climb.title': 'ალპინიზმი',
    'home.climb.text': 'გიდით ასვლები კავკასიონზე, მათ შორის ყაზბეგზე (5 054 მ), აკლიმატიზაციის დღეებით, მყინვარის სკოლითა და სარეზერვო დღით.',
    'home.climb.more': 'ნახე ასვლები',

    'home.transfer.alt': 'ტრანსფერები საქართველოში',
    'home.transfer.tag': 'ხელმისაწვდომია',
    'home.transfer.title': 'ტრანსფერი',
    'home.transfer.text': 'აეროპორტიდან დახვედრა და გადაყვანა ბილიკის სათავემდე, კურორტზე ან შემდეგ რეგიონში — ორი ადამიანიდან სრულ მინიავტობუსამდე. აირჩიე მარშრუტი და დაჯავშნე ონლაინ.',
    'home.transfer.more': 'ნახე ტრანსფერები',

    'hot.kicker': 'ახლა პოპულარულია',
    'hot.title1': 'აირჩიე',
    'hot.title2': 'საუკეთესო აქტივობები',
    'hot.in.winter': 'ზამთარში',
    'hot.in.spring': 'გაზაფხულზე',
    'hot.in.summer': 'ზაფხულში',
    'hot.in.autumn': 'შემოდგომაზე',
    'hot.lead.winter': 'საქართველოში ზამთარი თოვლის სეზონია. გუდაური და ბაკურიანი თხილამურისტებითა და სნოუბორდისტებით ივსება, უღელტეხილები თეთრდება, მთის სოფლები კი ყველაზე მშვიდი და ლამაზია.',
    'hot.lead.spring': 'გაზაფხულზე საქართველო ისევ მწვანდება. პირველად დაბალი ბილიკები იხსნება, ხეობები ველური ყვავილებითაა სავსე, ღვინის რეგიონი კი მთებზე გაცილებით ადრე თბება.',
    'hot.lead.summer': 'საქართველოში ზაფხული აქტიური დასვენების სეზონია. გრძელი დღეები მაღალ მთებში, კემპინგი ნათელი ცის ქვეშ, მდინარეებზე რაფტინგი და ქედებზე გასეირნება, რომელიც საღამომდე გრძელდება.',
    'hot.lead.autumn': 'შემოდგომა მოსავლის სეზონია. ბილიკები თავისუფალი და ოქროსფერია, დილის ჰაერი გამჭვირვალეა, კახეთში კი ყურძნის კრეფა გაჩაღებულია.',
    'hot.cta': 'აღმოაჩინე აქტივობები',
    'hot.views': '{n} ნახვა',

    'footer.tagline': 'სათხილამურო ინსტრუქტორები, ტრანსფერები და სამთო აქტივობები საქართველოში.',
    'footer.location': 'თბილისი, საქართველო',

    'offline.message': 'მონაცემთა ბაზასთან კავშირი არ არის. შესვლა, ანგარიშის შექმნა და ცვლილებების შენახვა ვერ იმუშავებს — ნაჩვენები ტურები სანიმუშო მონაცემებია.',
    'offline.dismiss': 'დახურვა',
    'site.close': 'დახურვა',
  },

  ru: {
    'hero.sub': 'Инструкторы по горным лыжам и сноуборду, фрирайд, снегоходы и параплан в Гудаури, а также трансферы и горные маршруты по всей Грузии',

    'home.laterNote': 'В этом сезоне бронирование закрыто. Вы можете посмотреть маршруты и спросить нас о следующем разе.',

    'home.winter.alt': 'Катание на лыжах в Гудаури',
    'home.winter.tag': 'Зимний сезон',
    'home.winter.title': 'Зима в Гудаури',
    'home.winter.text': 'Сертифицированные инструкторы и школы по горным лыжам и сноуборду для первой недели на снегу, фрирайд с гидом на просторных склонах над Гудаури, прогулки на снегоходах к Крестовому перевалу и полёты на параплане в тандеме над склонами, когда позволяет ветер.',
    'home.winter.more': 'Зимние активности',

    'home.hiking.alt': 'Поход в горах Грузии',
    'home.hiking.tag': 'Походы с гидом',
    'home.hiking.title': 'Походы',
    'home.hiking.text': 'Многодневные треки по высокогорью Грузии: от альпийских вершин и ледников до древних долин, по тропам Сванети, Казбеги, Тушети и не только.',
    'home.hiking.more': 'Смотреть походы',

    'home.camping.alt': 'Кемпинг в горах',
    'home.camping.tag': 'Ночёвки под открытым небом',
    'home.camping.title': 'Кемпинг',
    'home.camping.text': 'Лагеря у озёр, ночи в каньонах и на высокогорных лугах. Палатки, костёр и выбор места берём на себя.',
    'home.camping.more': 'Смотреть кемпинг-туры',

    'home.climb.alt': 'Гора Казбек',
    'home.climb.tag': 'Летний сезон',
    'home.climb.title': 'Альпинизм',
    'home.climb.text': 'Восхождения с гидами на вершины Кавказа, включая Казбек (5054 м): дни акклиматизации, ледовая школа и запасной день в программе.',
    'home.climb.more': 'Смотреть восхождения',

    'home.transfer.alt': 'Трансферы по Грузии',
    'home.transfer.tag': 'Доступно сейчас',
    'home.transfer.title': 'Трансфер',
    'home.transfer.text': 'Встреча в аэропорту и трансферы к началу тропы, на курорт или в следующий регион: от пары человек до целого микроавтобуса. Выберите маршрут и забронируйте онлайн.',
    'home.transfer.more': 'Смотреть трансферы',

    'hot.kicker': 'Сейчас в тренде',
    'hot.title1': 'Лучшие',
    'hot.title2': 'активности',
    'hot.in.winter': 'этой зимой',
    'hot.in.spring': 'этой весной',
    'hot.in.summer': 'этим летом',
    'hot.in.autumn': 'этой осенью',
    'hot.lead.winter': 'Зима в Грузии — это сезон снега. В Гудаури и Бакуриани приезжают лыжники и сноубордисты, перевалы белеют, а горные деревни тихи и особенно красивы.',
    'hot.lead.spring': 'Весной Грузия снова зеленеет. Первыми открываются нижние тропы, долины полны полевых цветов, а в винных краях тепло задолго до того, как оно приходит в горы.',
    'hot.lead.summer': 'Лето в Грузии — время активного отдыха. Длинные дни высоко в горах, кемпинг под ясным небом, сплавы по рекам и прогулки по хребтам до самого вечера.',
    'hot.lead.autumn': 'Осень — пора урожая. Тропы пусты и золотятся, утренний воздух свеж, а в Кахетии в разгаре сбор винограда.',
    'hot.cta': 'Смотреть активности',
    'hot.views': 'просмотров: {n}',

    'footer.tagline': 'Инструкторы по лыжам, трансферы и горные активности в Грузии.',
    'footer.location': 'Тбилиси, Грузия',

    'offline.message': 'Нет связи с базой данных. Вход, регистрация и сохранение изменений не будут работать — показаны примеры поездок.',
    'offline.dismiss': 'Закрыть',
    'site.close': 'Закрыть',
  },

  zh: {
    'hero.sub': '古道里的滑雪和单板教练、野雪、雪地摩托和滑翔伞，另有覆盖格鲁吉亚各地的接送服务和山地线路',

    'home.laterNote': '本季暂不接受预订。您可以先看看线路，并向我们咨询下次的安排。',

    'home.winter.alt': '在古道里滑雪',
    'home.winter.tag': '冬季雪季',
    'home.winter.title': '古道里的冬天',
    'home.winter.text': '持证的滑雪和单板教练与滑雪学校，帮您度过雪地上的第一周；向导带队，在古道里上方开阔的雪碗里滑野雪；骑雪地摩托前往十字山口；风合适的时候，还能体验双人滑翔伞飞越雪坡。',
    'home.winter.more': '查看冬季活动',

    'home.hiking.alt': '格鲁吉亚山区徒步',
    'home.hiking.tag': '向导带队徒步',
    'home.hiking.title': '徒步',
    'home.hiking.text': '穿越格鲁吉亚高山的多日徒步，从高山峰顶、冰川到古老的山谷，走遍斯瓦涅季、卡兹别吉、图舍季等地的步道。',
    'home.hiking.more': '查看徒步线路',

    'home.camping.alt': '山中露营',
    'home.camping.tag': '户外过夜',
    'home.camping.title': '露营',
    'home.camping.text': '湖畔营地、峡谷之夜和高山草甸。帐篷、篝火和营地选址都由我们负责。',
    'home.camping.more': '查看露营行程',

    'home.climb.alt': '卡兹别克山',
    'home.climb.tag': '夏季',
    'home.climb.title': '登山',
    'home.climb.text': '向导带队攀登高加索山峰，包括海拔 5054 米的卡兹别克山，行程含适应性训练日、冰川学校和备用日。',
    'home.climb.more': '查看登山行程',

    'home.transfer.alt': '格鲁吉亚各地接送',
    'home.transfer.tag': '现已开放',
    'home.transfer.title': '接送',
    'home.transfer.text': '机场接机，以及前往徒步起点、滑雪度假村或下一个地区的接送，小到两人，大到整辆中巴。选好路线，即可在线预订。',
    'home.transfer.more': '查看接送服务',

    'hot.kicker': '近期热门',
    'hot.title1': '体验',
    'hot.title2': '热门活动',
    'hot.in.winter': '冬季精选',
    'hot.in.spring': '春季精选',
    'hot.in.summer': '夏季精选',
    'hot.in.autumn': '秋季精选',
    'hot.lead.winter': '格鲁吉亚的冬天是雪季。古道里和巴库里阿尼聚满了滑雪和单板爱好者，山口一片雪白，山村最安静，也最美。',
    'hot.lead.spring': '春天，格鲁吉亚重新变绿。低处的步道最先开放，山谷里开满野花，酒乡早在山里回暖之前就已经暖和起来。',
    'hot.lead.summer': '格鲁吉亚的夏天适合各种户外活动。高山上白昼漫长，晴空下露营，河上漂流，山脊漫步可以一直走到傍晚。',
    'hot.lead.autumn': '秋天是收获的季节。步道上人少、满眼金黄，清晨空气清冽，卡赫季正值葡萄采摘季。',
    'hot.cta': '探索活动',
    'hot.views': '{n} 次浏览',

    'footer.tagline': '格鲁吉亚的滑雪教练、接送服务和山地活动。',
    'footer.location': '格鲁吉亚，第比利斯',

    'offline.message': '无法连接数据库。登录、创建账户和保存更改暂时不可用，当前显示的行程为示例数据。',
    'offline.dismiss': '关闭',
    'site.close': '关闭',
  },
};

export default strings;
