import { Controller, Get, Patch, Body, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'services', version: '1' })
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  // Get all available services
  @Get()
  getAllServices() {
    return this.servicesService.getAllServices();
  }

  // Get my enabled services
  @Get('my')
  getMyServices(@Request() req) {
    return this.servicesService.getMyServices(req.user.id);
  }

  // Update my services (bulk update)
  @Patch('my')
  updateMyServices(@Request() req, @Body() body: { serviceIds: number[] }) {
    return this.servicesService.updateMyServices(req.user.id, body.serviceIds);
  }

  // Toggle a single service
  @Patch(':id/toggle')
  toggleService(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { enabled: boolean },
  ) {
    return this.servicesService.toggleService(req.user.id, id, body.enabled);
  }
}
