import config from '../Common/Config/config';

const swaggerDef = {
    openapi: '3.0.3',
    info: {
        title: 'Sobha Smart FM - Tenancy Management Service',
        version: "1.0.0",
        description: 'Independent Tenancy Management API for managing all tenancy types (Owner, Tenant, HHO Company, HHO Owner)'
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
    }
};

export default swaggerDef;