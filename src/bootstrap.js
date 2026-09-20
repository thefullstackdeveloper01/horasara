import { JyotishKernel } from './application/JyotishKernel.js';
import { ApplicationContainer } from './application/ApplicationContainer.js';

/** Composition root for consumers that want a complete application graph. */
export function createApplication(options = {}) {
  const kernel = new JyotishKernel(options);
  return new ApplicationContainer({ kernel, logger: options.logger || console });
}
