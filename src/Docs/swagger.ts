import config from '../Common/Config/config';

const swaggerDef = {
    openapi: '3.0.3',
    info: {
        title: 'Sobha Smart FM - Transition Services',
        version: "1.0.0",
        description: 'Independent Transition Management API for managing all transition types (Owner, Tenant, HHO Company, HHO Owner)'
    },
    servers: [
        {
            url: `${config.server}/api/v1/`,
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ],
};

export default swaggerDef;