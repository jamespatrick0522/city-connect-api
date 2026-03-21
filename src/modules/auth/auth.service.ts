import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { AppLoggerService } from '../../common/logger/app-logger.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { LoginDto, RegisterEstablishmentDto, RegisterLguAdminDto } from './dto/auth.dto';
import { JwtPayload } from './types/authenticated-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async registerEstablishment(payload: RegisterEstablishmentDto) {
    return this.createPrivilegedAccount(payload, 'establishment');
  }

  async registerLguAdmin(payload: RegisterLguAdminDto) {
    const expectedCode = this.configService.getOrThrow<string>('app.auth.lguAdminRegisterCode');

    if (payload.registerCode !== expectedCode) {
      throw new UnauthorizedException('Invalid LGU admin registration code.');
    }

    return this.createPrivilegedAccount(payload, 'lgu_admin');
  }

  async login(payload: LoginDto) {
    const user = await this.usersRepository.findByEmail(payload.email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.role !== 'establishment' && user.role !== 'lgu_admin') {
      throw new UnauthorizedException('Role is not allowed to login through this endpoint.');
    }

    const token = await this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`User login successful id=${user.id}`, 'AuthService');

    return {
      accessToken: token,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
    };
  }

  private async createPrivilegedAccount(
    payload: RegisterEstablishmentDto | RegisterLguAdminDto,
    role: 'establishment' | 'lgu_admin',
  ) {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException('Email already in use.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.usersRepository.create({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role,
      passwordHash,
      isActive: true,
      updatedAt: new Date(),
    });

    const token = await this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`Privileged account registered id=${user.id} role=${role}`, 'AuthService');

    return {
      accessToken: token,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
    };
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'tourist' | 'establishment' | 'lgu_admin';
    isActive: boolean;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
