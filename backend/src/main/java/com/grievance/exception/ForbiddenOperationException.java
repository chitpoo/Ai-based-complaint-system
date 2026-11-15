package com.grievance.exception;

/** 403 - the caller is logged in but may not act on this record. */
public class ForbiddenOperationException extends RuntimeException {

    public ForbiddenOperationException(String message) {
        super(message);
    }
}
