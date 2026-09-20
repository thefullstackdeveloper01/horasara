/** Metadata registry for presentation sections; calculations remain independent. */
export class ReportSectionRegistry {
  constructor(sections = []) { this.sections = new Map(); sections.forEach(section => this.register(section)); }
  register(section) {
    if (!section?.id || !section?.title || typeof section.render !== 'function') throw new TypeError('Report section requires id, title and render()');
    if (this.sections.has(section.id)) throw new Error(`Report section already registered: ${section.id}`);
    this.sections.set(section.id, Object.freeze({ category: 'general', dependencies: [], status: 'AVAILABLE', ...section }));
    return this;
  }
  get(id) { return this.sections.get(id); }
  list() { return Object.freeze([...this.sections.values()]); }
  enabled(ids) { const set = new Set(ids); return Object.freeze(this.list().filter(section => set.has(section.id))); }
}
