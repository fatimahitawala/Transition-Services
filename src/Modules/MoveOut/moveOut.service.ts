import httpStatus from "http-status";
import ApiError from "../../Common/Utils/ApiError";
import { logger } from "../../Common/Utils/logger";
import { APICodes } from "../../Common/Constants";
import { MoveOutRequests } from "../../Entities/MoveOutRequests.entity";
import { getPaginationInfo } from "../../Common/Utils/paginationUtils";
import { checkAdminPermission, checkIsSecurity } from "../../Common/Utils/adminAccess";
import { Units, getUnitInformation, getCurrentOccupancyRoleForUnit } from "../../Entities/Units.entity";
import { UnitBookings } from "../../Entities/UnitBookings.entity";
import { MOVE_IN_AND_OUT_REQUEST_STATUS, MOVE_IN_USER_TYPES, MOVE_REQUEST_STATUS, OccupancyStatus } from "../../Entities/EntityTypes";
import { addNotification, addAdminNotification } from "../../Common/Utils/notification";
import { UserRoles } from "../../Entities/UserRoles.entity";
import { MoveInRequests } from "../../Entities/MoveInRequests.entity";
import { AccountRenewalRequests } from "../../Entities/AccountRenewalRequests.entity";
import { executeInTransaction } from "../../Common/Utils/transactionUtil";
import { EntityManager } from "typeorm";
import { MoveOutHistories } from "../../Entities/MoveOutHistories.entity";
import { TransitionRequestActionByTypes } from "../../Entities/EntityTypes";
import { OccupancyRequestEmailRecipients } from "../../Entities/OccupancyRequestEmailRecipients.entity";
import { EmailService } from "../Email/email.service";
import { uploadFile } from "../../Common/Utils/azureBlobStorage";
import config from "../../Common/Config/config";
import { OccupancyRequestTemplates } from "../../Entities/OccupancyRequestTemplates.entity";
import { OCUPANCY_REQUEST_TYPES } from "../../Entities/EntityTypes/transition";
import { IsNull } from "typeorm";

export class MoveOutService {
    private emailService = new EmailService();

    // Build absolute blob URL from stored relative path
    //
    private buildBlobUrl(relativePath: string): string {
        return `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/application/${relativePath}`;
    }

    // Build absolute blob URL for public content (no "/application/" prefix)
    private buildContentBlobUrl(relativePath: string): string {
        return `https://${config.storage.accountName}.blob.core.windows.net/${config.storage.containerName}/${relativePath}`;
    }

    // Build address line using unit name/number + tower/community, avoiding duplicates
    private buildAddressLine(unitInfo: any): string {
        const candidateParts = [
            unitInfo?.unitName,
            unitInfo?.unitNumber,
            unitInfo?.tower?.name || unitInfo?.community?.name || unitInfo?.masterCommunity?.name
        ];
        const parts = candidateParts
            .map(p => (p ?? '').toString().trim())
            .filter(Boolean);
        return Array.from(new Set(parts)).join(', ');
    }

    // Fetch minimal unit data for display (names + IDs) without changing shared helpers
    private async getUnitDisplayInfo(unitId: number): Promise<{
        unitName: string; unitNumber: string;
        masterCommunityId: number; masterCommunityName: string;
        communityId: number; communityName: string;
        towerId: number | null; towerName: string | null;
    } | null> {
        const row = await Units.getRepository().createQueryBuilder('u')
            .leftJoin('u.masterCommunity', 'mc')
            .leftJoin('u.community', 'c')
            .leftJoin('u.tower', 't')
            .select([
                'u.unitName AS unitName',
                'u.unitNumber AS unitNumber',
                'mc.id AS masterCommunityId',
                'mc.name AS masterCommunityName',
                'c.id AS communityId',
                'c.name AS communityName',
                't.id AS towerId',
                't.name AS towerName',
            ])
            .where('u.id = :unitId AND u.isActive = true', { unitId })
            .getRawOne();
        if (!row) return null;
        return {
            unitName: row.unitName || '',
            unitNumber: row.unitNumber || '',
            masterCommunityId: Number(row.masterCommunityId) || 0,
            masterCommunityName: row.masterCommunityName || '',
            communityId: Number(row.communityId) || 0,
            communityName: row.communityName || '',
            towerId: row.towerId != null ? Number(row.towerId) : null,
            towerName: row.towerName || null,
        };
    }

