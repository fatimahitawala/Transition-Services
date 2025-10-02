import * as schedule from "node-schedule";
import { logger } from "../Common/Utils/logger";
import { jobController } from "../Common/Utils/jobController";
import { addAdminNotification, addNotification } from "../Common/Utils/notification";
import { Integrations } from "../Entities/Integrations.entity";

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
         * De-allocating a unit should:
         * - Cancel all amenity bookings
         * - Remove user role
         * - Remove family member access provided by this user
         * - Remove premium services for family members
         */

        deAllocateUnitJob = schedule.scheduleJob(rule, async () => {
            try {
                const integrationUser = await getIntegrationUser(); // this user should be passed as the modifying user for automatic process

                if (integrationUser) {
                    // Proceed with de-allocation logic
                } else {
                    logger.warn("Integration user not found");
                }

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