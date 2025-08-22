import passport from 'passport';
import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import compression from "compression";
import router from './route';
import { ErrorHandler } from "./Common/Middlewares/error";
import ApiError from "./Common/Utils/ApiError";
const { errorHandler, errorConverter } = new ErrorHandler();
import { Morgan } from './Common/Utils/morgan';
import httpStatus from "http-status";
import config from "./Common/Config/config";
import path from 'path';


export class App {
    public app: express.Application;
    public passport: passport.PassportStatic;
    public morgan: Morgan;
    public config = config;


    constructor() {
        this.app = express();
        this.morgan = new Morgan();
        this.middleware();
        this.routes();
        this.listenServer()

    }

    private middleware(): void {

        if (this.config.env !== 'test') {
            this.app.use(this.morgan.successHandler);
            this.app.use(this.morgan.errorHandler);
        }

        // enable cors
        this.app.use(cors());

        //json
        this.app.use(express.json());

        // gzip compression
        this.app.use(compression());

        // jwt authentication

    }


    private routes(): void {
        this.app.use('/api/v1', router)

        this.app.use((req: Request, res: Response, next: NextFunction) => {
            next(new ApiError(httpStatus.NOT_FOUND, 'Path Not found', 'EC404'));
        });

        // convert error to ApiError, if needed
        this.app.use(errorConverter);

        // handle error
        this.app.use(errorHandler);

        //image access public path
        (global as Record<string, any>).basePath = path.join(__dirname, '..');

    }

    private listenServer() {
        this.app.listen(config.port, () => {
        })
    }
}