    // Render Move-Out Permit HTML (placeholders are already sanitized at source)
    private renderMoveOutPermitHtml(tpl: {
        headerImageUrl: string;
        moveOutStartDate: string;
        refNumber: string;
        occupantName: string;
        addressLine: string;
        communityName: string;
        dateOfIssue: string;
    }): string {
        const html = `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Move-Out Permit</title>
  <style>
    :root{--ink:#1a1a1a;--muted:#5d636b;--divider:#e6e6e9;--dot:#b8bcc2;--icon-text:#2a2e34;--rem-bg:#6b4a6b;--rem-fg:#ffffff;--rem-num:#ffe6e6}
    html,body{margin:0;background:#ffffff;color:var(--ink)}
    body{font-family:Arial,Helvetica,sans-serif;line-height:1.5}
    .page{max-width:794px;margin:0 auto}
    .hero{width:100%;overflow:hidden}
    .hero img{display:block;width:100%;height:auto;border:0;outline:0}
    .title-wrap{padding:24px 28px 10px 28px}
    .stamp{font-weight:900;letter-spacing:.4px;font-size:30px;line-height:1.05;text-transform:uppercase}
    .stamp span{display:block}
    .script{margin:14px 0 4px 0;font-family:"BrandScript","Brush Script MT","Segoe Script",cursive;font-size:34px;font-weight:400;color:var(--ink)}
    .details{padding:10px 28px 18px 28px}
    .lead{margin:6px 0 18px 0}
    .field-col{display:flex;flex-direction:column;gap:10px;max-width:100%}
    .row{display:flex;gap:14px;align-items:center}
    .k{min-width:170px;font-weight:600}
    .v{flex:1;border-bottom:1px dotted var(--dot);padding-bottom:6px}
    .sub-note{margin:12px 0 0 0;color:var(--muted);font-size:13px}
    .strip{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;padding:18px 24px 8px 24px}
    .ico{display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 4px}
    .ico svg{display:block;width:40px;height:40px;margin-bottom:10px}
    .ico .t{font-size:12.5px;color:var(--icon-text)}
    .rem{background:var(--rem-bg);color:var(--rem-fg);margin:18px 0;padding:18px 24px}
    .rem h3{margin:0 0 8px 0;font-size:16px;letter-spacing:.2px}
    .rem ol{margin:0;padding-left:20px}
    .rem li{margin:8px 0}
    .rem .num{color:var(--rem-num);font-weight:700}
    .foot{padding:8px 24px 20px 24px;text-align:center;color:var(--muted);font-size:13px}
    .divider{height:1px;background:var(--divider);margin:16px 24px}
    .logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;color:var(--muted);font-size:12px}
    .logo svg{width:18px;height:18px}
    @media print{.page{max-width:100%}}
  </style>
</head>
<body>
  <div class="page">
    <div class="hero"><img src="${tpl.headerImageUrl}" alt="Header image" /></div>
    <div class="title-wrap">
      <div class="stamp"><span>MOVE-OUT</span><span>PERMIT</span></div>
      <div class="script">Thank you for making us your home</div>
    </div>
    <div class="details">
      <p class="lead">Your move out date starts from <strong>${tpl.moveOutStartDate}</strong><br />Ref # <strong>${tpl.refNumber}</strong></p>
      <div class="field-col">
        <div class="row"><div class="k">Occupant name:</div><div class="v">${tpl.occupantName}</div></div>
        <div class="row"><div class="k">Address:</div><div class="v">${tpl.addressLine}</div></div>
        <div class="row"><div class="k">Community:</div><div class="v">${tpl.communityName}</div></div>
        <div class="row"><div class="k">Date of issue:</div><div class="v">${tpl.dateOfIssue}</div></div>
      </div>
      <p class="sub-note">This permit provides you and your moving company (if any) unhindered access to move out of the above-mentioned unit, subject to the below terms.</p>
    </div>
    <div class="strip">
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#2a2e34" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/></svg><div class="t">Move out timings:<br/>8 AM to 6 PM during weekdays,<br/>10 AM to 6 PM during Sundays and public holidays.</div></div>
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12l8-5v10l-8-5z" fill="#2a2e34"/><rect x="3" y="5" width="6" height="14" rx="1.5" fill="none" stroke="#2a2e34" stroke-width="1.8"/></svg><div class="t">Share a copy of the MOP with your moving company.</div></div>
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 9-8 9s-8-4-8-9V6l8-3z" fill="none" stroke="#2a2e34" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/></svg><div class="t">Observe security and access protocol.</div></div>
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="12" height="16" rx="2" fill="none" stroke="#2a2e34" stroke-width="2"/><path d="M8 8h6M8 12h6M8 16h6" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/></svg><div class="t">Follow the community rules and guidelines.</div></div>
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18l6-6 4 4-6 6H4z" fill="none" stroke="#2a2e34" stroke-width="2"/><path d="M12 8l5-5" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/></svg><div class="t">Keep the common areas clean and tidy.</div></div>
      <div class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" fill="none" stroke="#2a2e34" stroke-width="2"/><path d="M9 7V5h6v2" stroke="#2a2e34" stroke-width="2" stroke-linecap="round"/></svg><div class="t">Dispose all waste properly and safely.</div></div>
    </div>
    <div class="rem">
      <h3>IMPORTANT REMINDERS</h3>
      <ol>
        <li><span class="num">1.</span> The Community Management will not be liable for any incident/accident/injury that may occur on the premises during the move out process.</li>
        <li><span class="num">2.</span> Any damage caused to the common areas during the move out process (either directly by them or the hired moving company) will be the sole responsibility of the owner/tenant. The damages will be repaired by the Community Management at the owner’s/tenant’s expense.</li>
        <li><span class="num">3.</span> You may need to produce your valid photo ID upon request by the Community Security.</li>
      </ol>
    </div>
    <div class="foot">For any queries or concerns, please contact us on 800 SOBHA (76242)
      <div class="divider"></div>
      <div class="logo"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>SOBHA • COMMUNITY MANAGEMENT</span></div>
    </div>
  </div>
</body>
</html>`;
        return html;
    }

