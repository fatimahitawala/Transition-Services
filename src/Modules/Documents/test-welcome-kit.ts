import { WelcomeKitService, WelcomeKitData } from './welcomeKit.service';
import * as fs from 'fs';
import * as path from 'path';
import { APICodes } from '../../Common/Constants/apiCodes.en';

async function testWelcomeKitPDF() {
    try {
        const service = new WelcomeKitService();
        
        // Test 1: Default data
        console.log('Testing default data...');
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
        console.log('✅ Default PDF generated: welcome-kit-default.pdf');
        
        // Test 2: Custom timings
        console.log('Testing custom timings...');
        const customTimingsData: WelcomeKitData = {
            ...defaultData,
            moveInTimingsWeekdays: '8:00 AM - 7:00 PM',
            moveInTimingsSundays: '9:00 AM - 5:00 PM',
            referenceNumber: 'WK-6845'
        };
        
        const customTimingsPdfBuffer = await service.generateWelcomeKitPDF(customTimingsData);
        fs.writeFileSync(path.join(__dirname, 'welcome-kit-custom-timings.pdf'), customTimingsPdfBuffer);
        console.log('✅ Custom timings PDF generated: welcome-kit-custom-timings.pdf');
        
        // Test 3: Sample data
        console.log('Testing sample data...');
        const sampleData = service.generateSampleData();
        const samplePdfBuffer = await service.generateWelcomeKitPDF(sampleData);
        fs.writeFileSync(path.join(__dirname, 'welcome-kit-sample.pdf'), samplePdfBuffer);
        console.log('✅ Sample data PDF generated: welcome-kit-sample.pdf');
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('Generated PDFs:');
        console.log('- welcome-kit-default.pdf (Default data)');
        console.log('- welcome-kit-custom-timings.pdf (Custom timings)');
        console.log('- welcome-kit-sample.pdf (Sample data)');
        
    } catch (error) {
        console.error('❌ Error testing Welcome Kit PDF generation:', error);
    }
}

testWelcomeKitPDF();
