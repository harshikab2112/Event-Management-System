const DEFAULT_DATABASE_NAME = 'event_management_system';

function configuredDatabaseName() {
  return process.env.MONGODB_DB_NAME || DEFAULT_DATABASE_NAME;
}

function databaseNameFromUri(uri) {
  try {
    const parsedUri = new URL(uri);
    const databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ''));
    return databaseName || configuredDatabaseName();
  } catch (error) {
    return configuredDatabaseName();
  }
}

function mongoConnectionOptions(uri, extraOptions = {}) {
  const options = {
    serverSelectionTimeoutMS: 5000,
    ...extraOptions
  };

  try {
    const parsedUri = new URL(uri);
    const hasDatabaseName = parsedUri.pathname && parsedUri.pathname !== '/';

    if (!hasDatabaseName) {
      options.dbName = configuredDatabaseName();
    }
  } catch (error) {
    options.dbName = configuredDatabaseName();
  }

  return options;
}

module.exports = {
  DEFAULT_DATABASE_NAME,
  databaseNameFromUri,
  mongoConnectionOptions
};
