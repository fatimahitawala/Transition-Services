import httpStatus from 'http-status';
import ApiError from '../../../Common/Utils/ApiError';
import { APICodes } from '../../../Common/Constants';
import { getPaginationInfo } from '../../../Common/Utils/paginationUtils';
import { UserRoles } from '../../../Entities/UserRoles.entity';
import { OccupancyStatus, MOVE_IN_AND_OUT_REQUEST_STATUS, MOVE_IN_USER_TYPES } from '../../../Entities/EntityTypes';
import { AccessCardRequests } from '../../../Entities/AccessCardRequests.entity';
import { AccessCardTypes } from '../../../Entities/EntityTypes/accessCard';
import { checkAdminPermission, checkAdminPermissionFromUnit } from '../../../Common/Utils/adminAccess';
import { MoveInRequests } from '../../../Entities/MoveInRequests.entity';
import { MoveInRequestDetailsTenant } from '../../../Entities/MoveInRequestDetailsTenant.entity';
import { MoveInRequestDetailsHhcCompany } from '../../../Entities/MoveInRequestDetailsHhcCompany.entity';
import { MoveInRequestDetailsHhoOwner } from '../../../Entities/MoveInRequestDetailsHhoOwner.entity';
import { AccountRenewalRequests } from '../../../Entities/AccountRenewalRequests.entity';
import { AccountRenewalRequestDetailsTenant } from '../../../Entities/AccountRenewalRequestDetailsTenant.entity';
import { AccountRenewalRequestDetailsHhoCompany } from '../../../Entities/AccountRenewalRequestDetailsHhoCompany.entity';
import { AccountRenewalRequestDetailsHhoOwner } from '../../../Entities/AccountRenewalRequestDetailsHhoOwner.entity';

