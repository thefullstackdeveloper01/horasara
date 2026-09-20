/**
 * ReferenceLibrary — the content layer behind every Knowledge and Lists route.
 *
 * Every entry in the Knowledge and Lists menus used to resolve to the same two
 * portal pages (/knowledge and /lists), and the chips on /lists pointed at
 * /knowledge/<slug> URLs that had no handler at all. This module gives each of
 * those menu entries a real, addressable record so the routes can be genuine
 * pages rather than aliases.
 *
 * Data sources, in order of preference:
 *   1. dataset/used/core/knowledge-topics.json — devotional + remedial reference
 *   2. dataset/used/core/nakshatra_basic_list.json — per-nakshatra classical data
 *   3. dataset/used/core/yogas.json — BPHS yoga shlokas (en/hi/gu)
 *   4. dataset/used/library/_index.json — the 250+ text corpus, for scriptures
 *
 * Nothing here loads a book body; discovery runs off the prebuilt index only.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CORE = join(ROOT, 'dataset', 'used', 'core');
const LIBRARY_INDEX = join(ROOT, 'dataset', 'used', 'library', '_index.json');

export const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function readJson(path, fallback) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback; }
  catch { return fallback; }
}

let _topics = null;
function topicsFile() {
  if (!_topics) _topics = readJson(join(CORE, 'knowledge-topics.json'), { topics: [] });
  return _topics;
}

/* ------------------------------------------------------------- knowledge */

/** Menu-level listing: one row per Knowledge submenu entry. */
export function listKnowledgeTopics() {
  return topicsFile().topics.map(t => ({
    id: t.id, title: t.title, icon: t.icon, category: t.category,
    description: t.description, count: t.count, href: `/knowledge/${t.id}`,
  }));
}

/** One Knowledge topic with all of its entries. */
export function getKnowledgeTopic(id) {
  const t = topicsFile().topics.find(x => x.id === slugify(id));
  if (!t) return null;
  return { ...t, href: `/knowledge/${t.id}` };
}

/** A single entry inside a topic, e.g. /knowledge/gods/hanuman. */
export function getKnowledgeEntry(topicId, entryId) {
  const t = getKnowledgeTopic(topicId);
  if (!t) return null;
  const want = slugify(entryId);
  const item = t.items.find(x => slugify(x.id) === want || slugify(x.name) === want);
  if (!item) return null;
  return {
    topic: { id: t.id, title: t.title, icon: t.icon, fields: t.fields },
    entry: item,
    href: `/knowledge/${t.id}/${item.id}`,
  };
}

