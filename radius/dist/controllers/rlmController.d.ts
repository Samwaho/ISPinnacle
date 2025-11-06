import { Request, Response } from 'express';
export declare const rlmController: {
    authorize(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    authenticate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    preAccounting(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    accounting(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    checkSimultaneous(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    postAuth(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    calculateSessionTimeout(packageData: any): number;
    getDurationInMs(durationType: string): number;
    getCurrentTimeInUserTimezone(): Date;
};
//# sourceMappingURL=rlmController.d.ts.map