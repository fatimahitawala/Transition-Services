import puppeteer from 'puppeteer';
import { logger } from '../../Common/Utils/logger';

export interface WelcomeKitData {
    residentName: string;
    unitNumber: string;
    buildingName: string;
    communityName: string;
    masterCommunityName: string;
    dateOfIssue: string;
    moveInDate: string;
    referenceNumber: string;
    contactNumber?: string;
    moveInTimingsWeekdays?: string;
    moveInTimingsSundays?: string;
}

export class WelcomeKitService {
    async generateWelcomeKitPDF(data: WelcomeKitData): Promise<Buffer> {
        try {
            logger.info(`Generating Welcome Kit PDF for resident: ${data.residentName}`);

            // Generate HTML template with dynamic data
            const htmlContent = this.generateHTMLTemplate(data);
            
            // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Set content and wait for images to load
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });
            
            await browser.close();
            
            logger.info('Welcome Kit PDF generated successfully');
            return Buffer.from(pdfBuffer);

        } catch (error) {
            logger.error('Error generating Welcome Kit PDF:', error);
            throw new Error('Failed to generate Welcome Kit PDF');
        }
    }

    private generateHTMLTemplate(data: WelcomeKitData): string {
        // Set default values
        const welcomeDate = data.moveInDate || 'today';
        const moveInTimingsWeekdays = data.moveInTimingsWeekdays || '9:00 AM - 6:00 PM';
        const moveInTimingsSundays = data.moveInTimingsSundays || '10:00 AM - 4:00 PM';
        const contactNumber = data.contactNumber || '800 SOBHA (76242)';

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet" />
  <title>Welcome Kit</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      font-family: "Roboto", sans-serif;
    }
    body {
      background-color: #fff;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: auto;
      text-align: left;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td {
      font-size: 10px;
      vertical-align: top;
    }
    .BodyHeadtxt {
      font-size: 24px;
      padding: 10px 20px;
      color: #333;
      font-family: 'Times New Roman', Times, serif;
      font-weight: bold;
    }
    .BodyHeadSubtxt1, .BodyHeadSubtxt2 {
      padding: 0px 20px 5px 20px;
      color: #333;
      font-size: 12px;
      font-weight: normal;
    }
    .BodyTableBG {
      background-color: #DFE8E4;
      padding: 10px 0;
      margin: 10px;
    }
    .BodyLabel {
      padding: 8px 10px 0px 20px;
      color: #333;
      font-size: 12px;
      font-weight: bold;
    }
    .BodyInput {
      color: #333;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
      font-size: 12px;
    }
    .info-note {
      padding: 10px 20px;
      font-size: 12px;
      color: #333;
    }
    .BodyIconTable {
      margin: 10px auto 20px auto;
      width: 100%;
      font-size: 10px;
      text-align: center;
    }
    .BodyIconTable td {
      width: 16%;
      padding: 5px;
    }
    .BodyIconTable img {
      width: 40px;
      height: auto;
      margin-bottom: 5px;
    }
    .BodyList {
      color: white;
      background-color: #346D59;
      margin: 10px;
      padding: 15px;
    }
    .BodyList th {
      text-align: left;
      color: white;
      font-size: 12px;
      padding-bottom: 8px;
    }
    .BodyList ol {
      margin: 0;
      padding-left: 18px;
    }
    .BodyList li {
      font-size: 10px;
      padding: 3px 0;
    }
    .BodyFooter {
      text-align: center;
      font-size: 10px;
      padding: 10px;
      color: #333;
    }
    .BodyFooterLogo {
      text-align: center;
      padding: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Updated Header Image -->
    <div style="position: relative; width: 100%;">
      <img src="https://res.cloudinary.com/ddbdlqjcq/image/upload/v1755076402/Screenshot_2025-08-13_142428_1_qwua5y.png"
           alt="Header"
           style="width:100%; height:auto; display:block;" />
      <div style="position: absolute; top: 15px; left: 20px; font-size: 28px; font-weight: bold; font-family: 'Times New Roman', Times, serif; color: white;">
        WELCOME KIT
      </div>
    </div>
    
    <table>
      <tr>
        <td colspan="2"><div class="BodyHeadtxt">WELCOME TO YOUR NEW HOME!</div></td>
      </tr>
      <tr>
        <td colspan="2"><div class="BodyHeadSubtxt1">Your Welcome Kit is ready from ${welcomeDate}</div></td>
      </tr>
      <tr>
        <td colspan="2"><div class="BodyHeadSubtxt2">Ref# ${data.referenceNumber}</div></td>
      </tr>
    </table>

    <!-- Resident Info Section -->
    <div class="BodyTableBG">
      <table>
        <tr>
          <td class="BodyLabel">Resident name :</td>
          <td class="BodyInput">${data.residentName}</td>
        </tr>
        <tr>
          <td class="BodyLabel">Unit, Building :</td>
          <td class="BodyInput">${data.unitNumber}, ${data.buildingName}</td>
        </tr>
        <tr>
          <td class="BodyLabel">Community :</td>
          <td class="BodyInput">${data.communityName}</td>
        </tr>
        <tr>
          <td class="BodyLabel">Date of Issue :</td>
          <td class="BodyInput">${data.dateOfIssue}</td>
        </tr>
      </table>
      <div class="info-note">
        This Welcome Kit provides you and your moving company (if any) unhindered access to move into the above-mentioned unit, subject to the terms below.
      </div>
    </div>

    <!-- Icons and Guidelines -->
    <div class="BodyIconTable">
      <table>
        <tr>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992700.png" alt="Clock" /><br>
            Move in timings: ${moveInTimingsWeekdays} weekdays, ${moveInTimingsSundays} Sundays & public holidays.</td>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992651.png" alt="Copy" /><br>
            Share a copy of your Welcome Kit with your moving company.</td>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992648.png" alt="Security" /><br>
            Observe security and access protocol.</td>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992669.png" alt="Rules" /><br>
            Follow community rules and guidelines.</td>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992687.png" alt="Clean" /><br>
            Keep the common areas clean and tidy.</td>
          <td><img src="https://cdn-icons-png.flaticon.com/512/992/992685.png" alt="Bin" /><br>
            Dispose of all waste properly and safely.</td>
        </tr>
      </table>
    </div>

    <!-- Important Reminders -->
    <div class="BodyList">
      <table width="100%">
        <tr>
          <th>IMPORTANT REMINDERS</th>
        </tr>
        <tr>
          <td>
            <ol>
              <li>The Community Management will not be liable for any incident, accident, or injury on the premises during move-in.</li>
              <li>Any damage to common areas during move-in will be repaired at the owner/tenant's expense.</li>
              <li>Vehicles must be parked only in your designated bays.</li>
              <li>Carry a valid photo ID if requested by Community Security.</li>
              <li>This kit remains valid for your reference throughout your stay.</li>
              <li>All units are for residential purposes only.</li>
            </ol>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="BodyFooter">
      For any queries or concerns, please contact us on <b>${contactNumber}</b>
    </div>
    <div class="BodyFooterLogo">
      <img src="https://res.cloudinary.com/ddbdlqjcq/image/upload/v1755080439/5_bp2jms.png" alt="Logo Footer" width="100px" />
    </div>
  </div>
</body>
</html>`;
    }

    generateSampleData(): WelcomeKitData {
        return {
            residentName: 'ADI NEGRU',
            unitNumber: '1003',
            buildingName: 'Creek Vistas Grande',
            communityName: 'Creek Vistas Grande',
            masterCommunityName: 'Sobha Hartland',
            dateOfIssue: '29-06-2025',
            moveInDate: '05-07-2025',
            referenceNumber: 'WK-6844',
            contactNumber: '800 SOBHA (76242)',
            moveInTimingsWeekdays: '9:00 AM - 6:00 PM',
            moveInTimingsSundays: '10:00 AM - 4:00 PM'
        };
    }
}
