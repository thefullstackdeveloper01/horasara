export type ExplainabilityMode = 'NORMAL' | 'DETAILED' | 'AUDIT' | 'DEVELOPER';
export type FeatureStatus = 'VERIFIED' | 'AVAILABLE' | 'PARTIAL' | 'EXPERIMENTAL' | 'UNSUPPORTED' | 'NOT_IMPLEMENTED' | 'DEPRECATED';
export interface BirthData { year: number; month: number; day: number; hour: number; min: number; sec?: number; lat: number; lon: number; tz: number; [key: string]: unknown; }
export interface CalculationConfig { schemaVersion: number; deterministic: boolean; diagnostics: { explainability: ExplainabilityMode }; [key: string]: unknown; }
export interface CalculationManifest { engineVersion: string; schemaVersion: number; inputHash: string; configHash: string; datasetHash: string; featureHash: string; fingerprint: string; }
