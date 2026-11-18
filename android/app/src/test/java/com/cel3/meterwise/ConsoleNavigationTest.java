package com.cel3.meterwise;

import org.junit.Test;
import static org.junit.Assert.*;

public class ConsoleNavigationTest {
    @Test public void opensOnlyConsolePathsFromIntents() {
        assertEquals("/admin/meterwise", ConsoleNavigation.entry("/admin/meterwise"));
        for (String path : new String[] { null, "https://evil.example", "//evil.example", "/admin/../portal", "/admin/%2e%2e/portal", "/administrator" }) assertEquals("/admin", ConsoleNavigation.entry(path));
    }
    @Test public void distinguishesExternalLinksAndOtherOrigins() {
        assertTrue(ConsoleNavigation.internal("https://cel3interactive.com", "https://cel3interactive.com/admin"));
        assertFalse(ConsoleNavigation.internal("https://cel3interactive.com", "https://cel3interactive.com.evil.example/admin"));
        assertFalse(ConsoleNavigation.internal("https://cel3interactive.com", "http://cel3interactive.com/admin"));
        assertFalse(ConsoleNavigation.internal("https://cel3interactive.com", "https://other@cel3interactive.com/admin"));
    }
}