/** Free-text search across every knowledge entry. */
export function searchKnowledge(query, { limit = 40 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const t of topicsFile().topics) {
    for (const item of t.items) {
      const hay = JSON.stringify(item).toLowerCase();
      if (hay.includes(q)) {
        out.push({ topic: t.id, topicTitle: t.title, icon: t.icon, id: item.id, name: item.name, href: `/knowledge/${t.id}/${item.id}` });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ rāśi table */

const RASHI = [
  { name: 'Meṣa', english: 'Aries', lord: 'Mars', element: 'Fire', quality: 'Movable (Chara)', gender: 'Male', symbol: 'Ram', bodyPart: 'Head', direction: 'East', varna: 'Kshatriya', gemstone: 'Red Coral', nakshatras: 'Ashvinī, Bharanī, Kṛttikā ¼', traits: 'Initiative, competitiveness, impatience, physical courage. Cardinal fire — begins things readily but tires of maintenance.' },
  { name: 'Vṛṣabha', english: 'Taurus', lord: 'Venus', element: 'Earth', quality: 'Fixed (Sthira)', gender: 'Female', symbol: 'Bull', bodyPart: 'Face, throat', direction: 'South', varna: 'Vaishya', gemstone: 'Diamond', nakshatras: 'Kṛttikā ¾, Rohiṇī, Mṛgaśira ½', traits: 'Stability, sensory enjoyment, accumulation, obstinacy. Fixed earth — slow to move, very slow to reverse.' },
  { name: 'Mithuna', english: 'Gemini', lord: 'Mercury', element: 'Air', quality: 'Dual (Dvisvabhava)', gender: 'Male', symbol: 'Couple', bodyPart: 'Arms, shoulders', direction: 'West', varna: 'Shudra', gemstone: 'Emerald', nakshatras: 'Mṛgaśira ½, Ārdrā, Punarvasu ¾', traits: 'Communication, versatility, trade, restlessness. Dual air — thrives on variety, resists commitment.' },
  { name: 'Karka', english: 'Cancer', lord: 'Moon', element: 'Water', quality: 'Movable (Chara)', gender: 'Female', symbol: 'Crab', bodyPart: 'Chest, lungs', direction: 'North', varna: 'Brahmin', gemstone: 'Pearl', nakshatras: 'Punarvasu ¼, Puṣya, Āśleṣā', traits: 'Emotional memory, nurturing, protection, moodiness. Cardinal water — acts from feeling rather than plan.' },
  { name: 'Siṃha', english: 'Leo', lord: 'Sun', element: 'Fire', quality: 'Fixed (Sthira)', gender: 'Male', symbol: 'Lion', bodyPart: 'Heart, spine', direction: 'East', varna: 'Kshatriya', gemstone: 'Ruby', nakshatras: 'Maghā, Pūrva Phalgunī, Uttara Phalgunī ¼', traits: 'Dignity, authority, generosity, pride. Fixed fire — sustained warmth, needs recognition.' },
  { name: 'Kanyā', english: 'Virgo', lord: 'Mercury', element: 'Earth', quality: 'Dual (Dvisvabhava)', gender: 'Female', symbol: 'Maiden', bodyPart: 'Abdomen, intestines', direction: 'South', varna: 'Vaishya', gemstone: 'Emerald', nakshatras: 'Uttara Phalgunī ¾, Hasta, Chitrā ½', traits: 'Discrimination, service, analysis, worry. Dual earth — the only sign where Mercury is both owner and exalted.' },
  { name: 'Tulā', english: 'Libra', lord: 'Venus', element: 'Air', quality: 'Movable (Chara)', gender: 'Male', symbol: 'Scales', bodyPart: 'Lower back, kidneys', direction: 'West', varna: 'Shudra', gemstone: 'Diamond', nakshatras: 'Chitrā ½, Svātī, Viśākhā ¾', traits: 'Balance, negotiation, partnership, indecision. Cardinal air — the only inanimate sign symbol.' },
  { name: 'Vṛścika', english: 'Scorpio', lord: 'Mars (Ketu co-rules)', element: 'Water', quality: 'Fixed (Sthira)', gender: 'Female', symbol: 'Scorpion', bodyPart: 'Genitals, excretory', direction: 'North', varna: 'Brahmin', gemstone: 'Red Coral', nakshatras: 'Viśākhā ¼, Anurādhā, Jyeṣṭhā', traits: 'Depth, secrecy, research, transformation. Fixed water — holds intensity rather than releasing it.' },
  { name: 'Dhanu', english: 'Sagittarius', lord: 'Jupiter', element: 'Fire', quality: 'Dual (Dvisvabhava)', gender: 'Male', symbol: 'Archer', bodyPart: 'Thighs, hips', direction: 'East', varna: 'Kshatriya', gemstone: 'Yellow Sapphire', nakshatras: 'Mūla, Pūrva Āṣāḍhā, Uttara Āṣāḍhā ¼', traits: 'Philosophy, travel, teaching, bluntness. Dual fire — aims far, adjusts the target often.' },
  { name: 'Makara', english: 'Capricorn', lord: 'Saturn', element: 'Earth', quality: 'Movable (Chara)', gender: 'Female', symbol: 'Crocodile', bodyPart: 'Knees', direction: 'South', varna: 'Vaishya', gemstone: 'Blue Sapphire', nakshatras: 'Uttara Āṣāḍhā ¾, Śravaṇa, Dhaniṣṭhā ½', traits: 'Ambition, structure, endurance, coldness. Cardinal earth — builds slowly toward status.' },
  { name: 'Kumbha', english: 'Aquarius', lord: 'Saturn (Rahu co-rules)', element: 'Air', quality: 'Fixed (Sthira)', gender: 'Male', symbol: 'Water-bearer', bodyPart: 'Calves, ankles', direction: 'West', varna: 'Shudra', gemstone: 'Blue Sapphire', nakshatras: 'Dhaniṣṭhā ½, Śatabhiṣā, Pūrva Bhādrapadā ¾', traits: 'Networks, ideology, detachment, stubbornness. Fixed air — holds a position on principle.' },
  { name: 'Mīna', english: 'Pisces', lord: 'Jupiter', element: 'Water', quality: 'Dual (Dvisvabhava)', gender: 'Female', symbol: 'Two fish', bodyPart: 'Feet', direction: 'North', varna: 'Brahmin', gemstone: 'Yellow Sapphire', nakshatras: 'Pūrva Bhādrapadā ¼, Uttara Bhādrapadā, Revatī', traits: 'Imagination, compassion, withdrawal, escapism. Dual water — the last sign; themes of release and completion.' },
];

const SOLAR_MONTHS = [
  { name: 'Meṣa', english: 'Aries', gregorian: 'mid-Apr to mid-May', note: 'Solar new year in Tamil Nadu, Bengal, Assam, Kerala, Punjab.' },
  { name: 'Vṛṣabha', english: 'Taurus', gregorian: 'mid-May to mid-Jun', note: 'Vaishakha season; Akshaya Tritiya falls near its start.' },
  { name: 'Mithuna', english: 'Gemini', gregorian: 'mid-Jun to mid-Jul', note: 'Onset of monsoon; Ashadha observances.' },
  { name: 'Karka', english: 'Cancer', gregorian: 'mid-Jul to mid-Aug', note: 'Dakshinayana begins; Karka Sankranti.' },
  { name: 'Siṃha', english: 'Leo', gregorian: 'mid-Aug to mid-Sep', note: 'Shravana observances; Onam in Kerala.' },
  { name: 'Kanyā', english: 'Virgo', gregorian: 'mid-Sep to mid-Oct', note: 'Pitru Paksha falls in this solar month.' },
  { name: 'Tulā', english: 'Libra', gregorian: 'mid-Oct to mid-Nov', note: 'Navaratri and Diwali season; Sun is debilitated here.' },
  { name: 'Vṛścika', english: 'Scorpio', gregorian: 'mid-Nov to mid-Dec', note: 'Kartika observances; Mandala season in Kerala.' },
  { name: 'Dhanu', english: 'Sagittarius', gregorian: 'mid-Dec to mid-Jan', note: 'Dhanurmasa — traditionally avoided for marriage muhurta.' },
  { name: 'Makara', english: 'Capricorn', gregorian: 'mid-Jan to mid-Feb', note: 'Uttarayana begins; Makara Sankranti and Pongal.' },
  { name: 'Kumbha', english: 'Aquarius', gregorian: 'mid-Feb to mid-Mar', note: 'Magha bathing; Kumbha Mela reckoning.' },
  { name: 'Mīna', english: 'Pisces', gregorian: 'mid-Mar to mid-Apr', note: 'Meena masa; marriage muhurtas generally resume after it ends.' },
];

const LUNAR_MONTHS = [
  { name: 'Chaitra', season: 'Vasanta (spring)', purnimaNakshatra: 'Chitrā', note: 'Lunar new year; Ugadi, Gudi Padwa, Rama Navami, Chaitra Navaratri.' },
  { name: 'Vaishakha', season: 'Vasanta', purnimaNakshatra: 'Viśākhā', note: 'Akshaya Tritiya, Buddha Purnima, Narasimha Jayanti.' },
  { name: 'Jyeshtha', season: 'Grishma (summer)', purnimaNakshatra: 'Jyeṣṭhā', note: 'Ganga Dussehra, Nirjala Ekadashi, Vat Savitri.' },
  { name: 'Ashadha', season: 'Grishma', purnimaNakshatra: 'Pūrva Āṣāḍhā', note: 'Guru Purnima, Rath Yatra; Chaturmasya begins.' },
  { name: 'Shravana', season: 'Varsha (monsoon)', purnimaNakshatra: 'Śravaṇa', note: 'Nag Panchami, Raksha Bandhan, Janmashtami, Shravan Somvar.' },
  { name: 'Bhadrapada', season: 'Varsha', purnimaNakshatra: 'Pūrva Bhādrapadā', note: 'Ganesha Chaturthi, Hartalika Teej; Pitru Paksha begins at its Purnima.' },
  { name: 'Ashvina', season: 'Sharad (autumn)', purnimaNakshatra: 'Ashvinī', note: 'Sharada Navaratri, Vijayadashami, Sharad Purnima.' },
  { name: 'Kartika', season: 'Sharad', purnimaNakshatra: 'Kṛttikā', note: 'Diwali, Govardhan, Chhath, Tulsi Vivah, Kartika Purnima.' },
  { name: 'Margashirsha', season: 'Hemanta (pre-winter)', purnimaNakshatra: 'Mṛgaśira', note: 'Gita Jayanti, Vivaha Panchami, Dattatreya Jayanti.' },
  { name: 'Pausha', season: 'Hemanta', purnimaNakshatra: 'Puṣya', note: 'Traditionally a quiet month for muhurta; Makara Sankranti falls within it.' },
  { name: 'Magha', season: 'Shishira (winter)', purnimaNakshatra: 'Maghā', note: 'Vasant Panchami, Ratha Saptami, Magha bathing, Mahashivaratri at its end.' },
  { name: 'Phalguna', season: 'Shishira', purnimaNakshatra: 'Uttara Phalgunī', note: 'Holika Dahan and Holi; the final lunar month of the year.' },
  { name: 'Adhika Masa', season: 'Intercalary', purnimaNakshatra: '—', note: 'The extra lunar month inserted roughly every 32.5 months to keep the lunar year aligned with the solar. Also called Purushottama Masa; ordinary muhurtas are avoided, devotional acts are emphasised.' },
];

const CONCEPTS = [
  { name: 'Ayanamsa', category: 'Astronomy', summary: 'The angular difference between the tropical and sidereal zodiac, caused by precession of the equinoxes. Jyotish subtracts it from tropical longitudes to obtain sidereal positions.', detail: 'Around 24°10′ in the mid-2020s, increasing roughly 50.3 arc-seconds per year. Lahiri (Chitrapaksha) is the Indian government standard; Raman, KP and Fagan-Bradley differ by a few arc-minutes to about a degree, which can move a planet across a nakshatra pada boundary near the edges.' },
  { name: 'Astrological aspects', category: 'Chart reading', summary: 'Drishti — the houses a planet "sees" from its own position.', detail: 'All planets aspect the 7th from themselves. Mars additionally aspects the 4th and 8th; Jupiter the 5th and 9th; Saturn the 3rd and 10th. Rahu and Ketu are commonly given the 5th, 7th and 9th. Vedic aspects are whole-sign and one-directional, unlike Western orb-based aspects.' },
  { name: 'Avastha', category: 'Chart reading', summary: 'The "state" or condition of a planet, describing how capable it is of giving its results.', detail: 'BPHS describes several schemes: Baladi (infant to dead, by degree within the sign), Jagradadi (awake, dreaming, sleeping), Deeptadi (nine states from exalted to combust), and Lajjitadi. A planet strong by sign but in a poor avastha often gives delayed or diluted results.' },
  { name: 'Ashtakavarga', category: 'Strength', summary: 'A bindu (dot) scoring system that grades each sign for each planet.', detail: 'Bhinnashtakavarga gives each planet a 0–8 score per sign from eight reference points; Sarvashtakavarga sums the seven planets to a 0–56 score per sign, totalling 337. Signs above about 30 bindus are treated as supportive for transit, below about 25 as weak.' },
  { name: 'Shadbala', category: 'Strength', summary: 'The sixfold numerical strength of a planet, expressed in rupas.', detail: 'Sthana (positional), Dig (directional), Kala (temporal), Chesta (motional), Naisargika (natural) and Drik (aspectual) bala are summed and compared to a per-planet minimum requirement. A planet above its requirement is treated as able to deliver its promise.' },
  { name: 'Vimshottari Dasha', category: 'Timing', summary: 'The principal 120-year planetary period system, started from the Moon\'s nakshatra at birth.', detail: 'Sequence and years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17. The balance of the first mahadasha is set by how far the Moon has travelled through its birth nakshatra. Sub-periods (antardasha, pratyantardasha) follow the same proportional sequence.' },
  { name: 'Gochara', category: 'Timing', summary: 'Transit — the current position of planets read against the natal chart.', detail: 'Classically read from the Moon sign (Chandra lagna) rather than the ascendant. BPHS Chapter 36 lists the favourable houses from the Moon for each planet. Vedha (obstruction) rules cancel an otherwise good transit when another planet occupies the obstructing house.' },
  { name: 'Sade Sati', category: 'Timing', summary: 'The roughly 7½-year span when Saturn transits the 12th, 1st and 2nd houses from the natal Moon.', detail: 'Each phase lasts about 2½ years. The first phase is associated with expenditure and detachment, the second with direct pressure on health and identity, the third with family and finances. Retrograde motion can produce partial re-entries. Its effects are modified heavily by Saturn\'s natal dignity and Ashtakavarga score.' },
  { name: 'Mangal Dosha', category: 'Compatibility', summary: 'Mars placed in the 1st, 2nd, 4th, 7th, 8th or 12th house, assessed for marriage matching.', detail: 'Reckoned from lagna, Moon and Venus in most regional traditions; the 2nd house is included in North Indian practice but often excluded in the South. Numerous cancellation (bhanga) rules exist — Mars in its own or exalted sign, aspect from Jupiter, both partners carrying the dosha, and others.' },
  { name: 'Kaal Sarpa Yoga', category: 'Yoga', summary: 'All seven classical planets hemmed between Rahu and Ketu.', detail: 'Twelve named variants exist depending on which house axis the nodes occupy. It is not found in BPHS and is a comparatively modern formulation; classical practitioners weigh it far more lightly than popular treatments do. Partial versions where one planet falls outside the axis are usually treated as not applying.' },
  { name: 'Arudha Lagna', category: 'Jaimini', summary: 'The perceived image of a person, as distinct from the actual self shown by the lagna.', detail: 'Calculated by counting from the lagna to its lord, then the same distance again from the lord. Adjustments apply when the result lands in the 1st or 7th. Jaimini uses arudhas of every house (A1 to A12) to read reputation, wealth and public standing.' },
  { name: 'Argala', category: 'Jaimini', summary: 'Intervention — planets in the 2nd, 4th and 11th from a house that support its results.', detail: 'Counter-intervention (virodha argala) comes from the 12th, 10th and 3rd respectively. Malefics in the 3rd form argala rather than obstruction. Used to judge whether a promised result actually materialises.' },
  { name: 'Saham', category: 'Tajika', summary: 'Sensitive arabic-part-style points derived from arithmetic between planets and the lagna.', detail: 'Punya Saham (fortune), Vidya (education), Yasha (fame), Mitra, Karma, Roga and others. Drawn from the Tajika (Perso-Arabic) stream of Jyotish and used chiefly in Varshaphala annual charts.' },
  { name: 'Varga / Divisional charts', category: 'Chart reading', summary: 'Subdivisions of each sign used to examine a specific area of life in finer detail.', detail: 'Shodashavarga is the set of sixteen: D1 Rashi, D2 Hora (wealth), D3 Drekkana (siblings), D4 Chaturthamsa (property), D7 Saptamsa (children), D9 Navamsa (marriage, dharma), D10 Dashamsa (career), D12 Dwadashamsa (parents), D16, D20, D24, D27, D30 Trimsamsa (misfortune), D40, D45, D60 Shashtiamsa. D9 is weighed second only to D1.' },
  { name: 'Gandanta', category: 'Chart reading', summary: 'The knot where a water sign ends and a fire sign begins.', detail: 'The final 3°20′ of Cancer, Scorpio and Pisces with the first 3°20′ of Leo, Sagittarius and Aries. Planets or the Moon here are treated as vulnerable; the junction of Revatī–Ashvinī, Āśleṣā–Maghā and Jyeṣṭhā–Mūla is regarded as most sensitive.' },
  { name: 'Combustion (Astangata)', category: 'Chart reading', summary: 'A planet too close to the Sun to be visible, and therefore weakened.', detail: 'Approximate orbs: Moon 12°, Mars 17°, Mercury 14° (12° when retrograde), Jupiter 11°, Venus 10° (8° retrograde), Saturn 15°. Some schools treat deep combustion instead as absorption into the Sun\'s strength rather than loss.' },
  { name: 'Retrogression (Vakri)', category: 'Chart reading', summary: 'Apparent backward motion of a planet against the zodiac.', detail: 'Only Mars through Saturn retrograde; the Sun and Moon never do, and the nodes are always retrograde. A retrograde planet gains Chesta Bala and is classically treated as strong, though its results are often described as internalised, delayed or repeated.' },
  { name: 'Neecha Bhanga', category: 'Chart reading', summary: 'Cancellation of a planet\'s debilitation.', detail: 'Occurs when the lord of the debilitation sign, or the planet exalted in it, sits in a kendra from the lagna or Moon; or when the debilitated planet is aspected by its dispositor; or when it is in a kendra from the lagna with a strong dispositor. A full cancellation can convert the placement into a Raja Yoga.' },
  { name: 'Yoga Karaka', category: 'Chart reading', summary: 'A planet that simultaneously owns a kendra and a trikona.', detail: 'Only possible for Mars from Cancer and Leo lagna, Venus from Capricorn and Aquarius, and Saturn from Taurus and Libra. Such a planet is treated as strongly benefic for that chart regardless of its natural nature.' },
  { name: 'Dusthana', category: 'Chart reading', summary: 'The difficult houses — 6th, 8th and 12th.', detail: 'Associated respectively with illness, debt and rivals; sudden change and hidden matters; and loss, expenditure and foreign residence. Lords of these houses are treated as functional malefics for most lagnas, though the 6th and 11th combination can also produce Vipareeta Raja Yoga.' },
  { name: 'Panchanga', category: 'Calendar', summary: 'The five limbs of the Hindu calendar day.', detail: 'Tithi (lunar day, 12° of Moon−Sun separation), Vara (weekday), Nakshatra (Moon\'s lunar mansion), Yoga (Sun+Moon longitude in 13°20′ units), and Karana (half a tithi). Together they fix the character of a day and underpin all muhurta selection.' },
  { name: 'Muhurta', category: 'Calendar', summary: 'Election — choosing an auspicious moment to begin something.', detail: 'Built from Panchanga quality, the Moon\'s strength and nakshatra, the lagna at the chosen time, Tara Bala and Chandra Bala, and avoidance of Rahu Kaal, Yamaganda, Gulika Kaal and Bhadra. Abhijit Muhurta, around local noon, is treated as broadly auspicious on most days.' },
  { name: 'Tara Bala', category: 'Calendar', summary: 'The ninefold strength of the transiting nakshatra counted from the birth nakshatra.', detail: 'Janma, Sampat, Vipat, Kshema, Pratyari, Sadhaka, Vadha, Mitra, Ati-Mitra. The 3rd, 5th and 7th (Vipat, Pratyari, Vadha) are the ones avoided for important starts.' },
  { name: 'Prashna', category: 'Branch', summary: 'Horary — answering a question from the chart of the moment it was asked.', detail: 'Used when birth details are unknown or when a specific question needs a direct answer. The Kerala tradition adds omens (nimitta), the querent\'s posture and the Arudha of the question. Its interpretive rules differ substantially from natal reading.' },
];

const RISHIS = [
  { name: 'Parashara', era: 'Ancient', work: 'Bṛhat Parāśara Horā Śāstra', contribution: 'The foundational text of the Parashari stream: house lords, yogas, Vimshottari dasha, divisional charts and remedial measures. Nearly all mainstream North Indian practice descends from it.' },
  { name: 'Jaimini', era: 'Ancient', work: 'Jaimini Sūtra (Upadesha Sutras)', contribution: 'The parallel Jaimini system: chara karakas, arudha padas, argala, and rashi-based Chara dasha. Read alongside Parashari rather than as a replacement.' },
  { name: 'Varahamihira', era: 'c. 505–587 CE', work: 'Bṛhat Jātaka, Bṛhat Saṃhitā, Pañcasiddhāntikā', contribution: 'Systematised natal astrology into a compact and heavily commented text; the Bṛhat Saṃhitā extends into omens, architecture, gemmology and meteorology.' },
  { name: 'Kalyana Varma', era: 'c. 10th century', work: 'Sārāvalī', contribution: 'An extensive treatment of planetary combinations, yogas and their results, often more detailed on specific placements than Bṛhat Jātaka.' },
  { name: 'Mantreswara', era: 'c. 16th century', work: 'Phaladīpikā', contribution: 'A widely used practical manual noted for clear rules on house results, yogas, dasha effects and ayurdaya (longevity).' },
  { name: 'Vaidyanatha Dikshita', era: 'c. 15th–16th century', work: 'Jātaka Pārijāta', contribution: 'A comprehensive natal compendium, strong on yogas, Chandra yogas and interpretive detail.' },
  { name: 'Prithuyasas', era: 'c. 6th century', work: 'Horā Sāra', contribution: 'Son of Varahamihira; a concise natal treatise whose name this application shares.' },
  { name: 'Bhrigu', era: 'Ancient', work: 'Bhṛgu Saṃhitā', contribution: 'Associated with the Nadi tradition of pre-written chart readings; the surviving corpus is fragmentary and heavily recensional.' },
  { name: 'Neelakantha', era: 'c. 16th century', work: 'Tājika Nīlakaṇṭhī', contribution: 'The standard Sanskrit authority on the Tajika stream: annual charts (Varshaphala), sahams and Perso-Arabic aspect doctrine.' },
  { name: 'Aryabhata', era: '476–550 CE', work: 'Āryabhaṭīya', contribution: 'Mathematical astronomy rather than phala jyotish: sine tables, planetary models and a rotating-earth hypothesis that underpin later ephemeris work.' },
  { name: 'Bhaskaracharya II', era: '1114–1185 CE', work: 'Siddhānta Śiromaṇi', contribution: 'Astronomical computation, planetary theory and the Goladhyaya on spherics; long the basis of Indian ephemeris calculation.' },
  { name: 'Krishnamurti (K. S. Krishnamurti)', era: '1908–1972', work: 'KP Readers I–VI', contribution: 'The Krishnamurti Paddhati: sub-lord theory, Placidus cusps and a stellar approach to event timing. A modern system with a large following in South India.' },
  { name: 'B. V. Raman', era: '1912–1998', work: 'Astrological Magazine; numerous treatises', contribution: 'The most influential twentieth-century populariser of Jyotish in English; the Raman ayanamsa carries his name.' },
];

/* -------------------------------------------------------------- nakshatras */

const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/** Which rāśi a longitude falls in. */
const signAt = (deg) => SIGN_NAMES[Math.floor(((deg % 360) + 360) % 360 / 30)];

/**
 * The rāśi span a nakshatra covers. Most sit inside one sign; the nine that
 * straddle a boundary (Kṛttikā, Mṛgaśira, Punarvasu, …) get both named.
 */
function nakshatraSigns(start, end) {
  const first = signAt(start);
  const last = signAt(end - 0.0001);
  return first === last ? first : `${first} / ${last}`;
}

/**
 * Navamsa rāśi of each of the four padas. One navamsa is 3°20′ (10/3 degrees),
 * and the 108 navamsas of the zodiac run continuously from Aries, so the sign
 * index is floor(longitude ÷ 3°20′) mod 12 — not the 30° rāśi division.
 */
const NAVAMSA_ARC = 10 / 3;
function padaNavamsaSigns(start) {
  // Nakshatra boundaries are exact multiples of 3°20′, but the bundled file
  // stores them truncated (13.333333). Dividing those directly lands a hair
  // under the true index and floor() then drops a whole pada, so the base
  // index is rounded once and the remaining padas added as integers.
  const base = Math.round(start / NAVAMSA_ARC);
  return Array.from({ length: 4 }, (_, i) => SIGN_NAMES[(base + i) % 12]).join(', ');
}

function nakshatraRows() {
  const raw = readJson(join(CORE, 'nakshatra_basic_list.json'), []);
  // start_degree / end_degree are reliable; rashi_lord_sequence and
  // pada_navamsa_rashi in the bundled file repeat Ashvinī's values for every
  // row, so both are recomputed from the span rather than read across.
  return raw.map(n => {
    const start = Number(n.start_degree);
    const end = Number(n.end_degree);
    return {
      name: n.sanskrit_name || n.name,
      lord: n.lord,
      deity: n.deity,
      symbol: n.symbol,
      gana: n.gana,
      guna: n.guna,
      nadi: n.nadi,
      yoni: n.yoni,
      varna: n.varna,
      tattva: n.tattva,
      animal: n.animal_symbol,
      color: n.color,
      bodyPart: n.body_part,
      span: `${start.toFixed(2)}° – ${end.toFixed(2)}°`,
      dashaYears: n.dasha_years,
      padaNavamsa: padaNavamsaSigns(start),
      rashi: nakshatraSigns(start, end),
      nature: n.fixed_or_movable,
      favorable: n.favorable_activities,
    };
  });
}

function yogaRows() {
  const raw = readJson(join(CORE, 'yogas.json'), []);
  const seen = new Set();
  return raw.filter(y => y?.name && !seen.has(y.name) && seen.add(y.name)).map(y => ({
    name: String(y.name).replace(/\b\w/g, c => c.toUpperCase()),
    chapter: y.chapter_title || (y.chapter ? `Chapter ${y.chapter}` : ''),
    shloka: y.shloka,
    description: y.description,
    hindi: y.hindi,
    gujarati: y.gujarati,
    keywords: Array.isArray(y.keywords) ? y.keywords.join(', ') : '',
    source: y.source || 'BPHS',
  }));
}

/**
 * Some corpus titles arrived with Devanagari encoded as literal "#U092a"
 * escapes rather than characters, which rendered as visible noise in the
 * scripture list. Decode those back to text and tidy the leftovers.
 */
function cleanTitle(raw) {
  let s = String(raw || '');
  if (s.includes('#U')) {
    s = s.replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  s = s.replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s || String(raw || '').trim();
}

function scriptureRows() {
  const idx = readJson(LIBRARY_INDEX, null);
  const books = idx?.books || readJson(join(CORE, 'books_index.json'), []);
  return books
    .filter(b => b.title)
    .map(b => ({
      name: cleanTitle(b.title),
      author: b.creator || 'Unattributed',
      pages: b.pages ?? b.total_pages ?? null,
      words: b.words ?? b.total_words ?? null,
      subject: Array.isArray(b.subject) ? b.subject.slice(0, 5).join(', ') : (b.subject || ''),
      textId: b.id || null,
      excerpt: typeof b.excerpt === 'string' ? b.excerpt.slice(0, 400) : '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ lists */

const LIST_DEFS = [
  { id: 'nakshatras', title: 'Nakshatras', icon: '✦', description: 'The 27 lunar mansions with lord, deity, gana, yoni, nadi and pada navamsa.', fields: ['lord', 'deity', 'symbol', 'span', 'rashi', 'gana', 'guna', 'nadi', 'yoni', 'varna', 'tattva', 'animal', 'color', 'bodyPart', 'nature', 'dashaYears', 'padaNavamsa', 'favorable'], rows: nakshatraRows },
  { id: 'rashi', title: 'Rāśi', icon: '♈', description: 'The twelve signs with lord, element, quality, body part and constituent nakshatras.', fields: ['english', 'lord', 'element', 'quality', 'gender', 'symbol', 'bodyPart', 'direction', 'varna', 'gemstone', 'nakshatras', 'traits'], rows: () => RASHI },
  { id: 'solar-months', title: 'Solar Months', icon: '☀️', description: 'The twelve sidereal solar months fixed by the Sun\'s sign ingress (sankranti).', fields: ['english', 'gregorian', 'note'], rows: () => SOLAR_MONTHS },
  { id: 'lunar-months', title: 'Lunar Months', icon: '🌙', description: 'The twelve lunar months plus the intercalary Adhika Masa, with season and festivals.', fields: ['season', 'purnimaNakshatra', 'note'], rows: () => LUNAR_MONTHS },
  { id: 'navagraha', title: 'Navagraha', icon: '🪐', description: 'The nine grahas with ownership, exaltation, karakatva, friendships and dasha years.', fields: ['owns', 'exalted', 'debilitated', 'moolatrikona', 'karaka', 'friends', 'enemies', 'nature', 'deity', 'gemstone', 'day', 'direction', 'dashaYears'], rows: () => getKnowledgeTopic('lords')?.items || [] },
  { id: 'concepts', title: 'Other concepts', icon: '📘', description: 'Working definitions of the technical terms used across the application.', fields: ['category', 'summary', 'detail'], rows: () => CONCEPTS },
  { id: 'yogas', title: 'Yogas', icon: '🔗', description: 'Classical yoga definitions drawn from the bundled BPHS shloka dataset, with Hindi and Gujarati.', fields: ['chapter', 'shloka', 'description', 'hindi', 'gujarati', 'keywords', 'source'], rows: yogaRows },
  { id: 'scriptures', title: 'Scriptures', icon: '📜', description: 'The bundled classical text corpus, searchable by title, author and subject.', fields: ['author', 'pages', 'words', 'subject', 'excerpt'], rows: scriptureRows },
  { id: 'rishis', title: 'Rishis / Astrologers', icon: '🧘', description: 'The authors and teachers behind the classical and modern systems used here.', fields: ['era', 'work', 'contribution'], rows: () => RISHIS },
];

const listCache = new Map();
function listRows(def) {
  if (!listCache.has(def.id)) {
    const rows = (def.rows() || []).map(r => ({ id: slugify(r.name), ...r }));
    listCache.set(def.id, rows);
  }
  return listCache.get(def.id);
}

/** Menu-level listing: one row per Lists group. */
export function listListGroups() {
  return LIST_DEFS.map(d => ({
    id: d.id, title: d.title, icon: d.icon, description: d.description,
    count: listRows(d).length, href: `/lists/${d.id}`,
  }));
}

/** One Lists group. Large groups (scriptures, yogas) page and search server-side. */
export function getListGroup(id, { q = '', limit = 0, offset = 0 } = {}) {
  const def = LIST_DEFS.find(d => d.id === slugify(id));
  if (!def) return null;
  let rows = listRows(def);
  const needle = String(q || '').trim().toLowerCase();
  if (needle) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(needle));
  const total = rows.length;
  if (limit > 0) rows = rows.slice(offset, offset + limit);
  return {
    id: def.id, title: def.title, icon: def.icon, description: def.description,
    fields: def.fields, total, offset, count: rows.length, items: rows,
    href: `/lists/${def.id}`,
  };
}

/** A single row inside a Lists group, e.g. /lists/nakshatras/rohini. */
export function getListEntry(groupId, entryId) {
  const def = LIST_DEFS.find(d => d.id === slugify(groupId));
  if (!def) return null;
  const want = slugify(entryId);
  const entry = listRows(def).find(r => r.id === want);
  if (!entry) return null;
  return {
    group: { id: def.id, title: def.title, icon: def.icon, fields: def.fields },
    entry,
    href: `/lists/${def.id}/${entry.id}`,
  };
}

/** Cross-cutting search used by the global search box. */
export function searchReference(query, { limit = 30 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { query: '', matches: [] };
  const matches = [];
  for (const def of LIST_DEFS) {
    for (const row of listRows(def)) {
      if (String(row.name).toLowerCase().includes(q)) {
        matches.push({ kind: 'list', group: def.id, groupTitle: def.title, icon: def.icon, id: row.id, name: row.name, href: `/lists/${def.id}/${row.id}` });
        if (matches.length >= limit) return { query: q, matches };
      }
    }
  }
  for (const m of searchKnowledge(q, { limit: limit - matches.length })) {
    matches.push({ kind: 'knowledge', group: m.topic, groupTitle: m.topicTitle, icon: m.icon, id: m.id, name: m.name, href: m.href });
    if (matches.length >= limit) break;
  }
  return { query: q, matches };
}

export const REFERENCE_ROUTES = Object.freeze({
  knowledgeTopics: listKnowledgeTopics,
  listGroups: listListGroups,
});
