package com.cel3.meterwise;

import org.json.JSONObject;
import java.io.InputStream;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;

final class Api {
    static final class Result {
        final int status; final String body;
        Result(int status, String body) { this.status = status; this.body = body; }
    }
    static Result request(String method, String token) throws Exception {
        return request(method, "/api/meterwise/mobile", token, null);
    }
    static Result connect(String code, String verifier) throws Exception {
        return request("POST", "/api/meterwise/mobile/connect", null, new JSONObject().put("code", code).put("verifier", verifier).toString());
    }
    private static Result request(String method, String path, String token, String bodyJson) throws Exception {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(BuildConfig.BACKOFFICE_URL + path).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(15000); connection.setReadTimeout(25000);
        connection.setRequestMethod(method);
        if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Accept", "application/json");
        try {
            if (bodyJson != null) {
                connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(bodyJson.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
            }
            int code = connection.getResponseCode();
            InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String body = "";
            if (stream != null) {
                try (stream; java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream()) {
                    byte[] bytes = new byte[8192]; int count;
                    while ((count = stream.read(bytes)) != -1) {
                        if (buffer.size() + count > 1_000_000) throw new Exception("Response too large");
                        buffer.write(bytes, 0, count);
                    }
                    body = buffer.toString("UTF-8");
                }
            }
            return new Result(code, body);
        } finally { connection.disconnect(); }
    }
    static String error(Result r) {
        try { return new JSONObject(r.body).optString("error", "Meterwise is temporarily unavailable"); }
        catch (Exception ignored) { return "Meterwise is temporarily unavailable"; }
    }
}
