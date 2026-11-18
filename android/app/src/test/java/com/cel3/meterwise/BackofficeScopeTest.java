package com.cel3.meterwise;

import org.junit.Test;
import static org.junit.Assert.*;

public class BackofficeScopeTest {
    @Test public void opensOnlyTheMatchingInstalledAppScope() {
        String target = "https://cel3interactive.com/admin/meterwise";
        assertTrue(BackofficeScope.contains("https://cel3interactive.com/admin/", target));
        assertTrue(BackofficeScope.contains("https://cel3interactive.com/", target));
        assertFalse(BackofficeScope.contains("https://cel3interactive.com/portal/", target));
        assertFalse(BackofficeScope.contains("https://other.example/admin/", target));
        assertFalse(BackofficeScope.contains("http://cel3interactive.com/admin/", target));
        assertFalse(BackofficeScope.contains("https://cel3interactive.com/admin", "https://cel3interactive.com/admin-evil"));
    }
}
