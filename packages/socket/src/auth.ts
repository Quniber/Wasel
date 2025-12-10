import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { AuthenticatedUser, UserType } from './types';

interface JwtPayload {
  sub: number;
  type: UserType;
  mobileNumber?: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication middleware for Socket.io
 * Validates JWT token from handshake auth or query params
 */
export function createAuthMiddleware(jwtSecret: string) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Get token from auth header or query param
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token as string, jwtSecret);
      const payload = decoded as unknown as JwtPayload;

      if (!payload.sub || !payload.type) {
        return next(new Error('Invalid token payload'));
      }

      // Validate user type
      if (payload.type !== 'driver' && payload.type !== 'rider') {
        return next(new Error('Invalid user type'));
      }

      // Attach user to socket data
      const user: AuthenticatedUser = {
        id: payload.sub,
        type: payload.type,
        mobileNumber: payload.mobileNumber,
      };

      socket.data.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new Error('Token expired'));
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new Error('Invalid token'));
      }
      return next(new Error('Authentication failed'));
    }
  };
}

/**
 * Generate a socket token for a user
 * This should be called from the API when user logs in
 */
export function generateSocketToken(
  userId: number,
  userType: UserType,
  jwtSecret: string,
  expiresIn: string = '7d'
): string {
  const payload: JwtPayload = {
    sub: userId,
    type: userType,
  };

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Verify a socket token without middleware
 */
export function verifySocketToken(
  token: string,
  jwtSecret: string
): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const payload = decoded as unknown as JwtPayload;
    return {
      id: payload.sub,
      type: payload.type,
      mobileNumber: payload.mobileNumber,
    };
  } catch {
    return null;
  }
}
