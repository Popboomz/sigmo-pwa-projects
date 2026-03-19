const PLACEHOLDER_DATABASE_URLS = new Set([
  '',
  'postgres://user:password@localhost:5432/dbname',
  'postgresql://user:password@localhost:5432/dbname',
]);

export function isLocalDevDatabaseFallbackEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (process.env.LOCAL_DEV_DATA === '1') {
    return true;
  }

  const databaseUrl = (process.env.PGDATABASE_URL || process.env.DATABASE_URL || '').trim();
  return PLACEHOLDER_DATABASE_URLS.has(databaseUrl);
}

export function isLocalDevQuestionnaireMockEnabled(): boolean {
  return process.env.LOCAL_DEV_QUESTIONNAIRE_MOCK === '1';
}
