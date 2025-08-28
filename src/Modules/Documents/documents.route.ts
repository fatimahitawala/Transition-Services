import express from 'express';
import { DocumentsController } from './documents.controller';
import { DocumentsValidation } from './documents.validation';
import { validate } from '../../Common/Middlewares/validate';
import { catchAsync } from '../../Common/Middlewares/catchAsync';
import { AuthMiddleware } from '../../Common/Middlewares/AuthMiddleware';
import { welcomePackSingleUpload, templateSingleUpload } from '../../Common/Utils/upload';

const documentsController = new DocumentsController();
const documentsValidation = new DocumentsValidation();
const authMiddleware = new AuthMiddleware();

const router = express.Router();

router.get('/welcome-pack', authMiddleware.auth(), validate(documentsValidation.getWelcomePackList), catchAsync(documentsController.getWelcomePackList));
router.post('/welcome-pack', authMiddleware.auth(), welcomePackSingleUpload, validate(documentsValidation.createWelcomePack), catchAsync(documentsController.createWelcomePack));
router.get('/welcome-pack/:id/download', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.downloadWelcomePackFile));
router.get('/welcome-pack/:id', authMiddleware.auth(), validate(documentsValidation.getWelcomePackById), catchAsync(documentsController.getWelcomePackById));
router.put('/welcome-pack/:id', authMiddleware.auth(), welcomePackSingleUpload, validate(documentsValidation.updateWelcomePack), catchAsync(documentsController.updateWelcomePack));

router.post('/welcome-kit/generate', authMiddleware.auth(), validate(documentsValidation.generateWelcomeKit), catchAsync(documentsController.generateWelcomeKitPDF));
router.post('/welcome-kit/template/:id/generate', authMiddleware.auth(), validate(documentsValidation.generateWelcomeKitFromTemplate), catchAsync(documentsController.generateWelcomeKitPDFFromTemplate));

router.get('/occupancytemplate/:templateType', authMiddleware.auth(), validate(documentsValidation.getTemplateList), catchAsync(documentsController.getTemplateList));
router.post('/occupancytemplate/:templateType', authMiddleware.auth(), templateSingleUpload, validate(documentsValidation.createTemplate), catchAsync(documentsController.createTemplate));
router.get('/occupancytemplate/:templateType/:id', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.getTemplateById));
router.get('/occupancytemplate/:templateType/:id/download', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.downloadTemplateFile));
router.put('/occupancytemplate/:templateType/:id', authMiddleware.auth(), templateSingleUpload, validate(documentsValidation.updateTemplate), catchAsync(documentsController.updateTemplate));
//router.get('/occupancytemplate/:templateType/:id/history', authMiddleware.auth(), validate(documentsValidation.getTemplateById), catchAsync(documentsController.getTemplateHistory));

// Email Recipients Routes (templateType: recipient-mail)
router.get('/email-recipients', authMiddleware.auth(), validate(documentsValidation.getEmailRecipientsList), catchAsync(documentsController.getEmailRecipientsList));
router.post('/email-recipients', authMiddleware.auth(), validate(documentsValidation.createEmailRecipients), catchAsync(documentsController.createEmailRecipients));
router.put('/email-recipients/:id', authMiddleware.auth(), validate(documentsValidation.updateEmailRecipients), catchAsync(documentsController.updateEmailRecipients));
//router.get('/email-recipients/:id/history', authMiddleware.auth(), validate(documentsValidation.getEmailRecipientsById), catchAsync(documentsController.getEmailRecipientsHistory));

// Unified History Route - handles all template types (move-in, move-out, welcome-pack, recipient-mail)
router.get('/history/:templateType/:id', authMiddleware.auth(), validate(documentsValidation.getUnifiedHistory), catchAsync(documentsController.getUnifiedHistory));

export default router;