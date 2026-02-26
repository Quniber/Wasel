import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentStatus } from 'database';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // Get required document types
  async getRequiredDocuments() {
    const documentTypes = await this.prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    return documentTypes.map((dt) => ({
      id: dt.id,
      name: dt.name,
      description: dt.description,
      isRequired: dt.isRequired,
      hasExpiry: dt.hasExpiry,
    }));
  }

  // Get driver's uploaded documents
  async getMyDocuments(driverId: number) {
    const documents = await this.prisma.driverDocument.findMany({
      where: { driverId },
      include: {
        documentType: true,
        media: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      documentType: {
        id: doc.documentType.id,
        name: doc.documentType.name,
      },
      media: doc.media
        ? {
            id: doc.media.id,
            address: doc.media.address,
          }
        : null,
      status: doc.status,
      expiryDate: doc.expiryDate,
      rejectionNote: doc.rejectionNote,
      verifiedAt: doc.verifiedAt,
      createdAt: doc.createdAt,
    }));
  }

  // Upload a document
  async uploadDocument(
    driverId: number,
    data: {
      documentTypeId: number;
      mediaId: number;
      expiryDate?: Date;
    },
  ) {
    // Verify document type exists and is enabled
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: data.documentTypeId },
    });

    if (!documentType || !documentType.isActive) {
      throw new NotFoundException('Document type not found or disabled');
    }

    // Check if document type requires expiry date
    if (documentType.hasExpiry && !data.expiryDate) {
      throw new BadRequestException('Expiry date is required for this document type');
    }

    // Verify media exists
    const media = await this.prisma.media.findUnique({
      where: { id: data.mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    // Check if driver already has this document type (pending or approved)
    const existingDocument = await this.prisma.driverDocument.findFirst({
      where: {
        driverId,
        documentTypeId: data.documentTypeId,
        status: { in: [DocumentStatus.pending, DocumentStatus.approved] },
      },
    });

    if (existingDocument) {
      // Update existing document instead of creating new
      const updated = await this.prisma.driverDocument.update({
        where: { id: existingDocument.id },
        data: {
          mediaId: data.mediaId,
          expiryDate: data.expiryDate,
          status: DocumentStatus.pending,
          rejectionNote: null,
          verifiedAt: null,
          verifiedById: null,
        },
        include: {
          documentType: true,
          media: true,
        },
      });

      return {
        id: updated.id,
        documentType: {
          id: updated.documentType.id,
          name: updated.documentType.name,
        },
        media: updated.media
          ? {
              id: updated.media.id,
              address: updated.media.address,
            }
          : null,
        status: updated.status,
        expiryDate: updated.expiryDate,
        createdAt: updated.createdAt,
        message: 'Document updated successfully',
      };
    }

    // Create new document
    const document = await this.prisma.driverDocument.create({
      data: {
        driverId,
        documentTypeId: data.documentTypeId,
        mediaId: data.mediaId,
        expiryDate: data.expiryDate,
        status: DocumentStatus.pending,
      },
      include: {
        documentType: true,
        media: true,
      },
    });

    // Check if all required documents are now uploaded
    await this.checkAndUpdateDriverStatus(driverId);

    return {
      id: document.id,
      documentType: {
        id: document.documentType.id,
        name: document.documentType.name,
      },
      media: document.media
        ? {
            id: document.media.id,
            address: document.media.address,
          }
        : null,
      status: document.status,
      expiryDate: document.expiryDate,
      createdAt: document.createdAt,
    };
  }

  // Delete a document
  async deleteDocument(driverId: number, documentId: number) {
    const document = await this.prisma.driverDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.driverId !== driverId) {
      throw new ForbiddenException('Not authorized to delete this document');
    }

    // Only allow deletion of pending or rejected documents
    if (document.status === DocumentStatus.approved) {
      throw new BadRequestException('Cannot delete an approved document');
    }

    await this.prisma.driverDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }

  // Check if all required documents are uploaded and update driver status
  private async checkAndUpdateDriverStatus(driverId: number) {
    // Get all required document types
    const requiredTypes = await this.prisma.documentType.findMany({
      where: { isActive: true, isRequired: true },
    });

    // Get driver's uploaded documents
    const uploadedDocuments = await this.prisma.driverDocument.findMany({
      where: {
        driverId,
        status: { in: [DocumentStatus.pending, DocumentStatus.approved] },
      },
    });

    const uploadedTypeIds = uploadedDocuments.map((d) => d.documentTypeId);
    const allRequiredUploaded = requiredTypes.every((rt) => uploadedTypeIds.includes(rt.id));

    // If all required documents are uploaded, update driver status to pending_approval
    if (allRequiredUploaded) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (driver && driver.status === 'waiting_documents') {
        await this.prisma.driver.update({
          where: { id: driverId },
          data: { status: 'pending_approval' },
        });
      }
    }
  }

  // Get document submission status for driver
  async getDocumentStatus(driverId: number) {
    const requiredTypes = await this.prisma.documentType.findMany({
      where: { isActive: true, isRequired: true },
    });

    const uploadedDocuments = await this.prisma.driverDocument.findMany({
      where: { driverId },
      include: { documentType: true },
    });

    const status = requiredTypes.map((rt) => {
      const uploaded = uploadedDocuments.find((d) => d.documentTypeId === rt.id);
      return {
        documentType: {
          id: rt.id,
          name: rt.name,
          isRequired: rt.isRequired,
        },
        uploaded: !!uploaded,
        status: uploaded?.status || null,
        rejectionNote: uploaded?.rejectionNote || null,
      };
    });

    const allUploaded = status.filter((s) => s.documentType.isRequired).every((s) => s.uploaded);
    const allApproved = status
      .filter((s) => s.documentType.isRequired)
      .every((s) => s.status === DocumentStatus.approved);
    const hasRejected = status.some((s) => s.status === DocumentStatus.rejected);

    return {
      documents: status,
      summary: {
        allRequiredUploaded: allUploaded,
        allRequiredApproved: allApproved,
        hasRejectedDocuments: hasRejected,
        pendingCount: status.filter((s) => s.status === DocumentStatus.pending).length,
        approvedCount: status.filter((s) => s.status === DocumentStatus.approved).length,
        rejectedCount: status.filter((s) => s.status === DocumentStatus.rejected).length,
      },
    };
  }
}
