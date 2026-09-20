/**
 * NUMEROLOGY MODULE - Pure Logic
 * Pythagorean + Cheiro systems
 * Life Path, Destiny, Soul Urge, Personality numbers
 * Compatible with Vedic astrology integration
 */

import numerologyData from '../../dataset/used/core/numerology-data.json' with { type: 'json' };

// Validation and helper functions
function validateInput(name, dob) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid name: must be a non-empty string');
  }

  if (!dob || typeof dob !== 'object') {
    throw new Error('Invalid date of birth: must be an object');
  }

  const { year, month, day } = dob;

  if (!year || !month || !day) {
    throw new Error('Date of birth must include year, month, and day');
  }

  if (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear()) {
    throw new Error(`Invalid year: ${year}. Must be an integer between 1 and the current year`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1 and 31`);
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() != year || candidate.getUTCMonth() != month - 1 || candidate.getUTCDate() != day) {
    throw new Error(`Invalid calendar date: ${day}/${month}/${year}`);
  }

  return true;
}

function sanitizeName(name) {
  return name.toUpperCase().replace(/[^A-Z\s]/g, '');
}

function reduceNumber(n) {
  // Reduce to single digit, keep master numbers (11, 22, 33)
  if (n === 11 || n === 22 || n === 33) return n;

  let result = n;
  while (result > 9) {
    result = String(result).split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
  }
  return result;
}

function calculateLetterSum(name, letterMap, filterFn = null) {
  if (!name || typeof name !== 'string') return 0;

  const sanitized = name.toUpperCase().replace(/[^A-Z]/g, '');

  return sanitized.split('')
    .filter(char => filterFn ? filterFn(char) : true)
    .reduce((sum, char) => sum + (letterMap[char] || 0), 0);
}

function isVowel(char) {
  return numerologyData.constants.vowels.includes(char);
}

function calculateLifePath(year, month, day) {
  const yearSum = String(year).split('').reduce((s, d) => s + parseInt(d, 10), 0);
  const monthSum = String(month).split('').reduce((s, d) => s + parseInt(d, 10), 0);
  const daySum = String(day).split('').reduce((s, d) => s + parseInt(d, 10), 0);

  const rawSum = yearSum + monthSum + daySum;
  return reduceNumber(rawSum);
}

function calculateBirthdayNumber(day) {
  if (day <= 0) return 1;
  return day <= 31 ? (day > 9 ? reduceNumber(day) : day) : reduceNumber(day);
}

function getNumberMeaning(number) {
  const meaning = numerologyData.meanings[number];
  if (meaning) return meaning;
  if (number === 0) return { name: 'Not applicable', traits: 'No positive letter total was produced for this component.', career: null, status: 'NOT_APPLICABLE' };
  throw new Error(`No verified numerology meaning is configured for number ${number}`);
}

function getPlanetForNumber(number) {
  const planet = numerologyData.lpPlanetMap[number];
  return planet || null;
}

function getUniqueLuckyNumbers(numbers) {
  return [...new Set(numbers)].filter(n => n && typeof n === 'number');
}

export function calculateNumerology(name, dob) {
  // Validate inputs
  validateInput(name, dob);

  const { year, month, day } = dob;
  const cleanName = sanitizeName(name);
  if (!cleanName) throw new Error('Name contains no supported A-Z letters after normalization');

  // Calculate core numbers
  const lifePath = calculateLifePath(year, month, day);
  const destinyRaw = calculateLetterSum(cleanName, numerologyData.mappings.pythagorean);
  const destiny = reduceNumber(destinyRaw);
  const soulRaw = calculateLetterSum(cleanName, numerologyData.mappings.pythagorean, isVowel);
  const soulUrge = reduceNumber(soulRaw);
  const personalityRaw = calculateLetterSum(cleanName, numerologyData.mappings.pythagorean, char => !isVowel(char));
  const personality = reduceNumber(personalityRaw);
  const birthday = calculateBirthdayNumber(day);
  const cheiroRaw = calculateLetterSum(cleanName, numerologyData.mappings.cheiro);
  const cheiroDestiny = reduceNumber(cheiroRaw);

  // Get meanings and attributes
  const lifePathMeaning = getNumberMeaning(lifePath);
  const destinyMeaning = getNumberMeaning(destiny);
  const soulUrgeMeaning = getNumberMeaning(soulUrge);
  const personalityMeaning = getNumberMeaning(personality);

  // Prepare result
  const result = {
    name: cleanName,
    dob: `${day}/${month}/${year}`,
    numbers: {
      driver: { value: reduceNumber(day), rawDay: day, desc: `Driver Number derived from the birth day ${day}; exposed separately from the Birthday/compound field.` },
      lifePath: {
        value: lifePath,
        name: lifePathMeaning.name,
        desc: lifePathMeaning.traits,
        planet: getPlanetForNumber(lifePath),
        career: lifePathMeaning.career
      },
      destiny: {
        value: destiny,
        name: destinyMeaning.name,
        desc: destinyMeaning.traits,
        planet: getPlanetForNumber(destiny),
        career: destinyMeaning.career
      },
      soulUrge: {
        value: soulUrge,
        name: soulUrgeMeaning.name,
        desc: soulUrgeMeaning.traits
      },
      personality: {
        value: personality,
        name: personalityMeaning.name,
        desc: personalityMeaning.traits
      },
      birthday: {
        value: birthday,
        desc: `Birth-day number derived from calendar day ${day}`
      }
    },
    cheiro: {
      destinyNumber: cheiroDestiny,
      desc: numerologyData.cheiroDescription
    },
    challenge: lifePathMeaning.challenge || null,
    isMasterNumber: numerologyData.constants.masterNumbers.includes(lifePath),
    luckyNumbers: getUniqueLuckyNumbers([lifePath, destiny, soulUrge])
  };

  return result;
}

export function getBabyNameSuggestions(nakshatra, gender = 'Neutral') {
  if (!nakshatra || typeof nakshatra !== 'string') {
    throw new Error('Invalid nakshatra: must be a non-empty string');
  }

  const normalizedNakshatra = nakshatra.trim();
  const syllables = numerologyData.nakshatraSyllables[normalizedNakshatra] || [];

  if (syllables.length === 0) {
    console.warn(`No syllables found for nakshatra: ${normalizedNakshatra}`);
  }

  const genderLower = gender.toLowerCase();
  const isMale = genderLower === 'male';
  const isFemale = genderLower === 'female';

  // Generate example names based on gender
  const maleExamples = isMale || (!isMale && !isFemale)
    ? syllables.map(s => s + 'v' + 'ar').slice(0, 4)
    : [];

  const femaleExamples = isFemale || (!isMale && !isFemale)
    ? syllables.map(s => s + 'a').slice(0, 4)
    : [];

  return {
    nakshatra: normalizedNakshatra,
    syllables: syllables,
    note: syllables.length > 0
      ? `Names starting with ${syllables.join(', ')} are auspicious for ${normalizedNakshatra} nakshatra`
      : `No specific syllables found for ${normalizedNakshatra}`,
    pada_syllables: syllables,
    examples: {
      male: maleExamples,
      female: femaleExamples
    }
  };
}

// Utility function for batch processing
export function calculateMultipleNames(namesData) {
  if (!Array.isArray(namesData)) {
    throw new Error('Invalid input: expected array of {name, dob} objects');
  }

  return namesData.map(item => {
    try {
      return calculateNumerology(item.name, item.dob);
    } catch (error) {
      console.error(`Failed to calculate for ${item.name}:`, error.message);
      return {
        error: true,
        name: item.name,
        message: error.message
      };
    }
  });
}