package com.grievance.exception;

/** 400 - the requested status change is not in the plan.md §2 transition table. */
public class InvalidTransitionException extends RuntimeException {

    public InvalidTransitionException(String message) {
        super(message);
    }
}
