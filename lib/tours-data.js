// The placeholder trip catalogue, shared by the listing and the detail page.
//
// Everything here is stand-in content until the database is filled in. Both
// pages read from this one list, so a trip only has to be described once.
//
// season_from / season_to are recurring "MM-DD" windows: hiking and camping run
// summer into autumn, the winter trips run December to March.

// Most trips in a category include and exclude the same things; a trip can set
// its own `included` / `excluded` to override.
// the usual entries per category, offered as tick boxes in the admin panel
export const INCLUDED = {
  tours: [
    ['Guide', 'English-speaking, all day'],
    ['Transport', 'Comfortable minibus, door to door'],
    ['Entry tickets', 'Every site on the itinerary'],
    ['Tastings', 'Where the day includes them'],
    ['Lunch', 'At a local family table'],
  ],
  transfer: [
    ['Driver', 'Local, English-speaking where asked for'],
    ['Vehicle', 'Sized to the group and the luggage'],
    ['Fuel and tolls', 'All included in the price'],
    ['Meet and greet', 'Name board at the airport'],
    ['Waiting time', 'An hour after a landing, free'],
  ],
  hiking: [
    ['2 mountain guides', 'Certified, first-aid trained'],
    ['First aid kit', 'Carried by both guides'],
    ['Accommodation', 'Family guesthouses along the route'],
    ['Meals', 'Breakfast and dinner daily'],
    ['Transport', 'Tbilisi return + 4x4 transfers'],
    ['Permits', 'All park and border-zone paperwork'],
  ],
  mountaineering: [
    ['IFMGA guide', 'One guide to every two climbers on summit day'],
    ['Group gear', 'Ropes, tents, stoves and fuel'],
    ['Accommodation', 'Guesthouse, meteo station and tents'],
    ['Meals', 'All meals on the mountain'],
    ['Transport', 'Tbilisi return + 4x4 to the trailhead'],
    ['Permits', 'Border-zone and park paperwork'],
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

export const EXCLUDED = {
  tours: [
    ['Dinner', 'Evenings are your own'],
    ['Accommodation', 'Unless the trip runs over a night'],
    ['Personal spending', 'Bottles to take home, souvenirs'],
  ],
  transfer: [
    ['Child seats', 'Tell us in advance and we arrange them'],
    ['Extra stops', 'Chargeable if they add time'],
    ['Overnight waiting', 'Charged if a flight is delayed to the next day'],
  ],
  hiking: [
    ['Personal gear', 'Boots, sleeping bag, rain shell'],
    ['Travel insurance', 'Required — arrange before arrival'],
    ['Lunches', 'Bought locally, roughly 20–30 ₾ a day'],
  ],
  mountaineering: [
    ['Personal technical gear', 'Boots, crampons, harness — hire available'],
    ['Travel insurance', 'Must cover climbing above 5,000 m'],
    ['Porters', 'Horses to the station on request'],
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
    season_from: '12-01', season_to: '03-31', season_text: 'December – March',
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
    season_from: '12-01', season_to: '03-31', season_text: 'December – March',
    languages: 'EN · GE · RU',
    guide: { name: 'Mariam Ch.', role: 'Ski instructor · 9 seasons' },
    gallery: ['/assets/skier-gudauri-yellow-jacket-768x512.jpg', '/assets/gudauri.webp', '/assets/ski.svg'],
    summary: 'Private and small-group lessons with a certified instructor, on the slope you are already on. Tell us the day, the time, how many of you there are, what you can already do and what you want to work on — first turns, park laps or riding off-piste safely.',
    info: { departure_point: 'Gudauri, bottom of Gondola 1', group_size: '1 – 6 people' },
    itinerary: [],
  },
  {
    slug: 'gudauri-snowmobile', lat: 42.4769, lng: 44.4783, price: 250, id: 10033, title: 'Gudauri', subtitle: 'Snowmobile ride to the Cross Pass',
    full_title: 'Gudauri Snowmobile Ride',
    category: 'ski', subtype: 'snowmobile', region: 'Gudauri', cover_image: '/assets/gudauri 1.jpe',
    duration: '2 hours', duration_long: '2 hours, with stops',
    difficulty: 'Easy', capacity: 8, spots_left: 6, badge: 'new', views: 402,
    season_from: '12-01', season_to: '03-31', season_text: 'December – March',
    languages: 'EN · GE · RU',
    guide: { name: 'Luka M.', role: 'Snowmobile guide · 6 seasons' },
    gallery: ['/assets/gudauri 1.jpe', '/assets/gudauri.jpe', '/assets/gudauri.webp'],
    summary: 'Two hours on a snowmobile behind a guide, from the resort up toward the Cross Pass and the Friendship monument viewpoint over the Aragvi gorge. No experience needed — a short briefing, a helmet and one or two riders per machine.',
    demo: true,
    stay: 'No overnight',
    info: { departure_point: 'Gudauri, New Gudauri parking', group_size: '1 – 8 people', transport: 'Snowmobile, 1 – 2 riders each' },
    included: [
      ['Snowmobile & fuel', 'One machine for one or two riders'],
      ['Guide', 'Leads the ride, English-speaking'],
      ['Helmet & goggles', 'Fitted at the start'],
      ['Warm suit', 'Windproof overalls if you need them'],
      ['Photos', 'Shot at the viewpoint, sent the same evening'],
    ],
    excluded: [
      ['Lunch', 'Cafés at the pass, your choice'],
      ['Damage deposit', 'Only charged for off-route damage'],
    ],
    itinerary: [
      ['Briefing & first loop', 'Ten minutes on the controls with the guide, then a gentle loop on the flat to get the feel of the throttle.'],
      ['Up the valley', 'Follow the guide out of the resort and up the snow road toward the Cross Pass, with stops on the way.'],
      ['Friendship monument', 'A long stop at the viewpoint over the Aragvi gorge — hot tea, photos, and the whole range in front of you.'],
      ['Back to Gudauri', 'A faster ride down for those who want it, a steady one for those who do not.'],
    ],
  },
  {
    slug: 'gudauri-paragliding', lat: 42.4769, lng: 44.4783, price: 300, id: 10034, title: 'Gudauri', subtitle: 'Tandem paragliding flight',
    full_title: 'Gudauri Tandem Paragliding',
    category: 'ski', subtype: 'paragliding', region: 'Gudauri', cover_image: '/assets/gudauri.jpe',
    duration: '1 hour', duration_long: '15 – 25 min in the air',
    difficulty: 'Easy', capacity: 4, spots_left: 4, badge: 'top', views: 718,
    season_from: '12-01', season_to: '03-31', season_text: 'December – March (summer flights on request)',
    languages: 'EN · GE · RU',
    guide: { name: 'Nika K.', role: 'Tandem pilot · 900+ flights' },
    gallery: ['/assets/gudauri.jpe', '/assets/gudauri 1.jpe', '/assets/gudauri.webp'],
    summary: 'A tandem flight with a licensed pilot from the top of the Gudauri lifts, over the snow bowls and down toward the valley. You run three steps and sit back — the pilot does the rest. Photos and video from the wingtip camera are included.',
    demo: true,
    stay: 'No overnight',
    info: { departure_point: 'Gudauri, top of the Sadzele lift', group_size: '1 – 4 people, one pilot each' },
    included: [
      ['Licensed tandem pilot', 'Certified, hundreds of flights in Gudauri'],
      ['All flying gear', 'Wing, harness, reserve and helmet'],
      ['Lift ticket', 'To the take-off point'],
      ['Photos & video', 'From the wingtip camera, sent the same day'],
    ],
    excluded: [
      ['Warm clothes', 'Dress as for skiing — it is colder up there'],
      ['Travel insurance', 'Recommended'],
    ],
    itinerary: [
      ['Meet at the lift', 'Meet your pilot at the bottom of the Sadzele lift and ride up together.'],
      ['Briefing & take-off', 'Five minutes on what to do — mostly: run three steps and sit back. Then off the slope and into the air.'],
      ['The flight', '15 to 25 minutes over the snow bowls and the valley, gentle or with a few spirals if you ask for them.'],
      ['Landing', 'A soft landing near the base. Your photos and video are with you before dinner.'],
    ],
  },
  {
    slug: 'kazbek-summit', lat: 42.6997, lng: 44.5186, price: 1450, id: 10035, title: 'Kazbek', subtitle: '5,054 m summit climb',
    full_title: 'Mount Kazbek Summit Climb',
    category: 'mountaineering', region: 'Kazbegi', cover_image: '/assets/sameba.webp',
    distance: '36 km', duration: '7 days', duration_long: '7 days / 6 nights',
    difficulty: 'Hard', stay: 'Meteo station & tents',
    capacity: 8, spots_left: 4, badge: 'top', views: 556,
    season_from: '06-20', season_to: '09-15', season_text: 'Late June – mid September',
    elevation_gain: '3,300 m', languages: 'EN · GE · RU',
    guide: { name: 'Giorgi B.', role: 'IFMGA mountain guide · 40+ ascents' },
    gallery: ['/assets/sameba.webp', '/assets/sameba.jpe', '/assets/camping.jpg'],
    summary: 'A guided ascent of Kazbek, the classic Georgian glacier peak. Acclimatisation days at the old meteo station at 3,650 m, glacier and crampon training, then a summit push in the dark to stand at 5,054 m at sunrise. For fit hikers ready for their first big mountain.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 7, ~20:00 Tbilisi', transport: 'Minibus + 4x4 to Gergeti', group_size: '2 – 8 people', walking_per_day: '5 – 12 hours' },
    itinerary: [
      ['Tbilisi → Stepantsminda', 'Drive the Military Road north, gear check and an evening briefing with the guide.'],
      ['Gergeti → Sabertse pass', 'First climb past the Trinity church to around 3,000 m, back down to sleep.'],
      ['Up to the meteo station', 'Cross the Gergeti glacier to the station at 3,650 m.'],
      ['Acclimatisation & glacier school', 'A climb to ~4,200 m, rope work, crampons and ice-axe arrest.'],
      ['Summit day', 'Start around 01:00, summit at sunrise, back to the station by afternoon.'],
      ['Reserve day', 'Kept free in case the weather closes the summit window.'],
      ['Down → Tbilisi', 'Walk out to Gergeti and drive back to the city.'],
    ],
  },
];


/**
 * The database rows, plus the demo services it does not have yet.
 *
 * Demo trips (snowmobile, paragliding) are shown even once the database has
 * its own catalogue, so the winter section always has something to open. A
 * trip with the same slug in the database replaces its demo.
 */
export function withDemos(rows) {
  const have = new Set(rows.map((r) => r.slug));
  return [...rows, ...TOURS.filter((t) => t.demo && !have.has(t.slug))];
}

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
