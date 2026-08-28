// The placeholder trip catalogue, shared by the listing and the detail page.
//
// Everything here is stand-in content until the database is filled in. Both
// pages read from this one list, so a trip only has to be described once.
//
// season_from / season_to are recurring "MM-DD" windows: hiking and camping run
// summer into autumn, the ski trips run the winter season, culture runs all year.

// Most trips in a category include and exclude the same things; a trip can set
// its own `included` / `excluded` to override.
const INCLUDED = {
  hiking: [
    ['2 mountain guides', 'Certified, first-aid trained'],
    ['First aid kit', 'Carried by both guides'],
    ['Accommodation', 'Family guesthouses along the route'],
    ['Meals', 'Breakfast and dinner daily'],
    ['Transport', 'Tbilisi return + 4x4 transfers'],
    ['Permits', 'All park and border-zone paperwork'],
  ],
  camping: [
    ['Mountain guide', 'Certified, first-aid trained'],
    ['Tents & mats', 'Two-person tents, pitched at camp'],
    ['Camp meals', 'Dinner and breakfast cooked on site'],
    ['Transport', 'Tbilisi return, 4x4 to the trailhead'],
    ['First aid kit', 'Carried by the guide'],
    ['Permits', 'Park entry where it applies'],
  ],
  ski: [
    ['Certified instructor', 'Ski or snowboard, your level'],
    ['Lift pass', 'Full pass for every riding day'],
    ['Accommodation', 'Hotel in resort, breakfast included'],
    ['Transport', 'Tbilisi return transfer'],
    ['Avalanche kit', 'Transceiver, probe and shovel on off-piste days'],
    ['Group photos', 'Shot by the guide, sent after the trip'],
  ],
  culture: [
    ['Local guide', 'English-speaking, licensed'],
    ['Transport', 'Comfortable minibus from Tbilisi'],
    ['Entry fees', 'Every site on the itinerary'],
    ['Tastings', 'Where the itinerary includes them'],
  ],
};

const EXCLUDED = {
  hiking: [
    ['Personal gear', 'Boots, sleeping bag, rain shell'],
    ['Travel insurance', 'Required — arrange before arrival'],
    ['Lunches', 'Bought locally, roughly 20–30 ₾ a day'],
  ],
  camping: [
    ['Sleeping bag', 'Bring your own, or hire from us'],
    ['Travel insurance', 'Required — arrange before arrival'],
    ['Lunches', 'Bought locally, roughly 20–30 ₾ a day'],
  ],
  ski: [
    ['Equipment rental', 'Skis or board, boots — hired in resort'],
    ['Travel insurance', 'Must cover off-piste riding'],
    ['Lunches & dinners', 'Mountain restaurants, your choice'],
  ],
  culture: [
    ['Lunch', 'Stops are made, you order what you like'],
    ['Travel insurance', 'Recommended'],
    ['Tips', 'Entirely at your discretion'],
  ],
};

