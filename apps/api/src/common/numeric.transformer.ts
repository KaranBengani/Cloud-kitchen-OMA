import type { ValueTransformer } from 'typeorm';

// Postgres returns NUMERIC columns as strings, because they can hold more precision than a JS number.
// Quantities like 0.25 kg are tiny, so converting to number is safe here. Never use this for money:
// money is stored as integer paise instead (DECISIONS.md D7).
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
