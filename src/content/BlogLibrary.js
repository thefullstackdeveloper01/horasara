/**
 * Long-form article library.
 *
 * Articles are stored as the same block structure the administrative pages use,
 * so one renderer covers both. Each article names its sources and stays inside
 * the honesty rule the disclaimer sets: describe what the tradition says and
 * what the astronomy does, never assert a proven outcome.
 */

export const ARTICLES = [
  {
    slug: 'how-to-read-your-birth-chart',
    title: 'How to read your birth chart without drowning in it',
    description: 'A chart has hundreds of data points. Five of them do most of the work. Start there.',
    published: '2026-01-08',
    updated: '2026-01-08',
    readingMinutes: 9,
    tag: 'Getting started',
    lede: 'Most people open their first kundali, see a grid of abbreviations and close it again. The trick is knowing that a chart is read in layers, and that the first layer is only five things.',
    blocks: [
      { type: 'h', text: 'Layer one: the five things that matter most' },
      { type: 'p', text: 'Before any yoga, divisional chart or aspect, find these. Everything else is commentary on them.' },
      { type: 'dl', items: [
        ['Lagna (ascendant)', 'The sign rising on the eastern horizon at your birth moment. It sets which sign sits in which house, so it decides the entire frame of the chart. It changes roughly every two hours, which is why birth time matters so much.'],
        ['Chandra rāśi (Moon sign)', 'Where the Moon sat. In Jyotish this carries more weight than the Sun sign does in Western astrology: it governs the mind, and the whole Vimshottari Dasha system is calculated from it.'],
        ['Janma nakshatra', 'Which of the 27 lunar mansions the Moon occupied, and which quarter (pada) of it. This sets your starting Dasha and its balance at birth.'],
        ['The current Dasha', 'Which planetary period you are living through now, and the sub-period inside it. This is the timing layer, and it is what makes a reading about now rather than about your character in general.'],
        ['The Lagna lord', 'The planet ruling your rising sign, and where it sits. A strong, well-placed Lagna lord is read as general resilience; an afflicted one as a life that needs more effort in the same circumstances.'],
      ] },
      { type: 'note', tone: 'info', title: 'Where to find these', text: 'Every one of these five appears at the top of the natal chart calculator on this site, before any of the technical detail. If you read nothing else, read those five lines.' },

      { type: 'h', text: 'Layer two: houses are areas of life' },
      { type: 'p', text: 'The twelve houses (bhavas) divide life into domains. A planet sitting in a house is traditionally said to colour that domain; the lord of that house, and where it sits, is said to describe where the domain\u2019s energy goes.' },
      { type: 'table', head: ['House', 'Domain', 'Read as'], rows: [
        ['1st', 'Self, body, temperament', 'How you meet the world'],
        ['2nd', 'Wealth, family, speech', 'Accumulated resources and how you speak'],
        ['3rd', 'Courage, siblings, effort', 'Initiative and short journeys'],
        ['4th', 'Home, mother, comfort, property', 'The inner base you return to'],
        ['5th', 'Children, intellect, past merit', 'Creativity and what comes easily'],
        ['6th', 'Debt, disease, enemies, service', 'Obstacles you work through'],
        ['7th', 'Marriage, partnership, contracts', 'The other person in the room'],
        ['8th', 'Upheaval, inheritance, the hidden', 'Transformation and what is not visible'],
        ['9th', 'Fortune, father, dharma, teachers', 'Belief, guidance and luck'],
        ['10th', 'Career, status, public action', 'What you are known for'],
        ['11th', 'Gains, networks, elder siblings', 'What arrives through others'],
        ['12th', 'Loss, expenditure, seclusion, foreign lands', 'Where things drain away, and where you withdraw'],
      ] },
      { type: 'p', text: 'A practical way in: take the area of life you actually care about this month, find its house, find that house\u2019s lord, and see where the lord sits and which Dasha is running. That is a focused reading, and it is far more useful than trying to read all twelve at once.' },

      { type: 'h', text: 'Layer three: dignity, not just placement' },
      { type: 'p', text: 'The same planet in the same house reads differently depending on its condition. The classical vocabulary here is compact:' },
      { type: 'ul', items: [
        'Exalted (uccha) \u2014 in the sign where its expression is strongest.',
        'Own sign (svakshetra) \u2014 comfortable and self-sufficient.',
        'Friendly, neutral or inimical sign \u2014 supported, indifferent or obstructed.',
        'Debilitated (neecha) \u2014 in the sign opposite its exaltation, traditionally the weakest expression.',
        'Combust (asta) \u2014 too close to the Sun to be seen, read as an expression that is present but hidden.',
        'Retrograde (vakri) \u2014 apparently moving backwards, read by different schools as either strengthened or inward-turned.',
      ] },
      { type: 'p', text: 'The last two points are astronomy, not symbolism: combustion is a real angular separation from the Sun, and retrogradation is a real apparent-motion phenomenon caused by the Earth overtaking an outer planet. The interpretation attached to them is tradition; the phenomena themselves are measurable.' },

      { type: 'h', text: 'What to ignore at the start' },
      { type: 'ul', items: [
        'The sixteen divisional charts. D-9 (Navamsa) becomes useful early for relationship questions; the rest can wait until the basics are solid.',
        'Long lists of yogas. Many are conditional on factors that cancel them, and a chart with an impressive-sounding yoga and a weak Lagna lord is not the chart the yoga\u2019s name suggests.',
        'Ashtakavarga point totals, until you understand what the houses mean without them.',
        'Anything a website tells you is a "rare and powerful" combination. Genuinely rare combinations are rare.',
      ] },

      { type: 'h', text: 'A caution worth repeating' },
      { type: 'p', text: 'A chart is a structured way of thinking about a life, not a report on what will happen in it. No placement in any chart determines an illness, a divorce, a bankruptcy or a death, and nobody who tells you otherwise is reading responsibly. If a reading frightens you, that is a sign to stop reading and talk to a person \u2014 a doctor, a lawyer, a counsellor \u2014 about the actual thing you are worried about.' },

      { type: 'h', text: 'Sources' },
      { type: 'p', text: 'House significations and planetary dignity follow Brihat Parashara Hora Shastra; the house-reading summaries are cross-checked against Phaladeepika and Saravali. Where those texts differ, our reference library records both.' },
    ],
    related: ['understanding-vimshottari-dasha', 'why-birth-time-matters'],
  },

  {
    slug: 'understanding-vimshottari-dasha',
    title: 'Vimshottari Dasha: the timing system that makes a forecast possible',
    description: 'A chart says what. Dasha says when. Here is how the 120-year cycle is built and how to read the period you are in.',
    published: '2026-01-15',
    updated: '2026-01-15',
    readingMinutes: 11,
    tag: 'Timing',
    lede: 'Without a timing system, astrology can only describe a personality. Vimshottari Dasha is the mechanism that turns a static chart into a sequence of periods, and it is the backbone of almost every forecast on this site.',
    blocks: [
      { type: 'h', text: 'The basic structure' },
      { type: 'p', text: 'Vimshottari means "one hundred and twenty". The system divides a notional 120-year lifespan among nine planetary rulers, each getting a fixed number of years in a fixed order that never changes.' },
      { type: 'table', head: ['Order', 'Planet', 'Years'], rows: [
        ['1', 'Ketu', '7'], ['2', 'Venus (Shukra)', '20'], ['3', 'Sun (Surya)', '6'], ['4', 'Moon (Chandra)', '10'],
        ['5', 'Mars (Mangala)', '7'], ['6', 'Rahu', '18'], ['7', 'Jupiter (Guru)', '16'], ['8', 'Saturn (Shani)', '19'], ['9', 'Mercury (Budha)', '17'],
      ] },
      { type: 'p', text: 'Those add to 120. The sequence is cyclical, so after Mercury it returns to Ketu.' },

      { type: 'h', text: 'Where your sequence starts' },
      { type: 'p', text: 'Your starting point is set by the Moon\u2019s nakshatra at birth. Each of the 27 nakshatras is assigned one of the nine planets, repeating three times through the list. The Moon\u2019s nakshatra lord becomes your first Dasha ruler.' },
      { type: 'p', text: 'You almost never start a period at its beginning. The balance is proportional: if the Moon had travelled 40% of the way through its nakshatra when you were born, then 40% of that planet\u2019s Dasha had already elapsed, and you begin with the remaining 60%. This is why two people born on the same day in the same city can be in completely different periods \u2014 the Moon moves about 13 degrees a day, so a few hours changes the balance materially.' },

      { type: 'h', text: 'Periods inside periods' },
      { type: 'p', text: 'Each Mahadasha subdivides into nine Antardashas in the same planetary order, starting with the Mahadasha lord itself, each proportional to its own share of 120 years. Those subdivide again into Pratyantardashas, and so on to five levels in the full system.' },
      { type: 'p', text: 'In practice, three levels carry most of the useful signal:' },
      { type: 'dl', items: [
        ['Mahadasha', 'The chapter. Sets the general theme for years at a time.'],
        ['Antardasha', 'The section. Usually the most practically useful level, running from a few months to about three years.'],
        ['Pratyantardasha', 'The paragraph. Weeks to a few months, useful for narrowing a window down.'],
      ] },
      { type: 'p', text: 'A traditional reading combines them: the Mahadasha lord sets the background, the Antardasha lord sets the immediate theme, and the relationship between the two \u2014 friendly, neutral or inimical, and how each is placed in your chart \u2014 shapes how the period is read.' },

      { type: 'h', text: 'How a period is judged' },
      { type: 'p', text: 'Classically, a Dasha lord is assessed on several factors at once rather than by its name alone:' },
      { type: 'ul', items: [
        'Which houses it rules in your chart. A planet ruling the 6th, 8th or 12th is read differently from one ruling the 5th or 9th, regardless of which planet it is.',
        'Where it sits, and in what dignity \u2014 exalted, own sign, debilitated, combust.',
        'Which planets aspect it, and whether those are supportive or obstructive in your chart.',
        'Its functional nature for your particular Lagna. Saturn is a benefic for some rising signs and a malefic for others; there is no universal "bad planet".',
        'What the current transits are doing to the houses it governs.',
      ] },
      { type: 'note', tone: 'info', title: 'This is why generic Dasha tables mislead', text: 'A page that tells you "Saturn Mahadasha means seven and a half hard years" is ignoring the five factors above. The same Saturn period reads very differently for a Libra ascendant, where Saturn is a yogakaraka, than for an Aries ascendant.' },

      { type: 'h', text: 'The other Dasha systems' },
      { type: 'p', text: 'Vimshottari is the default because it applies to any chart, but it is not the only one. Yogini Dasha runs on an eight-part 36-year cycle and is used for shorter-range questions. Chara Dasha, from the Jaimini system, is sign-based rather than planet-based and is often used for career and relationship timing. Kalachakra Dasha derives from the nakshatra pada by a different route entirely. When two systems point at the same period, practitioners treat that convergence as meaningful; when they disagree, most defer to Vimshottari.' },

      { type: 'h', text: 'Reading your own period sensibly' },
      { type: 'ol', items: [
        'Find your current Mahadasha and Antardasha lords.',
        'For each, note which houses it rules for your Lagna and where it is placed.',
        'Ask what those houses mean for the area of life you actually care about.',
        'Look at when the Antardasha changes. That date is usually more informative than the description of the period itself.',
        'Treat all of it as a lens for reflection, not as a schedule of events.',
      ] },

      { type: 'h', text: 'What Dasha cannot do' },
      { type: 'p', text: 'It cannot tell you that you will get a job on a particular date, that a marriage will fail, or that an illness is coming. Period boundaries are arithmetic, and the meanings attached to them are traditional interpretation that has not been shown to predict individual outcomes. Use it to think about timing and emphasis. Do not use it to make a medical, financial or legal decision.' },

      { type: 'h', text: 'Sources' },
      { type: 'p', text: 'Period lengths, nakshatra lordships and the proportional-balance rule follow Brihat Parashara Hora Shastra, chapters on Dasha. Functional benefic and malefic assignments by ascendant follow the standard Parashari treatment as summarised in Phaladeepika.' },
    ],
    related: ['how-to-read-your-birth-chart', 'what-panchang-actually-tells-you'],
  },

  {
    slug: 'why-birth-time-matters',
    title: 'Why birth time matters more than you think — and what to do if you do not know it',
    description: 'Four minutes can move your ascendant. Here is exactly what breaks, what survives, and how rectification works.',
    published: '2026-01-22',
    updated: '2026-01-22',
    readingMinutes: 8,
    tag: 'Getting started',
    lede: 'The single most common question we get is whether a reading is still usable with an approximate birth time. The honest answer: partly, and it depends entirely on which part of the reading you want.',
    blocks: [
      { type: 'h', text: 'The arithmetic of the problem' },
      { type: 'p', text: 'The Earth rotates once in roughly 24 hours, so the ascendant moves through all twelve signs in that time \u2014 about one sign every two hours on average, and faster or slower depending on your latitude and which sign is rising. One degree of ascendant takes roughly four minutes.' },
      { type: 'p', text: 'That matters because the ascendant decides which sign occupies which house. Move it across a sign boundary and every house shifts by one, which changes which planet is in which house, which houses each planet rules, and therefore most of the interpretation that follows.' },

      { type: 'h', text: 'What breaks with a wrong time' },
      { type: 'ul', items: [
        'The ascendant and therefore the entire house structure.',
        'Every house-based statement: career, marriage, property, health, children.',
        'House lordships, which drive functional benefic and malefic assessment.',
        'Bhava-based divisional charts, including the ones used for marriage and career questions.',
        'Anything derived from the ascendant degree, such as certain special lagnas and upagrahas.',
      ] },

      { type: 'h', text: 'What survives' },
      { type: 'table', head: ['Element', 'Daily movement', 'Usable with a rough time?'], rows: [
        ['Sun sign', 'About 1°', 'Yes, unless you were born near a sign change'],
        ['Moon sign', 'About 13°', 'Usually, unless born near a sign change'],
        ['Moon nakshatra', 'About one nakshatra per day', 'Usually, but check the boundary'],
        ['Dasha balance', 'Derived from Moon position', 'Approximately — expect a few weeks of drift'],
        ['Mars, Jupiter, Saturn positions', 'Under 1°', 'Yes'],
        ['Ascendant', 'One full cycle per day', 'No'],
      ] },
      { type: 'p', text: 'So a Moon-based reading \u2014 nakshatra, mental temperament, the broad Dasha sequence \u2014 remains broadly usable. A house-based reading does not.' },

      { type: 'h', text: 'Finding your actual birth time' },
      { type: 'ol', items: [
        'The birth certificate is the best source. In India, municipal birth records often include the recorded time even when the printed certificate does not \u2014 it is worth requesting the full record.',
        'Hospital admission or delivery records sometimes hold a more precise time than the certificate.',
        'A family horoscope prepared at birth usually states the time it was cast for, which is the time someone recorded on the day.',
        'Ask relatives, but ask carefully: "before or after lunch", "before the morning aarti", "your father had already left for work" often narrows a four-hour window better than someone\u2019s confident recollection of a clock.',
      ] },
      { type: 'note', tone: 'warn', title: 'Beware the rounded time', text: 'A time recorded as exactly 6:00, 12:00 or midnight is very often a rounded entry rather than an observation. Treat a suspiciously round time as an approximate one, and treat a time like 14:37 as far more likely to be genuine.' },

      { type: 'h', text: 'What birth-time rectification is, and is not' },
      { type: 'p', text: 'Rectification is the practice of narrowing an uncertain birth time by testing candidate times against events that have already happened \u2014 a marriage, a move, a job change, a bereavement \u2014 and choosing the time whose Dasha and transit structure best matches the record.' },
      { type: 'p', text: 'It is a legitimate traditional technique, and it is also the part of astrology most vulnerable to fitting the answer you want. Several candidate times will usually match a handful of events reasonably well. Be sceptical of any rectification that claims minute-level precision from three life events, and be very sceptical of anyone charging a large fee for it.' },

      { type: 'h', text: 'Working without a time' },
      { type: 'ul', items: [
        'Use noon at your birth place. It is a convention, it keeps the Moon roughly central for the day, and it makes clear that the time is unknown rather than invented.',
        'Read Moon-based material and treat house-based material as unavailable rather than merely uncertain.',
        'Where two adjacent ascendants are both plausible, read both and notice what they agree on. Agreement across candidates is the only part you can lean on.',
        'Record the uncertainty. A chart annotated "time approximate, ±2 hours" is honest; one that silently uses noon is a trap for your future self.',
      ] },

      { type: 'h', text: 'Time zones and historical dates' },
      { type: 'p', text: 'One more trap: the time zone in force at your birth place on your birth date may not be the one in force today. India standardised on IST in 1906 but Calcutta time persisted locally into the 1940s, and many countries have moved zones or observed wartime daylight saving. For births before roughly 1950, check what the local civil time actually was \u2014 an hour of error here does the same damage as an hour of error in the recorded time.' },
    ],
    related: ['how-to-read-your-birth-chart', 'how-to-spot-bad-astrology'],
  },

  {
    slug: 'what-panchang-actually-tells-you',
    title: 'What the Panchang actually tells you',
    description: 'Five limbs, one day. What tithi, vaar, nakshatra, yoga and karana measure, and why muhurta is more than avoiding Rahu Kaal.',
    published: '2026-02-05',
    updated: '2026-02-05',
    readingMinutes: 10,
    tag: 'Panchang',
    lede: 'Panchang means "five limbs". It is a daily almanac built from the positions of the Sun and Moon, and almost everything people use it for \u2014 choosing a date, avoiding a window, planning a ritual \u2014 comes from those five numbers.',
    blocks: [
      { type: 'h', text: 'The five limbs' },
      { type: 'dl', items: [
        ['Tithi', 'The lunar day. Defined as each 12° of angular separation between the Moon and the Sun, so there are 30 tithis in a lunar month. Because the Moon\u2019s speed varies, a tithi can run from about 19 to about 26 hours \u2014 it is not a calendar day and does not start at midnight.'],
        ['Vaar', 'The weekday, running from sunrise to sunrise rather than midnight to midnight. Each is ruled by a planet, which is where the planetary hour (hora) system begins.'],
        ['Nakshatra', 'Which of the 27 lunar mansions the Moon occupies, each spanning 13°20\u2032 of the zodiac. This is the limb most used for muhurta.'],
        ['Yoga', 'A derived quantity: the sum of the Sun\u2019s and Moon\u2019s longitudes, divided into 27 parts. Confusingly, this "yoga" has nothing to do with planetary combination yogas in a natal chart.'],
        ['Karana', 'Half a tithi. Eleven karanas rotate through the month, four of them fixed and seven repeating.'],
      ] },
      { type: 'p', text: 'All five are computed from solar and lunar longitudes, which means a Panchang is as deterministic as an ephemeris. Two Panchangs disagree only when they use different ayanamsa values, different sunrise definitions, or different rules for which tithi "owns" a day.' },

      { type: 'h', text: 'Why your Panchang differs from your neighbour\u2019s' },
      { type: 'ul', items: [
        'Sunrise is local. Tithi and vaar are reckoned from sunrise, so a city 500 km west sees a different boundary.',
        'Some traditions use the tithi running at sunrise for the whole day; others use the one that predominates. This is the usual reason two almanacs place a festival on different dates.',
        'Purnimanta and Amanta month reckoning differ by half a month in where the month begins \u2014 north and south India commonly use different conventions.',
        'Ayanamsa choice shifts every sidereal longitude by about a degree, which can move a nakshatra boundary.',
      ] },
      { type: 'p', text: 'None of this is error. It is a genuine difference of convention, and a good Panchang tells you which conventions it used.' },

      { type: 'h', text: 'Muhurta: more than avoiding Rahu Kaal' },
      { type: 'p', text: 'Most people know one rule \u2014 avoid Rahu Kaal \u2014 and stop there. Traditional muhurta weighs several factors together:' },
      { type: 'table', head: ['Factor', 'What it contributes'], rows: [
        ['Nakshatra', 'Each has a traditional character \u2014 fixed, movable, fierce, gentle \u2014 that suits different activities.'],
        ['Tithi', 'Certain tithis are avoided for certain acts; Amavasya and the fourth, eighth, ninth and fourteenth are the usual cautions.'],
        ['Vaar', 'The day\u2019s planetary ruler should suit the activity.'],
        ['Lagna at the chosen moment', 'The rising sign at the moment of action, which is why muhurta is timed to the minute.'],
        ['Chandra bala and Tara bala', 'The Moon\u2019s position relative to your own natal Moon, which makes muhurta personal rather than universal.'],
        ['Inauspicious windows', 'Rahu Kaal, Yamaganda, Gulika Kaal and Durmuhurta, each a defined fraction of the day.'],
      ] },
      { type: 'note', tone: 'info', title: 'Abhijit muhurta', text: 'The roughly 48-minute window around local solar noon is traditionally considered broadly auspicious for most activities, and is the usual fallback when no better window is available. It is not universally applicable \u2014 several traditions exclude it on Wednesdays.' },

      { type: 'h', text: 'Choghadiya and Hora' },
      { type: 'p', text: 'Choghadiya divides daylight and night into eight parts each, labelled Amrit, Shubh, Labh, Char, Rog, Kaal and Udveg, and is popular in western India for quick decisions. The Hora system divides the day into 24 planetary hours \u2014 unequal, since they are fractions of the actual daylight and night lengths \u2014 cycling through the planets in Chaldean order from the day\u2019s ruler at sunrise. Both are coarse tools, useful for "is this a reasonable hour to start" rather than for major decisions.' },

      { type: 'h', text: 'Using it sensibly' },
      { type: 'ol', items: [
        'Use Panchang for scheduling what is genuinely flexible \u2014 a ceremony, a house-warming, the formal start of a venture.',
        'Do not use it to delay something that should not wait. Medical care, a safety issue, a legal deadline and an emergency have no auspicious hour.',
        'Prefer a window that is good for you \u2014 Chandra bala and Tara bala relative to your own Moon \u2014 over one that is merely good in general.',
        'Check which sunrise and which ayanamsa a Panchang used before trusting a boundary that falls within a few minutes of your intended time.',
      ] },
      { type: 'p', text: 'And the honest caveat that applies everywhere on this site: the five limbs are astronomy and are reliable; the auspiciousness attached to them is tradition and has not been demonstrated to change outcomes.' },
    ],
    related: ['understanding-vimshottari-dasha', 'how-to-spot-bad-astrology'],
  },

  {
    slug: 'how-to-spot-bad-astrology',
    title: 'How to spot bad astrology — a consumer guide',
    description: 'Nine warning signs, and the questions worth asking before you hand over money or a birth time.',
    published: '2026-02-19',
    updated: '2026-02-19',
    readingMinutes: 9,
    tag: 'Consumer advice',
    lede: 'The harm in this field rarely comes from the astrology. It comes from what people sell alongside it. Here is what to watch for — including where we ourselves could do better.',
    blocks: [
      { type: 'h', text: 'Nine warning signs' },
      { type: 'ol', items: [
        'Fear first. A reading that opens with a curse, a dosha or a serious illness, and closes with a product that will avert it, is a sales script with a chart attached.',
        'Guaranteed accuracy. Any figure like "98% accurate" is invented; there is no measurement behind it, because no one is running the controlled study it would require.',
        'Urgency. "This window closes in 48 hours" exists to stop you thinking. Genuine muhurta guidance gives you the window and lets you decide.',
        'An expensive remedy that only they can supply. Classical remedies are mantra, charity, fasting and conduct. A gemstone that must be bought from the astrologer who prescribed it is a retail transaction.',
        'Unsolicited contact. Nobody reputable cold-calls you about your chart, and no legitimate service asks for an OTP or a UPI PIN.',
        'Predicting death or terminal illness. Responsible practitioners refuse to do this, and the classical texts themselves counsel against telling someone such a thing.',
        'No named sources. If a rule cannot be attributed to a text or a school, it may still be someone\u2019s honest experience, but you should be told which it is.',
        'Unfalsifiable readings. If every outcome confirms the reading, the reading said nothing. Watch for statements broad enough to fit anyone \u2014 the effect has a name, and a good reader avoids it deliberately.',
        'Pressure about a person. Being told a prospective spouse, employee or business partner is dangerous, and that only a paid ritual can fix it, harms real people and real relationships.',
      ] },

      { type: 'h', text: 'Questions worth asking' },
      { type: 'ul', items: [
        'Which ayanamsa and house system did you use? A practitioner who cannot answer is not calculating carefully.',
        'Which text does that rule come from? "I have seen it in practice" is an acceptable answer, as long as it is the answer given rather than a false citation.',
        'What would make you wrong? A reader who can describe what would contradict their reading is thinking honestly.',
        'What do you sell besides the reading? Where the money comes from tells you which way the incentives point.',
        'What happens to my birth details afterwards? Birth data is personal data, and you are entitled to know.',
      ] },

      { type: 'h', text: 'The Barnum problem' },
      { type: 'p', text: 'People rate vague, flattering statements as highly accurate descriptions of themselves \u2014 a finding first demonstrated with a generic personality profile handed identically to an entire class, each of whom found it strikingly personal. Astrology output is especially prone to this, because much traditional language is broad by design.' },
      { type: 'p', text: 'A quick test: take a reading written for you, remove the name and the chart details, and ask whether a friend would recognise themselves in it. If they would, the specificity was in your reading of it rather than in the text.' },

      { type: 'h', text: 'Where we are vulnerable to the same criticisms' },
      { type: 'p', text: 'It would be dishonest to write this list without applying it to ourselves.' },
      { type: 'ul', items: [
        'Our forecasts are generated from rules, so some statements are necessarily general. We try to anchor every one to a named factor \u2014 a Dasha lord, a transit, a house \u2014 so you can see what it rests on, but generality is a real limitation.',
        'We sell a subscription. That is a commercial incentive to make readings feel valuable. Our safeguard is that we sell nothing else: no gemstones, no consultations, no remedies, no outbound calls.',
        'Our interpretive layer has not been empirically validated, and we say so on the disclaimer page rather than in small print. It is the honest position, and it is also the reason we will never advertise an accuracy percentage.',
      ] },

      { type: 'h', text: 'If someone has already frightened you' },
      { type: 'p', text: 'It happens often, and it is not foolish to have been shaken by it. Take a breath before paying anything. Nothing in any chart obliges you to spend money today. Talk to someone you trust. If the worry is about health, money or a legal matter, take it to a doctor, an accountant or a lawyer \u2014 those are the people who can actually address it. If you are in distress, please reach out to a local helpline; in India, Tele-MANAS is on 14416.' },
      { type: 'p', text: 'And if someone contacts you claiming to be from this service and asks for money or an OTP, it is not us. Tell us, and we will warn others.' },
    ],
    related: ['why-birth-time-matters', 'how-to-read-your-birth-chart'],
  },

  {
    slug: 'ayanamsa-explained',
    title: 'Ayanamsa: why two accurate charts disagree by a degree',
    description: 'The precession offset that separates sidereal from tropical astrology, and how to choose one and stay with it.',
    published: '2026-03-04',
    updated: '2026-03-04',
    readingMinutes: 7,
    tag: 'Technical',
    lede: 'Two carefully calculated charts for the same birth can place a planet in different signs. Almost always the reason is ayanamsa, and it is worth understanding once rather than being confused by it repeatedly.',
    blocks: [
      { type: 'h', text: 'The astronomy underneath' },
      { type: 'p', text: 'The Earth\u2019s axis wobbles slowly, completing a circuit in roughly 25,800 years. This precession makes the vernal equinox \u2014 the point where the Sun crosses the celestial equator going north \u2014 drift backwards against the fixed stars by about 50.3 arcseconds a year, a little over one degree per 72 years.' },
      { type: 'p', text: 'That leaves two possible zero points for a zodiac:' },
      { type: 'dl', items: [
        ['Tropical', 'Measures from the vernal equinox itself. The signs stay locked to the seasons but drift against the constellations. Standard in Western astrology.'],
        ['Sidereal', 'Measures from a fixed point among the stars. The signs stay aligned with the constellations but drift against the seasons. Standard in Jyotish.'],
      ] },
      { type: 'p', text: 'Ayanamsa is simply the angular gap between the two at a given moment \u2014 currently about 24 degrees. Sidereal longitude = tropical longitude minus ayanamsa. That one subtraction is the whole of it.' },

      { type: 'h', text: 'Why there is more than one value' },
      { type: 'p', text: 'Everyone agrees the gap exists and agrees on the rate of precession. What is not settled is where exactly the sidereal zodiac should start, because the ancient texts do not fix it unambiguously. Different schools anchor it differently, which yields values differing by a degree or so.' },
      { type: 'table', head: ['Ayanamsa', 'Anchor', 'Used by'], rows: [
        ['Lahiri (Chitrapaksha)', 'Places Spica (Chitra) at 180° sidereal.', 'Indian government calendar and most Indian astrologers; the default here.'],
        ['True Lahiri', 'Same basis, with current nutation applied.', 'Practitioners wanting the instantaneous rather than mean value.'],
        ['Raman', 'B. V. Raman\u2019s adjustment, about 1° from Lahiri.', 'The Raman school.'],
        ['Krishnamurti (KP)', 'Slightly different anchor from Lahiri.', 'KP practitioners, who use it with their own sub-lord system.'],
        ['Fagan-Bradley', 'Anchored via Aldebaran and Antares.', 'Western sidereal astrologers.'],
      ] },

      { type: 'h', text: 'What a degree actually changes' },
      { type: 'ul', items: [
        'A planet within a degree of a sign boundary can move to the adjacent sign, which changes its dignity and its house lordship reading.',
        'A Moon within about 13 arcminutes of a nakshatra boundary can change nakshatra, which changes the starting Dasha lord and shifts the entire Dasha timeline.',
        'A planet near the ascendant degree can move between the 12th and 1st house.',
        'Almost everything else moves by an amount too small to change a reading.',
      ] },
      { type: 'note', tone: 'warn', title: 'The rule that matters', text: 'Whichever you choose, stay with it. Mixing ayanamsas \u2014 or comparing a chart cast with one against a reading based on another \u2014 produces contradictions that look like astrological complexity but are just arithmetic.' },

      { type: 'h', text: 'Choosing' },
      { type: 'p', text: 'If you are in India or reading Indian classical material, use Lahiri. If your teacher or family tradition uses Raman or KP, use that \u2014 consistency with the interpretive framework you are reading matters more than the theoretical merits of the anchor. If you are cross-checking against a Western sidereal source, use Fagan-Bradley. This site labels which ayanamsa produced every calculation for exactly this reason.' },

      { type: 'h', text: 'A note on the "wrong sign" headlines' },
      { type: 'p', text: 'Periodically an article announces that everyone\u2019s star sign is wrong because of precession, sometimes adding a thirteenth constellation. The precession part is real astronomy and is precisely what ayanamsa accounts for. The conclusion is not news to Jyotish, which has always used the sidereal zodiac; and the constellation boundaries used in those articles are modern IAU survey boundaries, which are unequal in size and were never the basis of any zodiac, tropical or sidereal.' },
    ],
    related: ['how-to-read-your-birth-chart', 'what-panchang-actually-tells-you'],
  },
];

const bySlug = new Map(ARTICLES.map(a => [a.slug, a]));

export function listArticles() {
  return [...ARTICLES]
    .sort((a, b) => String(b.published).localeCompare(String(a.published)))
    .map(({ blocks, ...rest }) => rest);
}

export function getArticle(slug) {
  return bySlug.get(String(slug || '').toLowerCase()) || null;
}

export function relatedArticles(slug) {
  const article = getArticle(slug);
  if (!article) return [];
  return (article.related || []).map(s => getArticle(s)).filter(Boolean)
    .map(({ blocks, ...rest }) => rest);
}
