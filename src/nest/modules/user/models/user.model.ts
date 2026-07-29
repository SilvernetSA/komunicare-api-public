import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserLocationModel {
  @ApiPropertyOptional({ example: '127.0.0.1' })
  ip?: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  country?: string;

  @ApiPropertyOptional({ example: 'AR' })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  region?: string;

  @ApiPropertyOptional({ example: 'La Plata' })
  city?: string;
}

export class UserModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '699881b537b29fcb262303b9' })
  id?: string;

  @ApiPropertyOptional({ example: 'Damian' })
  name?: string;

  @ApiProperty({ example: 'damian@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'user' })
  role?: string;

  @ApiPropertyOptional({ type: String, example: '2026-02-20T00:00:00.000Z' })
  birthdate?: string | Date;

  @ApiPropertyOptional({ example: 'es-AR' })
  locale?: string;

  @ApiPropertyOptional({ type: () => UserLocationModel })
  location?: UserLocationModel;

  @ApiPropertyOptional({ example: false })
  isFirstLogin?: boolean;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other', ''] })
  gender?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [],
  })
  communicators?: unknown[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [],
  })
  boards?: unknown[];

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  settings?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: false })
  isAdmin?: boolean;

  @ApiPropertyOptional({ example: false })
  isByBackOffice?: boolean;

  @ApiPropertyOptional({ example: false })
  emailConfirmed?: boolean;

  @ApiPropertyOptional({ example: false })
  isManuallyBlocked?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  lockedUntil?: Date | null;
}

export class UserActionResponse {
  @ApiPropertyOptional({ example: 1 })
  success?: number;

  @ApiPropertyOptional({ example: true })
  response?: boolean;

  @ApiPropertyOptional({ example: '/activate/abc123' })
  url?: string;

  @ApiPropertyOptional({ example: '699881b537b29fcb262303b9' })
  userid?: string;

  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  error?: unknown;
}

export class AuthenticatedUserModel extends UserModel {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  authToken!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  subscriber?: unknown;
}

export class PaginatedUsersResponse {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: '-_id' })
  sort!: string;

  @ApiProperty({ example: '' })
  search!: string;

  @ApiProperty({ type: () => UserModel, isArray: true })
  data!: UserModel[];
}

export class SendUserEmailResponse extends UserActionResponse {
  @ApiPropertyOptional({ example: '01000192d7c0d364-12345678-1234-1234-1234-123456789012-000000' })
  sesMessageId?: string;
}
