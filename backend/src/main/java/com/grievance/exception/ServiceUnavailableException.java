package com.grievance.exception;

/** A service this request depends on (the ML service) is down. Mapped to 503. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
