export interface JwtPayload {
  sub: string;
  email: string;
  role: 'tourist' | 'establishment' | 'lgu_admin';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: JwtPayload['role'];
}
