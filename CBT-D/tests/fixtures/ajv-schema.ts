// Onderdeel 5 — herbruikbare ajv-fixture. Laadt JSON Schema's uit de gepinde OpenAPI/AsyncAPI
// (beide gebruiken hier dezelfde components.schemas.<Naam>-structuur, dus één helper volstaat
// voor alle contracten). Scenario's roepen alleen assertMatchesSchema()/getSchema() aan — de
// YAML-inlees- en ajv-plumbing hoort hier, niet in losse spec-bestanden.
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { expect } from '@playwright/test';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const docCache = new Map<string, any>();
const validatorCache = new Map<string, ValidateFunction>();

function loadContractDoc(contractFile: string): any {
  if (!docCache.has(contractFile)) {
    const absolutePath = path.join(__dirname, '../../../contracts', contractFile);
    docCache.set(contractFile, yaml.load(fs.readFileSync(absolutePath, 'utf8')));
  }
  return docCache.get(contractFile);
}

/** Geeft het raw JSON Schema-object terug (bv. om een enum-array uit te lezen). */
export function getSchema(contractFile: string, schemaName: string): any {
  const doc = loadContractDoc(contractFile);
  const schema = doc?.components?.schemas?.[schemaName];
  if (!schema) {
    throw new Error(`Schema '${schemaName}' niet gevonden in contracts/${contractFile}`);
  }
  return schema;
}

function getValidator(contractFile: string, schemaName: string): ValidateFunction {
  const key = `${contractFile}#${schemaName}`;
  if (!validatorCache.has(key)) {
    validatorCache.set(key, ajv.compile(getSchema(contractFile, schemaName)));
  }
  return validatorCache.get(key)!;
}

/** Valideert data tegen het gepinde schema; faalt de test met leesbare ajv-errors bij afwijking. */
export function assertMatchesSchema(contractFile: string, schemaName: string, data: unknown): void {
  const validate = getValidator(contractFile, schemaName);
  const valid = validate(data);
  expect(valid, `${schemaName} (contracts/${contractFile}) violations:\n${JSON.stringify(validate.errors, null, 2)}`).toBe(true);
}
