'use client';

// English / Georgian UI strings.
//
// This covers the interface chrome only. Trip names, summaries and itineraries
// live in tours-data.js (and later the database) and stay in English until
// Georgian versions are written — see the note in README.

import { createContext, useContext, useEffect, useState } from 'react';

export const LOCALES = ['en', 'ka'];

const STRINGS = {
  en: {
    'nav.menu': 'Menu',
    'nav.search': 'Search tours, hikes, instructors…',
    'nav.askAi': 'Ask AI',
    'nav.login': 'Log in',
    'nav.saved': 'Favorites',
    'nav.bookings': 'Bookings',
    'nav.tours': 'Tours',
    'nav.activities': 'Activities',
    'nav.catalog': 'Catalog',
    'nav.instructors': 'Instructors',
    'nav.info': 'Info',
    'nav.home': 'Home',
    'nav.about': 'About us',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',
    'nav.terms': 'Terms',

    'account.myBookings': 'My bookings',
    'account.changePassword': 'Change password',
    'account.signOut': 'Sign out',
    'account.adminPanel': 'Admin panel',
    'account.chat': 'Chat',

    'chat.title': 'Torito',
    'chat.sub': 'We usually reply within a few hours',
    'chat.greeting': 'Hello! What can I help you with?',
    'chat.autoReply': 'Thanks for your message — our team will reply as soon as possible.',
    'chat.failed': 'That message could not be sent. Please try again in a moment.',
    'chat.placeholder': 'Type a message…',
    'chat.open': 'Ask a question',
    'chat.close': 'Close chat',
    'chat.send': 'Send',
    'chat.aboutTrip': 'I have a question about this trip:',
    'chat.aboutHike': 'I have a question about this hike:',
    'chat.aboutCamp': 'I have a question about this camping trip:',
    'chat.aboutSki': 'I have a question about this ski trip:',
    'chat.aboutTour': 'I have a question about this tour:',

    'hero.title1': 'THE MOUNTAINS',
    'hero.title2': 'ARE WAITING',
    'hero.sub': 'Tours, hikes, ski instructors and camping across Georgia',
    'hero.cta': 'Explore trips',

    'home.exploreByActivity': 'Explore by activity',
    'home.catalog': 'Browse the catalog',
    'home.whatWeDo': 'What we do',
    'cat.all': 'All',
    'cat.tours': 'Tours',
    'cat.hiking': 'Hiking',
    'cat.ski': 'Ski & snowboard',
    'cat.transfer': 'Transfer',
    // still referenced by rows saved before the catalogue was reshuffled
    'cat.camping': 'Camping',
    'cat.culture': 'Culture',
    'cat.lesson': 'Lessons',
    'cat.freeride': 'Freeride',

    'listing.title': 'Catalog',
    'listing.count': '{n} trips available',
    'listing.none': 'No trips match those dates. Try a wider range.',
    'listing.searchTitle': 'Results for “{q}”',
    'listing.noSearch': 'Nothing matches “{q}”. Try a shorter word, or browse everything below.',
    'listing.clearSearch': 'Clear search',
    'listing.anyDates': 'Any dates',
    'listing.viewTrip': 'View trip',
    'listing.waitlist': 'Join waitlist',
    'listing.spotsOpen': 'Spots open',
    'listing.fullyBooked': 'Fully booked',
    'listing.peopleMax': 'people max',

    'cal.clear': 'Clear',
    'cal.done': 'Done',

    'detail.about': 'About this trip',
    'detail.whereWeGo': 'Where we go',
    'detail.included': "What's included",
    'detail.book': 'Book a spot',
    'detail.ask': 'Ask a question',
    'detail.notFound': 'Trip not found',
    'detail.browseAll': 'Browse all activities',
    'detail.day': 'Day',
    'detail.plan': 'Plan',
    'fact.distance': 'Distance',
    'fact.duration': 'Duration',
    'fact.difficulty': 'Difficulty',
    'fact.elevation': 'Elevation gain',
    'fact.season': 'Season',
    'fact.languages': 'Languages',
    'fact.stay': 'Stay',
    'fact.price': 'Price',

    'booking.title': 'Book a spot',
    'booking.waitlistTitle': 'Join the waitlist',
    'booking.when': 'When do you want to go?',
    'booking.howMany': 'How many people?',
    'booking.person': 'person',
    'booking.people': 'people',
    'booking.place': 'place',
    'booking.places': 'places',
    'booking.left': '{n} left on this departure',
    'booking.total': 'Total',
    'booking.priceNote': 'Per person, all inclusions listed below. Paid on the day.',
    'booking.chooseDate': 'Choose a date first',
    'booking.request': 'Request',
    'booking.sent': 'Request sent.',
    'booking.notStored': 'Nothing is stored yet — this is the form only.',
    'booking.trip': 'Trip',
    'booking.date': 'Date',
    'booking.fullNote': 'This trip is fully booked. Leave your details and we will contact you the moment a place frees up.',
    'booking.onWaitlist': 'You are on the waitlist. We will be in touch.',

    'auth.signIn': 'Sign in to your account',
    'auth.createAccount': 'Create your account',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirm': 'Confirm password',
    'auth.fullName': 'Full name',
    'auth.remember': 'Remember me',
    'auth.forgot': 'Forgot password?',
    'auth.signInBtn': 'Sign in',
    'auth.createBtn': 'Create account',
    'auth.newHere': 'New here?',
    'auth.haveAccount': 'Already have an account?',
    'auth.wait': 'Please wait…',
    'auth.backToSignIn': 'Back to sign in',

    'footer.explore': 'Explore',
    'footer.tagline': 'Tours, hikes, ski instructors and camping across Georgia.',

    'saved.title': 'Favorites',
    'saved.showAll': 'Show all activities',
    'saved.empty': 'Nothing saved yet. Tap the heart on any trip to keep it here.',
    'saved.signedOut': 'Sign in to see the trips you have saved.',
    'saved.browse': 'Browse activities',

    'fav.add': 'Save to favourites',
    'fav.remove': 'Remove from favourites',

    'gate.title': 'Sign in to book',
    'gate.titleRate': 'Sign in to rate this trip',
    'gate.perkRate': 'Your rating counts towards the trip score',
    'gate.perkRateName': 'Your review is posted under your name',
    'gate.perkRateEdit': 'You can come back and change what you wrote',
    'gate.perkTrack': 'Your requests in one place, with what you asked for',
    'gate.perkDetails': 'No retyping your name, email and phone every time',
    'gate.perkUpdates': 'We can reach you the moment a place is confirmed',
    'gate.create': 'Create a free account',
    'gate.haveAccount': 'Already with us?',
    'gate.signIn': 'Sign in',

    'prompt.title': 'Keep this trip',
    'prompt.sub': 'Create a free account to save it and pick up where you left off.',
    'prompt.perkSave': 'Save the trips you like and find them in one place',
    'prompt.perkBook': 'Book a place in a couple of taps, no re-typing',
    'prompt.perkSeason': 'Hear first when a season opens or a spot frees up',
    'prompt.create': 'Create a free account',
    'prompt.haveAccount': 'Already with us?',
    'prompt.signIn': 'Sign in',

    'theme.toLight': 'Switch to light theme',
    'theme.toDark': 'Switch to dark theme',
    'lang.switch': 'ქართული',
  },

  ka: {
    'nav.menu': 'მენიუ',
    'nav.search': 'მოძებნე ტური, ლაშქრობა, ინსტრუქტორი…',
    'nav.askAi': 'AI დახმარება',
    'nav.login': 'შესვლა',
    'nav.saved': 'რჩეულები',
    'nav.bookings': 'ჯავშნები',
    'nav.tours': 'ტურები',
    'nav.activities': 'აქტივობები',
    'nav.catalog': 'კატალოგი',
    'nav.instructors': 'ინსტრუქტორები',
    'nav.info': 'ინფორმაცია',
    'nav.home': 'მთავარი',
    'nav.about': 'ჩვენ შესახებ',
    'nav.faq': 'კითხვები',
    'nav.contact': 'კონტაქტი',
    'nav.terms': 'პირობები',

    'account.myBookings': 'ჩემი ჯავშნები',
    'account.changePassword': 'პაროლის შეცვლა',
    'account.signOut': 'გასვლა',
    'account.adminPanel': 'ადმინ პანელი',
    'account.chat': 'ჩატი',

    'chat.title': 'ტორიტო',
    'chat.sub': 'ჩვეულებრივ ვპასუხობთ რამდენიმე საათში',
    'chat.greeting': 'გამარჯობა! რით შემიძლია დაგეხმაროთ?',
    'chat.autoReply': 'გმადლობთ შეტყობინებისთვის — ჩვენი გუნდი უმოკლეს ვადაში გიპასუხებთ.',
    'chat.failed': 'შეტყობინება ვერ გაიგზავნა. სცადეთ ცოტა ხანში.',
    'chat.placeholder': 'დაწერეთ შეტყობინება…',
    'chat.open': 'დასვით კითხვა',
    'chat.close': 'ჩატის დახურვა',
    'chat.send': 'გაგზავნა',
    'chat.aboutTrip': 'მაქვს კითხვა ამ ტურზე:',
    'chat.aboutHike': 'მაქვს კითხვა ამ ლაშქრობაზე:',
    'chat.aboutCamp': 'მაქვს კითხვა ამ კემპინგზე:',
    'chat.aboutSki': 'მაქვს კითხვა ამ სათხილამურო ტურზე:',
    'chat.aboutTour': 'მაქვს კითხვა ამ ტურზე:',

    'hero.title1': 'მთები',
    'hero.title2': 'გელოდებათ',
    'hero.sub': 'ტურები, ლაშქრობები, სათხილამურო ინსტრუქტორები და კემპინგი საქართველოში',
    'hero.cta': 'ნახე ტურები',

    'home.exploreByActivity': 'აირჩიე აქტივობა',
    'home.catalog': 'კატალოგი',
    'home.whatWeDo': 'რას ვაკეთებთ',
    'cat.all': 'ყველა',
    'cat.tours': 'ტურები',
    'cat.hiking': 'ლაშქრობა',
    'cat.ski': 'თხილამური და სნოუბორდი',
    'cat.transfer': 'ტრანსფერი',
    'cat.camping': 'კემპინგი',
    'cat.culture': 'კულტურა',
    'cat.lesson': 'გაკვეთილები',
    'cat.freeride': 'ფრირაიდი',

    'listing.title': 'კატალოგი',
    'listing.count': 'ხელმისაწვდომია {n} ტური',
    'listing.none': 'ამ თარიღებში ტური არ მოიძებნა. სცადეთ სხვა პერიოდი.',
    'listing.searchTitle': 'ძიება: „{q}“',
    'listing.noSearch': 'არაფერი მოიძებნა „{q}“-ზე. სცადეთ სხვა სიტყვა.',
    'listing.clearSearch': 'ძიების გასუფთავება',
    'listing.anyDates': 'ნებისმიერი თარიღი',
    'listing.viewTrip': 'ნახე ტური',
    'listing.waitlist': 'რიგში ჩაწერა',
    'listing.spotsOpen': 'ადგილები თავისუფალია',
    'listing.fullyBooked': 'ადგილები ამოწურულია',
    'listing.peopleMax': 'ადამიანი მაქს.',

    'cal.clear': 'გასუფთავება',
    'cal.done': 'მზადაა',

    'detail.about': 'ტურის შესახებ',
    'detail.whereWeGo': 'მარშრუტი',
    'detail.included': 'რა შედის ფასში',
    'detail.book': 'დაჯავშნე ადგილი',
    'detail.ask': 'დასვი კითხვა',
    'detail.notFound': 'ტური ვერ მოიძებნა',
    'detail.browseAll': 'ნახე ყველა აქტივობა',
    'detail.day': 'დღე',
    'detail.plan': 'გეგმა',
    'fact.distance': 'მანძილი',
    'fact.duration': 'ხანგრძლივობა',
    'fact.difficulty': 'სირთულე',
    'fact.elevation': 'სიმაღლის ნაზრდი',
    'fact.season': 'სეზონი',
    'fact.languages': 'ენები',
    'fact.stay': 'განთავსება',
    'fact.price': 'ფასი',

    'booking.title': 'დაჯავშნე ადგილი',
    'booking.waitlistTitle': 'ჩაეწერე რიგში',
    'booking.when': 'როდის გსურთ წასვლა?',
    'booking.howMany': 'რამდენი ადამიანი?',
    'booking.person': 'ადამიანი',
    'booking.people': 'ადამიანი',
    'booking.place': 'ადგილი',
    'booking.places': 'ადგილი',
    'booking.left': 'დარჩენილია {n}',
    'booking.total': 'ჯამი',
    'booking.priceNote': 'ერთ ადამიანზე. გადახდა ადგილზე.',
    'booking.chooseDate': 'ჯერ აირჩიე თარიღი',
    'booking.request': 'დაჯავშნე',
    'booking.sent': 'მოთხოვნა გაიგზავნა.',
    'booking.notStored': 'ჯერ არაფერი ინახება — ეს მხოლოდ ფორმაა.',
    'booking.trip': 'ტური',
    'booking.date': 'თარიღი',
    'booking.fullNote': 'ტურზე ადგილები ამოწურულია. დატოვე მონაცემები და დაგიკავშირდებით, როგორც კი ადგილი გამოთავისუფლდება.',
    'booking.onWaitlist': 'რიგში ხართ ჩაწერილი. დაგიკავშირდებით.',

    'auth.signIn': 'შედი ანგარიშზე',
    'auth.createAccount': 'შექმენი ანგარიში',
    'auth.email': 'ელფოსტა',
    'auth.password': 'პაროლი',
    'auth.confirm': 'გაიმეორე პაროლი',
    'auth.fullName': 'სახელი და გვარი',
    'auth.remember': 'დამიმახსოვრე',
    'auth.forgot': 'დაგავიწყდა პაროლი?',
    'auth.signInBtn': 'შესვლა',
    'auth.createBtn': 'ანგარიშის შექმნა',
    'auth.newHere': 'ახალი ხარ?',
    'auth.haveAccount': 'უკვე გაქვს ანგარიში?',
    'auth.wait': 'გთხოვთ, დაელოდოთ…',
    'auth.backToSignIn': 'დაბრუნება შესვლაზე',

    'footer.explore': 'აქტივობები',
    'footer.tagline': 'ტურები, ლაშქრობები, სათხილამურო ინსტრუქტორები და კემპინგი საქართველოში.',

    'saved.title': 'რჩეულები',
    'saved.showAll': 'ყველა აქტივობა',
    'saved.empty': 'ჯერ არაფერია შენახული. დააჭირე გულს, რომ ტური აქ დარჩეს.',
    'saved.signedOut': 'შედი ანგარიშზე, რომ ნახო შენახული ტურები.',
    'saved.browse': 'ნახე აქტივობები',

    'fav.add': 'შენახვა რჩეულებში',
    'fav.remove': 'რჩეულებიდან წაშლა',

    'gate.title': 'დასაჯავშნად შედი ანგარიშში',
    'gate.titleRate': 'შესაფასებლად შედი ანგარიშში',
    'gate.perkRate': 'შენი შეფასება ტურის ქულაში აისახება',
    'gate.perkRateName': 'შეფასება შენი სახელით გამოქვეყნდება',
    'gate.perkRateEdit': 'ნებისმიერ დროს შეგიძლია შეცვალო დაწერილი',
    'gate.perkTrack': 'შენი მოთხოვნები ერთ ადგილას',
    'gate.perkDetails': 'აღარ დაგჭირდება ყოველ ჯერზე მონაცემების შევსება',
    'gate.perkUpdates': 'დაგიკავშირდებით ადგილის დადასტურებისთანავე',
    'gate.create': 'შექმენი უფასო ანგარიში',
    'gate.haveAccount': 'უკვე გვყავხარ?',
    'gate.signIn': 'შესვლა',

    'prompt.title': 'შეინახე ეს ტური',
    'prompt.sub': 'შექმენი უფასო ანგარიში, რომ შეინახო და მოგვიანებით დაუბრუნდე.',
    'prompt.perkSave': 'შეინახე მოწონებული ტურები და იპოვე ერთ ადგილას',
    'prompt.perkBook': 'დაჯავშნე ორი შეხებით, ხელახლა შევსების გარეშე',
    'prompt.perkSeason': 'პირველმა შეიტყვე სეზონის გახსნისა და ახალი ადგილების შესახებ',
    'prompt.create': 'შექმენი უფასო ანგარიში',
    'prompt.haveAccount': 'უკვე ჩვენთან ხარ?',
    'prompt.signIn': 'შესვლა',

    'theme.toLight': 'ღია თემა',
    'theme.toDark': 'მუქი თემა',
    'lang.switch': 'English',
  },
};

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  // read the saved choice after mount: the server has no localStorage, and
  // rendering a different language than the server sent would be a hydration
  // mismatch
  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved && LOCALES.includes(saved)) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next) => {
    setLangState(next);
    localStorage.setItem('lang', next);
  };

  const t = (key, vars) => {
    let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}
