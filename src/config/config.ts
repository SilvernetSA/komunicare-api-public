
export const config = {
  databaseUrl: process.env.DATABASE_URL_DEV || process.env.MONGO_URL,
  session: {
    secret: process.env.API_SESSION_SECRET || 's3Cur3'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    issuer: process.env.JWT_ISSUER || 'cboard.io'
  }
};

