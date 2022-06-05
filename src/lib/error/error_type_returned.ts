import type { ErrorType } from "#lib/types";

export class ErrorReturnedException extends Error {
    constructor(public error_type: ErrorType) {
        super(`Kairi responded with error type: '${error_type}'`);

        this.name = "ErrorReturnedException";
    }
}
