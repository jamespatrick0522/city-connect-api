import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';

import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { Establishment, EstablishmentMedia } from '../../common/database/schema';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CreateEstablishmentDto,
  ListMyEstablishmentsDto,
  SearchEstablishmentsDto,
  UpdateEstablishmentLocationDto,
  UpdateEstablishmentProfileDto,
  UpdateEstablishmentStatusDto,
  VerifyEstablishmentDto,
} from './dto/establishments.dto';
import { EstablishmentMediaRepository } from './repositories/establishment-media.repository';
import { EstablishmentsRepository } from './repositories/establishments.repository';

const MIN_GALLERY_IMAGES = 3;
const MAX_GALLERY_IMAGES = 5;

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly establishmentMediaRepository: EstablishmentMediaRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  async register(payload: CreateEstablishmentDto, currentUser: AuthenticatedUser) {
    const created = await this.establishmentsRepository.create({
      ...(this.cleanProfilePayload(payload) as any),
      ownerUserId: currentUser.userId,
      listingStatus: 'draft',
      businessStatus: payload.isOpenNow ? 'open' : 'closed',
      statusNote: 'Complete the permit/BIR number and upload 3 to 5 gallery images before submitting for LGU approval.',
      updatedAt: new Date(),
    });

    await this.clearEstablishmentCaches(currentUser.userId);
    this.logger.log(`Establishment draft registered id=${created.id}`, 'EstablishmentsService');

    return this.enrichEstablishment(created as Establishment);
  }

  async findById(establishmentId: string) {
    const row = await this.establishmentsRepository.findById(establishmentId);
    if (!row) {
      throw new NotFoundException('Establishment not found.');
    }

    return this.enrichEstablishment(row as Establishment);
  }

  async search(query: SearchEstablishmentsDto) {
    const cacheKey = `establishments:search:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<Awaited<ReturnType<EstablishmentsRepository['search']>>>(
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const results = await this.establishmentsRepository.search(query);
    const enriched = {
      ...results,
      data: await Promise.all(results.data.map((row) => this.enrichEstablishment(row as Establishment))),
    };
    await this.redisService.setJson(cacheKey, enriched, 30);

    return enriched;
  }

  async listMine(query: ListMyEstablishmentsDto, currentUser: AuthenticatedUser) {
    const cacheKey = `establishments:mine:${currentUser.userId}:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<Awaited<ReturnType<EstablishmentsRepository['listByOwner']>>>(
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const results = await this.establishmentsRepository.listByOwner(currentUser.userId, {
      listingStatus: query.listingStatus,
      page: query.page,
      pageSize: query.pageSize,
    });

    const enriched = {
      ...results,
      data: await Promise.all(results.data.map((row) => this.enrichEstablishment(row as Establishment))),
    };

    await this.redisService.setJson(cacheKey, enriched, 30);
    return enriched;
  }

  async updateProfile(
    establishmentId: string,
    payload: UpdateEstablishmentProfileDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updated = await this.establishmentsRepository.updateProfile(
      establishmentId,
      this.cleanProfilePayload(payload),
    );

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async submitForApproval(establishmentId: string, currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'establishment') {
      throw new ForbiddenException('Only establishment owners can submit listings for approval.');
    }

    await this.assertCanManage(establishmentId, currentUser);

    const establishment = await this.findRawById(establishmentId);
    const media = await this.establishmentMediaRepository.listByEstablishment(establishmentId);
    this.assertSubmissionRequirements(establishment, media as EstablishmentMedia[]);

    const updated = await this.establishmentsRepository.updateProfile(establishmentId, {
      listingStatus: 'pending',
      statusNote: null,
      verifiedByUserId: null,
      verifiedAt: null,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async verify(establishmentId: string, payload: VerifyEstablishmentDto, currentUser: AuthenticatedUser) {
    const establishment = await this.findRawById(establishmentId);
    const media = await this.establishmentMediaRepository.listByEstablishment(establishmentId);

    let listingStatus = payload.listingStatus;
    let statusNote = payload.statusNote?.trim() || undefined;

    if (listingStatus === 'verified') {
      const missing = this.getMissingRequirements(establishment, media as EstablishmentMedia[]);
      if (missing.length) {
        listingStatus = 'rejected';
        statusNote = `Automatically rejected: ${missing.join(', ')}.`;
      }
    }

    if (listingStatus === 'rejected' && !statusNote) {
      throw new BadRequestException('Rejection reason is required.');
    }

    const updated = await this.establishmentsRepository.verifyListing(
      establishmentId,
      listingStatus,
      currentUser.userId,
      statusNote,
    );

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async updateStatus(
    establishmentId: string,
    payload: UpdateEstablishmentStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updated = await this.establishmentsRepository.updateBusinessStatus(establishmentId, payload);

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async updateLocation(
    establishmentId: string,
    payload: UpdateEstablishmentLocationDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updatePayload: {
      latitude: string;
      longitude: string;
      address?: string;
    } = {
      latitude: payload.latitude.toFixed(7),
      longitude: payload.longitude.toFixed(7),
    };

    if (payload.address?.trim()) {
      updatePayload.address = payload.address.trim();
    }

    const updated = await this.establishmentsRepository.updateLocation(establishmentId, updatePayload);

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async updateCoverPhoto(
    establishmentId: string,
    coverPhotoUrl: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updated = await this.establishmentsRepository.updateCoverPhoto(establishmentId, coverPhotoUrl);

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.clearEstablishmentCaches(updated.ownerUserId ?? undefined);
    return this.enrichEstablishment(updated as Establishment);
  }

  async addGalleryImage(
    establishmentId: string,
    asset: UploadApiResponse,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const existing = await this.establishmentMediaRepository.listByEstablishment(establishmentId);
    const imageCount = existing.filter((item) => item.type === 'image').length;

    if (imageCount >= MAX_GALLERY_IMAGES) {
      throw new BadRequestException(`A listing can have a maximum of ${MAX_GALLERY_IMAGES} gallery images.`);
    }

    await this.establishmentMediaRepository.create({
      establishmentId,
      type: 'image',
      url: asset.secure_url,
      publicId: asset.public_id,
      format: asset.format,
      bytes: asset.bytes,
      sortOrder: imageCount + 1,
      updatedAt: new Date(),
    });

    const establishment = await this.findRawById(establishmentId);
    await this.clearEstablishmentCaches(establishment.ownerUserId ?? undefined);
    return this.enrichEstablishment(establishment);
  }

  async uploadLocationVideo(
    establishmentId: string,
    asset: UploadApiResponse,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const existing = await this.establishmentMediaRepository.listByEstablishment(establishmentId);
    const existingVideos = existing.filter((item) => item.type === 'video');

    await Promise.all(existingVideos.map((item) => this.deleteMediaAsset(item as EstablishmentMedia)));

    await this.establishmentMediaRepository.create({
      establishmentId,
      type: 'video',
      url: asset.secure_url,
      publicId: asset.public_id,
      format: asset.format,
      bytes: asset.bytes,
      sortOrder: 0,
      updatedAt: new Date(),
    });

    const establishment = await this.findRawById(establishmentId);
    await this.clearEstablishmentCaches(establishment.ownerUserId ?? undefined);
    return this.enrichEstablishment(establishment);
  }

  async deleteMedia(establishmentId: string, mediaId: string, currentUser: AuthenticatedUser) {
    await this.assertCanManage(establishmentId, currentUser);

    const media = await this.establishmentMediaRepository.findById(mediaId);
    if (!media || media.establishmentId !== establishmentId) {
      throw new NotFoundException('Media not found.');
    }

    await this.deleteMediaAsset(media as EstablishmentMedia);
    const establishment = await this.findRawById(establishmentId);
    await this.clearEstablishmentCaches(establishment.ownerUserId ?? undefined);
    return this.enrichEstablishment(establishment);
  }

  private async deleteMediaAsset(media: EstablishmentMedia): Promise<void> {
    await this.establishmentMediaRepository.deleteById(media.id);

    if (media.publicId) {
      await this.cloudinaryService.deleteFile(media.publicId, media.type).catch(() => undefined);
    }
  }

  private async findRawById(establishmentId: string): Promise<Establishment> {
    const establishment = await this.establishmentsRepository.findById(establishmentId);
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    return establishment as Establishment;
  }

  private async assertCanManage(establishmentId: string, currentUser: AuthenticatedUser): Promise<void> {
    if (currentUser.role === 'lgu_admin') {
      return;
    }

    const establishment = await this.findRawById(establishmentId);

    if (establishment.ownerUserId !== currentUser.userId) {
      throw new ForbiddenException('You can only manage establishments you own.');
    }
  }

  private cleanProfilePayload(payload: CreateEstablishmentDto | UpdateEstablishmentProfileDto) {
    return {
      ...payload,
      city: payload.city?.trim(),
      name: payload.name?.trim(),
      address: payload.address?.trim(),
      description: payload.description?.trim() || undefined,
      services: payload.services?.trim() || undefined,
      businessPermitNumber: payload.businessPermitNumber?.trim() || undefined,
      contactNumber: payload.contactNumber?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      opensAt: payload.opensAt || undefined,
      closesAt: payload.closesAt || undefined,
    };
  }

  private async enrichEstablishment(establishment: Establishment) {
    const media = (await this.establishmentMediaRepository.listByEstablishment(
      establishment.id,
    )) as EstablishmentMedia[];

    return {
      ...establishment,
      media,
      requirements: this.getRequirements(establishment, media),
    };
  }

  private getRequirements(establishment: Establishment, media: EstablishmentMedia[]) {
    const galleryImages = media.filter((item) => item.type === 'image');
    const locationVideos = media.filter((item) => item.type === 'video');
    const missing = this.getMissingRequirements(establishment, media);

    return {
      hasBusinessPermitNumber: Boolean(establishment.businessPermitNumber?.trim()),
      galleryImageCount: galleryImages.length,
      minGalleryImages: MIN_GALLERY_IMAGES,
      maxGalleryImages: MAX_GALLERY_IMAGES,
      hasLocationVideo: locationVideos.length > 0,
      canSubmitForApproval: missing.length === 0,
      missing,
    };
  }

  private getMissingRequirements(establishment: Establishment, media: EstablishmentMedia[]): string[] {
    const missing: string[] = [];
    const galleryImageCount = media.filter((item) => item.type === 'image').length;

    if (!establishment.businessPermitNumber?.trim()) {
      missing.push('business permit/BIR number is required');
    }

    if (galleryImageCount < MIN_GALLERY_IMAGES) {
      missing.push(`at least ${MIN_GALLERY_IMAGES} gallery images are required`);
    }

    if (galleryImageCount > MAX_GALLERY_IMAGES) {
      missing.push(`no more than ${MAX_GALLERY_IMAGES} gallery images are allowed`);
    }

    return missing;
  }

  private assertSubmissionRequirements(establishment: Establishment, media: EstablishmentMedia[]) {
    const missing = this.getMissingRequirements(establishment, media);
    if (missing.length) {
      throw new BadRequestException(`Cannot submit for approval: ${missing.join(', ')}.`);
    }
  }

  private async clearEstablishmentCaches(ownerUserId?: string): Promise<void> {
    await this.redisService.delByPattern('establishments:search:*');
    await this.redisService.delByPattern('admin:dashboard:*');

    if (ownerUserId) {
      await this.redisService.delByPattern(`establishments:mine:${ownerUserId}:*`);
    }
  }
}

