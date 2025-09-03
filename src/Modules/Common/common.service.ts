import httpStatus from "http-status";
import ApiError from "../../Common/Utils/ApiError";
import { APICodes } from "../../Common/Constants";
import { logger } from "../../Common/Utils/logger";
import { AmenityBookings } from "../../Entities/AmenityBookings.entity";
import { AccessCardRequestStatusType, AccessCardRequestType, AccessCardTypes, BookingType } from "../../Entities/EntityTypes";
import { UserRoles } from "../../Entities/UserRoles.entity";
import { logsAction } from "../../Common/Utils/logger";
import { RoleToFamilyMemberMappings } from "../../Entities/RoleToFamilyMemberMappings.entity";
import { FamilyMemberServiceMappings } from "../../Entities/FamilyMemberServiceMappings.entity";
import { VisitorRequests } from "../../Entities/VisitorRequests.entity";
import { PowerOfAttorneyRequests } from "../../Entities/PowerOfAttorneyRequests.entity";
import { POAStatus } from "../../Entities/EntityTypes/poa";
import { PowerOfAttorney } from "../../Entities/PowerOfAttorney.entity";
import { Roles } from "../../Entities/Roles.entity";
import { Users } from "../../Entities/Users.entity";
import { UnitBookings } from "../../Entities/UnitBookings.entity";
import { UserUpdateRequests } from "../../Entities/UserUpdateRequests.entity";
import config from '../../Common/Config/config';
import axios from 'axios';
import { integrationUrls } from "../../Common/Constants/urls";
import { AccessCardRequests } from "../../Entities/AccessCardRequests.entity";

