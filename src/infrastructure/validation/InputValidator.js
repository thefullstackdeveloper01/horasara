import { ValidationError } from '../../application/errors/JyotishError.js';

export class InputValidator {
  validate(input) {
    if (!input || typeof input !== 'object') throw new ValidationError('Birth input must be an object');
    for (const key of ['year','month','day','hour','min','sec','lat','lon','tz','elevation']) if (input[key] !== undefined && (typeof input[key] !== 'number' || !Number.isFinite(input[key]))) throw new ValidationError(`${key} must be a finite number`, { details: { field: key } });
    if (!Number.isInteger(input.year) || input.year < -9999 || input.year > 9999) throw new ValidationError('year is outside supported range');
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new ValidationError('month must be 1..12');
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) throw new ValidationError('day must be 1..31');
    if (input.hour < 0 || input.hour > 23) throw new ValidationError('hour must be 0..23');
    if (input.min < 0 || input.min > 59) throw new ValidationError('min must be 0..59');
    if (input.sec !== undefined && (input.sec < 0 || input.sec > 59.999)) throw new ValidationError('sec must be 0..59.999');
    if (input.lat < -90 || input.lat > 90) throw new ValidationError('lat must be -90..90');
    if (input.lon < -180 || input.lon > 180) throw new ValidationError('lon must be -180..180');
    if (input.tz < -24 || input.tz > 24) throw new ValidationError('tz must be -24..24');
    return true;
  }
}
