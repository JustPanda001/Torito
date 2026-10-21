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
  // TODO verify: distance 22 km, elevation gain 1,150 m and pass height ~3,340 m come from operator sources that disagree by 10 percent; guesthouse nights in Juta and Roshka; Juta coordinates are approximate
  {
    slug: 'juta-chaukhi-roshka', lat: 42.5936, lng: 44.7531, price: 360, id: 10040, title: 'Juta – Roshka', subtitle: 'Chaukhi Pass & Abudelauri lakes',
    full_title: 'Juta to Roshka: Chaukhi Pass & Abudelauri Lakes',
    category: 'hiking', region: 'Mtskheta-Mtianeti', cover_image: '/assets/trips/juta-chaukhi-roshka-1.webp',
    distance: '22 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Hard', stay: 'Guesthouses',
    capacity: 10, spots_left: 10, badge: 'top', views: 0,
    season_from: '07-15', season_to: '09-30', season_text: 'Mid-July – September',
    elevation_gain: '1,150 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/juta-chaukhi-roshka-1.webp', '/assets/trips/juta-chaukhi-roshka-2.webp', '/assets/trips/juta-chaukhi-roshka-3.webp', '/assets/trips/juta-chaukhi-roshka-4.webp'],
    summary: 'The best-known crossing in the Greater Caucasus on a short schedule: from the Juta valley under the spires of the Chaukhi massif, over the Chaukhi Pass at about 3,340 m, past the three Abudelauri lakes and down to Roshka in Khevsureti. The pass is the hard part, a long climb with a steep last stretch, and the reward is that you walk out of one valley and into a completely different one in a single day. Snow stays on the saddle until mid-July, so the trip runs only from the second half of July.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 3, ~19:00 Tbilisi', transport: 'Minibus to Juta; our vehicle meets you in Roshka', group_size: '4 – 10 people', walking_per_day: 'Day 1: 2 hours. Day 2: 8 – 9 hours' },
    itinerary: [
      ['Tbilisi → Juta → Tina lake', 'Drive the Military Road north to Stepantsminda and on up the Juta valley. After lunch, an easy two-hour walk toward Tina lake for the first full view of the Chaukhi massif. Night in a Juta guesthouse.'],
      ['Chaukhi Pass → Abudelauri lakes → Roshka', 'The long day. Early breakfast, then a steady climb to the Chaukhi Pass at about 3,340 m. On the far side the path drops to the Abudelauri lakes (blue, green and white), where we stop for lunch, and continues down the valley to Roshka. Night in a Roshka guesthouse.'],
      ['Roshka → Tbilisi', 'A slow morning, then the drive back to Tbilisi by way of the Pshavi and Aragvi valleys.'],
    ],
    included: [
      ['Mountain guides', 'Two certified guides on the pass day, first-aid trained'],
      ['2 nights in guesthouses', 'One in Juta, one in Roshka, shared rooms'],
      ['Meals', 'Breakfast and dinner on both nights, picnic lunch on the pass day'],
      ['Transport', 'Minibus Tbilisi – Juta, and a vehicle waiting in Roshka for the return'],
      ['First aid kit', 'Carried by the guides'],
    ],
    excluded: [
      ['Personal gear', 'Walking boots, rain shell, warm layer, poles if you use them'],
      ['Travel insurance', 'Required, and it must cover walking above 3,000 m'],
      ['Day-one lunch', 'Bought on the way, roughly 20 – 30 ₾'],
      ['Horse for luggage', 'Possible on request, charged separately'],
    ],
  },
  // TODO verify: total elevation gain 2,400 m (kept from the previous listing); daily distances vary by source (55 km total); whether luggage can be moved by road between villages depends on road state; Mestia meeting point
  {
    slug: 'mestia-ushguli-trek', lat: 43.0456, lng: 42.7297, price: 890, id: 10041, title: 'Svaneti', subtitle: 'Mestia → Ushguli trek',
    full_title: 'Mestia – Ushguli Trek',
    category: 'hiking', region: 'Svaneti', cover_image: '/assets/trips/mestia-ushguli-trek-1.webp',
    distance: '55 km', duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Medium', stay: 'Guesthouses',
    capacity: 12, spots_left: 12, badge: 'top', views: 0,
    season_from: '06-20', season_to: '09-30', season_text: 'Late June – September',
    elevation_gain: '2,400 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/mestia-ushguli-trek-1.webp', '/assets/trips/mestia-ushguli-trek-2.webp', '/assets/trips/mestia-ushguli-trek-3.webp', '/assets/trips/mestia-ushguli-trek-4.webp'],
    summary: 'Four walking days through Upper Svaneti, from Mestia to Ushguli, one of the highest permanently inhabited villages in Europe. You cross the Chkhunderi Pass at about 2,700 m, pass the Adishi glacier valley and sleep in family guesthouses in Zhabeshi, Adishi and Iprali, with Svan stone towers in every village and Shkhara standing over the last day. The trail is not steep for long, but the days are long. We start in Mestia; a Tbilisi or Kutaisi transfer can be added.',
    info: { departure_point: 'Mestia, town centre', departure_time: '08:00', return_info: 'Day 4, ~16:00 Ushguli, then shared transfer to Mestia', transport: 'Walking; 4x4 from Ushguli back to Mestia', group_size: '4 – 12 people', walking_per_day: '5 – 8 hours' },
    itinerary: [
      ['Mestia → Zhabeshi', 'Out of Mestia along the Mulkhura valley, about 16 km with some 770 m of climbing. Svan towers in the villages, and the first good views of Tetnuldi. Night in Zhabeshi.'],
      ['Zhabeshi → Chkhunderi Pass → Adishi', 'A steep first hour through rhododendron forest, then open slopes up to the Chkhunderi Pass at about 2,700 m. The path drops into Adishi, a village of towers at 2,050 m, with the Adishi glacier valley behind it.'],
      ['Adishi → Iprali', 'The longest day by distance. A last look at the glacier, a steep descent, then mostly flat walking beside the Adishi river with a couple of crossings. Night in Iprali.'],
      ['Iprali → Ushguli', 'An undulating trail through Davberi to Ushguli and its four villages under Shkhara. Time at the Lamaria church, lunch, and a shared 4x4 transfer back to Mestia.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained; two guides for groups over 8'],
      ['3 nights in guesthouses', 'Zhabeshi, Adishi and Iprali, shared rooms'],
      ['Meals', 'Breakfast and dinner every day, picnic lunches on the trail'],
      ['Luggage transport', 'Large bags are moved by road between villages when the road allows it'],
      ['Transfer Ushguli → Mestia', 'Shared 4x4 on day 4'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Getting to Mestia', 'Tbilisi or Kutaisi transfers, flights and marshrutkas are not included; we can arrange a private transfer'],
      ['Personal gear', 'Boots, rain shell, warm layer, sleeping liner'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Extra snacks and drinks', 'Bought in the villages'],
    ],
  },
  // TODO verify: moraine altitude and the 6 – 7 hour round trip are estimates; 1,300 m gain kept from the previous listing
  {
    slug: 'gergeti-trinity-glacier', lat: 42.6575, lng: 44.6453, price: 340, id: 10042, title: 'Kazbegi', subtitle: 'Gergeti Trinity & glacier',
    full_title: 'Kazbegi – Gergeti Trinity & Glacier',
    category: 'hiking', region: 'Mtskheta-Mtianeti', cover_image: '/assets/trips/gergeti-trinity-glacier-1.webp',
    distance: '16 km', duration: '2 days', duration_long: '2 days / 1 night',
    difficulty: 'Medium', stay: 'Guesthouse',
    capacity: 12, spots_left: 12, badge: '', views: 0,
    season_from: '06-15', season_to: '10-15', season_text: 'Mid-June – mid-October',
    elevation_gain: '1,300 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/gergeti-trinity-glacier-1.webp', '/assets/trips/gergeti-trinity-glacier-2.webp', '/assets/trips/gergeti-trinity-glacier-3.webp', '/assets/trips/gergeti-trinity-glacier-4.webp'],
    summary: 'The classic Georgian view, walked rather than photographed from a car. On the first afternoon you climb from Stepantsminda to Gergeti Trinity church at 2,170 m with Mount Kazbek behind it. On the second day you keep going up the Chkheri valley toward the moraine below the Gergeti glacier, an unmarked path on loose ground with one of the closest views of Kazbek you can get without crampons.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 2, ~21:00 Tbilisi', transport: 'Minibus both ways', group_size: '4 – 12 people', walking_per_day: 'Day 1: 2 hours. Day 2: 6 – 7 hours' },
    itinerary: [
      ['Tbilisi → Stepantsminda → Gergeti Trinity', 'Drive the Georgian Military Road with stops at Ananuri fortress and the Friendship monument viewpoint at the Jvari pass. After checking in, walk up to Gergeti Trinity church for the evening light on Kazbek. Night in a Stepantsminda guesthouse.'],
      ['Gergeti glacier moraine → Tbilisi', 'Early start past the church and on up toward the moraine below the Gergeti glacier, about 6 to 7 hours there and back. A late lunch in Stepantsminda, then the drive to Tbilisi.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained, English-speaking'],
      ['1 night in a guesthouse', 'Stepantsminda, shared room, breakfast included'],
      ['Dinner on day 1', 'At the guesthouse'],
      ['Transport', 'Minibus Tbilisi – Stepantsminda – Tbilisi'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Lunches', 'Picnic or café lunch on both days, roughly 20 – 30 ₾ a day'],
      ['Personal gear', 'Boots, rain shell, warm layer, sun protection'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Car up to the church', 'Taxis run to the church; we walk, and a lift is paid locally'],
    ],
  },
  // TODO verify: distance and gain are the sum of the two operator figures (11 km + 8.6 km, 650 m + 690 m); the Abano Pass road usually opens in June, confirm the opening date each year; Tbilisi return time; park fee wording
  {
    slug: 'tusheti-omalo-dartlo-diklo', lat: 42.3789, lng: 45.63, price: 780, id: 10043, title: 'Tusheti', subtitle: 'Omalo, Diklo & Dartlo',
    full_title: 'Tusheti Trek: Omalo, Diklo & Dartlo',
    category: 'hiking', region: 'Tusheti', cover_image: '/assets/trips/tusheti-omalo-dartlo-diklo-1.webp',
    distance: '20 km', duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Medium', stay: 'Guesthouses',
    capacity: 10, spots_left: 10, badge: 'new', views: 0,
    season_from: '06-25', season_to: '09-25', season_text: 'Late June – September',
    elevation_gain: '1,350 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/tusheti-omalo-dartlo-diklo-1.webp', '/assets/trips/tusheti-omalo-dartlo-diklo-2.webp', '/assets/trips/tusheti-omalo-dartlo-diklo-3.webp', '/assets/trips/tusheti-omalo-dartlo-diklo-4.webp'],
    summary: 'Tusheti is reached over the Abano Pass, one of the highest drivable roads in Georgia, and is cut off from the rest of the country for much of the year. This trip spends two days on the road and two on foot: Omalo and its Keshelo fortress, the walk through Shenako to Diklo near the Russian border, then over the Tutareki Pass at 1,911 m to Dartlo, a village of stone towers and slate roofs. Sleeping is in family guesthouses, and the walking days are four to five hours each.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '07:00', return_info: 'Day 4, ~22:00 Tbilisi', transport: '4x4 over the Abano Pass', group_size: '4 – 10 people', walking_per_day: '4 – 5 hours on days 2 and 3' },
    itinerary: [
      ['Tbilisi → Abano Pass → Omalo', 'A full day on the road: through Kakheti and Pshaveli, then the unpaved Abano Pass road in 4x4s, arriving in Omalo in the late afternoon. A short walk up to Keshelo fortress, dinner and night in a guesthouse.'],
      ['Omalo → Shenako → Diklo', 'About 11 km and 5 hours with roughly 650 m of climbing, through Shenako to Diklo, a village close to the Russian border with its own fortress. Night in a Diklo guesthouse.'],
      ['Diklo → Tutareki Pass → Dartlo', 'The Tutareki Pass at 1,911 m, then down to Dartlo, about 8.6 km and 4 hours. Short, but with climbing on both sides. Time in the village before dinner.'],
      ['Dartlo → Omalo → Tbilisi', 'A morning in Dartlo, the 4x4 back to Omalo and over the Abano Pass, and the long drive to Tbilisi.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained, English-speaking'],
      ['3 nights in guesthouses', 'Omalo, Diklo and Dartlo, shared rooms'],
      ['Meals', 'Breakfast and dinner every day, picnic lunches on the walking days'],
      ['4x4 transport', 'Tbilisi – Omalo – Tbilisi, including the Abano Pass'],
      ['Park fees', 'Tusheti National Park entry'],
    ],
    excluded: [
      ['Lunch on the driving days', 'Roadside stops, roughly 20 – 30 ₾ each'],
      ['Personal gear', 'Boots, rain shell, warm layer, sleeping liner'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Horses', 'Available in Omalo for luggage, charged locally'],
    ],
  },
  // TODO verify: lake altitude (~2,800 m by some sources, not stated in the text) and 1,100 m gain are not verified; the 5 km approach to the lower lakes comes from one source; horse carriage of gear; camp coordinates are approximate
  {
    slug: 'abudelauri-lakes-camp', lat: 42.5575, lng: 44.8444, price: 480, id: 10044, title: 'Abudelauri', subtitle: 'Three lakes under Chaukhi',
    full_title: 'Abudelauri Lakes Camp',
    category: 'camping', region: 'Mtskheta-Mtianeti', cover_image: '/assets/trips/abudelauri-lakes-camp-1.webp',
    distance: '20 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Medium', stay: 'Tents',
    capacity: 10, spots_left: 10, badge: 'top', views: 0,
    season_from: '07-01', season_to: '09-30', season_text: 'July – September',
    elevation_gain: '1,100 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/abudelauri-lakes-camp-1.webp', '/assets/trips/abudelauri-lakes-camp-2.webp', '/assets/trips/abudelauri-lakes-camp-3.webp', '/assets/trips/abudelauri-lakes-camp-4.webp'],
    summary: 'Two nights in tents beside the Abudelauri lakes in Khevsureti, three alpine lakes (blue, green and white) at the foot of the Chaukhi massif. You walk up from the village of Roshka on the first afternoon, spend the middle day around the lakes with time to go as far as the foot of the Chaukhi Pass, and come down on the third morning. Shorter days than the Juta crossing, with the same scenery.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 3, ~19:00 Tbilisi', transport: 'Minibus to Roshka', group_size: '4 – 10 people', walking_per_day: '3 – 6 hours' },
    itinerary: [
      ['Tbilisi → Roshka → lower lakes', 'Drive through the Pshavi and Aragvi valleys to Roshka (about 4 hours). After lunch, a steady walk of roughly 5 km up the valley to the lower lakes. We pitch camp and cook dinner.'],
      ['Lakes and Chaukhi Pass viewpoint', 'A day at altitude with a light pack: the blue, green and white lakes, and a climb toward the foot of the Chaukhi Pass for the view of the massif. Back to camp for dinner.'],
      ['Camp → Roshka → Tbilisi', 'Breakfast, break camp, walk down to Roshka and drive back to Tbilisi.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained'],
      ['Tents and mats', 'Two-person tents and sleeping mats, pitched at camp'],
      ['Camp meals', 'Dinner on days 1 and 2, breakfast on days 2 and 3, picnic lunches'],
      ['Transport', 'Minibus Tbilisi – Roshka – Tbilisi'],
      ['Gear carriage', 'Tents and food are carried by horse to the lower lakes'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Sleeping bag', 'Bring one rated to 0 °C, or hire from us'],
      ['Personal gear', 'Boots, rain shell, warm layers, headlamp'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Day-one lunch', 'Bought on the way, roughly 20 – 30 ₾'],
    ],
  },
  // TODO verify: trail length (38 km) and 2,250 m gain come from one operator track, other sources say 42 – 48 km; lake altitude 2,780 – 2,800 m; the exact camp sites and the stage split into four days; park permit rules and fee
  {
    slug: 'black-rock-lake-camp', lat: 41.8222, lng: 46.275, price: 640, id: 10045, title: 'Lagodekhi', subtitle: 'Black Rock Lake trek',
    full_title: 'Lagodekhi: Black Rock Lake Camp',
    category: 'camping', region: 'Kakheti', cover_image: '/assets/trips/black-rock-lake-camp-1.webp',
    distance: '38 km', duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Hard', stay: 'Tents',
    capacity: 8, spots_left: 8, badge: 'new', views: 0,
    season_from: '06-25', season_to: '09-20', season_text: 'Late June – September',
    elevation_gain: '2,250 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/black-rock-lake-camp-1.webp', '/assets/trips/black-rock-lake-camp-2.webp', '/assets/trips/black-rock-lake-camp-3.webp', '/assets/trips/black-rock-lake-camp-4.webp'],
    summary: 'A four-day return walk from the Lagodekhi Protected Areas, on Georgia\'s eastern edge, up through forest and then open alpine ground to Black Rock Lake at roughly 2,800 m, close to the Dagestan border ridge. It is a long, steep climb, with a night out in tents on the way up and another near the lake. The park requires registration in advance, and we do that for you.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '07:30', return_info: 'Day 4, ~20:00 Tbilisi', transport: 'Minibus Tbilisi – Lagodekhi', group_size: '4 – 8 people', walking_per_day: '5 – 8 hours' },
    itinerary: [
      ['Tbilisi → Lagodekhi → first camp', 'Drive east to Lagodekhi, register at the park visitor centre, and walk into the forest to the first camp, with a stop at the Ninoskhevi waterfall if time allows.'],
      ['Forest camp → high camp', 'The steep day: out of the trees and up onto the open slopes toward the lake basin. Camp below the lake.'],
      ['Black Rock Lake → back down', 'A short climb to Black Rock Lake with a long stop on the shore, then down to the lower camp for the night.'],
      ['Lower camp → Tbilisi', 'Walk out to the park entrance after breakfast and drive back to Tbilisi.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained'],
      ['Park registration', 'Lagodekhi Protected Areas permit arranged for you'],
      ['Tents and mats', 'Two-person tents and sleeping mats'],
      ['Camp meals', 'Dinner and breakfast at camp, picnic lunches on the trail'],
      ['Transport', 'Minibus Tbilisi – Lagodekhi – Tbilisi'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Sleeping bag', 'Bring one rated to 0 °C, or hire from us'],
      ['Personal gear', 'Boots, rain shell, warm layers, headlamp, poles'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Day-one lunch', 'Bought on the way, roughly 20 – 30 ₾'],
    ],
  },
  // TODO verify: whether overnight camping is permitted at the planned site (the valley lies in a protected and border-zone area): confirm with the park and the border police before selling; 500 m gain; camp location near Ketrisi; valley coordinates approximate
  {
    slug: 'truso-valley-camp', lat: 42.6, lng: 44.48, price: 420, id: 10046, title: 'Truso', subtitle: 'Valley camp near Kazbegi',
    full_title: 'Truso Valley Camp',
    category: 'camping', region: 'Mtskheta-Mtianeti', cover_image: '/assets/trips/truso-valley-camp-1.webp',
    distance: '22 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Easy', stay: 'Tents',
    capacity: 12, spots_left: 12, badge: '', views: 0,
    season_from: '06-01', season_to: '09-30', season_text: 'June – September',
    elevation_gain: '500 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/truso-valley-camp-1.webp', '/assets/trips/truso-valley-camp-2.webp', '/assets/trips/truso-valley-camp-3.webp', '/assets/trips/truso-valley-camp-4.webp'],
    summary: 'A relaxed two nights in the Truso valley west of Kazbegi, a wide river valley with mineral springs, orange travertine terraces, old stone villages and the ruined Zakagori fortress at its end. The walking is mostly flat, around 22 km over the middle day, and fits first-time campers and families with older children. The valley is a border-zone area, so we handle the paperwork.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '09:00', return_info: 'Day 3, ~20:00 Tbilisi', transport: 'Minibus + 4x4 into the valley', group_size: '4 – 12 people', walking_per_day: '2 – 6 hours' },
    itinerary: [
      ['Tbilisi → Truso valley → camp', 'Drive the Military Road to Kvemo Okrokana and take the 4x4 track into the valley. Short walk to the camp site near Ketrisi, tents up before dinner.'],
      ['Mineral springs → Zakagori fortress', 'Walk up the valley past the Abano mineral lake and the travertine terraces to the ruined Zakagori fortress. Lunch by the river, then a flat return to camp.'],
      ['Camp → Stepantsminda → Tbilisi', 'Pack up, 4x4 out of the valley, lunch in Stepantsminda and the drive back.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained'],
      ['Tents and mats', 'Two-person tents and sleeping mats, pitched at camp'],
      ['Camp meals', 'Dinner and breakfast at camp, picnic lunches'],
      ['Transport', 'Minibus Tbilisi – Kazbegi and 4x4 into the valley'],
      ['Border-zone paperwork', 'Arranged for the group'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Sleeping bag', 'Bring one rated to 5 °C, or hire from us'],
      ['Personal gear', 'Boots, rain shell, warm layer, sun protection'],
      ['Travel insurance', 'Required, arrange before arrival'],
      ['Day-three lunch', 'In Stepantsminda, roughly 20 – 30 ₾'],
    ],
  },
  // TODO verify: whether camping at the lakes is permitted; lake altitude 2,740 – 2,760 m and ridge cross 3,328 m come from single sources; Mestia meeting point; how gear is carried up
  {
    slug: 'koruldi-lakes-camp', lat: 43.0456, lng: 42.7297, price: 420, id: 10047, title: 'Mestia', subtitle: 'Koruldi lakes camp',
    full_title: 'Koruldi Lakes Camp',
    category: 'camping', region: 'Svaneti', cover_image: '/assets/trips/koruldi-lakes-camp-1.webp',
    distance: '20 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Medium', stay: 'Tents',
    capacity: 10, spots_left: 10, badge: '', views: 0,
    season_from: '06-25', season_to: '09-25', season_text: 'Late June – September',
    elevation_gain: '1,200 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/koruldi-lakes-camp-1.webp', '/assets/trips/koruldi-lakes-camp-2.webp', '/assets/trips/koruldi-lakes-camp-3.webp', '/assets/trips/koruldi-lakes-camp-4.webp'],
    summary: 'The Koruldi lakes sit about 1,200 m above Mestia, at roughly 2,750 m, with the Ushba and Tetnuldi ranges in front of them. Most visitors do the climb as a day trip and leave by early afternoon. This trip stays two nights in tents by the lakes, so you have the evening and the sunrise to yourselves, and a free middle day for the Koruldi ridge cross at about 3,330 m. We meet in Mestia; Tbilisi transfers can be added.',
    info: { departure_point: 'Mestia, town centre', departure_time: '09:00', return_info: 'Day 3, ~16:00 Mestia', transport: 'Walking from Mestia; optional 4x4 to the viewpoint', group_size: '4 – 10 people', walking_per_day: '4 – 6 hours' },
    itinerary: [
      ['Mestia → Koruldi lakes', 'Leave Mestia and climb through the forest to the lakes, about 1,200 m of ascent. Camp is pitched near the shore, with dinner as the light goes.'],
      ['Koruldi ridge cross', 'A full day with a light pack: up to the Koruldi ridge at about 3,330 m for the view of the central Caucasus and back. Anyone who prefers a rest day can stay by the lakes.'],
      ['Lakes → Mestia', 'Break camp after breakfast and walk down to Mestia, with lunch in town.'],
    ],
    included: [
      ['Mountain guide', 'Certified, first-aid trained'],
      ['Tents and mats', 'Two-person tents and sleeping mats'],
      ['Camp meals', 'Dinner on days 1 and 2, breakfast on days 2 and 3, picnic lunches'],
      ['Gear carriage', 'Tents and food go up by 4x4 and horse where the track allows'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Getting to Mestia', 'Tbilisi and Kutaisi transfers are not included; we can arrange a private transfer'],
      ['Sleeping bag', 'Bring one rated to 0 °C, or hire from us'],
      ['Personal gear', 'Boots, rain shell, warm layers, headlamp'],
      ['Travel insurance', 'Required, arrange before arrival'],
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
    // TODO verify: whether the week includes the lift pass, the hotel nights and the transfer (taken from the old defaults and the transport line); cat or heli day is shown as an optional add-on
    included: [
      ['Freeride guide', 'Certified, leads every riding day'],
      ['Avalanche safety session', 'Day one: transceiver and companion rescue'],
      ['Avalanche kit', 'Transceiver, probe and shovel on every off-piste day'],
      ['Accommodation', 'Five nights in a Gudauri hotel, breakfast included'],
      ['Lift pass', 'For all six riding days'],
      ['Transfer', 'Minibus Tbilisi – Gudauri – Tbilisi'],
    ],
    excluded: [
      ['Equipment rental', 'Skis or board, boots and helmet, hired in resort'],
      ['Travel insurance', 'Must cover off-piste riding and rescue'],
      ['Lunches and dinners', 'Mountain restaurants, your choice'],
      ['Cat or heli day', 'Optional add-on, priced on the day and weather-dependent'],
    ],
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
    // TODO verify: waiting time wording
    included: [
      ['Driver', 'Local, English-speaking where asked for'],
      ['Vehicle', 'Sedan or minibus, sized to the group and the luggage'],
      ['Fuel and tolls', 'All included in the price'],
      ['Waiting time', 'Included for a normal pickup, such as after a landing'],
    ],
    excluded: [
      ['Meals and drinks', 'Not included on the way'],
      ['Extra stops', 'Chargeable if they add time'],
      ['Overnight waiting', 'Charged if a flight is delayed to the next day'],
    ],
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
    // TODO verify: whether the lesson price covers lift pass or equipment (assumed not)
    included: [
      ['Certified instructor', 'Ski or snowboard, private or small group'],
      ['The lesson time', 'Two hours on the slope you are already on'],
      ['Lesson plan for your level', 'Built around what you can do and what you want to work on'],
    ],
    excluded: [
      ['Lift pass', 'Buy one at the ticket office for the days you ride'],
      ['Equipment rental', 'Skis or board, boots and helmet, hired in resort'],
      ['Travel insurance', 'Recommended, and required for off-piste lessons'],
      ['Getting to Gudauri', 'Transfers are booked separately'],
    ],
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
  // TODO verify: accommodation split between guesthouse, meteo station and tents; the last-day ~20:00 return; satellite or radio link; 36 km and 3,300 m gain kept from the previous listing
  {
    slug: 'kazbek-summit', lat: 42.6997, lng: 44.5186, price: 1450, id: 10048, title: 'Kazbek', subtitle: '5,054 m summit climb',
    full_title: 'Mount Kazbek Summit Climb',
    category: 'mountaineering', region: 'Kazbegi', cover_image: '/assets/trips/kazbek-summit-1.webp',
    distance: '36 km', duration: '7 days', duration_long: '7 days / 6 nights',
    difficulty: 'Hard', stay: 'Guesthouse, meteo station & tents',
    capacity: 8, spots_left: 8, badge: 'top', views: 0,
    season_from: '06-25', season_to: '09-10', season_text: 'Late June – early September',
    elevation_gain: '3,300 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'IFMGA-qualified mountain guide' },
    gallery: ['/assets/trips/kazbek-summit-1.webp', '/assets/trips/kazbek-summit-2.webp', '/assets/trips/kazbek-summit-3.webp', '/assets/trips/kazbek-summit-4.webp'],
    summary: 'A guided ascent of Kazbek (Mkinvartsveri), the classic Georgian glacier peak at 5,054 m. Two nights in Stepantsminda to get used to the height, an acclimatisation climb past Gergeti Trinity, a night at the meteo station at about 3,650 m, glacier and crampon training, then a summit push in the dark. A reserve day is built in for weather. For fit hikers ready for their first big mountain; no previous crampon experience is needed, but you will learn it here.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 7, ~20:00 Tbilisi', transport: 'Minibus Tbilisi – Stepantsminda; 4x4 to Gergeti', group_size: '2 – 8 people, one guide per two climbers on summit day', walking_per_day: '5 – 12 hours' },
    itinerary: [
      ['Tbilisi → Stepantsminda', 'Drive the Military Road north, gear check and an evening briefing with the guide.'],
      ['Gergeti → Sabertse Pass', 'First climb past the Trinity church to around 3,000 m for acclimatisation, back down to sleep in town.'],
      ['Up to the meteo station', 'Cross the Gergeti glacier moraine to the station at about 3,650 m. Night in the station or in tents.'],
      ['Acclimatisation & glacier school', 'A climb to around 4,200 m, rope work, crampons and ice-axe arrest on the glacier.'],
      ['Summit day', 'Start around 01:00, summit at sunrise at 5,054 m, back to the station by afternoon.'],
      ['Reserve day', 'Kept free in case the weather closes the summit window; if the summit is done, a rest day and an easy walk down.'],
      ['Down → Tbilisi', 'Walk out to Gergeti and drive back to the city.'],
    ],
    included: [
      ['Mountain guides', 'IFMGA-qualified lead guide, one guide to every two climbers on summit day'],
      ['Group gear', 'Ropes, tents, stoves and fuel'],
      ['Accommodation', 'Guesthouse in Stepantsminda, meteo station bunks and tents on the mountain'],
      ['Meals', 'Breakfast, lunch and dinner for all seven days'],
      ['Transport', 'Minibus Tbilisi – Stepantsminda – Tbilisi and 4x4 to the trailhead'],
      ['Permits', 'Kazbegi National Park and border-zone paperwork'],
      ['First aid and radio', 'Medical kit and a satellite or radio link carried by the lead guide'],
    ],
    excluded: [
      ['Personal technical gear', 'Boots, crampons, harness, ice axe, helmet; hire available'],
      ['Sleeping bag', 'Rated to -15 °C or lower, or hire from us'],
      ['Travel insurance', 'Must cover climbing to 5,000 m, including rescue'],
      ['Porters and horses', 'To the meteo station on request, charged separately'],
    ],
  },
  // TODO verify: distance left blank on purpose; summit height 4,858 m (some sources say 4,860 m); camp heights, the 4x4 start point and the gain of 2,150 m are estimates; whether park or border-zone permits are needed
  {
    slug: 'tetnuldi-ascent', lat: 43.0311, lng: 42.9932, price: 1250, id: 10049, title: 'Tetnuldi', subtitle: '4,858 m via the south-west ridge',
    full_title: 'Mount Tetnuldi Ascent',
    category: 'mountaineering', region: 'Svaneti', cover_image: '/assets/trips/tetnuldi-ascent-1.webp',
    duration: '5 days', duration_long: '5 days / 4 nights',
    difficulty: 'Hard', stay: 'Tents on the glacier',
    capacity: 6, spots_left: 6, badge: 'new', views: 0,
    season_from: '07-10', season_to: '09-05', season_text: 'Mid-July – early September',
    elevation_gain: '2,150 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/tetnuldi-ascent-1.webp', '/assets/trips/tetnuldi-ascent-2.webp', '/assets/trips/tetnuldi-ascent-3.webp', '/assets/trips/tetnuldi-ascent-4.webp'],
    summary: 'Tetnuldi, at about 4,858 m, is the most accessible high peak in Svaneti and a good second step after Kazbek. The normal route follows the south-west ridge from the Adishi valley: a grassy first camp, a second camp on the lower glacier and a third camp on the ridge about 500 m below the summit, with a graded PD+ ridge to the top. Summit day is about eight hours up and four to five down. Good fitness and basic crampon skills help; we revise them on the way.',
    info: { departure_point: 'Mestia, town centre', departure_time: '08:00', return_info: 'Day 5, ~17:00 Mestia', transport: '4x4 from Mestia to the start of the route', group_size: '2 – 6 people, one guide per two climbers', walking_per_day: '4 – 10 hours' },
    itinerary: [
      ['Mestia → camp 1', 'Gear check in Mestia, 4x4 toward the start of the route, and a walk of a few hours to the first camp on the grassy slopes below the moraine, around 2,900 m.'],
      ['Camp 1 → camp 2 on the glacier', 'Up the moraine and onto the lower glacier. Rope and crampon revision, then camp on the ice-free edge.'],
      ['Camp 2 → camp 3 on the ridge', 'Steeper ground up to the south-west ridge, where the route joins it. Camp about 500 m below the summit. Early dinner and bed.'],
      ['Summit day', 'Start in the dark, about eight hours to the summit by the PD+ ridge, and four to five hours back down to the camp or lower.'],
      ['Descent → Mestia', 'Back down to the 4x4 and the drive to Mestia. A reserve day is not built in, so a weather delay is taken from this day.'],
    ],
    included: [
      ['Mountain guides', 'Certified guide, one to every two climbers'],
      ['Group gear', 'Ropes, tents, stoves and fuel'],
      ['Meals', 'All meals on the mountain, from lunch on day 1 to lunch on day 5'],
      ['Transport', '4x4 from Mestia to the start and back'],
      ['Permits', 'Border-zone and park paperwork where it applies'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Personal technical gear', 'Boots, crampons, harness, ice axe, helmet; hire available'],
      ['Sleeping bag', 'Rated to -10 °C or lower, or hire from us'],
      ['Travel insurance', 'Must cover climbing to 5,000 m, including rescue'],
      ['Getting to Mestia', 'Tbilisi or Kutaisi transfers; we can arrange them'],
    ],
  },
  // TODO verify: peak heights (~3,800 m) and pass height (~3,340 m); the route and grade are chosen by the guide and not documented here; camp location near the pass; 16 km and 1,500 m are estimates; Juta coordinates approximate
  {
    slug: 'chaukhi-massif-climb', lat: 42.5936, lng: 44.7531, price: 520, id: 10050, title: 'Chaukhi', subtitle: 'Scrambling on the massif',
    full_title: 'Chaukhi Massif: Guided Scramble',
    category: 'mountaineering', region: 'Mtskheta-Mtianeti', cover_image: '/assets/trips/chaukhi-massif-climb-1.webp',
    distance: '16 km', duration: '3 days', duration_long: '3 days / 2 nights',
    difficulty: 'Hard', stay: 'Guesthouse & tents',
    capacity: 6, spots_left: 6, badge: 'new', views: 0,
    season_from: '07-15', season_to: '09-20', season_text: 'Mid-July – September',
    elevation_gain: '1,500 m', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/chaukhi-massif-climb-1.webp', '/assets/trips/chaukhi-massif-climb-2.webp', '/assets/trips/chaukhi-massif-climb-3.webp', '/assets/trips/chaukhi-massif-climb-4.webp'],
    summary: 'The Chaukhi massif is the jagged rock wall above the Juta valley, with summits around 3,800 m and the pass at about 3,340 m. This is a short trip for hikers who want to try real rock: a night in Juta, a night in tents near the pass, and a day of guided scrambling and easy roped sections on the pass ridge. The guide chooses the line on the day according to the group, the weather and the rock. No technical grade is promised.',
    info: { departure_point: 'Tbilisi, Liberty Square', departure_time: '08:00', return_info: 'Day 3, ~20:00 Tbilisi', transport: 'Minibus to Juta', group_size: '2 – 6 people, one guide per two climbers', walking_per_day: '3 – 8 hours' },
    itinerary: [
      ['Tbilisi → Juta → Tina lake', 'Drive to Juta and walk up to the Tina lake area for the first look at the massif. Gear check and a short briefing on moving on rock. Night in a Juta guesthouse.'],
      ['Up to the pass ridge', 'Climb toward the Chaukhi Pass and camp near its foot. In the afternoon, a first guided scramble with ropes where the guide decides they are needed. Night in tents.'],
      ['Ridge day → Juta → Tbilisi', 'An early start for the ridge, back to camp for a late breakfast, then down to Juta and the drive to Tbilisi.'],
    ],
    included: [
      ['Mountain guides', 'Certified guide, one to every two climbers on the ridge'],
      ['Climbing gear', 'Ropes, helmets and harnesses for the group'],
      ['Accommodation', 'One night in a Juta guesthouse and one in tents near the pass'],
      ['Meals', 'Breakfast and dinner on both nights, picnic lunches'],
      ['Transport', 'Minibus Tbilisi – Juta – Tbilisi'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Personal gear', 'Boots with a stiff sole, rain shell, warm layers, gloves'],
      ['Sleeping bag', 'Rated to -5 °C or lower, or hire from us'],
      ['Travel insurance', 'Must cover climbing, including rescue'],
      ['Day-one lunch', 'Bought on the way, roughly 20 – 30 ₾'],
    ],
  },
  // TODO verify: summit height 4,008 m (some sources 4,009 – 4,010 m); route facts (Tskhumari 1,300 m, camp 2,800 m, 1,500 m up, grade 2A) come from one operator page; the four-day split with one reserve day; the 4x4 to Tskhumari; Mestia meeting point; coordinates are the summit
  {
    slug: 'laila-ascent', lat: 42.9202, lng: 42.557, price: 780, id: 10051, title: 'Laila', subtitle: '4,008 m via Tskhumari',
    full_title: 'Mount Laila Ascent',
    category: 'mountaineering', region: 'Svaneti', cover_image: '/assets/trips/laila-ascent-1.webp',
    duration: '4 days', duration_long: '4 days / 3 nights',
    difficulty: 'Hard', stay: 'Tents',
    capacity: 6, spots_left: 6, badge: 'new', views: 0,
    season_from: '07-15', season_to: '09-30', season_text: 'Mid-July – September',
    elevation_gain: '1,500 m to camp, 1,200 m to the summit', languages: 'EN · GE · RU',
    guide: { name: 'Torito team', role: 'Certified mountain guide' },
    gallery: ['/assets/trips/laila-ascent-1.webp', '/assets/trips/laila-ascent-2.webp', '/assets/trips/laila-ascent-3.webp', '/assets/trips/laila-ascent-4.webp'],
    summary: 'Laila (Lahili) is a 4,008 m peak in the Svaneti range, south of Mestia, and one of the more approachable 4,000 m summits in Georgia. The route starts in the village of Tskhumari at about 1,300 m, climbs through forest and along a ridge to a camp at about 2,800 m, and finishes on a glacier summit day where everyone is roped up in teams. A reserve day is built in for weather or slow acclimatisation. Good fitness and a head for height matter more than technical skill.',
    info: { departure_point: 'Mestia, town centre', departure_time: '07:00', return_info: 'Day 4, ~16:00 Mestia', transport: '4x4 Mestia – Tskhumari – Mestia', group_size: '2 – 6 people, one guide per two climbers', walking_per_day: 'Day 1: 5 – 6 hours. Day 2: 6 – 7 hours up and back from camp' },
    itinerary: [
      ['Mestia → Tskhumari → camp', 'Gear check in Mestia, then a 4x4 to Tskhumari at about 1,300 m. A steady climb through forest and along the ridge, around 1,500 m of ascent in five to six hours, to the camp at about 2,800 m. Tents up and an early dinner.'],
      ['Summit day', 'Start at dawn, roped up in teams across the glacier, about 1,200 m to the 4,008 m summit. Allow six to seven hours for the round trip back to camp.'],
      ['Reserve day', 'Kept for bad weather or a slow acclimatisation. If the summit is done, a rest day at camp or an early start down.'],
      ['Camp → Tskhumari → Mestia', 'Break camp, walk down to Tskhumari and take the 4x4 back to Mestia in the afternoon.'],
    ],
    included: [
      ['Mountain guides', 'Certified guide, one to every two climbers on summit day'],
      ['Group gear', 'Ropes, tents, stoves and fuel'],
      ['Camp meals', 'All meals from lunch on day 1 to lunch on day 4'],
      ['Transport', '4x4 Mestia – Tskhumari – Mestia'],
      ['First aid kit', 'Carried by the guide'],
    ],
    excluded: [
      ['Personal technical gear', 'Boots, crampons, harness, ice axe, helmet; hire available'],
      ['Sleeping bag', 'Rated to -5 °C or lower, or hire from us'],
      ['Travel insurance', 'Must cover climbing to 4,000 m, including rescue'],
      ['Getting to Mestia', 'Tbilisi or Kutaisi transfers; we can arrange them'],
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