export class CommonService {
    /**
     * Deactivate access card requests tied to the unit for the given customer user.
     * - Cancels pending requests directly.
     * - For closed requests, raises cancellation requests (parking/community) via Community Service.
     *
     * @param unitId           Unit identifier.
     * @param updatedBy        Admin/system user id performing the action (audit updatedBy).
     * @param customerUserId   Customer user id to operate on.
     * @param integrationToken Salesforce integration token forwarded downstream.
     * @returns A summary object of operations performed per type/status.
     */
    async deActivateAccessCardRequests(unitId: number, updatedBy: number, customerUserId: number, integrationToken: string) {

        const response: any = {};

        const salesForceIntegrationHeader = {
            'x-integration-key': 'transition',
            'x-tsor-token': integrationToken
        }

        // {
        //     "name": "transition",
        //     "email": "occupationrequests@sobha.com",
        //     "header": "x-tsor-token"
        // }

        const allAccessCardRequest = (await axios.get(`${config.communityServiceUrl}/api/v1/${integrationUrls.oldAccessCardRequestByUnit.replace(':unitId', unitId.toString())}/${customerUserId}`, {
            timeout: 1000,
            headers: { ...salesForceIntegrationHeader },
        }).catch((error) => {
            logger.error(`Error in deactivating Access Card Requests for Unit ID: ${unitId} | Error: ${error}`);
            return { data: null };
        }))?.data?.data || {};

        logger.debug(`Access Card Requests for Unit ID: ${unitId} | Data: ${JSON.stringify(allAccessCardRequest)}`);

        const accessCardRequestIdsInPendingStatus = Object.keys(allAccessCardRequest).reduce((acc: any, key: any) => {
            if (![AccessCardRequestStatusType.CLOSED, AccessCardRequestStatusType.CANCELLED].includes(key)) {
                const temp = allAccessCardRequest[key].accessCardActionJson.map((acr: any) => {
                    return acr?.id;
                }) || [];
                acc.push(...temp);
            }
            return acc;
        }, []).filter((id: any) => id) || [];

        logger.debug(`Access Card Requests for Unit ID: ${unitId} | Access Card Request IDs in Pending Status: ${accessCardRequestIdsInPendingStatus}`);

        if (accessCardRequestIdsInPendingStatus?.length) {
            // Deactivate the Access Card Requests for the Unit which are in Pending Status
            const cancelReason = `Cancelled against Unit Resale`;
            const pendingRequestCancel = await AccessCardRequests.getRepository().createQueryBuilder('acr')
                .update(AccessCardRequests)
                .set({ isActive: false, status: AccessCardRequestStatusType.CANCELLED, comments: cancelReason, updatedBy: updatedBy })
                .where("id IN (:...accessCardRequestIdsInPendingStatus)", { accessCardRequestIdsInPendingStatus: accessCardRequestIdsInPendingStatus || [] })
                .execute();

            response['pending'] = pendingRequestCancel;
        }

        if (allAccessCardRequest?.[AccessCardRequestStatusType.CLOSED]?.accessCardActionJson?.length) {
            const allAccessCardRequestPendingDeActivation = [...allAccessCardRequest?.[AccessCardRequestStatusType.CLOSED].accessCardActionJson].map((el: any) => { el.accessRequestType = AccessCardRequestType.CANCEL; return el; });
            const requestGroupByTypeList = {
                [AccessCardTypes.parking]: allAccessCardRequestPendingDeActivation.filter((el: any) => el?.vehicleActionJson ? el : null) || [],
                [AccessCardTypes.community]: allAccessCardRequestPendingDeActivation.filter((el: any) => el?.accessCardSlotId ? el : null) || [],
            };

            const newVehicleRequstResponse = requestGroupByTypeList[AccessCardTypes.parking].length
                ? ((await axios.post(`${config.communityServiceUrl}/api/v1/${integrationUrls.createAccessCardRequest.replace(':cardType', AccessCardTypes.parking)}`,
                    { accessCardActionJson: requestGroupByTypeList[AccessCardTypes.parking], unitId },
                    { timeout: 1000, headers: { ...salesForceIntegrationHeader } })
                    .then((res) => {
                        response[AccessCardTypes.parking] = res.data;
                        return response;
                    })
                    .catch((error) => {
                        response[AccessCardTypes.parking] = { status: 'failed', error };
                        logger.error(`Error in raising Vehicle Access Card Requests for Unit ID: ${unitId} | Error: ${error}`);
                        return { data: null };
                    }))?.data || {})
                : {};

            const newCommunityRequstResponse = requestGroupByTypeList[AccessCardTypes.community].length
                ? ((await axios.post(`${config.communityServiceUrl}/api/v1/${integrationUrls.createAccessCardRequest.replace(':cardType', AccessCardTypes.community)}`,
                    { accessCardActionJson: requestGroupByTypeList[AccessCardTypes.community], unitId },
                    { timeout: 1000, headers: { ...salesForceIntegrationHeader } })
                    .then((res) => {
                        response[AccessCardTypes.community] = res.data;
                        return response;
                    })
                    .catch((error) => {
                        console.log(error);
                        logger.error(`Error in raising Community Access Card Requests for Unit ID: ${unitId} | Error: ${error}`);
                        response[AccessCardTypes.community] = error;
                        return { data: null };
                    }))?.data || {})
                : {};
        }

        return response;
    }


