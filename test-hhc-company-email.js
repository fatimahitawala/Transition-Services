const axios = require('axios');

async function testHhcCompanyMoveInEmail() {
    try {
        console.log('=== TESTING HHC-COMPANY MOVE-IN EMAIL ===');
        
        const response = await axios.post('http://localhost:3008/api/v1/admin/move-in/hhc-company', {
            unitId: 36814,
            moveInDate: "2025-09-25",
            name: "John Manager",
            company: "ABC Trading LLC",
            companyEmail: "samar13singh.2013@gmail.com",
            operatorOfficeNumber: "501234567",
            tradeLicenseNumber: "TL123456789",
            tradeLicenseExpiryDate: "2026-12-31",
            tenancyContractStartDate: "2025-09-01",
            unitPermitStartDate: "2025-09-01",
            unitPermitExpiryDate: "2026-08-31",
            unitPermitNumber: "UP123456",
            leaseStartDate: "2025-09-01",
            leaseEndDate: "2026-08-31",
            dtcmStartDate: "2025-09-01",
            dtcmExpiryDate: "2026-08-31",
            nationality: "UAE",
            emiratesIdNumber: "784-1985-1234567-8",
            emiratesIdExpiryDate: "2026-12-31",
            comments: "Corporate accommodation for employees"
        }, {
            headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsImlhdCI6MTc1ODE4NTExNCwiZXhwIjoxNzU4MTg2OTE0LCJ0eXBlIjoiYWNjZXNzIiwiaXNBZG1pbiI6MSwicm9sZSI6Imd1ZXN0In0.HA9uz9YZbL33Dd3raBz84ZYhB34rhSzWh8GbzEQPJ9M',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('=== HHC-COMPANY REQUEST SUCCESS ===');
        console.log('✅ Request ID:', response.data.data.id);
        console.log('✅ Request Number:', response.data.data.moveInRequestNo);
        console.log('✅ Status:', response.data.data.status);
        console.log('✅ Auto-approved:', response.data.data.isAutoApproved);
        
        console.log('\n=== EMAIL EXPECTATIONS ===');
        console.log('📧 Primary Email: samar13singh.2013@gmail.com (company)');
        console.log('📧 CC Email: [owner email from unit_bookings]');
        console.log('📧 Email Type: Approval email with welcome pack');
        
        console.log('\n=== CHECK SERVER LOGS ===');
        console.log('🔍 Look for:');
        console.log('  - "Getting email recipients for hho_company"');
        console.log('  - "HHC Company request: Primary email set to company"');
        console.log('  - "Unit owner email added to CC"');
        console.log('  - "SENDING APPROVAL EMAIL"');
        console.log('  - "CC: [owner-email]"');
        
    } catch (error) {
        console.error('=== HHC-COMPANY REQUEST ERROR ===');
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testHhcCompanyMoveInEmail();
