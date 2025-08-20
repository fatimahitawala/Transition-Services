import express from 'express';

import swaggerRoute from './Docs/swagger.route';
import config from './Common/Config/config';
import moveOutRoutes from './Modules/MoveOut/moveOut.route';
import renewalRoutes from './Modules/Renewal/renewal.route';
import documentsRoutes from './Modules/Documents/documents.route';
import integrationRoutes from './Modules/Integration/integration.route';
import webhookRoutes from './Modules/Webhook/webhook.route';

const router = express.Router();

const defaultRoutes = [
   
    { path: '/move-out', route: moveOutRoutes },
    { path: '/renewal', route: renewalRoutes },
    { path: '/documents', route: documentsRoutes },
    { path: '/integration', route: integrationRoutes },
    { path: '/webhook', route: webhookRoutes },
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