export const TOURS = [
  {
    slug: 'svaneti-mestia-ushguli', lat: 43.0451, lng: 42.728, price: 890, id: 10024, title: 'Svaneti', subtitle: 'Mestia → Ushguli trek',
    full_title: 'Mestia – Ushguli Trek',
    category: 'hiking', region: 'Svaneti', cover_image: '/assets/svaneti(1).webp',
    distance: '58 km', duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Hard', stay: 'Guesthouse',
    capacity: 12, spots_left: 5, badge: 'top', views: 662,
    season_from: '06-15', season_to: '10-15', season_text: 'June – October',
    elevation_gain: '2,400 m', languages: 'EN · GE · RU',
    guide: { name: 'Giorgi B.', role: 'Mountain guide · 4 tours' },
    gallery: ['/assets/svaneti.jpg', '/assets/Svaneti.jpe', '/assets/Svaneti-history.jpg', '/assets/svaneti(1).webp', '/assets/camping.jpg'],
    summary: 'A four-day traverse through Upper Svaneti, from Mestia to Ushguli — one of the highest permanently inhabited villages in Europe. You walk ridge to ridge with Shkhara and Tetnuldi in view most of the day, sleeping in family guesthouses along the way.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '07:00', return_info: 'Day 4, ~21:00 Tbilisi', transport: 'Minibus + 4x4 to trailhead', group_size: '6 – 12 people', walking_per_day: '5 – 7 hours' },
    itinerary: [
      ['Tbilisi → Mestia', 'Leave Liberty Square at 07:00. Road transfer through Zugdidi with lunch on the way, arriving in Mestia late afternoon. Short walk to the Mikhail Khergiani museum and an early night.'],
      ['Mestia → Zhabeshi', 'First walking day along the Mulakhi valley. Gentle climbs, Svan towers in every village, and a first proper look at Tetnuldi.'],
      ['Zhabeshi → Adishi → Iprari', 'The big day: the Chkhutnieri pass, a river crossing by horse, and the Adishi glacier viewpoint.'],
      ['Iprari → Ushguli → Tbilisi', 'Morning walk into Ushguli, time at the Lamaria church under Shkhara, then the long drive back to Tbilisi.'],
    ],
  },
  {
    slug: 'kazbegi-gergeti', lat: 42.6572, lng: 44.6417, price: 320, id: 10025, title: 'Kazbegi', subtitle: 'Gergeti Trinity & glacier',
    full_title: 'Kazbegi – Gergeti Trinity & Glacier',
    category: 'hiking', region: 'Mtskheta-Mtianeti', cover_image: '/assets/sameba.webp',
    distance: '14 km', duration: '2 days', duration_long: '2 days / 1 night',
    difficulty: 'Medium', stay: 'Guesthouse',
    capacity: 16, spots_left: 9, badge: 'top', views: 481,
    season_from: '06-01', season_to: '10-31', season_text: 'June – October',
    elevation_gain: '1,300 m', languages: 'EN · GE · RU',
    guide: { name: 'Nino K.', role: 'Mountain guide · 7 tours' },
    gallery: ['/assets/sameba.jpe', '/assets/sameba.webp', '/assets/Svaneti-history.jpg', '/assets/camping.jpg'],
    summary: 'The classic Georgian view: Gergeti Trinity church on its ridge with Mount Kazbek behind it. Day one walks up to the church and on toward the Gergeti glacier; day two is an easier valley loop before the drive home along the Georgian Military Road.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 2, ~20:00 Tbilisi', transport: 'Minibus + 4x4 to Gergeti', group_size: '8 – 16 people', walking_per_day: '4 – 6 hours' },
    itinerary: [
      ['Tbilisi → Stepantsminda → Gergeti', 'Drive the Georgian Military Road with stops at Ananuri fortress and the Jvari pass. Afternoon climb to Gergeti Trinity for sunset, then down to the guesthouse.'],
      ['Glacier viewpoint → Tbilisi', 'Early start toward the Gergeti glacier moraine for the Kazbek face, back down for a late lunch, and the drive to Tbilisi.'],
    ],
  },
  {
    slug: 'tavkvetili', lat: 41.5947, lng: 44.0958, price: 90, id: 10026, title: 'Tavkvetili', subtitle: 'თავკვეთილი',
    full_title: 'Tavkvetili Mountain Day Hike',
    category: 'hiking', region: 'Tsalka', cover_image: '/assets/hiking.svg',
    distance: '12 km', duration: '1 day', duration_long: 'Single day',
    difficulty: 'Medium', stay: 'Day trip',
    capacity: 20, spots_left: 14, badge: 'new', views: 118,
    season_from: '05-15', season_to: '11-15', season_text: 'May – November',
    elevation_gain: '650 m', languages: 'EN · GE',
    guide: { name: 'Levan T.', role: 'Mountain guide · 3 tours' },
    gallery: ['/assets/hiking.svg', '/assets/camping fier.webp', '/assets/Svaneti-history.jpg'],
    summary: 'A flat-topped volcanic cone on the Tsalka plateau, close enough to Tbilisi for a single day out. Open grassland the whole way up, wildflowers through early summer, and a summit panorama over the Trialeti range and the reservoir.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '07:30', return_info: 'Same day, ~19:30 Tbilisi', transport: 'Minibus to the trailhead', group_size: '8 – 20 people', walking_per_day: '5 – 6 hours' },
    itinerary: [
      ['Tbilisi → Tsalka → summit → Tbilisi', 'Two-hour drive to the plateau, a steady walk up open slopes to the crater rim, lunch at the top with the Trialeti range laid out below, then back down the same way and home by evening.'],
    ],
  },
  {
    slug: 'rkoni', lat: 41.926, lng: 44.24, price: 190, id: 10027, title: 'Rkoni', subtitle: 'Canyon & monastery camp',
    full_title: 'Rkoni Canyon & Monastery Camp',
    category: 'camping', region: 'Shida Kartli', cover_image: '/assets/camping.jpg',
    distance: '9 km', duration: '2 days', duration_long: '2 days / 1 night',
    difficulty: 'Easy', stay: 'Tents',
    capacity: 18, spots_left: 11, badge: 'new', views: 203,
    season_from: '05-01', season_to: '10-31', season_text: 'May – October',
    elevation_gain: '350 m', languages: 'EN · GE',
    guide: { name: 'Data M.', role: 'Camp guide · 5 tours' },
    gallery: ['/assets/camping.jpg', '/assets/camping fier.webp', '/assets/hiking.svg'],
    summary: 'An easy weekend in the Tedzami gorge. A gentle riverside walk leads to the 7th-century Rkoni monastery and the old arched bridge, and camp is pitched in the meadow beside the water — the kind of trip that works for families and first-time campers.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '09:00', return_info: 'Day 2, ~18:00 Tbilisi', transport: 'Minibus + short 4x4 section', group_size: '6 – 18 people', walking_per_day: '2 – 4 hours' },
    itinerary: [
      ['Tbilisi → Rkoni → camp', 'Drive out past Kaspi, walk the gorge path to the monastery and the medieval bridge, then pitch camp in the meadow and cook dinner over the fire.'],
      ['Canyon walk → Tbilisi', 'Morning wander further up the canyon to the swimming pools, pack up after lunch and drive back.'],
    ],
  },
  {
    slug: 'black-rock-lake', lat: 42.546, lng: 45.12, price: 450, id: 10028, title: 'Black Rock Lake', subtitle: 'Abudelauri valley camp',
    full_title: 'Black Rock Lake Camp',
    category: 'camping', region: 'Racha', cover_image: '/assets/camping fier.webp',
    distance: '22 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Medium', stay: 'Tents',
    capacity: 14, spots_left: 0, badge: '', views: 356,
    season_from: '06-15', season_to: '10-15', season_text: 'June – October',
    elevation_gain: '1,100 m', languages: 'EN · GE · RU',
    guide: { name: 'Ana G.', role: 'Camp guide · 6 tours' },
    gallery: ['/assets/camping fier.webp', '/assets/camping.jpg', '/assets/Svaneti-history.jpg'],
    summary: 'Two nights under canvas beside one of the high lakes below the Greater Caucasus ridge. The walk in climbs through pine forest and alpine meadow, and the reward is a still black lake that mirrors the peaks at dawn.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '07:00', return_info: 'Day 3, ~21:00 Tbilisi', transport: 'Minibus + 4x4 to the trailhead', group_size: '6 – 14 people', walking_per_day: '4 – 6 hours' },
    itinerary: [
      ['Tbilisi → trailhead → forest camp', 'Long drive north, then a first afternoon walk through pine forest to the lower camp beside the river.'],
      ['Camp → Black Rock Lake → camp', 'The main day: up through the meadows to the lake, a long stop on the shore, and back down to camp for dinner.'],
      ['Camp → Tbilisi', 'Pack up after breakfast, walk out to the road and drive back to Tbilisi.'],
    ],
  },
  {
    slug: 'gudauri-freeride', lat: 42.4769, lng: 44.4783, price: 1750, id: 10029, title: 'Gudauri', subtitle: 'Freeride week',
    full_title: 'Gudauri Freeride Week',
    category: 'ski', subtype: 'freeride', region: 'Gudauri', cover_image: '/assets/gudauri.webp',
    distance: '—', duration: '6 days', duration_long: '6 days / 5 nights',
    difficulty: 'Hard', stay: 'Hotel',
    capacity: 10, spots_left: 3, badge: 'top', views: 894,
    season_from: '12-01', season_to: '04-15', season_text: 'December – April',
    elevation_gain: '—', languages: 'EN · GE · RU',
    guide: { name: 'Sandro P.', role: 'Freeride guide · 11 tours' },
    gallery: ['/assets/gudauri.jpe', '/assets/gudauri.webp', '/assets/gudauri%201.jpe', '/assets/skier-gudauri-yellow-jacket-768x512.jpg'],
    summary: 'Six days riding the wide open bowls above Gudauri with a freeride guide. Lift-accessed off-piste every day, an avalanche-safety session on day one, and a cat or heli option when conditions line up. For confident off-piste riders only.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '09:00', return_info: 'Day 6, ~18:00 Tbilisi', transport: 'Minibus transfer both ways', group_size: '4 – 10 people', walking_per_day: 'Riding days, 5 – 6 hours' },
    itinerary: [
      ['Transfer & avalanche briefing', 'Drive up the Georgian Military Road, collect hire gear, and run the transceiver and companion-rescue session on the slope behind the hotel.'],
      ['Warm-up riding', 'Lift laps to read the group and pick lines for the week.'],
      ['Bowls above Kobi', 'The long open descents on the north side, with a guide-set skin track for the last pitch.'],
      ['Ridge lines', 'Steeper terrain if the snowpack allows, mellow trees if it does not.'],
      ['Cat or heli day', 'Weather-dependent optional add-on, otherwise a full lift day.'],
      ['Last laps → Tbilisi', 'Morning riding, lunch in resort, then the transfer back to the city.'],
    ],
  },
  {
    slug: 'tbilisi-transfer', lat: 41.7151, lng: 44.8271, price: 90, id: 10032, title: 'Transfer', subtitle: 'Anywhere in Georgia',
    full_title: 'Private Transfer',
    category: 'transfer', region: 'Country-wide', cover_image: '/assets/transfer.svg',
    duration: '1 day', difficulty: '—',
    capacity: 4, spots_left: 4, badge: 'new', views: 61,
    season_from: '01-01', season_to: '12-31', season_text: 'All year',
    languages: 'EN · GE · RU',
    guide: { name: 'Torito', role: 'Transfers' },
    gallery: ['/assets/transfer.svg'],
    summary: 'Airport pickups, and transfers to the trailhead, the resort or the next region. Tell us where and when, how many of you there are and how much luggage — we arrange the vehicle and the driver.',
    info: { departure_point: 'Anywhere you say', group_size: '1 – 4 people', transport: 'Sedan or minibus, by group size' },
    itinerary: [],
  },
  {
    slug: 'gudauri-lessons', lat: 42.4769, lng: 44.4783, price: 120, id: 10031, title: 'Gudauri', subtitle: 'Ski & snowboard lessons',
    full_title: 'Gudauri Ski & Snowboard Lessons',
    category: 'ski', subtype: 'lessons', region: 'Gudauri', cover_image: '/assets/skier-gudauri-yellow-jacket-768x512.jpg',
    duration: '2 hours', duration_long: '2 hours per lesson',
    capacity: 6, spots_left: 6, badge: '', views: 143,
    season_from: '12-01', season_to: '04-15', season_text: 'December – April',
    languages: 'EN · GE · RU',
    guide: { name: 'Mariam Ch.', role: 'Ski instructor · 9 seasons' },
    gallery: ['/assets/skier-gudauri-yellow-jacket-768x512.jpg', '/assets/gudauri.webp', '/assets/ski.svg'],
    summary: 'Private and small-group lessons with a certified instructor, on the slope you are already on. Tell us the day, the time, how many of you there are, what you can already do and what you want to work on — first turns, park laps or riding off-piste safely.',
    info: { departure_point: 'Gudauri, bottom of Gondola 1', group_size: '1 – 6 people' },
    itinerary: [],
  },
  {
    slug: 'bakuriani-beginners', lat: 41.7497, lng: 43.5322, price: 980, id: 10030, title: 'Bakuriani', subtitle: 'Beginner ski camp',
    full_title: 'Bakuriani Beginner Ski Camp',
    category: 'ski', subtype: 'lessons', region: 'Samtskhe-Javakheti', cover_image: '/assets/skier-gudauri-yellow-jacket-768x512.jpg',
    distance: '—', duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Easy', stay: 'Hotel',
    capacity: 15, spots_left: 8, badge: '', views: 274,
    season_from: '12-15', season_to: '03-31', season_text: 'December – March',
    elevation_gain: '—', languages: 'EN · GE · RU',
    guide: { name: 'Mariam Ch.', role: 'Ski instructor · 9 tours' },
    gallery: ['/assets/skier-gudauri-yellow-jacket-768x512.jpg', '/assets/gudauri.webp', '/assets/ski.svg'],
    summary: 'Four days on the gentlest slopes in Georgia, built for people who have never clipped into a binding. Small groups, two lessons a day, and enough free time to actually practise what you learned in the morning.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:30', return_info: 'Day 4, ~19:00 Tbilisi', transport: 'Minibus transfer both ways', group_size: '6 – 15 people', walking_per_day: 'Two 2-hour lessons daily' },
    itinerary: [
      ['Transfer & first lesson', 'Drive to Bakuriani, fit hire gear, and a first afternoon on the nursery slope — sliding, stopping, getting up.'],
      ['Turning', 'Two lessons on the green runs, working from a snowplough toward linked turns.'],
      ['First chairlift', 'Riding the lift and taking a full blue run top to bottom.'],
      ['Free morning → Tbilisi', 'Last practice run with the instructor, lunch, then the transfer home.'],
    ],
  },
  {
    slug: 'mtskheta', lat: 41.8458, lng: 44.7208, price: 120, id: 10031, title: 'Mtskheta', subtitle: 'Ancient capital day tour',
    full_title: 'Mtskheta — Ancient Capital Day Tour',
    category: 'culture', region: 'Mtskheta', cover_image: '/assets/mtskheta.svg',
    distance: '—', duration: '1 day', duration_long: 'Single day',
    difficulty: 'Easy', stay: 'Day trip',
    capacity: 24, spots_left: 17, badge: '', views: 512,
    season_from: '01-01', season_to: '12-31', season_text: 'All year',
    elevation_gain: '—', languages: 'EN · GE · RU',
    guide: { name: 'Tamar L.', role: 'Culture guide · 14 tours' },
    gallery: ['/assets/mtskheta.svg', '/assets/sameba.webp', '/assets/kaxeti.jpg'],
    summary: 'Half an hour from Tbilisi sits the old capital of the Georgian kingdom, where the country adopted Christianity in the 4th century. Jvari monastery on its hill, Svetitskhoveli cathedral below, and the confluence of the Mtkvari and Aragvi between them.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '10:00', return_info: 'Same day, ~17:00 Tbilisi', transport: 'Minibus', group_size: '6 – 24 people', walking_per_day: '2 – 3 hours, easy' },
    itinerary: [
      ['Jvari → Svetitskhoveli → Tbilisi', 'Start at Jvari monastery for the view over the two rivers meeting, drive down into Mtskheta for Svetitskhoveli cathedral and the old town, with time for lunch before heading back.'],
    ],
  },
  {
    slug: 'kakheti-wine', lat: 41.9192, lng: 45.4731, price: 380, id: 10032, title: 'Kakheti', subtitle: 'Wine route & qvevri cellars',
    full_title: 'Kakheti Wine Route',
    category: 'culture', region: 'Kakheti', cover_image: '/assets/kaxeti.jpg',
    distance: '—', duration: '2 days', duration_long: '2 days / 1 night',
    difficulty: 'Easy', stay: 'Guesthouse',
    capacity: 20, spots_left: 6, badge: 'top', views: 731,
    season_from: '01-01', season_to: '12-31', season_text: 'All year',
    elevation_gain: '—', languages: 'EN · GE · RU',
    guide: { name: 'Irakli V.', role: 'Wine guide · 18 tours' },
    gallery: ['/assets/kaxeti.jpg', '/assets/kaxeti.jpe', '/assets/kaxeti.jpeg', '/assets/wine.svg'],
    summary: 'Two days in the valley where wine has been made continuously for eight thousand years. Family marani cellars with clay qvevri buried to the neck, the hill town of Sighnaghi above the Alazani plain, and more amber wine than is strictly sensible.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '09:30', return_info: 'Day 2, ~19:00 Tbilisi', transport: 'Minibus', group_size: '6 – 20 people', walking_per_day: '2 – 3 hours, easy' },
    itinerary: [
      ['Tbilisi → Sighnaghi → Bodbe', 'Drive east to the walled town of Sighnaghi, walk the ramparts over the Alazani valley, visit Bodbe monastery, then a first family cellar and dinner with the hosts.'],
      ['Qvevri cellars → Tbilisi', 'Two more marani visits — one traditional qvevri maker, one modern estate — with a long supra lunch before the drive back.'],
    ],
  },
];

