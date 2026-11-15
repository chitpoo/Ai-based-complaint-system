package com.grievance.exception;

/** 400 - the request is well-formed JSON but breaks a business rule. */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
