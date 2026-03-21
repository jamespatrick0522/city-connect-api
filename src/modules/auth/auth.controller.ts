import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { LoginDto, RegisterEstablishmentDto, RegisterLguAdminDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-establishment')
  @ApiOperation({ summary: 'Register establishment account and return JWT token.' })
  registerEstablishment(@Body() payload: RegisterEstablishmentDto) {
    return this.authService.registerEstablishment(payload);
  }

  @Post('register-lgu-admin')
  @ApiOperation({ summary: 'Register LGU admin account using private register code.' })
  registerLguAdmin(@Body() payload: RegisterLguAdminDto) {
    return this.authService.registerLguAdmin(payload);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login for establishment/LGU admin.' })
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }
}