    /**
     * Cancel all amenity bookings for a unit made by the given customer user.
     * Sets status=CANCELLED, flags isCancelled, records cancel date and reason.
     *
     * @param unitId           Unit identifier.
     * @param customerUserId   Customer user id whose bookings are cancelled.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     * @param cancelReason     Optional cancel reason; defaults to 'Unit Auto De-Allocation'.
     */
    async cancelAllAmenityBookingsForUnit(unitId: number, customerUserId?: number, userId?: number, cancelReason?: string) {
        try {
            const updateData: any = {
                status: BookingType.CANCELLED, isCancelled: true, cancelDate: new Date(), cancelReason: cancelReason || 'Unit Auto De-Allocation'
            };
            if (userId) updateData.updatedBy = userId;
            await AmenityBookings.getRepository().createQueryBuilder("am")
                .update(AmenityBookings)
                .set(updateData)
                .where(`unit = :unitId and user = :userId`, { unitId: unitId, userId: customerUserId })
                .execute();
            logger.debug(`CANCEL ALL AMENITY BOOKINGS  | SUCCESS`);
        } catch (error) {
            logger.error(`CANCEL ALL AMENITY BOOKINGS | ERROR: ${error}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }
    /**
     * Fetch the active user role mapping for the unit and customer user.
     * Returns a raw object with keys: role, userRoleId, roleName; undefined if none.
     *
     * @param unitId           Unit identifier.
     * @param customerUserId   Customer user id to check.
     */
    async getExistingUserRoleForUnit(unitId: number, customerUserId?: number) {
        try {
            const userRole = await UserRoles.getRepository().createQueryBuilder("ur")
                .select(['r.slug as role, ur.id as userRoleId, r.roleName as roleName'])
                .innerJoin("ur.role", "r")
                //Consider only the user role for the unit since only one user role can be active for a unit based on the registration request
                .innerJoin("ur.unit", "u", "u.id = :unitId", { unitId })
                .innerJoin("ur.user", "us", "us.id = :customerUserId", { customerUserId })
                .where("ur.isActive = true")
                .getRawOne();
            return userRole;
        } catch (error) {
            logger.error(`Error in getExistingUserRoleForUnit: ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    /**
     * Deactivate the user's role for the unit (sets isActive=false, endDate) and audit the change.
     *
     * @param unitId             Unit identifier.
     * @param customerUserId     Customer user id whose role is removed.
     * @param userId             Admin/system user id performing the action (audit updatedBy, logs).
     * @param existingUserRoleId Existing user role id used for logging/audit.
     */
    async removeUserRoleFromUnit(unitId: number, customerUserId: number, userId: number, existingUserRoleId: any) {
        try {
            // De-Activate the existing user role for the unit for that user
            await UserRoles.getRepository().createQueryBuilder("ur")
                .update(UserRoles)
                .set({ isActive: false, endDate: new Date(), updatedBy: userId })
                .where("unit_id = :unitId and user_id = :customerUserId", { unitId: unitId, customerUserId: customerUserId })
                .execute();
            const logsUserRole = { action: 'put', entityName: 'user_role', moduleId: existingUserRoleId, user: userId, details: existingUserRoleId };
            await logsAction(logsUserRole);
            logger.debug(`REMOVE USER ROLE FROM UNIT | SUCCESS`);

        } catch (error) {
            logger.error(`REMOVE USER ROLE FROM UNIT | ERROR: ${error}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    /**
     * Revoke family/service access mappings provided by the user for the unit, and audit the change.
     *
     * @param unitId             Unit identifier.
     * @param customerUserId     Customer user id whose provided access will be removed.
     * @param userId             Admin/system user id performing the action (audit updatedBy, logs).
     * @param existingUserRoleId Existing user role id used for logging/audit.
     */
    async removeFamilyMemberAccessAndAccessProvidedByUser(unitId: number, customerUserId: number, userId: number, existingUserRoleId: any) {
        try {
            await FamilyMemberServiceMappings.getRepository().createQueryBuilder("fmsm")
                .update(FamilyMemberServiceMappings)
                .set({ isActive: false, updatedBy: userId })
                .where("unit_id = :unitId AND user_id = :customerUserId", { unitId: unitId, customerUserId })
                .execute();

            await RoleToFamilyMemberMappings.getRepository().createQueryBuilder("rfm")
                .update(RoleToFamilyMemberMappings)
                .set({ isActive: false, updatedBy: userId })
                .where("unit_id = :unitId AND user__role_id = :existingUserRoleId", { unitId: unitId, existingUserRoleId: existingUserRoleId })
                .execute();

            const logsFamilyMemberAccess = { action: 'put', entityName: 'family_member_access', moduleId: existingUserRoleId, user: userId, details: existingUserRoleId };
            await logsAction(logsFamilyMemberAccess);
            logger.debug(`REMOVE FAMILY MEMBER ACCESS | SUCCESS`);

        } catch (error) {
            logger.error(`REMOVE FAMILY MEMBER ACCESS | ERROR: ${error}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }

    }
    /**
     * Cancel active Power of Attorney requests and deactivate POA records for the unit/user.
     *
     * @param unitId           Unit identifier.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     * @param customerUserId   Customer user id whose POA artifacts are cancelled.
     * @param integrationToken Optional token reserved for integrations.
     */
    async cancelAllPOARequests(unitId: number, userId: number, customerUserId: number, integrationToken?: string) {
        try {
            //cancel all POA requests for the unit
            await PowerOfAttorneyRequests.getRepository().createQueryBuilder('poar')
                .update({ POAStatus: POAStatus.CANCELLED, isActive: false, updatedBy: userId })
                .where('unit_id = :unitId AND poa_status  IN (:...status) AND user_id = :userId AND is_active = true', {
                    unitId: unitId,  // Make sure 'unitId' is being passed correctly
                    status: [POAStatus.NEW, POAStatus.RFI_NEEDED, POAStatus.RFI_SUBMITTED, POAStatus.APPROVED],
                    userId: customerUserId  // Make sure 'customerUserId' is correctly passed
                }).execute();

            //DeActivate the POA for the unit
            await PowerOfAttorney.getRepository().createQueryBuilder('poa')
                .update({ isActive: false, updatedBy: userId })
                .where('unit_id = :unitId and is_active = true and user_id = :userId', { unitId, userId: customerUserId })
                .execute();

        } catch (error) {
            logger.error(`Error in cancelling Power of Attorney Request for Unit ID: ${unitId} | Error: ${error}`);
        }
    }

    /**
     * Deactivate owner role for the unit and, if the user is no longer an owner elsewhere,
     * auto-approve pending user update requests via User Service (profile/communication).
     *
     * @param unitId           Unit identifier.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     * @param customerUserId   Customer user id affected.
     * @param integrationToken Token for downstream approval calls.
     */
    async cancelAllUserRoles(unitId: number, userId: number, customerUserId: number, integrationToken?: string) {
        try {
            const role = await Roles.getRepository().createQueryBuilder('r').select(['r.id']).where('r.slug=:slug', { slug: 'owner' }).getOne();

            //deactivae the owner user role for the unit for the old owner
            await UserRoles.getRepository().createQueryBuilder('ur').update({ isActive: false, updatedBy: userId })
                .where('unit_id = :unitId AND user_id = :userId AND role_id = :role and is_active = true', {
                    unitId: unitId, userId: customerUserId, role: role?.id
                }).execute();

            //find if the user has any other active user role
            const userRoles = await UserRoles.getRepository().createQueryBuilder('ur').select(['ur.id'])
                .where('unit_id != :unitId AND user_id = :userId AND role_id = :role and is_active = true', {
                    unitId: unitId, userId: customerUserId, role: role?.id
                }).getMany()


            logger.debug(`CANCEL ALL USER ROLES | User Roles: ${JSON.stringify(userRoles)}`);

            //if no active user role found for the user, then approve all the profile update requests
            // if (userRoles.length > 0) {
            const userEmailAddress = await Users.getRepository().createQueryBuilder('u').select(['u.email']).where('u.id=:userId', { userId: customerUserId }).getOne() as any;
            const bookings = await UnitBookings.getRepository().createQueryBuilder('ub').where('ub.customerEmail=:email and ub.unit NOT IN (:...units)', { email: userEmailAddress.email, units: [unitId] }).getMany();

            logger.debug(`CANCEL ALL USER ROLES | Bookings: ${JSON.stringify(bookings)}`);

            const isOwner = (userRoles.length > 0) ? true : (bookings.length > 0) ? true : false; // Check if the user has an owner role or any other booking

            logger.debug(`CANCEL ALL USER ROLES | Is Owner: ${isOwner}`);

            if (!isOwner) { // if user is not owner, then approve all the profile update requests
                const userUpdateRequestsData = await UserUpdateRequests.getRepository().createQueryBuilder('uur')
                    .leftJoin('uur.nationality', 'uun')
                    .select([
                        "uur.firstName as firstName",
                        "uur.middleName as middleName",
                        "uur.lastName as lastName",
                        "uur.dob as dob",
                        "uur.gender as gender",
                        "uur.honorific as honorific",
                        "uur.profession as profession",
                        "uur.nationality as  nationality",
                        // "uun.name as nationality",
                        "uur.residencyStatus as residencyStatus",
                        "uur.alternativeMobile as alternativeMobile",
                        "uur.alternativeEmail as alternativeEmail",
                        "uur.passportNumber  as passportNumber",
                        "uur.passportExpiry as passportExpiry",
                        "uur.eidNumber as eidNumber",
                        "uur.eidExpiry as eidExpiry",
                        "uur.dialCode as dialCode",
                        "uur.mobile as mobile",
                        "uur.email as email"

                    ])
                    .where('status IN (:...status) and user_id = :userId', { status: ['new', 'rfi-pending', 'rfi-submitted'], userId: customerUserId })
                    .getRawMany();

                const transitionIntegrationHeader = {
                    'x-integration-key': 'transition',
                    'x-tsor-token': integrationToken
                }
                await Promise.allSettled(
                    userUpdateRequestsData.map(async (request: any) => {

                        logger.debug(`APPROVING USER UPDATE REQUESTS | Request Data: ${JSON.stringify(request)}`);
                        const informationUrl = `${config.userServiceUrl}/api/v1/user/update-profile-on-resale/${customerUserId}`
                        const communicationUrl = `${config.userServiceUrl}/api/v1/user/update-communication-details-on-resale/${customerUserId}`
                        let url = '';
                        let payload: any = { ...request };

                        if (request.email || (request.mobile && request.dialCode)) {
                            url = communicationUrl
                            payload = {
                                email: request.email,
                                mobile: request.mobile,
                                dialCode: request.dialCode
                            };
                        }
                        else {
                            url = informationUrl;
                            if (payload.nationality) payload.nationality = payload.nationality.toString(); else delete payload.nationality;
                            delete payload.email;
                            delete payload.mobile;
                            delete payload.dialCode;
                        }

                        logger.debug(`APPROVING USER UPDATE REQUESTS | URL to hit: ${url}`);

                        try {
                            const response = await axios.put(url, payload, {
                                timeout: 1000,
                                headers: { ...transitionIntegrationHeader }
                            });
                            logger.debug(`APPROVING USER UPDATE REQUESTS | Response: ${JSON.stringify(response.data)}`);
                        }
                        catch (error: any) {
                            logger.error(`APPROVING USER UPDATE REQUESTS | ERROR: ${error?.message || error}`);
                        }
                    })
                );

            }
        } catch (error) {
            logger.error(`Error in cancelling User Roles for Unit ID: ${unitId} | Error: ${error}`);
        }
    }

    /**
     * Cancel all service requests created by the customer for the unit.
     * Placeholder for future modules; currently returns true.
     *
     * @param unitId           Unit identifier.
     * @param customerUserId   Customer user id whose service requests are cancelled.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     */
    async cancelAllServiceRequests(unitId: number, customerUserId: number, userId: number) {
        try {
            return true;
        } catch (error) {
            logger.error(`Error in cancelling Service Requests for Unit ID: ${unitId} | Error: ${error}`);
        }
    }

    /**
     * Cancel all active visitor requests for a unit created by the specified customer user.
     *
     * @param unitId           Unit identifier.
     * @param customerUserId   Customer user id whose visitor requests will be cancelled.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     */
    async cancelAllVisitorRequests(unitId: number, customerUserId: number, userId: number) {
        try {
            logger.debug(`Cancelling Visitor Requests for Unit ID: ${unitId} made by User ID: ${customerUserId}`);
            await VisitorRequests.getRepository().createQueryBuilder('vr')
                .update({ isActive: false, updatedBy: userId })
                .where('unit_id = :unitId and is_active = true and user_id = :userId', { unitId, userId: customerUserId })
                .execute();
            logger.debug(`Visitor Requests for Unit ID: ${unitId} made by User ID: ${customerUserId} cancelled successfully`);

        } catch (error) {
            logger.error(`Error in cancelling Visitor Requests for Unit ID: ${unitId} | Error: ${error}`);
        }
    }
    /**
     * Orchestrate removal of the user's mappings for a unit:
     * - Deactivate role for the unit
     * - Revoke family access and service mappings
     *
     * @param unitId           Unit identifier.
     * @param userId           Admin/system user id performing the action (audit updatedBy).
     * @param customerUserId   Customer user id to operate on.
     */
    async removeUserMappingsFromUnit(unitId: number, userId: number, customerUserId: number) {
        try {
            const existingUserRole = await this.getExistingUserRoleForUnit(unitId, customerUserId);
            if (existingUserRole) {
                await this.removeUserRoleFromUnit(unitId, userId, customerUserId, existingUserRole?.userRoleId);
                await this.removeFamilyMemberAccessAndAccessProvidedByUser(unitId, userId, customerUserId, existingUserRole?.userRoleId);
            }
        } catch (error) {
            logger.error(`REMOVE USER MAPPINGS FROM UNIT | ERROR: ${error}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }
}