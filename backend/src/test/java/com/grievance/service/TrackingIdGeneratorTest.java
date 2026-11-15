package com.grievance.service;

import com.grievance.repository.GrievanceRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrackingIdGeneratorTest {

    private final GrievanceRepository repository = mock(GrievanceRepository.class);
    private final TrackingIdGenerator generator = new TrackingIdGenerator(repository);

    @Test
    void producesTheDocumentedFormat() {
        when(repository.existsByTrackingId(anyString())).thenReturn(false);
        assertTrue(generator.next().matches("GRV-\\d{4}-\\d{6}"));
    }

    @Test
    void retriesWhenAnIdIsAlreadyTaken() {
        when(repository.existsByTrackingId(anyString())).thenReturn(true, true, false);
        assertTrue(generator.next().matches("GRV-\\d{4}-\\d{6}"));
        verify(repository, times(3)).existsByTrackingId(anyString());
    }

    @Test
    void givesUpAfterFiveCollisions() {
        when(repository.existsByTrackingId(anyString())).thenReturn(true);
        assertThrows(IllegalStateException.class, generator::next);
        verify(repository, times(5)).existsByTrackingId(anyString());
    }
}
