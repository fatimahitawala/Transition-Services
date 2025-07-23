import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerDefinition from './swagger';
import path from 'path';

const router = express.Router();


const specs = swaggerJsdoc({
    swaggerDefinition,
    apis: [path.join(__dirname, '../**/*.yml'), path.join(__dirname, '../**/*.route.{ts,js}')],
});

router.use('/', swaggerUi.serve);
router.get(
    '/',
    swaggerUi.setup(specs, {
        explorer: true,
    })
);

export default router;