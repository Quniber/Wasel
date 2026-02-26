import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'complaints', version: '1' })
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(private complaintsService: ComplaintsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.complaintsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
  }

  @Get('stats')
  getStats() {
    return this.complaintsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.complaintsService.findOne(id);
  }

  @Patch(':id')
  updateStatus(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; response?: string },
  ) {
    return this.complaintsService.updateStatus(id, body.status, body.response, req.user?.sub);
  }

  @Post(':id/response')
  addResponse(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
  ) {
    return this.complaintsService.addResponse(id, body.content, req.user.sub);
  }
}
