package com.cel3.meterwise;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Pure validation shared by the downloader and installer; no Android dependencies. */
final class UpdatePolicy {
    static final long MAX_BYTES = 20 * 1024 * 1024;
    static void validate(long version, long size, String sha256) {
        if (version < 1 || version > Integer.MAX_VALUE || size < 1 || size > MAX_BYTES || sha256 == null || !sha256.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("Invalid release information");
        }
    }
    static boolean sameSigners(byte[][] installed, byte[][] candidate) {
        if (installed == null || candidate == null || installed.length == 0 || installed.length != candidate.length) return false;
        Set<String> expected = new HashSet<>(), actual = new HashSet<>();
        for (byte[] value : installed) expected.add(Arrays.toString(value));
        for (byte[] value : candidate) actual.add(Arrays.toString(value));
        return expected.equals(actual);
    }
}
