/** Dataset-backed user preference rules for the public prediction layer. */
import data from '../../dataset/used/core/user-prediction-preferences.json' with { type: 'json' };
export const EVENT_CONFIG = Object.freeze(data.rules);
export const PREFERENCE_LABELS = Object.freeze(data.labels);
export const PREFERENCE_DESCRIPTIONS = Object.freeze(data.descriptions);
export const PREFERENCE_KEYS = Object.freeze(Object.keys(data.rules));
