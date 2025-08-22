import { Response } from 'express';

export const successResponseWithArrayData = function (res: Response, messageType: { code: string, message: string }, data: any) {
    const resData = {
        status: true,
        ...messageType,
        data,
    };
    return res.status(200).json(resData);
};

export const successResponseWithBinaryData = function (res: Response, messageType: { code: string, message: string }, buffer: Buffer, contentType: string, fileName: string) {
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the binary data
    return res.send(buffer);
};

export const successResponseWithPDFData = function (res: Response, messageType: { code: string, message: string }, pdfBuffer: Buffer, fileName: string) {
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    return res.send(pdfBuffer);
};