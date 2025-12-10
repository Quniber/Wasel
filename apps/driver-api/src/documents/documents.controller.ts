import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  // Get required document types (public endpoint - no auth required for signup)
  @Get('required')
  getRequiredDocuments() {
    return this.documentsService.getRequiredDocuments();
  }

  // Get my uploaded documents
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyDocuments(@Req() req: any) {
    return this.documentsService.getMyDocuments(req.user.id);
  }

  // Get document submission status
  @UseGuards(JwtAuthGuard)
  @Get('status')
  getDocumentStatus(@Req() req: any) {
    return this.documentsService.getDocumentStatus(req.user.id);
  }

  // Upload a document
  @UseGuards(JwtAuthGuard)
  @Post()
  uploadDocument(
    @Req() req: any,
    @Body()
    body: {
      documentTypeId: number;
      mediaId: number;
      expiryDate?: string;
    },
  ) {
    return this.documentsService.uploadDocument(req.user.id, {
      documentTypeId: body.documentTypeId,
      mediaId: body.mediaId,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    });
  }

  // Delete a document
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteDocument(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.documentsService.deleteDocument(req.user.id, id);
  }
}
