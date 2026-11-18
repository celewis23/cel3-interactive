package com.cel3.meterwise;

import org.junit.Test;
import static org.junit.Assert.*;

public class UpdatePolicyTest {
    @Test public void acceptsPublishedRelease() { UpdatePolicy.validate(3, 2_000_000, "a".repeat(64)); }
    @Test public void rejectsInvalidOrOversizedReleases() {
        for (long size : new long[] { -1, 0, UpdatePolicy.MAX_BYTES + 1 }) {
            assertThrows(IllegalArgumentException.class, () -> UpdatePolicy.validate(3, size, "a".repeat(64)));
        }
        assertThrows(IllegalArgumentException.class, () -> UpdatePolicy.validate(0, 1, "a".repeat(64)));
        assertThrows(IllegalArgumentException.class, () -> UpdatePolicy.validate(3, 1, "unknown"));
    }
    @Test public void acceptsOnlySameSigningIdentity() {
        assertTrue(UpdatePolicy.sameSigners(new byte[][] {{1,2,3}}, new byte[][] {{1,2,3}}));
        assertTrue(UpdatePolicy.sameSigners(new byte[][] {{1},{2}}, new byte[][] {{2},{1}}));
        assertFalse(UpdatePolicy.sameSigners(new byte[][] {{1,2,3}}, new byte[][] {{9,8,7}}));
        assertFalse(UpdatePolicy.sameSigners(new byte[][] {{1}}, new byte[][] {{1},{2}}));
        assertFalse(UpdatePolicy.sameSigners(new byte[0][], new byte[0][]));
        assertFalse(UpdatePolicy.sameSigners(null, new byte[][] {{1}}));
    }
}
