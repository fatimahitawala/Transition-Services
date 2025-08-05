import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerDefinition from './swagger';
import path from 'path';

const router = express.Router();


const specs = swaggerJsdoc({
    swaggerDefinition,
    apis: [
        path.join(__dirname, '../Routes/**/*.route.{ts,js}'),
        path.join(__dirname, '../Docs/**/*.yml')
    ],
});

router.use('/', swaggerUi.serve);
router.get(
    '/',
    swaggerUi.setup(specs, {
        explorer: true,
        swaggerOptions: {
            docExpansion: 'none', // Collapse endpoints by default
            defaultModelsExpandDepth: -1, // Do not render models at all
            displayRequestDuration: true, // Show request duration
            filter: true, // Enable filtering by tag
            persistAuthorization: true, // Keep auth token on page reload
        }
    })
);

export default router;