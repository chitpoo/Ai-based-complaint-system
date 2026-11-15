package com.grievance.exception;

/** 409 - a unique value (email, department name or category) is already taken. */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
