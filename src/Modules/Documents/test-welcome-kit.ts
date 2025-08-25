import { WelcomeKitService, WelcomeKitData } from './welcomeKit.service';
import * as fs from 'fs';
import * as path from 'path';
import { APICodes } from '../../Common/Constants/apiCodes.en';

async function testWelcomeKitPDF() {
    try {
        const service = new WelcomeKitService();
        
        // Test 1: Default data
        const defaultData: WelcomeKitData = {
            residentName: APICodes.TEST_RESIDENT_NAME.message,
            unitNumber: '1003',
            buildingName: APICodes.TEST_BUILDING_NAME.message,
            communityName: APICodes.TEST_COMMUNITY_NAME.message,
            masterCommunityName: APICodes.TEST_MASTER_COMMUNITY_NAME.message,
            dateOfIssue: '29-06-2025',
            moveInDate: '05-07-2025',
            referenceNumber: 'WK-6844',
            contactNumber: APICodes.DEFAULT_CONTACT_NUMBER.message,
            moveInTimingsWeekdays: '9:00 AM - 6:00 PM',
            moveInTimingsSundays: '10:00 AM - 4:00 PM'
        };
        
        const defaultPdfBuffer = await service.generateWelcomeKitPDF(defaultData);
        fs.writeFileSync(path.join(__dirname, 'welcome-kit-default.pdf'), defaultPdfBuffer);
        
        // Test 2: Custom timings
        const customTimingsData: WelcomeKitData = {
            ...defaultData,
            moveInTimingsWeekdays: '8:00 AM - 7:00 PM',
            moveInTimingsSundays: '9:00 AM - 5:00 PM',
            referenceNumber: 'WK-6845'
        };
        
        const customTimingsPdfBuffer = await service.generateWelcomeKitPDF(customTimingsData);
        fs.writeFileSync(path.join(__dirname, 'welcome-kit-custom-timings.pdf'), customTimingsPdfBuffer);
        
        // Test 3: Sample data
        const sampleData = service.generateSampleData();
        const samplePdfBuffer = await service.generateWelcomeKitPDF(sampleData);
        fs.writeFileSync(path.join(__dirname, 'welcome-kit-sample.pdf'), samplePdfBuffer);
        
    } catch (error) {
        console.error('❌ Error testing Welcome Kit PDF generation:', error);
    }
}

testWelcomeKitPDF();