export class ActiveResidentsService {
  async getActiveResidentsList(query: any, user: any) {
    try {
      const page = Number(query.page) || 1;
      const per_page = Number(query.per_page) || 10;
      const search = (query.search || '').trim();
      const masterCommunity = query.masterCommunity ? Number(query.masterCommunity) : undefined;
      const community = query.community ? Number(query.community) : undefined;
      const tower = query.tower ? Number(query.tower) : undefined;
      const unit = query.unit ? Number(query.unit) : undefined;
      const residentType = (query.residentType || '').toLowerCase(); // owner|tenant|hho|hhc

      // Base query from CLOSED move-in requests
      let qb = MoveInRequests.getRepository().createQueryBuilder('mir')
        .leftJoinAndSelect('mir.unit', 'u')
        .leftJoinAndSelect('u.masterCommunity', 'mc')
        .leftJoinAndSelect('u.community', 'c')
        .leftJoinAndSelect('u.tower', 't')
        .leftJoinAndSelect('mir.user', 'usr')
        .where('mir.isActive = true')
        .andWhere('u.isActive = true')
        .andWhere('mir.status = :closed', { closed: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED });

      // Permission scope for non-admins
      if (!user?.isAdmin) {
        qb = checkAdminPermission(qb, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      // Keep a base clone for counts (with scope + hierarchy filters only)
      const countBaseQb = qb.clone();

      // Filter by hierarchy
      if (masterCommunity) qb.andWhere('mc.id = :masterCommunity', { masterCommunity });
      if (community) qb.andWhere('c.id = :community', { community });
      if (tower) qb.andWhere('t.id = :tower', { tower });
      if (unit) qb.andWhere('u.id = :unit', { unit });

      // Filter by resident type (map to move-in request types)
      if (residentType) {
        const map: any = { owner: MOVE_IN_USER_TYPES.OWNER, tenant: MOVE_IN_USER_TYPES.TENANT, hho: MOVE_IN_USER_TYPES.HHO_OWNER, hhc: MOVE_IN_USER_TYPES.HHO_COMPANY };
        const type = map[residentType];
        if (type) qb.andWhere('mir.requestType = :rtype', { rtype: type });
      }

      if (search) {
        const like = `%${search}%`;
        qb.andWhere(
          '(mir.moveInRequestNo LIKE :like OR u.unitNumber LIKE :like OR u.unitName LIKE :like)',
          { like }
        );
      }

      // Count first
      const count = await qb.getCount();
      // Data with pagination and simple ordering
      const list = await qb
        .orderBy('mir.updatedAt', 'DESC')
        .offset((page - 1) * per_page)
        .limit(per_page)
        .getMany();

      // Shape minimal list item
      const data = await Promise.all(list.map(async (mir: any) => {
        const typeMap: any = {
          [MOVE_IN_USER_TYPES.OWNER]: 'Owner',
          [MOVE_IN_USER_TYPES.TENANT]: 'Tenant',
          [MOVE_IN_USER_TYPES.HHO_OWNER]: 'HHO-Unit',
          [MOVE_IN_USER_TYPES.HHO_COMPANY]: 'HHO-Company',
        };
        const occIndicator =
          mir.requestType === MOVE_IN_USER_TYPES.TENANT ? OccupancyStatus.TENANT :
            mir.requestType === MOVE_IN_USER_TYPES.HHO_OWNER ? OccupancyStatus.HHO :
              mir.requestType === MOVE_IN_USER_TYPES.HHO_COMPANY ? 'hhc' : OccupancyStatus.OWNER;
        const tenancyEndDate = await this.getTenancyEndDate((mir as any).user?.id, (mir as any).unit?.id, occIndicator as any, mir.id);
        // derive active userRoleId for details route
        let userRoleId: number | null = null;
        try {
          const roleSlugMap: any = {
            [MOVE_IN_USER_TYPES.OWNER]: 'owner',
            [MOVE_IN_USER_TYPES.TENANT]: 'tenant',
            [MOVE_IN_USER_TYPES.HHO_OWNER]: 'hho',
            [MOVE_IN_USER_TYPES.HHO_COMPANY]: 'hhc',
          };
          const roleSlug = roleSlugMap[mir.requestType] || 'tenant';
          const ur = await UserRoles.getRepository().createQueryBuilder('ur')
            .innerJoin('ur.role', 'rol')
            .where('ur.isActive = true')
            .andWhere('ur.user = :uid', { uid: (mir as any).user?.id })
            .andWhere('ur.unit = :unid', { unid: (mir as any).unit?.id })
            .andWhere('rol.slug = :slug', { slug: roleSlug })
            .getOne();
          userRoleId = (ur as any)?.id || null;
        } catch { }
        return {
          moveInRequestId: mir.id,
          moveInRequestNo: mir.moveInRequestNo,
          moveInType: typeMap[mir.requestType] || String(mir.requestType),
          userRoleId,
          masterCommunity: (mir as any).unit?.masterCommunity?.name,
          community: (mir as any).unit?.community?.name,
          tower: (mir as any).unit?.tower?.name,
          unitId: (mir as any).unit?.id,
          unitNumber: (mir as any).unit?.unitNumber,
          unitName: (mir as any).unit?.unitName,
          tenancyEndDate,
        };
      }));

      const pagination = getPaginationInfo(page, per_page, count);

      // Counts per type (respecting permission + hierarchy, ignoring search/residentType filter)
      const base = countBaseQb.clone();
      const total = await base.getCount();
      const ownerCount = await countBaseQb.clone().andWhere('mir.requestType = :t', { t: MOVE_IN_USER_TYPES.OWNER }).getCount();
      const tenantCount = await countBaseQb.clone().andWhere('mir.requestType = :t', { t: MOVE_IN_USER_TYPES.TENANT }).getCount();
      const hhoCount = await countBaseQb.clone().andWhere('mir.requestType = :t', { t: MOVE_IN_USER_TYPES.HHO_OWNER }).getCount();
      const hhcCount = await countBaseQb.clone().andWhere('mir.requestType = :t', { t: MOVE_IN_USER_TYPES.HHO_COMPANY }).getCount();

      return { data, pagination, counts: { owner: ownerCount, tenant: tenantCount, hho: hhoCount, hhc: hhcCount, total } };
    } catch (error: any) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes['UNKNOWN_ERROR'].message,
        APICodes['UNKNOWN_ERROR'].code
      );
    }
  }