const pair = ([title, note]) => ({ title, note });
/**
 * A database row in the shape the trip page renders.
 *
 * The table stores flat columns and jsonb lists; the page wants an `info`
 * object and arrays of {title, note}. Anything left empty in the admin panel
 * falls back to the category's defaults, so a half-filled trip still reads as
 * a finished page rather than a set of blanks.
 */
export function fromRow(row) {
  if (!row) return null;

  const pairs = (list, fallback) => {
    const source = Array.isArray(list) && list.length ? list : (fallback ?? []);
    return source
      .map((item) => (Array.isArray(item) ? { title: item[0], note: item[1] } : item))
      .filter((item) => item && item.title);
  };

  return {
    ...row,
    gallery: Array.isArray(row.gallery) && row.gallery.length
      ? row.gallery
      : [row.cover_image].filter(Boolean),
    // the page reads these under different names than the columns carry
    season_text: row.season || seasonLabelOf(row),
    duration_long: row.duration_long || row.duration,
    views: row.views ?? 0,
    info: {
      departure_point: row.departure_point,
      departure_time: row.departure_time,
      return_info: row.return_info,
      transport: row.transport,
      group_size: row.group_size,
      walking_per_day: row.walking_per_day,
    },
    itinerary: (Array.isArray(row.itinerary) ? row.itinerary : [])
      .map((item) => (Array.isArray(item) ? item : [item?.title, item?.note]))
      .filter(([title]) => title),
    included: pairs(row.included, INCLUDED[row.category]),
    excluded: pairs(row.excluded, EXCLUDED[row.category]),
  };
}

/** "06-01" + "10-31" -> "June – October", for rows with no season text. */
function seasonLabelOf(row) {
  const month = (mmdd) => {
    const n = Number(String(mmdd ?? '').slice(0, 2));
    return n >= 1 && n <= 12 ? MONTH_NAMES[n - 1] : null;
  };
  const from = month(row.season_from);
  const to = month(row.season_to);
  return from && to ? `${from} – ${to}` : '';
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];


/** The trip for a URL slug, with its category defaults filled in. */
export function findTour(slug) {
  const tour = TOURS.find((t) => t.slug === slug);
  if (!tour) return null;

  return {
    ...tour,
    included: (tour.included || INCLUDED[tour.category] || []).map(pair),
    excluded: (tour.excluded || EXCLUDED[tour.category] || []).map(pair),
  };
}