    // Generate PDF (buffer) from HTML using Puppeteer
    private async generatePermitPdf(html: string, fileName: string): Promise<{ buffer: Buffer; filename: string } | null> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
            await browser.close();
            return { buffer: pdfBuffer, filename: fileName };
        } catch (e) {
            logger.error(`Failed generating Move-Out permit PDF: ${e}`);
            return null;
        }
    }

    // Replace placeholders in a template string
    private replacePlaceholders(template: string, variables: Record<string, string>): string {
        let out = template;
        for (const [key, value] of Object.entries(variables)) {
            const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g');
            out = out.replace(re, value || '');
        }
        return out;
    }

    // Fetch Move-Out permit HTML template from DB with hierarchy fallback
    private async getMoveOutPermitTemplate(masterCommunityId: number, communityId: number, towerId?: number | null): Promise<string | null> {
        // 1) Tower
        if (towerId) {
            const rec = await OccupancyRequestTemplates.findOne({ where: { masterCommunityId, communityId, towerId: towerId || undefined, templateType: OCUPANCY_REQUEST_TYPES.MOVE_OUT, isActive: true } });
            if (rec?.templateString) return rec.templateString;
        }
        // 2) Community
        {
            const rec = await OccupancyRequestTemplates.findOne({ where: { masterCommunityId, communityId, towerId: IsNull(), templateType: OCUPANCY_REQUEST_TYPES.MOVE_OUT, isActive: true } });
            if (rec?.templateString) return rec.templateString;
        }
        // 3) Master Community
        {
            const rec = await OccupancyRequestTemplates.findOne({ where: { masterCommunityId, communityId: IsNull(), towerId: IsNull(), templateType: OCUPANCY_REQUEST_TYPES.MOVE_OUT, isActive: true } });
            if (rec?.templateString) return rec.templateString;
        }
        return null;
    }

    // Create, upload and persist permit; returns attachment info for email
    private async createAndStoreMoveOutPermit(req: { requestId: number; requestNo: string; occupantName: string; addressLine: string; communityName: string; moveOutDateISO: string; headerImageUrl?: string; masterCommunityId: number; communityId: number; towerId?: number | null }): Promise<{ fileUrl: string; filename: string; attachment: { filename: string; content: Buffer; contentType: string } } | null> {
        const headerImageUrl = req.headerImageUrl || this.buildContentBlobUrl('content/move-out/mop_pdf_header.png');
        const dateOfIssue = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: '2-digit' });
        const moveOutStartDate = req.moveOutDateISO ? new Date(req.moveOutDateISO).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: '2-digit' }) : '';

        let html = await this.getMoveOutPermitTemplate(req.masterCommunityId, req.communityId, req.towerId ?? undefined);
        if (html) {
            const vars: Record<string, string> = {
                '{{headerImageUrl}}': headerImageUrl,
                '{{moveOutStartDate}}': moveOutStartDate,
                '{{moveOutDate}}': moveOutStartDate,
                '{{refNumber}}': req.requestNo,
                '{{requestNumber}}': req.requestNo,
                '{{occupantName}}': req.occupantName,
                '{{addressLine}}': req.addressLine,
                '{{communityName}}': req.communityName,
                '{{dateOfIssue}}': dateOfIssue,
            };
            html = this.replacePlaceholders(html, vars);
        } else {
            html = this.renderMoveOutPermitHtml({
                headerImageUrl,
                moveOutStartDate,
                refNumber: req.requestNo,
                occupantName: req.occupantName,
                addressLine: req.addressLine,
                communityName: req.communityName,
                dateOfIssue
            });
        }

        const pdf = await this.generatePermitPdf(html, `${req.requestNo}-move-out-permit.pdf`);
        if (!pdf) return null;

        // Upload to Azure
        const pseudoFile: any = {
            originalname: pdf.filename,
            mimetype: 'application/pdf',
            buffer: pdf.buffer,
            size: pdf.buffer.length
        };
        const upload = await uploadFile(pdf.filename, pseudoFile, `move-out/${req.requestId}/permit/`, 0);
        const isFile = (u: any) => u && typeof u === 'object' && 'filePath' in u && 'fileName' in u;
        if (!upload || (upload as any).status === false || !isFile(upload)) {
            logger.warn(`Move-Out permit upload failed for request ${req.requestId}`);
            return null;
        }
        const uploaded: any = upload;

        // Persist in additionalInfo JSON
        try {
            const existing = await MoveOutRequests.getRepository().findOne({ where: { id: req.requestId } });
            if (existing) {
                let info: any = {};
                try { info = existing.additionalInfo ? JSON.parse(existing.additionalInfo) : {}; } catch { info = {}; }
                info.permit = {
                    permitNumber: req.requestNo,
                    dateOfIssue,
                    fileName: uploaded.fileOriginalName || pdf.filename,
                    filePath: uploaded.filePath,
                    fileUrl: this.buildBlobUrl(uploaded.filePath)
                };
                await MoveOutRequests.getRepository().update({ id: req.requestId }, { additionalInfo: JSON.stringify(info) });
            }
        } catch (e) {
            logger.error(`Failed persisting permit meta for request ${req.requestId}: ${e}`);
        }

        return {
            fileUrl: this.buildBlobUrl(uploaded.filePath),
            filename: pdf.filename,
            attachment: { filename: pdf.filename, content: pdf.buffer, contentType: 'application/pdf' }
        };
    }

    // Compose local subject/body for requester by request type
    private composeRequesterEmail(requestType: MOVE_IN_USER_TYPES, referenceNo: string): { subject: string; html: string } {
        const subject = `Move Out Permit Reference no. ${referenceNo}`;
        const footer = ['Kind regards,', 'Sobha Community Management'];
        let headerLines: string[] = [];
        if (requestType === MOVE_IN_USER_TYPES.OWNER) {
            headerLines = [
                'Dear homeowner,',
                'We hope you enjoyed living in our community.',
                'Kindly find enclosed your Move Out Permit.',
                'Please provide your movers with a copy of this permit to gain access into the community if you will not be accompanying them.',
                'We would like to take this opportunity to thank you for being a member of our community, and hope to accommodate you again in the future.',
                'If you have any enquiries, please do not hesitate to get in touch with us at 800 SOBHA (76242).',
            ];
        } else if (requestType === MOVE_IN_USER_TYPES.TENANT) {
            headerLines = [
                'Dear tenant,',
                'We hope you enjoyed living in our community.',
                'Kindly find enclosed your Move Out Permit.',
                'Please provide your movers with a copy of this permit to gain access into the community if you will not be accompanying them.',
                'We would like to take this opportunity to thank you for being a member of our community, and hope to accommodate you again in the future.',
                'If you have any enquiries, please do not hesitate to get in touch with us at 800 SOBHA (76242).',
            ];
        } else {
            // HHO and HHC (duplicate from HHO)
            headerLines = [
                'Dear operator,',
                'We hope your guests enjoyed their stay in the community.',
                'Kindly find enclosed your Move Out Permit.',
                'Please provide your movers with a copy of this permit to gain access into the community if you (or any company representative) will not be accompanying them.',
                'If you have any enquiries, please do not hesitate to get in touch with us at 800 SOBHA (76242).',
            ];
        }
        const html = [...headerLines, '', ...footer].map(l => `<div>${l}</div>`).join('');
        return { subject, html };
    }

    // Find MOP recipients by hierarchy: tower -> community -> master community
    private async getMopRecipients(masterCommunityId: number, communityId: number, towerId?: number | null): Promise<string[]> {
        try {
            const repo = OccupancyRequestEmailRecipients.getRepository();

            // 1) Tower-specific
            if (towerId) {
                const towerRec = await repo.createQueryBuilder('r')
                    .leftJoin('r.masterCommunity', 'mc')
                    .leftJoin('r.community', 'c')
                    .leftJoin('r.tower', 't')
                    .where('mc.id = :mcId AND c.id = :cId AND t.id = :tId AND r.isActive = true', { mcId: masterCommunityId, cId: communityId, tId: towerId })
                    .getOne();
                if (towerRec?.mopRecipients) {
                    return towerRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
                }
            }

            // 2) Community-level
            const commRec = await repo.createQueryBuilder('r')
                .leftJoin('r.masterCommunity', 'mc')
                .leftJoin('r.community', 'c')
                .where('mc.id = :mcId AND c.id = :cId AND r.tower IS NULL AND r.isActive = true', { mcId: masterCommunityId, cId: communityId })
                .getOne();
            if (commRec?.mopRecipients) {
                return commRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
            }

            // 3) Master community-level
            const mcRec = await repo.createQueryBuilder('r')
                .leftJoin('r.masterCommunity', 'mc')
                .where('mc.id = :mcId AND r.community IS NULL AND r.tower IS NULL AND r.isActive = true', { mcId: masterCommunityId })
                .getOne();
            if (mcRec?.mopRecipients) {
                return mcRec.mopRecipients.split(',').map(e => e.trim()).filter(Boolean);
            }
        } catch (e) { }
        return [];
    }
    // Build common details payload for notifications from unit info
    private async buildMoveOutDetailsPayload(unitId: number, requestNo: string, moveOutDate: any, residentType?: string) {
        const unit: any = await getUnitInformation(unitId);
        const towerName = unit?.tower?.name || '';
        const communityName = unit?.community?.name || '';
        const masterCommunityName = unit?.masterCommunity?.name || '';
        const unitNumber = unit?.unitNumber || '';
        const propertyAddress = [unit?.unitName, unitNumber].filter(Boolean).join(', ');
        return {
            "<request_ID>": requestNo,
            "<request_id>": requestNo,
            "<request_no>": requestNo,
            "<reference_id>": requestNo,
            "<move_out_date>": moveOutDate,
            "<resident_type>": residentType || '',
            "<unit_number>": unitNumber,
            "<unitNumber>": unitNumber,
            "<tower_name>": towerName,
            "<community_name>": communityName,
            "<master_community_name>": masterCommunityName,
            "<property_Address>": propertyAddress,
        };
    }
    private async ensureUnitHandoverCompleted(unitId: number): Promise<void> {
        try {
            const handover = await UnitBookings.getRepository()
                .createQueryBuilder('ub')
                .innerJoin('ub.unit', 'u', 'u.isActive = true')
                .where('ub.isActive = true')
                .andWhere('u.id = :unitId', { unitId })
                .andWhere('ub.actualHandoverDate IS NOT NULL')
                .getOne();

            if (!handover) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.NO_HANDOVER_DATE.message, APICodes.NO_HANDOVER_DATE.code);
            }
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error(`Error in ensureUnitHandoverCompleted : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getAllMoveOutListAdmin(query: any, user: any) {
        try {
            const { page = 1, per_page = 20, requestId, moveOutType, masterCommunity, community, tower, unit, createdDate, createdStartDate, createdEndDate, moveOutDate, requestStatus, moveOutRequestNo } = query
            let qb = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "mor.moveOutRequestNo",
                    "mor.requestType",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "unit.unitName",
                    "unit.unitNumber",
                    "mor.createdBy",
                    "mor.moveOutDate",
                    "mor.status",
                    "mor.createdAt",
                    "mor.updatedAt",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true")

            const isSecurity = await checkIsSecurity(user);
            qb = checkAdminPermission(qb, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);

            if (isSecurity) {
                qb.andWhere("mor.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED, MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] });
            }

            // Clone a base query for counts (not affected by filter params)
            const countBaseQb = qb.clone();

            if (requestId) qb.andWhere("mor.id = :requestId", { requestId });
            if (moveOutType) qb.andWhere("mor.requestType = :moveOutType", { moveOutType });
            if (masterCommunity) qb.andWhere("masterCommunity.id = :masterCommunity", { masterCommunity });
            if (community) qb.andWhere("community.id = :community", { community });
            if (tower) qb.andWhere("tower.id = :tower", { tower });
            if (unit) qb.andWhere("unit.id = :unit", { unit });
            if (requestStatus) qb.andWhere("mor.status = :requestStatus", { requestStatus });
            if (moveOutRequestNo) qb.andWhere("mor.moveOutRequestNo = :moveOutRequestNo", { moveOutRequestNo });
            if (createdDate) qb.andWhere("DATE(mor.createdAt) = :createdDate", { createdDate });
            if (createdStartDate) qb.andWhere("DATE(mor.createdAt) >= :createdStartDate", { createdStartDate });
            if (createdEndDate) qb.andWhere("DATE(mor.createdAt) <= :createdEndDate", { createdEndDate });
            if (moveOutDate) qb.andWhere("DATE(mor.moveOutDate) = :moveOutDate", { moveOutDate });

            qb.orderBy("mor.createdAt", "DESC")
                .offset((page - 1) * per_page)
                .limit(per_page);
            const count = await qb.getCount();
            const list = await qb.getMany();
            const pagination = getPaginationInfo(page, per_page, count);
            // Counts not based on filters/params (but respecting permission scope)
            const totalCount = await countBaseQb.getCount();
            const approvedCount = await countBaseQb.clone().andWhere("mor.status = :approvedStatus", { approvedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED }).getCount();
            const closedCount = await countBaseQb.clone().andWhere("mor.status = :closedStatus", { closedStatus: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED }).getCount();

            return { allMoveOutRequests: list, pagination, counts: { totalCount, approvedCount, closedCount } };
        } catch (error) {
            logger.error('Error in getAllMoveOutListAdmin : ' + JSON.stringify(error));
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async adminApproveOrCancelRequest(user: any, params: any, body: any) {
        try {
            let moveOutRequest = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id as id",
                    "user.id as userId",
                    "unit.id as unitId",
                    "unit.occupancyStatus as occupancyStatus",
                    "mor.moveOutRequestNo as moveOutRequestNo",
                    "mor.moveOutDate as moveOutDate",
                    "mor.createdAt as createdAt",
                    "mor.status as status",
                    "unit.unitName as unitName",
                    "unit.unitNumber as unitNumber",
                    "user.firstName as firstName",
                    "user.lastName as lastName",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.id = :requestId", { requestId: params?.requestId })
                .andWhere("mor.isActive = true")
            moveOutRequest = checkAdminPermission(moveOutRequest, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);
            const result = await moveOutRequest.getRawOne();

            if (!result) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            const action = params?.action;
            if (!['approve', 'cancel'].includes(action)) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_ACTION_ERROR.message, APICodes.INVALID_ACTION_ERROR.code);
            }

            if (action === 'approve') {
                // moveOutDate required for approval
                if (!body?.moveOutDate) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                // Unit must be occupied (not VACANT)
                if (result.occupancyStatus === OccupancyStatus.VACANT) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                // Move-out date must be within 1 month of submission and not in the past
                try {
                    const createdAt = new Date(result.createdAt);
                    const moveOutDate = new Date(body.moveOutDate);
                    const today = new Date();
                    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const maxDate = new Date(createdAt);
                    maxDate.setMonth(maxDate.getMonth() + 1);
                    if (moveOutDate < startOfToday || moveOutDate > maxDate) {
                        throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                    }
                } catch (e) {
                    if (e instanceof ApiError) throw e;
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_APPROVED.message, APICodes.ALREADY_APPROVED.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
                }
            } else if (action === 'cancel') {
                // cancellation remarks required
                if (!body?.reason || String(body.reason).trim() === '') {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELLATION_REMARKS_REQUIRED.message, APICodes.CANCELLATION_REMARKS_REQUIRED.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                    throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CANCELLED_ERROR.message, APICodes.ALREADY_CANCELLED_ERROR.code);
                }
                if (result.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                    throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELATION_NOT_POSSIBLE.message, APICodes.CANCELATION_NOT_POSSIBLE.code);
                }
            }

            const updateData: any = {
                status: action === 'approve' ? MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED : MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED,
                updatedBy: user.id,
                moveOutDate: body?.moveOutDate,
                comments: body?.reason
            };

            await MoveOutRequests.getRepository().update({ id: result.id }, updateData);

            const userId = result?.userId
            const unitId = result?.unitId

            const userRole = UserRoles.getRepository()
                .createQueryBuilder("ur")
                .innerJoin("ur.user", "user", "user.isActive = true")
                .innerJoin("ur.unit", "unit", "unit.isActive = true")
                .innerJoinAndSelect("ur.role", "role", "role.isActive = true")
                .where("user.id = :userId", { userId })
                .andWhere("unit.id = :unitId", { unitId })
                .select(["role.slug as slug"]);

            const userRoleResult = await userRole.getRawOne();

            if (action === 'approve') {

                const permitDate = new Date().toISOString().slice(0, 10);
                const payload = {
                    "<request_no>": result.moveOutRequestNo,
                    "<reference_id>": result.moveOutRequestNo,
                    "<request_id>": result.moveOutRequestNo,
                    "<user_type>": userRoleResult?.slug,
                    "<property_details>": `${result.unitName}, ${result.unitNumber}`,
                    "<occupant_name>": `${result?.firstName} ${result?.lastName}`,
                    "<move_out_date>": body?.moveOutDate || result?.moveOutDate,
                    "<end_date>": '',
                    "<permit_date>": permitDate
                }
                // Push/app notification (align to existing templates)
                addNotification(userId, 'move_out_request_approved', { "<request_no>": result.moveOutRequestNo, "<reference_id>": result.moveOutRequestNo, "<request_id>": result.moveOutRequestNo })
                // Notify Security Team on approval (non-blocking)
                try {
                    await addAdminNotification(
                        user.id,
                        'move_out_request_approved_security',
                        { "<request_no>": result.moveOutRequestNo, "<move_out_date>": result.moveOutDate },
                        { unit_id: unitId }
                    );
                } catch (e) { }
                // Attach simple permit info to additionalInfo JSON
                try {
                    await MoveOutRequests.getRepository().update({ id: result.id }, {
                        additionalInfo: JSON.stringify({ permit: { permitNumber: result.moveOutRequestNo, permitDate, validUntil: body?.moveOutDate || result?.moveOutDate } })
                    });
                } catch (e) { }

                // Generate and store Move-Out Permit PDF, then email to user (with attachment) and MOP recipients (no attachment)
                try {
                    const unitDisp = await this.getUnitDisplayInfo(result.unitId);
                    const addressLine = this.buildAddressLine({
                        unitName: unitDisp?.unitName,
                        unitNumber: unitDisp?.unitNumber,
                        tower: { name: unitDisp?.towerName },
                        community: { name: unitDisp?.communityName },
                        masterCommunity: { name: unitDisp?.masterCommunityName },
                    });
                    const communityName = unitDisp?.communityName || '';
                    const occupantName = `${result?.firstName || ''} ${result?.lastName || ''}`.trim();
                    const permit = await this.createAndStoreMoveOutPermit({
                        requestId: result.id,
                        requestNo: result.moveOutRequestNo,
                        occupantName,
                        addressLine,
                        communityName,
                        moveOutDateISO: body?.moveOutDate || result?.moveOutDate,
                        headerImageUrl: 'https://srmapp01.blob.core.windows.net/sit-onesobha/content/move-out/mop_pdf_header.png?sp=r&st=2025-10-02T11:04:31Z&se=2025-10-02T19:19:31Z&spr=https&sv=2024-11-04&sr=b&sig=wpYoaU%2B72QPmvU6AgwZhygLxuGas62%2F64CYczGkqRv0%3D',
                        masterCommunityId: unitDisp?.masterCommunityId || 0,
                        communityId: unitDisp?.communityId || 0,
                        towerId: unitDisp?.towerId ?? null
                    });

                    // Send templated approval email to requester (with PDF)
                    try {
                        const userEmailRow = await MoveOutRequests.getRepository()
                            .createQueryBuilder('mor')
                            .leftJoin('mor.user', 'user')
                            .select(['mor.id', 'user.email', 'user.firstName', 'user.lastName'])
                            .where('mor.id = :id', { id: result.id })
                            .getRawOne();
                        const userEmail = userEmailRow?.user_email;
                        if (userEmail) {
                            const content = this.composeRequesterEmail(result.requestType as MOVE_IN_USER_TYPES, result.moveOutRequestNo);
                            await this.emailService.sendEmail(userEmail, content.subject, content.html, permit ? [permit.attachment] : []);
                        }
                    } catch (e) { }

                    // Email official recipients (MOP Approved) - without PDF attachment
                    const emails = await this.getMopRecipients(
                        unitDisp?.masterCommunityId || 0,
                        unitDisp?.communityId || 0,
                        unitDisp?.towerId ?? null
                    );
                    if (emails.length > 0) {
                        const uniqueEmails = Array.from(new Set(
                            emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
                        ));
                        if (uniqueEmails.length > 0) {
                            const propertyDetails = [
                                unitDisp?.unitName,
                                unitDisp?.unitNumber,
                                unitDisp?.towerName,
                                unitDisp?.communityName,
                                unitDisp?.masterCommunityName,
                            ].filter(Boolean).join(', ');
                            const userType = userRoleResult?.slug || '';
                            const moveOutDateDisp = (body?.moveOutDate || result?.moveOutDate) ? new Date(body?.moveOutDate || result?.moveOutDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '';
                            const endDateLease = '';
                            const dateOfIssueDisp = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
                            const subject = `Move Out Permit Issued - ${result.moveOutRequestNo}`;
                            const html = [
                                'Dear Team,',
                                'This is to notify you that a Move Out Permit has been issued.',
                                '',
                                `Move Out Permit reference no. - ${result.moveOutRequestNo}`,
                                `User type - ${userType}`,
                                `Property details - ${propertyDetails}`,
                                `Occupant name - ${occupantName}`,
                                `Move out date - ${moveOutDateDisp}`,
                                `End date (lease) - ${endDateLease}`,
                                `Move Out Permit date of issue - ${dateOfIssueDisp}`,
                                '',
                                'Kind regards,',
                                'Sobha Community Management'
                            ].map(l => `<div>${l}</div>`).join('');
                            await this.emailService.sendEmail(uniqueEmails, subject, html, []);
                        }
                    }
                } catch (e) { logger.error(`Error generating/sending Move-Out permit emails: ${e}`); }
                // History
                try {
                    const hist = new MoveOutHistories();
                    (hist as any).request = { id: result.id };
                    hist.action = 'approved';
                    hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                    hist.remarks = body?.reason || '';
                    hist.createdBy = user.id;
                    await hist.save();
                } catch (e) { }
            } else {
                try {
                    const details = await this.buildMoveOutDetailsPayload(result.unitId, result.moveOutRequestNo, result.moveOutDate, result.requestType);
                    await addNotification(userId, 'move_out_admin_cancelled_to_user', { ...details, "<comment_from_admin>": body?.reason || '' });
                } catch (e) { }
                try {
                    const hist = new MoveOutHistories();
                    (hist as any).request = { id: result.id };
                    hist.action = 'cancelled';
                    hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                    hist.remarks = body?.reason || '';
                    hist.createdBy = user.id;
                    await hist.save();
                } catch (e) { }
            }

            return result;
        } catch (error) {
            logger.error(`Error in adminApproveOrCancelRequest : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutList(query: any, user: any) {
        try {
            const { page = 1, per_page = 20, status, unitIds } = query
            let qb = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "mor.moveOutRequestNo",
                    "mor.requestType",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "unit.unitName",
                    "unit.unitNumber",
                    "mor.createdBy",
                    "mor.moveOutDate",
                    "mor.status",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true");

            // Restrict to current user's requests for mobile listing
            if (user?.id) {
                qb.andWhere("user.id = :userId", { userId: Number(user.id) });
            }

            if (status) qb.andWhere("mor.status = :status", { status });
            if (unitIds) qb.andWhere("unit.id IN (:...unitIds)", { unitIds: unitIds.split(',').filter((e: any) => e) });

            qb.orderBy("mor.createdAt", "DESC")
                .offset((page - 1) * per_page)
                .limit(per_page);

            const count = await qb.getCount();
            const list = await qb.getMany();
            const pagination = getPaginationInfo(page, per_page, count);
            return { moveOutList: list, pagination };
        } catch (error) {
            logger.error(`Error in getMoveOutList : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }

    }

    async getMoveOutRequestById(requestId: number, user: any) {
        try {
            let moveOutRequest = MoveOutRequests.getRepository().createQueryBuilder("mor")
                .select([
                    "mor.id",
                    "masterCommunity.name",
                    "community.name",
                    "tower.name",
                    "unit.unitName",
                    "unit.unitNumber",
                    'tower.id',
                    'community.id',
                    'masterCommunity.id',
                    "unit.id",
                    "user.firstName",
                    "user.middleName",
                    "user.lastName",
                    "user.email",
                    "user.mobile",
                    "mor.requestType",
                    "mor.moveOutDate",
                    "mor.comments",
                    "mor.moveOutRequestNo",
                    "mor.createdBy",
                    "mor.status",
                    "mor.createdAt",
                    "mor.updatedAt",
                ])
                .innerJoin("mor.user", "user", "user.isActive = true")
                .innerJoin("mor.unit", "unit", "unit.isActive = true")
                .innerJoin("unit.masterCommunity", "masterCommunity", "masterCommunity.isActive = true")
                .innerJoin("unit.tower", "tower", "tower.isActive = true")
                .innerJoin("unit.community", "community", "community.isActive = true")
                .where("mor.isActive = true AND mor.id = :requestId", { requestId })
            moveOutRequest = checkAdminPermission(moveOutRequest, { towerId: 'tower.id', communityId: 'community.id', masterCommunityId: 'masterCommunity.id' }, user);
            moveOutRequest.getOne();
            const result = await moveOutRequest.getOne();
            if (!result) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }
            return result;
        } catch (error) {
            logger.error(`Error in getMoveOutRequestById : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async cancelMoveOutRequestByUser(body: any, userId: number, requestId: number) {
        try {
            const moveOutRequest = await MoveOutRequests.getRepository().findOne({
                where: { id: requestId, user: { id: userId } }
            });

            if (!moveOutRequest) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.CANCELATION_NOT_POSSIBLE.message, APICodes.CANCELATION_NOT_POSSIBLE.code);
            }
            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
            }
            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CANCELLED || moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CANCELLED_ERROR.message, APICodes.ALREADY_CANCELLED_ERROR.code);
            }

            moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.USER_CANCELLED;
            moveOutRequest.comments = body.reason;
            moveOutRequest.updatedBy = userId;
            await moveOutRequest.save();
            // Notify user and admin on cancellation
            try {
                const details = await this.buildMoveOutDetailsPayload(moveOutRequest.unit.id, moveOutRequest.moveOutRequestNo, moveOutRequest.moveOutDate, moveOutRequest.requestType);
                await addNotification(userId, 'move_out_customer_cancelled_to_user', details);
            } catch (e) { }
            try {
                await addAdminNotification(userId, 'move_out_request_cancelled_by_user_to_admin', { "<request_no>": moveOutRequest.moveOutRequestNo, "<move_out_date>": moveOutRequest.moveOutDate }, { unit_id: moveOutRequest.unit.id });
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in cancelMoveOutRequestByUser : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async closeMoveOutRequestBySecurity(body: any, requestId: number, user: any) {
        try {
            const isSecurity = await checkIsSecurity(user);
            if (!isSecurity) {
                throw new ApiError(httpStatus.FORBIDDEN, APICodes.INSUFFICIENT_USER_PRIVILEGE.message, APICodes.INSUFFICIENT_USER_PRIVILEGE.code);
            }

            const moveOutRequest = await MoveOutRequests.getRepository().findOne({
                where: { id: requestId }
            });

            if (!moveOutRequest) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.REQUEST_NOT_FOUND.message, APICodes.REQUEST_NOT_FOUND.code);
            }

            if (moveOutRequest.status === MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED) {
                throw new ApiError(httpStatus.CONFLICT, APICodes.ALREADY_CLOSED_ERROR.message, APICodes.ALREADY_CLOSED_ERROR.code);
            }

            if (moveOutRequest.status !== MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.APPROVAL_NOT_POSSIBLE.message, APICodes.APPROVAL_NOT_POSSIBLE.code);
            }

            // Only close the request here; the nightly job handles deallocation
            moveOutRequest.status = MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED;
            moveOutRequest.moveOutDate = body.moveOutDate;
            moveOutRequest.comments = body?.reason;
            moveOutRequest.updatedBy = user.id;
            await moveOutRequest.save();
            const userId = moveOutRequest.user.id;
            try {
                const details = await this.buildMoveOutDetailsPayload(moveOutRequest.unit.id, moveOutRequest.moveOutRequestNo, moveOutRequest.moveOutDate, moveOutRequest.requestType);
                await addNotification(userId, 'move_out_request_closure_to_user', details);
            } catch (e) { }
            try {
                await addAdminNotification(user.id, 'move_out_request_closed_by_security_to_admin', { "<request_no>": moveOutRequest.moveOutRequestNo, "<move_out_date>": moveOutRequest.moveOutDate }, { unit_id: moveOutRequest.unit.id });
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'closed';
                hist.actionByType = TransitionRequestActionByTypes.SECURITY;
                hist.remarks = body?.reason || '';
                hist.createdBy = user.id;
                await hist.save();
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in closeMoveOutRequestBySecurity : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getUnitById(id: number): Promise<Units | null> {
        try {
            return await Units.getRepository()
                .createQueryBuilder('u')
                .innerJoinAndSelect('u.masterCommunity', 'mc', 'mc.isActive = true')
                .innerJoinAndSelect('u.community', 'c', 'c.isActive = true')
                .leftJoinAndSelect('u.tower', 't', 't.isActive = true')
                .leftJoinAndSelect('u.unitRestriction', 'ut', 'ut.isActive = true')
                .where('u.id = :id', { id })
                .andWhere('u.isActive = true')
                .getOne();
        } catch (error) {
            logger.error(`Error in getUnitById : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async createMoveOutRequestByUser(body: any, user: any): Promise<MoveOutRequests | null> {
        try {

            const requestUserId = Number(user.id);
            const targetUnitId = Number(body.unitId);

            await this.ensureUnitHandoverCompleted(targetUnitId);
            const userRoleSlug = await this.getUserRoleSlugForUnit(requestUserId, targetUnitId);
            const { moveInRequest, accountRenewalRequest } = await this.getMoveInAndRenewalRequests(requestUserId, targetUnitId);

            // Allow multiple active move-out requests for same user+unit (business decision)

            let moveOutRequest!: MoveOutRequests;
            await executeInTransaction(async (qr: any) => {
                const manager: EntityManager = qr.manager;
                const moveOutRequestNo = await this.generateUnitScopedMoveOutRequestNo(manager, targetUnitId);
                const req = new MoveOutRequests();
                req.moveOutRequestNo = moveOutRequestNo;
                req.requestType = userRoleSlug;
                req.status = MOVE_IN_AND_OUT_REQUEST_STATUS.OPEN;
                req.moveOutDate = body.moveOutDate;
                req.comments = body.comments;
                req.createdBy = user.id;
                req.updatedBy = user.id;
                // set relations by id without extra fetches
                (req as any).user = { id: requestUserId };
                (req as any).unit = { id: targetUnitId };
                (req as any).moveInRequest = { id: moveInRequest.id };
                if (accountRenewalRequest) {
                    (req as any).accountRenewalRequest = { id: accountRenewalRequest.id };
                }
                await manager.save(MoveOutRequests, req);
                moveOutRequest = req;
            });
            // Notify Community Admins on submission (non-blocking)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, body.moveOutDate, userRoleSlug);
                await addAdminNotification(
                    user.id,
                    'move_out_request_submission_admin',
                    details,
                    { unit_id: targetUnitId }
                );
            } catch (e) { }
            // Notify User (submission confirmation)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, body.moveOutDate, userRoleSlug);
                await addNotification(user.id, 'move_out_request_submitted_to_user', details);
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'created';
                hist.actionByType = TransitionRequestActionByTypes.USER;
                hist.remarks = body?.comments || '';
                hist.createdBy = user.id;
                await hist.save();
            } catch (e) { }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in createMoveOutRequestByUser : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async createMoveOutRequestByAdmin(body: any, adminUser: any): Promise<MoveOutRequests | null> {
        try {
            if (!adminUser?.isAdmin) {
                throw new ApiError(httpStatus.FORBIDDEN, APICodes.INVALID_USER_ROLE.message, APICodes.INVALID_USER_ROLE.code);
            }

            const { unitId, userId, moveOutDate, comments } = body;

            if (!unitId || !userId || !moveOutDate) {
                throw new ApiError(httpStatus.BAD_REQUEST, APICodes.INVALID_DATA.message, APICodes.INVALID_DATA.code);
            }

            const occupantUserId = Number(userId);
            const targetUnitId = Number(unitId);

            await this.ensureUnitHandoverCompleted(targetUnitId);
            const userRoleSlug = await this.getUserRoleSlugForUnit(occupantUserId, targetUnitId);
            const { moveInRequest, accountRenewalRequest } = await this.getMoveInAndRenewalRequests(occupantUserId, targetUnitId);

            // Allow multiple active move-out requests for same user+unit (business decision)

            let moveOutRequest!: MoveOutRequests;
            await executeInTransaction(async (qr: any) => {
                const manager: EntityManager = qr.manager;
                const moveOutRequestNo = await this.generateUnitScopedMoveOutRequestNo(manager, targetUnitId);
                const req = new MoveOutRequests();
                req.moveOutRequestNo = moveOutRequestNo;
                req.requestType = userRoleSlug;
                req.status = MOVE_IN_AND_OUT_REQUEST_STATUS.APPROVED;
                req.moveOutDate = moveOutDate;
                req.comments = comments;
                req.createdBy = adminUser.id;
                req.updatedBy = adminUser.id;
                (req as any).user = { id: occupantUserId };
                (req as any).unit = { id: targetUnitId };
                (req as any).moveInRequest = { id: moveInRequest.id };
                if (accountRenewalRequest) {
                    (req as any).accountRenewalRequest = { id: accountRenewalRequest.id };
                }
                await manager.save(MoveOutRequests, req);
                moveOutRequest = req;
            });
            // Auto-approval style messaging to customer (admin-created flow)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, moveOutDate, userRoleSlug);
                await addNotification(occupantUserId, 'move_out_request_approved', details);
                await addNotification(occupantUserId, 'move_out_approval_email_to_user', details);
            } catch (e) { }
            // Inform Admins the request has been created (auto-approved flow)
            try {
                const details = await this.buildMoveOutDetailsPayload(targetUnitId, moveOutRequest.moveOutRequestNo, moveOutDate, userRoleSlug);
                await addAdminNotification(adminUser.id, 'move_out_auto_approved_created_to_admin', details, { unit_id: targetUnitId });
            } catch (e) { }
            try {
                const hist = new MoveOutHistories();
                (hist as any).request = { id: moveOutRequest.id };
                hist.action = 'created';
                hist.actionByType = TransitionRequestActionByTypes.COMMUNITY_ADMIN;
                hist.remarks = comments || '';
                hist.createdBy = adminUser.id;
                await hist.save();
            } catch (e) { }

            // Generate, store, and email Move-Out Permit (admin-created auto-approved)
            try {
                const unitDisp = await this.getUnitDisplayInfo(targetUnitId);
                // Address: include Tower/Community and avoid duplicates
                const addressLine = this.buildAddressLine({
                    unitName: unitDisp?.unitName,
                    unitNumber: unitDisp?.unitNumber,
                    tower: { name: unitDisp?.towerName },
                    community: { name: unitDisp?.communityName },
                    masterCommunity: { name: unitDisp?.masterCommunityName },
                });
                const communityName = unitDisp?.communityName || '';
                // fetch occupant name + email
                const userRow = await MoveOutRequests.getRepository()
                    .createQueryBuilder('mor')
                    .leftJoin('mor.user', 'user')
                    .select(['mor.id', 'user.firstName', 'user.lastName', 'user.email'])
                    .where('mor.id = :id', { id: moveOutRequest.id })
                    .getRawOne();
                // Log full row in a single message so our logger prints it
                try { logger.info(`[Permit] User row for permit email: ${JSON.stringify(userRow)}`); } catch (_) { }
                // TypeORM raw aliasing can be snake_case or camelCase; support both
                const occupantFirst = (userRow?.user_firstName ?? userRow?.user_first_name ?? '').toString();
                const occupantLast = (userRow?.user_lastName ?? userRow?.user_last_name ?? '').toString();
                const occupantName = `${occupantFirst} ${occupantLast}`.trim();
                const userEmail = userRow?.user_email;
                const permit = await this.createAndStoreMoveOutPermit({
                    requestId: moveOutRequest.id,
                    requestNo: moveOutRequest.moveOutRequestNo,
                    occupantName,
                    addressLine,
                    communityName,
                    moveOutDateISO: moveOutDate,
                    headerImageUrl: 'https://srmapp01.blob.core.windows.net/sit-onesobha/content/move-out/mop_pdf_header.png?sp=r&st=2025-10-02T11:04:31Z&se=2025-10-02T19:19:31Z&spr=https&sv=2024-11-04&sr=b&sig=wpYoaU%2B72QPmvU6AgwZhygLxuGas62%2F64CYczGkqRv0%3D',
                    masterCommunityId: unitDisp?.masterCommunityId || 0,
                    communityId: unitDisp?.communityId || 0,
                    towerId: unitDisp?.towerId ?? null
                });
                if (userEmail) {
                    const content = this.composeRequesterEmail(moveOutRequest.requestType as MOVE_IN_USER_TYPES, moveOutRequest.moveOutRequestNo);
                    await this.emailService.sendEmail(userEmail, content.subject, content.html, permit ? [permit.attachment] : []);
                }

                // official recipients (no PDF attachment)
                const emails = await this.getMopRecipients(
                    unitDisp?.masterCommunityId || 0,
                    unitDisp?.communityId || 0,
                    unitDisp?.towerId ?? null
                );
                if (emails.length > 0) {
                    const uniqueEmails = Array.from(new Set(
                        emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
                    ));
                    if (uniqueEmails.length > 0) {
                        const propertyDetails = [
                            unitDisp?.unitName,
                            unitDisp?.unitNumber,
                            unitDisp?.towerName,
                            unitDisp?.communityName,
                            unitDisp?.masterCommunityName,
                        ].filter(Boolean).join(', ');
                        const userType = userRoleSlug || '';
                        const moveOutDateDisp = new Date(moveOutDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
                        const endDateLease = '';
                        const dateOfIssueDisp = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
                        const subject = `Move Out Permit Issued - ${moveOutRequest.moveOutRequestNo}`;
                        const html = [
                            'Dear Team,',
                            'This is to notify you that a Move Out Permit has been issued.',
                            '',
                            `Move Out Permit reference no. - ${moveOutRequest.moveOutRequestNo}`,
                            `User type - ${userType}`,
                            `Property details - ${propertyDetails}`,
                            `Occupant name - ${occupantName}`,
                            `Move out date - ${moveOutDateDisp}`,
                            `End date (lease) - ${endDateLease}`,
                            `Move Out Permit date of issue - ${dateOfIssueDisp}`,
                            '',
                            'Kind regards,',
                            'Sobha Community Management'
                        ].map(l => `<div>${l}</div>`).join('');
                        await this.emailService.sendEmail(uniqueEmails, subject, html, []);
                    }
                }
            } catch (e) { logger.error(`Error generating/sending Move-Out permit (admin create): ${e}`); }
            return moveOutRequest;
        } catch (error) {
            logger.error(`Error in createMoveOutRequestByAdmin : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutHistory(requestId: number, user: any) {
        try {
            const rows = await MoveOutHistories.getRepository().createQueryBuilder('h')
                .innerJoin('h.request', 'mor')
                .where('mor.id = :requestId', { requestId })
                .orderBy('h.createdAt', 'DESC')
                .getMany();
            return rows;
        } catch (error) {
            logger.error(`Error in getMoveOutHistory : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    async getMoveOutPermit(requestId: number, user: any) {
        try {
            const req = await MoveOutRequests.getRepository().findOne({ where: { id: requestId } });
            if (!req) return null;
            let payload: any = {};
            try { payload = req.additionalInfo ? JSON.parse(req.additionalInfo) : {}; } catch { payload = {}; }
            return payload?.permit || null;
        } catch (error) {
            logger.error(`Error in getMoveOutPermit : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }

    // Generates a request no like MOP-<unit_number>-<n> safely under concurrency
    private async generateUnitScopedMoveOutRequestNo(manager: EntityManager, unitId: number): Promise<string> {
        // Lock the unit row to serialize per-unit numbering
        const lockedUnit = await manager.getRepository(Units)
            .createQueryBuilder('u')
            .setLock('pessimistic_write')
            .where('u.id = :unitId', { unitId })
            .getOne();
        if (!lockedUnit) {
            throw new ApiError(httpStatus.NOT_FOUND, APICodes.UNIT_NOT_FOUND?.message || 'Unit not found', (APICodes as any).UNIT_NOT_FOUND?.code || 'UNIT_NOT_FOUND');
        }

        const unitNumber = lockedUnit.unitNumber;
        const prefix = `MOP-${unitNumber}-`;

        // Get the current max sequence for this unit
        const raw = await manager.getRepository(MoveOutRequests)
            .createQueryBuilder('mor')
            .innerJoin('mor.unit', 'u')
            .select("MAX(CAST(SUBSTRING_INDEX(mor.moveOutRequestNo, '-', -1) AS UNSIGNED))", 'max')
            .where('u.id = :unitId', { unitId })
            .andWhere('mor.moveOutRequestNo LIKE :prefix', { prefix: `${prefix}%` })
            .getRawOne();

        const currentMax = Number(raw?.max) || 0;
        const next = currentMax + 1;
        return `${prefix}${next}`;
    }

    private async getUserRoleSlugForUnit(userId: number, unitId: number): Promise<MOVE_IN_USER_TYPES> {
        const userRole = UserRoles.getRepository()
            .createQueryBuilder("ur")
            .innerJoin("ur.user", "user", "user.isActive = true")
            .innerJoin("ur.unit", "unit", "unit.isActive = true")
            .innerJoinAndSelect("ur.role", "role", "role.isActive = true")
            .where("user.id = :userId", { userId })
            .andWhere("unit.id = :unitId", { unitId })
            .select(["role.slug as slug"]);

        const userRoleResult = await userRole.getRawOne();

        const allowedRoles = Object.values(MOVE_IN_USER_TYPES) as MOVE_IN_USER_TYPES[];

        if (!userRoleResult?.slug || !allowedRoles.includes(userRoleResult.slug as MOVE_IN_USER_TYPES)) {
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.ROLE_NOT_FOUND.message, APICodes.ROLE_NOT_FOUND.code);
        }

        return userRoleResult.slug as MOVE_IN_USER_TYPES;
    }

    private async getMoveInAndRenewalRequests(userId: number, unitId: number): Promise<{ moveInRequest: MoveInRequests, accountRenewalRequest: AccountRenewalRequests | null }> {
        const moveInRequest = await MoveInRequests.getRepository()
            .createQueryBuilder("mir")
            .innerJoin("mir.user", "mirUser", "mirUser.isActive = true")
            .innerJoin("mir.unit", "mirUnit", "mirUnit.isActive = true")
            .where("mir.isActive = true")
            .andWhere("mirUser.id = :userId", { userId })
            .andWhere("mirUnit.id = :unitId", { unitId })
            .andWhere("mir.status IN (:...allowedStatuses)", { allowedStatuses: [MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED] })
            .orderBy("mir.updatedAt", "DESC")
            .getOne();

        if (!moveInRequest) {
            throw new ApiError(httpStatus.BAD_REQUEST, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
        }

        const accountRenewalRequest = await AccountRenewalRequests.getRepository()
            .createQueryBuilder("arr")
            .innerJoin("arr.user", "arrUser", "arrUser.isActive = true")
            .innerJoin("arr.unit", "arrUnit", "arrUnit.isActive = true")
            .where("arr.isActive = true")
            .andWhere("arrUser.id = :userId", { userId })
            .andWhere("arrUnit.id = :unitId", { unitId })
            .andWhere("arr.moveInRequest = :moveInRequestId", { moveInRequestId: moveInRequest.id })
            .andWhere("arr.status = :status", { status: MOVE_REQUEST_STATUS.APPROVED })
            .orderBy("arr.updatedAt", "DESC")
            .getOne();

        return { moveInRequest, accountRenewalRequest };
    }

    // Admin helper: return occupant user details for a unit and ensure a closed move-in exists for same user
    async getMoveOutUserDetailsByUnit(unitId: number, user: any) {
        try {
            // basic unit check
            const unit = await this.getUnitById(unitId);
            if (!unit) {
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.UNIT_NOT_FOUND.message, APICodes.UNIT_NOT_FOUND.code);
            }

            // 1) Try current occupant mapping via helper (does not over-restrict joins)
            const currentOcc = await getCurrentOccupancyRoleForUnit(unitId);

            if (currentOcc?.user?.id) {
                // ensure a CLOSED move-in exists for the same user + unit
                await this.getMoveInAndRenewalRequests(Number(currentOcc.user.id), unitId);
                return {
                    userId: Number(currentOcc.user.id),
                    firstName: currentOcc.user.firstName || null,
                    middleName: currentOcc.user.middleName || null,
                    lastName: currentOcc.user.lastName || null,
                    email: currentOcc.user.email || null,
                    mobile: currentOcc.user.mobile || null,
                    dialCode: (currentOcc.user as any)?.dialCode?.dialCode || (currentOcc.user as any)?.dialCode || null,
                    residencyType: (currentOcc as any)?.role?.slug || unit.occupancyStatus || null,
                };
            }

            // 2) Fallback: use the latest CLOSED Move-In for this unit to derive user
            const lastClosedMoveIn = await MoveInRequests.getRepository()
                .createQueryBuilder('mir')
                .innerJoinAndSelect('mir.unit', 'u', 'u.isActive = true')
                .innerJoinAndSelect('mir.user', 'usr', 'usr.isActive = true')
                .leftJoinAndSelect('usr.dialCode', 'dc')
                .where('mir.isActive = true')
                .andWhere('u.id = :unitId', { unitId })
                .andWhere('mir.status = :closed', { closed: MOVE_IN_AND_OUT_REQUEST_STATUS.CLOSED })
                .orderBy('mir.updatedAt', 'DESC')
                .getOne();

            if (!lastClosedMoveIn?.user?.id) {
                // No occupant and no closed move-in → nothing to return for this unit
                throw new ApiError(httpStatus.NOT_FOUND, APICodes.MOVE_IN_REQUEST_NOT_FOUND.message, APICodes.MOVE_IN_REQUEST_NOT_FOUND.code);
            }

            return {
                userId: Number(lastClosedMoveIn.user.id),
                firstName: lastClosedMoveIn.user.firstName || null,
                middleName: lastClosedMoveIn.user.middleName || null,
                lastName: lastClosedMoveIn.user.lastName || null,
                email: lastClosedMoveIn.user.email || null,
                mobile: lastClosedMoveIn.user.mobile || null,
                dialCode: (lastClosedMoveIn.user as any)?.dialCode?.dialCode || (lastClosedMoveIn.user as any)?.dialCode || null,
                residencyType: lastClosedMoveIn.requestType || null,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            logger.error(`Error in getMoveOutUserDetailsByUnit : ${JSON.stringify(error)}`);
            const apiCode = Object.values(APICodes).find((item: any) => item.code === (error as any).code) || APICodes['UNKNOWN_ERROR'];
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, apiCode?.message, apiCode.code);
        }
    }
}