  async getActiveResidentDetails(userRoleId: number, user: any) {
    try {
      let qb = UserRoles.getRepository().createQueryBuilder('ur')
        .leftJoinAndSelect('ur.user', 'usr')
        .leftJoinAndSelect('ur.unit', 'u')
        .leftJoinAndSelect('ur.role', 'rol')
        .leftJoinAndSelect('u.masterCommunity', 'mc')
        .leftJoinAndSelect('u.community', 'c')
        .leftJoinAndSelect('u.tower', 't')
        .leftJoinAndSelect('usr.dialCode', 'dc')
        .where('ur.id = :userRoleId', { userRoleId })
        .andWhere('ur.isActive = true')
        .andWhere('u.isActive = true');

      if (!user?.isAdmin) {
        qb = checkAdminPermission(qb, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      const ur = await qb.getOne();

      if (!ur) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
      }

      const occ = (ur as any).unit?.occupancyStatus as string;
      const residentTypeLabel =
        occ === OccupancyStatus.TENANT ? 'Tenant' :
          (occ as any) === 'hhc' ? 'HHO-Company' :
            occ === OccupancyStatus.HHO ? 'HHO-Unit' : 'Owner';

      const details: any = {
        userRoleId: ur.id,
        role: ur.role?.slug,
        startDate: ur.startDate,
        endDate: ur.endDate,
        user: {
          id: (ur as any).user?.id,
          firstName: (ur as any).user?.firstName,
          middleName: (ur as any).user?.middleName,
          lastName: (ur as any).user?.lastName,
          email: (ur as any).user?.email,
          mobile: (ur as any).user?.mobile,
          dialCode: (ur as any).user?.dialCode?.dialCode,
        },
        unit: {
          id: (ur as any).unit?.id,
          unitNumber: (ur as any).unit?.unitNumber,
          unitName: (ur as any).unit?.unitName,
          occupancyStatus: (ur as any).unit?.occupancyStatus,
          masterCommunity: (ur as any).unit?.masterCommunity?.name,
          community: (ur as any).unit?.community?.name,
          tower: (ur as any).unit?.tower?.name,
          residentType: residentTypeLabel,
        }
      };

      // Residency history (Move-in + Account Renewal)
      const userId = details.user.id;
      const unitId = details.unit.id;
      const moveIns = await MoveInRequests.getRepository().createQueryBuilder('mir')
        .where('mir.isActive = true')
        .andWhere('mir.user = :userId', { userId })
        .andWhere('mir.unit = :unitId', { unitId })
        .orderBy('mir.createdAt', 'DESC')
        .getMany();

      const renewals = await AccountRenewalRequests.getRepository().createQueryBuilder('arr')
        .where('arr.isActive = true')
        .andWhere('arr.user = :userId', { userId })
        .andWhere('arr.unit = :unitId', { unitId })
        .orderBy('arr.createdAt', 'DESC')
        .getMany();

      const historyMoveIn = await Promise.all(moveIns.map(async (m) => ({
        requestType: 'Move-in',
        requestTypeKey: 'move-in',
        requestId: m.id,
        moveInRequestNo: m.moveInRequestNo,
        permitNumber: await this.getMoveInDtcmPermitNumber(m),
        tenancyEndDate: await this.getTenancyEndDate(userId, unitId, (ur as any).unit?.occupancyStatus, m.id),
      })));

      const historyRenewals = await Promise.all(renewals.map(async (r) => ({
        requestType: 'Account Renewal',
        requestTypeKey: 'account-renewal',
        requestId: r.id,
        accountRenewalRequestNo: r.accountRenewalRequestNo,
        permitNumber: await this.getRenewalDtcmPermitNumber(r.id),
        tenancyEndDate: await this.getRenewalEndDate(r.id),
      })));

      details.history = [...historyMoveIn, ...historyRenewals].sort((a: any, b: any) => (b.requestId - a.requestId));

      return details;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes['UNKNOWN_ERROR'].message,
        APICodes['UNKNOWN_ERROR'].code
      );
    }
  }

