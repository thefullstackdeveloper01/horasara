import crypto from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Durable store for contact messages and reader feedback.
 *
 * Writes go through a temporary file and a rename so a crash mid-write cannot
 * truncate the store, and an in-process queue serialises concurrent writes so
 * two simultaneous submissions cannot clobber each other. Submissions are
 * capped so an unattended deployment cannot be filled up by a flood.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_RECORDS = Number(process.env.MESSAGE_STORE_MAX || 5000);

export const CONTACT_TOPICS = [
  'support', 'billing', 'privacy', 'grievance', 'bug', 'calculation', 'press', 'partnership', 'careers', 'security', 'other',
];

const clean = (value, max) => String(value ?? '')
  // Strip control characters that would corrupt a log line or an email header.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

function validationError(message) {
  return Object.assign(new Error(message), { code: 'INVALID_SUBMISSION' });
}

export class MessageStore {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async #read() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #write(records) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(records, null, 2), 'utf8');
    await rename(temp, this.filePath);
  }

  /** Serialises mutations so concurrent submissions cannot lose each other. */
  #mutate(fn) {
    const next = this.queue.then(async () => {
      const records = await this.#read();
      const result = await fn(records);
      await this.#write(records.slice(-MAX_RECORDS));
      return result;
    });
    // Keep the chain alive even if one submission fails.
    this.queue = next.catch(() => {});
    return next;
  }

  async append(record) {
    return this.#mutate(records => {
      const saved = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...record };
      records.push(saved);
      return saved;
    });
  }

  async list({ type = null, status = null, limit = 200 } = {}) {
    const records = await this.#read();
    return records
      .filter(r => (!type || r.type === type) && (!status || r.status === status))
      .slice(-Math.max(1, Math.min(limit, 1000)))
      .reverse();
  }

  async setStatus(id, status) {
    return this.#mutate(records => {
      const record = records.find(r => r.id === id);
      if (!record) throw validationError('message not found');
      record.status = status;
      record.reviewedAt = new Date().toISOString();
      return record;
    });
  }
}

/**
 * Validates a contact submission. The honeypot field is checked by the caller,
 * which silently accepts and discards bot traffic rather than telling a bot
 * that it was detected.
 */
export function validateContact(input = {}) {
  const name = clean(input.name, 120);
  const email = clean(input.email, 200).toLowerCase();
  const topic = clean(input.topic, 40).toLowerCase();
  const subject = clean(input.subject, 200);
  const message = clean(input.message, 5000);
  const reference = clean(input.reference, 120);

  if (name.length < 2) throw validationError('Please tell us your name.');
  if (!EMAIL_RE.test(email)) throw validationError('Please enter an email address we can reply to.');
  if (!CONTACT_TOPICS.includes(topic)) throw validationError('Please choose what your message is about.');
  if (message.length < 15) throw validationError('Please describe the issue in a little more detail so we can help.');
  if (input.consent !== true) throw validationError('Please confirm you are happy for us to reply to this address.');

  return {
    type: 'contact',
    status: 'new',
    name, email, topic, reference,
    subject: subject || `${topic.charAt(0).toUpperCase()}${topic.slice(1)} enquiry`,
    message,
  };
}

export function validateFeedback(input = {}) {
  const name = clean(input.name, 80);
  const email = clean(input.email, 200).toLowerCase();
  const rating = Number(input.rating);
  const message = clean(input.message, 1500);
  const location = clean(input.location, 80);

  if (name.length < 2) throw validationError('Please tell us what name to publish this under.');
  if (email && !EMAIL_RE.test(email)) throw validationError('That email address does not look right.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw validationError('Please give a rating between 1 and 5.');
  if (message.length < 20) throw validationError('Please write a little more so the review is useful to other readers.');
  if (input.consent !== true) throw validationError('Please confirm you are happy for this to be published.');

  return {
    type: 'feedback',
    // Nothing is published until a person has read it — this is the moderation
    // gate the testimonials page promises.
    status: 'pending',
    name, email, rating, message, location,
  };
}

/** Strips contact details before a reviewed testimonial is served publicly. */
export function publicTestimonial(record) {
  return {
    id: record.id,
    name: record.name,
    rating: record.rating,
    message: record.message,
    location: record.location || '',
    createdAt: record.createdAt,
    reply: record.reply || '',
  };
}
