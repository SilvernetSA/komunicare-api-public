import { Request } from 'express';

import { config } from '../../config/config';

const jwt = require('jsonwebtoken');

const { secret: jwtSecret, issuer } = config.jwt;

const getTokenData = (token?: string): Record<string, unknown> | null => {
  let data: Record<string, unknown> | null = null;

  try {
    data = jwt.verify(token, jwtSecret);
  } catch {}

  return data;
};

export const verifyToken = (req: Request, token: string): boolean => {
  let isValid = false;

  const rawToken = token
    ? token.indexOf('Bearer ') === 0
      ? token.split(' ')[1]
      : token
    : '';

  if (rawToken) {
    const decodedToken = getTokenData(rawToken);
    const { id, email, issuer: tokenIssuer } = decodedToken || {};

    if (id && email && tokenIssuer && tokenIssuer === config.jwt.issuer) {
      isValid = true;
      (req as any).auth = decodedToken;
    }
  }

  return isValid;
};

export const issueToken = ({
  email,
  id,
}: {
  email: string;
  id: string;
}): string => {
  return jwt.sign({ email, id, issuer }, jwtSecret);
};
