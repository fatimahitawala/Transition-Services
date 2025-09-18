import express from 'express';

import swaggerRoute from './Docs/swagger.route';
import config from './Common/Config/config';
import renewalRoutes from './Modules/Renewal/renewal.route';
import documentsRoutes from './Modules/Documents/documents.route';
import integrationRoutes from './Modules/Integration/integration.route';
import webhookRoutes from './Modules/Webhook/webhook.route';
import moveInRoutes from './Modules/MoveIn/Mobile/moveIn.route';
import MoveInAdmin from './Modules/MoveIn/Admin/moveIn.route';
import moveOutRoutes from './Modules/MoveOut/Mobile/moveOut.route';
import moveOutAdminRoutes from './Modules/MoveOut/Admin/moveOutAdmin.route';
import emailRoutes from './Modules/Email/email.route';
const router = express.Router();

const defaultRoutes = [
    { path: '/move-in', route: moveInRoutes },
    { path: '/admin/move-in', route: MoveInAdmin },
    { path: '/move-out', route: moveOutRoutes },
    { path: '/admin/move-out', route: moveOutAdminRoutes },
    { path: '/account-renewal', route: renewalRoutes },
    { path: '/documents', route: documentsRoutes },
    { path: '/integration', route: integrationRoutes },
    { path: '/webhook', route: webhookRoutes },
    { path: '/email', route: emailRoutes },
];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

const devRoutes = [
    // routes available only in development mode
    {
        path: '/docs/transition',
        route: swaggerRoute,
    },
];

/* istanbul ignore next */
if (["development", "test"].includes(config.env)) {
    devRoutes.forEach((route) => {
        router.use(route.path, route.route);
    });
}

export default router;