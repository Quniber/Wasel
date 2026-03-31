import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@Controller({ path: 'sessions', version: '1' })
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.sessionsService.refreshSession(refreshToken, ipAddress);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getActiveSessions(@Req() req: any) {
    return this.sessionsService.getActiveSessions(req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  revokeSession(
    @Req() req: any,
    @Param('id', ParseIntPipe) sessionId: number,
  ) {
    return this.sessionsService.revokeSession(req.user.id, sessionId);
  }

  @Post('revoke-others')
  @UseGuards(JwtAuthGuard)
  revokeOtherSessions(
    @Req() req: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.sessionsService.revokeAllOtherSessions(req.user.id, refreshToken);
  }

  @Post('revoke-all')
  @UseGuards(JwtAuthGuard)
  revokeAllSessions(@Req() req: any) {
    return this.sessionsService.revokeAllSessions(req.user.id);
  }

  @Post('logout')
  logout(@Body('refreshToken') refreshToken: string) {
    return this.sessionsService.logout(refreshToken);
  }

  @Post('device-token')
  @UseGuards(JwtAuthGuard)
  updateDeviceToken(
    @Req() req: any,
    @Body('refreshToken') refreshToken: string,
    @Body('deviceToken') deviceToken: string,
  ) {
    return this.sessionsService.updateDeviceToken(req.user.id, refreshToken, deviceToken);
  }
}
