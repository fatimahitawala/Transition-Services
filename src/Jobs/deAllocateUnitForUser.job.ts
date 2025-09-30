import * as schedule from "node-schedule";
import { logger } from "../Common/Utils/logger";
import { jobController } from "../Common/Utils/jobController";
import { addAdminNotification, addNotification } from "../Common/Utils/notification";
import { Integrations } from "../Entities/Integrations.entity";
import { MoveOutRequests } from "../Entities/MoveOutRequests.entity";
import { MOVE_IN_USER_TYPES, MOVE_IN_AND_OUT_REQUEST_STATUS } from "../Entities/EntityTypes";
import { MoveInRequestDetailsTenant } from "../Entities/MoveInRequestDetailsTenant.entity";
import { MoveInRequestDetailsHhoOwner } from "../Entities/MoveInRequestDetailsHhoOwner.entity";
import { MoveInRequestDetailsHhcCompany } from "../Entities/MoveInRequestDetailsHhcCompany.entity";
import { CommonService } from "../Modules/Common/common.service";
import { Units } from "../Entities/Units.entity";
import { OccupancyStatus } from "../Entities/EntityTypes/unit";

let deAllocateUnitJob: schedule.Job | null = null;

const getIntegrationUser = async () => {
    return await Integrations.getRepository().findOne({ where: { name: 'transition' } });
};

class DeAllocateUnitForUserJob {
    constructor() {
        this.deAllocateUserFromUnit();
    }

    private deAllocateUserFromUnit() {

        //run everyday at 12:00 AM
        let rule = new schedule.RecurrenceRule();
        rule.hour = 0;
        rule.minute = 0;
        rule.second = 0;

        /**
         * Daily de-allocation job.
         * Criteria:
         * - Owner: Move-out date from approved Move-Out request
         * - Tenant: Tenancy contract end date
         * - HHO/HHC: Lease end date (for HHO, fallback to unitPermitExpiryDate)
         */

        deAllocateUnitJob = schedule.scheduleJob(rule, async () => {
            try {
                // Single-instance guard across nodes (10 min interval window)
                const canRun = await jobController('deAllocateUnitForUser', 10);
                if (!canRun) {
                    logger.debug('deAllocateUnitForUser skipped on this node due to jobController guard');
                    return;
                }

                const integrationUser = await getIntegrationUser();
                if (!integrationUser) {
                    logger.warn("Integration user not found");
                    return;
                }

                const commonService = new CommonService();
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = (today.getMonth() + 1).toString().padStart(2, '0');
                const dd = today.getDate().toString().padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;

                const deallocate = async (unitId: number, userId: number) => {
                    try {
                        const existingRole = await commonService.getExistingUserRoleForUnit(unitId, userId);
                        if (!existingRole) return; // already de-linked or no mapping

                        await commonService.deActivateAccessCardRequests(unitId, integrationUser.user.id, userId, integrationUser.token).catch(() => {});
                        await commonService.cancelAllPOARequests(unitId, integrationUser.user.id, userId, integrationUser.token).catch(() => {});
                        await commonService.cancelAllVisitorRequests(unitId, userId, integrationUser.user.id).catch(() => {});
                        await commonService.cancelAllServiceRequests(unitId, userId, integrationUser.user.id).catch(() => {});
                        await commonService.removeUserMappingsFromUnit(unitId, integrationUser.user.id, userId).catch(() => {});

                        const unit = await Units.getRepository().findOne({ where: { id: unitId } });
                        if (unit) {
                            (unit as any).occupancyStatus = OccupancyStatus.VACANT;
                            (unit as any).updatedBy = integrationUser.user.id;
                            await unit.save();
                        }
                    } catch (err) {
                        logger.error(`Deallocation failed for unit ${unitId}, user ${userId}: ${err}`);
                    }
                };

                // Owner: approved move-out requests with due moveOutDate
                const ownerMoveOuts = await MoveOutRequests.getRepository().createQueryBuilder('mor')
                    .innerJoin('mor.user', 'usr')
                    .innerJoin('mor.unit', 'un')
                    .where('mor.isActive = true')
                    .andWhere('mor.requestType = :owner', { owner: MOVE_IN_USER_TYPES.OWNER })
                    .andWhere('mor.status = :status', { status: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED })
                    .andWhere('mor.moveOutDate IS NOT NULL')
                    .andWhere('DATE(mor.moveOutDate) <= :today', { today: todayStr })
                    .select(['usr.id as userId', 'un.id as unitId'])
                    .getRawMany();
                for (const row of ownerMoveOuts) await deallocate(Number(row.unitId), Number(row.userId));

                // Tenant: tenancy end date
                const tenantEnds = await MoveInRequestDetailsTenant.getRepository().createQueryBuilder('td')
                    .innerJoin('td.moveInRequest', 'mir')
                    .innerJoin('mir.user', 'usr')
                    .innerJoin('mir.unit', 'un')
                    .where('td.isActive = true')
                    .andWhere('mir.isActive = true')
                    .andWhere('mir.requestType = :tenant', { tenant: MOVE_IN_USER_TYPES.TENANT })
                    .andWhere('td.tenancyContractEndDate IS NOT NULL')
                    .andWhere('DATE(td.tenancyContractEndDate) <= :today', { today: todayStr })
                    .select(['usr.id as userId', 'un.id as unitId'])
                    .getRawMany();
                for (const row of tenantEnds) await deallocate(Number(row.unitId), Number(row.userId));

                // HHC: lease end date
                const hhcEnds = await MoveInRequestDetailsHhcCompany.getRepository().createQueryBuilder('cd')
                    .innerJoin('cd.moveInRequest', 'mir')
                    .innerJoin('mir.user', 'usr')
                    .innerJoin('mir.unit', 'un')
                    .where('cd.isActive = true')
                    .andWhere('mir.isActive = true')
                    .andWhere('mir.requestType = :hhc', { hhc: MOVE_IN_USER_TYPES.HHO_COMPANY })
                    .andWhere('cd.leaseEndDate IS NOT NULL')
                    .andWhere('DATE(cd.leaseEndDate) <= :today', { today: todayStr })
                    .select(['usr.id as userId', 'un.id as unitId'])
                    .getRawMany();
                for (const row of hhcEnds) await deallocate(Number(row.unitId), Number(row.userId));

                // HHO: fallback to unitPermitExpiryDate
                const hhoEnds = await MoveInRequestDetailsHhoOwner.getRepository().createQueryBuilder('od')
                    .innerJoin('od.moveInRequest', 'mir')
                    .innerJoin('mir.user', 'usr')
                    .innerJoin('mir.unit', 'un')
                    .where('od.isActive = true')
                    .andWhere('mir.isActive = true')
                    .andWhere('mir.requestType = :hho', { hho: MOVE_IN_USER_TYPES.HHO_OWNER })
                    .andWhere('od.unitPermitExpiryDate IS NOT NULL')
                    .andWhere('DATE(od.unitPermitExpiryDate) <= :today', { today: todayStr })
                    .select(['usr.id as userId', 'un.id as unitId'])
                    .getRawMany();
                for (const row of hhoEnds) await deallocate(Number(row.unitId), Number(row.userId));

            } catch (error) {
                logger.error("Error occurred while executing deAllocateUnitJob:", error);
            }
            setInterval(() => {
                logger.debug('Next DeAllocate Unit Job Scheduled at: ' + deAllocateUnitJob?.nextInvocation());
            }, 3600000); // Log every hour
        });
    }


}

export default DeAllocateUnitForUserJob;