  // No longer needed: we now list directly from closed Move-In requests

  async getAccessCardDetails(userRoleId: number, user: any) {
    try {
      // Fetch access card requests tied to this userRole and its unit
      let qb = AccessCardRequests.getRepository().createQueryBuilder('acr')
        .leftJoinAndSelect('acr.accessCard', 'ac')
        .leftJoinAndSelect('acr.accessCardUnitMapping', 'acm')
        .leftJoinAndSelect('acm.ParkingBay', 'pb')
        .leftJoinAndSelect('acm.accessCardSlot', 'acs')
        .leftJoinAndSelect('acr.unit', 'u')
        .leftJoin('u.masterCommunity', 'mc')
        .leftJoin('u.community', 'c')
        .leftJoin('u.tower', 't')
        .leftJoin('acr.userRole', 'ur')
        .where('acr.isActive = true')
        .andWhere('ur.id = :userRoleId', { userRoleId })
        .orderBy('acr.createdAt', 'DESC');

      if (!user?.isAdmin) {
        qb = checkAdminPermission(qb, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      const list = await qb.getMany();

      return list.map((r: any) => ({
        id: r.id,
        status: r.status,
        cardType: r.cardType,
        unitId: r.unit?.id,
        accessCard: r.accessCard ? {
          id: r.accessCard.id,
          cardNumber: r.accessCard.cardNumber,
          cardType: r.accessCard.cardType,
          status: r.accessCard.status,
        } : null,
        mapping: r.accessCardUnitMapping ? {
          id: r.accessCardUnitMapping.id,
          slot: r.accessCardUnitMapping?.accessCardSlot ? {
            id: (r.accessCardUnitMapping as any).accessCardSlot.id,
            name: (r.accessCardUnitMapping as any).accessCardSlot.name,
          } : null,
          parkingBay: r.accessCardUnitMapping.ParkingBay ? {
            id: r.accessCardUnitMapping.ParkingBay.id,
            bayNumber: (r.accessCardUnitMapping.ParkingBay as any).bayNumber,
          } : null,
          vehicle: r.accessCardUnitMapping ? {
            vehicleNumber: r.accessCardUnitMapping.vehicleNumber,
          } : null,
        } : null,
      }));
    } catch (error: any) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes['UNKNOWN_ERROR'].message,
        APICodes['UNKNOWN_ERROR'].code
      );
    }
  }

