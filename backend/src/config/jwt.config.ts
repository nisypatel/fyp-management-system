export const jwtConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your_access_token_secret_key_change_this',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret_key_change_this',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
