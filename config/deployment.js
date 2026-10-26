// Support existing provider secret bindings during a gradual deployment migration.
const legacyBindings = {
  GPT_API_KEY_CATALOGSEARCH: 'GPT_API_KEY_ORDOSYNSEARCH',
  CATALOG_NATIVE_INGEST_TOKEN: 'ORDOSYN_NATIVE_INGEST_TOKEN',
  CATALOG_STAGING_SMOKE_TOKEN: 'ORDOSYN_STAGING_SMOKE_TOKEN',
  CATALOG_INGEST_TOKEN: 'ORDOSYN_INGEST_TOKEN',
};
export function deploymentValue(env, name) {
  return env?.[name] ?? env?.[legacyBindings[name]];
}