  async getParkingDetails(userRoleId: number, user: any) {
    try {
      // Parking via two sources:
      // 1) Unit parking meta (noOfParkings, parkingBays)
      // 2) Parking access card requests (vehicle + bay)
      const ur = await UserRoles.getRepository().createQueryBuilder('ur')
        .leftJoinAndSelect('ur.unit', 'u')
        .leftJoinAndSelect('u.parkingBays', 'pb')
        .where('ur.id = :userRoleId', { userRoleId })
        .getOne();

      if (!ur) {
        throw new ApiError(httpStatus.NOT_FOUND, APICodes.NOT_FOUND.message, APICodes.NOT_FOUND.code);
      }

      const unit = (ur as any).unit;

      // Permission check on unit
      if (!user?.isAdmin) {
        const allowed = await checkAdminPermissionFromUnit(unit?.id, user as any);
        if (!allowed) {
          throw new ApiError(httpStatus.FORBIDDEN, APICodes.FORBIDDEN.message, APICodes.FORBIDDEN.code);
        }
      }

      let pq = AccessCardRequests.getRepository().createQueryBuilder('acr')
        .leftJoinAndSelect('acr.accessCardUnitMapping', 'acm')
        .leftJoinAndSelect('acm.ParkingBay', 'pb')
        .leftJoinAndSelect('acm.emirateCode', 'ec')
        .leftJoinAndSelect('acm.emirateVehiclePlateCode', 'epc')
        .leftJoinAndSelect('acm.vehicleColor', 'vc')
        .leftJoinAndSelect('acm.vehicleMake', 'vm')
        .leftJoin('acr.unit', 'u')
        .leftJoin('u.masterCommunity', 'mc')
        .leftJoin('u.community', 'c')
        .leftJoin('u.tower', 't')
        .leftJoin('acr.userRole', 'usr')
        .where('acr.isActive = true')
        .andWhere('acr.cardType = :ctype', { ctype: AccessCardTypes.parking })
        .andWhere('usr.id = :userRoleId', { userRoleId })
        .orderBy('acr.createdAt', 'DESC');

      if (!user?.isAdmin) {
        pq = checkAdminPermission(pq, { towerId: 't.id', communityId: 'c.id', masterCommunityId: 'mc.id' }, user);
      }

      const parkingRequests = await pq.getMany();

      const vehicles = parkingRequests.map((r: any) => ({
        requestId: r.id,
        status: r.status,
        plateNumber: r.accessCardUnitMapping?.vehicleNumber || null,
        plateSource: (r as any).accessCardUnitMapping?.emirateCode?.name || null,
        plateCode: (r as any).accessCardUnitMapping?.emirateVehiclePlateCode?.code || null,
        vehicleColor: (r as any).accessCardUnitMapping?.vehicleColor?.name || null,
        vehicleMake: (r as any).accessCardUnitMapping?.vehicleMake?.name || null,
        parkingBay: r.accessCardUnitMapping?.ParkingBay ? {
          id: r.accessCardUnitMapping.ParkingBay.id,
          bayNumber: (r.accessCardUnitMapping.ParkingBay as any).bayNumber,
        } : null,
      }));

      return {
        unit: unit ? {
          id: unit.id,
          unitNumber: unit.unitNumber,
          noOfParkings: unit.noOfParkings,
          parkingType: unit.parkingType,
          assignedParking: unit.assignedParking,
        } : null,
        vehicles,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        APICodes['UNKNOWN_ERROR'].message,
        APICodes['UNKNOWN_ERROR'].code
      );
    }
  }

  private async getTenancyEndDate(userId: number, unitId: number, occupancyStatus: string, moveInRequestId?: number): Promise<Date | null> {
    try {
      // derive type from occupancy
      if (occupancyStatus === OccupancyStatus.TENANT) {
        const qb = MoveInRequestDetailsTenant.getRepository().createQueryBuilder('td')
          .innerJoin('td.moveInRequest', 'mir')
          .where('td.isActive = true')
          .andWhere('mir.isActive = true')
          .andWhere('mir.user = :userId', { userId })
          .andWhere('mir.unit = :unitId', { unitId })
        if (moveInRequestId) qb.andWhere('mir.id = :mirId', { mirId: moveInRequestId });
        const rec = await qb.orderBy('td.tenancyContractEndDate', 'DESC').getOne();
        return rec?.tenancyContractEndDate || null;
      }
      if ((occupancyStatus as any) === 'hhc') {
        const qb = MoveInRequestDetailsHhcCompany.getRepository().createQueryBuilder('cd')
          .innerJoin('cd.moveInRequest', 'mir')
          .where('cd.isActive = true')
          .andWhere('mir.isActive = true')
          .andWhere('mir.user = :userId', { userId })
          .andWhere('mir.unit = :unitId', { unitId })
        if (moveInRequestId) qb.andWhere('mir.id = :mirId', { mirId: moveInRequestId });
        const rec = await qb.orderBy('cd.leaseEndDate', 'DESC').getOne();
        return rec?.leaseEndDate || null;
      }
      if (occupancyStatus === OccupancyStatus.HHO) {
        const qb = MoveInRequestDetailsHhoOwner.getRepository().createQueryBuilder('od')
          .innerJoin('od.moveInRequest', 'mir')
          .where('od.isActive = true')
          .andWhere('mir.isActive = true')
          .andWhere('mir.user = :userId', { userId })
          .andWhere('mir.unit = :unitId', { unitId })
        if (moveInRequestId) qb.andWhere('mir.id = :mirId', { mirId: moveInRequestId });
        const rec = await qb.orderBy('od.unitPermitExpiryDate', 'DESC').getOne();
        return rec?.unitPermitExpiryDate || null;
      }
      return null; // owner has no tenancy end date
    } catch {
      return null;
    }
  }

  private async getRenewalEndDate(accountRenewalId: number): Promise<Date | null> {
    try {
      // Try tenant renewal first
      const tenant = await AccountRenewalRequestDetailsTenant.getRepository().createQueryBuilder('td')
        .innerJoin('td.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if (tenant?.tenancyContractEndDate) return tenant.tenancyContractEndDate;

      const hhc = await AccountRenewalRequestDetailsHhoCompany.getRepository().createQueryBuilder('cd')
        .innerJoin('cd.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if (hhc?.leaseContractEndDate) return hhc.leaseContractEndDate as any;

      const hho = await AccountRenewalRequestDetailsHhoOwner.getRepository().createQueryBuilder('od')
        .innerJoin('od.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if (hho?.dubaITourismUnitPermitExpiryDate) return hho.dubaITourismUnitPermitExpiryDate as any;
      if ((hho as any)?.dtcmExpiryDate) return (hho as any).dtcmExpiryDate as any;

      return null;
    } catch {
      return null;
    }
  }

  private async getMoveInDtcmPermitNumber(m: any): Promise<string | null> {
    try {
      switch ((m as any).requestType) {
        case MOVE_IN_USER_TYPES.TENANT: {
          const td = await MoveInRequestDetailsTenant.getRepository().createQueryBuilder('td')
            .innerJoin('td.moveInRequest', 'mir')
            .where('mir.id = :id', { id: m.id })
            .andWhere('td.isActive = true')
            .getOne();
          return (td as any)?.dtcmPermitNumber || null;
        }
        case MOVE_IN_USER_TYPES.HHO_COMPANY: {
          const cd = await MoveInRequestDetailsHhcCompany.getRepository().createQueryBuilder('cd')
            .innerJoin('cd.moveInRequest', 'mir')
            .where('mir.id = :id', { id: m.id })
            .andWhere('cd.isActive = true')
            .getOne();
          return (cd as any)?.dtcmPermitNumber || null;
        }
        case MOVE_IN_USER_TYPES.HHO_OWNER: {
          const od = await MoveInRequestDetailsHhoOwner.getRepository().createQueryBuilder('od')
            .innerJoin('od.moveInRequest', 'mir')
            .where('mir.id = :id', { id: m.id })
            .andWhere('od.isActive = true')
            .getOne();
          return (od as any)?.dtcmPermitNumber || null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private async getRenewalDtcmPermitNumber(accountRenewalId: number): Promise<string | null> {
    try {
      const tenant = await AccountRenewalRequestDetailsTenant.getRepository().createQueryBuilder('td')
        .innerJoin('td.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if ((tenant as any)?.dtcmPermitNumber) return (tenant as any).dtcmPermitNumber;

      const hhc = await AccountRenewalRequestDetailsHhoCompany.getRepository().createQueryBuilder('cd')
        .innerJoin('cd.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if ((hhc as any)?.dtcmPermitNumber) return (hhc as any).dtcmPermitNumber;

      const hho = await AccountRenewalRequestDetailsHhoOwner.getRepository().createQueryBuilder('od')
        .innerJoin('od.accountRenewalRequest', 'arr')
        .where('arr.id = :id', { id: accountRenewalId })
        .getOne();
      if ((hho as any)?.dtcmPermitNumber) return (hho as any).dtcmPermitNumber;

      return null;
    } catch {
      return null;
    }
  }
}

export default new ActiveResidentsService();
